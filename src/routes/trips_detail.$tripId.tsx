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
import { TripPlanPanel } from "./home";
import { ArrowLeft } from "lucide-react";

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
    };
  }, [trip]);

  // =========================================================
  // MAP ITEMS
  // =========================================================
const mapPlaces = useMemo(() => {
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
}, [savedItems]);
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
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-gray-500">
          Loading trip...
        </p>
      </div>
    );
  }

  // =========================================================
  // NOT FOUND
  // =========================================================

  if (!trip) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-gray-500">
          ไม่พบข้อมูลทริป
        </p>

        <button
          onClick={() =>
            navigate({
              to: "/trips",
            })
          }
          className="
            px-5
            py-2
            rounded-full
            bg-black
            text-white
            hover:opacity-90
          "
        >
          กลับไปหน้า Trips
        </button>
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
<div
  className="
    travel-detail-header
    relative
    flex
    items-center
    justify-center
    pt-6
    mb-8
    px-6
  "
>
  {/* Back */}
  <button
    onClick={() =>
      navigate({
        to: "/trips",
      })
    }
    className="
      absolute
      left-6
      w-10
      h-10
      rounded-full
      flex
      items-center
      justify-center
      hover:bg-gray-100
      transition
    "
  >
    <ArrowLeft size={22} />
  </button>

  {/* Title */}
  <h1
    className="
      font-semibold
      text-xl
      truncate
      max-w-[70%]
    "
  >
    {trip.title}
  </h1>
</div>

        {/* ---------------------------------------------------
            MAP
        --------------------------------------------------- */}
<div className="w-full h-full rounded-3xl overflow-hidden relative">
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
                  w-9
                  h-9
                  rounded-full
                  bg-[#573d63]
                  text-white
                  flex
                  items-center
                  justify-center
                  font-bold
                  shadow-lg
                  border-2
                  border-white
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
  <div
    className="
      absolute
      top-5
      left-5
      bg-white/95
      backdrop-blur
      rounded-2xl
      shadow-lg
      border
      px-5
      py-4
    "
  >
    <p className="text-sm text-gray-500">
      Trip
    </p>

    <p className="font-semibold">
      {trip.destination || trip.title}
    </p>

    <p className="text-xs text-gray-500 mt-1">
  {selectedDay === "all"
    ? `${mapPlaces.length} จุด`
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
          fixed
          top-0
          right-0
          h-screen
          w-[600px]
          bg-background
          border-l
          shadow-2xl
          z-50
          overflow-hidden
        "
      >

        <div
          className="
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
   onDayChange={(day) => {
    setSelectedDay(day);
  }}
/>

        </div>

      </aside>

    </div>
  );
}
