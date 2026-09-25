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

const GOOGLE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "types",
  "primaryType",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "rating",
  "userRatingCount",
  "priceLevel",
  "businessStatus",
  "currentOpeningHours",
  "regularOpeningHours",
  "addressComponents",
  "editorialSummary",
  "photos",
  "utcOffsetMinutes",
  "viewport",
];

function cleanText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text || null;
}

function photoUrls(place) {
  if (
    !GOOGLE_PLACES_API_KEY ||
    !Array.isArray(place?.photos)
  ) {
    return [];
  }

  return place.photos
    .slice(0, 10)
    .map((photo) =>
      photo?.name
        ? (
            `https://places.googleapis.com/v1/${photo.name}/media` +
            `?maxWidthPx=1200&key=${GOOGLE_PLACES_API_KEY}`
          )
        : null
    )
    .filter(Boolean);
}

function googleMetadata(place) {
  return {
    google_place_id:
      place?.id ?? null,

    google_maps_uri:
      place?.googleMapsUri ?? null,

    google_primary_type:
      place?.primaryType ?? null,

    google_types:
      Array.isArray(place?.types)
        ? place.types
        : [],

    google_business_status:
      place?.businessStatus ?? null,

    google_opening_hours: {
      current:
        place?.currentOpeningHours ?? null,
      regular:
        place?.regularOpeningHours ?? null,
    },

    google_address_components:
      Array.isArray(
        place?.addressComponents
      )
        ? place.addressComponents
        : null,

    google_price_level:
      place?.priceLevel ?? null,

    google_editorial_summary:
      place?.editorialSummary?.text ??
      null,

    google_photo_names:
      Array.isArray(place?.photos)
        ? place.photos
            .map(
              (photo) =>
                photo?.name ?? null
            )
            .filter(Boolean)
        : [],

    google_place_data:
      place ?? null,

    google_last_synced_at:
      new Date().toISOString(),
  };
}

async function getPlaceDetails(
  googlePlaceId
) {
  if (
    !GOOGLE_PLACES_API_KEY ||
    !googlePlaceId
  ) {
    return null;
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(
      googlePlaceId
    )}`,
    {
      headers: {
        "X-Goog-Api-Key":
          GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          GOOGLE_FIELDS.join(","),
        "Accept-Language":
          "th-TH,th;q=0.9,en;q=0.8",
      },
    }
  );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Google Place Details failed: ${text}`
    );
  }

  return response.json();
}

async function searchPlace(
  name,
  province
) {
  if (
    !GOOGLE_PLACES_API_KEY ||
    !name
  ) {
    return null;
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
        "X-Goog-Api-Key":
          GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          GOOGLE_FIELDS
            .map(
              (field) =>
                `places.${field}`
            )
            .join(","),
      },

      body: JSON.stringify({
        textQuery: [
          name,
          province,
          "Thailand",
        ]
          .filter(Boolean)
          .join(" "),
        languageCode: "th",
        regionCode: "TH",
        maxResultCount: 5,
      }),
    }
  );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Google Places Text Search failed: ${text}`
    );
  }

  const data =
    await response.json();

  const places =
    Array.isArray(data.places)
      ? data.places
      : [];

  if (places.length === 0) {
    return null;
  }

  const normalizedName =
    String(name)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const normalizedProvince =
    String(province ?? "")
      .toLowerCase()
      .trim();

  return places
    .map((place) => {
      const title =
        String(
          place?.displayName?.text ??
            ""
        )
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      const address =
        String(
          place?.formattedAddress ??
            ""
        ).toLowerCase();

      let score = 0;

      if (title === normalizedName) {
        score += 10;
      } else if (
        title.includes(
          normalizedName
        ) ||
        normalizedName.includes(
          title
        )
      ) {
        score += 6;
      }

      if (
        normalizedProvince &&
        address.includes(
          normalizedProvince
        )
      ) {
        score += 5;
      }

      return {
        place,
        score,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score
    )[0]?.place ?? null;
}

function hasUsefulImages(value) {
  return (
    Array.isArray(value) &&
    value.some(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    )
  );
}

function hasValidCoordinates(entity) {
  return (
    Number.isFinite(
      Number(entity?.latitude)
    ) &&
    Number.isFinite(
      Number(entity?.longitude)
    )
  );
}

function hasCompleteGoogleSnapshot(
  entity
) {
  return Boolean(
    entity?.google_place_id &&
    entity?.google_last_synced_at &&
    entity?.google_place_data &&
    hasValidCoordinates(entity) &&
    hasUsefulImages(entity?.images)
  );
}

function entityConfig(type) {
  if (type === "restaurant") {
    return {
      table: "restaurant",
      primaryKey: "place_id",
      nameFields: [
        "place_name_th",
        "place_name_en",
      ],
      provinceField:
        "province_name_th",
    };
  }

  if (type === "accommodation") {
    return {
      table: "accommodation",
      primaryKey: "acc_id",
      nameFields: [
        "acc_name_th",
        "acc_name_en",
      ],
      provinceField:
        "province_name_th",
    };
  }

  return {
    table: "attraction",
    primaryKey: "att_id",
    nameFields: [
      "name_th",
      "name_en",
    ],
    provinceField: "province",
  };
}

async function findExisting(
  type,
  id,
  googlePlaceId
) {
  const config =
    entityConfig(type);

  if (id) {
    const result =
      await supabase
        .from(config.table)
        .select("*")
        .eq(
          config.primaryKey,
          String(id)
        )
        .maybeSingle();

    if (result.data) {
      return result.data;
    }
  }

  if (googlePlaceId) {
    const result =
      await supabase
        .from(config.table)
        .select("*")
        .eq(
          "google_place_id",
          String(googlePlaceId)
        )
        .limit(1)
        .maybeSingle();

    if (result.data) {
      return result.data;
    }
  }

  return null;
}

function firstName(
  existing,
  nameFields,
  fallback
) {
  for (
    const field of nameFields
  ) {
    const value =
      cleanText(
        existing?.[field]
      );

    if (value) {
      return value;
    }
  }

  return cleanText(fallback);
}

function buildPayload(
  type,
  existing,
  place,
  {
    id,
    name,
    province,
  }
) {
  const photos =
    photoUrls(place);

  const metadata =
    googleMetadata(place);

  if (type === "restaurant") {
    return {
      place_id:
        existing?.place_id ??
        id ??
        place.id,

      place_name_th:
        place?.displayName?.text ??
        existing?.place_name_th ??
        name ??
        null,

      place_name_en:
        existing?.place_name_en ??
        null,

      place_address:
        place?.formattedAddress ??
        existing?.place_address ??
        null,

      place_phone:
        place?.nationalPhoneNumber ??
        place
          ?.internationalPhoneNumber ??
        existing?.place_phone ??
        null,

      place_website:
        place?.websiteUri ??
        existing?.place_website ??
        null,

      place_type:
        place?.primaryType ??
        existing?.place_type ??
        "restaurant",

      province_name_th:
        province ??
        existing
          ?.province_name_th ??
        null,

      latitude:
        place?.location?.latitude ??
        existing?.latitude ??
        null,

      longitude:
        place?.location?.longitude ??
        existing?.longitude ??
        null,

      images:
        photos.length > 0
          ? photos
          : (
              Array.isArray(
                existing?.images
              )
                ? existing.images
                : []
            ),

      rating:
        place?.rating ??
        existing?.rating ??
        null,

      user_ratings_total:
        place?.userRatingCount ??
        existing
          ?.user_ratings_total ??
        null,

      ...metadata,

      updated_at:
        new Date().toISOString(),
    };
  }

  if (type === "accommodation") {
    return {
      acc_id:
        existing?.acc_id ??
        id ??
        place.id,

      acc_name_th:
        place?.displayName?.text ??
        existing?.acc_name_th ??
        name ??
        null,

      acc_name_en:
        existing?.acc_name_en ??
        null,

      acc_address:
        place?.formattedAddress ??
        existing?.acc_address ??
        null,

      province_name_th:
        province ??
        existing
          ?.province_name_th ??
        null,

      latitude:
        place?.location?.latitude ??
        existing?.latitude ??
        null,

      longitude:
        place?.location?.longitude ??
        existing?.longitude ??
        null,

      acc_tel:
        place?.nationalPhoneNumber ??
        place
          ?.internationalPhoneNumber ??
        existing?.acc_tel ??
        null,

      acc_website:
        place?.websiteUri ??
        existing?.acc_website ??
        null,

      images:
        photos.length > 0
          ? photos
          : (
              Array.isArray(
                existing?.images
              )
                ? existing.images
                : []
            ),

      rating:
        place?.rating ??
        existing?.rating ??
        null,

      user_ratings_total:
        place?.userRatingCount ??
        existing
          ?.user_ratings_total ??
        null,

      ...metadata,

      acc_updated_date:
        new Date().toISOString(),
    };
  }

  const existingVisitorCount =
    Number(
      existing?.visitor_count
    );

  return {
    att_id:
      existing?.att_id ??
      id ??
      place.id,

    name_th:
      place?.displayName?.text ??
      existing?.name_th ??
      name ??
      null,

    name_en:
      existing?.name_en ??
      null,

    type:
      existing?.type ??
      place?.primaryType ??
      null,

    province:
      province ??
      existing?.province ??
      null,

    latitude:
      place?.location?.latitude ??
      existing?.latitude ??
      null,

    longitude:
      place?.location?.longitude ??
      existing?.longitude ??
      null,

    tel:
      place?.nationalPhoneNumber ??
      place
        ?.internationalPhoneNumber ??
      existing?.tel ??
      null,

    website:
      place?.websiteUri ??
      existing?.website ??
      null,

    images:
      photos.length > 0
        ? photos
        : (
            Array.isArray(
              existing?.images
            )
              ? existing.images
              : []
          ),

    avg_rating:
      place?.rating ??
      existing?.avg_rating ??
      0,

    visitor_count:
      Number.isFinite(
        existingVisitorCount
      ) &&
      existingVisitorCount > 0
        ? existingVisitorCount
        : (
            place?.userRatingCount ??
            existing?.visitor_count ??
            0
          ),

    ...metadata,

    updated_at:
      new Date().toISOString(),
  };
}

router.post(
  "/enrich-place-detail",
  async (req, res) => {
    try {
      const {
        type = "attraction",
        id = null,
        google_place_id = null,
        name = null,
        province = null,
      } = req.body ?? {};

      if (
        ![
          "attraction",
          "restaurant",
          "accommodation",
        ].includes(type)
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid place detail type",
          });
      }

      if (!GOOGLE_PLACES_API_KEY) {
        return res
          .status(503)
          .json({
            error:
              "GOOGLE_PLACES_API_KEY is not configured",
          });
      }

      const config =
        entityConfig(type);

      const existing =
        await findExisting(
          type,
          id,
          google_place_id
        );

      if (
        existing &&
        hasCompleteGoogleSnapshot(
          existing
        )
      ) {
        return res.json({
          success: true,
          cached: true,
          skipped_google_api: true,
          type,
          entity: existing,
          google_place_data:
            existing.google_place_data,
        });
      }

      const resolvedName =
        firstName(
          existing,
          config.nameFields,
          name
        );

      const resolvedProvince =
        cleanText(
          province ??
          existing?.[
            config.provinceField
          ]
        );

      let place = null;

      const directGooglePlaceId =
        cleanText(
          google_place_id ??
          existing?.google_place_id ??
          (
            type === "restaurant"
              ? existing?.place_id
              : null
          )
        );

      if (directGooglePlaceId) {
        try {
          place =
            await getPlaceDetails(
              directGooglePlaceId
            );
        } catch (error) {
          console.warn(
            "⚠️ PLACE DETAIL BY ID FAILED:",
            error.message
          );
        }
      }

      if (
        !place &&
        resolvedName
      ) {
        place =
          await searchPlace(
            resolvedName,
            resolvedProvince
          );
      }

      if (!place?.id) {
        return res
          .status(404)
          .json({
            error:
              "ไม่พบข้อมูล Google Places สำหรับรายการนี้",
          });
      }

      const payload =
        buildPayload(
          type,
          existing,
          place,
          {
            id,
            name: resolvedName,
            province:
              resolvedProvince,
          }
        );

      if (
        !payload[
          config.primaryKey
        ]
      ) {
        return res
          .status(422)
          .json({
            error:
              "ไม่สามารถระบุรหัสสำหรับบันทึกข้อมูลได้",
          });
      }

      const {
        data: saved,
        error: saveError,
      } =
        await supabase
          .from(config.table)
          .upsert(
            payload,
            {
              onConflict:
                config.primaryKey,
            }
          )
          .select("*")
          .single();

      if (saveError) {
        console.error(
          "❌ ENRICH PLACE SAVE ERROR:",
          saveError
        );

        return res
          .status(500)
          .json({
            error:
              "บันทึกข้อมูลที่ดึงมาไม่สำเร็จ",
            details:
              saveError.message,
          });
      }

      return res.json({
        success: true,
        type,
        entity: saved,
        google_place_data:
          place,
      });
    } catch (error) {
      console.error(
        "❌ ENRICH PLACE DETAIL ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            error?.message ??
            "ไม่สามารถดึงข้อมูลรายละเอียดได้",
        });
    }
  }
);

export default router;
