/**
 * TravelWish: Precision@K, Recall@K, F1-score@K from REAL production TDMC Top 30.
 *
 * npm run eval:tdmc:production-graphs
 * npm run eval:tdmc:production-graphs -- --runs comparison/plan_runs --gt comparison/groundtruth.csv
 *
 * Input: 21 travelwish_case{1..7}_{bangkok,chiangmai,phuket}*.json
 *        plus the annotated binary groundtruth.csv (0/1 labels).
 * Output: comparison/figures/production_tdmc/{*.svg,index.html,*.csv,summary.json}
 *
 * This script NEVER reruns or alters the TDMC ranking. For every saved Top 30,
 * it evaluates the first K IDs against the ground truth for the same case/province.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
function argument(name, defaultValue) {
  const index = args.indexOf('--' + name);
  if (index < 0) return defaultValue;
  if (!args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error('Missing value for --' + name);
  }
  return args[index + 1];
}

const runsDir = path.resolve(argument('runs', 'comparison/plan_runs'));
const groundTruthPath = path.resolve(argument('gt', 'comparison/groundtruth.csv'));
const outputDir = path.resolve(argument('out', 'comparison/figures/production_tdmc'));
const kValues = [5, 10, 15, 20, 25, 30];
const provinceBySlug = {
  bangkok: 'กรุงเทพมหานคร',
  chiangmai: 'เชียงใหม่',
  phuket: 'ภูเก็ต',
};
const filePattern = /^travelwish_case([1-7])_(bangkok|chiangmai|phuket)(?:\(\d+\))?\.json$/i;

function csvRows(raw) {
  const text = raw.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('Unclosed quoted value in groundtruth.csv');
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift();
  if (!header) throw new Error('Ground Truth CSV is empty');
  for (const required of ['case_id', 'province', 'att_id', 'relevant_0_or_1']) {
    if (!header.includes(required)) throw new Error('Missing Ground Truth column: ' + required);
  }
  return rows.map((values, index) => {
    if (values.length !== header.length) {
      throw new Error('Malformed Ground Truth CSV row ' + (index + 2));
    }
    return Object.fromEntries(header.map((key, i) => [key, values[i]]));
  });
}

function readGroundTruth() {
  if (!fs.existsSync(groundTruthPath)) {
    throw new Error('Missing groundtruth.csv: ' + groundTruthPath);
  }
  const groups = new Map();
  const rows = csvRows(fs.readFileSync(groundTruthPath, 'utf8'));
  for (const row of rows) {
    const caseId = Number(String(row.case_id).replace(/^case\s*/i, '').trim());
    const province = String(row.province).trim().normalize('NFC');
    const id = String(row.att_id).trim();
    const relevance = String(row.relevant_0_or_1).trim();
    if (!Number.isInteger(caseId) || caseId < 1 || caseId > 7) {
      throw new Error('Unexpected Ground Truth case ID: ' + row.case_id);
    }
    if (!Object.values(provinceBySlug).includes(province)) {
      throw new Error('Unexpected Ground Truth province: ' + province);
    }
    if (!id || /e[+-]?\d+$/i.test(id)) {
      throw new Error('Missing or scientific-notation place ID: ' + id);
    }
    if (relevance !== '0' && relevance !== '1') {
      throw new Error('Relevance must be 0 or 1 for ' + caseId + ' / ' + province + ' / ' + id);
    }
    const key = caseId + '|' + province;
    if (!groups.has(key)) groups.set(key, new Map());
    const labels = groups.get(key);
    if (labels.has(id)) throw new Error('Duplicate Ground Truth place ID: ' + key + ' / ' + id);
    labels.set(id, Number(relevance));
  }
  return { groups, rowCount: rows.length };
}

// Extract the exact JSON array following "TDMC CANDIDATES:" in the saved prompt.
function extractOriginalTop30(prompt) {
  const marker = 'TDMC CANDIDATES:';
  const markerIndex = prompt.indexOf(marker);
  if (markerIndex < 0) throw new Error('TDMC CANDIDATES not found in recorded prompt');
  const first = prompt.indexOf('[', markerIndex + marker.length);
  if (first < 0) throw new Error('TDMC CANDIDATES JSON array missing');
  let depth = 0;
  let insideString = false;
  let escaped = false;
  for (let i = first; i < prompt.length; i++) {
    const char = prompt[i];
    if (escaped) { escaped = false; continue; }
    if (insideString && char === '\\') { escaped = true; continue; }
    if (char === '"') { insideString = !insideString; continue; }
    if (insideString) continue;
    if (char === '[') depth++;
    if (char === ']') {
      depth--;
      if (depth === 0) {
        const candidates = JSON.parse(prompt.slice(first, i + 1));
        if (!Array.isArray(candidates) || candidates.length !== 30) {
          throw new Error('Expected exactly 30 original TDMC candidates');
        }
        const ids = candidates.map((item, index) => {
          if (Number(item.rank) !== index + 1) {
            throw new Error('TDMC candidate ranks must be 1 through 30');
          }
          return String(item.attraction?.id ?? item.attraction?.att_id ?? '').trim();
        });
        if (ids.some(id => !id) || new Set(ids).size !== 30) {
          throw new Error('TDMC candidates have blank or duplicate place IDs');
        }
        return ids;
      }
    }
  }
  throw new Error('Could not parse the complete TDMC candidate array');
}

function evaluate() {
  if (!fs.existsSync(runsDir)) {
    throw new Error('Missing run directory: ' + runsDir + '\nPut all 21 JSON files in this folder.');
  }
  const filenames = fs.readdirSync(runsDir).filter(name => filePattern.test(name)).sort();
  if (filenames.length !== 21) {
    throw new Error('Expected 21 travelwish_case*.json files in ' + runsDir + ', found ' + filenames.length);
  }
  const { groups, rowCount } = readGroundTruth();
  if (groups.size !== 21) throw new Error('Expected 21 case/province groups in groundtruth.csv, found ' + groups.size);

  const uniqueRuns = new Set();
  const details = [];
  for (const filename of filenames) {
    const match = filename.match(filePattern);
    const caseId = Number(match[1]);
    const province = provinceBySlug[match[2].toLowerCase()];
    const key = caseId + '|' + province;
    if (uniqueRuns.has(key)) throw new Error('Duplicate JSON runs for ' + key);
    uniqueRuns.add(key);
    const log = JSON.parse(fs.readFileSync(path.join(runsDir, filename), 'utf8'));
    if (log.trip_input?.province && log.trip_input.province !== province) {
      throw new Error('Filename and trip province disagree in ' + filename);
    }
    const prompt = log.models?.gemini?.rounds?.[0]?.prompt ??
      log.models?.gpt?.rounds?.[0]?.prompt ??
      log.models?.claude?.rounds?.[0]?.prompt;
    if (typeof prompt !== 'string' || !prompt) {
      throw new Error('No saved production planner prompt in ' + filename);
    }
    const profile = prompt.match(/"profile"\s*:\s*\{\s*"name"\s*:\s*"test(\d+)"/i);
    if (!profile || Number(profile[1]) !== caseId) {
      throw new Error('Saved user profile does not match filename: ' + filename);
    }

    const top30 = extractOriginalTop30(prompt);
    const labels = groups.get(key);
    if (!labels) throw new Error('Missing Ground Truth for ' + key);
    const relevantCount = [...labels.values()].filter(label => label === 1).length;
    if (relevantCount === 0) throw new Error('No relevant places in Ground Truth for ' + key);
    const unjudged = top30.filter(id => !labels.has(id));
    if (unjudged.length) {
      throw new Error('Unjudged TDMC place IDs in ' + filename + ': ' + unjudged.join(', '));
    }

    for (const k of kValues) {
      const truePositive = top30.slice(0, k).filter(id => labels.get(id) === 1).length;
      const precision = truePositive / k;
      const recall = truePositive / relevantCount;
      const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
      details.push({
        case_id: caseId,
        province,
        k,
        true_positive: truePositive,
        relevant_count: relevantCount,
        precision,
        recall,
        f1,
      });
    }
    console.log('Verified Case ' + caseId + ' — ' + province + ' (30 original candidates)');
  }

  const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
  const summary = kValues.map(k => {
    const selected = details.filter(row => row.k === k);
    return {
      k,
      precision: mean(selected.map(row => row.precision)),
      recall: mean(selected.map(row => row.recall)),
      f1: mean(selected.map(row => row.f1)),
    };
  });

  return { details, summary, ground_truth_rows: rowCount, runs: uniqueRuns.size };
}

function saveCsv(filename, rows, fields) {
  const quote = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  const lines = [fields.map(quote).join(',')];
  for (const row of rows) {
    lines.push(fields.map(field => quote(row[field])).join(','));
  }
  fs.writeFileSync(path.join(outputDir, filename), '\uFEFF' + lines.join('\r\n') + '\r\n', 'utf8');
}

const colors = { precision: '#7450A4', recall: '#3478B9', f1: '#53A38E' };
const xmlEscape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function makeChart(summary, metric, metricTitle, filename) {
  const width = 1200, height = 700;
  const left = 150, right = 1120, top = 145, bottom = 575;
  const values = summary.map(row => row[metric]);
  const yMax = Math.max(0.1, Math.ceil(Math.max(...values) * 1.12 * 10) / 10);
  const x = i => left + i * (right - left) / (summary.length - 1);
  const y = v => bottom - v * (bottom - top) / yMax;
  const color = colors[metric];
  const segments = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">',
    '<rect width="' + width + '" height="' + height + '" fill="#FFFFFF"/>',
    '<text x="635" y="55" text-anchor="middle" fill="#263041" font-family="Arial, sans-serif" font-size="28" font-weight="bold">' + xmlEscape('TDMC-APD: ' + metricTitle) + '</text>',
    '<text x="635" y="83" text-anchor="middle" fill="#667085" font-family="Arial, sans-serif" font-size="16">Production Top 30 — 21 runs (7 profiles × 3 provinces)</text>',
  ];
  for (let tick = 0; tick <= 5; tick++) {
    const value = tick * yMax / 5;
    const yy = y(value);
    segments.push('<line x1="' + left + '" y1="' + yy + '" x2="' + right + '" y2="' + yy + '" stroke="#E4E7EC" stroke-dasharray="5 6"/>');
    segments.push('<text x="' + (left - 15) + '" y="' + (yy + 6) + '" font-family="Arial, sans-serif" font-size="17" text-anchor="end" fill="#475467">' + value.toFixed(3) + '</text>');
  }
  for (let i = 0; i < summary.length; i++) {
    segments.push('<text x="' + x(i) + '" y="' + (bottom + 38) + '" font-family="Arial, sans-serif" font-size="19" text-anchor="middle" fill="#344054">' + summary[i].k + '</text>');
  }
  const points = values.map((value, i) => x(i) + ',' + y(value)).join(' ');
  segments.push('<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>');
  for (let i = 0; i < values.length; i++) {
    segments.push('<circle cx="' + x(i) + '" cy="' + y(values[i]) + '" r="9" fill="' + color + '" stroke="#FFFFFF" stroke-width="2"/>');
    segments.push('<text x="' + x(i) + '" y="' + (y(values[i]) - 21) + '" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="' + color + '" text-anchor="middle">' + values[i].toFixed(3) + '</text>');
  }
  segments.push('<text x="635" y="652" font-family="Arial, sans-serif" font-size="22" text-anchor="middle" fill="#263041">Number of recommended attractions (K)</text>');
  segments.push('<text x="48" y="355" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#263041" transform="rotate(-90 48 355)">' + xmlEscape(metricTitle) + '</text>');
  segments.push('</svg>');
  const svg = segments.join('\n');
  fs.writeFileSync(path.join(outputDir, filename), svg, 'utf8');
  return { filename, title: metricTitle, src: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64') };
}

function makeHtml(charts) {
  const chartBlocks = charts.map((chart, i) => [
    '<section class="chart">',
    '<img id="chart-' + i + '" alt="' + chart.title + '" src="' + chart.src + '"/>',
    '<button type="button" data-target="chart-' + i + '" data-filename="' + chart.filename.replace('.svg', '.png') + '">Download high-resolution PNG</button>',
    '</section>',
  ].join('\n')).join('\n');
  const html = [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '<title>TravelWish Production TDMC Evaluation</title>',
    '<style>body{font-family:Arial,sans-serif;background:#f6f7fb;margin:0;padding:28px;color:#293548}h1,p{text-align:center}.chart{max-width:1200px;margin:24px auto;background:#fff;border-radius:16px;padding:14px;text-align:center;box-shadow:0 2px 12px #0001}.chart img{width:100%;height:auto;display:block}button{background:#7450A4;color:#fff;border:0;border-radius:10px;padding:12px 20px;margin:12px;cursor:pointer}button:hover{background:#5b3a82}</style>',
    '</head><body><h1>TravelWish — Production TDMC Top 30</h1>',
    '<p>Precision@K, Recall@K and F1-score@K computed from the original 21 recorded runs.</p>',
    chartBlocks,
    '<script>',
    'document.querySelectorAll("button[data-target]").forEach(button=>button.addEventListener("click",async()=>{',
    'const img=document.getElementById(button.dataset.target); if(!img.complete)await img.decode();',
    'const canvas=document.createElement("canvas");canvas.width=2400;canvas.height=1400;',
    'const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);',
    'canvas.toBlob(blob=>{if(!blob){alert("Could not export PNG");return;}const url=URL.createObjectURL(blob);',
    'const link=document.createElement("a");link.href=url;link.download=button.dataset.filename;link.click();',
    'setTimeout(()=>URL.revokeObjectURL(url),3000);},"image/png");',
    '}));',
    '</script></body></html>',
  ].join('\n');
  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
}

function main() {
  const result = evaluate();
  fs.mkdirSync(outputDir, { recursive: true });
  saveCsv('metrics_by_case.csv', result.details, ['case_id','province','k','true_positive','relevant_count','precision','recall','f1']);
  saveCsv('metrics_summary.csv', result.summary, ['k','precision','recall','f1']);
  fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify({
    source: 'production_createPlanner',
    methodology: 'Original saved TDMC Top 30, first K IDs compared with binary Ground Truth for matching case and province. Arithmetic mean of 21 per-run metrics; F1 computed per run before averaging.',
    ground_truth_rows: result.ground_truth_rows,
    runs: result.runs,
    metrics: result.summary,
  }, null, 2) + '\n', 'utf8');

  const charts = [
    makeChart(result.summary, 'precision', 'Precision@K', 'precision_at_k.svg'),
    makeChart(result.summary, 'recall', 'Recall@K', 'recall_at_k.svg'),
    makeChart(result.summary, 'f1', 'F1-score@K', 'f1_at_k.svg'),
  ];
  makeHtml(charts);

  console.log('\nTravelWish production TDMC evaluation (mean of ' + result.runs + ' runs)');
  console.table(result.summary.map(row => ({
    K: row.k, Precision: row.precision.toFixed(4),
    Recall: row.recall.toFixed(4), 'F1-score': row.f1.toFixed(4),
  })));
  console.log('\nOpen the charts: ' + path.join(outputDir, 'index.html'));
  console.log('Also generated 3 SVG figures, two CSV files, and summary.json.');
}

try { main(); } catch (error) { console.error('\nERROR:', error.message); process.exitCode = 1; }
