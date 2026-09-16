import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle } from "@/services/auth";
import TravelPageShell, { formCardClass, inputClass, primaryButtonClass } from "@/components/TravelPageShell";
export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "สมัครสมาชิก — Travel" },
      { name: "description", content: "สมัครสมาชิกเพื่อเริ่มวางแผนการเดินทางของคุณ" },
      { property: "og:title", content: "สมัครสมาชิก — Travel" },
      { property: "og:description", content: "สมัครสมาชิกเพื่อเริ่มวางแผนการเดินทางของคุณ" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: เชื่อมต่อระบบยืนยันตัวตนจริงเมื่อเปิดใช้งาน Lovable Cloud
    if (password !== confirmPassword) {
      console.error("รหัสผ่านไม่ตรงกัน");
      return;
    }
    console.log("register", { name, email, password });
  };

  return (
    <TravelPageShell
      eyebrow="A new adventure awaits"
      title={<>เริ่มต้นการเดินทาง<br /><span className="text-[var(--aurora-pink)]">ของคุณวันนี้</span></>}
      description="สมัครสมาชิกเพื่อวางแผนทริป บันทึกสถานที่โปรด และแชร์ประสบการณ์เดินทางกับเพื่อน ๆ"
    >
      <Card className={formCardClass}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">สมัครสมาชิก</CardTitle>
            <CardDescription>กรอกข้อมูลเพื่อสร้างบัญชีใหม่</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">ชื่อ</Label>
                <Input
                  className={inputClass}
                  id="name"
                  type="text"
                  placeholder="ชื่อของคุณ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
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
                <Label htmlFor="password">รหัสผ่าน</Label>
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
              <div className="space-y-2">
                <Label htmlFor="confirm-password">ยืนยันรหัสผ่าน</Label>
                <Input
                  className={inputClass}
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className={`${primaryButtonClass} w-full`} >
                <UserPlus className="h-4 w-4" />
                สมัครสมาชิก
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
                มีบัญชีอยู่แล้ว?{" "}
                <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
    </TravelPageShell>
  );
}
