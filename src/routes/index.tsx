import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PreferenceSection from "@/components/PreferenceSection";
import RecommendationSection from "@/components/RecommendationSection";
import PopularSection from "@/components/PopularSection";
import TravelTipsSection from "@/components/TravelTipsSection";
import Footer from "@/components/Footer";
import { destinations, type Interest } from "@/data/destinations";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [filteredDestinations, setFilteredDestinations] = useState(destinations);

  const preferenceRef = useRef<HTMLDivElement>(null);
  const recommendationRef = useRef<HTMLDivElement>(null);

  const toggleInterest = useCallback((interest: Interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
    setShowRecommendations(false);
  }, []);

  const getRecommendations = useCallback(() => {
    const filtered = destinations.filter((dest) =>
      dest.tags.some((tag) => selectedInterests.includes(tag))
    );

    filtered.sort((a, b) => {
      const aMatches = a.tags.filter((t) =>
        selectedInterests.includes(t)
      ).length;

      const bMatches = b.tags.filter((t) =>
        selectedInterests.includes(t)
      ).length;

      return bMatches - aMatches;
    });

    setFilteredDestinations(filtered);
    setShowRecommendations(true);

    setTimeout(() => {
      recommendationRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  }, [selectedInterests]);

  const handleStartExploring = () => {
    preferenceRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    const filtered = destinations.filter(
      (d) =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.country.toLowerCase().includes(query.toLowerCase())
    );

    setFilteredDestinations(filtered);
    setShowRecommendations(true);

    setTimeout(() => {
      recommendationRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-28 size-96 rounded-full bg-[var(--aurora-pink)]/35 blur-3xl" />
        <div className="absolute right-[-10rem] top-1/3 size-[30rem] rounded-full bg-[var(--aurora-blue)]/35 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 size-[28rem] rounded-full bg-[var(--aurora-lavender)]/25 blur-3xl" />
      </div>
      <div className="relative z-10">
        <Navbar onSearch={handleSearch} />

      <HeroSection onStartExploring={handleStartExploring} />

      <div ref={preferenceRef}>
        <PreferenceSection
          selected={selectedInterests}
          onToggle={toggleInterest}
          onGetRecommendations={getRecommendations}
        />
      </div>

      <div ref={recommendationRef}>
        <RecommendationSection
          recommendations={filteredDestinations}
          visible={showRecommendations}
        />
      </div>

      <PopularSection destinations={destinations} />

      <TravelTipsSection />

        <Footer />
      </div>
    </main>
  );
}
