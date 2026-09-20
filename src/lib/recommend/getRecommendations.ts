import { supabase } from "@/lib/supabase";
import { getPlaceImage } from "@/lib/google/places";

export const getRecommendations = async (
  pref: any,
  places?: any[],
  onReady?: (places: any[]) => void,
) => {
  if (!pref) return [];

  let allData: any[] = places || [];
  const pageSize = 1000;
  let from = 0;

  while (!places) {
    const { data, error } = await supabase
      .from("attraction")
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allData.push(...data);

    if (data.length < pageSize) break;

    from += pageSize;
  }

  console.log("========== LOAD DATA ==========");
  console.log("จำนวนสถานที่ทั้งหมด:", allData.length);

  console.log("========== USER PREF ==========");
  console.log(JSON.stringify(pref, null, 2));

  const recommendations = allData.map((place: any) => {
    let score = 0;

    if (pref.travel_type?.length) {
      const matches =
        place.travel_type?.filter((x: string) =>
          pref.travel_type.includes(x)
        ).length || 0;

      score += matches * 3;
    }

    if (pref.activities?.length) {
      const matches =
        place.activities?.filter((x: string) =>
          pref.activities.includes(x)
        ).length || 0;

      score += matches * 2;
    }

    if (
      pref.atmosphere &&
      place.atmosphere?.includes(pref.atmosphere)
    ) {
      score += 2;
    }

    if (
      pref.budget &&
      place.budget?.includes(pref.budget)
    ) {
      score += 1;
    }

    if (
      pref.travel_companion &&
      place.travel_companion?.includes(pref.travel_companion)
    ) {
      score += 1;
    }

    return {
      ...place,
      score,
    };
  });

  console.log("========== BEFORE SORT ==========");
  console.table(
    recommendations
      .filter((x) => x.score > 0)
      .map((x) => ({
        id: x.att_id,
        name: x.name_th,
        province: x.province,
        score: x.score
      }))
  );

  const topPlaces = recommendations
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter(
      (place, index, self) =>
        index === self.findIndex(
          (p) =>
            p.name_th === place.name_th &&
            p.province === place.province
        )
    )
    .slice(0, 50);

  console.log("========== AFTER REMOVE DUP ==========");
  console.table(
    topPlaces.map((x) => ({
      id: x.att_id,
      name: x.name_th,
      province: x.province,
      score: x.score
    }))
  );

  // แสดง recommendation ได้ทันที โดยไม่ต้องรอรูปจาก API
  onReady?.(topPlaces);

  // หน้า Recommend for You แสดงเพียง 6 ใบ
  // จึงโหลดรูปจาก Google/SerpAPI เฉพาะ 6 สถานที่แรกเท่านั้น
  // อันดับ 7-50 จะไม่ยิง image API จนกว่าจะมีหน้าที่ต้องใช้งานจริง
  const HOME_RECOMMEND_LIMIT = 6;
  const result: any[] = [...topPlaces];
  const placesNeedingImages = topPlaces
    .slice(0, HOME_RECOMMEND_LIMIT)
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => {
      const existingImages = Array.isArray(place.images)
        ? place.images
        : [];

      return existingImages.length === 0;
    });

  // จำกัด concurrent request เพื่อไม่ให้มือถือยิง API พร้อมกันเยอะเกินไป
  let nextIndex = 0;
  const workerCount = Math.min(3, placesNeedingImages.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < placesNeedingImages.length) {
        const task = placesNeedingImages[nextIndex++];
        const { place, index } = task;

        console.log(
          "เรียก image API เฉพาะ Recommend for You:",
          place.name_th
        );

        try {
          const images = await getPlaceImage(
            place.name_th,
            place.province
          );

          if (images && images.length > 0) {
            await supabase
              .from("attraction")
              .update({ images })
              .eq("att_id", place.att_id);

            result[index] = {
              ...place,
              images,
              image: images[0],
            };
          }
        } catch (error) {
          console.warn(
            "Place image unavailable; keeping recommendation",
            place.att_id
          );
        }
      }
    })
  );

  // สถานที่ Top 6 ที่มีรูปใน Supabase อยู่แล้ว ใช้รูปเดิมทันที
  for (let index = 0; index < Math.min(HOME_RECOMMEND_LIMIT, result.length); index++) {
    const place = result[index];
    const existingImages = Array.isArray(place.images)
      ? place.images
      : [];

    if (existingImages.length > 0 && !place.image) {
      result[index] = {
        ...place,
        image: existingImages[0],
      };
    }
  }

  console.log("========== FINAL RESULT ==========");
  console.table(
    result.map((x) => ({
      id: x.att_id,
      name: x.name_th,
      province: x.province
    }))
  );

  return result;
};
