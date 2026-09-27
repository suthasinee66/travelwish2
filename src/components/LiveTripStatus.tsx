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
      if (!trafficEnabled) {
        setLoading(false);
        setError(null);
        return;
      }

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
    if (!trafficEnabled) {
      return;
    }

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
    trafficEnabled,
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
        border
        border-[#eadfeb]
        bg-[#fffdfb]
        shadow-[0_6px_18px_rgba(87,61,99,0.04)]
        ${trafficEnabled
          ? "rounded-xl p-2.5"
          : "rounded-xl p-1.5"
        }
        ${className}
      `}
    >
      {!trafficEnabled ? (
        <button
          type="button"
          onClick={() =>
            onTrafficEnabledChange(
              true
            )
          }
          className="
            flex
            w-full
            items-center
            justify-between
            gap-3
            rounded-lg
            px-2.5
            py-2
            text-left
            transition
            hover:bg-[#f8f3f9]
          "
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold text-[#51475a]">
            <Route
              size={14}
              className="text-[#6f456f]"
            />
            Live traffic
          </span>

          <span className="relative h-[18px] w-8 shrink-0 rounded-full bg-[#d8d0da] transition">
            <span className="absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition" />
          </span>
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Gauge
                size={14}
                className="shrink-0 text-[#6f456f]"
              />

              <div className="min-w-0">
                <h3 className="truncate text-[11px] font-bold text-[#40364b]">
                  Live trip status
                </h3>
                <p className="text-[9px] leading-3 text-[#978c9d]">
                  อัปเดตทุก 5 นาที
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadStatus()
              }
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#e5dbe8] bg-white text-[#6f456f] transition hover:bg-[#f6eff7]"
              aria-label="รีเฟรชสถานการณ์สด"
              title="รีเฟรชสถานการณ์สด"
            >
              {loading ? (
                <LoaderCircle
                  size={13}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw
                  size={13}
                />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              onTrafficEnabledChange(
                false
              )
            }
            className="
              mt-2
              flex
              w-full
              items-center
              justify-between
              rounded-lg
              border
              border-[#d8c8dc]
              bg-[#f5eef6]
              px-2.5
              py-1.5
              text-left
              transition
            "
          >
            <span className="flex items-center gap-2 text-[10px] font-semibold text-[#51475a]">
              <Route
                size={13}
                className="text-[#6f456f]"
              />
              Live traffic บนแผนที่
            </span>

            <span className="relative h-[18px] w-8 shrink-0 rounded-full bg-[#6f456f] transition">
              <span className="absolute left-4 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition" />
            </span>
          </button>

          {error && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#fff5f4] px-2.5 py-2 text-[10px] leading-4 text-[#9f5d58]">
              <TriangleAlert
                size={12}
                className="mt-0.5 shrink-0"
              />
              <span>
                {error}
              </span>
            </div>
          )}

          {!error && (
            <div className="mt-2 overflow-hidden rounded-lg border border-[#eee6ef] bg-white/70">
              <div className="flex items-start gap-2 px-2.5 py-2">
                <Route
                  size={12}
                  className="mt-0.5 shrink-0 text-[#6f456f]"
                />

                <div className="min-w-0">
                  {worstLeg ? (
                    <p className="text-[10px] leading-4 text-[#6f6374]">
                      <span className="font-semibold text-[#4f4454]">
                        {worstLeg.level ===
                        "heavy"
                          ? "รถติดหนัก"
                          : worstLeg.level ===
                              "slow"
                            ? "รถเริ่มติด"
                            : "การจราจรปกติ"}
                      </span>
                      {worstLeg.toName
                        ? ` · ${worstLeg.toName}`
                        : ""}
                      {Number(
                        worstLeg.delayMinutes ??
                          0
                      ) > 0
                        ? ` · +${Math.round(
                            Number(
                              worstLeg.delayMinutes
                            )
                          )} นาที`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-[10px] leading-4 text-[#94899a]">
                      {status?.trafficAvailable ===
                      false
                        ? "ยังไม่มีข้อมูล ETA แบบสด"
                        : "กำลังรอข้อมูลเส้นทาง"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 border-t border-[#eee6ef] px-2.5 py-2">
                {Number(
                  rainItem?.rainProbability ??
                    0
                ) >= 50 ? (
                  <CloudRain
                    size={12}
                    className="mt-0.5 shrink-0 text-[#5d96a4]"
                  />
                ) : (
                  <CloudSun
                    size={12}
                    className="mt-0.5 shrink-0 text-[#6f9ca6]"
                  />
                )}

                <div className="min-w-0">
                  {rainItem ? (
                    <p className="text-[10px] leading-4 text-[#71828a]">
                      <span className="font-semibold text-[#4f4454]">
                        ฝน {Math.round(
                          Number(
                            rainItem.rainProbability ??
                              0
                          )
                        )}%
                      </span>
                      {rainItem.name
                        ? ` · ${rainItem.name}`
                        : ""}
                      {rainItem.hourLabel
                        ? ` · ${rainItem.hourLabel}`
                        : ""}
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
                    </p>
                  ) : (
                    <p className="text-[10px] leading-4 text-[#94899a]">
                      {status?.weatherAvailable ===
                      false
                        ? "ยังไม่มีข้อมูลพยากรณ์อากาศ"
                        : "กำลังรอข้อมูลอากาศ"}
                    </p>
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
              <div className="mt-2 rounded-lg bg-[#f8f5f9] px-2.5 py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9a8da0]">
                  Suggestion
                </p>

                <p className="mt-0.5 text-[10px] leading-4 text-[#615665]">
                  {status!.suggestions![0]}
                </p>
              </div>
            )}
        </>
      )}
    </section>
  );
}
