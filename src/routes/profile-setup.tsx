import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/profile-setup")({ component: ProfileSetup });
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TravelPageShell, { formCardClass, inputClass, primaryButtonClass } from "@/components/TravelPageShell";

export default function ProfileSetup() {
  const [name, setName] = useState("");
  const [home, setHome] = useState("");
  return <TravelPageShell eyebrow="Nice to meet you" title={<>ทำความรู้จักกัน<br /><span className="text-[var(--aurora-pink)]">อีกนิดหนึ่ง</span></>} description="ข้อมูลเล็ก ๆ น้อย ๆ จะช่วยให้ TravelWise แนะนำประสบการณ์ที่เหมาะกับคุณมากขึ้น">
    <form className={formCardClass} onSubmit={(event) => event.preventDefault()}>
      <div className="mb-7"><p className="text-sm font-semibold text-[var(--aurora-pink)]">ขั้นตอนที่ 2 จาก 2</p><h2 className="mt-2 text-2xl font-bold text-[var(--aurora-ink)]">ตั้งค่าโปรไฟล์</h2></div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2"><Label htmlFor="profile-name">ชื่อที่อยากให้เราเรียก</Label><Input id="profile-name" className={inputClass} placeholder="เช่น มินท์" value={name} onChange={(event) => setName(event.target.value)} required /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="profile-home">เมืองที่คุณอยู่</Label><Input id="profile-home" className={inputClass} placeholder="เช่น กรุงเทพมหานคร" value={home} onChange={(event) => setHome(event.target.value)} required /></div>
        <Button type="submit" className={`${primaryButtonClass} mt-3 w-full`}>เริ่มวางแผนทริป</Button>
      </div>
    </form>
  </TravelPageShell>;
}
