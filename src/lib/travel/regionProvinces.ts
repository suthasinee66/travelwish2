/** Region/province membership from the TravelWish attraction table (Supabase). */
export const REGION_PROVINCES: Record<string, string[]> = {
  "ภาคกลาง": [
    "กรุงเทพมหานคร",
    "กำแพงเพชร",
    "ชัยนาท",
    "นครนายก",
    "นครปฐม",
    "นครสวรรค์",
    "นนทบุรี",
    "ปทุมธานี",
    "พระนครศรีอยุธยา",
    "พิจิตร",
    "พิษณุโลก",
    "เพชรบูรณ์",
    "ลพบุรี",
    "สมุทรปราการ",
    "สมุทรสงคราม",
    "สมุทรสาคร",
    "สระบุรี",
    "สิงห์บุรี",
    "สุโขทัย",
    "สุพรรณบุรี",
    "อ่างทอง",
    "อุทัยธานี"
  ],
  "ภาคตะวันตก": [
    "กาญจนบุรี",
    "ตาก",
    "ประจวบคีรีขันธ์",
    "เพชรบุรี",
    "ราชบุรี"
  ],
  "ภาคตะวันออก": [
    "จันทบุรี",
    "ฉะเชิงเทรา",
    "ชลบุรี",
    "ตราด",
    "ปราจีนบุรี",
    "ระยอง",
    "สระแก้ว"
  ],
  "ภาคตะวันออกเฉียงเหนือ": [
    "กาฬสินธุ์",
    "ขอนแก่น",
    "ชัยภูมิ",
    "นครพนม",
    "นครราชสีมา",
    "บึงกาฬ",
    "บุรีรัมย์",
    "มหาสารคาม",
    "มุกดาหาร",
    "ยโสธร",
    "ร้อยเอ็ด",
    "เลย",
    "ศรีสะเกษ",
    "สกลนคร",
    "สุรินทร์",
    "หนองคาย",
    "หนองบัวลำภู",
    "อำนาจเจริญ",
    "อุดรธานี",
    "อุบลราชธานี"
  ],
  "ภาคใต้": [
    "กระบี่",
    "ชุมพร",
    "ตรัง",
    "นครศรีธรรมราช",
    "นราธิวาส",
    "ปัตตานี",
    "พังงา",
    "พัทลุง",
    "ภูเก็ต",
    "ยะลา",
    "ระนอง",
    "สงขลา",
    "สตูล",
    "สุราษฎร์ธานี"
  ],
  "ภาคเหนือ": [
    "เชียงราย",
    "เชียงใหม่",
    "น่าน",
    "พะเยา",
    "แพร่",
    "แม่ฮ่องสอน",
    "ลำปาง",
    "ลำพูน",
    "อุตรดิตถ์"
  ]
};

export function getRegionOfProvince(province: string | null | undefined): string | null {
  if (!province) return null;
  return Object.keys(REGION_PROVINCES).find(region =>
    REGION_PROVINCES[region].includes(province.trim())
  ) ?? null;
}

export function detectRegionInText(text: string): string | null {
  // Longest names first so "ภาคตะวันออกเฉียงเหนือ" never matches "ภาคตะวันออก".
  const regionNames = Object.keys(REGION_PROVINCES).sort((a, b) => b.length - a.length);
  const direct = regionNames.find(region => text.includes(region));
  if (direct) return direct;
  if (/(?:เที่ยว|ไป|แถบ|โซน|ภาค)\s*(?:อีสาน|ภาคอีสาน)/.test(text)) return "ภาคตะวันออกเฉียงเหนือ";
  return null;
}

/** Safe membership check; regions must never be placed in province. */
export function isValidProvince(province: string): boolean {
  return getRegionOfProvince(province) !== null;
}
