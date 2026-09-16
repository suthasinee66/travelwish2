import { Sparkles } from "lucide-react";
import DestinationCard from "./DestinationCard";
import type { Destination } from "@/data/destinations";

interface RecommendationSectionProps {
  recommendations: Destination[];
  visible: boolean;
}

const RecommendationSection = ({
  recommendations,
  visible,
}: RecommendationSectionProps) => {
  if (!visible) return null;

  return (
    <section
      className="
        relative
        overflow-hidden
        bg-[#faf7ff]
        py-20
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          left-1/3
          top-0
          h-64
          w-64
          rounded-full
          bg-[#e9a8c9]/15
          blur-3xl
        "
      />

      <div className="relative z-10 container mx-auto px-4">
        <div className="mb-12 text-center">
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
            Recommended For You
          </h2>

          <p
            className="
              mx-auto
              mt-3
              max-w-lg
              text-[#6f687e]
            "
          >
            Based on your interests, we think you'll love these
            destinations.
          </p>
        </div>

        {recommendations.length === 0 ? (
          <div
            className="
              mx-auto
              max-w-xl
              rounded-[28px]
              border
              border-white/80
              bg-white/60
              p-10
              text-center
              shadow-sm
              backdrop-blur-xl
            "
          >
            <p className="text-[#6f687e]">
              No matching destinations found.
            </p>

            <p className="mt-1 text-sm text-[#8b8498]">
              Try selecting different interests!
            </p>
          </div>
        ) : (
          <div
            className="
              grid
              grid-cols-1
              gap-7
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {recommendations.map((dest) => (
              <DestinationCard
                key={dest.id}
                destination={dest}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendationSection;