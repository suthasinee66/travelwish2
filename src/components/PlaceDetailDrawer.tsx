import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Clock3,
  ExternalLink,
  Globe2,
  Hotel,
  MapPin,
  Phone,
  Star,
  Utensils,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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

  const galleryThumbs =
    images
      .map((src, index) => ({
        src,
        index,
      }))
      .filter(
        ({ index }) =>
          index !== mainImageIndex
      )
      .slice(0, 4);

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
          sm:w-[min(900px,92vw)]
          lg:w-[min(940px,72vw)]
          ${open
            ? "translate-x-0"
            : "translate-x-full"}
        `}
      >
        <div className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#eee8ef] bg-[#fffdfb]/96 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e9e2ea] bg-white text-[#3f3545] shadow-sm transition hover:bg-[#f8f4f8]"
            aria-label="ปิด"
          >
            <X size={20} />
          </button>

          {loading && (
            <div className="rounded-full bg-[#f6f1f7] px-3 py-1.5 text-[11px] font-medium text-[#8d7d91]">
              กำลังโหลดข้อมูล...
            </div>
          )}

          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#573d63] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#684974]"
            >
              <MapPin size={16} />
              <span className="hidden sm:inline">
                เปิดแผนที่
              </span>
            </a>
          ) : (
            <div className="h-10 w-10" />
          )}
        </div>

        <div className="mx-auto w-full max-w-[900px] px-4 pb-14 pt-7 sm:px-7 lg:px-8">
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

          <section className="mt-7">
            {selectedImage ? (
              <>
                <div className="hidden h-[390px] grid-cols-12 grid-rows-2 gap-2.5 sm:grid">
                  <button
                    type="button"
                    onClick={() =>
                      setMainImageIndex(
                        mainImageIndex
                      )
                    }
                    className="col-span-7 row-span-2 overflow-hidden rounded-l-[24px] rounded-r-xl bg-[#f1edf2]"
                  >
                    <img
                      src={selectedImage}
                      alt={title}
                      className="h-full w-full object-cover transition duration-300 hover:scale-[1.01]"
                    />
                  </button>

                  {galleryThumbs.length >
                  0 ? (
                    galleryThumbs.map(
                      (
                        image,
                        thumbIndex
                      ) => (
                        <button
                          key={`${image.src}-${image.index}`}
                          type="button"
                          onClick={() =>
                            setMainImageIndex(
                              image.index
                            )
                          }
                          className={`
                            col-span-5 overflow-hidden bg-[#f1edf2]
                            ${thumbIndex === 0
                              ? "rounded-tr-[24px]"
                              : ""}
                            ${thumbIndex ===
                            galleryThumbs.length -
                              1
                              ? "rounded-br-[24px]"
                              : ""}
                          `}
                        >
                          <img
                            src={image.src}
                            alt=""
                            className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                          />
                        </button>
                      )
                    )
                  ) : (
                    <div className="col-span-5 row-span-2 flex items-center justify-center rounded-r-[24px] bg-[#f4f0f4] text-[#a092a4]">
                      <TypeIcon
                        size={34}
                        strokeWidth={1.4}
                      />
                    </div>
                  )}
                </div>

                <div className="sm:hidden">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#f1edf2]">
                    <img
                      src={selectedImage}
                      alt={title}
                      className="h-full w-full object-cover"
                    />

                    {images.length > 1 && (
                      <div className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
                        {mainImageIndex + 1} /{" "}
                        {images.length}
                      </div>
                    )}
                  </div>

                  {images.length > 1 && (
                    <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
                      {images.map(
                        (src, index) => (
                          <button
                            key={`${src}-${index}`}
                            type="button"
                            onClick={() =>
                              setMainImageIndex(
                                index
                              )
                            }
                            className={`
                              h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2
                              ${index ===
                              mainImageIndex
                                ? "border-[#6f456f]"
                                : "border-transparent"}
                            `}
                          >
                            <img
                              src={src}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex aspect-[16/7] max-h-[320px] items-center justify-center rounded-[24px] bg-[#f4f0f4] text-[#9c8fa0]">
                <TypeIcon
                  size={42}
                  strokeWidth={1.4}
                />
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
      </aside>
    </div>
  );
}
