import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY;

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  throw new Error(
    "Missing GOOGLE_PLACES_API_KEY"
  );
}

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const PAGE_SIZE = Number(
  process.env.BACKFILL_PAGE_SIZE ??
    100
);

const DELAY_MS = Number(
  process.env.BACKFILL_DELAY_MS ??
    120
);

const MAX_RETRIES = Number(
  process.env.BACKFILL_MAX_RETRIES ??
    3
);

const LIMIT = Number(
  process.env.BACKFILL_LIMIT ??
    0
);

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function fetchPlaceOpeningHours(
  placeId
) {
  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(
      placeId
    )}?languageCode=th&regionCode=TH`;

  let lastError = null;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      const response = await fetch(url, {
        headers: {
          "X-Goog-Api-Key":
            GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            [
              "id",
              "currentOpeningHours",
              "regularOpeningHours",
            ].join(","),
        },
      });

      if (response.ok) {
        return await response.json();
      }

      const text =
        await response.text();

      lastError = new Error(
        `Google Places ${response.status}: ${text}`
      );

      if (
        response.status === 429 ||
        response.status >= 500
      ) {
        await sleep(
          DELAY_MS *
            attempt *
            3
        );

        continue;
      }

      throw lastError;
    } catch (error) {
      lastError = error;

      if (
        attempt <
        MAX_RETRIES
      ) {
        await sleep(
          DELAY_MS *
            attempt *
            3
        );
      }
    }
  }

  throw lastError;
}

async function loadMissingRestaurants() {
  const restaurants = [];

  let from = 0;

  while (true) {
    const to =
      from +
      PAGE_SIZE -
      1;

    const {
      data,
      error,
    } = await supabase
      .from("restaurant")
      .select(
        [
          "place_id",
          "google_place_id",
          "place_name_th",
          "place_name_en",
        ].join(",")
      )
      .is(
        "google_opening_hours",
        null
      )
      .not(
        "google_place_id",
        "is",
        null
      )
      .range(from, to);

    if (error) {
      throw error;
    }

    const rows =
      data ?? [];

    restaurants.push(
      ...rows
    );

    if (
      rows.length <
      PAGE_SIZE
    ) {
      break;
    }

    from += PAGE_SIZE;

    if (
      LIMIT > 0 &&
      restaurants.length >=
        LIMIT
    ) {
      break;
    }
  }

  return LIMIT > 0
    ? restaurants.slice(
        0,
        LIMIT
      )
    : restaurants;
}

async function updateRestaurant(
  restaurant,
  place
) {
  const openingHours = {
    current:
      place
        ?.currentOpeningHours ??
      null,
    regular:
      place
        ?.regularOpeningHours ??
      null,
  };

  if (
    !openingHours.current &&
    !openingHours.regular
  ) {
    return {
      updated: false,
      reason:
        "Google has no opening hours",
    };
  }

  const {
    error,
  } = await supabase
    .from("restaurant")
    .update({
      google_opening_hours:
        openingHours,
      google_last_synced_at:
        new Date().toISOString(),
    })
    .eq(
      "place_id",
      restaurant.place_id
    );

  if (error) {
    throw error;
  }

  return {
    updated: true,
  };
}

async function main() {
  console.log(
    "======================================"
  );
  console.log(
    "🕒 Restaurant Opening Hours Backfill"
  );
  console.log(
    "======================================"
  );

  const restaurants =
    await loadMissingRestaurants();

  console.log(
    `📦 ร้านที่ต้องเติมเวลา: ${restaurants.length} ร้าน`
  );

  if (
    restaurants.length === 0
  ) {
    console.log(
      "✅ ไม่มีร้านที่ต้อง backfill"
    );

    return;
  }

  let updated = 0;
  let noHours = 0;
  let failed = 0;

  for (
    let index = 0;
    index <
    restaurants.length;
    index += 1
  ) {
    const restaurant =
      restaurants[index];

    const placeId =
      restaurant.google_place_id ??
      restaurant.place_id;

    const name =
      restaurant.place_name_th ??
      restaurant.place_name_en ??
      placeId;

    console.log(
      `[${index + 1}/${restaurants.length}] 🔎 ${name}`
    );

    try {
      const place =
        await fetchPlaceOpeningHours(
          placeId
        );

      const result =
        await updateRestaurant(
          restaurant,
          place
        );

      if (result.updated) {
        updated += 1;

        console.log(
          "   ✅ บันทึกเวลาแล้ว"
        );
      } else {
        noHours += 1;

        console.log(
          "   ⚪ Google ไม่มีเวลาทำการ"
        );
      }
    } catch (error) {
      failed += 1;

      console.error(
        "   ❌ ล้มเหลว:",
        error?.message ??
          error
      );
    }

    if (
      index <
      restaurants.length -
        1
    ) {
      await sleep(
        DELAY_MS
      );
    }
  }

  console.log(
    "\n======================================"
  );
  console.log(
    "📊 Backfill summary"
  );
  console.log(
    `✅ Updated: ${updated}`
  );
  console.log(
    `⚪ No hours: ${noHours}`
  );
  console.log(
    `❌ Failed: ${failed}`
  );
  console.log(
    "======================================"
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    "❌ Backfill crashed:",
    error
  );

  process.exitCode = 1;
});
