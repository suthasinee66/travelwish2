import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudSun,
  CloudRain,
  ExternalLink,
  Globe2,
  Heart,
  Hotel,
  Images,
  Lightbulb,
  Maximize2,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Sparkles,
  Star,
  Trees,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useImageSwipe } from "@/hooks/useImageSwipe";
import {
  getAttractionSavedState,
  loadPlaceDetailRelatedData,
  toggleAttractionSaved,
  type PlaceDetailRelatedData,
} from "@/lib/travel/loadPlaceDetailData";

export type PlaceDetailTargetType =
  | "attraction"
  | "restaurant"
  | "accommodation";

export type PlaceDetailTarget = {
  type: PlaceDetailTargetType;
  data: any;
};

type Props = {
  open: boolean;
  target: PlaceDetailTarget | null;
  onClose: () => void;
  onAddToTrip?: (target: PlaceDetailTarget) => void;
};

type DetailTab = "overview" | "reviews" | "location";

const EMPTY_VALUES = new Set([
  "",
  "-",
  "null",
  "undefined",
  "n/a",
  "na",
]);

function hasValue(value: any) {
  if (value == null) return false;

  if (Array.isArray(value)) {
    return value.some(hasValue);
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return !EMPTY_VALUES.has(
    String(value).trim().toLowerCase()
  );
}

function cleanText(value: any) {
  if (!hasValue(value)) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .filter(hasValue)
      .map((item) => String(item))
      .join(" • ");
  }

  return String(value);
}

function normalizeUrl(value: any) {
  if (!hasValue(value)) return null;

  const url = String(value).trim();

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return `https://${url}`;
}

function formatOpeningTime(
  value: any
) {
  if (!hasValue(value)) {
    return null;
  }

  const date = new Date(
    String(value)
  );

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
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone:
        "Asia/Bangkok",
    }
  ).format(date);
}

function getRestaurantOpeningLabel(
  restaurant: any
) {
  const isOpen =
    restaurant?.open_now;

  const nextClose =
    formatOpeningTime(
      restaurant
        ?.next_close_time
    );

  const nextOpen =
    formatOpeningTime(
      restaurant
        ?.next_open_time
    );

  if (isOpen === true) {
    return nextClose
      ? `เปิดอยู่ · ปิด ${nextClose}`
      : "เปิดอยู่";
  }

  if (isOpen === false) {
    return nextOpen
      ? `ปิดอยู่ · เปิด ${nextOpen}`
      : "ปิดอยู่";
  }

  const weekdayDescriptions =
    Array.isArray(
      restaurant
        ?.weekday_descriptions
    )
      ? restaurant
          .weekday_descriptions
      : [];

  if (
    weekdayDescriptions.length > 0
  ) {
    const todayName =
      new Intl.DateTimeFormat(
        "th-TH",
        {
          weekday: "long",
          timeZone:
            "Asia/Bangkok",
        }
      ).format(new Date());

    const todayDescription =
      weekdayDescriptions.find(
        (description: any) =>
          String(description)
            .trim()
            .startsWith(
              todayName
            )
      ) ??
      weekdayDescriptions.find(
        (description: any) =>
          String(description)
            .includes(
              todayName
            )
      ) ??
      weekdayDescriptions[0];

    return hasValue(
      todayDescription
    )
      ? String(
          todayDescription
        )
      : null;
  }

  return null;
}

function formatReviewCount(value: any) {
  const count = Number(value);

  if (!Number.isFinite(count)) {
    return null;
  }

  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(
      count >= 10_000_000 ? 0 : 1
    )}m`;
  }

  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(
      count >= 100_000 ? 0 : 1
    )}k`;
  }

  return count.toLocaleString();
}

function getTitle(
  type: PlaceDetailTargetType,
  data: any
) {
  if (type === "restaurant") {
    return (
      data?.place_name_th ??
      data?.place_name_en ??
      data?.restaurant_name ??
      data?.name ??
      "ร้านอาหาร"
    );
  }

  if (type === "accommodation") {
    return (
      data?.acc_name_th ??
      data?.acc_name_en ??
      data?.name ??
      "ที่พัก"
    );
  }

  return (
    data?.name_th ??
    data?.name_en ??
    data?.place_name ??
    data?.name ??
    "สถานที่ท่องเที่ยว"
  );
}

function getTypeLabel(
  type: PlaceDetailTargetType
) {
  if (type === "restaurant") {
    return "Restaurant";
  }

  if (type === "accommodation") {
    return "Accommodation";
  }

  return "Attraction";
}

function getAddress(data: any) {
  const direct =
    data?.place_address ??
    data?.acc_address ??
    data?.address;

  if (hasValue(direct)) {
    return String(direct);
  }

  return [
    data?.subdistrict,
    data?.district,
    data?.province ??
      data?.province_name_th,
  ]
    .filter(hasValue)
    .join(", ");
}

function getLocationSummary(data: any) {
  const parts = [
    data?.district,
    data?.province ??
      data?.province_name_th,
  ]
    .filter(hasValue)
    .map(String);

  return Array.from(new Set(parts)).join(", ");
}

function getImages(data: any) {
  const candidates = [
    ...(Array.isArray(data?.images)
      ? data.images
      : []),
    data?.image,
  ];

  return Array.from(
    new Set(
      candidates.filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim().length > 0
      )
    )
  );
}

async function loadFullRecord(
  target: PlaceDetailTarget
) {
  const data = target.data ?? {};

  if (target.type === "attraction") {
    const id =
      data.att_id ?? data.place_id;

    if (!id) return data;

    const result = await supabase
      .from("attraction")
      .select("*")
      .eq("att_id", String(id))
      .maybeSingle();

    return result.data
      ? { ...data, ...result.data }
      : data;
  }

  if (target.type === "restaurant") {
    const placeId =
      data.place_id ??
      data.restaurant_id ??
      data.google_place_id;

    if (!placeId) return data;

    const byPlaceId = await supabase
      .from("restaurant")
      .select("*")
      .eq("place_id", String(placeId))
      .maybeSingle();

    if (byPlaceId.data) {
      return {
        ...data,
        ...byPlaceId.data,
      };
    }

    const byGoogleId = await supabase
      .from("restaurant")
      .select("*")
      .eq(
        "google_place_id",
        String(placeId)
      )
      .maybeSingle();

    return byGoogleId.data
      ? {
          ...data,
          ...byGoogleId.data,
        }
      : data;
  }

  const accId =
    data.acc_id ?? data.id;

  if (!accId) return data;

  const result = await supabase
    .from("accommodation")
    .select("*")
    .eq("acc_id", String(accId))
    .maybeSingle();

  return result.data
    ? { ...data, ...result.data }
    : data;
}

function InfoItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string | null;
}) {
  if (!value) return null;

  const body = (
    <>
      <div className="mt-0.5 shrink-0 text-[#6f456f]">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a093a4]">
          {label}
        </div>

        <div className="mt-1 break-words text-sm font-medium leading-6 text-[#4e4453]">
          {value}
        </div>
      </div>

      {href && (
        <ExternalLink
          size={15}
          className="ml-auto mt-1 shrink-0 text-[#a093a4]"
        />
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={
          href.startsWith("tel:")
            ? undefined
            : "_blank"
        }
        rel={
          href.startsWith("tel:")
            ? undefined
            : "noreferrer"
        }
        className="flex min-w-0 items-start gap-3 rounded-2xl p-3 transition hover:bg-[#faf7fb]"
      >
        {body}
      </a>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl p-3">
      {body}
    </div>
  );
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-[#ded5e0] bg-[#fcfafc] px-6 text-center text-sm leading-6 text-[#948798]">
      {children}
    </div>
  );
}

export default function PlaceDetailDrawer({
  open,
  target,
  onClose,
  onAddToTrip,
}: Props) {
  const [record, setRecord] =
    useState<any>(null);

  const [recordType, setRecordType] =
    useState<PlaceDetailTargetType | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [relatedLoading, setRelatedLoading] =
    useState(false);

  const [relatedData, setRelatedData] =
    useState<PlaceDetailRelatedData>({
      weather: null,
      similarPlaces: [],
      nearbyRestaurants: [],
      nearbyPlaces: [],
    });

  const [isSaved, setIsSaved] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<DetailTab>("overview");

  const [mainImageIndex, setMainImageIndex] =
    useState(0);

  const [descriptionExpanded, setDescriptionExpanded] =
    useState(false);

  const [showPhotoViewer, setShowPhotoViewer] =
    useState(false);

  const swipeProps = useImageSwipe();

  useEffect(() => {
    let active = true;

    if (!open || !target) {
      setRecord(null);
      setRecordType(null);
      setRelatedData({
        weather: null,
        similarPlaces: [],
        nearbyRestaurants: [],
        nearbyPlaces: [],
      });
      setIsSaved(false);
      setMainImageIndex(0);
      setActiveTab("overview");
      setDescriptionExpanded(false);
      setShowPhotoViewer(false);
      return;
    }

    setRecord(target.data ?? {});
    setRecordType(target.type);
    setRelatedData({
      weather: null,
      similarPlaces: [],
      nearbyRestaurants: [],
      nearbyPlaces: [],
    });
    setMainImageIndex(0);
    setActiveTab("overview");
    setDescriptionExpanded(false);
    setShowPhotoViewer(false);
    setLoading(true);

    loadFullRecord(target)
      .then((data) => {
        if (active) {
          setRecord(data);
        }
      })
      .catch((error) => {
        console.warn(
          "LOAD PLACE DETAIL ERROR:",
          error
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, target]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, onClose]);

  const data =
    record ?? target?.data ?? {};

  const type =
    recordType ??
    target?.type ??
    "attraction";

  const title = getTitle(type, data);
  const typeLabel = getTypeLabel(type);
  const images = getImages(data);
  const address = getAddress(data);
  const locationSummary =
    getLocationSummary(data);

  const description =
    data?.detail_th ??
    data?.detail_en ??
    data?.description ??
    data?.highlight ??
    "";

  const rating =
    data?.rating != null &&
    Number.isFinite(Number(data.rating))
      ? Number(data.rating)
      : null;

  const reviewCount =
    formatReviewCount(
      data?.user_ratings_total
    );

  const phone =
    data?.place_phone ??
    data?.tel ??
    data?.phone ??
    null;

  const websiteValue =
    data?.place_website ??
    data?.website ??
    data?.facebook ??
    data?.source_url ??
    null;

  const website =
    normalizeUrl(websiteValue);

  const latitude = Number(
    data?.latitude ??
      data?.location?.latitude
  );

  const longitude = Number(
    data?.longitude ??
      data?.location?.longitude
  );

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const mapsUrl = useMemo(() => {
    if (
      hasValue(
        data?.google_maps_uri
      )
    ) {
      return String(
        data.google_maps_uri
      );
    }

    if (hasCoordinates) {
      return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }

    if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address
      )}`;
    }

    return null;
  }, [
    data?.google_maps_uri,
    hasCoordinates,
    latitude,
    longitude,
    address,
  ]);

  useEffect(() => {
    let active = true;

    if (
      !open ||
      type !== "attraction" ||
      !data?.att_id
    ) {
      setIsSaved(false);
      return;
    }

    getAttractionSavedState(
      String(data.att_id)
    )
      .then((saved) => {
        if (active) {
          setIsSaved(saved);
        }
      })
      .catch((error) => {
        console.warn(
          "LOAD SAVED STATE ERROR:",
          error
        );
      });

    return () => {
      active = false;
    };
  }, [
    open,
    type,
    data?.att_id,
  ]);

  useEffect(() => {
    let active = true;

    if (
      !open ||
      type !== "attraction" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setRelatedData({
        weather: null,
        similarPlaces: [],
        nearbyRestaurants: [],
        nearbyPlaces: [],
      });
      setRelatedLoading(false);
      return;
    }

    setRelatedLoading(true);

    loadPlaceDetailRelatedData(data)
      .then((result) => {
        if (active) {
          setRelatedData(result);
        }
      })
      .catch((error) => {
        console.warn(
          "LOAD RELATED PLACE DATA ERROR:",
          error
        );
      })
      .finally(() => {
        if (active) {
          setRelatedLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    open,
    type,
    data?.att_id,
    data?.province,
    latitude,
    longitude,
  ]);

  const categoryChips =
    useMemo(() => {
      const values: string[] = [];

      if (type === "attraction") {
        if (Array.isArray(data?.category)) {
          values.push(
            ...data.category
              .filter(hasValue)
              .map(String)
          );
        }

        if (hasValue(data?.type)) {
          values.push(String(data.type));
        }

        if (
          hasValue(
            data?.suitable_duration
          )
        ) {
          values.push(
            `ใช้เวลาประมาณ ${data.suitable_duration}`
          );
        }
      }

      if (type === "restaurant") {
        if (hasValue(data?.place_type)) {
          values.push(
            cleanText(data.place_type)
          );
        }

        if (
          hasValue(
            data?.google_primary_type
          )
        ) {
          values.push(
            String(
              data.google_primary_type
            )
              .replaceAll("_", " ")
          );
        }
      }

      if (type === "accommodation") {
        if (hasValue(data?.star_level)) {
          values.push(
            `${data.star_level} ดาว`
          );
        }

        if (
          hasValue(
            data?.accom_price_name
          )
        ) {
          values.push(
            String(
              data.accom_price_name
            )
          );
        }
      }

      return Array.from(
        new Set(
          values
            .map((value) =>
              value.trim()
            )
            .filter(Boolean)
        )
      ).slice(0, 3);
    }, [data, type]);

  const TypeIcon =
    type === "restaurant"
      ? Utensils
      : type === "accommodation"
        ? Hotel
        : Building2;

  const selectedImage =
    images[
      Math.min(
        mainImageIndex,
        Math.max(
          images.length - 1,
          0
        )
      )
    ];

  const tabs: Array<{
    id: DetailTab;
    label: string;
  }> = [
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "reviews",
      label: "Reviews",
    },
    {
      id: "location",
      label: "Location",
    },
  ];

  const changeImage = (
    direction: "next" | "prev"
  ) => {
    if (images.length <= 1) {
      return;
    }

    setMainImageIndex((current) => {
      if (direction === "next") {
        return (
          (current + 1) %
          images.length
        );
      }

      return (
        current -
        1 +
        images.length
      ) % images.length;
    });
  };

  const longDescription =
    String(description).length > 430;

  const handleToggleSaved = async () => {
    if (
      type !== "attraction" ||
      !data?.att_id ||
      saving
    ) {
      return;
    }

    setSaving(true);

    try {
      const nextSaved =
        await toggleAttractionSaved(
          String(data.att_id),
          isSaved
        );

      setIsSaved(nextSaved);
    } catch (error) {
      console.warn(
        "TOGGLE SAVED ERROR:",
        error
      );
    } finally {
      setSaving(false);
    }
  };

  const openRelatedAttraction = async (
    place: any
  ) => {
    const nextTarget: PlaceDetailTarget = {
      type: "attraction",
      data: place,
    };

    setRecordType("attraction");
    setRecord(place);
    setMainImageIndex(0);
    setActiveTab("overview");
    setDescriptionExpanded(false);
    setLoading(true);

    try {
      const fullRecord =
        await loadFullRecord(nextTarget);

      setRecord(fullRecord);
    } catch (error) {
      console.warn(
        "OPEN RELATED ATTRACTION ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const imageFor = (item: any) => {
    const itemImages = getImages(item);
    return itemImages[0] ?? null;
  };

  const mapsUrlFor = (item: any) => {
    if (hasValue(item?.google_maps_uri)) {
      return String(item.google_maps_uri);
    }

    const lat = Number(
      item?.latitude ??
        item?.location?.latitude
    );
    const lng = Number(
      item?.longitude ??
        item?.location?.longitude
    );

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }

    const itemAddress =
      getAddress(item);

    if (itemAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        itemAddress
      )}`;
    }

    return null;
  };

  return (
    <div
      className={`
        fixed inset-0 z-[320]
        transition
        ${open
          ? "pointer-events-auto"
          : "pointer-events-none"}
      `}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="ปิดรายละเอียด"
        onClick={onClose}
        className={`
          absolute inset-0
          bg-[#30233a]/35
          backdrop-blur-[2px]
          transition-opacity duration-300
          ${open
            ? "opacity-100"
            : "opacity-0"}
        `}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`รายละเอียด ${title}`}
        className={`
          absolute right-0 top-0
          h-[100dvh]
          w-full
          overflow-y-auto
          border-l border-[#e7dfea]
          bg-[#fffdfb]
          shadow-[-26px_0_70px_rgba(47,31,56,0.18)]
          transition-transform duration-300 ease-out
          sm:w-[min(920px,94vw)]
          lg:w-[min(930px,64vw)]
          xl:w-[min(960px,62vw)]
          ${open
            ? "translate-x-0"
            : "translate-x-full"}
        `}
      >
        <div className="sticky top-0 z-40 flex h-[64px] items-center justify-between border-b border-[#eee7ef] bg-[#fffdfb]/96 px-4 backdrop-blur-xl sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e7dfe9] bg-white text-[#5B3A61] shadow-sm transition hover:bg-[#faf6fb] active:scale-95"
            aria-label="ปิด"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2">
            {loading && (
              <span className="hidden text-xs font-medium text-[#9a8da0] sm:inline">
                กำลังโหลดข้อมูล...
              </span>
            )}

            {type === "attraction" && data?.att_id && (
              <button
                type="button"
                onClick={handleToggleSaved}
                disabled={saving}
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full
                  border shadow-sm transition
                  disabled:cursor-wait disabled:opacity-60
                  ${isSaved
                    ? "border-rose-100 bg-rose-50 text-rose-500"
                    : "border-[#e7dfe9] bg-white text-[#6c5572] hover:bg-[#faf6fb]"}
                `}
                aria-label={
                  isSaved
                    ? "นำออกจากรายการบันทึก"
                    : "บันทึกสถานที่"
                }
              >
                <Heart
                  size={18}
                  fill={
                    isSaved
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            )}

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#5B3A61] px-4 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(91,58,97,0.22)] transition hover:bg-[#6a4570]"
              >
                <MapPin size={15} />
                <span>เปิดแผนที่</span>
              </a>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[930px] px-4 pb-32 pt-5 sm:px-6">
          <section>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-[#25213f] sm:text-[34px]">
              {title}
            </h1>

            {locationSummary && (
              <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-[#76697c]">
                <MapPin
                  size={15}
                  className="text-[#5B3A61]"
                />
                <span>{locationSummary}</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6eaf7] px-3 py-1.5 text-xs font-semibold text-[#783c7c]">
                <TypeIcon size={13} />
                {typeLabel}
              </span>

              {categoryChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-[#ece5ee] bg-[#fbf9fc] px-3 py-1.5 text-xs font-medium text-[#6f6274]"
                >
                  {chip}
                </span>
              ))}

              {rating != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#efe5c8] bg-[#fff9e8] px-3 py-1.5 text-xs font-semibold text-[#77591d]">
                  <Star size={13} fill="currentColor" />
                  {rating.toFixed(1)}
                </span>
              )}
            </div>
          </section>

          <section className="mt-4">
            {selectedImage ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_118px]">
                <div
                  {...swipeProps(
                    changeImage,
                    images.length > 1
                  )}
                  className="group relative overflow-hidden rounded-[20px] bg-[#eee8ef] shadow-[0_10px_30px_rgba(72,54,80,0.10)] touch-pan-y"
                >
                  <div className="aspect-[16/9] w-full lg:aspect-[16/7.4]">
                    <img
                      src={selectedImage}
                      alt={title}
                      draggable={false}
                      className="h-full w-full select-none object-cover"
                    />
                  </div>

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5" />

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          changeImage("prev");
                        }}
                        className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 sm:flex"
                        aria-label="รูปก่อนหน้า"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          changeImage("next");
                        }}
                        className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 sm:flex"
                        aria-label="รูปถัดไป"
                      >
                        <ChevronRight size={20} />
                      </button>

                      <span className="absolute right-3 top-3 rounded-full bg-[#253047]/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        {mainImageIndex + 1} / {images.length}
                      </span>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setShowPhotoViewer(true)
                    }
                    className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/60"
                  >
                    <Images size={14} />
                    ดูรูปภาพ
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPhotoViewer(true)
                    }
                    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
                    aria-label="ขยายรูป"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>

                {images.length > 1 && (
                  <>
                    <div className="hidden gap-2 lg:flex lg:flex-col">
                      {images
                        .slice(0, 4)
                        .map((image, index) => (
                          <button
                            key={`${image}-thumb-${index}`}
                            type="button"
                            onClick={() =>
                              setMainImageIndex(index)
                            }
                            className={`
                              relative h-[64px] overflow-hidden rounded-[12px]
                              border-2 bg-[#f3eef4] transition
                              ${mainImageIndex === index
                                ? "border-[#5B3A61]"
                                : "border-transparent opacity-85 hover:opacity-100"}
                            `}
                          >
                            <img
                              src={image}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}

                      <button
                        type="button"
                        onClick={() =>
                          setShowPhotoViewer(true)
                        }
                        className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-[#f6f1f7] px-2 text-[11px] font-semibold text-[#5B3A61] transition hover:bg-[#eee5f0]"
                      >
                        <Plus size={14} />
                        ดูรูปทั้งหมด
                      </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {images.map(
                        (image, index) => (
                          <button
                            key={`${image}-mobile-${index}`}
                            type="button"
                            onClick={() =>
                              setMainImageIndex(index)
                            }
                            className={`
                              h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2
                              ${mainImageIndex === index
                                ? "border-[#5B3A61]"
                                : "border-transparent"}
                            `}
                          >
                            <img
                              src={image}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex aspect-[16/7] items-center justify-center rounded-[20px] border border-dashed border-[#ded4e0] bg-[#f8f4f8] text-[#9b8e9e]">
                <div className="flex flex-col items-center gap-2">
                  <TypeIcon size={30} />
                  <span className="text-xs">
                    ยังไม่มีรูปภาพสำหรับสถานที่นี้
                  </span>
                </div>
              </div>
            )}
          </section>

          {type === "attraction" && (
            <section className="mt-4">
              {relatedData.weather ? (
                <div className="rounded-[20px] bg-gradient-to-r from-[#f2ecff] via-[#f8f1fb] to-[#fff1f3] px-4 py-4 shadow-[0_8px_24px_rgba(91,58,97,0.07)] sm:px-5">
                  <div className="grid gap-4 sm:grid-cols-[1.05fr_1px_.9fr_1px_1.35fr] sm:items-center">
                    <div>
                      <div className="text-sm font-bold text-[#30254b]">
                        สภาพอากาศวันนี้
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/60">
                          <CloudSun
                            size={34}
                            className="text-[#f2aa31]"
                          />
                        </div>

                        <div>
                          <div className="text-[34px] font-bold leading-none text-[#2f2951]">
                            {relatedData.weather.temperature != null
                              ? `${Math.round(
                                  relatedData.weather.temperature
                                )}°C`
                              : "—"}
                          </div>
                          <div className="mt-1 text-xs font-medium text-[#5f5572]">
                            {relatedData.weather.condition}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden h-20 bg-[#d8cde0] sm:block" />

                    <div className="space-y-3 text-xs">
                      <div className="flex items-start gap-2">
                        <CloudRain
                          size={17}
                          className="mt-0.5 text-[#5B3A61]"
                        />
                        <div>
                          <div className="text-[#75687a]">
                            โอกาสฝนตก
                          </div>
                          <div className="font-bold text-[#40344a]">
                            {relatedData.weather.rainChance != null
                              ? `${relatedData.weather.rainChance}%`
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <CloudSun
                          size={17}
                          className="mt-0.5 text-[#eea526]"
                        />
                        <div>
                          <div className="text-[#75687a]">
                            ช่วงเวลาที่แนะนำ
                          </div>
                          <div className="font-bold text-[#40344a]">
                            {relatedData.weather.recommendedTime}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden h-20 bg-[#d8cde0] sm:block" />

                    <div className="rounded-[16px] bg-white/45 px-4 py-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#6d3a72]">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe4f0] text-[#c33a82]">
                          <Lightbulb size={16} />
                        </span>
                        คำแนะนำ
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-[#63576a]">
                        {relatedData.weather.advice}
                      </p>
                    </div>
                  </div>
                </div>
              ) : relatedLoading ? (
                <div className="h-32 animate-pulse rounded-[20px] bg-[#f2edf4]" />
              ) : null}
            </section>
          )}

          {type === "attraction" &&
            relatedData.similarPlaces.length > 0 && (
              <section className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold leading-none text-[#2f2946]">
                    สถานที่คล้ายกัน
                  </h2>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7a3f80] transition hover:text-[#5B3A61]"
                  >
                    ดูทั้งหมด
                    <span aria-hidden="true">→</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {relatedData.similarPlaces
                    .slice(0, 4)
                    .map((place) => {
                      const image =
                        imageFor(place);

                      const placeTags = [
                        ...(
                          Array.isArray(
                            place?.travel_type
                          )
                            ? place.travel_type
                            : []
                        ),
                        ...(
                          Array.isArray(
                            place?.category
                          )
                            ? place.category
                            : []
                        ),
                      ]
                        .filter(Boolean)
                        .slice(0, 2);

                      return (
                        <article
                          key={place.att_id}
                          onClick={() =>
                            openRelatedAttraction(place)
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" ||
                              event.key === " "
                            ) {
                              event.preventDefault();
                              openRelatedAttraction(place);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className="
                            group
                            relative
                            cursor-pointer
                            overflow-hidden
                            rounded-[11px]
                            border border-[#ece5ee]
                            bg-white
                            text-left
                            shadow-[0_3px_10px_rgba(72,54,80,0.055)]
                            transition
                            hover:-translate-y-0.5
                            hover:shadow-[0_6px_14px_rgba(72,54,80,0.09)]
                            focus:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-[#6f456f]
                          "
                        >
                          <div className="relative h-[72px] overflow-hidden bg-[#f2edf3] sm:h-[78px]">
                            {image ? (
                              <img
                                src={image}
                                alt={
                                  place.name_th ??
                                  place.name_en ??
                                  ""
                                }
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#b3a7b5]">
                                <Building2 size={20} />
                              </div>
                            )}

                            <span
                              className="
                                absolute
                                right-1.5
                                top-1.5
                                flex
                                h-[24px]
                                w-[24px]
                                items-center
                                justify-center
                                rounded-full
                                border border-[#eadfeb]
                                bg-white/95
                                text-[#c13b82]
                                shadow-[0_2px_6px_rgba(66,45,76,0.12)]
                              "
                              aria-hidden="true"
                            >
                              <Heart
                                size={13}
                                strokeWidth={2}
                              />
                            </span>
                          </div>

                          <div className="px-2 pb-2 pt-1.5">
                            <div className="line-clamp-1 text-[11px] font-bold leading-[15px] text-[#302a49]">
                              {place.name_th ??
                                place.name_en ??
                                "สถานที่ท่องเที่ยว"}
                            </div>

                            <div className="mt-[2px] flex items-center gap-1 text-[9px] leading-none text-[#76697b]">
                              <MapPin size={9} />
                              <span className="truncate">
                                {place.province ?? "Thailand"}
                              </span>
                            </div>

                            {placeTags.length > 0 && (
                              <div className="mt-1.5 flex min-h-[18px] gap-1 overflow-hidden">
                                {placeTags.map(
                                  (tag: string) => (
                                    <span
                                      key={tag}
                                      className="
                                        max-w-[84px]
                                        truncate
                                        rounded-full
                                        bg-[#f6f1f8]
                                        px-2
                                        py-[3px]
                                        text-[8px]
                                        font-medium
                                        leading-none
                                        text-[#78687d]
                                      "
                                    >
                                      {tag}
                                    </span>
                                  )
                                )}
                              </div>
                            )}

                            <div className="mt-1.5 flex h-[23px] items-center justify-center rounded-full bg-[#f7f1f9] text-[9px] font-semibold text-[#6c3b71]">
                              ดูรายละเอียด&nbsp;&nbsp;→
                            </div>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            )}

          {type === "attraction" && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {relatedData.nearbyRestaurants.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[15px] font-bold leading-none text-[#2f2946]">
                      ร้านอาหารใกล้เคียง
                    </h2>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7a3f80] hover:text-[#5B3A61]"
                    >
                      ดูทั้งหมด
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>

                  {relatedData.nearbyRestaurants
                    .slice(0, 1)
                    .map((restaurant) => {
                      const image =
                        imageFor(restaurant);
                      const routeUrl =
                        mapsUrlFor(restaurant);
                      const distance =
                        Number(
                          restaurant.distance
                        );
                      const openingLabel =
                        getRestaurantOpeningLabel(
                          restaurant
                        );

                      return (
                        <article
                          key={
                            restaurant.place_id ??
                            restaurant.google_place_id
                          }
                          className="
                            flex
                            min-h-[86px]
                            items-center
                            gap-2.5
                            rounded-[12px]
                            border border-[#ece5ee]
                            bg-white
                            p-2
                            shadow-[0_3px_10px_rgba(72,54,80,0.05)]
                          "
                        >
                          <div className="h-[70px] w-[82px] shrink-0 overflow-hidden rounded-[9px] bg-[#f2edf3]">
                            {image ? (
                              <img
                                src={image}
                                alt={
                                  restaurant.place_name_th ??
                                  restaurant.place_name_en ??
                                  ""
                                }
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#a89aaa]">
                                <Utensils size={20} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-1 text-[11px] font-bold leading-[14px] text-[#302a49]">
                              {restaurant.place_name_th ??
                                restaurant.place_name_en ??
                                "ร้านอาหาร"}
                            </h3>

                            <div className="mt-[2px] flex items-center gap-1 text-[8.5px] leading-none text-[#76697b]">
                              <MapPin size={9} />
                              <span className="truncate">
                                {String(
                                  restaurant.place_type ??
                                  "restaurant"
                                ).replaceAll("_", " ")}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[8.5px]">
                              {restaurant.rating != null && (
                                <span className="inline-flex items-center gap-1 font-bold text-[#6d5319]">
                                  <Star
                                    size={10}
                                    fill="#f2b735"
                                    className="text-[#f2b735]"
                                  />
                                  {Number(
                                    restaurant.rating
                                  ).toFixed(1)}
                                  {restaurant.user_ratings_total != null && (
                                    <span className="font-medium text-[#95879a]">
                                      ({restaurant.user_ratings_total})
                                    </span>
                                  )}
                                </span>
                              )}

                              {Number.isFinite(distance) && (
                                <span className="inline-flex items-center gap-1 text-[#776b7c]">
                                  <span className="text-[7px]">◉</span>
                                  {distance.toFixed(1)} กม.
                                </span>
                              )}
                            </div>

                            {openingLabel && (
                              <div
                                className={`
                                  mt-[3px] flex items-center gap-1 text-[8.5px] font-medium leading-none
                                  ${restaurant.open_now === true
                                    ? "text-emerald-600"
                                    : restaurant.open_now === false
                                      ? "text-rose-500"
                                      : "text-[#756977]"}
                                `}
                              >
                                <Clock3 size={9} />
                                <span className="truncate">
                                  {openingLabel}
                                </span>
                              </div>
                            )}
                          </div>

                          {routeUrl && (
                            <a
                              href={routeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="
                                inline-flex
                                h-[30px]
                                shrink-0
                                items-center
                                gap-1.5
                                rounded-full
                                bg-[#f7f1f9]
                                px-3
                                text-[9px]
                                font-semibold
                                text-[#6d3972]
                                transition
                                hover:bg-[#efe4f2]
                              "
                            >
                              <Navigation size={11} />
                              ดูเส้นทาง
                            </a>
                          )}
                        </article>
                      );
                    })}
                </section>
              )}

              {relatedData.nearbyPlaces.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[15px] font-bold leading-none text-[#2f2946]">
                      สถานที่ใกล้เคียง
                    </h2>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7a3f80] hover:text-[#5B3A61]"
                    >
                      ดูทั้งหมด
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>

                  {relatedData.nearbyPlaces
                    .slice(0, 1)
                    .map((place) => {
                      const image =
                        imageFor(place);

                      return (
                        <article
                          key={place.att_id}
                          className="
                            flex
                            min-h-[86px]
                            items-center
                            gap-2.5
                            rounded-[12px]
                            border border-[#ece5ee]
                            bg-white
                            p-2
                            shadow-[0_3px_10px_rgba(72,54,80,0.05)]
                          "
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openRelatedAttraction(place)
                            }
                            className="h-[70px] w-[82px] shrink-0 overflow-hidden rounded-[9px] bg-[#f2edf3]"
                          >
                            {image ? (
                              <img
                                src={image}
                                alt={
                                  place.name_th ??
                                  place.name_en ??
                                  ""
                                }
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#b3a7b5]">
                                <MapPin size={20} />
                              </div>
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() =>
                                openRelatedAttraction(place)
                              }
                              className="line-clamp-1 text-left text-[11px] font-bold leading-[14px] text-[#302a49] hover:text-[#6f456f]"
                            >
                              {place.name_th ??
                                place.name_en ??
                                "สถานที่ท่องเที่ยว"}
                            </button>

                            <div className="mt-[3px] flex items-center gap-1 text-[8.5px] font-medium leading-none text-[#75677b]">
                              <MapPin size={9} />
                              {Number.isFinite(
                                Number(place.distance)
                              )
                                ? `${Number(
                                    place.distance
                                  ).toFixed(1)} กม.`
                                : ""}
                            </div>

                            {hasValue(
                              place.detail_th ??
                              place.highlight
                            ) && (
                              <p className="mt-1 line-clamp-2 text-[8.5px] leading-[12px] text-[#8a7d8e]">
                                {String(
                                  place.detail_th ??
                                  place.highlight
                                )}
                              </p>
                            )}
                          </div>

                          {onAddToTrip && (
                            <button
                              type="button"
                              onClick={() =>
                                onAddToTrip({
                                  type: "attraction",
                                  data: place,
                                })
                              }
                              className="
                                inline-flex
                                h-[30px]
                                shrink-0
                                items-center
                                gap-1.5
                                rounded-full
                                bg-[#f4e9f6]
                                px-3
                                text-[9px]
                                font-semibold
                                text-[#703c76]
                                transition
                                hover:bg-[#ecdef0]
                              "
                            >
                              <Plus size={11} />
                              เพิ่มลงทริป
                            </button>
                          )}
                        </article>
                      );
                    })}
                </section>
              )}
            </div>
          )}

          {(hasValue(description) ||
            address ||
            website ||
            phone) && (
            <section className="mt-6 rounded-[18px] border border-[#eee7ef] bg-[#fcfafc] p-4">
              <h2 className="text-base font-bold text-[#30294a]">
                เกี่ยวกับสถานที่
              </h2>

              {hasValue(description) && (
                <>
                  <p
                    className={`
                      mt-2 whitespace-pre-line text-sm leading-6 text-[#625767]
                      ${!descriptionExpanded &&
                      longDescription
                        ? "line-clamp-3"
                        : ""}
                    `}
                  >
                    {String(description)}
                  </p>

                  {longDescription && (
                    <button
                      type="button"
                      onClick={() =>
                        setDescriptionExpanded(
                          (value) => !value
                        )
                      }
                      className="mt-1.5 text-xs font-semibold text-[#6f456f]"
                    >
                      {descriptionExpanded
                        ? "ย่อรายละเอียด"
                        : "อ่านเพิ่มเติม"}
                    </button>
                  )}
                </>
              )}

              {(address ||
                website ||
                phone) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {address && (
                    <InfoItem
                      icon={<MapPin size={18} />}
                      label="ที่อยู่"
                      value={address}
                      href={mapsUrl}
                    />
                  )}

                  {website && (
                    <InfoItem
                      icon={<Globe2 size={18} />}
                      label="เว็บไซต์"
                      value={String(
                        websiteValue
                      )}
                      href={website}
                    />
                  )}

                  {phone && (
                    <InfoItem
                      icon={<Phone size={18} />}
                      label="โทรศัพท์"
                      value={String(phone)}
                      href={`tel:${phone}`}
                    />
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <div
          className="sticky bottom-0 z-40 border-t border-[#e9e1ea] bg-[#fffdfb]/96 px-4 pt-2.5 shadow-[0_-10px_30px_rgba(72,54,80,0.08)] backdrop-blur-xl sm:px-5"
          style={{
            paddingBottom:
              "max(10px, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto grid w-full max-w-[930px] grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={
                !record ||
                !onAddToTrip ||
                type !== "attraction"
              }
              onClick={() => {
                if (
                  record &&
                  onAddToTrip &&
                  type === "attraction"
                ) {
                  onAddToTrip({
                    type,
                    data: record,
                  });
                }
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] bg-[#f4ebf6] px-5 text-sm font-semibold text-[#6e3b74] transition hover:bg-[#ebdef0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />
              เพิ่มสถานที่นี้ลงในทริป
            </button>

            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] bg-[#67276b] px-5 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(91,58,97,0.22)] transition hover:bg-[#743479]"
              >
                <Navigation size={17} />
                นำทางด้วย Google Maps
              </a>
            ) : (
              <div />
            )}
          </div>
        </div>

        {showPhotoViewer && images.length > 0 && (
          <div className="fixed inset-0 z-[500] bg-[#18131d]/90 p-4 backdrop-blur-md sm:p-6">
            <button
              type="button"
              onClick={() =>
                setShowPhotoViewer(false)
              }
              className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#4b354f] shadow-lg"
              aria-label="ปิดรูปภาพ"
            >
              <X size={20} />
            </button>

            <div className="mx-auto flex h-full max-w-6xl flex-col">
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <img
                  src={selectedImage}
                  alt={title}
                  className="max-h-full max-w-full rounded-2xl object-contain"
                />
              </div>

              {images.length > 1 && (
                <div className="mt-4 flex shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map(
                    (image, index) => (
                      <button
                        key={`${image}-viewer-${index}`}
                        type="button"
                        onClick={() =>
                          setMainImageIndex(index)
                        }
                        className={`
                          h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2
                          ${mainImageIndex === index
                            ? "border-white"
                            : "border-transparent opacity-65"}
                        `}
                      >
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
