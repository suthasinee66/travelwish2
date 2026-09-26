type ExportImageMap =
  Record<string, string | null | undefined>;

type ChatMessageExportInput = {
  content?: string | null;
  plannerJson: any;
  destination?: string | null;
  accommodation?: any | null;
  createdAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  imageMap?: ExportImageMap;
};

const escapeHtml = (
  value: unknown
) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const toArray = (
  value: unknown
) =>
  Array.isArray(value)
    ? value
        .map(
          item =>
            String(
              item ?? ""
            ).trim()
        )
        .filter(Boolean)
    : [];

const labelPeriod = (
  value: unknown
) => {
  const labels:
    Record<string, string> = {
      Morning: "MORNING",
      Lunch: "LUNCH",
      Afternoon: "AFTERNOON",
      Evening: "EVENING",
      Dinner: "DINNER",
      Night: "NIGHT",
    };

  const key =
    String(
      value ?? ""
    ).trim();

  return (
    labels[key] ||
    key.toUpperCase() ||
    "STOP"
  );
};

const titleFromContent = (
  content: unknown,
  fallback: string
) =>
  String(
    content ?? ""
  )
    .match(
      /^#\s+(.+)$/m
    )?.[1]
    ?.replace(
      /[*_`]/g,
      ""
    )
    .trim() ||
  fallback;

const formatDate = (
  value: unknown
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      String(value)
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
};

const formatDayNumber = (
  value: number
) =>
  String(value)
    .padStart(
      2,
      "0"
    );

function normalizePlannerItems(
  plannerJson: any
) {
  const raw =
    Array.isArray(
      plannerJson
    )
      ? plannerJson
      : Array.isArray(
          plannerJson
            ?.selectedPlaces
        )
        ? plannerJson
            .selectedPlaces
        : [];

  const stops: any[] = [];

  raw.forEach(
    (
      item: any,
      sourceIndex: number
    ) => {
      const day =
        Number(
          item?.day ?? 1
        ) || 1;

      const expandedPlace =
        item?.type ===
        "place";

      const expandedRestaurant =
        item?.type ===
        "restaurant";

      if (
        expandedPlace ||
        (
          !expandedRestaurant &&
          item?.place_id
        )
      ) {
        stops.push({
          day,

          title:
            item?.title ??
            "",

          kind:
            "place",

          id:
            item?.place_id ??
            item?.att_id ??
            null,

          name:
            item?.name ??
            item?.place_name ??
            item?.place_name_th ??
            "สถานที่ท่องเที่ยว",

          period:
            item?.period ??
            null,

          duration:
            Number(
              item
                ?.place_duration_minutes ??
              item
                ?.duration_minutes ??
              0
            ) ||
            null,

          activities:
            toArray(
              item
                ?.place_activities ??
              item
                ?.activities
            ),

          summary:
            item
              ?.place_activity_summary ??
            item
              ?.activity_summary ??
            null,

          notes:
            item
              ?.place_notes ??
            item?.notes ??
            null,

          startTime:
            item?.start_time ??
            null,

          endTime:
            item?.end_time ??
            null,

          travelMinutes:
            Number(
              item
                ?.travel_from_previous_minutes ??
              0
            ) ||
            null,

          routeKm:
            Number(
              item
                ?.route_from_previous_km ??
              0
            ) ||
            null,

          order:
            Number(
              item
                ?.route_order ??
              item
                ?.order ??
              sourceIndex + 1
            ),
        });
      }

      if (
        expandedRestaurant ||
        (
          !expandedPlace &&
          item?.restaurant_id
        ) ||
        (
          !item?.type &&
          item?.restaurant_id
        )
      ) {
        stops.push({
          day,

          title:
            item?.title ??
            "",

          kind:
            "restaurant",

          id:
            item
              ?.restaurant_id ??
            null,

          name:
            item?.name ??
            item?.restaurant_name ??
            item
              ?.restaurant_name_th ??
            "ร้านอาหาร",

          period:
            item
              ?.restaurant_period ??
            item?.period ??
            null,

          duration:
            Number(
              item
                ?.restaurant_duration_minutes ??
              (
                expandedRestaurant
                  ? item
                      ?.duration_minutes
                  : 0
              ) ??
              0
            ) ||
            null,

          activities:
            toArray(
              item
                ?.restaurant_activities ??
              (
                expandedRestaurant
                  ? item
                      ?.activities
                  : []
              )
            ),

          summary:
            item
              ?.restaurant_activity_summary ??
            (
              expandedRestaurant
                ? item
                    ?.activity_summary
                : null
            ) ??
            null,

          notes:
            item
              ?.restaurant_notes ??
            (
              expandedRestaurant
                ? item?.notes
                : null
            ) ??
            null,

          startTime:
            expandedRestaurant
              ? item
                  ?.start_time ??
                null
              : null,

          endTime:
            expandedRestaurant
              ? item
                  ?.end_time ??
                null
              : null,

          travelMinutes:
            expandedRestaurant
              ? Number(
                  item
                    ?.travel_from_previous_minutes ??
                  0
                ) ||
                null
              : null,

          routeKm:
            null,

          order:
            Number(
              item
                ?.route_order ??
              item
                ?.order ??
              sourceIndex + 1
            ) +
            0.1,
        });
      }
    }
  );

  return stops.sort(
    (
      left,
      right
    ) =>
      left.day -
        right.day ||
      left.order -
        right.order
  );
}

export function buildChatMessageExportHtml(
  input:
    ChatMessageExportInput
) {
  const destination =
    String(
      input.destination ??
      "TRAVEL"
    ).trim();

  const title =
    titleFromContent(
      input.content,
      `ทริป${destination}`
    );

  const stops =
    normalizePlannerItems(
      input.plannerJson
    );

  const imageMap =
    input.imageMap ??
    {};

  const dayNumbers =
    Array.from(
      new Set(
        stops.map(
          stop =>
            Number(
              stop.day
            )
        )
      )
    );

  const firstImage =
    stops
      .map(
        stop =>
          imageMap[
            `${stop.kind}:${String(
              stop.id ??
              ""
            )}`
          ]
      )
      .find(Boolean) ??
    null;

  const accommodation =
    input.accommodation ??
    null;

  const accommodationName =
    accommodation
      ? (
          accommodation.name ??
          accommodation
            .acc_name_th ??
          accommodation
            .acc_name_en ??
          "ที่พัก"
        )
      : null;

  const dateStart =
    formatDate(
      input.startDate
    );

  const dateEnd =
    formatDate(
      input.endDate
    );

  const tripLengthLabel =
    dayNumbers.length > 0
      ? `${dayNumbers.length} DAYS · ${destination.toUpperCase()}`
      : destination.toUpperCase();

  const dateMeta =
    dateStart ||
    dateEnd
      ? `
        <div class="header-dates">
          ${
            dateStart
              ? `<span><b>Departure:</b> ${escapeHtml(
                  dateStart
                )}</span>`
              : ""
          }

          ${
            dateEnd
              ? `<span><b>Arrival:</b> ${escapeHtml(
                  dateEnd
                )}</span>`
              : ""
          }
        </div>
      `
      : accommodationName
        ? `
          <div class="header-dates">
            <span>
              <b>Stay:</b>
              ${escapeHtml(
                accommodationName
              )}
            </span>
          </div>
        `
        : "";

  const daySections =
    dayNumbers
      .map(
        day => {
          const dayStops =
            stops.filter(
              stop =>
                stop.day ===
                day
            );

          const dayTitle =
            dayStops.find(
              stop =>
                stop.title
            )?.title ??
            `Day ${day}`;

          const dayImages =
            Array.from(
              new Set(
                dayStops
                  .map(
                    stop =>
                      imageMap[
                        `${stop.kind}:${String(
                          stop.id ??
                          ""
                        )}`
                      ]
                  )
                  .filter(
                    (
                      image
                    ): image is string =>
                      typeof image ===
                        "string" &&
                      image.trim()
                        .length > 0
                  )
              )
            )
              .slice(
                0,
                4
              );

          if (
            dayImages.length ===
              0 &&
            firstImage
          ) {
            dayImages.push(
              firstImage
            );
          }

          const rows =
            dayStops
              .map(
                stop => {
                  const time =
                    stop.startTime &&
                    stop.endTime
                      ? `${stop.startTime}–${stop.endTime}`
                      : labelPeriod(
                          stop.period
                        );

                  const activityDetail =
                    stop.summary ??
                    stop.activities[0] ??
                    "";

                  const activityText =
                    activityDetail
                      ? `${stop.name} — ${activityDetail}`
                      : stop.name;

                  const noteParts = [
                    stop.notes,
                    stop.duration
                      ? `${stop.duration} นาที`
                      : null,
                    stop.travelMinutes
                      ? `เดินทาง ${stop.travelMinutes} นาที`
                      : null,
                    stop.routeKm
                      ? `${Number(
                          stop.routeKm
                        ).toFixed(
                          1
                        )} กม. จากจุดก่อนหน้า`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return `
                    <tr>
                      <td class="time-cell">
                        ${escapeHtml(
                          time
                        )}
                      </td>

                      <td class="activity-cell">
                        <strong>
                          ${escapeHtml(
                            stop.name
                          )}
                        </strong>

                        ${
                          activityDetail
                            ? `
                              <span>
                                ${escapeHtml(
                                  activityDetail
                                )}
                              </span>
                            `
                            : ""
                        }
                      </td>

                      <td class="notes-cell">
                        ${escapeHtml(
                          noteParts
                        )}
                      </td>
                    </tr>
                  `;
                }
              )
              .join("");

          return `
            <section class="day-card">
              <div class="day-image">
                ${
                  dayImages.length >
                  0
                    ? `
                      <div
                        class="day-image-grid day-image-count-${dayImages.length}"
                      >
                        ${dayImages
                          .map(
                            (
                              image,
                              imageIndex
                            ) => `
                              <div
                                class="day-image-item day-image-item-${imageIndex + 1}"
                              >
                                <img
                                  src="${escapeHtml(
                                    image
                                  )}"
                                  alt=""
                                />
                              </div>
                            `
                          )
                          .join("")}
                      </div>
                    `
                    : `
                      <div class="image-placeholder">
                        ${escapeHtml(
                          destination
                        )}
                      </div>
                    `
                }

                <div class="day-badge">
                  <span>DAY</span>
                  <strong>
                    ${formatDayNumber(
                      day
                    )}
                  </strong>
                </div>
              </div>

              <div class="day-table-wrap">
                <div class="day-title">
                  ${escapeHtml(
                    dayTitle
                  )}
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>TIME:</th>
                      <th>ACTIVITY:</th>
                      <th>NOTES:</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${rows}
                  </tbody>
                </table>
              </div>
            </section>
          `;
        }
      )
      .join("");

  const createdLabel =
    input.createdAt
      ? new Date(
          input.createdAt
        ).toLocaleString(
          "th-TH"
        )
      : "";

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />

  <title>
    ${escapeHtml(
      title
    )}
  </title>

  <style>
    :root {
      --navy: #b89bcb;
      --navy-dark: #8f73a5;
      --navy-soft: #c9b4d8;
      --coral: #e9a8c9;
      --paper: #fffdf7;
      --line: #eaddea;
      --ink: #4e4057;
      --muted: #8a778d;
      --page-gray: #f7f2f6;
      --lavender: #b89bcb;
      --blush: #e9a8c9;
      --cream: #f7edbd;
      --sky: #a9dce8;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      background: var(--page-gray);
      color: var(--ink);
      font-family:
        "Noto Sans Thai",
        Arial,
        sans-serif;
      font-optical-sizing: auto;
      font-synthesis: none;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    body {
      padding:
        36px
        20px
        72px;
    }

    .toolbar {
      position: sticky;
      top: 14px;
      z-index: 50;
      width: min(
        1050px,
        calc(100vw - 40px)
      );
      margin:
        0
        auto
        14px;
      display: flex;
      justify-content: flex-end;
    }

    .toolbar button {
      appearance: none;
      border: 0;
      border-radius: 999px;
      padding:
        11px
        18px;
      background:
        linear-gradient(
          90deg,
          var(--blush),
          var(--cream),
          var(--sky)
        );
      color:
        var(--navy-dark);
      font: inherit;
      font-weight: 800;
      cursor: pointer;
      box-shadow:
        0
        10px
        24px
        rgba(
          9,
          42,
          91,
          .22
        );
    }

    .sheet {
      position: relative;
      width: min(
        1050px,
        calc(100vw - 40px)
      );
      min-height: 1350px;
      margin: 0 auto;
      overflow: hidden;
      padding:
        70px
        64px
        70px
        92px;
      background:
        radial-gradient(
          circle
            at
            88%
            2%,
          transparent
            0
            78px,
          rgba(
            255,
            255,
            255,
            .20
          )
            79px
            82px,
          transparent
            83px
        ),
        linear-gradient(
          135deg,
          #8f73a5
            0%,
          #b89bcb
            48%,
          #a9dce8
            100%
        );
      box-shadow:
        0
        28px
        76px
        rgba(
          0,
          0,
          0,
          .22
        );
    }

    .sheet::before {
      content: "";
      position: absolute;
      left: -100px;
      top: -90px;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      background:
        linear-gradient(
          145deg,
          #e9a8c9,
          #f7edbd
        );
      opacity: .96;
    }

    .sheet::after {
      content: "";
      position: absolute;
      right: -130px;
      bottom: -120px;
      width: 340px;
      height: 340px;
      border-radius: 50%;
      background:
        rgba(
          255,
          255,
          255,
          .035
        );
    }

    .side-label {
      position: absolute;
      z-index: 5;
      left: 18px;
      top: 430px;
      transform:
        rotate(-90deg)
        translateX(-100%);
      transform-origin:
        left
        top;
      white-space: nowrap;
      color:
        rgba(
          255,
          255,
          255,
          .88
        );
      font-size: 40px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: .055em;
      font-family:
        "Noto Sans Thai",
        Arial,
        sans-serif;
    }

    .header-card {
      position: relative;
      z-index: 3;
      display: grid;
      grid-template-columns:
        190px
        minmax(
          0,
          1fr
        );
      gap: 24px;
      align-items: stretch;
      min-height: 210px;
      padding: 22px;
      border-radius: 24px;
      background:
        linear-gradient(
          180deg,
          #fffefc,
          #fffafb
        );
      box-shadow:
        0
        14px
        26px
        rgba(
          1,
          18,
          45,
          .18
        );
    }

    .header-image {
      position: relative;
      overflow: hidden;
      min-height: 166px;
      background:
        var(--sky);
    }

    .header-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .header-placeholder {
      width: 100%;
      height: 100%;
      min-height: 166px;
      display: grid;
      place-items: center;
      background:
        linear-gradient(
          145deg,
          #a9dce8,
          #b89bcb
        );
      color:
        rgba(
          255,
          255,
          255,
          .94
        );
      font-size: 18px;
      font-weight: 900;
      letter-spacing: .12em;
    }

    .header-copy {
      min-width: 0;
      padding:
        8px
        4px
        2px;
    }

    .header-copy h1 {
      margin: 0;
      font-size: 42px;
      line-height: .98;
      letter-spacing: -.025em;
      color: #8f73a5;
      font-weight: 800;
      font-family:
        "Noto Sans Thai",
        Arial,
        sans-serif;
    }

    .header-copy h1 span {
      color: var(--blush);
    }

    .trip-length {
      margin-top: 9px;
      font-size: 24px;
      line-height: 1.12;
      font-weight: 700;
      letter-spacing: -.015em;
      color: var(--navy-dark);
      text-transform: uppercase;
    }

    .header-line {
      width: 78px;
      height: 3px;
      margin-top: 15px;
      background:
        linear-gradient(
          135deg,
          #8f73a5,
          #b89bcb
        );
    }

    .trip-title {
      margin-top: 12px;
      max-width: 690px;
      font-size: 12.5px;
      line-height: 1.65;
      color: var(--muted);
      font-weight: 500;
    }

    .header-dates {
      margin-top: 18px;
      display: flex;
      flex-wrap: wrap;
      gap:
        8px
        24px;
      font-size: 12px;
      color: var(--ink);
    }

    .header-dates b {
      color: var(--coral);
    }

    .days {
      position: relative;
      z-index: 3;
      margin-top: 30px;
      display: grid;
      gap: 26px;
    }

    .day-card {
      display: grid;
      grid-template-columns:
        190px
        minmax(
          0,
          1fr
        );
      gap: 0;
      min-height: 218px;
      overflow: hidden;
      border-radius: 24px;
      background: white;
      box-shadow:
        0
        14px
        26px
        rgba(
          1,
          18,
          45,
          .18
        );
      break-inside: avoid;
    }

    .day-image {
      position: relative;
      min-height: 218px;
      overflow: hidden;
      background:
        #ffffff;
    }

    .day-image-grid {
      width: 100%;
      height: 100%;
      min-height: 218px;
      display: grid;
      gap: 5px;
      padding: 5px;
      background:
        #ffffff;
    }

    .day-image-item {
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      border-radius: 10px;
      background:
        #ffffff;
    }

    .day-image-item img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .day-image-count-1 {
      grid-template-columns:
        1fr;
      grid-template-rows:
        1fr;
    }

    .day-image-count-2 {
      grid-template-columns:
        1fr
        1fr;
      grid-template-rows:
        1fr;
    }

    .day-image-count-3 {
      grid-template-columns:
        1.15fr
        .85fr;
      grid-template-rows:
        1fr
        1fr;
    }

    .day-image-count-3
      .day-image-item-1 {
      grid-row:
        1 /
        span
        2;
    }

    .day-image-count-4 {
      grid-template-columns:
        1fr
        1fr;
      grid-template-rows:
        1fr
        1fr;
    }

    .image-placeholder {
      width: 100%;
      height: 100%;
      min-height: 218px;
      display: grid;
      place-items: center;
      padding: 20px;
      background:
        #ffffff;
      color: white;
      text-align: center;
      font-size: 16px;
      font-weight: 900;
    }

    .day-badge {
      position: absolute;
      right: 12px;
      bottom: 10px;
      display: grid;
      color: white;
      text-align: left;
      text-shadow:
        0
        2px
        8px
        rgba(
          0,
          0,
          0,
          .36
        );
    }

    .day-badge span {
      font-size: 15px;
      line-height: 1;
      font-weight: 900;
    }

    .day-badge strong {
      margin-top: -1px;
      font-size: 36px;
      line-height: .92;
      font-weight: 900;
    }

    .day-table-wrap {
      min-width: 0;
      padding:
        18px
        22px
        20px;
    }

    .day-title {
      margin-bottom: 8px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--navy-dark);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .01em;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th {
      padding:
        0
        10px
        8px;
      border-bottom:
        1px
        solid
        var(--line);
      color: var(--navy);
      text-align: left;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .055em;
    }

    th:first-child,
    td:first-child {
      width: 20%;
      padding-left: 0;
    }

    th:nth-child(2),
    td:nth-child(2) {
      width: 43%;
    }

    th:last-child,
    td:last-child {
      width: 37%;
      padding-right: 0;
    }

    td {
      padding:
        8px
        10px;
      border-bottom:
        1px
        solid
        #F1EAF2;
      vertical-align: top;
      font-size: 10.5px;
      line-height: 1.5;
      color: var(--ink);
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    .time-cell {
      font-weight: 700;
      color: #8f73a5;
      white-space: nowrap;
    }

    .activity-cell strong {
      display: block;
      font-weight: 700;
      color: var(--ink);
    }

    .activity-cell span {
      display: block;
      margin-top: 2px;
      color: var(--muted);
      font-size: 9px;
      line-height: 1.35;
    }

    .notes-cell {
      color: #6F6074;
      font-size: 9.5px;
      line-height: 1.5;
    }

    .footer {
      position: relative;
      z-index: 3;
      margin-top: 26px;
      display: flex;
      justify-content: space-between;
      gap: 18px;
      color:
        rgba(
          255,
          255,
          255,
          .72
        );
      font-size: 9px;
    }

    @media (
      max-width:
        760px
    ) {
      body {
        padding: 0;
      }

      .toolbar {
        position: fixed;
        right: 12px;
        bottom: 12px;
        top: auto;
        width: auto;
      }

      .sheet {
        width: 100%;
        min-height: 100vh;
        padding:
          58px
          16px
          90px;
      }

      .side-label {
        display: none;
      }

      .header-card,
      .day-card {
        grid-template-columns:
          1fr;
      }

      .header-image,
      .day-image {
        min-height: 180px;
      }

      .day-image-grid {
        min-height: 220px;
      }

      .header-copy h1 {
        font-size: 34px;
      }

      .trip-length {
        font-size: 20px;
      }

      .day-table-wrap {
        overflow-x: auto;
      }

      table {
        min-width: 620px;
      }
    }

    @page {
      size:
        A4
        portrait;
      margin: 0;
    }

    @media print {
      html,
      body {
        background:
          var(--navy);
      }

      body {
        padding: 0;
      }

      .toolbar {
        display:
          none
          !important;
      }

      .sheet {
        width: 210mm;
        min-height: 297mm;
        padding:
          14mm
          12mm
          14mm
          20mm;
        box-shadow: none;
        -webkit-print-color-adjust:
          exact;
        print-color-adjust:
          exact;
      }

      .header-card,
      .day-card {
        break-inside: avoid;
      }

      .day-card {
        min-height: 54mm;
      }

      .day-image {
        min-height: 54mm;
      }

      .day-image-grid {
        min-height: 54mm;
        gap: 1.2mm;
        padding: 1.2mm;
      }

      .day-image-item {
        border-radius: 2.5mm;
      }

      .footer {
        margin-top: 12px;
      }
    }
  </style>
</head>

<body>
  <div class="toolbar">
    <button
      onclick="window.print()"
    >
      Save as PDF
    </button>
  </div>

  <main class="sheet">
    <div class="side-label">
      ITINERARY PLAN
    </div>

    <section class="header-card">
      <div class="header-image">
        ${
          firstImage
            ? `
              <img
                src="${escapeHtml(
                  firstImage
                )}"
                alt=""
              />
            `
            : `
              <div class="header-placeholder">
                TRAVEL
              </div>
            `
        }
      </div>

      <div class="header-copy">
        <h1>
          <span>TRAVEL</span>
          ITINERARY
        </h1>

        <div class="trip-length">
          ${escapeHtml(
            tripLengthLabel
          )}
        </div>

        <div class="header-line"></div>

        <div class="trip-title">
          ${escapeHtml(
            title
          )}
        </div>

        ${dateMeta}
      </div>
    </section>

    <div class="days">
      ${daySections}
    </div>

    <footer class="footer">
      <span>
        TravelWish ·
        ${escapeHtml(
          destination
        )}
      </span>

      <span>
        ${escapeHtml(
          createdLabel
        )}
      </span>
    </footer>
  </main>
</body>
</html>`;
}
