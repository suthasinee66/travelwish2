import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Compass, Mail, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "ลืมรหัสผ่าน — TravelWish" },
      {
        name: "description",
        content: "ขอลิงก์สำหรับตั้งรหัสผ่าน TravelWish ใหม่",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail || loading) return;

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        console.error("Password reset email error:", error);

        if (error.status === 429) {
          alert("ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
          return;
        }

        alert("ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้: " + error.message);
        return;
      }

      setSent(true);
    } catch (error) {
      console.error("Password reset error:", error);
      alert("เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="aurora-canvas relative min-h-screen overflow-hidden text-[#302b43]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#c8a9d8]/45 blur-3xl" />
        <div className="absolute right-[-100px] top-[15%] h-[360px] w-[360px] rounded-full bg-[#e9a8c9]/35 blur-3xl" />
        <div className="absolute -bottom-32 left-[25%] h-[380px] w-[380px] rounded-full bg-[#a9dce8]/30 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[420px] w-[420px] rounded-full bg-[#bfe5d4]/40 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-white/70 bg-white/50 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center px-5 sm:px-8">
          <Link to="/login" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-[#b89bcb] via-[#d9a4c8] to-[#a9dce8] shadow-[0_8px_24px_rgba(91,72,117,0.18)]">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[17px] font-extrabold tracking-tight text-[#302b43]">
                TravelWish
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b8198]">
                Password recovery
              </div>
            </div>
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-72px)] items-center justify-center px-5 py-10 sm:px-8">
        <section className="w-full max-w-[470px]">
          <div className="rounded-[30px] border border-white/80 bg-white/65 p-5 shadow-[0_24px_70px_rgba(91,72,117,0.14)] backdrop-blur-2xl sm:p-7">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#c8a9d8]/20">
                <Mail className="h-6 w-6 text-[#725d80]" />
              </div>

              <h1 className="text-3xl font-black tracking-tight text-[#302b43]">
                ลืมรหัสผ่าน?
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#777080]">
                กรอกอีเมลที่ใช้สมัครสมาชิก
                <br />
                เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
              </p>
            </div>

            {sent ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#bfe5d4] bg-[#eef9f4]/80 p-4 text-center">
                  <p className="font-bold text-[#496c5e]">ตรวจสอบอีเมลของคุณ</p>
                  <p className="mt-2 text-sm leading-6 text-[#61736c]">
                    หากมีบัญชีสำหรับ <span className="font-semibold">{email.trim()}</span>{" "}
                    คุณจะได้รับลิงก์สำหรับตั้งรหัสผ่านใหม่
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="w-full rounded-2xl border border-white/90 bg-white/70 px-5 py-3.5 text-sm font-bold text-[#5e5267] transition hover:bg-white"
                >
                  ส่งไปยังอีเมลอื่น
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="ml-1 text-sm font-bold text-[#514b65]">
                    อีเมล
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9a91a5]" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full rounded-2xl border border-white/90 bg-white/70 py-3.5 pl-11 pr-4 text-sm font-medium text-[#302b43] outline-none transition-all placeholder:text-[#aaa2b1] focus:border-[#b89bcb] focus:bg-white/90 focus:ring-4 focus:ring-[#c8a9d8]/20 disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#a98bc0] via-[#d59abb] to-[#8fcbd6] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(146,111,161,0.25)] transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      ส่งลิงก์รีเซ็ตรหัสผ่าน
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <Link
              to="/login"
              className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[#73577f] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับไปเข้าสู่ระบบ
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
