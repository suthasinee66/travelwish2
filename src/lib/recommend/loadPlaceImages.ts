import {
  getPlaceImage
} from "@/lib/google/places";


export async function loadPlaceImages(
  place: any
) {

  // ============================================================
  // 1. มีรูปอยู่แล้ว
  // ใช้ทันที
  // ============================================================

  const existingImages =
    Array.isArray(place?.images)
      ? place.images.filter(Boolean)
      : [];


  if (
    existingImages.length > 0
  ) {

    console.log(
      "✅ USE EXISTING IMAGE:",
      place.name_th
    );


    return {
      ...place,

      images:
        existingImages,

      image:
        existingImages[0]
    };

  }


  // ============================================================
  // 2. ต้องมี att_id
  // ============================================================

  if (
    !place?.att_id
  ) {

    console.warn(
      "⚠️ ไม่มี att_id:",
      place?.name_th
    );

    return place;

  }


  // ============================================================
  // 3. ถ้าไม่มี google_place_id
  // Backend จะเช็กจาก attraction ให้อีกทีได้
  // ============================================================

  console.log(
    "🌐 LOAD GOOGLE PLACE IMAGE:",
    {
      att_id:
        place.att_id,

      name:
        place.name_th,

      google_place_id:
        place.google_place_id
    }
  );


  try {

    // ==========================================================
    // Backend จะทำทั้งหมด:
    //
    // 1. หา attraction ด้วย att_id
    // 2. เช็ก images
    // 3. เอา google_place_id
    // 4. เรียก Google Places API
    // 5. save images ลง Supabase
    // ==========================================================

    const images =
      await getPlaceImage(
        place.att_id,
        place.google_place_id
      );


    if (
      !Array.isArray(images) ||
      images.length === 0
    ) {

      console.warn(
        "⚠️ NO IMAGE:",
        place.name_th
      );


      return place;

    }


    console.log(
      "✅ GOOGLE PLACE IMAGE SUCCESS:",
      place.name_th,
      images.length
    );


    return {

      ...place,

      images,

      image:
        images[0]

    };


  } catch (error) {

    console.error(
      "❌ IMAGE LOAD ERROR:",
      place.name_th,
      error
    );


    return place;

  }

}