/* =========================================================
   EVALUATION METRICS
   ========================================================= */

export interface EvaluationMetrics {
    precision: number;
    recall: number;
    f1: number;

    ndcg: number;

    diversity: number;

    averageDistance: number;
    averagePopularity: number;
    averageRating: number;

    coverage: number;

    relevantCount: number;
    truePositive: number;
}

/* =========================================================
   SAFE NUMBER
   ========================================================= */

function safeNumber(
    value: unknown,
    fallback = 0
): number {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

/* =========================================================
   DISTANCE
   ========================================================= */

function getCoordinates(
    place: any
) {
    const latitude =
        place.latitude ??
        place.lat;

    const longitude =
        place.longitude ??
        place.lng;

    const lat =
        safeNumber(latitude);

    const lng =
        safeNumber(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        (lat === 0 && lng === 0)
    ) {
        return null;
    }

    return {
        latitude: lat,
        longitude: lng,
    };
}

function distanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371;

    const dLat =
        (lat2 - lat1) *
        Math.PI /
        180;

    const dLon =
        (lon2 - lon1) *
        Math.PI /
        180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(
            lat1 * Math.PI / 180
        ) *
        Math.cos(
            lat2 * Math.PI / 180
        ) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}

/* =========================================================
   COSINE
   ========================================================= */

function cosineSimilarity(
    a: number[],
    b: number[]
): number {
    if (
        !a.length ||
        !b.length ||
        a.length !== b.length
    ) {
        return 0;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (
        let i = 0;
        i < a.length;
        i++
    ) {
        dot +=
            a[i] *
            b[i];

        normA +=
            a[i] *
            a[i];

        normB +=
            b[i] *
            b[i];
    }

    if (
        normA === 0 ||
        normB === 0
    ) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            1,
            dot /
            (
                Math.sqrt(normA) *
                Math.sqrt(normB)
            )
        )
    );
}

function getRating(
    place: any
): number {
    const values = [
        place.predictedRatingByAttraction,
        place.predictedRating,
        place.avg_rating,
        place.averageRating,
        place.rating,
    ];

    for (const value of values) {
        const rating =
            safeNumber(value);

        if (rating > 0) {
            return Math.max(
                0,
                Math.min(
                    5,
                    rating
                )
            );
        }
    }

    return 0;
}

/* =========================================================
   PERSONALIZED RELEVANCE
   Ground Truth is provided externally as att_id values
   judged relevant for the current test profile.
========================================================= */

function getPlaceId(
    place: any
): string {
    return String(
        place?.att_id ??
        place?.id ??
        ""
    );
}

function isRelevant(
    place: any,
    relevantIds: ReadonlySet<string>
): boolean {
    const id =
        getPlaceId(
            place
        );

    return (
        id.length > 0 &&
        relevantIds.has(
            id
        )
    );
}

/* =========================================================
   DIVERSITY
   ========================================================= */

function calculateDiversity(
    selected: any[]
): number {
    const vectors =
        selected
            .map(
                place =>
                    Array.isArray(
                        place.topic_vector
                    )
                        ? place.topic_vector
                        : null
            )
            .filter(
                (
                    vector
                ): vector is number[] =>
                    Array.isArray(
                        vector
                    ) &&
                    vector.length > 0 &&
                    vector.every(
                        value =>
                            Number.isFinite(
                                Number(value)
                            )
                    )
            );

    if (
        vectors.length <= 1
    ) {
        return 0;
    }

    let totalSimilarity = 0;
    let pairCount = 0;

    for (
        let i = 0;
        i < vectors.length;
        i++
    ) {
        for (
            let j = i + 1;
            j < vectors.length;
            j++
        ) {
            totalSimilarity +=
                cosineSimilarity(
                    vectors[i],
                    vectors[j]
                );

            pairCount++;
        }
    }

    if (pairCount === 0) {
        return 0;
    }

    const averageSimilarity =
        totalSimilarity /
        pairCount;

    return Math.max(
        0,
        Math.min(
            1,
            1 -
            averageSimilarity
        )
    );
}

/* =========================================================
   AVERAGE DISTANCE
   ========================================================= */

function calculateAverageDistance(
    selected: any[]
): number {
    const coordinates =
        selected
            .map(place => ({
                place,
                coordinates:
                    getCoordinates(
                        place
                    ),
            }))
            .filter(
                item =>
                    item.coordinates !==
                    null
            );

    if (
        coordinates.length === 0
    ) {
        return 0;
    }

    const centroidLat =
        coordinates.reduce(
            (
                sum,
                item
            ) =>
                sum +
                (
                    item.coordinates
                        ?.latitude ?? 0
                ),
            0
        ) /
        coordinates.length;

    const centroidLng =
        coordinates.reduce(
            (
                sum,
                item
            ) =>
                sum +
                (
                    item.coordinates
                        ?.longitude ?? 0
                ),
            0
        ) /
        coordinates.length;

    const distances =
        coordinates.map(
            item =>
                distanceKm(
                    item.coordinates!
                        .latitude,
                    item.coordinates!
                        .longitude,
                    centroidLat,
                    centroidLng
                )
        );

    return (
        distances.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        ) /
        distances.length
    );
}

/* =========================================================
   POPULARITY
   ========================================================= */

function calculateAveragePopularity(
    selected: any[]
): number {
    if (
        selected.length === 0
    ) {
        return 0;
    }

    return (
        selected.reduce(
            (
                sum,
                place
            ) =>
                sum +
                safeNumber(
                    place.visitor_count
                ),
            0
        ) /
        selected.length
    );
}

/* =========================================================
   AVERAGE RATING
   ========================================================= */

function calculateAverageRating(
    selected: any[]
): number {
    if (
        selected.length === 0
    ) {
        return 0;
    }

    return (
        selected.reduce(
            (
                sum,
                place
            ) =>
                sum +
                getRating(place),
            0
        ) /
        selected.length
    );
}

/* =========================================================
   NDCG@K
   ========================================================= */

function calculateNDCG(
    selected: any[],
    relevantIds: ReadonlySet<string>
): number {
    if (
        selected.length === 0 ||
        relevantIds.size === 0
    ) {
        return 0;
    }

    const dcg =
        selected.reduce(
            (
                sum,
                place,
                index
            ) => {
                const rel =
                    isRelevant(
                        place,
                        relevantIds
                    )
                        ? 1
                        : 0;

                return (
                    sum +
                    rel /
                    Math.log2(
                        index + 2
                    )
                );
            },
            0
        );

    const idealRelevantCount =
        Math.min(
            selected.length,
            relevantIds.size
        );

    let idcg = 0;

    for (
        let index = 0;
        index < idealRelevantCount;
        index++
    ) {
        idcg +=
            1 /
            Math.log2(
                index + 2
            );
    }

    return idcg > 0
        ? Math.max(
            0,
            Math.min(
                1,
                dcg / idcg
            )
        )
        : 0;
}

/* =========================================================
   RATING DISTRIBUTION
   ========================================================= */

export function calculateRatingDistribution(
    selected: any[]
) {
    return selected.map(
        (
            place,
            index
        ) => ({
            rank: index + 1,

            name:
                place.name_th ??
                place.name_en ??
                place.name ??
                "",

            rating:
                getRating(place),

            popularity:
                safeNumber(
                    place.visitor_count
                ),
        })
    );
}

/* =========================================================
   POPULARITY DISTRIBUTION
   ========================================================= */

export function calculatePopularityDistribution(
    selected: any[]
) {
    return selected.map(
        (
            place,
            index
        ) => ({
            rank: index + 1,

            name:
                place.name_th ??
                place.name_en ??
                place.name ??
                "",

            popularity:
                safeNumber(
                    place.visitor_count
                ),

            rating:
                getRating(place),
        })
    );
}

/* =========================================================
   MAIN EVALUATION
   ========================================================= */

export function evaluateRecommendations(
    results: any[],
    dataset: any[],
    relevantIds: ReadonlySet<string>
): EvaluationMetrics & {
    summary: {
        averageRating: number;
        averagePopularity: number;
        averageDistance: number;
        diversity: number;
    };

    popularityDistribution: ReturnType<
        typeof calculatePopularityDistribution
    >;

    ratingDistribution: ReturnType<
        typeof calculateRatingDistribution
    >;
} {
    const selected =
        results ?? [];

    /* -----------------------------------------------------
       Relevant items in dataset
       ----------------------------------------------------- */

    const datasetIds =
        new Set(
            dataset
                .map(
                    place =>
                        getPlaceId(
                            place
                        )
                )
                .filter(Boolean)
        );

    const relevantCount =
        Array.from(
            relevantIds
        ).filter(
            id =>
                datasetIds.has(
                    id
                )
        ).length;

    /* -----------------------------------------------------
       True positive
       ----------------------------------------------------- */

    const truePositive =
        selected.filter(
            place =>
                isRelevant(
                    place,
                    relevantIds
                )
        ).length;

    /* -----------------------------------------------------
       Precision
       ----------------------------------------------------- */

    const precision =
        selected.length > 0
            ? truePositive /
              selected.length
            : 0;

    /* -----------------------------------------------------
       Recall
       ----------------------------------------------------- */

    const recall =
        relevantCount > 0
            ? truePositive /
              relevantCount
            : 0;

    /* -----------------------------------------------------
       F1
       ----------------------------------------------------- */

    const f1 =
        precision +
        recall >
        0
            ? (
                2 *
                precision *
                recall
            ) /
            (
                precision +
                recall
            )
            : 0;

    /* -----------------------------------------------------
       Other metrics
       ----------------------------------------------------- */

    const diversity =
        calculateDiversity(
            selected
        );

    const averageDistance =
        calculateAverageDistance(
            selected
        );

    const averagePopularity =
        calculateAveragePopularity(
            selected
        );

    const averageRating =
        calculateAverageRating(
            selected
        );

    const coverage =
        dataset.length > 0
            ? selected.length /
              dataset.length
            : 0;

    const ndcg =
        calculateNDCG(
            selected,
            relevantIds
        );

    const popularityDistribution =
        calculatePopularityDistribution(
            selected
        );

    const ratingDistribution =
        calculateRatingDistribution(
            selected
        );

    return {
        precision,
        recall,
        f1,

        ndcg,

        diversity,

        averageDistance,
        averagePopularity,
        averageRating,

        coverage,

        relevantCount,
        truePositive,

        summary: {
            averageRating,
            averagePopularity,
            averageDistance,
            diversity,
        },

        popularityDistribution,

        ratingDistribution,
    };
}