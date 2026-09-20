import { supabase } from "@/lib/supabase";
import { getRecommendations } from "./getRecommendations";
import { getPreferenceHash } from "./getPreferenceHash";

export async function loadRecommendationCache(
  userId: string,
  preferences: any,
  places?: any[],
  onReady?: (places: any[]) => void,
) {

  // ==========================================
  // 1. preference hash
  // ==========================================

  const preferenceHash =
    await getPreferenceHash(preferences);

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


  // ==========================================
  // 2. current data version
  // ==========================================

  const {
    data: versionData,
    error: versionError
  } = await supabase
    .from("recommendation_data_version")
    .select("version")
    .eq("id", 1)
    .single();


  if (versionError) {

    console.error(
      "LOAD RECOMMENDATION VERSION ERROR",
      versionError
    );

  }


  const currentVersion =
    versionData?.version ?? 1;


  console.log(
    "CURRENT DATA VERSION:",
    currentVersion
  );


  // ==========================================
  // 3. หา cache
  // ==========================================

  const {
    data: cached,
    error: cacheError
  } = await supabase
    .from("recommendation_cache")
    .select("*")
    .eq("profile_id", userId)
    .eq("preference_hash", preferenceHash)
    .eq("data_version", currentVersion)
    .maybeSingle();


  console.log(
    "CACHE RESULT:",
    cached
  );

  console.log(
    "CACHE ERROR:",
    cacheError
  );


  // ==========================================
  // 4. CACHE HIT
  // ==========================================

  if (
    cached &&
    Array.isArray(cached.recommendations) &&
    cached.recommendations.length > 0
  ) {

    console.log(
      "⚡⚡⚡ RECOMMENDATION CACHE HIT ⚡⚡⚡"
    );

    return {
      data: cached.recommendations,
      fromCache: true
    };

  }


  // ==========================================
  // 5. CACHE MISS
  // ==========================================

  console.log(
    "🔥🔥🔥 RECOMMENDATION CACHE MISS 🔥🔥🔥"
  );


  const recommendations =
    await getRecommendations(preferences, places, onReady);

  if (recommendations.length === 0) {
    return { data: recommendations, fromCache: false };
  }


  // ==========================================
  // 6. save cache
  // ==========================================

  const {
    error: saveError
  } = await supabase
    .from("recommendation_cache")
    .upsert(
      {
        profile_id: userId,
        preference_hash: preferenceHash,
        data_version: currentVersion,
        recommendations
      },
      {
        onConflict:
          "profile_id,preference_hash,data_version"
      }
    );


  if (saveError) {

    console.error(
      "SAVE RECOMMENDATION CACHE ERROR",
      saveError
    );

  } else {

    console.log(
      "💾 RECOMMENDATION CACHE SAVED"
    );

  }


  return {
    data: recommendations,
    fromCache: false
  };
}
