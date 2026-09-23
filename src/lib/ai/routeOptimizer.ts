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

function distanceKm(
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

function routeDistance(
  order: any[]
) {
  let total = 0;

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
      distanceKm(
        previous.coords.lat,
        previous.coords.lng,
        current.coords.lat,
        current.coords.lng
      );
  }

  return total;
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
  weights: RouteWeights
) {
  const distance =
    routeDistance(
      order
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
  weights: RouteWeights
) {
  if (
    baseline.length < 3
  ) {
    return baseline;
  }

  const baselineDistance =
    routeDistance(
      baseline
    );

  let best =
    [...baseline];

  let bestScore =
    scoreRoute(
      best,
      baselineDistance,
      weights
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
            weights
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

export function optimizeSelectedRoute(
  items: RouteItem[],
  attractionDetails:
    AttractionDetail[],
  options?: {
    weights?: Partial<RouteWeights>;
  }
) {
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
      twoOpt(
        baseline,
        weights
      );

    const beforeKm =
      routeDistance(
        baseline
      );

    const afterKm =
      routeDistance(
        optimized
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
          index > 0 &&
          optimized[
            index - 1
          ].coords &&
          point.coords
        ) {
          fromPreviousKm =
            distanceKm(
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
            periodSlots[
              index
            ] ||
            point.item
              ?.period ||
            null,

          route_from_previous_km:
            Number(
              fromPreviousKm
                .toFixed(2)
            ),

          route_algorithm:
            "ai-aware-2opt",
        });
      }
    );

    summary.push({
      day,

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
  };
}
