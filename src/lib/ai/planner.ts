import { supabase } from "@/lib/supabase";
import {
    rankPlacesWithNearbyRestaurants
} from "./algorithm";
import type { TripPlanInput } from "./types";
import {
    getGuestPreferences,
    isGuestUser
} from "@/lib/guest/guestPreferences";

import {
    generateWithSelectedModel,
    type AIModel
} from "./ai";


const API_URL =
    (
        import.meta.env.VITE_API_URL ||
        (
            import.meta.env.DEV
                ? "http://localhost:5000"
                : ""
        )
    ).replace(/\/$/, "");

async function resolveAIAttraction(
    proposedPlace: any,
    province: string,
    selectedModel: AIModel
) {
    if (!API_URL) {
        throw new Error(
            "VITE_API_URL is required to resolve AI attractions"
        );
    }

    const response =
        await fetch(
            `${API_URL}/api/resolve-ai-attraction`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    name:
                        proposedPlace?.name_th ??
                        proposedPlace?.name,

                    province,

                    aiData: {
                        ...proposedPlace,
                        ai_model:
                            selectedModel
                    }
                })
            }
        );

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            `Resolve AI attraction failed: ${errorText}`
        );
    }

    return response.json();
}

async function resolveAIProposedPlaces(
    proposedPlaces: any[],
    province: string,
    selectedModel: AIModel
) {
    const resolvedByKey =
        new Map<string, any>();

    for (
        const proposedPlace
        of proposedPlaces
    ) {
        const key =
            String(
                proposedPlace?.key ??
                ""
            ).trim();

        const name =
            String(
                proposedPlace?.name_th ??
                proposedPlace?.name ??
                ""
            ).trim();

        if (
            !key ||
            !name
        ) {
            continue;
        }

        try {
            console.log(
                "🌐 VERIFY AI PLACE:",
                name
            );

            const response =
                await resolveAIAttraction(
                    proposedPlace,
                    province,
                    selectedModel
                );

            if (
                response?.success &&
                response?.attraction?.att_id
            ) {
                resolvedByKey.set(
                    key,
                    response.attraction
                );

                console.log(
                    "✅ AI PLACE VERIFIED:",
                    {
                        key,
                        att_id:
                            response.attraction
                                .att_id,
                        name:
                            response.attraction
                                .name_th,
                        images:
                            response.attraction
                                .images?.length ??
                            0
                    }
                );
            }
        } catch (error) {
            console.warn(
                "⚠️ AI PLACE VERIFY FAILED:",
                {
                    key,
                    name,
                    error
                }
            );
        }
    }

    return resolvedByKey;
}


async function resolveAIRestaurant(
    proposedRestaurant: any,
    province: string,
    attId: string | null
) {
    if (!API_URL) {
        throw new Error(
            "VITE_API_URL is required to resolve AI restaurants"
        );
    }

    const response =
        await fetch(
            `${API_URL}/api/resolve-ai-restaurant`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    name:
                        proposedRestaurant?.name_th ??
                        proposedRestaurant?.name,

                    province,

                    att_id:
                        attId
                })
            }
        );

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            `Resolve AI restaurant failed: ${errorText}`
        );
    }

    return response.json();
}

async function resolveAIProposedRestaurants(
    proposedRestaurants: any[],
    selectedPlaces: any[],
    province: string
) {
    const resolvedByKey =
        new Map<string, any>();

    const placeByRestaurantKey =
        new Map<string, string>();

    for (
        const item
        of selectedPlaces
    ) {
        const restaurantKey =
            String(
                item?.proposed_restaurant_key ??
                ""
            ).trim();

        const placeId =
            String(
                item?.place_id ??
                ""
            ).trim();

        if (
            restaurantKey &&
            placeId
        ) {
            placeByRestaurantKey.set(
                restaurantKey,
                placeId
            );
        }
    }

    for (
        const proposedRestaurant
        of proposedRestaurants
    ) {
        const key =
            String(
                proposedRestaurant?.key ??
                ""
            ).trim();

        const name =
            String(
                proposedRestaurant?.name_th ??
                proposedRestaurant?.name ??
                ""
            ).trim();

        if (
            !key ||
            !name
        ) {
            continue;
        }

        try {
            console.log(
                "🌐 VERIFY AI RESTAURANT:",
                name
            );

            const response =
                await resolveAIRestaurant(
                    proposedRestaurant,
                    province,
                    placeByRestaurantKey.get(
                        key
                    ) ?? null
                );

            if (
                response?.success &&
                response?.restaurant?.place_id
            ) {
                resolvedByKey.set(
                    key,
                    response.restaurant
                );

                console.log(
                    "✅ AI RESTAURANT VERIFIED:",
                    {
                        key,
                        place_id:
                            response.restaurant
                                .place_id,
                        name:
                            response.restaurant
                                .place_name_th,
                        images:
                            response.restaurant
                                .images?.length ??
                            0
                    }
                );
            }
        } catch (error) {
            console.warn(
                "⚠️ AI RESTAURANT VERIFY FAILED:",
                {
                    key,
                    name,
                    error
                }
            );
        }
    }

    return resolvedByKey;
}





/*
 โหลดสถานที่เที่ยวทั้งหมด
 ไม่จำกัด 1000 row
*/
export async function loadAllAttractions(
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

export async function loadUserPreferences(
    userId: string
) {
    const {
        data: authData
    } = await supabase.auth.getUser();

    if (
        authData.user?.id === userId &&
        isGuestUser(authData.user)
    ) {
        return getGuestPreferences();
    }

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


export async function loadUserProfile(
    userId: string
) {
    const {
        data: authData
    } = await supabase.auth.getUser();

    if (
        authData.user?.id === userId &&
        isGuestUser(authData.user)
    ) {
        return {
            profile_id: userId,
            name: "Guest",
            age: null,
            gender: null,
            is_guest: true
        };
    }

    const {
        data,
        error
    } = await supabase
        .from("profile")
        .select("profile_id, name, age, gender")
        .eq("profile_id", userId)
        .single();

    if (error) {
        console.error(
            "Load profile error",
            error
        );

        return null;
    }

    return data;
}

/*
 Generation เป็นเพียง context เสริม
 explicit preferences ของผู้ใช้ต้องมีน้ำหนักสูงกว่าเสมอ
*/
function inferGeneration(age: number | null | undefined) {
    if (
        age === null ||
        age === undefined ||
        !Number.isFinite(Number(age))
    ) {
        return null;
    }

    const currentYear =
        new Date().getFullYear();

    const approximateBirthYear =
        currentYear - Number(age);

    if (approximateBirthYear >= 2013) {
        return "Gen Alpha";
    }

    if (approximateBirthYear >= 1997) {
        return "Gen Z";
    }

    if (approximateBirthYear >= 1981) {
        return "Gen Y / Millennial";
    }

    if (approximateBirthYear >= 1965) {
        return "Gen X";
    }

    if (approximateBirthYear >= 1946) {
        return "Baby Boomer";
    }

    return "Silent Generation";
}

/*
 โหลดร้านอาหารทั้งหมด
*/
export async function loadAllRestaurants(province: string) {

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

    const {
        data: plannerAuthData
    } = await supabase.auth.getUser();

    const isGuest =
        plannerAuthData.user?.id === userId &&
        isGuestUser(
            plannerAuthData.user
        );

    const [
        preferences,
        profile
    ] = await Promise.all([
        loadUserPreferences(userId),
        loadUserProfile(userId)
    ]);

    const generation =
        inferGeneration(
            profile?.age
        );

console.log(
    "🎯 User Preferences",
    preferences
);

console.log(
    "👤 User Profile",
    profile
);

console.log(
    "🧬 Generation Context",
    generation
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
        preferences?.budget,

    personalityTags:
        Array.isArray(preferences?.personality_tags)
            ? preferences.personality_tags
            : [],

    travelTime:
        preferences?.travel_time ?? null,

    preferredRegion:
        Array.isArray(
            preferences?.preferred_region
        )
            ? preferences.preferred_region
            : [],

    travelGoal:
        preferences?.travel_goal ?? null

};

const userContext = {
    profile: {
        name:
            profile?.name ?? null,

        age:
            profile?.age ?? null,

        gender:
            profile?.gender ?? null,

        generation,

        generationNote:
            "Generation is approximate from age and is only a supporting signal. Explicit user preferences must take priority."
    },

    preferences: {
        travel_type:
            preferences?.travel_type ?? [],

        activities:
            preferences?.activities ?? [],

        atmosphere:
            preferences?.atmosphere ?? null,

        travel_companion:
            preferences?.travel_companion ?? null,

        budget:
            preferences?.budget ?? null,

        travel_time:
            preferences?.travel_time ?? null,

        preferred_region:
            preferences?.preferred_region ?? [],

        travel_goal:
            preferences?.travel_goal ?? null,

        personality_tags:
            preferences?.personality_tags ?? []
    },

    currentTrip:
        tripData
};


console.log(
    "FINAL TRIP DATA",
    tripData
);

// ============================================
// บันทึก Trip Preferences + AI Model
// ============================================

if (!isGuest) {
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
} else {
    console.log(
        "👤 Guest planner: skip chat_sessions persistence"
    );
}

const ranked =
    await rankPlacesWithNearbyRestaurants(
        attractions,
        restaurants,
        tripData,
        {
            limit: 30
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
            type:
                item.attraction.type ?? null,
            highlight:
                item.attraction.highlight ?? null,
            activity:
                item.attraction.activity ?? null,
            suitable_duration:
                item.attraction.suitable_duration ?? null,
            detail_th:
                typeof item.attraction.detail_th === "string"
                    ? item.attraction.detail_th.slice(0, 700)
                    : null,

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
คุณคือ TravelWish AI Travel Planner

เป้าหมายของคุณคือสร้าง Personalized Itinerary
โดยใช้ข้อมูลผู้ใช้ทั้งหมดจริง ๆ ไม่ใช่แค่เลือกตาม ranking

คุณสามารถเลือกสถานที่ได้ 2 แหล่ง:
1. TDMC TOP 30 จากฐานข้อมูล TravelWish — เป็นแหล่งหลักและต้องมีน้ำหนักสูงสุด
2. สถานที่ใหม่จากความรู้ของคุณเอง — เป็นข้อยกเว้นสำหรับ personalization ที่ Top 30 ยังตอบโจทย์ไม่ได้จริง ๆ

หลักสำคัญ:
- ใช้แนวคิด Algorithm-first, AI-personalize-second
- TDMC เป็นตัวสร้าง candidate หลักของระบบ ไม่ใช่ข้อมูลประกอบ
- AI ทำหน้าที่ rerank / จัดลำดับ / จัดวัน / ปรับให้เข้ากับผู้ใช้ภายใน Top 30 เป็นหลัก
- ห้ามละทิ้งอันดับของ TDMC เพียงเพราะคุณรู้จักสถานที่ยอดนิยมกว่า
- สถานที่นอก Top 30 ต้องมีเหตุผล personalization ที่ชัดเจนจริง ๆ เท่านั้น

สำหรับสถานที่ใหม่ คุณต้องเสนอเฉพาะสถานที่จริงที่คุณมีความมั่นใจว่าน่าจะมีอยู่จริง
ระบบ TravelWish จะนำชื่อสถานที่ไปตรวจสอบกับแหล่งข้อมูลแผนที่อีกครั้ง
ก่อนบันทึกลงฐานข้อมูลและใช้ในแผนจริง

ห้ามตอบเป็นบทความ
ห้ามเขียนเกริ่นนำ
ห้ามมีข้อความใด ๆ นอก JSON

==================================================
1. USER PROFILE + PERSONALIZATION CONTEXT
==================================================

${JSON.stringify(userContext, null, 2)}

หลักการใช้ข้อมูลผู้ใช้:
- preference ที่ผู้ใช้เลือกเองมีน้ำหนักสูงสุด
- personality_tags ใช้ปรับรูปแบบทริปอย่างละเอียด
- อายุใช้ช่วยพิจารณาความเข้มข้นของกิจกรรม จังหวะการเที่ยว และความเหมาะสม
- generation ใช้เป็น contextual signal เสริมเท่านั้น
- ห้ามเหมารวมว่าทุกคนใน generation เดียวกันมีพฤติกรรมเหมือนกัน
- หาก generation ขัดกับ preference ที่ผู้ใช้เลือกเอง ให้ยึด preference
- ห้ามเดาความชอบจาก gender
- gender ไม่ควรถูกใช้สร้าง stereotype
- ใช้ travel_goal, travel_time, companion และ budget ประกอบกัน
- พยายามทำให้แผนสุดท้ายสะท้อนตัวตนของผู้ใช้หลายมิติพร้อมกัน

==================================================
2. CURRENT TRIP
==================================================

${JSON.stringify(tripData, null, 2)}

==================================================
3. TDMC TOP 30
==================================================

นี่คือ candidate หลักจาก Recommendation Algorithm
ให้ถือ ranking นี้เป็น prior หลักในการสร้าง itinerary

แนวทางการใช้ ranking:
- Top 1-10 = priority สูงสุด ควรถูกพิจารณาก่อน
- Top 11-20 = ใช้เพื่อ personalization, diversity และ routing
- Top 21-30 = ใช้เมื่อเหมาะกับบริบทเฉพาะหรือช่วยจัดเส้นทาง
- ถ้าสถานที่อันดับสูงเข้ากับผู้ใช้อยู่แล้ว ไม่ควรแทนด้วยสถานที่นอกฐานข้อมูล
- การขยับอันดับภายใน Top 30 ทำได้เมื่อมีเหตุผลจาก preference, route, budget, pace หรือ companion
- โดยรวมอย่างน้อยประมาณ 80% ของสถานที่ในแผนควรมาจาก TDMC Top 30

${JSON.stringify(plannerRanked)}

==================================================
4. การเสนอ NEW AI PLACES
==================================================

คุณสามารถเสนอ "สถานที่ใหม่" ที่ไม่มีอยู่ใน TDMC TOP 30 ได้
โดยอาศัยความรู้ของคุณเองและข้อมูลผู้ใช้ทั้งหมด

ใช้ NEW AI PLACE เฉพาะกรณีที่:
- ตรวจดู Top 30 แล้วไม่มี candidate ที่ตอบ preference สำคัญของผู้ใช้ได้จริง
- สถานที่ใหม่นั้นเติมช่องว่างที่ Top 30 ไม่มี ไม่ใช่แค่ "ดูน่าสนใจกว่า"
- มีเหตุผลจาก personality_tags, travel_goal, activity, atmosphere หรือ lifestyle ที่ชัดเจน
- การเพิ่มสถานที่ใหม่นั้นทำให้ personalization ดีขึ้นอย่างมีนัยสำคัญ

ห้ามใช้ NEW AI PLACE ในกรณีที่:
- Top 30 มีสถานที่ประเภทหรือประสบการณ์ใกล้เคียงอยู่แล้ว
- เหตุผลมีเพียงเพราะสถานที่นั้นดัง รีวิวดี หรือคุณรู้จักมากกว่า
- ต้องเดินทางไกลขึ้นโดยไม่ได้ตอบ preference สำคัญของผู้ใช้
- ใช้แทนสถานที่อันดับสูงโดยไม่มีเหตุผล personalization ที่ชัดเจน

ข้อกำหนด NEW AI PLACES:
- ต้องอยู่ในจังหวัด ${tripData.province}
- ต้องเป็นสถานที่จริงที่คุณมีความมั่นใจ
- ห้ามสร้างชื่อสมมติ
- ห้ามสร้างพิกัดเอง
- ห้ามสร้าง place_id เอง
- ไม่ต้องส่ง latitude/longitude
- ระบบจะตรวจสอบชื่อและหาพิกัดจริงภายหลัง
- หากไม่มั่นใจว่าสถานที่มีจริง ให้ใช้สถานที่จาก Top 30 แทน
- ไม่จำเป็นต้องใช้เฉพาะสถานที่ใหม่ทั้งทริป
- ให้ใช้เมื่อช่วย personalization ได้ดีกว่า Top 30

สำหรับทุกสถานที่ใหม่ที่ใช้ใน selectedPlaces
ต้องเพิ่มข้อมูลใน proposedNewPlaces ด้วย

==================================================
5. PERSONALIZATION RULES
==================================================

- ranking ของ TDMC เป็น prior หลัก แต่ไม่ต้องเรียงตาม rank แบบตายตัว
- ให้ rerank ภายใน Top 30 ตามความเข้ากันกับผู้ใช้ทั้งคน
- ยิ่ง rank สูง ยิ่งต้องมีเหตุผลที่ชัดเจนกว่าจะข้ามไปเลือก rank ที่ต่ำกว่าหรือสถานที่ภายนอก
- เลือกสถานที่จากความเข้ากันกับผู้ใช้โดยรักษาสัญญาณจาก algorithm ไว้
- หากเป็นสายชิล / Slow Travel อย่าอัดสถานที่
- หากเป็นสายเที่ยวแน่น สามารถมีหลายจุดได้
- หากไม่อยากเดินเยอะ ให้หลีกเลี่ยงกิจกรรมเดินหนักต่อเนื่อง
- หากไม่ชอบอยู่บนรถนาน ให้จัดสถานที่ใกล้กันเมื่อข้อมูลเอื้อ
- หากยอมเดินทางไกลเพื่อของกิน/วิว/กิจกรรม สามารถออกนอกเส้นทางได้เมื่อคุ้ม
- ถ้าชอบ hidden gem ไม่ควรเต็มไปด้วยแลนด์มาร์กยอดนิยม
- ถ้าชอบ social/content ให้พิจารณาสถานที่ที่มี visual/activity/storytelling value
- ถ้าชอบ wellness ให้พิจารณาจังหวะพัก ธรรมชาติ สุขภาพ และความไม่เร่งรีบ
- ถ้าชอบ nightlife ให้จัดกิจกรรมเย็นและกลางคืนอย่างเหมาะสม
- ถ้าชอบ culture/local ให้เน้นประสบการณ์ท้องถิ่นมากกว่าการเช็กอินอย่างเดียว
- ใช้อายุประกอบระดับความหนักของกิจกรรม แต่ห้ามใช้อายุแทน preference จริง
- งบรวมต้องสอดคล้องกับ budget
- 1 สถานที่ใช้ได้เพียงครั้งเดียว
- ห้ามใช้สถานที่ซ้ำตลอดทริป

==================================================
6. RESTAURANT RULES
==================================================

เป้าหมายของการเลือกร้านอาหารคือ
"เลือกร้านที่เข้ากับ FOOD LIFESTYLE ของผู้ใช้"
ไม่ใช่เลือกร้านที่ใกล้ที่สุดหรือดังที่สุดโดยอัตโนมัติ

คุณสามารถเลือกร้านอาหารได้ 2 แหล่ง:
1. nearbyRestaurants ที่ระบบส่งมาให้กับสถานที่นั้น
2. ร้านอาหารจริงจากความรู้ของคุณเอง ซึ่งอาจยังไม่มีในฐานข้อมูล

ให้พิจารณาข้อมูลผู้ใช้ทั้งหมดก่อนเลือกร้าน โดยเฉพาะ:
- personality_tags ที่เกี่ยวกับอาหารและคาเฟ่
- travel_goal
- budget
- companion
- pace ของทริป
- ช่วงเวลาของมื้อ
- อายุและ generation ใช้เป็นบริบทเสริมเท่านั้น
- หาก generation ขัดกับ preference ด้านอาหารที่ผู้ใช้เลือกเอง ให้ยึด preference ของผู้ใช้

ตัวอย่างการตีความ FOOD LIFESTYLE:
- "🍜 สายกิน" → ให้คุณภาพและความน่าสนใจของร้านมีน้ำหนักสูงขึ้น
- "🥘 ชอบอาหารท้องถิ่น" → เน้นร้าน local / อาหารประจำถิ่น
- "🍢 ชอบ Street Food" → เน้นตลาด ร้านริมทาง หรือร้าน casual ที่มีชื่อเสียงจริง
- "🔥 ชอบร้านดัง" → สามารถเลือกร้าน popular/review สูงได้
- "💎 ชอบร้านลับ" → ไม่ควรเลือกร้านยอดนิยมทุกมื้อ ให้มองหาร้าน local/hidden gem ที่มีอยู่จริง
- "🍽️ ชอบ Fine Dining" → สามารถให้ร้านเป็น destination สำคัญของวันได้เมื่อเหมาะกับ budget
- "🥗 สาย Healthy Food" → ให้ความสำคัญกับเมนูสุขภาพและรูปแบบร้านที่สอดคล้อง
- "🍴 ยอมเดินทางไกลเพื่อร้านอร่อย" → ยอมเพิ่มระยะทางได้ ถ้าร้านนั้นเหมาะกับผู้ใช้อย่างชัดเจน
- "🍜 อาหารคือจุดหมายหลักของทริป" → สามารถจัด route และช่วงเวลาโดยให้ร้านอาหารเป็น anchor ของวัน
- "🥪 กินอะไรก็ได้ ขอเที่ยวก่อน" → ให้เลือกร้านที่สะดวก ใกล้เส้นทาง และไม่ทำให้ itinerary เสียเวลา
- คาเฟ่/ของหวาน/กาแฟ → พิจารณาเป็น stopover หรือ destination ตาม personality_tags
- หากมี dietary preference หรือข้อจำกัดอาหารที่ผู้ใช้ระบุไว้ ต้องถือเป็นข้อจำกัดสำคัญ

กฎการเลือกร้าน:
- อย่าเลือก nearbyRestaurants เพียงเพราะใกล้ที่สุด
- ถ้ามีหลายร้าน ให้เลือกร้านที่ match FOOD LIFESTYLE มากที่สุดก่อน แล้วค่อยพิจารณาระยะทาง
- หาก nearbyRestaurants ไม่มีร้านที่เข้ากับผู้ใช้มากพอ คุณสามารถเสนอร้านใหม่จากความรู้ของคุณเองได้
- ร้านใหม่ควรช่วย personalization อย่างชัดเจน ไม่ใช่เพิ่มเพราะอยากเพิ่ม
- หลีกเลี่ยงร้านสไตล์เดิมซ้ำทุกมื้อ เว้นแต่ผู้ใช้แสดง preference ชัดเจน
- ร้านต้องเหมาะกับช่วงเวลา เช่น breakfast/brunch, lunch, cafe, dinner, nightlife
- งบของร้านต้องสมเหตุสมผลกับ budget และ spending behavior ของผู้ใช้
- companion มีผลต่อบรรยากาศร้าน เช่น ครอบครัว คู่รัก เพื่อน หรือเที่ยวคนเดียว
- pace มีผลต่อการเลือกร้าน เช่น Slow Travel อาจเลือกร้านนั่งนาน ส่วนสายเที่ยวแน่นควรลดเวลารอ/อ้อมเส้นทาง
- ถ้าผู้ใช้ไม่ชอบคนเยอะหรือไม่ชอบต่อคิว อย่าเลือกร้านไวรัล/ยอดนิยมเพียงเพราะ rating สูง

สำหรับร้านจาก nearbyRestaurants:
- restaurant_source = "database"
- restaurant_id ต้องตรงกับ nearbyRestaurants
- restaurant_name ต้องตรงกับ restaurant_name_th
- proposed_restaurant_key = null

สำหรับร้านที่คุณเสนอเอง:
- restaurant_source = "ai_external"
- restaurant_id = null
- restaurant_name = ชื่อร้านจริง
- proposed_restaurant_key ต้องตรงกับ key ใน proposedNewRestaurants
- ร้านต้องอยู่ในจังหวัด ${tripData.province}
- ต้องเป็นร้านจริงที่คุณมีความมั่นใจ
- ห้ามสร้างร้านสมมติ
- ห้ามสร้าง restaurant_id เอง
- ระบบจะนำชื่อร้านไปตรวจสอบกับ Google Places
- หากตรวจสอบไม่สำเร็จ ระบบจะปล่อย restaurant_id และ restaurant_name เป็น null

ร้านที่ AI เสนอเองสามารถใช้ได้ทั้ง:
- สถานที่จาก Top 30
- สถานที่ใหม่ที่ AI เสนอและผ่านการ verify แล้ว

==================================================
7. RESPONSE FORMAT
==================================================

ตอบ JSON รูปแบบนี้เท่านั้น

{
  "proposedNewPlaces": [
    {
      "key": "new-place-1",
      "name_th": "ชื่อสถานที่จริง",
      "name_en": "English name if known",
      "detail_th": "คำอธิบายสั้นและเป็นข้อเท็จจริงเท่าที่มั่นใจ",
      "category": ["หมวดหมู่"],
      "type": "ประเภทสถานที่",
      "highlight": "จุดเด่น",
      "activity": "กิจกรรมหลัก",
      "suitable_duration": "เวลาที่เหมาะสมโดยประมาณ",
      "travel_type": ["ธรรมชาติ"],
      "activities": ["ถ่ายรูป"],
      "atmosphere": ["เงียบสงบ"],
      "budget": ["ปานกลาง"],
      "travel_companion": ["เพื่อน"],
      "personalization_reason": "เหตุผลสั้น ๆ ว่าทำไมเข้ากับผู้ใช้"
    }
  ],
  "proposedNewRestaurants": [
    {
      "key": "new-restaurant-1",
      "name_th": "ชื่อร้านอาหารจริง",
      "name_en": "English name if known",
      "personalization_reason": "เหตุผลสั้น ๆ ว่าทำไมร้านนี้เข้ากับผู้ใช้"
    }
  ],
  "selectedPlaces": [
    {
      "day": 1,
      "title": "ชื่อธีมของวัน",
      "period": "Morning",
      "source": "database",
      "place_id": "id จาก Top 30",
      "place_name": "ชื่อสถานที่",
      "proposed_place_key": null,
      "fallback_place_id": null,
      "restaurant_source": "database",
      "restaurant_id": "...",
      "restaurant_name": "...",
      "proposed_restaurant_key": null
    },
    {
      "day": 1,
      "title": "ชื่อธีมของวัน",
      "period": "Afternoon",
      "source": "ai_external",
      "place_id": null,
      "place_name": "ชื่อสถานที่ใหม่",
      "proposed_place_key": "new-place-1",
      "fallback_place_id": "id ของสถานที่ใน Top 30 ที่ใช้แทนได้หากตรวจสอบสถานที่ใหม่ไม่สำเร็จ",
      "restaurant_source": "ai_external",
      "restaurant_id": null,
      "restaurant_name": "ชื่อร้านอาหารใหม่",
      "proposed_restaurant_key": "new-restaurant-1"
    }
  ]
}

==================================================
8. SELECTED PLACES RULES
==================================================

source = "database":
- place_id ต้องมาจาก TDMC TOP 30 เท่านั้น
- place_name ต้องตรงกับชื่อที่ระบบส่งมา
- proposed_place_key = null

source = "ai_external":
- place_id = null
- proposed_place_key ต้องตรงกับ key ใน proposedNewPlaces
- fallback_place_id ต้องเป็น attraction.id จริงจาก TDMC TOP 30

restaurant_source = "database":
- restaurant_id ต้องมาจาก nearbyRestaurants ของสถานที่นั้น
- proposed_restaurant_key = null

restaurant_source = "ai_external":
- restaurant_id = null
- proposed_restaurant_key ต้องตรงกับ key ใน proposedNewRestaurants
- restaurant_name ต้องเป็นชื่อร้านจริงที่ต้องการให้ระบบตรวจสอบ

fallback_place_id สำคัญมาก:
ระบบจะใช้เมื่อไม่สามารถยืนยันสถานที่ใหม่ได้
ดังนั้นต้องเลือกสถานที่สำรองจาก Top 30 ที่มีลักษณะใกล้เคียงกับจุดประสงค์ของสถานที่ใหม่

ห้ามมีข้อความใด ๆ นอก JSON
`
console.log(prompt);
    console.log("==================================================");
console.log(
    `🤖 ส่งข้อมูลให้ ${selectedModel.toUpperCase()}`
);
console.log("==================================================");

console.log("📦 ข้อมูลผู้ใช้");
console.log(trip);

console.log(
    "📍 Database candidates sent to AI =",
    ranked.length,
    "(TDMC Top 30)"
);

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
    prompt,
    {
        responseMode: "planner_json"
    }
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

    if (
        !result ||
        !Array.isArray(result.selectedPlaces) ||
        !Array.isArray(result.proposedNewPlaces) ||
        !Array.isArray(result.proposedNewRestaurants)
    ) {
        throw new Error(
            "Planner JSON does not match expected structure"
        );
    }

} catch (e) {

    console.error(
        `${selectedModel.toUpperCase()} JSON Parse Error`
    );

    console.log(raw);

    throw new Error(
        `${selectedModel.toUpperCase()} returned invalid JSON`
    );
}

const proposedNewPlaces =
    Array.isArray(
        result.proposedNewPlaces
    )
        ? result.proposedNewPlaces
        : [];

const proposedNewRestaurants =
    Array.isArray(
        result.proposedNewRestaurants
    )
        ? result.proposedNewRestaurants
        : [];

const resolvedAIPlaces =
    await resolveAIProposedPlaces(
        proposedNewPlaces,
        tripData.province,
        selectedModel
    );

const candidateNameById =
    new Map<string, string>();

for (const item of plannerRanked) {
    candidateNameById.set(
        String(
            item.attraction.id
        ),
        String(
            item.attraction.name_th ??
            ""
        )
    );
}

const resolvedSelectedPlaces =
    (
        Array.isArray(
            result.selectedPlaces
        )
            ? result.selectedPlaces
            : []
    )
        .map(
            (item: any) => {
                if (
                    item?.source !==
                    "ai_external"
                ) {
                    return item;
                }

                const key =
                    String(
                        item
                            ?.proposed_place_key ??
                        ""
                    );

                const resolved =
                    resolvedAIPlaces.get(
                        key
                    );

                if (
                    resolved?.att_id
                ) {
                    return {
                        ...item,

                        source:
                            "ai_verified",

                        place_id:
                            String(
                                resolved.att_id
                            ),

                        place_name:
                            resolved.name_th ??
                            item.place_name,

                        proposed_place_key:
                            key,

                        restaurant_id:
                            null,

                        restaurant_name:
                            null
                    };
                }

                const fallbackId =
                    String(
                        item
                            ?.fallback_place_id ??
                        ""
                    );

                const fallbackName =
                    candidateNameById.get(
                        fallbackId
                    );

                if (
                    fallbackId &&
                    fallbackName
                ) {
                    console.warn(
                        "↩️ USE DATABASE FALLBACK:",
                        {
                            external:
                                item.place_name,
                            fallbackId,
                            fallbackName
                        }
                    );

                    return {
                        ...item,

                        source:
                            "database_fallback",

                        place_id:
                            fallbackId,

                        place_name:
                            fallbackName,

                        proposed_place_key:
                            null,

                        restaurant_id:
                            null,

                        restaurant_name:
                            null
                    };
                }

                console.warn(
                    "🗑️ DROP UNRESOLVED AI PLACE:",
                    item
                );

                return null;
            }
        )
        .filter(Boolean);

const enforceAlgorithmFirstPlaces = (
    items: any[]
) => {
    const total =
        items.length;

    if (total === 0) {
        return items;
    }

    // อย่างน้อย ~80% ของ itinerary ต้องมาจาก TDMC Top 30
    // สำหรับทริปสั้นกว่า 5 จุด ไม่อนุญาต external place
    // เพื่อไม่ให้ AI กลบสัญญาณของ algorithm
    const maxAIPlaces =
        total >= 5
            ? Math.floor(total * 0.2)
            : 0;

    let keptAIPlaces = 0;

    return items
        .map((item: any) => {
            if (
                item?.source !==
                "ai_verified"
            ) {
                return item;
            }

            if (
                keptAIPlaces <
                maxAIPlaces
            ) {
                keptAIPlaces += 1;
                return item;
            }

            const fallbackId =
                String(
                    item?.fallback_place_id ??
                    ""
                );

            const fallbackName =
                candidateNameById.get(
                    fallbackId
                );

            if (
                fallbackId &&
                fallbackName
            ) {
                console.warn(
                    "🧮 ALGORITHM-FIRST GUARD → USE TDMC FALLBACK:",
                    {
                        aiPlace:
                            item.place_name,
                        fallbackId,
                        fallbackName
                    }
                );

                return {
                    ...item,

                    source:
                        "database_fallback",

                    place_id:
                        fallbackId,

                    place_name:
                        fallbackName,

                    proposed_place_key:
                        null,

                    restaurant_source:
                        null,

                    restaurant_id:
                        null,

                    restaurant_name:
                        null,

                    proposed_restaurant_key:
                        null
                };
            }

            console.warn(
                "🧮 ALGORITHM-FIRST GUARD → DROP EXTRA AI PLACE:",
                item.place_name
            );

            return null;
        })
        .filter(Boolean);
};

const algorithmFirstSelectedPlaces =
    enforceAlgorithmFirstPlaces(
        resolvedSelectedPlaces
    );

const resolvedAIRestaurants =
    await resolveAIProposedRestaurants(
        proposedNewRestaurants,
        algorithmFirstSelectedPlaces,
        tripData.province
    );

const selectedPlaces =
    algorithmFirstSelectedPlaces.map(
        (item: any) => {
            if (
                item?.restaurant_source !==
                "ai_external"
            ) {
                return item;
            }

            const key =
                String(
                    item
                        ?.proposed_restaurant_key ??
                    ""
                );

            const resolvedRestaurant =
                resolvedAIRestaurants.get(
                    key
                );

            if (
                resolvedRestaurant?.place_id
            ) {
                return {
                    ...item,

                    restaurant_source:
                        "ai_verified",

                    restaurant_id:
                        String(
                            resolvedRestaurant
                                .place_id
                        ),

                    restaurant_name:
                        resolvedRestaurant
                            .place_name_th ??
                        item.restaurant_name,

                    proposed_restaurant_key:
                        key
                };
            }

            return {
                ...item,

                restaurant_source:
                    "ai_unresolved",

                restaurant_id:
                    null,

                restaurant_name:
                    null,

                proposed_restaurant_key:
                    key
            };
        }
    );

console.log(
    "✅ FINAL SELECTED PLACES:",
    selectedPlaces
);

console.log(
    "🆕 VERIFIED NEW PLACES:",
    [...resolvedAIPlaces.values()].map(
        (place: any) => ({
            att_id:
                place.att_id,
            name:
                place.name_th,
            images:
                place.images?.length ??
                0
        })
    )
);

console.log(
    "🍜 VERIFIED AI RESTAURANTS:",
    [...resolvedAIRestaurants.values()].map(
        (restaurant: any) => ({
            place_id:
                restaurant.place_id,
            name:
                restaurant.place_name_th,
            images:
                restaurant.images?.length ??
                0
        })
    )
);

const selectedAttractionIds =
    [
        ...new Set(
            selectedPlaces
                .map((item: any) =>
                    item?.place_id
                        ? String(item.place_id)
                        : null
                )
                .filter(Boolean)
        )
    ];

const selectedRestaurantIds =
    [
        ...new Set(
            selectedPlaces
                .map((item: any) =>
                    item?.restaurant_id
                        ? String(item.restaurant_id)
                        : null
                )
                .filter(Boolean)
        )
    ];

const [
    selectedAttractionResult,
    selectedRestaurantResult
] = await Promise.all([
    selectedAttractionIds.length > 0
        ? supabase
            .from("attraction")
            .select(`
                att_id,
                name_th,
                name_en,
                detail_th,
                category,
                type,
                highlight,
                activity,
                suitable_duration,
                district,
                subdistrict,
                latitude,
                longitude
            `)
            .in(
                "att_id",
                selectedAttractionIds
            )
        : Promise.resolve({
            data: [],
            error: null
        }),

    selectedRestaurantIds.length > 0
        ? supabase
            .from("restaurant")
            .select(`
                place_id,
                google_place_id,
                place_name_th,
                place_name_en,
                place_address,
                place_type,
                rating,
                user_ratings_total
            `)
            .in(
                "place_id",
                selectedRestaurantIds
            )
        : Promise.resolve({
            data: [],
            error: null
        })
]);

if (selectedAttractionResult.error) {
    console.warn(
        "⚠️ Load selected attraction details failed:",
        selectedAttractionResult.error
    );
}

if (selectedRestaurantResult.error) {
    console.warn(
        "⚠️ Load selected restaurant details failed:",
        selectedRestaurantResult.error
    );
}

const selectedAttractionDetails =
    selectedAttractionResult.data ?? [];

const selectedRestaurantDetails =
    selectedRestaurantResult.data ?? [];

const markdownPrompt = `
คุณคือ TravelWish AI Travel Planner

สร้างข้อความแผนการเดินทางสำหรับผู้ใช้จากข้อมูลที่ผ่านการตรวจสอบแล้วด้านล่าง

วันนี้คือ ${new Date().toISOString().slice(0, 10)}
จังหวัดของทริปคือ ${tripData.province}

USER CONTEXT
${JSON.stringify(userContext, null, 2)}

CURRENT TRIP
${JSON.stringify(tripData, null, 2)}

VERIFIED ITINERARY ITEMS
${JSON.stringify(selectedPlaces, null, 2)}

VERIFIED ATTRACTION DETAILS
${JSON.stringify(selectedAttractionDetails, null, 2)}

VERIFIED RESTAURANT DETAILS
${JSON.stringify(selectedRestaurantDetails, null, 2)}

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

หากแผนมีหลายวันหรือหลายช่วงเวลา
และการจัดเป็นตารางช่วยให้ผู้ใช้เปรียบเทียบ วัน / เวลา / สถานที่ / ร้านอาหาร / กิจกรรม ได้ง่ายขึ้น
ให้พิจารณาใช้ Markdown Table เป็นหนึ่งในตัวเลือกที่เหมาะสม
แต่ไม่บังคับว่าต้องใช้ตารางเสมอ
หากรูปแบบ Timeline, Bullet list หรือรูปแบบอื่นอ่านง่ายกว่า
สามารถเลือกใช้รูปแบบนั้นได้ตามดุลยพินิจของโมเดล

อย่างไรก็ตาม ต้องมีข้อมูลที่จำเป็นสำหรับการวางแผนเที่ยว
เช่น วัน เวลา สถานที่ ร้านอาหาร กิจกรรม และรายละเอียดที่เกี่ยวข้อง

====================
กิจกรรมและระยะเวลา
====================

สำหรับแต่ละสถานที่ ให้เจาะลึกว่าควรทำอะไรระหว่างอยู่ที่นั่น
ไม่ใช่แค่บอกว่า "เที่ยวชม" หรือ "ถ่ายรูป"

ควรอธิบายเมื่อข้อมูลรองรับ เช่น:
- กิจกรรมหลักที่ควรทำ
- จุดหรือประสบการณ์ที่ไม่ควรพลาด
- ลำดับกิจกรรมภายในสถานที่
- เวลาที่แนะนำสำหรับแต่ละกิจกรรม
- เวลารวมที่ควรใช้ในสถานที่นั้น
- ช่วงเวลาที่เหมาะสมของวัน
- จังหวะพัก / กิน / เดินทางต่อ
- คำแนะนำตาม personality และ food lifestyle ของผู้ใช้

ให้ใช้ suitable_duration, activity, highlight และ detail_th
เป็นข้อมูลตั้งต้นในการประเมินเวลา
หากไม่มีข้อมูลเวลาที่แน่นอน ให้ระบุว่าเป็น "เวลาแนะนำโดยประมาณ"
และใช้ช่วงเวลาแบบสมเหตุสมผล เช่น 30–45 นาที, 1–2 ชั่วโมง
ห้ามแต่งเวลาเปิด-ปิด ราคาบัตร หรือข้อเท็จจริงเฉพาะที่ไม่มีข้อมูลรองรับ

====================
CURRENT TREND & WHAT'S POPULAR NOW
====================

ให้ใช้ Web Search เมื่อจำเป็นเพื่อค้นข้อมูลปัจจุบันเกี่ยวกับจังหวัดและ
VERIFIED ITINERARY ITEMS ว่าในช่วงนี้มีอะไรที่กำลังได้รับความนิยม เช่น:
- กิจกรรมหรือประสบการณ์ที่กำลังเป็นเทรนด์
- มุมถ่ายรูป / content style / คาเฟ่หรือ food experience ที่คนกำลังสนใจ
- กิจกรรมตามฤดูกาล
- เทรนด์ local experience, wellness, nightlife, craft, workshop หรือ community
- สิ่งที่เข้ากับ personality_tags ของผู้ใช้

กฎของ Trend:
- Trend เป็นข้อมูลเสริมของ itinerary ไม่ใช่เหตุผลให้ทิ้ง TDMC
- แนะนำเฉพาะเทรนด์ที่เกี่ยวข้องกับสถานที่ใน VERIFIED ITINERARY ITEMS หรือทำได้ภายในบริเวณนั้น
- ห้ามเพิ่ม attraction หรือ restaurant ใหม่ที่ไม่มีใน VERIFIED ITINERARY ITEMS
- ถ้าหาหลักฐานปัจจุบันไม่ได้ อย่าอ้างว่าสิ่งนั้น "กำลังฮิต"
- แยกให้ชัดระหว่างข้อมูลจากฐานข้อมูลกับคำแนะนำกิจกรรมเชิงสร้างสรรค์
- ไม่จำเป็นต้องยัดเทรนด์ทุกจุด ให้ใช้เฉพาะจุดที่ช่วยให้ทริปน่าสนใจขึ้นจริง

ห้ามสร้างข้อมูลสถานที่หรือร้านอาหารที่ไม่มีอยู่ใน VERIFIED ITINERARY ITEMS

เนื้อหาต้องสอดคล้องกับ day, period, place_name และ restaurant_name
ถ้า restaurant_name เป็น null ห้ามแต่งร้านอาหารขึ้นมา
ให้สะท้อน personality, food lifestyle, pace, budget, companion และ travel goal ของผู้ใช้
ไม่ต้องอธิบาย TDMC, ranking, database, verification หรือ source

ห้ามมีข้อความใด ๆ นอก Markdown
`

console.log(
    `📝 ${selectedModel.toUpperCase()} กำลังสร้าง Markdown...`
);

const aiMessage =
    await generateWithSelectedModel(
        selectedModel,
        markdownPrompt,
        {
            responseMode: "markdown"
        }
    );

console.log(
    "✅ MARKDOWN READY:",
    aiMessage.length,
    "chars"
);


if (!isGuest) {
    console.log("💾 กำลังบันทึก planner ลง database...");

    const {
        data,
        error
    } = await supabase
        .from("chat_messages")
        .insert({
            session_id: chatId,
            user_id: userId,
            role: "ai",
            content: aiMessage,
            planner_json: selectedPlaces
        })
        .select();

    if (error) {
        console.error(
            "❌ บันทึก planner ไม่สำเร็จ",
            error
        );
    } else {
        console.log(
            "✅ บันทึก planner ลง database แล้ว",
            data
        );
    }
} else {
    console.log(
        "👤 Guest planner: skip chat_messages persistence"
    );
}


console.log("🎉 สร้างแผนเที่ยวเสร็จ");
console.log("==================================================");


return {
    markdown: aiMessage,
    planner_json: selectedPlaces
};
}

