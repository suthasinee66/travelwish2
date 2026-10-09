import type {
    TripPlanInput,
} from "./types";


export const EXPERIMENT_CONFIG = {

    /* ==========================================
       K
       Evaluate Top-K ranking at intervals up to
       the production candidate pool size (Top 30).
    ========================================== */

    K_VALUES: [
        5,
        10,
        15,
        20,
        25,
        30,
    ],


    /* ==========================================
       Province
    ========================================== */

    TEST_PROVINCES: [
        "เชียงใหม่",
        "นครสวรรค์",
        "กำแพงเพชร",
    ],


    /* ==========================================
       Topic Vector
    ========================================== */

    TOPIC_VECTOR_SIZE: 22,


    /* ==========================================
       TDMC
    ========================================== */

    CANDIDATE_MULTIPLIER: 5,

    ACCURACY_WEIGHT: 0.5,

    DIVERSITY_WEIGHT: 0.5,

};


export interface TestProfile {
    id: string;
    name: string;
    gender: string;
    age: number;
    preferredRegion: string[];
    travelGoal: string;
    travelTime: string;
    trip: TripPlanInput;
}

export const TEST_PROFILES: TestProfile[] = [
    {
        id: "case1",
        name: "Case 1",
        gender: "หญิง",
        age: 21,
        preferredRegion: [
            "ภาคกลาง",
        ],
        travelGoal: "ความบันเทิง",
        travelTime: "ฤดูหนาว",
        trip: {
            province: "",
            travelType: [
                "วัฒนธรรม",
                "คาเฟ่",
                "เมือง",
            ],
            activities: [
                "ถ่ายรูป",
                "อาหาร",
                "ช้อปปิ้ง",
            ],
            atmosphere: [
                "คึกคัก",
            ],
            budget: 3000,
            companion: "เพื่อน",
        },
    },
    {
        id: "case2",
        name: "Case 2",
        gender: "ชาย",
        age: 32,
        preferredRegion: [
            "ภาคเหนือ",
            "ภาคตะวันออกเฉียงเหนือ",
        ],
        travelGoal: "ผจญภัย",
        travelTime: "ฤดูหนาว",
        trip: {
            province: "",
            travelType: [
                "ภูเขา",
                "ธรรมชาติ",
            ],
            activities: [
                "เดินป่า",
                "พักผ่อน",
            ],
            atmosphere: [
                "เงียบสงบ",
            ],
            budget: 3000,
            companion: "คนเดียว",
        },
    },
    {
        id: "case3",
        name: "Case 3",
        gender: "หญิง",
        age: 42,
        preferredRegion: [
            "ภาคตะวันออก",
            "ภาคใต้",
        ],
        travelGoal: "พักผ่อน",
        travelTime: "ฤดูหนาว",
        trip: {
            province: "",
            travelType: [
                "ทะเล",
                "เมือง",
            ],
            activities: [
                "ถ่ายรูป",
                "ช้อปปิ้ง",
                "พักผ่อน",
            ],
            atmosphere: [
                "เงียบสงบ",
            ],
            budget: 15000,
            companion: "ครอบครัว",
        },
    },
];

/**
 * Backward-compatible alias for older scripts.
 * New evaluation code should iterate TEST_PROFILES.
 */
export const TEST_TRIP: TripPlanInput =
    TEST_PROFILES[0].trip;
