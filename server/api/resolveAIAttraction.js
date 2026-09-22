import express from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const SERP_API_KEY =
  process.env.SERP_API_KEY;

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

function cleanText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

function asTextArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map(item =>
          String(item ?? "").trim()
        )
        .filter(Boolean)
    )
  ];
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function simpleHash(value) {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(index);

    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (
    hash >>> 0
  ).toString(36);
}

async function checkImage(url) {
  try {
    const response =
      await axios.get(
        url,
        {
          timeout: 5000,
          responseType: "stream",
        }
      );

    const contentType =
      response.headers[
        "content-type"
      ];

    return (
      response.status === 200 &&
      contentType &&
      contentType.startsWith(
        "image"
      )
    );
  } catch {
    return false;
  }
}

async function searchPlace(
  name,
  province
) {
  const response =
    await axios.get(
      "https://serpapi.com/search.json",
      {
        params: {
          engine:
            "google_maps",

          type:
            "search",

          q:
            `${name} ${province} Thailand`,

          hl:
            "th",

          api_key:
            SERP_API_KEY,
        },
      }
    );

  const data =
    response.data ?? {};

  const candidates = [
    ...(Array.isArray(
      data.local_results
    )
      ? data.local_results
      : []),

    ...(data.place_results
      ? [data.place_results]
      : []),
  ];

  if (
    candidates.length === 0
  ) {
    return null;
  }

  const targetName =
    normalize(name);

  const targetProvince =
    normalize(province);

  const scored =
    candidates.map(
      place => {
        const title =
          normalize(
            place.title ??
            place.name
          );

        const address =
          normalize(
            place.address ??
            place.full_address
          );

        let score = 0;

        if (
          title ===
          targetName
        ) {
          score += 10;
        } else if (
          title.includes(
            targetName
          ) ||
          targetName.includes(
            title
          )
        ) {
          score += 6;
        }

        if (
          targetProvince &&
          address.includes(
            targetProvince
          )
        ) {
          score += 5;
        }

        if (
          address.includes(
            "thailand"
          ) ||
          address.includes(
            "ประเทศไทย"
          )
        ) {
          score += 1;
        }

        return {
          place,
          score,
        };
      }
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );

  return (
    scored[0]?.place ??
    null
  );
}

async function loadImages(
  name,
  province
) {
  const response =
    await axios.get(
      "https://serpapi.com/search.json",
      {
        params: {
          engine:
            "google_images",

          q:
            `${name} ${province} Thailand travel attraction`,

          num:
            20,

          api_key:
            SERP_API_KEY,
        },
      }
    );

  const blocked = [
    "facebook",
    "fbcdn",
    "fbsbx",
    "tiktok",
    "musical.ly",
    "pinterest",
    "pinimg",
    "twitter",
    "x.com",
    "instagram",
    "youtube",
    "i.ytimg",
  ];

  const candidates =
    (
      response.data
        ?.images_results ??
      []
    )
      .map(
        item =>
          item.original
      )
      .filter(Boolean)
      .filter(url => {
        const lower =
          String(url)
            .toLowerCase();

        return !blocked.some(
          domain =>
            lower.includes(
              domain
            )
        );
      });

  const validImages = [];

  for (
    const url
    of candidates
  ) {
    if (
      validImages.length >= 5
    ) {
      break;
    }

    if (
      await checkImage(url)
    ) {
      validImages.push(url);
    }
  }

  return validImages;
}

async function findExistingAttraction(
  attId,
  name,
  province
) {
  const byId =
    await supabase
      .from("attraction")
      .select("*")
      .eq(
        "att_id",
        attId
      )
      .maybeSingle();

  if (
    byId.data
  ) {
    return byId.data;
  }

  const byName =
    await supabase
      .from("attraction")
      .select("*")
      .eq(
        "province",
        province
      )
      .ilike(
        "name_th",
        name
      )
      .limit(1)
      .maybeSingle();

  return (
    byName.data ??
    null
  );
}

router.post(
  "/resolve-ai-attraction",
  async (req, res) => {
    try {
      const {
        name,
        province,
        aiData = {},
      } = req.body ?? {};

      if (
        !name ||
        !province
      ) {
        return res
          .status(400)
          .json({
            error:
              "name และ province จำเป็นต้องระบุ",
          });
      }

      if (
        !SERP_API_KEY
      ) {
        return res
          .status(500)
          .json({
            error:
              "SERP_API_KEY is not configured",
          });
      }

      const verifiedPlace =
        await searchPlace(
          name,
          province
        );

      if (
        !verifiedPlace
      ) {
        return res
          .status(404)
          .json({
            error:
              "ไม่สามารถยืนยันสถานที่ที่ AI แนะนำได้",
            requestedName:
              name,
          });
      }

      const title =
        cleanText(
          verifiedPlace.title ??
          verifiedPlace.name
        ) ??
        cleanText(name);

      const gps =
        verifiedPlace
          .gps_coordinates ??
        {};

      const latitude =
        Number(
          gps.latitude ??
          verifiedPlace.latitude
        );

      const longitude =
        Number(
          gps.longitude ??
          verifiedPlace.longitude
        );

      if (
        !title ||
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {
        return res
          .status(422)
          .json({
            error:
              "พบชื่อสถานที่แต่ไม่มีพิกัดที่เชื่อถือได้",
            requestedName:
              name,
          });
      }

      const externalId =
        cleanText(
          verifiedPlace.place_id ??
          verifiedPlace.data_id
        );

      const attId =
        externalId ??
        `ai_${simpleHash(
          `${title}|${latitude}|${longitude}`
        )}`;

      const existing =
        await findExistingAttraction(
          attId,
          title,
          province
        );

      if (
        existing &&
        Array.isArray(
          existing.images
        ) &&
        existing.images.length > 0
      ) {
        return res.json({
          success: true,
          cached: true,
          attraction:
            existing,
        });
      }

      const images =
        await loadImages(
          title,
          province
        );

      const categories =
        asTextArray(
          aiData.category
        );

      const payload = {
        att_id:
          existing?.att_id ??
          attId,

        name_th:
          title,

        name_en:
          cleanText(
            aiData.name_en
          ) ??
          existing?.name_en ??
          null,

        detail_th:
          cleanText(
            aiData.detail_th
          ) ??
          existing?.detail_th ??
          null,

        detail_en:
          cleanText(
            aiData.detail_en
          ) ??
          existing?.detail_en ??
          null,

        category:
          categories.length > 0
            ? categories
            : (
                Array.isArray(
                  existing?.category
                )
                  ? existing.category
                  : []
              ),

        type:
          cleanText(
            verifiedPlace.type
          ) ??
          cleanText(
            aiData.type
          ) ??
          existing?.type ??
          null,

        region:
          cleanText(
            aiData.region
          ) ??
          existing?.region ??
          null,

        province,

        district:
          cleanText(
            aiData.district
          ) ??
          existing?.district ??
          null,

        subdistrict:
          cleanText(
            aiData.subdistrict
          ) ??
          existing?.subdistrict ??
          null,

        latitude,
        longitude,

        highlight:
          cleanText(
            aiData.highlight
          ) ??
          existing?.highlight ??
          null,

        activity:
          cleanText(
            aiData.activity
          ) ??
          existing?.activity ??
          null,

        suitable_duration:
          cleanText(
            aiData.suitable_duration
          ) ??
          existing?.suitable_duration ??
          null,

        tel:
          cleanText(
            verifiedPlace.phone
          ) ??
          existing?.tel ??
          null,

        email:
          existing?.email ??
          null,

        website:
          cleanText(
            verifiedPlace.website
          ) ??
          existing?.website ??
          null,

        facebook:
          existing?.facebook ??
          null,

        payment:
          existing?.payment ??
          null,

        travel_type:
          asTextArray(
            aiData.travel_type
          ),

        activities:
          asTextArray(
            aiData.activities
          ),

        atmosphere:
          asTextArray(
            aiData.atmosphere
          ),

        budget:
          asTextArray(
            aiData.budget
          ),

        travel_companion:
          asTextArray(
            aiData.travel_companion
          ),

        images:
          images.length > 0
            ? images
            : (
                Array.isArray(
                  existing?.images
                )
                  ? existing.images
                  : []
              ),

        updated_at:
          new Date()
            .toISOString(),
      };

      const {
        data: saved,
        error: saveError,
      } =
        await supabase
          .from("attraction")
          .upsert(
            payload,
            {
              onConflict:
                "att_id",
            }
          )
          .select("*")
          .single();

      if (
        saveError
      ) {
        console.error(
          "❌ SAVE AI ATTRACTION ERROR:",
          saveError
        );

        return res
          .status(500)
          .json({
            error:
              "บันทึกสถานที่ใหม่ไม่สำเร็จ",
            details:
              saveError.message,
          });
      }

      return res.json({
        success: true,
        cached: false,
        verified: {
          title,
          address:
            verifiedPlace.address ??
            verifiedPlace.full_address ??
            null,
          latitude,
          longitude,
          external_place_id:
            externalId,
          rating:
            verifiedPlace.rating ??
            null,
          reviews:
            verifiedPlace.reviews ??
            null,
        },
        attraction:
          saved,
      });
    } catch (error) {
      console.error(
        "❌ resolve-ai-attraction error:",
        error.response?.data ??
        error.message
      );

      return res
        .status(500)
        .json({
          error:
            error.message,
        });
    }
  }
);

export default router;
