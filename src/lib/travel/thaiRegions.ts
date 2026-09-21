export const THAI_REGIONS = [
  "ภาคเหนือ",
  "ภาคตะวันตก",
  "ภาคกลาง",
  "ภาคตะวันออกเฉียงเหนือ",
  "ภาคตะวันออก",
  "ภาคใต้",
] as const;

export type ThaiRegion =
  (typeof THAI_REGIONS)[number];

const REGION_ALIASES: Record<
  string,
  ThaiRegion
> = {
  "เหนือ": "ภาคเหนือ",
  "ภาคเหนือ": "ภาคเหนือ",

  "ตะวันตก": "ภาคตะวันตก",
  "ภาคตะวันตก": "ภาคตะวันตก",

  "กลาง": "ภาคกลาง",
  "ภาคกลาง": "ภาคกลาง",

  "อีสาน": "ภาคตะวันออกเฉียงเหนือ",
  "ภาคอีสาน": "ภาคตะวันออกเฉียงเหนือ",
  "ตะวันออกเฉียงเหนือ":
    "ภาคตะวันออกเฉียงเหนือ",
  "ภาคตะวันออกเฉียงเหนือ":
    "ภาคตะวันออกเฉียงเหนือ",

  "ตะวันออก": "ภาคตะวันออก",
  "ภาคตะวันออก": "ภาคตะวันออก",

  "ใต้": "ภาคใต้",
  "ภาคใต้": "ภาคใต้",
};

export function normalizeThaiRegion(
  value: unknown
): ThaiRegion | "" {
  const text = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!text) return "";

  return REGION_ALIASES[text] ?? "";
}
