const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
export async function getPlaceImage(
  placeName: string,
  province?: string
) {
  const res = await fetch(
    `http://localhost:5000/api/place-image?name=${encodeURIComponent(
      placeName
    )}&province=${encodeURIComponent(province || "")}`
  );

  const json = await res.json();

  console.group("🖼️ Place Image");
  console.log("attid :", placeName);
  console.log("Place :", placeName);
  console.log("Province :", province);
  console.log("Images :", json.images);
  console.groupEnd();


  return json.images;


  } 

  export async function getNearbyRestaurants(
  latitude: number,
  longitude: number,
  province?: string
) {
  const res = await fetch(
    `http://localhost:5000/api/nearby-restaurants?lat=${latitude}&lng=${longitude}&province=${encodeURIComponent(
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