
import type { TripPlanInput } from "./types";

import {
    rankPlacesTDMC,
    normalizeWeights,
    type TDMCPlace,
    type TDMCWeights,
    type TDMCResult,
    type TDMCScoredPlace,
} from "../algorithm/tdmcAlgorithm";


const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";
/* =========================================================
   DISTANCE
   ========================================================= */

function distanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {

    if (
        !Number.isFinite(lat1) ||
        !Number.isFinite(lon1) ||
        !Number.isFinite(lat2) ||
        !Number.isFinite(lon2)
    ) {
        return 999;
    }

    const R = 6371;

    const dLat =
        (lat2 - lat1) *
        Math.PI / 180;

    const dLon =
        (lon2 - lon1) *
        Math.PI / 180;

    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return (
        R *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )
    );
}


/* =========================================================
   NEARBY RESTAURANTS
   ========================================================= */

function findNearbyRestaurants(
    place: TDMCPlace,
    restaurants: any[],
    limit = 3
) {

    const placeLat =
        Number(
            place.latitude ??
            place.lat
        );

    const placeLng =
        Number(
            place.longitude ??
            place.lng
        );

    if (
        !Number.isFinite(placeLat) ||
        !Number.isFinite(placeLng)
    ) {
        return [];
    }

    return restaurants

        .map(rest => {

            const restLat =
                Number(rest.latitude);

            const restLng =
                Number(rest.longitude);

            const distance =
                distanceKm(
                    placeLat,
                    placeLng,
                    restLat,
                    restLng
                );

            return {
                ...rest,
                distance
            };

        })

        .filter(
            rest =>
                Number.isFinite(rest.distance) &&
                rest.distance < 10
        )

        .sort(
            (a, b) =>
                a.distance -
                b.distance
        )

        .slice(0, limit);
}

/* =========================================================
   LOAD NEARBY RESTAURANTS FROM GOOGLE PLACES
   ========================================================= */

async function loadNearbyRestaurantsFromGoogle(
    place: TDMCPlace,
    province?: string
) {
    const attId =
        place.att_id ??
        place.id;

    const latitude =
        Number(
            place.latitude ??
            place.lat
        );

    const longitude =
        Number(
            place.longitude ??
            place.lng
        );

    if (
        !attId ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        console.warn(
            "⚠️ ข้อมูลสถานที่ไม่ครบ:",
            place
        );

        return [];
    }

    try {

        const params =
            new URLSearchParams({
                att_id: String(attId),
                lat: String(latitude),
                lng: String(longitude),
                province: province ?? ""
            });

        const response =
    await fetch(
        `${API_URL}/api/nearby-restaurants?${params.toString()}`
    );

        if (!response.ok) {

            console.error(
                "❌ Nearby restaurant API error:",
                response.status
            );

            return [];
        }

        const data =
            await response.json();

        console.log(
            `🍽️ ${place.name_th}:`,
            data.count,
            "ร้าน"
        );

        return data.restaurants ?? [];

    } catch (error) {

        console.error(
            "❌ โหลดร้านอาหารไม่สำเร็จ:",
            error
        );

        return [];
    }
}
/* =========================================================
   LOAD ATTRACTION IMAGES FROM GOOGLE PLACES
   ========================================================= */
async function loadAttractionImages(
    place: TDMCPlace
) {
    // =====================================================
    // 1. ถ้ามีรูปจาก Supabase อยู่แล้วแม้แต่ 1 รูป
    // → ใช้ Cache ทันที
    // → ห้ามเรียก Google ซ้ำ
    // =====================================================

    const existingImages =
        Array.isArray((place as any).images)
            ? (place as any).images.filter(Boolean)
            : [];

    if (existingImages.length > 0) {
        console.log(
            `♻️ ${place.name_th}: ใช้รูปจาก Supabase ${existingImages.length} รูป`
        );

        console.log(
            "🚫 ไม่เรียก Google Places API"
        );

        return existingImages.slice(0, 5);
    }

    // =====================================================
    // 2. ไม่มีรูปจริง ๆ
    // → ให้ Server ตรวจ Supabase อีกครั้ง
    // → Server ค่อยตัดสินใจว่าจะเรียก Google หรือไม่
    // =====================================================

    const attId =
        place.att_id ??
        place.id;

    if (!attId) {
        console.warn(
            "⚠️ ไม่มี att_id สำหรับดึงรูป:",
            place
        );

        return [];
    }

    try {
        const params =
            new URLSearchParams({
                att_id: String(attId)
            });

        console.log(
            `🌐 ${place.name_th}: ไม่มีรูปในข้อมูล → ตรวจผ่าน Server`
        );

        const response =
            await fetch(
                `${API_URL}/api/attraction-images?${params.toString()}`
            );

        if (!response.ok) {
            console.error(
                "❌ Attraction image API error:",
                response.status
            );

            return [];
        }

        const data =
            await response.json();

        const images =
            Array.isArray(data.images)
                ? data.images.filter(Boolean)
                : [];

        console.log(
            `🖼️ ${place.name_th}:`,
            images.length,
            "รูป",
            data.cached
                ? "(Supabase Cache)"
                : "(Google)"
        );

        return images.slice(0, 5);

    } catch (error) {
        console.error(
            "❌ โหลดรูปสถานที่ไม่สำเร็จ:",
            error
        );

        return [];
    }
}
/* =========================================================
   TDMC RESULT → SYSTEM RESULT
   ========================================================= */

function formatRankedPlaces(
    rankedPlaces: TDMCScoredPlace[],
    restaurants: any[]
) {

    return rankedPlaces.map(
        place => ({

            /* =============================================
               ATTRACTION
               ============================================= */

            attraction: {

                id:
                    place.att_id ??
                    place.id,

                name_th:
                    place.name_th,

                name_en:
                    place.name_en,

                latitude:
                    place.latitude ??
                    place.lat,

                longitude:
                    place.longitude ??
                    place.lng,


                /* =========================================
                   MAIN TDMC SCORE
                   ========================================= */

                score:
                    place.tdmcScore,


                /* =========================================
                   TDMC COMPONENT SCORES

                   ใช้สำหรับ Debug / Experiment
                   ========================================= */

                tdmcScore:
                    place.tdmcScore,

                accuracyScore:
                    place.accuracyScore,

                popularityScore:
                    place.popularityScore,

                distanceScore:
                    place.distanceScore,


                /* =========================================
                   NORMALIZED VALUES
                   ========================================= */

                normalizedRating:
                    place.normalizedRating,

                normalizedPopularity:
                    place.normalizedPopularity,

                normalizedDistance:
                    place.normalizedDistance,


                /* =========================================
                   TOPIC METRICS
                   ========================================= */

                topicSimilarity:
                    place.topicSimilarity,

                topicDiversity:
                    place.topicDiversity,


                /* =========================================
                   DISTANCE
                   ========================================= */

                distanceKm:
                    place.distanceKm,


                /* =========================================
                   OPTIONAL INFORMATION
                   ========================================= */

                category:
                    place.category,
                images:
                    place.images ?? [],

                province:
                    place.province,

                rating:
                    place.rating ??
                    place.averageRating ??
                    place.predictedRating ??
                    place.predictedRatingByAttraction,

                popularity:
                    place.popularity ??
                    place.visitors ??
                    place.visitorCount,

            },


            /* =============================================
               NEARBY RESTAURANTS
               ============================================= */

            nearbyRestaurants:

                findNearbyRestaurants(
                    place,
                    restaurants
                )

                .map(
                    rest => ({

                        id:
                            rest.place_id,

                        restaurant_name_th:
                            rest.place_name_th,

                        latitude:
                            rest.latitude,

                        longitude:
                            rest.longitude,

                        distance:
                            rest.distance

                    })
                )

        })
    );
}


/* =========================================================
   MAIN ALGORITHM

   ใช้ในระบบเดิม

   DEFAULT:
   Balanced TDMC

   α = 0.6
   β = 0.2
   γ = 0.2
   ========================================================= */

export function rankPlaces(
    attractions: any[],
    restaurants: any[],
    trip: TripPlanInput,
    options?: {

        limit?: number;

        weights?: TDMCWeights;

        candidateMultiplier?: number;

    }
) {

    console.log(
        "\n=========================================="
    );

    console.log(
        "🧠 TDMC ALGORITHM"
    );

    console.log(
        "=========================================="
    );


    /* =============================================
       TRIP INPUT
       ============================================= */

    console.log(
        "📍 Province:",
        trip.province
    );

    console.log(
        "👥 Companion:",
        trip.companion
    );

    console.log(
        "💰 Budget:",
        trip.budget
    );

    console.log(
        "🏔️ Travel Type:",
        trip.travelType
    );

    console.log(
        "🎯 Activities:",
        trip.activities
    );

    console.log(
        "🌤️ Atmosphere:",
        trip.atmosphere
    );


    /* =============================================
       DEFAULT WEIGHTS

       Balanced TDMC
       ============================================= */

    const weights =
        normalizeWeights(
            options?.weights ?? {

                alpha: 0.2,

                beta: 0.3,

                gamma: 0.5

            }
        );


    console.log(
        "\n⚖️ TDMC WEIGHTS"
    );

    console.table({
        alpha: weights.alpha,
        beta: weights.beta,
        gamma: weights.gamma
    });


    /* =============================================
       RUN TDMC
       ============================================= */

    const tdmcResult: TDMCResult =
        rankPlacesTDMC(

            attractions as TDMCPlace[],

            trip,

            {

                limit:
                    options?.limit ?? 10,

                weights,

                candidateMultiplier:
                    options?.candidateMultiplier ?? 3

            }

        );


    /* =============================================
       LOG RESULT
       ============================================= */

    console.log(
        "\n=========================================="
    );

    console.log(
        "📊 TDMC RESULT"
    );

    console.log(
        "=========================================="
    );


    console.log(
        "Total Attractions:",
        attractions.length
    );

    console.log(
        "Recommended:",
        tdmcResult.recommendations.length
    );

    console.log(
        "Average TDMC Score:",
        tdmcResult.averageScore
    );

    console.log(
        "Average Rating:",
        tdmcResult.averageRating
    );

    console.log(
        "Average Popularity:",
        tdmcResult.averagePopularity
    );

    console.log(
        "Average Distance:",
        tdmcResult.averageDistance
    );

    console.log(
        "Topic Diversity:",
        tdmcResult.diversity
    );

    console.log(
        "Runtime:",
        `${tdmcResult.runtime.toFixed(2)} ms`
    );


    /* =============================================
       TABLE FOR EXPERIMENT / DEBUG
       ============================================= */

    console.table(

        tdmcResult.recommendations.map(
            (
                place,
                index
            ) => ({

                rank:
                    index + 1,

                attraction:
                    place.name_th ??
                    place.name ??
                    "Unknown",

                tdmcScore:
                    Number(
                        place.tdmcScore
                    ).toFixed(4),

                accuracy:
                    Number(
                        place.accuracyScore
                    ).toFixed(4),

                popularity:
                    Number(
                        place.popularityScore
                    ).toFixed(4),

                distance:
                    Number(
                        place.distanceScore
                    ).toFixed(4),

                topicSimilarity:
                    Number(
                        place.topicSimilarity
                    ).toFixed(4),

                topicDiversity:
                    Number(
                        place.topicDiversity
                    ).toFixed(4),

                distanceKm:
                    Number(
                        place.distanceKm
                    ).toFixed(2)

            })
        )

    );


    /* =============================================
       RETURN FORMAT

       คง Format เดิม
       เพื่อไม่ให้ Planner พัง
       ============================================= */

    return formatRankedPlaces(
        tdmcResult.recommendations,
        restaurants
    );
}

/* =========================================================
   TDMC TOP 10 + GOOGLE NEARBY RESTAURANTS
   ========================================================= */

export async function rankPlacesWithNearbyRestaurants(
    attractions: any[],
    restaurants: any[],
    trip: TripPlanInput,
    options?: {
        limit?: number;
        weights?: TDMCWeights;
        candidateMultiplier?: number;
    }
) {

    /* =============================================
       1. RUN TDMC
       ============================================= */

    const rankedPlaces =
        rankPlaces(
            attractions,
            restaurants,
            trip,
            options
        );

    console.log(
        "\n🍽️ LOAD GOOGLE RESTAURANTS FOR TOP TDMC"
    );

    /* =============================================
       2. เอา Top 10 จาก TDMC
       ============================================= */

    const topPlaces =
        rankedPlaces.slice(
            0,
            options?.limit ?? 10
        );

    console.log(
        "📊 TDMC TOP:",
        topPlaces.length
    );

    /* =============================================
       3. เรียกร้านอาหารจาก Google
       ============================================= */

    const results = [];

    for (
        const rankedPlace
        of topPlaces
    ) {

        const attraction =
            rankedPlace.attraction;

        const tdmcPlace: TDMCPlace = {
            att_id:
                attraction.id,

            id:
                attraction.id,

            name_th:
                attraction.name_th,

            name_en:
                attraction.name_en,

            latitude:
                attraction.latitude,

            longitude:
                attraction.longitude,

            province:
                attraction.province,

            images:
                attraction.images ?? []
                
        };
/* =============================================
   4. รูปสถานที่
   ถ้ามีอยู่แล้ว → ไม่เรียก Google
   ถ้าไม่มี → ให้ Server จัดการ
   ============================================= */

const attractionImages =
    await loadAttractionImages(
        tdmcPlace
    );


/* =============================================
   5. ร้านอาหาร
   ใช้ร้านจาก Supabase ก่อน
   ถ้ามี → ไม่เรียก Google
   ============================================= */

const cachedRestaurants =
    findNearbyRestaurants(
        tdmcPlace,
        restaurants,
        3
    );

let selectedRestaurants =
    cachedRestaurants;

if (cachedRestaurants.length === 0) {

    console.log(
        `🔎 ${attraction.name_th}: ไม่พบร้านในข้อมูลเดิม → เรียก Google`
    );

    selectedRestaurants =
        await loadNearbyRestaurantsFromGoogle(
            tdmcPlace,
            trip.province
        );
} else {

    console.log(
        `♻️ ${attraction.name_th}: ใช้ร้านจาก Supabase ${cachedRestaurants.length} ร้าน`
    );
}
results.push({

    ...rankedPlace,

    attraction: {
        ...rankedPlace.attraction,
        images: attractionImages
    },

    nearbyRestaurants:
        selectedRestaurants
            .map(
                (rest: any) => {

                    const distance =
                        distanceKm(
                            Number(
                                attraction.latitude
                            ),
                            Number(
                                attraction.longitude
                            ),
                            Number(
                                rest.latitude
                            ),
                            Number(
                                rest.longitude
                            )
                        );

                    return {

                        id:
                            rest.place_id,

                        restaurant_name_th:
                            rest.place_name_th,

                        latitude:
                            rest.latitude,

                        longitude:
                            rest.longitude,

                        rating:
                            rest.rating,

                        user_ratings_total:
                            rest.user_ratings_total,

                        distance

                    };

                }
            )
            .filter(
                (rest: any) =>
                    rest.distance < 10
            )
            .sort(
                (a: any, b: any) =>
                    a.distance -
                    b.distance
            )
            .slice(0, 3)

});

    }

    console.log(
        "✅ TDMC + Google Restaurants Complete"
    );

    return results;
}

/* =========================================================
   EXPERIMENT VERSION

   สำหรับใช้ในการทดลอง
   ========================================================= */

export function rankPlacesWithTDMCResult(
    attractions: any[],
    trip: TripPlanInput,
    options?: {

        limit?: number;

        weights?: TDMCWeights;

        candidateMultiplier?: number;

    }
): TDMCResult {

    return rankPlacesTDMC(

        attractions as TDMCPlace[],

        trip,

        {

            limit:
                options?.limit ?? 10,

            weights:
                options?.weights,

            candidateMultiplier:
                options?.candidateMultiplier ?? 3

        }

    );
}


/* =========================================================
   HELPER

   Run TDMC ด้วย Weight ที่กำหนด
   ========================================================= */

export function rankPlacesWithWeights(
    attractions: any[],
    restaurants: any[],
    trip: TripPlanInput,

    alpha: number,

    beta: number,

    gamma: number
) {

    return rankPlaces(
        attractions,
        restaurants,
        trip,
        {
            limit: 10,

            weights: {
                alpha,
                beta,
                gamma
            }
        }
    );
}

