import {
  generateWithSelectedModel,
  type AIModel
} from "./ai";
import {
  rankPlacesWithNearbyRestaurants
} from "./algorithm";
import {
  loadAllAttractions,
  loadAllRestaurants,
  loadUserPreferences
} from "./planner";

export type TripPlanEditIntent = {
  isEdit: boolean;
  action: "replace" | "remove" | "preference_change";
  scope: "specific" | "day" | "period" | "all";
  targetPlaceIds: string[];
  targetPlaceNames: string[];
  day: number | null;
  period:
    | "Morning"
    | "Lunch"
    | "Afternoon"
    | "Evening"
    | "Dinner"
    | null;
  excludeKeywords: string[];
  includeKeywords: string[];
};

export type TripPlanEditChange = {
  day: number;
  period: string | null;
  oldPlaceId: string;
  oldPlaceName: string;
  newPlaceId: string;
  newPlaceName: string;
};

export type TripEditConstraints = {
  rejectedPlaceIds: string[];
  excludeKeywords: string[];
};

export type TripPlanEditResult = {
  plannerJson: any[];
  reply: string;
  changedDays: number[];
  changes: TripPlanEditChange[];
  constraints: TripEditConstraints;
};

const EMPTY_INTENT: TripPlanEditIntent = {
  isEdit: false,
  action: "replace",
  scope: "specific",
  targetPlaceIds: [],
  targetPlaceNames: [],
  day: null,
  period: null,
  excludeKeywords: [],
  includeKeywords: []
};

function plannerItemsOf(plannerJson: any): any[] {
  if (Array.isArray(plannerJson)) {
    return plannerJson;
  }

  if (Array.isArray(plannerJson?.selectedPlaces)) {
    return plannerJson.selectedPlaces;
  }

  return [];
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => String(item ?? "").trim())
    .filter(Boolean);
}

function normalizePeriod(value: unknown): TripPlanEditIntent["period"] {
  const text = String(value ?? "").trim().toLowerCase();

  if (!text) return null;
  if (text === "morning" || text.includes("เช้า")) return "Morning";
  if (text === "lunch" || text.includes("กลางวัน")) return "Lunch";
  if (text === "afternoon" || text.includes("บ่าย")) return "Afternoon";
  if (text === "evening" || text.includes("เย็น")) return "Evening";
  if (text === "dinner" || text.includes("ค่ำ")) return "Dinner";

  return null;
}

function currentPlanForPrompt(plannerJson: any) {
  return plannerItemsOf(plannerJson)
    .filter(item => item?.place_id)
    .map((item, index) => ({
      index: index + 1,
      day: Number(item.day) || 1,
      period: item.period ?? null,
      place_id: String(item.place_id),
      place_name: item.place_name ?? "",
      restaurant_id: item.restaurant_id ?? null,
      restaurant_name: item.restaurant_name ?? null
    }));
}

function fallbackIntent(
  message: string,
  plannerJson: any
): TripPlanEditIntent {
  const text = message.trim().toLowerCase();

  const editWords = [
    "ไม่เอา",
    "ไม่อยากไป",
    "ไม่ชอบ",
    "เปลี่ยน",
    "แทน",
    "ตัด",
    "เอาออก",
    "ขอเป็น",
    "ขอแบบ",
    "ไกลเกิน",
    "ใกล้กว่านี้"
  ];

  if (!editWords.some(word => text.includes(word))) {
    return { ...EMPTY_INTENT };
  }

  const dayMatch = text.match(/วันที่?\s*(\d+)/);
  const day = dayMatch ? Number(dayMatch[1]) : null;

  const knownKeywords = [
    "อุทยาน",
    "วัด",
    "คาเฟ่",
    "น้ำตก",
    "ทะเล",
    "ภูเขา",
    "พิพิธภัณฑ์",
    "ตลาด",
    "ธรรมชาติ",
    "เมือง"
  ];

  const excludeKeywords =
    text.includes("ไม่") ||
    text.includes("ตัด") ||
    text.includes("เอาออก")
      ? knownKeywords.filter(keyword => text.includes(keyword))
      : [];

  const includeKeywords =
    text.includes("แทน") ||
    text.includes("ขอเป็น") ||
    text.includes("ขอแบบ")
      ? knownKeywords.filter(
          keyword =>
            text.includes(keyword) &&
            !excludeKeywords.includes(keyword)
        )
      : [];

  const period = normalizePeriod(text);
  const plan = currentPlanForPrompt(plannerJson);

  const targetPlaceIds = plan
    .filter(item => {
      if (day && item.day !== day) return false;
      if (
        period &&
        String(item.period ?? "").toLowerCase() !==
          period.toLowerCase()
      ) {
        return false;
      }

      if (excludeKeywords.length > 0) {
        const name = String(item.place_name ?? "").toLowerCase();
        return excludeKeywords.some(keyword =>
          name.includes(keyword.toLowerCase())
        );
      }

      return Boolean(day || period);
    })
    .map(item => item.place_id);

  return {
    isEdit: true,
    action: "replace",
    scope:
      targetPlaceIds.length > 0
        ? "specific"
        : day
          ? "day"
          : period
            ? "period"
            : "all",
    targetPlaceIds,
    targetPlaceNames: [],
    day,
    period,
    excludeKeywords,
    includeKeywords
  };
}

export async function detectTripPlanEdit(
  message: string,
  plannerJson: any,
  selectedModel: AIModel = "gemini"
): Promise<TripPlanEditIntent> {
  const currentPlan = currentPlanForPrompt(plannerJson);

  if (currentPlan.length === 0) {
    return { ...EMPTY_INTENT };
  }

  const prompt = `
คุณเป็นตัววิเคราะห์คำสั่งแก้ไขแผนเที่ยวของ TravelWish

แผนปัจจุบัน:
${JSON.stringify(currentPlan, null, 2)}

ข้อความล่าสุดของผู้ใช้:
"${message}"

ให้ตัดสินว่าผู้ใช้กำลัง "ขอแก้แผนเที่ยวปัจจุบัน" หรือแค่ถามข้อมูลทั่วไป

ถือว่า isEdit=true เมื่อผู้ใช้ต้องการเปลี่ยน/ตัด/แทน/หลีกเลี่ยงสถานที่ในแผน เช่น:
- ไม่อยากไปอุทยาน มีที่อื่นอีกไหม
- วันที่ 2 บ่ายขอคาเฟ่แทน
- ตัดวัดออก
- เปลี่ยนที่แรก
- อันนี้ไกลเกิน ขอที่ใกล้กว่านี้
- วันที่ 1 ขอเที่ยวชิลกว่านี้

ถือว่า isEdit=false เมื่อเป็นคำถามข้อมูลทั่วไปที่ไม่ได้ขอเปลี่ยนแผน

กฎสำคัญ:
- targetPlaceIds ต้องใช้ place_id จากแผนปัจจุบันเท่านั้น
- ถ้าผู้ใช้ระบุชื่อ/ประเภทที่ไม่ต้องการ ให้เลือก targetPlaceIds ของสถานที่ปัจจุบันที่เกี่ยวข้อง
- ถ้าระบุวัน ให้ day เป็นเลขวัน
- ถ้าระบุช่วงเวลา ให้ period เป็น Morning, Lunch, Afternoon, Evening หรือ Dinner
- excludeKeywords คือสิ่งที่ผู้ใช้ไม่ต้องการ เช่น ["อุทยาน"]
- includeKeywords คือสิ่งที่ผู้ใช้อยากได้แทน เช่น ["คาเฟ่"]
- scope เป็น specific, day, period หรือ all
- action ใช้ replace เป็นหลักเมื่อผู้ใช้ต้องการสถานที่อื่นแทน

ตอบ JSON เท่านั้น ห้าม Markdown:
{
  "isEdit": false,
  "action": "replace",
  "scope": "specific",
  "targetPlaceIds": [],
  "targetPlaceNames": [],
  "day": null,
  "period": null,
  "excludeKeywords": [],
  "includeKeywords": []
}
`.trim();

  try {
    const raw = await generateWithSelectedModel(
      selectedModel,
      prompt
    );

    const cleaned = String(raw ?? "")
      .replace(/^\`\`\`json\s*/i, "")
      .replace(/^\`\`\`\s*/i, "")
      .replace(/\`\`\`$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      isEdit: parsed?.isEdit === true,
      action:
        parsed?.action === "remove" ||
        parsed?.action === "preference_change"
          ? parsed.action
          : "replace",
      scope:
        parsed?.scope === "day" ||
        parsed?.scope === "period" ||
        parsed?.scope === "all"
          ? parsed.scope
          : "specific",
      targetPlaceIds: cleanStringArray(
        parsed?.targetPlaceIds
      ),
      targetPlaceNames: cleanStringArray(
        parsed?.targetPlaceNames
      ),
      day:
        Number.isFinite(Number(parsed?.day)) &&
        Number(parsed?.day) > 0
          ? Number(parsed.day)
          : null,
      period: normalizePeriod(parsed?.period),
      excludeKeywords: cleanStringArray(
        parsed?.excludeKeywords
      ),
      includeKeywords: cleanStringArray(
        parsed?.includeKeywords
      )
    };
  } catch (error) {
    console.warn(
      "⚠️ PLAN EDIT INTENT FALLBACK:",
      error
    );

    return fallbackIntent(
      message,
      plannerJson
    );
  }
}

function placeSearchText(place: any): string {
  const values = [
    place?.name_th,
    place?.name_en,
    place?.type,
    place?.category,
    place?.travel_type,
    place?.activities,
    place?.atmosphere,
    place?.highlight,
    place?.detail_th,
    place?.detail_en
  ];

  return values
    .flatMap(value =>
      Array.isArray(value)
        ? value
        : [value]
    )
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesAnyKeyword(
  place: any,
  keywords: string[]
) {
  if (keywords.length === 0) return false;

  const text = placeSearchText(place);

  return keywords.some(keyword =>
    text.includes(
      keyword.toLowerCase()
    )
  );
}

function resolveTargets(
  plannerJson: any,
  intent: TripPlanEditIntent
) {
  const items = plannerItemsOf(plannerJson);
  const idSet = new Set(
    intent.targetPlaceIds.map(String)
  );
  const nameSet = new Set(
    intent.targetPlaceNames.map(name =>
      name.toLowerCase()
    )
  );

  let targets = items.filter(item => {
    if (!item?.place_id) return false;

    const id = String(item.place_id);
    const name = String(
      item.place_name ?? ""
    ).toLowerCase();

    if (idSet.has(id)) return true;
    if (nameSet.has(name)) return true;

    return false;
  });

  if (targets.length > 0) {
    return targets;
  }

  targets = items.filter(item => {
    if (!item?.place_id) return false;

    if (
      intent.day &&
      Number(item.day) !== intent.day
    ) {
      return false;
    }

    if (
      intent.period &&
      String(item.period ?? "").toLowerCase() !==
        intent.period.toLowerCase()
    ) {
      return false;
    }

    if (intent.excludeKeywords.length > 0) {
      const name = String(
        item.place_name ?? ""
      ).toLowerCase();

      return intent.excludeKeywords.some(
        keyword =>
          name.includes(
            keyword.toLowerCase()
          )
      );
    }

    if (intent.scope === "day") {
      return Boolean(intent.day);
    }

    if (intent.scope === "period") {
      return Boolean(intent.period);
    }

    return intent.scope === "all";
  });

  return targets;
}

function mergePreferenceKeywords(
  trip: any,
  includeKeywords: string[]
) {
  const travelTypes = [
    "ทะเล",
    "ภูเขา",
    "ธรรมชาติ",
    "คาเฟ่",
    "วัฒนธรรม",
    "เมือง"
  ];

  const activities = [
    "ถ่ายรูป",
    "เดินป่า",
    "อาหาร",
    "ช้อปปิ้ง",
    "พักผ่อน"
  ];

  const nextTravelTypes = new Set<string>(
    Array.isArray(trip.travelType)
      ? trip.travelType
      : []
  );

  const nextActivities = new Set<string>(
    Array.isArray(trip.activities)
      ? trip.activities
      : []
  );

  includeKeywords.forEach(keyword => {
    travelTypes.forEach(type => {
      if (
        keyword.includes(type) ||
        type.includes(keyword)
      ) {
        nextTravelTypes.add(type);
      }
    });

    activities.forEach(activity => {
      if (
        keyword.includes(activity) ||
        activity.includes(keyword)
      ) {
        nextActivities.add(activity);
      }
    });
  });

  return {
    ...trip,
    travelType: [...nextTravelTypes],
    activities: [...nextActivities]
  };
}

function buildReply(
  changes: TripPlanEditChange[],
  intent: TripPlanEditIntent
) {
  const periodLabel: Record<string, string> = {
    Morning: "ช่วงเช้า",
    Lunch: "ช่วงกลางวัน",
    Afternoon: "ช่วงบ่าย",
    Evening: "ช่วงเย็น",
    Dinner: "ช่วงค่ำ"
  };

  const lines = changes.map(change => {
    const period =
      change.period
        ? periodLabel[change.period] ?? change.period
        : "";

    const when = [
      `วันที่ ${change.day}`,
      period
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      `- **${when}** — ` +
      `${change.oldPlaceName} → **${change.newPlaceName}**`
    );
  });

  const conditionParts = [
    intent.excludeKeywords.length
      ? `ตัด **${intent.excludeKeywords.join(", ")}** ออกจากแผน`
      : null,
    intent.includeKeywords.length
      ? `เน้น **${intent.includeKeywords.join(", ")}** แทน`
      : null
  ].filter(Boolean);

  const conditionText = conditionParts.length
    ? conditionParts.join(" และ ")
    : "ปรับเฉพาะจุดที่คุณขอ";

  return [
    "**ปรับทริปให้แล้ว ✨**",
    "",
    `${conditionText} โดยเปลี่ยนทั้งหมด **${changes.length} จุด**`,
    "",
    ...lines,
    "",
    "_ส่วนอื่นของทริปยังคงเดิม_"
  ].join("\n");
}

export async function applyTripPlanEdit({
  plannerJson,
  intent,
  tripInput,
  userId,
  constraints
}: {
  plannerJson: any;
  intent: TripPlanEditIntent;
  tripInput: any;
  userId: string;
  constraints?: Partial<TripEditConstraints>;
}): Promise<TripPlanEditResult> {
  const items = plannerItemsOf(plannerJson);
  const targets = resolveTargets(
    plannerJson,
    intent
  );

  if (targets.length === 0) {
    throw new Error(
      "ไม่พบส่วนของทริปที่ตรงกับคำสั่งแก้ไข"
    );
  }

  const rejectedPlaceIds = new Set<string>([
    ...cleanStringArray(
      constraints?.rejectedPlaceIds
    ),
    ...targets
      .map(item => item?.place_id)
      .filter(Boolean)
      .map(String)
  ]);

  const persistentExcludeKeywords = [
    ...new Set([
      ...cleanStringArray(
        constraints?.excludeKeywords
      ),
      ...intent.excludeKeywords
    ])
  ];

  const province = String(
    tripInput?.province ?? ""
  ).trim();

  if (!province) {
    throw new Error(
      "ไม่พบจังหวัดของทริปปัจจุบัน"
    );
  }

  const [
    attractions,
    restaurants,
    preferences
  ] = await Promise.all([
    loadAllAttractions(province),
    loadAllRestaurants(province),
    loadUserPreferences(userId)
  ]);

  const usedPlaceIds = new Set(
    items
      .map(item => item?.place_id)
      .filter(Boolean)
      .map(String)
  );

  let candidates = attractions.filter(
    place => {
      const id = String(
        place?.att_id ??
        place?.id ??
        ""
      );

      if (!id) return false;

      // ไม่วนกลับไปใช้สถานที่ที่อยู่ในทริปปัจจุบัน
      if (usedPlaceIds.has(id)) {
        return false;
      }

      // จำสถานที่ที่ผู้ใช้เคยปฏิเสธไว้ตลอดแชตนี้
      if (rejectedPlaceIds.has(id)) {
        return false;
      }

      // จำประเภท/คำที่ผู้ใช้เคยบอกว่าไม่เอา เช่น "อุทยาน"
      if (
        persistentExcludeKeywords.length > 0 &&
        matchesAnyKeyword(
          place,
          persistentExcludeKeywords
        )
      ) {
        return false;
      }

      return true;
    }
  );

  if (intent.includeKeywords.length > 0) {
    const preferred = candidates.filter(
      place =>
        matchesAnyKeyword(
          place,
          intent.includeKeywords
        )
    );

    // ถ้ามีตัวเลือกที่ตรงคำขอเพียงพอ ใช้เฉพาะกลุ่มนั้น
    // ถ้าไม่พอ ให้ TDMC ช่วยหาอันดับที่เหมาะสมจาก candidate ที่เหลือ
    if (preferred.length >= targets.length) {
      candidates = preferred;
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      "ไม่พบสถานที่ทดแทนที่ตรงเงื่อนไข"
    );
  }

  const tripForRanking = mergePreferenceKeywords(
    {
      ...tripInput,
      days: tripInput?.days ?? 1,
      travelType:
        tripInput?.travelType?.length
          ? tripInput.travelType
          : preferences?.travel_type ?? [],
      activities:
        tripInput?.activities?.length
          ? tripInput.activities
          : preferences?.activities ?? [],
      atmosphere:
        tripInput?.atmosphere?.length
          ? tripInput.atmosphere
          : preferences?.atmosphere
            ? [preferences.atmosphere]
            : [],
      companion:
        tripInput?.companion ||
        preferences?.travel_companion ||
        "",
      budget:
        tripInput?.budget ||
        preferences?.budget ||
        0
    },
    intent.includeKeywords
  );

  const ranked =
    await rankPlacesWithNearbyRestaurants(
      candidates,
      restaurants,
      tripForRanking as any,
      {
        limit: Math.min(
          30,
          Math.max(
            15,
            targets.length * 5
          )
        ),
        candidateMultiplier: 5
      }
    );

  if (!ranked.length) {
    throw new Error(
      "Algorithm ไม่พบสถานที่ทดแทน"
    );
  }

  const replacements = ranked.slice(
    0,
    targets.length
  );

  const replacementByOldId =
    new Map<string, any>();

  targets.forEach((target, index) => {
    const replacement =
      replacements[index];

    if (replacement) {
      replacementByOldId.set(
        String(target.place_id),
        replacement
      );
    }
  });

  const changes: TripPlanEditChange[] = [];

  const updatedPlannerJson = items.map(item => {
    if (!item?.place_id) {
      return item;
    }

    const oldId = String(item.place_id);
    const replacement =
      replacementByOldId.get(oldId);

    if (!replacement) {
      return item;
    }

    const attraction =
      replacement.attraction;

    const restaurant =
      Array.isArray(
        replacement.nearbyRestaurants
      )
        ? replacement.nearbyRestaurants[0]
        : null;

    const newPlaceId = String(
      attraction?.id ??
      attraction?.att_id ??
      ""
    );

    const newPlaceName =
      attraction?.name_th ??
      attraction?.name_en ??
      "สถานที่ใหม่";

    changes.push({
      day: Number(item.day) || 1,
      period: item.period ?? null,
      oldPlaceId: oldId,
      oldPlaceName:
        item.place_name ??
        "สถานที่เดิม",
      newPlaceId,
      newPlaceName
    });

    return {
      ...item,
      place_id: newPlaceId,
      place_name: newPlaceName,
      restaurant_id:
        restaurant?.id ?? null,
      restaurant_name:
        restaurant?.restaurant_name_th ??
        null
    };
  });

  if (changes.length === 0) {
    throw new Error(
      "ไม่สามารถแทนที่สถานที่ได้"
    );
  }

  return {
    plannerJson: updatedPlannerJson,
    reply: buildReply(
      changes,
      intent
    ),
    changedDays: [
      ...new Set(
        changes.map(change => change.day)
      )
    ],
    changes,
    constraints: {
      rejectedPlaceIds: [
        ...rejectedPlaceIds
      ],
      excludeKeywords:
        persistentExcludeKeywords
    }
  };
}
