function sortedArray(
  value: unknown
) {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .sort();
  }

  if (
    value == null ||
    value === ""
  ) {
    return [];
  }

  return [
    String(value),
  ];
}

export async function getPreferenceHash(
  preferences: any
) {
  const normalized =
    JSON.stringify({
      travel_type:
        sortedArray(
          preferences?.travel_type
        ),
      activities:
        sortedArray(
          preferences?.activities
        ),
      atmosphere:
        sortedArray(
          preferences?.atmosphere
        ),
      budget:
        sortedArray(
          preferences?.budget
        ),
      companion:
        sortedArray(
          preferences
            ?.travel_companion ??
          preferences?.companion
        ),
      preferred_region:
        sortedArray(
          preferences
            ?.preferred_region
        ),
      recommendation_algorithm:
        "region-filter-v1",
      learned_version:
        Number(
          preferences
            ?.__learned_preference_version ??
          0
        ) || 0,
    });

  const encoder =
    new TextEncoder();

  const data =
    encoder.encode(
      normalized
    );

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array.from(
    new Uint8Array(
      hashBuffer
    )
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}
