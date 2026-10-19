/**
 * Seven-profile TDMC weight sensitivity analysis.
 * Uses the SAME rankPlacesTDMC imported by src/lib/ai/algorithm.ts.
 * Never imports oldAlgorithm / oldalgorithm.
 *
 * Run: npx tsx src/lib/algorithm/compareProductionWeights7Cases.ts
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Ground truth: comparison/ground_truth_pool.csv (0/1/2, relevant=2).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { rankPlacesTDMC, TDMC_EXPERIMENT_CONFIGS, type TDMCPlace } from "./tdmcAlgorithm";
import { evaluateRecommendations } from "./evaluation";
import { parseGroundTruthCsv, GROUND_TRUTH_SCORE_RELEVANT, groundTruthKey } from "./groundTruth";
import type { TripPlanInput } from "./types";

type Profile = { id: string; name: string; trip: TripPlanInput; testProvinces: string[] };
const ROOT = process.cwd();
const OUT = path.join(ROOT, "comparison", "production_weights_7cases");
const PROFILES_PATH = process.env.TDMC_WEIGHT_PROFILES ?? path.join(ROOT, "comparison", "weight_profiles_7cases.json");
const GROUND_TRUTH_PATH = process.env.TDMC_GROUND_TRUTH ?? path.join(ROOT, "comparison", "ground_truth_pool.csv");
const K = 30;
const INCLUDE_UNLABELED = process.env.TDMC_ALLOW_MISSING_GT === "1";

function csv(rows: Record<string, string | number | null>[]) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const escape = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  return [columns.join(","), ...rows.map(row => columns.map(k => escape(row[k])).join(","))].join("\n") + "\n";
}
function avg(values: number[]) { return values.length ? values.reduce((a,b) => a+b, 0)/values.length : 0; }
function svgChart(rows: any[]) {
  const metrics = ["precision","recall","f1","diversity"];
  const width = 1250, height = 650, left = 85, top = 65, bottom = 170, right = 300;
  const areaW = width-left-right, areaH = height-top-bottom;
  const colors = ["#2276b8","#f28a24","#38a95b","#d84f4f","#9865b7","#866050","#d96fbd"];
  const groupW = areaW/metrics.length, barW = (groupW-35)/rows.length;
  let out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'">';
  out += '<rect width="100%" height="100%" fill="white"/><text x="'+width/2+'" y="32" text-anchor="middle" font-size="19" font-family="Arial">Production TDMC: Weight Comparison (7 Cases)</text>';
  for(let t=0;t<=5;t++) { const y=top+areaH-t/5*areaH;out+='<line x1="'+left+'" y1="'+y+'" x2="'+(left+areaW)+'" y2="'+y+'" stroke="#ddd"/><text x="'+(left-12)+'" y="'+(y+5)+'" text-anchor="end" font-size="13">'+(t/5).toFixed(1)+'</text>'; }
  metrics.forEach((metric,mi)=>{const gx=left+mi*groupW;rows.forEach((r,i)=>{const value=Math.max(0,Math.min(1,Number(r[metric])||0));const h=value*areaH;out+='<rect x="'+(gx+14+i*barW)+'" y="'+(top+areaH-h)+'" width="'+Math.max(2,barW-2)+'" height="'+h+'" fill="'+colors[i%colors.length]+'"/>';});out+='<text x="'+(gx+groupW/2)+'" y="'+(top+areaH+27)+'" text-anchor="middle" font-size="14" font-family="Arial">'+metric.toUpperCase()+'</text>';});
  rows.forEach((r,i)=>{out+='<rect x="'+(left+areaW+20)+'" y="'+(top+i*28)+'" width="15" height="14" fill="'+colors[i%colors.length]+'"/><text x="'+(left+areaW+43)+'" y="'+(top+12+i*28)+'" font-size="12" font-family="Arial">'+String(r.name).replace(/[&<>]/g,"")+'</text>';});
  return out+'</svg>';
}
async function loadAttractions(supabase: ReturnType<typeof createClient>, province: string):Promise<TDMCPlace[]> {
  const rows: TDMCPlace[] = [];
  const size=1000;
  while(true) {
    const {data,error} = await supabase.from("attraction").select("att_id,name_th,name_en,province,latitude,longitude,travel_type,activities,atmosphere,budget,travel_companion,avg_rating,visitor_count,topic_vector").eq("province",province).range(rows.length, rows.length+size-1);
    if(error) throw new Error("Supabase "+province+": "+error.message);
    if(!data?.length) break;
    rows.push(...data);
    if(data.length<size) break;
  }
  return rows;
}
async function main(){
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (never commit secrets).");
  const profiles=JSON.parse(await fs.readFile(PROFILES_PATH,"utf8")) as Profile[];
  if(profiles.length!==7 || new Set(profiles.map(p=>p.id)).size!==7 || profiles.some(p=>!p.id||!p.trip||!p.testProvinces?.length)) throw new Error("Profile config must contain exactly 7 distinct cases with trip and testProvinces.");
  const groundTruthRows=parseGroundTruthCsv(await fs.readFile(GROUND_TRUTH_PATH,"utf8"));
  const gt=new Map<string,{relevant:Set<string>; labeled:Set<string>}>();
  for(const row of groundTruthRows) {
    if(row.relevant_score===null) continue;
    const key=groundTruthKey(row.profile_id,row.province);
    const entry=gt.get(key)??{relevant:new Set<string>(),labeled:new Set<string>()};
    entry.labeled.add(row.att_id);
    if(row.relevant_score===GROUND_TRUTH_SCORE_RELEVANT) entry.relevant.add(row.att_id);
    gt.set(key,entry);
  }
  const supabase=createClient(url,key,{auth:{persistSession:false}});
  const provinces=[...new Set(profiles.flatMap(p=>p.testProvinces))];
  const byProvince=new Map<string,TDMCPlace[]>();
  for(const province of provinces) byProvince.set(province,await loadAttractions(supabase,province));
  const detailed:Record<string,string|number|null>[]=[];
  const configs=TDMC_EXPERIMENT_CONFIGS;
  for(const profile of profiles) {
    for(const province of profile.testProvinces) {
      const data=byProvince.get(province)??[];
      const truth=gt.get(groundTruthKey(profile.id,province));
      if(data.length<K) throw new Error("Only "+data.length+" places for "+profile.id+" / "+province+"; cannot evaluate Top-"+K);
      if((!truth || truth.relevant.size===0) && !INCLUDE_UNLABELED) throw new Error("Missing relevant Ground Truth (score=2) for "+profile.id+" / "+province+". Generate/label the pool or run with TDMC_ALLOW_MISSING_GT=1 for descriptive metrics only.");
      const trip={...profile.trip,province};
      for(const weight of configs) {
        // IMPORTANT: this is the EXACT production ranking entry point.
        const result=rankPlacesTDMC(data,trip,{limit:K,weights:{alpha:weight.alpha,beta:weight.beta,gamma:weight.gamma}});
        const selected=result.recommendations;
        const metrics=evaluateRecommendations(selected,data,truth?.relevant??new Set<string>());
        detailed.push({case:profile.id,province,configuration:weight.id,name:weight.name,alpha:weight.alpha,beta:weight.beta,gamma:weight.gamma,number_of_candidates:data.length,ground_truth_relevant:truth?.relevant.size??null,precision:truth?.relevant.size?metrics.precision:null,recall:truth?.relevant.size?metrics.recall:null,f1:truth?.relevant.size?metrics.f1:null,diversity:metrics.diversity,average_rating:metrics.averageRating,average_distance_km:metrics.averageDistance,runtime_ms:result.runtime,returned:selected.length});
      }
    }
  }
  const summary=configs.map(w=>{
    const selected=detailed.filter(r=>r.configuration===w.id);
    const hasGT=selected.filter(r=>r.f1!==null);
    const perCase=[...new Set(selected.map(r=>String(r.case)))].map(id=>{const group=selected.filter(r=>r.case===id); const labeled=group.filter(r=>r.f1!==null);return {case:id,precision:labeled.length?avg(labeled.map(r=>Number(r.precision))):null,recall:labeled.length?avg(labeled.map(r=>Number(r.recall))):null,f1:labeled.length?avg(labeled.map(r=>Number(r.f1))):null,diversity:avg(group.map(r=>Number(r.diversity)))};});
    const effective=perCase.filter(r=>r.f1!==null);
    return {configuration:w.id,name:w.name,alpha:w.alpha,beta:w.beta,gamma:w.gamma,cases:perCase.length,profile_province_runs:selected.length,ground_truth_runs:hasGT.length,precision:effective.length?avg(effective.map(r=>Number(r.precision))):null,recall:effective.length?avg(effective.map(r=>Number(r.recall))):null,f1:effective.length?avg(effective.map(r=>Number(r.f1))):null,diversity:avg(perCase.map(r=>r.diversity)),rating:avg(selected.map(r=>Number(r.average_rating))),distance_km:avg(selected.map(r=>Number(r.average_distance_km)))};
  });
  await fs.mkdir(OUT,{recursive:true});
  await fs.writeFile(path.join(OUT,"per_case_province.csv"),csv(detailed));
  await fs.writeFile(path.join(OUT,"summary.csv"),csv(summary));
  await fs.writeFile(path.join(OUT,"summary.json"),JSON.stringify({method:"rankPlacesTDMC (production)",K,groundTruthRelevantScore:GROUND_TRUTH_SCORE_RELEVANT,profiles:profiles.map(p=>p.id),summary},null,2));
  await fs.writeFile(path.join(OUT,"weight_comparison.svg"),svgChart(summary));
  console.table(summary.map(({name,precision,recall,f1,diversity,ground_truth_runs})=>({name,precision,recall,f1,diversity,ground_truth_runs})));
  console.log("Results:",OUT);
  if(summary.some(s=>s.ground_truth_runs!==s.profile_province_runs)) console.warn("WARNING: Incomplete Ground Truth; do not select weights from incomplete F1.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
