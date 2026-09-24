import { map } from "./mapPreference";

function toArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (value == null) {
    return [];
  }

  const text =
    String(value).trim();

  return text
    ? [text]
    : [];
}

function mappedValues(
  value: any,
  dictionary: Record<string, string>,
  limit = 2
) {
  return toArray(value)
    .map(
      (item) =>
        dictionary[item] ??
        item
    )
    .filter(Boolean)
    .slice(0, limit);
}

function cleanPersonalityTag(
  value: string
) {
  return value
    .replace(
      /^(จังหวะทริป|กิจกรรม|สังคม|Nightlife|อาหาร|ที่พัก|การเดินทาง|ช้อปปิ้ง)\s*:\s*/i,
      ""
    )
    .trim();
}

export function buildQuery(pref: any) {
  const regions =
    toArray(
      pref?.preferred_region ??
      pref?.region
    )
      .slice(0, 2)
      .map((region) =>
        region.startsWith("ภาค")
          ? region
          : `ภาค${region}`
      );

  const travelTypes =
    mappedValues(
      pref?.travel_type,
      map.travel_type,
      2
    );

  const activities =
    mappedValues(
      pref?.activities,
      map.activities,
      2
    );

  const atmosphere =
    mappedValues(
      pref?.atmosphere,
      map.atmosphere,
      1
    );

  const companion =
    mappedValues(
      pref?.travel_companion,
      map.travel_companion,
      1
    );

  const budget =
    mappedValues(
      pref?.budget,
      map.budget,
      1
    );

  const travelTime =
    mappedValues(
      pref?.travel_time,
      map.travel_time,
      1
    );

  const travelGoal =
    mappedValues(
      pref?.travel_goal,
      map.travel_goal,
      1
    );

  const personality =
    toArray(
      pref?.personality_tags
    )
      .filter(
        (tag) =>
          !tag.startsWith(
            "ข้อจำกัดอาหาร:"
          )
      )
      .map(cleanPersonalityTag)
      .filter(Boolean)
      .slice(0, 2);

  const profileTerms = [
    ...regions,
    ...travelTypes,
    ...activities,
  ];

  const uniqueTerms =
    Array.from(
      new Set(profileTerms)
    );

  const query = [
    ...uniqueTerms,
    "รีวิวเที่ยว",
    "travel vlog",
    "ประเทศไทย",
  ]
    .filter(Boolean)
    .join(" ");

  console.log(
    "YOUTUBE PROFILE QUERY:",
    query
  );

  return query;
}
