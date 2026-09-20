const API_URL = (import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")).replace(/\/$/, "");
export async function getPlaceImage(
  placeName: string,
  province?: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
  const res = await fetch(
    `${API_URL}/api/place-image?name=${encodeURIComponent(
      placeName
    )}&province=${encodeURIComponent(province || "")}`,
    { signal: controller.signal }
  );

  if (!res.ok) throw new Error(`Place images unavailable (${res.status})`);

  const json = await res.json();

  console.group("🖼️ Place Image");
  console.log("attid :", placeName);
  console.log("Place :", placeName);
  console.log("Province :", province);
  console.log("Images :", json.images);
  console.groupEnd();


  return Array.isArray(json.images)
    ? json.images.filter((image: unknown) => typeof image === "string" && image.length > 0)
    : [];
  } finally {
    clearTimeout(timeout);
  }


  } 

  export async function getNearbyRestaurants(
  latitude: number,
  longitude: number,
  province?: string
) {
  const res = await fetch(
    `${API_URL}/api/nearby-restaurants?lat=${latitude}&lng=${longitude}&province=${encodeURIComponent(
      province || ""
    )}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch nearby restaurants");
  }

  const json = await res.json();

  console.log("🍜 Nearby Restaurants");
  console.log("Latitude:", latitude);
  console.log("Longitude:", longitude);
  console.log("Province:", province);
  console.log("Restaurants:", json.restaurants);

  return json.restaurants ?? [];
}
