import { createFileRoute } from "@tanstack/react-router";
import {
  Hotel,
  Sparkles,
  MessageCircle,
  Briefcase,
  Compass,
  Landmark,
  Heart,
  RefreshCw,
  Bell,
  Trash2,
  Lightbulb,
  Plus,
  Mic,
  ArrowUp,
  MoreHorizontal,
  MapPin,
  LayoutGrid,
  Mountain,
  Waves,
  LoaderCircle,
  Camera,
  TreePalm,
  Replace,
  Coffee,
  Building2,
  Users,
  Wallet,
  Sparkle,
  X,
  PartyPopper,
  Moon,
  Crown,
  Footprints,
  Utensils,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Armchair,
  User,
  UserRoundPlus,
  Coins,
  Gem,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Fragment, useEffect, useState, useMemo } from "react";
import { getRecommendations } from "@/lib/recommend/getRecommendations";
import { getRecommendations as getInspireVideos } from "@/lib/inspire/getRecommendations";
import { Link } from "@tanstack/react-router";
import { getPlaceImage } from "@/lib/google/places";
import { loadPlaceImages } from "@/lib/recommend/loadPlaceImages";
import Sidebar from "@/components/Sidebar";
import AddPlaceToTripModal from "@/components/AddPlaceToTripModal";
import { useImageSwipe } from "@/hooks/useImageSwipe";
import { useTravelStore } from "@/store/travelStore";
import { loadTravelData } from "@/lib/travel/loadTravelData";
import { getUserLocation } from "@/lib/location/getUserLocation";
import { createPlanner } from "@/lib/ai/planner";
import { loadAllPlaces } from "@/lib/travel/loadAllPlaces";
import {
  chatWithAI,
  generalChatWithAI,
  detectTripIntent,
  detectPlannerDecision,
  resetTrip
} from "@/lib/ai/chat";
import {
  detectTripPlanEdit,
  applyTripPlanEdit
} from "@/lib/ai/tripEditor";
import { Bot, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { loadRecommendationCache } from "@/lib/recommend/loadRecommendationCache";
import remarkGfm from "remark-gfm";
import {
  APIProvider,
  Map,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import googleMapIcon from "../assets/google-map.png";
import ai1Icon from "../assets/ai/ai1.svg";
import ai2Icon from "../assets/ai/ai2.svg";
import ai3Icon from "../assets/ai/ai3.svg";





export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "TravelWise — Plan your perfect trip" },
      { name: "description", content: "AI-powered travel planning. Ask anything travel related." },
    ],
  }),
  component: Home,
});

const navItems = [
  { icon: MessageCircle, label: "Chats", badge: 1 },
  { icon: Briefcase, label: "Trips", to: "/trips", },
  { icon: Compass, label: "Explore" },
  { icon: Heart, label: "Saved" },
  { icon: Bell, label: "Updates" },
  { icon: Lightbulb, label: "Inspiration" },
  { icon: Plus, label: "Create" },
];


const forYou = [
  { title: "Temple of the Emerald Buddha (Wat Phra Kaew)", tag: "🏛 Attraction", img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&q=80" },
  { title: "Sra Bua by Kiin Kiin", tag: "🍴 Thai · $$", img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80" },
  { title: "Jim Thompson House Museum", tag: "🏛 Attraction", img: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80" },
];

const inspired = [
  { title: "Trip to Bangkok, August 2026", initial: "B", color: "bg-amber-700", img: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80" },
  { title: "Family Guide to Bangkok", initial: "C", color: "bg-violet-600", img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&q=80" },
  { title: "Trip to Thailand", initial: "S", color: "bg-teal-600", img: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80" },
];


function WherePicker({
  tripInput,
  setTripInput,
  filteredProvinces,
  setActiveStep,
  showProvinceDropdown,
  setShowProvinceDropdown,
  onComplete,
}: {
  tripInput: any;
  setTripInput: any;
  filteredProvinces: string[];
  setActiveStep: any;
  showProvinceDropdown: boolean;
  setShowProvinceDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  onComplete: () => void;
}) {
  console.log(tripInput.province);
  console.log(filteredProvinces);
  console.log(showProvinceDropdown);
  return (

    <div>

      <div className="relative">

        <input
          value={tripInput.province}
          onFocus={() => setShowProvinceDropdown(true)}
          onChange={(e) => {
            setTripInput({
              ...tripInput,
              province: e.target.value,
            });

          }}
          placeholder="Location"
          className="w-full border rounded-full px-5 py-4 outline-none"
        />
        {showProvinceDropdown &&
          tripInput.province &&

          filteredProvinces.length > 0 && (

            <div className="absolute left-0 right-0 mt-2 bg-white border rounded-2xl shadow-lg max-h-60 overflow-y-auto z-50">

              {filteredProvinces.map((province) => (
                <button
                  type="button"
                  key={province}
                  onClick={() => {
                    setTripInput({
                      ...tripInput,
                      province,
                    });

                    setShowProvinceDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100"
                >
                  {province}
                </button>
              ))}

            </div>
          )}

      </div>



      <div
        className="
flex
justify-end
items-center
gap-3
mt-5
"
      >






      </div>



      <button


        onClick={() => {

          setActiveStep("days")

        }}

        className={`
mt-10
ml-auto
block
px-10
py-3
rounded-full
font-semibold

${tripInput.province

            ?
            "bg-black text-white"

            :
            "bg-gray-300 text-white"

          }

`}
      >

        Save

      </button>


    </div>

  )

}
function DaysPicker({
  tripInput,
  setTripInput,
  setActiveStep,
}: any) {
  return (
    <div>
      <h2 className="font-semibold mb-4">
        How many days?
      </h2>

      <input
        type="number"
        min={1}
        placeholder="Number of days"
        value={tripInput.days ?? ""}
        onChange={(e) =>
          setTripInput({
            ...tripInput,
            days: Number(e.target.value),
          })
        }
        className="w-full border rounded-xl px-4 py-3 outline-none"
      />

      <button
        onClick={() => setActiveStep("who")}
        className={`mt-8 ml-auto block px-8 py-3 rounded-full font-semibold ${tripInput.days
          ? "bg-black text-white"
          : "bg-gray-300 text-white"
          }`}
      >
        Next
      </button>
    </div>
  );
}
function WhoPicker({
  tripInput,
  setTripInput,
  setActiveStep,
}: {
  tripInput: any;
  setTripInput: any;
  setActiveStep: any;
}) {
  return (
    <div>
      <h2 className="font-semibold mb-4">
        Who are you traveling with?
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {[
          "คนเดียว",
          "คู่รัก",
          "เพื่อน",
          "ครอบครัว",
        ].map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => {
              setTripInput({
                ...tripInput,
                companion: x,
              });

              setActiveStep("budget");
            }}
            className={`
              border
              rounded-xl
              px-5
              py-3
              transition
              ${tripInput.companion === x
                ? "bg-black text-white border-black"
                : "hover:bg-gray-100"
              }
            `}
          >
            {x}
          </button>
        ))}
      </div>
    </div>
  );
}
function BudgetPicker({
  tripInput,
  setTripInput,
  setTripModal,
  onComplete,
}: {
  tripInput: any;
  setTripInput: any;
  setTripModal: any;
  onComplete: () => void;
}) {

  return (
    <div>

      <h2 className="font-semibold mb-4">
        What is your budget?
      </h2>


      <input
        type="number"
        placeholder="Enter your budget (บาท)"
        value={tripInput.budget ?? ""}
        onChange={(e) =>
          setTripInput(prev => ({
            ...prev,
            budget: Number(e.target.value)
          }))
        }
        className="w-full border rounded-xl px-4 py-3"
      />


      <button


        onClick={() => {

          setTripModal(false);
          onComplete();

        }}

        className={`
mt-8
ml-auto
block
px-8
py-3
rounded-full
font-semibold
${tripInput.budget
            ?
            "bg-black text-white"
            :
            "bg-gray-300 text-white"
          }
`}

      >
        Save

      </button>


    </div>
  )

}
function MapUpdater({
  center
}: {
  center: {
    lat: number;
    lng: number;
  }
}) {

  const map = useMap();

  useEffect(() => {

    if (!map) return;

    map.panTo(center);

  }, [
    map,
    center.lat,
    center.lng
  ]);

  return null;
}

function getDistanceMeters(
  from: any,
  to: any
) {
  const lat1 = Number(
    from?.location?.latitude
  );
  const lng1 = Number(
    from?.location?.longitude
  );
  const lat2 = Number(
    to?.location?.latitude
  );
  const lng2 = Number(
    to?.location?.longitude
  );

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return null;
  }

  const R = 6371000;
  const toRad = (degree: number) =>
    (degree * Math.PI) / 180;

  const dLat =
    toRad(lat2 - lat1);
  const dLng =
    toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return (
    2 *
    R *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

function formatCompactDistance(
  meters: number | null
) {
  if (
    meters == null ||
    !Number.isFinite(meters)
  ) {
    return null;
  }

  if (meters < 1000) {
    return `${Math.round(meters)} ม.`;
  }

  return `${(
    meters / 1000
  ).toFixed(1)} กม.`;
}

function DistanceBetweenItems({
  from,
  to
}: {
  from: any;
  to: any;
}) {
  const label =
    formatCompactDistance(
      getDistanceMeters(
        from,
        to
      )
    );

  if (!label) {
    return null;
  }

  return (
    <div
      className="
        ml-8
        my-0.5
        flex
        h-4
        items-center
        gap-1.5
        text-[10px]
        leading-none
        text-gray-400
      "
    >
      <div
        className="
          h-3
          w-px
          bg-gray-200
        "
      />
      <span>| {label}</span>
    </div>
  );
}

function AllDaysDropZone({
  dayIndex,
  children,
}: {
  dayIndex: number;
  children: React.ReactNode;
}) {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: `day-drop-${dayIndex}`,
    data: {
      dayIndex,
      type: "day-container"
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        space-y-3
        rounded-2xl
        transition
        ${isOver
          ? "ring-2 ring-[#b89bcb]/50 bg-[#f7f2f8]/50"
          : ""
        }
      `}
    >
      {children}
    </div>
  );
}

function SortablePlaceItem({
  item,
  index,
  findPlace,
  findRestaurant,
  loadMoreRestaurants,
  checkMoreRestaurants,     // เพิ่ม
  showMoreRestaurants,
  moreRestaurants,
  loadingMoreRestaurants,
  hasMoreRestaurants,       // เพิ่ม
  addRestaurantToPlan,
  replaceRestaurantInPlan,
  removeRestaurantFromPlan,
  removePlaceFromPlan,
  sortableIdOverride,
  sortableDayIndex,
}: any) {

  const sortableId =
    sortableIdOverride ??
    (
      item.type === "restaurant"
        ? `restaurant-${item.restaurant_id}`
        : `place-${item.place_id}`
    );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: sortableId,
    data: {
      dayIndex: sortableDayIndex,
      item,
      type: "trip-item"
    },
  });

  const attId = String(item.place_id);
  const restaurantId = String(item.restaurant_id);
  useEffect(() => {
  if (
    item.type === "restaurant" &&
    item.restaurant_id &&
    item.place_id
  ) {
    checkMoreRestaurants(
      attId,
      restaurantId
    );
  }
}, [
  item.type,
  item.restaurant_id,
  item.place_id,
  attId,
  restaurantId,
]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="
        border
        rounded-2xl
        p-3
        bg-white
        shadow-sm
      "
    >

      {/* =====================================
          แถวหลัก
      ===================================== */}
      <div
        className="
          flex
          items-center
          gap-3
          select-none
        "
      >

        {/* ลำดับ */}
        <button
          type="button"
          aria-label="ลากเพื่อจัดลำดับ"
          title="ลากเพื่อจัดลำดับ"
          {...attributes}
          {...listeners}
          style={{
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
            color: "#ffffff",
          }}
          className="
            w-8
            h-8
            rounded-full
            bg-[#573d63]
            !text-white
            flex
            items-center
            justify-center
            font-bold
            shrink-0
            cursor-grab
            active:cursor-grabbing
            select-none
          "
        >
          {index + 1}
        </button>


        {/* รูป */}
        {item.images?.[0] ? (

          <img
            src={item.images[0]}
            alt={item.name}
            className="
              w-14
              h-14
              rounded-xl
              object-cover
              shrink-0
            "
          />

        ) : (

          <div
            className="
              w-14
              h-14
              rounded-xl
              bg-gray-200
              shrink-0
              flex
              items-center
              justify-center
            "
          >
            {item.type === "restaurant" ? (
              <Utensils
                size={22}
                className="text-[#b89bcb]"
              />
            ) : (
              <MapPin
                size={22}
                className="text-[#b89bcb]"
              />
            )}
          </div>

        )}


        {/* ชื่อ */}
        <div className="flex-1 min-w-0">

          <div className="font-semibold text-sm truncate">
            {item.name}
          </div>

          {item.period && (
            <div className="text-xs text-gray-400 mt-1">
              {item.period}
            </div>
          )}

        </div>


        {/* =================================
            ถังขยะ
        ================================= */}
        {item.type === "restaurant" && (
  <button
    type="button"
    onPointerDown={(e) => {
      e.stopPropagation();
    }}
    onClick={(e) => {
      e.stopPropagation();

      removeRestaurantFromPlan(item);
    }}
    className="
      flex
      h-9
      w-9
      shrink-0
      items-center
      justify-center
      rounded-lg
      border
      border-red-200
      bg-red-50
      text-red-500
      transition
      hover:bg-red-100
      hover:text-red-600
    "
    title="ลบร้านอาหาร"
  >
    <Trash2
      size={18}
      strokeWidth={2}
      className="text-red-500"
    />
  </button>
)}

{item.type === "place" && (
  <button
    type="button"
    onPointerDown={(e) => {
      e.stopPropagation();
    }}
    onClick={(e) => {
      e.stopPropagation();

      removePlaceFromPlan(item);
    }}
    className="
      flex
      h-9
      w-9
      shrink-0
      items-center
      justify-center
      rounded-lg
      border
      border-red-200
      bg-red-50
      text-red-500
      transition
      hover:bg-red-100
      hover:text-red-600
    "
    title="ลบสถานที่"
  >
    <Trash2
      size={18}
      strokeWidth={2}
      className="text-red-500"
    />
  </button>
)}

      </div>


      {/* =====================================
          ปุ่มแสดงร้านค้าเพิ่มเติม
      ===================================== */}
      {item.type === "restaurant" &&
  item.restaurant_id &&
  item.place_id &&
  hasMoreRestaurants[attId] === true && (
<div className="ml-11 mt-3">

  <button
    type="button"

    onPointerDown={(e) => {
      e.stopPropagation();
    }}

    onClick={(e) => {
      e.stopPropagation();

      loadMoreRestaurants(
        attId,
        restaurantId
      );
    }}

    disabled={loadingMoreRestaurants[attId]}

    className="
      flex
      items-center
      gap-1
      text-sm
      font-medium
      text-gray-500
      hover:text-[#573d63]
      transition
      disabled:opacity-50
    "
  >

    {loadingMoreRestaurants[attId] ? (

      <>
        <LoaderCircle
          size={14}
          className="animate-spin"
        />

        <span>กำลังโหลด...</span>
      </>

    ) : (

      <>
        {showMoreRestaurants[attId] ? (
          <ChevronUp
            size={16}
            strokeWidth={2}
          />
        ) : (
          <ChevronDown
            size={16}
            strokeWidth={2}
          />
        )}

        <span>
          {showMoreRestaurants[attId]
            ? "ซ่อน"
            : "เพิ่มเติม"}
        </span>
      </>

    )}

  </button>

</div>

      )}


      {/* =====================================
          ร้านค้าเพิ่มเติม
      ===================================== */}
      {item.type === "restaurant" &&
        showMoreRestaurants[attId] && (

        <div
          className="
            mt-3
            ml-11
            flex
            gap-3
            overflow-x-auto
            pb-2
          "
        >

          {(moreRestaurants[attId] || []).map(
            (restaurant: any) => (

              <div
                key={restaurant.place_id}
                className="
                  min-w-[240px]
                  w-[240px]
                  shrink-0
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  p-3
                "
              >

                {/* =========================
                    ข้อมูลร้าน
                ========================= */}
                <div className="flex gap-3">

                  {restaurant.images?.[0] ? (

                    <img
                      src={restaurant.images[0]}
                      alt={
                        restaurant.place_name_th ??
                        restaurant.place_name_en ??
                        "ร้านอาหาร"
                      }
                      className="
                        h-16
                        w-16
                        shrink-0
                        rounded-xl
                        object-cover
                      "
                    />

                  ) : (

                    <div
                      className="
                        flex
                        h-16
                        w-16
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-gray-100
                      "
                    >
                      <Utensils
                        size={24}
                        strokeWidth={1.8}
                        className="text-[#b89bcb]"
                      />
                    </div>

                  )}


                  <div className="min-w-0 flex-1">

                    <div className="text-sm font-semibold">
                      {restaurant.place_name_th ??
                        restaurant.place_name_en ??
                        "ร้านอาหาร"}
                    </div>


                    {restaurant.rating != null && (

                      <div
                        className="
                          mt-1
                          flex
                          items-center
                          gap-1
                          text-xs
                          text-gray-500
                        "
                      >
                        <Star
                          size={13}
                          strokeWidth={2}
                          className="text-[#e9a8c9]"
                        />

                        <span>
                          {restaurant.rating}
                        </span>
                      </div>

                    )}


                    {restaurant.distance_km != null && (

                      <div
                        className="
                          mt-1
                          flex
                          items-center
                          gap-1
                          text-xs
                          text-gray-500
                        "
                      >
                        <MapPin
                          size={13}
                          strokeWidth={2}
                          className="text-[#a9dce8]"
                        />

                        <span>
                          {Number(
                            restaurant.distance_km
                          ).toFixed(2)}{" "}
                          กม.
                        </span>
                      </div>

                    )}

                  </div>

                </div>


                {/* =========================
                    เพิ่ม / แทนที่
                ========================= */}
                <div className="mt-3 flex gap-2">

                  {/* เพิ่ม */}
                  <button
                    type="button"

                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}

                    onClick={(e) => {
                      e.stopPropagation();

                      addRestaurantToPlan(
                        restaurant,
                        item
                      );
                    }}

                    className="
                      flex
                      flex-1
                      items-center
                      justify-center
                      gap-1
                      rounded-lg
                      border
                      border-[#bfe5d4]
                      bg-[#bfe5d4]
                      px-2
                      py-2
                      text-xs
                      font-semibold
                      text-[#302b43]
                    "
                  >
                    <Plus
                      size={14}
                      strokeWidth={2.2}
                    />

                    เพิ่ม
                  </button>


                  {/* แทนที่ */}
                  <button
                    type="button"

                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}

                    onClick={(e) => {
                      e.stopPropagation();

                      replaceRestaurantInPlan(
                        restaurant,
                        item
                      );
                    }}

                    className="
                      flex
                      flex-1
                      items-center
                      justify-center
                      gap-1
                      rounded-lg
                      border
                      border-[#e9a8c9]
                      bg-[#e9a8c9]
                      px-2
                      py-2
                      text-xs
                      font-semibold
                      text-[#302b43]
                    "
                  >
                    <RefreshCw
                      size={14}
                      strokeWidth={2.2}
                    />

                    แทนที่
                  </button>

                </div>

              </div>

            )
          )}

        </div>

      )}

    </div>
  );
}

export function TripPlanPanel({
  plannerJson,
  plan,
  tripInput,
  allPlaces,
  restaurants,
  mapCenter,
  chatId,
  showMap = true,
  onDayChange,
  existingTripId,
  existingTripTitle,
  onExistingTripSaved,
}: {
  plannerJson: any;
  plan: string;
  tripInput: any;
  allPlaces: any[];
  restaurants: any[];
  mapCenter: {
    lat: number;
    lng: number;
  };
  chatId: string | null | undefined;
  showMap?: boolean;
  onDayChange?: (day: number | "all") => void;
  existingTripId?: string | null;
  existingTripTitle?: string | null;
  onExistingTripSaved?: (title: string) => void;
}) {
  console.log("🔥 TripPlanPanel RENDER");

  const [selectedDay, setSelectedDay] = useState(0);
const [showAllDays, setShowAllDays] = useState(false);
  const [routePlaces, setRoutePlaces] = useState<any[]>([]);
  const [routePlacesByDay,setRoutePlacesByDay] = useState<any>({});
  const [liveRestaurants, setLiveRestaurants] = useState<any[]>(restaurants);
  const [livePlaces, setLivePlaces] = useState<any[]>(allPlaces);
  const [hotelModal, setHotelModal] = useState(false);
const [hotelSearch, setHotelSearch] = useState("");
const [hotels, setHotels] = useState<any[]>([]);
const [hotelLoading, setHotelLoading] = useState(false);
const [showSaveTripModal, setShowSaveTripModal] = useState(false);
const [tripTitle, setTripTitle] = useState("");
const [showMoreRestaurants, setShowMoreRestaurants] = useState<
  Record<string, boolean>
>({});

const [moreRestaurants, setMoreRestaurants] = useState<
  Record<string, any[]>
>({});

const [loadingMoreRestaurants, setLoadingMoreRestaurants] = useState<
  Record<string, boolean>
>({});
const [hasMoreRestaurants, setHasMoreRestaurants] = useState<
  Record<string, boolean>
>({});

const filteredHotels = useMemo(() => {

  const keyword = hotelSearch.toLowerCase();

  return hotels.filter((hotel) => {

    const thaiName =
      hotel.acc_name_th
        ?.toLowerCase() || "";

    const engName =
      hotel.acc_name_en
        ?.toLowerCase() || "";


    return (
      thaiName.includes(keyword) ||
      engName.includes(keyword)
    );

  });

}, [hotels, hotelSearch]);

  const loadHotels = async () => {
    console.log("🔥 LOAD HOTELS START");

  setHotelLoading(true);

  const { data, error } = await supabase
    .from("accommodation")
    .select(`
      acc_id,
      acc_name_th,
      acc_name_en,
      province_name_th,
      acc_address,
      latitude,
      longitude,
      star_level,
      accom_price_name,
      images

    `)
    .eq("province_name_th", tripInput.province)
    .order("star_level", { ascending: false });

  if (error) {
    console.error(error);
    setHotelLoading(false);
    return;
  }

  setHotels(data || []);
  console.log("HOTELS:", data);
console.log("FIRST HOTEL:", data?.[0]);
  setHotelLoading(false);

};

const getDefaultTripTitle = () => {
  const destination =
    tripInput?.destination ||
    tripInput?.province ||
    "My Trip";

  const days =
    tripInput?.days ||
    tripInput?.duration ||
    null;

  if (days) {
    return `ทริป${destination} ${days} วัน`;
  }

  return `ทริป${destination}`;
};

const saveTripToSupabase = async () => {
  try {
    const isUpdateMode =
      Boolean(existingTripId);

    console.log(
      isUpdateMode
        ? "💾 START UPDATE TRIP"
        : "💾 START SAVE TRIP"
    );

    if (!tripTitle.trim()) {
      alert("กรุณาใส่ชื่อทริป");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "❌ USER ERROR:",
        userError
      );
      alert("กรุณาเข้าสู่ระบบก่อน");
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profile")
      .select("profile_id")
      .eq("profile_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "❌ PROFILE ERROR:",
        profileError
      );
      alert("ไม่พบข้อมูล Profile");
      return;
    }

    // ถ้าอยู่หน้า "ทั้งหมด" routePlacesByDay
    // คือข้อมูลล่าสุดจากการลากข้ามวันอยู่แล้ว
    const updatedRoutePlacesByDay =
      showAllDays
        ? {
            ...routePlacesByDay,
          }
        : {
            ...routePlacesByDay,
            [selectedDay]:
              routePlaces,
          };

    const tripPayload = {
      title: tripTitle.trim(),
      destination:
        tripInput?.destination ||
        tripInput?.province ||
        null,
      people:
        tripInput?.companion ||
        tripInput?.travel_companion ||
        null,
      budget:
        tripInput?.budget
          ? Number(tripInput.budget)
          : null,
    };

    let tripIdToSave: string;

    if (isUpdateMode) {
      // ==========================================
      // UPDATE EXISTING TRIP
      // ==========================================
      const {
        data: updatedTrip,
        error: updateTripError,
      } = await supabase
        .from("trips")
        .update(tripPayload)
        .eq(
          "id",
          existingTripId
        )
        .eq(
          "profile_id",
          profile.profile_id
        )
        .select("id")
        .single();

      if (
        updateTripError ||
        !updatedTrip
      ) {
        console.error(
          "❌ UPDATE TRIP ERROR:",
          updateTripError
        );
        throw (
          updateTripError ||
          new Error(
            "Update trip failed"
          )
        );
      }

      tripIdToSave =
        String(updatedTrip.id);
    } else {
      // ==========================================
      // CREATE NEW TRIP
      // ==========================================
      const {
        data: newTrip,
        error: tripError,
      } = await supabase
        .from("trips")
        .insert({
          profile_id:
            profile.profile_id,
          ...tripPayload,
        })
        .select("id")
        .single();

      if (
        tripError ||
        !newTrip
      ) {
        console.error(
          "❌ CREATE TRIP ERROR:",
          tripError
        );
        throw (
          tripError ||
          new Error(
            "Create trip failed"
          )
        );
      }

      tripIdToSave =
        String(newTrip.id);
    }

    // โหลดวันเดิมไว้สำหรับ update mode
    let existingDays: any[] = [];

    if (isUpdateMode) {
      const {
        data: oldDays,
        error: oldDaysError,
      } = await supabase
        .from("trip_days")
        .select(
          "id, day_number"
        )
        .eq(
          "trip_id",
          tripIdToSave
        );

      if (oldDaysError) {
        throw oldDaysError;
      }

      existingDays =
        oldDays || [];
    }

    const existingDayByNumber =
      new Map<number, any>(
        existingDays.map(
          (day: any) => [
            Number(
              day.day_number
            ),
            day,
          ]
        )
      );

    const currentDayNumbers =
      new Set(
        days.map(
          (dayData: any) =>
            Number(dayData.day)
        )
      );

    // ถ้าจำนวนวันลดลง ให้ลบวันที่ไม่ใช้แล้ว
    if (isUpdateMode) {
      const removedDayIds =
        existingDays
          .filter(
            (day: any) =>
              !currentDayNumbers.has(
                Number(
                  day.day_number
                )
              )
          )
          .map(
            (day: any) =>
              day.id
          );

      if (
        removedDayIds.length > 0
      ) {
        const {
          error:
            deleteOldItemsError,
        } = await supabase
          .from("trip_items")
          .delete()
          .in(
            "trip_day_id",
            removedDayIds
          );

        if (
          deleteOldItemsError
        ) {
          throw deleteOldItemsError;
        }

        const {
          error:
            deleteOldDaysError,
        } = await supabase
          .from("trip_days")
          .delete()
          .in(
            "id",
            removedDayIds
          );

        if (
          deleteOldDaysError
        ) {
          throw deleteOldDaysError;
        }
      }
    }

    // ==========================================
    // SAVE / REPLACE EACH DAY
    // ==========================================
    for (
      const dayData of days
    ) {
      const dayNumber =
        Number(dayData.day);

      let tripDay =
        existingDayByNumber.get(
          dayNumber
        );

      if (
        isUpdateMode &&
        tripDay
      ) {
        const {
          error: dayUpdateError,
        } = await supabase
          .from("trip_days")
          .update({
            title:
              dayData.title ||
              null,
          })
          .eq(
            "id",
            tripDay.id
          );

        if (
          dayUpdateError
        ) {
          throw dayUpdateError;
        }
      } else {
        const {
          data: createdDay,
          error: dayError,
        } = await supabase
          .from("trip_days")
          .insert({
            trip_id:
              tripIdToSave,
            day_number:
              dayNumber,
            title:
              dayData.title ||
              null,
          })
          .select(
            "id, day_number"
          )
          .single();

        if (
          dayError ||
          !createdDay
        ) {
          console.error(
            "❌ CREATE DAY ERROR:",
            dayError
          );
          throw (
            dayError ||
            new Error(
              "Create day failed"
            )
          );
        }

        tripDay =
          createdDay;
      }

      // Update mode = ล้าง items ของวันเดิม
      // แล้วเขียนลำดับล่าสุดทับลงไป
      if (isUpdateMode) {
        const {
          error:
            deleteItemsError,
        } = await supabase
          .from("trip_items")
          .delete()
          .eq(
            "trip_day_id",
            tripDay.id
          );

        if (
          deleteItemsError
        ) {
          throw deleteItemsError;
        }
      }

      const items =
        updatedRoutePlacesByDay[
          dayNumber - 1
        ] ??
        dayData.items ??
        [];

      const tripItems =
        items
          .map(
            (
              item: any,
              index: number
            ) => {
              const isRestaurant =
                item.type ===
                  "restaurant" ||
                Boolean(
                  item.restaurant_id
                );

              if (
                isRestaurant
              ) {
                if (
                  !item.restaurant_id
                ) {
                  return null;
                }

                return {
                  trip_day_id:
                    tripDay.id,
                  item_type:
                    "restaurant",
                  att_id: null,
                  restaurant_id:
                    String(
                      item.restaurant_id
                    ),
                  sort_order:
                    index + 1,
                };
              }

              const placeId =
                item.place_id ??
                item.att_id;

              if (!placeId) {
                return null;
              }

              return {
                trip_day_id:
                  tripDay.id,
                item_type:
                  "place",
                att_id:
                  String(placeId),
                restaurant_id:
                  null,
                sort_order:
                  index + 1,
              };
            }
          )
          .filter(Boolean);

      if (
        tripItems.length > 0
      ) {
        const {
          error: itemError,
        } = await supabase
          .from("trip_items")
          .insert(
            tripItems
          );

        if (itemError) {
          console.error(
            "❌ SAVE ITEMS ERROR:",
            itemError
          );
          throw itemError;
        }
      }
    }

    setShowSaveTripModal(
      false
    );

    if (isUpdateMode) {
      onExistingTripSaved?.(
        tripTitle.trim()
      );

      alert(
        "อัปเดตทริปเรียบร้อยแล้ว"
      );
    } else {
      alert(
        "บันทึกทริปเรียบร้อยแล้ว"
      );
    }
  } catch (error) {
    console.error(
      "❌ SAVE TRIP FAILED:",
      error
    );

    alert(
      existingTripId
        ? "เกิดข้อผิดพลาดในการอัปเดตทริป"
        : "เกิดข้อผิดพลาดในการบันทึกทริป"
    );
  }
};

  const getCoordinates = (places: any[]) => {

    const place = places.find(
      p => p.latitude && p.longitude
    );


    if (place) {

      return {
        lat: Number(place.latitude),
        lng: Number(place.longitude)
      };

    }


    return {
      lat: 13.7563,
      lng: 100.5018
    };

  };

  const checkMoreRestaurants = async (
  attId: string,
  recommendedRestaurantId?: string
) => {
  // เคยตรวจแล้ว ไม่ต้อง query ซ้ำ
  if (hasMoreRestaurants[attId] !== undefined) {
    return;
  }

  const { data: relations, error } = await supabase
    .from("attraction_restaurant")
    .select("place_id")
    .eq("att_id", attId)
    .limit(10);

  if (error) {
    console.error(
      "❌ CHECK MORE RESTAURANTS ERROR:",
      error
    );

    setHasMoreRestaurants(prev => ({
      ...prev,
      [attId]: false,
    }));

    return;
  }

  // ต้องมีร้านอื่นที่ไม่ใช่ร้านที่ AI เลือกอยู่แล้ว
  const hasMore = (relations || []).some(
    (relation: any) =>
      String(relation.place_id) !==
      String(recommendedRestaurantId)
  );

  setHasMoreRestaurants(prev => ({
    ...prev,
    [attId]: hasMore,
  }));

  console.log(
    `🍽️ ${attId} มีร้านเพิ่มเติม:`,
    hasMore
  );
};

const loadMoreRestaurants = async (
  attId: string,
  recommendedRestaurantId?: string
) => {

  console.log("🍽️ LOAD MORE RESTAURANTS");
  console.log("👉 ATT_ID:", attId);

  if (moreRestaurants[attId]) {
    setShowMoreRestaurants(prev => ({
      ...prev,
      [attId]: !prev[attId],
    }));
    return;
  }

  setLoadingMoreRestaurants(prev => ({
    ...prev,
    [attId]: true,
  }));

  try {

    // ========================================
    // 1. หา restaurant ที่ผูกกับสถานที่
    // ========================================
const { data: relations, error: relationError } =
  await supabase
    .from("attraction_restaurant")
    .select(`
      place_id,
      distance_km
    `)
    .eq("att_id", attId)
    .order("distance_km", {
      ascending: true
    })
    .limit(10);

    console.log(
      "🔗 ATTRACTION RESTAURANT:",
      relations
    );

    if (relationError) {
      console.error(
        "❌ RELATION ERROR:",
        relationError
      );
      return;
    }

    if (!relations || relations.length === 0) {
      setHasMoreRestaurants(prev => ({
  ...prev,
  [attId]: false
}));

      console.log(
        "❌ ไม่พบร้านที่ผูกกับ att_id:",
        attId
      );

      setMoreRestaurants(prev => ({
        ...prev,
        [attId]: [],
      }));

      setShowMoreRestaurants(prev => ({
        ...prev,
        [attId]: true,
      }));

      return;
    }

    // ========================================
    // 2. เอา place_id ไปหา restaurant
    // ========================================

    const restaurantIds = relations
      .map((item: any) => String(item.place_id))
      .filter(Boolean);

    console.log(
      "🍜 RESTAURANT IDS:",
      restaurantIds
    );

    const {
      data: restaurantData,
      error: restaurantError
    } = await supabase
      .from("restaurant")
      .select(`
        place_id,
        place_name_th,
        place_name_en,
        place_address,
        place_phone,
        place_website,
        place_type,
        province_name_th,
        latitude,
        longitude,
        images,
        rating,
        user_ratings_total
      `)
      .in("place_id", restaurantIds);

    if (restaurantError) {
      console.error(
        "❌ RESTAURANT ERROR:",
        restaurantError
      );
      return;
    }

    console.log(
      "🍜 RESTAURANTS FROM DB:",
      restaurantData
    );

    // ========================================
    // 3. รวม distance_km เข้ากับร้าน
    // ========================================
const restaurantList =
  (restaurantData || [])
    .map((restaurant: any) => {
      const relation = relations.find(
        (item: any) =>
          String(item.place_id) ===
          String(restaurant.place_id)
      );

      return {
        ...restaurant,
        distance_km: relation?.distance_km
      };
    })
    // ❌ ไม่เอาร้านที่ AI แนะนำมาแสดงซ้ำ
    .filter(
      (restaurant: any) =>
        String(restaurant.place_id) !==
        String(recommendedRestaurantId)
    )
    // เอาแค่ 3 ร้าน
    .slice(0, 10);
    setHasMoreRestaurants(prev => ({
  ...prev,
  [attId]: restaurantList.length > 0
}));


    console.log(
      "🍽️ MORE RESTAURANTS:",
      restaurantList
    );

    // ========================================
    // 4. เก็บข้อมูล
    // ========================================

    setMoreRestaurants(prev => ({
      ...prev,
      [attId]: restaurantList,
    }));

    setShowMoreRestaurants(prev => ({
      ...prev,
      [attId]: true,
    }));

  } finally {

    setLoadingMoreRestaurants(prev => ({
      ...prev,
      [attId]: false,
    }));

  }
};

// ============================================================
// เพิ่มร้านอาหารเข้าแผน
// ============================================================
const addRestaurantToPlan = (
  restaurant: any,
  currentItem: any
) => {
  console.log("➕ ADD RESTAURANT");
  console.log("CURRENT ITEM:", currentItem);
  console.log("NEW RESTAURANT:", restaurant);

  const newRestaurant = {
    ...currentItem,

    type: "restaurant",

    restaurant_id: String(restaurant.place_id),

    restaurant_name:
      restaurant.place_name_th ??
      restaurant.place_name_en ??
      "ร้านอาหาร",

    name:
      restaurant.place_name_th ??
      restaurant.place_name_en ??
      "ร้านอาหาร",

    images: restaurant.images ?? [],

    location: restaurant,

    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };

  setRoutePlaces(prev => {

    const currentIndex = prev.findIndex(
      item =>
        item.type === "restaurant" &&
        String(item.restaurant_id) ===
          String(currentItem.restaurant_id)
    );

    if (currentIndex === -1) {
      console.warn(
        "❌ ไม่พบร้านเดิมใน routePlaces"
      );

      return prev;
    }

    const newPlaces = [...prev];

    // เพิ่มร้านใหม่ต่อจากร้านเดิม
    newPlaces.splice(
      currentIndex + 1,
      0,
      newRestaurant
    );

    console.log(
      "✅ ROUTE PLACES AFTER ADD:",
      newPlaces
    );

    return newPlaces;
  });
};


// ============================================================
// แทนที่ร้านอาหารในแผน
// ============================================================
const replaceRestaurantInPlan = (
  restaurant: any,
  currentItem: any
) => {
  console.log("🔄 REPLACE RESTAURANT");
  console.log("CURRENT ITEM:", currentItem);
  console.log("NEW RESTAURANT:", restaurant);

  const newRestaurant = {
    ...currentItem,

    type: "restaurant",

    restaurant_id: String(restaurant.place_id),

    restaurant_name:
      restaurant.place_name_th ??
      restaurant.place_name_en ??
      "ร้านอาหาร",

    name:
      restaurant.place_name_th ??
      restaurant.place_name_en ??
      "ร้านอาหาร",

    images: restaurant.images ?? [],

    location: restaurant,

    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };

  setRoutePlaces(prev => {

    const newPlaces = prev.map(item => {

      if (
        item.type === "restaurant" &&
        String(item.restaurant_id) ===
          String(currentItem.restaurant_id)
      ) {
        return newRestaurant;
      }

      return item;
    });

    console.log(
      "✅ ROUTE PLACES AFTER REPLACE:",
      newPlaces
    );

    return newPlaces;
  });
};

const removePlaceFromPlan = (
  currentItem: any
) => {
  console.log("🗑️ REMOVE PLACE");
  console.log("REMOVE ITEM:", currentItem);

  setRoutePlaces(prev => {

    const newPlaces = prev.filter(item => {
      return !(
        item.type === "place" &&
        String(item.place_id) ===
          String(currentItem.place_id)
      );
    });

    console.log(
      "✅ ROUTE PLACES AFTER REMOVE PLACE:",
      newPlaces
    );

    return newPlaces;
  });
};

const removeRestaurantFromPlan = (
  currentItem: any
) => {
  console.log("🗑️ REMOVE RESTAURANT");
  console.log("REMOVE ITEM:", currentItem);

  setRoutePlaces(prev => {

    const newPlaces = prev.filter(item => {
      return !(
        item.type === "restaurant" &&
        String(item.restaurant_id) ===
          String(currentItem.restaurant_id)
      );
    });

    console.log(
      "✅ ROUTE PLACES AFTER REMOVE:",
      newPlaces
    );

    return newPlaces;
  });
};
const saveEditedPlan = async () => {
  try {
    console.log("💾 SAVE EDITED PLAN");

    if (!chatId) {
      console.error("❌ ไม่มี chatId");
      return;
    }

    // =====================================================
    // 1. เก็บข้อมูล Day ปัจจุบันก่อน
    // =====================================================

    const updatedRoutePlacesByDay = {
      ...routePlacesByDay,
      [selectedDay]: routePlaces,
    };

    console.log(
      "📦 ROUTE PLACES BY DAY:",
      updatedRoutePlacesByDay
    );

    // =====================================================
    // 2. สร้าง planner_json ใหม่จากทุก Day
    // =====================================================

    const selectedPlaces: any[] = [];

    days.forEach((dayData, dayIndex) => {

      // ถ้า Day นี้มีการแก้ไขแล้ว
      // ใช้ข้อมูลจาก routePlacesByDay
      // ถ้ายังไม่เคยแก้ ใช้ข้อมูลเดิมจาก plannerItems
      const editedItems =
        updatedRoutePlacesByDay[dayIndex];

      if (editedItems) {

        editedItems.forEach(
          (item: any, index: number) => {

            selectedPlaces.push({
              day: dayIndex + 1,

              order: index + 1,

              type: item.type,

              place_id:
                item.type === "place"
                  ? String(item.place_id)
                  : null,

              restaurant_id:
                item.type === "restaurant"
                  ? String(item.restaurant_id)
                  : null,

              place_name:
                item.type === "place"
                  ? (
                      item.name ??
                      item.place_name ??
                      null
                    )
                  : null,

              restaurant_name:
                item.type === "restaurant"
                  ? (
                      item.name ??
                      item.restaurant_name ??
                      null
                    )
                  : null,
            });

          }
        );

      } else {

        // =================================================
        // Day ที่ยังไม่ได้แก้
        // ใช้ข้อมูลเดิม
        // =================================================

        const originalItems =
          dayData.items || [];

        originalItems.forEach(
          (item: any, index: number) => {

            selectedPlaces.push({

              day: dayIndex + 1,

              order: index + 1,

              type:
                item.restaurant_id
                  ? "restaurant"
                  : "place",

              place_id:
                item.place_id
                  ? String(item.place_id)
                  : null,

              restaurant_id:
                item.restaurant_id
                  ? String(item.restaurant_id)
                  : null,

              place_name:
                item.place_name ?? null,

              restaurant_name:
                item.restaurant_name ?? null,

            });

          }
        );

      }

    });

    console.log(
      "💾 FINAL PLANNER JSON:",
      selectedPlaces
    );

    // =====================================================
    // 3. หา AI planner message
    // =====================================================

    const {
      data: plannerMessage,
      error: findError
    } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("session_id", chatId)
      .eq("role", "ai")
      .not("planner_json", "is", null)
      .order("created_at", {
        ascending: false
      })
      .limit(1)
      .maybeSingle();

    if (findError) {

      console.error(
        "❌ FIND PLANNER ERROR:",
        findError
      );

      return;
    }

    if (!plannerMessage) {

      console.error(
        "❌ ไม่พบ planner message"
      );

      return;
    }

    console.log(
      "📝 PLANNER MESSAGE ID:",
      plannerMessage.id
    );

    // =====================================================
    // 4. UPDATE DATABASE
    // =====================================================

    const {
      error: updateError
    } = await supabase
      .from("chat_messages")
      .update({
        planner_json: selectedPlaces,
      })
      .eq("id", plannerMessage.id);

    if (updateError) {

      console.error(
        "❌ SAVE ERROR:",
        updateError
      );

      return;
    }

    // =====================================================
    // 5. สำเร็จ
    // =====================================================

    console.log(
      "✅ SAVE SUCCESS"
    );

    alert("บันทึกแผนเรียบร้อยแล้ว");

  } catch (error) {

    console.error(
      "❌ SAVE FAILED:",
      error
    );

  }
};
const openGoogleMaps = (items: any[]) => {
  const locations: string[] = [];

  items.forEach((item) => {

    // =========================
    // 1. สถานที่ท่องเที่ยว
    // =========================
    if (item.place_id) {
      const place = findPlace(item.place_id);

      console.log("📍 PLACE:", {
        id: item.place_id,
        name: item.place_name,
        found: place,
      });

      if (
        place &&
        place.latitude != null &&
        place.longitude != null
      ) {
        locations.push(
          `${place.latitude},${place.longitude}`
        );
      } else {
        console.warn(
          "❌ ไม่พบพิกัดสถานที่:",
          item.place_name,
          item.place_id
        );
      }
    }

    // =========================
    // 2. ร้านอาหาร
    // =========================
    if (item.restaurant_id) {
      const restaurant = findRestaurant(
        item.restaurant_id
      );

      console.log("🍜 RESTAURANT:", {
        id: item.restaurant_id,
        name: item.restaurant_name,
        found: restaurant,
      });

      if (
        restaurant &&
        restaurant.latitude != null &&
        restaurant.longitude != null
      ) {
        locations.push(
          `${restaurant.latitude},${restaurant.longitude}`
        );
      } else {
        console.warn(
          "❌ ไม่พบพิกัดร้าน:",
          item.restaurant_name,
          item.restaurant_id
        );
      }
    }
  });

  console.log(
    "🗺️ GOOGLE MAP LOCATIONS:",
    locations
  );

  if (locations.length === 0) {
    console.warn("❌ ไม่มีสถานที่ที่มีพิกัด");
    return;
  }

  const url =
    `https://www.google.com/maps/dir/${locations.join("/")}`;

  console.log("🌎 GOOGLE MAP URL:", url);

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
};
const handleDragEnd = (event: any) => {

  const { active, over } = event;

  if (!over) return;

  if (active.id === over.id) return;

  setRoutePlaces((items) => {

    const getSortableId = (item: any) => {

      if (item.type === "restaurant") {
        return `restaurant-${item.restaurant_id}`;
      }

      return `place-${item.place_id}`;
    };

    const oldIndex = items.findIndex(
      item =>
        getSortableId(item) === String(active.id)
    );

    const newIndex = items.findIndex(
      item =>
        getSortableId(item) === String(over.id)
    );

    console.log("🔄 DRAG:", {
      active: active.id,
      over: over.id,
      oldIndex,
      newIndex
    });

    if (oldIndex === -1 || newIndex === -1) {
      console.warn("❌ Drag item not found");
      return items;
    }

    return arrayMove(
      items,
      oldIndex,
      newIndex
    );

  });

};

const getRouteSortableId = (
  item: any
) =>
  item.type === "restaurant"
    ? `restaurant-${item.restaurant_id}`
    : `place-${item.place_id}`;

const getAllDaySortableId = (
  item: any,
  dayIndex: number
) =>
  `all-day-${dayIndex}-${getRouteSortableId(item)}`;

const handleAllDaysDragEnd = (
  event: DragEndEvent
) => {
  const {
    active,
    over
  } = event;

  if (!over) return;

  const sourceDayIndex =
    Number(
      active.data.current?.dayIndex
    );

  const targetDayIndex =
    Number(
      over.data.current?.dayIndex
    );

  if (
    !Number.isInteger(sourceDayIndex) ||
    !Number.isInteger(targetDayIndex)
  ) {
    console.warn(
      "❌ Invalid cross-day drag target"
    );
    return;
  }

  const nextByDay: Record<
    number,
    any[]
  > = {};

  days.forEach(
    (dayData, dayIndex) => {
      const source =
        dayIndex === selectedDay
          ? routePlaces
          : routePlacesByDay[
              dayIndex
            ] ??
            buildRoutePlaces(
              dayData.items ?? []
            );

      nextByDay[dayIndex] =
        [...source];
    }
  );

  const sourceItems =
    nextByDay[sourceDayIndex] ?? [];

  const targetItems =
    nextByDay[targetDayIndex] ?? [];

  const activeIndex =
    sourceItems.findIndex(
      item =>
        getAllDaySortableId(
          item,
          sourceDayIndex
        ) === String(active.id)
    );

  if (activeIndex === -1) {
    console.warn(
      "❌ Cross-day drag item not found"
    );
    return;
  }

  // เรียงลำดับภายในวันเดียวกัน
  if (
    sourceDayIndex ===
    targetDayIndex
  ) {
    if (
      over.data.current?.type ===
      "day-container"
    ) {
      const [
        movedItem
      ] = sourceItems.splice(
        activeIndex,
        1
      );

      sourceItems.push(
        movedItem
      );
    } else {
      const overIndex =
        sourceItems.findIndex(
          item =>
            getAllDaySortableId(
              item,
              sourceDayIndex
            ) === String(over.id)
        );

      if (
        overIndex !== -1 &&
        overIndex !== activeIndex
      ) {
        nextByDay[
          sourceDayIndex
        ] = arrayMove(
          sourceItems,
          activeIndex,
          overIndex
        );
      }
    }
  } else {
    // ย้ายข้ามวัน
    const [
      movedItem
    ] = sourceItems.splice(
      activeIndex,
      1
    );

    const movedWithDay = {
      ...movedItem,
      day:
        days[targetDayIndex]?.day ??
        targetDayIndex + 1
    };

    let insertIndex =
      targetItems.length;

    if (
      over.data.current?.type !==
      "day-container"
    ) {
      const foundIndex =
        targetItems.findIndex(
          item =>
            getAllDaySortableId(
              item,
              targetDayIndex
            ) === String(over.id)
        );

      if (foundIndex !== -1) {
        insertIndex =
          foundIndex;
      }
    }

    targetItems.splice(
      insertIndex,
      0,
      movedWithDay
    );
  }

  console.log(
    "🔀 CROSS DAY DRAG:",
    {
      from:
        sourceDayIndex + 1,
      to:
        targetDayIndex + 1,
      active: active.id,
      over: over.id
    }
  );

  setRoutePlacesByDay(
    nextByDay
  );

  if (
    nextByDay[selectedDay]
  ) {
    setRoutePlaces(
      nextByDay[selectedDay]
    );
  }
};

const sensors = useSensors(
  // Desktop only
  useSensor(
    MouseSensor,
    {
      activationConstraint: {
        distance: 4
      }
    }
  ),

  // Mobile / tablet only.
  // Drag starts from the numbered handle below.
  useSensor(
    TouchSensor,
    {
      activationConstraint: {
        delay: 100,
        tolerance: 10
      }
    }
  )
);

  const plannerItems = Array.isArray(plannerJson)
  ? plannerJson
  : plannerJson?.selectedPlaces || [];

  // ใช้ตรวจว่า AI ส่ง planner เวอร์ชันใหม่เข้ามาหรือไม่
  // เพื่อเคลียร์ cache ภายใน TripPlanPanel ที่ใช้ตอน drag/edit
  const plannerVersion = useMemo(
    () =>
      JSON.stringify(
        plannerItems.map((item: any) => ({
          day: item.day,
          period: item.period,
          place_id: item.place_id,
          restaurant_id: item.restaurant_id
        }))
      ),
    [plannerJson]
  );

  useEffect(() => {
    console.log(
      "🔄 PLANNER VERSION CHANGED → RESET LOCAL ROUTE CACHE"
    );

    setRoutePlaces([]);
    setRoutePlacesByDay({});
  }, [plannerVersion]);

  useEffect(() => {
  const loadPlannerPlaces = async () => {

    const placeIds = [
      ...new Set(
        plannerItems
          .map((item: any) => item.place_id)
          .filter(Boolean)
          .map(String)
      )
    ];

    console.log("🖼️ ATTRACTION IDS FROM AI:", placeIds);

    if (placeIds.length === 0) {
      setLivePlaces(allPlaces);
      return;
    }

    const { data, error } = await supabase
      .from("attraction")
      .select(`
        att_id,
        name_th,
        name_en,
        latitude,
        longitude,
        province,
        images
      `)
      .in("att_id", placeIds);

    if (error) {
      console.error(
        "❌ LOAD PLANNER PLACES ERROR:",
        error
      );
      return;
    }

    console.log(
      "🖼️ LATEST ATTRACTIONS FROM SUPABASE:",
      data
    );

    setLivePlaces(data || []);
  };

  loadPlannerPlaces();

}, [plannerJson, allPlaces]);

  useEffect(() => {
  const loadPlannerRestaurants = async () => {

    const restaurantIds = [
      ...new Set(
        plannerItems
          .map((item: any) => item.restaurant_id)
          .filter(Boolean)
          .map(String)
      )
    ];

    console.log("🍜 RESTAURANT IDS FROM AI:", restaurantIds);

    if (restaurantIds.length === 0) {
      setLiveRestaurants(restaurants);
      return;
    }

    // ตาราง restaurant ใช้ place_id เป็น primary key
    // และเก็บ Google Place ID แยกใน google_place_id
    const existingRestaurants = restaurants.filter((r: any) =>
      restaurantIds.includes(String(r.place_id)) ||
      restaurantIds.includes(String(r.google_place_id))
    );

    console.log(
      "🍜 EXISTING RESTAURANTS:",
      existingRestaurants
    );

    const missingIds = restaurantIds.filter(
      id =>
        !existingRestaurants.some(
          (r: any) =>
            String(r.place_id) === id ||
            String(r.google_place_id) === id
        )
    );

    console.log(
      "🍜 MISSING RESTAURANTS:",
      missingIds
    );

    const baseRestaurantSelect = `
      place_id,
      place_name_th,
      place_name_en,
      place_address,
      place_phone,
      place_website,
      place_type,
      province_name_th,
      latitude,
      longitude,
      images,
      rating,
      user_ratings_total
    `;

    const restaurantSelectWithGoogle = `
      ${baseRestaurantSelect},
      google_place_id
    `;

    let loadedRestaurants: any[] = [];

    if (missingIds.length > 0) {
      const [
        byPlaceIdResult,
        byGooglePlaceIdResult
      ] = await Promise.all([
        supabase
          .from("restaurant")
          .select(restaurantSelectWithGoogle)
          .in("place_id", missingIds),

        supabase
          .from("restaurant")
          .select(restaurantSelectWithGoogle)
          .in("google_place_id", missingIds)
      ]);

      if (
        byPlaceIdResult.error ||
        byGooglePlaceIdResult.error
      ) {
        console.error(
          "❌ LOAD PLANNER RESTAURANTS ERROR:",
          byPlaceIdResult.error ||
          byGooglePlaceIdResult.error
        );
      }

      loadedRestaurants = [
        ...(byPlaceIdResult.data || []),
        ...(byGooglePlaceIdResult.data || [])
      ].filter(
        (restaurant, index, array) =>
          array.findIndex(
            item =>
              String(item.place_id) ===
              String(restaurant.place_id)
          ) === index
      );
    }

    const allResolvedRestaurants = [
      ...existingRestaurants,
      ...loadedRestaurants
    ].filter(
      (restaurant, index, array) =>
        array.findIndex(
          item =>
            String(item.place_id) ===
            String(restaurant.place_id)
        ) === index
    );

    const API_URL =
      (
        import.meta.env.VITE_API_URL ||
        (
          import.meta.env.DEV
            ? "http://localhost:5000"
            : ""
        )
      ).replace(/\/$/, "");

    const hydratedRestaurants =
      await Promise.all(
        allResolvedRestaurants.map(
          async (restaurant: any) => {
            const hasImages =
              Array.isArray(
                restaurant.images
              ) &&
              restaurant.images.length > 0;

            // ร้านที่ place_id เป็น Google Place ID อยู่แล้ว
            // ใช้เป็น google_place_id ได้โดยตรง
            const inferredGooglePlaceId =
              restaurant.google_place_id ||
              (
                String(
                  restaurant.place_id ?? ""
                ).startsWith("ChIJ")
                  ? restaurant.place_id
                  : null
              );

            if (
              inferredGooglePlaceId &&
              hasImages
            ) {
              return {
                ...restaurant,
                google_place_id:
                  inferredGooglePlaceId
              };
            }

            const identifier =
              inferredGooglePlaceId ??
              restaurant.place_id;

            if (!identifier) {
              return restaurant;
            }

            try {
              const response = await fetch(
                `${API_URL}/api/restaurant-images?restaurant_id=${encodeURIComponent(
                  String(identifier)
                )}`
              );

              if (!response.ok) {
                console.warn(
                  "⚠️ RESTAURANT GOOGLE RESOLVE ERROR:",
                  identifier,
                  response.status
                );

                return {
                  ...restaurant,
                  google_place_id:
                    inferredGooglePlaceId
                };
              }

              const json =
                await response.json();

              return (
                json.restaurant || {
                  ...restaurant,
                  google_place_id:
                    inferredGooglePlaceId,
                  images:
                    json.images ||
                    restaurant.images
                }
              );
            } catch (error) {
              console.warn(
                "⚠️ RESTAURANT GOOGLE RESOLVE FAILED:",
                identifier,
                error
              );

              return {
                ...restaurant,
                google_place_id:
                  inferredGooglePlaceId
              };
            }
          }
        )
      );

    console.log(
      "🍜 RESTAURANTS READY:",
      hydratedRestaurants.map(
        (restaurant: any) => ({
          place_id:
            restaurant.place_id,
          google_place_id:
            restaurant.google_place_id,
          name:
            restaurant.place_name_th,
          images:
            restaurant.images?.length ?? 0
        })
      )
    );

    setLiveRestaurants(
      hydratedRestaurants
    );
  };

  loadPlannerRestaurants();

}, [plannerJson, restaurants]);

  console.log("RAW PLANNER JSON", plannerJson);
  console.log("🔥 PLANNER ITEMS", plannerItems);

console.log(
  "🍜 RESTAURANT ITEMS",
  plannerItems.filter(x => x.restaurant_id)
);

console.log(
  "PLANNER ITEMS DETAIL",
  plannerItems.map(x => ({
    day:x.day,
    place_id:x.place_id,
    place_name:x.place_name,
    restaurant_id:x.restaurant_id
  }))
);
const days = useMemo(() => {

  return Array.from(
    new Set(
      plannerItems.map(x => Number(x.day))
    )
  ).map(day => {

    const items = plannerItems
      .filter(
        x => Number(x.day) === day
      )
      .filter(
        (item, index, array) =>
          array.findIndex(
            x =>
              x.place_id === item.place_id &&
              x.restaurant_id === item.restaurant_id
          ) === index
      )
      .map(item => ({
        ...item,
        type: "plan"
      }));

    const title =
      plannerItems.find(
        x => Number(x.day) === day
      )?.title ?? "";

    return {
      day,
      title,
      items
    };

  });

}, [plannerItems]);


const findPlace = (placeId: string) => {

  const result = livePlaces.find(
    p => String(p.att_id) === String(placeId)
  );

  console.log(
    "🖼️ FIND PLACE",
    placeId,
    result
  );

  return result;
};

  
const findRestaurant = (restaurantId: string) => {

  const result = liveRestaurants.find(
    r =>
      String(r.place_id) === String(restaurantId) ||
      String(r.google_place_id) === String(restaurantId)
  );

  console.log(
    "🍜 FIND RESTAURANT",
    restaurantId,
    result
  );

  return result;
};

  console.log(
    "DAY CONTENT",
    days[selectedDay]?.content
  );

  console.log(
  "SELECTED DAY ITEMS",
  days[selectedDay]?.items
);

console.log(
  "ALL DAYS",
  days
);


const buildRoutePlaces = (items: any[]) => {
  const result: any[] = [];

  items.forEach((item) => {

    // =========================
    // PLACE
    // =========================
    if (item.place_id) {

      const place = findPlace(item.place_id);

      if (place) {
        result.push({
          ...item,
          type: "place",
          location: place,
          name:
            place.name_th ??
            place.name_en ??
            item.place_name ??
            "สถานที่",
          images: place.images,
        });
      }
    }

    // =========================
    // RESTAURANT
    // =========================
    if (item.restaurant_id) {

      const restaurant =
        findRestaurant(item.restaurant_id);

      if (restaurant) {
        result.push({
          ...item,
          type: "restaurant",
          location: restaurant,
          name:
            restaurant.place_name_th ??
            restaurant.place_name_en ??
            item.restaurant_name ??
            "ร้านอาหาร",
          images: restaurant.images,
        });
      }
    }

  });

  return result.filter(
    x =>
      x.location?.latitude != null &&
      x.location?.longitude != null
  );
};

const mapPlaces = useMemo(() => {

  return buildRoutePlaces(
    days[selectedDay]?.items ?? []
  );

}, [
  days,
  selectedDay,
  livePlaces,
  liveRestaurants
]);
const allDayItems = useMemo(() => {

  return days.map((dayData, dayIndex) => {

    const items =
      dayIndex === selectedDay
        ? routePlaces
        : routePlacesByDay[dayIndex] ??
          buildRoutePlaces(
            dayData.items ?? []
          );

    return {
      ...dayData,
      items,
    };

  });

}, [
  days,
  selectedDay,
  routePlaces,
  routePlacesByDay,
  livePlaces,
  liveRestaurants
]);

useEffect(() => {
  console.log("🔄 CHANGE DAY:", selectedDay);

  // ถ้าเคยแก้ Day นี้แล้ว
  // ให้โหลดข้อมูลที่แก้ไว้กลับมา
  if (routePlacesByDay[selectedDay]) {
    console.log(
      "✅ LOAD SAVED DAY:",
      selectedDay,
      routePlacesByDay[selectedDay]
    );

    setRoutePlaces([
      ...routePlacesByDay[selectedDay]
    ]);

    return;
  }

  // ถ้ายังไม่เคยแก้ Day นี้
  // ใช้ข้อมูลเริ่มต้นจาก mapPlaces
  console.log(
    "🆕 LOAD ORIGINAL DAY:",
    selectedDay,
    mapPlaces
  );

  setRoutePlaces([...mapPlaces]);

}, [
  selectedDay,
  mapPlaces,
  routePlacesByDay
]);

console.log(
  "FINAL MAP PLACES",
  mapPlaces
);



console.log(
  "FINAL MARKERS",
  mapPlaces.map(x => ({
    number: x.number,
    name: x.name,
    id: x.restaurant_id ?? x.place_id,
    lat: Number(x.location.latitude),
    lng: Number(x.location.longitude)
  }))
);
  const markerCenter =
mapPlaces.length
?
{
 lat:Number(mapPlaces[0].location.latitude),
 lng:Number(mapPlaces[0].location.longitude)
}
:
mapCenter;

  return (
  <div className="travel-trip-plan flex flex-col gap-5 w-full">

  {/* MAP */}
  {showMap && (
    <div
      className="
        travel-trip-map
        h-[280px]
        rounded-3xl
        overflow-hidden
        relative
      "
    >
      <APIProvider
        apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={["geometry"]}
      >
        <Map
          defaultCenter={markerCenter}
          defaultZoom={13}
          mapId="9d5ca48506fddf5eb0fea298"
          gestureHandling="greedy"
          draggable={true}
          disableDefaultUI={false}
        >
          <MapUpdater center={markerCenter} />

          {routePlaces
            .filter(
              (place) =>
                Number.isFinite(
                  Number(place?.location?.latitude)
                ) &&
                Number.isFinite(
                  Number(place?.location?.longitude)
                )
            )
            .map((place, index) => (
              <Marker
                key={`${place.type}-${place.restaurant_id ?? place.place_id}`}
                position={{
                  lat: Number(place.location.latitude),
                  lng: Number(place.location.longitude),
                }}
                icon={{
                  url:
                    "data:image/svg+xml;charset=UTF-8," +
                    encodeURIComponent(
                      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
                      '<circle cx="16" cy="16" r="14" fill="#573d63" stroke="#ffffff" stroke-width="2"/>' +
                      "</svg>"
                    ),
                }}
                label={{
                  text: String(index + 1),
                  color: "#ffffff",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
                title={place.name}
              />
            ))}
        </Map>
      </APIProvider>
    </div>
  )}

  {/* HEADER */}
      <div>

  <div className="flex items-start justify-between">

    <div>
  <h1 className="text-xl font-bold">
  Trip to {tripInput.province}
</h1>

<p className="text-xs text-gray-500">
  {tripInput.days} days itinerary
</p>
</div>
<div className="relative">
  <button
  onClick={async () => {
    console.log("CLICK HOTEL BUTTON");

    if (hotelModal) {
      setHotelModal(false);
      return;
    }

    setHotelModal(true);

    if (hotels.length === 0) {
      await loadHotels();
    }
  }}
  className="
    travel-hotel-button
    flex
    items-center
    gap-2
    px-4
    py-2.5
    rounded-xl
    border
    text-sm
    font-medium
  "
>
  <Hotel size={16} />
  เพิ่มที่พัก
</button>

  {hotelModal && (
    <div
  className="
    travel-hotel-modal
    absolute
    right-0
    top-full
    mt-2
    w-[360px]
    rounded-2xl
    border
    shadow-xl
    p-4
    z-50
  "
>
      <input
        value={hotelSearch}
        onChange={(e) => setHotelSearch(e.target.value)}
        placeholder="ค้นหาโรงแรม..."
        className="
          w-full
          border
          rounded-xl
          px-4
          py-3
          outline-none
        "
      />
      <div className="
mt-3
max-h-72
overflow-y-auto
space-y-2
">

{
hotelLoading ? (

<div className="text-sm text-gray-500">
กำลังโหลดโรงแรม...
</div>

)

:
filteredHotels.map(hotel => (

<button
key={hotel.acc_id}
className="
w-full
flex
gap-3
text-left
border
rounded-xl
p-3
hover:bg-gray-100
"
>

{/* รูปโรงแรม */}
{hotel.images ? (

<img
src={hotel.images}
alt={hotel.acc_name_th}

className="
w-16
h-16
rounded-xl
object-cover
shrink-0
"
/>

) : (

<div
className="
w-16
h-16
rounded-xl
bg-gray-200
shrink-0
flex
items-center
justify-center
"
>
<Hotel size={22} className="text-gray-400"/>
</div>

)}


<div className="flex-1">
<div className="font-semibold text-sm">
  {hotel.acc_name_th}
</div>

<div className="
  text-xs
  text-gray-600
  mt-0.5
">
  {hotel.acc_name_en}
</div>


<div className="text-xs text-gray-500">
{hotel.province_name_th}
</div>


<div className="text-xs text-gray-400">
⭐ {hotel.star_level ?? "-"}
</div>

</div>


</button>

))

}

</div>
    </div>
  )}
</div>

  </div>

{/* TABS */}
<div className="travel-day-tabs flex gap-2 mt-4">

  {days.map((_, index) => (
    <button
      key={index}
      onClick={() => {

  // เก็บ Day ปัจจุบันก่อน
  setRoutePlacesByDay(prev => ({
    ...prev,
    [selectedDay]: routePlaces,
  }));

  // กลับมาแสดง Day เดียว
  setShowAllDays(false);

  // เปลี่ยน Day ใน TripPlanPanel
  setSelectedDay(index);

  // เปลี่ยน Map ตาม Day
  onDayChange?.(index + 1);
}}
      className={`
        travel-day-tab
        px-4
        py-2
        rounded-full
        text-xs
        font-medium
        transition-all
        ${
          selectedDay === index
            ? "travel-day-tab-active"
            : "travel-day-tab-inactive"
        }
      `}
    >
      Day {index + 1}
    </button>
  ))}

  {/* ALL */}
  <button
  onClick={() => {

    // เก็บการแก้ไขของ Day ปัจจุบันก่อน
    setRoutePlacesByDay(prev => ({
      ...prev,
      [selectedDay]: routePlaces,
    }));

    // เปิดโหมดแสดงทุกวัน
    setShowAllDays(true);

    // เปลี่ยน Map เป็นทุกวัน
    onDayChange?.("all");
  }}
    className={`
  travel-day-tab
  px-4
  py-2
  rounded-full
  text-xs
  font-medium
  transition-all
  ${
    showAllDays
      ? "travel-day-tab-active"
      : "travel-day-tab-inactive"
  }
`}
  >
    ทั้งหมด
  </button>

</div>




        {/* PLACE LIST */}
       <div className="travel-itinerary mt-4 space-y-4">
<div className="flex items-center justify-between">

  <div>

  <h2 className="text-lg font-bold mt-0.5">
  {showAllDays
    ? "All Days"
    : days[selectedDay]?.title || "Your itinerary"}
</h2>
</div>


  <button
  onClick={() =>
    openGoogleMaps(
      showAllDays
        ? allDayItems.flatMap(
            dayData => dayData.items
          )
        : routePlaces
    )
  }
    className="
  travel-map-button
  flex
  items-center
  justify-center
  w-10
  h-10
  rounded-xl
  border
"
  >
    <img
  src={googleMapIcon}
  className="w-5 h-7"
/>
</button>

</div>
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={
    showAllDays
      ? handleAllDaysDragEnd
      : handleDragEnd
  }
>
{showAllDays ? (

  /* =====================================
     ALL DAYS
  ===================================== */

  <div className="space-y-8">

    {allDayItems.map(
      (dayData, dayIndex) => {

        // จำนวนรายการของ Day ก่อนหน้า
        const previousCount = allDayItems
          .slice(0, dayIndex)
          .reduce(
            (sum, day) =>
              sum + day.items.length,
            0
          );

        return (
          <AllDaysDropZone
            key={`all-day-${dayData.day}`}
            dayIndex={dayIndex}
          >

            {/* DAY HEADER */}
            <div className="flex items-center gap-2">

              <h3 className="text-base font-bold">
                Day {dayData.day}
              </h3>

              {dayData.title && (
                <span className="text-sm text-gray-500">
                  {dayData.title}
                </span>
              )}

            </div>

            {/* DAY ITEMS */}
            <SortableContext
              items={dayData.items.map(
                (item) =>
                  getAllDaySortableId(
                    item,
                    dayIndex
                  )
              )}
              strategy={
                verticalListSortingStrategy
              }
            >

              {dayData.items.map(
                (item, index) => (

                  <Fragment
                    key={
                      `all-${dayData.day}-${
                        item.type === "restaurant"
                          ? `restaurant-${item.restaurant_id}`
                          : `place-${item.place_id}`
                      }`
                    }
                  >

                    <SortablePlaceItem
                      item={item}

                      // ⭐ เลขต่อเนื่องทุก Day
                      index={
                        previousCount + index
                      }

                      sortableIdOverride={
                        getAllDaySortableId(
                          item,
                          dayIndex
                        )
                      }
                      sortableDayIndex={
                        dayIndex
                      }

                      findPlace={findPlace}
                      findRestaurant={findRestaurant}

                      loadMoreRestaurants={
                        loadMoreRestaurants
                      }
                        checkMoreRestaurants={checkMoreRestaurants}
  hasMoreRestaurants={hasMoreRestaurants}

                      showMoreRestaurants={
                        showMoreRestaurants
                      }

                      moreRestaurants={
                        moreRestaurants
                      }

                      loadingMoreRestaurants={
                        loadingMoreRestaurants
                      }

                      addRestaurantToPlan={
                        addRestaurantToPlan
                      }

                      replaceRestaurantInPlan={
                        replaceRestaurantInPlan
                      }

                      removePlaceFromPlan={
                        removePlaceFromPlan
                      }

                      removeRestaurantFromPlan={
                        removeRestaurantFromPlan
                      }
                    />

                    {index <
                      dayData.items.length - 1 && (
                      <DistanceBetweenItems
                        from={item}
                        to={
                          dayData.items[
                            index + 1
                          ]
                        }
                      />
                    )}

                  </Fragment>

                )
              )}

            </SortableContext>

          </AllDaysDropZone>
        );

      }
    )}

  </div>

) : (

    /* =====================================
       SINGLE DAY
    ===================================== */

    <SortableContext
      items={routePlaces.map((item) =>
        item.type === "restaurant"
          ? `restaurant-${item.restaurant_id}`
          : `place-${item.place_id}`
      )}
      strategy={verticalListSortingStrategy}
    >

      {routePlaces.map(
        (item, index) => (

          <Fragment
            key={
              `${selectedDay}-${
                item.type === "restaurant"
                  ? `restaurant-${item.restaurant_id}`
                  : `place-${item.place_id}`
              }`
            }
          >

            <SortablePlaceItem
              item={item}
              index={index}
              findPlace={findPlace}
              findRestaurant={findRestaurant}

              loadMoreRestaurants={
                loadMoreRestaurants
              }
                checkMoreRestaurants={checkMoreRestaurants}
  hasMoreRestaurants={hasMoreRestaurants}
  

              showMoreRestaurants={
                showMoreRestaurants
              }

              moreRestaurants={
                moreRestaurants
              }

              loadingMoreRestaurants={
                loadingMoreRestaurants
              }

              addRestaurantToPlan={
                addRestaurantToPlan
              }

              replaceRestaurantInPlan={
                replaceRestaurantInPlan
              }

              removePlaceFromPlan={
                removePlaceFromPlan
              }

              removeRestaurantFromPlan={
                removeRestaurantFromPlan
              }
            />

            {index <
              routePlaces.length - 1 && (
              <DistanceBetweenItems
                from={item}
                to={
                  routePlaces[
                    index + 1
                  ]
                }
              />
            )}

          </Fragment>

        )
      )}

    </SortableContext>

  )}

</DndContext>
<div className="flex justify-end mt-5 pt-4 border-t border-purple-100">
  <button
    onClick={() => {
      setTripTitle(
        existingTripId
          ? (
              existingTripTitle ||
              getDefaultTripTitle()
            )
          : getDefaultTripTitle()
      );
      setShowSaveTripModal(true);
    }}
    className="travel-save-button px-6 py-2.5 rounded-xl font-semibold transition-all duration-200"
  >
    Save
  </button>
</div>

</div>


      </div>
{showSaveTripModal && (
  <div
    className="
      fixed
      inset-0
      z-[100]
      bg-black/40
      flex
      items-center
      justify-center
      p-4
    "
    onClick={() => setShowSaveTripModal(false)}
  >
    <div
      className="
        bg-white
        rounded-3xl
        p-6
        w-full
        max-w-md
        shadow-2xl
      "
      onClick={(e) => e.stopPropagation()}
    >

      <h2 className="text-xl font-semibold">
        {existingTripId
          ? "Update Trip"
          : "Save Trip"}
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        {existingTripId
          ? "Save changes to this trip."
          : "Save your current itinerary as a trip."}
      </p>

      <div className="mt-5">

        <label className="text-sm font-medium">
          Trip name
        </label>

        <input
          value={tripTitle}
          onChange={(e) =>
            setTripTitle(e.target.value)
          }
          className="
            mt-2
            w-full
            border
            rounded-xl
            px-4
            py-3
            outline-none
            focus:ring-2
            focus:ring-black/10
          "
          placeholder="ชื่อทริป"
        />

      </div>

      <div className="mt-6 flex justify-end gap-2">

        <button
          onClick={() =>
            setShowSaveTripModal(false)
          }
          className="
            px-4
            py-2
            rounded-full
            border
            hover:bg-gray-50
          "
        >
          Cancel
        </button>

        <button
          onClick={saveTripToSupabase}
          disabled={!tripTitle.trim()}
          className="
            px-5
            py-2
            rounded-full
            bg-black
            text-white
            disabled:opacity-40
          "
        >
          {existingTripId
            ? "Update Trip"
            : "Save Trip"}
        </button>

      </div>

    </div>
  </div>
)}

    </div>
    
  );
}
async function loadAllRestaurants() {

  const pageSize = 1000;
  let allRestaurants: any[] = [];

  let from = 0;

  while (true) {

    const {
      data,
      error
    } = await supabase
      .from("restaurant")
      .select("*")
      .range(
        from,
        from + pageSize - 1
      );


    if (error) {
      console.error(error);
      break;
    }


    console.log(
      "restaurant page:",
      from,
      data.length
    );


    if (data.length === 0) {
      break;
    }


    allRestaurants.push(...data);


    if (data.length < pageSize) {
      break;
    }


    from += pageSize;

  }


  console.log(
    "TOTAL RESTAURANTS",
    allRestaurants.length
  );


  return allRestaurants;

}

function SmoothRecommendationImage({
  images,
  fallback,
  index,
  alt,
  onImageError,
}: {
  images?: string[];
  fallback?: string | null;
  index: number;
  alt?: string;
  onImageError?: () => void;
}) {
  const sources = useMemo(
    () =>
      (Array.isArray(images) ? images : [])
        .filter(
          (src): src is string =>
            typeof src === "string" &&
            src.length > 0
        ),
    [images]
  );

  const requestedSrc =
    sources[index] ||
    fallback ||
    "";

  const [displayedSrc, setDisplayedSrc] =
    useState(requestedSrc);

  useEffect(() => {
    if (!requestedSrc) {
      setDisplayedSrc("");
      return;
    }

    if (requestedSrc === displayedSrc) {
      return;
    }

    let active = true;
    const image = new Image();

    image.onload = async () => {
      try {
        if ("decode" in image) {
          await image.decode();
        }
      } catch {
        // Browser may already have decoded it.
      }

      if (active) {
        setDisplayedSrc(requestedSrc);
      }
    };

    image.onerror = () => {
      if (active) {
        onImageError?.();
      }
    };

    image.src = requestedSrc;

    return () => {
      active = false;
    };
  }, [
    requestedSrc,
    displayedSrc,
    onImageError
  ]);

  // Preload รูปก่อนหน้าและรูปถัดไป
  useEffect(() => {
    if (sources.length <= 1) {
      return;
    }

    const next =
      sources[
        (index + 1) % sources.length
      ];

    const previous =
      sources[
        (
          index -
          1 +
          sources.length
        ) % sources.length
      ];

    [next, previous]
      .filter(Boolean)
      .forEach((src) => {
        const image = new Image();
        image.src = src;
      });
  }, [sources, index]);

  if (!displayedSrc) {
    return (
      <div className="
        absolute
        inset-0
        bg-gray-200
      " />
    );
  }

  return (
    <img
      src={displayedSrc}
      alt={alt || ""}
      draggable={false}
      className="
        absolute
        inset-0
        h-full
        w-full
        object-cover
        select-none
        transition-opacity
        duration-200
        [backface-visibility:hidden]
        [transform:translateZ(0)]
        [will-change:opacity]
      "
    />
  );
}

function RecommendationCarouselCard({
  images,
  className,
  children,
}: {
  images?: string[];
  className?: string;
  children: (state: {
    index: number;
    changeImage: (
      direction: "next" | "prev"
    ) => void;
    handleImageError: () => void;
  }) => React.ReactNode;
}) {
  const safeImages = useMemo(
    () =>
      (Array.isArray(images) ? images : [])
        .filter(
          (src): src is string =>
            typeof src === "string" &&
            src.length > 0
        ),
    [images]
  );

  const [index, setIndex] = useState(0);
  const swipeProps = useImageSwipe();

  useEffect(() => {
    if (
      safeImages.length > 0 &&
      index >= safeImages.length
    ) {
      setIndex(0);
    }
  }, [
    safeImages.length,
    index
  ]);

  const changeImage = (
    direction: "next" | "prev"
  ) => {
    if (safeImages.length <= 1) {
      return;
    }

    setIndex(current => {
      if (direction === "next") {
        return (
          (current + 1) %
          safeImages.length
        );
      }

      return (
        current -
        1 +
        safeImages.length
      ) % safeImages.length;
    });
  };

  const handleImageError = () => {
    if (safeImages.length <= 1) {
      return;
    }

    setIndex(current =>
      (current + 1) %
      safeImages.length
    );
  };

  return (
    <div
      {...swipeProps(
        changeImage,
        safeImages.length > 1
      )}
      className={className}
    >
      {children({
        index,
        changeImage,
        handleImageError,
      })}
    </div>
  );
}

function Home() {
  const {
    user,
    preferences,
    recommend,
    allPlaces,
    explorePlaces,
    allRecommend,
    setUser,
    setPreferences,
    setRecommend,
    setAllPlaces,
    setExplorePlaces,
    setAllRecommend
  } = useTravelStore();

  const [inspire, setInspire] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<"gemini" | "gpt" | "claude">("gemini");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [hasChatStarted, setHasChatStarted] = useState(false);
  const [tripPlaces, setTripPlaces] = useState<any[]>([]);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(true);
  const [recommendError, setRecommendError] = useState<string | null>(null);
  const [recommendAttempt, setRecommendAttempt] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedTravelType, setSelectedTravelType] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string[]>([]);
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string[]>([]);
  const [selectedCompanion, setSelectedCompanion] = useState<string[]>([]);
  const skeletonCards = Array.from({ length: 6 });
  const [visibleCount, setVisibleCount] = useState(20);
  const [isFiltering, setIsFiltering] = useState(false);
  const [recommendOrder, setRecommendOrder] = useState<Record<string, number>>({});
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [tripModal, setTripModal] = useState(false);
  const [placeToAddTrip, setPlaceToAddTrip] = useState<any | null>(null);
  const [waitingPlanConfirm, setWaitingPlanConfirm] = useState(false);
  const [collectingTrip, setCollectingTrip] = useState(false);
  const [plannerJson, setPlannerJson] = useState<any[]>([]);
  const [tripEditConstraints, setTripEditConstraints] = useState<{
    rejectedPlaceIds: string[];
    excludeKeywords: string[];
  }>({
    rejectedPlaceIds: [],
    excludeKeywords: []
  });
  const [activeStep, setActiveStep] =
    useState<
      "where" |
      "days" |
      "who" |
      "preference" |
      "budget"
    >("where");
type TripInput = {
  province: string;
  days: number | null;
  companion: string;
  budget: number | null;
  travelType: string[];
  activities: string[];
  atmosphere: string[];
};
const [tripInput, setTripInput] = useState<TripInput>({
  province: "",
  days: null,
  companion: "",
  budget: null,

  travelType: [],
  activities: [],
  atmosphere: []
});
  const [mapCenter, setMapCenter] = useState({
    lat: 13.7563,
    lng: 100.5018
  });
  const [restaurants, setRestaurants] = useState([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [searchProvince, setSearchProvince] = useState("");
  const [showTripPlan, setShowTripPlan] = useState(false);
  const hasFilter =
    searchText ||
    selectedRegion ||
    selectedTravelType.length > 0 ||
    selectedActivity.length > 0 ||
    selectedAtmosphere.length > 0 ||
    selectedBudget.length > 0 ||
    selectedCompanion.length > 0;

    const loadUserTripPreference = async () => {

  if (!user?.id) return;


  const {
    data,
    error
  } = await supabase
    .from("user_preferences")
    .select(`
      travel_type,
      activities,
      atmosphere
    `)
    .eq(
      "profile_id",
      user.id
    )
    .single();


  if (error) {

    console.error(
      "Load user preference error:",
      error
    );

    return;

  }


  setTripInput(prev => ({
    ...prev,

    travelType:
      data.travel_type || [],

    activities:
      data.activities || [],

    atmosphere:
      data.atmosphere
        ? [data.atmosphere]
        : []

  }));


};
useEffect(() => {

  loadUserTripPreference();

}, [user]);
const aiModels = [
  {
    id: "gemini" as const,
    name: "AI 1",
    icon: ai1Icon,
    description: "Model 1",
  },
  {
    id: "gpt" as const,
    name: "AI 2",
    icon: ai2Icon,
    description: "Model 2",
  },
  {
    id: "claude" as const,
    name: "AI 3",
    icon: ai3Icon,
    description: "Model 3",
  },
];

  const loadChatMessages = async (chatId: string) => {

    console.log("LOAD CHAT:", chatId);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq(
        "session_id",
        chatId
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


    if (error) {
      console.error(error);
      return;
    }
    console.log(data);
console.log(data?.[0]);
console.log(data?.[0]?.planner_json);


    setCurrentChatId(chatId);
    const { data: session } = await supabase
  .from("chat_sessions")
  .select("trip_preferences, ai_model")
  .eq("id", chatId)
  .single();

if (session?.trip_preferences) {
  setTripInput(session.trip_preferences);
}

// โหลด AI model ของ chat นี้
if (
  session?.ai_model === "gemini" ||
  session?.ai_model === "gpt" ||
  session?.ai_model === "claude"
) {
  setSelectedModel(session.ai_model);
}

if (session?.trip_preferences) {
  setTripInput(session.trip_preferences);
}

const formatted = data.map((m) => ({
  role: m.role,
  text: m.content
}));

setMessages(formatted);

// สร้าง history ของสถานที่ที่ถูกเปลี่ยนออกจาก planner เวอร์ชันก่อนหน้า
const plannerHistory = data
  .filter(
    (m) =>
      m.role === "ai" &&
      m.planner_json != null
  )
  .map(m =>
    typeof m.planner_json === "string"
      ? JSON.parse(m.planner_json)
      : m.planner_json
  )
  .filter(Array.isArray);

const latestPlannerHistory =
  plannerHistory.at(-1) ?? [];

const latestIds = new Set(
  latestPlannerHistory
    .map((item: any) => item?.place_id)
    .filter(Boolean)
    .map(String)
);

const rejectedFromHistory = [
  ...new Set(
    plannerHistory
      .slice(0, -1)
      .flatMap((plan: any[]) =>
        plan
          .map(item => item?.place_id)
          .filter(Boolean)
          .map(String)
      )
      .filter(id => !latestIds.has(id))
  )
];

const excludeKeywordsFromHistory = [
  ...new Set(
    data
      .filter((m) => m.role === "user")
      .flatMap((m) => {
        const text = String(m.content ?? "").toLowerCase();

        const knownKeywords = [
          "อุทยาน",
          "วัด",
          "คาเฟ่",
          "น้ำตก",
          "ทะเล",
          "ภูเขา",
          "พิพิธภัณฑ์",
          "ตลาด",
          "ธรรมชาติ",
          "เมือง"
        ];

        const isReject =
          text.includes("ไม่เอา") ||
          text.includes("ไม่อยากไป") ||
          text.includes("ไม่ชอบ") ||
          text.includes("ตัด") ||
          text.includes("เอาออก");

        return isReject
          ? knownKeywords.filter(keyword =>
              text.includes(keyword)
            )
          : [];
      })
  )
];

setTripEditConstraints({
  rejectedPlaceIds: rejectedFromHistory,
  excludeKeywords: excludeKeywordsFromHistory
});
// ===============================
// โหลด planner_json
// ===============================

const planner = data
  .filter(
    (m) =>
      m.role === "ai" &&
      m.planner_json != null
  )
  .at(-1);

console.log("🔎 PLANNER MESSAGE:", planner);

if (planner?.planner_json) {

  const json =
    typeof planner.planner_json === "string"
      ? JSON.parse(planner.planner_json)
      : planner.planner_json;

  console.log("🗺️ LOADED PLANNER:", json);
  console.log("IS ARRAY:", Array.isArray(json));
  console.log("LENGTH:", Array.isArray(json) ? json.length : 0);

  setPlannerJson(json);

  // มี planner_json = แสดง TripPlanPanel
  if (Array.isArray(json) && json.length > 0) {
    setShowTripPlan(true);
  } else {
    setShowTripPlan(false);
  }

} else {

  console.log("❌ NO PLANNER JSON");

  setPlannerJson([]);
  setPlan(null);
  setShowTripPlan(false);
}


    setHasChatStarted(true);

  };

  const filteredPlaces = (
    hasFilter
      ? allPlaces
      : explorePlaces
  )
    .filter((place) => {

      const matchSearch =
        place.name_th
          ?.toLowerCase()
          .includes(searchText.toLowerCase());


      const matchRegion =
        selectedRegion
          ? place.region === selectedRegion
          : true;



      // ในกลุ่มเดียวกัน OR
      const matchTravelType =
        selectedTravelType.length > 0
          ? selectedTravelType.some(
            v => place.travel_type?.includes(v)
          )
          : true;



      const matchActivity =
        selectedActivity.length > 0
          ? selectedActivity.some(
            v => place.activities?.includes(v)
          )
          : true;



      const matchAtmosphere =
        selectedAtmosphere.length > 0
          ? selectedAtmosphere.some(
            v => place.atmosphere?.includes(v)
          )
          : true;


      const matchBudget =
        selectedBudget.length > 0
          ? selectedBudget.some(
            v => place.budget?.includes(v)
          )
          : true;


      const matchCompanion =
        selectedCompanion.length > 0
          ? selectedCompanion.some(
            v => place.travel_companion?.includes(v)
          )
          : true;



      // ข้ามกลุ่มเป็น AND
      return (
        matchSearch &&
        matchRegion &&
        matchTravelType &&
        matchActivity &&
        matchAtmosphere &&
        matchBudget &&
        matchCompanion
      );


    })
    .sort((a, b) => {

      const aRank =
        recommendOrder[a.att_id] ?? 99999;

      const bRank =
        recommendOrder[b.att_id] ?? 99999;


      return aRank - bRank;

    });


  const toggleFilter = (
    value: string,
    setter: any,
    current: string[]
  ) => {

    setVisibleCount(20);

    if (current.includes(value)) {
      setter(
        current.filter(v => v !== value)
      );
    } else {
      setter([
        ...current,
        value
      ]);
    }

  };
  const FilterChip = ({
    value,
    selected,
    onClick,
  }: {
    value: string;
    selected: boolean;
    onClick: () => void;
  }) => {

    return (
      <button
        onClick={onClick}
        className={`
        px-3
        py-1.5
        rounded-full
        text-sm
        border
        transition-all
        duration-200
        ${selected
            ?
            "bg-black text-white border-black shadow-sm"
            :
            "bg-white hover:bg-gray-100 border-gray-200"
          }
      `}
      >
        {value}
      </button>
    );
  };

  const FilterButton = ({
    label,
    icon: Icon,
    active,
    onClick,
  }: any) => {

    return (
      <button
        onClick={onClick}
        className={`
flex
items-center
gap-2
px-3
py-2
rounded-xl
text-sm
border
transition-all
duration-200
${active
            ?
            "bg-black text-white border-black shadow-md scale-[1.02]"
            :
            "bg-white hover:bg-gray-100 border-gray-200"
          }
`}
      >

        {Icon && <Icon size={15} />}

        <span>{label}</span>

      </button>
    )

  }

  const provinces = [
    ...new Set(
      allPlaces
        .map((p) => p.province)
        .filter(Boolean)
    ),
  ].sort();


  const filteredProvinces = provinces.filter((province) =>
    province
      .toLowerCase()
      .includes(tripInput.province.toLowerCase())
  );



  const loadExplorePlaces = () => {

    setExploreLoading(true);

    setExplorePlaces(recommend);

    setExploreLoading(false);

  };
  const handleExplore =
  async () => {

    setVisibleCount(
      20
    );


    setExploreLoading(
      true
    );


    try {

      // =====================================================
      // เปิด Explore ถึงค่อยโหลด attraction ทั้งหมด
      // =====================================================

      if (
        allPlaces.length === 0
      ) {

        console.log(
          "📦 LOAD ALL PLACES FOR EXPLORE"
        );


        const places =
          await loadAllPlaces();


        setAllPlaces(
          places
        );

      }


      // Recommendation 50 ตัว
      setExplorePlaces(
        allRecommend
      );


      setExploreOpen(
        true
      );


    } catch (error) {

      console.error(
        "❌ LOAD EXPLORE ERROR:",
        error
      );


    } finally {

      setExploreLoading(
        false
      );

    }

  };
  const checkTripInput = () => {
  return true;
};

  const handleNewChat = () => {
  setMessages([]);
  setInput("");

  setCurrentChatId(null);
  setHasChatStarted(false);

  setPlan(null);
  setPlannerJson([]);
  setTripEditConstraints({
    rejectedPlaceIds: [],
    excludeKeywords: []
  });
  setShowTripPlan(false);

  setWaitingPlanConfirm(false);

  setExploreOpen(false);

  // reset planner panel
  setTripPlaces([]);

  // ถ้าต้องการเริ่มทริปใหม่ด้วย
  setTripInput({
    province: "",
    days: null,
    companion: "",
    budget: null,
    travelType: [],
    activities: [],
    atmosphere: [],
  });

  setMapCenter({
    lat: 13.7563,
    lng: 100.5018,
  });
};

const ensureChatSession = async (): Promise<string | null> => {
  // มี session อยู่แล้ว
  if (currentChatId) {
    return currentChatId;
  }

  if (!user?.id) {
    console.error("❌ ไม่มี user.id");
    return null;
  }

  const title = [
  tripInput.province && tripInput.province,
  tripInput.days && `${tripInput.days} วัน`,
  tripInput.companion && `กับ${tripInput.companion}`,
  tripInput.budget && `งบ ${tripInput.budget.toLocaleString()} บาท`,
]
  .filter(Boolean)
  .join(" ");

  console.log("🔥 CREATE CHAT SESSION");
  console.log({
    user_id: user.id,
    title,
    trip_preferences: tripInput,
    ai_model: selectedModel,
  });

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: user.id,
      title,
      trip_preferences: tripInput,
      ai_model: selectedModel,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ CREATE CHAT SESSION ERROR:", error);
    return null;
  }

  console.log("✅ CHAT SESSION CREATED:", data);

  setCurrentChatId(data.id);

  setChatSessions(prev => [
    data,
    ...prev,
  ]);

  return data.id;
};
const handleTripComplete = async () => {
  const chatId = await ensureChatSession();

  if (!chatId) {
    setMessages(prev => [
      ...prev,
      {
        role: "ai",
        text: "ไม่สามารถสร้างแชตได้ กรุณาลองใหม่อีกครั้ง"
      }
    ]);

    return;
  }

  setMessages(prev => [
    ...prev,
    {
      role: "ai",
      text: "ได้เลยครับ ✨ ต้องการให้ผมจัดแพลนจากข้อมูลที่มีตอนนี้เลยไหม?"
    }
  ]);

  setWaitingPlanConfirm(true);
};
const handleSend = async () => {
  if (!input.trim()) return;

  const text = input.trim();
  setInput("");

  // =====================================
  // 1. สร้าง / หา chat session ก่อน
  // =====================================
  let chatId = currentChatId;

  if (!chatId) {
    chatId = await ensureChatSession();

    if (!chatId) {
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: "ไม่สามารถสร้างแชตได้ กรุณาลองใหม่อีกครั้ง"
        }
      ]);
      return;
    }
  }

  setHasChatStarted(true);

  // =====================================
  // 2. ถ้ากำลังรอยืนยันสร้าง Planner
  // ต้องเช็กก่อน detectTripIntent
  // =====================================
  if (waitingPlanConfirm) {
    setMessages(prev => [
      ...prev,
      { role: "user", text }
    ]);

    await supabase
      .from("chat_messages")
      .insert({
        session_id: chatId,
        user_id: user.id,
        role: "user",
        content: text
      });

    // ให้ AI วิเคราะห์คำตอบ เช่น
    // "โอเค" → CREATE_PLAN
    // "ไม่เอา" → CANCEL
    // "ขอ 3 วัน" → UPDATE
    const decision =
      await detectPlannerDecision(text);

    console.log(
      "🧠 PLANNER DECISION:",
      decision
    );

    if (decision === "CREATE_PLAN") {
      setWaitingPlanConfirm(false);
      setCollectingTrip(false);

      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: "⏳ กำลังสร้างแผนเที่ยว...",
          loading: true
        }
      ]);

      try {
        const tripForPlanner = {
          ...tripInput,
          days: tripInput.days ?? 1
        };

        console.log(
          "🧳 TRIP FOR PLANNER:",
          tripForPlanner
        );

        const result = await createPlanner(
          tripForPlanner,
          chatId,
          user.id,
          selectedModel
        );

        setTripInput(tripForPlanner);
        setPlan(result.markdown);
        setPlannerJson(result.planner_json);
        setShowTripPlan(true);
        setExploreOpen(false);

        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: "ai",
            text: result.markdown
          }
        ]);
      } catch (err) {
        console.error(
          "❌ CREATE PLANNER ERROR:",
          err
        );

        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: "ai",
            text:
              "ขออภัย ขณะนี้ไม่สามารถสร้างแผนเที่ยวได้ กรุณาลองใหม่อีกครั้ง"
          }
        ]);
      }

      return;
    }

    if (decision === "CANCEL") {
      setWaitingPlanConfirm(false);
      setCollectingTrip(false);

      const reply =
        "ได้เลยครับ 😊 ถ้าต้องการวางแผนเที่ยวเมื่อไหร่ บอกผมได้เลย";

      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: reply
        }
      ]);

      await supabase
        .from("chat_messages")
        .insert({
          session_id: chatId,
          user_id: user.id,
          role: "ai",
          content: reply
        });

      return;
    }

    // ถ้าผู้ใช้แก้ข้อมูล เช่น "ขอ 3 วัน"
    // ให้ข้อความไหลลงไป detectTripIntent ด้านล่าง
    if (decision === "UPDATE") {
      setWaitingPlanConfirm(false);
      setCollectingTrip(true);

      console.log(
        "✏️ USER IS UPDATING TRIP"
      );
    }

    // ถ้า AI ยังสรุปไม่ได้ ให้ selected AI คุยต่อเอง
    // ไม่ถามประโยคยืนยันเดิมซ้ำ
    if (decision === "UNCLEAR") {
      setWaitingPlanConfirm(false);

      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: "กำลังคิด...",
          loading: true
        }
      ]);

      try {
        const aiText =
          await generalChatWithAI(
            text,
            messages,
            selectedModel
          );

        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: "ai",
            text: aiText
          }
        ]);

        await supabase
          .from("chat_messages")
          .insert({
            session_id: chatId,
            user_id: user.id,
            role: "ai",
            content: aiText
          });
      } catch (error) {
        console.error(
          "❌ GENERAL CHAT ERROR:",
          error
        );

        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: "ai",
            text:
              "ขออภัยครับ ลองส่งข้อความอีกครั้งได้เลย"
          }
        ]);
      }

      return;
    }
  }

  // =====================================
  // 3. ถ้ามี Planner อยู่แล้ว ให้ตรวจคำสั่งแก้ทริปก่อน
  // เช่น "ไม่เอาอุทยาน", "วันที่ 2 บ่ายขอคาเฟ่แทน"
  // =====================================
  if (
    Array.isArray(plannerJson) &&
    plannerJson.length > 0
  ) {
    try {
      const editIntent =
        await detectTripPlanEdit(
          text,
          plannerJson,
          selectedModel
        );

      console.log(
        "🛠️ TRIP PLAN EDIT INTENT:",
        editIntent
      );

      if (editIntent.isEdit) {
        setMessages(prev => [
          ...prev,
          { role: "user", text },
          {
            role: "ai",
            text: "กำลังปรับทริป...",
            loading: true
          }
        ]);

        await supabase
          .from("chat_messages")
          .insert({
            session_id: chatId,
            user_id: user.id,
            role: "user",
            content: text
          });

        try {
          const editResult =
            await applyTripPlanEdit({
              plannerJson,
              intent: editIntent,
              tripInput,
              userId: user.id,
              constraints:
                tripEditConstraints
            });

          setPlannerJson(
            editResult.plannerJson
          );
          setTripEditConstraints(
            editResult.constraints
          );
          setShowTripPlan(true);
          setExploreOpen(false);

          setMessages(prev => [
            ...prev.slice(0, -1),
            {
              role: "ai",
              text: editResult.reply
            }
          ]);

          const {
            error: saveEditError
          } = await supabase
            .from("chat_messages")
            .insert({
              session_id: chatId,
              user_id: user.id,
              role: "ai",
              content: editResult.reply,
              planner_json:
                editResult.plannerJson
            });

          if (saveEditError) {
            console.error(
              "❌ SAVE EDITED PLANNER ERROR:",
              saveEditError
            );
          }

          return;
        } catch (editError) {
          console.error(
            "❌ APPLY TRIP EDIT ERROR:",
            editError
          );

          const fallbackReply =
            "ยังหาสถานที่ทดแทนที่ตรงเงื่อนไขไม่ได้ครับ ลองระบุให้เจาะจงขึ้น เช่น **วันที่ 2 ช่วงบ่ายขอคาเฟ่แทน**";

          setMessages(prev => [
            ...prev.slice(0, -1),
            {
              role: "ai",
              text: fallbackReply
            }
          ]);

          await supabase
            .from("chat_messages")
            .insert({
              session_id: chatId,
              user_id: user.id,
              role: "ai",
              content: fallbackReply
            });

          return;
        }
      }
    } catch (editIntentError) {
      console.error(
        "❌ DETECT TRIP EDIT ERROR:",
        editIntentError
      );
      // ถ้าตรวจ intent แก้ทริปล้มเหลว
      // ให้ไหลต่อไปยัง flow เดิม
    }
  }

  // =====================================
  // 4. ตรวจว่าเป็นคำขอสร้างทริปหรือไม่
  // ถ้าก่อนหน้านี้ถามจังหวัดอยู่ collectingTrip จะทำให้
  // คำตอบสั้น ๆ เช่น "เชียงใหม่" ยังอยู่ใน flow สร้างทริป
  // =====================================
  const intent = await detectTripIntent(
    text,
    selectedModel
  );

  console.log("🧠 TRIP INTENT:", intent);

  if (intent.wantsTrip || collectingTrip) {
    const detected = intent.tripInfo;

    const detectedAtmosphere = detected.atmosphere
      ? Array.isArray(detected.atmosphere)
        ? detected.atmosphere
        : [detected.atmosphere]
      : [];

    const updatedTrip: TripInput = {
      ...tripInput,

      province:
        detected.province ??
        tripInput.province ??
        "",

      days:
        detected.days ??
        tripInput.days ??
        null,

      budget:
        detected.budget ??
        tripInput.budget ??
        null,

      companion:
        detected.companion ??
        tripInput.companion ??
        "",

      travelType:
        detected.travelType?.length
          ? detected.travelType
          : tripInput.travelType ?? [],

      activities:
        detected.activities?.length
          ? detected.activities
          : tripInput.activities ?? [],

      atmosphere:
        detectedAtmosphere.length
          ? detectedAtmosphere
          : tripInput.atmosphere ?? []
    };

    console.log("🧳 UPDATED TRIP:", updatedTrip);
    setTripInput(updatedTrip);

    setMessages(prev => [
      ...prev,
      { role: "user", text }
    ]);

    await supabase
      .from("chat_messages")
      .insert({
        session_id: chatId,
        user_id: user.id,
        role: "user",
        content: text
      });

    // จังหวัดเป็นข้อมูลเดียวที่จำเป็นสำหรับ query สถานที่
    if (!updatedTrip.province) {
      setCollectingTrip(true);

      const reply = "ได้เลยครับ ✨ อยากให้ผมจัดทริปไปจังหวัดไหน?";

      setMessages(prev => [
        ...prev,
        { role: "ai", text: reply }
      ]);

      await supabase
        .from("chat_messages")
        .insert({
          session_id: chatId,
          user_id: user.id,
          role: "ai",
          content: reply
        });

      return;
    }

    // มีจังหวัดแล้ว ไม่เปิด Modal และไม่บังคับข้อมูลอื่นให้ครบ
    setCollectingTrip(false);
    setWaitingPlanConfirm(true);

    const detailParts = [
      updatedTrip.days
        ? `${updatedTrip.days} วัน`
        : null,
      updatedTrip.companion
        ? `ไปกับ${updatedTrip.companion}`
        : null,
      updatedTrip.budget
        ? `งบประมาณ ${Number(updatedTrip.budget).toLocaleString()} บาท`
        : null
    ].filter(Boolean);

    const detailText = detailParts.length
      ? ` (${detailParts.join(", ")})`
      : "";

    const reply =
      `ได้เลยครับ ✨ ผมสามารถจัดทริป${updatedTrip.province}${detailText} ` +
      `จากข้อมูลที่มีตอนนี้ได้เลย\n\nต้องการให้ผมจัดแพลนเลยไหม?`;

    setMessages(prev => [
      ...prev,
      { role: "ai", text: reply }
    ]);

    await supabase
      .from("chat_messages")
      .insert({
        session_id: chatId,
        user_id: user.id,
        role: "ai",
        content: reply
      });

    return;
  }

  // =====================================
  // 4. ข้อความทั่วไป → General AI Chat
  // =====================================
  const previousMessages = messages;

  const userMessage = {
    role: "user",
    text
  };

  setMessages(prev => [
    ...prev,
    userMessage
  ]);

  await supabase
    .from("chat_messages")
    .insert({
      session_id: chatId,
      user_id: user.id,
      role: "user",
      content: text
    });

  setMessages(prev => [
    ...prev,
    {
      role: "ai",
      text: "กำลังคิด...",
      loading: true
    }
  ]);

  try {
    const aiText = await generalChatWithAI(
      text,
      previousMessages,
      selectedModel
    );

    console.log("🤖 GENERAL AI RESPONSE:", aiText);

    setMessages(prev => [
      ...prev.slice(0, -1),
      {
        role: "ai",
        text: aiText
      }
    ]);

    await supabase
      .from("chat_messages")
      .insert({
        session_id: chatId,
        user_id: user.id,
        role: "ai",
        content: aiText
      });
  } catch (error) {
    console.error(
      "❌ GENERAL CHAT AI ERROR:",
      error
    );

    setMessages(prev => [
      ...prev.slice(0, -1),
      {
        role: "ai",
        text: "ขออภัย ไม่สามารถติดต่อ AI ได้ กรุณาลองใหม่อีกครั้ง"
      }
    ]);
  }
};


  const handleSave = async (place: any) => {

    const {
      data: userData
    } = await supabase.auth.getUser();


    if (!userData.user) return;



    const isSaved =
      savedIds.includes(place.att_id);



    if (isSaved) {


      await supabase
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



      setSavedIds(
        savedIds.filter(
          id => id !== place.att_id
        )
      );


      return;

    }



    const {
      error
    } = await supabase
      .from("saved_places")
      .insert({

        profile_id: userData.user.id,

        att_id: place.att_id,

        collection: "Want to go"

      });



    if (!error) {

      setSavedIds([
        ...savedIds,
        place.att_id
      ]);

    }


  };

  useEffect(() => {

    async function loadChats() {

      if (!user) return;


      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


      if (!error) {

        setChatSessions(data || []);

      }

    }


    loadChats();


  }, [user]);

  useEffect(() => {

    async function loadSaved() {

      const {
        data: userData
      } = await supabase.auth.getUser();


      if (!userData.user) return;


      const {
        data
      } = await supabase
        .from("saved_places")
        .select("att_id")
        .eq(
          "profile_id",
          userData.user.id
        );


      setSavedIds(
        data?.map(x => x.att_id) || []
      );


    }


    loadSaved();

  }, []);
  useEffect(() => {

  let cancelled = false;


  async function init() {

    try {

      console.log("🚀 HOME INIT");

      setRecommendError(null);


      // =====================================================
      // 1. ถ้ามี Recommend ใน Zustand แล้ว
      //    แสดงทันที ไม่ต้องสนว่า allPlaces โหลดหรือยัง
      // =====================================================

      if (
        recommend.length > 0 &&
        explorePlaces.length > 0
      ) {

        console.log(
          "⚡ USE RECOMMEND FROM STORE"
        );


        setRecommendLoading(false);


        return;

      }


      // =====================================================
      // 2. หน้าเพิ่งเปิดใหม่
      // =====================================================

      setRecommendLoading(true);


      console.time(
        "loadTravelData"
      );


      // ตอนนี้ loadTravelData
      // โหลดแค่ user + preference
      const data =
        await loadTravelData();


      console.timeEnd(
        "loadTravelData"
      );


      if (cancelled) {
        return;
      }


      if (!data) {

        throw new Error(
          "Please sign in again to load recommendations"
        );

      }


      if (!data.preferences) {

        throw new Error(
          "Preferences could not be loaded"
        );

      }


      // =====================================================
      // 3. Set user
      // =====================================================

      setUser(
        data.user
      );


      setPreferences(
        data.preferences
      );


      // ❌ ไม่ทำแล้ว
      //
      // setAllPlaces(data.allPlaces);
      //
      // เพราะ loadTravelData
      // ไม่โหลด attraction แล้ว


      // =====================================================
      // 4. Recommendation
      // =====================================================

      console.time(
        "recommendation"
      );


      const {
        data: recommendData,
        fromCache,
      } =
        await loadRecommendationCache(

          data.user.id,

          data.preferences,

          // ไม่ส่ง allPlaces
          // ให้ cache เช็กก่อน
          undefined,

          // =================================================
          // onReady
          //
          // Recommendation พร้อมเมื่อไหร่
          // แสดงทันที
          // ไม่ต้องรอรูปทั้งหมด
          // =================================================
          (places) => {

            if (cancelled) {
              return;
            }


            console.log(
              "⚡ RECOMMEND READY:",
              places.length
            );


            setRecommend(
              places.slice(
                0,
                6
              )
            );


            setExplorePlaces(
              places
            );


            setAllRecommend(
              places
            );


            // ปิด skeleton ทันที
            setRecommendLoading(
              false
            );

          }

        );


      console.timeEnd(
        "recommendation"
      );


      if (cancelled) {
        return;
      }


      console.log(
        fromCache
          ? "⚡ RECOMMEND CACHE HIT"
          : "🔥 RECOMMEND CACHE MISS"
      );


      // =====================================================
      // 5. Update อีกรอบ
      //    หลังรูปของ 6 ตัวแรกโหลดเสร็จ
      // =====================================================

      setRecommend(
        recommendData.slice(
          0,
          6
        )
      );


      setExplorePlaces(
        recommendData
      );


      setAllRecommend(
        recommendData
      );


      setRecommendLoading(
        false
      );


      console.log(
        "✅ RECOMMEND COMPLETE"
      );


      // =====================================================
      // 6. งานอื่นให้ทำทีหลัง
      //
      // ไม่โหลด allPlaces
      // ไม่โหลด restaurant ทั้งหมดตรงนี้
      // =====================================================


      // Location ไม่เกี่ยวกับ Recommend
      // ให้ทำ background
      getUserLocation()

        .then(
          async (location) => {

            if (cancelled) {
              return;
            }


            try {

              await supabase

                .from(
                  "user_locations"
                )

                .upsert(
                  {

                    user_id:
                      data.user.id,

                    latitude:
                      location.latitude,

                    longitude:
                      location.longitude,

                    updated_at:
                      new Date(),

                  },

                  {
                    onConflict:
                      "user_id"
                  }

                );


              console.log(
                "📍 SAVED LOCATION:",
                location
              );


            } catch (error) {

              console.warn(
                "LOCATION SAVE ERROR:",
                error
              );

            }

          }

        )

        .catch(
          error => {

            console.warn(
              "LOCATION ERROR:",
              error
            );

          }
        );


    } catch (error) {

      console.error(
        "❌ LOAD HOME ERROR:",
        error
      );


      if (!cancelled) {

        setRecommendError(
          "โหลดสถานที่แนะนำไม่สำเร็จ กรุณาลองอีกครั้ง"
        );


        setRecommendLoading(
          false
        );

      }

    }

  }


  init();


  return () => {

    cancelled = true;

  };


}, [recommendAttempt]);


  return (
    <div className="travel-home flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar
        user={user}
        chatSessions={chatSessions}
        onSelectChat={loadChatMessages}
        onNewChat={handleNewChat}
      />
      {
        tripModal && (

          <div
            className="
fixed
inset-0
z-[100]
bg-black/40
backdrop-blur-md
flex
items-center
justify-center
"
            onClick={() => setTripModal(false)}
          >


            <div
              onClick={(e) => e.stopPropagation()}
              className="
w-[520px]
max-w-[calc(100vw-2rem)]
max-h-[calc(100dvh-2rem)]
overflow-y-auto
min-h-[260px]
bg-white
rounded-3xl
shadow-2xl
p-6
"
            >





              {/* Header */}

              <div
                className="
relative
flex
items-center
justify-center
mb-8
"
              >

                <button
                  onClick={() => setTripModal(false)}
                  className="
absolute
left-0
text-2xl
"
                >
                  ×
                </button>


                <h1 className="
font-semibold
text-xl
">
                  {activeStep === "where" && "Where"}

                  {activeStep === "days" && "Days"}

                  {activeStep === "who" && "Who"}

                  {activeStep === "budget" && "Budget"}

                </h1>


              </div>


              {
                activeStep === "where" &&
                <WherePicker
                  tripInput={tripInput}
                  setTripInput={setTripInput}
                  filteredProvinces={filteredProvinces}
                  setActiveStep={setActiveStep}
                  showProvinceDropdown={showProvinceDropdown}
                  setShowProvinceDropdown={setShowProvinceDropdown}
                />

              }


              {
                activeStep === "days" &&
                <DaysPicker
                  tripInput={tripInput}
                  setTripInput={setTripInput}
                  setActiveStep={setActiveStep}
                />
              }


              {
                activeStep === "who" &&
                <WhoPicker
                  tripInput={tripInput}
                  setTripInput={setTripInput}
                  setActiveStep={setActiveStep}
                />
              }


              {
                activeStep === "budget" &&
                <BudgetPicker
                  tripInput={tripInput}
                  setTripInput={setTripInput}
                  setTripModal={setTripModal}
                  onComplete={handleTripComplete}

                />
              }

              {
                activeStep === "preference" &&
                <PreferencePicker
                  tripInput={tripInput}
                  setTripInput={setTripInput}
                  setActiveStep={setActiveStep}
                />
              }


            </div>

          </div>




        )
      }


      <AddPlaceToTripModal
        open={!!placeToAddTrip}
        place={placeToAddTrip}
        onClose={() =>
          setPlaceToAddTrip(null)
        }
      />

            {/* Center */}
      <main
        className={`
    travel-main
    flex-1
    flex
    flex-col
    min-w-0
    transition-all
    duration-300
    pr-[600px]
  `}
      >
        {exploreOpen && (
          <div
            className="
      fixed
      inset-0
      z-40
      bg-black/20
      backdrop-blur-sm
    "
            onClick={() => setExploreOpen(false)}
          />
        )}
        <header className="travel-header travel-chat-header flex items-center px-6">
          <h1>Your trip</h1>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-6 text-sm">
              <button
  onClick={() => {
    setActiveStep("where");
    setTripModal(true);
  }}
  className="transition-colors hover:text-purple-600"
>
  Where
  <br />
  <span className="text-xs text-gray-400">
    {tripInput.province || "Add location"}
  </span>
</button>

<button
  onClick={() => {
    setActiveStep("days");
    setTripModal(true);
  }}
  className="transition-colors hover:text-purple-600"
>
  Days
  <br />
  <span className="text-xs text-gray-400">
    {tripInput.days
      ? `${tripInput.days} วัน`
      : "Add dates"}
  </span>
</button>

<button
  onClick={() => {
    setActiveStep("who");
    setTripModal(true);
  }}
  className="transition-colors hover:text-purple-600"
>
  Who
  <br />
  <span className="text-xs text-gray-400">
    {tripInput.companion || "Add people"}
  </span>
</button>

<button
  onClick={() => {
    setActiveStep("budget");
    setTripModal(true);
  }}
  className="transition-colors hover:text-purple-600"
>
  Budget
  <br />
  <span className="text-xs text-gray-400">
    {tripInput.budget
      ? `${tripInput.budget.toLocaleString()} บาท`
      : "Add budget"}
  </span>
</button>


            </div>
          </div>
        </header>

        <div className="flex-1 px-6 overflow-y-auto">
          <div className="
max-w-3xl
mx-auto
w-full
space-y-8
mt-8
">

            {messages.map((m, i) => (

              <div
                key={i}
                className={`
flex
${m.role === "user"
                    ?
                    "justify-end gap-4"
                    :
                    "justify-start gap-0 sm:gap-4"
                  }
`}
              >


                {/* AI Avatar */}

                {m.role === "ai" && (
  <div
    className="
      hidden
      sm:flex
      w-9
      h-9
      rounded-full
      bg-white
      border
      items-center
      justify-center
      shrink-0
      overflow-hidden
    "
  >
    <img
      src={
        aiModels.find(
          model => model.id === selectedModel
        )?.icon
      }
      alt={selectedModel}
      className="w-7 h-7 object-contain"
    />
  </div>
)}



                <div
                  className={`
min-w-0
max-w-2xl
text-[15px]
leading-7

${m.role === "user"

                      ?

                      "bg-gray-100 px-5 py-3 rounded-3xl"

                      :

                      "w-full"

                    }

`}
                >
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    h1: ({ children }) => (
      <h1 className="
        text-2xl
        font-bold
        mt-8
        mb-4
      ">
        {children}
      </h1>
    ),

    h2: ({ children }) => (
      <h2 className="
        text-xl
        font-bold
        mt-6
        mb-3
      ">
        {children}
      </h2>
    ),

    p: ({ children }) => (
      <p className="
        leading-7
        mb-3
      ">
        {children}
      </p>
    ),

    li: ({ children }) => (
      <li className="ml-5 list-disc">
        {children}
      </li>
    ),

    // =========================
    // TABLE
    // =========================

    table: ({ children }) => (
      <div className="
        w-full
        overflow-x-auto
        my-5
        rounded-xl
        border
        border-gray-200
      ">
        <table className="
          min-w-[700px]
          w-full
          border-collapse
          text-sm
        ">
          {children}
        </table>
      </div>
    ),

    thead: ({ children }) => (
      <thead className="
        bg-gray-50
        border-b
        border-gray-200
      ">
        {children}
      </thead>
    ),

    tbody: ({ children }) => (
      <tbody>
        {children}
      </tbody>
    ),

    tr: ({ children }) => (
      <tr className="
        border-b
        border-gray-100
        last:border-b-0
        hover:bg-gray-50
      ">
        {children}
      </tr>
    ),

    th: ({ children }) => (
      <th className="
        px-4
        py-3
        text-left
        font-semibold
        whitespace-nowrap
        align-middle
      ">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="
        px-4
        py-3
        align-top
        leading-6
        whitespace-normal
      ">
        {children}
      </td>
    )
  }}
>
  {
    typeof m.text === "string"
      ? m.text
      : m.text?.markdown ?? ""
  }
</ReactMarkdown>



                  {
                    m.role === "ai" && (

                      <div
                        className="
flex
gap-2
mt-4
"
                      >


                        <button
                          className="
p-2
rounded-full
hover:bg-gray-100
"
                        >
                          <Copy size={16} />
                        </button>


                        <button
                          className="
p-2
rounded-full
hover:bg-gray-100
"
                        >
                          <ThumbsUp size={16} />
                        </button>


                        <button
                          className="
p-2
rounded-full
hover:bg-gray-100
"
                        >
                          <ThumbsDown size={16} />
                        </button>


                      </div>

                    )

                  }


                </div>


              </div>


            ))}


          </div>

        </div>
{/* Welcome Hero */}
{!hasChatStarted && (
  <div className="travel-hero flex-1 flex flex-col items-center justify-center px-6 pb-24 text-center">
    <div className="mb-6 flex items-center gap-2 rounded-full border border-[#e6e2d8] bg-white/70 px-4 py-2 text-sm text-[#6f776f] shadow-sm backdrop-blur">
      <span>✦</span>
      <span>Personalized travel planning</span>
    </div>

    <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
      Where will your next
      <span className="block text-[#8b5cf6]">
        adventure take you?
      </span>
    </h1>

    <p className="mt-5 max-w-xl text-base leading-8 text-[#6f776f]">
      Hi {user?.user_metadata?.full_name || "there"} 👋
      <br />
      Tell me where you want to go, and I'll help create a trip
      <br className="hidden sm:block" />
      that matches your style, interests, and budget.
    </p>

    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <div className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#654d78] shadow-sm">
        ✦ Personalized
      </div>

      <div className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#654d78] shadow-sm">
        🗺️ Smart itinerary
      </div>

      <div className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#654d78] shadow-sm">
        ♡ Your preferences
      </div>
    </div>
  </div>
)}

        {/* Chat input */}
        <div className="px-6 pb-8">
          <div className="travel-composer max-w-2xl mx-auto border border-border rounded-2xl shadow-sm bg-card relative">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setHasChatStarted(true);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask anything"
              className="w-full px-5 pt-4 pb-2 bg-transparent outline-none text-base"
            />
            <div className="flex items-center justify-between px-3 pb-3">

  {/* LEFT SIDE */}
  <div className="flex items-center gap-2">

    {/* Plus */}
    <button
      className="
        h-8 w-8
        rounded-full
        hover:bg-accent
        flex items-center justify-center
      "
    >
      <Plus className="h-4 w-4" />
    </button>

    {/* AI MODEL SELECTOR */}
    <div className="relative">

      <button
  type="button"
  onClick={() => setShowModelMenu(prev => !prev)}
  className="
    flex
    items-center
    gap-2
    px-3
    h-8
    rounded-full
    border
    border-border
    bg-card
    hover:bg-accent
    transition
    text-xs
    font-medium
  "
>
  {/* AI LOGO */}
  <img
    src={
      aiModels.find(
        model => model.id === selectedModel
      )?.icon
    }
    alt="AI"
    className="w-4 h-4 object-contain"
  />

  {/* ชื่อ AI */}
  <span>
    {aiModels.find(
      model => model.id === selectedModel
    )?.name}
  </span>

  {/* ลูกศร */}
  <span className="text-muted-foreground">
    ▾
  </span>
</button>

{showModelMenu && (
  <div
    className="
      absolute
      bottom-11
      left-0
      w-56
      bg-white
      border
      border-border
      rounded-2xl
      shadow-xl
      p-2
      z-[9999]
      pointer-events-auto
    "
  >

          <div className="px-3 py-2">
            <p className="text-xs font-semibold">
              เลือก AI
            </p>

            <p className="text-[11px] text-muted-foreground">
              เลือกโมเดลสำหรับช่วยวางแผนท่องเที่ยว
            </p>
          </div>


          {aiModels.map((model) => (
            <button
  key={model.id}
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    setSelectedModel(model.id);
    setShowModelMenu(false);
  }}
  className={`
    w-full
    flex
    items-center
    gap-3
    px-3
    py-2.5
    rounded-xl
    text-left
    transition
    cursor-pointer
    relative
    z-[10000]
    ${
      selectedModel === model.id
        ? "bg-accent"
        : "hover:bg-accent/60"
    }
  `}
>

              <div
                className="
                  w-8
                  h-8
                  rounded-lg
                  bg-muted
                  flex
                  items-center
                  justify-center
                  text-sm
                "
              >
                <img
  src={model.icon}
  alt={model.name}
  className="w-5 h-5 object-contain"
/>
              </div>

              <div className="flex-1">

                <div className="text-sm font-medium">
                  {model.name}
                </div>

                <div className="text-[11px] text-muted-foreground">
                  {model.description}
                </div>

              </div>

              {selectedModel === model.id && (
                <span className="text-xs font-bold">
                  ✓
                </span>
              )}

            </button>
          ))}

        </div>
      )}

    </div>

  </div>


  {/* RIGHT SIDE */}
  <div className="flex items-center gap-1">

    {/* Mic */}
    <button
      className="
        h-8
        w-8
        rounded-full
        hover:bg-accent
        flex
        items-center
        justify-center
      "
    >
      <Mic className="h-4 w-4 text-muted-foreground" />
    </button>


    {/* Send */}
    <button
      onClick={handleSend}
      className="
        h-8
        w-8
        rounded-full
        bg-foreground
        text-background
        flex
        items-center
        justify-center
      "
    >
      <ArrowUp className="h-4 w-4" />
    </button>

  </div>

</div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            ⓘ TravelWise can make mistakes. Check important info.
          </p>
        </div>
      </main>

      {/* Right panel */}
      <aside
        className={`
    travel-right-panel
    fixed
    top-0
    right-0
    h-screen
    bg-background
    border-l
    shadow-2xl
    z-50
    transition-[width]
    duration-500
    overflow-hidden
    ${exploreOpen ? "w-[80vw]" : "w-[600px]"}
  `}
      >
        {exploreOpen && (
          <button
            onClick={() => setExploreOpen(false)}
            className="
      absolute
      top-4
      right-4
      z-[60]
      rounded-full
      p-2
      hover:bg-accent
      text-lg
    "
          >
            ✕
          </button>
        )}
        <div
          className={`
    travel-panel-content
    h-full
    overflow-y-auto
    p-5
    ${exploreOpen ? "flex gap-6" : "space-y-6"}
  `}
        >
          {exploreOpen && (
            <div
              className="
w-72
shrink-0
border-r
pr-6
space-y-6
overflow-y-auto
h-full
travel-panel-filter
"
            >

              <div className="flex items-center justify-between">

                <h2 className="text-xl font-semibold">
                  Filter
                </h2>


                <button
                  onClick={() => {

                    setSearchText("");
                    setSelectedRegion("");
                    setSelectedTravelType([]);
                    setSelectedActivity([]);
                    setSelectedAtmosphere([]);
                    setSelectedBudget([]);
                    setSelectedCompanion([]);

                  }}
                  className="
text-xs
text-muted-foreground
hover:text-black
"
                >
                  Clear all
                </button>

              </div>


              <div className="
relative
">

                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search destination..."
                  className="
w-full
rounded-2xl
border
bg-gray-50
px-4
py-3
text-sm
outline-none
focus:ring-2
focus:ring-black/20
"
                />


              </div>
              <div>

                <label className="text-sm font-medium">
                  Region
                </label>


                <div className="grid grid-cols-2 gap-2 mt-3">

                  {
                    [
                      "ภาคเหนือ",
                      "ภาคกลาง",
                      "ภาคตะวันออกเฉียงเหนือ",
                      "ภาคตะวันออก",
                      "ภาคใต้"
                    ].map(region => (

                      <FilterButton

                        key={region}

                        label={region}

                        active={
                          selectedRegion === region
                        }

                        onClick={() => {

                          setSelectedRegion(
                            selectedRegion === region
                              ?
                              ""
                              :
                              region
                          )

                        }}

                      />

                    ))

                  }

                </div>

              </div>

              <div>

                <label className="text-sm font-medium">
                  Travel style
                </label>


                <div className="flex flex-wrap gap-2 mt-3">


                  <FilterButton
                    label="ภูเขา"
                    icon={Mountain}
                    active={selectedTravelType.includes("ภูเขา")}
                    onClick={() => toggleFilter(
                      "ภูเขา",
                      setSelectedTravelType,
                      selectedTravelType
                    )}
                  />


                  <FilterButton
                    label="ทะเล"
                    icon={Waves}
                    active={selectedTravelType.includes("ทะเล")}
                    onClick={() => toggleFilter(
                      "ทะเล",
                      setSelectedTravelType,
                      selectedTravelType
                    )}
                  />


                  <FilterButton
                    label="ธรรมชาติ"
                    icon={TreePalm}
                    active={selectedTravelType.includes("ธรรมชาติ")}
                    onClick={() => toggleFilter(
                      "ธรรมชาติ",
                      setSelectedTravelType,
                      selectedTravelType
                    )}
                  />

                  <FilterButton
                    label="วัฒนธรรม"
                    icon={Landmark}
                    active={selectedTravelType.includes("วัฒนธรรม")}
                    onClick={() => toggleFilter(
                      "วัฒนธรรม",
                      setSelectedTravelType,
                      selectedTravelType
                    )}
                  />


                  <FilterButton
                    label="คาเฟ่"
                    icon={Coffee}
                    active={selectedTravelType.includes("คาเฟ่")}
                    onClick={() => toggleFilter(
                      "คาเฟ่",
                      setSelectedTravelType,
                      selectedTravelType
                    )}
                  />


                  <FilterButton
                    label="เมือง"
                    icon={Building2}
                    active={selectedTravelType.includes("เมือง")}
                    onClick={() => toggleFilter(
                      "เมือง",
                      setSelectedTravelType,
                      selectedTravelType
                    )}
                  />


                </div>


              </div>
              <div>

                <label className="text-sm font-medium">
                  Activities
                </label>


                <div className="flex flex-wrap gap-2 mt-3">


                  <FilterButton

                    label="ถ่ายรูป"
                    icon={Camera}
                    active={
                      selectedActivity.includes("ถ่ายรูป")
                    }
                    onClick={() =>
                      toggleFilter(
                        "ถ่ายรูป",
                        setSelectedActivity,
                        selectedActivity
                      )
                    }

                  />


                  <FilterButton

                    label="เดินป่า"
                    icon={Footprints}
                    active={
                      selectedActivity.includes("เดินป่า")
                    }
                    onClick={() =>
                      toggleFilter(
                        "เดินป่า",
                        setSelectedActivity,
                        selectedActivity
                      )
                    }

                  />


                  <FilterButton

                    label="อาหาร"
                    icon={Utensils}
                    active={
                      selectedActivity.includes("อาหาร")
                    }
                    onClick={() =>
                      toggleFilter(
                        "อาหาร",
                        setSelectedActivity,
                        selectedActivity
                      )
                    }

                  />


                  <FilterButton

                    label="ช้อปปิ้ง"
                    icon={ShoppingBag}
                    active={
                      selectedActivity.includes("ช้อปปิ้ง")
                    }
                    onClick={() =>
                      toggleFilter(
                        "ช้อปปิ้ง",
                        setSelectedActivity,
                        selectedActivity
                      )
                    }

                  />


                  <FilterButton

                    label="พักผ่อน"
                    icon={Armchair}
                    active={
                      selectedActivity.includes("พักผ่อน")
                    }
                    onClick={() =>
                      toggleFilter(
                        "พักผ่อน",
                        setSelectedActivity,
                        selectedActivity
                      )
                    }

                  />


                </div>

              </div>

              <div>

                <label className="text-sm font-medium">
                  Atmosphere
                </label>


                <div className="flex flex-wrap gap-2 mt-3">


                  <FilterButton

                    label="คึกคัก"
                    icon={PartyPopper}
                    active={
                      selectedAtmosphere.includes("คึกคัก")
                    }
                    onClick={() =>
                      toggleFilter(
                        "คึกคัก",
                        setSelectedAtmosphere,
                        selectedAtmosphere
                      )
                    }

                  />


                  <FilterButton

                    label="เงียบสงบ"
                    icon={Moon}
                    active={
                      selectedAtmosphere.includes("เงียบสงบ")
                    }
                    onClick={() =>
                      toggleFilter(
                        "เงียบสงบ",
                        setSelectedAtmosphere,
                        selectedAtmosphere
                      )
                    }

                  />


                  <FilterButton

                    label="ผจญภัย"
                    icon={Mountain}
                    active={
                      selectedAtmosphere.includes("ผจญภัย")
                    }
                    onClick={() =>
                      toggleFilter(
                        "ผจญภัย",
                        setSelectedAtmosphere,
                        selectedAtmosphere
                      )
                    }

                  />


                  <FilterButton

                    label="หรูหรา"
                    icon={Crown}
                    active={
                      selectedAtmosphere.includes("หรูหรา")
                    }
                    onClick={() =>
                      toggleFilter(
                        "หรูหรา",
                        setSelectedAtmosphere,
                        selectedAtmosphere
                      )
                    }

                  />


                </div>

              </div>
              <div>

                <label className="text-sm font-medium">
                  Budget
                </label>


                <div className="flex flex-wrap gap-2 mt-3">


                  <FilterButton

                    label="ประหยัด"
                    icon={Coins}
                    active={
                      selectedBudget.includes("ประหยัด")
                    }
                    onClick={() =>
                      toggleFilter(
                        "ประหยัด",
                        setSelectedBudget,
                        selectedBudget
                      )
                    }

                  />


                  <FilterButton

                    label="ปานกลาง"
                    icon={Wallet}
                    active={
                      selectedBudget.includes("ปานกลาง")
                    }
                    onClick={() =>
                      toggleFilter(
                        "ปานกลาง",
                        setSelectedBudget,
                        selectedBudget
                      )
                    }

                  />


                  <FilterButton

                    label="หรูหรา"
                    icon={Gem}
                    active={
                      selectedBudget.includes("หรูหรา")
                    }
                    onClick={() =>
                      toggleFilter(
                        "หรูหรา",
                        setSelectedBudget,
                        selectedBudget
                      )
                    }

                  />


                </div>

              </div>
              <div>

                <label className="text-sm font-medium">
                  Companion
                </label>


                <div className="flex flex-wrap gap-2 mt-3">


                  <FilterButton

                    label="คนเดียว"
                    icon={User}
                    active={
                      selectedCompanion.includes("คนเดียว")
                    }
                    onClick={() =>
                      toggleFilter(
                        "คนเดียว",
                        setSelectedCompanion,
                        selectedCompanion
                      )
                    }

                  />


                  <FilterButton

                    label="คู่รัก"
                    icon={Heart}
                    active={
                      selectedCompanion.includes("คู่รัก")
                    }
                    onClick={() =>
                      toggleFilter(
                        "คู่รัก",
                        setSelectedCompanion,
                        selectedCompanion
                      )
                    }

                  />


                  <FilterButton

                    label="ครอบครัว"
                    icon={Users}
                    active={
                      selectedCompanion.includes("ครอบครัว")
                    }
                    onClick={() =>
                      toggleFilter(
                        "ครอบครัว",
                        setSelectedCompanion,
                        selectedCompanion
                      )
                    }

                  />


                  <FilterButton

                    label="เพื่อน"
                    icon={UserRoundPlus}
                    active={
                      selectedCompanion.includes("เพื่อน")
                    }
                    onClick={() =>
                      toggleFilter(
                        "เพื่อน",
                        setSelectedCompanion,
                        selectedCompanion
                      )
                    }

                  />


                </div>

              </div>
            </div>

          )}
          <div className="travel-panel-body min-w-0 flex-1 flex flex-col space-y-10">
            {showTripPlan && (
  <TripPlanPanel
    key={currentChatId ?? "new"}
    plannerJson={plannerJson}
    plan={plan}
    tripInput={tripInput}
    allPlaces={allPlaces}
    restaurants={restaurants}
    mapCenter={mapCenter}
    chatId={currentChatId}
  />
)}


            {/* Recommend เดิม เอาออกจาก else */}
            {!showTripPlan && (
              <>
                <div className="travel-recommend-header flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">
                      Recommend for you
                    </h2>

                    <button className="ml-2 text-xs border rounded-full px-2.5 py-1 flex items-center gap-1">
                      <LayoutGrid className="h-3 w-3" />
                      Map
                    </button>
                  </div>

                  {!exploreOpen && (
                    <button
                      onClick={handleExplore}
                      className="
                        ml-auto
                        shrink-0
                        text-xs
                        text-muted-foreground
                        hover:text-black
                      "
                    >
                      Explore
                    </button>
                  )}
                </div>


                {!recommendLoading && recommendError && (
                  <div role="alert" className="rounded-2xl bg-white/80 p-4 text-sm">
                    <p>{recommendError}</p>
                    <button className="mt-3 min-h-11 rounded-xl border px-4" onClick={() => setRecommendAttempt(value => value + 1)}>
                      ลองอีกครั้ง
                    </button>
                  </div>
                )}
                {!recommendLoading && !recommendError && recommend.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">ยังไม่พบสถานที่ที่ตรงกับความสนใจของคุณ</p>
                )}
                <div
                  className={`
        travel-recommend-grid
        grid
        gap-3
        ${exploreOpen
                      ? "grid-cols-4 w-full"
                      : "grid-cols-3 w-full"
                    }
      `}
                >
                  {(
                    recommendLoading
                      ? skeletonCards
                      : (exploreOpen
                        ? filteredPlaces.slice(0, visibleCount)
                        : recommend.slice(0, 6))
                  ).map((c: any, index) => (
                    <RecommendationCarouselCard
                      key={c?.att_id ?? index}
                      images={
                        recommendLoading
                          ? []
                          : c?.images
                      }
                      className="
                        travel-recommend-card
                        relative
                        isolate
                        rounded-xl
                        overflow-hidden
                        aspect-[3/4]
                        bg-gray-100
                        [contain:layout_paint]
                        [transform:translateZ(0)]
                      "
                    >
                      {({
                        index: cardImageIndex,
                        changeImage: changeCardImage,
                        handleImageError: handleCardImageError,
                      }) => (
                        recommendLoading ? (

                          <div className="
                        absolute
                        inset-0
                        bg-gray-200
                        animate-pulse
                        ">

                            <div className="
                        absolute
                        bottom-5
                        left-3
                        right-3
                        space-y-2
                        ">

                              <div className="
                        h-3
                        w-3/4
                        bg-gray-300
                        rounded
                        "/>

                              <div className="
                        h-3
                        w-1/2
                        bg-gray-300
                        rounded
                        "/>

                            </div>

                          </div>


                        ) : (

                          <>

                            <SmoothRecommendationImage
                              images={c.images}
                              fallback={c.image}
                              index={cardImageIndex}
                              alt={c.name_th}
                              onImageError={
                                handleCardImageError
                              }
                            />

                            {/* Save Heart */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave(c);
                                console.log("save", c.att_id);
                              }}
                              className={`
  absolute
  z-30
  top-2
  left-2
  rounded-full
  flex
  items-center
  justify-center
  transition
  ${exploreOpen ? "w-9 h-9" : "w-7 h-7"}
  ${savedIds.includes(c.att_id) ? "saved-heart" : ""}
  ${savedIds.includes(c.att_id) ? "bg-white/90" : "bg-black/40"}
`}
                            >
                              <Heart
                                size={18}
                                className={
                                  savedIds.includes(c.att_id)
                                    ? "text-rose-500 fill-rose-500"
                                    : "text-white"
                                }
                              />
                            </button>



                            {/* Add Trip */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlaceToAddTrip(c);
                              }}
                              className={`
absolute
z-30
top-2
right-2
rounded-full
bg-black/40
backdrop-blur-md
flex
items-center
justify-center
hover:bg-black/60
transition
${exploreOpen
                                  ? "w-9 h-9"
                                  : "w-7 h-7"
                                }
`}
                            >
                              <Plus
                                size={exploreOpen ? 20 : 15}
                                strokeWidth={2.5}
                                className="text-white"
                              />
                            </button>

                            {c.images?.length > 1 && (
                              <>
                                {/* Previous */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    changeCardImage(
                                      "prev"
                                    );
                                  }}
                                  className="
  absolute
  z-20
  left-2
  top-1/2
  -translate-y-1/2
  bg-black/40
  text-white
  rounded-full
  w-8
  h-8
  flex
  items-center
  justify-center
  hover:bg-black/70
  "
                                >
                                  ‹
                                </button>


                                {/* Next */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    changeCardImage(
                                      "next"
                                    );
                                  }}
                                  className="
      absolute
      z-20
      right-2
      top-1/2
      -translate-y-1/2
      bg-black/40
      text-white
      rounded-full
      w-8
      h-8
      flex
      items-center
      justify-center
      hover:bg-black/70
      "
                                >
                                  ›
                                </button>
                              </>
                            )}
                            <div className="
absolute
inset-0
bg-gradient-to-t
from-black/80
via-black/20
"/>


                            <div className="
absolute
bottom-0
p-3
text-white
">
                              {c.images?.length > 1 && (
                                <div className="flex gap-1 mb-2">

                                  {c.images.map((_: any, i: number) => (
                                    <div
                                      key={i}
                                      className={`
        h-1.5
        rounded-full
        transition-all
        ${cardImageIndex === i
                                          ? "w-5 bg-white"
                                          : "w-1.5 bg-white/50"
                                        }
        `}
                                    />
                                  ))}

                                </div>

                              )}
                              <div className="
text-sm
font-semibold
line-clamp-2
">
                                {c.name_th}
                              </div>


                              <div className="
mt-1
flex
items-center
gap-1
text-xs
text-white/80
">

                                <MapPin
                                  size={12}
                                  strokeWidth={2}
                                />

                                {c.province}

                              </div>
                            </div>
                          </>
                        )
                      )}
                    </RecommendationCarouselCard>

                  ))}
                </div>


                {exploreOpen && visibleCount < filteredPlaces.length && (
                  <div className="w-full flex justify-center mt-10 mb-10">
                    <button
                      onClick={() =>
                        setVisibleCount((prev) => prev + 20)
                      }
                      className="
                    px-8
                    py-3
                    rounded-xl
                    border
                    bg-white
                    hover:bg-gray-100
                    shadow-sm
                  "
                    >
                      Load More
                    </button>
                  </div>
                )}

              </>
            )}

            {!exploreOpen && !showTripPlan && (
              <section>
                <h2 className="font-semibold mb-3">
                  Get started
                </h2>

                <div className="travel-start-grid grid grid-cols-2 gap-3 w-full">

                  <div className="rounded-2xl overflow-hidden aspect-[4/3] relative cursor-pointer"
                    style={{ background: "linear-gradient(135deg, oklch(0.7 0.15 230), oklch(0.65 0.18 250))" }}>
                    <div className="absolute inset-0 flex items-center justify-center text-6xl">
                      🦩
                    </div>
                    <div className="absolute bottom-3 left-3 text-white font-semibold">
                      Create a trip
                    </div>
                  </div>


                  <div className="rounded-2xl overflow-hidden aspect-[4/3] relative cursor-pointer"
                    style={{ background: "linear-gradient(135deg, oklch(0.85 0.16 80), oklch(0.75 0.18 60))" }}>
                    <div className="absolute inset-0 flex items-center justify-center text-6xl">
                      🏄‍♀️
                    </div>
                    <div className="absolute bottom-3 left-3 text-white font-semibold">
                      Creator tools
                    </div>
                  </div>

                </div>
              </section>
            )}
            {tripPlaces.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3">
                  AI Recommended Places
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  {tripPlaces.map((place) => (
                    <div
                      key={place.att_id}
                      className="rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition"
                    >
                      <img
                        src={place.image}
                        alt={place.name_th}
                        className="w-full h-36 object-cover"
                      />

                      <div className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2">
                          {place.name_th}
                        </h3>

                        <p className="text-xs text-muted-foreground mt-1">
                          {place.category}
                        </p>

                        <p className="text-xs mt-2 line-clamp-3">
                          {place.detail_th}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {!exploreOpen && !showTripPlan && (
              <section>
                <h2 className="font-semibold mb-3">
                  Get inspired for you
                </h2>

                <div
                  className={`travel-inspiration-grid grid gap-3 ${exploreOpen
                    ? "grid-cols-4"
                    : "grid-cols-3 w-full"
                    }`}
                >
                  {inspire.map((v) => (
                    <div key={v.id} className="rounded-xl overflow-hidden bg-black">
                      <iframe
                        src={v.videoUrl}
                        className="w-full aspect-[9/16]"
                        allowFullScreen
                      />

                      <div className="p-2 text-white text-sm line-clamp-2">
                        {v.title}
                      </div>
                    </div>
                  ))}

                </div>

              </section>
            )}

          </div>
        </div>
      </aside >

    </div >
  );
}
