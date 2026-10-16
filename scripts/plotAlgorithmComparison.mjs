// Draw the four thesis comparison panels from REAL algorithm_summary.json.
// node scripts/plotAlgorithmComparison.mjs
import fs from "node:fs";
import path from "node:path";
const folder=path.resolve(process.argv[2] || "comparison/algorithm_comparison");
const file=path.join(folder,"algorithm_summary.json");
if(!fs.existsSync(file)) throw Error("Run npm run eval:algorithms first: "+file);
const rows=JSON.parse(fs.readFileSync(file,"utf8")).summary;
const ks=[5,10,15,20,25,30], methods=[
  {label:"Weighted Profile-Matching Baseline",color:"#7a7a7a"},
  {label:"TDMC-APD",color:"#1378bf"}
];
const W=1220,H=850;
const esc=v=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
const text=(x,y,t,size=14,weight="normal",anchor="middle")=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-family="Arial,sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="#222">'+esc(t)+'</text>';
let svg=['<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">',
  '<rect width="100%" height="100%" fill="white"/>',
  text(W/2,33,"Weighted Profile-Matching Baseline vs TDMC-APD",22,"bold"),
  text(W/2,58,"Performance Across Recommendation List Sizes (K = 5–30)",17,"bold")];
methods.forEach((m,i)=>{const x=380+i*270;svg.push('<line x1="'+x+'" y1="83" x2="'+(x+34)+'" y2="83" stroke="'+m.color+'" stroke-width="3"/>','<circle cx="'+(x+17)+'" cy="83" r="4" fill="'+m.color+'"/>',text(x+43,88,m.label,13,"normal","start"));});
const plots=[
  {name:"Precision",key:"precision",x:45,y:130,w:535,h:275,min:0,max:1},
  {name:"Recall",key:"recall",x:650,y:130,w:535,h:275,min:0,max:1},
  {name:"F1-score",key:"f1",x:45,y:465,w:535,h:275,min:0,max:1},
  {name:"Diversity",key:"diversity",x:650,y:465,w:535,h:275,min:0,max:1},
];
for(const p of plots){
 const left=p.x+55, top=p.y+35, width=p.w-85,height=p.h-85;
 const xx=i=>left+i*width/(ks.length-1);
 const yy=v=>top+height-(v-p.min)/(p.max-p.min)*height;
 svg.push(text(p.x+p.w/2,p.y+14,p.name,16,"bold"));
 for(let tick=0;tick<=5;tick++){
   const v=p.min+(p.max-p.min)*tick/5,y=yy(v);
   svg.push('<line x1="'+left+'" y1="'+y+'" x2="'+(left+width)+'" y2="'+y+'" stroke="#ddd" stroke-dasharray="3 4"/>',
       text(left-9,y+4,v.toFixed(1),11,"normal","end"));
 }
 svg.push('<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top+height)+'" stroke="#444"/>',
   '<line x1="'+left+'" y1="'+(top+height)+'" x2="'+(left+width)+'" y2="'+(top+height)+'" stroke="#444"/>',
   text(p.x+14,p.y+145,"Score",12));
 ks.forEach((k,i)=>svg.push(text(xx(i),top+height+19,k,12)));
 svg.push(text(left+width/2,top+height+40,"Recommendation List Size (K)",12));
 for(const m of methods){
  const vals=ks.map(k=>{
   const r=rows.find(r=>r.algorithm===m.label && Number(r.k)===k);
   if(!r || !Number.isFinite(Number(r[p.key]))) throw Error("Missing "+m.label+"/"+p.key+"/"+k);
   return Number(r[p.key]);
  });
  svg.push('<polyline points="'+vals.map((v,i)=>xx(i).toFixed(1)+","+yy(v).toFixed(1)).join(" ")+'" fill="none" stroke="'+m.color+'" stroke-width="2.5"/>');
  vals.forEach((v,i)=>svg.push('<circle cx="'+xx(i)+'" cy="'+yy(v)+'" r="4" fill="'+m.color+'"/>'));
 }
}
svg.push(text(W/2,800,"Computed from 21 profile–province pairs; algorithms rerun on the same candidate dataset.",13),'</svg>');
const target=path.join(folder,"baseline_vs_tdmc_apd.svg");
fs.writeFileSync(target,svg.join("\n"),"utf8");
console.log("Graph saved:",target);


// Three separate, publication-ready SVG charts for the offline controlled comparison.
// NOTE: values here are taken ONLY from algorithm_summary.json, in which BOTH
// algorithms were rerun using the same Supabase snapshot and test configuration.
// Never mix this result with saved production TDMC Top 30 metrics.
const comparisonFigures = path.join(folder, 'figures');
fs.mkdirSync(comparisonFigures, { recursive: true });
const comparisonMetrics = [
  { key: 'precision', title: 'Precision@K', file: 'baseline_vs_tdmc_precision.svg', maximum: 1 },
  { key: 'recall', title: 'Recall@K', file: 'baseline_vs_tdmc_recall.svg' },
  { key: 'f1', title: 'F1-score@K', file: 'baseline_vs_tdmc_f1.svg' },
];

function makeComparison(metric) {
  const W = 1200, H = 710, left = 165, right = 1110, top = 170, bottom = 562;
  const series = methods.map(method => ({
    label: method.label,
    color: method.label === 'TDMC-APD' ? '#7450A4' : '#7a7a7a',
    values: ks.map(k => {
      const matches = rows.filter(row => row.algorithm === method.label && Number(row.k) === k);
      if (matches.length !== 1 || !Number.isFinite(Number(matches[0][metric.key]))) {
        throw new Error('Missing or duplicate data: ' + method.label + '/' + metric.key + '/' + k);
      }
      if (Number(matches[0].runs) !== 21) {
        throw new Error('Expected 21 matched runs for ' + method.label + '/' + k);
      }
      return Number(matches[0][metric.key]);
    }),
  }));
  const peak = Math.max(...series.flatMap(s => s.values));
  const yMax = metric.maximum ?? Math.max(0.1, Math.ceil(peak * 1.18 * 10) / 10);
  const x = i => left + i * (right - left) / (ks.length - 1);
  const y = value => bottom - (value / yMax) * (bottom - top);
  const out = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">',
    '<rect width="' + W + '" height="' + H + '" fill="#FFFFFF"/>',
    '<text x="620" y="60" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="bold" fill="#263041">Baseline vs TDMC-APD: ' + metric.title + '</text>',
    '<text x="620" y="91" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#667085">Offline controlled experiment — 21 matched runs (7 profiles x 3 provinces)</text>',
  ];
  const legends = [
    { x: 280, text: 'Weighted Profile-Matching Baseline', color: '#7a7a7a' },
    { x: 770, text: 'TDMC-APD', color: '#7450A4' },
  ];
  for (const legend of legends) {
    out.push('<line x1="' + legend.x + '" y1="128" x2="' + (legend.x + 38) + '" y2="128" stroke="' + legend.color + '" stroke-width="4"/>');
    out.push('<circle cx="' + (legend.x + 19) + '" cy="128" r="5" fill="' + legend.color + '"/>');
    out.push('<text x="' + (legend.x + 48) + '" y="134" font-family="Arial,sans-serif" font-size="17" fill="#344054">' + legend.text + '</text>');
  }
  for (let tick = 0; tick <= 5; tick++) {
    const value = tick * yMax / 5, yy = y(value);
    out.push('<line x1="' + left + '" y1="' + yy + '" x2="' + right + '" y2="' + yy + '" stroke="#E4E7EC" stroke-dasharray="5 7"/>');
    out.push('<text x="' + (left - 17) + '" y="' + (yy + 6) + '" text-anchor="end" font-family="Arial,sans-serif" font-size="17" fill="#475467">' + value.toFixed(3) + '</text>');
  }
  ks.forEach((k, i) => {
    out.push('<text x="' + x(i) + '" y="' + (bottom + 32) + '" font-family="Arial,sans-serif" font-size="19" text-anchor="middle" fill="#344054">' + k + '</text>');
  });
  for (const [index, s] of series.entries()) {
    const pts = s.values.map((v, i) => x(i) + ',' + y(v)).join(' ');
    out.push('<polyline points="' + pts + '" fill="none" stroke="' + s.color + '" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>');
    s.values.forEach((v, i) => {
      out.push('<circle cx="' + x(i) + '" cy="' + y(v) + '" r="8" fill="' + s.color + '" stroke="white" stroke-width="2"/>');
      // Offset labels in opposite directions, avoiding overlap at similar scores.
      const other = series[1 - index].values[i];
      const close = Math.abs(y(v) - y(other)) < 42;
      const labelY = close ? (index === 0 ? y(v) + 27 : y(v) - 18) : y(v) - 17;
      out.push('<text x="' + x(i) + '" y="' + Math.max(top - 10, Math.min(bottom + 38, labelY)) + '" font-family="Arial,sans-serif" text-anchor="middle" font-size="17" font-weight="bold" fill="' + s.color + '">' + v.toFixed(4) + '</text>');
    });
  }
  out.push('<text x="635" y="657" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" fill="#263041">Number of recommended attractions (K)</text>');
  out.push('<text x="48" y="366" text-anchor="middle" transform="rotate(-90 48 366)" font-family="Arial,sans-serif" font-size="20" fill="#263041">' + metric.title + '</text>');
  out.push('</svg>');
  const svgContent = out.join('\n');
  fs.writeFileSync(path.join(comparisonFigures, metric.file), svgContent, 'utf8');
  return { ...metric, src: 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64') };
}
const created = comparisonMetrics.map(makeComparison);
const page = [
  '<!doctype html><html lang="en"><head><meta charset="utf-8"/>',
  '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
  '<title>TravelWish — Controlled Baseline vs TDMC-APD</title>',
  '<style>body{background:#f5f6fb;margin:0;padding:24px;font-family:Arial,sans-serif;color:#263041}h1,p{text-align:center}section{max-width:1200px;background:white;border-radius:18px;padding:14px;margin:26px auto;box-shadow:0 2px 12px #0001}img{width:100%;height:auto;display:block}</style>',
  '</head><body><h1>Weighted Profile-Matching Baseline vs TDMC-APD</h1>',
  '<p>Offline controlled comparison using the same underlying attraction pool, 21 matched profile/province cases.</p>',
  ...created.map(c => '<section><img src="' + c.src + '" alt="' + c.title + '"/></section>'),
  '</body></html>',
].join('\n');
fs.writeFileSync(path.join(comparisonFigures, 'index.html'), page, 'utf8');
console.log('Separate comparison SVG charts and preview:', comparisonFigures);
