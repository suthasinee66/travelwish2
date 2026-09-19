import { createPlanner } from "./planner";
import {
    generateWithSelectedModel,
    type AIModel
} from "./ai";





/* ==========================
   Types
========================== */

export interface TripInfo {

  province:string | null;

  days:number | null;

  budget:number | null;

  companion:string | null;

  travelType:string[];

  activities:string[];

  atmosphere:string | null;

}


export interface ChatResult {

  reply:string;

  completed:boolean;

  tripInfo:TripInfo;

}

export interface TripIntentResult {
  wantsTrip: boolean;
  tripInfo: TripInfo;
}



/* ==========================
   Memory
========================== */


let currentTrip:TripInfo = {

  province:null,

  days:null,

  budget:null,

  companion:null,

  travelType:[],

  activities:[],

  atmosphere:null

};



export function resetTrip(){

 currentTrip={

  province:null,

  days:null,

  budget:null,

  companion:null,

  travelType:[],

  activities:[],

  atmosphere:null

 };

}



/* ==========================
   Extract User Data
========================== */

function extractTripInfoFast(message:string){

const text = message.toLowerCase();


const data:any = {
 province:null,
 days:null,
 budget:null,
 companion:null,
 travelType:[],
 activities:[],
 atmosphere:null
};



// จังหวัด

const provinces=[
"เชียงใหม่",
"เชียงราย",
"กรุงเทพมหานคร",
"ภูเก็ต",
"กระบี่",
"พังงา",
"ชลบุรี",
"กาญจนบุรี"
];


for(const p of provinces){

 if(text.includes(p)){
   data.province=p;
   break;
 }

}


// วัน

const day =
text.match(/(\d+)\s*วัน/);


if(day){
 data.days=Number(day[1]);
}


// งบ

const money =
text.match(/(\d[\d,]*)\s*(บาท|฿)?/);


if(money){

 data.budget=
 Number(
  money[1].replace(",","")
 );

}


// คนไปด้วย


if(
 text.includes("แฟน") ||
 text.includes("คู่รัก")
){

 data.companion="คู่รัก";

}


else if(text.includes("เพื่อน")){

 data.companion="เพื่อน";

}


else if(text.includes("ครอบครัว")){

 data.companion="ครอบครัว";

}


else if(text.includes("คนเดียว")){

 data.companion="คนเดียว";

}



// ประเภท

const types=[
"ทะเล",
"ภูเขา",
"ธรรมชาติ",
"คาเฟ่",
"วัฒนธรรม",
"เมือง"
];


data.travelType =
types.filter(t=>text.includes(t));




// activity

const acts=[
"ถ่ายรูป",
"เดินป่า",
"อาหาร",
"ช้อปปิ้ง",
"พักผ่อน"
];


data.activities =
acts.filter(a=>text.includes(a));



return data;

}



/* ==========================
   Update Memory
========================== */
async function updateTrip(
  message: string,
  selectedModel: AIModel = "gemini"
) {

  // 1. ดึงข้อมูลด้วย Regex ก่อน
  let data = extractTripInfoFast(message);

  console.log("⚡ FAST:", data);

  // 2. ถ้าข้อมูลยังไม่ครบ ใช้ Gemini ช่วย
  if (needAI(data)) {

    try {

      const aiData = await extractTripInfo(
  message,
  selectedModel
);

      console.log("🤖 AI EXTRACT:", aiData);

      data = {

        province: data.province ?? aiData.province,
        days: data.days ?? aiData.days,
        budget: data.budget ?? aiData.budget,
        companion: data.companion ?? aiData.companion,
        travelType:
          data.travelType.length > 0
            ? data.travelType
            : aiData.travelType ?? [],
        activities:
          data.activities.length > 0
            ? data.activities
            : aiData.activities ?? [],
        atmosphere:
          data.atmosphere ?? aiData.atmosphere

      };

    } catch (err) {

      console.log("AI parse failed", err);

    }

  }

  if (data.province)
    currentTrip.province = data.province;

  if (data.days)
    currentTrip.days = data.days;

  if (data.budget)
    currentTrip.budget = data.budget;

  if (data.companion)
    currentTrip.companion = data.companion;

  if (data.travelType.length)
    currentTrip.travelType = data.travelType;

  if (data.activities.length)
    currentTrip.activities = data.activities;

  if (data.atmosphere)
    currentTrip.atmosphere = data.atmosphere;

  console.log("📦 CURRENT:", currentTrip);

}

/* ==========================
   Check Complete
========================== */
function canCreatePlanner() {
  return Boolean(currentTrip.province);
}



/* ==========================
   Question
========================== */


/* ==========================
   Main Chat
========================== */
export async function chatWithAI(
  message: string,
  messages?: any[],
  preferences?: any,
  attraction?: any[],
  tripInput?: any,
  selectedModel: AIModel = "gemini",
  chatId?: string,
  userId?: string
): Promise<ChatResult> {

if (tripInput) {

    if (tripInput.province)
        currentTrip.province = tripInput.province;

    if (tripInput.days)
        currentTrip.days = tripInput.days;

    if (tripInput.budget)
        currentTrip.budget = tripInput.budget;

    if (tripInput.companion)
        currentTrip.companion = tripInput.companion;

    if (tripInput.travelType?.length)
        currentTrip.travelType = tripInput.travelType;

    if (tripInput.activities?.length)
        currentTrip.activities = tripInput.activities;

    if (tripInput.atmosphere)
        currentTrip.atmosphere = tripInput.atmosphere;
}


await updateTrip(
  message,
  selectedModel
);

if (!canCreatePlanner()) {
  return {
    reply: "ได้เลยครับ ✨ อยากให้ผมจัดทริปไปจังหวัดไหน?",
    completed: false,
    tripInfo: { ...currentTrip }
  };
}

const tripForPlanner = {
  ...currentTrip,
  days: currentTrip.days ?? 1
};

const plan = await createPlanner(
  tripForPlanner as any,
  chatId ?? "",
  userId ?? "",
  selectedModel
);


return {
  reply: plan.markdown,
  completed: true,
  tripInfo: {
    ...tripForPlanner
  }
};



}

/* ==========================
   Detect Trip Intent
========================== */

export async function detectTripIntent(
  message: string,
  selectedModel: AIModel = "gemini"
): Promise<TripIntentResult> {

  const prompt = `
วิเคราะห์ข้อความของผู้ใช้สำหรับระบบ TravelWish

ข้อความ:
"${message}"

ให้ตรวจสอบ 2 อย่าง

1. ผู้ใช้มีความตั้งใจให้ระบบ "สร้าง/จัด/วางแผนทริป" หรือไม่
2. มีข้อมูลเกี่ยวกับทริปอะไรอยู่ในข้อความบ้าง

ให้ wantsTrip = true เมื่อผู้ใช้มีเจตนาต้องการให้ช่วยสร้างหรือวางแผนการเดินทาง เช่น

- จัดทริปเชียงใหม่ให้หน่อย
- ช่วยแพลนเที่ยวภูเก็ต
- อยากไปเชียงใหม่ 3 วัน ช่วยวางแผนให้หน่อย
- มีงบ 5000 อยากเที่ยวเชียงราย 2 วัน
- สุดสัปดาห์นี้อยากพาแฟนไปเที่ยวกระบี่
- ช่วยคิดทริปทะเลกับเพื่อนหน่อย
- อยากเที่ยวธรรมชาติ 3 วัน
- ไปเชียงใหม่กับแฟน 3 วัน งบหมื่นนึง
- วางแผนเที่ยวให้หน่อย

ให้ wantsTrip = false ถ้าเป็นเพียงการถามข้อมูลทั่วไป เช่น

- สวัสดี
- เชียงใหม่น่าเที่ยวไหม
- ภูเก็ตมีอะไรน่าเที่ยว
- ร้านอาหารเชียงใหม่มีอะไรบ้าง
- เดือนธันวาคมเชียงใหม่หนาวไหม
- ไปเชียงใหม่ควรใช้งบเท่าไหร่

กฎการแปลงข้อมูล:

- หมื่น = 10000
- สองหมื่น = 20000
- ห้าพัน = 5000
- วันเดียว = 1
- สองวัน = 2
- สามวัน = 3
- สุดสัปดาห์ = 2
- สุดสัปดาห์หน้า = 2
- แฟน = คู่รัก
- เมีย = คู่รัก
- ภรรยา = คู่รัก
- ลูก = ครอบครัว
- ไปกับพ่อแม่ = ครอบครัว
- ไปกับเพื่อน = เพื่อน
- ไปคนเดียว = คนเดียว

travelType ตัวอย่าง:
ทะเล
ภูเขา
ธรรมชาติ
คาเฟ่
วัฒนธรรม
เมือง

activities ตัวอย่าง:
ถ่ายรูป
เดินป่า
อาหาร
ช้อปปิ้ง
พักผ่อน

ตอบ JSON เท่านั้น ห้ามมี Markdown

{
  "wantsTrip": false,
  "tripInfo": {
    "province": null,
    "days": null,
    "budget": null,
    "companion": null,
    "travelType": [],
    "activities": [],
    "atmosphere": null
  }
}
`;

  try {

    const raw = await generateAIText(
      selectedModel,
      prompt
    );

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const result = JSON.parse(cleaned);

    return {
      wantsTrip: result.wantsTrip === true,

      tripInfo: {
        province:
          result.tripInfo?.province ?? null,

        days:
          result.tripInfo?.days ?? null,

        budget:
          result.tripInfo?.budget ?? null,

        companion:
          result.tripInfo?.companion ?? null,

        travelType:
          Array.isArray(result.tripInfo?.travelType)
            ? result.tripInfo.travelType
            : [],

        activities:
          Array.isArray(result.tripInfo?.activities)
            ? result.tripInfo.activities
            : [],

        atmosphere:
          result.tripInfo?.atmosphere ?? null
      }
    };

  } catch (error) {

    console.error(
      "❌ Detect trip intent failed:",
      error
    );

    return {
      wantsTrip: false,

      tripInfo: {
        province: null,
        days: null,
        budget: null,
        companion: null,
        travelType: [],
        activities: [],
        atmosphere: null
      }
    };
  }
}


/* ==========================
   Planner Confirmation Intent
========================== */

export type PlannerDecision =
  | "CREATE_PLAN"
  | "CANCEL"
  | "UPDATE"
  | "UNCLEAR";
export async function detectPlannerDecision(
  message: string
): Promise<PlannerDecision> {

  const normalizedMessage =
    message
      .trim()
      .toLowerCase();


  // =====================================================
  // 1. คำตอบที่ชัดเจนมาก
  // ไม่ต้องเสีย API call และไม่เสี่ยง AI ตีความผิด
  // =====================================================

  const createWords = [
    "ใช่",
    "ใช่ครับ",
    "ใช่ค่ะ",
    "โอเค",
    "ok",
    "okay",
    "ได้",
    "ได้เลย",
    "เอาเลย",
    "เอาดิ",
    "จัดเลย",
    "จัดมา",
    "ตามนั้น",
    "เริ่มเลย",
    "สร้างเลย",
    "ตกลง",
    "yes",
    "sure"
  ];

  if (
    createWords.includes(
      normalizedMessage
    )
  ) {
    console.log(
      "🧠 PLANNER DECISION: CREATE_PLAN (FAST)"
    );

    return "CREATE_PLAN";
  }


  // =====================================================
  // 2. ปฏิเสธชัดเจน
  // =====================================================

  const cancelWords = [
    "ไม่",
    "ไม่เอา",
    "ไม่ต้อง",
    "ยังไม่",
    "ไว้ก่อน",
    "ยกเลิก",
    "เดี๋ยวก่อน",
    "no"
  ];

  if (
    cancelWords.includes(
      normalizedMessage
    )
  ) {
    console.log(
      "🧠 PLANNER DECISION: CANCEL (FAST)"
    );

    return "CANCEL";
  }


  // =====================================================
  // 3. ข้อความอื่นที่ซับซ้อน
  // ให้ AI เป็นคนวิเคราะห์
  //
  // เช่น
  // "โอเค แต่ขอเป็น 3 วัน"
  // "ได้ แต่เปลี่ยนเป็นเชียงราย"
  // =====================================================

  try {

    const rawResult =
      await generateAIText(
        "gemini",
        `
คุณเป็น Intent Router ของระบบ TravelWish

วิเคราะห์ข้อความของผู้ใช้ว่า
ต้องการทำอะไรกับแผนการเดินทาง

ตอบได้เพียง:

CREATE_PLAN
CANCEL
UPDATE
UNCLEAR


CREATE_PLAN
= ยืนยันให้สร้างแผนทันที


CANCEL
= ไม่ต้องการสร้างแผน


UPDATE
= ต้องการแก้ข้อมูลก่อนสร้างแผน

ตัวอย่าง:

"ขอ 3 วัน"
→ UPDATE

"เปลี่ยนเป็นเชียงราย"
→ UPDATE

"งบ 5000"
→ UPDATE

"ไปกับแฟน"
→ UPDATE

"เพิ่มคาเฟ่ด้วย"
→ UPDATE

"โอเค แต่ขอเป็น 3 วัน"
→ UPDATE

"ได้ แต่เปลี่ยนเป็นเชียงราย"
→ UPDATE


UNCLEAR
= ไม่เกี่ยวข้องหรือไม่สามารถระบุได้


ข้อความผู้ใช้:

"${message}"


ตอบเพียงคำเดียวเท่านั้น

ห้าม JSON
ห้าม Markdown
ห้ามอธิบาย
        `.trim()
      );


    console.log(
      "🤖 PLANNER DECISION RAW:",
      rawResult
    );


    // =====================================================
    // 4. Normalize AI response
    // =====================================================

    let text =
      String(rawResult ?? "")
        .trim()
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();


    // รองรับกรณี API คืน:
    // {"reply":"UPDATE"}
    try {

      const parsed =
        JSON.parse(text);

      if (
        parsed &&
        typeof parsed.reply === "string"
      ) {
        text =
          parsed.reply.trim();
      }

    } catch {
      // ไม่ใช่ JSON
    }


    const decision =
      text
        .trim()
        .toUpperCase();


    console.log(
      "🧠 PLANNER DECISION AI:",
      decision
    );


    // =====================================================
    // 5. คืน Action
    // =====================================================

    if (
      decision.includes(
        "CREATE_PLAN"
      )
    ) {
      return "CREATE_PLAN";
    }


    if (
      decision.includes(
        "CANCEL"
      )
    ) {
      return "CANCEL";
    }


    if (
      decision.includes(
        "UPDATE"
      )
    ) {
      return "UPDATE";
    }


    return "UNCLEAR";


  } catch (error) {

    console.error(
      "❌ Planner decision failed:",
      error
    );

    return "UNCLEAR";

  }
}


/* ==========================
   General AI Chat
========================== */

export async function generalChatWithAI(
  message: string,
  messages: any[] = [],
  selectedModel: AIModel = "gemini"
): Promise<string> {

  // เอาประวัติแชทล่าสุดไปให้ AI เพื่อให้คุยต่อเนื่องได้
  const history = messages
    .slice(-10)
    .map((m: any) => {
      const role =
        m.role === "user"
          ? "ผู้ใช้"
          : "AI";

      const content =
        typeof m.text === "string"
          ? m.text
          : m.text?.markdown ?? "";

      return `${role}: ${content}`;
    })
    .join("\n");

  const prompt = `
คุณคือ TravelWish AI ผู้ช่วยด้านการท่องเที่ยว

ตอบคำถามของผู้ใช้อย่างเป็นธรรมชาติ
สามารถพูดคุยทั่วไปและตอบคำถามเกี่ยวกับการท่องเที่ยวได้

กฎ:
- ตอบตามภาษาที่ผู้ใช้ใช้
- ถ้าผู้ใช้ถามภาษาไทย ให้ตอบภาษาไทย
- ไม่ต้องบังคับให้ผู้ใช้กรอกข้อมูลทริป
- ไม่ต้องถามจังหวัด จำนวนวัน งบประมาณ หรือผู้ร่วมเดินทาง
  เว้นแต่จำเป็นต่อคำถาม
- ถ้าผู้ใช้แค่ทักทาย ให้ทักทายกลับตามปกติ
- ถ้าผู้ใช้ถามเรื่องสถานที่ อาหาร การเดินทาง หรือการท่องเที่ยว
  ให้ตอบคำถามโดยตรง
- อย่าสร้าง JSON
- อย่าตอบว่า "ข้อมูลทริปยังไม่ครบ"

ประวัติการสนทนา:
${history || "ยังไม่มีประวัติการสนทนา"}

ข้อความล่าสุดของผู้ใช้:
"${message}"

ตอบผู้ใช้:
`;

  return await generateAIText(
    selectedModel,
    prompt
  );
}

async function extractTripInfo(
  message: string,
  selectedModel: AIModel = "gemini"
) {
const text = await generateAIText(
  selectedModel,
  `
อ่านข้อความของผู้ใช้

"${message}"

แยกข้อมูลการท่องเที่ยว

กฎ

- "หมื่น" = 10000
- "สองหมื่น" = 20000
- "ห้าพัน" = 5000
- "สุดสัปดาห์หน้า" = 2 วัน
- "วันเดียว" = 1 วัน
- "สองคืน" = 2 วัน
- "สามคืน" = 3 วัน
- "แฟน" = "คู่รัก"
- "เมีย" = "คู่รัก"
- "ภรรยา" = "คู่รัก"
- "ลูก" = "ครอบครัว"

ตอบ JSON เท่านั้น

{
  "province": null,
  "days": null,
  "budget": null,
  "companion": null,
  "travelType": [],
  "activities": [],
  "atmosphere": null
}
`
);


return JSON.parse(
text
.replace(/```json/g,"")
.replace(/```/g,"")
.trim()
);


}
function needAI(data: any) {

  return  (
    data.province == null ||
    data.days == null ||
    data.budget == null ||
    data.companion == null ||
    !data.travelType ||
    data.travelType.length === 0
  );

}
async function generateAIText(
    model: AIModel,
    prompt: string
): Promise<string> {

    return generateWithSelectedModel(
        model,
        prompt
    );

}



