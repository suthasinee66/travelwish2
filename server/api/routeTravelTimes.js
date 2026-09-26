import express from "express";

const router =
  express.Router();

function getGoogleRoutesApiKey() {
  if (
    process.env
      .GOOGLE_MAPS_API_KEY
  ) {
    return {
      key:
        process.env
          .GOOGLE_MAPS_API_KEY,
      source:
        "GOOGLE_MAPS_API_KEY",
    };
  }

  return {
    key: null,
    source: null,
  };
}

function estimateTravelLegs(
  points
) {
  const earthRadius =
    6371000;

  const toRad =
    degree =>
      (
        degree *
        Math.PI
      ) /
      180;

  const legs = [];

  for (
    let index = 1;
    index <
    points.length;
    index += 1
  ) {
    const from =
      points[
        index - 1
      ];

    const to =
      points[
        index
      ];

    const dLat =
      toRad(
        to.latitude -
        from.latitude
      );

    const dLng =
      toRad(
        to.longitude -
        from.longitude
      );

    const a =
      Math.sin(
        dLat / 2
      ) ** 2 +
      Math.cos(
        toRad(
          from.latitude
        )
      ) *
        Math.cos(
          toRad(
            to.latitude
          )
        ) *
        Math.sin(
          dLng / 2
        ) ** 2;

    const straightMeters =
      2 *
      earthRadius *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(
          1 - a
        )
      );

    const estimatedRoadMeters =
      straightMeters *
      1.25;

    const estimatedMinutes =
      Math.max(
        3,
        Math.ceil(
          estimatedRoadMeters /
          1000 /
          28 *
          60
        )
      );

    legs.push({
      index:
        index - 1,

      distance_meters:
        Math.round(
          estimatedRoadMeters
        ),

      duration_seconds:
        estimatedMinutes *
        60,

      duration_minutes:
        estimatedMinutes,
    });
  }

  return legs;
}

function sendEstimatedFallback(
  res,
  points,
  reason,
  googleStatus = null
) {
  const legs =
    estimateTravelLegs(
      points
    );

  return res.json({
    success: true,
    source:
      "estimated_fallback",
    fallback_reason:
      reason,
    google_status:
      googleStatus,
    total_distance_meters:
      legs.reduce(
        (
          sum,
          leg
        ) =>
          sum +
          Number(
            leg.distance_meters ??
            0
          ),
        0
      ),
    total_duration_seconds:
      legs.reduce(
        (
          sum,
          leg
        ) =>
          sum +
          Number(
            leg.duration_seconds ??
            0
          ),
        0
      ),
    legs,
  });
}

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

      const {
        key:
          googleRoutesApiKey,
        source:
          googleRoutesKeySource,
      } =
        getGoogleRoutesApiKey();

      if (
        !googleRoutesApiKey
      ) {
        console.warn(
          "⚠️ GOOGLE ROUTES KEY MISSING — USING ESTIMATE"
        );

        return sendEstimatedFallback(
          res,
          points,
          "missing_google_routes_api_key"
        );
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
                googleRoutesApiKey,

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

        console.warn(
          "⚠️ GOOGLE ROUTES FALLBACK:",
          {
            status:
              response.status,
            keySource:
              googleRoutesKeySource,
          }
        );

        return sendEstimatedFallback(
          res,
          points,
          "google_routes_request_failed",
          response.status
        );
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
        key_source:
          googleRoutesKeySource,
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
