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
