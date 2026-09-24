import { buildQuery } from "./buildQuery";

export async function getRecommendations(
  pref: any
) {
  const query =
    buildQuery(pref);

  const apiKey =
    import.meta.env.VITE_YT_KEY;

  if (!apiKey) {
    console.warn(
      "VITE_YT_KEY is not configured"
    );

    return [];
  }

  console.log(
    "YOUTUBE QUERY:",
    query
  );

  const params =
    new URLSearchParams({
      part: "snippet",
      type: "video",
      q: query,
      maxResults: "9",
      key: apiKey,
      order: "relevance",
      regionCode: "TH",
      relevanceLanguage: "th",
      safeSearch: "moderate",
      videoEmbeddable: "true",
    });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
  );

  if (!res.ok) {
    const error =
      await res.text();

    console.error(
      "YOUTUBE API ERROR:",
      error
    );

    return [];
  }

  const data =
    await res.json();

  if (!Array.isArray(data.items)) {
    console.error(
      "YOUTUBE RESPONSE:",
      data
    );

    return [];
  }

  return data.items
    .filter(
      (item: any) =>
        item?.id?.videoId
    )
    .map((item: any) => ({
      id:
        item.id.videoId,
      title:
        item.snippet?.title ??
        "",
      thumbnail:
        item.snippet?.thumbnails
          ?.medium?.url ??
        item.snippet?.thumbnails
          ?.default?.url ??
        "",
      channelTitle:
        item.snippet
          ?.channelTitle ??
        "",
      publishedAt:
        item.snippet
          ?.publishedAt ??
        null,
      videoUrl:
        `https://www.youtube.com/embed/${item.id.videoId}`,
    }));
}
