import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Loader2,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AddPlaceToTripModalProps = {
  open: boolean;
  place: any | null;
  onClose: () => void;
};

export default function AddPlaceToTripModal({
  open,
  place,
  onClose,
}: AddPlaceToTripModalProps) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [addingDayId, setAddingDayId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState("");
  const [message, setMessage] = useState("");

  const selectedTrip = useMemo(
    () =>
      trips.find(
        trip => String(trip.id) === String(selectedTripId)
      ) ?? null,
    [trips, selectedTripId]
  );

  useEffect(() => {
    if (!open || !place) return;

    setSelectedTripId(null);
    setShowCreate(false);
    setMessage("");
    setNewTripTitle(
      place?.province
        ? `Trip to ${place.province}`
        : "New Trip"
    );

    loadTrips();
  }, [open, place?.att_id]);

  async function loadTrips() {
    setLoadingTrips(true);

    try {
      const { data: auth } =
        await supabase.auth.getUser();

      if (!auth.user) {
        setMessage("กรุณาเข้าสู่ระบบก่อน");
        return;
      }

      const { data, error } =
        await supabase
          .from("trips")
          .select(`
            id,
            title,
            destination,
            created_at,
            trip_days(
              id,
              day_number,
              title,
              trip_items(
                id,
                item_type,
                att_id,
                sort_order
              )
            )
          `)
          .eq("profile_id", auth.user.id)
          .order("created_at", {
            ascending: false,
          });

      if (error) throw error;

      const normalized =
        (data || []).map((trip: any) => ({
          ...trip,
          trip_days: [
            ...(trip.trip_days || []),
          ].sort(
            (a: any, b: any) =>
              Number(a.day_number) -
              Number(b.day_number)
          ),
        }));

      setTrips(normalized);
    } catch (error) {
      console.error(
        "❌ LOAD TRIPS FOR PLACE:",
        error
      );
      setMessage("โหลดรายการทริปไม่สำเร็จ");
    } finally {
      setLoadingTrips(false);
    }
  }

  async function ensureDay(
    trip: any,
    requestedDay?: any
  ) {
    if (requestedDay?.id) {
      return requestedDay;
    }

    const firstDay =
      trip?.trip_days?.[0];

    if (firstDay?.id) {
      return firstDay;
    }

    const { data, error } =
      await supabase
        .from("trip_days")
        .insert({
          trip_id: trip.id,
          day_number: 1,
          title: null,
        })
        .select()
        .single();

    if (error || !data) {
      throw error ||
        new Error("Create trip day failed");
    }

    return data;
  }

  async function insertPlace(
    trip: any,
    requestedDay?: any
  ) {
    if (!place?.att_id) return;

    const day =
      await ensureDay(
        trip,
        requestedDay
      );

    setAddingDayId(
      String(day.id)
    );
    setMessage("");

    try {
      const existingItems =
        Array.isArray(day.trip_items)
          ? day.trip_items
          : [];

      const alreadyExists =
        existingItems.some(
          (item: any) =>
            item?.item_type === "place" &&
            String(item?.att_id) ===
              String(place.att_id)
        );

      if (alreadyExists) {
        setMessage(
          `มี ${place?.name_th || "สถานที่นี้"} อยู่ใน Day ${day.day_number || 1} แล้ว`
        );
        return;
      }

      const maxSortOrder =
        existingItems.reduce(
          (max: number, item: any) =>
            Math.max(
              max,
              Number(item?.sort_order || 0)
            ),
          0
        );

      const { error } =
        await supabase
          .from("trip_items")
          .insert({
            trip_day_id: day.id,
            item_type: "place",
            att_id: String(place.att_id),
            restaurant_id: null,
            sort_order:
              maxSortOrder + 1,
          });

      if (error) throw error;

      setMessage(
        `เพิ่ม ${place?.name_th || "สถานที่"} ลง Day ${day.day_number || 1} แล้ว ✓`
      );

      setTimeout(() => {
        onClose();
      }, 650);
    } catch (error) {
      console.error(
        "❌ ADD PLACE TO TRIP:",
        error
      );
      setMessage(
        "เพิ่มสถานที่ลงทริปไม่สำเร็จ"
      );
    } finally {
      setAddingDayId(null);
    }
  }

  async function createTripAndAdd() {
    if (!place?.att_id || creating) {
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const { data: auth } =
        await supabase.auth.getUser();

      if (!auth.user) {
        setMessage("กรุณาเข้าสู่ระบบก่อน");
        return;
      }

      const title =
        newTripTitle.trim() ||
        (
          place?.province
            ? `Trip to ${place.province}`
            : "New Trip"
        );

      const {
        data: trip,
        error: tripError,
      } =
        await supabase
          .from("trips")
          .insert({
            profile_id: auth.user.id,
            title,
            destination:
              place?.province || "",
            people: "1 traveler",
          })
          .select()
          .single();

      if (tripError || !trip) {
        throw tripError ||
          new Error("Create trip failed");
      }

      const {
        data: day,
        error: dayError,
      } =
        await supabase
          .from("trip_days")
          .insert({
            trip_id: trip.id,
            day_number: 1,
            title: null,
          })
          .select()
          .single();

      if (dayError || !day) {
        throw dayError ||
          new Error("Create day failed");
      }

      const { error: itemError } =
        await supabase
          .from("trip_items")
          .insert({
            trip_day_id: day.id,
            item_type: "place",
            att_id: String(place.att_id),
            restaurant_id: null,
            sort_order: 1,
          });

      if (itemError) {
        throw itemError;
      }

      setMessage(
        `สร้าง “${title}” และเพิ่มสถานที่แล้ว ✓`
      );

      setTimeout(() => {
        onClose();
      }, 650);
    } catch (error) {
      console.error(
        "❌ CREATE TRIP FROM PLACE:",
        error
      );
      setMessage("สร้างทริปไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  }

  if (!open || !place) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[200]
        flex
        items-center
        justify-center
        bg-black/25
        p-4
      "
      onClick={onClose}
    >
      <div
        className="
          w-full
          max-w-[430px]
          max-h-[calc(100dvh-2rem)]
          overflow-y-auto
          rounded-3xl
          border
          border-gray-200
          bg-white
          p-5
          shadow-[0_18px_50px_rgba(0,0,0,0.16)]
        "
        onClick={event =>
          event.stopPropagation()
        }
      >
        <div className="
          flex
          items-start
          justify-between
          gap-3
        ">
          <div className="min-w-0">
            <h2 className="
              text-lg
              font-bold
              text-[#49334f]
            ">
              เพิ่มลงทริป
            </h2>
            <div className="
              mt-1
              flex
              items-center
              gap-1
              text-xs
              text-gray-500
            ">
              <MapPin size={13} />
              <span className="truncate">
                {place?.name_th ||
                  place?.name_en ||
                  "สถานที่"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-full
              hover:bg-gray-100
            "
          >
            <X size={17} />
          </button>
        </div>

        {!showCreate && (
          <>
            <div className="
              mt-5
              flex
              items-center
              justify-between
            ">
              <span className="
                text-sm
                font-semibold
              ">
                เลือก Trip
              </span>

              <button
                type="button"
                onClick={() => {
                  setShowCreate(true);
                  setSelectedTripId(null);
                  setMessage("");
                }}
                className="
                  flex
                  items-center
                  gap-1
                  text-xs
                  font-semibold
                  text-[#6f456f]
                "
              >
                <Plus size={14} />
                Create New
              </button>
            </div>

            {loadingTrips ? (
              <div className="
                flex
                justify-center
                py-8
              ">
                <Loader2
                  className="
                    h-5
                    w-5
                    animate-spin
                  "
                />
              </div>
            ) : trips.length === 0 ? (
              <button
                type="button"
                onClick={() =>
                  setShowCreate(true)
                }
                className="
                  mt-3
                  w-full
                  rounded-2xl
                  border
                  border-dashed
                  p-5
                  text-sm
                  text-gray-500
                "
              >
                ยังไม่มี Trip — สร้างใหม่
              </button>
            ) : (
              <div className="
                mt-3
                space-y-2
              ">
                {trips.map((trip: any) => {
                  const selected =
                    String(
                      selectedTripId
                    ) ===
                    String(trip.id);

                  return (
                    <div
                      key={trip.id}
                      className={`
                        rounded-2xl
                        border
                        transition
                        ${selected
                          ? "border-[#b89bcb] bg-[#faf6fc]"
                          : "border-gray-200"
                        }
                      `}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTripId(
                            selected
                              ? null
                              : String(trip.id)
                          );
                          setMessage("");
                        }}
                        className="
                          flex
                          w-full
                          items-center
                          gap-3
                          p-3
                          text-left
                        "
                      >
                        <div className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-[#f1e8f4]
                          text-[#6f456f]
                        ">
                          <CalendarDays
                            size={17}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="
                            truncate
                            text-sm
                            font-semibold
                          ">
                            {trip.title ||
                              "Untitled Trip"}
                          </div>
                          <div className="
                            truncate
                            text-[11px]
                            text-gray-500
                          ">
                            {trip.destination ||
                              "No destination"}
                          </div>
                        </div>

                        {selected && (
                          <Check
                            size={16}
                            className="
                              text-[#6f456f]
                            "
                          />
                        )}
                      </button>

                      {selected && (
                        <div className="
                          border-t
                          border-gray-100
                          px-3
                          pb-3
                          pt-2
                        ">
                          <div className="
                            mb-2
                            text-[11px]
                            text-gray-500
                          ">
                            เลือกวันที่จะเพิ่ม
                          </div>

                          <div className="
                            flex
                            flex-wrap
                            gap-2
                          ">
                            {(
                              trip.trip_days
                                ?.length
                                ? trip.trip_days
                                : [{
                                    id: null,
                                    day_number: 1,
                                    trip_items: [],
                                  }]
                            ).map(
                              (day: any) => (
                                <button
                                  key={
                                    day.id ||
                                    "new-day-1"
                                  }
                                  type="button"
                                  disabled={
                                    addingDayId !=
                                    null
                                  }
                                  onClick={() =>
                                    insertPlace(
                                      trip,
                                      day
                                    )
                                  }
                                  className="
                                    rounded-full
                                    border
                                    border-[#d8c6df]
                                    px-3
                                    py-1.5
                                    text-xs
                                    font-medium
                                    text-[#573d63]
                                    hover:bg-[#f4edf6]
                                    disabled:opacity-50
                                  "
                                >
                                  {addingDayId ===
                                  String(day.id)
                                    ? "กำลังเพิ่ม..."
                                    : `Day ${day.day_number || 1}`
                                  }
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {showCreate && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setMessage("");
              }}
              className="
                mb-3
                text-xs
                font-medium
                text-gray-500
              "
            >
              ← กลับไปเลือก Trip
            </button>

            <label className="
              text-sm
              font-semibold
            ">
              ชื่อ Trip ใหม่
            </label>

            <input
              value={newTripTitle}
              onChange={event =>
                setNewTripTitle(
                  event.target.value
                )
              }
              placeholder="New Trip"
              className="
                mt-2
                w-full
                rounded-xl
                border
                border-gray-200
                px-4
                py-3
                text-sm
                outline-none
                focus:border-[#b89bcb]
              "
            />

            <button
              type="button"
              disabled={creating}
              onClick={createTripAndAdd}
              className="
                mt-4
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#573d63]
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                disabled:opacity-60
              "
            >
              {creating ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Plus size={16} />
              )}
              Create & Add Place
            </button>
          </div>
        )}

        {message && (
          <div className="
            mt-4
            rounded-xl
            bg-[#f7f2f8]
            px-3
            py-2
            text-xs
            text-[#573d63]
          ">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
