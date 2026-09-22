
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Compass,
  User,
  ArrowRight,
  Mountain,
  Camera,
  Map,
  Sparkles,
  Heart,
  Wallet,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { THAI_REGIONS } from "@/lib/travel/thaiRegions";

export const Route = createFileRoute("/personal-survey")({
  component: PersonalSurvey,
});


type PersonalityGroup = {
  title: string;
  description: string;
  tags: string[];
};

const PERSONALITY_PREVIEW = [
  "🌿 สายธรรมชาติ",
  "📸 สายถ่ายรูป",
  "☕ สายคาเฟ่",
  "🍜 สายกิน",
  "💪 สายสุขภาพ",
  "📱 สายโซเชียล",
  "✨ สายคอนเทนต์",
  "🎉 สายปาร์ตี้",
  "🧘 สายชิล",
  "🧗 สายลุย",
  "🛍️ สายช้อป",
  "🏛️ สายวัฒนธรรม",
];

const PERSONALITY_GROUPS: PersonalityGroup[] = [
  {
    title: "📸 รูปภาพ Social และ Content",
    description: "สไตล์การถ่ายรูป การแชร์ และคอนเทนต์ที่คุณชอบเวลาเดินทาง",
    tags: [
      "📸 สายถ่ายรูป",
      "🤳 ชอบถ่ายรูปตัวเอง",
      "👫 ชอบถ่ายรูปกับเพื่อน",
      "🌄 ชอบถ่ายวิว",
      "🍰 ชอบถ่ายอาหาร",
      "🏛️ ชอบถ่ายสถาปัตยกรรม",
      "🌙 ชอบถ่ายกลางคืน",
      "🎨 ชอบสถานที่สีสวย",
      "🤍 ชอบโทนมินิมอล",
      "🌈 ชอบสถานที่สีสันสดใส",
      "✨ ชอบมุม Instagrammable",
      "📱 สายโซเชียล",
      "🎬 สายคอนเทนต์",
      "🎥 ชอบทำ Vlog",
      "📹 ชอบถ่าย Reels",
      "🎵 ชอบทำ TikTok",
      "🔥 ชอบสถานที่กำลังไวรัล",
      "📍 ชอบเช็กอิน",
      "👀 ชอบตามร้านที่เห็นในโซเชียล",
      "🙅 ไม่สนใจว่าที่ไหนกำลังดัง",
    ],
  },
  {
    title: "☕ Café Personality",
    description: "บอกเราได้เลยว่าคาเฟ่แบบไหนถึงจะเป็นคาเฟ่ที่คุณอยากแวะจริง ๆ",
    tags: [
      "☕ สายคาเฟ่",
      "🍰 สายของหวาน",
      "🥐 ชอบ Bakery",
      "🫘 จริงจังเรื่องกาแฟ",
      "🍵 ชอบชา/มัทฉะ",
      "🌿 ชอบคาเฟ่ธรรมชาติ",
      "🏞️ ชอบคาเฟ่วิวดี",
      "🤍 ชอบคาเฟ่มินิมอล",
      "🪵 ชอบคาเฟ่ Rustic",
      "🕰️ ชอบคาเฟ่ Vintage",
      "🎨 ชอบคาเฟ่ดีไซน์แปลก",
      "🐶 ชอบ Pet-friendly café",
      "📸 เลือกคาเฟ่จากมุมถ่ายรูป",
      "🍽️ เลือกคาเฟ่จากรสชาติ",
      "🛋️ ชอบนั่งคาเฟ่นาน ๆ",
      "⚡ แวะคาเฟ่เร็ว ๆ แล้วไปต่อ",
    ],
  },
  {
    title: "🍜 Food Personality",
    description: "รสนิยมด้านอาหารและความสำคัญของมื้ออาหารในทริป",
    tags: [
      "🍜 สายกิน",
      "🥘 ชอบอาหารท้องถิ่น",
      "🍢 ชอบ Street Food",
      "🏪 ชอบร้านบ้าน ๆ",
      "🔥 ชอบร้านดัง",
      "💎 ชอบร้านลับ",
      "⭐ ชอบร้านรีวิวสูง",
      "📱 ชอบร้านไวรัล",
      "👵 ชอบร้านเก่าแก่",
      "🍽️ ชอบ Fine Dining",
      "🥩 สายเนื้อ",
      "🦐 สายซีฟู้ด",
      "🍣 สายญี่ปุ่น",
      "🍝 สายตะวันตก",
      "🌶️ ชอบอาหารเผ็ด",
      "🍹 ชอบร้านนั่งชิล",
      "🍺 ชอบร้านกลางคืน",
      "🥗 สาย Healthy Food",
      "🌱 Vegetarian friendly",
      "🥬 Vegan friendly",
      "☪️ Halal friendly",
      "🍳 ชอบ Breakfast/Brunch",
      "🍨 ชอบตระเวนของหวาน",
      "🍴 ยอมเดินทางไกลเพื่อร้านอร่อย",
      "🍜 อาหารคือจุดหมายหลักของทริป",
      "🥪 กินอะไรก็ได้ ขอเที่ยวก่อน",
    ],
  },
  {
    title: "💪 สุขภาพ Wellness และร่างกาย",
    description: "ระดับกิจกรรม การพักผ่อน และไลฟ์สไตล์สุขภาพของคุณ",
    tags: [
      "💪 สายสุขภาพ",
      "🧘 ชอบ Yoga",
      "💆 ชอบ Spa",
      "🛀 ชอบ Onsen/Hot spring",
      "🥗 เน้นอาหารสุขภาพ",
      "🚴 ชอบปั่นจักรยาน",
      "🏃 ชอบวิ่ง",
      "🚶 ชอบเดิน",
      "🥾 เดินเยอะได้",
      "🛋️ ไม่อยากเดินเยอะ",
      "🏋️ ชอบกิจกรรมใช้แรง",
      "🌱 ชอบ Wellness Retreat",
      "🌿 ชอบธรรมชาติบำบัด",
      "😴 ให้ความสำคัญกับการพักผ่อน",
      "🌅 ชอบเริ่มวันเช้า",
      "🕙 ไม่ชอบตื่นเช้า",
    ],
  },
  {
    title: "🧗 Adventure & Activity",
    description: "ระดับความลุยและกิจกรรมที่อยากมีอยู่ในทริป",
    tags: [
      "🧗 สายลุย",
      "🥾 ชอบ Hiking",
      "🧗‍♀️ ชอบปีนเขา",
      "🚣 ชอบล่องแก่ง",
      "🏄 ชอบ Surf",
      "🤿 ชอบดำน้ำ",
      "🚵 ชอบปั่นเสือภูเขา",
      "🏍️ ชอบ ATV",
      "🪂 ชอบกิจกรรมหวาดเสียว",
      "🎢 ชอบ Adventure Park",
      "🏕️ ชอบ Camping",
      "🔥 ชอบลองอะไรใหม่ ๆ",
      "😎 พร้อมออกนอก Comfort Zone",
      "🛡️ เน้นปลอดภัย",
      "😌 ไม่ชอบกิจกรรมเสี่ยง",
    ],
  },
  {
    title: "😌 Pace & Energy",
    description: "จังหวะการเที่ยวที่ทำให้คุณรู้สึกว่าแผนกำลังพอดี",
    tags: [
      "🧘 สายชิล",
      "⚡ สายเที่ยวแน่น",
      "🐢 Slow Travel",
      "🏃 ไปให้ครบหลายที่",
      "☕ ชอบนั่งแต่ละที่นาน ๆ",
      "📍 ชอบแวะหลายจุด",
      "🚗 ไม่ชอบอยู่บนรถนาน",
      "🛣️ ขับไกลได้ถ้าที่นั้นคุ้ม",
      "🕘 เริ่มเที่ยวสาย",
      "🌅 เริ่มเที่ยวแต่เช้า",
      "🌙 สายกลางคืน",
      "😴 ต้องมีเวลาพักระหว่างวัน",
      "🗓️ ชอบแผนชัดเจน",
      "🎲 ชอบเที่ยวแบบตามใจหน้างาน",
      "⏰ ชอบตรงเวลา",
      "🌊 ไม่อยากรีบ",
    ],
  },
  {
    title: "🎉 Social & Nightlife",
    description: "พลังทางสังคม บรรยากาศ และชีวิตยามค่ำคืนที่เหมาะกับคุณ",
    tags: [
      "🎉 สายปาร์ตี้",
      "🍸 ชอบ Bar",
      "🍺 ชอบร้านนั่งชิล",
      "🎶 ชอบ Live Music",
      "🎧 ชอบ Club",
      "🌃 ชอบ Nightlife",
      "🌙 ชอบเที่ยวกลางคืน",
      "👥 ชอบสถานที่คนเยอะ",
      "🥳 ชอบบรรยากาศคึกคัก",
      "🤝 ชอบเจอคนใหม่",
      "👭 ชอบเที่ยวกับเพื่อน",
      "🫶 ชอบกิจกรรมกลุ่ม",
      "😌 ชอบพื้นที่ส่วนตัว",
      "🤫 ไม่ชอบที่เสียงดัง",
      "🌿 ชอบสถานที่คนน้อย",
      "🔥 ยิ่งคึกคักยิ่งชอบ",
      "🙈 ยิ่งคนเยอะยิ่งเลี่ยง",
    ],
  },
  {
    title: "🛍️ Shopping & Urban",
    description: "รูปแบบการช้อป ตลาด และประสบการณ์ในเมืองที่คุณสนใจ",
    tags: [
      "🛍️ สายช้อป",
      "👗 ชอบแฟชั่น",
      "👜 ชอบสินค้า Local Brand",
      "🎁 ชอบซื้อของฝาก",
      "🧺 ชอบตลาดท้องถิ่น",
      "🌙 ชอบ Night Market",
      "🏬 ชอบห้าง",
      "🧸 ชอบของน่ารัก",
      "🎨 ชอบงานคราฟต์",
      "🪴 ชอบของ Handmade",
      "👟 ชอบ Streetwear",
      "💎 ชอบ Luxury Shopping",
      "💸 ชอบหาของราคาถูก",
      "🔍 ชอบเดินหาร้านลับ",
    ],
  },
  {
    title: "🏛️ Culture & Local Experience",
    description: "ระดับความสนใจวัฒนธรรม ประวัติศาสตร์ และประสบการณ์ท้องถิ่น",
    tags: [
      "🏛️ สายวัฒนธรรม",
      "🙏 สายวัด",
      "🔮 สายมู",
      "🏺 ชอบประวัติศาสตร์",
      "🖼️ ชอบพิพิธภัณฑ์",
      "🎨 ชอบศิลปะ",
      "🏘️ ชอบชุมชนเก่า",
      "👵 ชอบเรียนรู้วิถีชีวิตท้องถิ่น",
      "🎭 ชอบการแสดงพื้นเมือง",
      "🧵 ชอบงานหัตถกรรม",
      "🍲 ชอบอาหารพื้นเมือง",
      "📚 ชอบรู้เรื่องราวของสถานที่",
      "🗺️ ชอบสถานที่ Unseen",
      "💎 ชอบ Hidden Gem",
      "🚫 ไม่เน้นแลนด์มาร์กดัง",
    ],
  },
  {
    title: "💰 Spending Behavior",
    description: "ไม่ใช่แค่งบรวม แต่คือสิ่งที่คุณเต็มใจใช้เงินมากเป็นพิเศษ",
    tags: [
      "💸 สายประหยัด",
      "💰 จ่ายได้ถ้าคุ้ม",
      "✨ สายหรู",
      "🏨 ยอมจ่ายกับที่พัก",
      "🍽️ ยอมจ่ายกับอาหาร",
      "🎢 ยอมจ่ายกับกิจกรรม",
      "🛍️ เก็บงบไว้ช้อป",
      "🚕 ยอมจ่ายเพื่อเดินทางสะดวก",
      "🎟️ ไม่ติดค่าเข้า",
      "🆓 ชอบสถานที่ฟรี",
      "💎 เลือกคุณภาพมากกว่าราคา",
      "📉 ชอบดีลและโปรโมชั่น",
    ],
  },
  {
    title: "🏨 Comfort & Accommodation Lifestyle",
    description: "สไตล์ที่พักและระดับความสะดวกสบายที่คุณให้ความสำคัญ",
    tags: [
      "🛏️ เน้นความสบาย",
      "🎒 Backpacker",
      "🏨 ชอบโรงแรม",
      "🏡 ชอบ Homestay",
      "🏕️ ชอบ Camping",
      "🌿 ชอบที่พักธรรมชาติ",
      "🏙️ ชอบพักใจกลางเมือง",
      "🌊 ชอบที่พักติดทะเล",
      "⛰️ ชอบที่พักวิวภูเขา",
      "📸 ชอบที่พักถ่ายรูปสวย",
      "🛁 ต้องมีอ่างอาบน้ำ",
      "🏊 ชอบที่พักมีสระ",
      "☕ ต้องมีอาหารเช้า",
      "🚗 ต้องมีที่จอดรถ",
    ],
  },
];

function PersonalSurvey() {
  const navigate = useNavigate();

  const [travelTypes, setTravelTypes] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [preferredRegion, setPreferredRegion] = useState<string[]>([]);
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [showPersonalityDetails, setShowPersonalityDetails] = useState(false);

  const [atmosphere, setAtmosphere] = useState("");
  const [travelCompanion, setTravelCompanion] = useState("");
  const [budget, setBudget] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [travelGoal, setTravelGoal] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleItem = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(value)) {
      setList(list.filter((v) => v !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleSubmit = async () => {
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
      alert("กรุณากรอกข้อมูลให้ครบทุกหัวข้อ");
      return;
    }

    const { data, error: userError } =
      await supabase.auth.getUser();

    const profileId = data?.user?.id;

    if (userError || !profileId) {
      alert("กรุณา login ก่อน");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          profile_id: profileId,
          travel_type: travelTypes,
          activities,
          atmosphere,
          travel_companion: travelCompanion,
          budget,
          travel_time: travelTime,
          preferred_region: preferredRegion,
          travel_goal: travelGoal,
          personality_tags: personalityTags,
        },
        {
          onConflict: "profile_id",
        }
      );

    setSaving(false);

    if (error) {
      console.error("Preference error:", error);
      alert(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`);
      return;
    }

    navigate({
      to: "/home",
    });
  };

  const travelTypeOptions = [
    { value: "ภูเขา", icon: Mountain },
    { value: "ทะเล", icon: Sparkles },
    { value: "วัฒนธรรม", icon: Map },
    { value: "คาเฟ่", icon: Heart },
    { value: "ธรรมชาติ", icon: Sparkles },
    { value: "เมือง", icon: Map },
  ];

  const activityOptions = [
    "ถ่ายรูป",
    "เดินป่า",
    "อาหาร",
    "ช้อปปิ้ง",
    "พักผ่อน",
  ];

  const regionOptions = THAI_REGIONS;

  return (
    <div className="survey-page relative min-h-screen overflow-x-hidden text-[#302b43]">

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
                TravelWise
              </h1>

              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8b7894]">
                Your journey
              </p>
            </div>

          </div>

          <div className="survey-user">
            <User className="h-[18px] w-[18px]" />
          </div>

        </div>

      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto w-full max-w-[900px] px-5 py-10 sm:px-8 lg:py-14">

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center">

          <div className="survey-progress survey-progress-done">
            <Check className="h-3.5 w-3.5" />
          </div>

          <div className="survey-progress-line survey-progress-line-active" />

          <div className="survey-progress survey-progress-active">
            2
          </div>



        </div>

        {/* Heading */}
        <div className="mb-10 text-center">

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a56b99]">
            Your travel personality
          </p>

          <h2 className="text-3xl font-extrabold tracking-tight text-[#302b43] sm:text-4xl">
            บอกสไตล์การท่องเที่ยวของคุณ
          </h2>

          <p className="mx-auto mt-3 max-w-[560px] text-sm leading-7 text-[#71697d]">
            เลือกสิ่งที่ตรงกับคุณมากที่สุด
            <br className="hidden sm:block" />
            เพื่อให้ TravelWise สร้างคำแนะนำที่เหมาะกับคุณ
          </p>

        </div>

        <div className="space-y-6">

          {/* ==================================================
              Travel Type
              ================================================== */}
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

              {travelTypeOptions.map((item) => {
                const Icon = item.icon;
                const selected = travelTypes.includes(item.value);

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

                    <span>{item.value}</span>


                  </button>
                );
              })}

            </div>

          </section>

          {/* ==================================================
              Activities
              ================================================== */}
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

              {activityOptions.map((activity) => {
                const selected =
                  activities.includes(activity);

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
              })}

            </div>

          </section>

          {/* ==================================================
              Region
              ================================================== */}
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

              {regionOptions.map((region) => {
                const selected =
                  preferredRegion.includes(region);

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

                    <span>{region}</span>


                  </button>
                );
              })}

            </div>

          </section>

          {/* ==================================================
              Details
              ================================================== */}
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

              {/* Atmosphere */}
              <div>
                <label className="survey-label">
                  บรรยากาศที่ชอบ
                </label>

                <div className="survey-select-wrapper">

                  <Sparkles className="survey-select-icon" />

                  <select
                    value={atmosphere}
                    onChange={(e) =>
                      setAtmosphere(e.target.value)
                    }
                    className="survey-select"
                  >
                    <option value="">เลือกบรรยากาศ</option>
                    <option value="คึกคัก">คึกคัก</option>
                    <option value="เงียบสงบ">เงียบสงบ</option>
                    <option value="ผจญภัย">ผจญภัย</option>
                    <option value="หรูหรา">หรูหรา</option>
                  </select>

                </div>
              </div>

              {/* Companion */}
              <div>
                <label className="survey-label">
                  เดินทางกับใคร
                </label>

                <div className="survey-select-wrapper">

                  <User className="survey-select-icon" />

                  <select
                    value={travelCompanion}
                    onChange={(e) =>
                      setTravelCompanion(e.target.value)
                    }
                    className="survey-select"
                  >
                    <option value="">
                      เลือกผู้ร่วมเดินทาง
                    </option>
                    <option value="คนเดียว">คนเดียว</option>
                    <option value="คู่รัก">คู่รัก</option>
                    <option value="ครอบครัว">ครอบครัว</option>
                    <option value="เพื่อน">เพื่อน</option>
                  </select>

                </div>
              </div>

              {/* Goal */}
              <div>
                <label className="survey-label">
                  เป้าหมายการเดินทาง
                </label>

                <div className="survey-select-wrapper">

                  <Heart className="survey-select-icon" />

                  <select
                    value={travelGoal}
                    onChange={(e) =>
                      setTravelGoal(e.target.value)
                    }
                    className="survey-select"
                  >
                    <option value="">
                      เลือกเป้าหมาย
                    </option>
                    <option value="พักผ่อน">พักผ่อน</option>
                    <option value="ผจญภัย">ผจญภัย</option>
                    <option value="วัฒนธรรม">วัฒนธรรม</option>
                    <option value="ความบันเทิง">
                      ความบันเทิง
                    </option>
                  </select>

                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="survey-label">
                  งบประมาณ
                </label>

                <div className="survey-budget">

                  {[
                    {
                      label: "ประหยัด",
                      value: "ประหยัด",
                    },
                    {
                      label: "ปานกลาง",
                      value: "ปานกลาง",
                    },
                    {
                      label: "หรูหรา",
                      value: "หรูหรา",
                    },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setBudget(item.value)
                      }
                      className={
                        budget === item.value
                          ? "survey-budget-active"
                          : ""
                      }
                    >

                      {item.label}
                    </button>
                  ))}

                </div>
              </div>

            </div>

          </section>

          {/* ==================================================
              Travel Time
              ================================================== */}
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
              ].map((time) => {
                const selected =
                  travelTime === time;

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() =>
                      setTravelTime(time)
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


          {/* ==================================================
              Deep Personalization
              ================================================== */}
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
                  เลือกพฤติกรรมและสไตล์ที่ตรงกับคุณได้หลายข้อ ส่วนนี้ไม่บังคับ
                  และจะช่วยให้ AI จัดจังหวะทริป ร้านอาหาร และบรรยากาศให้เป็นคุณมากขึ้น
                </p>
              </div>

            </div>

            {!showPersonalityDetails && (
              <>
                <div className="flex flex-wrap gap-3">
                  {PERSONALITY_PREVIEW.map((tag) => {
                    const selected = personalityTags.includes(tag);

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
                          selected ? "survey-chip-selected" : ""
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {personalityTags.length > 0 && (
                  <p className="mt-4 text-xs font-medium text-[#8b7894]">
                    เลือกแล้ว {personalityTags.length} รายการ
                  </p>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() =>
                setShowPersonalityDetails((current) => !current)
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#decfdf] bg-white/65 px-4 py-3 text-sm font-bold text-[#6f456f] transition hover:bg-white"
            >
              {showPersonalityDetails ? (
                <>
                  ซ่อนตัวเลือกเพิ่มเติม
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  ดูเพิ่มเติมและเลือกให้ละเอียดขึ้น
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>

            {showPersonalityDetails && (
              <div className="mt-6 space-y-7">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/55 px-4 py-3">
                  <p className="text-xs leading-5 text-[#71697d]">
                    เลือกได้มากเท่าที่ตรงกับคุณ ไม่จำเป็นต้องเลือกทุกหมวด
                  </p>

                  <span className="shrink-0 rounded-full bg-[#6f456f]/10 px-3 py-1 text-xs font-bold text-[#6f456f]">
                    {personalityTags.length} เลือกแล้ว
                  </span>
                </div>

                {PERSONALITY_GROUPS.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-[22px] border border-white/70 bg-white/35 p-4 sm:p-5"
                  >
                    <div className="mb-4">
                      <h4 className="text-sm font-extrabold text-[#40364b] sm:text-base">
                        {group.title}
                      </h4>
                      <p className="mt-1 text-xs leading-5 text-[#81778b]">
                        {group.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {group.tags.map((tag) => {
                        const selected = personalityTags.includes(tag);

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
                              selected ? "survey-chip-selected" : ""
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </section>

          {/* Submit */}
          <div className="pt-2">

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="survey-submit"
            >

              <span>
                {saving
                  ? "กำลังบันทึก..."
                  : "บันทึกและเริ่มต้นการเดินทาง"}
              </span>

              {!saving && (
                <span className="survey-submit-icon">
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}

            </button>

            <p className="mt-4 text-center text-xs text-[#8e8695]">
              คุณสามารถปรับเปลี่ยนข้อมูลเหล่านี้ได้ภายหลัง
            </p>

          </div>

        </div>

      </main>

    </div>
  );
}
