import express from "express";

const router =
  express.Router();

const GOOGLE_ROUTES_API_KEY =
  process.env.GOOGLE_ROUTES_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_PLACES_API_KEY;

function normalizePoint(
  value
) {
  const latitude =
    Number(
      value?.latitude ??
      value?.lat
    );

  const longitude =
    Number(
      value?.longitude ??
      value?.lng
    );

  if (
    !Number.isFinite(
      latitude
    ) ||
    !Number.isFinite(
      longitude
    )
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function parseDurationSeconds(
  value
) {
  if (
    typeof value !==
    "string"
  ) {
    return 0;
  }

  const match =
    value.match(
      /^([0-9.]+)s$/
    );

  if (!match) {
    return 0;
  }

  return Number(
    match[1]
  ) || 0;
}

router.post(
  "/route-travel-times",
  async (req, res) => {
    try {
      const points =
        (
          Array.isArray(
            req.body?.points
          )
            ? req.body.points
            : []
        )
          .map(
            normalizePoint
          )
          .filter(Boolean);

      if (
        points.length < 2
      ) {
        return res.json({
          success: true,
          source:
            "google_routes",
          legs: [],
        });
      }

      if (
        points.length > 27
      ) {
        return res
          .status(400)
          .json({
            error:
              "Too many route points",
          });
      }

      if (
        !GOOGLE_ROUTES_API_KEY
      ) {
        return res
          .status(500)
          .json({
            error:
              "Google Routes API key is not configured",
          });
      }

      const [
        origin,
        ...rest
      ] = points;

      const destination =
        rest[
          rest.length - 1
        ];

      const intermediates =
        rest
          .slice(
            0,
            -1
          )
          .map(
            point => ({
              location: {
                latLng:
                  point,
              },
            })
          );

      const response =
        await fetch(
          "https://routes.googleapis.com/directions/v2:computeRoutes",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              "X-Goog-Api-Key":
                GOOGLE_ROUTES_API_KEY,

              "X-Goog-FieldMask":
                [
                  "routes.distanceMeters",
                  "routes.duration",
                  "routes.legs.distanceMeters",
                  "routes.legs.duration",
                ].join(","),
            },

            body:
              JSON.stringify({
                origin: {
                  location: {
                    latLng:
                      origin,
                  },
                },

                destination: {
                  location: {
                    latLng:
                      destination,
                  },
                },

                intermediates,

                travelMode:
                  "DRIVE",

                routingPreference:
                  "TRAFFIC_UNAWARE",

                computeAlternativeRoutes:
                  false,

                languageCode:
                  "th",

                units:
                  "METRIC",
              }),
          }
        );

      if (
        !response.ok
      ) {
        const errorText =
          await response.text();

        console.error(
          "❌ GOOGLE ROUTES ERROR:",
          errorText
        );

        return res
          .status(
            response.status
          )
          .json({
            error:
              "Google Routes request failed",
            details:
              errorText,
          });
      }

      const data =
        await response.json();

      const route =
        data?.routes?.[0];

      const legs =
        Array.isArray(
          route?.legs
        )
          ? route.legs.map(
              (
                leg,
                index
              ) => ({
                index,

                distance_meters:
                  Number(
                    leg
                      ?.distanceMeters ??
                    0
                  ),

                duration_seconds:
                  parseDurationSeconds(
                    leg?.duration
                  ),

                duration_minutes:
                  Math.max(
                    1,
                    Math.ceil(
                      parseDurationSeconds(
                        leg?.duration
                      ) / 60
                    )
                  ),
              })
            )
          : [];

      return res.json({
        success: true,
        source:
          "google_routes",
        total_distance_meters:
          Number(
            route
              ?.distanceMeters ??
            0
          ),
        total_duration_seconds:
          parseDurationSeconds(
            route?.duration
          ),
        legs,
      });
    } catch (error) {
      console.error(
        "❌ ROUTE TRAVEL TIMES ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            error?.message ??
            "Route calculation failed",
        });
    }
  }
);

export default router;
