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

function googlePhotoUrls(place) {
  return (place?.photos || [])
    .slice(0, 5)
    .map(photo => {
      if (!photo?.name) return null;

      return (
        `https://places.googleapis.com/v1/${photo.name}/media` +
        `?maxWidthPx=800&key=${GOOGLE_PLACES_API_KEY}`
      );
    })
    .filter(Boolean);
}

function distanceKm(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const values = [
    lat1,
    lon1,
    lat2,
    lon2
  ].map(Number);

  if (
    values.some(value =>
      !Number.isFinite(value)
    )
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const [
    aLat,
    aLon,
    bLat,
    bLon
  ] = values;

  const R = 6371;
  const dLat =
    ((bLat - aLat) * Math.PI) / 180;
  const dLon =
    ((bLon - aLon) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

async function findRestaurant(
  identifier
) {
  const value =
    String(identifier ?? "").trim();

  if (!value) {
    return null;
  }

  // 1) รองรับ planner เก่าที่เก็บ place_id
  {
    const {
      data,
      error
    } = await supabase
      .from("restaurant")
      .select("*")
      .eq("place_id", value)
      .maybeSingle();

    if (error) {
      console.error(
        "Restaurant place_id lookup error:",
        error
      );
    }

    if (data) {
      return data;
    }
  }

  // 2) planner อาจเก็บ Google Place ID โดยตรง
  {
    const {
      data,
      error
    } = await supabase
      .from("restaurant")
      .select("*")
      .eq("google_place_id", value)
      .maybeSingle();

    if (error) {
      console.error(
        "Restaurant google_place_id lookup error:",
        error
      );
    }

    if (data) {
      return data;
    }
  }

  return null;
}

async function getGooglePlaceById(
  googlePlaceId
) {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(
      googlePlaceId
    )}`,
    {
      headers: {
        "X-Goog-Api-Key":
          GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          [
            "id",
            "displayName",
            "formattedAddress",
            "location",
            "photos"
          ].join(",")
      }
    }
  );

  if (!response.ok) {
    const body = await response.text();

    console.error(
      "Google Place details error:",
      response.status,
      body
    );

    return null;
  }

  return response.json();
}

async function searchGoogleRestaurant(
  restaurant
) {
  const name =
    restaurant.place_name_th ||
    restaurant.place_name_en ||
    "";

  if (!name) {
    return null;
  }

  const province =
    restaurant.province_name_th ||
    "";

  const address =
    restaurant.place_address ||
    "";

  const textQuery = [
    name,
    address,
    province,
    "Thailand"
  ]
    .filter(Boolean)
    .join(" ");

  const body = {
    textQuery,
    languageCode: "th",
    regionCode: "TH",
    maxResultCount: 10
  };

  const latitude =
    Number(restaurant.latitude);

  const longitude =
    Number(restaurant.longitude);

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    body.locationBias = {
      circle: {
        center: {
          latitude,
          longitude
        },
        radius: 5000
      }
    };
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
          [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.photos"
          ].join(",")
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const responseBody =
      await response.text();

    console.error(
      "Google Text Search error:",
      response.status,
      responseBody
    );

    return null;
  }

  const json = await response.json();
  const places =
    Array.isArray(json.places)
      ? json.places
      : [];

  if (places.length === 0) {
    return null;
  }

  // ถ้ามีพิกัดเดิม เลือก Google Place ที่ใกล้ที่สุด
  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return places
      .map(place => ({
        place,
        distance: distanceKm(
          latitude,
          longitude,
          place.location?.latitude,
          place.location?.longitude
        )
      }))
      .sort(
        (a, b) =>
          a.distance - b.distance
      )[0]?.place ?? null;
  }

  return places[0] ?? null;
}

async function updateRestaurantGoogleData(
  restaurant,
  googlePlace
) {
  if (!restaurant || !googlePlace?.id) {
    return restaurant;
  }

  const googleImages =
    googlePhotoUrls(googlePlace);

  const updatePayload = {
    google_place_id:
      googlePlace.id
  };

  // รูปร้านใน flow นี้ใช้ Google Places เท่านั้น
  if (googleImages.length > 0) {
    updatePayload.images =
      googleImages;
  }

  const {
    data,
    error
  } = await supabase
    .from("restaurant")
    .update(updatePayload)
    .eq(
      "place_id",
      restaurant.place_id
    )
    .select("*")
    .maybeSingle();

  if (error) {
    console.error(
      "Save restaurant google_place_id error:",
      error
    );

    throw error;
  }

  return data ?? {
    ...restaurant,
    ...updatePayload
  };
}

async function ensureRestaurantGoogleData(
  restaurant
) {
  if (!restaurant) {
    return null;
  }

  let googlePlace = null;

  if (restaurant.google_place_id) {
    googlePlace =
      await getGooglePlaceById(
        restaurant.google_place_id
      );
  }

  if (!googlePlace) {
    googlePlace =
      await searchGoogleRestaurant(
        restaurant
      );
  }

  if (!googlePlace) {
    return restaurant;
  }

  return updateRestaurantGoogleData(
    restaurant,
    googlePlace
  );
}

// =========================================================
// GET /api/restaurant-images?restaurant_id=...
// Resolve place_id/google_place_id -> Google photos
// =========================================================
router.get(
  "/restaurant-images",
  async (req, res) => {
    try {
      if (!GOOGLE_PLACES_API_KEY) {
        return res.status(500).json({
          success: false,
          error:
            "GOOGLE_PLACES_API_KEY is missing"
        });
      }

      const restaurantId =
        String(
          req.query.restaurant_id ||
          req.query.id ||
          ""
        ).trim();

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          error:
            "restaurant_id is required"
        });
      }

      const restaurant =
        await findRestaurant(
          restaurantId
        );

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error:
            "Restaurant not found"
        });
      }

      const updated =
        await ensureRestaurantGoogleData(
          restaurant
        );

      return res.json({
        success: true,
        restaurant: updated,
        google_place_id:
          updated?.google_place_id ??
          null,
        images:
          Array.isArray(updated?.images)
            ? updated.images
            : []
      });
    } catch (error) {
      console.error(
        "restaurant-images error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Unable to load restaurant images"
      });
    }
  }
);

// =========================================================
// POST /api/restaurant-images/sync-missing
// Backfill ร้านเก่าทีละ batch เพื่อลด Google API usage
// body: { limit?: number, province?: string }
// =========================================================
router.post(
  "/restaurant-images/sync-missing",
  async (req, res) => {
    try {
      const limit = Math.min(
        Math.max(
          Number(req.body?.limit) || 20,
          1
        ),
        100
      );

      const province =
        String(
          req.body?.province || ""
        ).trim();

      let query = supabase
        .from("restaurant")
        .select("*")
        .is(
          "google_place_id",
          null
        )
        .limit(limit);

      if (province) {
        query = query.eq(
          "province_name_th",
          province
        );
      }

      const {
        data,
        error
      } = await query;

      if (error) {
        throw error;
      }

      const rows =
        Array.isArray(data)
          ? data
          : [];

      const results = [];

      // ทำทีละร้านเพื่อไม่ยิง Google พร้อมกันจำนวนมาก
      for (const restaurant of rows) {
        try {
          const updated =
            await ensureRestaurantGoogleData(
              restaurant
            );

          results.push({
            place_id:
              restaurant.place_id,
            name:
              restaurant.place_name_th,
            google_place_id:
              updated?.google_place_id ??
              null,
            images:
              Array.isArray(updated?.images)
                ? updated.images.length
                : 0,
            success:
              Boolean(
                updated?.google_place_id
              )
          });
        } catch (error) {
          results.push({
            place_id:
              restaurant.place_id,
            name:
              restaurant.place_name_th,
            google_place_id: null,
            images: 0,
            success: false,
            error:
              error?.message ||
              "sync failed"
          });
        }
      }

      return res.json({
        success: true,
        total: rows.length,
        synced:
          results.filter(
            result => result.success
          ).length,
        results
      });
    } catch (error) {
      console.error(
        "restaurant sync-missing error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Unable to sync restaurants"
      });
    }
  }
);

export default router;
