import { supabase } from "@/lib/supabase";

export async function loadTravelData() {

  // ==========================================
  // 1. USER
  // ==========================================

  const {
    data: userData,
    error: userError
  } = await supabase.auth.getUser();


  if (userError) {
    console.error(
      "LOAD USER ERROR:",
      userError
    );

    throw userError;
  }


  if (!userData.user) {
    return null;
  }


  const user =
    userData.user;


  // ==========================================
  // 2. USER PREFERENCES
  // ==========================================

  const {
    data: pref,
    error: preferenceError
  } = await supabase
    .from("user_preferences")
    .select("*")
    .eq(
      "profile_id",
      user.id
    )
    .single();


  if (preferenceError) {
    console.error(
      "LOAD USER PREFERENCES ERROR:",
      preferenceError
    );

    throw preferenceError;
  }


  // ==========================================
  // 3. RETURN
  // ==========================================

  return {

    user,

    preferences:
      pref

  };

}