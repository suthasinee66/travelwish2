const TRIP_ITEM_META_PREFIX =
  "__TRAVELWISH_ITEM_META_V1__";

export type TripItemStoredMetadata = {
  notes: string | null;
  start_time: string | null;
  end_time: string | null;
  time_locked: boolean;
};

export function decodeTripItemNotes(
  value: unknown
): TripItemStoredMetadata {
  const raw =
    typeof value === "string"
      ? value
      : null;

  if (
    !raw ||
    !raw.startsWith(
      TRIP_ITEM_META_PREFIX
    )
  ) {
    return {
      notes: raw,
      start_time: null,
      end_time: null,
      time_locked: false,
    };
  }

  try {
    const parsed =
      JSON.parse(
        raw.slice(
          TRIP_ITEM_META_PREFIX.length
        )
      );

    return {
      notes:
        typeof parsed?.notes === "string"
          ? parsed.notes
          : null,

      start_time:
        typeof parsed?.start_time === "string"
          ? parsed.start_time
          : null,

      end_time:
        typeof parsed?.end_time === "string"
          ? parsed.end_time
          : null,

      time_locked:
        parsed?.time_locked === true,
    };
  } catch {
    return {
      notes: raw,
      start_time: null,
      end_time: null,
      time_locked: false,
    };
  }
}

export function encodeTripItemNotes(
  notes: unknown,
  startTime: unknown,
  endTime: unknown,
  timeLocked = false
) {
  const previous =
    decodeTripItemNotes(
      notes
    );

  const cleanNotes =
    previous.notes;

  const normalizedStart =
    typeof startTime === "string" &&
    startTime.trim()
      ? startTime.trim()
      : null;

  const normalizedEnd =
    typeof endTime === "string" &&
    endTime.trim()
      ? endTime.trim()
      : null;

  if (
    !normalizedStart &&
    !normalizedEnd &&
    !timeLocked
  ) {
    return cleanNotes;
  }

  return (
    TRIP_ITEM_META_PREFIX +
    JSON.stringify({
      notes:
        cleanNotes,
      start_time:
        normalizedStart,
      end_time:
        normalizedEnd,
      time_locked:
        Boolean(
          timeLocked
        ),
    })
  );
}
