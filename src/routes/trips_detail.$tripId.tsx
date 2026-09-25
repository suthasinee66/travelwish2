// TravelWish2/src/routes/trips_detail.$tripId.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";

import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import PlaceDetailDrawer, {
  type PlaceDetailTarget,
} from "@/components/PlaceDetailDrawer";
import { TripPlanPanel } from "./home";
import {
  ArrowLeft,
  MapPin,
} from "lucide-react";

export const Route = createFileRoute(
  "/trips_detail/$tripId"
)({
  component: TripsDetail,
});
function DayMapUpdater({
  places,
}: {
  places: any[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || places.length === 0) return;

    // มีสถานที่เดียว
    if (places.length === 1) {
      map.panTo({
        lat: Number(places[0].location.latitude),
        lng: Number(places[0].location.longitude),
      });

      map.setZoom(15);

      return;
    }

    // มีหลายสถานที่
    const bounds = new google.maps.LatLngBounds();

    places.forEach((item: any) => {
      bounds.extend({
        lat: Number(item.location.latitude),
        lng: Number(item.location.longitude),
      });
    });

    map.fitBounds(bounds, 80);

  }, [map, places]);

  return null;
}


function TripsDetail() {
  const navigate = useNavigate();
  const { tripId } = Route.useParams();

  const [trip, setTrip] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [liveRoutesByDay, setLiveRoutesByDay] = useState<Record<number, any[]> | null>(null);
  const [
    placeDetailTarget,
    setPlaceDetailTarget,
  ] = useState<PlaceDetailTarget | null>(
    null
  );
  // =========================================================
  // LOAD TRIP
  // =========================================================

  useEffect(() => {
    const loadTrip = async () => {
      try {
        setLoading(true);

        // -------------------------
        // User
        // -------------------------

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.error("❌ USER NOT FOUND");

          navigate({
            to: "/login",
          });

          return;
        }

        setUser(user);

        // -------------------------
        // Trip
        // -------------------------

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
            accommodation,
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
                  name_en,
                  province,
                  latitude,
                  longitude,
                  images
                ),

                restaurant(
                  place_id,
                  place_name_th,
                  place_name_en,
                  latitude,
                  longitude,
                  images
                )
              )
            )
          `)
          .eq("id", tripId)
          .eq("profile_id", user.id)
          .single();

        if (error) {
          console.error(
            "❌ LOAD TRIP ERROR:",
            error
          );
          return;
        }

        if (!data) {
          console.error("❌ TRIP NOT FOUND");
          return;
        }

        console.log(
          "🧳 TRIP DETAIL:",
          data
        );

        // =====================================================
        // SORT DAY
        // =====================================================

        data.trip_days = (data.trip_days ?? [])
          .sort(
            (a: any, b: any) =>
              Number(a.day_number) -
              Number(b.day_number)
          )
          .map((day: any) => ({
            ...day,

            // สำคัญ:
            // sort_order = ลำดับที่ผู้ใช้จัดไว้
            trip_items: (
              day.trip_items ?? []
            ).sort(
              (a: any, b: any) =>
                Number(a.sort_order) -
                Number(b.sort_order)
            ),
          }));

        setTrip(data);
      } catch (error) {
        console.error(
          "❌ LOAD TRIP FAILED:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    if (tripId) {
      loadTrip();
    }
  }, [tripId, navigate]);

  // =========================================================
  // ALL SAVED ITEMS
  // =========================================================

  const savedItems = useMemo(() => {
    if (!trip) return [];

    const result: any[] = [];

    for (const day of trip.trip_days ?? []) {
      for (const item of day.trip_items ?? []) {
        const isRestaurant =
          item.item_type === "restaurant";

        const place =
          isRestaurant
            ? item.restaurant
            : item.attraction;

        if (!place) continue;

        result.push({
          ...item,

          type: isRestaurant
            ? "restaurant"
            : "place",

          place_id: isRestaurant
            ? undefined
            : item.att_id,

          restaurant_id: isRestaurant
            ? item.restaurant_id
            : undefined,

          day: Number(day.day_number),

          sort_order: Number(
            item.sort_order ?? 0
          ),

          location: {
            latitude: Number(
              place.latitude
            ),
            longitude: Number(
              place.longitude
            ),
          },

          // เก็บข้อมูลไว้ให้ TripPlanPanel
          place_data: place,
        });
      }
    }

    return result;
  }, [trip]);

  // =========================================================
  // PLACES
  // =========================================================

  const allPlaces = useMemo(() => {
    if (!trip) return [];

    return savedItems
      .filter(
        (item: any) =>
          item.type === "place"
      )
      .map((item: any) => ({
        att_id: item.place_data?.att_id,
        name_th:
          item.place_data?.name_th,
        name_en:
          item.place_data?.name_en,
        province:
          item.place_data?.province,
        latitude:
          item.place_data?.latitude,
        longitude:
          item.place_data?.longitude,
        images:
          item.place_data?.images,
      }));
  }, [trip, savedItems]);

  // =========================================================
  // RESTAURANTS
  // =========================================================

  const restaurants = useMemo(() => {
    if (!trip) return [];

    return savedItems
      .filter(
        (item: any) =>
          item.type === "restaurant"
      )
      .map((item: any) => ({
        place_id:
          item.place_data?.place_id,
        place_name_th:
          item.place_data?.place_name_th,
        place_name_en:
          item.place_data?.place_name_en,
        latitude:
          item.place_data?.latitude,
        longitude:
          item.place_data?.longitude,
        images:
          item.place_data?.images,
      }));
  }, [trip, savedItems]);

  // =========================================================
  // TRIP INPUT
  // ใช้โครงสร้างที่ TripPlanPanel เดิมอ่าน
  // =========================================================

  const tripInput = useMemo(() => {
    if (!trip) return null;

    const days =
      trip.trip_days?.length ?? 0;

    return {
      province:
        trip.destination || "",

      destination:
        trip.destination || "",

      days,

      people:
        trip.people || "",

      companion:
        trip.people || "",

      budget:
        Number(trip.budget ?? 0),

      startDate:
        trip.start_date || null,

      endDate:
        trip.end_date || null,

      accommodation:
        trip.accommodation &&
        typeof trip.accommodation ===
          "object"
          ? {
              id:
                trip.accommodation.id ??
                null,

              name:
                trip.accommodation.name ??
                "ที่พัก",

              address:
                trip.accommodation.address ??
                null,

              latitude:
                trip.accommodation.latitude ??
                null,

              longitude:
                trip.accommodation.longitude ??
                null,

              images:
                Array.isArray(
                  trip.accommodation.images
                )
                  ? trip.accommodation.images
                  : [],

              source:
                trip.accommodation.source ??
                "travelwish",

              source_url:
                trip.accommodation.source_url ??
                null,

              booking_provider:
                trip.accommodation
                  .booking_provider ??
                null,

              locked:
                trip.accommodation.locked ??
                true,
            }
          : null,
    };
  }, [trip]);

  // =========================================================
  // MAP ITEMS
  // =========================================================
const mapPlaces = useMemo(() => {
  if (liveRoutesByDay) {
    return Object.entries(liveRoutesByDay)
      .sort(
        ([a], [b]) =>
          Number(a) - Number(b)
      )
      .flatMap(
        ([dayIndex, items]) =>
          (items || []).map(
            (
              item: any,
              index: number
            ) => ({
              ...item,
              day:
                Number(dayIndex) + 1,
              sort_order:
                index + 1,
              location: {
                latitude: Number(
                  item.location?.latitude ??
                  item.latitude
                ),
                longitude: Number(
                  item.location?.longitude ??
                  item.longitude
                ),
              },
            })
          )
      )
      .filter((item: any) => {
        const lat = Number(
          item.location?.latitude
        );
        const lng = Number(
          item.location?.longitude
        );

        return (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat !== 0 &&
          lng !== 0
        );
      });
  }

  return savedItems
    .filter((item: any) => {
      const lat = Number(item.place_data?.latitude);
      const lng = Number(item.place_data?.longitude);

      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat !== 0 &&
        lng !== 0
      );
    })
    .map((item: any) => ({
      ...item,

      location: {
        latitude: Number(
          item.place_data.latitude
        ),
        longitude: Number(
          item.place_data.longitude
        ),
      },
    }));
}, [savedItems, liveRoutesByDay]);
const selectedDayPlaces = useMemo(() => {
  if (selectedDay === "all") {
    return mapPlaces.map(
      (item: any, index: number) => ({
        ...item,
        mapIndex: index + 1,
      })
    );
  }

  const dayPlaces = mapPlaces.filter(
    (item: any) =>
      Number(item.day) === Number(selectedDay)
  );

  return dayPlaces.map(
    (item: any, index: number) => ({
      ...item,
      mapIndex: index + 1,
    })
  );
}, [mapPlaces, selectedDay]);
  // =========================================================
  // MAP CENTER
  // =========================================================
const mapCenter = useMemo(() => {
  const places =
    selectedDay === "all"
      ? mapPlaces
      : selectedDayPlaces;

  if (places.length > 0) {
    return {
      lat: Number(
        places[0].location.latitude
      ),
      lng: Number(
        places[0].location.longitude
      ),
    };
  }

  return {
    lat: 13.7563,
    lng: 100.5018,
  };
}, [
  mapPlaces,
  selectedDayPlaces,
  selectedDay,
]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="travel-home flex h-screen items-center justify-center bg-background">
        <div className="rounded-3xl border border-white/80 bg-white/70 px-7 py-5 text-sm font-medium text-[#7f7185] shadow-[0_18px_42px_rgba(91,72,117,0.10)] backdrop-blur-xl">
          กำลังโหลดทริป...
        </div>
      </div>
    );
  }

  // =========================================================
  // NOT FOUND
  // =========================================================

  if (!trip) {
    return (
      <div className="travel-home flex h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/80 bg-white/75 p-7 text-center shadow-[0_18px_42px_rgba(91,72,117,0.10)] backdrop-blur-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3eaf5] text-[#6f456f]">
            <MapPin size={20} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-[#40364b]">
            ไม่พบข้อมูลทริป
          </h2>

          <button
            onClick={() =>
              navigate({
                to: "/trips",
              })
            }
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#573d63] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(87,61,99,0.18)] transition hover:bg-[#684974]"
          >
            กลับไปหน้า Trips
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // PLANNER JSON
  //
  // แปลงข้อมูลจาก
  //
  // trips
  //   └── trip_days
  //         └── trip_items
  //
  // ให้มีรูปแบบเดียวกับ TripPlanPanel
  // =========================================================

  const plannerJson = {
    selectedPlaces: savedItems.map(
      (item: any) => ({
        type: item.type,

        place_id:
          item.type === "place"
            ? String(item.att_id)
            : undefined,

        restaurant_id:
          item.type === "restaurant"
            ? String(
                item.restaurant_id
              )
            : undefined,

        day: item.day,

        sort_order:
          item.sort_order,

        location: item.location,

        name:
          item.type === "restaurant"
            ? item.place_data
                ?.place_name_th
            : item.place_data
                ?.name_th,

        place_name_th:
          item.place_data
            ?.name_th,

        restaurant_name:
          item.place_data
            ?.place_name_th,
      })
    ),
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="travel-home flex h-screen bg-background text-foreground">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar
        user={user}
        chatSessions={[]}
        onSelectChat={() => {
          navigate({
            to: "/home",
          });
        }}
        onNewChat={() => {
          navigate({
            to: "/home",
          });
        }}
      />

      <PlaceDetailDrawer
        open={Boolean(
          placeDetailTarget
        )}
        target={placeDetailTarget}
        onClose={() =>
          setPlaceDetailTarget(
            null
          )
        }
      />

      {/* =====================================================
          CENTER
          Google Map แทนพื้นที่ Chat AI
      ===================================================== */}

      <main
        className="
          travel-main
          flex-1
          flex
          flex-col
          min-w-0
          transition-all
          duration-300
          pr-[600px]
        "
      >
{/* Header */}
<header className="travel-header travel-detail-header relative flex items-center px-6">
  <button
    type="button"
    onClick={() =>
      navigate({
        to: "/trips",
      })
    }
    className="absolute left-6 flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5dbe8] bg-[#fffdfb] text-[#573d63] shadow-[0_5px_14px_rgba(87,61,99,0.06)] transition hover:bg-[#f3eaf5] active:scale-95"
    aria-label="กลับไปหน้า Trips"
  >
    <ArrowLeft size={19} />
  </button>

  <div className="mx-auto min-w-0 max-w-[72%] text-center">
    <h1 className="truncate text-xl font-bold text-[#40364b]">
      {trip.title}
    </h1>

    <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-medium text-[#85798a]">
      {trip.destination && (
        <span className="truncate">
          {trip.destination}
        </span>
      )}

      {trip.trip_days?.length > 0 && (
        <>
          <span className="h-1 w-1 rounded-full bg-[#b89bcb]" />
          <span>
            {trip.trip_days.length} วัน
          </span>
        </>
      )}
    </div>
  </div>
</header>

        {/* ---------------------------------------------------
            MAP
        --------------------------------------------------- */}
<div className="relative mx-5 mb-5 min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/80 bg-white/55 shadow-[0_18px_42px_rgba(91,72,117,0.10)]">
  <APIProvider
    apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
    libraries={["geometry"]}
  >
    <Map
      defaultCenter={mapCenter}
      defaultZoom={13}
      mapId="9d5ca48506fddf5eb0fea298"
      gestureHandling="greedy"
      draggable={true}
      disableDefaultUI={false}
    >
        <DayMapUpdater places={selectedDayPlaces} />
      {selectedDayPlaces.map(
  (item: any) => {
          const key =
  item.type === "restaurant"
    ? `restaurant-${item.restaurant_id}-${item.day}`
    : `place-${item.att_id}-${item.day}`;

          return (
            <AdvancedMarker
              key={key}
              position={{
                lat: Number(item.location.latitude),
                lng: Number(item.location.longitude),
              }}
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  border-2
                  border-white
                  bg-[#573d63]
                  text-xs
                  font-bold
                  text-white
                  shadow-[0_8px_18px_rgba(87,61,99,0.24)]
                "
              >
                {item.mapIndex}
              </div>
            </AdvancedMarker>
          );
        }
      )}
    </Map>
  </APIProvider>

  {/* Map information overlay */}
  <div className="absolute left-4 top-4 max-w-[calc(100%-2rem)] rounded-2xl border border-white/80 bg-[#fffdfb]/92 px-4 py-3 shadow-[0_12px_28px_rgba(91,72,117,0.12)] backdrop-blur-xl">
    <div className="mb-1 h-1 w-12 rounded-full bg-gradient-to-r from-[#b89bcb] via-[#e9a8c9] to-[#a9dce8]" />

    <p className="truncate text-sm font-bold text-[#40364b]">
      {trip.destination ||
        trip.title}
    </p>

    <p className="mt-1 text-[11px] font-medium text-[#85798a]">
      {selectedDay === "all"
        ? `${mapPlaces.length} จุด · ทุกวัน`
        : `Day ${selectedDay} · ${selectedDayPlaces.length} จุด`}
    </p>
  </div>
</div>

      </main>

      {/* =====================================================
          RIGHT PANEL
          TripPlanPanel เดิม
      ===================================================== */}

      <aside
        className="
          travel-right-panel
          fixed
          right-0
          top-0
          z-50
          h-screen
          w-[600px]
          overflow-hidden
          border-l
          bg-background
          shadow-2xl
        "
      >
        <div
          className="
            travel-panel-content
            h-full
            overflow-y-auto
            p-5
          "
        >
<TripPlanPanel
  plannerJson={plannerJson}
  plan=""
  tripInput={tripInput}
  allPlaces={allPlaces}
  restaurants={restaurants}
  mapCenter={mapCenter}
  chatId={null}
  showMap={false}
  existingTripId={String(tripId)}
  existingTripTitle={trip?.title || ""}
  onExistingTripSaved={(title) => {
    setTrip((prev: any) =>
      prev
        ? {
            ...prev,
            title,
          }
        : prev
    );
  }}
  onRouteChange={(routesByDay) => {
    setLiveRoutesByDay({
      ...routesByDay,
    });
  }}
  onDayChange={(day) => {
    setSelectedDay(day);
  }}
  onOpenPlaceDetail={(target) => {
    setPlaceDetailTarget(
      target
    );
  }}
/>

        </div>

      </aside>

    </div>
  );
}
