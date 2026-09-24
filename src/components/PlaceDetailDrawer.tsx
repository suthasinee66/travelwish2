import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudSun,
  ExternalLink,
  Globe2,
  Heart,
  Hotel,
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

  const today =
    Array.isArray(
      restaurant
        ?.weekday_descriptions
    )
      ? restaurant
          .weekday_descriptions[0]
      : null;

  return hasValue(today)
    ? String(today)
    : null;
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
      label: "ภาพรวม",
    },
    {
      id: "reviews",
      label: "รีวิว",
    },
    {
      id: "location",
      label: "ตำแหน่ง",
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
          absolute inset-0 bg-[#241b2a]/35 backdrop-blur-[3px]
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
          border-l border-white/70
          bg-[radial-gradient(circle_at_86%_8%,rgba(232,218,238,0.72),transparent_26%),radial-gradient(circle_at_10%_42%,rgba(250,231,237,0.55),transparent_24%),#fffdfb]
          shadow-[-34px_0_90px_rgba(52,35,60,0.24)]
          transition-transform duration-300 ease-out
          sm:w-[min(920px,94vw)]
          lg:w-[min(980px,74vw)]
          ${open
            ? "translate-x-0"
            : "translate-x-full"}
        `}
      >
        <div className="sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-white/70 bg-[#fffdfb]/82 px-4 shadow-[0_10px_32px_rgba(72,54,80,0.06)] backdrop-blur-2xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/90 text-[#47374c] shadow-[0_7px_20px_rgba(72,54,80,0.09)] transition duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-95"
              aria-label="ปิด"
            >
              <X size={20} />
            </button>

            <div className="hidden sm:block">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#aa9cad]">
                TravelWise · Place detail
              </div>
              <div className="mt-0.5 max-w-[260px] truncate text-sm font-semibold text-[#4c3f50]">
                {title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <div className="hidden rounded-full bg-[#f6f1f7] px-3 py-1.5 text-[11px] font-medium text-[#8d7d91] md:block">
                กำลังโหลดข้อมูล...
              </div>
            )}

            {type === "attraction" && data?.att_id && (
              <button
                type="button"
                onClick={handleToggleSaved}
                disabled={saving}
                className={`
                  inline-flex h-10 items-center gap-2 rounded-full
                  border px-3.5 text-sm font-semibold shadow-sm transition
                  disabled:cursor-wait disabled:opacity-70
                  ${isSaved
                    ? "border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"
                    : "border-[#e6dde8] bg-white text-[#5b3a61] hover:bg-[#f7f2f8]"}
                `}
                aria-label={
                  isSaved
                    ? "นำออกจากรายการบันทึก"
                    : "บันทึกสถานที่"
                }
              >
                <Heart
                  size={16}
                  fill={
                    isSaved
                      ? "currentColor"
                      : "none"
                  }
                />
                <span className="hidden sm:inline">
                  {saving
                    ? "กำลังบันทึก..."
                    : isSaved
                      ? "บันทึกแล้ว"
                      : "บันทึก"}
                </span>
              </button>
            )}

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#5B3A61] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(91,58,97,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#68466e] active:scale-[0.98]"
              >
                <MapPin size={16} />
                <span className="hidden sm:inline">
                  เปิดแผนที่
                </span>
              </a>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[920px] px-4 pb-40 pt-6 sm:px-7 sm:pt-8 lg:px-8">
          <section className="relative">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#eadfeb] bg-white/72 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#765b7c] shadow-sm backdrop-blur-md">
                  <Sparkles size={13} />
                  TRAVELWISE DISCOVERY
                </div>

                <h1 className="max-w-[720px] text-[30px] font-bold leading-[1.16] tracking-[-0.035em] text-[#2c2230] sm:text-[40px]">
                  {title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#837587]">
                  {locationSummary && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur-md">
                      <MapPin size={14} className="text-[#6f456f]" />
                      {locationSummary}
                    </span>
                  )}

                  {rating != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff6dd] px-3 py-1.5 font-semibold text-[#6e531f] shadow-sm">
                      <Star size={14} fill="currentColor" />
                      {rating.toFixed(1)}
                      {reviewCount && (
                        <span className="font-medium text-[#9a7d45]">
                          · {reviewCount} รีวิว
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5B3A61] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_7px_18px_rgba(91,58,97,0.18)]">
                    <TypeIcon size={13} />
                    {typeLabel}
                  </span>

                  {categoryChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-xs font-medium text-[#6d5d71] shadow-sm backdrop-blur-md"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 sm:mt-7">
            {selectedImage ? (
              <div>
                <div
                  {...swipeProps(
                    changeImage,
                    images.length > 1
                  )}
                  className="
                    group relative isolate overflow-hidden
                    rounded-[28px] border border-white/75
                    bg-[#ece5ee]
                    shadow-[0_26px_70px_rgba(67,46,76,0.18)]
                    touch-pan-y sm:rounded-[32px]
                  "
                >
                  <img
                    src={selectedImage}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="
                      absolute inset-0 -z-10 h-full w-full
                      scale-110 select-none object-cover
                      opacity-30 blur-3xl
                    "
                  />

                  <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-[16/9]">
                    <img
                      src={selectedImage}
                      alt={title}
                      draggable={false}
                      className="
                        h-full w-full select-none object-cover
                        transition-transform duration-700
                        sm:group-hover:scale-[1.025]
                      "
                    />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#221827]/70 via-transparent to-black/15" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#241a29]/85 via-[#241a29]/28 to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 sm:bottom-5 sm:left-5 sm:right-5">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-xl">
                          <TypeIcon size={12} />
                          {typeLabel}
                        </div>

                        {hasValue(data?.highlight) && (
                          <p className="mt-2 line-clamp-2 max-w-[560px] text-sm font-medium leading-6 text-white/90 sm:text-[15px]">
                            {String(data.highlight)}
                          </p>
                        )}
                      </div>

                      {images.length > 1 && (
                        <div className="shrink-0 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xl">
                          {mainImageIndex + 1} / {images.length}
                        </div>
                      )}
                    </div>
                  </div>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          changeImage("prev");
                        }}
                        className="
                          absolute left-4 top-1/2 hidden
                          h-11 w-11 -translate-y-1/2
                          items-center justify-center
                          rounded-full border border-white/75
                          bg-white/88 text-[#3f3545]
                          shadow-[0_12px_30px_rgba(35,25,39,0.22)]
                          opacity-0 backdrop-blur-xl transition-all
                          hover:scale-105 hover:bg-white
                          group-hover:opacity-100
                          sm:flex
                        "
                        aria-label="รูปก่อนหน้า"
                      >
                        <ChevronLeft size={21} />
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          changeImage("next");
                        }}
                        className="
                          absolute right-4 top-1/2 hidden
                          h-11 w-11 -translate-y-1/2
                          items-center justify-center
                          rounded-full border border-white/75
                          bg-white/88 text-[#3f3545]
                          shadow-[0_12px_30px_rgba(35,25,39,0.22)]
                          opacity-0 backdrop-blur-xl transition-all
                          hover:scale-105 hover:bg-white
                          group-hover:opacity-100
                          sm:flex
                        "
                        aria-label="รูปถัดไป"
                      >
                        <ChevronRight size={21} />
                      </button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div
                    className="
                      mt-3 flex snap-x snap-mandatory gap-2.5
                      overflow-x-auto px-1 pb-2 pt-1
                      [scrollbar-width:none]
                      [&::-webkit-scrollbar]:hidden
                    "
                    aria-label="รูปทั้งหมด"
                  >
                    {images.map((image, index) => {
                      const active =
                        index === mainImageIndex;

                      return (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() =>
                            setMainImageIndex(index)
                          }
                          aria-label={`ดูรูปที่ ${index + 1}`}
                          aria-current={
                            active ? "true" : undefined
                          }
                          className={`
                            relative h-[66px] w-[90px]
                            shrink-0 snap-start overflow-hidden
                            rounded-[16px] bg-[#eee8ef]
                            transition-all duration-200
                            sm:h-[78px] sm:w-[112px]
                            ${active
                              ? "scale-[1.02] ring-2 ring-[#5B3A61] ring-offset-2 ring-offset-[#fffdfb]"
                              : "opacity-65 hover:-translate-y-0.5 hover:opacity-100"}
                          `}
                        >
                          <img
                            src={image}
                            alt=""
                            draggable={false}
                            loading="lazy"
                            className="h-full w-full select-none object-cover"
                          />
                          {active && (
                            <span className="pointer-events-none absolute inset-0 bg-[#5B3A61]/5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {images.length > 1 && (
                  <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-medium text-[#aa9cad] sm:hidden">
                    <span className="h-1 w-7 rounded-full bg-[#ddd1e0]" />
                    ปัดรูปเพื่อดูเพิ่มเติม
                    <span className="h-1 w-7 rounded-full bg-[#ddd1e0]" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-[16/8] max-h-[360px] items-center justify-center rounded-[30px] border border-white/80 bg-gradient-to-br from-[#f8f2f8] via-[#f3ecf5] to-[#eee6ef] text-[#9c8fa0] shadow-[0_20px_55px_rgba(72,54,80,0.09)]">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/80 shadow-[0_10px_26px_rgba(72,54,80,0.08)]">
                    <TypeIcon size={30} strokeWidth={1.4} />
                  </div>
                  <span className="text-xs font-medium text-[#9a8da0]">
                    ยังไม่มีรูปภาพสำหรับสถานที่นี้
                  </span>
                </div>
              </div>
            )}
          </section>

          <nav className="sticky top-[76px] z-30 -mx-4 mt-7 flex gap-2 border-y border-white/75 bg-[#fffdfb]/88 px-4 py-2 shadow-[0_10px_28px_rgba(72,54,80,0.04)] backdrop-blur-2xl sm:-mx-7 sm:px-7 lg:-mx-8 lg:px-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`
                  relative rounded-full px-4 py-2.5 text-sm font-semibold transition-all
                  ${activeTab === tab.id
                    ? "bg-[#5B3A61] text-white shadow-[0_8px_18px_rgba(91,58,97,0.18)]"
                    : "text-[#8d818f] hover:bg-white hover:text-[#554b58]"}
                `}
              >
                {tab.label}

                {activeTab === tab.id && (
                  <span className="sr-only">แท็บที่กำลังเปิด</span>
                )}
              </button>
            ))}
          </nav>

          {activeTab === "overview" && (
            <div className="pt-7">
              <section className="mb-8 rounded-[28px] border border-white/80 bg-white/62 p-4 shadow-[0_18px_50px_rgba(72,54,80,0.06)] backdrop-blur-xl sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f2eaf3] text-[#5B3A61]">
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#302833]">
                      ภาพรวม
                    </h2>
                    <p className="text-xs text-[#9a8d9d]">
                      ข้อมูลสำคัญสำหรับวางแผนการเที่ยว
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    {
                      icon: <Clock3 size={18} />,
                      label: "เวลาที่แนะนำ",
                      value:
                        cleanText(data?.opening_hours) ||
                        cleanText(data?.open_time) ||
                        "ตรวจสอบก่อนเดินทาง",
                    },
                    {
                      icon: <Trees size={18} />,
                      label: "บรรยากาศ",
                      value:
                        cleanText(data?.atmosphere) ||
                        cleanText(data?.activity) ||
                        "เหมาะกับการพักผ่อน",
                    },
                    {
                      icon: <WalletCards size={18} />,
                      label: "งบประมาณ",
                      value:
                        cleanText(data?.budget) ||
                        cleanText(data?.accom_price_name) ||
                        "ขึ้นอยู่กับกิจกรรม",
                    },
                    {
                      icon: <Clock3 size={18} />,
                      label: "ระยะเวลา",
                      value:
                        cleanText(data?.suitable_duration) ||
                        "ประมาณ 1–2 ชั่วโมง",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="group rounded-[22px] border border-[#eee5ef] bg-gradient-to-br from-white via-white to-[#f7f1f8] p-4 shadow-[0_10px_30px_rgba(72,54,80,0.055)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(72,54,80,0.10)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#efe5f1] text-[#5B3A61] shadow-inner transition group-hover:scale-105">
                        {item.icon}
                      </div>
                      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9c8fa0]">
                        {item.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-5 text-[#4a404d]">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {hasValue(description) && (
                <section className="rounded-[26px] border border-white/80 bg-white/58 p-5 shadow-[0_12px_34px_rgba(72,54,80,0.045)] backdrop-blur-lg sm:p-6">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.13em] text-[#a092a4]">
                    ABOUT THIS PLACE
                  </div>
                  <p
                    className={`
                      whitespace-pre-line text-[15px] leading-7 text-[#564c59]
                      ${!descriptionExpanded &&
                      longDescription
                        ? "line-clamp-6"
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
                      className="mt-2 text-sm font-semibold text-[#573d63] hover:underline"
                    >
                      {descriptionExpanded
                        ? "ย่อรายละเอียด"
                        : "อ่านเพิ่มเติม"}
                    </button>
                  )}
                </section>
              )}

              {(address ||
                website ||
                phone) && (
                <section className="mt-6 rounded-[26px] border border-white/80 bg-white/72 p-2 shadow-[0_16px_42px_rgba(72,54,80,0.06)] backdrop-blur-xl">
                  <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-[#eee8ef]">
                    <div className="space-y-1">
                      {address && (
                        <InfoItem
                          icon={
                            <MapPin
                              size={19}
                            />
                          }
                          label="Address"
                          value={address}
                          href={mapsUrl}
                        />
                      )}
                    </div>

                    <div className="space-y-1 sm:pl-2">
                      {website && (
                        <InfoItem
                          icon={
                            <Globe2
                              size={19}
                            />
                          }
                          label="Website"
                          value={String(
                            websiteValue
                          )}
                          href={website}
                        />
                      )}

                      {phone && (
                        <InfoItem
                          icon={
                            <Phone
                              size={19}
                            />
                          }
                          label="Phone"
                          value={String(phone)}
                          href={`tel:${phone}`}
                        />
                      )}
                    </div>
                  </div>

                  {mapsUrl && address && (
                    <div className="px-3 pb-3 pt-1">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e6dee8] bg-[#fcfafc] px-3.5 py-2 text-xs font-semibold text-[#574d5a] transition hover:bg-[#f5eff6]"
                      >
                        <MapPin size={14} />
                        เปิดใน Google Maps
                        <ExternalLink
                          size={13}
                        />
                      </a>
                    </div>
                  )}
                </section>
              )}

              {type === "attraction" && (
                <>
                  <section className="mt-10">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-[#302833]">
                          สภาพอากาศวันนี้
                        </h2>
                        <p className="mt-1 text-xs text-[#988b9b]">
                          อ้างอิงจากพิกัดจริงของสถานที่
                        </p>
                      </div>

                      {relatedLoading && (
                        <span className="text-xs font-medium text-[#9a8da0]">
                          กำลังอัปเดต...
                        </span>
                      )}
                    </div>

                    {relatedData.weather ? (
                      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[radial-gradient(circle_at_90%_20%,rgba(255,215,170,0.48),transparent_28%),radial-gradient(circle_at_10%_80%,rgba(211,196,233,0.60),transparent_30%),linear-gradient(135deg,#faf7fb,#f1ebf5)] p-5 shadow-[0_22px_55px_rgba(91,72,117,0.12)] sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/80 bg-white/84 text-[#5B3A61] shadow-[0_12px_28px_rgba(91,72,117,0.10)] backdrop-blur-xl">
                              <CloudSun size={28} />
                            </div>

                            <div>
                              <div className="text-5xl font-bold tracking-[-0.055em] text-[#49334f]">
                                {relatedData.weather.temperature != null
                                  ? `${Math.round(relatedData.weather.temperature)}°C`
                                  : "—"}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-[#66596a]">
                                {relatedData.weather.condition}
                              </div>
                            </div>
                          </div>

                          <div className="grid min-w-[220px] grid-cols-2 gap-3 text-sm">
                            <div className="rounded-2xl bg-white/75 p-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a093a4]">
                                โอกาสฝน
                              </div>
                              <div className="mt-1 font-bold text-[#49334f]">
                                {relatedData.weather.rainChance != null
                                  ? `${relatedData.weather.rainChance}%`
                                  : "—"}
                              </div>
                            </div>

                            <div className="rounded-2xl bg-white/75 p-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a093a4]">
                                ช่วงแนะนำ
                              </div>
                              <div className="mt-1 font-bold leading-5 text-[#49334f]">
                                {relatedData.weather.recommendedTime}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-sm leading-6 text-[#655968]">
                          {relatedData.weather.advice}
                        </div>
                      </div>
                    ) : !relatedLoading ? (
                      <div className="rounded-[22px] border border-dashed border-[#ded3e1] bg-[#fcfafc] px-5 py-6 text-sm text-[#948798]">
                        ยังไม่สามารถโหลดสภาพอากาศจากพิกัดของสถานที่นี้ได้
                      </div>
                    ) : (
                      <div className="h-40 animate-pulse rounded-[24px] bg-[#f2edf4]" />
                    )}
                  </section>

                  {relatedData.similarPlaces.length > 0 && (
                    <section className="mt-9">
                      <div className="mb-4 flex items-end justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-[#302833]">
                            สถานที่คล้ายกัน
                          </h2>
                          <p className="mt-1 text-xs text-[#988b9b]">
                            เทียบจากประเภท กิจกรรม และบรรยากาศในฐานข้อมูล TravelWise
                          </p>
                        </div>
                      </div>

                      <div className="flex snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {relatedData.similarPlaces.map((place) => {
                          const image = imageFor(place);
                          const placeTags = [
                            ...(
                              Array.isArray(place?.travel_type)
                                ? place.travel_type
                                : []
                            ),
                            ...(
                              Array.isArray(place?.category)
                                ? place.category
                                : []
                            ),
                          ]
                            .filter(Boolean)
                            .slice(0, 2);

                          return (
                            <article
                              key={place.att_id}
                              className="group w-[244px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-white/85 bg-white/82 shadow-[0_14px_34px_rgba(72,54,80,0.08)] backdrop-blur-xl transition duration-200 hover:-translate-y-1.5 hover:shadow-[0_22px_44px_rgba(72,54,80,0.14)]"
                            >
                              <div className="h-36 overflow-hidden bg-[#f1edf2]">
                                {image ? (
                                  <img
                                    src={image}
                                    alt={
                                      place.name_th ??
                                      place.name_en ??
                                      ""
                                    }
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[#a493a8]">
                                    <Building2 size={28} />
                                  </div>
                                )}
                              </div>

                              <div className="p-3.5">
                                <h3 className="line-clamp-1 text-sm font-bold text-[#413644]">
                                  {place.name_th ??
                                    place.name_en ??
                                    "สถานที่ท่องเที่ยว"}
                                </h3>
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-[#948798]">
                                  <MapPin size={12} />
                                  {place.province ?? "Thailand"}
                                </div>

                                {placeTags.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {placeTags.map((tag: string) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-[#f5eff6] px-2 py-1 text-[10px] font-medium text-[#6d5572]"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    openRelatedAttraction(place)
                                  }
                                  className="mt-3 text-xs font-bold text-[#5B3A61] hover:underline"
                                >
                                  ดูรายละเอียด →
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {relatedData.nearbyRestaurants.length > 0 && (
                    <section className="mt-9">
                      <div className="mb-4">
                        <h2 className="text-lg font-bold text-[#302833]">
                          ร้านอาหารใกล้เคียง
                        </h2>
                        <p className="mt-1 text-xs text-[#988b9b]">
                          ค้นจากร้านอาหารใกล้พิกัดสถานที่ และใช้ข้อมูล cache เมื่อจำเป็น
                        </p>
                      </div>

                      <div className="space-y-3">
                        {relatedData.nearbyRestaurants.map((restaurant) => {
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
                              className="group flex gap-3 rounded-[24px] border border-white/85 bg-white/78 p-3 shadow-[0_12px_32px_rgba(72,54,80,0.07)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(72,54,80,0.11)]"
                            >
                              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[17px] bg-[#f1edf2] sm:h-28 sm:w-28">
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
                                  <div className="flex h-full items-center justify-center text-[#a493a8]">
                                    <Utensils size={24} />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 py-0.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="line-clamp-1 text-sm font-bold text-[#413644]">
                                      {restaurant.place_name_th ??
                                        restaurant.place_name_en ??
                                        "ร้านอาหาร"}
                                    </h3>
                                    <p className="mt-1 text-xs text-[#8f8292]">
                                      {String(
                                        restaurant.place_type ??
                                        "restaurant"
                                      ).replaceAll("_", " ")}
                                      {Number.isFinite(distance)
                                        ? ` · ${distance.toFixed(1)} กม.`
                                        : ""}
                                    </p>

                                    {openingLabel && (
                                      <p
                                        className={`
                                          mt-1 text-xs font-semibold
                                          ${restaurant.open_now === true
                                            ? "text-emerald-600"
                                            : restaurant.open_now === false
                                              ? "text-rose-500"
                                              : "text-[#756977]"}
                                        `}
                                      >
                                        {openingLabel}
                                      </p>
                                    )}
                                  </div>

                                  {restaurant.rating != null && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5dc] px-2 py-1 text-[11px] font-bold text-[#7b5a19]">
                                      <Star
                                        size={11}
                                        fill="currentColor"
                                      />
                                      {Number(
                                        restaurant.rating
                                      ).toFixed(1)}
                                    </span>
                                  )}
                                </div>

                                {routeUrl && (
                                  <a
                                    href={routeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#e4d9e6] bg-[#fbf8fc] px-3 py-2 text-xs font-bold text-[#5B3A61] transition hover:bg-[#f3ebf5]"
                                  >
                                    <Navigation size={13} />
                                    ดูเส้นทาง
                                  </a>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {relatedData.nearbyPlaces.length > 0 && (
                    <section className="mt-9">
                      <div className="mb-4">
                        <h2 className="text-lg font-bold text-[#302833]">
                          สถานที่ใกล้เคียง
                        </h2>
                        <p className="mt-1 text-xs text-[#988b9b]">
                          คำนวณระยะทางจากพิกัดสถานที่ในฐานข้อมูล
                        </p>
                      </div>

                      <div className="space-y-3">
                        {relatedData.nearbyPlaces
                          .slice(0, 4)
                          .map((place) => {
                            const image =
                              imageFor(place);

                            return (
                              <article
                                key={place.att_id}
                                className="group flex gap-3 rounded-[24px] border border-white/85 bg-white/78 p-3 shadow-[0_12px_32px_rgba(72,54,80,0.07)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(72,54,80,0.11)]"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    openRelatedAttraction(place)
                                  }
                                  className="h-24 w-24 shrink-0 overflow-hidden rounded-[17px] bg-[#f1edf2] sm:h-28 sm:w-28"
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
                                    <div className="flex h-full items-center justify-center text-[#a493a8]">
                                      <MapPin size={24} />
                                    </div>
                                  )}
                                </button>

                                <div className="min-w-0 flex-1 py-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openRelatedAttraction(place)
                                    }
                                    className="line-clamp-1 text-left text-sm font-bold text-[#413644] hover:text-[#5B3A61]"
                                  >
                                    {place.name_th ??
                                      place.name_en ??
                                      "สถานที่ท่องเที่ยว"}
                                  </button>

                                  <div className="mt-1 text-xs font-semibold text-[#6f456f]">
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
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#8c7f8f]">
                                      {String(
                                        place.detail_th ??
                                          place.highlight
                                      )}
                                    </p>
                                  )}

                                  {onAddToTrip && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onAddToTrip({
                                          type: "attraction",
                                          data: place,
                                        })
                                      }
                                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#f3ebf5] px-3 py-2 text-xs font-bold text-[#5B3A61] transition hover:bg-[#eaddec]"
                                    >
                                      <Plus size={13} />
                                      เพิ่มลงทริป
                                    </button>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                      </div>
                    </section>
                  )}
                </>
              )}

              {!hasValue(description) &&
                !address &&
                !website &&
                !phone &&
                type !== "attraction" && (
                  <EmptyState>
                    ยังไม่มีข้อมูล Overview
                    เพิ่มเติมสำหรับสถานที่นี้
                  </EmptyState>
                )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="pt-6">
              {rating != null ? (
                <section className="rounded-[28px] border border-white/85 bg-white/76 p-5 shadow-[0_18px_44px_rgba(72,54,80,0.07)] backdrop-blur-xl sm:p-6">
                  <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                    <div className="text-5xl font-bold tracking-[-0.04em] text-[#241f26]">
                      {rating.toFixed(1)}
                    </div>

                    <div className="pb-1">
                      <div className="flex items-center gap-1">
                        <Star
                          size={17}
                          fill="#d8a536"
                          className="text-[#d8a536]"
                        />
                        <span className="text-sm font-semibold text-[#443b47]">
                          {rating >= 4.5
                            ? "Excellent"
                            : rating >= 4
                              ? "Very good"
                              : rating >= 3
                                ? "Good"
                                : "Rating"}
                        </span>
                      </div>

                      {reviewCount && (
                        <div className="mt-1 text-sm text-[#918593]">
                          {reviewCount} reviews
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="mt-5 max-w-2xl text-sm leading-7 text-[#746a77]">
                    คะแนนและจำนวนรีวิวนี้มาจากข้อมูลของสถานที่ที่บันทึกไว้ในระบบ TravelWise
                  </p>
                </section>
              ) : (
                <EmptyState>
                  ยังไม่มีคะแนนรีวิวสำหรับสถานที่นี้
                </EmptyState>
              )}
            </div>
          )}

          {activeTab === "location" && (
            <div className="pt-6">
              {address || mapsUrl ? (
                <section className="overflow-hidden rounded-[28px] border border-white/85 bg-white/76 shadow-[0_18px_44px_rgba(72,54,80,0.07)] backdrop-blur-xl">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3eef4] text-[#6f456f]">
                        <MapPin size={19} />
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9b8f9e]">
                          Location
                        </div>

                        {address && (
                          <div className="mt-1.5 text-sm font-medium leading-7 text-[#4e4453]">
                            {address}
                          </div>
                        )}

                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#573d63] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#684974]"
                          >
                            <MapPin
                              size={15}
                            />
                            Get directions
                            <ExternalLink
                              size={14}
                            />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <EmptyState>
                  ยังไม่มีข้อมูลตำแหน่งของสถานที่นี้
                </EmptyState>
              )}
            </div>
          )}

          {type === "attraction" &&
            hasValue(
              data?.suitable_duration
            ) && (
              <div className="mt-6 flex items-center gap-2 text-xs text-[#998d9c]">
                <Clock3 size={14} />
                ระยะเวลาที่เหมาะสม:{" "}
                {cleanText(
                  data.suitable_duration
                )}
              </div>
            )}
        </div>

        <div className="sticky bottom-0 z-40 border-t border-white/75 bg-[#fffdfb]/86 px-4 pt-3 shadow-[0_-20px_46px_rgba(72,54,80,0.10)] backdrop-blur-2xl sm:px-6"
             style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex w-full max-w-[920px] flex-col gap-2.5 sm:flex-row sm:gap-3">
            <button
              type="button"
              disabled={!record || !onAddToTrip}
              onClick={() => {
                if (record && onAddToTrip) {
                  onAddToTrip({
                    type,
                    data: record,
                  });
                }
              }}
              className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[18px] bg-[#5B3A61] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(91,58,97,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#68466e] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={17} />
              เพิ่มสถานที่นี้ลงในทริป
            </button>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[18px] border border-[#dfd4e2] bg-white/90 px-5 text-sm font-semibold text-[#5B3A61] shadow-[0_8px_20px_rgba(72,54,80,0.07)] transition duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.99]"
              >
                <MapPin size={17} />
                นำทางด้วย Google Maps
              </a>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
