/**
 * Fresh paired comparison: oldAlgorithm baseline vs production rankPlacesTDMC, both re-ranked from current Supabase.
 * Exactly 7 cases x 3 provinces; Ground Truth binary 0/1.
 * npx tsx src/lib/algorithm/compareBaselineVsTDMC7Cases.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runWeightedProfileMatchingBaseline } from "./oldAlgorithm";
import { rankPlacesTDMC, type TDMCPlace } from "./tdmcAlgorithm";
import { evaluateRecommendations } from "./evaluation";
import type { TripPlanInput } from "./types";

const ROOT=process.cwd();
const PROFILE_PATH=process.env.TDMC_WEIGHT_PROFILES??path.join(ROOT,"comparison","weight_profiles_7cases.json");
const GT_PATH=process.env.TDMC_GROUND_TRUTH??path.join(ROOT,"comparison","groundtruth.csv");
const OUT=path.join(ROOT,"comparison","baseline_vs_tdmc_7cases");
const KS=[5,10,15,20,25,30] as const;
const WEIGHTS={alpha:0.2,beta:0.3,gamma:0.5};
const PROVINCES=["กรุงเทพมหานคร","เชียงใหม่","ภูเก็ต"];
type Profile={id:string;trip:TripPlanInput;testProvinces:string[]};
type RecordRow={case:string;province:string;method:string;k:number;precision:number;recall:number;f1:number;diversity:number;candidate_count:number;relevant_count:number;selected_count:number};
const normalizeCase=(s:string)=>{const x=String(s).trim();const m=x.match(/^(?:case[ _-]*)?(\d+)$/i);return m?"case"+Number(m[1]):x.toLowerCase();};
const key=(c:string,p:string)=>normalizeCase(c)+"|"+p.trim();
const mean=(a:number[])=>a.reduce((x,y)=>x+y,0)/a.length;

function parseCSV(content:string):Record<string,string>[] {
 const text=content.replace(/^\uFEFF/,"");
 const rows:string[][]=[];let cell="",row:string[]=[],quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===","&&!quoted){row.push(cell);cell="";}
  else if((c==="\r"||c==="\n")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell);cell="";if(row.some(x=>x.trim()))rows.push(row);row=[];}
  else cell+=c;
 }
 if(quoted)throw Error("Unclosed quote in CSV");
 if(cell||row.length){row.push(cell);rows.push(row);}
 const headers=(rows.shift()??[]).map(x=>x.trim());
 
 return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,(values[i]??"").trim()])));
}

function checkColumns(rows:Record<string,string>[],cols:string[],source:string){
 if(!rows.length)throw Error("Empty "+source);
 for(const col of cols)if(!(col in rows[0]))throw Error("Missing "+source+" column: "+col+". Available: "+Object.keys(rows[0]).join(", "));
}
/** Exact Top-K from historical output; never derive ranks from the current algorithm. */
function toCSV(rows:RecordRow[]|Record<string,string|number>[]):string{
 if(!rows.length)return "";
 const keys=Object.keys(rows[0]);
 const esc=(s:unknown)=>'"'+String(s??"").replace(/"/g,'""')+'"';
 return keys.join(",")+"\n"+rows.map(r=>keys.map(k=>esc((r as any)[k])).join(",")).join("\n")+"\n";
}
function graph(rows:Array<{metric:string;k:number;baseline:number;tdmc:number}>):string{
 const W=1220,H=875;let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'"><rect width="100%" height="100%" fill="#fff"/>';
 svg+='<style>text{font-family:Arial,sans-serif;fill:#252525}.axis{font-size:12px;fill:#555}.plot{stroke:#e2e6ea;stroke-dasharray:3 4}</style>';
 svg+='<text x="610" y="37" text-anchor="middle" font-size="23" font-weight="bold">Weighted Profile-Matching Baseline vs TDMC-APD</text>';
 svg+='<text x="610" y="63" text-anchor="middle" font-size="15">Performance Across Recommendation List Sizes (K = 5–30)</text>';
 svg+='<line x1="420" y1="86" x2="448" y2="86" stroke="#7f7f7f" stroke-width="2.5"/><circle cx="434" cy="86" r="4" fill="#7f7f7f"/><text x="459" y="91" font-size="13">Weighted Profile-Matching Baseline</text>';
 svg+='<line x1="712" y1="86" x2="741" y2="86" stroke="#1479bf" stroke-width="2.5"/><circle cx="726" cy="86" r="4" fill="#1479bf"/><text x="752" y="91" font-size="13">TDMC-APD</text>';
 const metrics=["precision","recall","f1","diversity"];
 metrics.forEach((metric,mi)=>{
  const col=mi%2,rr=Math.floor(mi/2),originX=90+col*610,originY=160+rr*335,plotW=460,plotH=215;
  svg+='<text x="'+(originX+230)+'" y="'+(originY-20)+'" font-size="16" font-weight="bold" text-anchor="middle">'+({precision:"Precision",recall:"Recall",f1:"F1-score",diversity:"Diversity"} as Record<string,string>)[metric]+'</text>';
  for(let t=0;t<=5;t++){const value=t/5,y=originY+plotH-value*plotH;svg+='<line class="plot" x1="'+originX+'" y1="'+y+'" x2="'+(originX+plotW)+'" y2="'+y+'"/><text class="axis" x="'+(originX-13)+'" y="'+(y+4)+'" text-anchor="end">'+value.toFixed(1)+'</text>';}
  svg+='<line x1="'+originX+'" y1="'+originY+'" x2="'+originX+'" y2="'+(originY+plotH)+'" stroke="#888"/><line x1="'+originX+'" y1="'+(originY+plotH)+'" x2="'+(originX+plotW)+'" y2="'+(originY+plotH)+'" stroke="#888"/>';
  const metricRows=rows.filter(r=>r.metric===metric).sort((a,b)=>a.k-b.k);
  KS.forEach((k,i)=>{const x=originX+i*plotW/(KS.length-1);svg+='<text class="axis" x="'+x+'" y="'+(originY+plotH+19)+'" text-anchor="middle">'+k+'</text>';});
  for(const [field,color] of [["baseline","#7f7f7f"],["tdmc","#1479bf"]] as const){
   const pts=metricRows.map((r,i)=>({x:originX+i*plotW/(KS.length-1),y:originY+plotH-Math.max(0,Math.min(1,r[field]))*plotH}));
   svg+='<polyline points="'+pts.map(p=>p.x+","+p.y).join(" ")+'" fill="none" stroke="'+color+'" stroke-width="2.5"/>';
   pts.forEach(p=>{svg+='<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="'+color+'"/>';});
  }
  svg+='<text class="axis" x="'+(originX+plotW/2)+'" y="'+(originY+plotH+42)+'" text-anchor="middle">Recommendation List Size (K)</text>';
 });
 svg+='<text x="610" y="840" text-anchor="middle" font-size="12">Mean of 21 paired case–province groups; both methods rerun against labelled Supabase pool</text></svg>';
 return svg;
}
async function loadAttractions(client:ReturnType<typeof createClient>,province:string):Promise<TDMCPlace[]>{
 const result:TDMCPlace[]=[];const size=1000;
 while(true){
  const {data,error}=await client.from("attraction").select("att_id,name_th,province,latitude,longitude,travel_type,activities,atmosphere,budget,travel_companion,avg_rating,visitor_count,topic_vector").eq("province",province).order("att_id").range(result.length,result.length+size-1);
  if(error)throw Error("Supabase "+province+": "+error.message);
  if(!data?.length)break;
  result.push(...data);if(data.length<size)break;
 }
 return result;
}
async function main(){
 const {SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}=process.env;
 if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)throw Error("Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
 const profiles=JSON.parse(await fs.readFile(PROFILE_PATH,"utf8")) as Profile[];
 if(profiles.length!==7||new Set(profiles.map(x=>normalizeCase(x.id))).size!==7)throw Error("Expected 7 distinct case profiles.");
 const csvRows=parseCSV(await fs.readFile(GT_PATH,"utf8"));
 checkColumns(csvRows,["case_id","province","att_id","relevant_0_or_1"],"Ground Truth");
 console.log("Fresh TDMC and Baseline rankings from current Supabase; weights:", WEIGHTS);
 const groundTruth=new Map<string,Map<string,number>>();
 for(const r of csvRows){
  if(r.relevant_0_or_1!=="0"&&r.relevant_0_or_1!=="1")throw Error("Expected labeled 0/1 value for "+r.case_id+" "+r.province+" "+r.att_id);
  const id=key(r.case_id,r.province),items=groundTruth.get(id)??new Map<string,number>();
  if(items.has(r.att_id)&&items.get(r.att_id)!==Number(r.relevant_0_or_1))throw Error("Conflicting label for "+r.att_id);
  items.set(r.att_id,Number(r.relevant_0_or_1));groundTruth.set(id,items);
 }
 const client=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const provinceData=new Map<string,TDMCPlace[]>();
 for(const province of PROVINCES)provinceData.set(province,await loadAttractions(client,province));
 const detail:RecordRow[]=[];
 for(const profile of profiles)for(const province of PROVINCES){
  const labels=groundTruth.get(key(profile.id,province));
  if(!labels?.size)throw Error("Missing Ground Truth: "+profile.id+" / "+province);
  // Fair paired evaluation: both methods rank the same labelled Supabase attractions.
  // Unlabelled rows are excluded from both methods, not silently scored as irrelevant.
  const dataset=(provinceData.get(province)??[]).filter(p=>labels.has(String(p.att_id??"")));
  if(dataset.length<30)throw Error("Fewer than 30 labelled candidates: "+profile.id+" / "+province);
  const relevant=new Set(dataset.filter(p=>labels.get(String(p.att_id))===1).map(p=>String(p.att_id)));
  if(!relevant.size)throw Error("No relevant attraction IDs: "+profile.id+" / "+province);
  const trip={...profile.trip,province};
  const baseline=runWeightedProfileMatchingBaseline(dataset,trip,30);
  const tdmc=rankPlacesTDMC(dataset,trip,{limit:30,weights:WEIGHTS}).recommendations;
  for(const k of KS)for(const [method,ranked] of [["Baseline",baseline],["TDMC-APD",tdmc]] as const){
   const selected=ranked.slice(0,k);if(selected.length!==k)throw Error(method+" returned fewer than "+k);
   const m=evaluateRecommendations(selected,dataset,relevant);
   const unjudged=selected.filter(p=>!labels.has(String(p.att_id??""))).length;
   if(unjudged)console.warn("WARNING",profile.id,province,method,"K="+k,"has",unjudged,"unjudged attractions (treated nonrelevant).");
   detail.push({case:normalizeCase(profile.id),province,method,k,precision:m.precision,recall:m.recall,f1:m.f1,diversity:m.diversity,candidate_count:dataset.length,relevant_count:relevant.size,selected_count:selected.length});
  }
 }
 if(detail.length!==7*3*2*KS.length)throw Error("Incomplete comparison; expected 252 per-case results");
 const summary:Array<{metric:string;k:number;baseline:number;tdmc:number}>=[];
 for(const metric of ["precision","recall","f1","diversity"] as const)for(const k of KS){
  const score=(method:string)=>{
   const perCase=profiles.map(p=>{
    const group=detail.filter(r=>r.case===normalizeCase(p.id)&&r.method===method&&r.k===k);
    if(group.length!==3)throw Error("Expected three provinces for "+p.id);
    return mean(group.map(r=>r[metric]));
   });return mean(perCase);
  };
  summary.push({metric,k,baseline:score("Baseline"),tdmc:score("TDMC-APD")});
 }
 await fs.mkdir(OUT,{recursive:true});
 await fs.writeFile(path.join(OUT,"per_case_province.csv"),toCSV(detail));
 await fs.writeFile(path.join(OUT,"baseline_vs_tdmc_k5_k30.csv"),toCSV(summary));
 await fs.writeFile(path.join(OUT,"baseline_vs_tdmc_k5_k30.svg"),graph(summary));
 console.table(summary);
 console.log("Saved to:",OUT);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
