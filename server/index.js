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
        responseMode === "planner_json"
          ? 0.1
          : responseMode === "trend_context"
            ? 0.15
            : 0.3,

      max_tokens:
        responseMode === "planner_json"
          ? 8000
          : responseMode === "trend_context"
            ? 4000
            : 12000,
    };

    if (responseMode === "planner_json") {
      requestPayload.reasoning = {
        effort: "low"
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
            engine:
              "auto",
            max_results:
              responseMode === "trend_context"
                ? 8
                : 5,
            max_total_results:
              responseMode === "trend_context"
                ? 16
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
                maxItems: 8,
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

    if (responseMode === "planner_json") {
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
                    "proposed_place_key",
                    "fallback_place_id",
                    "restaurant_source",
                    "restaurant_id",
                    "restaurant_name",
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

    const response =
      await openRouterAI.chat.completions.create(
        requestPayload
      );

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