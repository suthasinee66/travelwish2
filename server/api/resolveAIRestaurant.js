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

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function googlePhotoUrls(place) {
  if (
    !GOOGLE_PLACES_API_KEY ||
    !Array.isArray(place?.photos)
  ) {
    return [];
  }

  return place.photos
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
    values.some(
      value =>
        !Number.isFinite(value)
    )
  ) {
    return null;
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
    Math.cos(
      (aLat * Math.PI) / 180
    ) *
    Math.cos(
      (bLat * Math.PI) / 180
    ) *
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

async function searchRestaurant(
  name,
  province
) {
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
            "places.primaryType",
            "places.types",
            "places.nationalPhoneNumber",
            "places.websiteUri",
            "places.rating",
            "places.userRatingCount",
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
      `Google Places restaurant search failed: ${errorText}`
    );
  }

  const data =
    await response.json();

  const places =
    Array.isArray(data.places)
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

  const restaurantTypes =
    new Set([
      "restaurant",
      "cafe",
      "coffee_shop",
      "bakery",
      "bar",
      "meal_takeaway",
      "meal_delivery",
      "breakfast_restaurant",
      "brunch_restaurant",
      "thai_restaurant",
      "seafood_restaurant",
      "fine_dining_restaurant",
      "fast_food_restaurant",
      "food_court",
    ]);

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

        const types =
          Array.isArray(place.types)
            ? place.types
            : [];

        const isRestaurant =
          restaurantTypes.has(
            place.primaryType
          ) ||
          types.some(type =>
            restaurantTypes.has(type)
          );

        if (!isRestaurant) {
          return null;
        }

        let score = 5;

        if (
          title === targetName
        ) {
          score += 10;
        } else if (
          title.includes(targetName) ||
          targetName.includes(title)
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
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.score - a.score
      );

  const best =
    scored[0];

  if (
    !best ||
    best.score < 5
  ) {
    return null;
  }

  return best.place;
}

async function findExistingRestaurant(
  googlePlaceId
) {
  if (!googlePlaceId) {
    return null;
  }

  const byPlaceId =
    await supabase
      .from("restaurant")
      .select("*")
      .eq(
        "place_id",
        googlePlaceId
      )
      .maybeSingle();

  if (byPlaceId.data) {
    return byPlaceId.data;
  }

  const byGooglePlaceId =
    await supabase
      .from("restaurant")
      .select("*")
      .eq(
        "google_place_id",
        googlePlaceId
      )
      .maybeSingle();

  return (
    byGooglePlaceId.data ??
    null
  );
}

async function attachToAttraction(
  attId,
  restaurant
) {
  if (
    !attId ||
    !restaurant?.place_id
  ) {
    return;
  }

  const {
    data: attraction
  } =
    await supabase
      .from("attraction")
      .select(
        "att_id, latitude, longitude"
      )
      .eq(
        "att_id",
        attId
      )
      .maybeSingle();

  if (!attraction) {
    return;
  }

  const distance =
    distanceKm(
      attraction.latitude,
      attraction.longitude,
      restaurant.latitude,
      restaurant.longitude
    );

  const {
    error
  } =
    await supabase
      .from(
        "attraction_restaurant"
      )
      .upsert(
        {
          att_id:
            attId,

          place_id:
            restaurant.place_id,

          distance_km:
            distance,
        },
        {
          onConflict:
            "att_id,place_id",
        }
      );

  if (error) {
    console.warn(
      "⚠️ AI restaurant relation save failed:",
      error.message
    );
  }
}

router.post(
  "/resolve-ai-restaurant",
  async (req, res) => {
    try {
      const {
        name,
        province,
        att_id,
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
        !GOOGLE_PLACES_API_KEY
      ) {
        return res
          .status(500)
          .json({
            error:
              "GOOGLE_PLACES_API_KEY is not configured",
          });
      }

      const verified =
        await searchRestaurant(
          name,
          province
        );

      if (!verified?.id) {
        return res
          .status(404)
          .json({
            error:
              "ไม่สามารถยืนยันร้านอาหารที่ AI แนะนำได้",
            requestedName:
              name,
          });
      }

      const existing =
        await findExistingRestaurant(
          verified.id
        );

      if (existing) {
        await attachToAttraction(
          att_id,
          existing
        );

        return res.json({
          success: true,
          cached: true,
          restaurant:
            existing,
        });
      }

      const restaurant = {
        place_id:
          verified.id,

        google_place_id:
          verified.id,

        place_name_th:
          verified.displayName?.text ??
          name,

        place_name_en:
          null,

        place_address:
          verified.formattedAddress ??
          null,

        place_phone:
          verified.nationalPhoneNumber ??
          null,

        place_website:
          verified.websiteUri ??
          null,

        place_type:
          verified.primaryType ??
          "restaurant",

        province_name_th:
          province,

        latitude:
          verified.location?.latitude ??
          null,

        longitude:
          verified.location?.longitude ??
          null,

        images:
          googlePhotoUrls(
            verified
          ),

        rating:
          verified.rating ??
          null,

        user_ratings_total:
          verified.userRatingCount ??
          null,

        updated_at:
          new Date()
            .toISOString(),
      };

      const {
        data: saved,
        error
      } =
        await supabase
          .from("restaurant")
          .upsert(
            restaurant,
            {
              onConflict:
                "place_id",
            }
          )
          .select("*")
          .single();

      if (error) {
        console.error(
          "❌ SAVE AI RESTAURANT ERROR:",
          error
        );

        return res
          .status(500)
          .json({
            error:
              "บันทึกร้านอาหารที่ AI แนะนำไม่สำเร็จ",
            details:
              error.message,
          });
      }

      await attachToAttraction(
        att_id,
        saved
      );

      return res.json({
        success: true,
        cached: false,
        restaurant:
          saved,
      });
    } catch (error) {
      console.error(
        "❌ resolve-ai-restaurant error:",
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
