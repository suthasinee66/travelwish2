import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";

import { runOldAlgorithm } from "./oldAlgorithm";
import {
    runTDMCAlgorithm,
    TDMC_EXPERIMENT_CONFIGS,
} from "./tdmcAlgorithm";
import {
    EXPERIMENT_CONFIG,
    TEST_PROFILES,
} from "./experimentConfig";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);

const OUTPUT_DIR = path.join(process.cwd(), "comparison");
const CSV_PATH = path.join(OUTPUT_DIR, "ground_truth_pool.csv");
const AUDIT_PATH = path.join(OUTPUT_DIR, "ground_truth_pool_audit.json");

const TOP_K = Math.max(
    30,
    ...EXPERIMENT_CONFIG.K_VALUES
);

const RANDOM_PER_PROVINCE = 30;

function normalizeTrip(
    profile: (typeof TEST_PROFILES)[number],
    province: string
) {
    const base =
        profile.trip;

    return {
        ...base,
        province,
        travelType:
            Array.isArray(base.travelType)
                ? base.travelType
                : [],
        activities:
            Array.isArray(base.activities)
                ? base.activities
                : [],
        atmosphere:
            Array.isArray(base.atmosphere)
                ? base.atmosphere
                : [],
        companion:
            base.companion ??
            null,
        budget:
            base.budget ??
            null,
    };
}

async function fetchAttractions(province: string) {
    const pageSize = 1000;
    let from = 0;
    const all: any[] = [];

    while (true) {
        const to = from + pageSize - 1;

        const { data, error } = await supabase
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
            .eq("province", province)
            .range(from, to);

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            break;
        }

        all.push(...data);

        if (data.length < pageSize) {
            break;
        }

        from += pageSize;
    }

    return all;
}

function hashString(value: string): number {
    let hash = 2166136261;

    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function seededRandom(seed: number) {
    let state = seed || 1;

    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function deterministicShuffle<T>(items: T[], seedText: string): T[] {
    const result = [...items];
    const random = seededRandom(hashString(seedText));

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

function csvEscape(value: unknown): string {
    const text =
        Array.isArray(value)
            ? value.join(" | ")
            : value == null
                ? ""
                : String(value);

    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}

function parseExistingLabels(content: string): Map<string, string> {
    const labels = new Map<string, string>();
    const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);

    if (lines.length <= 1) {
        return labels;
    }

    function parseLine(line: string) {
        const values: string[] = [];
        let value = "";
        let quoted = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (quoted && line[i + 1] === '"') {
                    value += '"';
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (char === "," && !quoted) {
                values.push(value);
                value = "";
            } else {
                value += char;
            }
        }

        values.push(value);
        return values;
    }

    const header = parseLine(lines[0]);
    const profileIndex = header.indexOf("profile_id");
    const provinceIndex = header.indexOf("province");
    const attIdIndex = header.indexOf("att_id");
    const scoreIndex = header.indexOf("relevant_score");

    if (
        profileIndex < 0 ||
        provinceIndex < 0 ||
        attIdIndex < 0 ||
        scoreIndex < 0
    ) {
        return labels;
    }

    for (const line of lines.slice(1)) {
        if (!line.trim()) {
            continue;
        }

        const cells = parseLine(line);
        const profileId = (cells[profileIndex] ?? "").trim();
        const province = (cells[provinceIndex] ?? "").trim();
        const attId = (cells[attIdIndex] ?? "").trim();
        const score = (cells[scoreIndex] ?? "").trim();

        if (
            profileId &&
            province &&
            attId &&
            ["0", "1", "2"].includes(score)
        ) {
            labels.set(
                `${profileId}::${province}::${attId}`,
                score
            );
        }
    }

    return labels;
}

async function readExistingLabels() {
    try {
        const content = await fs.readFile(CSV_PATH, "utf8");
        return parseExistingLabels(content);
    } catch (error: any) {
        if (error?.code === "ENOENT") {
            return new Map<string, string>();
        }

        throw error;
    }
}

async function main() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const existingLabels = await readExistingLabels();
    const outputRows: any[] = [];
    const auditRows: any[] = [];

    for (const profile of TEST_PROFILES) {
        console.log(
            `\n👤 Building Ground Truth for ${profile.name}`
        );

        for (const province of profile.testProvinces) {
            console.log(
                `📍 Province: ${province}`
            );

            const attractions =
                await fetchAttractions(
                    province
                );

            const trip =
                normalizeTrip(
                    profile,
                    province
                );

            if (attractions.length === 0) {
                console.log(
                    "   ⚠️ No attractions found. Skip."
                );
                continue;
            }

            const selected =
                new Map<string, any>();

            const sources =
                new Map<string, Set<string>>();

            const add = (
                place: any,
                source: string
            ) => {
                const attId =
                    String(
                        place.att_id ??
                        ""
                    );

                if (!attId) {
                    return;
                }

                if (!selected.has(attId)) {
                    selected.set(
                        attId,
                        place
                    );
                }

                const set =
                    sources.get(attId) ??
                    new Set<string>();

                set.add(source);
                sources.set(
                    attId,
                    set
                );
            };

            const baseline =
                runOldAlgorithm(
                    attractions,
                    trip,
                    TOP_K
                );

            baseline.forEach(
                place =>
                    add(
                        place,
                        "baseline_top30"
                    )
            );

            for (
                const experiment
                of TDMC_EXPERIMENT_CONFIGS
            ) {
                const results =
                    runTDMCAlgorithm(
                        attractions,
                        trip,
                        TOP_K,
                        {
                            alpha: experiment.alpha,
                            beta: experiment.beta,
                            gamma: experiment.gamma,
                        }
                    );

                results.forEach(
                    place =>
                        add(
                            place,
                            `tdmc_${experiment.id}_top30`
                        )
                );
            }

            const remaining =
                attractions.filter(
                    place =>
                        !selected.has(
                            String(
                                place.att_id ??
                                ""
                            )
                        )
                );

            const randomPlaces =
                deterministicShuffle(
                    remaining,
                    `ground-truth-random::${profile.id}::${province}`
                ).slice(
                    0,
                    RANDOM_PER_PROVINCE
                );

            randomPlaces.forEach(
                place =>
                    add(
                        place,
                        "random"
                    )
            );

            const randomizedPool =
                deterministicShuffle(
                    Array.from(
                        selected.values()
                    ),
                    `ground-truth-display::${profile.id}::${province}`
                );

            for (
                const place
                of randomizedPool
            ) {
                const attId =
                    String(
                        place.att_id ??
                        ""
                    );

                const previousScore =
                    existingLabels.get(
                        `${profile.id}::${province}::${attId}`
                    ) ?? "";

                outputRows.push({
                    profile_id:
                        profile.id,
                    profile_name:
                        profile.name,
                    gender:
                        profile.gender,
                    age:
                        profile.age,
                    preferred_region:
                        profile.preferredRegion,
                    travel_goal:
                        profile.travelGoal,
                    travel_time:
                        profile.travelTime,
                    province,
                    att_id:
                        attId,
                    name_th:
                        place.name_th ??
                        "",
                    name_en:
                        place.name_en ??
                        "",
                    travel_type:
                        place.travel_type ??
                        [],
                    activities:
                        place.activities ??
                        [],
                    atmosphere:
                        place.atmosphere ??
                        [],
                    budget:
                        place.budget ??
                        [],
                    travel_companion:
                        place.travel_companion ??
                        [],
                    relevant_score:
                        previousScore,
                    evaluator_note:
                        "",
                });

                auditRows.push({
                    profile_id:
                        profile.id,
                    profile_name:
                        profile.name,
                    province,
                    att_id:
                        attId,
                    name_th:
                        place.name_th ??
                        "",
                    avg_rating:
                        place.avg_rating ??
                        null,
                    visitor_count:
                        place.visitor_count ??
                        null,
                    sources:
                        Array.from(
                            sources.get(attId) ??
                            []
                        ).sort(),
                });
            }

            console.log(
                `   ✅ Pool size: ${randomizedPool.length}`
            );
        }
    }

    const header = [
        "profile_id",
        "profile_name",
        "gender",
        "age",
        "preferred_region",
        "travel_goal",
        "travel_time",
        "province",
        "att_id",
        "name_th",
        "name_en",
        "travel_type",
        "activities",
        "atmosphere",
        "budget",
        "travel_companion",
        "relevant_score",
        "evaluator_note",
    ];

    const csv = [
        header.join(","),
        ...outputRows.map(row =>
            header.map(key => csvEscape(row[key])).join(",")
        ),
    ].join("\n");

    await fs.writeFile(CSV_PATH, "\uFEFF" + csv, "utf8");
    await fs.writeFile(
        AUDIT_PATH,
        JSON.stringify(
            {
                createdAt: new Date().toISOString(),
                topK: TOP_K,
                randomPerProvince: RANDOM_PER_PROVINCE,
                relevantScoreRule: "2 = relevant, 0/1 = non-relevant",
                testProfiles: TEST_PROFILES,
                rows: auditRows,
            },
            null,
            2
        ),
        "utf8"
    );

    console.log("\n✅ Ground Truth evaluation pool created");
    console.log(`📄 Evaluator CSV: ${CSV_PATH}`);
    console.log(`🔎 Audit JSON    : ${AUDIT_PATH}`);
    console.log("\nกรอก relevant_score ทุกแถว:");
    console.log("0 = ไม่เหมาะกับโปรไฟล์");
    console.log("1 = ค่อนข้างเหมาะ");
    console.log("2 = เหมาะกับโปรไฟล์ชัดเจน (Relevant)");
    console.log("\nหลังกรอกเสร็จ รัน npm run eval:tdmc");
}

main().catch(error => {
    console.error("\n❌ Ground Truth pool generation failed:");
    console.error(error);
    process.exit(1);
});
