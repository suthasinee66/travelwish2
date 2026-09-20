
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

import {
  Sparkles,
  Plus,
  Calendar,
  MapPin,
  Users,
  Search,
  Map,
} from "lucide-react";

export const Route = createFileRoute("/trips")({
  component: Trips,
});

function Trips() {
  const navigate = Route.useNavigate();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ============================================================
  // LOAD TRIPS
  // ============================================================

  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      setLoading(false);
      return;
    }

    setUser(auth.user);

    const { data, error } = await supabase
  .from("trips")
  .select(`
    id,
    title,
    destination,
    start_date,
    end_date,
    people,
    budget,
    created_at,

    trip_days(
      id,
      day_number,
      title,

      trip_items(
        id,
        item_type,
        att_id,
        restaurant_id,
        sort_order,

        attraction(
          att_id,
          name_th,
          province,
          images
        ),

        restaurant(
          place_id,
          place_name_th
        )
      )
    )
  `)
  .eq("profile_id", auth.user.id)
  .order("created_at", {
    ascending: false,
  });

    if (error) {
      console.error(error);
      setTrips([]);
    } else {
      setTrips(data || []);
    }

    setLoading(false);
  }

  // ============================================================
  // SEARCH
  // ============================================================

  const filteredTrips = useMemo(() => {
    if (!search.trim()) {
      return trips;
    }

    return trips.filter((trip) =>
      trip.title
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [trips, search]);

  // ============================================================
  // CREATE MANUAL TRIP
  // ============================================================
async function createTrip() {
  if (!user) return;

  const { error } = await supabase
    .from("trips")
    .insert({
      profile_id: user.id,
      title: "New Trip",
      destination: "",
      people: "1 traveler",
    });

  if (error) {
    console.error("❌ CREATE TRIP ERROR:", error);
    return;
  }

  loadTrips();
}
  // ============================================================
  // FORMAT DATE
  // ============================================================

  function formatDate(date: string | null) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ============================================================
  // GET COVER IMAGE
  // ============================================================
function getCover(trip: any) {
  const img = trip.trip_days
    ?.flatMap(
      (day: any) => day.trip_items ?? []
    )
    ?.find(
      (item: any) =>
        item.item_type === "place" &&
        item.attraction?.images?.length > 0
    )
    ?.attraction?.images?.[0];

  return (
    img ||
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200"
  );
}

  // ============================================================
  // GET STOPS
  // ============================================================

  function getStops(trip: any) {
  return (
    trip.trip_days?.reduce(
      (total: number, day: any) =>
        total + (day.trip_items?.length || 0),
      0
    ) || 0
  );
}

  // ============================================================
  // OPEN TRIP
  // ============================================================
function openTrip(tripId: string) {
  navigate({
    to: "/trips_detail/$tripId",
    params: {
      tripId,
    },
  });
}

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="travel-home flex h-screen text-foreground aurora-canvas">
      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar user={user} />

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="travel-main flex-1 overflow-y-auto min-w-0">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="travel-header h-16 flex items-center gap-4 px-8 sticky top-0 z-10">

          <h1 className="text-sm font-semibold tracking-wide text-[#49334f]">
            Trips
          </h1>

          <div className="flex-1 flex justify-center">

            <div className="relative w-full max-w-md">

              <Search
                className="
                  h-4
                  w-4
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-muted-foreground
                "
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search your trips"
                className="
                  w-full
                  pl-9
                  pr-3
                  py-1.5
                  text-sm
                  rounded-full
                  bg-secondary
                  outline-none
                  border-0
                  focus:ring-2
                  focus:ring-[#c9a8c8]/40
                "
              />

            </div>

          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="
              text-sm
              font-medium
              flex
              items-center
              gap-1.5
              px-4
              py-2
              rounded-full
              bg-foreground
              text-background
              hover:opacity-90
              transition
            "
          >
            <Plus className="h-4 w-4" />
            Create Trip
          </button>

        </header>

        {/* ====================================================
            CONTENT
        ==================================================== */}

        <div className="px-8 py-7 max-w-5xl mx-auto">

          {/* ==================================================
              PAGE TITLE
          ================================================== */}

          <div className="mb-7">

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a2779f]">
              Your travel journal
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#49334f]">
              Upcoming Trips
            </h2>

            <p className="mt-1 text-sm text-[#806f88]">
              Every plan, place, and memory in one beautiful
              space.
            </p>

          </div>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="mb-6 flex items-center justify-between">

            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                All trips
                <span className="text-muted-foreground font-normal">
                  {" "}
                  ({filteredTrips.length})
                </span>
              </h2>
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredTrips.length} trips planned
            </div>

          </div>

          {/* ==================================================
              TRIP GRID
          ================================================== */}

          <section>

            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">

              {/* ==================================================
                  NEW TRIP CARD
              ================================================== */}

              <button
                onClick={() =>
                  setShowCreateModal(true)
                }
                className="
                  glass-surface
                  rounded-2xl
                  overflow-hidden
                  min-h-[210px]
                  sm:min-h-[240px]
                  border-2
                  border-dashed
                  border-[#c9a8c8]/60
                  hover:bg-white/60
                  hover-lift
                  transition
                  flex
                  flex-col
                  items-center
                  justify-center
                  cursor-pointer
                "
              >

                <div
                  className="
                    h-9
                    w-9
                    sm:h-10
                    sm:w-10
                    rounded-full
                    bg-secondary
                    flex
                    items-center
                    justify-center
                    text-foreground
                  "
                >
                  <Plus className="h-4 w-4" />
                </div>

                <span className="mt-2 text-sm font-semibold sm:mt-3 sm:text-base">
                  New Trip
                </span>

                <span className="mt-1 hidden text-xs text-muted-foreground sm:block">
                  Start planning your next adventure
                </span>

              </button>

              {/* ==================================================
                  LOADING
              ================================================== */}

              {loading &&
                Array.from({ length: 5 }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="
                        glass-surface
                        rounded-2xl
                        overflow-hidden
                        animate-pulse
                      "
                    >

                      <div className="h-24 bg-secondary sm:h-32 md:h-36" />

                      <div className="p-2 space-y-1.5 sm:p-3 sm:space-y-2">

                        <div className="h-5 bg-secondary rounded" />

                        <div className="h-3 bg-secondary rounded w-3/4" />

                        <div className="h-3 bg-secondary rounded w-1/2" />

                      </div>

                    </div>
                  )
                )}

              {/* ==================================================
                  TRIPS
              ================================================== */}

              {!loading &&
                filteredTrips.map((trip) => (

                  <article
                    key={trip.id}
                    onClick={() =>
                      openTrip(trip.id)
                    }
                    className="
                      glass-surface
                      rounded-2xl
                      overflow-hidden
                      cursor-pointer
                      group
                      hover-lift
                    "
                  >

                    {/* IMAGE */}

                    <div className="relative h-24 overflow-hidden sm:h-32 md:h-36">

                      <img
                        src={getCover(trip)}
                        alt={trip.title}
                        className="
                          h-full
                          w-full
                          object-cover
                          group-hover:scale-105
                          transition
                          duration-500
                        "
                      />

                      {/* STOPS */}

                      <span
                        className="
                          absolute
                          bottom-2
                          left-2
                          text-[9px]
                          sm:text-[11px]
                          rounded-full
                          bg-black/60
                          text-white
                          px-2
                          py-0.5
                        "
                      >
                        {getStops(trip)} stops
                      </span>

                    </div>

                    {/* CONTENT */}

                    <div className="p-2 sm:p-3">

                      <div className="flex items-start justify-between gap-2">

                        <div className="min-w-0">

                          <h3 className="truncate text-sm font-semibold leading-tight sm:text-base">
                            {trip.title || "Untitled Trip"}
                          </h3>

                          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-1">

                            <MapPin className="h-3 w-3 shrink-0" />

                            <span className="truncate">
                              {trip.destination ||
                                "No destination"}
                            </span>

                          </div>

                        </div>

                      </div>

                      {/* TRIP INFORMATION */}

                      <div className="mt-2 space-y-1 sm:mt-2.5 sm:space-y-1.5">

                        <div className="text-[10px] sm:text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">

                          <Calendar className="h-3.5 w-3.5" />

                          <span>
                            {formatDate(
                              trip.start_date
                            )}

                            {" - "}

                            {formatDate(
                              trip.end_date
                            )}
                          </span>

                        </div>

                        <div className="text-[10px] sm:text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">

                          <Users className="h-3.5 w-3.5" />

                          <span>
                            {trip.people ||
                              "1 traveler"}
                          </span>

                        </div>

                      </div>

                      {/* VIEW BUTTON */}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTrip(trip.id);
                        }}
                        className="
                          mt-2
                          w-full
                          text-[10px]
                          sm:mt-3
                          sm:text-xs
                          font-medium
                          border
                          border-border
                          rounded-full
                          py-1
                          sm:py-1.5
                          hover:bg-accent
                          transition
                        "
                      >
                        View Trip
                      </button>

                    </div>

                  </article>

                ))}

            </div>

          </section>


        </div>

      </main>

      {/* ======================================================
          CREATE TRIP MODAL
      ====================================================== */}

      {showCreateModal && (

        <div
          className="
            travel-modal-overlay
            fixed
            inset-0
            bg-black/40
            flex
            items-center
            justify-center
            z-50
            p-4
          "
          onClick={() =>
            setShowCreateModal(false)
          }
        >

          <div
            className="
              travel-modal-card
              bg-white
              rounded-2xl
              p-8
              w-full
              max-w-[420px]
              shadow-xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h2 className="text-2xl font-semibold">
              Create New Trip
            </h2>

            <p className="text-gray-500 mt-2">
              Choose how you want to plan your trip
            </p>

            <div className="mt-6 space-y-4">

              {/* ==================================================
                  AI
              ================================================== */}

              <button
                onClick={() => {

                  setShowCreateModal(false);

                  navigate({
                    to: "/create_withAI",
                  });

                }}
                className="
                  w-full
                  border
                  rounded-2xl
                  p-5
                  text-left
                  hover:bg-gray-50
                  transition
                "
              >

                <div className="flex gap-3 items-center">

                  <div
                    className="
                      h-10
                      w-10
                      rounded-full
                      bg-black
                      text-white
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <Sparkles size={18} />
                  </div>

                  <div>

                    <h3 className="font-semibold">
                      Plan with AI
                    </h3>

                    <p className="text-sm text-gray-500">
                      AI creates your itinerary
                    </p>

                  </div>

                </div>

              </button>

              {/* ==================================================
                  MANUAL
              ================================================== */}

              <button
                onClick={async () => {

                  setShowCreateModal(false);

                  await createTrip();

                }}
                className="
                  w-full
                  border
                  rounded-2xl
                  p-5
                  text-left
                  hover:bg-gray-50
                  transition
                "
              >

                <div className="flex gap-3 items-center">

                  <div
                    className="
                      h-10
                      w-10
                      rounded-full
                      bg-gray-100
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <Map size={18} />
                  </div>

                  <div>

                    <h3 className="font-semibold">
                      Create Manually
                    </h3>

                    <p className="text-sm text-gray-500">
                      Choose places yourself
                    </p>

                  </div>

                </div>

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}