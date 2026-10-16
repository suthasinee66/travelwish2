/**
 * Profile personalization experiment for TravelWish.
 * Usage: npm run eval:personalization
 * Uses the exact TDMC CANDIDATES captured in production planner prompts.
 * Supabase attraction tags are joined by stored attraction IDs ONLY for coverage.
 * This does not rerun or alter the recommendation algorithm.
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import {createClient} from "@supabase/supabase-js";

const K=[5,10,15,20,25,30];
const areas:Record<string,string>={bangkok:"กรุงเทพมหานคร",chiangmai:"เชียงใหม่",phuket:"ภูเก็ต"};
const dimensions=["travel_type","activities","atmosphere","budget","travel_companion"] as const;
const argv=process.argv.slice(2);
const opt=(k:string,f:string)=>{const i=argv.indexOf("--"+k);return i<0?f:(argv[i+1]||f);};
const runsDir=path.resolve(opt("runs","comparison/plan_runs"));
const outputDir=path.resolve(opt("out","comparison/personalization"));
const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const db=url&&key?createClient(url,key):null;
const norm=(v:unknown)=>String(v??"").trim().normalize("NFC").toLocaleLowerCase();
const array=(x:unknown):unknown[]=>Array.isArray(x)?x:(x===null||x===undefined||x===""?[]:[x]);
const set=(x:unknown)=>new Set(array(x).map(norm).filter(Boolean));
function getPrompt(doc:any):string{
 return doc.models?.gemini?.rounds?.[0]?.prompt??doc.models?.gpt?.rounds?.[0]?.prompt??doc.models?.claude?.rounds?.[0]?.prompt??"";
}
function parseProfile(doc:any){
 const prompt=getPrompt(doc);
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
 const trip={province:t.province};
 // Keep declared preference labels; numeric trip budget is not a categorical preference.
 const declared:Record<string,Set<string>>={
  travel_type:set(p.travel_type),activities:set(p.activities),atmosphere:set(p.atmosphere),
  budget:set(p.budget),travel_companion:set(p.travel_companion)
 };
 return {trip,declared};
}
async function placesIn(province:string){
 if(!db)throw Error("Supabase credentials needed to evaluate Preference Coverage. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.");
 const all:any[]=[];
 for(let from=0;;from+=1000){
  const {data,error}=await db.from("attraction").select(
   "att_id,name_th,province,travel_type,activities,atmosphere,budget,travel_companion")
   .eq("province",province).order("att_id").range(from,from+999);
  if(error)throw Error("Supabase: "+error.message);
  if(!data?.length)break;
  all.push(...data);
  if(data.length<1000)break;
 }
 return all;
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

function parseArrayAt(input:string, start:number):any[]{
 if(input[start]!=="[")throw Error("Expected JSON array");
 let depth=0, quote=false, escaped=false;
 for(let i=start;i<input.length;i++){
  const ch=input[i];
  if(quote){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')quote=false;}
  else if(ch==='"')quote=true;
  else if(ch==="[")depth++;
  else if(ch==="]"&&--depth===0)return JSON.parse(input.slice(start,i+1));
 }
 throw Error("Truncated TDMC candidate array in prompt");
}
function recordedCandidates(doc:any):{id:string,name:string}[]{
 const prompt=getPrompt(doc);
 const marker="TDMC CANDIDATES:";
 const index=prompt.indexOf(marker);
 if(index<0)throw Error("No TDMC CANDIDATES section in production prompt");
 const start=prompt.indexOf("[",index+marker.length);
 const items=parseArrayAt(prompt,start);
 const out=items.map((row:any)=>({id:String(row?.attraction?.id??row?.attraction?.att_id??"").trim(),
  name:String(row?.attraction?.name_th??"")}));
 if(out.length<30)throw Error("Production prompt has only "+out.length+" TDMC candidates; expected Top 30");
 if(out.some(x=>!x.id))throw Error("TDMC candidate has no attraction ID");
 if(new Set(out.map(x=>x.id)).size!==out.length)throw Error("Duplicate attraction IDs in TDMC candidates");
 return out;
}
const names=(await fs.readdir(runsDir)).filter(n=>/^travelwish_case\d+_(bangkok|chiangmai|phuket)(?:\(\d+\))?\.json$/i.test(n)).sort();
if(!names.length)throw Error("No production experiment JSON logs found in "+runsDir);
type Run={caseId:number;province:string;profile:ReturnType<typeof parseProfile>;ranked:{id:string,name:string}[];name:string;recordedAt:string};
const groupRuns=new Map<string,Run>();
for(const name of names){
 const m=name.match(/^travelwish_case(\d+)_(bangkok|chiangmai|phuket)/i)!;
 const caseId=Number(m[1]),province=areas[m[2].toLowerCase()];
 const doc=JSON.parse(await fs.readFile(path.join(runsDir,name),"utf8"));
 const profile=parseProfile(doc);
 if(profile.trip.province!==province)throw Error("Province mismatch in "+name);
 const ranked=recordedCandidates(doc);
 const g=caseId+"|"+province;
 const recordedAt=String(doc.recorded_at??"");
 // When multiple exports exist for one case, select the latest recorded production run.
 if(!groupRuns.has(g)||recordedAt>groupRuns.get(g)!.recordedAt)
  groupRuns.set(g,{caseId,province,profile,ranked,name,recordedAt});
}
const expected=Array.from({length:7},(_,i)=>i+1).flatMap(c=>Object.values(areas).map(p=>c+"|"+p));
const missing=expected.filter(g=>!groupRuns.has(g));
if(missing.length)throw Error("Missing production case/province logs: "+missing.join(", "));
const byGroup=new Map<string,Set<string>>();
const coverageRows:Record<string,unknown>[]=[];
const recommendationRows:Record<string,unknown>[]=[];
const matchDiagnostics:Record<string,unknown>[]=[];
const placeCache=new Map<string,Map<string,any>>();
for(const [g,{caseId,province,profile,ranked,name}] of groupRuns){
 if(!placeCache.has(province)){
  const byId=new Map((await placesIn(province)).map(x=>[String(x.att_id),x]));
  placeCache.set(province,byId);
 }
 const byId=placeCache.get(province)!;
 for(const k of K){
  const chosen=ranked.slice(0,k);
  const ids=chosen.map(x=>x.id);
  byGroup.set([province,"TDMC-APD",k,caseId].join("|"),new Set(ids));
  const joined=chosen.map(p=>byId.get(p.id)).filter(Boolean);
  const unmatched=chosen.filter(p=>!byId.has(p.id));
  // Coverage cannot be silently inflated by discarding unmapped items.
  const result=coverage(joined,profile.declared);
  coverageRows.push({case_id:caseId,province,algorithm:"TDMC-APD",k,
   source_file:name,source:"production_tdmc_candidates",matched_attraction_ids:joined.length,
   unmatched_attraction_ids:unmatched.length,
   micro_coverage:result.micro,macro_coverage:result.macro,
   preferences_requested:result.requested,preferences_covered:result.covered,
   valid_dimensions:result.valid_dimensions,dimensions_without_place_tags:result.dimensions_without_place_tags,
   ...Object.fromEntries(Object.entries(result).filter(([field])=>dimensions.some(d=>field.startsWith(d+"_"))))});
  matchDiagnostics.push({case_id:caseId,province,k,matched:joined.length,unmatched:unmatched.length,
   unmatched_names:unmatched.map(x=>x.name).join(" | "),unmatched_ids:unmatched.map(x=>x.id).join(" | ")});
  chosen.forEach((p,i)=>recommendationRows.push({case_id:caseId,province,k,rank:i+1,id:p.id,name:p.name,tag_found:byId.has(p.id),source_file:name}));
 }
 console.log("Evaluated recorded production candidates:",g,name);
}
const jaccardRows:Record<string,unknown>[]=[];
for(const province of Object.values(areas))for(const k of K){
 for(let a=1;a<=7;a++)for(let b=a+1;b<=7;b++){
  const A=byGroup.get([province,"TDMC-APD",k,a].join("|"))!;
  const B=byGroup.get([province,"TDMC-APD",k,b].join("|"))!;
  const intersection=[...A].filter(id=>B.has(id)).length;
  const union=A.size+B.size-intersection;
  jaccardRows.push({province,algorithm:"TDMC-APD",k,case_a:a,case_b:b,
   intersection,union,jaccard:fmt(intersection/union),different_places:union-intersection});
 }
}
function average(a:number[]){return a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;}
const summary:Record<string,unknown>[]=[];
for(const k of K){
 const c=coverageRows.filter(r=>r.k===k);
 const j=jaccardRows.filter(r=>r.k===k);
 const micro=c.filter(r=>typeof r.micro_coverage==="number");
 const macro=c.filter(r=>typeof r.macro_coverage==="number");
 summary.push({algorithm:"TDMC-APD",source:"production_tdmc_candidates",k,cases:c.length,
  mean_micro_coverage:fmt(average(micro.map(r=>Number(r.micro_coverage)))),
  mean_macro_coverage:fmt(average(macro.map(r=>Number(r.macro_coverage)))),
  coverage_evaluable:micro.length,mean_pairwise_jaccard:fmt(average(j.map(r=>Number(r.jaccard)))),
  profile_pairs:j.length,total_unmatched_place_ids:c.reduce((a,r)=>a+Number(r.unmatched_attraction_ids),0)});
}
await fs.mkdir(outputDir,{recursive:true});
await fs.writeFile(path.join(outputDir,"preference_coverage.csv"),csv(coverageRows,Object.keys(coverageRows[0])),"utf8");
await fs.writeFile(path.join(outputDir,"profile_jaccard.csv"),csv(jaccardRows,Object.keys(jaccardRows[0])),"utf8");
await fs.writeFile(path.join(outputDir,"personalization_summary.csv"),csv(summary,Object.keys(summary[0])),"utf8");
await fs.writeFile(path.join(outputDir,"recorded_topk.csv"),csv(recommendationRows,Object.keys(recommendationRows[0])),"utf8");
await fs.writeFile(path.join(outputDir,"unmatched_attractions.csv"),csv(matchDiagnostics,Object.keys(matchDiagnostics[0])),"utf8");
await fs.writeFile(path.join(outputDir,"personalization_summary.json"),JSON.stringify({
 methodology:"Extract original TDMC CANDIDATES from production CreatePlanner Gemini/GPT/Claude prompt; for each case/province, compare exact recorded Top-K attraction IDs. Preference Coverage joins these IDs with current Supabase attraction tags.",
 warnings:["The ranking is historical production output; live Supabase tags may have changed after the run.",
 "Jaccard compares distinct profiles with the same province/K; this is a difference measure, not proof of preference satisfaction.",
 "Coverage is tag based, not proof of budget compliance. No labels inferred from attraction name.",
 "When a case/province has multiple exports, the latest recorded_at is selected.",
 "No baseline is recomputed: these files contain recorded TDMC recommendations only."],
 rows:summary},null,2),"utf8");
console.table(summary);
console.log("Wrote production-based personalization outputs to",outputDir);
