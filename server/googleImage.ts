import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router = express.Router();

/* =========================================================
   ENV
========================================================= */

const GOOGLE_API_KEY =
    process.env.GOOGLE_PLACES_API_KEY;

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;


/* =========================================================
   Validate ENV
========================================================= */

if (!GOOGLE_API_KEY) {

    console.warn(
        "⚠️ GOOGLE_PLACES_API_KEY ยังไม่ได้ตั้งค่า"
    );

}

if (!SUPABASE_URL) {

    console.warn(
        "⚠️ SUPABASE_URL ยังไม่ได้ตั้งค่า"
    );

}

if (!SUPABASE_SERVICE_ROLE_KEY) {

    console.warn(
        "⚠️ SUPABASE_SERVICE_ROLE_KEY ยังไม่ได้ตั้งค่า"
    );

}


/* =========================================================
   Supabase Server Client
========================================================= */

const supabase =
    SUPABASE_URL &&
    SUPABASE_SERVICE_ROLE_KEY
        ? createClient(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )
        : null;


/* =========================================================
   Types
========================================================= */

interface GooglePhoto {

    name?: string;

    widthPx?: number;

    heightPx?: number;

}

interface GooglePlace {

    id?: string;

    displayName?: {
        text?: string;
    };

    formattedAddress?: string;

    location?: {

        latitude?: number;

        longitude?: number;

    };

    photos?: GooglePhoto[];

}


/* =========================================================
   Create Google Photo URL
========================================================= */

function createGooglePhotoUrl(
    photoName: string
): string {

    if (!GOOGLE_API_KEY) {

        throw new Error(
            "GOOGLE_PLACES_API_KEY is not configured"
        );

    }

    return (
        "https://places.googleapis.com/v1/" +
        `${photoName}/media` +
        "?maxWidthPx=1200" +
        "&maxHeightPx=900" +
        "&key=" +
        encodeURIComponent(
            GOOGLE_API_KEY
        )
    );

}


/* =========================================================
   Get Google Place By google_place_id
========================================================= */

async function getGooglePlaceById(
    googlePlaceId: string
): Promise<GooglePlace | null> {

    if (!GOOGLE_API_KEY) {

        throw new Error(
            "GOOGLE_PLACES_API_KEY is not configured"
        );

    }

    const placeId =
        String(
            googlePlaceId || ""
        ).trim();

    if (!placeId) {

        return null;

    }


    const response =
        await axios.get(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
            {
                headers: {

                    "Content-Type":
                        "application/json",

                    "X-Goog-Api-Key":
                        GOOGLE_API_KEY,

                    "X-Goog-FieldMask":
                        [
                            "id",
                            "displayName",
                            "formattedAddress",
                            "location",
                            "photos"
                        ].join(",")

                },

                timeout: 15000

            }
        );


    return (
        response.data || null
    );

}


/* =========================================================
   Get Images From Google Place ID
========================================================= */

async function getGoogleImagesByPlaceId(
    googlePlaceId: string
): Promise<{

    place: GooglePlace | null;

    images: string[];

}> {

    const place =
        await getGooglePlaceById(
            googlePlaceId
        );


    if (!place) {

        return {

            place: null,

            images: []

        };

    }


    const photos =
        Array.isArray(
            place.photos
        )
            ? place.photos
            : [];


    const images =
        photos

            .filter(
                photo =>
                    Boolean(
                        photo.name
                    )
            )

            .slice(0, 5)

            .map(
                photo =>
                    createGooglePhotoUrl(
                        photo.name!
                    )
            );


    return {

        place,

        images

    };

}


/* =========================================================
   GET /api/google-image
   -----------------------------------------
   ดึงรูปจาก google_place_id โดยตรง
=========================================================

   Example:

   /api/google-image?place_id=ChIJxxxxxxxx

========================================================= */

router.get(
    "/google-image",
    async (req, res) => {

        try {

            const placeId =
                String(
                    req.query.place_id ||
                    req.query.google_place_id ||
                    ""
                ).trim();


            if (!placeId) {

                return res.status(400).json({

                    success: false,

                    error:
                        "กรุณาระบุ google_place_id"

                });

            }


            console.log(
                "\n=========================================="
            );

            console.log(
                "🔎 GOOGLE PLACE ID"
            );

            console.log(
                "=========================================="
            );

            console.log(
                "google_place_id:",
                placeId
            );


            const result =
                await getGoogleImagesByPlaceId(
                    placeId
                );


            if (!result.place) {

                return res.json({

                    success: true,

                    found: false,

                    google_place_id:
                        placeId,

                    images: [],

                    place: null

                });

            }


            console.log(
                "Google Place:",
                result.place.displayName?.text
            );

            console.log(
                "จำนวนรูป:",
                result.images.length
            );


            return res.json({

                success: true,

                found: true,

                google_place_id:
                    placeId,

                place: {

                    id:
                        result.place.id ||
                        null,

                    name:
                        result.place.displayName?.text ||
                        null,

                    address:
                        result.place.formattedAddress ||
                        null,

                    latitude:
                        result.place.location?.latitude ??
                        null,

                    longitude:
                        result.place.location?.longitude ??
                        null

                },

                images:
                    result.images

            });


        } catch (error: any) {

            console.error(
                "❌ Google Places Error:",
                error?.response?.data ||
                error?.message ||
                error
            );


            return res.status(500).json({

                success: false,

                error:
                    error?.response?.data?.error?.message ||
                    error?.message ||
                    "Google Places API error"

            });

        }

    }
);


/* =========================================================
   POST /api/google-image/sync/:att_id
   -----------------------------------------
   Sync รูปของ attraction หนึ่งรายการ
========================================================= */

router.post(
    "/google-image/sync/:att_id",
    async (req, res) => {

        try {

            if (!supabase) {

                return res.status(500).json({

                    success: false,

                    error:
                        "Supabase server configuration is missing"

                });

            }


            const attId =
                String(
                    req.params.att_id || ""
                ).trim();


            if (!attId) {

                return res.status(400).json({

                    success: false,

                    error:
                        "กรุณาระบุ att_id"

                });

            }


            console.log(
                "\n=========================================="
            );

            console.log(
                "🖼️ SYNC ATTRACTION IMAGE"
            );

            console.log(
                "=========================================="
            );

            console.log(
                "att_id:",
                attId
            );


            /* -----------------------------------------
               1. อ่าน attraction
            ----------------------------------------- */

            const {
                data: attraction,
                error: attractionError
            } =
                await supabase

                    .from("attraction")

                    .select(`
                        att_id,
                        name_th,
                        province,
                        latitude,
                        longitude,
                        google_place_id,
                        images
                    `)

                    .eq(
                        "att_id",
                        attId
                    )

                    .maybeSingle();


            if (attractionError) {

                throw attractionError;

            }


            if (!attraction) {

                return res.status(404).json({

                    success: false,

                    error:
                        "ไม่พบ attraction"

                });

            }


            /* -----------------------------------------
               2. ตรวจ google_place_id
            ----------------------------------------- */

            const googlePlaceId =
                String(
                    attraction.google_place_id ||
                    ""
                ).trim();


            if (!googlePlaceId) {

                return res.json({

                    success: true,

                    updated: false,

                    reason:
                        "ไม่มี google_place_id",

                    attraction: {

                        att_id:
                            attraction.att_id,

                        name_th:
                            attraction.name_th

                    },

                    images: []

                });

            }


            console.log(
                "ชื่อ:",
                attraction.name_th
            );

            console.log(
                "google_place_id:",
                googlePlaceId
            );


            /* -----------------------------------------
               3. ดึงรูปจาก Google
            ----------------------------------------- */

            const result =
                await getGoogleImagesByPlaceId(
                    googlePlaceId
                );


            if (!result.place) {

                return res.json({

                    success: true,

                    updated: false,

                    reason:
                        "ไม่พบ Google Place",

                    attraction: {

                        att_id:
                            attraction.att_id,

                        name_th:
                            attraction.name_th

                    },

                    images: []

                });

            }


            /* -----------------------------------------
               4. ถ้าไม่มีรูป
            ----------------------------------------- */

            if (
                result.images.length === 0
            ) {

                return res.json({

                    success: true,

                    updated: false,

                    reason:
                        "Google Place ไม่มีรูป",

                    attraction: {

                        att_id:
                            attraction.att_id,

                        name_th:
                            attraction.name_th

                    },

                    google_place_id:
                        googlePlaceId,

                    images: []

                });

            }


            /* -----------------------------------------
               5. บันทึก images ลง attraction
            ----------------------------------------- */

            const googleLatitude =
                result.place.location?.latitude;

            const googleLongitude =
                result.place.location?.longitude;

            const updatePayload: Record<string, any> = {

                images:
                    result.images,

                updated_at:
                    new Date().toISOString()

            };

            if (
                Number.isFinite(
                    googleLatitude
                ) &&
                Number.isFinite(
                    googleLongitude
                )
            ) {

                updatePayload.latitude =
                    googleLatitude;

                updatePayload.longitude =
                    googleLongitude;

            }


            const {
                error: updateError
            } =
                await supabase

                    .from("attraction")

                    .update(
                        updatePayload
                    )

                    .eq(
                        "att_id",
                        attId
                    );


            if (updateError) {

                throw updateError;

            }


            console.log(
                "✅ บันทึกรูปสำเร็จ:",
                result.images.length
            );

            if (
                Number.isFinite(
                    googleLatitude
                ) &&
                Number.isFinite(
                    googleLongitude
                )
            ) {

                console.log(
                    "📍 อัปเดต location:",
                    googleLatitude,
                    googleLongitude
                );

            }


            /* -----------------------------------------
               6. Response
            ----------------------------------------- */

            return res.json({

                success: true,

                updated: true,

                att_id:
                    attraction.att_id,

                name_th:
                    attraction.name_th,

                google_place_id:
                    googlePlaceId,

                google_place_name:
                    result.place
                        .displayName?.text ||
                    null,

                images:
                    result.images,

                image_count:
                    result.images.length,

                location: {
                    latitude:
                        Number.isFinite(
                            googleLatitude
                        )
                            ? googleLatitude
                            : attraction.latitude,

                    longitude:
                        Number.isFinite(
                            googleLongitude
                        )
                            ? googleLongitude
                            : attraction.longitude
                }

            });


        } catch (error: any) {

            console.error(
                "❌ Sync Attraction Image Error:",
                error?.response?.data ||
                error?.message ||
                error
            );


            return res.status(500).json({

                success: false,

                error:
                    error?.response?.data?.error?.message ||
                    error?.message ||
                    "ไม่สามารถ sync รูปได้"

            });

        }

    }
);


/* =========================================================
   POST /api/google-image/sync-attractions
   -----------------------------------------
   Sync รูป attraction ทั้งหมดที่มี google_place_id
========================================================= */

router.post(
    "/google-image/sync-attractions",
    async (req, res) => {

        try {

            if (!supabase) {

                return res.status(500).json({

                    success: false,

                    error:
                        "Supabase server configuration is missing"

                });

            }


            console.log(
                "\n=========================================="
            );

            console.log(
                "🚀 SYNC ALL ATTRACTION IMAGES"
            );

            console.log(
                "=========================================="
            );


            /* -----------------------------------------
               1. ดึง attraction ทั้งหมด
               ที่มี google_place_id
            ----------------------------------------- */

            const {
                data: attractions,
                error: fetchError
            } =
                await supabase

                    .from("attraction")

                    .select(`
                        att_id,
                        name_th,
                        province,
                        latitude,
                        longitude,
                        google_place_id,
                        images
                    `)

                    .not(
                        "google_place_id",
                        "is",
                        null
                    )

                    .order(
                        "name_th",
                        {
                            ascending: true
                        }
                    );


            if (fetchError) {

                throw fetchError;

            }


            const places =
                attractions || [];


            console.log(
                "จำนวนสถานที่:",
                places.length
            );


            /* -----------------------------------------
               Statistics
            ----------------------------------------- */

            let successCount = 0;

            let noPhotoCount = 0;

            let noPlaceIdCount = 0;

            let errorCount = 0;


            const results: any[] = [];


            /* -----------------------------------------
               2. Loop
            ----------------------------------------- */

            for (
                let i = 0;
                i < places.length;
                i++
            ) {

                const attraction =
                    places[i];


                const attId =
                    attraction.att_id;


                const name =
                    attraction.name_th ||
                    attId;


                const googlePlaceId =
                    String(
                        attraction.google_place_id ||
                        ""
                    ).trim();


                console.log(
                    `\n[${i + 1}/${places.length}]`,
                    name
                );


                /* -------------------------------------
                   ไม่มี google_place_id
                ------------------------------------- */

                if (!googlePlaceId) {

                    noPlaceIdCount++;

                    results.push({

                        att_id:
                            attId,

                        name_th:
                            name,

                        success: false,

                        reason:
                            "ไม่มี google_place_id"

                    });

                    continue;

                }


                try {

                    /* ---------------------------------
                       ดึง Google Place
                    --------------------------------- */

                    const result =
                        await getGoogleImagesByPlaceId(
                            googlePlaceId
                        );


                    /* ---------------------------------
                       Google Place ไม่พบ
                    --------------------------------- */

                    if (!result.place) {

                        noPhotoCount++;

                        results.push({

                            att_id:
                                attId,

                            name_th:
                                name,

                            google_place_id:
                                googlePlaceId,

                            success: false,

                            reason:
                                "ไม่พบ Google Place",

                            image_count: 0

                        });

                        continue;

                    }


                    /* ---------------------------------
                       ไม่มีรูป
                    --------------------------------- */

                    if (
                        result.images.length === 0
                    ) {

                        noPhotoCount++;

                        results.push({

                            att_id:
                                attId,

                            name_th:
                                name,

                            google_place_id:
                                googlePlaceId,

                            success: false,

                            reason:
                                "Google Place ไม่มีรูป",

                            image_count: 0

                        });

                        continue;

                    }


                    /* ---------------------------------
                       Update Supabase
                    --------------------------------- */

                    const googleLatitude =
                        result.place.location?.latitude;

                    const googleLongitude =
                        result.place.location?.longitude;

                    const updatePayload: Record<string, any> = {

                        images:
                            result.images,

                        updated_at:
                            new Date().toISOString()

                    };

                    if (
                        Number.isFinite(
                            googleLatitude
                        ) &&
                        Number.isFinite(
                            googleLongitude
                        )
                    ) {

                        updatePayload.latitude =
                            googleLatitude;

                        updatePayload.longitude =
                            googleLongitude;

                    }


                    const {
                        error: updateError
                    } =
                        await supabase

                            .from("attraction")

                            .update(
                                updatePayload
                            )

                            .eq(
                                "att_id",
                                attId
                            );


                    if (updateError) {

                        throw updateError;

                    }


                    successCount++;


                    results.push({

                        att_id:
                            attId,

                        name_th:
                            name,

                        google_place_id:
                            googlePlaceId,

                        success: true,

                        image_count:
                            result.images.length,

                        location: {
                            latitude:
                                Number.isFinite(
                                    googleLatitude
                                )
                                    ? googleLatitude
                                    : attraction.latitude,

                            longitude:
                                Number.isFinite(
                                    googleLongitude
                                )
                                    ? googleLongitude
                                    : attraction.longitude
                        }

                    });


                    console.log(
                        `   ✅ ${result.images.length} รูป`
                    );

                    if (
                        Number.isFinite(
                            googleLatitude
                        ) &&
                        Number.isFinite(
                            googleLongitude
                        )
                    ) {

                        console.log(
                            `   📍 location: ${googleLatitude}, ${googleLongitude}`
                        );

                    }


                    /* ---------------------------------
                       ป้องกันยิง API เร็วเกินไป
                    --------------------------------- */

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                100
                            )
                    );


                } catch (error: any) {

                    errorCount++;


                    console.error(
                        `   ❌ ${name}`,
                        error?.response?.data ||
                        error?.message ||
                        error
                    );


                    results.push({

                        att_id:
                            attId,

                        name_th:
                            name,

                        google_place_id:
                            googlePlaceId,

                        success: false,

                        reason:
                            error?.response?.data?.error?.message ||
                            error?.message ||
                            "Google API error"

                    });

                }

            }


            /* -----------------------------------------
               Summary
            ----------------------------------------- */

            console.log(
                "\n=========================================="
            );

            console.log(
                "✅ SYNC COMPLETE"
            );

            console.log(
                "=========================================="
            );

            console.log(
                "ทั้งหมด:",
                places.length
            );

            console.log(
                "สำเร็จ:",
                successCount
            );

            console.log(
                "ไม่มีรูป / ไม่พบ:",
                noPhotoCount
            );

            console.log(
                "ไม่มี Place ID:",
                noPlaceIdCount
            );

            console.log(
                "Error:",
                errorCount
            );


            return res.json({

                success: true,

                summary: {

                    total:
                        places.length,

                    success:
                        successCount,

                    no_photo:
                        noPhotoCount,

                    no_place_id:
                        noPlaceIdCount,

                    error:
                        errorCount

                },

                results

            });


        } catch (error: any) {

            console.error(
                "❌ Sync All Error:",
                error?.response?.data ||
                error?.message ||
                error
            );


            return res.status(500).json({

                success: false,

                error:
                    error?.response?.data?.error?.message ||
                    error?.message ||
                    "ไม่สามารถ sync รูปทั้งหมดได้"

            });

        }

    }
);


/* =========================================================
   Export
========================================================= */

export default router;