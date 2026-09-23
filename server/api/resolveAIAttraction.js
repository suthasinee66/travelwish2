import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router = express.Router();

const SERP_API_KEY =
  process.env.SERP_API_KEY;

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

async function searchPlaceWithGoogle(
  name,
  province
) {
  if (!GOOGLE_PLACES_API_KEY) {
    return null;
  }

  const response =
    await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Goog-Api-Key":
            GOOGLE_PLACES_API_KEY,

          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.types",
            "places.primaryType",
            "places.nationalPhoneNumber",
            "places.websiteUri",
            "places.googleMapsUri",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.businessStatus",
            "places.regularOpeningHours",
            "places.addressComponents",
            "places.editorialSummary",
            "places.photos",
          ].join(","),
        },

        body: JSON.stringify({
          textQuery:
            `${name} ${province} Thailand`,

          languageCode:
            "th",

          regionCode:
            "TH",

          maxResultCount:
            5,
        }),
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Google Places Text Search failed: ${errorText}`
    );
  }

  const data =
    await response.json();

  const places =
    Array.isArray(
      data.places
    )
      ? data.places
      : [];

  if (
    places.length === 0
  ) {
    return null;
  }

  const targetName =
    normalize(name);

  const targetProvince =
    normalize(province);

  const scored =
    places
      .map(place => {
        const title =
          normalize(
            place.displayName?.text
          );

        const address =
          normalize(
            place.formattedAddress
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
      })
      .sort(
        (a, b) =>
          b.score - a.score
      );

  const best =
    scored[0]?.place;

  if (!best) {
    return null;
  }

  return {
    source:
      "google_places",

    title:
      best.displayName?.text ??
      name,

    address:
      best.formattedAddress ??
      null,

    gps_coordinates: {
      latitude:
        best.location?.latitude,

      longitude:
        best.location?.longitude,
    },

    place_id:
      best.id ??
      null,

    type:
      best.primaryType ??
      best.types?.[0] ??
      null,

    phone:
      best.nationalPhoneNumber ??
      null,

    website:
      best.websiteUri ??
      null,

    rating:
      best.rating ??
      null,

    reviews:
      best.userRatingCount ??
      null,

    photos:
      Array.isArray(
        best.photos
      )
        ? best.photos
        : [],

    google_maps_uri:
      best.googleMapsUri ??
      null,

    primary_type:
      best.primaryType ??
      null,

    types:
      Array.isArray(
        best.types
      )
        ? best.types
        : [],

    business_status:
      best.businessStatus ??
      null,

    opening_hours:
      best.regularOpeningHours ??
      null,

    address_components:
      Array.isArray(
        best.addressComponents
      )
        ? best.addressComponents
        : null,

    price_level:
      best.priceLevel ??
      null,

    editorial_summary:
      best.editorialSummary?.text ??
      null,

    raw_google_place:
      best,
  };
}

async function searchPlaceWithSerp(
  name,
  province
) {
  if (!SERP_API_KEY) {
    return null;
  }

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
    scored[0]?.place
      ? {
          ...scored[0].place,
          source:
            "serpapi",
        }
      : null
  );
}

async function searchPlace(
  name,
  province
) {
  try {
    const googlePlace =
      await searchPlaceWithGoogle(
        name,
        province
      );

    if (googlePlace) {
      console.log(
        "✅ AI place verified with Google Places:",
        googlePlace.title
      );

      return googlePlace;
    }
  } catch (error) {
    console.warn(
      "⚠️ Google Places verify failed:",
      error.message
    );
  }

  try {
    const serpPlace =
      await searchPlaceWithSerp(
        name,
        province
      );

    if (serpPlace) {
      console.log(
        "✅ AI place verified with SerpAPI:",
        serpPlace.title ??
        serpPlace.name
      );

      return serpPlace;
    }
  } catch (error) {
    console.warn(
      "⚠️ SerpAPI verify failed:",
      error.response?.data ??
      error.message
    );
  }

  return null;
}

function googlePhotoUrls(
  verifiedPlace
) {
  if (
    !GOOGLE_PLACES_API_KEY ||
    !Array.isArray(
      verifiedPlace?.photos
    )
  ) {
    return [];
  }

  return verifiedPlace.photos
    .slice(0, 5)
    .map(photo => {
      if (!photo?.name) {
        return null;
      }

      return (
        `https://places.googleapis.com/v1/${photo.name}/media` +
        `?maxWidthPx=800&key=${GOOGLE_PLACES_API_KEY}`
      );
    })
    .filter(Boolean);
}

async function loadImagesFromSerp(
  name,
  province
) {
  if (!SERP_API_KEY) {
    return [];
  }

  try {
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
  } catch (error) {
    console.warn(
      "⚠️ SerpAPI image search failed:",
      error.response?.data ??
      error.message
    );

    return [];
  }
}

async function loadImages(
  verifiedPlace,
  name,
  province
) {
  const googleImages =
    googlePhotoUrls(
      verifiedPlace
    );

  if (
    googleImages.length > 0
  ) {
    return googleImages;
  }

  return loadImagesFromSerp(
    name,
    province
  );
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
        !GOOGLE_PLACES_API_KEY &&
        !SERP_API_KEY
      ) {
        return res
          .status(500)
          .json({
            error:
              "No place verification provider is configured",
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

      const isNewAIAttraction =
        !existing;

      const images =
        await loadImages(
          verifiedPlace,
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

        google_place_id:
          verifiedPlace.source ===
          "google_places"
            ? externalId
            : (
                existing?.google_place_id ??
                null
              ),

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

        avg_rating:
          Number.isFinite(
            Number(
              verifiedPlace.rating
            )
          )
            ? Number(
                verifiedPlace.rating
              )
            : (
                existing?.avg_rating ??
                0
              ),

        // Google Places ไม่มี visitor count จริง
        // จึงใช้ userRatingCount เป็น popularity proxy
        // เฉพาะกรณี AI-discovered/new row หรือ row เดิมยังไม่มีค่า
        visitor_count:
          (
            isNewAIAttraction ||
            !Number.isFinite(
              Number(
                existing?.visitor_count
              )
            ) ||
            Number(
              existing?.visitor_count
            ) <= 0
          ) &&
          Number.isFinite(
            Number(
              verifiedPlace.reviews
            )
          )
            ? Number(
                verifiedPlace.reviews
              )
            : (
                existing?.visitor_count ??
                0
              ),

        google_maps_uri:
          verifiedPlace.google_maps_uri ??
          existing?.google_maps_uri ??
          null,

        google_primary_type:
          verifiedPlace.primary_type ??
          verifiedPlace.type ??
          existing?.google_primary_type ??
          null,

        google_types:
          Array.isArray(
            verifiedPlace.types
          )
            ? verifiedPlace.types
            : (
                Array.isArray(
                  existing?.google_types
                )
                  ? existing.google_types
                  : []
              ),

        google_business_status:
          verifiedPlace.business_status ??
          existing?.google_business_status ??
          null,

        google_opening_hours:
          verifiedPlace.opening_hours ??
          existing?.google_opening_hours ??
          null,

        google_address_components:
          verifiedPlace.address_components ??
          existing?.google_address_components ??
          null,

        google_price_level:
          verifiedPlace.price_level ??
          existing?.google_price_level ??
          null,

        google_editorial_summary:
          verifiedPlace.editorial_summary ??
          existing?.google_editorial_summary ??
          null,

        google_photo_names:
          Array.isArray(
            verifiedPlace.photos
          )
            ? verifiedPlace.photos
                .map(
                  photo =>
                    photo?.name ??
                    null
                )
                .filter(Boolean)
            : (
                Array.isArray(
                  existing?.google_photo_names
                )
                  ? existing.google_photo_names
                  : []
              ),

        google_place_data:
          verifiedPlace.raw_google_place ??
          existing?.google_place_data ??
          null,

        google_last_synced_at:
          verifiedPlace.source ===
          "google_places"
            ? new Date()
                .toISOString()
            : (
                existing?.google_last_synced_at ??
                null
              ),

        data_source:
          isNewAIAttraction
            ? "ai_discovered"
            : (
                existing?.data_source ??
                "dataset"
              ),

        discovered_by_ai:
          isNewAIAttraction
            ? true
            : (
                existing?.discovered_by_ai ??
                false
              ),

        ai_model:
          isNewAIAttraction
            ? (
                cleanText(
                  aiData.ai_model
                ) ??
                null
              )
            : (
                existing?.ai_model ??
                null
              ),

        ai_discovered_at:
          isNewAIAttraction
            ? new Date()
                .toISOString()
            : (
                existing?.ai_discovered_at ??
                null
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
