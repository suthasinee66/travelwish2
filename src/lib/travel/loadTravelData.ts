import { supabase } from "@/lib/supabase";

export async function loadTravelData() {

  // ==========================================
  // 1. USER
  // ==========================================

  const {
    data: userData,
    error: userError
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!userData.user) {
    return null;
  }

  const user = userData.user;



  // ==========================================
  // 3. USER PREFERENCES
  // ==========================================

  const {
    data: pref,
    error: preferenceError
  } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (preferenceError) throw preferenceError;


  // ==========================================
  // 4. LOAD ALL PLACES
  // ==========================================

  let allData: any[] = [];

  const pageSize = 1000;
  let from = 0;

  while (true) {

    const {
      data,
      error
    } = await supabase
      .from("attraction")
      .select("*")
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      console.error(
        "LOAD ATTRACTION ERROR",
        error
      );
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allData = [
      ...allData,
      ...data
    ];

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }


  // ==========================================
  // 5. NEARBY PLACES
  // ==========================================

  const {
    data: nearby
  } = await supabase
    .from("attraction")
    .select(`
      att_id,
      name_th,
      province,
      images,
      travel_type
    `)
    .limit(8);


  // ==========================================
  // 6. RETURN
  // ==========================================

  return {

    user,

    preferences: pref,

    allPlaces: allData,

    nearbyPlaces: nearby || []

  };

}
