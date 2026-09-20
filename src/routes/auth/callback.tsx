import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Compass,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "กำลังเข้าสู่ระบบ — TravelWish" },
      {
        name: "description",
        content: "กำลังยืนยันบัญชีและเตรียม TravelWish สำหรับคุณ",
      },
    ],
  }),
  component: AuthCallbackPage,
});

type CallbackStatus =
  | "auth"
  | "profile"
  | "preferences"
  | "ready"
  | "error";

function AuthCallbackPage() {
  const navigate = useNavigate();
  const startedRef = useRef(false);

  const [status, setStatus] = useState<CallbackStatus>("auth");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const runAuthCallback = async () => {
      try {
        // 1. รับ OAuth code จาก Supabase
        const code = new URLSearchParams(window.location.search).get("code");

        // 2. แลก OAuth code เป็น session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Exchange code error:", error);
            throw new Error("ไม่สามารถยืนยันการเข้าสู่ระบบได้");
          }
        }

        // 3. ตรวจสอบ session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("Session error:", sessionError);
          throw new Error("ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง");
        }

        const userId = session.user.id;

        // 4. ตรวจสอบ Profile
        setStatus("profile");

        const { data: profile, error: profileError } = await supabase
          .from("profile")
          .select("profile_id, name, age, gender")
          .eq("profile_id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("Profile check error:", profileError);
          navigate({ to: "/profile-setup", replace: true });
          return;
        }

        const profileComplete =
          profile &&
          !!profile.name &&
          profile.age !== null &&
          profile.age !== undefined &&
          !!profile.gender;

        if (!profileComplete) {
          navigate({ to: "/profile-setup", replace: true });
          return;
        }

        // 5. ตรวจสอบ User Preferences
        setStatus("preferences");

        const { data: preferences, error: preferencesError } = await supabase
          .from("user_preferences")
          .select(
            [
              "profile_id",
              "travel_type",
              "activities",
              "atmosphere",
              "travel_companion",
              "budget",
              "travel_time",
              "preferred_region",
              "travel_goal",
            ].join(",")
          )
          .eq("profile_id", userId)
          .maybeSingle();

        if (preferencesError) {
          console.error("Preferences check error:", preferencesError);
          navigate({ to: "/personal-survey", replace: true });
          return;
        }

        const preferencesComplete =
          preferences &&
          Array.isArray(preferences.travel_type) &&
          preferences.travel_type.length > 0 &&
          Array.isArray(preferences.activities) &&
          preferences.activities.length > 0 &&
          !!preferences.atmosphere &&
          !!preferences.travel_companion &&
          !!preferences.budget &&
          !!preferences.travel_time &&
          Array.isArray(preferences.preferred_region) &&
          preferences.preferred_region.length > 0 &&
          !!preferences.travel_goal;

        if (!preferencesComplete) {
          navigate({ to: "/personal-survey", replace: true });
          return;
        }

        // 6. พร้อมใช้งาน
        setStatus("ready");

        navigate({
          to: "/home",
          replace: true,
        });
      } catch (error) {
        console.error("Auth callback error:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"
        );
        setStatus("error");
      }
    };

    void runAuthCallback();
  }, [navigate]);

  const content = {
    auth: {
      eyebrow: "SECURE SIGN IN",
      title: "กำลังยืนยันบัญชีของคุณ",
      description: "กำลังเชื่อมต่อบัญชีอย่างปลอดภัย โปรดรอสักครู่",
    },
    profile: {
      eyebrow: "WELCOME TO TRAVELWISH",
      title: "กำลังเตรียมโปรไฟล์ของคุณ",
      description: "เรากำลังตรวจสอบข้อมูลเพื่อพาคุณไปยังขั้นตอนที่เหมาะสม",
    },
    preferences: {
      eyebrow: "PERSONALIZING",
      title: "กำลังเตรียมประสบการณ์สำหรับคุณ",
      description: "ตรวจสอบสไตล์การเดินทางเพื่อสร้างคำแนะนำที่ตรงใจ",
    },
    ready: {
      eyebrow: "ALL SET",
      title: "พร้อมออกเดินทางแล้ว",
      description: "กำลังพาคุณเข้าสู่ TravelWish",
    },
  } as const;

  if (status === "error") {
    return (
      <main className="aurora-canvas relative min-h-screen overflow-hidden text-[#302b43]">
        <AuroraBackground />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <section className="w-full max-w-[480px]">
            <div className="rounded-[32px] border border-white/80 bg-white/65 p-6 text-center shadow-[0_24px_70px_rgba(91,72,117,0.14)] backdrop-blur-2xl sm:p-8">
              <TravelWishLogo />

              <div className="mx-auto mt-7 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#ecc9d0] bg-[#fff2f5]/80 shadow-sm">
                <ShieldCheck className="h-7 w-7 text-[#a86776]" />
              </div>

              <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#a86776]">
                SIGN IN PROBLEM
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-[#302b43] sm:text-3xl">
                ไม่สามารถเข้าสู่ระบบได้
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#777080]">
                {errorMessage}
              </p>

              <div className="mt-7 space-y-3">
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#a98bc0] via-[#d59abb] to-[#8fcbd6] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(146,111,161,0.25)] transition hover:-translate-y-0.5"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>

                <p className="text-xs leading-5 text-[#968d9f]">
                  หากปัญหายังเกิดขึ้น กรุณาลองเข้าสู่ระบบใหม่อีกครั้ง
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const current = content[status];

  return (
    <main className="aurora-canvas relative min-h-screen overflow-hidden text-[#302b43]">
      <AuroraBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <section className="w-full max-w-[500px]">
          <div className="rounded-[34px] border border-white/80 bg-white/60 p-6 text-center shadow-[0_28px_80px_rgba(91,72,117,0.14)] backdrop-blur-2xl sm:p-9">
            <TravelWishLogo />

            <div className="relative mx-auto mt-8 flex h-[92px] w-[92px] items-center justify-center">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-[#c8a9d8]/35 via-[#e9a8c9]/25 to-[#a9dce8]/35 blur-xl" />

              <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-[24px] border border-white/90 bg-white/70 shadow-[0_14px_35px_rgba(91,72,117,0.12)] backdrop-blur-xl">
                {status === "ready" ? (
                  <CheckCircle2 className="h-9 w-9 text-[#679b86]" />
                ) : (
                  <LoaderCircle className="h-9 w-9 animate-spin text-[#8b6ca0]" />
                )}
              </div>
            </div>

            <div className="mt-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/50 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.18em] text-[#806a8c] shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#b07fa2]" />
                {current.eyebrow}
              </div>

              <h1 className="mt-4 text-2xl font-black tracking-tight text-[#302b43] sm:text-[30px]">
                {current.title}
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#777080]">
                {current.description}
              </p>
            </div>

            <div className="mt-8 rounded-[22px] border border-white/75 bg-white/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <ProgressStep
                  label="บัญชี"
                  active
                  complete={status !== "auth"}
                />

                <ProgressLine active={status !== "auth"} />

                <ProgressStep
                  label="โปรไฟล์"
                  active={status !== "auth"}
                  complete={
                    status === "preferences" || status === "ready"
                  }
                />

                <ProgressLine
                  active={
                    status === "preferences" || status === "ready"
                  }
                />

                <ProgressStep
                  label="พร้อมเที่ยว"
                  active={
                    status === "preferences" || status === "ready"
                  }
                  complete={status === "ready"}
                />
              </div>
            </div>

            <p className="mt-6 text-[11px] leading-5 text-[#9a91a2]">
              กรุณาอย่าปิดหน้านี้ระหว่างกำลังเข้าสู่ระบบ
            </p>
          </div>

          <p className="mt-5 text-center text-xs font-medium text-[#8c8395]">
            TravelWish · Personalized Travel
          </p>
        </section>
      </div>
    </main>
  );
}

function TravelWishLogo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-[#b89bcb] via-[#d9a4c8] to-[#a9dce8] shadow-[0_8px_24px_rgba(91,72,117,0.18)]">
        <Compass className="h-5 w-5 text-white" />
      </div>

      <div className="text-left">
        <div className="text-[17px] font-extrabold tracking-tight text-[#302b43]">
          TravelWish
        </div>

        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8b8198]">
          Personalized Travel
        </div>
      </div>
    </div>
  );
}

function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#c8a9d8]/45 blur-3xl" />
      <div className="absolute right-[-100px] top-[10%] h-[360px] w-[360px] rounded-full bg-[#e9a8c9]/35 blur-3xl" />
      <div className="absolute -bottom-32 left-[20%] h-[380px] w-[380px] rounded-full bg-[#a9dce8]/30 blur-3xl" />
      <div className="absolute bottom-[-120px] right-[-80px] h-[420px] w-[420px] rounded-full bg-[#bfe5d4]/40 blur-3xl" />
    </div>
  );
}

function ProgressStep({
  label,
  active,
  complete,
}: {
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex min-w-[66px] flex-col items-center gap-2">
      <div
        className={[
          "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all",
          complete
            ? "border-[#a8d6c4] bg-[#dff3ea] text-[#527b6a]"
            : active
              ? "border-[#c8a9d8] bg-[#efe4f5] text-[#765d85]"
              : "border-[#ddd5e2] bg-white/50 text-[#aaa1b0]",
        ].join(" ")}
      >
        {complete ? <CheckCircle2 className="h-4 w-4" /> : "•"}
      </div>

      <span
        className={[
          "text-[10px] font-bold",
          active ? "text-[#6d6277]" : "text-[#aaa1b0]",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

function ProgressLine({ active }: { active: boolean }) {
  return (
    <div
      className={[
        "mb-5 h-[2px] flex-1 rounded-full transition-all",
        active ? "bg-[#c8a9d8]" : "bg-[#ded7e2]",
      ].join(" ")}
    />
  );
}
