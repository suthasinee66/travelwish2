import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import OpenAI from "openai";
import nearbyRestaurantsRouter
  from "./api/nearbyRestaurants.js";
dotenv.config();
import attractionImagesRouter
  from "./api/attractionImages.js";
import restaurantImagesRouter
  from "./api/restaurantImages.js";
import resolveAIAttractionRouter
  from "./api/resolveAIAttraction.js";
import resolveAIRestaurantRouter
  from "./api/resolveAIRestaurant.js";
import resolveAccommodationLinkRouter
  from "./api/resolveAccommodationLink.js";
import enrichPlaceDetailRouter
  from "./api/enrichPlaceDetail.js";
import routeTravelTimesRouter
  from "./api/routeTravelTimes.js";


const app = express();
app.use(cors());

app.use(
  express.json({
    limit: "20mb",
  })
);

app.use("/api", nearbyRestaurantsRouter);

app.use(
  "/api",
  attractionImagesRouter
);

app.use(
  "/api",
  restaurantImagesRouter
);

app.use(
  "/api",
  resolveAIAttractionRouter
);

app.use(
  "/api",
  resolveAIRestaurantRouter
);

app.use(
  "/api",
  resolveAccommodationLinkRouter
);

app.use(
  "/api",
  enrichPlaceDetailRouter
);

app.use(
  "/api",
  routeTravelTimesRouter
);

// ============================================
// OPENROUTER
// ============================================

const OPENROUTER_BASE_URL =
  "https://openrouter.ai/api/v1";

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const openRouterAI = new OpenAI({
  baseURL: OPENROUTER_BASE_URL,
  apiKey: OPENROUTER_API_KEY,
});

// ============================================
// OPENROUTER MODELS
// ============================================
//
// ตอนนี้ใช้ openrouter/free สำหรับทดสอบเท่านั้น
// หลังจากเลือกโมเดลฟรีที่เหมาะกับ TravelWish แล้ว
// ให้เปลี่ยนค่าเหล่านี้เป็น model ID จริง
//

const OPENROUTER_MODELS = {
  gemini: "google/gemini-3.7-flash",
  gpt: "openai/gpt-5.6-sol",
  claude: "anthropic/claude-sonnet-5",
};

// ============================================
// PLACE IMAGE - SERP API
// ============================================

async function checkImage(url) {
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
  } catch (error) {
    return false;
  }
}

app.get("/api/place-image", async (req, res) => {
  try {
    const { name, province } = req.query;

    const query =
      `${name} ${province} Thailand scenic landscape viewpoint travel photography`;

    console.log("===== QUERY =====");
    console.log(query);

    const result = await axios.get(
      "https://serpapi.com/search.json",
      {
        params: {
          engine: "google_images",
          q: query,
          num: 20,
          api_key: process.env.SERP_API_KEY,
        },
      }
    );

    const images =
      result.data.images_results || [];

    const candidates = images
      .filter((item) => item.original)
      .map((item) => item.original);

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
      candidates.filter((url) => {
        const lower = url.toLowerCase();

        return !blocked.some((domain) =>
          lower.includes(domain)
        );
      });

    const validImages = [];

    for (const url of filteredImages) {
      if (validImages.length >= 5) {
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
      "================ IMAGE RESULT ================"
    );

    console.log(
      "ทั้งหมดจาก SerpAPI:",
      images.length
    );

    console.log(
      "ผ่าน filter:",
      filteredImages.length
    );

    console.log(
      "รูปใช้งานได้:",
      validImages.length
    );

    return res.json({
      images: validImages,
    });

  } catch (err) {
    console.error(
      err.response?.data ||
      err.message
    );

    return res.json({
      images: [],
    });
  }
});

// ============================================
// OPENROUTER AI
// ============================================

app.post("/api/ai", async (req, res) => {
  try {
    const {
      model,
      prompt,
      responseMode = null,
    } = req.body;

    console.log("====================================");
    console.log("🤖 OPENROUTER AI REQUEST");
    console.log("Model:", model);
    console.log(
      "Prompt Length:",
      prompt?.length
    );
    console.log(
      "Response Mode:",
      responseMode ??
      "default"
    );
    console.log("====================================");

    // ========================================
    // ตรวจสอบ Model
    // ========================================

    if (
      !model ||
      !OPENROUTER_MODELS[model]
    ) {
      return res.status(400).json({
        error: "Invalid AI model",
        availableModels:
          Object.keys(OPENROUTER_MODELS),
      });
    }

    // ========================================
    // ตรวจสอบ Prompt
    // ========================================

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required",
      });
    }

    // ========================================
    // ตรวจสอบ API Key
    // ========================================

    if (!OPENROUTER_API_KEY) {
      console.error(
        "❌ OPENROUTER_API_KEY ไม่ได้ตั้งค่า"
      );

      return res.status(500).json({
        error:
          "OpenRouter API key is not configured",
      });
    }

    const modelId =
      OPENROUTER_MODELS[model];

    console.log(
      "📡 ส่งไป OpenRouter model:",
      modelId
    );

    const start =
      performance.now();

    // ========================================
    // เรียก OpenRouter
    // ========================================

    const requestPayload = {
      model: modelId,

      messages: [
        {
          role: "system",
          content:
            responseMode === "planner_json"
              ? "You are a travel planning assistant. Follow the provided JSON schema exactly. Return no prose outside the schema."
              : responseMode === "trend_context"
                ? "You are a travel trend researcher. Use live web search and return a concise JSON object containing only current, evidence-based travel trends and viral places relevant to the requested province."
                : responseMode === "markdown"
                  ? "You are a travel planning assistant. Return only the final Markdown itinerary text requested by the user."
                  : "You are a helpful travel planning assistant. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature:
        responseMode === "planner_json" ||
        responseMode === "accommodation_json"
          ? 0.1
          : responseMode === "trend_context"
            ? 0.15
            : 0.3,

      max_tokens:
        responseMode === "planner_json"
          ? 12000
          : responseMode === "trend_context"
            ? 10000
            : responseMode === "accommodation_json"
              ? 800
              : 12000,
    };

    if (
      model !== "claude" &&
      (
        responseMode === "planner_json" ||
        responseMode === "accommodation_json"
      )
    ) {
      requestPayload.reasoning = {
        effort: "low"
      };
    }

    if (model === "claude") {
      // Claude Sonnet can otherwise spend the full completion budget
      // on extended thinking and return no final content.
      requestPayload.reasoning = {
        effort: "none"
      };
    }

    if (
      responseMode === "trend_context" ||
      responseMode === "markdown"
    ) {
      requestPayload.tools = [
        {
          type:
            "openrouter:web_search",
          parameters: {
            // ใช้ search engine เดียวกันทุกโมเดล
            // เพื่อให้ AI 1 / AI 2 / AI 3 เปรียบเทียบกันได้ยุติธรรม
            engine:
              "exa",
            max_results:
              responseMode === "trend_context"
                ? 25
                : 5,
            max_total_results:
              responseMode === "trend_context"
                ? 25
                : 10,
            search_context_size:
              "medium"
          }
        }
      ];

      requestPayload.max_tool_calls =
        responseMode === "trend_context"
          ? 5
          : 3;
    }

    if (responseMode === "trend_context") {
      requestPayload.response_format = {
        type: "json_schema",
        json_schema: {
          name: "travelwish_trend_context",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              province: {
                type: "string"
              },
              researched_at: {
                type: "string"
              },
              trends: {
                type: "array",
                minItems: 15,
                maxItems: 15,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: {
                      type: "string"
                    },
                    kind: {
                      type: "string"
                    },
                    why_trending: {
                      type: "string"
                    },
                    current_signal: {
                      type: "string"
                    },
                    best_for: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    },
                    confidence: {
                      type: "string",
                      enum: [
                        "high",
                        "medium",
                        "low"
                      ]
                    }
                  },
                  required: [
                    "name",
                    "kind",
                    "why_trending",
                    "current_signal",
                    "best_for",
                    "confidence"
                  ]
                }
              }
            },
            required: [
              "province",
              "researched_at",
              "trends"
            ]
          }
        }
      };
    }

    if (responseMode === "accommodation_json") {
      requestPayload.response_format = {
        type: "json_schema",
        json_schema: {
          name: "travelwish_accommodation_ranking",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              recommendations: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    accommodation_id: {
                      type: "string",
                      minLength: 1
                    },
                    reason: {
                      type: "string",
                      minLength: 1,
                      maxLength: 400
                    }
                  },
                  required: [
                    "accommodation_id",
                    "reason"
                  ]
                }
              }
            },
            required: [
              "recommendations"
            ]
          }
        }
      };
    }

    if (responseMode === "planner_json") {
      if (model === "claude") {
        // The strict planner schema contains more nullable/union fields
        // than some Claude providers accept. json_object still guarantees
        // JSON while the prompt itself enforces the planner shape.
        requestPayload.response_format = {
          type: "json_object"
        };
      } else {
      requestPayload.response_format = {
        type: "json_schema",
        json_schema: {
          name: "travelwish_planner",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              proposedNewPlaces: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    key: { type: "string" },
                    name_th: { type: "string" },
                    name_en: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },
                    detail_th: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },
                    category: {
                      type: "array",
                      items: { type: "string" }
                    },
                    type: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },
                    highlight: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },
                    activity: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },
                    suitable_duration: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },
                    travel_type: {
                      type: "array",
                      items: { type: "string" }
                    },
                    activities: {
                      type: "array",
                      items: { type: "string" }
                    },
                    atmosphere: {
                      type: "array",
                      items: { type: "string" }
                    },
                    budget: {
                      type: "array",
                      items: { type: "string" }
                    },
                    travel_companion: {
                      type: "array",
                      items: { type: "string" }
                    },
                    personalization_reason: {
                      type: "string"
                    }
                  },
                  required: [
                    "key",
                    "name_th",
                    "name_en",
                    "detail_th",
                    "category",
                    "type",
                    "highlight",
                    "activity",
                    "suitable_duration",
                    "travel_type",
                    "activities",
                    "atmosphere",
                    "budget",
                    "travel_companion",
                    "personalization_reason"
                  ]
                }
              },
              proposedNewRestaurants: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    key: { type: "string" },
                    name_th: { type: "string" },
                    name_en: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },
                    personalization_reason: {
                      type: "string"
                    }
                  },
                  required: [
                    "key",
                    "name_th",
                    "name_en",
                    "personalization_reason"
                  ]
                }
              },
              selectedPlaces: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    day: { type: "integer" },
                    title: { type: "string" },
                    period: { type: "string" },
                    source: { type: "string" },
                    place_id: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },
                    place_name: { type: "string" },

                    place_duration_minutes: {
                      type: "integer",
                      minimum: 20,
                      maximum: 480
                    },

                    place_activities: {
                      type: "array",
                      minItems: 1,
                      maxItems: 4,
                      items: {
                        type: "string",
                        minLength: 1
                      }
                    },

                    place_activity_summary: {
                      type: "string",
                      minLength: 1
                    },

                    place_notes: {
                      type: "string",
                      minLength: 1
                    },

                    proposed_place_key: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },

                    fallback_place_id: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },

                    restaurant_source: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },

                    restaurant_id: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },

                    restaurant_name: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },

                    restaurant_period: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    },

                    restaurant_duration_minutes: {
                      anyOf: [
                        {
                          type: "integer",
                          minimum: 20,
                          maximum: 480
                        },
                        { type: "null" }
                      ]
                    },

                    restaurant_activities: {
                      type: "array",
                      maxItems: 4,
                      items: {
                        type: "string",
                        minLength: 1
                      }
                    },

                    restaurant_activity_summary: {
                      anyOf: [
                        {
                          type: "string",
                          minLength: 1
                        },
                        { type: "null" }
                      ]
                    },

                    restaurant_notes: {
                      anyOf: [
                        {
                          type: "string",
                          minLength: 1
                        },
                        { type: "null" }
                      ]
                    },

                    proposed_restaurant_key: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" }
                      ]
                    }
                  },
                  required: [
                    "day",
                    "title",
                    "period",
                    "source",
                    "place_id",
                    "place_name",
                    "place_duration_minutes",
                    "place_activities",
                    "place_activity_summary",
                    "place_notes",
                    "proposed_place_key",
                    "fallback_place_id",
                    "restaurant_source",
                    "restaurant_id",
                    "restaurant_name",
                    "restaurant_period",
                    "restaurant_duration_minutes",
                    "restaurant_activities",
                    "restaurant_activity_summary",
                    "restaurant_notes",
                    "proposed_restaurant_key"
                  ]
                }
              },
            },
            required: [
              "proposedNewPlaces",
              "proposedNewRestaurants",
              "selectedPlaces"
            ]
          }
        }
      };
    
      }
    }

    let response;

    try {
      response =
        await openRouterAI.chat.completions.create(
          requestPayload
        );
    } catch (primaryError) {
      const status =
        primaryError?.status ??
        primaryError
          ?.response
          ?.status ??
        null;

      const shouldRetryClaude =
        model === "claude" &&
        status === 400;

      if (!shouldRetryClaude) {
        throw primaryError;
      }

      console.warn(
        "⚠️ CLAUDE PROVIDER 400 — RETRY SAFE PAYLOAD"
      );

      console.warn(
        "Claude error detail:",
        primaryError?.error ??
        primaryError?.body ??
        primaryError
          ?.response
          ?.data ??
        primaryError?.message
      );

      const safePayload = {
        ...requestPayload,
      };

      // Keep Claude reasoning disabled. Removing this caused
      // some providers to spend the entire max_tokens budget on reasoning.
      safePayload.reasoning = {
        effort: "none"
      };
      delete safePayload.temperature;

      try {
        response =
          await openRouterAI.chat.completions.create(
            safePayload
          );
      } catch (safeError) {
        const safeStatus =
          safeError?.status ??
          safeError
            ?.response
            ?.status ??
          null;

        if (
          safeStatus === 400 &&
          safePayload.response_format
        ) {
          console.warn(
            "⚠️ CLAUDE STRUCTURED OUTPUT 400 — RETRY PROMPT-ONLY JSON"
          );

          const promptOnlyPayload = {
            ...safePayload,
          };

          delete promptOnlyPayload
            .response_format;

          response =
            await openRouterAI.chat.completions.create(
              promptOnlyPayload
            );
        } else {
          throw safeError;
        }
      }
    }

    const end =
      performance.now();

    // ========================================
    // อ่าน Response
    // ========================================

    const content =
      response.choices?.[0]?.message?.content;

    console.log(
      "===================================="
    );

    console.log(
      "🤖 OPENROUTER AI RESPONSE"
    );

    console.log(
      "Requested Model:",
      modelId
    );

    console.log(
      "Actual Model:",
      response.model
    );

    console.log(
      "Response Length:",
      content?.length
    );

    console.log(
      "Usage:",
      response.usage
    );

    console.log(
      `⏱️ Response Time: ${(
        (end - start) /
        1000
      ).toFixed(2)} วินาที`
    );

    console.log(
      "===================================="
    );

    // ========================================
    // ไม่มี Content
    // ========================================

    if (!content) {
      console.error(
        "❌ OpenRouter ไม่มี content"
      );

      return res.status(500).json({
        error:
          "OpenRouter returned empty response",
        raw: response,
      });
    }

    // ========================================
    // ส่งกลับ Frontend
    // ========================================

    return res.json({
      content: content,

      model:
        response.model,

      finish_reason:
        response.choices?.[0]
          ?.finish_reason ??
        null,

      usage:
        response.usage,
    });

  } catch (error) {
    console.error(
      "❌ OPENROUTER ERROR"
    );

    console.error(
      "Status:",
      error.status
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "Response:",
      error.response?.data
    );

    console.error(
      "Error detail:",
      error.error ??
      error.body ??
      error.cause ??
      null
    );

    return res.status(
      error.status ||
      error.response?.status ||
      500
    ).json({
      error:
        error.response?.data ||
        error.message ||
        "OpenRouter API error",
    });
  }
});



// ============================================
// LIVE TRIP STATUS
// Google Routes + Google Weather
// ใช้ GOOGLE_MAPS_API_KEY ตัวเดียว
// ============================================

function parseGoogleDurationSeconds(value) {
  if (typeof value !== "string") return 0;

  const match =
    value.match(/^([0-9.]+)s$/);

  return match
    ? Number(match[1]) || 0
    : 0;
}

function normalizeLivePoint(value) {
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
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    id: value?.id ?? null,
    name: String(
      value?.name ??
      "สถานที่"
    ),
    latitude,
    longitude,
  };
}

app.post(
  "/api/live-trip-status",
  async (req, res) => {
    try {
      const points =
        (
          Array.isArray(req.body?.points)
            ? req.body.points
            : []
        )
          .map(normalizeLivePoint)
          .filter(Boolean)
          .slice(0, 8);

      if (points.length === 0) {
        return res.status(400).json({
          error: "points are required",
        });
      }

      const apiKey =
        process.env.GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        return res.json({
          generatedAt:
            new Date().toISOString(),
          trafficAvailable: false,
          weatherAvailable: false,
          legs: [],
          weather: [],
          suggestions: [
            "ยังไม่ได้ตั้งค่า GOOGLE_MAPS_API_KEY ที่ backend",
          ],
        });
      }

      const trafficJobs = [];

      for (
        let index = 1;
        index < points.length;
        index += 1
      ) {
        const from =
          points[index - 1];
        const to =
          points[index];

        trafficJobs.push(
          (async () => {
            try {
              const response =
                await fetch(
                  "https://routes.googleapis.com/directions/v2:computeRoutes",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        "application/json",
                      "X-Goog-Api-Key":
                        apiKey,
                      "X-Goog-FieldMask":
                        "routes.duration,routes.staticDuration,routes.distanceMeters",
                    },
                    body:
                      JSON.stringify({
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
                      }),
                  }
                );

              if (!response.ok) {
                console.warn(
                  "⚠️ LIVE ROUTE GOOGLE ERROR:",
                  response.status,
                  await response.text()
                );
                return null;
              }

              const data =
                await response.json();

              const route =
                data?.routes?.[0];

              if (!route) return null;

              const durationSeconds =
                parseGoogleDurationSeconds(
                  route.duration
                );

              const staticSeconds =
                parseGoogleDurationSeconds(
                  route.staticDuration
                );

              const delayMinutes =
                Math.max(
                  0,
                  durationSeconds -
                    staticSeconds
                ) / 60;

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
                  : (
                      delayMinutes >= 7 ||
                      delayRatio >= 0.18
                    )
                    ? "slow"
                    : "normal";

              return {
                fromName:
                  from.name,
                toName:
                  to.name,
                durationMinutes:
                  Math.max(
                    1,
                    Math.round(
                      durationSeconds / 60
                    )
                  ),
                staticDurationMinutes:
                  Math.max(
                    1,
                    Math.round(
                      staticSeconds / 60
                    )
                  ),
                delayMinutes:
                  Math.max(
                    0,
                    Math.round(
                      delayMinutes
                    )
                  ),
                distanceMeters:
                  Number(
                    route.distanceMeters ??
                    0
                  ),
                level,
              };
            } catch (error) {
              console.warn(
                "⚠️ LIVE ROUTE REQUEST FAILED:",
                error?.message ?? error
              );
              return null;
            }
          })()
        );
      }

      const weatherJobs =
        points.map(
          point =>
            (async () => {
              try {
                const url =
                  new URL(
                    "https://weather.googleapis.com/v1/forecast/hours:lookup"
                  );

                url.searchParams.set(
                  "key",
                  apiKey
                );
                url.searchParams.set(
                  "location.latitude",
                  String(point.latitude)
                );
                url.searchParams.set(
                  "location.longitude",
                  String(point.longitude)
                );
                url.searchParams.set(
                  "hours",
                  "3"
                );
                url.searchParams.set(
                  "pageSize",
                  "3"
                );
                url.searchParams.set(
                  "languageCode",
                  "th"
                );
                url.searchParams.set(
                  "unitsSystem",
                  "METRIC"
                );

                const response =
                  await fetch(url);

                if (!response.ok) {
                  console.warn(
                    "⚠️ LIVE WEATHER GOOGLE ERROR:",
                    response.status,
                    await response.text()
                  );
                  return null;
                }

                const data =
                  await response.json();

                const hours =
                  Array.isArray(
                    data?.forecastHours
                  )
                    ? data.forecastHours
                    : [];

                if (hours.length === 0) {
                  return null;
                }

                const wettest =
                  [...hours].sort(
                    (left, right) =>
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

                const displayHour =
                  Number(
                    wettest
                      ?.displayDateTime
                      ?.hours
                  );

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
                  hourLabel:
                    Number.isFinite(
                      displayHour
                    )
                      ? `${String(
                          displayHour
                        ).padStart(
                          2,
                          "0"
                        )}:00`
                      : null,
                };
              } catch (error) {
                console.warn(
                  "⚠️ LIVE WEATHER REQUEST FAILED:",
                  error?.message ?? error
                );
                return null;
              }
            })()
        );

      const [
        trafficResults,
        weatherResults,
      ] =
        await Promise.all([
          Promise.all(
            trafficJobs
          ),
          Promise.all(
            weatherJobs
          ),
        ]);

      const legs =
        trafficResults.filter(Boolean);

      const weather =
        weatherResults.filter(Boolean);

      const suggestions = [];

      const worstLeg =
        [...legs].sort(
          (left, right) =>
            Number(
              right?.delayMinutes ??
              0
            ) -
            Number(
              left?.delayMinutes ??
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
          `เส้นทางก่อนถึง ${worstLeg.toName} ช้ากว่าปกติประมาณ ${worstLeg.delayMinutes} นาที แนะนำเผื่อเวลาเดินทาง`
        );
      }

      const rainItem =
        [...weather].sort(
          (left, right) =>
            Number(
              right?.rainProbability ??
              0
            ) -
            Number(
              left?.rainProbability ??
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
          )}% แนะนำพกร่มหรือเตรียมสถานที่ในร่มสำรอง`
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
          "ตอนนี้ยังไม่พบรถติดหรือฝนที่เด่นผิดปกติ สามารถเดินทางตามแผนเดิมได้"
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
    } catch (error) {
      console.error(
        "❌ LIVE TRIP STATUS ERROR:",
        error
      );

      return res.status(500).json({
        error:
          error?.message ??
          "Unable to load live trip status",
      });
    }
  }
);

// ============================================
// START SERVER
// ============================================

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `🚀 API running on port ${PORT}`
    );

    console.log(
      `🔑 OpenRouter API Key: ${
        OPENROUTER_API_KEY
          ? "configured"
          : "missing"
      }`
    );

    console.log(
      "🤖 OpenRouter AI enabled"
    );

    console.log(
      "🖼️ Place Image API enabled"
    );
  }
);