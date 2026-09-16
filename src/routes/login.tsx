import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, signInWithGoogle } from "@/services/auth";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import TravelPageShell, { formCardClass, inputClass, primaryButtonClass } from "@/components/TravelPageShell";
export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — Travel" },
      { name: "description", content: "เข้าสู่ระบบเพื่อเริ่มวางแผนการเดินทางของคุณ" },
      { property: "og:title", content: "เข้าสู่ระบบ — Travel" },
      { property: "og:description", content: "เข้าสู่ระบบเพื่อเริ่มวางแผนการเดินทางของคุณ" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Login ไม่สำเร็จ: " + error.message);
      return;
    }

    if (data.user) {
      navigate({ to: "/home" });
    }
  };

  return (
    <TravelPageShell
      eyebrow="Welcome back, explorer"
      title={<>ออกเดินทางครั้งต่อไป<br /><span className="text-[var(--aurora-pink)]">เริ่มต้นที่นี่</span></>}
      description="เข้าสู่ระบบเพื่อวางแผนทริป บันทึกสถานที่โปรด และเก็บความทรงจำการเดินทางไว้ในที่เดียว"
    >
        <Card className={formCardClass}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">เข้าสู่ระบบ</CardTitle>
            <CardDescription>กรอกอีเมลและรหัสผ่านของคุณเพื่อเริ่มต้น</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  className={inputClass}
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
                    ลืมรหัสผ่าน?
                  </Link>
                </div>
                <Input
                  className={inputClass}
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className={`${primaryButtonClass} w-full`} >
                เข้าสู่ระบบ
                
              </Button>
              <Button
  type="button"
  variant="outline"
  className="w-full mt-2"
  onClick={async () => {
    await signInWithGoogle();
  }}
>
  เข้าสู่ระบบด้วย Google
</Button>
              <p className="text-center text-sm text-muted-foreground">
                ยังไม่มีบัญชี?{" "}
                <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
                  สมัครสมาชิก
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
    </TravelPageShell>
  );
}
