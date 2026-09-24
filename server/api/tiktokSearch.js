import express from "express";
import axios from "axios";

const router = express.Router();

const TOKEN_URL =
  "https://open.tiktokapis.com/v2/oauth/token/";

const VIDEO_QUERY_URL =
  "https://open.tiktokapis.com/v2/research/video/query/";

const OEMBED_URL =
  "https://www.tiktok.com/oembed";

const SEARCH_CACHE_TTL_MS =
  60 * 60 * 1000;

const searchCache = new Map();

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

function formatDate(date) {
  return date
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
}

function getDateWindow(
  daysAgoStart,
  daysAgoEnd
) {
  const now = new Date();

  const end = new Date(now);
  end.setUTCDate(
    end.getUTCDate() -
      daysAgoEnd
  );

  const start = new Date(now);
  start.setUTCDate(
    start.getUTCDate() -
      daysAgoStart
  );

  return {
    startDate:
      formatDate(start),
    endDate:
      formatDate(end),
  };
}

async function getClientAccessToken() {
  const clientKey =
    process.env.TIKTOK_CLIENT_KEY;

  const clientSecret =
    process.env.TIKTOK_CLIENT_SECRET;

  if (
    !clientKey ||
    !clientSecret
  ) {
    const error = new Error(
      "TikTok Research API credentials are not configured"
    );

    error.status = 503;

    throw error;
  }

  if (
    tokenCache.accessToken &&
    tokenCache.expiresAt >
      Date.now() + 60_000
  ) {
    return tokenCache.accessToken;
  }

  const body =
    new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type:
        "client_credentials",
    });

  const response =
    await axios.post(
      TOKEN_URL,
      body.toString(),
      {
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      }
    );

  const accessToken =
    response.data?.access_token;

  const expiresIn =
    Number(
      response.data?.expires_in
    ) || 7200;

  if (!accessToken) {
    const error = new Error(
      "TikTok did not return a client access token"
    );

    error.status = 502;

    throw error;
  }

  tokenCache = {
    accessToken,
    expiresAt:
      Date.now() +
      expiresIn * 1000,
  };

  return accessToken;
}

async function queryVideos({
  accessToken,
  keyword,
  startDate,
  endDate,
}) {
  const response =
    await axios.post(
      VIDEO_QUERY_URL,
      {
        query: {
          and: [
            {
              operation: "IN",
              field_name:
                "region_code",
              field_values: ["TH"],
            },
            {
              operation: "EQ",
              field_name:
                "keyword",
              field_values: [
                keyword,
              ],
            },
          ],
        },
        max_count: 20,
        cursor: 0,
        start_date: startDate,
        end_date: endDate,
        is_random: false,
      },
      {
        params: {
          fields: [
            "id",
            "video_description",
            "create_time",
            "region_code",
            "view_count",
            "like_count",
            "comment_count",
            "share_count",
            "username",
            "hashtag_names",
          ].join(","),
        },
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
        },
        timeout: 15000,
      }
    );

  const apiError =
    response.data?.error;

  if (
    apiError &&
    apiError.code &&
    apiError.code !== "ok"
  ) {
    const error = new Error(
      apiError.message ||
        apiError.code
    );

    error.status = 502;

    throw error;
  }

  return Array.isArray(
    response.data?.data?.videos
  )
    ? response.data.data.videos
    : [];
}

function getVideoId(video) {
  const value =
    video?.id ??
    video?.video_id;

  return value != null
    ? String(value)
    : "";
}

function buildShareUrl(video) {
  const id =
    getVideoId(video);

  const username =
    String(
      video?.username ?? ""
    )
      .trim()
      .replace(/^@/, "");

  if (!id || !username) {
    return null;
  }

  return `https://www.tiktok.com/@${encodeURIComponent(
    username
  )}/video/${id}`;
}

async function enrichVideo(video) {
  const id =
    getVideoId(video);

  const shareUrl =
    buildShareUrl(video);

  const base = {
    id,
    url: shareUrl,
    title:
      video?.video_description ??
      "",
    username:
      video?.username ?? null,
    thumbnail_url: null,
    create_time:
      video?.create_time ??
      null,
    view_count:
      Number(
        video?.view_count
      ) || 0,
    like_count:
      Number(
        video?.like_count
      ) || 0,
    comment_count:
      Number(
        video?.comment_count
      ) || 0,
    share_count:
      Number(
        video?.share_count
      ) || 0,
  };

  if (!shareUrl) {
    return base;
  }

  try {
    const response =
      await axios.get(
        OEMBED_URL,
        {
          params: {
            url: shareUrl,
          },
          timeout: 7000,
        }
      );

    return {
      ...base,
      title:
        response.data?.title ??
        base.title,
      username:
        response.data
          ?.author_name ??
        base.username,
      thumbnail_url:
        response.data
          ?.thumbnail_url ??
        null,
    };
  } catch {
    return base;
  }
}

router.get(
  "/tiktok-search",
  async (req, res) => {
    try {
      const name =
        String(
          req.query.name ?? ""
        ).trim();

      const province =
        String(
          req.query.province ?? ""
        ).trim();

      if (!name) {
        return res
          .status(400)
          .json({
            error:
              "name is required",
            videos: [],
          });
      }

      const cacheKey =
        `${name.toLowerCase()}|${province.toLowerCase()}`;

      const cached =
        searchCache.get(
          cacheKey
        );

      if (
        cached &&
        Date.now() -
          cached.createdAt <
          SEARCH_CACHE_TTL_MS
      ) {
        return res.json({
          videos:
            cached.videos,
          cached: true,
        });
      }

      const accessToken =
        await getClientAccessToken();

      const windows = [
        getDateWindow(29, 0),
        getDateWindow(59, 30),
        getDateWindow(89, 60),
      ];

      const collected = [];
      const seen = new Set();

      for (
        const window of windows
      ) {
        const videos =
          await queryVideos({
            accessToken,
            keyword: name,
            startDate:
              window.startDate,
            endDate:
              window.endDate,
          });

        for (const video of videos) {
          const id =
            getVideoId(video);

          if (
            !id ||
            seen.has(id)
          ) {
            continue;
          }

          seen.add(id);
          collected.push(video);
        }

        if (
          collected.length >= 8
        ) {
          break;
        }
      }

      collected.sort(
        (a, b) =>
          Number(
            b?.view_count ?? 0
          ) -
          Number(
            a?.view_count ?? 0
          )
      );

      const enriched =
        await Promise.all(
          collected
            .slice(0, 8)
            .map(enrichVideo)
        );

      const videos =
        enriched
          .filter(
            (video) =>
              video.id &&
              video.url
          )
          .slice(0, 6);

      searchCache.set(
        cacheKey,
        {
          createdAt:
            Date.now(),
          videos,
        }
      );

      return res.json({
        videos,
        cached: false,
      });
    } catch (error) {
      console.error(
        "TIKTOK SEARCH ERROR:",
        error.response?.data ??
          error.message
      );

      const status =
        error.status ||
        error.response?.status ||
        500;

      return res
        .status(status)
        .json({
          error:
            error.message ||
            "TikTok search failed",
          videos: [],
        });
    }
  }
);

export default router;
