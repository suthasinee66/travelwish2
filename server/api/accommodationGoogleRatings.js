import express from "express";

const router = express.Router();
const cache = new Map();
const CACHE_MS = 24 * 60 * 60 * 1000;
const radians = (v) => v * Math.PI / 180;
function km(a, b, c, d) {
  const x = Math.sin(radians(c - a) / 2) ** 2 +
    Math.cos(radians(a)) * Math.cos(radians(c)) * Math.sin(radians(d - b) / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

router.post("/accommodation-google-ratings", async (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(503).json({ error: "Google Places key is not configured" });
  const candidates = Array.isArray(req.body?.candidates) ? req.body.candidates.slice(0, 15) : [];
  const province = String(req.body?.province ?? "").slice(0, 100);
  const results = [];
  for (const hotel of candidates) {
    const id = String(hotel.id ?? "");
    const name = String(hotel.name ?? "").slice(0, 180);
    const lat = Number(hotel.latitude), lon = Number(hotel.longitude);
    if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const cacheKey = [id, name, lat, lon].join("|");
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_MS) {
      results.push(cached.value);
      continue;
    }
    let value = { id, verified: false, rating: null, user_ratings_total: null, google_place_id: null };
    try {
      const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.rating,places.userRatingCount"
        },
        body: JSON.stringify({
          textQuery: name + " " + province + " Thailand",
          maxResultCount: 3,
          locationBias: { circle: { center: { latitude: lat, longitude: lon }, radius: 1500 } }
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const normalize = v => String(v ?? "").toLocaleLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, " ").trim();
        const searchName = normalize(name);
        const place = (data.places ?? []).find(p => {
          if (!p.location) return false;
          const foundName = normalize(p.displayName?.text);
          const nameMatches = foundName === searchName ||
            (searchName.length >= 8 && foundName.includes(searchName)) ||
            (foundName.length >= 8 && searchName.includes(foundName));
          return nameMatches && km(lat, lon, p.location.latitude, p.location.longitude) <= 0.8;
        });
        if (place) value = {
          id, verified: true,
          rating: typeof place.rating === "number" ? place.rating : null,
          user_ratings_total: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
          google_place_id: place.id ?? null,
          google_name: place.displayName?.text ?? null
        };
      }
    } catch (error) {
      console.warn("Google accommodation rating lookup failed:", id, String(error));
    }
    cache.set(cacheKey, { value, at: Date.now() });
    results.push(value);
  }
  res.json({ results });
});

export default router;
