import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Clock3,
  ExternalLink,
  Globe2,
  Hotel,
  Mail,
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

const EMPTY_VALUES = new Set(["", "-", "null", "undefined"]);

const LABELS: Record<string, string> = {
  att_id: "รหัสสถานที่",
  place_id: "รหัสร้านอาหาร",
  google_place_id: "Google Place ID",
  acc_id: "รหัสที่พัก",
  name_th: "ชื่อภาษาไทย",
  name_en: "ชื่อภาษาอังกฤษ",
  place_name_th: "ชื่อภาษาไทย",
  place_name_en: "ชื่อภาษาอังกฤษ",
  acc_name_th: "ชื่อภาษาไทย",
  acc_name_en: "ชื่อภาษาอังกฤษ",
  detail_th: "รายละเอียด",
  detail_en: "รายละเอียดภาษาอังกฤษ",
  category: "หมวดหมู่",
  type: "ประเภท",
  place_type: "ประเภทร้าน",
  region: "ภูมิภาค",
  province: "จังหวัด",
  province_name_th: "จังหวัด",
  district: "อำเภอ/เขต",
  subdistrict: "ตำบล/แขวง",
  highlight: "จุดเด่น",
  activity: "กิจกรรม",
  activities: "กิจกรรม",
  suitable_duration: "ระยะเวลาที่เหมาะสม",
  travel_type: "สไตล์การท่องเที่ยว",
  atmosphere: "บรรยากาศ",
  budget: "งบประมาณ",
  travel_companion: "เหมาะกับ",
  tel: "โทรศัพท์",
  place_phone: "โทรศัพท์",
  email: "อีเมล",
  website: "เว็บไซต์",
  place_website: "เว็บไซต์",
  facebook: "Facebook",
  payment: "การชำระเงิน",
  place_address: "ที่อยู่",
  acc_address: "ที่อยู่",
  address: "ที่อยู่",
  star_level: "ระดับดาว",
  accom_price_name: "ระดับราคา",
  rating: "คะแนน",
  user_ratings_total: "จำนวนรีวิว",
  google_business_status: "สถานะธุรกิจ",
  google_primary_type: "ประเภทหลัก",
  google_types: "ประเภทจาก Google",
  google_price_level: "ระดับราคา Google",
  booking_provider: "ผู้ให้บริการจอง",
  data_source: "แหล่งข้อมูล",
  source: "แหล่งข้อมูล",
  source_url: "ลิงก์ต้นทาง",
  google_maps_uri: "Google Maps",
  latitude: "ละติจูด",
  longitude: "ลองจิจูด",
  created_at: "สร้างเมื่อ",
  updated_at: "อัปเดตเมื่อ",
  google_last_synced_at: "ซิงก์ Google ล่าสุด",
};

const RESERVED_KEYS = new Set([
  "images",
  "image",
  "location",
  "name",
  "period",
]);

function hasValue(value: any) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.keys(value).length > 0;
  return !EMPTY_VALUES.has(String(value).trim().toLowerCase());
}

function textValue(value: any): string {
  if (Array.isArray(value)) {
    return value
      .filter(hasValue)
      .map((item) =>
        typeof item === "object" ? JSON.stringify(item) : String(item)
      )
      .join(" • ");
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .filter(([, item]) => hasValue(item))
      .map(([key, item]) => `${LABELS[key] ?? key}: ${textValue(item)}`)
      .join(" • ");
  }

  return String(value ?? "");
}

function getTitle(type: PlaceDetailTargetType, data: any) {
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

function getSubtitle(type: PlaceDetailTargetType) {
  if (type === "restaurant") return "ร้านอาหาร";
  if (type === "accommodation") return "ที่พัก";
  return "สถานที่ท่องเที่ยว";
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
    data?.province ?? data?.province_name_th,
  ]
    .filter(hasValue)
    .join(" ");
}

function getImages(data: any) {
  const candidates = [
    ...(Array.isArray(data?.images) ? data.images : []),
    data?.image,
  ];

  return Array.from(
    new Set(
      candidates.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0
      )
    )
  );
}

async function loadFullRecord(target: PlaceDetailTarget) {
  const data = target.data ?? {};

  if (target.type === "attraction") {
    const id = data.att_id ?? data.place_id;
    if (!id) return data;

    const result = await supabase
      .from("attraction")
      .select("*")
      .eq("att_id", String(id))
      .maybeSingle();

    return result.data ? { ...data, ...result.data } : data;
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
      return { ...data, ...byPlaceId.data };
    }

    const byGoogleId = await supabase
      .from("restaurant")
      .select("*")
      .eq("google_place_id", String(placeId))
      .maybeSingle();

    return byGoogleId.data
      ? { ...data, ...byGoogleId.data }
      : data;
  }

  const accId = data.acc_id ?? data.id;
  if (!accId) return data;

  const result = await supabase
    .from("accommodation")
    .select("*")
    .eq("acc_id", String(accId))
    .maybeSingle();

  return result.data ? { ...data, ...result.data } : data;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  if (!hasValue(value)) return null;

  return (
    <div className="grid gap-1 border-b border-[#efe7ef] py-3 last:border-b-0 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
      <div className="text-xs font-semibold text-[#9a8da0]">
        {label}
      </div>
      <div className="break-words text-sm leading-6 text-[#51475a]">
        {textValue(value)}
      </div>
    </div>
  );
}

export default function PlaceDetailDrawer({
  open,
  target,
  onClose,
}: Props) {
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    let active = true;

    if (!open || !target) {
      setRecord(null);
      setImageIndex(0);
      return;
    }

    setRecord(target.data ?? {});
    setImageIndex(0);
    setLoading(true);

    loadFullRecord(target)
      .then((data) => {
        if (active) setRecord(data);
      })
      .catch((error) => {
        console.warn("LOAD PLACE DETAIL ERROR:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, target]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const data = record ?? target?.data ?? {};
  const type = target?.type ?? "attraction";
  const title = getTitle(type, data);
  const subtitle = getSubtitle(type);
  const images = getImages(data);
  const address = getAddress(data);

  const description =
    data?.detail_th ??
    data?.detail_en ??
    data?.description ??
    data?.highlight;

  const rating =
    data?.rating != null && Number.isFinite(Number(data.rating))
      ? Number(data.rating)
      : null;

  const phone = data?.place_phone ?? data?.tel ?? data?.phone;
  const email = data?.email;
  const website =
    data?.place_website ??
    data?.website ??
    data?.source_url;

  const latitude = Number(data?.latitude ?? data?.location?.latitude);
  const longitude = Number(data?.longitude ?? data?.location?.longitude);
  const hasCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude);

  const visibleEntries = useMemo(() => {
    const hidden = new Set([
      ...RESERVED_KEYS,
      "detail_th",
      "detail_en",
      "description",
      "place_address",
      "acc_address",
      "address",
      "rating",
      "user_ratings_total",
      "place_phone",
      "tel",
      "phone",
      "email",
      "place_website",
      "website",
      "source_url",
    ]);

    return Object.entries(data ?? {})
      .filter(([key, value]) => !hidden.has(key) && hasValue(value))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const TypeIcon =
    type === "restaurant"
      ? Utensils
      : type === "accommodation"
        ? Hotel
        : MapPin;

  return (
    <div
      className={`
        fixed inset-0 z-[320]
        transition
        ${open ? "pointer-events-auto" : "pointer-events-none"}
      `}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="ปิดรายละเอียด"
        onClick={onClose}
        className={`
          absolute inset-0 bg-[#302b43]/25
          transition-opacity duration-300
          ${open ? "opacity-100" : "opacity-0"}
        `}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`รายละเอียด${subtitle}`}
        className={`
          absolute right-0 top-0 h-[100dvh]
          w-full sm:w-[min(900px,92vw)] lg:w-[min(960px,72vw)]
          overflow-y-auto border-l border-[#e7dce9]
          bg-[#fffdfb]
          shadow-[-24px_0_70px_rgba(63,45,76,0.20)]
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eadfeb] bg-[#fffdfb]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2e9f4] text-[#6f456f]">
              <TypeIcon size={19} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#9a819f]">
                {subtitle}
              </div>
              <div className="truncate text-sm font-semibold text-[#493c50]">
                {title}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#6f456f] transition hover:bg-[#f3edf4]"
            aria-label="ปิด"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
          {images.length > 0 ? (
            <div className="overflow-hidden rounded-[28px] border border-[#eadfeb] bg-[#f2edf3]">
              <div className="relative aspect-[16/9] max-h-[460px] w-full">
                <img
                  src={images[Math.min(imageIndex, images.length - 1)]}
                  alt={title}
                  className="h-full w-full object-cover"
                />

                {images.length > 1 && (
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
                    {Math.min(imageIndex + 1, images.length)} / {images.length}
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {images.map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      onClick={() => setImageIndex(index)}
                      className={`
                        h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2
                        ${index === imageIndex
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
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-[16/7] max-h-[300px] items-center justify-center rounded-[28px] border border-[#eadfeb] bg-[#f4eef5] text-[#9b869f]">
              <TypeIcon size={42} strokeWidth={1.5} />
            </div>
          )}

          <div className="mt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#f2e9f4] px-3 py-1 text-xs font-bold text-[#6f456f]">
                  <TypeIcon size={13} />
                  {subtitle}
                </div>
                <h2 className="text-2xl font-bold leading-tight text-[#3f3545] sm:text-3xl">
                  {title}
                </h2>
              </div>

              {rating != null && (
                <div className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-[#eadfeb] bg-white px-3 py-2 text-sm font-bold text-[#6f456f]">
                  <Star size={16} fill="currentColor" />
                  {rating.toFixed(1)}
                  {data?.user_ratings_total != null && (
                    <span className="font-normal text-[#9a8da0]">
                      ({Number(data.user_ratings_total).toLocaleString()})
                    </span>
                  )}
                </div>
              )}
            </div>

            {address && (
              <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#746979]">
                <MapPin size={17} className="mt-1 shrink-0 text-[#6f456f]" />
                <span>{address}</span>
              </div>
            )}
          </div>

          {(description || data?.highlight) && (
            <section className="mt-6 rounded-[24px] border border-[#eadfeb] bg-white p-5 sm:p-6">
              <h3 className="text-base font-bold text-[#493c50]">
                เกี่ยวกับสถานที่
              </h3>
              {description && (
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#6f6474]">
                  {String(description)}
                </p>
              )}
              {data?.highlight && data.highlight !== description && (
                <p className="mt-3 rounded-2xl bg-[#faf6fb] p-4 text-sm leading-6 text-[#6f6474]">
                  {String(data.highlight)}
                </p>
              )}
            </section>
          )}

          {(phone || email || website || hasCoordinates) && (
            <section className="mt-5 grid gap-3 sm:grid-cols-2">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-3 rounded-2xl border border-[#eadfeb] bg-white p-4 transition hover:bg-[#fbf8fc]"
                >
                  <Phone size={18} className="text-[#6f456f]" />
                  <div className="min-w-0">
                    <div className="text-xs text-[#9a8da0]">โทรศัพท์</div>
                    <div className="truncate text-sm font-semibold text-[#51475a]">
                      {String(phone)}
                    </div>
                  </div>
                </a>
              )}

              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 rounded-2xl border border-[#eadfeb] bg-white p-4 transition hover:bg-[#fbf8fc]"
                >
                  <Mail size={18} className="text-[#6f456f]" />
                  <div className="min-w-0">
                    <div className="text-xs text-[#9a8da0]">อีเมล</div>
                    <div className="truncate text-sm font-semibold text-[#51475a]">
                      {String(email)}
                    </div>
                  </div>
                </a>
              )}

              {website && (
                <a
                  href={String(website)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-[#eadfeb] bg-white p-4 transition hover:bg-[#fbf8fc]"
                >
                  <Globe2 size={18} className="text-[#6f456f]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[#9a8da0]">เว็บไซต์</div>
                    <div className="truncate text-sm font-semibold text-[#51475a]">
                      เปิดเว็บไซต์
                    </div>
                  </div>
                  <ExternalLink size={15} className="text-[#9a8da0]" />
                </a>
              )}

              {hasCoordinates && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-[#eadfeb] bg-white p-4 transition hover:bg-[#fbf8fc]"
                >
                  <MapPin size={18} className="text-[#6f456f]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[#9a8da0]">แผนที่</div>
                    <div className="truncate text-sm font-semibold text-[#51475a]">
                      เปิดใน Google Maps
                    </div>
                  </div>
                  <ExternalLink size={15} className="text-[#9a8da0]" />
                </a>
              )}
            </section>
          )}

          <section className="mt-5 rounded-[24px] border border-[#eadfeb] bg-white px-5 py-2 sm:px-6">
            <div className="flex items-center gap-2 py-4">
              <Building2 size={18} className="text-[#6f456f]" />
              <h3 className="text-base font-bold text-[#493c50]">
                ข้อมูลทั้งหมด
              </h3>
              {loading && (
                <span className="ml-auto text-xs text-[#9a8da0]">
                  กำลังโหลดข้อมูลล่าสุด...
                </span>
              )}
            </div>

            <DetailRow label="ที่อยู่" value={address} />
            <DetailRow label="คะแนน" value={rating} />
            <DetailRow
              label="จำนวนรีวิว"
              value={data?.user_ratings_total}
            />
            <DetailRow label="โทรศัพท์" value={phone} />
            <DetailRow label="อีเมล" value={email} />
            <DetailRow label="เว็บไซต์" value={website} />

            {visibleEntries.map(([key, value]) => (
              <DetailRow
                key={key}
                label={LABELS[key] ?? key.replaceAll("_", " ")}
                value={value}
              />
            ))}

            {!loading &&
              !address &&
              rating == null &&
              !phone &&
              !email &&
              !website &&
              visibleEntries.length === 0 && (
                <div className="py-8 text-center text-sm text-[#9a8da0]">
                  ยังไม่มีข้อมูลรายละเอียดเพิ่มเติม
                </div>
              )}
          </section>

          {data?.suitable_duration && (
            <div className="mt-4 flex items-center gap-2 text-xs text-[#8c7e91]">
              <Clock3 size={14} />
              ระยะเวลาที่เหมาะสม: {textValue(data.suitable_duration)}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
