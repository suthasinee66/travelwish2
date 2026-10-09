
import "dotenv/config";

import {
    createClient,
} from "@supabase/supabase-js";

import {
    promises as fs,
} from "fs";

import path from "path";

import {
    performance,
} from "perf_hooks";

import {
    runOldAlgorithm,
} from "./oldAlgorithm";

import {
    runTDMCAlgorithm,
    TDMC_EXPERIMENT_CONFIGS,
} from "./tdmcAlgorithm";

import {
    evaluateRecommendations,
} from "./evaluation";

import {
    EXPERIMENT_CONFIG,
    TEST_TRIP,
} from "./experimentConfig";

import {
    loadGroundTruthByProvince,
} from "./groundTruth";


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
) {
    throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
}

const supabase =
    createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    );


/* =========================================================
   TEXT LOG FILE
   ========================================================= */

const outputDir =
    path.join(
        process.cwd(),
        "comparison"
    );

const textLogPath =
    path.join(
        outputDir,
        "comparisonResults.txt"
    );

/**
 * เริ่มบันทึก Console output ลงไฟล์
 */
async function setupTextLogger() {

    await fs.mkdir(
        outputDir,
        {
            recursive: true,
        }
    );

    // ล้างไฟล์เก่าก่อนเริ่ม experiment
    await fs.writeFile(
        textLogPath,
        "",
        "utf8"
    );

    const originalConsoleLog =
        console.log;

    console.log = (
        ...args: any[]
    ) => {

        // แสดงใน Console ตามปกติ
        originalConsoleLog(
            ...args
        );

        // แปลงข้อมูลให้เป็นข้อความ
        const text =
            args
                .map(arg => {

                    if (
                        typeof arg === "string"
                    ) {
                        return arg;
                    }

                    try {
                        return JSON.stringify(
                            arg,
                            null,
                            2
                        );
                    } catch {
                        return String(
                            arg
                        );
                    }

                })
                .join(" ");

        // เขียนลงไฟล์แบบ append
        fs.appendFile(
            textLogPath,
            text + "\n",
            "utf8"
        ).catch(
            error => {
                originalConsoleLog(
                    "⚠️ Cannot write text log:",
                    error
                );
            }
        );
    };

    console.log(
        "=================================================="
    );

    console.log(
        "📝 TDMC EXPERIMENT TEXT LOG"
    );

    console.log(
        `📁 ${textLogPath}`
    );

    console.log(
        "=================================================="
    );
}


/* =========================================================
   SETTINGS
   ========================================================= */
const PROVINCES =
    Array.isArray(EXPERIMENT_CONFIG.TEST_PROVINCES)
        ? EXPERIMENT_CONFIG.TEST_PROVINCES
        : [];

const K_VALUES =
    Array.isArray(EXPERIMENT_CONFIG.K_VALUES)
        ? EXPERIMENT_CONFIG.K_VALUES
        : [];


/* =========================================================
   VALIDATE CONFIG
   ========================================================= */

function validateExperimentConfig() {
if (
    !Array.isArray(
        EXPERIMENT_CONFIG.TEST_PROVINCES
    )
) {
    throw new Error(
        "EXPERIMENT_CONFIG.TEST_PROVINCES is missing or is not an array."
    );
}

    if (
        !Array.isArray(
            EXPERIMENT_CONFIG.K_VALUES
        )
    ) {
        throw new Error(
            "EXPERIMENT_CONFIG.K_VALUES is missing or is not an array."
        );
    }

    if (
        PROVINCES.length === 0
    ) {
        throw new Error(
            "EXPERIMENT_CONFIG.PROVINCES is empty."
        );
    }

    if (
        K_VALUES.length === 0
    ) {
        throw new Error(
            "EXPERIMENT_CONFIG.K_VALUES is empty."
        );
    }

    if (
        !Array.isArray(
            TDMC_EXPERIMENT_CONFIGS
        ) ||
        TDMC_EXPERIMENT_CONFIGS.length === 0
    ) {
        throw new Error(
            "TDMC_EXPERIMENT_CONFIGS is missing or empty."
        );
    }

    console.log(
        "\n✅ Experiment configuration validated"
    );

    console.log(
        `   Provinces: ${PROVINCES.length}`
    );

    console.log(
        `   K values: ${K_VALUES.length}`
    );

    console.log(
        `   TDMC weight configurations: ${TDMC_EXPERIMENT_CONFIGS.length}`
    );
}


/* =========================================================
   NORMALIZE TEST TRIP
   ========================================================= */

function normalizeTrip(
    province: string
) {

    return {
        ...TEST_TRIP,

        province,

        travelType:
            Array.isArray(
                TEST_TRIP.travelType
            )
                ? TEST_TRIP.travelType
                : [],

        activities:
            Array.isArray(
                TEST_TRIP.activities
            )
                ? TEST_TRIP.activities
                : [],

        atmosphere:
            Array.isArray(
                TEST_TRIP.atmosphere
            )
                ? TEST_TRIP.atmosphere
                : [],

        companion:
            TEST_TRIP.companion ??
            null,

        budget:
            TEST_TRIP.budget ??
            null,
    };
}


/* =========================================================
   FETCH ALL ATTRACTIONS
   ========================================================= */

async function fetchAttractions(
    province: string
) {

    const pageSize = 1000;

    let from = 0;

    const all: any[] = [];

    while (true) {

        const to =
            from +
            pageSize -
            1;

        console.log(
            `   📥 Fetch rows ${from} - ${to}`
        );

        const {
            data,
            error,
        } = await supabase
            .from("attraction")
            .select(`
                att_id,
                name_th,
                name_en,
                province,
                latitude,
                longitude,
                travel_type,
                activities,
                atmosphere,
                budget,
                travel_companion,
                avg_rating,
                visitor_count,
                topic_vector
            `)
            .eq(
                "province",
                province
            )
            .range(
                from,
                to
            );

        if (error) {
            throw error;
        }

        if (
            !data ||
            data.length === 0
        ) {
            break;
        }

        all.push(
            ...data
        );

        if (
            data.length <
            pageSize
        ) {
            break;
        }

        from +=
            pageSize;
    }

    return all;
}


/* =========================================================
   VALIDATE DATASET
   ========================================================= */

function validateDataset(
    attractions: any[]
) {

    const expectedSize =
        EXPERIMENT_CONFIG
            .TOPIC_VECTOR_SIZE;

    let valid = 0;

    let invalid = 0;

    for (
        const place of attractions
    ) {

        const vector =
            place.topic_vector;

        if (
            Array.isArray(vector) &&
            vector.length ===
                expectedSize
        ) {

            valid++;

        } else {

            invalid++;
        }
    }

    console.log(
        `   🧠 Topic vector valid: ${valid}`
    );

    console.log(
        `   ⚠️ Topic vector invalid: ${invalid}`
    );

    return {
        valid,
        invalid,
    };
}


/* =========================================================
   PRINT TRIP
   ========================================================= */

function printTrip(
    trip: any
) {

    console.log(
        "\n🧳 TEST TRIP"
    );

    console.log(
        `   Province    : ${trip.province}`
    );

    console.log(
        `   Days        : ${trip.days ?? "-"}`
    );

    console.log(
        `   Companion   : ${trip.companion ?? "-"}`
    );

    console.log(
        `   Budget      : ${trip.budget ?? "-"}`
    );

    console.log(
        `   Travel Type : ${
            Array.isArray(trip.travelType)
                ? trip.travelType.join(", ")
                : "-"
        }`
    );

    console.log(
        `   Activities  : ${
            Array.isArray(trip.activities)
                ? trip.activities.join(", ")
                : "-"
        }`
    );

    console.log(
        `   Atmosphere  : ${
            Array.isArray(trip.atmosphere)
                ? trip.atmosphere.join(", ")
                : "-"
        }`
    );
}


/* =========================================================
   PRINT METRICS
   ========================================================= */

function printMetrics(
    label: string,
    metrics: any
) {

    console.log(
        `\n📊 ${label}`
    );

    console.log(
        `   Precision : ${Number(metrics.precision ?? 0).toFixed(4)}`
    );

    console.log(
        `   Recall    : ${Number(metrics.recall ?? 0).toFixed(4)}`
    );

    console.log(
        `   F1        : ${Number(metrics.f1 ?? 0).toFixed(4)}`
    );

    console.log(
        `   NDCG      : ${Number(metrics.ndcg ?? 0).toFixed(4)}`
    );

    console.log(
        `   Diversity : ${Number(metrics.diversity ?? 0).toFixed(4)}`
    );

    console.log(
        `   Rating    : ${Number(metrics.averageRating ?? 0).toFixed(4)}`
    );

    console.log(
        `   Distance  : ${Number(metrics.averageDistance ?? 0).toFixed(4)} km`
    );

    console.log(
        `   Popularity: ${Number(metrics.averagePopularity ?? 0).toFixed(2)}`
    );

    console.log(
        `   Coverage  : ${Number(metrics.coverage ?? 0).toFixed(4)}`
    );

    console.log(
        `   Relevant  : ${Number(metrics.relevantCount ?? 0)}`
    );

    console.log(
        `   TP        : ${Number(metrics.truePositive ?? 0)}`
    );
}


/* =========================================================
   PRINT RECOMMENDATIONS
   ========================================================= */

function printRecommendations(
    label: string,
    results: any[]
) {

    console.log(
        `\n🏆 ${label}`
    );

    results.forEach(
        (
            place,
            index
        ) => {

            const rating =
                Number(
                    place.avg_rating ??
                    place.averageRating ??
                    place.rating ??
                    0
                );

            const visitors =
                Number(
                    place.visitor_count ??
                    place.visitorCount ??
                    place.visitors ??
                    0
                );

            const score =
                Number(
                    place.tdmcScore ??
                    place.score ??
                    0
                );

            console.log(
                `   ${index + 1}. ${
                    place.name_th ??
                    place.name_en ??
                    place.name ??
                    "-"
                } | rating=${rating.toFixed(2)} | visitors=${visitors} | score=${score.toFixed(4)}`
            );
        }
    );
}


/* =========================================================
   CLEAN RESULT
   ========================================================= */

function cleanResults(
    results: any[]
) {

    return results.map(
        (
            place,
            index
        ) => ({

            rank:
                index + 1,

            att_id:
                place.att_id ??
                place.id ??
                null,

            name_th:
                place.name_th ??
                null,

            name_en:
                place.name_en ??
                null,

            province:
                place.province ??
                null,

            rating:
                Number(
                    place.avg_rating ??
                    place.averageRating ??
                    place.rating ??
                    0
                ),

            visitors:
                Number(
                    place.visitor_count ??
                    place.visitorCount ??
                    place.visitors ??
                    0
                ),

            latitude:
                place.latitude ??
                place.lat ??
                null,

            longitude:
                place.longitude ??
                place.lng ??
                null,

            /* OLD */

            score:
                place.score ??
                null,

            rawScore:
                place.rawScore ??
                null,

            /* TDMC */

            tdmcScore:
                place.tdmcScore ??
                null,

            accuracyScore:
                place.accuracyScore ??
                null,

            popularityScore:
                place.popularityScore ??
                null,

            distanceScore:
                place.distanceScore ??
                null,

            normalizedRating:
                place.normalizedRating ??
                null,

            normalizedPopularity:
                place.normalizedPopularity ??
                null,

            normalizedDistance:
                place.normalizedDistance ??
                null,

            topicSimilarity:
                place.topicSimilarity ??
                null,

            topicDiversity:
                place.topicDiversity ??
                null,

            distanceKm:
                place.distanceKm ??
                null,

            topicVector:
                place.topic_vector ??
                null,
        })
    );
}


/* =========================================================
   BUILD METRICS OBJECT
   ========================================================= */

function cleanMetrics(
    metrics: any
) {

    return {

        precision:
            Number(
                metrics.precision ?? 0
            ),

        recall:
            Number(
                metrics.recall ?? 0
            ),

        f1:
            Number(
                metrics.f1 ?? 0
            ),

        ndcg:
            Number(
                metrics.ndcg ?? 0
            ),

        diversity:
            Number(
                metrics.diversity ?? 0
            ),

        avgDistance:
            Number(
                metrics.averageDistance ?? 0
            ),

        avgPopularity:
            Number(
                metrics.averagePopularity ?? 0
            ),

        averageRating:
            Number(
                metrics.averageRating ?? 0
            ),

        coverage:
            Number(
                metrics.coverage ?? 0
            ),

        relevantCount:
            Number(
                metrics.relevantCount ?? 0
            ),

        truePositive:
            Number(
                metrics.truePositive ?? 0
            ),

        summary:
            metrics.summary ?? null,

        popularityDistribution:
            metrics.popularityDistribution ?? null,

        ratingDistribution:
            metrics.ratingDistribution ?? null,
    };
}


/* =========================================================
   MAIN
   ========================================================= */

async function main() {

    /* -----------------------------------------------------
       Setup text logger FIRST
       ----------------------------------------------------- */

    await setupTextLogger();

    /* -----------------------------------------------------
       Validate configuration
       ----------------------------------------------------- */

    validateExperimentConfig();

    const groundTruthByProvince =
        await loadGroundTruthByProvince();

    console.log(
        "\n✅ Personalized Ground Truth loaded"
    );



    console.log(
        "\n=================================================="
    );

    console.log(
        "🚀 TDMC MULTI-WEIGHT EXPERIMENT"
    );

    console.log(
        "=================================================="
    );

    console.log(
        `📍 Provinces: ${PROVINCES.join(", ")}`
    );

    console.log(
        `🔢 K values: ${K_VALUES.join(", ")}`
    );

    console.log(
        `⚖️ Weight configurations: ${TDMC_EXPERIMENT_CONFIGS.length}`
    );


    /* -----------------------------------------------------
       Print all weight configurations
       ----------------------------------------------------- */

    TDMC_EXPERIMENT_CONFIGS.forEach(
        config => {

            console.log(
                `   ${config.id}: ${config.name} → α=${config.alpha}, β=${config.beta}, γ=${config.gamma}`
            );
        }
    );


    const comparisonResults: any[] =
        [];


    /* =====================================================
       PROVINCE LOOP
       ===================================================== */

    for (
        const province of PROVINCES
    ) {

        console.log(
            `\n\n==================================================`
        );

        console.log(
            `📍 PROVINCE: ${province}`
        );

        console.log(
            `==================================================`
        );


        /* -------------------------------------------------
           Create safe trip object
           ------------------------------------------------- */

        const trip =
            normalizeTrip(
                province
            );

        printTrip(
            trip
        );


        /* -------------------------------------------------
           Fetch
           ------------------------------------------------- */

        const attractions =
            await fetchAttractions(
                province
            );

        console.log(
            `📦 Dataset size: ${attractions.length}`
        );


        if (
            attractions.length === 0
        ) {

            console.log(
                "⚠️ No attractions found. Skip."
            );

            continue;
        }


        /* -------------------------------------------------
           Validation
           ------------------------------------------------- */

        validateDataset(
            attractions
        );


        /* -------------------------------------------------
           Personalized Ground Truth
           ------------------------------------------------- */

        const relevantIds =
            groundTruthByProvince.get(
                province
            );

        if (!relevantIds) {
            throw new Error(
                `No Ground Truth labels found for province: ${province}`
            );
        }

        const relevantCount =
            relevantIds.size;

        console.log(
            `🎯 Personalized relevant attractions: ${relevantCount}`
        );


        /* =================================================
           K LOOP
           ================================================= */

        for (
            const k of K_VALUES
        ) {

            console.log(
                `\n\n--------------------------------------------------`
            );

            console.log(
                `🔢 K = ${k}`
            );

            console.log(
                `--------------------------------------------------`
            );


            /* =============================================
               OLD BASELINE
               ============================================= */

            console.log(
                "\n🟠 Running OLD algorithm..."
            );


            const oldStart =
                performance.now();


            const oldResults =
                runOldAlgorithm(
                    attractions,
                    trip,
                    k
                );


            const oldRuntime =
                performance.now() -
                oldStart;


            const oldMetrics =
                evaluateRecommendations(
                    oldResults,
                    attractions,
                    relevantIds
                );


            printMetrics(
                "OLD",
                oldMetrics
            );


            printRecommendations(
                "OLD Top Results",
                oldResults
            );


            /* =================================================
               TDMC WEIGHT EXPERIMENTS
               ================================================= */

            for (
                const experiment
                of TDMC_EXPERIMENT_CONFIGS
            ) {

                console.log(
                    `\n\n🔵 TDMC EXPERIMENT`
                );

                console.log(
                    `   ID     : ${experiment.id}`
                );

                console.log(
                    `   Name   : ${experiment.name}`
                );

                console.log(
                    `   α      : ${experiment.alpha}`
                );

                console.log(
                    `   β      : ${experiment.beta}`
                );

                console.log(
                    `   γ      : ${experiment.gamma}`
                );


                /* ---------------------------------------------
                   TDMC
                   --------------------------------------------- */

                const tdmcStart =
                    performance.now();


                const tdmcResults =
                    runTDMCAlgorithm(
                        attractions,
                        trip,
                        k,
                        {
                            alpha:
                                experiment.alpha,

                            beta:
                                experiment.beta,

                            gamma:
                                experiment.gamma,
                        }
                    );


                const tdmcRuntime =
                    performance.now() -
                    tdmcStart;


                /* ---------------------------------------------
                   Evaluation
                   --------------------------------------------- */

                const tdmcMetrics =
                    evaluateRecommendations(
                        tdmcResults,
                        attractions,
                        relevantIds
                    );


                printMetrics(
                    `TDMC - ${experiment.name}`,
                    tdmcMetrics
                );


                printRecommendations(
                    `TDMC - ${experiment.name}`,
                    tdmcResults
                );


                /* ---------------------------------------------
                   SAVE RESULT
                   --------------------------------------------- */

                comparisonResults.push({

                    province,

                    k,

                    datasetSize:
                        attractions.length,

                    groundTruth:
                        "human_profile_judgement",

                    relevantScore:
                        2,

                    relevantCount,


                    /* =========================================
                       TEST TRIP
                       ========================================= */

                    trip: {

                        province:
                            trip.province,

                        days:
                            trip.days ?? null,

                        companion:
                            trip.companion ?? null,

                        budget:
                            trip.budget ?? null,

                        travelType:
                            Array.isArray(
                                trip.travelType
                            )
                                ? trip.travelType
                                : [],

                        activities:
                            Array.isArray(
                                trip.activities
                            )
                                ? trip.activities
                                : [],

                        atmosphere:
                            Array.isArray(
                                trip.atmosphere
                            )
                                ? trip.atmosphere
                                : [],
                    },


                    /* =========================================
                       EXPERIMENT
                       ========================================= */

                    experiment: {

                        id:
                            experiment.id,

                        name:
                            experiment.name,

                        alpha:
                            experiment.alpha,

                        beta:
                            experiment.beta,

                        gamma:
                            experiment.gamma,
                    },


                    /* =========================================
                       OLD
                       ========================================= */

                    old: {

                        metrics:
                            cleanMetrics(
                                oldMetrics
                            ),

                        runtime:
                            oldRuntime,

                        topResults:
                            cleanResults(
                                oldResults
                            ),
                    },


                    /* =========================================
                       TDMC
                       ========================================= */

                    tdmc: {

                        metrics:
                            cleanMetrics(
                                tdmcMetrics
                            ),

                        runtime:
                            tdmcRuntime,

                        alpha:
                            experiment.alpha,

                        beta:
                            experiment.beta,

                        gamma:
                            experiment.gamma,

                        topResults:
                            cleanResults(
                                tdmcResults
                            ),
                    },
                });
            }
        }
    }


    /* =====================================================
       SAVE JSON
       ===================================================== */

    const outputDir =
        path.join(
            process.cwd(),
            "comparison"
        );


    await fs.mkdir(
        outputDir,
        {
            recursive: true,
        }
    );


    const outputPath =
        path.join(
            outputDir,
            "comparisonResults.json"
        );


    await fs.writeFile(
        outputPath,
        JSON.stringify(
            comparisonResults,
            null,
            2
        ),
        "utf8"
    );


    /* =====================================================
       SUMMARY
       ===================================================== */

    console.log(
        "\n\n=================================================="
    );

    console.log(
        "✅ EXPERIMENT FINISHED"
    );

    console.log(
        "=================================================="
    );

    console.log(
        `📊 Total experiment rows: ${comparisonResults.length}`
    );

    console.log(
        `⚖️ Weight configurations: ${TDMC_EXPERIMENT_CONFIGS.length}`
    );

    console.log(
        `📍 Provinces tested: ${PROVINCES.length}`
    );

    console.log(
        `🔢 K values tested: ${K_VALUES.length}`
    );

    console.log(
        `📁 Output: ${outputPath}`
    );

    console.log(
        "==================================================\n"
    );
}


/* =========================================================
   RUN
   ========================================================= */

main().catch(
    error => {

        console.error(
            "\n❌ Experiment failed:"
        );

        console.error(
            error
        );

        process.exit(
            1
        );
    }
);

