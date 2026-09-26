import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

import googleImageRouter from "./googleImage.ts";

dotenv.config();

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: "20mb",
  })
);

/* ============================================
   GOOGLE IMAGE
============================================ */

app.use(
  "/api",
  googleImageRouter
);


/* ============================================
   PLACE IMAGE - SERP API
============================================ */

async function checkImage(url: string) {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      responseType: "stream",
    });

    const contentType =
      response.headers["content-type"];

    return (
      response.status === 200 &&
      contentType &&
      contentType.startsWith("image")
    );
  } catch {
    return false;
  }
}


app.get(
  "/api/place-image",
  async (req, res) => {
    try {
      const {
        name,
        province,
      } = req.query;

      const query =
        `${name} ${province} Thailand scenic landscape viewpoint travel photography`;

      console.log(
        "===== QUERY ====="
      );

      console.log(query);

      const result =
        await axios.get(
          "https://serpapi.com/search.json",
          {
            params: {
              engine: "google_images",
              q: query,
              num: 20,
              api_key:
                process.env.SERP_API_KEY,
            },
          }
        );

      const images =
        result.data.images_results ||
        [];

      const candidates =
        images
          .filter(
            (item: any) =>
              item.original
          )
          .map(
            (item: any) =>
              item.original
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

      const filteredImages =
        candidates.filter(
          (url: string) => {
            const lower =
              url.toLowerCase();

            return !blocked.some(
              (domain) =>
                lower.includes(domain)
            );
          }
        );

      const validImages: string[] =
        [];

      for (
        const url of filteredImages
      ) {
        if (
          validImages.length >= 5
        ) {
          break;
        }

        const isValid =
          await checkImage(url);

        console.log(
          isValid
            ? "✅ ใช้รูป:"
            : "❌ รูปเสีย:",
          url
        );

        if (isValid) {
          validImages.push(url);
        }
      }

      console.log(
        "รูปใช้งานได้:",
        validImages.length
      );

      return res.json({
        images: validImages,
      });

    } catch (err: any) {

      console.error(
        err.response?.data ||
          err.message
      );

      return res.json({
        images: [],
      });
    }
  }
);


/* ============================================
   OKMD AI
============================================ */

const OKMD_BASE_URL =
  "https://gen.ai.kku.ac.th/okmd/api/v1";

const OKMD_MODELS = {
  claude: "claude-sonnet-5",
  gpt: "gpt-5.4",
  gemini: "gemini-3.7-flash",
};


app.post(
  "/api/ai",
  async (req, res) => {

    try {

      const {
        model,
        prompt,
      } = req.body;

      console.log(
        "===================================="
      );

      console.log(
        "🤖 OKMD AI REQUEST"
      );

      console.log(
        "Model:",
        model
      );

      console.log(
        "Prompt Length:",
        prompt?.length
      );

      console.log(
        "===================================="
      );


      if (
        !model ||
        !OKMD_MODELS[
          model as keyof typeof OKMD_MODELS
        ]
      ) {
        return res.status(400).json({
          error: "Invalid AI model",
          availableModels:
            Object.keys(
              OKMD_MODELS
            ),
        });
      }


      if (!prompt) {
        return res.status(400).json({
          error:
            "Prompt is required",
        });
      }


      if (
        !process.env.OKMD_API_KEY
      ) {
        return res.status(500).json({
          error:
            "OKMD_API_KEY is not configured",
        });
      }


      const modelId =
        OKMD_MODELS[
          model as keyof typeof OKMD_MODELS
        ];


      console.log(
        "📡 ส่งไป OKMD model:",
        modelId
      );


      const start =
        performance.now();


      const response =
        await axios.post(
          `${OKMD_BASE_URL}/chat/completions`,
          {
            model: modelId,

            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],

            temperature: 0.2,

            max_tokens: 12000,
          },
          {
            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${process.env.OKMD_API_KEY}`,
            },

            timeout: 300000,
          }
        );


      const end =
        performance.now();


      const data =
        response.data;


      const content =
        data?.choices?.[0]
          ?.message?.content;


      console.log(
        `✅ OKMD ตอบกลับใน ${(
          (end - start) /
          1000
        ).toFixed(2)} วินาที`
      );


      if (!content) {
        return res.status(500).json({
          error:
            "OKMD returned empty response",
          raw: data,
        });
      }


      return res.json({
        content,

        model:
          data?.model,

        usage:
          data?.usage,

        model_quota:
          data?.model_quota,
      });

    } catch (error: any) {

      console.error(
        "❌ OKMD ERROR"
      );

      console.error(
        "Status:",
        error.response?.status
      );

      console.error(
        "Data:",
        error.response?.data
      );

      console.error(
        "Message:",
        error.message
      );


      return res.status(
        error.response?.status ||
          500
      ).json({
        error:
          error.response?.data ||
          error.message ||
          "OKMD API error",
      });
    }
  }
);



/* ============================================
   LIVE TRIP STATUS
   - Google Routes: traffic-aware ETA
   - Google Weather: next 3 hours
============================================ */

function parseGoogleDurationSeconds(
  value: unknown
) {
  const raw =
    String(value ?? "")
      .replace(/s$/, "");

  const seconds =
    Number(raw);

  return Number.isFinite(seconds)
    ? seconds
    : 0;
}

app.post(
  "/api/live-trip-status",
  async (req, res) => {
    try {
      const rawPoints =
        Array.isArray(
          req.body?.points
        )
          ? req.body.points
          : [];

      const points =
        rawPoints
          .map((point: any) => ({
            id:
              point?.id ?? null,
            name:
              String(
                point?.name ??
                  "สถานที่"
              ),
            latitude:
              Number(
                point?.latitude
              ),
            longitude:
              Number(
                point?.longitude
              ),
          }))
          .filter(
            (point: any) =>
              Number.isFinite(
                point.latitude
              ) &&
              Number.isFinite(
                point.longitude
              )
          )
          .slice(0, 8);

      if (points.length === 0) {
        return res.status(400).json({
          error:
            "points are required",
        });
      }

      // ใช้ Google Maps Platform API key ตัวเดียว
      // สำหรับ Routes API + Weather API
      const googleMapsApiKey =
        process.env
          .GOOGLE_MAPS_API_KEY ||
        "";

      const legs: any[] = [];
      const weather: any[] = [];

      if (
        googleMapsApiKey &&
        points.length >= 2
      ) {
        const routeJobs =
          points
            .slice(
              0,
              points.length - 1
            )
            .map(
              async (
                from: any,
                index: number
              ) => {
                const to =
                  points[
                    index + 1
                  ];

                try {
                  const response =
                    await axios.post(
                      "https://routes.googleapis.com/directions/v2:computeRoutes",
                      {
                        origin: {
                          location: {
                            latLng: {
                              latitude:
                                from.latitude,
                              longitude:
                                from.longitude,
                            },
                          },
                        },
                        destination: {
                          location: {
                            latLng: {
                              latitude:
                                to.latitude,
                              longitude:
                                to.longitude,
                            },
                          },
                        },
                        travelMode:
                          "DRIVE",
                        routingPreference:
                          "TRAFFIC_AWARE",
                        computeAlternativeRoutes:
                          false,
                        languageCode:
                          "th",
                        units:
                          "METRIC",
                      },
                      {
                        headers: {
                          "Content-Type":
                            "application/json",
                          "X-Goog-Api-Key":
                            googleMapsApiKey,
                          "X-Goog-FieldMask":
                            "routes.duration,routes.staticDuration,routes.distanceMeters",
                        },
                        timeout: 15000,
                      }
                    );

                  const route =
                    response.data
                      ?.routes?.[0];

                  if (!route) {
                    return null;
                  }

                  const durationSeconds =
                    parseGoogleDurationSeconds(
                      route.duration
                    );

                  const staticSeconds =
                    parseGoogleDurationSeconds(
                      route.staticDuration
                    );

                  const delaySeconds =
                    Math.max(
                      0,
                      durationSeconds -
                        staticSeconds
                    );

                  const delayMinutes =
                    delaySeconds / 60;

                  const staticMinutes =
                    staticSeconds / 60;

                  const delayRatio =
                    staticMinutes > 0
                      ? delayMinutes /
                        staticMinutes
                      : 0;

                  const level =
                    delayMinutes >= 15 ||
                    delayRatio >= 0.35
                      ? "heavy"
                      : delayMinutes >=
                            7 ||
                          delayRatio >=
                            0.18
                        ? "slow"
                        : "normal";

                  return {
                    fromName:
                      from.name,
                    toName:
                      to.name,
                    durationMinutes:
                      Math.round(
                        durationSeconds /
                          60
                      ),
                    staticDurationMinutes:
                      Math.round(
                        staticMinutes
                      ),
                    delayMinutes:
                      Math.round(
                        delayMinutes
                      ),
                    distanceMeters:
                      Number(
                        route.distanceMeters ??
                          0
                      ),
                    level,
                  };
                } catch (error: any) {
                  console.warn(
                    "LIVE ROUTE STATUS ERROR:",
                    error.response
                      ?.data ||
                      error.message
                  );

                  return null;
                }
              }
            );

        const routeResults =
          await Promise.all(
            routeJobs
          );

        legs.push(
          ...routeResults.filter(
            Boolean
          )
        );
      }

      if (googleMapsApiKey) {
        const weatherJobs =
          points.map(
            async (
              point: any
            ) => {
              try {
                const response =
                  await axios.get(
                    "https://weather.googleapis.com/v1/forecast/hours:lookup",
                    {
                      params: {
                        key:
                          googleMapsApiKey,
                        "location.latitude":
                          point.latitude,
                        "location.longitude":
                          point.longitude,
                        hours: 3,
                        pageSize: 3,
                        languageCode:
                          "th",
                        unitsSystem:
                          "METRIC",
                      },
                      timeout: 15000,
                    }
                  );

                const hours =
                  Array.isArray(
                    response.data
                      ?.forecastHours
                  )
                    ? response.data
                        .forecastHours
                    : [];

                if (
                  hours.length === 0
                ) {
                  return null;
                }

                const wettest =
                  [
                    ...hours,
                  ].sort(
                    (
                      left: any,
                      right: any
                    ) =>
                      Number(
                        right
                          ?.precipitation
                          ?.probability
                          ?.percent ??
                          0
                      ) -
                      Number(
                        left
                          ?.precipitation
                          ?.probability
                          ?.percent ??
                          0
                      )
                  )[0];

                const dateTime =
                  wettest
                    ?.displayDateTime;

                const hour =
                  Number(
                    dateTime
                      ?.hours
                  );

                const hourLabel =
                  Number.isFinite(
                    hour
                  )
                    ? `${String(
                        hour
                      ).padStart(
                        2,
                        "0"
                      )}:00`
                    : null;

                return {
                  name:
                    point.name,
                  rainProbability:
                    Number(
                      wettest
                        ?.precipitation
                        ?.probability
                        ?.percent ??
                        0
                    ),
                  temperatureC:
                    Number(
                      wettest
                        ?.temperature
                        ?.degrees
                    ),
                  condition:
                    wettest
                      ?.weatherCondition
                      ?.description
                      ?.text ??
                    null,
                  hourLabel,
                };
              } catch (error: any) {
                console.warn(
                  "LIVE WEATHER STATUS ERROR:",
                  error.response
                    ?.data ||
                    error.message
                );

                return null;
              }
            }
          );

        const weatherResults =
          await Promise.all(
            weatherJobs
          );

        weather.push(
          ...weatherResults.filter(
            Boolean
          )
        );
      }

      const suggestions: string[] =
        [];

      const worstLeg =
        [
          ...legs,
        ].sort(
          (
            left,
            right
          ) =>
            Number(
              right.delayMinutes ??
                0
            ) -
            Number(
              left.delayMinutes ??
                0
            )
        )[0];

      if (
        worstLeg &&
        Number(
          worstLeg.delayMinutes
        ) >= 7
      ) {
        suggestions.push(
          `เส้นทางก่อนถึง ${worstLeg.toName} ใช้เวลามากกว่าปกติประมาณ ${worstLeg.delayMinutes} นาที แนะนำเผื่อเวลาออกเดินทาง`
        );
      }

      const rainItem =
        [
          ...weather,
        ].sort(
          (
            left,
            right
          ) =>
            Number(
              right.rainProbability ??
                0
            ) -
            Number(
              left.rainProbability ??
                0
            )
        )[0];

      if (
        rainItem &&
        Number(
          rainItem.rainProbability
        ) >= 50
      ) {
        suggestions.push(
          `ช่วง ${rainItem.hourLabel ?? "ใกล้เวลาที่จะไป"} ที่ ${rainItem.name} มีโอกาสฝนตกประมาณ ${Math.round(
            Number(
              rainItem.rainProbability
            )
          )}% แนะนำพกร่ม หรือสลับสถานที่ในร่มไว้ก่อน`
        );
      }

      if (
        suggestions.length === 0 &&
        (
          legs.length > 0 ||
          weather.length > 0
        )
      ) {
        suggestions.push(
          "ตอนนี้ยังไม่พบความเสี่ยงเด่นจากรถติดหรือฝน สามารถเดินทางตามแผนเดิมได้"
        );
      }

      return res.json({
        generatedAt:
          new Date().toISOString(),
        trafficAvailable:
          legs.length > 0,
        weatherAvailable:
          weather.length > 0,
        legs,
        weather,
        suggestions,
      });
    } catch (error: any) {
      console.error(
        "LIVE TRIP STATUS FATAL ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load live trip status",
      });
    }
  }
);


/* ============================================
   START SERVER
============================================ */

const PORT = Number(process.env.PORT) || 5050;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API running on port ${PORT}`);
  console.log("🖼️ Google Image API enabled");
  console.log("PID:", process.pid);
});

server.on("error", (error) => {
  console.error("❌ SERVER ERROR:", error);
});

process.on("exit", (code) => {
  console.log("⚠️ PROCESS EXIT:", code);
});

process.on("SIGINT", () => {
  console.log("⚠️ SIGINT received");
});

process.on("SIGTERM", () => {
  console.log("⚠️ SIGTERM received");
});

process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ UNHANDLED REJECTION:", reason);
});