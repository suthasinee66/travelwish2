import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router = express.Router();

console.log("🍽️ nearbyRestaurants router loaded");

const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY;

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);


// =========================================================
// คำนวณระยะทาง km
// =========================================================

function calculateDistanceKm(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}


// =========================================================
// สร้าง URL รูปร้าน สูงสุด 5 รูป
// =========================================================

function getRestaurantImages(place) {
  return (place.photos || [])
    .slice(0, 5)
    .map((photo) => {
      if (!photo.name) {
        return null;
      }

      return `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${GOOGLE_PLACES_API_KEY}`;
    })
    .filter(Boolean);
}


// =========================================================
// GET /nearby-restaurants
// =========================================================

router.get(
  "/nearby-restaurants",
  async (req, res) => {
    try {

      const {
        lat,
        lng,
        province,
        att_id,
      } = req.query;


      // =====================================================
      // ตรวจสอบ att_id
      // =====================================================

      if (!att_id) {
        return res.status(400).json({
          error:
            "att_id จำเป็นต้องระบุ",
        });
      }


      // =====================================================
      // ตรวจสอบ lat / lng
      // =====================================================

      if (!lat || !lng) {
        return res.status(400).json({
          error:
            "lat และ lng จำเป็นต้องระบุ",
        });
      }


      // =====================================================
      // ตรวจสอบ Google API Key
      // =====================================================

      if (!GOOGLE_PLACES_API_KEY) {
        return res.status(500).json({
          error:
            "ไม่พบ GOOGLE_PLACES_API_KEY",
        });
      }


      const latitude = Number(lat);
      const longitude = Number(lng);


      console.log(
        "\n======================================"
      );

      console.log(
        "🍽️ Nearby Restaurant Search"
      );

      console.log(
        "Attraction ID:",
        att_id
      );

      console.log(
        "Latitude:",
        latitude
      );

      console.log(
        "Longitude:",
        longitude
      );

      console.log(
        "Province:",
        province
      );


      // =====================================================
      // 1. เช็ก Cache จาก Supabase ก่อน
      // =====================================================

      console.log(
        "🔎 กำลังตรวจสอบร้านอาหารที่มีอยู่แล้ว..."
      );


      const {
        data: existingRelations,
        error: existingError,
      } =
        await supabase
          .from(
            "attraction_restaurant"
          )
          .select(`
            place_id,
            distance_km,
            restaurant (
              place_id,
              place_name_th,
              place_name_en,
              place_address,
              place_phone,
              place_website,
              place_type,
              province_name_th,
              latitude,
              longitude,
              images,
              rating,
              user_ratings_total
            )
          `)
          .eq(
            "att_id",
            att_id
          );


      if (existingError) {
        console.error(
          "❌ ตรวจสอบ Cache ไม่สำเร็จ:",
          existingError
        );
      }


      // =====================================================
      // แปลงข้อมูล Cache
      // =====================================================

      const cachedRestaurants =
        (existingRelations || [])
          .map((item) => {

            const restaurant =
              item.restaurant;

            if (!restaurant) {
              return null;
            }

            const images =
              Array.isArray(
                restaurant.images
              )
                ? restaurant.images
                : [];

            return {
              ...restaurant,

              distance:
                Number(
                  item.distance_km
                ),

              hasImages:
                images.length > 0,
            };
          })
          .filter(Boolean);


      console.log(
        "📦 ร้านที่มีใน Cache:",
        cachedRestaurants.length
      );


      // =====================================================
      // ถ้ามีร้านเดิม และทุกร้านมีรูปแล้ว
      // → ไม่เรียก Google API
      // =====================================================

      const hasCompleteCache =
        cachedRestaurants.length > 0 &&
        cachedRestaurants.every(
          (restaurant) =>
            restaurant.hasImages
        );


      if (hasCompleteCache) {

        console.log(
          "♻️ ใช้ข้อมูลจาก Supabase Cache"
        );

        console.log(
          "🚫 ไม่เรียก Google Places API"
        );

        console.log(
          "======================================\n"
        );


        return res.json({
          success: true,

          cached: true,

          count:
            cachedRestaurants.length,

          restaurants:
            cachedRestaurants,
        });
      }


      // =====================================================
      // ถ้ามาถึงตรงนี้
      //
      // 1. ยังไม่มี Cache
      // หรือ
      // 2. ร้านเดิมยังไม่มีรูป
      //
      // → ต้องเรียก Google
      // =====================================================

      console.log(
        "🌐 เรียก Google Places API..."
      );


      // =====================================================
      // 2. เรียก Google Places API
      // =====================================================

      const response =
        await fetch(
          "https://places.googleapis.com/v1/places:searchNearby",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "X-Goog-Api-Key":
                GOOGLE_PLACES_API_KEY,

              "X-Goog-FieldMask":
                "places.id," +
                "places.displayName," +
                "places.formattedAddress," +
                "places.location," +
                "places.primaryType," +
                "places.types," +
                "places.nationalPhoneNumber," +
                "places.websiteUri," +
                "places.rating," +
                "places.userRatingCount," +
                "places.photos",
            },

            body: JSON.stringify({
              includedTypes: [
                "restaurant",
              ],

              maxResultCount: 20,

              languageCode: "th",

              regionCode: "TH",

              locationRestriction: {
                circle: {
                  center: {
                    latitude,
                    longitude,
                  },

                  radius: 10000,
                },
              },
            }),
          }
        );


      // =====================================================
      // ตรวจสอบ Google API
      // =====================================================

      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          "❌ Google Places Error:",
          errorText
        );

        return res.status(
          response.status
        ).json({
          error:
            "Google Places API error",

          details:
            errorText,
        });
      }


      const data =
        await response.json();


      // =====================================================
      // กรองเฉพาะร้านอาหาร
      // =====================================================

      const places =
        (data.places || [])
          .filter((place) => {

            const type =
              place.primaryType ||
              "";

            return (
              type.includes(
                "restaurant"
              ) ||
              type.includes("food") ||
              type ===
                "noodle_shop" ||
              type ===
                "breakfast_restaurant" ||
              type === "cafe"
            );
          });


      console.log(
        `🍴 พบร้านอาหารจาก Google ${places.length} ร้าน`
      );


      // =====================================================
      // 3. แปลง Google → restaurant
      // =====================================================

      const restaurants =
        places
          .map((place) => ({

            place_id:
              place.id ?? null,

            place_name_th:
              place.displayName
                ?.text ?? null,

            place_name_en:
              null,

            place_address:
              place.formattedAddress ??
              null,

            place_phone:
              place.nationalPhoneNumber ??
              null,

            place_website:
              place.websiteUri ??
              null,

            place_type:
              place.primaryType ??
              "restaurant",

            province_name_th:
              province || null,

            latitude:
              place.location
                ?.latitude ?? null,

            longitude:
              place.location
                ?.longitude ?? null,

            // ⭐ สูงสุด 5 รูป
            images:
              getRestaurantImages(
                place
              ),

            rating:
              place.rating ?? null,

            user_ratings_total:
              place.userRatingCount ??
              null,

            updated_at:
              new Date().toISOString(),
          }))
          .filter(
            (restaurant) =>
              restaurant.place_id
          );


      console.log(
        "🖼️ เตรียมรูปทั้งหมด:",
        restaurants.reduce(
          (total, restaurant) =>
            total +
            restaurant.images.length,
          0
        ),
        "รูป"
      );


      // =====================================================
      // 4. บันทึก restaurant
      // =====================================================

      if (
        restaurants.length > 0
      ) {

        const {
          error: upsertError,
        } =
          await supabase
            .from("restaurant")
            .upsert(
              restaurants,
              {
                onConflict:
                  "place_id",
              }
            );


        if (upsertError) {

          console.error(
            "❌ Supabase restaurant error:",
            upsertError
          );

          return res.status(
            500
          ).json({
            error:
              "บันทึกร้านอาหารไม่สำเร็จ",

            details:
              upsertError.message,
          });
        }


        // =================================================
        // 5. บันทึกความสัมพันธ์
        // =================================================

        const relations =
          restaurants
            .filter(
              (restaurant) =>
                restaurant.latitude !=
                  null &&
                restaurant.longitude !=
                  null
            )
            .map(
              (restaurant) => ({

                att_id,

                place_id:
                  restaurant.place_id,

                distance_km:
                  calculateDistanceKm(
                    latitude,
                    longitude,
                    Number(
                      restaurant.latitude
                    ),
                    Number(
                      restaurant.longitude
                    )
                  ),
              })
            );


        if (
          relations.length > 0
        ) {

          const {
            error: relationError,
          } =
            await supabase
              .from(
                "attraction_restaurant"
              )
              .upsert(
                relations,
                {
                  onConflict:
                    "att_id,place_id",
                }
              );


          if (relationError) {

            console.error(
              "❌ Attraction-Restaurant relation error:",
              relationError
            );

            return res.status(
              500
            ).json({
              error:
                "บันทึกความสัมพันธ์สถานที่กับร้านอาหารไม่สำเร็จ",

              details:
                relationError.message,
            });
          }
        }
      }


      // =====================================================
      // 6. ส่งกลับ Frontend
      // =====================================================

      console.log(
        "✅ Google Restaurants Complete"
      );

      console.log(
        "======================================\n"
      );


      return res.json({

        success: true,

        cached: false,

        count:
          restaurants.length,

        restaurants,
      });


    } catch (error) {

      console.error(
        "❌ nearby-restaurants error:",
        error
      );

      return res.status(
        500
      ).json({
        error:
          error.message,
      });
    }
  }
);


export default router;