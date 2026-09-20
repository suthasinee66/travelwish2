import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Lightbulb,
  MapPin,
  Menu,
  Search,
  Sparkles,
  Star,
  Twitter,
  Wallet,
  X,
  Youtube,
  CheckSquare,
} from "lucide-react";

import heroImg from "@/assets/hero-travel.jpg";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  component: Index,
});

/* =========================================================
   TYPES
========================================================= */

type Interest = {
  id: string;
  label: string;
  icon: string;
};

type Destination = {
  id: string;
  name: string;
  country: string;
  description: string;
  image: string;
  rating: number;
  tags: string[];
  visitorCount: number;
  province: string;
};

/* =========================================================
   INTERESTS
========================================================= */

const interests: Interest[] = [
  {
    id: "mountain",
    label: "Mountains",
    icon: "🏔️",
  },
  {
    id: "sea",
    label: "Beach",
    icon: "🌊",
  },
  {
    id: "nature",
    label: "Nature",
    icon: "🌿",
  },
  {
    id: "cafe",
    label: "Café",
    icon: "☕",
  },
  {
    id: "culture",
    label: "Culture",
    icon: "🛕",
  },
  {
    id: "city",
    label: "City",
    icon: "🏙️",
  },
];

/* =========================================================
   FETCH DESTINATIONS FROM SUPABASE
========================================================= */

async function fetchDestinations(): Promise<Destination[]> {
  const { data, error } = await supabase
    .from("attraction")
    .select(`
      att_id,
      name_th,
      name_en,
      detail_th,
      detail_en,
      province,
      avg_rating,
      visitor_count,
      images,
      travel_type,
      activities,
      category,
      highlight
    `)
    .gte("avg_rating", 4)
    .gt("visitor_count", 0)
    .not("images", "is", null)
    .order("visitor_count", {
      ascending: false,
    })
    .order("avg_rating", {
      ascending: false,
    })
    .limit(30);

  if (error) {
    console.error(
      "Error loading destinations:",
      error
    );

    return [];
  }

  if (!data) {
    return [];
  }

  return data.map((item) => {
    const image =
      Array.isArray(item.images) &&
      item.images.length > 0
        ? item.images[0]
        : "";

    const tags = [
      ...(item.travel_type || []),
      ...(item.activities || []),
      ...(item.category || []),
    ].map((tag) =>
      String(tag).toLowerCase()
    );

    return {
      id: item.att_id,
      name:
        item.name_th ||
        item.name_en ||
        "Unknown destination",
      country: item.province || "Thailand",
      province: item.province || "",
      description:
        item.highlight ||
        item.detail_en ||
        item.detail_th ||
        "Discover this beautiful destination in Thailand.",
      image,
      rating: Number(item.avg_rating || 0),
      visitorCount: Number(
        item.visitor_count || 0
      ),
      tags,
    };
  });
}

/* =========================================================
   MAIN
========================================================= */

function Index() {
  const navigate = useNavigate();

  const [selectedInterests, setSelectedInterests] =
    useState<Interest[]>([]);

  const [showRecommendations, setShowRecommendations] =
    useState(false);

  const [destinations, setDestinations] =
    useState<Destination[]>([]);

  const [filteredDestinations, setFilteredDestinations] =
    useState<Destination[]>([]);

  const [loadingDestinations, setLoadingDestinations] =
    useState(true);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const preferenceRef =
    useRef<HTMLDivElement>(null);

  const recommendationRef =
    useRef<HTMLDivElement>(null);

  const popularRef =
    useRef<HTMLDivElement>(null);

  /* =========================================================
     LOAD DESTINATIONS
  ========================================================= */

  useEffect(() => {
    const loadDestinations = async () => {
      setLoadingDestinations(true);

      const data = await fetchDestinations();

      setDestinations(data);

      setFilteredDestinations(data);

      setLoadingDestinations(false);
    };

    loadDestinations();
  }, []);

  /* =========================================================
     SEARCH
  ========================================================= */

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const query =
        searchQuery.trim().toLowerCase();

      if (!query) {
        setFilteredDestinations(destinations);
        setShowRecommendations(false);
        return;
      }

      const filtered = destinations.filter(
        (destination) =>
          destination.name
            .toLowerCase()
            .includes(query) ||
          destination.country
            .toLowerCase()
            .includes(query) ||
          destination.province
            .toLowerCase()
            .includes(query)
      );

      setFilteredDestinations(filtered);
      setShowRecommendations(true);

      setTimeout(() => {
        recommendationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

      setMobileOpen(false);
    },
    [searchQuery, destinations]
  );

  /* =========================================================
     INTERESTS
  ========================================================= */

  const toggleInterest = useCallback(
    (interest: Interest) => {
      setSelectedInterests((prev) =>
        prev.includes(interest)
          ? prev.filter(
              (item) => item.id !== interest.id
            )
          : [...prev, interest]
      );

      setShowRecommendations(false);
    },
    []
  );

  /* =========================================================
     RECOMMENDATIONS
  ========================================================= */

  const getRecommendations = useCallback(() => {
    if (selectedInterests.length === 0) {
      setFilteredDestinations([]);
      setShowRecommendations(true);

      setTimeout(() => {
        recommendationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

      return;
    }

    const selectedIds =
      selectedInterests.map(
        (interest) =>
          interest.id.toLowerCase()
      );

    const filtered = destinations.filter(
      (destination) => {
        return destination.tags.some((tag) =>
          selectedIds.some(
            (selected) =>
              tag.includes(selected) ||
              selected.includes(tag)
          )
        );
      }
    );

    filtered.sort((a, b) => {
      const aMatches =
        a.tags.filter((tag) =>
          selectedIds.some(
            (selected) =>
              tag.includes(selected) ||
              selected.includes(tag)
          )
        ).length;

      const bMatches =
        b.tags.filter((tag) =>
          selectedIds.some(
            (selected) =>
              tag.includes(selected) ||
              selected.includes(tag)
          )
        ).length;

      if (bMatches !== aMatches) {
        return bMatches - aMatches;
      }

      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }

      return b.visitorCount - a.visitorCount;
    });

    setFilteredDestinations(filtered);
    setShowRecommendations(true);

    setTimeout(() => {
      recommendationRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, [
    selectedInterests,
    destinations,
  ]);

  /* =========================================================
     START EXPLORING
  ========================================================= */

  const handleStartExploring = () => {
  navigate({ to: "/login" });
};

  /* =========================================================
     POPULAR DESTINATION SCROLL
  ========================================================= */

  const scrollPopular = (
    direction: "left" | "right"
  ) => {
    if (!popularRef.current) return;

    popularRef.current.scrollBy({
      left:
        direction === "left"
          ? -340
          : 340,
      behavior: "smooth",
    });
  };

  return (
    <div className="travel-landing-page relative isolate min-h-screen overflow-x-hidden bg-[#faf7ff] text-[#302b43]">

      {/* =====================================================
          GLOBAL AURORA BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="
            absolute
            -left-40
            top-20
            h-[420px]
            w-[420px]
            rounded-full
            bg-[#c8a9d8]/20
            blur-3xl
          "
        />

        <div
          className="
            absolute
            right-[-120px]
            top-[35%]
            h-[450px]
            w-[450px]
            rounded-full
            bg-[#e9a8c9]/15
            blur-3xl
          "
        />

        <div
          className="
            absolute
            bottom-[10%]
            left-[30%]
            h-[380px]
            w-[380px]
            rounded-full
            bg-[#a9dce8]/15
            blur-3xl
          "
        />
      </div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav
        className="
          fixed
          left-0
          right-0
          top-0
          z-50
          pointer-events-auto
          border-b
          border-white/70
          bg-white/60
          backdrop-blur-2xl
        "
      >
        <div
          className="
            container
            mx-auto
            flex
            h-[72px]
            items-center
            justify-between
            px-4
          "
        >
          {/* Logo */}

          <a
            href="#home"
            className="flex items-center gap-2"
          >
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-[#c8a9d8]
                to-[#e9a8c9]
                shadow-sm
              "
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>

            <span
              className="
                text-xl
                font-extrabold
                tracking-tight
                text-[#573d63]
              "
            >
              TravelWise.
            </span>
          </a>

          {/* Desktop navigation */}

          <div className="hidden items-center gap-7 lg:flex">
            {[
              ["Home", "home"],
              ["Destinations", "destinations"],
              ["Recommendations", "recommendations"],
              ["Travel Tips", "travel-tips"],
            ].map(([label, id]) => (
              <a
                key={label}
                href={`#${id}`}
                className="
                  text-sm
                  font-semibold
                  text-[#6f687e]
                  transition-colors
                  hover:text-[#7c5a8f]
                "
              >
                {label}
              </a>
            ))}
          </div>

          {/* Desktop actions */}

          <div className="hidden items-center gap-2 md:flex">
            <form
              onSubmit={handleSearch}
              className="
                flex
                items-center
                gap-2
                rounded-full
                border
                border-white/80
                bg-white/55
                px-3
                py-2
                backdrop-blur-md
              "
            >
              <Search className="h-4 w-4 text-[#8b8498]" />

              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                className="
                  w-24
                  bg-transparent
                  text-sm
                  text-[#302b43]
                  outline-none
                  placeholder:text-[#9b94a8]
                  lg:w-28
                "
              />
            </form>

            <button
              onClick={() =>
                navigate({
                  to: "/login",
                })
              }
              className="
                rounded-full
                px-4
                py-2
                text-sm
                font-semibold
                text-[#573d63]
                transition-all
                hover:bg-white/70
              "
            >
              Login
            </button>

            <button
              onClick={() =>
                navigate({
                  to: "/register",
                })
              }
              className="
                rounded-full
                bg-gradient-to-r
                from-[#b89bcb]
                to-[#e9a8c9]
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                shadow-md
                shadow-[#b89bcb]/20
                transition-all
                hover:-translate-y-0.5
                hover:shadow-lg
              "
            >
              Sign Up
            </button>
          </div>

          {/* Mobile */}

          <button
            onClick={() =>
              setMobileOpen(!mobileOpen)
            }
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              bg-white/60
              text-[#573d63]
              md:hidden
            "
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}

        {mobileOpen && (
          <div
            className="
              border-t
              border-white/70
              bg-white/80
              px-4
              pb-5
              pt-4
              backdrop-blur-2xl
              md:hidden
            "
          >
            <form
              onSubmit={handleSearch}
              className="
                mb-4
                flex
                items-center
                gap-2
                rounded-2xl
                border
                border-white/80
                bg-white/60
                px-4
                py-3
              "
            >
              <Search className="h-4 w-4 text-[#8b8498]" />

              <input
                type="text"
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                className="
                  flex-1
                  bg-transparent
                  text-sm
                  text-[#302b43]
                  outline-none
                "
              />
            </form>

            <div className="space-y-1">
              {[
                ["Home", "home"],
                ["Destinations", "destinations"],
                ["Recommendations", "recommendations"],
                ["Travel Tips", "travel-tips"],
              ].map(([label, id]) => (
                <a
                  key={label}
                  href={`#${id}`}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className="
                    block
                    rounded-xl
                    px-3
                    py-2.5
                    text-sm
                    font-semibold
                    text-[#6f687e]
                    hover:bg-white/70
                    hover:text-[#7c5a8f]
                  "
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  navigate({
                    to: "/login",
                  })
                }
                className="
                  flex-1
                  rounded-full
                  border
                  border-[#c8a9d8]/40
                  bg-white/60
                  py-2.5
                  text-sm
                  font-semibold
                  text-[#573d63]
                "
              >
                Login
              </button>

              <button
                onClick={() =>
                  navigate({
                    to: "/register",
                  })
                }
                className="
                  flex-1
                  rounded-full
                  bg-gradient-to-r
                  from-[#b89bcb]
                  to-[#e9a8c9]
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                "
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        id="home"
        className="
          relative
          flex
          min-h-[92vh]
          items-center
          justify-center
          overflow-hidden
        "
      >
        <img
          src={heroImg}
          alt="Beautiful tropical beach destination"
          className="
            pointer-events-none
            absolute
            inset-0
            h-full
            w-full
            object-cover
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-b
            from-[#302b43]/35
            via-[#302b43]/20
            to-[#302b43]/50
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -left-20
            top-20
            h-72
            w-72
            rounded-full
            bg-[#e9a8c9]/30
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-20
            bottom-10
            h-80
            w-80
            rounded-full
            bg-[#a9dce8]/25
            blur-3xl
          "
        />

        <div
          className="
            relative
            z-20
            pointer-events-auto
            mx-auto
            max-w-4xl
            px-5
            pt-16
            text-center
          "
        >
          <div
            className="
              mx-auto
              mb-6
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-white/50
              bg-white/20
              px-4
              py-2
              text-sm
              font-semibold
              text-white
              shadow-lg
              backdrop-blur-md
            "
          >
            <Sparkles className="h-4 w-4" />
            Personalized travel planning
          </div>

          <h1
            className="
              text-4xl
              font-extrabold
              leading-tight
              tracking-tight
              text-white
              drop-shadow-lg
              sm:text-5xl
              md:text-6xl
            "
          >
            Find Your Perfect
            <br />
            <span className="text-[#fff7d6]">
              Travel Destination
            </span>
          </h1>

          <p
            className="
              mx-auto
              mt-6
              max-w-2xl
              text-base
              leading-relaxed
              text-white/85
              sm:text-lg
              md:text-xl
            "
          >
            Get personalized travel recommendations based
            on your interests, preferences, and travel style.
          </p>

          <button
            onClick={handleStartExploring}
            className="
              group
              mt-9
              inline-flex
              items-center
              gap-2
              rounded-full
              bg-white
              px-7
              py-3.5
              font-bold
              text-[#573d63]
              shadow-[0_12px_30px_rgba(48,43,67,0.20)]
              transition-all
              duration-300
              hover:-translate-y-1
              hover:bg-[#fff7d6]
            "
          >
            Start Exploring

            <ArrowRight
              className="
                h-5
                w-5
                transition-transform
                group-hover:translate-x-1
              "
            />
          </button>
        </div>

        <div
          className="
            pointer-events-none
            absolute
            bottom-0
            left-0
            right-0
            h-24
            bg-gradient-to-t
            from-[#faf7ff]
            to-transparent
          "
        />
      </section>


      {/* =====================================================
          RECOMMENDATIONS
      ===================================================== */}

      {showRecommendations && (
        <section
          ref={recommendationRef}
          className="
            relative
            scroll-mt-24
            overflow-hidden
            bg-[#faf7ff]
            py-20
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              left-1/3
              top-0
              h-64
              w-64
              rounded-full
              bg-[#e9a8c9]/15
              blur-3xl
            "
          />

          <div className="relative z-10 container mx-auto px-4">
            <div className="mb-12 text-center">
              <div
                className="
                  mx-auto
                  mb-5
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white/70
                  shadow-sm
                "
              >
                <Sparkles className="h-5 w-5 text-[#7c5a8f]" />
              </div>

              <h2
                className="
                  text-3xl
                  font-extrabold
                  tracking-tight
                  text-[#302b43]
                  md:text-4xl
                "
              >
                Recommended For You
              </h2>

              <p
                className="
                  mx-auto
                  mt-3
                  max-w-lg
                  text-[#6f687e]
                "
              >
                Based on your interests, we think you'll
                love these destinations.
              </p>
            </div>

            {loadingDestinations ? (
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="
                      h-[390px]
                      animate-pulse
                      rounded-[28px]
                      bg-white/60
                    "
                  />
                ))}
              </div>
            ) : filteredDestinations.length === 0 ? (
              <div
                className="
                  mx-auto
                  max-w-xl
                  rounded-[28px]
                  border
                  border-white/80
                  bg-white/60
                  p-10
                  text-center
                  shadow-sm
                  backdrop-blur-xl
                "
              >
                <p className="text-[#6f687e]">
                  No matching destinations found.
                </p>

                <p className="mt-1 text-sm text-[#8b8498]">
                  Try selecting different interests!
                </p>
              </div>
            ) : (
              <div
                className="
                  grid
                  grid-cols-1
                  gap-7
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
              >
                {filteredDestinations.map(
                  (destination) => (
                    <DestinationCard
                      key={destination.id}
                      destination={destination}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          POPULAR DESTINATIONS
      ===================================================== */}

      <section
        id="destinations"
        className="
          relative
          overflow-hidden
          bg-[#fffdf9]
          py-20
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -right-24
            top-10
            h-72
            w-72
            rounded-full
            bg-[#bfe5d4]/25
            blur-3xl
          "
        />

        <div className="relative z-10 container mx-auto px-4">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#b889a8]" />

                <span
                  className="
                    text-sm
                    font-bold
                    uppercase
                    tracking-wider
                    text-[#8b8498]
                  "
                >
                  Explore
                </span>
              </div>

              <h2
                className="
                  text-3xl
                  font-extrabold
                  tracking-tight
                  text-[#302b43]
                  md:text-4xl
                "
              >
                Popular Destinations
              </h2>

              <p className="mt-2 text-[#6f687e]">
                Trending places loved by travelers.
              </p>
            </div>

            <div className="hidden gap-2 md:flex">
              <button
                onClick={() =>
                  scrollPopular("left")
                }
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/90
                  bg-white/70
                  text-[#573d63]
                  shadow-sm
                  backdrop-blur-md
                  transition-all
                  hover:-translate-y-0.5
                  hover:bg-white
                  hover:shadow-md
                "
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                onClick={() =>
                  scrollPopular("right")
                }
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/90
                  bg-white/70
                  text-[#573d63]
                  shadow-sm
                  backdrop-blur-md
                  transition-all
                  hover:-translate-y-0.5
                  hover:bg-white
                  hover:shadow-md
                "
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            ref={popularRef}
            className="
              flex
              snap-x
              snap-mandatory
              gap-6
              overflow-x-auto
              pb-5
            "
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {loadingDestinations ? (
              [1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="
                    min-w-[285px]
                    max-w-[285px]
                    animate-pulse
                    overflow-hidden
                    rounded-[28px]
                    bg-white/60
                  "
                >
                  <div className="h-52 bg-[#e9e1ed]" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 rounded bg-[#e9e1ed]" />
                    <div className="h-4 w-2/3 rounded bg-[#e9e1ed]" />
                    <div className="h-10 rounded bg-[#e9e1ed]" />
                  </div>
                </div>
              ))
            ) : destinations.length === 0 ? (
              <div
                className="
                  w-full
                  rounded-[28px]
                  border
                  border-white/80
                  bg-white/60
                  p-10
                  text-center
                "
              >
                <p className="text-[#6f687e]">
                  No destinations available.
                </p>
              </div>
            ) : (
              destinations.map((destination) => (
                <div
                  key={destination.id}
                  className="
                    min-w-[285px]
                    max-w-[285px]
                    snap-start
                    sm:min-w-[300px]
                    sm:max-w-[300px]
                  "
                >
                  <DestinationCard
                    destination={destination}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          TRAVEL TIPS
      ===================================================== */}

      <section
        id="travel-tips"
        className="
          relative
          overflow-hidden
          bg-[#f7f2fa]
          py-20
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -left-20
            bottom-0
            h-72
            w-72
            rounded-full
            bg-[#c8a9d8]/20
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-20
            top-0
            h-72
            w-72
            rounded-full
            bg-[#f3b8d0]/20
            blur-3xl
          "
        />

        <div className="relative z-10 container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2
              className="
                text-3xl
                font-extrabold
                tracking-tight
                text-[#302b43]
                md:text-4xl
              "
            >
              Travel Tips
            </h2>

            <p
              className="
                mx-auto
                mt-3
                max-w-lg
                text-[#6f687e]
              "
            >
              Helpful advice to make your next trip smooth
              and memorable.
            </p>
          </div>

          <div
            className="
              mx-auto
              grid
              max-w-5xl
              grid-cols-1
              gap-6
              md:grid-cols-3
            "
          >
            {[
              {
                icon: Calendar,
                title: "Best Time to Travel",
                description:
                  "Research the best seasons for your destination. Shoulder seasons often offer great weather with fewer crowds and lower prices.",
              },
              {
                icon: Wallet,
                title: "Budget Travel Tips",
                description:
                  "Book flights mid-week, use local transport, stay in guesthouses, and eat where locals eat to save significantly on your trip.",
              },
              {
                icon: CheckSquare,
                title: "Packing Checklist",
                description:
                  "Pack light with versatile clothing, don't forget chargers and adapters, and always carry a reusable water bottle and sunscreen.",
              },
            ].map((tip) => (
              <div
                key={tip.title}
                className="
                  group
                  rounded-[28px]
                  border
                  border-white/80
                  bg-white/60
                  p-7
                  text-center
                  shadow-[0_10px_30px_rgba(87,61,99,0.07)]
                  backdrop-blur-xl
                  transition-all
                  duration-300
                  hover:-translate-y-2
                  hover:bg-white/75
                  hover:shadow-[0_18px_40px_rgba(87,61,99,0.12)]
                "
              >
                <div
                  className="
                    mx-auto
                    mb-5
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-2xl
                    bg-gradient-to-br
                    from-[#c8a9d8]
                    to-[#e9a8c9]
                    shadow-sm
                  "
                >
                  <tip.icon className="h-6 w-6 text-white" />
                </div>

                <h3
                  className="
                    mb-3
                    text-lg
                    font-bold
                    text-[#302b43]
                  "
                >
                  {tip.title}
                </h3>

                <p
                  className="
                    text-sm
                    leading-relaxed
                    text-[#6f687e]
                  "
                >
                  {tip.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer
        className="
          relative
          overflow-hidden
          border-t
          border-white/70
          bg-[#eee5f3]
          py-16
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -top-24
            left-1/4
            h-64
            w-64
            rounded-full
            bg-[#e9a8c9]/25
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-24
            right-1/4
            h-64
            w-64
            rounded-full
            bg-[#a9dce8]/25
            blur-3xl
          "
        />

        <div className="relative z-10 container mx-auto px-4">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">

            {/* Brand */}

            <div className="md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-2xl
                    bg-gradient-to-br
                    from-[#c8a9d8]
                    to-[#e9a8c9]
                  "
                >
                  <Sparkles className="h-5 w-5 text-white" />
                </div>

                <h3 className="text-2xl font-bold">
                  TravelWise.
                </h3>
              </div>

              <p
                className="
                  max-w-sm
                  text-sm
                  leading-relaxed
                  text-[#6f687e]
                "
              >
                Discover your perfect travel destination
                with personalized recommendations tailored
                to your unique interests and preferences.
              </p>
            </div>

            {/* Links */}

            <div>
              <h4 className="mb-4 font-bold">
                Quick Links
              </h4>

              <ul className="space-y-2.5 text-sm text-[#6f687e]">
                {[
                  ["Home", "home"],
                  ["Destinations", "destinations"],
                  ["Recommendations", "recommendations"],
                  ["Travel Tips", "travel-tips"],
                ].map(([label, id]) => (
                  <li key={label}>
                    <a
                      href={`#${id}`}
                      className="hover:text-[#7c5a8f]"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social */}

            <div>
              <h4 className="mb-4 font-bold">
                Follow Us
              </h4>

              <div className="flex gap-3">
                {[
                  Facebook,
                  Twitter,
                  Instagram,
                  Youtube,
                ].map((Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-white/80
                      bg-white/60
                      text-[#6f687e]
                      shadow-sm
                      backdrop-blur-md
                      transition-all
                      hover:-translate-y-1
                      hover:bg-white
                      hover:text-[#7c5a8f]
                    "
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div
            className="
              mt-12
              border-t
              border-[#302b43]/10
              pt-8
              text-center
              text-sm
              text-[#8b8498]
            "
          >
            © {new Date().getFullYear()} TravelWise.
            All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================
   DESTINATION CARD
========================================================= */

function DestinationCard({
  destination,
}: {
  destination: Destination;
}) {
  return (
    <div
      className="
        group
        overflow-hidden
        rounded-[28px]
        border
        border-white/80
        bg-white/65
        shadow-[0_12px_35px_rgba(87,61,99,0.10)]
        backdrop-blur-xl
        transition-all
        duration-300
        hover:-translate-y-2
        hover:shadow-[0_20px_45px_rgba(87,61,99,0.16)]
      "
    >
      {/* Image */}

      <div className="relative h-52 overflow-hidden">
        {destination.image ? (
          <img
            src={destination.image}
            alt={`${destination.name}, ${destination.country}`}
            className="
              h-full
              w-full
              object-cover
              transition-transform
              duration-700
              group-hover:scale-110
            "
          />
        ) : (
          <div
            className="
              flex
              h-full
              w-full
              items-center
              justify-center
              bg-gradient-to-br
              from-[#c8a9d8]
              via-[#e9a8c9]
              to-[#a9dce8]
            "
          >
            <MapPin className="h-10 w-10 text-white/80" />
          </div>
        )}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-t
            from-[#302b43]/30
            via-transparent
            to-transparent
          "
        />

        {/* Rating */}

        <div
          className="
            absolute
            right-4
            top-4
            flex
            items-center
            gap-1.5
            rounded-full
            bg-white/85
            px-3
            py-1.5
            shadow-sm
            backdrop-blur-md
          "
        >
          <Star
            className="
              h-4
              w-4
              fill-[#f0b84b]
              text-[#f0b84b]
            "
          />

          <span className="text-sm font-bold text-[#302b43]">
            {destination.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Content */}

      <div className="p-5">
        <h3 className="text-lg font-bold text-[#302b43]">
          {destination.name}
        </h3>

        <p className="mt-1 text-sm font-medium text-[#6f687e]">
          {destination.country}
        </p>

        <p
          className="
            mb-3
            mt-3
            line-clamp-2
            text-sm
            leading-relaxed
            text-[#6f687e]
          "
        >
          {destination.description}
        </p>

        {/* Visitor Count */}

        <div className="mb-4 flex items-center gap-1.5 text-xs text-[#8b8498]">
          <MapPin className="h-3.5 w-3.5" />

          <span>
            {destination.visitorCount.toLocaleString(
              "th-TH"
            )}{" "}
            visitors
          </span>
        </div>

        <button
          className="
            group/button
            inline-flex
            items-center
            gap-1.5
            text-sm
            font-bold
            text-[#7c5a8f]
            hover:text-[#573d63]
          "
        >
          View Details

          <ArrowRight
            className="
              h-4
              w-4
              transition-transform
              group-hover/button:translate-x-1
            "
          />
        </button>
      </div>
    </div>
  );
}

export default Index;