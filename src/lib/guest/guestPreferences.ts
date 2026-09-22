export const GUEST_PREFERENCES_KEY =
  "travelwish_guest_preferences_v1";

export type GuestPreferences = {
  travel_type: string[];
  activities: string[];
  atmosphere: string;
  travel_companion: string;
  budget: string;
  travel_time: string;
  preferred_region: string[];
  travel_goal: string;
  personality_tags: string[];
};

export function getGuestPreferences():
  GuestPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        GUEST_PREFERENCES_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.travel_type) ||
      !Array.isArray(parsed.activities) ||
      !parsed.atmosphere ||
      !parsed.travel_companion ||
      !parsed.budget
    ) {
      return null;
    }

    return {
      travel_type:
        parsed.travel_type,
      activities:
        parsed.activities,
      atmosphere:
        parsed.atmosphere,
      travel_companion:
        parsed.travel_companion,
      budget:
        parsed.budget,
      travel_time:
        parsed.travel_time ||
        "ยืดหยุ่น",
      preferred_region:
        Array.isArray(
          parsed.preferred_region
        )
          ? parsed.preferred_region
          : [],
      travel_goal:
        parsed.travel_goal ||
        "เที่ยวให้ตรงกับไลฟ์สไตล์",
      personality_tags:
        Array.isArray(
          parsed.personality_tags
        )
          ? parsed.personality_tags
          : [],
    };
  } catch {
    return null;
  }
}

export function saveGuestPreferences(
  preferences: GuestPreferences
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    GUEST_PREFERENCES_KEY,
    JSON.stringify(preferences)
  );
}

export function clearGuestPreferences() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    GUEST_PREFERENCES_KEY
  );
}

export function isGuestUser(
  user: any
) {
  return Boolean(
    user?.is_anonymous
  );
}
