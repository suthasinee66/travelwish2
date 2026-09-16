import { Sparkles } from "lucide-react";
import { interests, type Interest } from "@/data/destinations";

interface PreferenceSectionProps {
  selected: Interest[];
  onToggle: (interest: Interest) => void;
  onGetRecommendations: () => void;
}

const PreferenceSection = ({
  selected,
  onToggle,
  onGetRecommendations,
}: PreferenceSectionProps) => {
  return (
    <section
      id="recommendations"
      className="
        relative
        overflow-hidden
        bg-[#f3edf8]
        py-20
      "
    >
      {/* Aurora */}
      <div
        className="
          pointer-events-none
          absolute
          -left-20
          top-10
          h-64
          w-64
          rounded-full
          bg-[#c8a9d8]/30
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-20
          bottom-0
          h-72
          w-72
          rounded-full
          bg-[#a9dce8]/25
          blur-3xl
        "
      />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div
          className="
            mx-auto
            mb-5
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            bg-white/70
            shadow-sm
          "
        >
          <Sparkles className="h-5 w-5 text-[#7c5a8f]" />
        </div>

        <h2
          className="
            text-3xl
            font-extrabold
            tracking-tight
            text-[#302b43]
            md:text-4xl
          "
        >
          Tell Us What You Like
        </h2>

        <p
          className="
            mx-auto
            mb-10
            mt-3
            max-w-lg
            text-[#6f687e]
          "
        >
          Select your travel interests and we'll find destinations
          that match your style.
        </p>

        {/* Interests */}
        <div
          className="
            mx-auto
            mb-10
            flex
            max-w-3xl
            flex-wrap
            justify-center
            gap-3
          "
        >
          {interests.map((interest) => {
            const isSelected = selected.includes(interest.id);

            return (
              <button
                key={interest.id}
                onClick={() => onToggle(interest.id)}
                className={`
                  flex
                  items-center
                  gap-2
                  rounded-2xl
                  border
                  px-5
                  py-3
                  text-sm
                  font-bold
                  transition-all
                  duration-200
                  ${
                    isSelected
                      ? `
                        border-[#b89bcb]
                        bg-gradient-to-r
                        from-[#b89bcb]
                        to-[#e9a8c9]
                        text-white
                        shadow-lg
                        shadow-[#b89bcb]/20
                        -translate-y-0.5
                      `
                      : `
                        border-white/80
                        bg-white/60
                        text-[#514b65]
                        backdrop-blur-md
                        hover:-translate-y-0.5
                        hover:bg-white/85
                        hover:shadow-md
                      `
                  }
                `}
              >
                <span className="text-lg">
                  {interest.icon}
                </span>

                {interest.label}
              </button>
            );
          })}
        </div>

        {/* Button */}
        <button
          onClick={onGetRecommendations}
          disabled={selected.length === 0}
          className="
            rounded-full
            bg-[#302b43]
            px-8
            py-3.5
            text-base
            font-bold
            text-white
            shadow-lg
            shadow-[#302b43]/15
            transition-all
            duration-200
            hover:-translate-y-1
            hover:bg-[#573d63]
            disabled:cursor-not-allowed
            disabled:opacity-40
            disabled:hover:translate-y-0
          "
        >
          Get Recommendations
        </button>
      </div>
    </section>
  );
};

export default PreferenceSection;