import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router = express.Router();

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
// GET /attraction-images
// =========================================================

router.get(
  "/attraction-images",
  async (req, res) => {
    try {

      const {
        att_id,
        google_place_id,
      } = req.query;


      // =====================================================
      // ตรวจสอบข้อมูล
      // =====================================================

      if (!att_id) {
        return res.status(400).json({
          error:
            "att_id จำเป็นต้องระบุ",
        });
      }

      if (!GOOGLE_PLACES_API_KEY) {
        return res.status(500).json({
          error:
            "ไม่พบ GOOGLE_PLACES_API_KEY",
        });
      }


      // =====================================================
      // 1. เช็ก Attraction ใน Supabase
      // =====================================================

      const {
        data: attraction,
        error: attractionError,
      } =
        await supabase
          .from("attraction")
          .select(`
            att_id,
            name_th,
            google_place_id,
            images
          `)
          .eq(
            "att_id",
            att_id
          )
          .single();


      if (attractionError) {

        return res.status(404).json({
          error:
            "ไม่พบสถานที่ท่องเที่ยว",

          details:
            attractionError.message,
        });
      }


      // =====================================================
      // 2. ถ้ามีรูปครบ 5 รูป
      // → ไม่เรียก Google
      // =====================================================

      const existingImages =
        Array.isArray(
          attraction.images
        )
          ? attraction.images
          : [];

if (
  existingImages.length > 0
) {

        console.log(
          `♻️ ${attraction.name_th} ใช้รูปจาก Cache`
        );

        console.log(
          "🚫 ไม่เรียก Google Places API"
        );


        return res.json({
          success: true,

          cached: true,

          att_id:
            attraction.att_id,

          name_th:
            attraction.name_th,

          images:
            existingImages.slice(0, 5),
        });
      }


      // =====================================================
      // 3. หา Google Place ID
      // =====================================================

      const placeId =
        google_place_id ||
        attraction.google_place_id;


      if (!placeId) {

        return res.json({
          success: true,

          cached: false,

          att_id:
            attraction.att_id,

          name_th:
            attraction.name_th,

          images:
            existingImages,

          message:
            "สถานที่นี้ยังไม่มี google_place_id",
        });
      }


      console.log(
        `🌐 ดึงรูป Google: ${attraction.name_th}`
      );


      // =====================================================
      // 4. เรียก Google Places API
      // =====================================================

      const response =
        await fetch(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
          {
            method: "GET",

            headers: {
              "X-Goog-Api-Key":
                GOOGLE_PLACES_API_KEY,

              "X-Goog-FieldMask":
                "id,displayName,photos",
            },
          }
        );


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
      // 5. สร้าง URL รูป
      // =====================================================

      const googleImages =
        (data.photos || [])
          .slice(0, 5)
          .map(
            (photo) => {

              if (!photo.name) {
                return null;
              }

              return `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${GOOGLE_PLACES_API_KEY}`;
            }
          )
          .filter(Boolean);


      // =====================================================
      // ถ้า Google ไม่มีรูป
      // =====================================================

      if (
        googleImages.length === 0
      ) {

        console.log(
          `⚠️ ${attraction.name_th} ไม่มีรูปจาก Google`
        );

        return res.json({
          success: true,

          cached: false,

          att_id:
            attraction.att_id,

          name_th:
            attraction.name_th,

          images:
            existingImages,
        });
      }


      // =====================================================
      // 6. รวมรูปเดิม + รูปใหม่
      // =====================================================

      const images = [
        ...existingImages,
        ...googleImages,
      ].slice(0, 5);


      // =====================================================
      // 7. บันทึกลง attraction
      // =====================================================

      const {
        error: updateError,
      } =
        await supabase
          .from("attraction")
          .update({
            images,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "att_id",
            att_id
          );


      if (updateError) {

        console.error(
          "❌ บันทึกรูป Attraction ไม่สำเร็จ:",
          updateError
        );

        return res.status(500).json({
          error:
            "บันทึกรูปสถานที่ไม่สำเร็จ",

          details:
            updateError.message,
        });
      }


      // =====================================================
      // 8. ส่งกลับ
      // =====================================================

      console.log(
        `✅ ${attraction.name_th} ได้รูป ${images.length} รูป`
      );


      return res.json({

        success: true,

        cached: false,

        att_id:
          attraction.att_id,

        name_th:
          attraction.name_th,

        images,

      });

    } catch (error) {

      console.error(
        "❌ attraction-images error:",
        error
      );

      return res.status(500).json({
        error:
          error.message,
      });
    }
  }
);


export default router;