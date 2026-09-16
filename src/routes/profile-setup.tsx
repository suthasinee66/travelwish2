
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
    <div className="profile-page relative min-h-screen overflow-hidden text-[#302b43]">

      {/* Aurora background */}
      <div className="profile-aurora profile-aurora-1" />
      <div className="profile-aurora profile-aurora-2" />
      <div className="profile-aurora profile-aurora-3" />
      <div className="profile-aurora profile-aurora-4" />

      {/* Header */}
      <header className="profile-header sticky top-0 z-50">

        <div className="profile-header-inner">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="profile-logo">
              <Compass className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#302b43]">
                TravelWise
              </h2>

              <p className="text-[10px] font-medium tracking-[0.16em] uppercase text-[#8b7894]">
                Your journey
              </p>
            </div>
          </div>

          {/* User icon */}
          <div className="profile-user">
            <User className="h-[18px] w-[18px]" />
          </div>

        </div>

      </header>

      {/* Main */}
      <main className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-5 py-12 sm:px-8 lg:py-16">

        <div className="w-full max-w-[560px]">

          {/* Progress */}
          <div className="mb-6 flex items-center justify-center gap-2">

            <div className="profile-progress profile-progress-active">
              1
            </div>

            <div className="profile-progress-line" />

            <div className="profile-progress">
              2
            </div>


          </div>

          {/* Card */}
          <div className="profile-card">

            {/* Icon */}
            <div className="flex justify-center">
              <div className="profile-title-icon">
                <ClipboardPenLine className="h-7 w-7" />
              </div>
            </div>

            {/* Title */}
            <div className="mt-6 text-center">

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a56b99]">
                Tell us about you
              </p>

              <h1 className="text-[28px] font-extrabold tracking-tight text-[#302b43] sm:text-[32px]">
                ปรับแต่งการเดินทางของคุณ
              </h1>

              <p className="mx-auto mt-3 max-w-[430px] text-sm leading-7 text-[#71697d]">
                บอกข้อมูลเกี่ยวกับตัวคุณเล็กน้อย
                <br className="hidden sm:block" />
                เพื่อให้ AI สร้างแผนการเดินทางที่เหมาะกับคุณ
              </p>

            </div>

            {/* Form */}
            <form
              onSubmit={handleSave}
              className="mt-9 space-y-5"
            >

              {/* Name */}
              <div>

                <label
                  htmlFor="full_name"
                  className="profile-label"
                >
                  ชื่อ - นามสกุล
                </label>

                <div className="profile-input-wrapper">

                  <Badge className="profile-input-icon" />

                  <input
                    id="full_name"
                    type="text"
                    placeholder="เช่น สมชาย ใจดี"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="profile-input"
                  />

                </div>

              </div>

              {/* Age + Gender */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* Age */}
                <div>

                  <label
                    htmlFor="age"
                    className="profile-label"
                  >
                    อายุ
                  </label>

                  <div className="profile-input-wrapper">

                    <CalendarDays className="profile-input-icon" />

                    <input
                      id="age"
                      type="number"
                      min="1"
                      max="120"
                      placeholder="เช่น 25"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="profile-input"
                    />

                  </div>

                </div>

                {/* Gender */}
                <div>

                  <label
                    htmlFor="gender"
                    className="profile-label"
                  >
                    เพศ
                  </label>

                  <div className="profile-input-wrapper">

                    <VenusAndMars className="profile-input-icon" />

                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="profile-input profile-select"
                    >
                      <option value="">เลือกเพศ</option>
                      <option value="male">ชาย</option>
                      <option value="female">หญิง</option>
                      <option value="non-binary">
                        ไม่ระบุเพศ
                      </option>
                      <option value="prefer-not-to-say">
                        ไม่ต้องการระบุ
                      </option>
                    </select>

                  </div>

                </div>

              </div>

              {/* Submit */}
              <div className="pt-3">

                <button
                  type="submit"
                  disabled={saving}
                  className="profile-submit"
                >

                  <span>
                    {saving
                      ? "กำลังบันทึก..."
                      : "บันทึกและดำเนินการต่อ"}
                  </span>

                  {!saving && (
                    <span className="profile-submit-icon">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}

                </button>

              </div>

              {/* Privacy note */}
              <div className="flex items-center justify-center gap-2 pt-1 text-xs text-[#8b8391]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b89bcb]" />
                ข้อมูลของคุณจะใช้เพื่อปรับแต่งคำแนะนำการเดินทาง
              </div>

            </form>

          </div>

          {/* Bottom text */}
          <p className="mt-6 text-center text-xs text-[#918899]">
            Step 1 of 3 · Personal information
          </p>

        </div>

      </main>

    </div>
  );
}
