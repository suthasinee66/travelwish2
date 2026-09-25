type ExportImageMap = Record<string, string | null | undefined>;

type ChatMessageExportInput = {
  content?: string | null;
  plannerJson: any;
  destination?: string | null;
  accommodation?: any | null;
  createdAt?: string | null;
  imageMap?: ExportImageMap;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const toArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

const labelPeriod = (value: unknown) => {
  const labels: Record<string, string> = {
    Morning: "ช่วงเช้า",
    Lunch: "มื้อกลางวัน",
    Afternoon: "ช่วงบ่าย",
    Evening: "ช่วงเย็น",
    Dinner: "มื้อค่ำ",
    Night: "ช่วงค่ำ",
  };

  const key = String(value ?? "").trim();
  return labels[key] || key || "กำหนดการ";
};

const titleFromContent = (content: unknown, fallback: string) =>
  String(content ?? "").match(/^#\s+(.+)$/m)?.[1]?.replace(/[*_`]/g, "").trim() ||
  fallback;

function normalizePlannerItems(plannerJson: any) {
  const raw = Array.isArray(plannerJson)
    ? plannerJson
    : Array.isArray(plannerJson?.selectedPlaces)
      ? plannerJson.selectedPlaces
      : [];

  const stops: any[] = [];

  raw.forEach((item: any, sourceIndex: number) => {
    const day = Number(item?.day ?? 1) || 1;
    const expandedPlace = item?.type === "place";
    const expandedRestaurant = item?.type === "restaurant";

    if (expandedPlace || (!expandedRestaurant && item?.place_id)) {
      stops.push({
        day,
        title: item?.title ?? "",
        kind: "place",
        id: item?.place_id ?? item?.att_id ?? null,
        name:
          item?.name ??
          item?.place_name ??
          item?.place_name_th ??
          "สถานที่ท่องเที่ยว",
        period: item?.period ?? null,
        duration:
          Number(item?.place_duration_minutes ?? item?.duration_minutes ?? 0) ||
          null,
        activities: toArray(item?.place_activities ?? item?.activities),
        summary: item?.place_activity_summary ?? item?.activity_summary ?? null,
        notes: item?.place_notes ?? item?.notes ?? null,
        startTime: item?.start_time ?? null,
        endTime: item?.end_time ?? null,
        travelMinutes:
          Number(item?.travel_from_previous_minutes ?? 0) || null,
        routeKm: Number(item?.route_from_previous_km ?? 0) || null,
        order: Number(item?.route_order ?? item?.order ?? sourceIndex + 1),
      });
    }

    if (
      expandedRestaurant ||
      (!expandedPlace && item?.restaurant_id) ||
      (!item?.type && item?.restaurant_id)
    ) {
      stops.push({
        day,
        title: item?.title ?? "",
        kind: "restaurant",
        id: item?.restaurant_id ?? null,
        name:
          item?.name ??
          item?.restaurant_name ??
          item?.restaurant_name_th ??
          "ร้านอาหาร",
        period: item?.restaurant_period ?? item?.period ?? null,
        duration:
          Number(
            item?.restaurant_duration_minutes ??
              (expandedRestaurant ? item?.duration_minutes : 0) ??
              0,
          ) || null,
        activities: toArray(
          item?.restaurant_activities ??
            (expandedRestaurant ? item?.activities : []),
        ),
        summary:
          item?.restaurant_activity_summary ??
          (expandedRestaurant ? item?.activity_summary : null) ??
          null,
        notes:
          item?.restaurant_notes ??
          (expandedRestaurant ? item?.notes : null) ??
          null,
        startTime: expandedRestaurant ? item?.start_time ?? null : null,
        endTime: expandedRestaurant ? item?.end_time ?? null : null,
        travelMinutes: expandedRestaurant
          ? Number(item?.travel_from_previous_minutes ?? 0) || null
          : null,
        routeKm: null,
        order: Number(item?.route_order ?? item?.order ?? sourceIndex + 1) + 0.1,
      });
    }
  });

  return stops.sort((a, b) => a.day - b.day || a.order - b.order);
}

export function buildChatMessageExportHtml(input: ChatMessageExportInput) {
  const destination = String(input.destination ?? "TRAVEL").trim();
  const title = titleFromContent(input.content, `ทริป${destination}`);
  const stops = normalizePlannerItems(input.plannerJson);
  const imageMap = input.imageMap ?? {};
  const accommodation = input.accommodation ?? null;

  const dayNumbers = Array.from(
    new Set(stops.map((stop) => Number(stop.day))),
  );

  const daySections = dayNumbers
    .map((day) => {
      const dayStops = stops.filter((stop) => stop.day === day);
      const dayTitle = dayStops.find((stop) => stop.title)?.title ?? "";

      const cards = dayStops
        .map((stop, index) => {
          const image = imageMap[`${stop.kind}:${String(stop.id ?? "")}`];
          const time =
            stop.startTime && stop.endTime
              ? `${stop.startTime}–${stop.endTime}`
              : labelPeriod(stop.period);

          const meta = [
            stop.duration ? `${stop.duration} นาที` : null,
            stop.travelMinutes
              ? `เดินทาง ${stop.travelMinutes} นาที`
              : null,
            stop.routeKm
              ? `${Number(stop.routeKm).toFixed(1)} กม. จากจุดก่อนหน้า`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");

          const activityHtml = stop.activities
            .slice(0, 4)
            .map((activity: string) => `<li>${escapeHtml(activity)}</li>`)
            .join("");

          return `
            <article class="stop">
              <div class="no">${index + 1}</div>
              <div class="photo">
                ${
                  image
                    ? `<img src="${escapeHtml(image)}" alt="" />`
                    : `<div class="placeholder">${
                        stop.kind === "restaurant" ? "FOOD" : "PLACE"
                      }</div>`
                }
              </div>
              <div class="body">
                <div class="kicker">
                  <span>${escapeHtml(time)}</span>
                  <span class="pill">${
                    stop.kind === "restaurant" ? "FOOD" : "EXPLORE"
                  }</span>
                </div>
                <h3>${escapeHtml(stop.name)}</h3>
                ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
                ${
                  stop.summary
                    ? `<p class="summary">${escapeHtml(stop.summary)}</p>`
                    : ""
                }
                ${activityHtml ? `<ul>${activityHtml}</ul>` : ""}
                ${
                  stop.notes
                    ? `<div class="note">${escapeHtml(stop.notes)}</div>`
                    : ""
                }
              </div>
            </article>`;
        })
        .join("");

      return `
        <section class="day">
          <div class="daybar">
            <span>DAY ${day}</span>
            <strong>${escapeHtml(dayTitle)}</strong>
          </div>
          ${cards}
        </section>`;
    })
    .join("");

  const accommodationImage = Array.isArray(accommodation?.images)
    ? accommodation.images.find(
        (image: unknown) => typeof image === "string" && image.trim(),
      )
    : null;

  const accommodationHtml = accommodation
    ? `
      <section class="hotel">
        <div class="hotel-photo">
          ${
            accommodationImage
              ? `<img src="${escapeHtml(accommodationImage)}" alt="" />`
              : '<div class="placeholder">STAY</div>'
          }
        </div>
        <div>
          <div class="eyebrow">YOUR STAY</div>
          <h2>${escapeHtml(
            accommodation.name ?? accommodation.acc_name_th ?? "ที่พัก",
          )}</h2>
          ${
            accommodation.address ?? accommodation.acc_address
              ? `<p>${escapeHtml(
                  accommodation.address ?? accommodation.acc_address,
                )}</p>`
              : ""
          }
        </div>
      </section>`
    : "";

  const generated = input.createdAt
    ? new Date(input.createdAt).toLocaleString("th-TH")
    : "";

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
:root{--ink:#173d43;--teal:#087d90;--cyan:#86d7dd;--soft:#eaf8f7;--paper:#fffdf8;--muted:#68777b;--line:#d7e8e7}
*{box-sizing:border-box}
html,body{margin:0;background:#e8eeee;color:var(--ink);font-family:"Noto Sans Thai","Leelawadee UI",Tahoma,system-ui,sans-serif}
body{padding:28px 16px 80px}
.toolbar{position:sticky;top:16px;z-index:20;width:min(210mm,calc(100vw - 32px));margin:0 auto 16px;display:flex;justify-content:flex-end}
.toolbar button{border:0;border-radius:999px;padding:11px 18px;background:var(--ink);color:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 8px 22px rgba(23,61,67,.18)}
.paper{width:min(210mm,calc(100vw - 32px));min-height:297mm;margin:auto;padding:18mm 16mm 15mm;background:radial-gradient(circle at 90% 4%,rgba(134,215,221,.2),transparent 21%),var(--paper);box-shadow:0 28px 80px rgba(31,61,63,.14)}
.brand{font-size:10px;font-weight:900;letter-spacing:.18em;color:var(--teal)}
.destination{margin:10px 0 0;font-size:clamp(34px,7vw,68px);line-height:.95;text-transform:uppercase;color:var(--teal);font-weight:900}
.script{margin-top:4px;font-family:"Brush Script MT","Segoe Script",cursive;font-size:30px;color:#37a7b1;transform:rotate(-2deg);transform-origin:left center}
.trip-title{margin-top:18px;max-width:680px;font-size:17px;line-height:1.55;color:#3b5559}
.hotel{margin-top:26px;padding:12px;display:grid;grid-template-columns:92px 1fr;gap:14px;align-items:center;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.8);break-inside:avoid}
.hotel-photo{height:72px;overflow:hidden;border-radius:14px;background:var(--soft)}
.hotel-photo img,.photo img{width:100%;height:100%;object-fit:cover}
.placeholder{width:100%;height:100%;display:grid;place-items:center;font-size:9px;font-weight:900;letter-spacing:.14em;color:var(--teal);background:var(--soft)}
.eyebrow{font-size:9px;font-weight:900;letter-spacing:.16em;color:var(--teal)}
.hotel h2{margin:3px 0 2px;font-size:16px}.hotel p{margin:0;color:var(--muted);font-size:10px}
.day{margin-top:28px}.daybar{min-height:44px;padding:8px 14px;display:flex;align-items:center;gap:12px;border-radius:15px;background:linear-gradient(90deg,var(--teal),#43b4bd);color:#fff;break-after:avoid}
.daybar span{padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.18);font-size:9px;font-weight:900;letter-spacing:.08em}.daybar strong{font-size:13px;line-height:1.35}
.stop{display:grid;grid-template-columns:30px 108px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);break-inside:avoid}.no{width:28px;height:28px;margin-top:3px;display:grid;place-items:center;border-radius:50%;background:var(--cyan);color:#0d525d;font-size:11px;font-weight:900}
.photo{height:86px;overflow:hidden;border-radius:14px;background:var(--soft)}.body{min-width:0}.kicker{display:flex;flex-wrap:wrap;gap:7px;align-items:center;color:var(--teal);font-size:10px;font-weight:900}.pill{padding:3px 7px;border-radius:999px;background:var(--soft);font-size:8px;letter-spacing:.08em}
.body h3{margin:4px 0 0;font-size:15px;line-height:1.35}.meta{margin-top:3px;font-size:9px;font-weight:700;color:#7c8d90}.summary{margin:7px 0 0;font-size:10.5px;line-height:1.55;color:#3c565a}.body ul{margin:6px 0 0;padding-left:17px;color:#53696d;font-size:9.5px;line-height:1.5}.note{margin-top:7px;padding:6px 8px;border-left:3px solid var(--cyan);background:rgba(234,248,247,.7);font-size:9px;line-height:1.5;color:#607477}
.footer{margin-top:30px;padding-top:12px;display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);color:#849396;font-size:8.5px}
@media(max-width:680px){body{padding:0}.toolbar{position:fixed;right:12px;bottom:12px;top:auto;width:auto}.paper{width:100%;min-height:100vh;padding:28px 18px 90px;box-shadow:none}.stop{grid-template-columns:28px 82px 1fr;gap:9px}.photo{height:74px}}
@page{size:A4 portrait;margin:10mm}
@media print{html,body{background:#fff}body{padding:0}.toolbar{display:none!important}.paper{width:auto;min-height:0;padding:6mm 5mm;box-shadow:none;background:#fff}.day,.stop,.hotel{break-inside:avoid}.daybar{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()">Save as PDF</button></div>
<main class="paper">
  <div class="brand">TRAVELWISH · OFFLINE ITINERARY</div>
  <h1 class="destination">${escapeHtml(destination)}</h1>
  <div class="script">itinerary</div>
  <div class="trip-title">${escapeHtml(title)}</div>
  ${accommodationHtml}
  ${daySections}
  <footer class="footer">
    <span>TravelWish · ${escapeHtml(destination)}</span>
    <span>${escapeHtml(generated)}</span>
  </footer>
</main>
</body>
</html>`;
}
