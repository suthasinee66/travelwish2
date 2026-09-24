import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Heart,
  MapPin,
  Navigation,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Sidebar from "@/components/Sidebar";
import AddPlaceToTripModal from "@/components/AddPlaceToTripModal";
import PlaceDetailDrawer, { type PlaceDetailTarget } from "@/components/PlaceDetailDrawer";
import { useImageSwipe } from "@/hooks/useImageSwipe";
import { useTravelStore } from "@/store/travelStore";
import { supabase } from "@/lib/supabase";
import { THAI_REGIONS, normalizeThaiRegion } from "@/lib/travel/thaiRegions";

export const Route = createFileRoute("/explore_nearby_all")({
  component: ExploreNearbyAll,
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
      .map(String);
  }

  if (value == null || value === "") {
    return [];
  }

  return [String(value)];
}

function ExploreNearbyAll() {
  const [placeToAddTrip, setPlaceToAddTrip] =
    useState<any | null>(null);
  const [placeDetailTarget, setPlaceDetailTarget] =
    useState<PlaceDetailTarget | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("all");
  const [maxDistance, setMaxDistance] =
    useState("");
  const [selectedRegion, setSelectedRegion] =
    useState("");
  const [showFilters, setShowFilters] =
    useState(false);
  const [imageIndex, setImageIndex] = useState<
    Record<string, number>
  >({});

  const imageSwipeProps = useImageSwipe();

  const {
    user,
    nearbyPlaces,
    savedIds,
    setSavedIds,
  } = useTravelStore();

  useEffect(() => {
    loadSaved();
  }, []);

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
        .eq("att_id", place.att_id);

      if (!error) {
        setSavedIds(
          savedIds.filter(
            (id) => id !== place.att_id
          )
        );
      }

      return;
    }

    const { error } = await supabase
      .from("saved_places")
      .insert({
        profile_id: userData.user.id,
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

  const regionOptions = THAI_REGIONS;

  const filteredPlaces = useMemo(() => {
    const keyword =
      searchText.trim().toLowerCase();

    const aliases =
      categoryAliases[selectedCategory] ||
      [];

    return nearbyPlaces
      .filter((place) => {
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
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const categoryText = [
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

        const distance =
          Number(place.distance);

        const matchesSearch =
          !keyword ||
          searchable.includes(keyword);

        const matchesCategory =
          selectedCategory === "all" ||
          aliases.some((alias) =>
            categoryText.includes(
              alias.toLowerCase()
            )
          );

        const matchesDistance =
          !maxDistance ||
          (
            Number.isFinite(distance) &&
            distance <=
              Number(maxDistance)
          );

        const matchesRegion =
          !selectedRegion ||
          normalizeThaiRegion(
            place.region
          ) === selectedRegion;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesDistance &&
          matchesRegion
        );
      })
      .sort((a, b) => {
        const aDistance =
          Number(a.distance);
        const bDistance =
          Number(b.distance);

        if (!Number.isFinite(aDistance)) {
          return 1;
        }

        if (!Number.isFinite(bDistance)) {
          return -1;
        }

        return aDistance - bDistance;
      });
  }, [
    nearbyPlaces,
    searchText,
    selectedCategory,
    maxDistance,
    selectedRegion,
  ]);

  const activeFilterCount = [
    selectedCategory !== "all",
    Boolean(maxDistance),
    Boolean(selectedRegion),
  ].filter(Boolean).length;

  const hasFilters =
    Boolean(searchText.trim()) ||
    activeFilterCount > 0;

  function clearFilters() {
    setSearchText("");
    setSelectedCategory("all");
    setMaxDistance("");
    setSelectedRegion("");
  }

  function PlaceCard({ place }: { place: any }) {
    const images =
      Array.isArray(place.images) &&
      place.images.length
        ? place.images
        : [
            place.image ||
              "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1000&q=80",
          ];

    const current =
      imageIndex[String(place.att_id)] ||
      0;

    const saved =
      savedIds.includes(place.att_id);

    const distance =
      Number(place.distance);

    return (
      <article
        onClick={() =>
          setPlaceDetailTarget({
            type: "attraction",
            data: place,
          })
        }
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            setPlaceDetailTarget({
              type: "attraction",
              data: place,
            });
          }
        }}
        role="button"
        tabIndex={0}
        className="
          group
          cursor-pointer
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#573d63]
          focus-visible:ring-offset-2
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
          {...imageSwipeProps(
            (direction) =>
              changeImage(
                String(place.att_id),
                direction,
                images.length
              ),
            images.length > 1
          )}
          className="
            relative
            h-40
            overflow-hidden
            sm:h-48
          "
        >
          <img
            src={
              images[
                Math.min(
                  current,
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
            from-black/30
            via-transparent
            to-black/5
          " />

          {Number.isFinite(distance) && (
            <span className="
              absolute
              bottom-3
              left-3
              z-20
              rounded-full
              bg-white/95
              px-2.5
              py-1
              text-[10px]
              font-semibold
              text-[#573d63]
              shadow-sm
            ">
              {distance.toFixed(1)} กม.
            </span>
          )}

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
              aria-label="Save place"
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
                border-white/80
                bg-white/95
                shadow-sm
                transition
                ${saved
                  ? "text-rose-500"
                  : "text-[#573d63]"
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
                border-white/80
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
                        ${current === index
                          ? "w-4 bg-white"
                          : "w-1.5 bg-white/60"
                        }
                      `}
                    />
                  )
                )}
            </div>
          )}
        </div>

        <div className="p-3.5 sm:p-4">
          <h2 className="
            line-clamp-1
            text-sm
            font-bold
            text-[#49334f]
            sm:text-[15px]
          ">
            {place.name_th ||
              place.name_en ||
              "สถานที่ท่องเที่ยว"}
          </h2>

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
    <>
      <PlaceDetailDrawer
        open={Boolean(placeDetailTarget)}
        target={placeDetailTarget}
        onClose={() => setPlaceDetailTarget(null)}
        onAddToTrip={(detailTarget) => {
          if (detailTarget.type !== "attraction") {
            return;
          }

          setPlaceToAddTrip(detailTarget.data);
          setPlaceDetailTarget(null);
        }}
      />
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
          ">
            <Link
              to="/explore"
              className="
                mb-4
                inline-flex
                items-center
                gap-1.5
                rounded-full
                border
                border-[#e5d8e8]
                bg-[#fffdfb]
                px-3
                py-1.5
                text-xs
                font-semibold
                text-[#6f456f]
                transition
                hover:bg-[#f5eef7]
              "
            >
              <ArrowLeft size={14} />
              Explore
            </Link>

            <div className="
              flex
              flex-col
              gap-3
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
                  bg-[#eef7f7]
                  px-3
                  py-1
                  text-[11px]
                  font-semibold
                  text-[#58777b]
                ">
                  <Navigation size={12} />
                  Near you
                </div>

                <h1 className="
                  text-2xl
                  font-bold
                  tracking-[-0.03em]
                  text-[#49334f]
                  sm:text-3xl
                ">
                  สถานที่ใกล้คุณ
                </h1>

                <p className="
                  mt-1
                  text-sm
                  text-[#817487]
                ">
                  {filteredPlaces.length} จาก {nearbyPlaces.length} สถานที่ · เรียงใกล้สุด
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
            </div>
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
                placeholder="ค้นหาสถานที่ใกล้คุณ"
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
                  : "border-[#e6dce8] bg-white text-[#685b6d] hover:bg-[#faf6fb]"
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
                  key={category.value}
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
              <label>
                <span className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-[#685b6d]
                ">
                  ระยะทาง
                </span>

                <select
                  value={maxDistance}
                  onChange={(event) =>
                    setMaxDistance(
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
                    ทุกระยะทาง
                  </option>
                  <option value="5">
                    ไม่เกิน 5 กม.
                  </option>
                  <option value="10">
                    ไม่เกิน 10 กม.
                  </option>
                  <option value="25">
                    ไม่เกิน 25 กม.
                  </option>
                  <option value="50">
                    ไม่เกิน 50 กม.
                  </option>
                </select>
              </label>

              <label>
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
            </section>
          )}

          {filteredPlaces.length ? (
            <div className="
              mt-7
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
                    key={place.att_id}
                    place={place}
                  />
                )
              )}
            </div>
          ) : (
            <div className="
              mt-8
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
              <h2 className="
                mt-3
                font-semibold
                text-[#49334f]
              ">
                ไม่พบสถานที่ใกล้เคียงที่ตรงกับตัวกรอง
              </h2>
              <button
                type="button"
                onClick={clearFilters}
                className="
                  mt-4
                  rounded-full
                  bg-gradient-to-r
                  from-[#6f456f]
                  via-[#936493]
                  to-[#c28eaa]
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
        </div>
      </main>
    </div>
    </>
  );
}
