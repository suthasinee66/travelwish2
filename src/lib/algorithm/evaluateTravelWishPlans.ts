/**
 * Reproducible offline TravelWish evaluation.
 *
 * Input: JSON array of runs, or { "runs": [...] }.
 * This deliberately does not query LLM/Places. Feed it frozen, independently
 * verified metadata and actual planner outputs; unverified fields are NOT passes.
 *
 * npm run eval:plans -- comparison/plan_runs.json
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type PlaceKind = "attraction" | "restaurant" | "accommodation";
type Status = "pass" | "fail" | "unknown";
type Place = {
  id?: string; place_id?: string; att_id?: string; acc_id?: string;
  name?: string; kind: PlaceKind; province?: string;
  verified?: boolean | null;
  travel_type?: string[]; activities?: string[]; atmosphere?: string[];
  budget?: string[]; travel_companion?: string[];
  day?: number; start?: string; end?: string; open?: string; close?: string;
  duration_minutes?: number; travel_minutes_from_previous?: number;
  distance_km_from_previous?: number;
  cost_thb?: number;
};
type Profile = {
  travel_type?: string[]; activities?: string[]; atmosphere?: string[];
  budget_tags?: string[]; companion_tags?: string[];
};
type Run = {
  case_id: string; province: string; model: string; run_id: string;
  expected_days: number; budget_thb?: number;
  profile: Profile; places: Place[];
  // Extra constraints must be checked externally with evidence, not by an LLM.
  constraints?: { name: string; status: Status; evidence?: string }[];
  api?: { input_tokens?: number; output_tokens?: number; cost_usd?: number;
    latency_ms?: number; request_success?: boolean };
};
type Metric = { numerator: number; denominator: number; pct: number | null };
const proportion = (a: number,b: number): Metric =>
  ({ numerator:a,denominator:b,pct:b ? +(100*a/b).toFixed(2) : null });
const str = (v: unknown) => String(v ?? "").trim();
const tags = (v: unknown): string[] => Array.isArray(v)
  ? v.map(str).filter(Boolean) : [];
const placeId = (p: Place) => str(p.id || p.place_id || p.att_id || p.acc_id)
  || `no-id:${str(p.name)}:${str(p.kind)}`;
const overlap = (a: string[],b: string[]) =>
  a.some(x => b.includes(x));
function minutes(s?: string): number | null {
  if (!s || !/^([01]?\\d|2[0-3]):[0-5]\\d$/.test(s)) return null;
  const [h,m] = s.split(":").map(Number);
  return 60*h+m;
}
function statusCounts(values: Status[]) {
  const pass = values.filter(x=>x==="pass").length;
  const fail = values.filter(x=>x==="fail").length;
  const unknown = values.length-pass-fail;
  return { pass, fail, unknown, rate: proportion(pass,values.length) };
}
function assess(run: Run) {
  const places = Array.isArray(run.places) ? run.places : [];
  const attractions = places.filter(p=>p.kind==="attraction");
  const validity: Status[] = places.map(p =>
    p.verified === true ? "pass" : p.verified === false ? "fail" : "unknown");
  const provinces: Status[] = places.map(p => !p.province ? "unknown"
    : str(p.province)===str(run.province) ? "pass" : "fail");
  const ids = new Set<string>();
  let duplicates=0;
  for(const p of places) {
    const id=placeId(p);
    if(ids.has(id)) duplicates++;
    ids.add(id);
  }
  const profileFields: Array<[string[],keyof Place]> = [
    [tags(run.profile?.travel_type),"travel_type"],
    [tags(run.profile?.activities),"activities"],
    [tags(run.profile?.atmosphere),"atmosphere"],
    [tags(run.profile?.budget_tags),"budget"],
    [tags(run.profile?.companion_tags),"travel_companion"],
  ];
  const requested = profileFields.filter(([p])=>p.length);
  const matching: Status[] = attractions.map(place => {
    if(!requested.length) return "unknown";
    const known=requested.filter(([,key])=>tags(place[key]).length);
    if(!known.length) return "unknown";
    return known.some(([values,key])=>overlap(values,tags(place[key])))
      ? "pass" : known.length===requested.length ? "fail" : "unknown";
  });
  const covered = requested.flatMap(([values,key])=>values.map(tag => ({
    tag, key, covered: attractions.some(p=>tags(p[key]).includes(tag))
  })));
  const timeStatuses: Status[]=[];
  const routeKm: number[]=[]; const routeMin: number[]=[];
  const days = new Set<number>();
  for (const p of places) {
    if(Number.isInteger(p.day) && (p.day as number)>0) days.add(p.day as number);
    if(typeof p.distance_km_from_previous==="number" && p.distance_km_from_previous>=0)
      routeKm.push(p.distance_km_from_previous);
    if(typeof p.travel_minutes_from_previous==="number" && p.travel_minutes_from_previous>=0)
      routeMin.push(p.travel_minutes_from_previous);
    const start=minutes(p.start), end=minutes(p.end);
    const open=minutes(p.open), close=minutes(p.close);
    if(start===null || end===null || open===null || close===null
      || p.duration_minutes==null) {timeStatuses.push("unknown");continue;}
    const valid = end>start && start>=open && end<=close
      && end-start>=p.duration_minutes
      && (p.travel_minutes_from_previous==null ||
         p.travel_minutes_from_previous>=0);
    timeStatuses.push(valid?"pass":"fail");
  }
  const costs=places.map(p=>p.cost_thb);
  const completeCosts=places.length>0 && costs.every(
    c=>typeof c==="number" && Number.isFinite(c) && c>=0);
  const costTotal=completeCosts ? (costs as number[]).reduce((a,b)=>a+b,0) : null;
  const budgetStatus: Status = run.budget_thb==null || costTotal===null
    ? "unknown" : costTotal<=run.budget_thb?"pass":"fail";
  const dayStatus: Status = days.size===0 ? "unknown"
    : Math.max(...days)===run.expected_days && days.size===run.expected_days
      ? "pass" : "fail";
  const custom=(run.constraints ?? []).map(c=>c.status);
  const constraints: Status[]=[...provinces,dayStatus,budgetStatus,...custom];
  // All hard constraints must be verifiably passed. Unknown never counts as pass.
  const finalPass = Boolean(places.length) && constraints.length>0
    && constraints.every(s=>s==="pass") && validity.every(s=>s==="pass")
    && timeStatuses.every(s=>s==="pass");
  return {
    case_id:run.case_id,province:run.province,model:run.model,run_id:run.run_id,
    place_count:places.length,attraction_count:attractions.length,
    profile_match:statusCounts(matching),
    preference_coverage:proportion(covered.filter(v=>v.covered).length,covered.length),
    place_validity:statusCounts(validity),
    province_consistency:statusCounts(provinces),
    duplicates,duplicate_rate:proportion(duplicates,places.length),
    time_feasibility:statusCounts(timeStatuses),
    constraint_satisfaction:statusCounts(constraints),
    day_status:dayStatus,budget_status:budgetStatus,
    cost_total_thb:costTotal,
    route_distance_km:routeKm.length?+(routeKm.reduce((a,b)=>a+b,0).toFixed(3)):null,
    route_travel_minutes:routeMin.length?routeMin.reduce((a,b)=>a+b,0):null,
    final_plan_pass:finalPass,
    generation_success:run.api?.request_success ?? null,
    input_tokens:run.api?.input_tokens ?? null,
    output_tokens:run.api?.output_tokens ?? null,
    cost_usd:run.api?.cost_usd ?? null,
    latency_ms:run.api?.latency_ms ?? null,
  };
}
function csvEscape(value: unknown) {
  const s=value==null?"":typeof value==="object"?JSON.stringify(value):String(value);
  return /[",\\n\\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
}
function toCsv(rows: Record<string,unknown>[]) {
  if(!rows.length)return "";
  const fields=Object.keys(rows[0]);
  return [fields.join(","), ...rows.map(r=>fields.map(k=>csvEscape(r[k])).join(","))].join("\n")+"\n";
}
async function main() {
  const inputFile=process.argv[2];
  if(!inputFile)throw Error("Usage: npm run eval:plans -- comparison/plan_runs.json");
  const raw=JSON.parse(await fs.readFile(inputFile,"utf8"));
  const runs: Run[]=Array.isArray(raw)?raw:raw.runs;
  if(!Array.isArray(runs) || !runs.length)throw Error("Expected non-empty runs array");
  for(const [i,r] of runs.entries()) {
    if(!r.case_id||!r.province||!r.model||!r.run_id
       ||!Number.isInteger(r.expected_days)||r.expected_days<1
       ||!Array.isArray(r.places)) throw Error(`Invalid run index ${i}`);
    for(const c of r.constraints??[]) {
      if(!["pass","fail","unknown"].includes(c.status))
        throw Error(`Invalid constraint status in run index ${i}`);
    }
  }
  const evaluated=runs.map(assess);
  const outputDir=path.join(process.cwd(),"comparison","plan_evaluation");
  await fs.mkdir(outputDir,{recursive:true});
  await fs.writeFile(path.join(outputDir,"results.json"),
    JSON.stringify({method:"TravelWish offline rule-based evaluator v1",runs:evaluated},null,2));
  const flat=evaluated.map(r=>({
    case_id:r.case_id,province:r.province,model:r.model,run_id:r.run_id,
    place_count:r.place_count,profile_match_pct:r.profile_match.rate.pct,
    profile_unknown:r.profile_match.unknown,
    preference_coverage_pct:r.preference_coverage.pct,
    place_validity_pct:r.place_validity.rate.pct,
    place_unknown:r.place_validity.unknown,
    province_consistency_pct:r.province_consistency.rate.pct,
    province_unknown:r.province_consistency.unknown,
    duplicate_rate_pct:r.duplicate_rate.pct,
    constraint_satisfaction_pct:r.constraint_satisfaction.rate.pct,
    constraint_unknown:r.constraint_satisfaction.unknown,
    time_feasibility_pct:r.time_feasibility.rate.pct,
    time_unknown:r.time_feasibility.unknown,
    day_status:r.day_status,budget_status:r.budget_status,
    final_plan_pass:r.final_plan_pass,
    cost_total_thb:r.cost_total_thb,
    route_distance_km:r.route_distance_km,
    route_travel_minutes:r.route_travel_minutes,
    generation_success:r.generation_success,
    input_tokens:r.input_tokens,output_tokens:r.output_tokens,
    cost_usd:r.cost_usd,latency_ms:r.latency_ms,
  }));
  await fs.writeFile(path.join(outputDir,"results.csv"),toCsv(flat));
  console.log(`Evaluated ${evaluated.length} runs. Output: ${outputDir}`);
  console.log(`Final plan pass: ${evaluated.filter(r=>r.final_plan_pass).length}/${evaluated.length}`);
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error(e);process.exitCode=1;});
export { assess };
