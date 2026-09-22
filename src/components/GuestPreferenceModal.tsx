import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  Compass,
  Heart,
  Map,
  Mountain,
  Sparkles,
  User,
  X,
} from "lucide-react";

import { THAI_REGIONS } from "@/lib/travel/thaiRegions";
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

const PERSONALITY_PREVIEW = [
  "🌿 สายธรรมชาติ",
  "📸 สายถ่ายรูป",
  "☕ สายคาเฟ่",
  "🍜 สายกิน",
  "🔥 ชอบสถานที่กำลังไวรัล",
  "✨ สายคอนเทนต์",
  "🧘 สายชิล",
  "🧗 สายลุย",
  "🛍️ สายช้อป",
  "🏛️ สายวัฒนธรรม",
  "🌙 สายกลางคืน",
  "💎 ชอบร้านลับ",
  "🥘 ชอบอาหารท้องถิ่น",
  "🚗 ไม่ชอบอยู่บนรถนาน",
  "🍴 ยอมเดินทางไกลเพื่อร้านอร่อย",
];

export default function GuestPreferenceModal({
  open,
  onComplete,
  onClose,
}: Props) {
  const [travelTypes, setTravelTypes] =
    useState<string[]>([]);

  const [activities, setActivities] =
    useState<string[]>([]);

  const [
    preferredRegion,
    setPreferredRegion
  ] = useState<string[]>([]);

  const [
    personalityTags,
    setPersonalityTags
  ] = useState<string[]>([]);

  const [atmosphere, setAtmosphere] =
    useState("");

  const [
    travelCompanion,
    setTravelCompanion
  ] = useState("");

  const [budget, setBudget] =
    useState("");

  const [
    travelTime,
    setTravelTime
  ] = useState("");

  const [
    travelGoal,
    setTravelGoal
  ] = useState("");

  const [error, setError] =
    useState("");

  if (!open) {
    return null;
  }

  const toggleItem = (
    value: string,
    list: string[],
    setList:
      React.Dispatch<
        React.SetStateAction<string[]>
      >
  ) => {
    if (list.includes(value)) {
      setList(
        list.filter(
          item => item !== value
        )
      );
    } else {
      setList([
        ...list,
        value
      ]);
    }
  };

  const handleSubmit = () => {
    if (
      travelTypes.length === 0 ||
      activities.length === 0 ||
      preferredRegion.length === 0 ||
      !atmosphere ||
      !travelCompanion ||
      !budget ||
      !travelTime ||
      !travelGoal
    ) {
      setError(
        "กรุณากรอกข้อมูลให้ครบทุกหัวข้อ"
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
          travelCompanion,

        budget,

        travel_time:
          travelTime,

        preferred_region:
          preferredRegion,

        travel_goal:
          travelGoal,

        personality_tags:
          personalityTags,
      };

    saveGuestPreferences(
      preferences
    );

    onComplete(
      preferences
    );
  };

  const travelTypeOptions = [
    {
      value: "ภูเขา",
      icon: Mountain,
    },
    {
      value: "ทะเล",
      icon: Sparkles,
    },
    {
      value: "วัฒนธรรม",
      icon: Map,
    },
    {
      value: "คาเฟ่",
      icon: Heart,
    },
    {
      value: "ธรรมชาติ",
      icon: Sparkles,
    },
    {
      value: "เมือง",
      icon: Map,
    },
  ];

  const activityOptions = [
    "ถ่ายรูป",
    "เดินป่า",
    "อาหาร",
    "ช้อปปิ้ง",
    "พักผ่อน",
  ];

  return (
    <div
      className="
        fixed
        inset-0
        z-[200]
        flex
        items-center
        justify-center
        bg-[#302b43]/45
        p-2
        backdrop-blur-sm
        sm:p-5
      "
    >
      <div
        className="
          survey-page
          relative
          max-h-[96dvh]
          w-full
          max-w-[940px]
          overflow-y-auto
          overflow-x-hidden
          rounded-[28px]
          border
          border-white/80
          text-[#302b43]
          shadow-[0_30px_100px_rgba(48,43,67,0.28)]
          sm:rounded-[34px]
        "
      >
        {/* Aurora background */}
        <div className="survey-aurora survey-aurora-1" />
        <div className="survey-aurora survey-aurora-2" />
        <div className="survey-aurora survey-aurora-3" />
        <div className="survey-aurora survey-aurora-4" />

        {/* Header */}
        <header className="survey-header sticky top-0 z-50">
          <div className="survey-header-inner">
            <div className="flex items-center gap-3">
              <div className="survey-logo">
                <Compass className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  TravelWish
                </h1>

                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8b7894]">
                  Guest journey
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden rounded-full bg-[#6f456f]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6f456f] sm:block">
                Guest mode
              </div>

              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="survey-user"
                  aria-label="ปิด"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              ) : (
                <div className="survey-user">
                  <User className="h-[18px] w-[18px]" />
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-[900px] px-4 py-8 sm:px-8 sm:py-10">
          {/* Progress */}
          <div className="mb-7 flex items-center justify-center">
            <div className="survey-progress survey-progress-done">
              <Check className="h-3.5 w-3.5" />
            </div>

            <div className="survey-progress-line survey-progress-line-active" />

            <div className="survey-progress survey-progress-active">
              2
            </div>
          </div>

          {/* Heading */}
          <div className="mb-9 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a56b99]">
              Your travel personality
            </p>

            <h2 className="text-3xl font-extrabold tracking-tight text-[#302b43] sm:text-4xl">
              บอกสไตล์การท่องเที่ยวของคุณ
            </h2>

            <p className="mx-auto mt-3 max-w-[560px] text-sm leading-7 text-[#71697d]">
              เลือกสิ่งที่ตรงกับคุณมากที่สุด
              <br className="hidden sm:block" />
              เพื่อให้ TravelWish สร้างคำแนะนำที่เหมาะกับคุณ
            </p>

            <p className="mx-auto mt-2 max-w-[560px] text-xs leading-5 text-[#988d9d]">
              ข้อมูล Guest จะเก็บไว้เฉพาะใน browser เครื่องนี้
            </p>
          </div>

          <div className="space-y-6">
            {/* Travel Type */}
            <section className="survey-card">
              <div className="survey-section-header">
                <div className="survey-section-icon">
                  <Mountain className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="survey-section-title">
                    ประเภทการท่องเที่ยว
                  </h3>

                  <p className="survey-section-description">
                    เลือกได้มากกว่าหนึ่งประเภท
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {travelTypeOptions.map(
                  item => {
                    const Icon =
                      item.icon;

                    const selected =
                      travelTypes.includes(
                        item.value
                      );

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() =>
                          toggleItem(
                            item.value,
                            travelTypes,
                            setTravelTypes
                          )
                        }
                        className={`survey-choice ${
                          selected
                            ? "survey-choice-selected"
                            : ""
                        }`}
                      >
                        <span className="survey-choice-icon">
                          <Icon className="h-5 w-5" />
                        </span>

                        <span>
                          {item.value}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </section>

            {/* Activities */}
            <section className="survey-card">
              <div className="survey-section-header">
                <div className="survey-section-icon survey-section-icon-pink">
                  <Camera className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="survey-section-title">
                    กิจกรรมที่ชอบ
                  </h3>

                  <p className="survey-section-description">
                    เลือกกิจกรรมที่คุณสนใจ
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {activityOptions.map(
                  activity => {
                    const selected =
                      activities.includes(
                        activity
                      );

                    return (
                      <button
                        key={activity}
                        type="button"
                        onClick={() =>
                          toggleItem(
                            activity,
                            activities,
                            setActivities
                          )
                        }
                        className={`survey-chip ${
                          selected
                            ? "survey-chip-selected"
                            : ""
                        }`}
                      >
                        {activity}
                      </button>
                    );
                  }
                )}
              </div>
            </section>

            {/* Region */}
            <section className="survey-card">
              <div className="survey-section-header">
                <div className="survey-section-icon survey-section-icon-blue">
                  <Map className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="survey-section-title">
                    ภูมิภาคที่อยากไป
                  </h3>

                  <p className="survey-section-description">
                    เลือกได้มากกว่าหนึ่งภูมิภาค
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {THAI_REGIONS.map(
                  region => {
                    const selected =
                      preferredRegion.includes(
                        region
                      );

                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() =>
                          toggleItem(
                            region,
                            preferredRegion,
                            setPreferredRegion
                          )
                        }
                        className={`survey-region ${
                          selected
                            ? "survey-region-selected"
                            : ""
                        }`}
                      >
                        <span>
                          {region}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </section>

            {/* More preferences */}
            <section className="survey-card">
              <div className="survey-section-header">
                <div className="survey-section-icon survey-section-icon-mint">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="survey-section-title">
                    ความชอบเพิ่มเติม
                  </h3>

                  <p className="survey-section-description">
                    ช่วยให้ AI เข้าใจสไตล์ของคุณมากขึ้น
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="survey-label">
                    บรรยากาศที่ชอบ
                  </label>

                  <div className="survey-select-wrapper">
                    <Sparkles className="survey-select-icon" />

                    <select
                      value={
                        atmosphere
                      }
                      onChange={e =>
                        setAtmosphere(
                          e.target.value
                        )
                      }
                      className="survey-select"
                    >
                      <option value="">
                        เลือกบรรยากาศ
                      </option>
                      <option value="คึกคัก">
                        คึกคัก
                      </option>
                      <option value="เงียบสงบ">
                        เงียบสงบ
                      </option>
                      <option value="ผจญภัย">
                        ผจญภัย
                      </option>
                      <option value="หรูหรา">
                        หรูหรา
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="survey-label">
                    เดินทางกับใคร
                  </label>

                  <div className="survey-select-wrapper">
                    <User className="survey-select-icon" />

                    <select
                      value={
                        travelCompanion
                      }
                      onChange={e =>
                        setTravelCompanion(
                          e.target.value
                        )
                      }
                      className="survey-select"
                    >
                      <option value="">
                        เลือกผู้ร่วมเดินทาง
                      </option>
                      <option value="คนเดียว">
                        คนเดียว
                      </option>
                      <option value="คู่รัก">
                        คู่รัก
                      </option>
                      <option value="ครอบครัว">
                        ครอบครัว
                      </option>
                      <option value="เพื่อน">
                        เพื่อน
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="survey-label">
                    เป้าหมายการเดินทาง
                  </label>

                  <div className="survey-select-wrapper">
                    <Heart className="survey-select-icon" />

                    <select
                      value={
                        travelGoal
                      }
                      onChange={e =>
                        setTravelGoal(
                          e.target.value
                        )
                      }
                      className="survey-select"
                    >
                      <option value="">
                        เลือกเป้าหมาย
                      </option>
                      <option value="พักผ่อน">
                        พักผ่อน
                      </option>
                      <option value="ผจญภัย">
                        ผจญภัย
                      </option>
                      <option value="วัฒนธรรม">
                        วัฒนธรรม
                      </option>
                      <option value="ความบันเทิง">
                        ความบันเทิง
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="survey-label">
                    งบประมาณ
                  </label>

                  <div className="survey-budget">
                    {[
                      "ประหยัด",
                      "ปานกลาง",
                      "หรูหรา",
                    ].map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setBudget(
                            item
                          )
                        }
                        className={
                          budget === item
                            ? "survey-budget-active"
                            : ""
                        }
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Travel Time */}
            <section className="survey-card">
              <div className="survey-section-header">
                <div className="survey-section-icon survey-section-icon-yellow">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="survey-section-title">
                    ช่วงเวลาเดินทาง
                  </h3>

                  <p className="survey-section-description">
                    เลือกฤดูกาลที่คุณชอบ
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  "ฤดูร้อน",
                  "ฤดูฝน",
                  "ฤดูหนาว",
                ].map(time => {
                  const selected =
                    travelTime ===
                    time;

                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() =>
                        setTravelTime(
                          time
                        )
                      }
                      className={`survey-season ${
                        selected
                          ? "survey-season-selected"
                          : ""
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Deep personalization */}
            <section className="survey-card">
              <div className="survey-section-header">
                <div className="survey-section-icon survey-section-icon-pink">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="survey-section-title">
                    อยากให้แผนตรงกับคุณมากยิ่งขึ้นไหม?
                  </h3>

                  <p className="survey-section-description">
                    เลือกพฤติกรรมและไลฟ์สไตล์ที่ตรงกับคุณได้หลายข้อ ส่วนนี้ไม่บังคับ
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {PERSONALITY_PREVIEW.map(
                  tag => {
                    const selected =
                      personalityTags.includes(
                        tag
                      );

                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          toggleItem(
                            tag,
                            personalityTags,
                            setPersonalityTags
                          )
                        }
                        className={`survey-chip ${
                          selected
                            ? "survey-chip-selected"
                            : ""
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  }
                )}
              </div>

              {personalityTags.length >
                0 && (
                <p className="mt-4 text-xs font-medium text-[#8b7894]">
                  เลือกแล้ว{" "}
                  {
                    personalityTags.length
                  }{" "}
                  รายการ
                </p>
              )}
            </section>

            {error && (
              <div className="rounded-2xl border border-[#efcad3] bg-[#fff2f5] px-4 py-3 text-center text-sm font-semibold text-[#9a5e6c]">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={
                  handleSubmit
                }
                className="survey-submit"
              >
                <span>
                  บันทึกและเริ่มต้นการเดินทาง
                </span>

                <span className="survey-submit-icon">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>

              <p className="mt-4 text-center text-xs text-[#8e8695]">
                Guest preferences จะถูกเก็บไว้ใน browser เครื่องนี้
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
