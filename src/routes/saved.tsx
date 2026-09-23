import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Heart,
  MapPin,
  Star,
  FolderHeart,
  ArrowRight,
  MoreHorizontal,
  Trash2,
  Share2,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PlaceDetailDrawer, { type PlaceDetailTarget } from "@/components/PlaceDetailDrawer";
import { supabase } from "@/lib/supabase";
import { useTravelStore } from "@/store/travelStore";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved — Mindtrip" },
      {
        name: "description",
        content: "Your saved places, trips, and travel ideas in one place.",
      },
      { property: "og:title", content: "Saved — Mindtrip" },
      {
        property: "og:description",
        content: "Your saved places, trips, and travel ideas in one place.",
      },
    ],
  }),
  component: Saved,
});



const recentTrips = [
  { title: "Trip to Bangkok", stops: 9, img: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80" },
  { title: "Chiang Mai Slow Escape", stops: 6, img: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80" },
];
function Saved() {
const {
  user,
  recommend,
  allPlaces,
  explorePlaces,
  nearbyPlaces,
  setUser,
  setRecommend,
  setExplorePlaces,
  setNearbyPlaces,
} = useTravelStore();

  const [loading,setLoading] = useState(true);
  const [placeDetailTarget, setPlaceDetailTarget] =
    useState<PlaceDetailTarget | null>(null);

  const {
  savedItems,
  setSavedItems:setStoreSavedItems
}=useTravelStore();

  const safeSavedItems = Array.isArray(savedItems)
    ? savedItems.filter(Boolean)
    : [];

  const collections =
  [
    {
      name:"All saved",
      count:safeSavedItems.length
    },


    {
      name:"Want to go",
      count:
      safeSavedItems.filter(
        x=>x.collection==="Want to go"
      ).length
    },


    {
      name:"Food & drink",
      count:
      safeSavedItems.filter(
        x=>x.collection==="Food & drink"
      ).length
    },


    {
      name:"Hotels",
      count:
      safeSavedItems.filter(
        x=>x.collection==="Hotels"
      ).length
    },


  ];



  useEffect(()=>{

    loadSaved();

    loadUser();

  },[]);
async function loadSaved(){

 setLoading(true);


 const {
   data:auth
 } = await supabase.auth.getUser();


 if(!auth.user){
   setLoading(false);
   return;
 }


 const {
 data,
 error
} = await supabase
.from("saved_places")
.select(`
  id,
  collection,
  created_at,

  attraction(
    att_id,
    name_th,
    name_en,
    detail_th,
    detail_en,
    province,
    district,
    subdistrict,
    latitude,
    longitude,
    category,
    type,
    suitable_duration,
    tel,
    website,
    facebook,
    images
  )
`)
.eq(
 "profile_id",
 auth.user.id
)
.order(
 "created_at",
 {
  ascending:false
 }
);



 if(error){

   console.error(error);

 }else{


   const rows =
     Array.isArray(data)
       ? data
       : [];

   const formatted =
     rows
       .filter(Boolean)
       .map((item:any) => {
         const attraction =
           Array.isArray(item?.attraction)
             ? item.attraction[0]
             : item?.attraction;

         const province =
           attraction?.province ||
           "";

         return {
           id:
             item?.id ??
             `saved-${attraction?.att_id ?? Math.random()}`,

           att_id:
             attraction?.att_id ?? null,

           raw:
             attraction ?? null,

           title:
             attraction?.name_th ||
             attraction?.name_en ||
             "Saved place",

           place:
             province
               ? `${province}, Thailand`
               : "Thailand",

           tag:
             item?.collection ||
             "Saved",

           collection:
             item?.collection ||
             "Saved",

           img:
             (
               Array.isArray(attraction?.images)
                 ? attraction.images[0]
                 : null
             ) ||
             "https://images.unsplash.com/photo-1501785888041-af3ef285b470",

           rating:
             attraction?.rating ??
             null,
         };
       });


   // update Zustand
   setStoreSavedItems(formatted);

 }


 setLoading(false);

}



  async function loadUser(){

    const {data} =
      await supabase.auth.getUser();

    setUser(data.user);

  }

  async function removeSaved(id:number){

  const {
    data:userData
  } = await supabase.auth.getUser();


  if(!userData.user) return;


  const { error } = await supabase
    .from("saved_places")
    .delete()
    .eq("id", id);


  if(error){
    console.error(error);
    return;
  }


  // update zustand ทันที
  setStoreSavedItems(
    safeSavedItems.filter(
      item => item.id !== id
    )
  );

}

  return (
    <>
      <PlaceDetailDrawer
        open={Boolean(placeDetailTarget)}
        target={placeDetailTarget}
        onClose={() => setPlaceDetailTarget(null)}
      />
    <div className="travel-home flex h-screen text-foreground aurora-canvas">
      <Sidebar user={user}/>

      <main className="travel-main flex-1 overflow-y-auto min-w-0">
        <header className="travel-header h-16 flex items-center gap-4 px-8 sticky top-0 z-10">
          <h1 className="text-sm font-semibold tracking-wide text-[#49334f]">Saved</h1>
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search saved places"
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-full bg-secondary outline-none"
              />
            </div>
          </div>
          <button className="text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-accent">
            <FolderHeart className="h-4 w-4" /> New collection
          </button>
        </header>

        <div className="px-8 py-7 max-w-5xl mx-auto">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a2779f]">Your travel library</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#49334f]">Places worth remembering</h2>
            <p className="mt-1 text-sm text-[#806f88]">Keep your favorite discoveries close for the next adventure.</p>
          </div>
          {/* Collection chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-6 scrollbar-hide">
            {collections.map((c, i) => (
              <button
                key={c.name}
                className={`shrink-0 text-sm rounded-full px-4 py-1.5 transition ${
                  i === 0
                    ? "bg-foreground text-background"
                    : "bg-secondary text-foreground hover:bg-accent"
                }`}
              >
                {c.name} <span className="opacity-70 ml-1">{c.count}</span>
              </button>
            ))}
            
          </div>

          {/* Saved grid */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold tracking-tight">
                All saved <span className="text-muted-foreground font-normal">({safeSavedItems.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Share2 className="h-4 w-4" /> Share
                </button>
                <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
              {safeSavedItems.map((s) => (
                <article
                  key={s.id}
                  onClick={() =>
                    setPlaceDetailTarget({
                      type: "attraction",
                      data:
                        s.raw ?? {
                          att_id: s.att_id,
                          name_th: s.title,
                          province: s.place,
                          images: s.img ? [s.img] : [],
                        },
                    })
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      setPlaceDetailTarget({
                        type: "attraction",
                        data:
                          s.raw ?? {
                            att_id: s.att_id,
                            name_th: s.title,
                            province: s.place,
                            images: s.img ? [s.img] : [],
                          },
                      });
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="glass-surface rounded-2xl overflow-hidden cursor-pointer group hover-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-[#573d63] focus-visible:ring-offset-2"
                >
                  <div className="relative h-24 overflow-hidden sm:h-32 md:h-36">
                    <img
                      src={s?.img || "https://images.unsplash.com/photo-1501785888041-af3ef285b470"}
                      alt={s?.title || "Saved place"}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src =
                          "https://images.unsplash.com/photo-1501785888041-af3ef285b470";
                      }}
                      className="h-full w-full object-cover group-hover:scale-105 transition"
                    />
                    <button
                      onClick={(event) => event.stopPropagation()}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 text-rose-500 flex items-center justify-center hover:bg-white"
                    >
                      <Heart className="h-3.5 w-3.5 fill-current" />
                    </button>
                    <span className="absolute bottom-2 left-2 text-[9px] sm:text-[11px] rounded-full bg-black/60 text-white px-2 py-0.5">
                      {s?.tag || "Saved"}
                    </span>
                  </div>
                  <div className="p-2 sm:p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="truncate text-sm font-semibold leading-tight sm:text-base">{s?.title || "Saved place"}</h3>
                        <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {s?.place || "Thailand"}
                        </div>
                      </div>
                      {s?.rating != null && (
                        <div className="text-[10px] sm:text-xs font-medium flex items-center gap-0.5 shrink-0">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {s.rating}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between sm:mt-3">
                      <span className="max-w-[78%] truncate text-[10px] sm:text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                        {s?.collection || "Saved"}
                      </span>
                      <button
  onClick={(e)=>{

    e.stopPropagation();

    removeSaved(s.id);

  }}
  className="
  text-muted-foreground
  hover:text-red-500
  transition
  "
>
  <Trash2 className="h-3.5 w-3.5" />
</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Right panel */}
      <aside className="w-[340px] shrink-0 border-l border-border overflow-y-auto p-5 hidden xl:block">
        <section className="rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <FolderHeart className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Your collections</h3>
          </div>
          <div className="space-y-1">
            {collections.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent cursor-pointer"
              >
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.count}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 w-full text-sm font-medium border border-border rounded-full py-2 flex items-center justify-center gap-1 hover:bg-accent">
            <Plus className="h-4 w-4" /> Create collection
          </button>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Saved in trips</h3>
            <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              See all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentTrips.map((t) => (
              <div
                key={t.title}
                className="flex items-center gap-3 p-2 rounded-2xl border border-border hover:bg-accent cursor-pointer transition"
              >
                <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0">
                  <img src={t.img} alt={t.title} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.stops} stops</div>
                </div>
                <button className="text-muted-foreground hover:text-foreground px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl overflow-hidden relative p-4 text-sm text-white"
          style={{
            background: "linear-gradient(135deg, oklch(0.75 0.15 320), oklch(0.7 0.18 260))",
          }}
        >
          <div className="font-semibold">Share your favorites</div>
          <div className="font-bold text-base mt-1">Invite friends to collaborate</div>
          <div className="text-xs mt-1 opacity-90">Build shared wishlists and plan trips together.</div>
          <button className="mt-3 text-xs bg-white text-foreground rounded-full px-3 py-1.5 font-medium">
            Invite friends
          </button>
        </section>
      </aside>
    </div>
    </>
  );
}