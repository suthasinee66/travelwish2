import { createFileRoute, redirect } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { supabase } from "@/lib/supabase";
import TravelPageShell from "@/components/TravelPageShell";

export const Route = createFileRoute("/auth/callback")({
  loader: async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw redirect({ to: "/login" });
    }

    throw redirect({ to: "/home" });
  },
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  return (
    <TravelPageShell
      eyebrow="Almost there"
      title={<>กำลังพาคุณไปพบกับ<br /><span className="text-[var(--aurora-pink)]">ทริปของคุณ</span></>}
      description="เรากำลังตรวจสอบการเข้าสู่ระบบและเตรียมพื้นที่วางแผนการเดินทางให้คุณ"
    >
      <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-[2rem] border border-white/80 bg-white/75 p-8 text-center shadow-[var(--aurora-shadow)] backdrop-blur-xl">
        <span className="grid size-14 place-items-center rounded-2xl bg-[var(--aurora-ink)] text-white shadow-lg">
          <Compass className="size-7 animate-pulse" />
        </span>
        <p className="font-semibold text-[var(--aurora-ink)]">กำลังเตรียมการเดินทาง...</p>
      </div>
    </TravelPageShell>
  );
}
