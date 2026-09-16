
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

import { Plane, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle } from "@/services/auth";
import { TravelPageShell } from "@/components/TravelPageShell";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "สมัครสมาชิก — Travel" },
      {
        name: "description",
        content: "สมัครสมาชิกเพื่อเริ่มวางแผนการเดินทางของคุณ",
      },
      {
        property: "og:title",
        content: "สมัครสมาชิก — Travel",
      },
      {
        property: "og:description",
        content: "สมัครสมาชิกเพื่อเริ่มวางแผนการเดินทางของคุณ",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    // ตรวจสอบรหัสผ่าน
    if (password !== confirmPassword) {
      alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    // ตรวจสอบความยาวรหัสผ่าน
    if (password.length < 6) {
      alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    try {
      setLoading(true);

      // ------------------------------------------
      // 1. สมัครสมาชิกด้วย Supabase Auth
      // ------------------------------------------
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Register error:", error);
        alert("สมัครสมาชิกไม่สำเร็จ: " + error.message);
        return;
      }

      if (!data.user) {
        alert("ไม่สามารถสร้างบัญชีได้");
        return;
      }

      // ------------------------------------------
      // 2. ถ้าเปิด Email Confirmation
      // ------------------------------------------
      if (!data.session) {
        alert(
          "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วเข้าสู่ระบบ"
        );

        navigate({
          to: "/login",
        });

        return;
      }

      // ------------------------------------------
      // 3. มี Session แล้ว
      //    บันทึกชื่อไว้ใน Profile
      // ------------------------------------------
      const { error: profileError } = await supabase
        .from("profile")
        .upsert(
          {
            profile_id: data.user.id,
            name: name.trim(),
          },
          {
            onConflict: "profile_id",
          }
        );

      if (profileError) {
        console.error("Profile creation error:", profileError);

        alert(
          "สร้างบัญชีสำเร็จ แต่ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้: " +
            profileError.message
        );

        return;
      }

      // ------------------------------------------
      // 4. ไปกรอกข้อมูล Profile ต่อ
      // ------------------------------------------
      navigate({
        to: "/profile-setup",
      });
    } catch (error) {
      console.error("Register error:", error);
      alert("เกิดข้อผิดพลาดในการสมัครสมาชิก");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setLoading(true);

      await signInWithGoogle();

      // Google จะ redirect ไป /auth/callback
      // callback จะตรวจ profile และ user_preferences ต่อ
    } catch (error) {
      console.error("Google register error:", error);

      alert("ไม่สามารถสมัครสมาชิกด้วย Google ได้");

      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Background */}
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
            เริ่มต้นการเดินทาง
            <br />

            <span className="bg-gradient-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
              ของคุณวันนี้
            </span>
          </h1>

          <p className="mx-auto max-w-md text-base text-muted-foreground lg:mx-0">
            สมัครสมาชิกฟรีเพื่อวางแผนทริป บันทึกสถานที่โปรด
            และแชร์ประสบการณ์เดินทางกับเพื่อนๆ
          </p>
        </section>

        {/* REGISTER CARD */}
        <Card className="border-border/60 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              สมัครสมาชิก
            </CardTitle>

            <CardDescription>
              กรอกข้อมูลเพื่อสร้างบัญชีใหม่
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* NAME */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  ชื่อ
                </Label>

                <Input
                  id="name"
                  type="text"
                  placeholder="ชื่อของคุณ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

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
                  disabled={loading}
                />
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  รหัสผ่าน
                </Label>

                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">
                  ยืนยันรหัสผ่าน
                </Label>

                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  required
                  disabled={loading}
                />
              </div>

              {/* REGISTER */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                <UserPlus className="h-4 w-4" />

                {loading
                  ? "กำลังสมัครสมาชิก..."
                  : "สมัครสมาชิก"}
              </Button>

              {/* GOOGLE */}
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                onClick={handleGoogleRegister}
                disabled={loading}
              >
                {loading
                  ? "กำลังดำเนินการ..."
                  : "สมัครสมาชิกด้วย Google"}
              </Button>

              {/* LOGIN */}
              <p className="text-center text-sm text-muted-foreground">
                มีบัญชีอยู่แล้ว?{" "}

                <Link
                  to="/login"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  เข้าสู่ระบบ
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
