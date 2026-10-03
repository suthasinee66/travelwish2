import type {
    TripPlanInput,
} from "./types";

/* ==================================================
   WEIGHTED PROFILE-MATCHING BASELINE

   Content-based weighted profile matching:

   travel_type       6 × 3 = 18
   activities        5 × 2 = 10
   atmosphere        4 × 2 = 8
   budget            1 × 2 = 2
   travel_companion  1 × 2 = 2

   Maximum theoretical score = 40
================================================== */

const MAX_SCORE = 40;

function scoreAttraction(
    place: any,
    trip: TripPlanInput
): number {
    let score = 0;

    /* -------------------------------------------------
       Travel Type
    ------------------------------------------------- */

    if (
        Array.isArray(place.travel_type) &&
        Array.isArray(trip.travelType)
    ) {
        for (
            const type of trip.travelType
        ) {
            if (
                place.travel_type.includes(
                    type
                )
            ) {
                score += 3;
            }
        }
    }

    /* -------------------------------------------------
       Activities
    ------------------------------------------------- */

    if (
        Array.isArray(place.activities) &&
        Array.isArray(trip.activities)
    ) {
        for (
            const activity of trip.activities
        ) {
            if (
                place.activities.includes(
                    activity
                )
            ) {
                score += 2;
            }
        }
    }

    /* -------------------------------------------------
       Atmosphere
    ------------------------------------------------- */

    if (
        Array.isArray(place.atmosphere) &&
        Array.isArray(trip.atmosphere)
    ) {
        for (
            const atmosphere of trip.atmosphere
        ) {
            if (
                place.atmosphere.includes(
                    atmosphere
                )
            ) {
                score += 2;
            }
        }
    }

    /* -------------------------------------------------
       Companion
    ------------------------------------------------- */

    if (
        Array.isArray(place.travel_companion) &&
        trip.companion
    ) {
        if (
            place.travel_companion.includes(
                trip.companion
            )
        ) {
            score += 2;
        }
    }

    /* -------------------------------------------------
       Budget
    ------------------------------------------------- */

    if (
        Array.isArray(place.budget) &&
        trip.budget != null
    ) {
        let userBudget = "";

        if (trip.budget <= 3000) {
            userBudget = "ประหยัด";
        }
        else if (trip.budget <= 10000) {
            userBudget = "ปานกลาง";
        }
        else {
            userBudget = "หรูหรา";
        }

        if (
            place.budget.includes(
                userBudget
            )
        ) {
            score += 2;
        }
    }

    return score;
}

/* ==================================================
   RUN WEIGHTED PROFILE-MATCHING BASELINE
================================================== */

export function runWeightedProfileMatchingBaseline(
    attractions: any[],
    trip: TripPlanInput,
    k: number
) {
    const scored =
        attractions.map(
            place => {
                const rawScore =
                    scoreAttraction(
                        place,
                        trip
                    );

                const score =
                    Math.min(
                        rawScore /
                        MAX_SCORE,
                        1
                    );

                return {
                    ...place,

                    rawScore,

                    score,
                };
            }
        );

    return scored
        .sort(
            (a, b) => {
                if (
                    b.score !==
                    a.score
                ) {
                    return (
                        b.score -
                        a.score
                    );
                }

                return String(
                    a.att_id
                ).localeCompare(
                    String(
                        b.att_id
                    )
                );
            }
        )
        .slice(
            0,
            k
        );
}

/**
 * Backward-compatible alias for older experiment scripts.
 * New code should use runWeightedProfileMatchingBaseline().
 */
export const runOldAlgorithm =
    runWeightedProfileMatchingBaseline;
