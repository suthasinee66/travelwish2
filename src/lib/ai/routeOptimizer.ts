export type RouteMode =
  | "ai_balanced"
  | "near_to_far"
  | "far_to_near"
  | "shortest"
  | "loop"
  | "time_aware";

export type AccommodationAnchor = {
  id?: string | null;
  name?: string | null;
  latitude: number;
  longitude: number;
};

type RouteItem = {
  day?: number;
  period?: string;
  place_id?: string | null;
  place_name?: string;
  [key: string]: any;
};

type AttractionDetail = {
  att_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: any;
};

type RouteWeights = {
  distance: number;
  aiOrder: number;
  period: number;
  anchors: number;
};

const DEFAULT_WEIGHTS: RouteWeights = {
  distance: 0.55,
  aiOrder: 0.25,
  period: 0.10,
  anchors: 0.10,
};

const PERIOD_ORDER: Record<string, number> = {
  Morning: 0,
  Breakfast: 0,
  Lunch: 1,
  Afternoon: 2,
  Evening: 3,
  Dinner: 4,
  Night: 5,
};

function toNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

export function routeDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;

  const dLat =
    (
      lat2 - lat1
    ) *
    Math.PI /
    180;

  const dLon =
    (
      lon2 - lon1
    ) *
    Math.PI /
    180;

  const a =
    Math.sin(
      dLat / 2
    ) **
      2 +
    Math.cos(
      lat1 *
        Math.PI /
        180
    ) *
      Math.cos(
        lat2 *
          Math.PI /
          180
      ) *
      Math.sin(
        dLon / 2
      ) **
        2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        1 - a
      )
    )
  );
}

function validAnchor(
  accommodation?:
    AccommodationAnchor |
    null
) {
  if (!accommodation) {
    return null;
  }

  const lat =
    toNumber(
      accommodation.latitude
    );

  const lng =
    toNumber(
      accommodation.longitude
    );

  if (
    lat === null ||
    lng === null
  ) {
    return null;
  }

  return {
    ...accommodation,
    latitude: lat,
    longitude: lng,
  };
}

function routeDistance(
  order: any[],
  accommodation?:
    AccommodationAnchor |
    null,
  returnToAccommodation =
    true
) {
  if (
    order.length === 0
  ) {
    return 0;
  }

  const anchor =
    validAnchor(
      accommodation
    );

  let total = 0;

  if (
    anchor &&
    order[0]?.coords
  ) {
    total +=
      routeDistanceKm(
        anchor.latitude,
        anchor.longitude,
        order[0].coords.lat,
        order[0].coords.lng
      );
  }

  for (
    let index = 1;
    index < order.length;
    index += 1
  ) {
    const previous =
      order[index - 1];

    const current =
      order[index];

    if (
      !previous.coords ||
      !current.coords
    ) {
      continue;
    }

    total +=
      routeDistanceKm(
        previous.coords.lat,
        previous.coords.lng,
        current.coords.lat,
        current.coords.lng
      );
  }

  if (
    anchor &&
    returnToAccommodation &&
    order[
      order.length - 1
    ]?.coords
  ) {
    const last =
      order[
        order.length - 1
      ];

    total +=
      routeDistanceKm(
        last.coords.lat,
        last.coords.lng,
        anchor.latitude,
        anchor.longitude
      );
  }

  return total;
}

function distanceFromAccommodation(
  point: any,
  accommodation?:
    AccommodationAnchor |
    null
) {
  const anchor =
    validAnchor(
      accommodation
    );

  if (
    !anchor ||
    !point?.coords
  ) {
    return null;
  }

  return routeDistanceKm(
    anchor.latitude,
    anchor.longitude,
    point.coords.lat,
    point.coords.lng
  );
}

function aiOrderPenalty(
  order: any[]
) {
  const n =
    order.length;

  if (n <= 1) {
    return 0;
  }

  const denominator =
    Math.max(
      1,
      n * (n - 1)
    );

  const displacement =
    order.reduce(
      (
        sum,
        point,
        newIndex
      ) =>
        sum +
        Math.abs(
          point.aiIndex -
            newIndex
        ),
      0
    );

  return (
    displacement /
    denominator
  );
}

function periodPenalty(
  order: any[]
) {
  const n =
    order.length;

  if (n <= 1) {
    return 0;
  }

  let inversions = 0;
  let comparable = 0;

  for (
    let i = 0;
    i < n;
    i += 1
  ) {
    const left =
      PERIOD_ORDER[
        String(
          order[i].item
            ?.period ?? ""
        )
      ];

    if (
      left === undefined
    ) {
      continue;
    }

    for (
      let j = i + 1;
      j < n;
      j += 1
    ) {
      const right =
        PERIOD_ORDER[
          String(
            order[j].item
              ?.period ?? ""
          )
        ];

      if (
        right === undefined
      ) {
        continue;
      }

      comparable += 1;

      if (
        left > right
      ) {
        inversions += 1;
      }
    }
  }

  return comparable > 0
    ? inversions /
        comparable
    : 0;
}

function anchorPenalty(
  order: any[]
) {
  if (
    order.length <= 1
  ) {
    return 0;
  }

  let penalty = 0;

  if (
    order[0].aiIndex !==
    0
  ) {
    penalty += 0.5;
  }

  if (
    order[
      order.length - 1
    ].aiIndex !==
    order.length - 1
  ) {
    penalty += 0.5;
  }

  return penalty;
}

function scoreRoute(
  order: any[],
  baselineDistance: number,
  weights: RouteWeights,
  accommodation?:
    AccommodationAnchor |
    null
) {
  const distance =
    routeDistance(
      order,
      accommodation,
      true
    );

  const normalizedDistance =
    baselineDistance > 0
      ? distance /
        baselineDistance
      : distance > 0
        ? 1
        : 0;

  return (
    weights.distance *
      normalizedDistance +
    weights.aiOrder *
      aiOrderPenalty(
        order
      ) +
    weights.period *
      periodPenalty(
        order
      ) +
    weights.anchors *
      anchorPenalty(
        order
      )
  );
}

function twoOpt(
  baseline: any[],
  weights: RouteWeights,
  accommodation?:
    AccommodationAnchor |
    null
) {
  if (
    baseline.length < 3
  ) {
    return baseline;
  }

  const baselineDistance =
    routeDistance(
      baseline,
      accommodation,
      true
    );

  let best =
    [...baseline];

  let bestScore =
    scoreRoute(
      best,
      baselineDistance,
      weights,
      accommodation
    );

  let improved =
    true;

  let loops = 0;

  while (
    improved &&
    loops < 20
  ) {
    improved = false;
    loops += 1;

    for (
      let start = 0;
      start <
      best.length - 1;
      start += 1
    ) {
      for (
        let end =
          start + 1;
        end <
        best.length;
        end += 1
      ) {
        const candidate = [
          ...best.slice(
            0,
            start
          ),
          ...best
            .slice(
              start,
              end + 1
            )
            .reverse(),
          ...best.slice(
            end + 1
          ),
        ];

        const candidateScore =
          scoreRoute(
            candidate,
            baselineDistance,
            weights,
            accommodation
          );

        if (
          candidateScore <
          bestScore -
            0.001
        ) {
          best =
            candidate;

          bestScore =
            candidateScore;

          improved =
            true;
        }
      }
    }
  }

  return best;
}

function nearestNeighbor(
  points: any[],
  accommodation?:
    AccommodationAnchor |
    null,
  startFar =
    false
) {
  if (
    points.length <= 1
  ) {
    return points;
  }

  const anchor =
    validAnchor(
      accommodation
    );

  const remaining =
    [...points];

  let current =
    remaining.shift()!;

  if (anchor) {
    const byHotelDistance =
      [...remaining, current]
        .map(
          point => ({
            point,
            distance:
              distanceFromAccommodation(
                point,
                anchor
              ) ??
              Number.POSITIVE_INFINITY,
          })
        )
        .sort(
          (a, b) =>
            startFar
              ? b.distance -
                a.distance
              : a.distance -
                b.distance
        );

    current =
      byHotelDistance[0]
        .point;

    const index =
      remaining.findIndex(
        point =>
          point === current
      );

    if (index >= 0) {
      remaining.splice(
        index,
        1
      );
    } else {
      const originalIndex =
        points.findIndex(
          point =>
            point === current
        );

      const reconstructed =
        points.filter(
          (
            _,
            pointIndex
          ) =>
            pointIndex !==
            originalIndex
        );

      remaining.splice(
        0,
        remaining.length,
        ...reconstructed
      );
    }
  }

  const route =
    [current];

  while (
    remaining.length > 0
  ) {
    const last =
      route[
        route.length - 1
      ];

    let bestIndex = 0;
    let bestDistance =
      Number.POSITIVE_INFINITY;

    for (
      let index = 0;
      index <
      remaining.length;
      index += 1
    ) {
      const point =
        remaining[index];

      if (
        !last.coords ||
        !point.coords
      ) {
        continue;
      }

      const distance =
        routeDistanceKm(
          last.coords.lat,
          last.coords.lng,
          point.coords.lat,
          point.coords.lng
        );

      if (
        distance <
        bestDistance
      ) {
        bestDistance =
          distance;

        bestIndex =
          index;
      }
    }

    route.push(
      remaining.splice(
        bestIndex,
        1
      )[0]
    );
  }

  return route;
}

function orderNearToFar(
  points: any[],
  accommodation?:
    AccommodationAnchor |
    null
) {
  const anchor =
    validAnchor(
      accommodation
    );

  if (!anchor) {
    return points;
  }

  return [...points].sort(
    (a, b) =>
      (
        distanceFromAccommodation(
          a,
          anchor
        ) ??
        Number.POSITIVE_INFINITY
      ) -
      (
        distanceFromAccommodation(
          b,
          anchor
        ) ??
        Number.POSITIVE_INFINITY
      )
  );
}

function orderFarToNear(
  points: any[],
  accommodation?:
    AccommodationAnchor |
    null
) {
  const anchor =
    validAnchor(
      accommodation
    );

  if (!anchor) {
    return points;
  }

  return [...points].sort(
    (a, b) =>
      (
        distanceFromAccommodation(
          b,
          anchor
        ) ??
        -1
      ) -
      (
        distanceFromAccommodation(
          a,
          anchor
        ) ??
        -1
      )
  );
}

function orderByPeriod(
  points: any[]
) {
  return [...points].sort(
    (
      left,
      right
    ) => {
      const a =
        PERIOD_ORDER[
          String(
            left.item
              ?.period ?? ""
          )
        ];

      const b =
        PERIOD_ORDER[
          String(
            right.item
              ?.period ?? ""
          )
        ];

      if (
        a === undefined &&
        b === undefined
      ) {
        return (
          left.aiIndex -
          right.aiIndex
        );
      }

      if (
        a === undefined
      ) {
        return 1;
      }

      if (
        b === undefined
      ) {
        return -1;
      }

      return (
        a - b ||
        left.aiIndex -
          right.aiIndex
      );
    }
  );
}

function sortedPeriodSlots(
  points: any[]
) {
  return points
    .map(
      point =>
        String(
          point.item
            ?.period ??
            ""
        )
    )
    .sort(
      (
        left,
        right
      ) => {
        const a =
          PERIOD_ORDER[
            left
          ];

        const b =
          PERIOD_ORDER[
            right
          ];

        if (
          a === undefined &&
          b === undefined
        ) {
          return 0;
        }

        if (
          a === undefined
        ) {
          return 1;
        }

        if (
          b === undefined
        ) {
          return -1;
        }

        return a - b;
      }
    );
}

function optimizeForMode(
  baseline: any[],
  mode: RouteMode,
  weights: RouteWeights,
  accommodation?:
    AccommodationAnchor |
    null
) {
  switch (mode) {
    case "near_to_far":
      return orderNearToFar(
        baseline,
        accommodation
      );

    case "far_to_near":
      return orderFarToNear(
        baseline,
        accommodation
      );

    case "shortest": {
      const nearest =
        nearestNeighbor(
          baseline,
          accommodation,
          false
        );

      return twoOpt(
        nearest,
        {
          distance: 0.9,
          aiOrder: 0.03,
          period: 0.04,
          anchors: 0.03,
        },
        accommodation
      );
    }

    case "loop": {
      const nearest =
        nearestNeighbor(
          baseline,
          accommodation,
          false
        );

      return twoOpt(
        nearest,
        {
          distance: 0.82,
          aiOrder: 0.08,
          period: 0.05,
          anchors: 0.05,
        },
        accommodation
      );
    }

    case "time_aware": {
      const byPeriod =
        orderByPeriod(
          baseline
        );

      return twoOpt(
        byPeriod,
        {
          distance: 0.35,
          aiOrder: 0.15,
          period: 0.45,
          anchors: 0.05,
        },
        accommodation
      );
    }

    case "ai_balanced":
    default:
      return twoOpt(
        baseline,
        weights,
        accommodation
      );
  }
}

export function optimizeSelectedRoute(
  items: RouteItem[],
  attractionDetails:
    AttractionDetail[],
  options?: {
    weights?: Partial<RouteWeights>;
    mode?: RouteMode;
    accommodation?:
      AccommodationAnchor |
      null;
    returnToAccommodation?: boolean;
  }
) {
  const mode =
    options?.mode ??
    "ai_balanced";

  const accommodation =
    validAnchor(
      options?.accommodation
    );

  const weights: RouteWeights = {
    ...DEFAULT_WEIGHTS,
    ...options?.weights,
  };

  const detailById =
    new Map(
      attractionDetails.map(
        detail => [
          String(
            detail.att_id
          ),
          detail,
        ]
      )
    );

  const indexed =
    items.map(
      (
        item,
        globalIndex
      ) => {
        const detail =
          detailById.get(
            String(
              item.place_id ??
                ""
            )
          );

        const lat =
          toNumber(
            detail?.latitude
          );

        const lng =
          toNumber(
            detail?.longitude
          );

        return {
          item,
          globalIndex,
          day:
            Number(
              item.day
            ) || 1,
          coords:
            lat !== null &&
            lng !== null
              ? {
                  lat,
                  lng,
                }
              : null,
        };
      }
    );

  const days =
    [
      ...new Set(
        indexed.map(
          point =>
            point.day
        )
      ),
    ].sort(
      (a, b) =>
        a - b
    );

  const optimizedItems:
    RouteItem[] = [];

  const summary:
    any[] = [];

  for (
    const day
    of days
  ) {
    const dayPoints =
      indexed
        .filter(
          point =>
            point.day ===
            day
        )
        .map(
          (
            point,
            aiIndex
          ) => ({
            ...point,
            aiIndex,
          })
        );

    const baseline =
      [...dayPoints];

    const optimized =
      optimizeForMode(
        baseline,
        mode,
        weights,
        accommodation
      );

    const beforeKm =
      routeDistance(
        baseline,
        accommodation,
        options
          ?.returnToAccommodation ??
          true
      );

    const afterKm =
      routeDistance(
        optimized,
        accommodation,
        options
          ?.returnToAccommodation ??
          true
      );

    const periodSlots =
      sortedPeriodSlots(
        baseline
      );

    optimized.forEach(
      (
        point,
        index
      ) => {
        let fromPreviousKm =
          0;

        if (
          index === 0 &&
          accommodation &&
          point.coords
        ) {
          fromPreviousKm =
            routeDistanceKm(
              accommodation.latitude,
              accommodation.longitude,
              point.coords.lat,
              point.coords.lng
            );
        } else if (
          index > 0 &&
          optimized[
            index - 1
          ].coords &&
          point.coords
        ) {
          fromPreviousKm =
            routeDistanceKm(
              optimized[
                index - 1
              ].coords.lat,
              optimized[
                index - 1
              ].coords.lng,
              point.coords.lat,
              point.coords.lng
            );
        }

        const hotelDistance =
          distanceFromAccommodation(
            point,
            accommodation
          );

        optimizedItems.push({
          ...point.item,

          day,

          ai_preferred_order:
            point.aiIndex + 1,

          ai_preferred_period:
            point.item
              ?.period ??
            null,

          route_order:
            index + 1,

          period:
            mode ===
              "time_aware" ||
            mode ===
              "ai_balanced"
              ? (
                  periodSlots[
                    index
                  ] ||
                  point.item
                    ?.period ||
                  null
                )
              : (
                  point.item
                    ?.period ??
                  periodSlots[
                    index
                  ] ??
                  null
                ),

          route_mode:
            mode,

          route_from_previous_km:
            Number(
              fromPreviousKm
                .toFixed(2)
            ),

          distance_from_accommodation_km:
            hotelDistance ===
              null
              ? null
              : Number(
                  hotelDistance
                    .toFixed(2)
                ),

          accommodation_id:
            accommodation?.id ??
            null,

          accommodation_name:
            accommodation?.name ??
            null,

          route_algorithm:
            "ai-aware-route-optimizer",
        });
      }
    );

    const returnKm =
      accommodation &&
      optimized[
        optimized.length - 1
      ]?.coords
        ? routeDistanceKm(
            optimized[
              optimized.length - 1
            ].coords.lat,
            optimized[
              optimized.length - 1
            ].coords.lng,
            accommodation.latitude,
            accommodation.longitude
          )
        : 0;

    summary.push({
      day,

      mode,

      stops:
        optimized.length,

      before_km:
        Number(
          beforeKm.toFixed(
            2
          )
        ),

      after_km:
        Number(
          afterKm.toFixed(
            2
          )
        ),

      saved_km:
        Number(
          Math.max(
            0,
            beforeKm -
              afterKm
          ).toFixed(2)
        ),

      return_to_accommodation_km:
        Number(
          returnKm.toFixed(
            2
          )
        ),

      accommodation_name:
        accommodation?.name ??
        null,

      changed_order:
        optimized.some(
          (
            point,
            index
          ) =>
            point.aiIndex !==
            index
        ),
    });
  }

  return {
    items:
      optimizedItems,

    summary,

    weights,

    mode,

    accommodation,
  };
}
