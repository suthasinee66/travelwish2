import {
  CloudRain,
  CloudSun,
  Gauge,
  LoaderCircle,
  RefreshCw,
  Route,
  TriangleAlert,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMap } from "@vis.gl/react-google-maps";

export type LiveTripPoint = {
  id?: string | number | null;
  name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  location?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
};

type LiveTrafficLeg = {
  fromName?: string | null;
  toName?: string | null;
  durationMinutes?: number | null;
  staticDurationMinutes?: number | null;
  delayMinutes?: number | null;
  distanceMeters?: number | null;
  level?: "normal" | "slow" | "heavy";
};

type LiveWeatherItem = {
  name?: string | null;
  rainProbability?: number | null;
  temperatureC?: number | null;
  condition?: string | null;
  hourLabel?: string | null;
};

type LiveTripStatusResponse = {
  generatedAt?: string;
  trafficAvailable?: boolean;
  weatherAvailable?: boolean;
  legs?: LiveTrafficLeg[];
  weather?: LiveWeatherItem[];
  suggestions?: string[];
};

const normalizePoint = (
  point: LiveTripPoint
) => {
  const latitude =
    Number(
      point.latitude ??
        point.location
          ?.latitude
    );

  const longitude =
    Number(
      point.longitude ??
        point.location
          ?.longitude
    );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    id:
      point.id != null
        ? String(point.id)
        : null,
    name:
      String(
        point.name ??
          "สถานที่"
      ),
    latitude,
    longitude,
  };
};

export function TrafficLayerController({
  enabled,
}: {
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    let disposed = false;
    let trafficLayer: any = null;

    const applyLayer = async () => {
      const maps =
        (window as any)
          ?.google
          ?.maps;

      if (!maps) {
        return;
      }

      const TrafficLayer =
        maps.TrafficLayer ??
        (
          await maps.importLibrary?.(
            "maps"
          )
        )?.TrafficLayer;

      if (
        disposed ||
        !TrafficLayer
      ) {
        return;
      }

      trafficLayer =
        new TrafficLayer({
          autoRefresh: true,
        });

      trafficLayer.setMap(
        enabled
          ? map
          : null
      );
    };

    void applyLayer();

    return () => {
      disposed = true;

      if (trafficLayer) {
        trafficLayer.setMap(null);
      }
    };
  }, [
    map,
    enabled,
  ]);

  return null;
}

export default function LiveTripStatus({
  points,
  trafficEnabled,
  onTrafficEnabledChange,
  className = "",
}: {
  points: LiveTripPoint[];
  trafficEnabled: boolean;
  onTrafficEnabledChange: (
    value: boolean
  ) => void;
  className?: string;
}) {
  const normalizedPoints =
    useMemo(
      () =>
        points
          .map(normalizePoint)
          .filter(Boolean)
          .slice(0, 8),
      [points]
    );

  const [
    status,
    setStatus,
  ] =
    useState<LiveTripStatusResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const loadStatus =
    async () => {
      if (
        normalizedPoints.length ===
        0
      ) {
        setStatus(null);
        return;
      }

      const API_URL =
        (
          import.meta.env
            .VITE_API_URL ||
          (
            import.meta.env.DEV
              ? "http://localhost:5000"
              : ""
          )
        ).replace(
          /\/$/,
          ""
        );

      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            `${API_URL}/api/live-trip-status`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  points:
                    normalizedPoints,
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "โหลดสถานการณ์สดไม่สำเร็จ"
          );
        }

        setStatus(data);
      } catch (err: any) {
        console.warn(
          "LIVE TRIP STATUS ERROR:",
          err
        );

        setError(
          err?.message ||
            "ยังโหลดสถานการณ์สดไม่ได้"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadStatus();

    const interval =
      window.setInterval(
        () => {
          if (
            document
              .visibilityState ===
            "visible"
          ) {
            void loadStatus();
          }
        },
        5 * 60 * 1000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [
    JSON.stringify(
      normalizedPoints
    ),
  ]);

  const worstLeg =
    useMemo(
      () =>
        [
          ...(
            status?.legs ??
            []
          ),
        ].sort(
          (
            left,
            right
          ) =>
            Number(
              right.delayMinutes ??
                0
            ) -
            Number(
              left.delayMinutes ??
                0
            )
        )[0] ?? null,
      [status?.legs]
    );

  const rainItem =
    useMemo(
      () =>
        [
          ...(
            status?.weather ??
            []
          ),
        ].sort(
          (
            left,
            right
          ) =>
            Number(
              right.rainProbability ??
                0
            ) -
            Number(
              left.rainProbability ??
                0
            )
        )[0] ?? null,
      [status?.weather]
    );

  return (
    <section
      className={`
        rounded-2xl
        border
        border-[#eadfeb]
        bg-[#fffdfb]
        p-4
        shadow-[0_8px_24px_rgba(87,61,99,0.05)]
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge
              size={16}
              className="text-[#6f456f]"
            />
            <h3 className="text-sm font-bold text-[#40364b]">
              Live trip status
            </h3>
          </div>

          <p className="mt-1 text-[11px] leading-4 text-[#8b7d90]">
            จราจรและสภาพอากาศจะรีเฟรชอัตโนมัติทุก 5 นาที
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadStatus()
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e5dbe8] bg-white text-[#6f456f] transition hover:bg-[#f6eff7]"
          aria-label="รีเฟรชสถานการณ์สด"
          title="รีเฟรชสถานการณ์สด"
        >
          {loading ? (
            <LoaderCircle
              size={15}
              className="animate-spin"
            />
          ) : (
            <RefreshCw
              size={15}
            />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={() =>
          onTrafficEnabledChange(
            !trafficEnabled
          )
        }
        className={`
          mt-3
          flex
          w-full
          items-center
          justify-between
          rounded-xl
          border
          px-3
          py-2.5
          text-left
          transition
          ${trafficEnabled
            ? "border-[#cdbbd2] bg-[#f3eaf5]"
            : "border-[#eadfeb] bg-white"
          }
        `}
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-[#51475a]">
          <Route
            size={15}
            className="text-[#6f456f]"
          />
          Live traffic บนแผนที่
        </span>

        <span
          className={`
            relative
            h-5
            w-9
            rounded-full
            transition
            ${trafficEnabled
              ? "bg-[#6f456f]"
              : "bg-[#d8d0da]"
            }
          `}
        >
          <span
            className={`
              absolute
              top-0.5
              h-4
              w-4
              rounded-full
              bg-white
              shadow-sm
              transition
              ${trafficEnabled
                ? "left-[18px]"
                : "left-0.5"
              }
            `}
          />
        </span>
      </button>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff5f4] px-3 py-2.5 text-[11px] leading-4 text-[#9f5d58]">
          <TriangleAlert
            size={14}
            className="mt-0.5 shrink-0"
          />
          <span>
            {error}
          </span>
        </div>
      )}

      {!error && (
        <div className="mt-3 grid gap-2">
          <div className="flex items-start gap-2 rounded-xl bg-[#f8f5f9] px-3 py-2.5">
            <Route
              size={15}
              className="mt-0.5 shrink-0 text-[#6f456f]"
            />

            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#4f4454]">
                การจราจร
              </div>

              {worstLeg ? (
                <div className="mt-0.5 text-[11px] leading-4 text-[#7f7185]">
                  {worstLeg.level ===
                  "heavy"
                    ? "รถติดหนัก"
                    : worstLeg.level ===
                        "slow"
                      ? "รถเริ่มติด"
                      : "การจราจรปกติ"}
                  {worstLeg.toName
                    ? ` ก่อนถึง ${worstLeg.toName}`
                    : ""}
                  {Number(
                    worstLeg.delayMinutes ??
                      0
                  ) > 0
                    ? ` · ช้ากว่าปกติประมาณ ${Math.round(
                        Number(
                          worstLeg.delayMinutes
                        )
                      )} นาที`
                    : ""}
                </div>
              ) : (
                <div className="mt-0.5 text-[11px] leading-4 text-[#9a8da0]">
                  {status?.trafficAvailable ===
                  false
                    ? "ยังไม่มีข้อมูล ETA แบบสด"
                    : "กำลังรอข้อมูลเส้นทาง"}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-[#f6fbfc] px-3 py-2.5">
            {Number(
              rainItem?.rainProbability ??
                0
            ) >= 50 ? (
              <CloudRain
                size={15}
                className="mt-0.5 shrink-0 text-[#5d96a4]"
              />
            ) : (
              <CloudSun
                size={15}
                className="mt-0.5 shrink-0 text-[#6f9ca6]"
              />
            )}

            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#4f4454]">
                สภาพอากาศ
              </div>

              {rainItem ? (
                <div className="mt-0.5 text-[11px] leading-4 text-[#71828a]">
                  {rainItem.name}
                  {rainItem.hourLabel
                    ? ` · ${rainItem.hourLabel}`
                    : ""}
                  {" · "}
                  ฝน{" "}
                  {Math.round(
                    Number(
                      rainItem.rainProbability ??
                        0
                    )
                  )}
                  %
                  {Number.isFinite(
                    Number(
                      rainItem.temperatureC
                    )
                  )
                    ? ` · ${Math.round(
                        Number(
                          rainItem.temperatureC
                        )
                      )}°C`
                    : ""}
                </div>
              ) : (
                <div className="mt-0.5 text-[11px] leading-4 text-[#9a8da0]">
                  {status?.weatherAvailable ===
                  false
                    ? "ยังไม่มีข้อมูลพยากรณ์อากาศ"
                    : "กำลังรอข้อมูลอากาศ"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {Array.isArray(
        status?.suggestions
      ) &&
        status!.suggestions!
          .length > 0 && (
          <div className="mt-3 rounded-xl border border-[#eadfeb] bg-white px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a8da0]">
              Suggestion
            </div>

            <div className="mt-1.5 space-y-1.5">
              {status!.suggestions!
                .slice(0, 3)
                .map(
                  (
                    suggestion,
                    index
                  ) => (
                    <div
                      key={index}
                      className="text-[11px] leading-4 text-[#615665]"
                    >
                      {suggestion}
                    </div>
                  )
                )}
            </div>
          </div>
        )}
    </section>
  );
}
