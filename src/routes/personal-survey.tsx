import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Compass } from "lucide-react";
export const Route = createFileRoute("/personal-survey")({
  component: PersonalSurvey,
});

function PersonalSurvey() {
  const navigate = useNavigate();

  const [travelTypes, setTravelTypes] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [preferredRegion, setPreferredRegion] = useState<string[]>([]);

  const [atmosphere, setAtmosphere] = useState("");
  const [travelCompanion, setTravelCompanion] = useState("");
  const [budget, setBudget] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [travelGoal, setTravelGoal] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleItem = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(value)) {
      setList(list.filter((v) => v !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleSubmit = async () => {

    if (
      travelTypes.length === 0 ||
      activities.length === 0 ||
      preferredRegion.length === 0 ||
      !atmosphere ||
      !travelCompanion ||
      !budget ||
      !travelTime ||
      !travelGoal
    ) {
      alert("กรุณากรอกข้อมูลให้ครบทุกหัวข้อ");
      return;
    }

    const { data, error: userError } =
      await supabase.auth.getUser();

    const profileId = data?.user?.id;

    if (userError || !profileId) {
      alert("กรุณา login ก่อน");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          profile_id: profileId,
          travel_type: travelTypes,
          activities: activities,
          atmosphere,
          travel_companion: travelCompanion,
          budget,
          travel_time: travelTime,
          preferred_region: preferredRegion,
          travel_goal: travelGoal,
        },
        {
          onConflict: "profile_id",
        }
      );

    setSaving(false);

    if (error) {
      console.error("Preference error:", error);
      alert(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`);
      return;
    }

    navigate({
      to: "/home",
    });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">

      <header className="border-b border-primary/10 bg-white/80 backdrop-blur px-6 py-4 flex justify-between items-center">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
  <Compass className="h-6 w-6" />
</div>

          <h1 className="text-xl font-bold">
            TravelWise
          </h1>

        </div>

      </header>

      <main className="flex justify-center py-10 px-6">

        <div className="max-w-[800px] w-full space-y-10">

          <div className="space-y-2">

            <h2 className="text-4xl font-extrabold">
              บอกสไตล์การท่องเที่ยวของคุณ
            </h2>

            <p className="text-gray-500">
              เราจะใช้ข้อมูลนี้เพื่อแนะนำสถานที่ที่เหมาะกับคุณ
            </p>

          </div>

          {/* Travel Type */}
          <section className="bg-white rounded-xl border border-primary/10 p-6 shadow-sm">

            <h3 className="text-xl font-bold mb-6">
              ประเภทการท่องเที่ยว
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

              {[
                "ภูเขา",
                "ทะเล",
                "วัฒนธรรม",
                "คาเฟ่",
                "ธรรมชาติ",
                "เมือง",
              ].map((type) => (

                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    toggleItem(
                      type,
                      travelTypes,
                      setTravelTypes
                    )
                  }
                  className={`cursor-pointer flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition ${
                    travelTypes.includes(type)
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 hover:border-primary/50"
                  }`}
                >
                  <span className="text-sm font-semibold">
                    {type}
                  </span>
                </button>

              ))}

            </div>

          </section>

          {/* Activities */}
          <section className="bg-white rounded-xl border border-primary/10 p-6 shadow-sm">

            <h3 className="text-xl font-bold mb-6">
              กิจกรรมที่ชอบ
            </h3>

            <div className="flex flex-wrap gap-3">

              {[
                "ถ่ายรูป",
                "เดินป่า",
                "อาหาร",
                "ช้อปปิ้ง",
                "พักผ่อน",
              ].map((activity) => (

                <button
                  key={activity}
                  type="button"
                  onClick={() =>
                    toggleItem(
                      activity,
                      activities,
                      setActivities
                    )
                  }
                  className={`px-4 py-2 rounded-full border transition ${
                    activities.includes(activity)
                      ? "bg-primary text-white border-primary"
                      : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                  }`}
                >
                  {activity}
                </button>

              ))}

            </div>

          </section>

          {/* Region */}
          <section className="bg-white rounded-xl border border-primary/10 p-6 shadow-sm">

            <h3 className="text-xl font-bold mb-6">
              ภูมิภาคที่อยากไป
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              {[
                "เหนือ",
                "กลาง",
                "ใต้",
                "อีสาน",
              ].map((region) => (

                <button
                  key={region}
                  type="button"
                  onClick={() =>
                    toggleItem(
                      region,
                      preferredRegion,
                      setPreferredRegion
                    )
                  }
                  className={`py-3 rounded-lg border transition ${
                    preferredRegion.includes(region)
                      ? "bg-primary text-white"
                      : "hover:bg-primary/10"
                  }`}
                >
                  {region}
                </button>

              ))}

            </div>

          </section>

          {/* Details */}
          <section className="bg-white rounded-xl border border-primary/10 p-6 shadow-sm grid md:grid-cols-2 gap-6">

            <div>

              <label className="font-semibold">
                บรรยากาศ
              </label>

              <select
                value={atmosphere}
                onChange={(e) =>
                  setAtmosphere(e.target.value)
                }
                className="w-full mt-2 border border-primary/20 rounded-lg p-3"
              >
                <option value="">เลือก</option>
                <option value="คึกคัก">คึกคัก</option>
                <option value="เงียบสงบ">เงียบสงบ</option>
                <option value="ผจญภัย">ผจญภัย</option>
                <option value="หรูหรา">หรูหรา</option>
              </select>

            </div>

            <div>

              <label className="font-semibold">
                เดินทางกับใคร
              </label>

              <select
                value={travelCompanion}
                onChange={(e) =>
                  setTravelCompanion(e.target.value)
                }
                className="w-full mt-2 border border-primary/20 rounded-lg p-3"
              >
                <option value="">เลือก</option>
                <option value="คนเดียว">คนเดียว</option>
                <option value="คู่รัก">คู่รัก</option>
                <option value="ครอบครัว">ครอบครัว</option>
                <option value="เพื่อน">เพื่อน</option>
              </select>

            </div>

            <div>

              <label className="font-semibold">
                เป้าหมายการเดินทาง
              </label>

              <select
                value={travelGoal}
                onChange={(e) =>
                  setTravelGoal(e.target.value)
                }
                className="w-full mt-2 border border-primary/20 rounded-lg p-3"
              >
                <option value="">เลือก</option>
                <option value="พักผ่อน">พักผ่อน</option>
                <option value="ผจญภัย">ผจญภัย</option>
                <option value="วัฒนธรรม">วัฒนธรรม</option>
                <option value="ความบันเทิง">ความบันเทิง</option>
              </select>

            </div>

            <div>

              <label className="font-semibold">
                งบประมาณ
              </label>

              <div className="flex mt-2 border rounded-lg overflow-hidden">

                {[
                  { label: "ประหยัด", value: "ประหยัด" },
                  { label: "ปานกลาง", value: "ปานกลาง" },
                  { label: "หรูหรา", value: "หรูหรา" },
                ].map((item) => (

                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setBudget(item.value)}
                    className={`flex-1 py-2 ${
                      budget === item.value
                        ? "bg-primary text-white"
                        : "hover:bg-primary/10"
                    }`}
                  >
                    {item.label}
                  </button>

                ))}

              </div>

            </div>

          </section>

          {/* Travel Time */}
          <section className="bg-white rounded-xl border border-primary/10 p-6 shadow-sm">

            <h3 className="text-xl font-bold mb-4">
              ช่วงเวลาเดินทาง
            </h3>

            <div className="grid grid-cols-3 gap-3">

              {[
                "ฤดูร้อน",
                "ฤดูฝน",
                "ฤดูหนาว",
              ].map((time) => (

                <button
                  key={time}
                  type="button"
                  onClick={() => setTravelTime(time)}
                  className={`py-3 border rounded-lg ${
                    travelTime === time
                      ? "bg-primary text-white"
                      : "hover:bg-primary/10"
                  }`}
                >
                  {time}
                </button>

              ))}

            </div>

          </section>

          {/* Submit */}
          <div className="flex justify-end">

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-12 py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:scale-105 disabled:opacity-50 transition"
            >
              {saving
                ? "กำลังบันทึก..."
                : "บันทึกข้อมูล"}
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}