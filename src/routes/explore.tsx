import { createFileRoute } from "@tanstack/react-router";
import { getRecommendations } from "@/lib/recommend/getRecommendations";
import {
  Search,
  MapPin,
  Star,
  TrendingUp,
  Compass,
  SlidersHorizontal,
  ArrowRight,
  Heart,
  Plus,
} from "lucide-react";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { Link } from "@tanstack/react-router";
import { useTravelStore } from "@/store/travelStore";
import { loadNearbyPlaces } from "@/lib/travel/loadNearbyPlaces";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Mindtrip" },
      {
        name: "description",
        content: "Discover destinations, hidden gems, and travel inspiration curated for you.",
      },
      { property: "og:title", content: "Explore — Mindtrip" },
      {
        property: "og:description",
        content: "Discover destinations, hidden gems, and travel inspiration curated for you.",
      },
    ],
  }),
  component: Explore,
});

const categories = [
  "All",
  "Cities",
  "Beaches",
  "Mountains",
  "Food & Drink",
  "Culture",
  "Adventure",
  "Wellness",
];


function Explore() {
  const {
 user,
 recommend,
 allPlaces,
 explorePlaces,
 nearbyPlaces,
 savedIds,
 setSavedIds,
 setRecommend,
 setExplorePlaces,
 setNearbyPlaces,
} = useTravelStore();

const [loading,setLoading] = useState(true);
const [imageIndex,setImageIndex] = useState<Record<string,number>>({});


useEffect(()=>{

if(!explorePlaces.length){
  loadData();
}

},[]);

useEffect(()=>{

async function loadSaved(){

 const {
  data:userData
 } = await supabase.auth.getUser();


 if(!userData.user) return;



 const {
  data
 } = await supabase
 .from("saved_places")
 .select("att_id")
 .eq(
  "profile_id",
  userData.user.id
 );



 setSavedIds(
  data?.map(
    x=>x.att_id
  ) || []
 );


}


loadSaved();


},[]);

async function loadData(){

setLoading(true);


if(explorePlaces.length){

  setLoading(false);
  return;

}


const {
 data:userData
}=await supabase.auth.getUser();


if(!userData.user){
 setLoading(false);
 return;
}





const {
 data:pref
}=await supabase
.from("user_preferences")
.select("*")
.eq(
 "profile_id",
 userData.user.id
)
.single();



const rec =
await getRecommendations(pref);



setRecommend(
 rec.slice(0,8)
);


setExplorePlaces(
 rec
);


const nearby = await loadNearbyPlaces();

setNearbyPlaces(nearby);


setNearbyPlaces(
  nearby
);



setLoading(false);

}

function changeImage(
  id:string,
  direction:"next"|"prev",
  length:number
){

  setImageIndex((prev)=>{

    const current = prev[id] || 0;

    let next = current;

    if(direction==="next"){
      next = (current + 1) % length;
    }

    if(direction==="prev"){
      next = (current - 1 + length) % length;
    }


    return {
      ...prev,
      [id]:next
    };

  });

}

const handleSave = async(place:any)=>{

const {
 data:userData
}=await supabase.auth.getUser();


if(!userData.user) return;



const isSaved =
savedIds.includes(place.att_id);



if(isSaved){


 await supabase
 .from("saved_places")
 .delete()
 .eq(
   "profile_id",
   userData.user.id
 )
 .eq(
   "att_id",
   place.att_id
 );



 setSavedIds(
   savedIds.filter(
    id=>id!==place.att_id
   )
 );


 return;

}



const {
error
}=await supabase
.from("saved_places")
.insert({

 profile_id:userData.user.id,

 att_id:place.att_id,

 collection:"Want to go"

});



if(!error){

 setSavedIds([
   ...savedIds,
   place.att_id
 ]);

}


};

  return (
    <div className="travel-home flex min-h-[100dvh] md:h-screen text-foreground aurora-canvas">
      <Sidebar user={user}/>

      <main className="travel-main flex-1 overflow-y-auto min-w-0 pb-20 md:pb-0">
        <header className="travel-header h-16 flex items-center gap-4 px-8 sticky top-0 z-10">
          <h1 className="text-sm font-semibold tracking-wide text-[#49334f]">Explore</h1>
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search places, guides, or experiences"
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-full bg-secondary outline-none"
              />
            </div>
          </div>
          <button className="text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-accent">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-6xl">
          {/* Hero */}
          <section className="rounded-3xl overflow-hidden relative aspect-[21/9] sm:aspect-[3/1] mb-8">
            <img
              src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&q=80"
              alt="Mountain lake at sunrise"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-10 text-white">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/20 backdrop-blur rounded-full px-3 py-1 w-fit mb-3">
                <Compass className="h-3.5 w-3.5" /> Curated for you
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Discover your next adventure</h2>
              <p className="text-sm sm:text-base opacity-90 mt-2 max-w-md">
                Explore top-rated destinations, local experiences, and hidden gems around the world.
              </p>
            </div>
          </section>

          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map((c, i) => (
              <button
                key={c}
                className={`shrink-0 text-sm rounded-full px-4 py-1.5 transition ${
                  i === 0
                    ? "bg-foreground text-background"
                    : "bg-secondary text-foreground hover:bg-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Recommended */}
          <section className="mt-6">

<div className="flex justify-between mb-4">

<h2 className="text-lg font-semibold">
Recommend for you
</h2>
<Link
  to="/explore_recommend_all"
  search={{
    type:"recommend",
  }}
  onClick={()=>{
    console.log(
      "CLICK SEE ALL",
      explorePlaces.length
    );
  }}
>
 See all
</Link>

</div>

<div
  className="
    flex
    gap-4
    overflow-x-auto
    pb-2
    snap-x
    snap-mandatory
    scrollbar-hide
  "
>
  {recommend.map((place) => (
    <article
      key={place.att_id}
      className="glass-surface w-72 shrink-0 snap-start rounded-3xl overflow-hidden cursor-pointer group hover-lift"
    >
      <div className="
relative
h-52
overflow-hidden
">

<img
  src={
    place.images?.[
      imageIndex[place.att_id] || 0
    ]
    || place.image
  }
  className="
  absolute
  inset-0
  h-full
  w-full
  object-cover
  "
/>


{/* Save Heart มุมบนซ้าย */}
<button
onClick={(e)=>{

 e.stopPropagation();

 handleSave(place);

}}
className={`
absolute
z-20
top-3
left-3
w-9
h-9
rounded-full
backdrop-blur
flex
items-center
justify-center
transition

${
 savedIds.includes(place.att_id)
 ?
 "bg-white"
 :
 "bg-black/40"
}

`}
>

<Heart

size={18}

className={
 savedIds.includes(place.att_id)
 ?
 "text-rose-500 fill-rose-500"
 :
 "text-white"
}

/>

</button>



{/* Add มุมบนขวา */}
<button
  onClick={(e)=>{
    e.stopPropagation();
    console.log("add trip", place.att_id);
  }}
  className="
  absolute
  z-20
  top-3
  right-3
  w-9
  h-9
  rounded-full
  bg-black/40
  backdrop-blur
  text-white
  flex
  items-center
  justify-center
  hover:bg-black/70
  "
>
  <Plus 
    size={18}
    strokeWidth={2.5}
  />
</button>



{/* ปุ่มเลื่อนรูป */}
{
place.images?.length > 1 && (
<>
<button
onClick={(e)=>{
 e.stopPropagation();

 changeImage(
  place.att_id,
  "prev",
  place.images.length
 );
}}
className="
absolute
z-20
left-2
top-1/2
-translate-y-1/2
bg-black/40
text-white
rounded-full
w-8
h-8
flex
items-center
justify-center
hover:bg-black/70
"
>
‹
</button>


<button
onClick={(e)=>{
 e.stopPropagation();

 changeImage(
  place.att_id,
  "next",
  place.images.length
 );
}}
className="
absolute
z-20
right-2
top-1/2
-translate-y-1/2
bg-black/40
text-white
rounded-full
w-8
h-8
flex
items-center
justify-center
hover:bg-black/70
"
>
›
</button>


{/* แถบ slide อยู่ด้านล่างบนรูป */}
<div
className="
absolute
z-30
bottom-3
left-1/2
-translate-x-1/2
flex
gap-1
"
>

{
place.images.map((_:any,i:number)=>(
<div
key={i}
className={`
h-1.5
rounded-full
transition-all
${
(imageIndex[place.att_id] || 0) === i
?
"w-5 bg-white"
:
"w-1.5 bg-white/50"
}
`}
/>
))
}

</div>


</>
)
}



{/* gradient */}
<div
className="
absolute
inset-0
bg-gradient-to-t
from-black/60
via-transparent
"
/>


</div>


<div className="p-4">
  <h3 className="font-semibold line-clamp-2">
    {place.name_th}
  </h3>

        <div className="mt-1 flex items-center text-xs text-muted-foreground gap-1">
          <MapPin className="h-3 w-3" />
          {place.province}
        </div>
      </div>
    </article>
  ))}
</div>

</section>

          {/* Nearby places */}
          <section className="mt-10">


<div className="flex justify-between mb-4">

<h2 className="text-lg font-semibold">
Nearby places
</h2>


<Link
  to="/explore_nearby_all"
  search={{
    type: "nearby",
  }}
>
  See all
</Link>


</div>



<div
  className="
    flex
    gap-4
    overflow-x-auto
    pb-2
    snap-x
    snap-mandatory
    scrollbar-hide
  "
>


{
nearbyPlaces.map((f)=>(
<article
  key={f.att_id}
  className="
    w-72
    shrink-0
    snap-start
    rounded-2xl
    overflow-hidden
    border
    bg-card
    cursor-pointer
    group
  "
>


<div className="
relative
h-44
">
<button
  onClick={(e) => {
    e.stopPropagation();
    handleSave(f);
  }}
  className={`
absolute
z-20
top-3
left-3
w-9
h-9
rounded-full
backdrop-blur
flex
items-center
justify-center
transition
${
  savedIds.includes(f.att_id)
    ? "bg-white"
    : "bg-black/40"
}
`}
>
  <Heart
    size={18}
    className={
      savedIds.includes(f.att_id)
        ? "text-rose-500 fill-rose-500"
        : "text-white"
    }
  />
</button>
<button
  onClick={(e) => {
    e.stopPropagation();
    console.log("add trip", f.att_id);
  }}
  className="
absolute
z-20
top-3
right-3
w-9
h-9
rounded-full
bg-black/40
backdrop-blur
text-white
flex
items-center
justify-center
hover:bg-black/70
"
>
  <Plus
    size={18}
    strokeWidth={2.5}
  />
</button>
<img
  src={
    f.images?.[
      imageIndex[f.att_id] || 0
    ] ||
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470"
  }
  className="
  absolute
  inset-0
  w-full
  h-full
  object-cover
  transition
  "
/>
{
  f.images?.length > 1 && (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();

          changeImage(
            f.att_id,
            "prev",
            f.images.length
          );
        }}
        className="
        absolute
        z-20
        left-2
        top-1/2
        -translate-y-1/2
        bg-black/40
        text-white
        rounded-full
        w-8
        h-8
        flex
        items-center
        justify-center
        hover:bg-black/70
        "
      >
        ‹
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();

          changeImage(
            f.att_id,
            "next",
            f.images.length
          );
        }}
        className="
        absolute
        z-20
        right-2
        top-1/2
        -translate-y-1/2
        bg-black/40
        text-white
        rounded-full
        w-8
        h-8
        flex
        items-center
        justify-center
        hover:bg-black/70
        "
      >
        ›
      </button>

      {/* Dots */}
      <div
        className="
        absolute
        bottom-3
        left-1/2
        -translate-x-1/2
        flex
        gap-1
        z-30
        "
      >
        {f.images.map((_: any, i: number) => (
          <div
            key={i}
            className={`
              h-1.5
              rounded-full
              transition-all
              ${
                (imageIndex[f.att_id] || 0) === i
                  ? "w-5 bg-white"
                  : "w-1.5 bg-white/50"
              }
            `}
          />
        ))}
      </div>
    </>
  )
}


</div>



<div className="p-3">


<h3 className="font-semibold">

{f.name_th}

</h3>

<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
  <MapPin className="h-3 w-3" />
  {f.province} • {f.distance.toFixed(1)} km
</div>



</div>


</article>


))

}


</div>


</section>
        </div>
      </main>
    </div>
  );
}