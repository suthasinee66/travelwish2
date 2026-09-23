import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router =
  express.Router();

const GOOGLE_PLACES_API_KEY =
  process.env
    .GOOGLE_PLACES_API_KEY;

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

function cleanText(
  value
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const decoded =
    value
      .replace(
        /&amp;/g,
        "&"
      )
      .replace(
        /&quot;/g,
        '"'
      )
      .replace(
        /&#39;/g,
        "'"
      )
      .replace(
        /&lt;/g,
        "<"
      )
      .replace(
        /&gt;/g,
        ">"
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  return (
    decoded ||
    null
  );
}

function safeUrl(
  value
) {
  try {
    const parsed =
      new URL(
        String(
          value ?? ""
        ).trim()
      );

    if (
      parsed.protocol !==
        "http:" &&
      parsed.protocol !==
        "https:"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function providerFromUrl(
  url
) {
  const host =
    String(
      url?.hostname ?? ""
    )
      .toLowerCase()
      .replace(
        /^www\./,
        ""
      );

  if (
    host.includes(
      "google."
    ) ||
    host.includes(
      "goo.gl"
    )
  ) {
    return "google_maps";
  }

  const known = [
    [
      "booking.com",
      "Booking.com",
    ],
    [
      "agoda.com",
      "Agoda",
    ],
    [
      "expedia.",
      "Expedia",
    ],
    [
      "trip.com",
      "Trip.com",
    ],
    [
      "hotels.com",
      "Hotels.com",
    ],
    [
      "airbnb.",
      "Airbnb",
    ],
    [
      "traveloka.",
      "Traveloka",
    ],
  ];

  const matched =
    known.find(
      ([domain]) =>
        host.includes(
          domain
        )
    );

  if (matched) {
    return matched[1];
  }

  return host ||
    "booking_link";
}

function getMeta(
  html,
  key
) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`,
      "i"
    ),
  ];

  for (
    const pattern
    of patterns
  ) {
    const match =
      html.match(
        pattern
      );

    if (match?.[1]) {
      return cleanText(
        match[1]
      );
    }
  }

  return null;
}

function getTitleFromHtml(
  html
) {
  return (
    getMeta(
      html,
      "og:title"
    ) ??
    getMeta(
      html,
      "twitter:title"
    ) ??
    cleanText(
      html.match(
        /<title[^>]*>([^<]+)<\/title>/i
      )?.[1]
    )
  );
}

function getNameFromGoogleUrl(
  url
) {
  const raw =
    String(url ?? "");

  const placeMatch =
    raw.match(
      /\/maps\/place\/([^/@?]+)/i
    );

  if (
    placeMatch?.[1]
  ) {
    try {
      return cleanText(
        decodeURIComponent(
          placeMatch[1]
        )
          .replace(
            /\+/g,
            " "
          )
      );
    } catch {
      return cleanText(
        placeMatch[1]
      );
    }
  }

  try {
    const parsed =
      new URL(raw);

    const q =
      parsed.searchParams.get(
        "q"
      ) ??
      parsed.searchParams.get(
        "query"
      );

    return cleanText(q);
  } catch {
    return null;
  }
}


function titleCaseSlug(
  value
) {
  return cleanText(
    String(value ?? "")
      .replace(
        /\.(html?|aspx?)$/i,
        ""
      )
      .replace(
        /[_-]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .split(" ")
      .map(word => {
        const upperKeep =
          new Set([
            "uhg",
            "ibis",
            "novotel",
            "oyo",
            "b2",
          ]);

        if (
          upperKeep.has(
            word.toLowerCase()
          )
        ) {
          return word.toUpperCase();
        }

        return word
          ? (
              word[0].toUpperCase() +
              word.slice(1)
            )
          : "";
      })
      .join(" ")
  );
}

function getNameFromBookingUrl(
  url
) {
  try {
    const parsed =
      new URL(
        String(url ?? "")
      );

    const host =
      parsed.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    const segments =
      parsed.pathname
        .split("/")
        .filter(Boolean)
        .map(segment => {
          try {
            return decodeURIComponent(
              segment
            );
          } catch {
            return segment;
          }
        });

    if (
      host.includes(
        "agoda.com"
      )
    ) {
      const hotelIndex =
        segments.findIndex(
          segment =>
            segment.toLowerCase() ===
            "hotel"
        );

      const slug =
        hotelIndex > 0
          ? segments[
              hotelIndex - 1
            ]
          : segments.find(
              segment =>
                ![
                  "th-th",
                  "en-gb",
                  "en-us",
                  "hotel",
                ].includes(
                  segment.toLowerCase()
                ) &&
                !segment
                  .toLowerCase()
                  .endsWith(".html")
            );

      return titleCaseSlug(
        slug
      );
    }

    if (
      host.includes(
        "booking.com"
      )
    ) {
      const hotelIndex =
        segments.findIndex(
          segment =>
            segment.toLowerCase() ===
            "hotel"
        );

      const slug =
        hotelIndex >= 0
          ? segments[
              hotelIndex + 2
            ] ??
            segments[
              hotelIndex + 1
            ]
          : segments[
              segments.length - 1
            ];

      return titleCaseSlug(
        slug
      );
    }

    if (
      host.includes(
        "trip.com"
      ) ||
      host.includes(
        "traveloka."
      ) ||
      host.includes(
        "hotels.com"
      )
    ) {
      const slug =
        [...segments]
          .reverse()
          .find(segment =>
            segment &&
            !/^\d+$/.test(
              segment
            )
          );

      return titleCaseSlug(
        slug
      );
    }

    return null;
  } catch {
    return null;
  }
}

function coordinatesFromUrl(
  url
) {
  const raw =
    String(url ?? "");

  const atMatch =
    raw.match(
      /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i
    );

  if (atMatch) {
    return {
      latitude:
        Number(
          atMatch[1]
        ),
      longitude:
        Number(
          atMatch[2]
        ),
    };
  }

  const googleData =
    raw.match(
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i
    );

  if (googleData) {
    return {
      latitude:
        Number(
          googleData[1]
        ),
      longitude:
        Number(
          googleData[2]
        ),
    };
  }

  return null;
}

function normalizeTitle(
  title,
  provider
) {
  let value =
    cleanText(title);

  if (!value) {
    return null;
  }

  const suffixes = [
    /\s*[|\-–—]\s*Booking\.com.*$/i,
    /\s*[|\-–—]\s*Agoda.*$/i,
    /\s*[|\-–—]\s*Expedia.*$/i,
    /\s*[|\-–—]\s*Trip\.com.*$/i,
    /\s*[|\-–—]\s*Hotels\.com.*$/i,
    /\s*[|\-–—]\s*Traveloka.*$/i,
    /\s*[|\-–—]\s*Google Maps.*$/i,
  ];

  for (
    const pattern
    of suffixes
  ) {
    value =
      value.replace(
        pattern,
        ""
      );
  }

  if (
    provider &&
    value.toLowerCase() ===
      String(provider)
        .toLowerCase()
  ) {
    return null;
  }

  return cleanText(value);
}

async function searchAccommodationWithGoogle(
  name,
  province
) {
  if (
    !GOOGLE_PLACES_API_KEY ||
    !name
  ) {
    return null;
  }

  const response =
    await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method:
          "POST",

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
            "places.websiteUri",
            "places.googleMapsUri",
            "places.nationalPhoneNumber",
            "places.internationalPhoneNumber",
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

        body:
          JSON.stringify({
            textQuery:
              [
                name,
                province,
                "Thailand hotel accommodation",
              ]
                .filter(
                  Boolean
                )
                .join(" "),

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
    const text =
      await response.text();

    throw new Error(
      `Google Places accommodation search failed: ${text}`
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

  const hotelTypes =
    new Set([
      "hotel",
      "lodging",
      "resort_hotel",
      "motel",
      "hostel",
      "guest_house",
      "bed_and_breakfast",
      "extended_stay_hotel",
    ]);

  const normalizedName =
    String(name)
      .toLowerCase();

  const normalizedProvince =
    String(
      province ?? ""
    )
      .toLowerCase();

  const ranked =
    places
      .map(place => {
        const title =
          String(
            place.displayName
              ?.text ?? ""
          )
            .toLowerCase();

        const address =
          String(
            place.formattedAddress ??
              ""
          )
            .toLowerCase();

        const types =
          Array.isArray(
            place.types
          )
            ? place.types
            : [];

        let score = 0;

        if (
          title ===
          normalizedName
        ) {
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
          score += 4;
        }

        if (
          types.some(
            type =>
              hotelTypes.has(
                type
              )
          )
        ) {
          score += 4;
        }

        return {
          place,
          score,
        };
      })
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  return (
    ranked[0]?.place ??
    null
  );
}

function googlePhotoUrls(
  place
) {
  if (
    !GOOGLE_PLACES_API_KEY ||
    !Array.isArray(
      place?.photos
    )
  ) {
    return [];
  }

  return place.photos
    .slice(0, 5)
    .map(photo =>
      photo?.name
        ? (
            `https://places.googleapis.com/v1/${photo.name}/media` +
            `?maxWidthPx=800&key=${GOOGLE_PLACES_API_KEY}`
          )
        : null
    )
    .filter(Boolean);
}

function googlePlaceMetadata(
  place
) {
  if (!place) {
    return {
      google_maps_uri: null,
      google_primary_type: null,
      google_types: [],
      google_business_status: null,
      google_opening_hours: null,
      google_address_components: null,
      google_price_level: null,
      google_editorial_summary: null,
      google_photo_names: [],
      google_place_data: null,
      google_last_synced_at: null,
    };
  }

  return {
    google_maps_uri:
      place.googleMapsUri ??
      null,

    google_primary_type:
      place.primaryType ??
      null,

    google_types:
      Array.isArray(
        place.types
      )
        ? place.types
        : [],

    google_business_status:
      place.businessStatus ??
      null,

    google_opening_hours:
      place.regularOpeningHours ??
      null,

    google_address_components:
      Array.isArray(
        place.addressComponents
      )
        ? place.addressComponents
        : null,

    google_price_level:
      place.priceLevel ??
      null,

    google_editorial_summary:
      place.editorialSummary?.text ??
      null,

    google_photo_names:
      Array.isArray(
        place.photos
      )
        ? place.photos
            .map(
              photo =>
                photo?.name ??
                null
            )
            .filter(Boolean)
        : [],

    google_place_data:
      place,

    google_last_synced_at:
      new Date()
        .toISOString(),
  };
}

async function findExistingAccommodation(
  googlePlaceId,
  name,
  province
) {
  if (googlePlaceId) {
    const byGoogle =
      await supabase
        .from("accommodation")
        .select("*")
        .eq(
          "google_place_id",
          googlePlaceId
        )
        .limit(1)
        .maybeSingle();

    if (byGoogle.data) {
      return byGoogle.data;
    }
  }

  if (name) {
    const byName =
      await supabase
        .from("accommodation")
        .select("*")
        .eq(
          "province_name_th",
          province
        )
        .ilike(
          "acc_name_th",
          name
        )
        .limit(1)
        .maybeSingle();

    if (byName.data) {
      return byName.data;
    }
  }

  return null;
}

function externalAccommodationId(
  googlePlaceId,
  finalUrl
) {
  if (googlePlaceId) {
    return googlePlaceId;
  }

  return `external:${Buffer.from(
    finalUrl
  )
    .toString("base64url")
    .slice(0, 28)}`;
}

router.post(
  "/resolve-accommodation-link",
  async (
    req,
    res
  ) => {
    try {
      const {
        url,
        province,
      } =
        req.body ?? {};

      const parsed =
        safeUrl(url);

      if (!parsed) {
        return res
          .status(400)
          .json({
            error:
              "ลิงก์ที่พักไม่ถูกต้อง",
          });
      }

      let finalUrl =
        parsed.toString();

      let html = "";

      try {
        const response =
          await axios.get(
            finalUrl,
            {
              timeout:
                12000,

              maxRedirects:
                8,

              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36",

                "Accept-Language":
                  "th-TH,th;q=0.9,en;q=0.8",
              },

              validateStatus:
                status =>
                  status >= 200 &&
                  status < 400,
            }
          );

        html =
          typeof response.data ===
            "string"
            ? response.data
            : "";

        finalUrl =
          response.request
            ?.res
            ?.responseUrl ??
          response.config
            ?.url ??
          finalUrl;
      } catch (error) {
        console.warn(
          "⚠️ ACCOMMODATION LINK FETCH FAILED:",
          error.message
        );
      }

      const resolvedUrl =
        safeUrl(
          finalUrl
        ) ??
        parsed;

      const provider =
        providerFromUrl(
          resolvedUrl
        );

      const googleUrlName =
        getNameFromGoogleUrl(
          finalUrl
        ) ??
        getNameFromGoogleUrl(
          parsed.toString()
        );

      const bookingUrlName =
        getNameFromBookingUrl(
          finalUrl
        ) ??
        getNameFromBookingUrl(
          parsed.toString()
        );

      const htmlTitle =
        html
          ? getTitleFromHtml(
              html
            )
          : null;

      const name =
        normalizeTitle(
          googleUrlName ??
          bookingUrlName ??
          htmlTitle,
          provider
        );

      const directCoords =
        coordinatesFromUrl(
          finalUrl
        ) ??
        coordinatesFromUrl(
          parsed.toString()
        );

      let googlePlace =
        null;

      if (name) {
        try {
          googlePlace =
            await searchAccommodationWithGoogle(
              name,
              province
            );
        } catch (error) {
          console.warn(
            "⚠️ ACCOMMODATION GOOGLE VERIFY FAILED:",
            error.message
          );
        }
      }

      const latitude =
        Number(
          googlePlace
            ?.location
            ?.latitude ??
          directCoords
            ?.latitude
        );

      const longitude =
        Number(
          googlePlace
            ?.location
            ?.longitude ??
          directCoords
            ?.longitude
        );

      const finalName =
        cleanText(
          googlePlace
            ?.displayName
            ?.text
        ) ??
        name;

      if (
        !finalName ||
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
              "อ่านชื่อหรือพิกัดที่พักจากลิงก์ไม่ได้ กรุณาลองลิงก์ Google Maps ของที่พัก",
            provider,
            resolved_url:
              finalUrl,
          });
      }

      const googlePlaceId =
        googlePlace?.id ??
        null;

      const existing =
        await findExistingAccommodation(
          googlePlaceId,
          finalName,
          province
        );

      const images =
        googlePhotoUrls(
          googlePlace
        );

      const payload = {
        acc_id:
          existing?.acc_id ??
          externalAccommodationId(
            googlePlaceId,
            finalUrl
          ),

        acc_name_th:
          finalName,

        acc_name_en:
          existing?.acc_name_en ??
          null,

        acc_address:
          googlePlace
            ?.formattedAddress ??
          getMeta(
            html,
            "og:description"
          ) ??
          existing?.acc_address ??
          null,

        province_name_th:
          province ??
          existing?.province_name_th ??
          null,

        latitude,
        longitude,

        star_level:
          existing?.star_level ??
          null,

        accom_price_name:
          existing?.accom_price_name ??
          null,

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

        google_place_id:
          googlePlaceId ??
          existing?.google_place_id ??
          null,

        acc_website:
          googlePlace
            ?.websiteUri ??
          existing?.acc_website ??
          null,

        acc_tel:
          googlePlace
            ?.nationalPhoneNumber ??
          googlePlace
            ?.internationalPhoneNumber ??
          existing?.acc_tel ??
          null,

        ...googlePlaceMetadata(
          googlePlace
        ),

        rating:
          googlePlace
            ?.rating ??
          existing?.rating ??
          null,

        user_ratings_total:
          googlePlace
            ?.userRatingCount ??
          existing?.user_ratings_total ??
          null,

        data_source:
          provider ===
            "google_maps"
            ? "google_maps"
            : "booking_link",

        source_url:
          parsed.toString(),

        booking_provider:
          provider,

        discovered_by_ai:
          existing?.discovered_by_ai ??
          false,

        ai_model:
          existing?.ai_model ??
          null,

        ai_discovered_at:
          existing?.ai_discovered_at ??
          null,

        acc_updated_date:
          new Date()
            .toISOString(),
      };

      const {
        data: saved,
        error: saveError,
      } =
        await supabase
          .from("accommodation")
          .upsert(
            payload,
            {
              onConflict:
                "acc_id",
            }
          )
          .select("*")
          .single();

      if (saveError) {
        console.error(
          "❌ SAVE ACCOMMODATION ERROR:",
          saveError
        );

        return res
          .status(500)
          .json({
            error:
              "บันทึกข้อมูลที่พักลง Supabase ไม่สำเร็จ",
            details:
              saveError.message,
          });
      }

      return res.json({
        success:
          true,

        accommodation: {
          ...saved,

          source:
            saved.data_source ===
              "google_maps"
              ? "google_maps"
              : "booking_link",

          source_url:
            saved.source_url ??
            parsed.toString(),

          resolved_url:
            finalUrl,

          booking_provider:
            saved.booking_provider ??
            provider,

          website:
            saved.acc_website ??
            null,
        },
      });
    } catch (error) {
      console.error(
        "❌ RESOLVE ACCOMMODATION LINK ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            error.message ??
            "ไม่สามารถอ่านลิงก์ที่พักได้",
        });
    }
  }
);

router.post(
  "/resolve-ai-accommodation",
  async (
    req,
    res
  ) => {
    try {
      const {
        accommodation_id,
        name,
        province,
        ai_model,
      } =
        req.body ?? {};

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

      const googlePlace =
        await searchAccommodationWithGoogle(
          name,
          province
        );

      let existing =
        null;

      if (accommodation_id) {
        const {
          data
        } =
          await supabase
            .from(
              "accommodation"
            )
            .select("*")
            .eq(
              "acc_id",
              String(
                accommodation_id
              )
            )
            .maybeSingle();

        existing =
          data ??
          null;
      }

      if (!existing) {
        existing =
          await findExistingAccommodation(
            googlePlace?.id ??
              null,
            googlePlace
              ?.displayName
              ?.text ??
              name,
            province
          );
      }

      if (!existing) {
        return res
          .status(404)
          .json({
            error:
              "ไม่พบที่พักในฐานข้อมูลสำหรับการ enrich",
          });
      }

      if (!googlePlace) {
        return res.json({
          success: true,
          enriched: false,
          accommodation:
            existing,
        });
      }

      const freshImages =
        googlePhotoUrls(
          googlePlace
        );

      const payload = {
        ...existing,

        acc_name_th:
          googlePlace
            ?.displayName
            ?.text ??
          existing.acc_name_th,

        acc_address:
          googlePlace
            ?.formattedAddress ??
          existing.acc_address,

        latitude:
          googlePlace
            ?.location
            ?.latitude ??
          existing.latitude,

        longitude:
          googlePlace
            ?.location
            ?.longitude ??
          existing.longitude,

        acc_tel:
          googlePlace
            ?.nationalPhoneNumber ??
          googlePlace
            ?.internationalPhoneNumber ??
          existing.acc_tel ??
          null,

        acc_website:
          googlePlace
            ?.websiteUri ??
          existing.acc_website ??
          null,

        images:
          freshImages.length > 0
            ? freshImages
            : (
                Array.isArray(
                  existing.images
                )
                  ? existing.images
                  : []
              ),

        google_place_id:
          googlePlace.id ??
          existing.google_place_id ??
          null,

        rating:
          googlePlace.rating ??
          existing.rating ??
          null,

        user_ratings_total:
          googlePlace
            .userRatingCount ??
          existing
            .user_ratings_total ??
          null,

        ...googlePlaceMetadata(
          googlePlace
        ),

        data_source:
          existing.data_source ??
          "dataset",

        discovered_by_ai:
          true,

        ai_model:
          ai_model ??
          existing.ai_model ??
          null,

        ai_discovered_at:
          existing
            .ai_discovered_at ??
          new Date()
            .toISOString(),

        acc_updated_date:
          new Date()
            .toISOString(),
      };

      const {
        data: saved,
        error
      } =
        await supabase
          .from(
            "accommodation"
          )
          .upsert(
            payload,
            {
              onConflict:
                "acc_id",
            }
          )
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        enriched: true,
        accommodation:
          saved,
      });
    } catch (error) {
      console.error(
        "❌ resolve-ai-accommodation error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            error?.message ??
            "Accommodation enrichment failed",
        });
    }
  }
);


router.get(
  "/accommodation-image",
  async (
    req,
    res
  ) => {
    try {
      const accId =
        String(
          req.query
            ?.acc_id ??
          ""
        )
          .trim();

      if (!accId) {
        return res
          .status(400)
          .json({
            error:
              "acc_id is required",
          });
      }

      if (
        !GOOGLE_PLACES_API_KEY
      ) {
        return res
          .status(503)
          .json({
            error:
              "Google Places API is not configured",
          });
      }

      const {
        data:
          accommodation,
        error:
          accommodationError,
      } =
        await supabase
          .from(
            "accommodation"
          )
          .select(
            [
              "acc_id",
              "acc_name_th",
              "acc_name_en",
              "province_name_th",
              "google_place_id",
              "images",
            ].join(",")
          )
          .eq(
            "acc_id",
            accId
          )
          .maybeSingle();

      if (
        accommodationError
      ) {
        throw accommodationError;
      }

      if (!accommodation) {
        return res
          .status(404)
          .json({
            error:
              "Accommodation not found",
          });
      }

      const existingImage =
        Array.isArray(
          accommodation.images
        )
          ? accommodation.images
              .find(
                image =>
                  typeof image ===
                    "string" &&
                  image.length > 0
              )
          : null;

      if (existingImage) {
        res.set(
          "Cache-Control",
          "public, max-age=86400"
        );

        return res.redirect(
          302,
          existingImage
        );
      }

      let googlePlace = null;

      if (
        accommodation
          .google_place_id
      ) {
        const detailsResponse =
          await fetch(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(
              accommodation
                .google_place_id
            )}`,
            {
              headers: {
                "X-Goog-Api-Key":
                  GOOGLE_PLACES_API_KEY,

                "X-Goog-FieldMask":
                  "id,photos",
              },
            }
          );

        if (
          detailsResponse.ok
        ) {
          googlePlace =
            await detailsResponse
              .json();
        } else {
          console.warn(
            "⚠️ ACCOMMODATION PHOTO PLACE DETAILS FAILED:",
            detailsResponse
              .status,
            await detailsResponse
              .text()
          );
        }
      }

      if (
        !googlePlace ||
        !Array.isArray(
          googlePlace.photos
        ) ||
        googlePlace
          .photos
          .length === 0
      ) {
        const name =
          accommodation
            .acc_name_th ??
          accommodation
            .acc_name_en;

        if (!name) {
          return res
            .status(404)
            .end();
        }

        const searchResponse =
          await fetch(
            "https://places.googleapis.com/v1/places:searchText",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "X-Goog-Api-Key":
                  GOOGLE_PLACES_API_KEY,

                "X-Goog-FieldMask":
                  "places.id,places.photos",
              },

              body:
                JSON.stringify({
                  textQuery:
                    [
                      name,
                      accommodation
                        .province_name_th,
                      "Thailand hotel",
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " "
                      ),

                  languageCode:
                    "th",

                  regionCode:
                    "TH",

                  maxResultCount:
                    1,
                }),
            }
          );

        if (
          !searchResponse.ok
        ) {
          console.warn(
            "⚠️ ACCOMMODATION PHOTO SEARCH FAILED:",
            searchResponse
              .status,
            await searchResponse
              .text()
          );

          return res
            .status(404)
            .end();
        }

        const searchData =
          await searchResponse
            .json();

        googlePlace =
          Array.isArray(
            searchData.places
          )
            ? (
                searchData
                  .places[0] ??
                null
              )
            : null;

        if (
          googlePlace?.id &&
          googlePlace.id !==
            accommodation
              .google_place_id
        ) {
          const {
            error:
              updateGoogleIdError,
          } =
            await supabase
              .from(
                "accommodation"
              )
              .update({
                google_place_id:
                  googlePlace.id,
              })
              .eq(
                "acc_id",
                accId
              );

          if (
            updateGoogleIdError
          ) {
            console.warn(
              "⚠️ SAVE ACCOMMODATION GOOGLE PLACE ID FAILED:",
              updateGoogleIdError
            );
          }
        }
      }

      const photoName =
        Array.isArray(
          googlePlace?.photos
        )
          ? googlePlace
              .photos[0]
              ?.name
          : null;

      if (
        !photoName ||
        !String(
          photoName
        ).startsWith(
          "places/"
        )
      ) {
        return res
          .status(404)
          .end();
      }

      const mediaResponse =
        await fetch(
          `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=480&skipHttpRedirect=true&key=${encodeURIComponent(
            GOOGLE_PLACES_API_KEY
          )}`
        );

      if (
        !mediaResponse.ok
      ) {
        console.warn(
          "⚠️ ACCOMMODATION PHOTO MEDIA FAILED:",
          mediaResponse
            .status,
          await mediaResponse
            .text()
        );

        return res
          .status(404)
          .end();
      }

      const mediaData =
        await mediaResponse
          .json();

      if (
        !mediaData
          ?.photoUri
      ) {
        return res
          .status(404)
          .end();
      }

      res.set(
        "Cache-Control",
        "public, max-age=86400"
      );

      return res.redirect(
        302,
        mediaData.photoUri
      );
    } catch (error) {
      console.error(
        "❌ ACCOMMODATION IMAGE ERROR:",
        error
      );

      return res
        .status(500)
        .end();
    }
  }
);

export default router;
