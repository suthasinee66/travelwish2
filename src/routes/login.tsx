
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Plane } from "lucide-react";
import { signInWithGoogle } from "@/services/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — Travel" },
      {
        name: "description",
        content: "เข้าสู่ระบบเพื่อเริ่มวางแผนการเดินทางของคุณ",
      },
      { property: "og:title", content: "เข้าสู่ระบบ — Travel" },
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

    if (preferencesError) {
      console.error("Preferences check error:", preferencesError);
      alert("ไม่สามารถตรวจสอบข้อมูลความชอบการเดินทางได้");
      return;
    }

    // ยังไม่มี Personal Survey
    if (
      !preferences ||
      !preferences.travel_type ||
      !preferences.activity ||
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
        email,
        password,
      });

      if (error) {
        alert("Login ไม่สำเร็จ: " + error.message);
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
      // ดังนั้นไม่ต้อง navigate ตรงนี้
    } catch (error) {
      console.error("Google login error:", error);
      alert("ไม่สามารถเข้าสู่ระบบด้วย Google ได้");
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-background to-emerald-50 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-sky-300/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-emerald-300/40 blur-3xl" />
      </div>

      <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-2 lg:items-center">
        {/* LEFT */}
        <section className="space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur">
            <Plane className="h-4 w-4" />
            Travel Planner
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            ออกเดินทางครั้งต่อไป
            <br />

            <span className="bg-gradient-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
              เริ่มต้นที่นี่
            </span>
          </h1>

          <p className="mx-auto max-w-md text-base text-muted-foreground lg:mx-0">
            เข้าสู่ระบบเพื่อวางแผนทริป จองที่พัก
            และเก็บความทรงจำการเดินทางของคุณไว้ในที่เดียว
          </p>
        </section>

        {/* LOGIN CARD */}
        <Card className="border-border/60 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              เข้าสู่ระบบ
            </CardTitle>

            <CardDescription>
              กรอกอีเมลและรหัสผ่านของคุณเพื่อเริ่มต้น
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* EMAIL */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  อีเมล
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">
                    รหัสผ่าน
                  </Label>

                  <Link
                    to="/"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ลืมรหัสผ่าน?
                  </Link>
                </div>

                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* LOGIN */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>

              {/* GOOGLE */}
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading
                  ? "กำลังเข้าสู่ระบบ..."
                  : "เข้าสู่ระบบด้วย Google"}
              </Button>

              {/* REGISTER */}
              <p className="text-center text-sm text-muted-foreground">
                ยังไม่มีบัญชี?{" "}

                <Link
                  to="/register"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  สมัครสมาชิก
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
