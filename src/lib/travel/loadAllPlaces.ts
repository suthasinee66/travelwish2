import { supabase } from "@/lib/supabase";


export async function loadAllPlaces() {

  console.time(
    "loadAllPlaces"
  );


  const allData: any[] =
    [];


  const pageSize =
    1000;


  let from =
    0;


  while (true) {

    const {
      data,
      error
    } = await supabase

      .from(
        "attraction"
      )

      // โหลดเฉพาะ field
      // ที่ Recommendation ใช้
      .select(`
  att_id,
  name_th,
  province,
  region,
  google_place_id,
  travel_type,
  activities,
  atmosphere,
  budget,
  travel_companion,
  images
`)

      .range(
        from,
        from + pageSize - 1
      );


    if (error) {

      console.error(
        "LOAD ATTRACTION ERROR:",
        error
      );

      throw error;

    }


    if (
      !data ||
      data.length === 0
    ) {

      break;

    }


    allData.push(
      ...data
    );


    if (
      data.length <
      pageSize
    ) {

      break;

    }


    from +=
      pageSize;

  }


  console.log(
    "✅ ALL PLACES LOADED:",
    allData.length
  );


  console.timeEnd(
    "loadAllPlaces"
  );


  return allData;

}