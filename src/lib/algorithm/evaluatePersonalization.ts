/**
 * Profile personalization experiment for TravelWish.
 * Usage: npm run eval:personalization
 * Recomputes both rankings from the same Supabase attraction snapshot.
 * No AI outputs are used as recommendations and no results are fabricated.
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import {createClient} from "@supabase/supabase-js";
import {runWeightedProfileMatchingBaseline} from "./oldAlgorithm";
import {runTDMCAlgorithm} from "./tdmcAlgorithm";

const K=[5,10,15,20,25,30];
const weights={alpha:.2,beta:.3,gamma:.5};
const areas:Record<string,string>={bangkok:"กรุงเทพมหานคร",chiangmai:"เชียงใหม่",phuket:"ภูเก็ต"};
const dimensions=["travel_type","activities","atmosphere","budget","travel_companion"] as const;
const argv=process.argv.slice(2);
const opt=(k:string,f:string)=>{const i=argv.indexOf("--"+k);return i<0?f:(argv[i+1]||f);};
const runsDir=path.resolve(opt("runs","comparison/plan_runs"));
const outputDir=path.resolve(opt("out","comparison/personalization"));
const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in local .env");
const db=createClient(url,key);
const norm=(v:unknown)=>String(v??"").trim().normalize("NFC").toLocaleLowerCase();
const array=(x:unknown):unknown[]=>Array.isArray(x)?x:(x===null||x===undefined||x===""?[]:[x]);
const set=(x:unknown)=>new Set(array(x).map(norm).filter(Boolean));
function parseProfile(doc:any){
 const prompt:string=doc.models?.gemini?.rounds?.[0]?.prompt??
  doc.models?.gpt?.rounds?.[0]?.prompt??
  doc.models?.claude?.rounds?.[0]?.prompt??"";
 const start=prompt.indexOf('{\n  "profile":');
 if(start<0)throw Error("Saved JSON prompt lacks USER PROFILE");
 let level=0,str=false,esc=false,end=-1;
 for(let i=start;i<prompt.length;i++){
  const ch=prompt[i];
  if(str){if(esc)esc=false;else if(ch==="\\")esc=true;else if(ch==='"')str=false;}
  else if(ch==='"')str=true;else if(ch==="{")level++;
  else if(ch==="}"&&--level===0){end=i+1;break;}
 }
 if(end<0)throw Error("Incomplete USER PROFILE JSON");
 const obj=JSON.parse(prompt.slice(start,end)),p=obj.preferences,t=obj.currentTrip;
 if(!p||!t)throw Error("Missing preferences/currentTrip");
 const trip={province:t.province,travelType:array(p.travel_type),activities:array(p.activities),
  atmosphere:array(p.atmosphere),companion:p.travel_companion,budget:Number(t.budget)||0};
 // Keep declared preference labels; numeric trip budget is not a categorical preference.
 const declared:Record<string,Set<string>>={
  travel_type:set(p.travel_type),activities:set(p.activities),atmosphere:set(p.atmosphere),
  budget:set(p.budget),travel_companion:set(p.travel_companion)
 };
 return {trip,declared};
}
async function placesIn(province:string){
 const all:any[]=[];
 for(let from=0;;from+=1000){
  const {data,error}=await db.from("attraction").select(
   "att_id,name_th,province,latitude,longitude,travel_type,activities,atmosphere,budget,travel_companion,avg_rating,visitor_count,topic_vector")
   .eq("province",province).order("att_id").range(from,from+999);
  if(error)throw Error("Supabase: "+error.message);
  if(!data?.length)break;
  all.push(...data);
  if(data.length<1000)break;
 }
 return all.map(p=>({...p,att_id:String(p.att_id),rating:p.avg_rating,averageRating:p.avg_rating,
  visitorCount:p.visitor_count,visitors:p.visitor_count}));
}
function csv(rows:Record<string,unknown>[],headers:string[]){
 const q=(x:unknown)=>'"'+String(x??"").replace(/"/g,'""')+'"';
 return "\uFEFF"+[headers.map(q).join(","),...rows.map(r=>headers.map(h=>q(r[h])).join(","))].join("\r\n")+"\r\n";
}
const fmt=(v:number)=>Number.isFinite(v)?Number(v.toFixed(6)):"";
function coverage(chosen:any[],prefs:Record<string,Set<string>>){
 let total=0,covered=0,valid=0,macroSum=0,missing=0;
 const per:Record<string,unknown>={};
 for(const d of dimensions){
  const p=prefs[d],matched=new Set<string>();
  const available=chosen.filter(x=>set(x[d]).size>0).length;
  for(const place of chosen){
   for(const value of set(place[d]))if(p.has(value))matched.add(value);
  }
  const count=p.size,hit=matched.size;
  total+=count;covered+=hit;
  if(count){macroSum+=hit/count;valid++;}
  per[d+"_requested"]=count;per[d+"_covered"]=hit;
  per[d+"_rate"]=count?fmt(hit/count):"";
  per[d+"_matched_labels"]=[...matched].sort().join(" | ");
  per[d+"_tagged_places"]=available;
  if(count&&available===0)missing++;
 }
 return {micro:total?fmt(covered/total):"",macro:valid?fmt(macroSum/valid):"",
  requested:total,covered,valid_dimensions:valid,dimensions_without_place_tags:missing,...per};
}
const names=(await fs.readdir(runsDir)).filter(n=>/^travelwish_case\d+_(bangkok|chiangmai|phuket)(?:\(\d+\))?\.json$/i.test(n)).sort();
if(!names.length)throw Error("No experiment JSON logs found: "+runsDir);
const groupRuns=new Map<string,{caseId:number,province:string,profile:ReturnType<typeof parseProfile>}>();
for(const name of names){
 const m=name.match(/^travelwish_case(\d+)_(bangkok|chiangmai|phuket)/i)!;
 const caseId=Number(m[1]),province=areas[m[2].toLowerCase()];
 const doc=JSON.parse(await fs.readFile(path.join(runsDir,name),"utf8"));
 const profile=parseProfile(doc);
 if(profile.trip.province!==province)throw Error("Province mismatch: "+name);
 const id=caseId+"|"+province;
 if(groupRuns.has(id))throw Error("Duplicate log for profile/province: "+id+"; clean duplicate JSON logs");
 groupRuns.set(id,{caseId,province,profile});
}
const expected=new Set(Array.from({length:7},(_,i)=>i+1).flatMap(c=>Object.values(areas).map(p=>c+"|"+p)));
const missing=[...expected].filter(k=>!groupRuns.has(k));
if(missing.length)throw Error("Missing case/province logs: "+missing.join(", "));
const placeCache=new Map<string,any[]>();
const byGroup=new Map<string,Set<string>>();
const coverageRows:Record<string,unknown>[]=[];
for(const [g,{caseId,province,profile}] of groupRuns){
 if(!placeCache.has(province))placeCache.set(province,await placesIn(province));
 const places=placeCache.get(province)!;
 if(!places.length)throw Error("No attractions for "+province);
 for(const k of K){
  for(const {algorithm,chosen} of [
   {algorithm:"Weighted Profile-Matching Baseline",chosen:runWeightedProfileMatchingBaseline(places,profile.trip,k)},
   {algorithm:"TDMC-APD",chosen:runTDMCAlgorithm(places,profile.trip,k,weights)}
  ]){
   if(chosen.length!==k)throw Error(algorithm+" returned "+chosen.length+" for "+g+" K="+k);
   const ids=chosen.map((p:any)=>String(p.att_id??p.id));
   if(new Set(ids).size!==k)throw Error("Duplicate attraction ids: "+g+" "+algorithm+" K="+k);
   byGroup.set([province,algorithm,k,caseId].join("|"),new Set(ids));
   const results=coverage(chosen,profile.declared);
   coverageRows.push({case_id:caseId,province,algorithm,k,
    micro_coverage:results.micro,macro_coverage:results.macro,
    preferences_requested:results.requested,preferences_covered:results.covered,
    valid_dimensions:results.valid_dimensions,dimensions_without_place_tags:results.dimensions_without_place_tags,
    ...Object.fromEntries(Object.entries(results).filter(([field])=>dimensions.some(d=>field.startsWith(d+"_"))))});
  }
 }
 console.log("Evaluated personalization",g);
}
const jaccardRows:Record<string,unknown>[]=[];
for(const province of Object.values(areas))for(const algorithm of ["Weighted Profile-Matching Baseline","TDMC-APD"])for(const k of K){
 for(let a=1;a<=7;a++)for(let b=a+1;b<=7;b++){
  const A=byGroup.get([province,algorithm,k,a].join("|"))!;
  const B=byGroup.get([province,algorithm,k,b].join("|"))!;
  const intersection=[...A].filter(id=>B.has(id)).length;
  jaccardRows.push({province,algorithm,k,case_a:a,case_b:b,
   intersection,union:A.size+B.size-intersection,jaccard:fmt(intersection/(A.size+B.size-intersection))});
 }
}
function average(a:number[]){return a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;}
const summary:Record<string,unknown>[]=[];
for(const algorithm of ["Weighted Profile-Matching Baseline","TDMC-APD"])for(const k of K){
 const c=coverageRows.filter(r=>r.algorithm===algorithm&&r.k===k);
 const j=jaccardRows.filter(r=>r.algorithm===algorithm&&r.k===k);
 const usable=c.filter(r=>typeof r.micro_coverage==="number");
 const usableMacro=c.filter(r=>typeof r.macro_coverage==="number");
 summary.push({algorithm,k,cases:c.length,
  mean_micro_coverage:fmt(average(usable.map(r=>Number(r.micro_coverage)))),
  mean_macro_coverage:fmt(average(usableMacro.map(r=>Number(r.macro_coverage)))),
  coverage_evaluable:usable.length,mean_pairwise_jaccard:fmt(average(j.map(r=>Number(r.jaccard)))),
  profile_pairs:j.length});
}
await fs.mkdir(outputDir,{recursive:true});
await fs.writeFile(path.join(outputDir,"preference_coverage.csv"),csv(coverageRows,Object.keys(coverageRows[0])),"utf8");
await fs.writeFile(path.join(outputDir,"profile_jaccard.csv"),csv(jaccardRows,Object.keys(jaccardRows[0])),"utf8");
await fs.writeFile(path.join(outputDir,"personalization_summary.csv"),csv(summary,Object.keys(summary[0])),"utf8");
await fs.writeFile(path.join(outputDir,"personalization_summary.json"),JSON.stringify({
 methodology:"Coverage is binary match by declared categorical preference value; missing tags are reported separately. Pairwise Jaccard compares Top-K IDs for two distinct profiles, same algorithm/province/K.",
 warnings:["Numeric trip budget is not a category; missing budget preference labels are excluded rather than guessed.",
  "Coverage is tag-based, not a satisfaction score or proof of budget compliance.",
  "Profiles and ranked places are recomputed using the same snapshot; no final LLM plans are evaluated."],
 rows:summary},null,2),"utf8");
console.table(summary);
console.log("Saved personalization outputs:",outputDir);
