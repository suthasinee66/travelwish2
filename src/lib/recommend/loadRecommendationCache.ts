import { supabase } from "@/lib/supabase";
import { loadAllPlaces } from "@/lib/travel/loadAllPlaces";

import {
  getRecommendations
} from "./getRecommendations";

import {
  getPreferenceHash
} from "./getPreferenceHash";

import {
  loadPlaceImages
} from "./loadPlaceImages";


// ============================================================
// หน้า Home แสดง Recommend for You 6 ใบ
// ============================================================

const HOME_RECOMMEND_LIMIT =
  6;


// โหลดรูปพร้อมกันไม่เกิน 3 สถานที่
const IMAGE_WORKERS =
  3;


// ============================================================
// โหลดรูปเฉพาะ Recommendation ที่จำเป็น
// ============================================================

async function loadHomeRecommendationImages(
  recommendations: any[]
) {

  if (
    !Array.isArray(recommendations) ||
    recommendations.length === 0
  ) {

    return recommendations || [];

  }


  // Clone เพื่อไม่แก้ array เดิมโดยตรง
  const result =
    [...recommendations];


  // ==========================================================
  // เอาเฉพาะ 6 ตัวแรก
  // ==========================================================

  const tasks =
    recommendations

      .slice(
        0,
        HOME_RECOMMEND_LIMIT
      )

      .map(
        (
          place,
          index
        ) => ({
          place,
          index
        })
      );


  if (
    tasks.length === 0
  ) {

    return result;

  }


  console.log(
    "🖼️ CHECK HOME RECOMMEND IMAGES:",
    tasks.length
  );


  // ==========================================================
  // จำกัด concurrent request
  // ==========================================================

  let nextTaskIndex =
    0;


  const workerCount =
    Math.min(
      IMAGE_WORKERS,
      tasks.length
    );


  await Promise.all(

    Array.from(
      {
        length:
          workerCount
      },

      async () => {

        while (
          nextTaskIndex <
          tasks.length
        ) {

          const task =
            tasks[
              nextTaskIndex++
            ];


          const {
            place,
            index
          } = task;


          try {

            const placeWithImage =
              await loadPlaceImages(
                place
              );


            result[index] =
              placeWithImage;


          } catch (error) {

            console.error(
              "❌ LOAD RECOMMEND IMAGE ERROR:",
              place?.att_id,
              error
            );


            // รูปพังไม่ควรทำให้
            // recommendation ทั้งหน้าพัง
            result[index] =
              place;

          }

        }

      }

    )

  );


  return result;

}


// ============================================================
// เช็กว่ามีรูปใหม่หรือไม่
// ใช้สำหรับตัดสินใจว่าจะ update cache หรือไม่
// ============================================================

function recommendationImagesChanged(
  before: any[],
  after: any[]
) {

  const limit =
    Math.min(
      HOME_RECOMMEND_LIMIT,
      before.length,
      after.length
    );


  for (
    let index = 0;
    index < limit;
    index++
  ) {

    const beforeImages =
      Array.isArray(
        before[index]?.images
      )
        ? before[index].images
        : [];


    const afterImages =
      Array.isArray(
        after[index]?.images
      )
        ? after[index].images
        : [];


    if (
      JSON.stringify(
        beforeImages
      ) !==
      JSON.stringify(
        afterImages
      )
    ) {

      return true;

    }

  }


  return false;

}


// ============================================================
// Recommendation Cache
// ============================================================

export async function loadRecommendationCache(
  userId: string,
  preferences: any,
  places?: any[],
  onReady?: (
    places: any[]
  ) => void,
) {

  // ==========================================================
  // 1. Preference Hash
  // ==========================================================

  const preferenceHash =
    await getPreferenceHash(
      preferences
    );


  console.log(
    "========== RECOMMENDATION CACHE CHECK =========="
  );


  console.log(
    "USER ID:",
    userId
  );


  console.log(
    "PREFERENCE HASH:",
    preferenceHash
  );


  // ==========================================================
  // 2. Current Recommendation Data Version
  // ==========================================================

  const {
    data: versionData,
    error: versionError
  } = await supabase

    .from(
      "recommendation_data_version"
    )

    .select(
      "version"
    )

    .eq(
      "id",
      1
    )

    .single();


  if (
    versionError
  ) {

    console.error(
      "❌ LOAD RECOMMENDATION VERSION ERROR:",
      versionError
    );

  }


  const currentVersion =
    versionData?.version ??
    1;


  console.log(
    "CURRENT DATA VERSION:",
    currentVersion
  );


  // ==========================================================
  // 3. หา Recommendation Cache
  // ==========================================================

  const {
    data: cached,
    error: cacheError
  } = await supabase

    .from(
      "recommendation_cache"
    )

    .select(
      "*"
    )

    .eq(
      "profile_id",
      userId
    )

    .eq(
      "preference_hash",
      preferenceHash
    )

    .eq(
      "data_version",
      currentVersion
    )

    .maybeSingle();


  if (
    cacheError
  ) {

    console.error(
      "❌ LOAD RECOMMENDATION CACHE ERROR:",
      cacheError
    );

  }


  console.log(
    "CACHE RESULT:",
    cached
  );


  // ==========================================================
  // 4. CACHE HIT
  // ==========================================================

  if (
    cached &&
    Array.isArray(
      cached.recommendations
    ) &&
    cached.recommendations.length > 0
  ) {

    console.log(
      "⚡⚡⚡ RECOMMENDATION CACHE HIT ⚡⚡⚡"
    );


    const cachedRecommendations =
      cached.recommendations;


    // ========================================================
    // ให้ UI แสดง Recommendation ทันที
    // ยังไม่ต้องรอรูป
    // ========================================================

    onReady?.(
      cachedRecommendations
    );


    // ========================================================
    // เช็กรูปเฉพาะ 6 ตัวแรก
    // ========================================================

    const recommendationsWithImages =
      await loadHomeRecommendationImages(
        cachedRecommendations
      );


    // ========================================================
    // ถ้าได้รูปใหม่
    // update recommendation cache ด้วย
    //
    // ครั้งหน้าจะไม่ต้องเช็ก API ซ้ำ
    // ========================================================

    if (
      recommendationImagesChanged(
        cachedRecommendations,
        recommendationsWithImages
      )
    ) {

      const {
        error: cacheUpdateError
      } = await supabase

        .from(
          "recommendation_cache"
        )

        .update({
          recommendations:
            recommendationsWithImages
        })

        .eq(
          "profile_id",
          userId
        )

        .eq(
          "preference_hash",
          preferenceHash
        )

        .eq(
          "data_version",
          currentVersion
        );


      if (
        cacheUpdateError
      ) {

        console.error(
          "❌ UPDATE CACHE IMAGE ERROR:",
          cacheUpdateError
        );

      } else {

        console.log(
          "💾 RECOMMENDATION IMAGE CACHE UPDATED"
        );

      }

    }


    return {

      data:
        recommendationsWithImages,

      fromCache:
        true

    };

  }


  // ==========================================================
  // 5. CACHE MISS
  // ==========================================================

  console.log(
    "🔥🔥🔥 RECOMMENDATION CACHE MISS 🔥🔥🔥"
  );


  // ==========================================================
  // คำนวณ Recommendation
  // ไม่มีการโหลดรูปใน getRecommendations แล้ว
  // ==========================================================
// ==========================================
// CACHE MISS
// ไม่มี cache ถึงค่อยโหลด attraction ทั้งหมด
// ==========================================

console.log(
  "🔥 CACHE MISS → LOAD ALL PLACES"
);


const recommendationPlaces =
  places && places.length > 0

    ? places

    : await loadAllPlaces();


const recommendations =
  await getRecommendations(
    preferences,
    recommendationPlaces,
    onReady
  );


  if (
    recommendations.length === 0
  ) {

    return {

      data:
        recommendations,

      fromCache:
        false

    };

  }


  // ==========================================================
  // 6. โหลดรูปเฉพาะ 6 ตัวแรก
  // ==========================================================

  const recommendationsWithImages =
    await loadHomeRecommendationImages(
      recommendations
    );


  // ==========================================================
  // 7. Save Recommendation Cache
  //
  // Save หลังโหลดรูป 6 ตัวแรกแล้ว
  // ทำให้ Cache มีรูปติดไปด้วย
  // ==========================================================

  const {
    error: saveError
  } = await supabase

    .from(
      "recommendation_cache"
    )

    .upsert(
      {

        profile_id:
          userId,

        preference_hash:
          preferenceHash,

        data_version:
          currentVersion,

        recommendations:
          recommendationsWithImages

      },

      {
        onConflict:
          "profile_id,preference_hash,data_version"
      }

    );


  if (
    saveError
  ) {

    console.error(
      "❌ SAVE RECOMMENDATION CACHE ERROR:",
      saveError
    );

  } else {

    console.log(
      "💾 RECOMMENDATION CACHE SAVED"
    );

  }


  return {

    data:
      recommendationsWithImages,

    fromCache:
      false

  };

}