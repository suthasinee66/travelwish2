/**
 * Offline experiment: Weighted Profile-Matching Baseline vs TDMC-APD.
 * The JSON files are used ONLY to recover the actual test profile and province.
 * Ranking is recomputed using runWeightedProfileMatchingBaseline and
 * runTDMCAlgorithm against the SAME Supabase attraction snapshot.
 * No Gemini/GPT/Claude rankings, itinerary, or judgments are used.
 *
 * npm run eval:algorithms -- --gt comparison/groundtruth.csv --runs comparison/plan_runs
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { runWeightedProfileMatchingBaseline } from "./oldAlgorithm";
import { runTDMCAlgorithm } from "./tdmcAlgorithm";
import { evaluateRecommendations } from "./evaluation";

const K = [5, 10, 15, 20, 25, 30];
const weights = { alpha: 0.2, beta: 0.3, gamma: 0.5 };
const area: Record<string,string> = {
  bangkok: "กรุงเทพมหานคร", chiangmai: "เชียงใหม่", phuket: "ภูเก็ต"
};
const argv = process.argv.slice(2);
function arg(key: string, fallback: string) {
  const i = argv.indexOf("--" + key);
  return i >= 0 ? argv[i + 1] || fallback : fallback;
}
const gtFile = path.resolve(arg("gt", "comparison/groundtruth.csv"));
const runsDir = path.resolve(arg("runs", "comparison/plan_runs"));
const outputDir = path.resolve(arg("out", "comparison/algorithm_comparison"));
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const token = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !token) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (run locally; never commit .env)");
const supabase = createClient(url, token);

function parseCsv(input: string): Record<string,string>[] {
  const records:string[][] = []; let row:string[] = [], value = "", quoted = false;
  input = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') quoted = false;
      else value += c;
    } else if (c === '"' && value === "") quoted = true;
    else if (c === ",") { row.push(value); value = ""; }
    else if (c === "\n") { row.push(value.replace(/\r$/, "")); records.push(row); row = []; value = ""; }
    else value += c;
  }
  if (quoted) throw new Error("Malformed quoted CSV");
  if (value || row.length) { row.push(value.replace(/\r$/, "")); records.push(row); }
  const header = records.shift();
  if (!header) throw new Error("Empty GT");
  for (const col of ["case_id","province","att_id","relevant_0_or_1"]) {
    if (!header.includes(col)) throw new Error("GT missing column: " + col);
  }
  return records.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??""])));
}
const key = (c:string,p:string) => c+"|"+p;
const labels = new Map<string,Map<string,string>>();
for (const row of parseCsv(await fs.readFile(gtFile,"utf8"))) {
  const k = key(row.case_id.trim().replace(/^case/i,""), row.province.trim());
  if (!labels.has(k)) labels.set(k, new Map());
  const group = labels.get(k)!;
  const id = row.att_id.trim();
  if (/e[+-]?\d+$/i.test(id)) throw new Error("Scientific notation att_id in GT: "+id);
  if (!["0","1"].includes(row.relevant_0_or_1.trim())) throw new Error("Missing relevance: "+k+"/"+id);
  if (group.has(id)) throw new Error("Duplicate att_id within GT group: "+k+"/"+id);
  group.set(id, row.relevant_0_or_1.trim());
}

function extractProfile(doc:any) {
  // Re-use saved user profile context; do NOT read any AI recommendations.
  const prompt: string = doc.models?.gemini?.rounds?.[0]?.prompt ??
    doc.models?.gpt?.rounds?.[0]?.prompt ?? doc.models?.claude?.rounds?.[0]?.prompt ?? "";
  const start = prompt.indexOf('{\n  "profile":');
  if (start < 0) throw new Error("No USER PROFILE JSON in logged prompt");
  let depth = 0, inString = false, escaped = false, end = -1;
  for (let i = start; i < prompt.length; i++) {
    const c=prompt[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else {
      if (c === '"') inString = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) { end=i+1; break; }
    }
  }
  if (end < 0) throw new Error("Profile JSON incomplete");
  const parsed=JSON.parse(prompt.slice(start,end));
  const p=parsed.preferences; const t=parsed.currentTrip;
  if (!p || !t) throw new Error("Profile/preferences missing");
  const toArray=(v:any)=>Array.isArray(v)?v: v ? [v] : [];
  return {
    province: t.province,
    travelType: toArray(p.travel_type),
    activities: toArray(p.activities),
    atmosphere: toArray(p.atmosphere),
    companion: p.travel_companion,
    budget: Number(t.budget)||0,
  };
}

async function attractionsFor(province:string) {
  const result:any[]=[];
  for (let from=0;;from+=1000) {
    const {data,error}=await supabase.from("attraction")
      .select("att_id,name_th,province,latitude,longitude,travel_type,activities,atmosphere,budget,travel_companion,avg_rating,visitor_count,topic_vector")
      .eq("province",province).order("att_id").range(from,from+999);
    if (error) throw new Error("Supabase "+province+": "+error.message);
    if (!data?.length) break;
    result.push(...data);
    if (data.length < 1000) break;
  }
  return result.map(p=>({
    ...p, att_id:String(p.att_id),
    rating:p.avg_rating, averageRating:p.avg_rating,
    visitorCount:p.visitor_count, visitors:p.visitor_count,
  }));
}
function toCsv(rows:Record<string,unknown>[]) {
  if (!rows.length) return "";
  const header=Object.keys(rows[0]);
  const q=(v:unknown)=>'"'+String(v??"").replace(/"/g,'""')+'"';
  return "\uFEFF"+[header.map(q).join(","),...rows.map(r=>header.map(h=>q(r[h])).join(","))].join("\r\n")+"\r\n";
}
const filenames=(await fs.readdir(runsDir)).filter(f=>/^travelwish_case\d+_(bangkok|chiangmai|phuket)(?:\(\d+\))?\.json$/i.test(f)).sort();
if (!filenames.length) throw new Error("No production JSON logs found in "+runsDir);
const dataByProvince=new Map<string,any[]>();
const results:Record<string,unknown>[]=[];
const counts=new Map<string,number>();
for (const name of filenames) {
  const m=name.match(/^travelwish_case(\d+)_(bangkok|chiangmai|phuket)/i)!;
  const caseId=m[1], province=area[m[2].toLowerCase()];
  const gt=labels.get(key(caseId,province));
  if (!gt) throw new Error("Missing GT group for "+caseId+" / "+province);
  const doc=JSON.parse(await fs.readFile(path.join(runsDir,name),"utf8"));
  const trip=extractProfile(doc);
  if (trip.province !== province) throw new Error("JSON filename disagrees with profile province: "+name);
  const group=key(caseId,province);
  counts.set(group,(counts.get(group)||0)+1);
  if (counts.get(group)! > 1) throw new Error("Duplicate run for "+group+"; choose one JSON for each group");
  if (!dataByProvince.has(province)) dataByProvince.set(province,await attractionsFor(province));
  const places=dataByProvince.get(province)!;
  const relevantIds=new Set([...gt.entries()].filter(([,v])=>v==="1").map(([id])=>id));
  for (const k of K) {
    const candidates=[
      {algorithm:"Weighted Profile-Matching Baseline",places:runWeightedProfileMatchingBaseline(places,trip,k)},
      {algorithm:"TDMC-APD",places:runTDMCAlgorithm(places,trip,k,weights)}
    ];
    for (const {algorithm,places:chosen} of candidates) {
      if (chosen.length !== k) throw new Error(algorithm+" returned "+chosen.length+" for K "+k+" in "+group);
      const unknown=chosen.filter((p:any)=>!gt.has(String(p.att_id??p.id)));
      if (unknown.length) throw new Error("Unjudged recommendations in "+group+" "+algorithm+" K="+k+": "+unknown.slice(0,3).map((p:any)=>p.att_id).join(", ")+". Review GT before comparing.");
      const metrics=evaluateRecommendations(chosen,places,relevantIds);
      results.push({case_id:caseId,province,algorithm,k,precision:metrics.precision,
        recall:metrics.recall,f1:metrics.f1,diversity:metrics.diversity,
        avg_rating:metrics.averageRating,avg_distance_km:metrics.averageDistance,
        relevant_count:relevantIds.size,true_positives:metrics.truePositive,
        candidate_pool:places.length});
    }
  }
  console.log("Evaluated",group, "candidate pool",places.length);
}
const expected=new Set(Array.from({length:7},(_,i)=>i+1).flatMap(c=>Object.values(area).map(p=>key(String(c),p))));
const missing=[...expected].filter(x=>!counts.has(x));
if (missing.length) throw new Error("Missing 7x3 evaluation groups: "+missing.join(", "));
const aggregate:Record<string,unknown>[]=[];
for (const algorithm of ["Weighted Profile-Matching Baseline","TDMC-APD"]) {
  for (const k of K) {
    const rows=results.filter(r=>r.algorithm===algorithm&&r.k===k);
    const mean=(metric:string)=> rows.reduce((total,r)=>total+Number(r[metric]),0)/rows.length;
    aggregate.push({algorithm,k,runs:rows.length,precision:mean("precision"),recall:mean("recall"),
      f1:mean("f1"),diversity:mean("diversity"),avg_rating:mean("avg_rating"),
      avg_distance_km:mean("avg_distance_km")});
  }
}
await fs.mkdir(outputDir,{recursive:true});
await fs.writeFile(path.join(outputDir,"algorithm_results.csv"),toCsv(results),"utf8");
await fs.writeFile(path.join(outputDir,"algorithm_summary.csv"),toCsv(aggregate),"utf8");
await fs.writeFile(path.join(outputDir,"algorithm_summary.json"),JSON.stringify({weights,kValues:K,groups:counts.size,summary:aggregate},null,2),"utf8");
console.table(aggregate);
console.log("Completed: ",counts.size,"profile/province pairs; outputs:",outputDir);
console.log("This experiment recomputes ranking WITHOUT using LLM model outputs.");
