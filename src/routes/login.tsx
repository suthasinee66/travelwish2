import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  ArrowRight,
  Check,
  Compass,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Plane,
  Sparkles,
} from "lucide-react";

import { signInWithGoogle } from "@/services/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — TravelWish" },
      {
        name: "description",
        content: "เข้าสู่ระบบเพื่อเริ่มวางแผนการเดินทางของคุณ",
      },
      { property: "og:title", content: "เข้าสู่ระบบ — TravelWish" },
      {
        property: "og:description",
        content: "เข้าสู่ระบบเพื่อเริ่มวางแผนการเดินทางของคุณ",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  /**
   * ตรวจสอบว่าผู้ใช้กรอก Profile และ Personal Survey แล้วหรือยัง
   */
  const redirectAfterLogin = async (userId: string) => {
    // 1. ตรวจสอบ Profile
    const { data: profile, error: profileError } = await supabase
      .from("profile")
      .select("profile_id, name, age, gender")
      .eq("profile_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Profile check error:", profileError);
      alert("ไม่สามารถตรวจสอบข้อมูลโปรไฟล์ได้");
      return;
    }

    // ยังไม่มี Profile
    if (
      !profile ||
      !profile.name ||
      !profile.age ||
      !profile.gender
    ) {
      navigate({ to: "/profile-setup" });
      return;
    }

    // 2. ตรวจสอบ Personal Survey
    const { data: preferences, error: preferencesError } = await supabase
      .from("user_preferences")
      .select(`
        profile_id,
        travel_type,
        activities,
        atmosphere,
        travel_companion,
        budget,
        travel_time,
        preferred_region,
        travel_goal
      `)
      .eq("profile_id", userId)
      .maybeSingle();

    if (preferencesError) {
      console.error("Preferences check error:", preferencesError);
      alert("ไม่สามารถตรวจสอบข้อมูลความชอบการเดินทางได้");
      return;
    }

    // ยังไม่มี Personal Survey
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
      navigate({ to: "/personal-survey" });
      return;
    }

    // 3. ข้อมูลครบแล้ว → Home
    navigate({ to: "/home" });
  };

  /**
   * Login ด้วย Email + Password
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Email login error:", error);

        if (error.code === "email_not_confirmed") {
          alert("ยังไม่ได้ยืนยันอีเมล กรุณาเปิดอีเมลและกดลิงก์ยืนยันบัญชีก่อนเข้าสู่ระบบ");
          return;
        }

        if (error.code === "invalid_credentials") {
          alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง หากอีเมลนี้เคยสมัครด้วย Google กรุณาเข้าสู่ระบบด้วย Google");
          return;
        }

        alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
        return;
      }

      if (data.user) {
        await redirectAfterLogin(data.user.id);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login ด้วย Google
   */
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      await signInWithGoogle();

      // Google OAuth จะ redirect ไปยัง callback
    } catch (error) {
      console.error("Google login error:", error);
      alert("ไม่สามารถเข้าสู่ระบบด้วย Google ได้");
      setLoading(false);
    }
  };

  return (
    <main className="aurora-canvas relative min-h-screen overflow-hidden text-[#302b43]">
      {/* =========================================================
          BACKGROUND AURORA
      ========================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#c8a9d8]/45 blur-3xl" />

        <div className="absolute right-[-100px] top-[15%] h-[360px] w-[360px] rounded-full bg-[#e9a8c9]/35 blur-3xl" />

        <div className="absolute -bottom-32 left-[25%] h-[380px] w-[380px] rounded-full bg-[#a9dce8]/30 blur-3xl" />

        <div className="absolute bottom-[-120px] right-[-80px] h-[420px] w-[420px] rounded-full bg-[#bfe5d4]/40 blur-3xl" />
      </div>

      {/* =========================================================
          HEADER
      ========================================================= */}
      <header className="relative z-20 border-b border-white/70 bg-white/50 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          {/* LOGO */}
          <Link
            to="/login"
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-[#b89bcb] via-[#d9a4c8] to-[#a9dce8] shadow-[0_8px_24px_rgba(91,72,117,0.18)] transition-transform duration-300 group-hover:scale-105">
              <Compass className="h-5 w-5 text-white" />
            </div>

            <div>
              <div className="text-[17px] font-extrabold tracking-tight text-[#302b43]">
                TravelWish
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b8198]">
                Personalized Travel
              </div>
            </div>
          </Link>

          {/* REGISTER */}
          <div className="hidden items-center gap-3 text-sm sm:flex">
            <span className="text-[#71697d]">
              ยังไม่มีบัญชี?
            </span>

            <Link
              to="/register"
              className="rounded-full border border-[#c8a9d8]/60 bg-white/60 px-4 py-2 font-semibold text-[#6e587b] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            >
              สมัครสมาชิก
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN
      ========================================================= */}
      <div className="relative z-10 flex min-h-[calc(100vh-72px)] items-center px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          
          {/* =====================================================
              LEFT CONTENT
          ===================================================== */}
          <section className="hidden lg:block">
            <div className="max-w-xl">
              {/* BADGE */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/55 px-4 py-2 text-xs font-bold tracking-[0.12em] text-[#705b7c] shadow-sm backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-[#b89bcb]" />
                PERSONALIZED TRAVEL
              </div>

              {/* TITLE */}
              <h1 className="text-5xl font-black leading-[1.12] tracking-tight text-[#302b43] xl:text-[58px]">
                ออกเดินทาง
                <br />

                <span className="bg-gradient-to-r from-[#9c78b3] via-[#d58eb7] to-[#76b8c8] bg-clip-text text-transparent">
                  ในแบบของคุณ
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-[17px] leading-8 text-[#6f687e]">
                วางแผนการเดินทางที่ตรงกับสไตล์
                ความสนใจ และความต้องการของคุณ
                ด้วยคำแนะนำที่ออกแบบมาเฉพาะสำหรับคุณ
              </p>

              {/* BENEFITS */}
              <div className="mt-9 space-y-3">
                {[
                  "แนะนำสถานที่ตามความสนใจของคุณ",
                  "วางแผนกำหนดการเดินทางแบบเฉพาะบุคคล",
                  "จัดการทริปและบันทึกสถานที่ที่ชื่นชอบ",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm font-medium text-[#5f586e]"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#bfe5d4]/80">
                      <Check className="h-4 w-4 text-[#527b6a]" />
                    </div>

                    {item}
                  </div>
                ))}
              </div>

              {/* DECORATIVE CARD */}
              <div className="mt-10 flex w-fit items-center gap-4 rounded-[22px] border border-white/80 bg-white/50 px-5 py-4 shadow-[0_16px_45px_rgba(91,72,117,0.08)] backdrop-blur-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3b8d0]/50">
                  <Plane className="h-5 w-5 rotate-[-12deg] text-[#9a6684]" />
                </div>

                <div>
                  <p className="text-sm font-bold text-[#40384e]">
                    Your journey starts here
                  </p>

                  <p className="mt-0.5 text-xs text-[#82798d]">
                    ค้นพบการเดินทางที่เป็นตัวคุณ
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              LOGIN CARD
          ===================================================== */}
          <section className="mx-auto w-full max-w-[470px]">
            <div className="rounded-[30px] border border-white/80 bg-white/65 p-5 shadow-[0_24px_70px_rgba(91,72,117,0.14)] backdrop-blur-2xl sm:p-7">
              
              {/* CARD HEADER */}
              <div className="mb-7 text-center">
                {/* MOBILE LOGO */}
                <div className="mb-5 flex justify-center lg:hidden">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#b89bcb] via-[#d9a4c8] to-[#a9dce8] shadow-[0_10px_30px_rgba(91,72,117,0.18)]">
                    <Compass className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#c8a9d8]/15 px-3 py-1.5 text-xs font-bold text-[#725d80]">
                  <Sparkles className="h-3.5 w-3.5" />
                  WELCOME BACK
                </div>

                <h2 className="text-3xl font-black tracking-tight text-[#302b43]">
                  ยินดีต้อนรับกลับ
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#777080]">
                  เข้าสู่ระบบเพื่อเริ่มต้นการเดินทางของคุณ
                </p>
              </div>

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* EMAIL */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="ml-1 text-sm font-bold text-[#514b65]"
                  >
                    อีเมล
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9a91a5]" />

                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-white/90 bg-white/70 py-3.5 pl-11 pr-4 text-sm font-medium text-[#302b43] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 placeholder:text-[#aaa2b1] focus:border-[#b89bcb] focus:bg-white/90 focus:ring-4 focus:ring-[#c8a9d8]/20"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label
                      htmlFor="password"
                      className="text-sm font-bold text-[#514b65]"
                    >
                      รหัสผ่าน
                    </label>

                    <Link
                      to="/"
                      className="text-xs font-semibold text-[#8b718f] transition-colors hover:text-[#634d6f]"
                    >
                      ลืมรหัสผ่าน?
                    </Link>
                  </div>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9a91a5]" />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-white/90 bg-white/70 py-3.5 pl-11 pr-12 text-sm font-medium text-[#302b43] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 placeholder:text-[#aaa2b1] focus:border-[#b89bcb] focus:bg-white/90 focus:ring-4 focus:ring-[#c8a9d8]/20"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#948a9f] transition-colors hover:bg-[#c8a9d8]/10 hover:text-[#6f5879]"
                      aria-label={
                        showPassword
                          ? "ซ่อนรหัสผ่าน"
                          : "แสดงรหัสผ่าน"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* LOGIN BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#a98bc0] via-[#d59abb] to-[#8fcbd6] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(146,111,161,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(146,111,161,0.32)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      กำลังเข้าสู่ระบบ...
                    </>
                  ) : (
                    <>
                      เข้าสู่ระบบ
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                {/* DIVIDER */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#d8d0dc]/70" />
                  </div>

                  <div className="relative flex justify-center">
                    <span className="bg-[#fdfbff]/80 px-3 text-xs font-medium text-[#9a91a2]">
                      หรือ
                    </span>
                  </div>
                </div>

                {/* GOOGLE */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/90 bg-white/70 px-5 py-3.5 text-sm font-bold text-[#4e4859] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {/* Google G */}
                  <span className="text-base font-black">
                    G
                  </span>

                  {loading
                    ? "กำลังเข้าสู่ระบบ..."
                    : "เข้าสู่ระบบด้วย Google"}
                </button>

                {/* REGISTER */}
                <p className="pt-2 text-center text-sm text-[#7b7383] sm:hidden">
                  ยังไม่มีบัญชี?{" "}
                  <Link
                    to="/register"
                    className="font-bold text-[#73577f] underline-offset-4 hover:underline"
                  >
                    สมัครสมาชิก
                  </Link>
                </p>
              </form>
            </div>

            {/* FOOTER */}
            <p className="mt-5 text-center text-[11px] leading-5 text-[#938a9d]">
              เมื่อเข้าสู่ระบบ คุณสามารถจัดการโปรไฟล์
              <br className="sm:hidden" />
              และวางแผนการเดินทางของคุณได้
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}