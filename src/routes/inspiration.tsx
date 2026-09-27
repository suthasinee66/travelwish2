import {
  createFileRoute,
} from "@tanstack/react-router";
import {
  ExternalLink,
  Lightbulb,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Sidebar from "@/components/Sidebar";
import {
  getGuestPreferences,
  isGuestUser,
} from "@/lib/guest/guestPreferences";
import {
  getRecommendations as getInspireVideos,
} from "@/lib/inspire/getRecommendations";
import { supabase } from "@/lib/supabase";

export const Route =
  createFileRoute(
    "/inspiration"
  )({
    head: () => ({
      meta: [
        {
          title:
            "Inspiration — TravelWish",
        },
        {
          name:
            "description",
          content:
            "วิดีโอและไอเดียท่องเที่ยวที่คัดตามสไตล์ของคุณ",
        },
      ],
    }),
    component: Inspiration,
  });

type InspireVideo = {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt?: string | null;
  videoUrl: string;
};

function cleanYouTubeText(
  value: unknown
) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function asArray(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item =>
        String(item ?? "").trim()
      )
      .filter(Boolean);
  }

  if (
    value == null ||
    value === ""
  ) {
    return [];
  }

  return [
    String(value).trim(),
  ].filter(Boolean);
}

function formatPublishedDate(
  value?: string | null
) {
  if (!value) return null;

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function Inspiration() {
  const [user, setUser] =
    useState<any>(null);

  const [
    preferences,
    setPreferences,
  ] =
    useState<any>(null);

  const [
    videos,
    setVideos,
  ] =
    useState<InspireVideo[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    selectedVideo,
    setSelectedVideo,
  ] =
    useState<InspireVideo | null>(
      null
    );

  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(0);

  useEffect(() => {
    let cancelled =
      false;

    async function loadProfile() {
      try {
        const {
          data,
        } =
          await supabase.auth
            .getUser();

        if (
          cancelled
        ) {
          return;
        }

        const currentUser =
          data.user;

        setUser(
          currentUser
        );

        if (
          !currentUser
        ) {
          setPreferences(
            null
          );
          return;
        }

        if (
          isGuestUser(
            currentUser
          )
        ) {
          setPreferences(
            getGuestPreferences()
          );
          return;
        }

        const {
          data:
            preferenceRow,
          error:
            preferenceError,
        } =
          await supabase
            .from(
              "user_preferences"
            )
            .select("*")
            .eq(
              "profile_id",
              currentUser.id
            )
            .maybeSingle();

        if (
          preferenceError
        ) {
          console.warn(
            "INSPIRATION PREFERENCE ERROR:",
            preferenceError
          );
        }

        setPreferences(
          preferenceRow ??
          null
        );
      } catch (profileError) {
        console.error(
          "INSPIRATION PROFILE ERROR:",
          profileError
        );

        if (
          !cancelled
        ) {
          setPreferences(
            null
          );
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled =
        true;
    };
  }, []);

  useEffect(() => {
    let cancelled =
      false;

    async function loadVideos() {
      setLoading(true);
      setError(null);

      try {
        const nextVideos =
          await getInspireVideos(
            preferences ?? {},
            {
              maxResults: 18,
            }
          );

        if (
          cancelled
        ) {
          return;
        }

        setVideos(
          Array.isArray(
            nextVideos
          )
            ? nextVideos
            : []
        );
      } catch (
        inspirationError
      ) {
        console.error(
          "INSPIRATION LOAD ERROR:",
          inspirationError
        );

        if (
          !cancelled
        ) {
          setVideos([]);
          setError(
            "โหลด Inspiration ไม่สำเร็จ ลองใหม่อีกครั้ง"
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(false);
        }
      }
    }

    void loadVideos();

    return () => {
      cancelled =
        true;
    };
  }, [
    preferences,
    refreshKey,
  ]);

  useEffect(() => {
    if (
      !selectedVideo
    ) {
      return;
    }

    const previousOverflow =
      document.body
        .style
        .overflow;

    document.body
      .style
      .overflow =
      "hidden";

    const onKeyDown = (
      event:
        KeyboardEvent
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setSelectedVideo(
          null
        );
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      document.body
        .style
        .overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [
    selectedVideo,
  ]);

  const preferenceChips =
    useMemo(
      () =>
        Array.from(
          new Set([
            ...asArray(
              preferences
                ?.travel_type
            ),
            ...asArray(
              preferences
                ?.activities
            ),
            ...asArray(
              preferences
                ?.atmosphere
            ),
            ...asArray(
              preferences
                ?.personality_tags
            ).map(tag =>
              tag.replace(
                /^[^:]+:\s*/,
                ""
              )
            ),
          ])
        )
          .filter(Boolean)
          .slice(0, 7),
      [preferences]
    );

  const filteredVideos =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return videos;
      }

      return videos.filter(
        video => {
          const text =
            [
              video.title,
              video.channelTitle,
            ]
              .join(" ")
              .toLowerCase();

          return text.includes(
            keyword
          );
        }
      );
    }, [
      videos,
      search,
    ]);

  const featured =
    filteredVideos[0] ??
    null;

  const remaining =
    featured
      ? filteredVideos
          .slice(1)
      : [];

  const userName =
    user?.user_metadata
      ?.full_name ??
    user?.email
      ?.split("@")[0] ??
    null;

  return (
    <>
      <div
        className="
          travel-home
          flex
          h-screen
          overflow-hidden
          text-foreground
          aurora-canvas
        "
      >
        <Sidebar
          user={user}
        />

        <main
          className="
            min-w-0
            flex-1
            overflow-y-auto
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-[1500px]
              px-4
              pb-16
              pt-8
              sm:px-7
              lg:px-10
            "
          >
            <section
              className="
                relative
                overflow-hidden
                rounded-[32px]
                border
                border-white/80
                bg-white/70
                px-5
                py-7
                shadow-[0_20px_60px_rgba(91,72,117,0.10)]
                backdrop-blur-xl
                sm:px-8
                sm:py-9
              "
            >
              <div
                className="
                  pointer-events-none
                  absolute
                  -right-16
                  -top-20
                  h-64
                  w-64
                  rounded-full
                  bg-[#e9a8c9]/20
                  blur-3xl
                "
              />

              <div
                className="
                  pointer-events-none
                  absolute
                  -bottom-24
                  left-1/3
                  h-56
                  w-56
                  rounded-full
                  bg-[#a9dce8]/25
                  blur-3xl
                "
              />

              <div
                className="
                  relative
                  z-10
                  flex
                  flex-col
                  gap-6
                  lg:flex-row
                  lg:items-end
                  lg:justify-between
                "
              >
                <div
                  className="
                    max-w-3xl
                  "
                >
                  <div
                    className="
                      mb-4
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      border
                      border-[#eadfeb]
                      bg-white/80
                      px-3
                      py-1.5
                      text-xs
                      font-semibold
                      text-[#6f456f]
                      shadow-sm
                    "
                  >
                    <Sparkles
                      className="h-3.5 w-3.5"
                    />
                    Curated for you
                  </div>

                  <h1
                    className="
                      text-3xl
                      font-extrabold
                      tracking-tight
                      text-[#443149]
                      sm:text-4xl
                      lg:text-[42px]
                      lg:leading-[1.12]
                    "
                  >
                    Inspiration
                    {userName
                      ? ` สำหรับ ${userName}`
                      : ""}
                  </h1>

                  <p
                    className="
                      mt-3
                      max-w-2xl
                      text-sm
                      leading-6
                      text-[#817487]
                      sm:text-base
                    "
                  >
                    หาไอเดียทริปใหม่จากวิดีโอท่องเที่ยวที่คัดตามความสนใจ
                    บรรยากาศ และสไตล์การเดินทางของคุณ
                  </p>

                  {preferenceChips
                    .length >
                    0 && (
                    <div
                      className="
                        mt-5
                        flex
                        flex-wrap
                        gap-2
                      "
                    >
                      {preferenceChips
                        .map(
                          chip => (
                            <span
                              key={
                                chip
                              }
                              className="
                                rounded-full
                                border
                                border-[#e9deeb]
                                bg-[#faf6fb]
                                px-3
                                py-1.5
                                text-xs
                                font-medium
                                text-[#6f5a76]
                              "
                            >
                              {chip}
                            </span>
                          )
                        )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setRefreshKey(
                      value =>
                        value + 1
                    )
                  }
                  disabled={
                    loading
                  }
                  className="
                    inline-flex
                    min-h-11
                    shrink-0
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    border
                    border-[#dfd3e2]
                    bg-white
                    px-5
                    text-sm
                    font-semibold
                    text-[#634c69]
                    shadow-sm
                    transition
                    hover:-translate-y-0.5
                    hover:shadow-md
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <RefreshCw
                    className={`
                      h-4
                      w-4
                      ${loading
                        ? "animate-spin"
                        : ""}
                    `}
                  />
                  Refresh ideas
                </button>
              </div>
            </section>

            <div
              className="
                mt-7
                flex
                flex-col
                gap-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Lightbulb
                    className="
                      h-5
                      w-5
                      text-[#6f456f]
                    "
                  />

                  <h2
                    className="
                      text-xl
                      font-bold
                      text-[#443149]
                    "
                  >
                    ไอเดียที่น่าจะตรงกับคุณ
                  </h2>
                </div>

                <p
                  className="
                    mt-1
                    text-xs
                    text-[#928397]
                  "
                >
                  {loading
                    ? "กำลังค้นหาแรงบันดาลใจ..."
                    : `${filteredVideos.length} วิดีโอสำหรับคุณ`}
                </p>
              </div>

              <label
                className="
                  flex
                  min-h-11
                  w-full
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-[#e4dae6]
                  bg-white/90
                  px-4
                  shadow-sm
                  sm:w-[320px]
                "
              >
                <Search
                  className="
                    h-4
                    w-4
                    shrink-0
                    text-[#9b8c9f]
                  "
                />

                <input
                  value={
                    search
                  }
                  onChange={
                    event =>
                      setSearch(
                        event.target
                          .value
                      )
                  }
                  placeholder="ค้นหาจากชื่อวิดีโอหรือช่อง..."
                  className="
                    min-w-0
                    flex-1
                    bg-transparent
                    text-sm
                    outline-none
                    placeholder:text-[#aaa0ad]
                  "
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch(
                        ""
                      )
                    }
                    className="
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-full
                      text-[#8b7d90]
                      hover:bg-[#f5eef7]
                    "
                    aria-label="ล้างคำค้น"
                  >
                    <X
                      className="h-3.5 w-3.5"
                    />
                  </button>
                )}
              </label>
            </div>

            {loading ? (
              <div
                className="
                  mt-5
                  grid
                  grid-cols-1
                  gap-5
                  sm:grid-cols-2
                  xl:grid-cols-3
                "
              >
                {Array.from({
                  length: 6,
                }).map(
                  (
                    _,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="
                        overflow-hidden
                        rounded-[24px]
                        border
                        border-[#eee6f0]
                        bg-white/80
                        shadow-sm
                      "
                    >
                      <div
                        className="
                          aspect-video
                          animate-pulse
                          bg-[#eee8f0]
                        "
                      />

                      <div
                        className="p-4"
                      >
                        <div
                          className="
                            h-4
                            w-4/5
                            animate-pulse
                            rounded-full
                            bg-[#ede7ee]
                          "
                        />

                        <div
                          className="
                            mt-3
                            h-3
                            w-1/2
                            animate-pulse
                            rounded-full
                            bg-[#f2edf3]
                          "
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : error ? (
              <div
                className="
                  mt-6
                  rounded-[26px]
                  border
                  border-[#eadfeb]
                  bg-white/85
                  px-6
                  py-14
                  text-center
                  shadow-sm
                "
              >
                <p
                  className="
                    text-sm
                    font-medium
                    text-[#745f79]
                  "
                >
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setRefreshKey(
                      value =>
                        value + 1
                    )
                  }
                  className="
                    mt-4
                    rounded-full
                    bg-[#573d63]
                    px-5
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                  "
                >
                  ลองอีกครั้ง
                </button>
              </div>
            ) : filteredVideos
                .length ===
              0 ? (
              <div
                className="
                  mt-6
                  rounded-[26px]
                  border
                  border-dashed
                  border-[#dfd3e2]
                  bg-white/60
                  px-6
                  py-14
                  text-center
                "
              >
                <Lightbulb
                  className="
                    mx-auto
                    h-8
                    w-8
                    text-[#b89bcb]
                  "
                />

                <h3
                  className="
                    mt-3
                    font-bold
                    text-[#514058]
                  "
                >
                  ไม่พบวิดีโอที่ค้นหา
                </h3>

                <p
                  className="
                    mt-1
                    text-sm
                    text-[#928397]
                  "
                >
                  ลองเปลี่ยนคำค้น หรือรีเฟรชไอเดียใหม่
                </p>
              </div>
            ) : (
              <>
                {featured && (
                  <section
                    className="
                      mt-5
                      overflow-hidden
                      rounded-[28px]
                      border
                      border-[#e8ddea]
                      bg-white
                      shadow-[0_16px_50px_rgba(91,72,117,0.11)]
                    "
                  >
                    <div
                      className="
                        grid
                        lg:grid-cols-[1.55fr_1fr]
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedVideo(
                            featured
                          )
                        }
                        className="
                          group
                          relative
                          aspect-video
                          min-h-[250px]
                          overflow-hidden
                          bg-[#241f26]
                          text-left
                          lg:aspect-auto
                          lg:min-h-[390px]
                        "
                      >
                        <img
                          src={
                            featured
                              .thumbnail
                          }
                          alt={
                            cleanYouTubeText(
                              featured
                                .title
                            )
                          }
                          className="
                            h-full
                            w-full
                            object-cover
                            transition
                            duration-500
                            group-hover:scale-[1.025]
                          "
                        />

                        <div
                          className="
                            absolute
                            inset-0
                            bg-gradient-to-t
                            from-black/45
                            via-black/5
                            to-transparent
                          "
                        />

                        <span
                          className="
                            absolute
                            left-1/2
                            top-1/2
                            flex
                            h-16
                            w-16
                            -translate-x-1/2
                            -translate-y-1/2
                            items-center
                            justify-center
                            rounded-full
                            border
                            border-white/60
                            bg-white/90
                            text-[#573d63]
                            shadow-xl
                            transition
                            duration-300
                            group-hover:scale-110
                          "
                        >
                          <Play
                            className="
                              ml-1
                              h-6
                              w-6
                              fill-current
                            "
                          />
                        </span>

                        <span
                          className="
                            absolute
                            left-4
                            top-4
                            rounded-full
                            bg-black/45
                            px-3
                            py-1.5
                            text-[11px]
                            font-bold
                            uppercase
                            tracking-[0.12em]
                            text-white
                            backdrop-blur-md
                          "
                        >
                          Featured
                        </span>
                      </button>

                      <div
                        className="
                          flex
                          flex-col
                          justify-center
                          p-6
                          sm:p-8
                        "
                      >
                        <div
                          className="
                            text-xs
                            font-bold
                            uppercase
                            tracking-[0.14em]
                            text-[#b075a1]
                          "
                        >
                          Recommended for you
                        </div>

                        <h3
                          className="
                            mt-3
                            text-2xl
                            font-extrabold
                            leading-snug
                            text-[#443149]
                            sm:text-3xl
                          "
                        >
                          {cleanYouTubeText(
                            featured
                              .title
                          )}
                        </h3>

                        <p
                          className="
                            mt-3
                            text-sm
                            font-medium
                            text-[#75687b]
                          "
                        >
                          {cleanYouTubeText(
                            featured
                              .channelTitle
                          )}
                        </p>

                        {formatPublishedDate(
                          featured
                            .publishedAt
                        ) && (
                          <p
                            className="
                              mt-1
                              text-xs
                              text-[#9a8da0]
                            "
                          >
                            {formatPublishedDate(
                              featured
                                .publishedAt
                            )}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedVideo(
                              featured
                            )
                          }
                          className="
                            mt-6
                            inline-flex
                            min-h-11
                            w-fit
                            items-center
                            gap-2
                            rounded-full
                            bg-[#573d63]
                            px-5
                            text-sm
                            font-bold
                            text-white
                            shadow-[0_10px_24px_rgba(87,61,99,0.22)]
                            transition
                            hover:-translate-y-0.5
                          "
                        >
                          <Play
                            className="
                              h-4
                              w-4
                              fill-current
                            "
                          />
                          Watch now
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {remaining.length >
                  0 && (
                  <section
                    className="
                      mt-6
                      grid
                      grid-cols-1
                      gap-5
                      sm:grid-cols-2
                      xl:grid-cols-3
                    "
                  >
                    {remaining.map(
                      video => (
                        <article
                          key={
                            video.id
                          }
                          className="
                            group
                            overflow-hidden
                            rounded-[24px]
                            border
                            border-[#e9e0eb]
                            bg-white/95
                            shadow-[0_9px_30px_rgba(91,72,117,0.07)]
                            transition
                            duration-200
                            hover:-translate-y-1
                            hover:shadow-[0_16px_38px_rgba(91,72,117,0.13)]
                          "
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedVideo(
                                video
                              )
                            }
                            className="
                              relative
                              block
                              aspect-video
                              w-full
                              overflow-hidden
                              bg-[#241f26]
                              text-left
                            "
                          >
                            <img
                              src={
                                video.thumbnail
                              }
                              alt={
                                cleanYouTubeText(
                                  video.title
                                )
                              }
                              loading="lazy"
                              className="
                                h-full
                                w-full
                                object-cover
                                transition
                                duration-500
                                group-hover:scale-[1.04]
                              "
                            />

                            <div
                              className="
                                absolute
                                inset-0
                                bg-gradient-to-t
                                from-black/35
                                via-transparent
                                to-transparent
                              "
                            />

                            <span
                              className="
                                absolute
                                left-1/2
                                top-1/2
                                flex
                                h-12
                                w-12
                                -translate-x-1/2
                                -translate-y-1/2
                                items-center
                                justify-center
                                rounded-full
                                bg-white/92
                                text-[#573d63]
                                shadow-lg
                                transition
                                group-hover:scale-110
                              "
                            >
                              <Play
                                className="
                                  ml-0.5
                                  h-5
                                  w-5
                                  fill-current
                                "
                              />
                            </span>
                          </button>

                          <div
                            className="p-4"
                          >
                            <h3
                              className="
                                line-clamp-2
                                min-h-[44px]
                                text-[15px]
                                font-bold
                                leading-[1.45]
                                text-[#4a3850]
                              "
                            >
                              {cleanYouTubeText(
                                video.title
                              )}
                            </h3>

                            <div
                              className="
                                mt-3
                                flex
                                items-end
                                justify-between
                                gap-3
                              "
                            >
                              <div
                                className="
                                  min-w-0
                                "
                              >
                                <p
                                  className="
                                    truncate
                                    text-xs
                                    font-medium
                                    text-[#827486]
                                  "
                                >
                                  {cleanYouTubeText(
                                    video
                                      .channelTitle
                                  )}
                                </p>

                                {formatPublishedDate(
                                  video
                                    .publishedAt
                                ) && (
                                  <p
                                    className="
                                      mt-1
                                      text-[11px]
                                      text-[#a095a3]
                                    "
                                  >
                                    {formatPublishedDate(
                                      video
                                        .publishedAt
                                    )}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedVideo(
                                    video
                                  )
                                }
                                className="
                                  flex
                                  h-9
                                  w-9
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  bg-[#f5eef7]
                                  text-[#6f456f]
                                  transition
                                  hover:bg-[#eadfeb]
                                "
                                aria-label="เล่นวิดีโอ"
                              >
                                <Play
                                  className="
                                    ml-0.5
                                    h-4
                                    w-4
                                    fill-current
                                  "
                                />
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {selectedVideo && (
        <div
          className="
            fixed
            inset-0
            z-[200]
            flex
            items-center
            justify-center
            bg-[#211a24]/70
            p-3
            backdrop-blur-md
            sm:p-6
          "
          onClick={() =>
            setSelectedVideo(
              null
            )
          }
        >
          <div
            className="
              relative
              w-full
              max-w-5xl
              overflow-hidden
              rounded-[26px]
              border
              border-white/20
              bg-[#171219]
              shadow-2xl
            "
            onClick={
              event =>
                event
                  .stopPropagation()
            }
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                border-b
                border-white/10
                px-4
                py-3
                sm:px-5
              "
            >
              <div
                className="
                  min-w-0
                "
              >
                <h3
                  className="
                    truncate
                    text-sm
                    font-bold
                    text-white
                    sm:text-base
                  "
                >
                  {cleanYouTubeText(
                    selectedVideo
                      .title
                  )}
                </h3>

                <p
                  className="
                    mt-0.5
                    truncate
                    text-xs
                    text-white/55
                  "
                >
                  {cleanYouTubeText(
                    selectedVideo
                      .channelTitle
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedVideo(
                    null
                  )
                }
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-white/10
                  text-white
                  transition
                  hover:bg-white/20
                "
                aria-label="ปิดวิดีโอ"
              >
                <X
                  className="h-4 w-4"
                />
              </button>
            </div>

            <div
              className="
                aspect-video
                w-full
                bg-black
              "
            >
              <iframe
                src={
                  selectedVideo
                    .videoUrl
                }
                title={
                  cleanYouTubeText(
                    selectedVideo
                      .title
                  )
                }
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="
                  h-full
                  w-full
                "
              />
            </div>

            <div
              className="
                flex
                items-center
                justify-end
                px-4
                py-3
                sm:px-5
              "
            >
              <a
                href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                target="_blank"
                rel="noreferrer"
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-white/10
                  px-4
                  py-2
                  text-xs
                  font-semibold
                  text-white
                  transition
                  hover:bg-white/20
                "
              >
                เปิดใน YouTube
                <ExternalLink
                  className="h-3.5 w-3.5"
                />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
