export const THAI_PROVINCES = [
  "กรุงเทพมหานคร",
  "กระบี่",
  "กาญจนบุรี",
  "กาฬสินธุ์",
  "กำแพงเพชร",
  "ขอนแก่น",
  "จันทบุรี",
  "ฉะเชิงเทรา",
  "ชลบุรี",
  "ชัยนาท",
  "ชัยภูมิ",
  "ชุมพร",
  "เชียงราย",
  "เชียงใหม่",
  "ตรัง",
  "ตราด",
  "ตาก",
  "นครนายก",
  "นครปฐม",
  "นครพนม",
  "นครราชสีมา",
  "นครศรีธรรมราช",
  "นครสวรรค์",
  "นนทบุรี",
  "นราธิวาส",
  "น่าน",
  "บึงกาฬ",
  "บุรีรัมย์",
  "ปทุมธานี",
  "ประจวบคีรีขันธ์",
  "ปราจีนบุรี",
  "ปัตตานี",
  "พระนครศรีอยุธยา",
  "พะเยา",
  "พังงา",
  "พัทลุง",
  "พิจิตร",
  "พิษณุโลก",
  "เพชรบุรี",
  "เพชรบูรณ์",
  "แพร่",
  "ภูเก็ต",
  "มหาสารคาม",
  "มุกดาหาร",
  "แม่ฮ่องสอน",
  "ยโสธร",
  "ยะลา",
  "ร้อยเอ็ด",
  "ระนอง",
  "ระยอง",
  "ราชบุรี",
  "ลพบุรี",
  "ลำปาง",
  "ลำพูน",
  "เลย",
  "ศรีสะเกษ",
  "สกลนคร",
  "สงขลา",
  "สตูล",
  "สมุทรปราการ",
  "สมุทรสงคราม",
  "สมุทรสาคร",
  "สระแก้ว",
  "สระบุรี",
  "สิงห์บุรี",
  "สุโขทัย",
  "สุพรรณบุรี",
  "สุราษฎร์ธานี",
  "สุรินทร์",
  "หนองคาย",
  "หนองบัวลำภู",
  "อ่างทอง",
  "อำนาจเจริญ",
  "อุดรธานี",
  "อุตรดิตถ์",
  "อุทัยธานี",
  "อุบลราชธานี",
] as const;

const PROVINCE_ALIASES: Record<string, string[]> = {
  กรุงเทพมหานคร: [
    "กรุงเทพ",
    "กรุงเทพฯ",
    "กทม",
    "กทม.",
    "บางกอก",
    "bangkok",
    "bkk",
  ],
  นครราชสีมา: [
    "โคราช",
  ],
  พระนครศรีอยุธยา: [
    "อยุธยา",
  ],
  ประจวบคีรีขันธ์: [
    "ประจวบ",
  ],
  สุราษฎร์ธานี: [
    "สุราษฎร์",
  ],
  นครศรีธรรมราช: [
    "นครศรี",
  ],
  อุบลราชธานี: [
    "อุบล",
  ],
  อุดรธานี: [
    "อุดร",
  ],
  สมุทรปราการ: [
    "ปากน้ำ",
  ],
};

function normalizeComparable(
  value: string
) {
  return String(value || "")
    .toLowerCase()
    .replace(/^จังหวัด/u, "")
    .replace(/[ฯ.-_/(),]/g, "")
    .replace(/s+/g, "")
    .trim();
}

function levenshtein(
  a: string,
  b: string
) {
  const rows =
    a.length + 1;

  const cols =
    b.length + 1;

  const matrix =
    Array.from(
      {
        length: rows,
      },
      () =>
        new Array<number>(
          cols
        ).fill(0)
    );

  for (
    let i = 0;
    i < rows;
    i += 1
  ) {
    matrix[i][0] = i;
  }

  for (
    let j = 0;
    j < cols;
    j += 1
  ) {
    matrix[0][j] = j;
  }

  for (
    let i = 1;
    i < rows;
    i += 1
  ) {
    for (
      let j = 1;
      j < cols;
      j += 1
    ) {
      const cost =
        a[i - 1] ===
        b[j - 1]
          ? 0
          : 1;

      matrix[i][j] =
        Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] +
            cost
        );
    }
  }

  return matrix[
    rows - 1
  ][
    cols - 1
  ];
}

function typoThreshold(
  value: string
) {
  const length =
    value.length;

  if (length <= 4) {
    return 1;
  }

  if (length <= 8) {
    return 2;
  }

  return 3;
}

const CANDIDATES =
  THAI_PROVINCES.flatMap(
    province => {
      const aliases =
        PROVINCE_ALIASES[
          province
        ] ?? [];

      return [
        province,
        ...aliases,
      ].map(label => ({
        province,
        label:
          normalizeComparable(
            label
          ),
      }));
    }
  );

export function normalizeProvinceInput(
  input:
    | string
    | null
    | undefined
): string | null {
  if (!input) {
    return null;
  }

  const normalized =
    normalizeComparable(
      input
    );

  if (!normalized) {
    return null;
  }

  const exact =
    CANDIDATES.find(
      candidate =>
        candidate.label ===
        normalized
    );

  if (exact) {
    return exact.province;
  }

  const scored =
    CANDIDATES
      .map(candidate => ({
        ...candidate,
        distance:
          levenshtein(
            normalized,
            candidate.label
          ),
      }))
      .sort(
        (a, b) =>
          a.distance -
          b.distance
      );

  const best =
    scored[0];

  const second =
    scored.find(
      candidate =>
        candidate.province !==
        best?.province
    );

  if (!best) {
    return null;
  }

  const allowed =
    typoThreshold(
      best.label
    );

  if (
    best.distance >
    allowed
  ) {
    return null;
  }

  if (
    second &&
    second.distance ===
      best.distance
  ) {
    return null;
  }

  return best.province;
}

export function detectProvinceInText(
  text:
    | string
    | null
    | undefined
): string | null {
  if (!text) {
    return null;
  }

  const normalizedText =
    normalizeComparable(
      text
    );

  if (!normalizedText) {
    return null;
  }

  const directMatches =
    CANDIDATES
      .filter(candidate =>
        normalizedText.includes(
          candidate.label
        )
      )
      .sort(
        (a, b) =>
          b.label.length -
          a.label.length
      );

  if (
    directMatches.length >
    0
  ) {
    return directMatches[0]
      .province;
  }

  let best:
    | {
        province: string;
        distance: number;
        labelLength: number;
      }
    | null = null;

  let tied =
    false;

  for (
    const candidate
    of CANDIDATES
  ) {
    const target =
      candidate.label;

    if (
      target.length < 3
    ) {
      continue;
    }

    const allowed =
      typoThreshold(
        target
      );

    const minLength =
      Math.max(
        2,
        target.length - 1
      );

    const maxLength =
      Math.min(
        normalizedText.length,
        target.length + 1
      );

    for (
      let length =
        minLength;
      length <=
      maxLength;
      length += 1
    ) {
      for (
        let start = 0;
        start + length <=
        normalizedText.length;
        start += 1
      ) {
        const window =
          normalizedText.slice(
            start,
            start + length
          );

        const distance =
          levenshtein(
            window,
            target
          );

        if (
          distance >
          allowed
        ) {
          continue;
        }

        if (
          !best ||
          distance <
          best.distance
        ) {
          best = {
            province:
              candidate.province,
            distance,
            labelLength:
              target.length,
          };

          tied = false;
        } else if (
          best &&
          distance ===
            best.distance &&
          candidate.province !==
            best.province
        ) {
          tied = true;
        }
      }
    }
  }

  if (
    !best ||
    tied
  ) {
    return null;
  }

  return best.province;
}
