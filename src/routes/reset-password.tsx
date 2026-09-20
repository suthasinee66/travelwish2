import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Compass, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "ตั้งรหัสผ่านใหม่ — TravelWish" },
      {
        name: "description",
        content: "ตั้งรหัสผ่าน TravelWish ใหม่",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [validRecoverySession, setValidRecoverySession] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setValidRecoverySession(Boolean(session));
      setChecking(false);
    };

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setValidRecoverySession(Boolean(session));
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    if (password.length < 6) {
      alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("Update password error:", error);
        alert("ไม่สามารถตั้งรหัสผ่านใหม่ได้: " + error.message);
        return;
      }

      await supabase.auth.signOut();
      alert("ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง");

      navigate({
        to: "/login",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      alert("เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่");
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
                New password
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
                <LockKeyhole className="h-6 w-6 text-[#725d80]" />
              </div>

              <h1 className="text-3xl font-black tracking-tight text-[#302b43]">
                ตั้งรหัสผ่านใหม่
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#777080]">
                ตั้งรหัสผ่านใหม่สำหรับบัญชี TravelWish ของคุณ
              </p>
            </div>

            {checking ? (
              <div className="flex items-center justify-center py-8">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#c8a9d8]/40 border-t-[#725d80]" />
              </div>
            ) : !validRecoverySession ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#e8c4cc] bg-[#fff4f6]/80 p-4 text-center">
                  <p className="font-bold text-[#9a5f6d]">
                    ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#826b72]">
                    กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง
                  </p>
                </div>

                <Link
                  to="/forgot-password"
                  className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#a98bc0] via-[#d59abb] to-[#8fcbd6] px-5 py-3.5 text-sm font-bold text-white"
                >
                  ขอลิงก์ใหม่
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="password" className="ml-1 text-sm font-bold text-[#514b65]">
                    รหัสผ่านใหม่
                  </label>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9a91a5]" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full rounded-2xl border border-white/90 bg-white/70 py-3.5 pl-11 pr-12 text-sm font-medium text-[#302b43] outline-none transition-all placeholder:text-[#aaa2b1] focus:border-[#b89bcb] focus:bg-white/90 focus:ring-4 focus:ring-[#c8a9d8]/20 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#948a9f] hover:bg-[#c8a9d8]/10"
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="ml-1 text-sm font-bold text-[#514b65]">
                    ยืนยันรหัสผ่านใหม่
                  </label>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9a91a5]" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full rounded-2xl border border-white/90 bg-white/70 py-3.5 pl-11 pr-12 text-sm font-medium text-[#302b43] outline-none transition-all placeholder:text-[#aaa2b1] focus:border-[#b89bcb] focus:bg-white/90 focus:ring-4 focus:ring-[#c8a9d8]/20 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#948a9f] hover:bg-[#c8a9d8]/10"
                      aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#a98bc0] via-[#d59abb] to-[#8fcbd6] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(146,111,161,0.25)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    "บันทึกรหัสผ่านใหม่"
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
