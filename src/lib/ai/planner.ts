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

function attractionId(place: any) {
    return String(
        place?.att_id ??
        place?.id ??
        ""
    );
}

function restaurantId(restaurant: any) {
    return String(
        restaurant?.place_id ??
        restaurant?.id ??
        ""
    );
}

function localDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) {
    const toRad =
        (value: number) =>
            value * Math.PI / 180;

    const earthRadiusKm =
        6371;

    const dLat =
        toRad(lat2 - lat1);

    const dLon =
        toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return earthRadiusKm *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );
}

function getLocalNearbyRestaurants(
    attraction: any,
    restaurants: any[],
    limit = 3
) {
    const lat =
        Number(
            attraction?.latitude ??
            attraction?.lat
        );

    const lon =
        Number(
            attraction?.longitude ??
            attraction?.lng
        );

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {
        return [];
    }

    return restaurants
        .map((restaurant: any) => {
            const restaurantLat =
                Number(restaurant?.latitude);

            const restaurantLon =
                Number(restaurant?.longitude);

            if (
                !Number.isFinite(restaurantLat) ||
                !Number.isFinite(restaurantLon)
            ) {
                return null;
            }

            const distance =
                localDistanceKm(
                    lat,
                    lon,
                    restaurantLat,
                    restaurantLon
                );

            return {
                id:
                    restaurantId(restaurant),

                restaurant_name_th:
                    restaurant?.place_name_th ??
                    restaurant?.restaurant_name_th ??
                    restaurant?.name_th ??
                    restaurant?.name ??
                    "",

                rating:
                    restaurant?.rating ?? null,

                distance:
                    Number(
                        distance.toFixed(2)
                    )
            };
        })
        .filter(
            (
                restaurant
            ): restaurant is {
                id: string;
                restaurant_name_th: string;
                rating: any;
                distance: number;
            } =>
                Boolean(restaurant) &&
                restaurant.distance <= 10
        )
        .sort(
            (a, b) =>
                a.distance - b.distance
        )
        .slice(0, limit);
}

function buildPreferenceKeywords(
    userContext: any
) {
    const sourceValues = [
        ...(userContext?.preferences?.travel_type ?? []),
        ...(userContext?.preferences?.activities ?? []),
        userContext?.preferences?.atmosphere,
        userContext?.preferences?.travel_goal,
        ...(userContext?.preferences?.personality_tags ?? []),
    ]
        .filter(Boolean)
        .map((value: any) =>
            String(value).toLowerCase()
        );

    const keywordBank = [
        "ธรรมชาติ",
        "ถ่ายรูป",
        "คาเฟ่",
        "กาแฟ",
        "อาหาร",
        "street food",
        "สุขภาพ",
        "spa",
        "yoga",
        "วัฒนธรรม",
        "วัด",
        "มู",
        "ประวัติศาสตร์",
        "พิพิธภัณฑ์",
        "ชุมชน",
        "ทะเล",
        "ภูเขา",
        "น้ำตก",
        "เดินป่า",
        "hiking",
        "ดำน้ำ",
        "atv",
        "camping",
        "ตลาด",
        "night market",
        "ช้อป",
        "วิว",
        "unseen",
        "hidden gem",
        "nightlife",
        "bar",
        "local",
        "ผจญภัย",
        "พักผ่อน"
    ];

    const keywords =
        new Set<string>();

    for (const source of sourceValues) {
        keywords.add(source);

        for (const keyword of keywordBank) {
            if (source.includes(keyword)) {
                keywords.add(keyword);
            }
        }
    }

    return [...keywords];
}

function buildExplorationPool(
    attractions: any[],
    restaurants: any[],
    rankedIds: Set<string>,
    userContext: any,
    limit = 80
) {
    const keywords =
        buildPreferenceKeywords(
            userContext
        );

    const preferredTravelTypes =
        new Set(
            (
                userContext?.preferences
                    ?.travel_type ?? []
            ).map(
                (value: any) =>
                    String(value)
                        .toLowerCase()
            )
        );

    const preferredActivities =
        new Set(
            (
                userContext?.preferences
                    ?.activities ?? []
            ).map(
                (value: any) =>
                    String(value)
                        .toLowerCase()
            )
        );

    const scored =
        attractions
            .filter(
                (place: any) =>
                    !rankedIds.has(
                        attractionId(place)
                    )
            )
            .map((place: any) => {
                const placeTravelTypes =
                    Array.isArray(
                        place?.travel_type
                    )
                        ? place.travel_type
                        : [];

                const placeActivities =
                    Array.isArray(
                        place?.activities
                    )
                        ? place.activities
                        : [];

                const text =
                    [
                        place?.name_th,
                        place?.name_en,
                        place?.detail_th,
                        place?.category,
                        place?.type,
                        place?.highlight,
                        place?.activity,
                        placeTravelTypes,
                        placeActivities,
                        place?.atmosphere,
                        place?.district,
                        place?.subdistrict,
                    ]
                        .flat()
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                let personalizationScore =
                    0;

                for (
                    const travelType
                    of placeTravelTypes
                ) {
                    if (
                        preferredTravelTypes.has(
                            String(travelType)
                                .toLowerCase()
                        )
                    ) {
                        personalizationScore +=
                            5;
                    }
                }

                for (
                    const activity
                    of placeActivities
                ) {
                    if (
                        preferredActivities.has(
                            String(activity)
                                .toLowerCase()
                        )
                    ) {
                        personalizationScore +=
                            4;
                    }
                }

                for (
                    const keyword
                    of keywords
                ) {
                    if (
                        keyword.length >= 2 &&
                        text.includes(keyword)
                    ) {
                        personalizationScore +=
                            1.5;
                    }
                }

                const rating =
                    Number(
                        place?.rating ??
                        place?.averageRating ??
                        0
                    );

                if (
                    Number.isFinite(rating)
                ) {
                    personalizationScore +=
                        Math.max(
                            0,
                            Math.min(
                                rating,
                                5
                            )
                        ) * 0.15;
                }

                return {
                    place,
                    personalizationScore
                };
            })
            .sort(
                (a, b) =>
                    b.personalizationScore -
                    a.personalizationScore
            )
            .slice(0, limit);

    return scored.map(
        (
            {
                place,
                personalizationScore
            },
            index
        ) => ({
            explorationRank:
                index + 1,

            personalizationScore:
                Number(
                    personalizationScore
                        .toFixed(2)
                ),

            attraction: {
                id:
                    attractionId(place),

                name_th:
                    place?.name_th,

                name_en:
                    place?.name_en,

                category:
                    place?.category ?? [],

                type:
                    place?.type ?? null,

                district:
                    place?.district ?? null,

                highlight:
                    place?.highlight ?? null,

                suitable_duration:
                    place?.suitable_duration ??
                    null,

                travel_type:
                    place?.travel_type ?? [],

                activities:
                    place?.activities ?? [],

                atmosphere:
                    place?.atmosphere ?? [],

                budget:
                    place?.budget ?? [],

                travel_companion:
                    place?.travel_companion ??
                    []
            },

            nearbyRestaurants:
                getLocalNearbyRestaurants(
                    place,
                    restaurants,
                    3
                )
        })
    );
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

const rankedIds =
    new Set(
        ranked.map(
            (item: any) =>
                String(
                    item?.attraction?.id ??
                    ""
                )
        )
    );

const explorationPool =
    buildExplorationPool(
        attractions,
        restaurants,
        rankedIds,
        userContext,
        80
    );

console.log(
    "🧭 Exploration Pool:",
    explorationPool.length
);


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

หน้าที่ของคุณคือสร้างแผนการเดินทางที่เป็น Personalized Itinerary
โดยใช้ข้อมูลผู้ใช้ทั้งหมดที่ระบบส่งให้ เพื่อเลือกสถานที่ ร้านอาหาร
จังหวะการเที่ยว และบรรยากาศที่เหมาะกับบุคคลนั้นมากที่สุด

ห้ามตอบเป็นบทความ
ห้ามเขียนเกริ่นนำ
ห้ามมีข้อความใด ๆ นอก JSON

==================================================
1. USER PROFILE + PERSONALIZATION CONTEXT
==================================================

${JSON.stringify(userContext, null, 2)}

หลักในการใช้ข้อมูลผู้ใช้:
- ใช้ preference ที่ผู้ใช้เลือกเองเป็นสัญญาณสำคัญที่สุด
- ใช้ personality_tags เพื่อปรับสไตล์แผนอย่างละเอียด
- ใช้อายุเพื่อพิจารณาความเหมาะสมของความเข้มข้น จังหวะ และกิจกรรม
- generation เป็นเพียง contextual signal เสริมเท่านั้น
- ห้ามเหมารวมว่าคนใน generation เดียวกันชอบเหมือนกัน
- หาก generation ขัดกับ preference ที่ผู้ใช้เลือกเอง ให้ยึด preference ของผู้ใช้
- ห้ามเดาความชอบจากเพศ
- gender ใช้ได้เฉพาะเมื่อเกี่ยวข้องกับความสะดวก ความปลอดภัย
  หรือ preference ที่ผู้ใช้ระบุไว้อย่างชัดเจน

==================================================
2. CURRENT TRIP
==================================================

${JSON.stringify(tripData, null, 2)}

==================================================
3. TDMC TOP 30
==================================================

นี่คือสถานที่ Top 30 จาก Recommendation Algorithm
ให้ถือเป็น strong candidates แต่ไม่จำเป็นต้องเลือกจาก Top 30 เท่านั้น

${JSON.stringify(plannerRanked)}

==================================================
4. PERSONALIZED EXPLORATION POOL
==================================================

นี่คือสถานที่เพิ่มเติมนอก Top 30
ระบบคัดมาจากฐานข้อมูลของจังหวัดเดียวกัน
โดยอิงข้อมูลผู้ใช้และ metadata ของสถานที่

AI สามารถเลือกสถานที่จากส่วนนี้แทน Top 30 ได้
หากเห็นว่าเหมาะกับผู้ใช้มากกว่า

${JSON.stringify(explorationPool)}

==================================================
5. หลักการเลือกสถานที่
==================================================

- สามารถเลือกได้ทั้งจาก TDMC TOP 30 และ PERSONALIZED EXPLORATION POOL
- ไม่จำเป็นต้องเลือกตาม rank อย่างเคร่งครัด
- ให้พิจารณาความเหมาะสมกับผู้ใช้ทั้งคนก่อนคะแนน ranking
- อธิบายการเลือกผ่านคุณภาพของแผน ไม่ต้องเขียนเหตุผลยาว
- ให้กระจายสถานที่ตามจำนวนวันอย่างสมเหตุสมผล
- 1 สถานที่ใช้ได้เพียงครั้งเดียวตลอดทริป
- ห้ามใช้สถานที่เดิมซ้ำ
- พยายามลดการเดินทางย้อนเส้นทาง
- พิจารณา suitable_duration หากมี
- คาเฟ่เหมาะกับช่วงบ่ายเมื่อเข้ากับ preference
- จุดชมวิวพระอาทิตย์ตกเหมาะกับช่วงเย็นเมื่อเข้ากับสถานที่
- nightlife ให้ใช้เฉพาะเมื่อสอดคล้องกับผู้ใช้
- หากผู้ใช้เป็นสายชิล / Slow Travel อย่าอัดสถานที่มากเกินไป
- หากผู้ใช้เป็นสายเที่ยวแน่น / ชอบแวะหลายจุด สามารถเพิ่มจำนวนจุดได้
- หากผู้ใช้ไม่อยากเดินเยอะ ให้หลีกเลี่ยงการจัดกิจกรรมเดินหนักติดกัน
- หากผู้ใช้ไม่ชอบอยู่บนรถนาน ให้ให้น้ำหนักกับสถานที่ใกล้กัน
- หากผู้ใช้ยอมเดินทางไกลเพื่อสิ่งที่ชอบ สามารถเลือก candidate ที่ไกลกว่าได้
- ใช้ travel_goal เพื่อกำหนดภาพรวมของทริป
- ใช้ travel_time/ฤดูกาลเป็นบริบทประกอบ
- งบรวมควรสอดคล้องกับ budget ของทริป

==================================================
6. ข้อจำกัดด้านข้อมูลและ ID
==================================================

สำคัญมาก:
- ห้ามสร้างสถานที่จากความรู้ภายนอก
- ห้ามสร้างชื่อสถานที่ใหม่
- ห้ามเดา place_id
- place_id ต้องมีอยู่ใน TDMC TOP 30 หรือ PERSONALIZED EXPLORATION POOL เท่านั้น
- ร้านอาหารต้องเลือกจาก nearbyRestaurants ของ attraction ที่เลือกเท่านั้น
- restaurant_id ต้องตรงกับ id ที่ส่งมา
- restaurant_name ต้องตรงกับ restaurant_name_th ที่ส่งมา
- หากไม่มีร้านที่เหมาะสม ให้ restaurant_id และ restaurant_name เป็น null
- ห้ามใช้ restaurant เป็น attraction
- ห้ามสร้างร้านอาหารใหม่
- ห้ามสร้าง ID ใหม่

เหตุผลที่อนุญาตให้ออกนอก Top 30:
Top 30 เป็นผลจาก Recommendation Algorithm
แต่ Exploration Pool เปิดโอกาสให้ AI ใช้ข้อมูลผู้ใช้เชิงลึก
เช่น อายุ generation travel goal personality tags pace
food style social style wellness และ comfort
เพื่อเลือกสถานที่ที่อาจมี rank ต่ำกว่าแต่เหมาะกับบุคคลนั้นมากกว่า

==================================================
7. USER PREFERENCE SUMMARY
==================================================

รูปแบบการเที่ยว:
${tripData.travelType.join(", ")}

กิจกรรม:
${tripData.activities.join(", ")}

บรรยากาศ:
${tripData.atmosphere.join(", ")}

เป้าหมายการเดินทาง:
${tripData.travelGoal ?? "ไม่ได้ระบุ"}

ช่วงเวลาที่ชอบเดินทาง:
${tripData.travelTime ?? "ไม่ได้ระบุ"}

บุคลิกและพฤติกรรม:
${tripData.personalityTags.length
    ? tripData.personalityTags.join(", ")
    : "ไม่มีข้อมูลเพิ่มเติม"}

อายุ:
${profile?.age ?? "ไม่ได้ระบุ"}

Generation โดยประมาณ:
${generation ?? "ไม่ทราบ"}

==================================================
8. RESPONSE FORMAT
==================================================

ตอบกลับเป็น JSON เท่านั้น

{
  "selectedPlaces": [
    {
      "day": 1,
      "title": "ชื่อธีมของวัน",
      "period": "Morning",
      "place_id": "...",
      "place_name": "...",
      "restaurant_id": "...",
      "restaurant_name": "..."
    }
  ],
  "markdown": "แผนเที่ยวทั้งหมดในรูปแบบ Markdown"
}

ข้อกำหนด selectedPlaces:
- period ใช้ Morning / Lunch / Afternoon / Evening / Dinner ตามความเหมาะสม
- place_id ต้องตรงกับ attraction.id ที่ระบบส่งมา
- place_name ต้องตรงกับ attraction.name_th
- restaurant_id และ restaurant_name ต้องตรงกับ nearbyRestaurants
- หากไม่มีร้านอาหารให้ใช้ null
- ห้ามสถานที่ซ้ำ
- ห้ามร้านอาหารซ้ำ

ข้อกำหนด Markdown:
- อ่านง่าย
- แบ่งเป็นรายวัน
- มีช่วงเวลา
- แสดงสถานที่และร้านอาหารที่เกี่ยวข้อง
- ระบุเวลาเดินทางโดยประมาณเมื่อเหมาะสม
- สะท้อน personality ของผู้ใช้ให้เห็นจากรูปแบบแผน
- ไม่ต้องอธิบาย algorithm
- ไม่ต้องบอกว่าเลือกจาก Top 30 หรือ Exploration Pool

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
    "📍 Candidates sent to AI =",
    ranked.length + explorationPool.length,
    "(Top 30 + Exploration Pool)"
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

