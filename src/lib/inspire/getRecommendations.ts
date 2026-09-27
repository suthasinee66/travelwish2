import { buildQuery } from "./buildQuery";

export async function getRecommendations(
  pref: any,
  options?: {
    maxResults?: number;
  }
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

  const maxResults =
    Math.min(
      25,
      Math.max(
        1,
        Number(
          options?.maxResults ??
          9
        )
      )
    );

  const params =
    new URLSearchParams({
      part: "snippet",
      type: "video",
      q: query,
      maxResults:
        String(maxResults),
      key: apiKey,
      order: "viewCount",
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

  const searchItems =
    data.items
      .filter(
        (item: any) =>
          item?.id?.videoId
      );

  const videoIds =
    searchItems
      .map(
        (item: any) =>
          String(
            item.id.videoId
          )
      )
      .filter(Boolean);

  let statisticsById =
    new Map<
      string,
      {
        viewCount: number;
        likeCount: number | null;
      }
    >();

  if (
    videoIds.length > 0
  ) {
    try {
      const statsParams =
        new URLSearchParams({
          part: "statistics",
          id:
            videoIds.join(","),
          key: apiKey,
        });

      const statsRes =
        await fetch(
          `https://www.googleapis.com/youtube/v3/videos?${statsParams.toString()}`
        );

      if (statsRes.ok) {
        const statsData =
          await statsRes.json();

        statisticsById =
          new Map(
            (
              statsData.items ??
              []
            ).map(
              (video: any) => [
                String(
                  video.id
                ),
                {
                  viewCount:
                    Number(
                      video
                        ?.statistics
                        ?.viewCount ??
                      0
                    ),
                  likeCount:
                    video
                      ?.statistics
                      ?.likeCount !=
                    null
                      ? Number(
                          video
                            .statistics
                            .likeCount
                        )
                      : null,
                },
              ]
            )
          );
      } else {
        console.warn(
          "YOUTUBE STATISTICS API ERROR:",
          await statsRes.text()
        );
      }
    } catch (statsError) {
      console.warn(
        "YOUTUBE STATISTICS LOAD ERROR:",
        statsError
      );
    }
  }

  return searchItems
    .map(
      (item: any) => {
        const id =
          String(
            item.id.videoId
          );

        const statistics =
          statisticsById.get(
            id
          );

        return {
          id,
          title:
            item.snippet?.title ??
            "",
          thumbnail:
            item.snippet
              ?.thumbnails
              ?.medium?.url ??
            item.snippet
              ?.thumbnails
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
          viewCount:
            statistics
              ?.viewCount ??
            0,
          likeCount:
            statistics
              ?.likeCount ??
            null,
          videoUrl:
            `https://www.youtube.com/embed/${id}`,
        };
      }
    )
    .sort(
      (
        left: any,
        right: any
      ) =>
        Number(
          right.viewCount ??
          0
        ) -
        Number(
          left.viewCount ??
          0
        )
    );
}
