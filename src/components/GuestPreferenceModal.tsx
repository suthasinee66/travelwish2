import {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Coffee,
  Compass,
  Heart,
  Landmark,
  Leaf,
  MapPin,
  Mountain,
  PartyPopper,
  Sparkles,
  Trees,
  Users,
  Wallet,
  Waves,
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

type Option = {
  value: string;
  icon?: React.ComponentType<{
    className?: string;
  }>;
  hint?: string;
};

const TRAVEL_TYPES: Option[] = [
  {
    value: "ภูเขา",
    icon: Mountain,
    hint: "วิวสูง อากาศดี",
  },
  {
    value: "ทะเล",
    icon: Waves,
    hint: "ชายหาด เกาะ น้ำใส",
  },
  {
    value: "วัฒนธรรม",
    icon: Landmark,
    hint: "วัด เมืองเก่า Local",
  },
  {
    value: "คาเฟ่",
    icon: Coffee,
    hint: "กาแฟ ของหวาน ถ่ายรูป",
  },
  {
    value: "ธรรมชาติ",
    icon: Trees,
    hint: "ป่า น้ำตก พื้นที่สีเขียว",
  },
  {
    value: "เมือง",
    icon: MapPin,
    hint: "ย่านดัง ช้อปปิ้ง Nightlife",
  },
];

const ACTIVITIES: Option[] = [
  {
    value: "ถ่ายรูป",
    icon: Camera,
  },
  {
    value: "เดินป่า",
    icon: Leaf,
  },
  {
    value: "อาหาร",
    icon: Coffee,
  },
  {
    value: "ช้อปปิ้ง",
    icon: Sparkles,
  },
  {
    value: "พักผ่อน",
    icon: Heart,
  },
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

const STEPS = [
  {
    eyebrow: "YOUR TRAVEL STYLE",
    title: "คุณชอบเที่ยวแบบไหน?",
    description:
      "เลือกสไตล์และกิจกรรมที่ตรงกับคุณได้มากกว่า 1 ข้อ",
  },
  {
    eyebrow: "TRIP VIBE",
    title: "ทริปแบบไหนที่รู้สึกว่าใช่?",
    description:
      "บอกบรรยากาศ คนที่ไปด้วย และสไตล์การใช้เงิน",
  },
  {
    eyebrow: "PERSONAL TOUCH",
    title: "เติมความเป็นคุณอีกนิด",
    description:
      "เลือกเป้าหมายและไลฟ์สไตล์ เพื่อให้ AI เข้าใจคุณมากขึ้น",
  },
] as const;

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

function SelectCard({
  selected,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  selected: boolean;
  icon?: Option["icon"];
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative min-h-[92px] rounded-[22px] border p-4 text-left transition-all duration-200",
        selected
          ? "border-[#9f80ad] bg-[#f5edf8] shadow-[0_10px_30px_rgba(111,69,111,0.10)] ring-2 ring-[#bfa8c8]/20"
          : "border-[#e9e0ea] bg-white/72 hover:-translate-y-0.5 hover:border-[#cdbbd2] hover:bg-white hover:shadow-[0_10px_26px_rgba(90,72,102,0.08)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition",
              selected
                ? "bg-[#6f456f] text-white"
                : "bg-[#f3edf4] text-[#7c6685] group-hover:bg-[#eee4f0]",
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-[#40384a]">
              {title}
            </span>

            {selected && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6f456f] text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>

          {hint && (
            <p className="mt-1 text-xs leading-5 text-[#8b8192]">
              {hint}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function ChoicePill({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2.5 text-sm font-bold transition-all duration-200",
        selected
          ? "border-[#6f456f] bg-[#6f456f] text-white shadow-[0_7px_18px_rgba(111,69,111,0.16)]"
          : "border-[#e2d8e4] bg-white/80 text-[#655b6d] hover:border-[#bfa8c5] hover:bg-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  optional,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  optional?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f0e8f2] text-[#72567e]">
        <Icon className="h-4 w-4" />
      </span>

      <h3 className="text-sm font-extrabold text-[#40384a] sm:text-[15px]">
        {title}
      </h3>

      {optional && (
        <span className="rounded-full bg-[#f4f0f5] px-2 py-1 text-[10px] font-bold text-[#968a9d]">
          ไม่บังคับ
        </span>
      )}
    </div>
  );
}

export default function GuestPreferenceModal({
  open,
  onComplete,
  onClose,
}: Props) {
  const [step, setStep] =
    useState(0);

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

  const completedCount =
    useMemo(
      () =>
        [
          travelTypes.length > 0,
          activities.length > 0,
          Boolean(atmosphere),
          Boolean(companion),
          Boolean(budget),
          Boolean(goal),
          personalityTags.length > 0,
        ].filter(Boolean).length,
      [
        travelTypes,
        activities,
        atmosphere,
        companion,
        budget,
        goal,
        personalityTags,
      ]
    );

  if (!open) {
    return null;
  }

  const validateCurrentStep = () => {
    if (
      step === 0 &&
      (
        travelTypes.length === 0 ||
        activities.length === 0
      )
    ) {
      setError(
        "เลือกอย่างน้อย 1 สไตล์การเที่ยว และ 1 กิจกรรมก่อนนะ"
      );
      return false;
    }

    if (
      step === 1 &&
      (
        !atmosphere ||
        !companion ||
        !budget
      )
    ) {
      setError(
        "เลือกบรรยากาศ ผู้ร่วมทริป และงบประมาณให้ครบก่อน"
      );
      return false;
    }

    setError("");
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    setStep(current =>
      Math.min(
        current + 1,
        STEPS.length - 1
      )
    );
  };

  const goBack = () => {
    setError("");

    setStep(current =>
      Math.max(
        current - 1,
        0
      )
    );
  };

  const handleContinue = () => {
    if (
      travelTypes.length === 0 ||
      activities.length === 0 ||
      !atmosphere ||
      !companion ||
      !budget
    ) {
      setError(
        "ยังมีข้อมูลสำคัญไม่ครบ ลองย้อนกลับไปเช็กอีกครั้ง"
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

  const current =
    STEPS[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#332c3e]/45 p-3 backdrop-blur-md sm:p-6">
      <div className="relative flex max-h-[94dvh] w-full max-w-[860px] flex-col overflow-hidden rounded-[32px] border border-white/80 bg-[#fffdfb] shadow-[0_36px_120px_rgba(45,37,55,0.30)] sm:rounded-[38px]">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#cdb4dc]/35 blur-3xl" />
        <div className="pointer-events-none absolute right-[-70px] top-6 h-52 w-52 rounded-full bg-[#efbfd6]/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-90px] right-[18%] h-52 w-52 rounded-full bg-[#b8e2e6]/28 blur-3xl" />

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[#726777] shadow-sm backdrop-blur-xl transition hover:bg-white sm:right-5 sm:top-5"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="relative z-10 border-b border-[#eee5ef] bg-white/42 px-5 pb-5 pt-6 backdrop-blur-xl sm:px-8 sm:pb-6 sm:pt-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#a98bc0] via-[#d59abb] to-[#8fcbd6] shadow-[0_10px_26px_rgba(111,69,111,0.18)]">
              <Compass className="h-5 w-5 text-white" />
            </div>

            <div>
              <div className="text-[16px] font-black tracking-tight text-[#302b43]">
                TravelWish
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#968b9c]">
                Guest personalization
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/60 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#7a6384] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {current.eyebrow}
              </div>

              <h2 className="mt-3 text-[26px] font-black leading-tight tracking-tight text-[#302b43] sm:text-[32px]">
                {current.title}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#7b7281]">
                {current.description}
              </p>
            </div>

            <div className="hidden rounded-[18px] border border-white/80 bg-white/60 px-4 py-3 text-right shadow-sm sm:block">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a8fa1]">
                Personal match
              </div>
              <div className="mt-1 text-lg font-black text-[#6f456f]">
                {completedCount}/7
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            {STEPS.map((item, index) => (
              <div
                key={item.eyebrow}
                className="flex flex-1 items-center gap-2"
              >
                <div
                  className={[
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    index <= step
                      ? "bg-[#8f6d99]"
                      : "bg-[#e8dfe9]",
                  ].join(" ")}
                />

                {index < STEPS.length - 1 && (
                  <ChevronRight
                    className={[
                      "h-3.5 w-3.5 shrink-0",
                      index < step
                        ? "text-[#8f6d99]"
                        : "text-[#d2c7d5]",
                    ].join(" ")}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-between text-[10px] font-bold text-[#9d929f]">
            <span>Step {step + 1}</span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
        </div>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
          {step === 0 && (
            <div className="space-y-7">
              <section>
                <SectionTitle
                  icon={MapPin}
                  title="สไตล์การเที่ยว"
                />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {TRAVEL_TYPES.map(item => (
                    <SelectCard
                      key={item.value}
                      selected={
                        travelTypes.includes(
                          item.value
                        )
                      }
                      icon={item.icon}
                      title={item.value}
                      hint={item.hint}
                      onClick={() =>
                        toggleValue(
                          item.value,
                          travelTypes,
                          setTravelTypes
                        )
                      }
                    />
                  ))}
                </div>
              </section>

              <section>
                <SectionTitle
                  icon={Sparkles}
                  title="กิจกรรมที่ชอบ"
                />

                <div className="flex flex-wrap gap-2.5">
                  {ACTIVITIES.map(item => {
                    const Icon =
                      item.icon;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() =>
                          toggleValue(
                            item.value,
                            activities,
                            setActivities
                          )
                        }
                        className={[
                          "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition",
                          activities.includes(
                            item.value
                          )
                            ? "border-[#9877a3] bg-[#f1e7f4] text-[#67486f] shadow-sm"
                            : "border-[#e6dde7] bg-white/75 text-[#625867] hover:border-[#c9b4ce] hover:bg-white",
                        ].join(" ")}
                      >
                        {Icon && (
                          <Icon className="h-4 w-4" />
                        )}
                        {item.value}
                        {activities.includes(
                          item.value
                        ) && (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-7">
              <section className="rounded-[26px] border border-[#ebe2ec] bg-white/55 p-5 sm:p-6">
                <SectionTitle
                  icon={PartyPopper}
                  title="บรรยากาศที่ชอบ"
                />

                <div className="flex flex-wrap gap-2.5">
                  {ATMOSPHERES.map(item => (
                    <ChoicePill
                      key={item}
                      selected={
                        atmosphere === item
                      }
                      onClick={() =>
                        setAtmosphere(item)
                      }
                    >
                      {item}
                    </ChoicePill>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-[26px] border border-[#ebe2ec] bg-white/55 p-5 sm:p-6">
                  <SectionTitle
                    icon={Users}
                    title="ปกติเที่ยวกับใคร?"
                  />

                  <div className="flex flex-wrap gap-2.5">
                    {COMPANIONS.map(item => (
                      <ChoicePill
                        key={item}
                        selected={
                          companion === item
                        }
                        onClick={() =>
                          setCompanion(item)
                        }
                      >
                        {item}
                      </ChoicePill>
                    ))}
                  </div>
                </section>

                <section className="rounded-[26px] border border-[#ebe2ec] bg-white/55 p-5 sm:p-6">
                  <SectionTitle
                    icon={Wallet}
                    title="สไตล์งบประมาณ"
                  />

                  <div className="flex flex-wrap gap-2.5">
                    {BUDGETS.map(item => (
                      <ChoicePill
                        key={item}
                        selected={
                          budget === item
                        }
                        onClick={() =>
                          setBudget(item)
                        }
                      >
                        {item}
                      </ChoicePill>
                    ))}
                  </div>
                </section>
              </div>

              <div className="rounded-[22px] border border-[#dcecef] bg-[#f3fbfc] px-4 py-3.5 text-xs leading-5 text-[#677c81]">
                ✨ เราจะใช้ข้อมูลส่วนนี้ปรับความแน่นของทริป ร้านอาหาร และระดับค่าใช้จ่ายให้เหมาะกับคุณ
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7">
              <section>
                <SectionTitle
                  icon={Compass}
                  title="เป้าหมายของทริป"
                  optional
                />

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {GOALS.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setGoal(item)
                      }
                      className={[
                        "min-h-[58px] rounded-[18px] border px-3 py-3 text-sm font-bold transition",
                        goal === item
                          ? "border-[#8f6e9a] bg-[#6f456f] text-white shadow-[0_8px_24px_rgba(111,69,111,0.17)]"
                          : "border-[#e6dde7] bg-white/75 text-[#645a6b] hover:border-[#c5b0cb] hover:bg-white",
                      ].join(" ")}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[26px] border border-[#e9e0ea] bg-white/55 p-4 sm:p-5">
                <SectionTitle
                  icon={Sparkles}
                  title="ไลฟ์สไตล์ที่เป็นคุณ"
                  optional
                />

                <p className="-mt-1 mb-4 text-xs leading-5 text-[#918697]">
                  เลือกได้หลายข้อ ยิ่งเลือกตรงตัว AI จะยิ่งปรับแผนได้ละเอียดขึ้น
                </p>

                <div className="flex flex-wrap gap-2">
                  {PERSONALITY_TAGS.map(
                    item => (
                      <ChoicePill
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
                      </ChoicePill>
                    )
                  )}
                </div>
              </section>

              <div className="grid gap-3 rounded-[24px] border border-white/80 bg-gradient-to-r from-[#f4ecf6] via-[#fff5f9] to-[#eef9fa] p-4 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#6f456f] shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <div className="text-sm font-extrabold text-[#453b4c]">
                    พร้อมสร้าง Travel Style ของคุณแล้ว
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#84798a]">
                    Guest preferences จะเก็บเฉพาะใน browser เครื่องนี้ และนำไปใช้กับ Recommendation + AI Planner
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-[#f0ccd5] bg-[#fff3f6] px-4 py-3 text-sm font-semibold text-[#9b5c6b]">
              {error}
            </div>
          )}
        </div>

        <div className="relative z-10 border-t border-[#eee5ef] bg-white/78 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-bold text-[#74697b] transition hover:bg-[#f4eff5] disabled:pointer-events-none disabled:opacity-0"
            >
              <ArrowLeft className="h-4 w-4" />
              ย้อนกลับ
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="group flex h-12 min-w-[145px] items-center justify-center gap-2 rounded-2xl bg-[#6f456f] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(111,69,111,0.20)] transition hover:-translate-y-0.5 hover:bg-[#634064]"
              >
                ต่อไป
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                className="group flex h-12 min-w-[185px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9c79ad] via-[#d28fad] to-[#7dbcc7] px-5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(111,69,111,0.20)] transition hover:-translate-y-0.5"
              >
                เริ่มใช้งาน TravelWish
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
