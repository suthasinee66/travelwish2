import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/personal-survey")({ component: PersonalSurvey });
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import TravelPageShell, { activeOptionClass, formCardClass, optionClass, primaryButtonClass } from "@/components/TravelPageShell";

const interests = ["ทะเลและเกาะ", "ภูเขาและธรรมชาติ", "คาเฟ่และอาหาร", "ศิลปะและวัฒนธรรม", "ช้อปปิ้ง"];

export default function PersonalSurvey() {
  const [selected, setSelected] = useState<string[]>([]);
  return <TravelPageShell eyebrow="Make it yours" title={<>บอกเราหน่อยว่า<br /><span className="text-[var(--aurora-pink)]">คุณชอบเที่ยวแบบไหน</span></>} description="เลือกสิ่งที่ใช่สำหรับคุณ แล้วเราจะช่วยออกแบบทริปที่เข้ากับสไตล์การเดินทางของคุณที่สุด">
    <div className={formCardClass}>
      <div className="mb-7"><p className="text-sm font-semibold text-[var(--aurora-pink)]">ขั้นตอนที่ 1 จาก 2</p><h2 className="mt-2 text-2xl font-bold text-[var(--aurora-ink)]">ความสนใจของคุณ</h2><p className="mt-2 text-sm text-muted-foreground">เลือกได้มากกว่าหนึ่งข้อ</p></div>
      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="ความสนใจในการเดินทาง">
        {interests.map((interest) => { const isSelected = selected.includes(interest); return <button key={interest} type="button" onClick={() => setSelected((items) => isSelected ? items.filter((item) => item !== interest) : [...items, interest])} className={`${optionClass} ${isSelected ? activeOptionClass : ""}`} aria-pressed={isSelected}>{interest}</button>; })}
      </div>
      <Button className={`${primaryButtonClass} mt-8 w-full`} disabled={!selected.length}>ไปต่อ</Button>
      <Label className="sr-only">เลือกความสนใจของคุณ</Label>
    </div>
  </TravelPageShell>;
}
