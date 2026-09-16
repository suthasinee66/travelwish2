
import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  loader: async () => {
    console.log("=================================");
    console.log("🔐 AUTH CALLBACK");
    console.log("=================================");

    // 1. ตรวจสอบ code ที่ Supabase ส่งกลับมา
    const code = new URLSearchParams(window.location.search).get("code");

    console.log("OAuth code:", code ? "พบ code" : "ไม่พบ code");
    console.log("Current URL:", window.location.href);

    // 2. ถ้ามี code ให้แลกเป็น session
    if (code) {
      console.log("🔄 Exchanging code for session...");

      const { data, error } =
        await supabase.auth.exchangeCodeForSession(code);

      console.log("Exchange session:", data.session);
      console.log("Exchange error:", error);

      if (error || !data.session) {
        console.error("❌ Exchange code failed");

        throw redirect({
          to: "/login",
        });
      }
    }

    // 3. ตรวจสอบ session หลังจาก exchange
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("=================================");
    console.log("Session:", session);
    console.log("Session error:", sessionError);
    console.log("=================================");

    if (sessionError || !session) {
      console.error("❌ No session found");

      throw redirect({
        to: "/login",
      });
    }

    const userId = session.user.id;

    console.log("✅ User ID:", userId);

    // 4. ตรวจสอบ Profile
    const { data: profile, error: profileError } = await supabase
      .from("profile")
      .select("profile_id, name, age, gender")
      .eq("profile_id", userId)
      .maybeSingle();

    console.log("Profile:", profile);
    console.log("Profile error:", profileError);

    if (profileError) {
      console.error("❌ Profile query error");

      throw redirect({
        to: "/profile-setup",
      });
    }

    // ยังไม่มี profile หรือกรอกข้อมูลไม่ครบ
    if (
      !profile ||
      !profile.name ||
      !profile.age ||
      !profile.gender
    ) {
      console.log("➡️ ไป Profile Setup");

      throw redirect({
        to: "/profile-setup",
      });
    }

    // 5. ตรวจสอบ User Preferences
    const { data: preferences, error: preferencesError } =
      await supabase
        .from("user_preferences")
        .select(`
          profile_id,
          travel_type,
          activity,
          atmosphere,
          travel_companion,
          budget,
          travel_time,
          preferred_region,
          travel_goal
        `)
        .eq("profile_id", userId)
        .maybeSingle();

    console.log("Preferences:", preferences);
    console.log("Preferences error:", preferencesError);

    if (preferencesError) {
      console.error("❌ Preferences query error");

      throw redirect({
        to: "/personal-survey",
      });
    }

    // ยังไม่มี preferences หรือกรอกไม่ครบ
    if (
      !preferences ||
      !preferences.travel_type ||
      !preferences.activities ||
      !preferences.atmosphere ||
      !preferences.travel_companion ||
      !preferences.budget ||
      !preferences.travel_time ||
      !preferences.preferred_region ||
      !preferences.travel_goal
    ) {
      console.log("➡️ ไป Personal Survey");

      throw redirect({
        to: "/personal-survey",
      });
    }

    // 6. ทุกอย่างครบแล้ว
    console.log("✅ Profile + Preferences complete");
    console.log("➡️ ไป Home");

    throw redirect({
      to: "/home",
    });
  },
});
