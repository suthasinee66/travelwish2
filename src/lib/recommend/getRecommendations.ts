import { supabase } from "@/lib/supabase";

export const getRecommendations = async (
  pref: any,
  places?: any[],
  onReady?: (places: any[]) => void,
) => {
  if (!pref) return [];

  let allData: any[] = places || [];

  const pageSize = 1000;
  let from = 0;

  // ============================================================
  // โหลด attraction ถ้ายังไม่ได้ส่ง places เข้ามา
  // ============================================================

  while (!places) {
    const { data, error } = await supabase
      .from("attraction")
      .select("*")
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      console.error(
        "❌ LOAD ATTRACTION ERROR:",
        error
      );

      throw error;
    }

    if (
      !data ||
      data.length === 0
    ) {
      break;
    }

    allData.push(...data);

    if (
      data.length < pageSize
    ) {
      break;
    }

    from += pageSize;
  }


  console.log(
    "========== LOAD DATA =========="
  );

  console.log(
    "จำนวนสถานที่ทั้งหมด:",
    allData.length
  );


  console.log(
    "========== USER PREF =========="
  );

  console.log(
    JSON.stringify(
      pref,
      null,
      2
    )
  );


  // ============================================================
  // คำนวณ Recommendation Score
  // ============================================================

  const recommendations =
    allData.map(
      (place: any) => {

        let score = 0;


        // Travel Type
        if (
          pref.travel_type?.length
        ) {

          const matches =
            place.travel_type?.filter(
              (x: string) =>
                pref.travel_type.includes(x)
            ).length || 0;

          score += matches * 3;

        }


        // Activities
        if (
          pref.activities?.length
        ) {

          const matches =
            place.activities?.filter(
              (x: string) =>
                pref.activities.includes(x)
            ).length || 0;

          score += matches * 2;

        }


        // Atmosphere
        if (
          pref.atmosphere &&
          place.atmosphere?.includes(
            pref.atmosphere
          )
        ) {

          score += 2;

        }


        // Budget
        if (
          pref.budget &&
          place.budget?.includes(
            pref.budget
          )
        ) {

          score += 1;

        }


        // Travel Companion
        if (
          pref.travel_companion &&
          place.travel_companion?.includes(
            pref.travel_companion
          )
        ) {

          score += 1;

        }


        return {
          ...place,
          score,
        };

      }
    );


  console.log(
    "========== BEFORE SORT =========="
  );

  console.table(
    recommendations

      .filter(
        x =>
          x.score > 0
      )

      .map(
        x => ({
          id:
            x.att_id,

          name:
            x.name_th,

          province:
            x.province,

          score:
            x.score
        })
      )
  );


  // ============================================================
  // Sort + Remove Duplicate + Top 50
  // ============================================================

  const topPlaces =
    recommendations

      .filter(
        x =>
          x.score > 0
      )

      .sort(
        (a, b) =>
          b.score - a.score
      )

      .filter(
        (
          place,
          index,
          self
        ) =>

          index ===
          self.findIndex(
            p =>
              p.name_th ===
                place.name_th &&

              p.province ===
                place.province
          )
      )

      .slice(
        0,
        50
      );


  console.log(
    "========== FINAL RECOMMEND =========="
  );

  console.table(
    topPlaces.map(
      x => ({
        id:
          x.att_id,

        name:
          x.name_th,

        province:
          x.province,

        score:
          x.score
      })
    )
  );


  // ============================================================
  // ส่ง Recommendation ให้ UI แสดงก่อน
  // ไม่ต้องรอโหลดรูป
  // ============================================================

  onReady?.(
    topPlaces
  );


  // ============================================================
  // ไม่โหลดรูปในไฟล์นี้
  // รูปจัดการที่ loadRecommendationCache.ts
  // ============================================================

  return topPlaces;
};