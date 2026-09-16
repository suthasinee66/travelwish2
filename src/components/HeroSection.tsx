import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-travel.jpg";

interface HeroSectionProps {
  onStartExploring: () => void;
}

const HeroSection = ({ onStartExploring }: HeroSectionProps) => {
  return (
    <section
      id="home"
      className="
        relative
        flex
        min-h-[92vh]
        items-center
        justify-center
        overflow-hidden
      "
    >
      {/* Hero image */}
      <img
        src={heroImg}
        alt="Beautiful tropical beach destination"
        className="
          absolute
          inset-0
          h-full
          w-full
          object-cover
        "
      />

      {/* Soft overlay */}
      <div
        className="
          absolute
          inset-0
          bg-gradient-to-b
          from-[#302b43]/35
          via-[#302b43]/20
          to-[#302b43]/45
        "
      />

      {/* Aurora glow */}
      <div
        className="
          absolute
          -left-20
          top-20
          h-72
          w-72
          rounded-full
          bg-[#e9a8c9]/30
          blur-3xl
        "
      />

      <div
        className="
          absolute
          -right-20
          bottom-10
          h-80
          w-80
          rounded-full
          bg-[#a9dce8]/25
          blur-3xl
        "
      />

      {/* Content */}
      <div
        className="
          relative
          z-10
          mx-auto
          max-w-4xl
          px-5
          text-center
        "
      >
        {/* Badge */}
        <div
          className="
            mx-auto
            mb-6
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-white/50
            bg-white/20
            px-4
            py-2
            text-sm
            font-semibold
            text-white
            shadow-lg
            backdrop-blur-md
          "
        >
          <Sparkles className="h-4 w-4" />
          Personalized travel planning
        </div>

        <h1
          className="
            text-4xl
            font-extrabold
            leading-tight
            tracking-tight
            text-white
            drop-shadow-lg
            sm:text-5xl
            md:text-6xl
          "
        >
          Find Your Perfect
          <br />
          <span className="text-[#fff7d6]">
            Travel Destination
          </span>
        </h1>

        <p
          className="
            mx-auto
            mt-6
            max-w-2xl
            text-base
            leading-relaxed
            text-white/85
            sm:text-lg
            md:text-xl
          "
        >
          Get personalized travel recommendations based on your
          interests, preferences, and travel style.
        </p>

        <div className="mt-9 flex justify-center">
          <Link
            to="/login"
            onClick={onStartExploring}
            className="
              group
              inline-flex
              items-center
              gap-2
              rounded-full
              bg-white
              px-7
              py-3.5
              font-bold
              text-[#573d63]
              shadow-[0_12px_30px_rgba(48,43,67,0.20)]
              transition-all
              duration-300
              hover:-translate-y-1
              hover:bg-[#fff7d6]
              hover:shadow-[0_16px_35px_rgba(48,43,67,0.25)]
            "
          >
            Start Exploring

            <ArrowRight
              className="
                h-5
                w-5
                transition-transform
                duration-200
                group-hover:translate-x-1
              "
            />
          </Link>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="
          absolute
          bottom-0
          left-0
          right-0
          h-24
          bg-gradient-to-t
          from-[#faf7ff]
          to-transparent
        "
      />
    </section>
  );
};

export default HeroSection;