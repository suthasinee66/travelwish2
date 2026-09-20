import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  MapPin,
  Search,
  SlidersHorizontal,
  Heart,
  Plus,
} from "lucide-react";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useTravelStore } from "@/store/travelStore";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/explore_nearby_all")({
  component: ExploreNearbyAll,
});

function ExploreNearbyAll() {
  const {
    user,
    nearbyPlaces,
    savedIds,
    setSavedIds,
  } = useTravelStore();

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadSaved();
  }, []);

  async function loadSaved() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return;

    const { data } = await supabase
      .from("saved_places")
      .select("att_id")
      .eq("profile_id", userData.user.id);

    setSavedIds(data?.map((x) => x.att_id) || []);
  }

  const handleSave = async (place: any) => {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return;

    const isSaved = savedIds.includes(place.att_id);

    if (isSaved) {
      await supabase
        .from("saved_places")
        .delete()
        .eq("profile_id", userData.user.id)
        .eq("att_id", place.att_id);

      setSavedIds(savedIds.filter((id) => id !== place.att_id));

      return;
    }

    const { error } = await supabase
      .from("saved_places")
      .insert({
        profile_id: userData.user.id,
        att_id: place.att_id,
        collection: "Want to go",
      });

    if (!error) {
      setSavedIds([...savedIds, place.att_id]);
    }
  };

  const filteredPlaces = nearbyPlaces.filter((place) =>
    place.name_th?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar user={user} />

      <main className="flex-1 overflow-y-auto px-8 py-8">
        {/* Header */}

        <div className="travel-list-header flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/explore"
              className="rounded-full p-2 hover:bg-accent"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <h1 className="text-2xl font-semibold">
                Nearby Places
              </h1>

              <p className="text-sm text-muted-foreground">
                {filteredPlaces.length} places nearby
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />

              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search nearby..."
                className="
                  pl-9
                  pr-4
                  py-2
                  rounded-full
                  border
                  bg-background
                  text-sm
                  outline-none
                  w-72
                "
              />
            </div>

            <button
              className="
                flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                border
                hover:bg-accent
                text-sm
              "
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>
        </div>

        {/* Cards */}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filteredPlaces.map((place) => (
            <article
              key={place.att_id}
              className="
                rounded-2xl
                overflow-hidden
                border
                bg-card
                group
                cursor-pointer
              "
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={
                    place.images?.[0] ||
                    "https://images.unsplash.com/photo-1501785888041-af3ef285b470"
                  }
                  alt={place.name_th}
                  className="
                    w-full
                    h-full
                    object-cover
                    group-hover:scale-105
                    transition
                  "
                />

                {/* Save */}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(place);
                  }}
                  className={`
                    absolute
                    top-3
                    left-3
                    z-20
                    w-9
                    h-9
                    rounded-full
                    backdrop-blur
                    flex
                    items-center
                    justify-center
                    ${
                      savedIds.includes(place.att_id)
                        ? "bg-white"
                        : "bg-black/40"
                    }
                  `}
                >
                  <Heart
                    size={18}
                    className={
                      savedIds.includes(place.att_id)
                        ? "fill-rose-500 text-rose-500"
                        : "text-white"
                    }
                  />
                </button>

                {/* Add Trip */}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("add trip", place.att_id);
                  }}
                  className="
                    absolute
                    top-3
                    right-3
                    z-20
                    w-9
                    h-9
                    rounded-full
                    bg-black/40
                    backdrop-blur
                    flex
                    items-center
                    justify-center
                    text-white
                    hover:bg-black/70
                  "
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="p-4">
                <h2 className="font-semibold line-clamp-2">
                  {place.name_th}
                </h2>

                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                  <MapPin size={14} />
                  {place.province} • {place.distance.toFixed(1)} km
                </div>

                {place.travel_type && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {place.travel_type.slice(0, 3).map((type: string) => (
                      <span
                        key={type}
                        className="
                          text-xs
                          px-2
                          py-1
                          rounded-full
                          bg-secondary
                        "
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
