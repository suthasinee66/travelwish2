import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Globe2,
  Heart,
  Hotel,
  MapPin,
  Phone,
  Sparkles,
  Star,
  Trees,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useImageSwipe } from "@/hooks/useImageSwipe";

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

  const [loading, setLoading] =
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
      setMainImageIndex(0);
      setActiveTab("overview");
      setDescriptionExpanded(false);
      return;
    }

    setRecord(target.data ?? {});
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
    target?.type ?? "attraction";

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
          absolute inset-0 bg-[#302b43]/30
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
          border-l border-[#e8e1e9]
          bg-[#fffdfb]
          shadow-[-28px_0_80px_rgba(59,43,67,0.20)]
          transition-transform duration-300 ease-out
          sm:w-[min(920px,94vw)]
          lg:w-[min(980px,74vw)]
          ${open
            ? "translate-x-0"
            : "translate-x-full"}
        `}
      >
        <div className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#eee7ef] bg-[#fffdfb]/94 px-4 shadow-[0_8px_26px_rgba(72,54,80,0.04)] backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8e0e9] bg-white text-[#3f3545] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f8f4f8]"
              aria-label="ปิด"
            >
              <X size={20} />
            </button>

            <div className="hidden sm:block">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#aa9cad]">
                Place detail
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

            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e6dde8] bg-white px-3.5 text-sm font-semibold text-[#5b3a61] shadow-sm transition hover:bg-[#f7f2f8]"
              aria-label="บันทึกสถานที่"
            >
              <Heart size={16} />
              <span className="hidden sm:inline">บันทึก</span>
            </button>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#5B3A61] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(91,58,97,0.20)] transition hover:-translate-y-0.5 hover:bg-[#68466e]"
              >
                <MapPin size={16} />
                <span className="hidden sm:inline">
                  เปิดแผนที่
                </span>
              </a>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[920px] px-4 pb-36 pt-7 sm:px-7 lg:px-8">
          <section>
            <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-[26px] font-bold leading-[1.22] tracking-[-0.02em] text-[#241f26] sm:text-[34px]">
                  {title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-[#827883]">
                  {rating != null && (
                    <>
                      <div className="inline-flex items-center gap-1.5 font-semibold text-[#3e3541]">
                        <Star
                          size={16}
                          fill="#d8a536"
                          className="text-[#d8a536]"
                        />
                        {rating.toFixed(1)}
                      </div>

                      {reviewCount && (
                        <>
                          <span>•</span>
                          <span>
                            {reviewCount} reviews
                          </span>
                        </>
                      )}
                    </>
                  )}

                  {locationSummary && (
                    <>
                      {(rating != null ||
                        reviewCount) && (
                        <span>•</span>
                      )}
                      <span>
                        {locationSummary}
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3eef4] px-3 py-1.5 text-xs font-semibold text-[#5d4a62]">
                    <TypeIcon size={13} />
                    {typeLabel}
                  </span>

                  {categoryChips.map(
                    (chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-[#ebe4ec] bg-white px-3 py-1.5 text-xs font-medium text-[#766a79]"
                      >
                        {chip}
                      </span>
                    )
                  )}
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
                    rounded-[26px] border border-white/70
                    bg-[#eee8ef]
                    shadow-[0_18px_50px_rgba(72,54,80,0.12)]
                    touch-pan-y sm:rounded-[30px]
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
                      opacity-30 blur-2xl
                    "
                  />

                  <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-[16/9]">
                    <img
                      src={selectedImage}
                      alt={title}
                      draggable={false}
                      className="
                        h-full w-full select-none object-cover
                        transition-transform duration-500
                        sm:group-hover:scale-[1.015]
                      "
                    />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/20 to-transparent" />

                    {images.length > 1 && (
                      <div className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md sm:right-4 sm:top-4">
                        {mainImageIndex + 1} / {images.length}
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-[11px] font-medium text-white/95 backdrop-blur-md sm:bottom-4 sm:left-4">
                      {typeLabel}
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
                          rounded-full border border-white/70
                          bg-white/90 text-[#3f3545]
                          shadow-[0_10px_28px_rgba(35,25,39,0.22)]
                          opacity-0 backdrop-blur-md transition-all
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
                          rounded-full border border-white/70
                          bg-white/90 text-[#3f3545]
                          shadow-[0_10px_28px_rgba(35,25,39,0.22)]
                          opacity-0 backdrop-blur-md transition-all
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
                      overflow-x-auto pb-1
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
                            relative h-[68px] w-[92px]
                            shrink-0 snap-start overflow-hidden
                            rounded-[16px] bg-[#eee8ef]
                            transition-all duration-200
                            sm:h-[76px] sm:w-[108px]
                            ${active
                              ? "ring-2 ring-[#573d63] ring-offset-2 ring-offset-[#fffdfb]"
                              : "opacity-70 hover:opacity-100"}
                          `}
                        >
                          <img
                            src={image}
                            alt=""
                            draggable={false}
                            loading="lazy"
                            className={`
                              h-full w-full select-none object-cover
                              transition-transform duration-300
                              ${active
                                ? "scale-[1.03]"
                                : "hover:scale-105"}
                            `}
                          />

                          {active && (
                            <span className="pointer-events-none absolute inset-0 bg-[#573d63]/5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {images.length > 1 && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-[#a093a4] sm:hidden">
                    <span className="h-1 w-8 rounded-full bg-[#d9cfdc]" />
                    ปัดรูปใหญ่เพื่อดูภาพถัดไป
                    <span className="h-1 w-8 rounded-full bg-[#d9cfdc]" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-[16/8] max-h-[360px] items-center justify-center rounded-[26px] border border-[#ebe4ec] bg-gradient-to-br from-[#f7f2f7] to-[#eee7ef] text-[#9c8fa0] shadow-[0_14px_36px_rgba(72,54,80,0.06)] sm:rounded-[30px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/75 shadow-sm">
                    <TypeIcon
                      size={30}
                      strokeWidth={1.4}
                    />
                  </div>
                  <span className="text-xs font-medium text-[#9a8da0]">
                    ยังไม่มีรูปภาพสำหรับสถานที่นี้
                  </span>
                </div>
              </div>
            )}
          </section>

          <nav className="mt-7 flex gap-7 border-b border-[#e8e1e9]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`
                  relative pb-3 text-sm font-medium transition
                  ${activeTab === tab.id
                    ? "text-[#271f2a]"
                    : "text-[#8d818f] hover:text-[#554b58]"}
                `}
              >
                {tab.label}

                {activeTab === tab.id && (
                  <span className="absolute inset-x-0 bottom-[-1px] h-[2px] rounded-full bg-[#573d63]" />
                )}
              </button>
            ))}
          </nav>

          {activeTab === "overview" && (
            <div className="pt-6">
              <section className="mb-7">
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
                      className="rounded-[20px] border border-[#eee6ef] bg-gradient-to-br from-white to-[#fbf8fc] p-4 shadow-[0_10px_28px_rgba(72,54,80,0.05)]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f1e9f2] text-[#5B3A61]">
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
                <section>
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
                <section className="mt-6 rounded-[24px] border border-[#e9e2ea] bg-white p-2 shadow-[0_10px_30px_rgba(72,54,80,0.04)]">
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

              {!hasValue(description) &&
                !address &&
                !website &&
                !phone && (
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
                <section className="rounded-[24px] border border-[#e9e2ea] bg-white p-5 sm:p-6">
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
                <section className="overflow-hidden rounded-[24px] border border-[#e9e2ea] bg-white">
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

        <div className="sticky bottom-0 z-30 border-t border-[#e9e1ea] bg-[#fffdfb]/95 px-4 py-3 shadow-[0_-16px_38px_rgba(72,54,80,0.08)] backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex w-full max-w-[920px] gap-3">
            <button
              type="button"
              disabled={!target || !onAddToTrip}
              onClick={() => {
                if (target && onAddToTrip) {
                  onAddToTrip(target);
                }
              }}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5B3A61] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(91,58,97,0.22)] transition hover:bg-[#68466e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={17} />
              เพิ่มสถานที่นี้ลงในทริป
            </button>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#ddd1e0] bg-white px-5 text-sm font-semibold text-[#5B3A61] shadow-sm transition hover:bg-[#f7f2f8]"
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
