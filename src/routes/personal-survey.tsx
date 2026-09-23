
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


type DeepSurveyOption = {
  label: string;
  value: string;
};

type DeepSurveyQuestion = {
  id: string;
  question: string;
  description?: string;
  multiple?: boolean;
  options: DeepSurveyOption[];
};

type DeepSurveyDimension = {
  title: string;
  description: string;
  questions: DeepSurveyQuestion[];
};

const DEEP_SURVEY_DIMENSIONS: DeepSurveyDimension[] = [
  {
    title: "🍜 ด้านอาหารและการกิน",
    description:
      "เน้นสไตล์อาหาร พฤติกรรมการกิน และข้อจำกัดที่มีผลต่อการเลือกร้านระหว่างทริป",
    questions: [
      {
        id: "food_cuisine_style",
        question: "วัฒนธรรมและสไตล์อาหาร (Cuisine & Style)",
        description:
          "ระหว่างเที่ยว คุณอยากให้มื้ออาหารของคุณเป็นแบบไหน? เลือกได้หลายข้อ",
        multiple: true,
        options: [
          {
            label: "🥘 อาหารท้องถิ่นดั้งเดิม",
            value: "อาหาร: เน้นอาหารท้องถิ่นดั้งเดิม",
          },
          {
            label: "🍢 Street Food",
            value: "อาหาร: ชอบ Street Food",
          },
          {
            label: "💎 ร้านลับ / Hidden Gem",
            value: "อาหาร: ชอบร้านลับ Hidden Gem",
          },
          {
            label: "🔥 ร้านดัง / Viral",
            value: "อาหาร: ชอบร้านดังหรือกำลังเป็นกระแส",
          },
          {
            label: "🍽️ Fine Dining",
            value: "อาหาร: ชอบ Fine Dining",
          },
          {
            label: "🧪 Fusion / Creative",
            value: "อาหาร: ชอบอาหารฟิวชันและเมนูสร้างสรรค์",
          },
          {
            label: "☕ Café / Brunch",
            value: "อาหาร: ชอบคาเฟ่และ Brunch",
          },
          {
            label: "🌏 ชอบลองอาหารหลายวัฒนธรรม",
            value: "อาหาร: ชอบลองอาหารจากหลายวัฒนธรรม",
          },
        ],
      },
      {
        id: "food_nationality",
        question: "อาหารสัญชาติที่ชอบ",
        description:
          "เลือกสัญชาติอาหารที่คุณอยากให้ AI นำไปพิจารณาตอนเลือกร้าน เลือกได้หลายข้อ",
        multiple: true,
        options: [
          {
            label: "🇹🇭 ไทย",
            value: "อาหาร: ชอบอาหารไทย",
          },
          {
            label: "🇯🇵 ญี่ปุ่น",
            value: "อาหาร: ชอบอาหารญี่ปุ่น",
          },
          {
            label: "🇰🇷 เกาหลี",
            value: "อาหาร: ชอบอาหารเกาหลี",
          },
          {
            label: "🇨🇳 จีน",
            value: "อาหาร: ชอบอาหารจีน",
          },
          {
            label: "🇮🇹 อิตาเลียน",
            value: "อาหาร: ชอบอาหารอิตาเลียน",
          },
          {
            label: "🇮🇳 อินเดีย",
            value: "อาหาร: ชอบอาหารอินเดีย",
          },
          {
            label: "🇲🇽 เม็กซิกัน",
            value: "อาหาร: ชอบอาหารเม็กซิกัน",
          },
          {
            label: "🇻🇳 เวียดนาม",
            value: "อาหาร: ชอบอาหารเวียดนาม",
          },
          {
            label: "🥩 ตะวันตก / Western",
            value: "อาหาร: ชอบอาหารตะวันตก",
          },
          {
            label: "🧆 ตะวันออกกลาง",
            value: "อาหาร: ชอบอาหารตะวันออกกลาง",
          },
          {
            label: "🌏 เอเชียหลากหลาย",
            value: "อาหาร: ชอบอาหารเอเชียหลายสัญชาติ",
          },
          {
            label: "🍽️ กินได้หลายสัญชาติ",
            value: "อาหาร: เปิดรับอาหารหลายสัญชาติ",
          },
        ],
      },
      {
        id: "food_eating_habits",
        question: "พฤติกรรมและนิสัยการกิน (Eating Habits & Rituals)",
        description:
          "บอกนิสัยการเลือกร้านและการจัดมื้ออาหารของคุณ เลือกได้หลายข้อ",
        multiple: true,
        options: [
          {
            label: "✅ ชอบเมนูคุ้นเคย อร่อยชัวร์",
            value: "อาหาร: ชอบเมนูคุ้นเคยและความแน่นอน",
          },
          {
            label: "🎲 ชอบลองเมนูใหม่",
            value: "อาหาร: ชอบลองเมนูใหม่ที่ไม่เคยกิน",
          },
          {
            label: "🍜 อาหารคือจุดหมายของทริป",
            value: "อาหาร: อาหารคือจุดหมายหลักของทริป",
          },
          {
            label: "🍴 ยอมอ้อมเพื่อร้านอร่อย",
            value: "อาหาร: ยอมเดินทางไกลเพื่อร้านอร่อย",
          },
          {
            label: "🥪 สะดวกไว้ก่อน ขอเที่ยวต่อ",
            value: "อาหาร: กินอะไรก็ได้ ขอเที่ยวก่อน",
          },
          {
            label: "📅 ชอบวางแผนร้านล่วงหน้า",
            value: "อาหาร: ชอบวางแผนร้านอาหารล่วงหน้า",
          },
          {
            label: "🚶 ชอบเดินเจอร้านแล้วค่อยเลือก",
            value: "อาหาร: ชอบเลือกร้านแบบ spontaneous หน้างาน",
          },
          {
            label: "👨‍👩‍👧 ให้ความสำคัญกับบรรยากาศร่วมโต๊ะ",
            value: "อาหาร: ให้ความสำคัญกับบรรยากาศและผู้ร่วมโต๊ะ",
          },
        ],
      },
      {
        id: "food_dietary_lifestyle",
        question: "ข้อจำกัดและไลฟ์สไตล์ (Dietary & Lifestyle)",
        description:
          "เลือกสิ่งที่ควรนำไปใช้เป็นเงื่อนไขตอนเลือกร้าน เลือกได้หลายข้อ",
        multiple: true,
        options: [
          {
            label: "🥗 เน้น Healthy",
            value: "อาหาร: เน้นอาหารสุขภาพ",
          },
          {
            label: "🌱 Vegetarian",
            value: "อาหาร: ต้องการตัวเลือก Vegetarian",
          },
          {
            label: "🌿 Vegan",
            value: "อาหาร: ต้องการตัวเลือก Vegan",
          },
          {
            label: "🐷 ไม่กินหมู",
            value: "อาหาร: ไม่กินหมู",
          },
          {
            label: "🥩 ไม่กินเนื้อวัว",
            value: "อาหาร: ไม่กินเนื้อวัว",
          },
          {
            label: "🌶️ ไม่กินเผ็ด",
            value: "อาหาร: ไม่กินเผ็ด",
          },
          {
            label: "🥛 เลี่ยงนม / Dairy",
            value: "อาหาร: หลีกเลี่ยงผลิตภัณฑ์จากนม",
          },
          {
            label: "🌾 เลี่ยง Gluten",
            value: "อาหาร: หลีกเลี่ยง Gluten",
          },
          {
            label: "⚖️ กินได้ทุกอย่าง ขอสมดุล",
            value: "อาหาร: ไม่มีข้อจำกัดหลักและต้องการความสมดุล",
          },
        ],
      },
    ],
  },
  {
    title: "🏨 ด้านที่พักและความสบาย",
    description:
      "ประเภทที่พัก ทำเล ความสะดวกสบาย และสิ่งที่คุณยอมจ่ายเพิ่ม",
    questions: [
      {
        id: "stay_type",
        question: "ที่พักแบบไหนที่รู้สึกว่าเหมาะกับคุณ?",
        multiple: true,
        options: [
          {
            label: "🏨 โรงแรม",
            value: "ที่พัก: ชอบโรงแรม",
          },
          {
            label: "🌿 Resort / ธรรมชาติ",
            value: "ที่พัก: ชอบรีสอร์ตหรือที่พักธรรมชาติ",
          },
          {
            label: "🏡 Homestay",
            value: "ที่พัก: ชอบ Homestay และ Local stay",
          },
          {
            label: "🎒 Hostel / Backpacker",
            value: "ที่พัก: ชอบ Hostel หรือ Backpacker",
          },
          {
            label: "✨ Boutique / ดีไซน์สวย",
            value: "ที่พัก: ชอบ Boutique และที่พักดีไซน์สวย",
          },
        ],
      },
      {
        id: "stay_location",
        question: "ทำเลที่พักแบบไหนสำคัญที่สุด?",
        options: [
          {
            label: "🏙️ ใจกลางเมือง",
            value: "ที่พัก: ให้ความสำคัญกับทำเลใจกลางเมือง",
          },
          {
            label: "📍 ใกล้สถานที่เที่ยว",
            value: "ที่พัก: ต้องการอยู่ใกล้สถานที่เที่ยว",
          },
          {
            label: "🌿 เงียบสงบ",
            value: "ที่พัก: ต้องการทำเลเงียบสงบ",
          },
          {
            label: "🌊 วิวดี / ธรรมชาติ",
            value: "ที่พัก: ให้ความสำคัญกับวิวและธรรมชาติ",
          },
        ],
      },
      {
        id: "stay_comfort",
        question: "ระดับความสบายที่คุณต้องการ?",
        options: [
          {
            label: "💸 ขอสะอาดและประหยัด",
            value: "ที่พัก: เน้นสะอาดและประหยัด",
          },
          {
            label: "💰 คุ้มค่าและสบาย",
            value: "ที่พัก: เน้นความคุ้มค่าและความสบาย",
          },
          {
            label: "🛏️ Comfort สำคัญ",
            value: "ที่พัก: ให้ความสำคัญกับความสบายสูง",
          },
          {
            label: "✨ ยอมจ่ายเพื่อประสบการณ์",
            value: "ที่พัก: ยอมจ่ายเพิ่มเพื่อประสบการณ์และบริการ",
          },
        ],
      },
      {
        id: "stay_facility",
        question: "อะไรในที่พักที่เพิ่มความสุขให้ทริปคุณ?",
        multiple: true,
        options: [
          {
            label: "🍳 อาหารเช้า",
            value: "ที่พัก: ให้ความสำคัญกับอาหารเช้า",
          },
          {
            label: "🏊 สระว่ายน้ำ",
            value: "ที่พัก: ชอบที่พักมีสระว่ายน้ำ",
          },
          {
            label: "💆 Spa / Wellness",
            value: "ที่พัก: ชอบที่พักมี Spa หรือ Wellness",
          },
          {
            label: "💻 Workspace / Wi-Fi ดี",
            value: "ที่พัก: ต้องการ Workspace และอินเทอร์เน็ตดี",
          },
          {
            label: "📸 ถ่ายรูปสวย",
            value: "ที่พัก: ให้ความสำคัญกับมุมถ่ายรูปสวย",
          },
        ],
      },
    ],
  },
  {
    title: "🚗 ด้านการเดินทางและการเคลื่อนที่",
    description:
      "วิธีเดินทาง ระยะทางที่รับได้ การเดินเท้า และความสำคัญของเส้นทาง",
    questions: [
      {
        id: "mobility_mode",
        question: "เวลาท่องเที่ยว คุณชอบเดินทางแบบไหน?",
        multiple: true,
        options: [
          {
            label: "🚗 รถส่วนตัว / เช่ารถ",
            value: "การเดินทาง: ชอบใช้รถส่วนตัวหรือเช่ารถ",
          },
          {
            label: "🚕 Taxi / Ride-hailing",
            value: "การเดินทาง: ชอบใช้ Taxi หรือ Ride-hailing",
          },
          {
            label: "🚌 ขนส่งสาธารณะ",
            value: "การเดินทาง: ชอบใช้ขนส่งสาธารณะ",
          },
          {
            label: "🚶 เดินเที่ยว",
            value: "การเดินทาง: ชอบเดินเที่ยว",
          },
          {
            label: "🏍️ มอเตอร์ไซค์",
            value: "การเดินทาง: ชอบใช้มอเตอร์ไซค์",
          },
        ],
      },
      {
        id: "mobility_distance",
        question: "ระยะเวลาเดินทางระหว่างจุดที่คุณรับได้?",
        options: [
          {
            label: "⏱️ ไม่เกิน 30 นาที",
            value: "การเดินทาง: ไม่อยากนั่งรถเกิน 30 นาทีต่อช่วง",
          },
          {
            label: "🕐 30–60 นาทีได้",
            value: "การเดินทาง: รับการเดินทาง 30-60 นาทีต่อช่วงได้",
          },
          {
            label: "🛣️ 1–2 ชม. ถ้าคุ้ม",
            value: "การเดินทาง: ยอมเดินทาง 1-2 ชั่วโมงถ้าสถานที่คุ้ม",
          },
          {
            label: "🌄 ระยะทางไม่ใช่ปัญหา",
            value: "การเดินทาง: ระยะทางไม่ใช่ข้อจำกัดสำคัญ",
          },
        ],
      },
      {
        id: "mobility_walk",
        question: "คุณโอเคกับการเดินมากแค่ไหน?",
        options: [
          {
            label: "🛋️ เดินน้อย",
            value: "การเดินทาง: ไม่อยากเดินเยอะ",
          },
          {
            label: "🚶 เดินพอประมาณ",
            value: "การเดินทาง: เดินระยะปานกลางได้",
          },
          {
            label: "🥾 เดินเยอะได้",
            value: "การเดินทาง: เดินเยอะได้",
          },
        ],
      },
      {
        id: "mobility_route",
        question: "ถ้าต้องเลือก คุณให้ความสำคัญกับอะไร?",
        options: [
          {
            label: "⚡ เส้นทางสั้นและเร็ว",
            value: "การเดินทาง: เน้นเส้นทางสั้นและประหยัดเวลา",
          },
          {
            label: "🌄 ทางสวย / แวะระหว่างทาง",
            value: "การเดินทาง: ชอบเส้นทางสวยและจุดแวะระหว่างทาง",
          },
          {
            label: "🎯 ยอมอ้อมเพื่อจุดที่ใช่",
            value: "การเดินทาง: ยอมอ้อมเส้นทางเพื่อสถานที่ที่ตรงความชอบ",
          },
        ],
      },
    ],
  },
  {
    title: "🧗 ด้านกิจกรรมและจังหวะการเที่ยว",
    description:
      "ความแน่นของแผน ระดับพลังงาน ความลุย และช่วงเวลาที่คุณเที่ยวได้ดีที่สุด",
    questions: [
      {
        id: "pace",
        question: "จังหวะทริปที่ใช่สำหรับคุณ?",
        options: [
          {
            label: "🐢 Slow Travel",
            value: "จังหวะทริป: Slow Travel",
          },
          {
            label: "⚖️ สมดุล",
            value: "จังหวะทริป: สมดุล ไม่แน่นหรือชิลเกินไป",
          },
          {
            label: "⚡ เที่ยวแน่น",
            value: "จังหวะทริป: ชอบเที่ยวแน่นหลายจุด",
          },
        ],
      },
      {
        id: "activity_intensity",
        question: "ระดับกิจกรรมที่คุณชอบ?",
        options: [
          {
            label: "😌 เบา ๆ พักผ่อน",
            value: "กิจกรรม: ชอบกิจกรรมเบาและพักผ่อน",
          },
          {
            label: "🚶 เดินเที่ยว / สำรวจ",
            value: "กิจกรรม: ชอบเดินเที่ยวและสำรวจ",
          },
          {
            label: "🥾 Active",
            value: "กิจกรรม: ชอบกิจกรรมใช้พลังงาน",
          },
          {
            label: "🧗 Adventure",
            value: "กิจกรรม: ชอบกิจกรรม Adventure และความท้าทาย",
          },
        ],
      },
      {
        id: "activity_time",
        question: "ช่วงเวลาไหนที่คุณมีพลังเที่ยวที่สุด?",
        options: [
          {
            label: "🌅 เช้า",
            value: "จังหวะทริป: ชอบเริ่มเที่ยวแต่เช้า",
          },
          {
            label: "☀️ กลางวัน",
            value: "จังหวะทริป: ชอบเที่ยวช่วงกลางวัน",
          },
          {
            label: "🌇 เย็น",
            value: "จังหวะทริป: ชอบเที่ยวช่วงเย็น",
          },
          {
            label: "🌙 กลางคืน",
            value: "จังหวะทริป: เป็นสายกลางคืน",
          },
        ],
      },
      {
        id: "activity_plan",
        question: "คุณชอบแผนแบบไหน?",
        options: [
          {
            label: "📋 วางแผนละเอียด",
            value: "จังหวะทริป: ชอบแผนละเอียดและมีเวลาชัดเจน",
          },
          {
            label: "🧭 มีโครงแต่ยืดหยุ่น",
            value: "จังหวะทริป: ชอบมีโครงแผนแต่ยืดหยุ่นได้",
          },
          {
            label: "🎲 หน้างานค่อยเลือก",
            value: "จังหวะทริป: ชอบความ spontaneous และตัดสินใจหน้างาน",
          },
        ],
      },
    ],
  },
  {
    title: "🎉 ด้านบรรยากาศ สังคม และ Nightlife",
    description:
      "ระดับความคึกคัก ผู้คน ความเป็นส่วนตัว และกิจกรรมช่วงค่ำ",
    questions: [
      {
        id: "social_crowd",
        question: "สถานที่แบบไหนทำให้คุณรู้สึกสบายใจ?",
        options: [
          {
            label: "🌿 คนน้อย เงียบสงบ",
            value: "สังคม: ชอบสถานที่คนน้อยและเงียบสงบ",
          },
          {
            label: "🙂 มีคนบ้าง ไม่วุ่นวาย",
            value: "สังคม: ชอบบรรยากาศมีคนพอประมาณ",
          },
          {
            label: "👥 คึกคัก คนเยอะ",
            value: "สังคม: ชอบสถานที่คึกคักและคนเยอะ",
          },
        ],
      },
      {
        id: "social_interaction",
        question: "เวลาเที่ยว คุณชอบบรรยากาศทางสังคมแบบไหน?",
        options: [
          {
            label: "🙋‍♀️ มีพื้นที่ส่วนตัว",
            value: "สังคม: ให้ความสำคัญกับพื้นที่ส่วนตัว",
          },
          {
            label: "🤝 ชอบเจอคนใหม่",
            value: "สังคม: ชอบพบปะและทำความรู้จักคนใหม่",
          },
          {
            label: "👨‍👩‍👧 เน้นเวลากับคนที่ไปด้วย",
            value: "สังคม: เน้นใช้เวลากับผู้ร่วมทริป",
          },
        ],
      },
      {
        id: "nightlife",
        question: "กลางคืนของทริปควรเป็นแบบไหน?",
        multiple: true,
        options: [
          {
            label: "🌙 กลับพักเร็ว",
            value: "Nightlife: ชอบกลับที่พักเร็วและพักผ่อน",
          },
          {
            label: "🧺 Night Market",
            value: "Nightlife: ชอบ Night Market",
          },
          {
            label: "🎶 Live Music",
            value: "Nightlife: ชอบ Live Music",
          },
          {
            label: "🍸 Bar / Cocktail",
            value: "Nightlife: ชอบ Bar และ Cocktail",
          },
          {
            label: "🎉 Party",
            value: "Nightlife: ชอบ Party และสถานที่คึกคัก",
          },
        ],
      },
    ],
  },
  {
    title: "📸 ด้านวัฒนธรรม คอนเทนต์ และการค้นพบ",
    description:
      "สิ่งที่ทำให้สถานที่หนึ่งน่าไปสำหรับคุณ ตั้งแต่วัฒนธรรมจนถึงเทรนด์และมุมถ่ายรูป",
    questions: [
      {
        id: "content_priority",
        question: "เรื่องรูปและคอนเทนต์สำคัญกับทริปคุณแค่ไหน?",
        options: [
          {
            label: "📸 ต้องถ่ายรูปสวย",
            value: "คอนเทนต์: ให้ความสำคัญกับมุมถ่ายรูปสวย",
          },
          {
            label: "🔥 ชอบที่กำลัง Viral",
            value: "คอนเทนต์: สนใจสถานที่กำลังเป็นกระแสหรือ Viral",
          },
          {
            label: "🎬 ชอบทำ Content",
            value: "คอนเทนต์: ชอบทำคอนเทนต์ระหว่างเที่ยว",
          },
          {
            label: "🙅 ไม่สนว่าในโซเชียลดังไหม",
            value: "คอนเทนต์: ไม่ให้ความสำคัญกับกระแสโซเชียล",
          },
        ],
      },
      {
        id: "culture_style",
        question: "ประสบการณ์แบบไหนดึงดูดคุณ?",
        multiple: true,
        options: [
          {
            label: "🙏 วัด / ความเชื่อ",
            value: "วัฒนธรรม: สนใจวัดและความเชื่อ",
          },
          {
            label: "🏺 ประวัติศาสตร์",
            value: "วัฒนธรรม: สนใจประวัติศาสตร์",
          },
          {
            label: "🏘️ ชุมชน / Local",
            value: "วัฒนธรรม: ชอบชุมชนและ Local Experience",
          },
          {
            label: "🎨 Workshop / Craft",
            value: "วัฒนธรรม: ชอบ Workshop งานคราฟต์และกิจกรรมลงมือทำ",
          },
          {
            label: "🗺️ Unseen / Hidden Gem",
            value: "วัฒนธรรม: ชอบ Unseen และ Hidden Gem",
          },
        ],
      },
      {
        id: "shopping_style",
        question: "ถ้ามีเวลาช้อป คุณสนใจอะไร?",
        multiple: true,
        options: [
          {
            label: "👜 Local Brand",
            value: "ช้อปปิ้ง: ชอบ Local Brand",
          },
          {
            label: "🧺 ตลาดท้องถิ่น",
            value: "ช้อปปิ้ง: ชอบตลาดท้องถิ่น",
          },
          {
            label: "🎁 ของฝาก",
            value: "ช้อปปิ้ง: ชอบซื้อของฝาก",
          },
          {
            label: "👗 แฟชั่น",
            value: "ช้อปปิ้ง: สนใจแฟชั่น",
          },
          {
            label: "🙅 ไม่เน้นช้อป",
            value: "ช้อปปิ้ง: ไม่ให้ความสำคัญกับการช้อป",
          },
        ],
      },
    ],
  },
];

function PersonalSurvey() {
  const navigate = useNavigate();

  const [travelTypes, setTravelTypes] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [preferredRegion, setPreferredRegion] = useState<string[]>([]);
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [foodRestrictions, setFoodRestrictions] = useState("");
  const [showDeepSurvey, setShowDeepSurvey] = useState(false);

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

  const selectDeepAnswer = (
    question: DeepSurveyQuestion,
    optionValue: string
  ) => {
    setPersonalityTags((current) => {
      const optionValues =
        question.options.map(
          option => option.value
        );

      const alreadySelected =
        current.includes(
          optionValue
        );

      if (question.multiple) {
        return alreadySelected
          ? current.filter(
              value =>
                value !== optionValue
            )
          : [
              ...current,
              optionValue
            ];
      }

      const withoutThisQuestion =
        current.filter(
          value =>
            !optionValues.includes(
              value
            )
        );

      return alreadySelected
        ? withoutThisQuestion
        : [
            ...withoutThisQuestion,
            optionValue
          ];
    });
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
          personality_tags: [
            ...personalityTags,
            ...(
              foodRestrictions.trim()
                ? [
                    `ข้อจำกัดอาหาร: ${foodRestrictions.trim()}`
                  ]
                : []
            ),
          ],
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
              Deep Personalization — 6 dimensions
              ================================================== */}
          <section className="survey-card">

            <div className="survey-section-header">

              <div className="survey-section-icon survey-section-icon-pink">
                <Sparkles className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="survey-section-title">
                  เจาะลึกสไตล์การเดินทางของคุณ
                </h3>

                <p className="survey-section-description">
                  6 ด้านสำคัญที่จะช่วยให้ AI เข้าใจทั้งการกิน ที่พัก การเดินทาง
                  จังหวะทริป บรรยากาศ และสิ่งที่คุณให้ความสำคัญจริง ๆ
                  ส่วนนี้ไม่บังคับ แต่ยิ่งตอบละเอียด แผนจะยิ่งเป็นคุณมากขึ้น
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowDeepSurvey(
                  current => !current
                )
              }
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#decfdf] bg-white/65 px-4 py-3.5 text-left transition hover:bg-white"
            >
              <div>
                <p className="text-sm font-bold text-[#6f456f]">
                  {showDeepSurvey
                    ? "ซ่อนคำถามเจาะลึก"
                    : "ตอบคำถามเจาะลึกเพิ่มเติม"}
                </p>

                <p className="mt-1 text-xs leading-5 text-[#8b7894]">
                  ไม่จำเป็นต้องกรอก สามารถข้ามส่วนนี้และบันทึกแบบสอบถามได้เลย
                </p>
              </div>

              {showDeepSurvey ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-[#6f456f]" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-[#6f456f]" />
              )}
            </button>

            {showDeepSurvey && (
              <div className="mt-6 space-y-6">
              {DEEP_SURVEY_DIMENSIONS.map(
                (dimension, dimensionIndex) => (
                  <div
                    key={dimension.title}
                    className="rounded-[24px] border border-white/75 bg-white/38 p-4 sm:p-5"
                  >
                    <div className="mb-5 flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6f456f]/10 text-xs font-extrabold text-[#6f456f]">
                        {dimensionIndex + 1}
                      </span>

                      <div>
                        <h4 className="text-base font-extrabold text-[#40364b]">
                          {dimension.title}
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-[#81778b]">
                          {dimension.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {dimension.questions.map(
                        (question) => (
                          <div
                            key={question.id}
                            className="rounded-[20px] border border-[#ece3ed] bg-white/58 p-4"
                          >
                            <div className="mb-3">
                              <p className="text-sm font-bold leading-6 text-[#51475a]">
                                {question.question}
                              </p>

                              {question.description && (
                                <p className="mt-1 text-[11px] font-medium text-[#978c9d]">
                                  {question.description}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2.5">
                              {question.options.map(
                                (option) => {
                                  const selected =
                                    personalityTags.includes(
                                      option.value
                                    );

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() =>
                                        selectDeepAnswer(
                                          question,
                                          option.value
                                        )
                                      }
                                      className={`survey-chip ${
                                        selected
                                          ? "survey-chip-selected"
                                          : ""
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )
                      )}

                      {dimensionIndex === 0 && (
                        <div className="rounded-[20px] border border-[#ece3ed] bg-white/58 p-4">
                          <label
                            htmlFor="food-restrictions"
                            className="text-sm font-bold leading-6 text-[#51475a]"
                          >
                            มีอาหารที่แพ้ ไม่กิน หรือวัตถุดิบที่อยากหลีกเลี่ยงไหม?
                          </label>

                          <p className="mt-1 text-[11px] leading-5 text-[#978c9d]">
                            เช่น แพ้กุ้ง, ไม่กินเนื้อวัว, มังสวิรัติ, ไม่กินเผ็ด
                            — เว้นว่างได้ถ้าไม่มี
                          </p>

                          <input
                            id="food-restrictions"
                            type="text"
                            value={foodRestrictions}
                            onChange={(event) =>
                              setFoodRestrictions(
                                event.target.value
                              )
                            }
                            placeholder="พิมพ์ข้อจำกัดด้านอาหาร..."
                            className="mt-3 w-full rounded-2xl border border-[#dfd3e1] bg-white/80 px-4 py-3 text-sm text-[#40364b] outline-none transition placeholder:text-[#aaa0ae] focus:border-[#b89bcb] focus:ring-4 focus:ring-[#c8a9d8]/20"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
              </div>
            )}

            {showDeepSurvey && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/55 px-4 py-3">
                <p className="text-xs leading-5 text-[#71697d]">
                  คำตอบส่วนนี้จะถูกใช้เป็นบริบทเสริมสำหรับ Recommendation และ AI Planner
                </p>

                <span className="shrink-0 rounded-full bg-[#6f456f]/10 px-3 py-1 text-xs font-bold text-[#6f456f]">
                  {personalityTags.length} คำตอบ
                </span>
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
