import { supabase } from "@/lib/supabase";

export const ADAPTIVE_VECTOR_SIZE = 22;

const TRAVEL_TYPES = [
  "ภูเขา",
  "ทะเล",
  "วัฒนธรรม",
  "คาเฟ่",
  "ธรรมชาติ",
  "เมือง",
];

const ACTIVITIES = [
  "ถ่ายรูป",
  "เดินป่า",
  "อาหาร",
  "ช้อปปิ้ง",
  "พักผ่อน",
];

const ATMOSPHERES = [
  "คึกคัก",
  "เงียบสงบ",
  "ผจญภัย",
  "หรูหรา",
];

const BUDGETS = [
  "ประหยัด",
  "ปานกลาง",
  "หรูหรา",
];

const COMPANIONS = [
  "คนเดียว",
  "คู่รัก",
  "ครอบครัว",
  "เพื่อน",
];

export type AdaptiveEventType =
  | "detail_open"
  | "detail_dwell"
  | "image_view"
  | "save"
  | "unsave"
  | "add_to_trip"
  | "remove_from_trip"
  | "rating";

export type LearnedPreferenceProfile = {
  behavior_vector: number[];
  explicit_vector: number[];
  interaction_count: number;
  version: number;
  updated_at: string;
};

type RecordInteractionOptions = {
  entityType?:
    | "attraction"
    | "restaurant"
    | "accommodation";
  eventValue?: number;
  dwellMs?: number;
  rating?: number;
};

const EMPTY_VECTOR =
  () =>
    Array.from(
      {
        length:
          ADAPTIVE_VECTOR_SIZE,
      },
      () => 0
    );

function normalizeText(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeStringArray(
  value: unknown
) {
  if (
    Array.isArray(value)
  ) {
    return value
      .map(normalizeText)
      .filter(Boolean);
  }

  const normalized =
    normalizeText(value);

  return normalized
    ? [normalized]
    : [];
}

function dictionaryVector(
  values: unknown,
  dictionary: string[]
) {
  const selected =
    new Set(
      normalizeStringArray(
        values
      )
    );

  return dictionary.map(
    item =>
      selected.has(
        normalizeText(item)
      )
        ? 1
        : 0
  );
}

export function createSurveyPreferenceVector(
  pref: any
) {
  const vector = [
    ...dictionaryVector(
      pref?.travel_type,
      TRAVEL_TYPES
    ),
    ...dictionaryVector(
      pref?.activities,
      ACTIVITIES
    ),
    ...dictionaryVector(
      pref?.atmosphere,
      ATMOSPHERES
    ),
    ...dictionaryVector(
      pref?.budget,
      BUDGETS
    ),
    ...dictionaryVector(
      pref?.travel_companion ??
        pref?.companion,
      COMPANIONS
    ),
  ];

  return normalizeVector(
    vector
  );
}

export function normalizeTopicVector(
  value: unknown
) {
  if (
    !Array.isArray(value) ||
    value.length !==
      ADAPTIVE_VECTOR_SIZE
  ) {
    return null;
  }

  const vector =
    value.map(Number);

  if (
    vector.some(
      item =>
        !Number.isFinite(item)
    )
  ) {
    return null;
  }

  return normalizeVector(
    vector
  );
}

export function normalizeVector(
  vector: number[]
) {
  const magnitude =
    Math.sqrt(
      vector.reduce(
        (
          total,
          value
        ) =>
          total +
          value * value,
        0
      )
    );

  if (!magnitude) {
    return [
      ...vector,
    ];
  }

  return vector.map(
    value =>
      value / magnitude
  );
}

export function cosineSimilarity(
  a: number[] | null,
  b: number[] | null
) {
  if (
    !a ||
    !b ||
    a.length !==
      b.length ||
    a.length === 0
  ) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (
    let index = 0;
    index < a.length;
    index += 1
  ) {
    dot +=
      a[index] *
      b[index];

    magA +=
      a[index] *
      a[index];

    magB +=
      b[index] *
      b[index];
  }

  if (
    magA === 0 ||
    magB === 0
  ) {
    return 0;
  }

  return (
    dot /
    (
      Math.sqrt(magA) *
      Math.sqrt(magB)
    )
  );
}

function emptyProfile():
  LearnedPreferenceProfile {
  return {
    behavior_vector:
      EMPTY_VECTOR(),
    explicit_vector:
      EMPTY_VECTOR(),
    interaction_count: 0,
    version: 0,
    updated_at:
      new Date(0)
        .toISOString(),
  };
}

function sanitizeProfile(
  value: any
):
  LearnedPreferenceProfile {
  if (!value) {
    return emptyProfile();
  }

  const behavior =
    normalizeStoredVector(
      value.behavior_vector
    );

  const explicit =
    normalizeStoredVector(
      value.explicit_vector
    );

  return {
    behavior_vector:
      behavior,
    explicit_vector:
      explicit,
    interaction_count:
      Math.max(
        0,
        Number(
          value.interaction_count ??
            0
        ) || 0
      ),
    version:
      Math.max(
        0,
        Number(
          value.version ??
            0
        ) || 0
      ),
    updated_at:
      String(
        value.updated_at ??
          new Date(0)
            .toISOString()
      ),
  };
}

function normalizeStoredVector(
  value: unknown
) {
  if (
    !Array.isArray(value) ||
    value.length !==
      ADAPTIVE_VECTOR_SIZE
  ) {
    return EMPTY_VECTOR();
  }

  return value.map(
    item => {
      const number =
        Number(item);

      return Number.isFinite(
        number
      )
        ? number
        : 0;
    }
  );
}

function getLocalProfileKey(
  profileId?: string | null
) {
  return profileId
    ? `travelwish_learned_pref_${profileId}`
    : "travelwish_learned_pref_guest";
}

function getLocalFeedbackKey(
  profileId?: string | null
) {
  return profileId
    ? `travelwish_place_feedback_${profileId}`
    : "travelwish_place_feedback_guest";
}

function readLocalProfile(
  profileId?: string | null
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return emptyProfile();
  }

  try {
    const raw =
      window.localStorage
        .getItem(
          getLocalProfileKey(
            profileId
          )
        );

    return sanitizeProfile(
      raw
        ? JSON.parse(raw)
        : null
    );
  } catch {
    return emptyProfile();
  }
}

function writeLocalProfile(
  profile:
    LearnedPreferenceProfile,
  profileId?: string | null
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    getLocalProfileKey(
      profileId
    ),
    JSON.stringify(
      profile
    )
  );
}

function readLocalFeedback(
  profileId?: string | null
): Record<string, number> {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  try {
    const raw =
      window.localStorage
        .getItem(
          getLocalFeedbackKey(
            profileId
          )
        );

    const parsed =
      raw
        ? JSON.parse(raw)
        : {};

    return (
      parsed &&
      typeof parsed ===
        "object"
    )
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function writeLocalFeedback(
  feedback:
    Record<string, number>,
  profileId?: string | null
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    getLocalFeedbackKey(
      profileId
    ),
    JSON.stringify(
      feedback
    )
  );
}

async function getIdentity() {
  try {
    const {
      data,
    } =
      await supabase.auth
        .getUser();

    const user =
      data?.user;

    if (!user) {
      return {
        profileId: null,
        isGuest: true,
      };
    }

    return {
      profileId:
        user.is_anonymous
          ? null
          : user.id,
      isGuest:
        Boolean(
          user.is_anonymous
        ),
    };
  } catch {
    return {
      profileId: null,
      isGuest: true,
    };
  }
}

export async function loadLearnedPreferenceProfile(
  explicitProfileId?:
    string | null
) {
  const identity =
    explicitProfileId !==
    undefined
      ? {
          profileId:
            explicitProfileId,
          isGuest:
            !explicitProfileId,
        }
      : await getIdentity();

  const local =
    readLocalProfile(
      identity.profileId
    );

  if (
    identity.isGuest ||
    !identity.profileId
  ) {
    return local;
  }

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "user_learned_preferences"
        )
        .select(
          "behavior_vector, explicit_vector, interaction_count, version, updated_at"
        )
        .eq(
          "profile_id",
          identity.profileId
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      return local;
    }

    const remote =
      sanitizeProfile(
        data
      );

    const newest =
      remote.version >=
      local.version
        ? remote
        : local;

    writeLocalProfile(
      newest,
      identity.profileId
    );

    return newest;
  } catch {
    return local;
  }
}

function eventWeight(
  eventType:
    AdaptiveEventType,
  eventValue = 1
) {
  const weights:
    Record<
      AdaptiveEventType,
      number
    > = {
      detail_open: 0.15,
      detail_dwell: 0.28,
      image_view: 0.08,
      save: 0.7,
      unsave: -0.45,
      add_to_trip: 1,
      remove_from_trip: -0.7,
      rating: eventValue,
    };

  return (
    weights[eventType] ??
    0
  );
}

function ratingSignal(
  rating: number
) {
  if (rating <= 1) {
    return -1;
  }

  if (rating === 2) {
    return -0.35;
  }

  if (rating === 3) {
    return 0.45;
  }

  return 1;
}

function recencyDecay(
  updatedAt: string
) {
  const updated =
    new Date(
      updatedAt
    ).getTime();

  if (
    !Number.isFinite(updated) ||
    updated <= 0
  ) {
    return 1;
  }

  const ageDays =
    Math.max(
      0,
      (
        Date.now() -
        updated
      ) /
      86_400_000
    );

  return Math.exp(
    -ageDays / 45
  );
}

function updateLearnedVector(
  current: number[],
  placeVector: number[],
  signal: number,
  learningRate: number,
  decay: number
) {
  const next =
    current.map(
      (
        value,
        index
      ) =>
        (
          value *
          decay *
          0.96
        ) +
        (
          placeVector[
            index
          ] *
          signal *
          learningRate
        )
    );

  return normalizeVector(
    next
  );
}

function getEntityId(
  place: any,
  entityType:
    | "attraction"
    | "restaurant"
    | "accommodation"
) {
  if (
    entityType ===
    "restaurant"
  ) {
    return String(
      place?.place_id ??
      place?.restaurant_id ??
      place?.google_place_id ??
      ""
    );
  }

  if (
    entityType ===
    "accommodation"
  ) {
    return String(
      place?.acc_id ??
      place?.id ??
      ""
    );
  }

  return String(
    place?.att_id ??
    place?.place_id ??
    ""
  );
}

export async function recordPlaceInteraction(
  place: any,
  eventType:
    AdaptiveEventType,
  options:
    RecordInteractionOptions = {}
) {
  const entityType =
    options.entityType ??
    "attraction";

  const entityId =
    getEntityId(
      place,
      entityType
    );

  if (!entityId) {
    return null;
  }

  const identity =
    await getIdentity();

  const placeVector =
    normalizeTopicVector(
      place?.topic_vector
    );

  const current =
    await loadLearnedPreferenceProfile(
      identity.profileId
    );

  const decay =
    recencyDecay(
      current.updated_at
    );

  const rating =
    Number(
      options.rating
    );

  const signal =
    eventType ===
      "rating" &&
    Number.isFinite(rating)
      ? ratingSignal(
          rating
        )
      : eventWeight(
          eventType,
          Number(
            options.eventValue ??
              1
          )
        );

  let next:
    LearnedPreferenceProfile = {
      ...current,
      behavior_vector: [
        ...current
          .behavior_vector,
      ],
      explicit_vector: [
        ...current
          .explicit_vector,
      ],
    };

  if (placeVector) {
    if (
      eventType ===
      "rating"
    ) {
      next.explicit_vector =
        updateLearnedVector(
          current
            .explicit_vector,
          placeVector,
          signal,
          0.5,
          decay
        );
    } else {
      next.behavior_vector =
        updateLearnedVector(
          current
            .behavior_vector,
          placeVector,
          signal,
          eventType ===
            "detail_open"
            ? 0.12
            : 0.24,
          decay
        );
    }

    next.interaction_count =
      current
        .interaction_count +
      1;

    next.version =
      current.version +
      1;

    next.updated_at =
      new Date()
        .toISOString();

    writeLocalProfile(
      next,
      identity.profileId
    );
  }

  if (
    eventType ===
      "rating" &&
    Number.isFinite(rating)
  ) {
    const feedback =
      readLocalFeedback(
        identity.profileId
      );

    feedback[
      `${entityType}:${entityId}`
    ] = rating;

    writeLocalFeedback(
      feedback,
      identity.profileId
    );
  }

  if (
    !identity.isGuest &&
    identity.profileId
  ) {
    try {
      await supabase
        .from(
          "user_place_events"
        )
        .insert({
          profile_id:
            identity.profileId,
          entity_type:
            entityType,
          entity_id:
            entityId,
          event_type:
            eventType,
          event_value:
            signal,
          dwell_ms:
            options.dwellMs ??
            null,
          topic_vector:
            placeVector,
        });

      if (
        eventType ===
          "rating" &&
        Number.isFinite(rating)
      ) {
        await supabase
          .from(
            "user_place_feedback"
          )
          .upsert(
            {
              profile_id:
                identity
                  .profileId,
              entity_type:
                entityType,
              entity_id:
                entityId,
              rating,
              liked:
                rating >= 3,
              updated_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                "profile_id,entity_type,entity_id",
            }
          );
      }

      if (placeVector) {
        await supabase
          .from(
            "user_learned_preferences"
          )
          .upsert(
            {
              profile_id:
                identity
                  .profileId,
              behavior_vector:
                next
                  .behavior_vector,
              explicit_vector:
                next
                  .explicit_vector,
              interaction_count:
                next
                  .interaction_count,
              version:
                next.version,
              updated_at:
                next.updated_at,
            },
            {
              onConflict:
                "profile_id",
            }
          );
      }
    } catch (
      error
    ) {
      console.warn(
        "ADAPTIVE PREFERENCE SYNC SKIPPED:",
        error
      );
    }
  }

  if (
    typeof window !==
    "undefined" &&
    placeVector
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "travelwish-preference-updated",
        {
          detail: {
            version:
              next.version,
            entityType,
            entityId,
            eventType,
          },
        }
      )
    );
  }

  return next;
}

export async function getPlacePreferenceRating(
  place: any,
  entityType:
    | "attraction"
    | "restaurant"
    | "accommodation" =
      "attraction"
) {
  const entityId =
    getEntityId(
      place,
      entityType
    );

  if (!entityId) {
    return null;
  }

  const identity =
    await getIdentity();

  const local =
    readLocalFeedback(
      identity.profileId
    );

  const localValue =
    Number(
      local[
        `${entityType}:${entityId}`
      ]
    );

  if (
    Number.isFinite(
      localValue
    ) &&
    localValue >= 1 &&
    localValue <= 4
  ) {
    return localValue;
  }

  if (
    identity.isGuest ||
    !identity.profileId
  ) {
    return null;
  }

  try {
    const {
      data,
    } =
      await supabase
        .from(
          "user_place_feedback"
        )
        .select("rating")
        .eq(
          "profile_id",
          identity.profileId
        )
        .eq(
          "entity_type",
          entityType
        )
        .eq(
          "entity_id",
          entityId
        )
        .maybeSingle();

    const rating =
      Number(
        data?.rating
      );

    if (
      Number.isFinite(rating) &&
      rating >= 1 &&
      rating <= 4
    ) {
      local[
        `${entityType}:${entityId}`
      ] = rating;

      writeLocalFeedback(
        local,
        identity.profileId
      );

      return rating;
    }
  } catch {
    // Optional Supabase sync. Local preference still works.
  }

  return null;
}

export function buildDynamicUserVector(
  surveyPreferences: any,
  learned:
    LearnedPreferenceProfile | null
) {
  const survey =
    createSurveyPreferenceVector(
      surveyPreferences
    );

  const behavior =
    normalizeVector(
      normalizeStoredVector(
        learned
          ?.behavior_vector
      )
    );

  const explicit =
    normalizeVector(
      normalizeStoredVector(
        learned
          ?.explicit_vector
      )
    );

  const count =
    learned
      ?.interaction_count ??
    0;

  const weights =
    count < 5
      ? {
          survey: 0.8,
          behavior: 0.1,
          explicit: 0.1,
        }
      : count < 20
        ? {
            survey: 0.55,
            behavior: 0.25,
            explicit: 0.2,
          }
        : {
            survey: 0.4,
            behavior: 0.35,
            explicit: 0.25,
          };

  const dynamic =
    survey.map(
      (
        value,
        index
      ) =>
        (
          value *
          weights.survey
        ) +
        (
          (
            behavior[
              index
            ] ?? 0
          ) *
          weights.behavior
        ) +
        (
          (
            explicit[
              index
            ] ?? 0
          ) *
          weights.explicit
        )
    );

  return {
    vector:
      normalizeVector(
        dynamic
      ),
    weights,
  };
}


// ============================================================
// Restaurant adaptive preference
// แยกจาก attraction topic vector เพื่อไม่ให้ feature คนละชนิดปนกัน
// ============================================================

export const RESTAURANT_VECTOR_SIZE = 18;

export type RestaurantLearnedPreferenceProfile = {
  behavior_vector: number[];
  explicit_vector: number[];
  interaction_count: number;
  version: number;
  updated_at: string;
};

const RESTAURANT_FEATURE_RULES: Array<{
  key: string;
  keywords: string[];
}> = [
  {
    key: "cafe_brunch",
    keywords: [
      "cafe",
      "café",
      "coffee",
      "brunch",
      "คาเฟ่",
      "กาแฟ",
    ],
  },
  {
    key: "thai_local",
    keywords: [
      "thai",
      "local",
      "ไทย",
      "ท้องถิ่น",
      "พื้นเมือง",
    ],
  },
  {
    key: "japanese",
    keywords: [
      "japanese",
      "sushi",
      "ramen",
      "ญี่ปุ่น",
      "ซูชิ",
      "ราเมง",
    ],
  },
  {
    key: "korean",
    keywords: [
      "korean",
      "เกาหลี",
    ],
  },
  {
    key: "chinese",
    keywords: [
      "chinese",
      "จีน",
      "ติ่มซำ",
      "dim sum",
    ],
  },
  {
    key: "western_italian",
    keywords: [
      "western",
      "italian",
      "pizza",
      "pasta",
      "ตะวันตก",
      "อิตาเลียน",
      "พิซซ่า",
      "พาสต้า",
    ],
  },
  {
    key: "street_food",
    keywords: [
      "street food",
      "food stall",
      "อาหารริมทาง",
      "สตรีทฟู้ด",
    ],
  },
  {
    key: "fine_dining",
    keywords: [
      "fine dining",
      "chef",
      "tasting menu",
      "ไฟน์ไดนิ่ง",
      "เชฟ",
    ],
  },
  {
    key: "buffet",
    keywords: [
      "buffet",
      "บุฟเฟต์",
    ],
  },
  {
    key: "seafood",
    keywords: [
      "seafood",
      "อาหารทะเล",
      "ซีฟู้ด",
    ],
  },
  {
    key: "noodle",
    keywords: [
      "noodle",
      "ramen",
      "ก๋วยเตี๋ยว",
      "บะหมี่",
      "ราเมง",
    ],
  },
  {
    key: "dessert_bakery",
    keywords: [
      "dessert",
      "bakery",
      "cake",
      "ขนม",
      "เบเกอรี่",
      "เค้ก",
    ],
  },
  {
    key: "healthy",
    keywords: [
      "healthy",
      "salad",
      "สุขภาพ",
      "สลัด",
    ],
  },
  {
    key: "vegetarian_vegan",
    keywords: [
      "vegetarian",
      "vegan",
      "มังสวิรัติ",
      "วีแกน",
      "เจ",
    ],
  },
  {
    key: "viral_trending",
    keywords: [
      "viral",
      "trending",
      "popular",
      "ดัง",
      "ไวรัล",
      "กระแส",
    ],
  },
  {
    key: "hidden_local_gem",
    keywords: [
      "hidden gem",
      "local gem",
      "ร้านลับ",
      "เจ้าถิ่น",
    ],
  },
  {
    key: "bar_nightlife",
    keywords: [
      "bar",
      "pub",
      "cocktail",
      "บาร์",
      "ผับ",
      "ค็อกเทล",
    ],
  },
  {
    key: "family_casual",
    keywords: [
      "family",
      "casual",
      "ครอบครัว",
      "สบายๆ",
      "สบาย ๆ",
    ],
  },
];

function restaurantText(
  place: any
) {
  return [
    place?.food_type_label,
    place?.place_type,
    place?.google_primary_type,
    place?.place_recommend_food,
    place?.place_hilight,
    place?.place_detail,
    place?.description,
    place?.cuisine,
    place?.cuisine_type,
    place?.restaurant_type,
    place?.types,
  ]
    .flatMap(
      value =>
        Array.isArray(value)
          ? value
          : [value]
    )
    .filter(
      value =>
        value != null
    )
    .map(
      value =>
        normalizeText(value)
    )
    .join(" ");
}

export function createRestaurantPreferenceVector(
  place: any
) {
  const text =
    restaurantText(place);

  const vector =
    RESTAURANT_FEATURE_RULES.map(
      rule =>
        rule.keywords.some(
          keyword =>
            text.includes(
              normalizeText(
                keyword
              )
            )
        )
          ? 1
          : 0
    );

  return normalizeVector(
    vector
  );
}

function emptyRestaurantProfile():
  RestaurantLearnedPreferenceProfile {
  return {
    behavior_vector:
      Array.from(
        {
          length:
            RESTAURANT_VECTOR_SIZE,
        },
        () => 0
      ),
    explicit_vector:
      Array.from(
        {
          length:
            RESTAURANT_VECTOR_SIZE,
        },
        () => 0
      ),
    interaction_count: 0,
    version: 0,
    updated_at:
      new Date(0)
        .toISOString(),
  };
}

function normalizeRestaurantStoredVector(
  value: unknown
) {
  if (
    !Array.isArray(value) ||
    value.length !==
      RESTAURANT_VECTOR_SIZE
  ) {
    return emptyRestaurantProfile()
      .behavior_vector;
  }

  return value.map(
    item => {
      const number =
        Number(item);

      return Number.isFinite(
        number
      )
        ? number
        : 0;
    }
  );
}

function sanitizeRestaurantProfile(
  value: any
):
  RestaurantLearnedPreferenceProfile {
  if (!value) {
    return emptyRestaurantProfile();
  }

  return {
    behavior_vector:
      normalizeRestaurantStoredVector(
        value.behavior_vector
      ),
    explicit_vector:
      normalizeRestaurantStoredVector(
        value.explicit_vector
      ),
    interaction_count:
      Math.max(
        0,
        Number(
          value.interaction_count ??
            0
        ) || 0
      ),
    version:
      Math.max(
        0,
        Number(
          value.version ??
            0
        ) || 0
      ),
    updated_at:
      String(
        value.updated_at ??
          new Date(0)
            .toISOString()
      ),
  };
}

function getLocalRestaurantProfileKey(
  profileId?: string | null
) {
  return profileId
    ? `travelwish_restaurant_learned_pref_${profileId}`
    : "travelwish_restaurant_learned_pref_guest";
}

function readLocalRestaurantProfile(
  profileId?: string | null
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return emptyRestaurantProfile();
  }

  try {
    const raw =
      window.localStorage
        .getItem(
          getLocalRestaurantProfileKey(
            profileId
          )
        );

    return sanitizeRestaurantProfile(
      raw
        ? JSON.parse(raw)
        : null
    );
  } catch {
    return emptyRestaurantProfile();
  }
}

function writeLocalRestaurantProfile(
  profile:
    RestaurantLearnedPreferenceProfile,
  profileId?: string | null
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    getLocalRestaurantProfileKey(
      profileId
    ),
    JSON.stringify(
      profile
    )
  );
}

export async function loadRestaurantLearnedPreferenceProfile(
  explicitProfileId?:
    string | null
) {
  const identity =
    explicitProfileId !==
    undefined
      ? {
          profileId:
            explicitProfileId,
          isGuest:
            !explicitProfileId,
        }
      : await getIdentity();

  const local =
    readLocalRestaurantProfile(
      identity.profileId
    );

  if (
    identity.isGuest ||
    !identity.profileId
  ) {
    return local;
  }

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "user_restaurant_learned_preferences"
        )
        .select(
          "behavior_vector, explicit_vector, interaction_count, version, updated_at"
        )
        .eq(
          "profile_id",
          identity.profileId
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      return local;
    }

    const remote =
      sanitizeRestaurantProfile(
        data
      );

    const newest =
      remote.version >=
      local.version
        ? remote
        : local;

    writeLocalRestaurantProfile(
      newest,
      identity.profileId
    );

    return newest;
  } catch {
    return local;
  }
}

export async function recordRestaurantInteraction(
  place: any,
  eventType:
    AdaptiveEventType,
  options:
    RecordInteractionOptions = {}
) {
  const entityId =
    getEntityId(
      place,
      "restaurant"
    );

  if (!entityId) {
    return null;
  }

  const identity =
    await getIdentity();

  const placeVector =
    createRestaurantPreferenceVector(
      place
    );

  const current =
    await loadRestaurantLearnedPreferenceProfile(
      identity.profileId
    );

  const decay =
    recencyDecay(
      current.updated_at
    );

  const rating =
    Number(
      options.rating
    );

  const signal =
    eventType ===
      "rating" &&
    Number.isFinite(rating)
      ? ratingSignal(
          rating
        )
      : eventWeight(
          eventType,
          Number(
            options.eventValue ??
              1
          )
        );

  const next:
    RestaurantLearnedPreferenceProfile = {
      ...current,
      behavior_vector: [
        ...current.behavior_vector,
      ],
      explicit_vector: [
        ...current.explicit_vector,
      ],
    };

  if (
    eventType ===
    "rating"
  ) {
    next.explicit_vector =
      updateLearnedVector(
        current.explicit_vector,
        placeVector,
        signal,
        0.5,
        decay
      );
  } else {
    next.behavior_vector =
      updateLearnedVector(
        current.behavior_vector,
        placeVector,
        signal,
        eventType ===
          "detail_open"
          ? 0.12
          : 0.24,
        decay
      );
  }

  next.interaction_count =
    current.interaction_count +
    1;

  next.version =
    current.version + 1;

  next.updated_at =
    new Date()
      .toISOString();

  writeLocalRestaurantProfile(
    next,
    identity.profileId
  );

  if (
    eventType ===
      "rating" &&
    Number.isFinite(rating)
  ) {
    const feedback =
      readLocalFeedback(
        identity.profileId
      );

    feedback[
      `restaurant:${entityId}`
    ] = rating;

    writeLocalFeedback(
      feedback,
      identity.profileId
    );
  }

  if (
    !identity.isGuest &&
    identity.profileId
  ) {
    try {
      await supabase
        .from(
          "user_place_events"
        )
        .insert({
          profile_id:
            identity.profileId,
          entity_type:
            "restaurant",
          entity_id:
            entityId,
          event_type:
            eventType,
          event_value:
            signal,
          dwell_ms:
            options.dwellMs ??
            null,
          topic_vector:
            placeVector,
        });

      if (
        eventType ===
          "rating" &&
        Number.isFinite(rating)
      ) {
        await supabase
          .from(
            "user_place_feedback"
          )
          .upsert(
            {
              profile_id:
                identity.profileId,
              entity_type:
                "restaurant",
              entity_id:
                entityId,
              rating,
              liked:
                rating >= 3,
              updated_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                "profile_id,entity_type,entity_id",
            }
          );
      }

      await supabase
        .from(
          "user_restaurant_learned_preferences"
        )
        .upsert(
          {
            profile_id:
              identity.profileId,
            behavior_vector:
              next.behavior_vector,
            explicit_vector:
              next.explicit_vector,
            interaction_count:
              next.interaction_count,
            version:
              next.version,
            updated_at:
              next.updated_at,
          },
          {
            onConflict:
              "profile_id",
          }
        );
    } catch (
      error
    ) {
      console.warn(
        "RESTAURANT ADAPTIVE SYNC SKIPPED:",
        error
      );
    }
  }

  if (
    typeof window !==
    "undefined"
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "travelwish-restaurant-preference-updated",
        {
          detail: {
            version:
              next.version,
            entityId,
            eventType,
          },
        }
      )
    );
  }

  return next;
}

export async function rankRestaurantsByLearnedPreference(
  restaurants: any[]
) {
  if (
    !Array.isArray(
      restaurants
    ) ||
    restaurants.length <= 1
  ) {
    return restaurants ?? [];
  }

  const learned =
    await loadRestaurantLearnedPreferenceProfile();

  if (
    learned.interaction_count <= 0
  ) {
    return [
      ...restaurants,
    ].sort(
      (a, b) =>
        Number(
          a?.distance ??
            Infinity
        ) -
        Number(
          b?.distance ??
            Infinity
        )
    );
  }

  const behavior =
    normalizeVector(
      learned.behavior_vector
    );

  const explicit =
    normalizeVector(
      learned.explicit_vector
    );

  const userVector =
    normalizeVector(
      behavior.map(
        (
          value,
          index
        ) =>
          value * 0.55 +
          (
            explicit[
              index
            ] ?? 0
          ) * 0.45
      )
    );

  return restaurants
    .map(
      restaurant => {
        const restaurantVector =
          createRestaurantPreferenceVector(
            restaurant
          );

        const affinity =
          cosineSimilarity(
            userVector,
            restaurantVector
          );

        const distance =
          Number(
            restaurant?.distance
          );

        const distanceScore =
          Number.isFinite(
            distance
          )
            ? Math.exp(
                -Math.max(
                  0,
                  distance
                ) / 5
              )
            : 0;

        return {
          ...restaurant,
          learned_restaurant_affinity:
            affinity,
          learned_restaurant_score:
            affinity * 0.65 +
            distanceScore * 0.35,
        };
      }
    )
    .sort(
      (a, b) =>
        Number(
          b.learned_restaurant_score ??
            0
        ) -
        Number(
          a.learned_restaurant_score ??
            0
        )
    );
}
