import { Star, ArrowRight } from "lucide-react";
import type { Destination } from "@/data/destinations";

interface DestinationCardProps {
  destination: Destination;
}

const DestinationCard = ({ destination }: DestinationCardProps) => {
  return (
    <div
      className="
        group
        overflow-hidden
        rounded-[28px]
        bg-white/65
        backdrop-blur-xl
        border border-white/80
        shadow-[0_12px_35px_rgba(87,61,99,0.10)]
        transition-all
        duration-300
        hover:-translate-y-2
        hover:shadow-[0_20px_45px_rgba(87,61,99,0.16)]
      "
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={destination.image}
          alt={`${destination.name}, ${destination.country}`}
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-700
            group-hover:scale-110
          "
        />

        {/* Image overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#302b43]/30 via-transparent to-transparent" />

        {/* Rating */}
        <div
          className="
            absolute
            top-4
            right-4
            flex
            items-center
            gap-1.5
            rounded-full
            bg-white/85
            backdrop-blur-md
            px-3
            py-1.5
            shadow-sm
          "
        >
          <Star className="h-4 w-4 fill-[#f0b84b] text-[#f0b84b]" />

          <span className="text-sm font-bold text-[#302b43]">
            {destination.rating}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-[#302b43]">
          {destination.name}
        </h3>

        <p className="mt-1 text-sm font-medium text-[#6f687e]">
          {destination.country}
        </p>

        <p className="mt-3 mb-5 line-clamp-2 text-sm leading-relaxed text-[#6f687e]">
          {destination.description}
        </p>

        <button
          className="
            group/button
            inline-flex
            items-center
            gap-1.5
            text-sm
            font-bold
            text-[#7c5a8f]
            transition-colors
            hover:text-[#573d63]
          "
        >
          View Details

          <ArrowRight
            className="
              h-4
              w-4
              transition-transform
              duration-200
              group-hover/button:translate-x-1
            "
          />
        </button>
      </div>
    </div>
  );
};

export default DestinationCard;