export type ItineraryTravelLeg = {
  distance_meters?: number | null;
  duration_minutes?: number | null;
};

function clampDuration(
  value: unknown,
  fallback: number
) {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
    ) ||
    numeric <= 0
  ) {
    return fallback;
  }

  return Math.max(
    20,
    Math.min(
      480,
      Math.round(
        numeric
      )
    )
  );
}

export function formatClockMinutes(
  value: number
) {
  const safe =
    Math.max(
      0,
      Math.round(
        value
      )
    );

  const normalized =
    safe %
    (24 * 60);

  const hours =
    Math.floor(
      normalized /
      60
    );

  const minutes =
    normalized %
    60;

  return (
    String(
      hours
    ).padStart(
      2,
      "0"
    ) +
    ":" +
    String(
      minutes
    ).padStart(
      2,
      "0"
    )
  );
}

function itemDuration(
  item: any
) {
  if (
    item?.type ===
    "restaurant"
  ) {
    return clampDuration(
      item
        ?.restaurant_duration_minutes ??
      item?.duration_minutes,
      60
    );
  }

  return clampDuration(
    item
      ?.place_duration_minutes ??
    item?.duration_minutes,
    90
  );
}

export function scheduleItineraryItems(
  items: any[],
  legs:
    ItineraryTravelLeg[],
  options?: {
    dayStartMinutes?: number;
    hasAccommodationOrigin?: boolean;
    travelSource?: string;
  }
) {
  if (
    !Array.isArray(
      items
    ) ||
    items.length === 0
  ) {
    return [];
  }

  const hasAccommodationOrigin =
    Boolean(
      options
        ?.hasAccommodationOrigin
    );

  let cursor =
    options?.dayStartMinutes ??
    9 * 60;

  const scheduled =
    items.map(
      (
        item,
        index
      ) => {
        const legIndex =
          hasAccommodationOrigin
            ? index
            : index - 1;

        const travelLeg =
          legIndex >= 0
            ? legs[
                legIndex
              ]
            : null;

        const travelMinutes =
          Math.max(
            0,
            Math.round(
              Number(
                travelLeg
                  ?.duration_minutes ??
                0
              )
            )
          );

        const travelDistanceMeters =
          Math.max(
            0,
            Math.round(
              Number(
                travelLeg
                  ?.distance_meters ??
                0
              )
            )
          );

        cursor +=
          travelMinutes;

        // เวลาเป็น dynamic ทั้งหมด:
        // ใช้ลำดับปัจจุบัน + เวลาเดินทาง + duration เท่านั้น
        const durationMinutes =
          itemDuration(
            item
          );

        const startMinutes =
          cursor;

        const endMinutes =
          startMinutes +
          durationMinutes;

        cursor =
          endMinutes;

        return {
          ...item,

          start_time:
            formatClockMinutes(
              startMinutes
            ),

          end_time:
            formatClockMinutes(
              endMinutes
            ),

          scheduled_duration_minutes:
            durationMinutes,

          travel_from_previous_minutes:
            travelMinutes,

          travel_from_previous_meters:
            travelDistanceMeters,

          schedule_travel_source:
            options
              ?.travelSource ??
            "estimated",
        };
      }
    );

  if (
    hasAccommodationOrigin &&
    legs.length >
      items.length &&
    scheduled.length > 0
  ) {
    const returnLeg =
      legs[
        items.length
      ];

    const lastIndex =
      scheduled.length - 1;

    scheduled[
      lastIndex
    ] = {
      ...scheduled[
        lastIndex
      ],

      return_to_accommodation_minutes:
        Math.max(
          0,
          Math.round(
            Number(
              returnLeg
                ?.duration_minutes ??
              0
            )
          )
        ),

      return_to_accommodation_meters:
        Math.max(
          0,
          Math.round(
            Number(
              returnLeg
                ?.distance_meters ??
              0
            )
          )
        ),
    };
  }

  return scheduled;
}

export function estimateTravelLegs(
  points: Array<{
    latitude: number;
    longitude: number;
  }>
): ItineraryTravelLeg[] {
  const earthRadius =
    6371000;

  const toRad =
    (
      degree: number
    ) =>
      (
        degree *
        Math.PI
      ) /
      180;

  const legs:
    ItineraryTravelLeg[] = [];

  for (
    let index = 1;
    index <
    points.length;
    index += 1
  ) {
    const from =
      points[
        index - 1
      ];

    const to =
      points[
        index
      ];

    const dLat =
      toRad(
        to.latitude -
        from.latitude
      );

    const dLng =
      toRad(
        to.longitude -
        from.longitude
      );

    const a =
      Math.sin(
        dLat / 2
      ) ** 2 +
      Math.cos(
        toRad(
          from.latitude
        )
      ) *
        Math.cos(
          toRad(
            to.latitude
          )
        ) *
        Math.sin(
          dLng / 2
        ) ** 2;

    const straightMeters =
      2 *
      earthRadius *
      Math.atan2(
        Math.sqrt(
          a
        ),
        Math.sqrt(
          1 - a
        )
      );

    // fallback only: road distance is usually longer than straight line.
    const estimatedRoadMeters =
      straightMeters *
      1.25;

    // conservative urban driving estimate around 28 km/h.
    const estimatedMinutes =
      Math.max(
        3,
        Math.ceil(
          estimatedRoadMeters /
          1000 /
          28 *
          60
        )
      );

    legs.push({
      distance_meters:
        Math.round(
          estimatedRoadMeters
        ),

      duration_minutes:
        estimatedMinutes,
    });
  }

  return legs;
}
