import { supabase } from "@/lib/supabase";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

export type PlaceDetailWeather = {
  temperature: number | null;
  apparentTemperature: number | null;
  weatherCode: number | null;
  condition: string;
  rainChance: number | null;
  recommendedTime: string;
  advice: string;
};

export type PlaceDetailRelatedData = {
  weather: PlaceDetailWeather | null;
  similarPlaces: any[];
  nearbyRestaurants: any[];
  nearbyPlaces: any[];
};

function isFiniteNumber(value: unknown) {
  return Number.isFinite(Number(value));
}

export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map(String);
  }

  if (value == null || value === "") {
    return [];
  }

  return [String(value)];
}

function overlapScore(a: unknown, b: unknown) {
  const left = new Set(
    toArray(a).map((value) =>
      value.trim().toLowerCase()
    )
  );

  return toArray(b).reduce(
    (score, value) =>
      score +
      (left.has(
        value.trim().toLowerCase()
      )
        ? 1
        : 0),
    0
  );
}

function weatherCondition(code: number | null) {
  if (code == null) return "ไม่ทราบสภาพอากาศ";

  if (code === 0) return "ท้องฟ้าแจ่มใส";
  if (code <= 3) return "มีเมฆบางส่วน";
  if (code <= 48) return "มีหมอก";
  if (code <= 57) return "มีฝนละออง";
  if (code <= 67) return "มีฝน";
  if (code <= 77) return "มีฝน/ลูกเห็บ";
  if (code <= 82) return "มีฝนเป็นช่วง ๆ";
  if (code <= 86) return "มีฝนหนักเป็นช่วง ๆ";
  return "มีพายุฝนฟ้าคะนอง";
}

function buildWeatherAdvice(
  temperature: number | null,
  rainChance: number | null,
  weatherCode: number | null
) {
  const isRainy =
    weatherCode != null &&
    weatherCode >= 51;

  if (
    rainChance != null &&
    rainChance >= 60
  ) {
    return {
      recommendedTime: "ช่วงที่ฝนน้อยที่สุด",
      advice:
        "วันนี้มีโอกาสฝนค่อนข้างสูง ควรพกร่มและเช็กสภาพอากาศอีกครั้งก่อนออกเดินทาง",
    };
  }

  if (
    temperature != null &&
    temperature >= 32
  ) {
    return {
      recommendedTime: "ช่วงเช้าหรือหลัง 16:00 น.",
      advice:
        "วันนี้อากาศค่อนข้างร้อน แนะนำมาเที่ยวช่วงเช้าหรือเย็น และเตรียมน้ำดื่มให้เพียงพอ",
    };
  }

  if (isRainy) {
    return {
      recommendedTime: "ช่วงที่ฝนเบาลง",
      advice:
        "มีแนวโน้มฝนตกเป็นช่วง ๆ แนะนำเตรียมร่มหรือเสื้อกันฝนไว้ด้วย",
    };
  }

  return {
    recommendedTime: "เช้าถึงเย็น",
    advice:
      "สภาพอากาศโดยรวมเหมาะกับการเที่ยว สามารถวางแผนตามเวลาที่สถานที่เปิดให้บริการได้",
  };
}

async function loadWeather(
  latitude: number,
  longitude: number
): Promise<PlaceDetailWeather | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "temperature_2m,apparent_temperature,weather_code",
      daily: "precipitation_probability_max",
      timezone: "Asia/Bangkok",
      forecast_days: "1",
    });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    const temperature =
      isFiniteNumber(
        data?.current?.temperature_2m
      )
        ? Number(
            data.current.temperature_2m
          )
        : null;

    const apparentTemperature =
      isFiniteNumber(
        data?.current?.apparent_temperature
      )
        ? Number(
            data.current
              .apparent_temperature
          )
        : null;

    const weatherCode =
      isFiniteNumber(
        data?.current?.weather_code
      )
        ? Number(
            data.current.weather_code
          )
        : null;

    const rainChance =
      isFiniteNumber(
        data?.daily
          ?.precipitation_probability_max?.[0]
      )
        ? Number(
            data.daily
              .precipitation_probability_max[0]
          )
        : null;

    const recommendation =
      buildWeatherAdvice(
        temperature,
        rainChance,
        weatherCode
      );

    return {
      temperature,
      apparentTemperature,
      weatherCode,
      condition:
        weatherCondition(weatherCode),
      rainChance,
      ...recommendation,
    };
  } catch (error) {
    console.warn(
      "LOAD PLACE WEATHER ERROR:",
      error
    );

    return null;
  }
}

async function loadProvinceAttractions(
  province: string,
  currentId: string | null
) {
  const { data, error } = await supabase
    .from("attraction")
    .select("*")
    .eq("province", province)
    .limit(300);

  if (error) {
    console.warn(
      "LOAD RELATED ATTRACTIONS ERROR:",
      error
    );

    return [];
  }

  return (data ?? []).filter(
    (place: any) =>
      !currentId ||
      String(place?.att_id) !== currentId
  );
}

function rankSimilarPlaces(
  current: any,
  places: any[],
  latitude: number,
  longitude: number
) {
  return places
    .map((place) => {
      const distance = distanceKm(
        latitude,
        longitude,
        Number(place.latitude),
        Number(place.longitude)
      );

      const similarity =
        overlapScore(
          current?.travel_type,
          place?.travel_type
        ) *
          3 +
        overlapScore(
          current?.category,
          place?.category
        ) *
          2 +
        overlapScore(
          current?.activities,
          place?.activities
        ) *
          2 +
        overlapScore(
          current?.atmosphere,
          place?.atmosphere
        );

      return {
        ...place,
        distance,
        _similarity: similarity,
      };
    })
    .sort((a, b) => {
      if (
        b._similarity !==
        a._similarity
      ) {
        return (
          b._similarity -
          a._similarity
        );
      }

      return a.distance - b.distance;
    })
    .slice(0, 6);
}

function rankNearbyPlaces(
  places: any[],
  latitude: number,
  longitude: number
) {
  return places
    .map((place) => ({
      ...place,
      distance: distanceKm(
        latitude,
        longitude,
        Number(place.latitude),
        Number(place.longitude)
      ),
    }))
    .filter((place) =>
      Number.isFinite(place.distance)
    )
    .sort(
      (a, b) =>
        a.distance - b.distance
    )
    .slice(0, 6);
}

async function loadNearbyRestaurants(
  current: any,
  latitude: number,
  longitude: number,
  province: string
) {
  const attId =
    current?.att_id ??
    current?.place_id ??
    null;

  if (attId && API_URL) {
    try {
      const params = new URLSearchParams({
        att_id: String(attId),
        lat: String(latitude),
        lng: String(longitude),
        province,
      });

      const response = await fetch(
        `${API_URL}/api/nearby-restaurants?${params.toString()}`
      );

      if (response.ok) {
        const result =
          await response.json();

        const restaurants =
          Array.isArray(
            result?.restaurants
          )
            ? result.restaurants
            : [];

        if (restaurants.length) {
          return restaurants
            .map((restaurant: any) => ({
              ...restaurant,
              distance:
                isFiniteNumber(
                  restaurant.distance
                )
                  ? Number(
                      restaurant.distance
                    )
                  : distanceKm(
                      latitude,
                      longitude,
                      Number(
                        restaurant.latitude
                      ),
                      Number(
                        restaurant.longitude
                      )
                    ),
            }))
            .sort(
              (a: any, b: any) =>
                a.distance - b.distance
            )
            .slice(0, 6);
        }
      }
    } catch (error) {
      console.warn(
        "NEARBY RESTAURANT API ERROR:",
        error
      );
    }
  }

  const { data, error } = await supabase
    .from("restaurant")
    .select("*")
    .eq("province_name_th", province)
    .limit(500);

  if (error) {
    console.warn(
      "LOAD RESTAURANT FALLBACK ERROR:",
      error
    );

    return [];
  }

  return (data ?? [])
    .map((restaurant: any) => ({
      ...restaurant,
      distance: distanceKm(
        latitude,
        longitude,
        Number(restaurant.latitude),
        Number(restaurant.longitude)
      ),
    }))
    .filter(
      (restaurant: any) =>
        Number.isFinite(
          restaurant.distance
        ) &&
        restaurant.distance <= 10
    )
    .sort(
      (a: any, b: any) =>
        a.distance - b.distance
    )
    .slice(0, 6);
}

export async function loadPlaceDetailRelatedData(
  current: any
): Promise<PlaceDetailRelatedData> {
  const latitude = Number(
    current?.latitude ??
      current?.location?.latitude
  );

  const longitude = Number(
    current?.longitude ??
      current?.location?.longitude
  );

  const province = String(
    current?.province ??
      current?.province_name_th ??
      ""
  ).trim();

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      weather: null,
      similarPlaces: [],
      nearbyRestaurants: [],
      nearbyPlaces: [],
    };
  }

  const currentId =
    current?.att_id != null
      ? String(current.att_id)
      : null;

  const [weather, provincePlaces] =
    await Promise.all([
      loadWeather(
        latitude,
        longitude
      ),
      province
        ? loadProvinceAttractions(
            province,
            currentId
          )
        : Promise.resolve([]),
    ]);

  const [
    similarPlaces,
    nearbyRestaurants,
    nearbyPlaces,
  ] = await Promise.all([
    Promise.resolve(
      rankSimilarPlaces(
        current,
        provincePlaces,
        latitude,
        longitude
      )
    ),
    province
      ? loadNearbyRestaurants(
          current,
          latitude,
          longitude,
          province
        )
      : Promise.resolve([]),
    Promise.resolve(
      rankNearbyPlaces(
        provincePlaces,
        latitude,
        longitude
      )
    ),
  ]);

  return {
    weather,
    similarPlaces,
    nearbyRestaurants,
    nearbyPlaces,
  };
}

export async function getAttractionSavedState(
  attId: string
) {
  const { data: auth } =
    await supabase.auth.getUser();

  if (!auth.user) {
    return false;
  }

  const { data } = await supabase
    .from("saved_places")
    .select("id")
    .eq("profile_id", auth.user.id)
    .eq("att_id", attId)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function toggleAttractionSaved(
  attId: string,
  currentlySaved: boolean
) {
  const { data: auth } =
    await supabase.auth.getUser();

  if (!auth.user) {
    return currentlySaved;
  }

  if (currentlySaved) {
    const { error } = await supabase
      .from("saved_places")
      .delete()
      .eq(
        "profile_id",
        auth.user.id
      )
      .eq("att_id", attId);

    if (error) throw error;

    return false;
  }

  const { error } = await supabase
    .from("saved_places")
    .insert({
      profile_id: auth.user.id,
      att_id: attId,
      collection: "Want to go",
    });

  if (error) throw error;

  return true;
}
