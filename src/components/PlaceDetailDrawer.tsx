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

function WeatherIllustration() {
  return (
    <div
      className="relative h-[66px] w-[78px] shrink-0"
      aria-hidden="true"
    >
      <div className="absolute left-[22px] top-[5px] h-[35px] w-[35px] rounded-full bg-[#FFC83D] shadow-[0_0_18px_rgba(255,200,61,0.28)]" />

      {Array.from({ length: 8 }).map(
        (_, index) => (
          <span
            key={index}
            className="absolute left-[38px] top-[21px] h-[2px] w-[11px] origin-[-10px_1px] rounded-full bg-[#F5B51B]"
            style={{
              transform: `rotate(${index * 45}deg) translateX(25px)`,
            }}
          />
        )
      )}

      <div className="absolute bottom-[4px] left-[5px] h-[28px] w-[58px] rounded-full border border-white bg-gradient-to-b from-white to-[#DFE4F2] shadow-[0_5px_10px_rgba(70,72,104,0.14)]" />
      <div className="absolute bottom-[21px] left-[14px] h-[28px] w-[29px] rounded-full border border-white bg-gradient-to-b from-white to-[#E4E8F4]" />
      <div className="absolute bottom-[18px] left-[34px] h-[24px] w-[27px] rounded-full border border-white bg-gradient-to-b from-white to-[#DCE1F0]" />
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

  const detailChips = useMemo(() => {
    const values: string[] = [];

    if (type === "attraction") {
      if (Array.isArray(data?.category)) {
        values.push(
          ...data.category
            .filter(hasValue)
            .map(String)
            .slice(0, 2)
        );
      }

      if (hasValue(data?.activity)) {
        values.push(
          cleanText(data.activity)
        );
      }

      const companions =
        Array.isArray(
          data?.travel_companion
        )
          ? data.travel_companion
          : hasValue(
                data?.travel_companion
              )
            ? [
                data.travel_companion,
              ]
            : [];

      if (companions.length > 0) {
        values.push(
          `เหมาะสำหรับ${String(
            companions[0]
          )}`
        );
      }

      if (
        hasValue(
          data?.suitable_duration
        )
      ) {
        values.push(
          cleanText(
            data.suitable_duration
          )
        );
      }
    } else {
      values.push(
        ...categoryChips
      );
    }

    return Array.from(
      new Set(
        values
          .map((value) =>
            value.trim()
          )
          .filter(Boolean)
      )
    ).slice(0, 4);
  }, [
    data,
    type,
    categoryChips,
  ]);

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
          bg-[#40304b]/34
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
          border-l border-[#E7E0E8]
          bg-[#FFFDFC]
          shadow-[-24px_0_70px_rgba(47,31,56,0.18)]
          transition-transform duration-300 ease-out
          sm:w-[min(930px,94vw)]
          lg:w-[min(930px,64vw)]
          xl:w-[min(960px,62vw)]
          ${open
            ? "translate-x-0"
            : "translate-x-full"}
        `}
      >
        <header className="sticky top-0 z-40 flex h-[62px] items-center justify-between border-b border-[#ECE5ED] bg-[#FFFDFC]/97 px-[18px] backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E6DEE8] bg-white text-[#5B3A61] shadow-[0_3px_10px_rgba(83,58,91,0.09)] transition hover:bg-[#FAF7FB] active:scale-95"
            aria-label="ปิด"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2">
            {loading && (
              <span className="hidden text-[11px] font-medium text-[#A091A4] md:inline">
                กำลังโหลด...
              </span>
            )}

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#67276B] px-4 text-[13px] font-semibold text-white shadow-[0_5px_14px_rgba(91,58,97,0.20)] transition hover:bg-[#743479]"
              >
                <MapPin size={15} />
                เปิดแผนที่
              </a>
            )}
          </div>
        </header>

        <div className="mx-auto w-full max-w-[930px] px-[18px] pb-[88px] pt-[17px] sm:px-6">
          <section>
            <h1 className="text-[31px] font-bold leading-[1.06] tracking-[-0.035em] text-[#25213F] sm:text-[34px]">
              {title}
            </h1>

            {locationSummary && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#695D72]">
                <MapPin
                  size={14}
                  className="text-[#5B3A61]"
                />
                <span>
                  {locationSummary}
                </span>
              </div>
            )}

            <div className="mt-[11px] flex flex-wrap items-center gap-[7px]">
              <span className="inline-flex h-[29px] items-center gap-1.5 rounded-full bg-[#F5E4F6] px-3 text-[11px] font-semibold text-[#743378]">
                <Building2 size={13} />
                {typeLabel}
              </span>

              {detailChips.map(
                (chip, index) => (
                  <span
                    key={chip}
                    className="inline-flex h-[29px] max-w-full items-center gap-1.5 rounded-full border border-[#ECE5EE] bg-[#FCFAFC] px-3 text-[11px] font-medium text-[#716477]"
                  >
                    {index ===
                      detailChips.length -
                        1 &&
                    type === "attraction" &&
                    hasValue(
                      data?.suitable_duration
                    ) ? (
                      <Clock3 size={12} />
                    ) : null}
                    <span className="truncate">
                      {chip}
                    </span>
                  </span>
                )
              )}
            </div>
          </section>

          <section className="mt-[13px]">
            {selectedImage ? (
              <div className="grid gap-[10px] lg:grid-cols-[minmax(0,1fr)_132px]">
                <div
                  {...swipeProps(
                    changeImage,
                    images.length > 1
                  )}
                  className="group relative overflow-hidden rounded-[17px] bg-[#ECE8EF] shadow-[0_7px_20px_rgba(68,48,77,0.10)] touch-pan-y"
                >
                  <div className="aspect-[16/8.15] w-full">
                    <img
                      src={selectedImage}
                      alt={title}
                      draggable={false}
                      className="h-full w-full select-none object-cover"
                    />
                  </div>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          changeImage("prev");
                        }}
                        className="absolute left-[14px] top-1/2 hidden h-[34px] w-[34px] -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 sm:flex"
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
                        className="absolute right-[14px] top-1/2 hidden h-[34px] w-[34px] -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 sm:flex"
                        aria-label="รูปถัดไป"
                      >
                        <ChevronRight size={20} />
                      </button>

                      <span className="absolute right-[14px] top-[14px] rounded-full bg-[#334159]/75 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                        {mainImageIndex + 1} / {images.length}
                      </span>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setShowPhotoViewer(true)
                    }
                    className="absolute bottom-[13px] left-[13px] inline-flex h-[30px] items-center gap-1.5 rounded-full bg-black/42 px-3 text-[11px] font-semibold text-white backdrop-blur-sm"
                  >
                    <Images size={13} />
                    ดูรูปภาพ
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPhotoViewer(true)
                    }
                    className="absolute bottom-[13px] right-[13px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-black/42 text-white backdrop-blur-sm"
                    aria-label="ขยายรูป"
                  >
                    <Maximize2 size={15} />
                  </button>
                </div>

                {images.length > 1 && (
                  <>
                    <div className="hidden h-full grid-rows-[repeat(4,minmax(0,1fr))_36px] gap-[7px] lg:grid">
                      {images
                        .slice(0, 4)
                        .map(
                          (
                            image,
                            index
                          ) => (
                            <button
                              key={`${image}-thumb-${index}`}
                              type="button"
                              onClick={() =>
                                setMainImageIndex(
                                  index
                                )
                              }
                              className={`
                                min-h-0 overflow-hidden rounded-[11px] border-2 bg-[#F1EDF3] transition
                                ${mainImageIndex === index
                                  ? "border-[#67276B]"
                                  : "border-transparent hover:border-[#DCCFE0]"}
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

                      <button
                        type="button"
                        onClick={() =>
                          setShowPhotoViewer(
                            true
                          )
                        }
                        className="flex items-center justify-center gap-1.5 rounded-[11px] bg-[#F6F1F7] text-[10px] font-semibold text-[#6E3A73]"
                      >
                        <Plus size={13} />
                        ดูรูปทั้งหมด
                      </button>
                    </div>

                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {images.map(
                        (
                          image,
                          index
                        ) => (
                          <button
                            key={`${image}-mobile-${index}`}
                            type="button"
                            onClick={() =>
                              setMainImageIndex(
                                index
                              )
                            }
                            className={`
                              h-[58px] w-[88px] shrink-0 overflow-hidden rounded-[10px] border-2
                              ${mainImageIndex === index
                                ? "border-[#67276B]"
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
              <div className="flex aspect-[16/8] items-center justify-center rounded-[17px] border border-dashed border-[#DDD4E0] bg-[#F8F4F8] text-[#9B8E9E]">
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
            <section className="mt-[12px]">
              {relatedData.weather ? (
                <div className="overflow-hidden rounded-[19px] bg-gradient-to-r from-[#F0EAFE] via-[#F7F2FC] to-[#FDEDF3] px-[18px] py-[14px] shadow-[0_6px_18px_rgba(91,58,97,0.06)]">
                  <div className="grid gap-4 sm:grid-cols-[1.08fr_1px_.88fr_1px_1.35fr] sm:items-center">
                    <div>
                      <div className="text-[15px] font-bold text-[#282444]">
                        สภาพอากาศวันนี้
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        <WeatherIllustration />

                        <div>
                          <div className="text-[34px] font-bold leading-none tracking-[-0.035em] text-[#2D294F]">
                            {relatedData.weather.temperature !=
                            null
                              ? `${Math.round(
                                  relatedData
                                    .weather
                                    .temperature
                                )}°C`
                              : "—"}
                          </div>
                          <div className="mt-1 text-[11px] font-medium text-[#5F5572]">
                            {
                              relatedData
                                .weather
                                .condition
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden h-[82px] bg-[#CFC2DB] sm:block" />

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2">
                        <CloudRain
                          size={17}
                          className="mt-0.5 text-[#4F3A75]"
                        />
                        <div>
                          <div className="text-[10px] text-[#73687B]">
                            โอกาสฝนตก
                          </div>
                          <div className="text-[12px] font-bold text-[#332D4D]">
                            {relatedData.weather.rainChance !=
                            null
                              ? `${relatedData.weather.rainChance}%`
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <CloudSun
                          size={17}
                          className="mt-0.5 text-[#F1A619]"
                        />
                        <div>
                          <div className="text-[10px] text-[#73687B]">
                            ช่วงเวลาที่แนะนำ
                          </div>
                          <div className="text-[12px] font-bold leading-4 text-[#332D4D]">
                            {
                              relatedData
                                .weather
                                .recommendedTime
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden h-[82px] bg-[#CFC2DB] sm:block" />

                    <div className="rounded-[14px] bg-[#FFF3F8]/82 px-3.5 py-3">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-[#6B3B72]">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFDDEA] text-[#C13A7C]">
                          <Lightbulb size={16} />
                        </span>
                        คำแนะนำ
                      </div>

                      <p className="mt-1 text-[11px] leading-[17px] text-[#62566A]">
                        {
                          relatedData
                            .weather
                            .advice
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : relatedLoading ? (
                <div className="h-[120px] animate-pulse rounded-[19px] bg-[#F2EDF4]" />
              ) : null}
            </section>
          )}

          {type === "attraction" &&
            relatedData.similarPlaces
              .length > 0 && (
              <section className="mt-[14px]">
                <div className="mb-[8px] flex items-center justify-between">
                  <h2 className="text-[16px] font-bold text-[#282444]">
                    สถานที่คล้ายกัน
                  </h2>

                  <span className="text-[11px] font-semibold text-[#723C78]">
                    ดูทั้งหมด&nbsp;&nbsp;→
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-[9px] sm:grid-cols-4">
                  {relatedData
                    .similarPlaces
                    .slice(0, 4)
                    .map((place) => {
                      const image =
                        imageFor(place);

                      const placeTags =
                        [
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
                          .filter(
                            Boolean
                          )
                          .slice(0, 2);

                      return (
                        <button
                          key={
                            place.att_id
                          }
                          type="button"
                          onClick={() =>
                            openRelatedAttraction(
                              place
                            )
                          }
                          className="group relative overflow-hidden rounded-[13px] border border-[#E9E2EB] bg-white text-left shadow-[0_4px_12px_rgba(72,54,80,0.05)] transition hover:-translate-y-0.5"
                        >
                          <div className="relative aspect-[16/7.3] overflow-hidden bg-[#F2EDF3]">
                            {image ? (
                              <img
                                src={image}
                                alt={
                                  place.name_th ??
                                  place.name_en ??
                                  ""
                                }
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#A89AAA]">
                                <Building2 size={22} />
                              </div>
                            )}

                            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/94 text-[#B43A83] shadow-sm">
                              <Heart size={14} />
                            </span>
                          </div>

                          <div className="p-[9px]">
                            <div className="line-clamp-1 text-[12px] font-bold text-[#302A49]">
                              {place.name_th ??
                                place.name_en ??
                                "สถานที่ท่องเที่ยว"}
                            </div>

                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#73677A]">
                              <MapPin size={10} />
                              {place.province ??
                                "Thailand"}
                            </div>

                            {placeTags.length >
                              0 && (
                              <div className="mt-1.5 flex gap-1 overflow-hidden">
                                {placeTags.map(
                                  (
                                    tag: string
                                  ) => (
                                    <span
                                      key={
                                        tag
                                      }
                                      className="max-w-[90px] truncate rounded-full bg-[#F5F0F7] px-2 py-[3px] text-[9px] font-medium text-[#76677B]"
                                    >
                                      {tag}
                                    </span>
                                  )
                                )}
                              </div>
                            )}

                            <div className="mt-2 rounded-full bg-[#F6EFF8] py-[5px] text-center text-[10px] font-semibold text-[#6A3770]">
                              ดูรายละเอียด&nbsp;&nbsp;→
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </section>
            )}

          {type === "attraction" && (
            <div className="mt-[15px] grid gap-4 lg:grid-cols-2">
              {relatedData
                .nearbyRestaurants
                .length > 0 && (
                <section>
                  <div className="mb-[8px] flex items-center justify-between">
                    <h2 className="text-[16px] font-bold text-[#282444]">
                      ร้านอาหารใกล้เคียง
                    </h2>
                    <span className="text-[11px] font-semibold text-[#723C78]">
                      ดูทั้งหมด&nbsp;&nbsp;→
                    </span>
                  </div>

                  {relatedData
                    .nearbyRestaurants
                    .slice(0, 1)
                    .map(
                      (
                        restaurant
                      ) => {
                        const image =
                          imageFor(
                            restaurant
                          );
                        const routeUrl =
                          mapsUrlFor(
                            restaurant
                          );
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
                            className="flex min-h-[90px] gap-[10px] rounded-[14px] border border-[#E9E2EB] bg-white p-[8px] shadow-[0_4px_12px_rgba(72,54,80,0.04)]"
                          >
                            <div className="h-[76px] w-[88px] shrink-0 overflow-hidden rounded-[10px] bg-[#F2EDF3]">
                              {image ? (
                                <img
                                  src={
                                    image
                                  }
                                  alt={
                                    restaurant.place_name_th ??
                                    restaurant.place_name_en ??
                                    ""
                                  }
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[#A89AAA]">
                                  <Utensils size={20} />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 py-0.5">
                              <h3 className="line-clamp-1 text-[12px] font-bold text-[#302A49]">
                                {restaurant.place_name_th ??
                                  restaurant.place_name_en ??
                                  "ร้านอาหาร"}
                              </h3>

                              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9.5px] text-[#746879]">
                                <span>
                                  {String(
                                    restaurant.place_type ??
                                      "restaurant"
                                  ).replaceAll(
                                    "_",
                                    " "
                                  )}
                                </span>

                                {Number.isFinite(
                                  distance
                                ) && (
                                  <span>
                                    ·{" "}
                                    {distance.toFixed(
                                      1
                                    )}{" "}
                                    กม.
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                {restaurant.rating !=
                                  null && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#664F1B]">
                                    <Star
                                      size={11}
                                      fill="#F2B735"
                                      className="text-[#F2B735]"
                                    />
                                    {Number(
                                      restaurant.rating
                                    ).toFixed(
                                      1
                                    )}
                                    {restaurant.user_ratings_total !=
                                      null && (
                                      <span className="font-medium text-[#8B7D8E]">
                                        (
                                        {
                                          restaurant.user_ratings_total
                                        }
                                        )
                                      </span>
                                    )}
                                  </span>
                                )}

                                {Number.isFinite(
                                  distance
                                ) && (
                                  <span className="text-[9.5px] text-[#716579]">
                                    ◉{" "}
                                    {distance.toFixed(
                                      1
                                    )}{" "}
                                    กม.
                                  </span>
                                )}
                              </div>

                              {openingLabel && (
                                <div
                                  className={`
                                    mt-0.5 text-[9.5px] font-medium
                                    ${restaurant.open_now === true
                                      ? "text-emerald-600"
                                      : restaurant.open_now === false
                                        ? "text-rose-500"
                                        : "text-[#746879]"}
                                  `}
                                >
                                  <Clock3 className="mr-1 inline" size={10} />
                                  {openingLabel}
                                </div>
                              )}
                            </div>

                            {routeUrl && (
                              <a
                                href={routeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="my-auto inline-flex h-[33px] shrink-0 items-center gap-1.5 rounded-full bg-[#F6EFF8] px-3 text-[10px] font-semibold text-[#6D3972]"
                              >
                                <Navigation size={12} />
                                ดูเส้นทาง
                              </a>
                            )}
                          </article>
                        );
                      }
                    )}
                </section>
              )}

              {relatedData
                .nearbyPlaces
                .length > 0 && (
                <section>
                  <div className="mb-[8px] flex items-center justify-between">
                    <h2 className="text-[16px] font-bold text-[#282444]">
                      สถานที่ใกล้เคียง
                    </h2>

                    <span className="text-[11px] font-semibold text-[#723C78]">
                      ดูทั้งหมด&nbsp;&nbsp;→
                    </span>
                  </div>

                  {relatedData
                    .nearbyPlaces
                    .slice(0, 1)
                    .map((place) => {
                      const image =
                        imageFor(place);

                      return (
                        <article
                          key={
                            place.att_id
                          }
                          className="flex min-h-[90px] gap-[10px] rounded-[14px] border border-[#E9E2EB] bg-white p-[8px] shadow-[0_4px_12px_rgba(72,54,80,0.04)]"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openRelatedAttraction(
                                place
                              )
                            }
                            className="h-[76px] w-[88px] shrink-0 overflow-hidden rounded-[10px] bg-[#F2EDF3]"
                          >
                            {image ? (
                              <img
                                src={
                                  image
                                }
                                alt={
                                  place.name_th ??
                                  place.name_en ??
                                  ""
                                }
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#A89AAA]">
                                <MapPin size={20} />
                              </div>
                            )}
                          </button>

                          <div className="min-w-0 flex-1 py-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                openRelatedAttraction(
                                  place
                                )
                              }
                              className="line-clamp-1 text-left text-[12px] font-bold text-[#302A49]"
                            >
                              {place.name_th ??
                                place.name_en ??
                                "สถานที่ท่องเที่ยว"}
                            </button>

                            <div className="mt-0.5 flex items-center gap-1 text-[9.5px] font-medium text-[#6E6274]">
                              <MapPin size={10} />
                              {Number.isFinite(
                                Number(
                                  place.distance
                                )
                              )
                                ? `${Number(
                                    place.distance
                                  ).toFixed(
                                    1
                                  )} กม.`
                                : ""}
                            </div>

                            {hasValue(
                              place.detail_th ??
                                place.highlight
                            ) && (
                              <p className="mt-1 line-clamp-2 text-[9.5px] leading-[14px] text-[#85798A]">
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
                                  type:
                                    "attraction",
                                  data: place,
                                })
                              }
                              className="my-auto inline-flex h-[33px] shrink-0 items-center gap-1.5 rounded-full bg-[#F4EAF6] px-3 text-[10px] font-semibold text-[#6F3A74]"
                            >
                              <Plus size={12} />
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
            <section className="mt-5 rounded-[16px] border border-[#EEE7EF] bg-[#FCFAFC] p-4">
              <h2 className="text-sm font-bold text-[#30294A]">
                เกี่ยวกับสถานที่
              </h2>

              {hasValue(description) && (
                <>
                  <p
                    className={`
                      mt-2 whitespace-pre-line text-xs leading-5 text-[#625767]
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
                          (value) =>
                            !value
                        )
                      }
                      className="mt-1.5 text-xs font-semibold text-[#6F456F]"
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
                      icon={
                        <MapPin size={18} />
                      }
                      label="ที่อยู่"
                      value={address}
                      href={mapsUrl}
                    />
                  )}

                  {website && (
                    <InfoItem
                      icon={
                        <Globe2 size={18} />
                      }
                      label="เว็บไซต์"
                      value={String(
                        websiteValue
                      )}
                      href={website}
                    />
                  )}

                  {phone && (
                    <InfoItem
                      icon={
                        <Phone size={18} />
                      }
                      label="โทรศัพท์"
                      value={String(
                        phone
                      )}
                      href={`tel:${phone}`}
                    />
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <footer
          className="sticky bottom-0 z-40 border-t border-[#E7DEE9] bg-[#FFFDFC]/98 px-[18px] pt-[8px] shadow-[0_-8px_24px_rgba(72,54,80,0.07)] backdrop-blur-xl"
          style={{
            paddingBottom:
              "max(9px, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto grid w-full max-w-[930px] grid-cols-1 gap-[10px] sm:grid-cols-2">
            <button
              type="button"
              disabled={
                !record ||
                !onAddToTrip ||
                type !==
                  "attraction"
              }
              onClick={() => {
                if (
                  record &&
                  onAddToTrip &&
                  type ===
                    "attraction"
                ) {
                  onAddToTrip({
                    type,
                    data: record,
                  });
                }
              }}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] bg-[#F2E8F4] px-5 text-[12px] font-semibold text-[#6A3470] transition hover:bg-[#E9DCEE] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />
              เพิ่มสถานที่นี้ลงในทริป
            </button>

            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] bg-[#67276B] px-5 text-[12px] font-semibold text-white shadow-[0_5px_14px_rgba(91,58,97,0.20)] transition hover:bg-[#743479]"
              >
                <Navigation size={17} />
                นำทางด้วย Google Maps
              </a>
            ) : (
              <div />
            )}
          </div>
        </footer>

        {showPhotoViewer &&
          images.length > 0 && (
          <div className="fixed inset-0 z-[500] bg-[#18131D]/90 p-4 backdrop-blur-md sm:p-6">
            <button
              type="button"
              onClick={() =>
                setShowPhotoViewer(
                  false
                )
              }
              className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#4B354F] shadow-lg"
              aria-label="ปิดรูปภาพ"
            >
              <X size={20} />
            </button>

            <div className="mx-auto flex h-full max-w-6xl flex-col">
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <img
                  src={
                    selectedImage
                  }
                  alt={title}
                  className="max-h-full max-w-full rounded-2xl object-contain"
                />
              </div>

              {images.length >
                1 && (
                <div className="mt-4 flex shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map(
                    (
                      image,
                      index
                    ) => (
                      <button
                        key={`${image}-viewer-${index}`}
                        type="button"
                        onClick={() =>
                          setMainImageIndex(
                            index
                          )
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
