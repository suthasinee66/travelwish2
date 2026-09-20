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
  .slice(0, 50);;



console.log("========== AFTER REMOVE DUP ==========");
console.table(
  topPlaces.map((x) => ({
    id: x.att_id,
    name: x.name_th,
    province: x.province,
    score: x.score
  }))
);


// Publish ranked places before optional image requests complete.
onReady?.(topPlaces);

// Limit image requests on mobile connections; image failures must not discard scores.
const result: any[] = new Array(topPlaces.length);
let nextIndex = 0;
await Promise.all(Array.from({ length: Math.min(4, topPlaces.length) }, async () => {
  while (nextIndex < topPlaces.length) {
    const index = nextIndex++;
    const place = topPlaces[index];
    const existingImages = Array.isArray(place.images) ? place.images : [];

    // ✅ มีรูปใน Supabase แล้ว
    if (
      existingImages.length > 0
    ) {

      console.log(
        "ใช้รูปจาก Supabase:",
        place.name_th
      );

      result[index] = {
        ...place,
        images: place.images
      };
      continue;
    }


    // ❌ ไม่มีรูป ค่อยเรียก API
    console.log(
      "เรียก SerpAPI:",
      place.name_th
    );


    try {
    const images = await getPlaceImage(
      place.name_th,
      place.province
    );


    // บันทึกกลับ Supabase
    if(images && images.length > 0){

      await supabase
        .from("attraction")
        .update({
          images
        })
        .eq(
          "att_id",
          place.att_id
        );

    }


    result[index] = {
      ...place,
      images
    };
    } catch (error) {
      console.warn("Place image unavailable; keeping recommendation", place.att_id);
      result[index] = { ...place, images: existingImages };
    }
  }
}));


console.log("========== FINAL RESULT ==========");
console.table(
  result.map((x)=>({
    id:x.att_id,
    name:x.name_th,
    province:x.province
  }))
);


return result;

  
};
