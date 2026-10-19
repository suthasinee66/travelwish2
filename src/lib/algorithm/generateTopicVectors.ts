
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
/*
==================================================
 TravelWise Topic Vector Generator
==================================================

สร้าง topic_vector ขนาด 22 dimensions

Travel Type       = 6
Activities        = 5
Atmosphere        = 4
Budget            = 3
Travel Companion  = 4

Total = 22

IMPORTANT:
ไฟล์นี้เป็น Feature-based Topic Vector
ไม่ใช่ LDA Topic Vector

ใช้สำหรับ:
- Cosine Similarity
- Topic Diversity
- TDMC Stage 1
==================================================
*/

/* ==================================================
   Supabase
================================================== */

const SUPABASE_URL = process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
    throw new Error(
        "❌ Missing SUPABASE_URL"
    );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
        "❌ Missing SUPABASE_SERVICE_ROLE_KEY"
    );
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);

/* ==================================================
   Topic Definitions
================================================== */

/*
--------------------------------------------------
Travel Type = 6
--------------------------------------------------
*/

const TRAVEL_TYPES = [
    "ภูเขา",
    "ทะเล",
    "วัฒนธรรม",
    "คาเฟ่",
    "ธรรมชาติ",
    "เมือง",
];

/*
--------------------------------------------------
Activities = 5
--------------------------------------------------
*/

const ACTIVITIES = [
    "ถ่ายรูป",
    "เดินป่า",
    "อาหาร",
    "ช้อปปิ้ง",
    "พักผ่อน",
];

/*
--------------------------------------------------
Atmosphere = 4
--------------------------------------------------

ตรวจสอบให้ตรงกับค่าจริงใน database
*/

const ATMOSPHERES = [
    "คึกคัก",
    "เงียบสงบ",
    "ผจญภัย",
    "หรูหรา",
];

/*
--------------------------------------------------
Budget = 3
--------------------------------------------------
*/

const BUDGETS = [
    "ประหยัด",
    "ปานกลาง",
    "หรูหรา",
];

/*
--------------------------------------------------
Travel Companion = 4
--------------------------------------------------

ตรวจสอบให้ตรงกับค่าจริงใน database
*/

const TRAVEL_COMPANIONS = [
    "คนเดียว",
    "คู่รัก",
    "ครอบครัว",
    "เพื่อน",
];

/*
==================================================
 Total Dimensions
==================================================
*/

const VECTOR_SIZE =
    TRAVEL_TYPES.length +
    ACTIVITIES.length +
    ATMOSPHERES.length +
    BUDGETS.length +
    TRAVEL_COMPANIONS.length;

if (VECTOR_SIZE !== 22) {
    throw new Error(
        `❌ Topic vector size must be 22 but got ${VECTOR_SIZE}`
    );
}

/* ==================================================
   Types
================================================== */

interface Attraction {
    att_id: string;

    name_th: string | null;

    travel_type: string[] | null;

    activities: string[] | null;

    atmosphere: string[] | null;

    budget: string[] | null;

    travel_companion: string[] | null;

    topic_vector: number[] | string | null;
}

/* ==================================================
   Normalize
================================================== */

function normalizeText(
    value: unknown
): string {

    return String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

/* ==================================================
   Normalize Array
================================================== */

function normalizeArray(
    values: unknown
): string[] {

    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .map(normalizeText)
        .filter(Boolean);
}

/* ==================================================
   Create Binary Vector
================================================== */

function createBinaryVector(
    values: string[] | null,
    dictionary: string[]
): number[] {

    const normalizedValues =
        new Set(
            normalizeArray(values)
        );

    return dictionary.map(
        item =>
            normalizedValues.has(
                normalizeText(item)
            )
                ? 1
                : 0
    );
}

/* ==================================================
   Create Topic Vector
================================================== */

export function createTopicVector(
    attraction: Attraction
): number[] {

    const travelTypeVector =
        createBinaryVector(
            attraction.travel_type,
            TRAVEL_TYPES
        );

    const activitiesVector =
        createBinaryVector(
            attraction.activities,
            ACTIVITIES
        );

    const atmosphereVector =
        createBinaryVector(
            attraction.atmosphere,
            ATMOSPHERES
        );

    const budgetVector =
        createBinaryVector(
            attraction.budget,
            BUDGETS
        );

    const companionVector =
        createBinaryVector(
            attraction.travel_companion,
            TRAVEL_COMPANIONS
        );

    const vector = [
        ...travelTypeVector,
        ...activitiesVector,
        ...atmosphereVector,
        ...budgetVector,
        ...companionVector,
    ];

    if (vector.length !== 22) {
        throw new Error(
            `Invalid vector size: ${vector.length}`
        );
    }

    return vector;
}
/* ==================================================
   Existing vector handling
   Default: skip a complete 22-dimensional binary vector.
   --force: rebuild even when vector already exists.
   Use --force after modifying category tags in Supabase.
================================================== */

const FORCE_REBUILD = process.argv.includes("--force");

function hasValidTopicVector(value: unknown): boolean {
    let vector: unknown = value;
    if (typeof value === "string") {
        try {
            vector = JSON.parse(value);
        } catch {
            return false;
        }
    }
    return Array.isArray(vector)
        && vector.length === VECTOR_SIZE
        && vector.every((value) => value === 0 || value === 1);
}

/* ==================================================
   Fetch ALL Attractions
================================================== */

async function fetchAttractions(): Promise<Attraction[]> {

    const PAGE_SIZE = 1000;

    const allAttractions: Attraction[] = [];

    let from = 0;

    while (true) {

        const to =
            from + PAGE_SIZE - 1;

        console.log(
            `📥 Fetching attractions ${from + 1} - ${to + 1}...`
        );

        const { data, error } =
            await supabase
                .from("attraction")
                .select(`
                    att_id,
                    name_th,
                    travel_type,
                    activities,
                    atmosphere,
                    budget,
                    travel_companion,
                    topic_vector
                `)
                .range(from, to);

        if (error) {

            throw new Error(
                `❌ Failed to fetch attractions: ${error.message}`
            );
        }

        const rows =
            (data ?? []) as Attraction[];

        allAttractions.push(
            ...rows
        );

        console.log(
            `   ✅ Received ${rows.length} rows`
        );

        /*
        ==========================================
        ถ้าจำนวนที่ได้ < PAGE_SIZE
        แปลว่าเป็น batch สุดท้าย
        ==========================================
        */

        if (
            rows.length < PAGE_SIZE
        ) {
            break;
        }

        from += PAGE_SIZE;
    }

    console.log("");

    console.log(
        `📦 Total attractions fetched: ${allAttractions.length}`
    );

    return allAttractions;
}



/* ==================================================
   Update Topic Vector
================================================== */

async function updateTopicVector(
    attId: string,
    vector: number[]
) {

    const { error } =
        await supabase
            .from("attraction")
            .update({
                topic_vector: vector,
            })
            .eq(
                "att_id",
                attId
            );

    if (error) {

        throw new Error(
            `❌ Failed to update ${attId}: ${error.message}`
        );
    }
}

/* ==================================================
   Main
================================================== */

async function generateTopicVectors() {

    console.log(
        "=============================================="
    );

    console.log(
        "🚀 TravelWise Topic Vector Generator"
    );

    console.log(
        "=============================================="
    );

    console.log(
        `📐 Vector dimensions: ${VECTOR_SIZE}`
    );

    console.log(
        `📌 Travel Type: ${TRAVEL_TYPES.length}`
    );

    console.log(
        `📌 Activities: ${ACTIVITIES.length}`
    );

    console.log(
        `📌 Atmosphere: ${ATMOSPHERES.length}`
    );

    console.log(
        `📌 Budget: ${BUDGETS.length}`
    );

    console.log(
        `📌 Companion: ${TRAVEL_COMPANIONS.length}`
    );

    console.log("");

    const attractions =
        await fetchAttractions();

    console.log(
        `📦 Found ${attractions.length} attractions`
    );

    console.log("");

    let success = 0;

    let failed = 0;

    let skipped = 0;

    console.log(FORCE_REBUILD
        ? '⚠️ --force: rebuilding all topic vectors, including existing ones.'
        : '⏭️ Default mode: skipping existing valid 22-dimensional vectors.');

    for (
        const attraction of attractions
    ) {

        try {

            if (!FORCE_REBUILD && hasValidTopicVector(attraction.topic_vector)) {
                skipped++;
                console.log(`⏭️ Skipped ${attraction.name_th ?? attraction.att_id} (topic_vector already exists)`);
                continue;
            }

            const vector =
                createTopicVector(
                    attraction
                );

            await updateTopicVector(
                attraction.att_id,
                vector
            );

            success++;

            console.log(
                `✅ ${success}/${attractions.length} ` +
                `${attraction.name_th ?? attraction.att_id}`
            );

            console.log(
                `   ${JSON.stringify(vector)}`
            );

        }
        catch (error) {

            failed++;

            console.error(
                `❌ Failed: ${attraction.att_id}`,
                error
            );
        }
    }

    console.log("");

    console.log(
        "=============================================="
    );

    console.log(
        "🎉 Finished"
    );

    console.log(
        `✅ Success: ${success}`
    );

    console.log(
        `❌ Failed: ${failed}`
    );

    console.log(
        `⏭️ Skipped (already valid): ${skipped}`
    );

    console.log(
        "=============================================="
    );
}

/* ==================================================
   Run
================================================== */

generateTopicVectors()
    .catch(error => {

        console.error(
            "💥 Fatal Error:",
            error
        );

        process.exit(1);
    });

