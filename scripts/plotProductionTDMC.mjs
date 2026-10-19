/** Plot Precision/Recall/F1 from a FRESH TDMC ranking against current Supabase.
 * Run via npm run eval:tdmc:production-graphs (first reranks through TypeScript).
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

const rerankedPath = path.resolve(argument('ranking', 'comparison/figures/production_tdmc/reranked_tdmc_top30.json'));
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
  if (!fs.existsSync(rerankedPath)) throw new Error('Run TDMC ranking first: npx tsx src/lib/algorithm/rerunProductionTDMC7Cases.ts');
  const reranked = JSON.parse(fs.readFileSync(rerankedPath, 'utf8'));
  if (reranked.source !== 'current_supabase_tdmc_rerun' || reranked.records?.length !== 21) throw new Error('Expected 21 freshly reranked cases');
  const { groups, rowCount } = readGroundTruth();
  const details = [];
  for (const record of reranked.records) {
    const {case_id:caseId,province,top30,relevant_count:relevantCount} = record;
    const group = caseId + '|' + province, labels = groups.get(group);
    if (!labels) throw new Error('Ground Truth missing ' + group);
    if (top30.length !== 30 || new Set(top30).size !== 30) throw new Error('Invalid fresh Top 30 for ' + group);
    if (top30.some(id => !labels.has(id))) throw new Error('Unjudged fresh TDMC candidate ' + group);
    const actualRelevant = [...labels.entries()].filter(([id,value]) => value === 1).length;
    // Fresh runner only ranks labelled candidates existing in current Supabase; use its documented denominator.
    if (!Number.isInteger(relevantCount) || relevantCount < 1 || relevantCount > actualRelevant) throw new Error('Invalid relevant count '+group);
    for (const k of kValues) {
      const truePositive = top30.slice(0,k).filter(id => labels.get(id) === 1).length;
      const precision = truePositive/k;
      const recall = truePositive/relevantCount;
      const f1 = precision+recall ? 2*precision*recall/(precision+recall) : 0;
      details.push({case_id:caseId,province,k,true_positive:truePositive,relevant_count:relevantCount,precision,recall,f1});
    }
  }
  const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
  const summary = kValues.map(k => {
    const selected=details.filter(r=>r.k===k);
    if(selected.length!==21)throw Error('Missing experiments for K='+k);
    return {k,precision:mean(selected.map(r=>r.precision)),recall:mean(selected.map(r=>r.recall)),f1:mean(selected.map(r=>r.f1))};
  });
  return {details,summary,ground_truth_rows:rowCount,runs:reranked.records.length};
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
    '<text x="635" y="83" text-anchor="middle" fill="#667085" font-family="Arial, sans-serif" font-size="16">Fresh TDMC Top 30 — 21 groups (7 profiles × 3 provinces)</text>',
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


// -----------------------------------------------------------
// Three additional SVG presentations with ALL THREE metrics.
// Every variant uses the same absolute 0–1 metric values;
// the heatmap uses an explicit shared 0–1 color scale.
// -----------------------------------------------------------
const combinedSeries = [
  { key: 'precision', label: 'Precision@K', color: '#7450A4' },
  { key: 'recall', label: 'Recall@K', color: '#3478B9' },
  { key: 'f1', label: 'F1-score@K', color: '#53A38E' },
];
const svgText = (x, y, value, options = {}) =>
  '<text x="' + x + '" y="' + y + '" text-anchor="' + (options.anchor || 'middle') +
  '" font-family="Arial, sans-serif" font-size="' + (options.size || 16) +
  '" font-weight="' + (options.weight || 400) + '" fill="' + (options.color || '#344054') +
  '">' + xmlEscape(value) + '</text>';
function combinedFrame(title, subtitle, width = 1200, height = 720) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height +
      '" viewBox="0 0 ' + width + ' ' + height + '">',
    '<rect width="' + width + '" height="' + height + '" fill="#FFFFFF"/>',
    '<rect x="16" y="16" width="' + (width - 32) + '" height="' + (height - 32) +
      '" rx="18" fill="#FCFBFF" stroke="#E8E4EF"/>',
    svgText(width / 2, 60, title, { size: 27, weight: 700, color: '#283448' }),
    svgText(width / 2, 89, subtitle, { size: 15, color: '#667085' }),
  ];
}
function combinedLegend(svg, y = 130) {
  for (let i = 0; i < combinedSeries.length; i++) {
    const item = combinedSeries[i], x = 292 + i * 242;
    svg.push('<circle cx="' + x + '" cy="' + (y - 5) + '" r="7" fill="' + item.color + '"/>');
    svg.push(svgText(x + 17, y, item.label, { anchor: 'start', size: 16, weight: 600 }));
  }
}
function saveCombinedSvg(filename, title, parts) {
  parts.push('</svg>');
  const svg = parts.join('\n');
  fs.writeFileSync(path.join(outputDir, filename), svg, 'utf8');
  return {
    filename,
    title,
    src: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'),
  };
}
function combinedGrid(svg, left, right, top, bottom, yMax = 1) {
  for (let i = 0; i <= 5; i++) {
    const value = i * yMax / 5, y = bottom - (bottom - top) * i / 5;
    svg.push('<line x1="' + left + '" x2="' + right + '" y1="' + y + '" y2="' + y +
      '" stroke="#E4E7EC" stroke-dasharray="5 6"/>');
    svg.push(svgText(left - 17, y + 6, value.toFixed(1), { anchor: 'end', size: 15, color: '#667085' }));
  }
}
function makeCombinedLine(summary) {
  const svg = combinedFrame('TDMC-APD: Precision, Recall & F1-score', 'Design A — Combined line chart · 21 recorded production runs');
  combinedLegend(svg);
  const left = 145, right = 1110, top = 185, bottom = 595;
  const xp = i => left + (right - left) * i / (summary.length - 1);
  const yp = value => bottom - value * (bottom - top);
  combinedGrid(svg, left, right, top, bottom);
  summary.forEach((row, i) => svg.push(svgText(xp(i), bottom + 36, row.k, { size: 18 })));
  for (const series of combinedSeries) {
    const points = summary.map((row, i) => xp(i) + ',' + yp(row[series.key])).join(' ');
    svg.push('<polyline points="' + points + '" fill="none" stroke="' + series.color +
      '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>');
    summary.forEach((row, i) => {
      const x = xp(i), y = yp(row[series.key]);
      svg.push('<circle cx="' + x + '" cy="' + y + '" r="7.5" fill="' + series.color +
        '" stroke="#FFFFFF" stroke-width="2"/>');
      // Offset labels to avoid overlap between closely-spaced Recall and F1.
      const labelOffset = series.key === 'recall' ? 21 : -17;
      svg.push(svgText(x, y + labelOffset, row[series.key].toFixed(3), {
        size: 15, weight: 700, color: series.color,
      }));
    });
  }
  svg.push(svgText(628, 675, 'Number of recommended attractions (K)', { size: 20 }));
  return saveCombinedSvg('combined_line.svg', 'Combined line chart', svg);
}
function makeCombinedBars(summary) {
  const svg = combinedFrame('TDMC-APD: Precision, Recall & F1-score', 'Design B — Grouped columns · common 0–1 value axis');
  combinedLegend(svg);
  const left = 145, right = 1110, top = 185, bottom = 595;
  combinedGrid(svg, left, right, top, bottom);
  const stride = (right - left) / summary.length;
  const barWidth = 28, gap = 6;
  summary.forEach((row, i) => {
    const center = left + stride * (i + 0.5);
    svg.push(svgText(center, bottom + 36, row.k, { size: 18 }));
    combinedSeries.forEach((series, j) => {
      const value = row[series.key], height = value * (bottom - top);
      const x = center + (j - 1) * (barWidth + gap) - barWidth / 2;
      const y = bottom - height;
      svg.push('<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' +
        height + '" rx="5" fill="' + series.color + '"/>');
      svg.push(svgText(x + barWidth / 2, y - 11, value.toFixed(3), {
        size: 12, weight: 700, color: series.color,
      }));
    });
  });
  svg.push(svgText(628, 675, 'Number of recommended attractions (K)', { size: 20 }));
  return saveCombinedSvg('combined_grouped_bars.svg', 'Grouped bar chart', svg);
}
function makeCombinedHeatmap(summary) {
  const svg = combinedFrame('TDMC-APD: Precision, Recall & F1-score', 'Design C — Value heatmap · shared 0–1 color scale');
  const left = 210, top = 215, cellWidth = 145, cellHeight = 100, gap = 10;
  for (let i = 0; i < summary.length; i++) {
    const x = left + i * (cellWidth + gap);
    svg.push(svgText(x + cellWidth / 2, top - 24, 'K = ' + summary[i].k, { size: 18, weight: 700 }));
  }
  // The background color intensity uses the *same fixed* 0–1 scale
  // for every cell; hue distinguishes each of the three metrics.
  for (let j = 0; j < combinedSeries.length; j++) {
    const series = combinedSeries[j], y = top + j * (cellHeight + gap);
    svg.push('<rect x="42" y="' + (y + 33) + '" width="12" height="20" rx="4" fill="' + series.color + '"/>');
    svg.push(svgText(63, y + 49, series.label, { anchor: 'start', size: 17, weight: 600 }));
    for (let i = 0; i < summary.length; i++) {
      const value = summary[i][series.key], x = left + i * (cellWidth + gap);
      const opacity = (0.10 + 0.85 * value).toFixed(3);
      svg.push('<rect x="' + x + '" y="' + y + '" width="' + cellWidth +
        '" height="' + cellHeight + '" rx="12" fill="' + series.color + '" fill-opacity="' + opacity + '"/>');
      svg.push(svgText(x + cellWidth / 2, y + 58, value.toFixed(4), {
        size: 22, weight: 700, color: '#253348',
      }));
    }
  }
  svg.push(svgText(628, 630, 'Darker cell = higher metric value (same 0–1 scale for all metrics)', {
    size: 17, color: '#667085',
  }));
  return saveCombinedSvg('combined_heatmap.svg', 'Heatmap comparison', svg);
}

function main() {
  const result = evaluate();
  fs.mkdirSync(outputDir, { recursive: true });
  saveCsv('metrics_by_case.csv', result.details, ['case_id','province','k','true_positive','relevant_count','precision','recall','f1']);
  saveCsv('metrics_summary.csv', result.summary, ['k','precision','recall','f1']);
  fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify({
    source: 'current_supabase_tdmc_rerun',
    methodology: 'Fresh production rankPlacesTDMC (0.2/0.3/0.5), ranking current Supabase attractions matched to binary Ground Truth. Mean of 21 cases x provinces; F1 computed per group then averaged.',
    ground_truth_rows: result.ground_truth_rows,
    runs: result.runs,
    metrics: result.summary,
  }, null, 2) + '\n', 'utf8');

  const charts = [
    makeChart(result.summary, 'precision', 'Precision@K', 'precision_at_k.svg'),
    makeChart(result.summary, 'recall', 'Recall@K', 'recall_at_k.svg'),
    makeChart(result.summary, 'f1', 'F1-score@K', 'f1_at_k.svg'),
  ];
  charts.push(makeCombinedLine(result.summary));
  charts.push(makeCombinedBars(result.summary));
  charts.push(makeCombinedHeatmap(result.summary));
  makeHtml(charts);

  console.log('\nTravelWish production TDMC evaluation (mean of ' + result.runs + ' runs)');
  console.table(result.summary.map(row => ({
    K: row.k, Precision: row.precision.toFixed(4),
    Recall: row.recall.toFixed(4), 'F1-score': row.f1.toFixed(4),
  })));
  console.log('\nOpen the charts: ' + path.join(outputDir, 'index.html'));
  console.log('Also generated 6 SVG figures (3 individual + 3 combined), two CSV files, and summary.json.');
}

try { main(); } catch (error) { console.error('\nERROR:', error.message); process.exitCode = 1; }
