import fs from "node:fs";
import path from "node:path";

// Run from the repository root:
// npm run eval:groundtruth -- --gt comparison/groundtruth.csv --runs comparison/plan_runs --out comparison/evaluation
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    const key = argv[i].slice(2);
    if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw Error("Missing value for --" + key);
    args[key] = argv[++i];
  }
}
const gtPath = path.resolve(args.gt ?? "comparison/groundtruth.csv");
const runsDir = path.resolve(args.runs ?? "comparison/plan_runs");
const outDir = path.resolve(args.out ?? "comparison/evaluation");
const k = Number(args.k ?? 10);
if (!Number.isInteger(k) || k < 1) throw Error("--k must be a positive integer.");
if (!fs.existsSync(gtPath)) throw Error("Ground Truth not found: " + gtPath);
if (!fs.existsSync(runsDir) || !fs.statSync(runsDir).isDirectory()) throw Error("Plan JSON directory not found: " + runsDir);

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (quoted) throw Error("Unclosed quoted CSV field");
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift();
  if (!headers?.length) throw Error("Empty Ground Truth CSV");
  for (const col of ["case_id", "province", "att_id", "relevant_0_or_1"]) {
    if (!headers.includes(col)) throw Error("Ground Truth missing column: " + col);
  }
  return rows.filter(r => r.some(v => v !== "")).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}
function csv(rows) {
  if (!rows.length) return "\uFEFF";
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const quote = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  return "\uFEFF" + [headers.map(quote).join(","), ...rows.map(r => headers.map(h => quote(r[h])).join(","))].join("\r\n") + "\r\n";
}
function save(file, rows) { fs.writeFileSync(path.join(outDir, file), csv(rows), "utf8"); }
function id(v) { return String(v ?? "").trim(); }
function groupKey(caseId, province) { return id(caseId) + "|" + id(province); }
const provinces = { bangkok: "กรุงเทพมหานคร", chiangmai: "เชียงใหม่", phuket: "ภูเก็ต" };
const gt = new Map(), warnings = [];
for (const r of parseCsv(fs.readFileSync(gtPath, "utf8"))) {
  const key = groupKey(r.case_id, r.province);
  if (!gt.has(key)) gt.set(key, new Map());
  const placeId = id(r.att_id);
  if (!placeId) { warnings.push({ case_id: r.case_id, province: r.province, issue: "missing_gt_id", place_id: "" }); continue; }
  if (/e[+-]?\d+$/i.test(placeId)) warnings.push({ case_id: r.case_id, province: r.province, issue: "scientific_notation_gt_id", place_id: placeId });
  if (!["0", "1"].includes(r.relevant_0_or_1)) warnings.push({ case_id: r.case_id, province: r.province, issue: "unjudged_gt_row", place_id: placeId });
  if (gt.get(key).has(placeId)) warnings.push({ case_id: r.case_id, province: r.province, issue: "duplicate_gt_id", place_id: placeId });
  else gt.get(key).set(placeId, r);
}
const files = fs.readdirSync(runsDir).filter(f => /^travelwish_case\d+_(bangkok|chiangmai|phuket)(?:\(\d+\))?\.json$/i.test(f)).sort();
if (!files.length) throw Error("No travelwish_case*_*.json files found in " + runsDir);
const metrics = [], audit = [];
function getId(p) { return id(p?.attraction?.id ?? p?.place_id ?? p?.att_id ?? p?.id); }
function getName(p) { return id(p?.attraction?.name_th ?? p?.place_name ?? p?.name_th ?? p?.name); }
function inspect(items, labels, context) {
  let hits = 0, judged = 0, unmatched = 0, duplicates = 0;
  const seen = new Set();
  for (const [index, p] of items.entries()) {
    const placeId = getId(p);
    const match = labels.get(placeId);
    const relevance = match?.relevant_0_or_1 ?? "";
    if (seen.has(placeId)) duplicates++;
    seen.add(placeId);
    if (relevance === "1") hits++;
    if (relevance === "0" || relevance === "1") judged++;
    else unmatched++;
    audit.push({ ...context, rank: index + 1, place_id: placeId, place_name: getName(p),
      groundtruth_name: match?.name_th ?? "", relevant: relevance,
      match_status: !match ? "not_in_groundtruth" : (relevance === "0" || relevance === "1" ? "judged" : "unjudged") });
  }
  return { count: items.length, hits, judged, unmatched, duplicates,
    judged_precision: judged ? hits / judged : null,
    coverage: items.length ? judged / items.length : null };
}
const sum = values => values.reduce((a, b) => a + b, 0);
for (const filename of files) {
  const found = filename.match(/^travelwish_case(\d+)_(bangkok|chiangmai|phuket)/i);
  const caseId = found[1], province = provinces[found[2].toLowerCase()];
  const labelMap = gt.get(groupKey(caseId, province));
  if (!labelMap) { warnings.push({ file: filename, issue: "missing_groundtruth" }); continue; }
  let doc;
  try { doc = JSON.parse(fs.readFileSync(path.join(runsDir, filename), "utf8")); }
  catch (e) { warnings.push({ file: filename, issue: "invalid_json", detail: String(e) }); continue; }
  const relevantTotal = [...labelMap.values()].filter(r => r.relevant_0_or_1 === "1").length;
  for (const model of ["gemini", "gpt", "claude"]) {
    const entry = doc.models?.[model];
    if (!entry?.success) { warnings.push({ file: filename, model, issue: "model_not_successful", detail: String(entry?.error ?? "") }); continue; }
    const snapshots = entry.snapshots ?? [];
    const ranked = snapshots.find(s => s.stage === "tdmc_ranking_output")?.data?.ranked ?? [];
    const selected = entry.output?.planner_json ?? [];
    if (!Array.isArray(ranked) || !Array.isArray(selected)) {
      warnings.push({ file: filename, model, issue: "invalid_rank_or_plan" }); continue;
    }
    const attractions = selected.filter(p => p?.place_id);
    const context = { case_id: caseId, province, model, file: filename };
    const top = inspect(ranked.slice(0, k), labelMap, { ...context, stage: "TDMC_TOP_K" });
    const plan = inspect(attractions, labelMap, { ...context, stage: "FINAL_PLAN" });
    const routes = snapshots.find(s => s.stage === "route_optimization")?.data?.summary ?? [];
    const routeKm = Array.isArray(routes) ? routes.map(x => Number(x.after_km)).filter(Number.isFinite) : [];
    const returnKm = Array.isArray(routes) ? routes.map(x => Number(x.return_to_accommodation_km)).filter(Number.isFinite) : [];
    if (top.count < k) warnings.push({ file: filename, model, issue: "fewer_than_k_tdmc", detail: String(top.count) });
    if (plan.unmatched) warnings.push({ file: filename, model, issue: "unjudged_plan_places", detail: String(plan.unmatched) });
    metrics.push({ ...context, tdmc_k: top.count, tdmc_hits: top.hits,
      tdmc_precision_at_k: top.count === k && !top.unmatched ? top.hits / k : "",
      tdmc_recall_at_k: relevantTotal && !top.unmatched ? top.hits / relevantTotal : "",
      tdmc_coverage: top.coverage, plan_attractions: plan.count,
      plan_hits: plan.hits, plan_coverage: plan.coverage,
      plan_precision_judged: plan.judged && !plan.unmatched ? plan.hits / plan.count : "",
      plan_duplicates: plan.duplicates, gt_relevant_total: relevantTotal,
      route_days: Array.isArray(routes) ? routes.length : 0,
      route_km: routeKm.length ? sum(routeKm) : "",
      return_km: returnKm.length ? sum(returnKm) : "", elapsed_ms: doc.elapsed_ms ?? "" });
  }
}
fs.mkdirSync(outDir, { recursive: true });
save("metrics_by_model.csv", metrics);
save("place_audit.csv", audit);
save("data_warnings.csv", warnings);
const summary = ["gemini", "gpt", "claude"].map(model => {
  const rows = metrics.filter(r => r.model === model);
  const mean = field => { const values = rows.map(r => r[field]).filter(v => typeof v === "number" && Number.isFinite(v));
    return values.length ? sum(values) / values.length : ""; };
  return { model, runs: rows.length, tdmc_precision_at_k_mean: mean("tdmc_precision_at_k"),
    tdmc_recall_at_k_mean: mean("tdmc_recall_at_k"),
    plan_precision_judged_mean: mean("plan_precision_judged"),
    plan_coverage_mean: mean("plan_coverage"), route_km_mean: mean("route_km") };
});
save("model_summary.csv", summary);
console.log("JSON files:", files.length, "| evaluated model outputs:", metrics.length, "| GT groups:", gt.size);
console.table(summary);
console.log("Warnings:", warnings.length, "| output directory:", outDir);
console.log("Important: TDMC ranking is shared across AI models. Its Precision@K is not model-specific.");
console.log("Items not present in Ground Truth remain unjudged; they are not automatically irrelevant.");
