// TravelWish2/src/routes/trips_detail.$tripId.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  Marker,
  Map as GoogleMap,
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
  Download,
  MapPin,
} from "lucide-react";

const ALL_DAYS_COLORS = [
  "#573d63",
  "#5f7c73",
  "#b06a6a",
  "#6872a6",
  "#b07a3b",
  "#7a5c9e",
  "#4f7d8a",
  "#8a6f4d",
];

const getAllDaysColor = (
  dayIndex: number
) =>
  ALL_DAYS_COLORS[
    dayIndex %
    ALL_DAYS_COLORS.length
  ];


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
    const countersByDay =
      new Map<number, number>();

    return mapPlaces.map(
      (item: any) => {
        const day =
          Number(item.day) || 1;

        const currentIndex =
          countersByDay.get(day) ?? 0;

        countersByDay.set(
          day,
          currentIndex + 1
        );

        return {
          ...item,

          // โหมดทั้งหมดให้เหมือนหน้า Home:
          // เลข marker เริ่มใหม่ทุกวัน
          mapIndex:
            currentIndex + 1,

          mapColor:
            getAllDaysColor(
              Math.max(
                0,
                day - 1
              )
            ),
        };
      }
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
      mapColor: "#573d63",
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

  const exportTripOffline = () => {
    if (
      typeof window === "undefined" ||
      !trip
    ) {
      return;
    }

    const escapeHtml = (
      value: unknown
    ) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const formatDate = (
      value: unknown
    ) => {
      if (!value) return null;

      const date =
        new Date(String(value));

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return String(value);
      }

      return new Intl.DateTimeFormat(
        "th-TH",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      ).format(date);
    };

    const currentItems =
      liveRoutesByDay
        ? Object.entries(
            liveRoutesByDay
          )
            .sort(
              ([a], [b]) =>
                Number(a) -
                Number(b)
            )
            .map(
              (
                [dayIndex, items]
              ) => ({
                day:
                  Number(dayIndex) + 1,
                title:
                  trip.trip_days?.[
                    Number(dayIndex)
                  ]?.title ??
                  `Day ${
                    Number(dayIndex) + 1
                  }`,
                items:
                  (items ?? []).map(
                    (
                      item: any,
                      index: number
                    ) => ({
                      ...item,
                      exportIndex:
                        index + 1,
                    })
                  ),
              })
            )
        : (
            trip.trip_days ?? []
          ).map(
            (day: any) => ({
              day:
                Number(
                  day.day_number
                ),
              title:
                day.title ??
                `Day ${day.day_number}`,
              items:
                (
                  day.trip_items ?? []
                ).map(
                  (
                    item: any,
                    index: number
                  ) => {
                    const isRestaurant =
                      item.item_type ===
                      "restaurant";

                    const place =
                      isRestaurant
                        ? item.restaurant
                        : item.attraction;

                    return {
                      ...item,
                      type:
                        isRestaurant
                          ? "restaurant"
                          : "place",
                      exportIndex:
                        index + 1,
                      name:
                        isRestaurant
                          ? (
                              place?.place_name_th ??
                              place?.place_name_en ??
                              "ร้านอาหาร"
                            )
                          : (
                              place?.name_th ??
                              place?.name_en ??
                              "สถานที่ท่องเที่ยว"
                            ),
                      images:
                        place?.images ??
                        [],
                      province:
                        place?.province ??
                        trip.destination ??
                        "",
                      location: {
                        latitude:
                          Number(
                            place?.latitude
                          ),
                        longitude:
                          Number(
                            place?.longitude
                          ),
                      },
                    };
                  }
                ),
            })
          );

    const accommodation =
      trip.accommodation &&
      typeof trip.accommodation ===
        "object"
        ? trip.accommodation
        : null;

    const dateRange = [
      formatDate(
        trip.start_date
      ),
      formatDate(
        trip.end_date
      ),
    ]
      .filter(Boolean)
      .join(" – ");

    const totalStops =
      currentItems.reduce(
        (
          sum,
          day
        ) =>
          sum +
          day.items.length,
        0
      );

    const daySections =
      currentItems
        .map(
          (
            dayData,
            dayIndex
          ) => {
            const color =
              getAllDaysColor(
                dayIndex
              );

            const stops =
              dayData.items
                .map(
                  (
                    item: any,
                    index: number
                  ) => {
                    const name =
                      item.name ??
                      item.place_name ??
                      item.place_name_th ??
                      item.restaurant_name ??
                      item.restaurant_name_th ??
                      item.place_data
                        ?.name_th ??
                      item.place_data
                        ?.place_name_th ??
                      "สถานที่";

                    const images =
                      Array.isArray(
                        item.images
                      )
                        ? item.images
                        : Array.isArray(
                            item.place_data
                              ?.images
                          )
                          ? item.place_data
                              .images
                          : [];

                    const image =
                      images[0] ??
                      null;

                    const isRestaurant =
                      item.type ===
                        "restaurant" ||
                      Boolean(
                        item.restaurant_id
                      );

                    const lat =
                      Number(
                        item.location
                          ?.latitude ??
                        item.latitude
                      );

                    const lng =
                      Number(
                        item.location
                          ?.longitude ??
                        item.longitude
                      );

                    const coordinates =
                      Number.isFinite(lat) &&
                      Number.isFinite(lng)
                        ? `${lat.toFixed(
                            6
                          )}, ${lng.toFixed(
                            6
                          )}`
                        : null;

                    const period =
                      item.period ??
                      null;

                    return `
                      <div class="stop">
                        <div
                          class="stop-number"
                          style="background:${color}"
                        >
                          ${index + 1}
                        </div>

                        <div class="stop-image">
                          ${
                            image
                              ? `<img src="${escapeHtml(
                                  image
                                )}" alt="" />`
                              : `<div class="image-placeholder">${isRestaurant ? "🍽" : "📍"}</div>`
                          }
                        </div>

                        <div class="stop-content">
                          <div class="stop-topline">
                            <span class="stop-type">
                              ${isRestaurant ? "ร้านอาหาร" : "สถานที่ท่องเที่ยว"}
                            </span>
                            ${
                              period
                                ? `<span class="period">${escapeHtml(
                                    period
                                  )}</span>`
                                : ""
                            }
                          </div>

                          <div class="stop-name">
                            ${escapeHtml(
                              name
                            )}
                          </div>

                          ${
                            coordinates
                              ? `<div class="coords">พิกัด: ${coordinates}</div>`
                              : ""
                          }
                        </div>
                      </div>
                    `;
                  }
                )
                .join("");

            return `
              <section class="day-section">
                <div class="day-heading">
                  <span
                    class="day-dot"
                    style="background:${color}"
                  ></span>
                  <div>
                    <div class="day-title">
                      Day ${dayData.day}
                    </div>
                    <div class="day-subtitle">
                      ${escapeHtml(
                        dayData.title ??
                        ""
                      )}
                    </div>
                  </div>
                </div>

                <div class="timeline">
                  ${stops}
                </div>
              </section>
            `;
          }
        )
        .join("");

    const html = `
<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(
    trip.title ??
    "TravelWish Trip"
  )}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family:
        "Noto Sans Thai",
        "Segoe UI",
        Tahoma,
        sans-serif;
      color: #30283a;
      background: #f7f2f8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      max-width: 860px;
      margin: 0 auto;
      background: white;
      min-height: 100vh;
    }

    .hero {
      padding: 34px 34px 28px;
      border-radius: 28px;
      background:
        linear-gradient(
          135deg,
          #5b3a61 0%,
          #76527d 55%,
          #a077a6 100%
        );
      color: white;
      margin-bottom: 22px;
      position: relative;
      overflow: hidden;
    }

    .hero:after {
      content: "";
      position: absolute;
      width: 210px;
      height: 210px;
      border-radius: 999px;
      right: -70px;
      top: -80px;
      background:
        rgba(255,255,255,.10);
    }

    .eyebrow {
      font-size: 11px;
      letter-spacing: .16em;
      text-transform: uppercase;
      opacity: .82;
      font-weight: 700;
    }

    .title {
      margin-top: 8px;
      font-size: 30px;
      line-height: 1.25;
      font-weight: 800;
    }

    .destination {
      margin-top: 8px;
      font-size: 14px;
      opacity: .92;
    }

    .meta-grid {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: 10px;
      margin-top: 22px;
    }

    .meta-card {
      padding: 12px 14px;
      border-radius: 15px;
      background:
        rgba(255,255,255,.12);
      border:
        1px solid
        rgba(255,255,255,.16);
    }

    .meta-label {
      font-size: 9px;
      opacity: .75;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .meta-value {
      margin-top: 3px;
      font-size: 13px;
      font-weight: 700;
    }

    .hotel {
      margin-bottom: 24px;
      padding: 16px 18px;
      border-radius: 20px;
      background: #faf7fb;
      border: 1px solid #e9dfeb;
    }

    .hotel-label {
      font-size: 10px;
      font-weight: 700;
      color: #8f7994;
      text-transform: uppercase;
      letter-spacing: .1em;
    }

    .hotel-name {
      margin-top: 4px;
      font-size: 16px;
      font-weight: 800;
      color: #4c3652;
    }

    .hotel-address {
      margin-top: 4px;
      font-size: 11px;
      color: #76697a;
      line-height: 1.6;
    }

    .day-section {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 26px;
      border: 1px solid #eee6f0;
      border-radius: 22px;
      padding: 18px;
      background: #fff;
    }

    .day-heading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eee8ef;
    }

    .day-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      flex: 0 0 auto;
    }

    .day-title {
      font-size: 17px;
      font-weight: 800;
      line-height: 1.2;
    }

    .day-subtitle {
      margin-top: 2px;
      font-size: 11px;
      color: #8a7d8e;
    }

    .timeline {
      margin-top: 4px;
    }

    .stop {
      display: grid;
      grid-template-columns:
        34px 72px minmax(0,1fr);
      gap: 12px;
      align-items: center;
      padding: 13px 0;
      border-bottom:
        1px solid #f0ebf1;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .stop:last-child {
      border-bottom: 0;
    }

    .stop-number {
      width: 30px;
      height: 30px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      box-shadow:
        0 4px 10px
        rgba(67,48,75,.12);
    }

    .stop-image {
      width: 72px;
      height: 56px;
      overflow: hidden;
      border-radius: 12px;
      background: #f2edf3;
    }

    .stop-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .stop-topline {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 3px;
    }

    .stop-type,
    .period {
      font-size: 9px;
      font-weight: 700;
      color: #806985;
    }

    .period {
      padding: 2px 7px;
      border-radius: 999px;
      background: #f4edf6;
    }

    .stop-name {
      font-size: 13px;
      font-weight: 800;
      line-height: 1.45;
      color: #3d3143;
    }

    .coords {
      margin-top: 3px;
      font-size: 9px;
      color: #9a8e9d;
    }

    .footer {
      margin-top: 28px;
      padding: 15px 0 4px;
      border-top: 1px solid #eee8ef;
      color: #9a8e9d;
      font-size: 9px;
      text-align: center;
    }

    @media print {
      body {
        background: white;
      }

      .page {
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="eyebrow">
        TravelWish Offline Itinerary
      </div>

      <div class="title">
        ${escapeHtml(
          trip.title ??
          "My Trip"
        )}
      </div>

      <div class="destination">
        📍 ${escapeHtml(
          trip.destination ??
          "Thailand"
        )}
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">
            วันเดินทาง
          </div>
          <div class="meta-value">
            ${escapeHtml(
              dateRange ||
              `${currentItems.length} วัน`
            )}
          </div>
        </div>

        <div class="meta-card">
          <div class="meta-label">
            ผู้เดินทาง
          </div>
          <div class="meta-value">
            ${escapeHtml(
              trip.people ||
              "ไม่ระบุ"
            )}
          </div>
        </div>

        <div class="meta-card">
          <div class="meta-label">
            จุดในแผน
          </div>
          <div class="meta-value">
            ${totalStops} จุด
          </div>
        </div>
      </div>
    </section>

    ${
      accommodation
        ? `
          <section class="hotel">
            <div class="hotel-label">
              ที่พักหลัก
            </div>
            <div class="hotel-name">
              ${escapeHtml(
                accommodation.name ??
                "ที่พัก"
              )}
            </div>
            ${
              accommodation.address
                ? `
                  <div class="hotel-address">
                    ${escapeHtml(
                      accommodation.address
                    )}
                  </div>
                `
                : ""
            }
          </section>
        `
        : ""
    }

    ${daySections}

    <div class="footer">
      Exported from TravelWish · เก็บไฟล์ PDF นี้ไว้สำหรับดูแผนการเดินทางแบบ Offline
    </div>
  </main>

  <script>
    window.addEventListener(
      "load",
      () => {
        setTimeout(
          () => window.print(),
          500
        );
      }
    );
  </script>
</body>
</html>
    `;

    const printWindow =
      window.open(
        "",
        "_blank",
        "noopener,noreferrer"
      );

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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

  <div className="mx-auto min-w-0 max-w-[58%] text-center">
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

  <button
    type="button"
    onClick={exportTripOffline}
    className="
      absolute
      right-6
      inline-flex
      h-10
      items-center
      gap-2
      rounded-xl
      border
      border-[#dfd4e1]
      bg-[#fffdfb]
      px-3.5
      text-xs
      font-semibold
      text-[#5f4967]
      shadow-[0_5px_14px_rgba(87,61,99,0.06)]
      transition
      hover:bg-[#f3eaf5]
      active:scale-95
    "
    title="Export แผนการเดินทางสำหรับดู Offline"
  >
    <Download size={16} />
    <span className="hidden xl:inline">
      Export Offline
    </span>
  </button>
</header>

        {/* ---------------------------------------------------
            MAP
        --------------------------------------------------- */}
<div className="relative mx-5 mb-5 min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/80 bg-white/55 shadow-[0_18px_42px_rgba(91,72,117,0.10)]">
  <APIProvider
    apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
    libraries={["geometry"]}
  >
    <GoogleMap
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

          const markerColor =
            selectedDay === "all"
              ? item.mapColor ??
                getAllDaysColor(
                  Math.max(
                    0,
                    Number(item.day) - 1
                  )
                )
              : "#573d63";

          return (
            <Marker
              key={key}
              position={{
                lat: Number(
                  item.location.latitude
                ),
                lng: Number(
                  item.location.longitude
                ),
              }}
              icon={{
                url:
                  "data:image/svg+xml;charset=UTF-8," +
                  encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
                    `<circle cx="16" cy="16" r="14" fill="${markerColor}" stroke="#ffffff" stroke-width="2"/>` +
                    "</svg>"
                  ),
              }}
              label={{
                text:
                  String(
                    item.mapIndex
                  ),
                color:
                  "#ffffff",
                fontWeight:
                  "700",
                fontSize:
                  "14px",
              }}
              title={
                selectedDay === "all"
                  ? `Day ${item.day} · จุดที่ ${item.mapIndex}`
                  : `Day ${selectedDay} · จุดที่ ${item.mapIndex}`
              }
            />
          );
        }
      )}
    </GoogleMap>
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
