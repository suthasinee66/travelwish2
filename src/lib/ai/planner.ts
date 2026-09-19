import { supabase } from "@/lib/supabase";
import {
    rankPlacesWithNearbyRestaurants
} from "./algorithm";
import type { TripPlanInput } from "./types";

import {
    generateWithSelectedModel,
    type AIModel
} from "./ai";





/*
 โหลดสถานที่เที่ยวทั้งหมด
 ไม่จำกัด 1000 row
*/
async function loadAllAttractions(
    province: string
) {

    let all: any[] = [];

    let from = 0;

    const size = 1000;


    while (true) {


        const {
            data,
            error
        } = await supabase
            .from("attraction")
            .select("*")
            .eq(
                "province",
                province
            )
            .range(
                from,
                from + size - 1
            );


        if (error) {

            console.log(error);
            break;

        }


        if (!data || data.length === 0)
            break;


        all.push(...data);


        if (data.length < size)
            break;


        from += size;

    }


    return all;

}

async function loadUserPreferences(
    userId: string
) {

    const {
        data,
        error
    } = await supabase
        .from("user_preferences")
        .select("*")
        .eq(
            "profile_id",
            userId
        )
        .single();


    if(error){

        console.error(
            "Load preferences error",
            error
        );

        return null;
    }


    return data;

}

/*
 โหลดร้านอาหารทั้งหมด
*/
async function loadAllRestaurants(province: string) {

    let all: any[] = [];

    let from = 0;

    const size = 1000;

    console.log("province =", JSON.stringify(province));

    while (true) {

        const { data, error } = await supabase
            .from("restaurant")
            .select("*")
            .eq("province_name_th", province.trim())
            .range(from, from + size - 1);

        console.log("Restaurant Error =", error);
        console.log("Restaurant Rows =", data?.length);
        console.log("Restaurant Data =", data?.slice(0, 3));

        if (error) {
            break;
        }

        if (!data || data.length === 0) {
            break;
        }

        all.push(...data);

        if (data.length < size)
            break;

        from += size;
    }

    return all;
}



/*
 Main Planner
*/

export async function createPlanner(
    trip: TripPlanInput,
    chatId: string,
    userId: string,
    selectedModel: AIModel = "gemini"
) {

    console.log("==================================================");
    console.log("🚀 เริ่มสร้างแผนเที่ยว");
    console.log("==================================================");

    console.log("📋 ข้อมูลทริป");
    console.log(trip);

    const preferences = await loadUserPreferences(userId);


console.log(
    "🎯 User Preferences",
    preferences
);

    // 1. โหลดสถานที่
    console.log("📍 กำลังโหลดสถานที่...");
    const attractions = await loadAllAttractions(trip.province);
    console.log(`✅ โหลดสถานที่สำเร็จ ${attractions.length} แห่ง`);

    // 2. โหลดร้านอาหาร
    console.log("🍜 กำลังโหลดร้านอาหาร...");
    const restaurants = await loadAllRestaurants(trip.province);
    console.log(`✅ โหลดร้านอาหารสำเร็จ ${restaurants.length} ร้าน`);

    // 3. Algorithm
    console.log("🧮 กำลังจัดอันดับสถานที่...");
    const tripData = {

    ...trip,
travelType:
 trip.travelType?.length
 ?
 trip.travelType
 :
 preferences?.travel_type ?? [],


activities:
 trip.activities?.length
 ?
 trip.activities
 :
 preferences?.activities ?? [],


atmosphere:
 trip.atmosphere?.length
 ?
 trip.atmosphere
 :
 preferences?.atmosphere
 ? 
 [preferences.atmosphere]
 :
 [],

    companion:
        trip.companion ||
        preferences?.travel_companion,

    budget:
        trip.budget ||
        preferences?.budget

};


console.log(
    "FINAL TRIP DATA",
    tripData
);

// ============================================
// บันทึก Trip Preferences + AI Model
// ============================================

const {
    error: sessionError
} = await supabase
    .from("chat_sessions")
    .update({
        trip_preferences: tripData,
        ai_model: selectedModel
    })
    .eq("id", chatId);

if (sessionError) {

    console.error(
        "❌ บันทึก chat session ไม่สำเร็จ",
        sessionError
    );

} else {

    console.log(
        "✅ บันทึก chat session สำเร็จ"
    );

    console.log(
        "🤖 AI Model:",
        selectedModel
    );

}

const ranked =
    await rankPlacesWithNearbyRestaurants(
        attractions,
        restaurants,
        tripData,
        {
            limit: 10
        }
    );

console.log(
    `🏆 Algorithm เลือกสถานที่ ${ranked.length} แห่ง`
);


/* =========================================================
   เตรียมข้อมูลสำหรับ AI Planner

   สำคัญ:
   ranked = ข้อมูลเต็มสำหรับระบบ/UI
   plannerRanked = ข้อมูลย่อสำหรับส่ง AI

   ไม่ส่ง:
   - images
   - latitude / longitude
   - TDMC internal metrics
   - normalized values
   - topic metrics
   - rating ที่ไม่จำเป็น
   ========================================================= */
const plannerRanked =
    ranked.map((item, index) => ({

        rank: index + 1,

        attraction: {
            id: item.attraction.id,
            name_th: item.attraction.name_th,
            category: item.attraction.category ?? [],

            distanceKm:
                Number.isFinite(
                    Number(item.attraction.distanceKm)
                )
                    ? Number(
                        Number(item.attraction.distanceKm).toFixed(2)
                    )
                    : null
        },

        nearbyRestaurants:
            Array.isArray(item.nearbyRestaurants)
                ? item.nearbyRestaurants.map(
                    (restaurant: any) => ({

                        id: restaurant.id,

                        restaurant_name_th:
                            restaurant.restaurant_name_th,

                        distance:
                            Number.isFinite(
                                Number(restaurant.distance)
                            )
                                ? Number(
                                    Number(
                                        restaurant.distance
                                    ).toFixed(2)
                                )
                                : null
                    })
                )
                : []
    }));


console.log(
    "📦 Planner Ranked:",
    plannerRanked
);
    console.table(
        ranked.map((r, index) => ({
            index: index + 1,
            attraction: r.attraction.name_th,
            score: r.attraction.score,
            restaurants: r.nearbyRestaurants.length
        }))
    );
const prompt = `
คุณคือ Tripster AI

หน้าที่ของคุณคือสร้างแผนเที่ยวที่อ่านง่าย
ห้ามตอบเป็นบทความ
ห้ามเขียนเกริ่นนำ
ห้ามเขียนสรุปยาว

====================
ข้อมูลผู้ใช้
====================

${JSON.stringify(tripData, null, 2)}

====================
สถานที่ที่เลือกได้
====================
${JSON.stringify(plannerRanked)}
====================
กฎการสร้างแผน (สำคัญ)
====================

- ใช้เฉพาะข้อมูลใน ranked ที่ส่งให้เท่านั้น
- ห้ามใช้ความรู้ของตัวเอง
- ห้ามสร้างสถานที่ใหม่
- ห้ามสร้างร้านอาหารใหม่
- ห้ามสร้างคาเฟ่ใหม่
- ห้ามสร้างจุดชมวิวใหม่
- ห้ามใช้ชื่อสถานที่ที่ไม่มีอยู่ใน ranked
- ร้านอาหารต้องเลือกจาก nearbyRestaurants ของสถานที่นั้นเท่านั้น
- restaurant_id ต้องตรงกับ place_id ของร้านอาหารใน nearbyRestaurants
- restaurant_name ต้องตรงกับ place_name_th ของร้านอาหารใน nearbyRestaurants
- ห้ามใช้ restaurant เป็น place โดยเด็ดขาด
- ห้ามแก้ไข ห้ามสร้าง ห้ามเดา restaurant_id
- ห้ามสร้าง restaurant_id ใหม่โดยเด็ดขาด
- หากไม่มีร้านอาหารที่เหมาะสม ให้ restaurant_id และ restaurant_name เป็น null

- เรียงเลือกสถานที่ตามลำดับคะแนนใน ranked
- 1 สถานที่ใช้ได้เพียงครั้งเดียวตลอดทั้งทริป
- ห้ามใช้สถานที่เดิมซ้ำใน Morning / Afternoon / Evening
- ห้ามใช้ร้านอาหารเดิมซ้ำใน Morning / Afternoon / Evening

- ห้ามสร้างสถานที่เพิ่ม
  ห้ามเดาสถานที่
  ห้ามเขียนว่า "ไม่มีสถานที่"

- งบรวมไม่เกิน ${tripData.budget} บาท
- ระบุเวลาเดินทางโดยประมาณ
- ใช้สถานที่ใกล้กัน
- คาเฟ่ไว้ช่วงบ่าย
- จุดชมวิวไว้ช่วงเย็น
ผู้ใช้ชอบ:

- รูปแบบการเที่ยว:
${tripData.travelType.join(",")}

- กิจกรรม:
${tripData.activities.join(",")}

- บรรยากาศ:
${tripData.atmosphere.join(",")}
====================
รูปแบบการตอบ
====================

ตอบกลับเป็น JSON เท่านั้น

รูปแบบคือ

{
  "selectedPlaces": [
    {
      "day": 1,
      "title": ชื่อธีมของวันที่ 1,
      "period": "Morning",
      "place_id": "...",
      "place_name": "...",
      "restaurant_id": "...",
      "restaurant_name": "..."
    }
  ],
  "markdown": "แผนเที่ยวทั้งหมดในรูปแบบ Markdown"
}

====================
ข้อกำหนด selectedPlaces
====================

- selectedPlaces ต้องอ้างอิงข้อมูลจาก ranked เท่านั้น
- place_id ต้องตรงกับ id ของ attraction ใน ranked เท่านั้น
- restaurant_id ต้องตรงกับ place_id ของ restaurant ใน nearbyRestaurants เท่านั้น
- restaurant_name ต้องตรงกับ place_name_th ของ restaurant ใน nearbyRestaurants
- หากไม่มีร้านอาหารที่เหมาะสม ให้ restaurant_id และ restaurant_name เป็น null
- ห้ามสร้าง place_id หรือ restaurant_id ใหม่
- ห้ามสร้างสถานที่ใหม่
- ห้ามสร้างร้านอาหารใหม่
- ห้ามใช้ restaurant เป็น place
- ห้ามใช้สถานที่เดิมซ้ำตลอดทั้งทริป
- ห้ามใช้ร้านอาหารเดิมซ้ำตลอดทั้งทริป

====================
ข้อกำหนด Markdown
====================

markdown คือเนื้อหาแผนเที่ยวที่ผู้ใช้จะเห็น

ต้องเขียนเป็น Markdown เท่านั้น

คุณมีอิสระในการออกแบบรูปแบบการนำเสนอแผนเที่ยว
ไม่จำเป็นต้องทำตาม Template ที่กำหนดไว้

สามารถเลือกใช้รูปแบบที่เหมาะสมได้ เช่น

- Heading
- Subheading
- Bullet list
- Numbered list
- ตาราง
- Timeline
- Emoji
- Highlight
- Blockquote
- Bold / Italic
- หรือการผสมผสานรูปแบบ Markdown

คุณสามารถเลือกวิธีการจัดลำดับและนำเสนอข้อมูลเอง
โดยคำนึงถึงความอ่านง่าย ความชัดเจน และประสบการณ์ของผู้ใช้

อย่างไรก็ตาม ต้องมีข้อมูลที่จำเป็นสำหรับการวางแผนเที่ยว
เช่น วัน เวลา สถานที่ ร้านอาหาร กิจกรรม และรายละเอียดที่เกี่ยวข้อง

ห้ามสร้างข้อมูลสถานที่หรือร้านอาหารที่ไม่มีอยู่ใน ranked

====================
กฎสำคัญ
====================

- ใช้เฉพาะข้อมูลใน ranked ที่ส่งให้เท่านั้น
- ห้ามใช้ความรู้ของตัวเองเพื่อสร้างสถานที่เพิ่มเติม
- ห้ามสร้างชื่อสถานที่ ร้านอาหาร หรือ ID ใหม่
- งบรวมต้องไม่เกิน ${tripData.budget} บาท
- ระบุเวลาเดินทางโดยประมาณ
- พยายามเลือกสถานที่ที่อยู่ใกล้กัน
- คาเฟ่ควรพิจารณาจัดไว้ในช่วงบ่าย
- จุดชมวิวควรพิจารณาจัดไว้ในช่วงเย็น

ห้ามมีข้อความใด ๆ นอก JSON
`;
console.log(prompt);
    console.log("==================================================");
console.log(
    `🤖 ส่งข้อมูลให้ ${selectedModel.toUpperCase()}`
);
console.log("==================================================");

console.log("📦 ข้อมูลผู้ใช้");
console.log(trip);

console.log("📍 จำนวนสถานที่ที่ส่ง =", ranked.length);

    console.log(
        "📋 รายชื่อสถานที่",
        ranked.map(r => r.attraction.name_th)
    );

    console.log(
        "🍜 ร้านอาหารทั้งหมด",
        ranked.reduce(
            (sum, r) => sum + r.nearbyRestaurants.length,
            0
        )
    );
    console.log

    console.log("📄 Prompt Length =", prompt.length);
    const estimatedPromptTokens = Math.ceil(prompt.length / 4);

console.log("🔢 Estimated Input Tokens =", estimatedPromptTokens);

    console.log(
    `⏳ ${selectedModel.toUpperCase()} กำลังประมวลผล...`
);

const start = performance.now();

const raw = await generateWithSelectedModel(
    selectedModel,
    prompt
);

    const end = performance.now();

    console.log(
    `✅ ${selectedModel.toUpperCase()} ตอบกลับแล้ว`
);
    console.log(
        `⏱️ ใช้เวลา ${((end - start) / 1000).toFixed(2)} วินาที`
    );

    console.log(
    "📄 Response Length =",
    raw.length
);

let result;

try {

    const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

    result = JSON.parse(cleaned);

} catch (e) {

    console.error("Gemini JSON Parse Error");
    console.log(raw);

    throw new Error("Gemini returned invalid JSON");
}

const aiMessage = result.markdown ?? "";

const selectedPlaces = result.selectedPlaces ?? [];
console.log(selectedPlaces);


console.log("💾 กำลังบันทึก planner ลง database...");
const { data, error } = await supabase
.from("chat_messages")
.insert({
    session_id: chatId,
    user_id: userId,
    role: "ai",
    content: aiMessage,
    planner_json: result.selectedPlaces
})
.select();


if(error){

    console.error(
        "❌ บันทึก planner ไม่สำเร็จ",
        error
    );

}
else{

    console.log(
        "✅ บันทึก planner ลง database แล้ว",
        data
    );

}


console.log("🎉 สร้างแผนเที่ยวเสร็จ");
console.log("==================================================");


return {
    markdown: aiMessage,
    planner_json: selectedPlaces
};
}

