import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";

import {
  saveGuestPreferences,
  type GuestPreferences,
} from "@/lib/guest/guestPreferences";

type Props = {
  open: boolean;
  onComplete: (
    preferences: GuestPreferences
  ) => void;
  onClose?: () => void;
};

const TRAVEL_TYPES = [
  "ภูเขา",
  "ทะเล",
  "วัฒนธรรม",
  "คาเฟ่",
  "ธรรมชาติ",
  "เมือง",
];

const ACTIVITIES = [
  "ถ่ายรูป",
  "เดินป่า",
  "อาหาร",
  "ช้อปปิ้ง",
  "พักผ่อน",
];

const ATMOSPHERES = [
  "คึกคัก",
  "เงียบสงบ",
  "ผจญภัย",
  "หรูหรา",
];

const COMPANIONS = [
  "คนเดียว",
  "คู่รัก",
  "เพื่อน",
  "ครอบครัว",
];

const BUDGETS = [
  "ประหยัด",
  "ปานกลาง",
  "หรูหรา",
];

const GOALS = [
  "พักผ่อน",
  "กินและคาเฟ่",
  "ถ่ายรูปและคอนเทนต์",
  "ผจญภัย",
  "วัฒนธรรมและ Local",
  "Wellness",
];

const PERSONALITY_TAGS = [
  "🌿 สายธรรมชาติ",
  "📸 สายถ่ายรูป",
  "☕ สายคาเฟ่",
  "🍜 สายกิน",
  "🥘 ชอบอาหารท้องถิ่น",
  "💎 ชอบร้านลับ",
  "🔥 ชอบสถานที่กำลังไวรัล",
  "✨ สายคอนเทนต์",
  "🧘 สายชิล",
  "🧗 สายลุย",
  "🛍️ สายช้อป",
  "🏛️ สายวัฒนธรรม",
  "🌙 สายกลางคืน",
  "🚗 ไม่ชอบอยู่บนรถนาน",
  "🍴 ยอมเดินทางไกลเพื่อร้านอร่อย",
];

function toggleValue(
  value: string,
  current: string[],
  setter: (
    value: string[]
  ) => void
) {
  setter(
    current.includes(value)
      ? current.filter(
          item => item !== value
        )
      : [...current, value]
  );
}

function Chip({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
        selected
          ? "border-[#8d6a99] bg-[#6f456f] text-white shadow-sm"
          : "border-[#ded2df] bg-white/75 text-[#5f5668] hover:border-[#bca4c2] hover:bg-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function GuestPreferenceModal({
  open,
  onComplete,
  onClose,
}: Props) {
  const [
    travelTypes,
    setTravelTypes
  ] = useState<string[]>([]);

  const [
    activities,
    setActivities
  ] = useState<string[]>([]);

  const [
    atmosphere,
    setAtmosphere
  ] = useState("");

  const [
    companion,
    setCompanion
  ] = useState("");

  const [
    budget,
    setBudget
  ] = useState("");

  const [
    goal,
    setGoal
  ] = useState("");

  const [
    personalityTags,
    setPersonalityTags
  ] = useState<string[]>([]);

  const [error, setError] =
    useState("");

  if (!open) {
    return null;
  }

  const handleContinue = () => {
    if (
      travelTypes.length === 0 ||
      activities.length === 0 ||
      !atmosphere ||
      !companion ||
      !budget
    ) {
      setError(
        "เลือกประเภทเที่ยว กิจกรรม บรรยากาศ ผู้ร่วมทริป และงบประมาณก่อนนะ"
      );
      return;
    }

    const preferences:
      GuestPreferences = {
        travel_type:
          travelTypes,
        activities,
        atmosphere,
        travel_companion:
          companion,
        budget,
        travel_time:
          "ยืดหยุ่น",
        preferred_region: [],
        travel_goal:
          goal ||
          "เที่ยวให้ตรงกับไลฟ์สไตล์",
        personality_tags:
          personalityTags,
      };

    saveGuestPreferences(
      preferences
    );

    onComplete(preferences);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#302b43]/45 px-3 py-4 backdrop-blur-sm sm:px-6">
      <div className="relative max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-white/80 bg-[#fffdfb] shadow-[0_30px_100px_rgba(48,43,67,0.28)]">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#6f6577] shadow-sm"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="border-b border-[#eadfea] bg-gradient-to-br from-[#f4ebf7] via-[#fff6fa] to-[#eef9fa] px-5 py-6 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-xs font-extrabold text-[#6f456f] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            GUEST PERSONALIZATION
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-[#302b43] sm:text-3xl">
            บอกสไตล์การเที่ยวของคุณนิดนึง
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756d7c]">
            เลือกสิ่งที่ตรงกับคุณ เพื่อให้ TravelWish แนะนำสถานที่ ร้านอาหาร และจัดทริปให้เหมาะกับคุณมากขึ้น
          </p>

          <p className="mt-2 text-xs font-medium text-[#93899a]">
            ข้อมูล Guest จะถูกเก็บไว้ใน browser เครื่องนี้เท่านั้น
          </p>
        </div>

        <div className="space-y-7 px-5 py-6 sm:px-8">
          <section>
            <h3 className="font-extrabold text-[#40384a]">
              อยากเที่ยวแบบไหน?
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRAVEL_TYPES.map(item => (
                <Chip
                  key={item}
                  selected={
                    travelTypes.includes(
                      item
                    )
                  }
                  onClick={() =>
                    toggleValue(
                      item,
                      travelTypes,
                      setTravelTypes
                    )
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-extrabold text-[#40384a]">
              ชอบทำอะไรระหว่างเที่ยว?
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {ACTIVITIES.map(item => (
                <Chip
                  key={item}
                  selected={
                    activities.includes(
                      item
                    )
                  }
                  onClick={() =>
                    toggleValue(
                      item,
                      activities,
                      setActivities
                    )
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-extrabold text-[#40384a]">
              บรรยากาศที่ชอบ
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {ATMOSPHERES.map(item => (
                <Chip
                  key={item}
                  selected={
                    atmosphere === item
                  }
                  onClick={() =>
                    setAtmosphere(item)
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h3 className="font-extrabold text-[#40384a]">
                ปกติเที่ยวกับใคร?
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {COMPANIONS.map(item => (
                  <Chip
                    key={item}
                    selected={
                      companion === item
                    }
                    onClick={() =>
                      setCompanion(item)
                    }
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-extrabold text-[#40384a]">
                สไตล์งบประมาณ
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {BUDGETS.map(item => (
                  <Chip
                    key={item}
                    selected={
                      budget === item
                    }
                    onClick={() =>
                      setBudget(item)
                    }
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </section>
          </div>

          <section>
            <h3 className="font-extrabold text-[#40384a]">
              เป้าหมายของทริป
              <span className="ml-2 text-xs font-medium text-[#9a91a2]">
                (เลือกได้ 1)
              </span>
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {GOALS.map(item => (
                <Chip
                  key={item}
                  selected={goal === item}
                  onClick={() =>
                    setGoal(item)
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-extrabold text-[#40384a]">
              ไลฟ์สไตล์ของคุณ
              <span className="ml-2 text-xs font-medium text-[#9a91a2]">
                (เลือกได้หลายข้อ)
              </span>
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {PERSONALITY_TAGS.map(
                item => (
                  <Chip
                    key={item}
                    selected={
                      personalityTags.includes(
                        item
                      )
                    }
                    onClick={() =>
                      toggleValue(
                        item,
                        personalityTags,
                        setPersonalityTags
                      )
                    }
                  >
                    {item}
                  </Chip>
                )
              )}
            </div>
          </section>

          {error && (
            <div className="rounded-2xl bg-[#fff0f3] px-4 py-3 text-sm font-semibold text-[#9a5968]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleContinue}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9f7bb2] via-[#d493b6] to-[#83c4cf] px-5 py-4 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(111,69,111,0.22)] transition hover:-translate-y-0.5"
          >
            เริ่มเที่ยวแบบ Guest
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
