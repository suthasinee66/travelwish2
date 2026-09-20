import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Heart,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Sidebar from "@/components/Sidebar";
import AddPlaceToTripModal from "@/components/AddPlaceToTripModal";
import { useImageSwipe } from "@/hooks/useImageSwipe";
import { supabase } from "@/lib/supabase";
import { useTravelStore } from "@/store/travelStore";
import { getRecommendations } from "@/lib/recommend/getRecommendations";
import { loadNearbyPlaces } from "@/lib/travel/loadNearbyPlaces";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — TravelWise" },
      {
        name: "description",
        content:
          "ค้นหาสถานที่ท่องเที่ยวที่เหมาะกับคุณจากคำแนะนำส่วนตัวและสถานที่ใกล้เคียง",
      },
    ],
  }),
  component: Explore,
});

const quickCategories = [
  { label: "ทั้งหมด", value: "all" },
  { label: "ธรรมชาติ", value: "ธรรมชาติ" },
  { label: "ภูเขา", value: "ภูเขา" },
  { label: "ทะเล", value: "ทะเล" },
  { label: "วัฒนธรรม", value: "วัฒนธรรม" },
  { label: "คาเฟ่", value: "คาเฟ่" },
  { label: "เมือง", value: "เมือง" },
];

const categoryAliases: Record<string, string[]> = {
  ธรรมชาติ: ["ธรรมชาติ", "nature"],
  ภูเขา: ["ภูเขา", "mountain", "mountains"],
  ทะเล: ["ทะเล", "beach", "beaches", "island"],
  วัฒนธรรม: ["วัฒนธรรม", "culture", "cultural"],
  คาเฟ่: ["คาเฟ่", "cafe", "coffee"],
  เมือง: ["เมือง", "city", "cities", "urban"],
};

function asTextArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => String(item));
  }

  if (value == null || value === "") {
    return [];
  }

  return [String(value)];
}

function uniquePlaces(places: any[]) {
  const map = new globalThis.Map<string, any>();

  places.forEach((place) => {
    if (!place?.att_id) return;

    const key = String(place.att_id);

    if (!map.has(key)) {
      map.set(key, place);
      return;
    }

    const existing = map.get(key);

    map.set(key, {
      ...existing,
      ...place,
      images:
        place.images?.length
          ? place.images
          : existing.images,
      distance:
        place.distance ??
        existing.distance,
    });
  });

  return [...map.values()];
}

function Explore() {
  const [placeToAddTrip, setPlaceToAddTrip] =
    useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState<
    Record<string, number>
  >({});
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("all");
  const [selectedRegion, setSelectedRegion] =
    useState("");
  const [selectedAtmosphere, setSelectedAtmosphere] =
    useState("");
  const [showFilters, setShowFilters] = useState(false);

  const imageSwipeProps = useImageSwipe();

  const {
    user,
    recommend,
    explorePlaces,
    nearbyPlaces,
    savedIds,
    setSavedIds,
    setRecommend,
    setExplorePlaces,
    setNearbyPlaces,
  } = useTravelStore();

  useEffect(() => {
    if (!explorePlaces.length) {
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadSaved() {
      const { data: userData } =
        await supabase.auth.getUser();

      if (!userData.user) return;

      const { data } = await supabase
        .from("saved_places")
        .select("att_id")
        .eq(
          "profile_id",
          userData.user.id
        );

      setSavedIds(
        data?.map((item) => item.att_id) || []
      );
    }

    loadSaved();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      if (explorePlaces.length) {
        return;
      }

      const { data: userData } =
        await supabase.auth.getUser();

      if (!userData.user) {
        return;
      }

      const { data: pref } = await supabase
        .from("user_preferences")
        .select("*")
        .eq(
          "profile_id",
          userData.user.id
        )
        .single();

      const rec =
        await getRecommendations(pref);

      setRecommend(rec.slice(0, 8));
      setExplorePlaces(rec);

      const nearby =
        await loadNearbyPlaces();

      setNearbyPlaces(nearby);
    } catch (error) {
      console.error(
        "❌ EXPLORE LOAD ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  function changeImage(
    id: string,
    direction: "next" | "prev",
    length: number
  ) {
    if (!length) return;

    setImageIndex((prev) => {
      const current = prev[id] || 0;

      return {
        ...prev,
        [id]:
          direction === "next"
            ? (current + 1) % length
            : (current - 1 + length) %
              length,
      };
    });
  }

  async function handleSave(place: any) {
    const { data: userData } =
      await supabase.auth.getUser();

    if (!userData.user) return;

    const isSaved =
      savedIds.includes(place.att_id);

    if (isSaved) {
      const { error } = await supabase
        .from("saved_places")
        .delete()
        .eq(
          "profile_id",
          userData.user.id
        )
        .eq(
          "att_id",
          place.att_id
        );

      if (!error) {
        setSavedIds(
          savedIds.filter(
            (id) =>
              id !== place.att_id
          )
        );
      }

      return;
    }

    const { error } = await supabase
      .from("saved_places")
      .insert({
        profile_id:
          userData.user.id,
        att_id: place.att_id,
        collection: "Want to go",
      });

    if (!error) {
      setSavedIds([
        ...savedIds,
        place.att_id,
      ]);
    }
  }

  const allExplorePlaces = useMemo(
    () =>
      uniquePlaces([
        ...explorePlaces,
        ...nearbyPlaces,
      ]),
    [explorePlaces, nearbyPlaces]
  );

  const regionOptions = useMemo(
    () =>
      [
        ...new Set(
          allExplorePlaces
            .map((place) => place.region)
            .filter(Boolean)
            .map(String)
        ),
      ].sort((a, b) =>
        a.localeCompare(b, "th")
      ),
    [allExplorePlaces]
  );

  const atmosphereOptions = useMemo(
    () =>
      [
        ...new Set(
          allExplorePlaces.flatMap(
            (place) =>
              asTextArray(
                place.atmosphere
              )
          )
        ),
      ]
        .filter(Boolean)
        .sort((a, b) =>
          a.localeCompare(b, "th")
        ),
    [allExplorePlaces]
  );

  function matchesFilters(place: any) {
    const keyword =
      searchText.trim().toLowerCase();

    const searchable = [
      place.name_th,
      place.name_en,
      place.province,
      place.region,
      place.type,
      ...asTextArray(
        place.travel_type
      ),
      ...asTextArray(
        place.category
      ),
      ...asTextArray(
        place.activities
      ),
      ...asTextArray(
        place.atmosphere
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !keyword ||
      searchable.includes(keyword);

    const categoryValues = [
      ...asTextArray(
        place.travel_type
      ),
      ...asTextArray(
        place.category
      ),
      ...asTextArray(place.type),
    ]
      .join(" ")
      .toLowerCase();

    const aliases =
      categoryAliases[
        selectedCategory
      ] || [];

    const matchesCategory =
      selectedCategory === "all" ||
      aliases.some((alias) =>
        categoryValues.includes(
          alias.toLowerCase()
        )
      );

    const matchesRegion =
      !selectedRegion ||
      String(place.region || "") ===
        selectedRegion;

    const matchesAtmosphere =
      !selectedAtmosphere ||
      asTextArray(
        place.atmosphere
      ).some(
        (value) =>
          value ===
          selectedAtmosphere
      );

    return (
      matchesSearch &&
      matchesCategory &&
      matchesRegion &&
      matchesAtmosphere
    );
  }

  const filteredPlaces = useMemo(
    () =>
      allExplorePlaces.filter(
        matchesFilters
      ),
    [
      allExplorePlaces,
      searchText,
      selectedCategory,
      selectedRegion,
      selectedAtmosphere,
    ]
  );

  const filteredRecommend = useMemo(
    () =>
      recommend
        .filter(matchesFilters)
        .slice(0, 8),
    [
      recommend,
      searchText,
      selectedCategory,
      selectedRegion,
      selectedAtmosphere,
    ]
  );

  const filteredNearby = useMemo(
    () =>
      nearbyPlaces
        .filter(matchesFilters)
        .slice(0, 8),
    [
      nearbyPlaces,
      searchText,
      selectedCategory,
      selectedRegion,
      selectedAtmosphere,
    ]
  );

  const hasFilters =
    Boolean(searchText.trim()) ||
    selectedCategory !== "all" ||
    Boolean(selectedRegion) ||
    Boolean(selectedAtmosphere);

  const activeFilterCount = [
    selectedCategory !== "all",
    Boolean(selectedRegion),
    Boolean(selectedAtmosphere),
  ].filter(Boolean).length;

  function clearFilters() {
    setSearchText("");
    setSelectedCategory("all");
    setSelectedRegion("");
    setSelectedAtmosphere("");
  }

  function PlaceCard({
    place,
    compact = false,
  }: {
    place: any;
    compact?: boolean;
  }) {
    const images =
      Array.isArray(place.images) &&
      place.images.length
        ? place.images
        : place.image
          ? [place.image]
          : [
              "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1000&q=80",
            ];

    const currentImage =
      imageIndex[String(place.att_id)] ||
      0;

    const saved =
      savedIds.includes(place.att_id);

    return (
      <article
        className="
          group
          overflow-hidden
          rounded-[24px]
          border
          border-[#eadfeb]
          bg-[#fffdfb]
          shadow-[0_8px_30px_rgba(91,72,117,0.07)]
          transition
          duration-200
          hover:-translate-y-0.5
          hover:shadow-[0_14px_36px_rgba(91,72,117,0.12)]
        "
      >
        <div
          data-image-carousel
          {...imageSwipeProps(
            (direction) =>
              changeImage(
                String(
                  place.att_id
                ),
                direction,
                images.length
              ),
            images.length > 1
          )}
          className={`
            relative
            overflow-hidden
            ${compact
              ? "h-40 sm:h-44"
              : "h-44 sm:h-48"
            }
          `}
        >
          <img
            src={
              images[
                Math.min(
                  currentImage,
                  images.length - 1
                )
              ]
            }
            alt={
              place.name_th ||
              place.name_en ||
              "สถานที่ท่องเที่ยว"
            }
            draggable={false}
            className="
              h-full
              w-full
              object-cover
              transition
              duration-500
              group-hover:scale-[1.03]
            "
          />

          <div className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-t
            from-black/35
            via-transparent
            to-black/5
          " />

          <div className="
            absolute
            left-3
            right-3
            top-3
            z-20
            flex
            items-center
            justify-between
          ">
            <button
              type="button"
              aria-label={
                saved
                  ? "Remove from saved"
                  : "Save place"
              }
              onClick={(event) => {
                event.stopPropagation();
                handleSave(place);
              }}
              className={`
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                border
                shadow-sm
                transition
                ${saved
                  ? "border-white bg-white text-rose-500"
                  : "border-white/70 bg-white/95 text-[#573d63] hover:bg-white"
                }
              `}
            >
              <Heart
                size={17}
                className={
                  saved
                    ? "fill-rose-500"
                    : ""
                }
              />
            </button>

            <button
              type="button"
              aria-label="Add to trip"
              onClick={(event) => {
                event.stopPropagation();
                setPlaceToAddTrip(place);
              }}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                border
                border-white/70
                bg-white/95
                text-[#573d63]
                shadow-sm
                transition
                hover:bg-white
              "
            >
              <Plus
                size={18}
                strokeWidth={2.4}
              />
            </button>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  changeImage(
                    String(
                      place.att_id
                    ),
                    "prev",
                    images.length
                  );
                }}
                className="
                  absolute
                  left-2
                  top-1/2
                  z-20
                  flex
                  h-8
                  w-8
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-full
                  bg-white/95
                  text-lg
                  text-[#573d63]
                  shadow
                "
              >
                ‹
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  changeImage(
                    String(
                      place.att_id
                    ),
                    "next",
                    images.length
                  );
                }}
                className="
                  absolute
                  right-2
                  top-1/2
                  z-20
                  flex
                  h-8
                  w-8
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-full
                  bg-white/95
                  text-lg
                  text-[#573d63]
                  shadow
                "
              >
                ›
              </button>

              <div className="
                absolute
                bottom-3
                left-1/2
                z-20
                flex
                -translate-x-1/2
                gap-1
              ">
                {images
                  .slice(0, 6)
                  .map(
                    (
                      _: any,
                      index: number
                    ) => (
                      <span
                        key={index}
                        className={`
                          h-1.5
                          rounded-full
                          transition-all
                          ${currentImage ===
                          index
                            ? "w-4 bg-white"
                            : "w-1.5 bg-white/60"
                          }
                        `}
                      />
                    )
                  )}
              </div>
            </>
          )}
        </div>

        <div className="p-4">
          <h3 className="
            line-clamp-1
            text-sm
            font-bold
            text-[#49334f]
            sm:text-[15px]
          ">
            {place.name_th ||
              place.name_en ||
              "สถานที่ท่องเที่ยว"}
          </h3>

          <div className="
            mt-1.5
            flex
            items-center
            gap-1
            text-[11px]
            text-[#85778a]
          ">
            <MapPin
              size={12}
              className="shrink-0"
            />
            <span className="truncate">
              {place.province ||
                "ประเทศไทย"}
              {Number.isFinite(
                Number(
                  place.distance
                )
              )
                ? ` · ${Number(
                    place.distance
                  ).toFixed(1)} กม.`
                : ""}
            </span>
          </div>

          {asTextArray(
            place.travel_type
          ).length > 0 && (
            <div className="
              mt-3
              flex
              flex-wrap
              gap-1.5
            ">
              {asTextArray(
                place.travel_type
              )
                .slice(0, 2)
                .map((tag) => (
                  <span
                    key={tag}
                    className="
                      rounded-full
                      bg-[#f5eef7]
                      px-2
                      py-1
                      text-[10px]
                      font-medium
                      text-[#6f456f]
                    "
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="
      travel-home
      flex
      h-screen
      bg-background
      text-foreground
    ">
      <Sidebar user={user} />

      <AddPlaceToTripModal
        open={!!placeToAddTrip}
        place={placeToAddTrip}
        onClose={() =>
          setPlaceToAddTrip(null)
        }
      />

      <main className="
        travel-main
        min-w-0
        flex-1
        overflow-y-auto
      ">
        <div className="
          mx-auto
          w-full
          max-w-7xl
          px-4
          pb-12
          pt-4
          sm:px-6
          sm:pt-5
          md:pt-6
          lg:px-8
        ">
          <section className="
            mb-6
            pl-12
            sm:pl-0
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-end
            sm:justify-between
          ">
            <div>
              <div className="
                mb-2
                inline-flex
                items-center
                gap-1.5
                rounded-full
                bg-[#f5eef7]
                px-3
                py-1
                text-[11px]
                font-semibold
                text-[#6f456f]
              ">
                <Sparkles size={12} />
                Discover your next trip
              </div>

              <h2 className="
                text-2xl
                font-bold
                tracking-[-0.03em]
                text-[#49334f]
                sm:text-3xl
              ">
                ไปเที่ยวไหนดี?
              </h2>

              <p className="
                mt-1
                max-w-xl
                text-sm
                leading-6
                text-[#817487]
              ">
                ค้นหาสถานที่จากความชอบของคุณ
                หรือเลือกหมวดที่สนใจได้เลย
              </p>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="
                  self-start
                  text-xs
                  font-semibold
                  text-[#6f456f]
                  hover:underline
                  sm:self-auto
                "
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </section>

          <div className="
            mb-5
            flex
            items-center
            gap-2.5
          ">
            <div className="
              relative
              min-w-0
              flex-1
            ">
              <Search className="
                absolute
                left-3.5
                top-1/2
                h-4
                w-4
                -translate-y-1/2
                text-[#8c7f90]
              " />

              <input
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
                placeholder="ค้นหาสถานที่ จังหวัด หรือกิจกรรม"
                className="
                  h-11
                  w-full
                  rounded-2xl
                  border
                  border-[#e6dce8]
                  bg-white
                  pl-10
                  pr-10
                  text-sm
                  text-[#49334f]
                  shadow-[0_4px_18px_rgba(91,72,117,0.04)]
                  outline-none
                  placeholder:text-[#a79dab]
                  focus:border-[#b99bc5]
                  focus:ring-2
                  focus:ring-[#b99bc5]/15
                "
              />

              {searchText && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchText("")
                  }
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    rounded-full
                    p-1
                    text-[#8c7f90]
                    hover:bg-[#f5eef7]
                  "
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (value) => !value
                )
              }
              style={
                showFilters ||
                activeFilterCount > 0
                  ? {
                      color: "#ffffff",
                    }
                  : undefined
              }
              className={`
                relative
                flex
                h-11
                shrink-0
                items-center
                gap-2
                rounded-2xl
                border
                px-3.5
                text-sm
                font-semibold
                transition
                ${showFilters ||
                activeFilterCount > 0
                  ? "border-transparent bg-gradient-to-r from-[#6f456f] via-[#936493] to-[#c28eaa] !text-white shadow-[0_7px_18px_rgba(111,69,111,0.20)]"
                  : "border-[#e6dce8] bg-white text-[#685b6d] hover:border-[#cdb8d4] hover:bg-[#faf6fb]"
                }
              `}
            >
              <SlidersHorizontal
                size={16}
              />
              <span className="hidden sm:inline">
                Filters
              </span>

              {activeFilterCount > 0 && (
                <span className="
                  flex
                  h-5
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-white/20
                  px-1
                  text-[10px]
                  !text-white
                ">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="
            -mx-1
            flex
            gap-2
            overflow-x-auto
            px-1
            pb-2
            scrollbar-hide
          ">
            {quickCategories.map(
              (category) => (
                <button
                  key={
                    category.value
                  }
                  type="button"
                  onClick={() =>
                    setSelectedCategory(
                      category.value
                    )
                  }
                  style={
                    selectedCategory ===
                    category.value
                      ? {
                          color: "#ffffff",
                        }
                      : undefined
                  }
                  className={`
                    shrink-0
                    rounded-full
                    border
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    transition
                    ${selectedCategory ===
                    category.value
                      ? "border-transparent bg-gradient-to-r from-[#6f456f] via-[#936493] to-[#c28eaa] !text-white shadow-[0_7px_18px_rgba(111,69,111,0.18)]"
                      : "border-[#e6dce8] bg-[#fffdfb] text-[#685b6d] hover:border-[#cdb8d4] hover:bg-[#f8f2fa]"
                    }
                  `}
                >
                  {category.label}
                </button>
              )
            )}
          </div>

          {showFilters && (
            <section
              style={{
                backgroundColor:
                  "#fffdfb",
                opacity: 1,
              }}
              className="
                mt-4
                grid
                gap-4
                rounded-[24px]
                border
                border-[#eadfeb]
                bg-[#fffdfb]
                p-4
                shadow-[0_12px_35px_rgba(91,72,117,0.08)]
                sm:grid-cols-2
                sm:p-5
              "
            >
              <label className="block">
                <span className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-[#685b6d]
                ">
                  ภูมิภาค
                </span>

                <select
                  value={selectedRegion}
                  onChange={(event) =>
                    setSelectedRegion(
                      event.target.value
                    )
                  }
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-[#e3d7e6]
                    bg-white
                    px-3
                    text-sm
                    text-[#49334f]
                    outline-none
                    focus:border-[#b89bcb]
                  "
                >
                  <option value="">
                    ทุกภูมิภาค
                  </option>

                  {regionOptions.map(
                    (region) => (
                      <option
                        key={region}
                        value={region}
                      >
                        {region}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-[#685b6d]
                ">
                  บรรยากาศ
                </span>

                <select
                  value={
                    selectedAtmosphere
                  }
                  onChange={(event) =>
                    setSelectedAtmosphere(
                      event.target.value
                    )
                  }
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-[#e3d7e6]
                    bg-white
                    px-3
                    text-sm
                    text-[#49334f]
                    outline-none
                    focus:border-[#b89bcb]
                  "
                >
                  <option value="">
                    ทุกบรรยากาศ
                  </option>

                  {atmosphereOptions.map(
                    (atmosphere) => (
                      <option
                        key={
                          atmosphere
                        }
                        value={
                          atmosphere
                        }
                      >
                        {atmosphere}
                      </option>
                    )
                  )}
                </select>
              </label>
            </section>
          )}

          {loading ? (
            <div className="
              mt-8
              grid
              grid-cols-2
              gap-3
              sm:grid-cols-3
              lg:grid-cols-4
            ">
              {Array.from({
                length: 8,
              }).map((_, index) => (
                <div
                  key={index}
                  className="
                    overflow-hidden
                    rounded-[24px]
                    border
                    border-[#eadfeb]
                    bg-[#fffdfb]
                  "
                >
                  <div className="
                    h-44
                    animate-pulse
                    bg-[#f0e8f1]
                  " />
                  <div className="p-4">
                    <div className="
                      h-4
                      w-3/4
                      animate-pulse
                      rounded
                      bg-[#eee5ef]
                    " />
                    <div className="
                      mt-2
                      h-3
                      w-1/2
                      animate-pulse
                      rounded
                      bg-[#f3edf4]
                    " />
                  </div>
                </div>
              ))}
            </div>
          ) : hasFilters ? (
            <section className="mt-8">
              <div className="
                mb-4
                flex
                items-center
                justify-between
              ">
                <div>
                  <h2 className="
                    text-lg
                    font-bold
                    text-[#49334f]
                  ">
                    ผลการค้นหา
                  </h2>
                  <p className="
                    mt-0.5
                    text-xs
                    text-[#8a7b90]
                  ">
                    พบ {filteredPlaces.length} สถานที่
                  </p>
                </div>
              </div>

              {filteredPlaces.length ? (
                <div className="
                  grid
                  grid-cols-2
                  gap-3
                  sm:grid-cols-3
                  lg:grid-cols-4
                  xl:grid-cols-5
                ">
                  {filteredPlaces.map(
                    (place) => (
                      <PlaceCard
                        key={
                          place.att_id
                        }
                        place={place}
                        compact
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="
                  rounded-[24px]
                  border
                  border-dashed
                  border-[#d9c9de]
                  bg-[#fffdfb]
                  px-5
                  py-12
                  text-center
                ">
                  <Search className="
                    mx-auto
                    h-8
                    w-8
                    text-[#b29eb8]
                  " />
                  <h3 className="
                    mt-3
                    font-semibold
                    text-[#49334f]
                  ">
                    ยังไม่พบสถานที่ที่ตรงกับตัวกรอง
                  </h3>
                  <p className="
                    mt-1
                    text-xs
                    text-[#8a7b90]
                  ">
                    ลองเปลี่ยนหมวดหมู่
                    ภูมิภาค หรือคำค้นหา
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="
                      mt-4
                      rounded-full
                      bg-[#573d63]
                      px-4
                      py-2
                      text-xs
                      font-semibold
                      text-white
                    "
                  >
                    ล้างตัวกรอง
                  </button>
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="mt-8">
                <div className="
                  mb-4
                  flex
                  items-end
                  justify-between
                ">
                  <div>
                    <h2 className="
                      text-lg
                      font-bold
                      text-[#49334f]
                    ">
                      แนะนำสำหรับคุณ
                    </h2>
                    <p className="
                      mt-0.5
                      text-xs
                      text-[#8a7b90]
                    ">
                      เลือกจากความชอบในโปรไฟล์ของคุณ
                    </p>
                  </div>

                  <Link
                    to="/explore_recommend_all"
                    search={{
                      type: "recommend",
                    }}
                    className="
                      shrink-0
                      rounded-full
                      border
                      border-[#dac9df]
                      bg-[#fffdfb]
                      px-3
                      py-1.5
                      text-xs
                      font-semibold
                      text-[#6f456f]
                      transition
                      hover:border-[#b99bc5]
                      hover:bg-[#f5eef7]
                    "
                  >
                    เพิ่มเติม →
                  </Link>
                </div>

                <div className="
                  grid
                  grid-cols-2
                  gap-3
                  sm:grid-cols-3
                  lg:grid-cols-4
                ">
                  {filteredRecommend.map(
                    (place) => (
                      <PlaceCard
                        key={
                          place.att_id
                        }
                        place={place}
                      />
                    )
                  )}
                </div>
              </section>

              {filteredNearby.length >
                0 && (
                <section className="mt-10">
                  <div className="
                    mb-4
                    flex
                    items-end
                    justify-between
                  ">
                    <div>
                      <h2 className="
                        text-lg
                        font-bold
                        text-[#49334f]
                      ">
                        สถานที่ใกล้คุณ
                      </h2>
                      <p className="
                        mt-0.5
                        text-xs
                        text-[#8a7b90]
                      ">
                        เรียงจากสถานที่ที่อยู่ใกล้คุณ
                      </p>
                    </div>

                    <Link
                      to="/explore_nearby_all"
                      search={{
                        type: "nearby",
                      }}
                      className="
                        shrink-0
                        rounded-full
                        border
                        border-[#dac9df]
                        bg-[#fffdfb]
                        px-3
                        py-1.5
                        text-xs
                        font-semibold
                        text-[#6f456f]
                        transition
                        hover:border-[#b99bc5]
                        hover:bg-[#f5eef7]
                      "
                    >
                      เพิ่มเติม →
                    </Link>
                  </div>

                  <div className="
                    grid
                    grid-cols-2
                    gap-3
                    sm:grid-cols-3
                    lg:grid-cols-4
                  ">
                    {filteredNearby.map(
                      (place) => (
                        <PlaceCard
                          key={
                            place.att_id
                          }
                          place={place}
                          compact
                        />
                      )
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
