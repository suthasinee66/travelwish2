/**
 * Re-run the actual TDMC rankPlacesTDMC against CURRENT Supabase attractions.
 * For verifiable Precision/Recall, rank only Ground-Truth-labelled candidate IDs.
 * Output feeds scripts/plotProductionTDMC.mjs (no historical planner JSON needed).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { rankPlacesTDMC, type TDMCPlace } from "./tdmcAlgorithm";
import type { TripPlanInput } from "./types";

const ROOT=process.cwd();
const gtFile=path.resolve(process.env.TDMC_GROUND_TRUTH || "comparison/groundtruth.csv");
const profileFile=path.resolve(process.env.TDMC_WEIGHT_PROFILES || "comparison/weight_profiles_7cases.json");
const outDir=path.resolve("comparison/figures/production_tdmc");
const provinces=["กรุงเทพมหานคร","เชียงใหม่","ภูเก็ต"];
const weights={alpha:0.2,beta:0.3,gamma:0.5};
const csv=(s:string):Record<string,string>[]=>{
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(c===","&&!quoted){row.push(cell);cell="";}
 else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&s[i+1]==="\n")i++;row.push(cell);cell="";if(row.some(x=>x.trim()))rows.push(row);row=[];}
 else cell+=c;}
 if(quoted)throw Error("Invalid quoted CSV");
 if(row.length||cell){row.push(cell);rows.push(row);}
 const header=(rows.shift()||[]).map(x=>x.trim());
 for(const h of ["case_id","province","att_id","relevant_0_or_1"])if(!header.includes(h))throw Error("Missing Ground Truth CSV column "+h);
 return rows.map(values=>Object.fromEntries(header.map((h,i)=>[h,(values[i]||"").trim()])));
};
const normalizeCase=(s:string)=>{const m=s.trim().match(/^(?:case[ _-]*)?(\d+)$/i);return m?"case"+Number(m[1]):s.trim().toLowerCase();};
async function fetchProvince(client:ReturnType<typeof createClient>, province:string):Promise<TDMCPlace[]>{
 const all:TDMCPlace[]=[];
 for(let from=0;;from+=1000){
  const {data,error}=await client.from("attraction").select("att_id,name_th,province,latitude,longitude,travel_type,activities,atmosphere,budget,travel_companion,avg_rating,visitor_count,topic_vector").eq("province",province).order("att_id").range(from,from+999);
  if(error)throw Error("Supabase "+province+": "+error.message);
  if(!data?.length)break;all.push(...data);if(data.length<1000)break;
 }
 return all;
}
async function main(){
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
 const profiles=JSON.parse(await fs.readFile(profileFile,"utf8")) as Array<{id:string;trip:TripPlanInput}>;
 if(profiles.length!==7)throw Error("Expected exactly 7 profiles");
 const rows=csv(await fs.readFile(gtFile,"utf8"));
 const labels=new Map<string,Map<string,number>>();
 for(const r of rows){
  if(r.relevant_0_or_1!=="0"&&r.relevant_0_or_1!=="1")throw Error("Invalid 0/1 label for "+r.att_id);
  const group=normalizeCase(r.case_id)+"|"+r.province;
  const m=labels.get(group)||new Map<string,number>();
  if(m.has(r.att_id))throw Error("Duplicate Ground Truth ID "+group+" "+r.att_id);
  m.set(r.att_id,Number(r.relevant_0_or_1));labels.set(group,m);
 }
 const client=createClient(url,key,{auth:{persistSession:false}});
 const byProvince=new Map<string,TDMCPlace[]>();
 for(const province of provinces)byProvince.set(province,await fetchProvince(client,province));
 const records:Array<{case_id:number;province:string;top30:string[];relevant_count:number;candidate_count:number}>=[];
 for(const profile of profiles){
  const id=normalizeCase(profile.id);
  const caseId=Number(id.replace(/^case/,""));
  if(!Number.isInteger(caseId)||caseId<1||caseId>7)throw Error("Invalid case ID "+profile.id);
  for(const province of provinces){
   const group=id+"|"+province,gt=labels.get(group);
   if(!gt?.size)throw Error("Ground Truth missing "+group);
   const pool=(byProvince.get(province)||[]).filter(place=>gt.has(String(place.att_id??"")));
   if(pool.length<30)throw Error("Fewer than 30 labelled Supabase candidates: "+group);
   const relevantCount=pool.filter(p=>gt.get(String(p.att_id))===1).length;
   if(!relevantCount)throw Error("No relevant labelled candidate in "+group);
   const trip={...profile.trip,province};
   const output=rankPlacesTDMC(pool,trip,{limit:30,weights});
   const top30=output.recommendations.map(p=>String(p.att_id??p.id??""));
   if(top30.length!==30||top30.some(x=>!x)||new Set(top30).size!==30)throw Error("Invalid ranking: "+group);
   records.push({case_id:caseId,province,top30,relevant_count:relevantCount,candidate_count:pool.length});
   console.log("Re-ranked",group,"pool",pool.length,"relevant",relevantCount);
  }
 }
 if(records.length!==21)throw Error("Expected 21 experiment groups, found "+records.length);
 await fs.mkdir(outDir,{recursive:true});
 const target=path.join(outDir,"reranked_tdmc_top30.json");
 await fs.writeFile(target,JSON.stringify({source:"current_supabase_tdmc_rerun",weights,candidate_scope:"ground_truth_labelled_supabase_attractions",ground_truth_rows:rows.length,runs:records.length,records},null,2)+"\n");
 console.log("Saved",target);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
