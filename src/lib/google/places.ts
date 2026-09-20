const API_URL =
  (
    import.meta.env.VITE_API_URL ||
    (
      import.meta.env.DEV
        ? "http://localhost:5000"
        : ""
    )
  ).replace(
    /\/$/,
    ""
  );


// ============================================================
// ATTRACTION IMAGE
// ============================================================

export async function getPlaceImage(
  attId: string | number,
  googlePlaceId?: string | null
) {

  if (!attId) {

    console.warn(
      "⚠️ getPlaceImage ไม่มี att_id"
    );

    return [];

  }


  const params =
    new URLSearchParams();


  params.set(
    "att_id",
    String(attId)
  );


  if (
    googlePlaceId
  ) {

    params.set(
      "google_place_id",
      googlePlaceId
    );

  }


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      10000
    );


  try {

    console.log(
      "🖼️ REQUEST ATTRACTION IMAGE:",
      {
        attId,
        googlePlaceId
      }
    );


    const response =
      await fetch(

        `${API_URL}/api/attraction-images?${params.toString()}`,

        {
          signal:
            controller.signal
        }

      );


    if (
      !response.ok
    ) {

      const errorText =
        await response.text();


      console.error(
        "❌ ATTRACTION IMAGE API ERROR:",
        response.status,
        errorText
      );


      return [];

    }


    const json =
      await response.json();


    console.log(
      "🖼️ ATTRACTION IMAGE RESPONSE:",
      json
    );


    const images =
      Array.isArray(
        json.images
      )
        ? json.images.filter(
            (
              image: unknown
            ) =>
              typeof image ===
                "string" &&
              image.length > 0
          )
        : [];


    return images;


  } catch (error) {

    if (
      error instanceof DOMException &&
      error.name ===
        "AbortError"
    ) {

      console.warn(
        "⚠️ IMAGE API TIMEOUT:",
        attId
      );

    } else {

      console.error(
        "❌ GET PLACE IMAGE ERROR:",
        error
      );

    }


    return [];


  } finally {

    clearTimeout(
      timeout
    );

  }

}


// ============================================================
// NEARBY RESTAURANTS
// ============================================================

export async function getNearbyRestaurants(
  latitude: number,
  longitude: number,
  province?: string
) {

  const res =
    await fetch(

      `${API_URL}/api/nearby-restaurants?lat=${latitude}&lng=${longitude}&province=${encodeURIComponent(
        province || ""
      )}`

    );


  if (!res.ok) {

    throw new Error(
      "Failed to fetch nearby restaurants"
    );

  }


  const json =
    await res.json();


  return (
    json.restaurants ??
    []
  );

}