import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router =
  express.Router();

const GOOGLE_PLACES_API_KEY =
  process.env
    .GOOGLE_PLACES_API_KEY;

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
            "places.rating",
            "places.userRatingCount",
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

      return res.json({
        success:
          true,

        accommodation: {
          acc_id:
            googlePlace
              ?.id ??
            `external:${Buffer.from(
              finalUrl
            )
              .toString(
                "base64url"
              )
              .slice(
                0,
                28
              )}`,

          acc_name_th:
            finalName,

          acc_name_en:
            null,

          acc_address:
            googlePlace
              ?.formattedAddress ??
            getMeta(
              html,
              "og:description"
            ) ??
            null,

          province_name_th:
            province ??
            null,

          latitude,

          longitude,

          star_level:
            null,

          accom_price_name:
            null,

          images:
            googlePhotoUrls(
              googlePlace
            ),

          google_place_id:
            googlePlace
              ?.id ??
            null,

          website:
            googlePlace
              ?.websiteUri ??
            null,

          rating:
            googlePlace
              ?.rating ??
            null,

          user_ratings_total:
            googlePlace
              ?.userRatingCount ??
            null,

          source:
            provider ===
              "google_maps"
              ? "google_maps"
              : "booking_link",

          source_url:
            parsed.toString(),

          resolved_url:
            finalUrl,

          booking_provider:
            provider,
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

export default router;
