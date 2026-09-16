
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Compass,
  User,
  Badge,
  CalendarDays,
  VenusAndMars,
  ArrowRight,
  ClipboardPenLine,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/profile-setup")({
  component: ProfileSetup,
});

function ProfileSetup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error: userError } = await supabase.auth.getUser();
    const user = data.user;

    if (userError || !user) {
      alert("กรุณาเข้าสู่ระบบก่อน");
      return;
    }

    if (!name.trim() || !age || !gender) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("profile").upsert(
      {
        profile_id: user.id,
        name: name.trim(),
        age: Number(age),
        gender,
      },
      {
        onConflict: "profile_id",
      }
    );

    setSaving(false);

    if (error) {
      console.error("Profile error:", error);
      alert(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`);
      return;
    }

    navigate({
      to: "/personal-survey",
    });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased">

      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 lg:px-40 py-4 sticky top-0 z-50">

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center text-primary">
            <Compass className="h-8 w-8" />
          </div>

          <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
            TravelWise
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-full h-10 w-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <User className="h-5 w-5" />
          </div>
        </div>

      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-20">

        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 lg:p-12">

          {/* Title */}
          <div className="mb-10 text-center">

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
              <ClipboardPenLine className="h-8 w-8" />
            </div>

            <h1 className="text-slate-900 dark:text-white text-3xl font-extrabold tracking-tight mb-3">
              ปรับแต่งการเดินทางของคุณ
            </h1>

            <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
              บอกข้อมูลเกี่ยวกับตัวคุณเล็กน้อย
              เพื่อให้ AI ของเราสร้างแผนการเดินทางที่เหมาะกับคุณ
            </p>

          </div>

          {/* Form */}
          <form
            className="space-y-6"
            onSubmit={handleSave}
          >

            {/* Name */}
            <div className="flex flex-col gap-2">

              <label
                className="text-slate-700 dark:text-slate-300 text-sm font-semibold"
                htmlFor="full_name"
              >
                ชื่อ - นามสกุล
              </label>

              <div className="relative">

                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 pointer-events-none">
                  <Badge className="h-5 w-5" />
                </span>

                <input
                  id="full_name"
                  type="text"
                  placeholder="เช่น สมชาย ใจดี"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400"
                />

              </div>

            </div>

            {/* Age + Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Age */}
              <div className="flex flex-col gap-2">

                <label
                  className="text-slate-700 dark:text-slate-300 text-sm font-semibold"
                  htmlFor="age"
                >
                  อายุ
                </label>

                <div className="relative">

                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 pointer-events-none">
                    <CalendarDays className="h-5 w-5" />
                  </span>

                  <input
                    id="age"
                    type="number"
                    min="1"
                    max="120"
                    placeholder="เช่น 25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400"
                  />

                </div>

              </div>

              {/* Gender */}
              <div className="flex flex-col gap-2">

                <label
                  className="text-slate-700 dark:text-slate-300 text-sm font-semibold"
                  htmlFor="gender"
                >
                  เพศ
                </label>

                <div className="relative">

                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 pointer-events-none">
                    <VenusAndMars className="h-5 w-5" />
                  </span>

                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="block w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-primary focus:border-primary transition-all appearance-none"
                  >
                    <option value="">เลือกเพศ</option>
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                    <option value="non-binary">ไม่ระบุเพศ</option>
                    <option value="prefer-not-to-say">
                      ไม่ต้องการระบุ
                    </option>
                  </select>

                </div>

              </div>

            </div>

            {/* Submit */}
            <div className="pt-4">

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                <span>
                  {saving
                    ? "กำลังบันทึก..."
                    : "บันทึกและดำเนินการต่อ"}
                </span>

                {!saving && (
                  <ArrowRight className="h-5 w-5" />
                )}
              </button>

            </div>

          </form>

        </div>

      </main>

      {/* Bottom decoration */}
      <div className="h-24 w-full opacity-10 pointer-events-none overflow-hidden flex items-end">
        <div className="flex-1 h-full bg-gradient-to-t from-primary to-transparent" />
      </div>

    </div>
  );
}
