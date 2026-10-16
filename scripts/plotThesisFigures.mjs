/**
 * TravelWish chapter 4 charts — generate evidence-based SVG figures.
 * npm run eval:figures
 * Requires comparison/algorithm_comparison/algorithm_summary.json (from eval:algorithms)
 * and/or comparison/evaluation/metrics_by_model.csv (from eval:groundtruth).
 * Missing sources are SKIPPED, never filled with illustrative numbers.
 */
import fs from "node:fs";
import path from "node:path";

const opts = Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith("--")?[[a.slice(2),all[i+1]]]:[]));
const algorithmPath=path.resolve(opts.algorithms||"comparison/algorithm_comparison/algorithm_summary.json");
const plansPath=path.resolve(opts.plans||"comparison/evaluation/metrics_by_model.csv");
const out=path.resolve(opts.out||"comparison/figures");
fs.mkdirSync(out,{recursive:true});
const generated=[],skipped=[];
const colors={baseline:"#777C86",tdmc:"#7450A4",gemini:"#3478B9",gpt:"#DD8A5A",claude:"#53A38E"};
const escape=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const num=x=>x===null||x===undefined||x===""?NaN:Number(x);
const mean=xs=>{const a=xs.filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;};
const text=(x,y,s,size=14,anchor="middle",weight=400,color="#263041",rotate=0)=>
  '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-family="Arial, Noto Sans Thai, sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'"'+(rotate?' transform="rotate('+rotate+' '+x+' '+y+')"':'')+'>'+escape(s)+'</text>';
const border=(w,h,title,sub)=>[
 '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">',
 '<rect width="'+w+'" height="'+h+'" fill="#FFFFFF"/>',
 '<rect x="16" y="16" width="'+(w-32)+'" height="'+(h-32)+'" rx="16" fill="#FCFBFF" stroke="#E9E5EF"/>',
 text(w/2,59,title,23,"middle",700),text(w/2,85,sub,13,"middle",400,"#667085")
];
function svgSave(filename,lines) {
 const target=path.join(out,filename);fs.writeFileSync(target,lines.concat("</svg>").join("\n"),"utf8");
 generated.push(filename); console.log("  +",filename);
}
function missing(label,reason) {skipped.push({figure:label,reason});console.log("  - SKIP",label,reason);}
function lineChart(filename,title,sub,series,{yMax=null,yMin=0,yLabel="Score",precision=2}={}) {
 const valid=series.filter(s=>s.values.length&&s.values.every(Number.isFinite));
 if(!valid.length){missing(filename,"No complete numeric series");return;}
 const W=1180,H=680,L=130,R=62,T=133,B=145,pW=W-L-R,pH=H-T-B;
 const n=valid[0].values.length;
 if(n<2||valid.some(s=>s.values.length!==n||s.labels.length!==n)){missing(filename,"Misaligned X values");return;}
 const values=valid.flatMap(s=>s.values);
 const hi=yMax ?? (Math.max(...values,0)*1.1 || 1);
 const lo=yMin;
 const max=hi<=lo?lo+1:hi;
 const Y=v=>T+pH-(v-lo)/(max-lo)*pH, X=i=>L+pW*i/(n-1);
 const el=border(W,H,title,sub);
 for(let i=0;i<=5;i++){let v=lo+(max-lo)*i/5,y=Y(v);el.push('<line x1="'+L+'" y1="'+y+'" x2="'+(L+pW)+'" y2="'+y+'" stroke="#E6E3EC" stroke-dasharray="4 5"/>',text(L-16,y+5,v.toFixed(precision),12,"end"));}
 el.push('<line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(T+pH)+'" stroke="#8C8596"/>','<line x1="'+L+'" y1="'+(T+pH)+'" x2="'+(L+pW)+'" y2="'+(T+pH)+'" stroke="#8C8596"/>',text(35,T+pH/2,yLabel,14,"middle",500,"#667085",-90));
 valid[0].labels.forEach((k,i)=>el.push(text(X(i),T+pH+27,k,13)));
 valid.forEach((s,index)=>{
  const pts=s.values.map((v,i)=>X(i).toFixed(2)+","+Y(v).toFixed(2)).join(" ");
  el.push('<polyline points="'+pts+'" stroke="'+(s.color||colors.tdmc)+'" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/>');
  s.values.forEach((v,i)=>el.push('<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="5" fill="'+(s.color||colors.tdmc)+'" stroke="white" stroke-width="2"/>'));
  const legendX=140+index*315, legendY=H-53;
  el.push('<line x1="'+legendX+'" y1="'+legendY+'" x2="'+(legendX+34)+'" y2="'+legendY+'" stroke="'+(s.color||colors.tdmc)+'" stroke-width="3"/>',text(legendX+45,legendY+5,s.name,14,"start"));
 });
 svgSave(filename,el);
}
function barChart(filename,title,sub,labels,values,barColors,{max=null,yLabel="",fmt=(x)=>x.toFixed(2)}={}) {
 if(!values.length||values.some(v=>!Number.isFinite(v))){missing(filename,"Incomplete numeric rows");return;}
 const W=1180,H=660,L=120,R=65,T=135,B=115,pW=W-L-R,pH=H-T-B,hi=max ?? (Math.max(...values)*1.2 || 1);
 const Y=v=>T+pH-v/hi*pH;
 const el=border(W,H,title,sub),step=pW/values.length,bW=Math.min(step*0.56,135);
 for(let j=0;j<=5;j++){const v=hi*j/5,y=Y(v);el.push('<line x1="'+L+'" y1="'+y+'" x2="'+(L+pW)+'" y2="'+y+'" stroke="#E6E3EC" stroke-dasharray="4 5"/>',text(L-13,y+4,Number(v.toFixed(2)).toString(),12,"end"));}
 values.forEach((v,i)=>{const x=L+step*i+(step-bW)/2,y=Y(v),c=barColors[i]||colors.tdmc;el.push('<rect x="'+x+'" y="'+y+'" width="'+bW+'" height="'+(T+pH-y)+'" rx="5" fill="'+c+'"/>',text(x+bW/2,y-11,fmt(v),15,"middle",700),text(x+bW/2,T+pH+27,labels[i],13));});
 el.push(text(34,T+pH/2,yLabel,14,"middle",500,"#667085",-90));
 svgSave(filename,el);
}


function horizontalBars(filename,title,sub,labels,values,palette,{unit="",percentage=false}={}){
 if(values.length!==labels.length||values.some(v=>!Number.isFinite(v))){missing(filename,"Missing horizontal-bar values");return;}
 const W=1190,H=630,L=255,R=120,T=150,B=90,pW=W-L-R;
 const max=Math.max(...values)*1.13||1;
 const el=border(W,H,title,sub);
 values.forEach((v,i)=>{
  const y=T+i*118,w=v/max*pW;
  el.push(text(L-22,y+28,labels[i],20,"end",600),
   '<rect x="'+L+'" y="'+(y-4)+'" width="'+pW+'" height="53" rx="14" fill="#EFEFF3"/>',
   '<rect x="'+L+'" y="'+(y-4)+'" width="'+w+'" height="53" rx="14" fill="'+palette[i]+'"/>',
   text(Math.min(L+w+20,W-85),y+29,(percentage?(v*100).toFixed(2):v.toFixed(2))+unit,19,"start",700));
 });
 svgSave(filename,el);
}
function lollipop(filename,title,sub,labels,values,palette,{unit=""}={}){
 if(values.length!==labels.length||values.some(v=>!Number.isFinite(v))){missing(filename,"Missing lollipop values");return;}
 const W=1190,H=650,L=165,R=100,T=144,B=124,pW=W-L-R,pH=H-T-B;
 const max=Math.max(...values)*1.16||1, step=pW/values.length;
 const el=border(W,H,title,sub);
 for(let t=0;t<=4;t++){
  const v=max*t/4,y=T+pH-v/max*pH;
  el.push('<line x1="'+L+'" y1="'+y+'" x2="'+(L+pW)+'" y2="'+y+'" stroke="#E2E5EB" stroke-dasharray="4 6"/>',
   text(L-16,y+6,v.toFixed(0),15,"end"));
 }
 values.forEach((v,i)=>{
  const x=L+step*(i+.5),y=T+pH-v/max*pH;
  el.push('<line x1="'+x+'" y1="'+(T+pH)+'" x2="'+x+'" y2="'+y+'" stroke="'+palette[i]+'" stroke-width="7" opacity=".55"/>',
   '<circle cx="'+x+'" cy="'+y+'" r="15" fill="'+palette[i]+'" stroke="white" stroke-width="4"/>',
   text(x,y-30,v.toFixed(2)+unit,19,"middle",700),
   text(x,T+pH+39,labels[i],18,"middle",600));
 });
 svgSave(filename,el);
}
function profileHeatmap(filename,title,sub,rows){
 const cases=[1,2,3,4,5,6,7],provinces=["กรุงเทพมหานคร","เชียงใหม่","ภูเก็ต"];
 const labels=["Bangkok","Chiang Mai","Phuket"],W=1100,H=820,L=190,T=165,cw=255,ch=73;
 const el=border(W,H,title,sub);
 labels.forEach((name,j)=>el.push(text(L+j*cw+cw/2,T-30,name,19,"middle",700)));
 cases.forEach((c,i)=>{
  el.push(text(L-25,T+i*ch+ch/2+8,"Case "+c,18,"end",600));
  provinces.forEach((p,j)=>{
   const r=rows.find(x=>Number(x.case_id)===c&&x.province===p);
   const v=r?num(r.tdmc_precision_at_k):NaN;
   const x=L+j*cw,y=T+i*ch;
   // Lighter = lower precision, darker = higher precision; missing values remain gray.
   const opacity=Number.isFinite(v)?(0.12+0.78*Math.min(1,Math.max(0,v))):1;
   const fill=Number.isFinite(v)?"#7450A4":"#DFE1E7";
   el.push('<rect x="'+(x+4)+'" y="'+(y+4)+'" width="'+(cw-9)+'" height="'+(ch-9)+'" rx="9" fill="'+fill+'" fill-opacity="'+opacity+'" stroke="#FFFFFF" stroke-width="2"/>',
    text(x+cw/2,y+ch/2+7,Number.isFinite(v)?(v*100).toFixed(0)+"%":"N/A",20,"middle",700,
     Number.isFinite(v)&&v>=.6?"#FFFFFF":"#263041"));
  });
 });
 el.push(text(W/2,H-65,"TDMC Top-K relevance; one shared ranking per case/province (not per AI model)",14,"middle",400,"#667085"));
 svgSave(filename,el);
}

/** Six panels (K=5,10,15,20,25,30), each containing all profile/province rows. */
function ratingDistanceSixPanels(filename, rows) {
 const ks=[5,10,15,20,25,30], W=2100,H=1440;
 const X_MIN=0, X_MAX=80, Y_MIN=3, Y_MAX=5;
 const methods=[
  {name:"Weighted Profile-Matching Baseline",color:"#9A9A9A",shape:"circle"},
  {name:"TDMC-APD",color:"#388BCA",shape:"triangle"}
 ];
 const panels=ks.map(k=>rows.filter(r=>Number(r.k)===k &&
   methods.some(m=>m.name===r.algorithm) &&
   Number.isFinite(num(r.avg_rating)) && Number.isFinite(num(r.avg_distance_km))));
 if(!panels.some(p=>p.length)){missing(filename,"No valid case-level rating/distance rows");return;}
 const el=border(W,H,"",""); // Clean, single-instance chart heading.
 // Title, supporting line and a dedicated legend row with generous separation.
 el.push(text(W/2,62,"Average Rating vs Average Distance",34,"middle",700),
  text(W/2,98,"Comparison across six recommendation sizes (K = 5, 10, 15, 20, 25, 30)",19,"middle",400,"#667085"),
  '<rect x="445" y="118" width="1210" height="55" rx="17" fill="#FFFFFF" stroke="#E3DEEA"/>',
  '<circle cx="510" cy="145" r="9" fill="#9A9A9A"/>',
  text(536,152,methods[0].name,22,"start",500),
  '<polygon points="1190,134 1179,154 1201,154" fill="#388BCA"/>',
  text(1215,152,methods[1].name,22,"start",500));
 const panelW=630,panelH=540,leftMargin=52,topMargin=198,gapX=50,gapY=45;
 for(let pi=0;pi<ks.length;pi++){
  const k=ks[pi],px=leftMargin+(pi%3)*(panelW+gapX),py=topMargin+Math.floor(pi/3)*(panelH+gapY);
  const left=px+90,top=py+87,pW=panelW-125,pH=panelH-180;
  const X=v=>left+(v-X_MIN)/(X_MAX-X_MIN)*pW;
  const Y=v=>top+pH-(v-Y_MIN)/(Y_MAX-Y_MIN)*pH;
  const panel=panels[pi];
  const counts=methods.map(m=>panel.filter(r=>r.algorithm===m.name).length);
  const outX=panel.filter(r=>num(r.avg_distance_km)>X_MAX).length;
  const outY=panel.filter(r=>num(r.avg_rating)<Y_MIN || num(r.avg_rating)>Y_MAX).length;
  el.push('<rect x="'+px+'" y="'+py+'" width="'+panelW+'" height="'+panelH+'" rx="12" fill="white" stroke="#DADCE5"/>',
   text(px+panelW/2,py+37,"K = "+k+"  ("+counts[0]+" baseline / "+counts[1]+" TDMC)",25,"middle",700));
  if(outX||outY)el.push(text(px+panelW/2,py+67,
   "Outside view: "+outX+" distance >80 km; "+outY+" rating outside 3–5",16,"middle",400,"#935353"));
  for(const xv of [0,10,20,30,40,50,60,70,80]){
   const xx=X(xv);
   el.push('<line x1="'+xx+'" y1="'+top+'" x2="'+xx+'" y2="'+(top+pH)+'" stroke="#E5E7EC" stroke-dasharray="3 5"/>',
    text(xx,top+pH+28,xv,18));
  }
  for(const yv of [3,3.5,4,4.5,5]){
   const yy=Y(yv);
   el.push('<line x1="'+left+'" y1="'+yy+'" x2="'+(left+pW)+'" y2="'+yy+'" stroke="#E5E7EC" stroke-dasharray="3 5"/>',
    text(left-13,yy+6,yv.toFixed(1),18,"end"));
  }
  el.push(text(left+pW/2,py+panelH-25,"Average Distance (km)",21),
   text(px+27,top+pH/2,"Average Rating",21,"middle",500,"#667085",-90));
  const occupancy=new Map();
  for(const method of methods){
   for(const r of panel.filter(x=>x.algorithm===method.name)){
    const distance=num(r.avg_distance_km),rating=num(r.avg_rating);
    // Do not alter the actual values. Jitter only pixel positions of overlapping markers.
    const clippedX=Math.max(X_MIN,Math.min(X_MAX,distance));
    const clippedY=Math.max(Y_MIN,Math.min(Y_MAX,rating));
    const overlapKey=method.name+"|"+clippedX.toFixed(1)+"|"+clippedY.toFixed(2);
    const n=occupancy.get(overlapKey)||0;occupancy.set(overlapKey,n+1);
    const angle=n*2.399963229728653,spread=n===0?0:Math.min(17,4.2*Math.sqrt(n));
    const dx=Math.cos(angle)*spread,dy=Math.sin(angle)*spread;
    // Outlier symbols stay at the corresponding boundary; full exact data remains in SVG tooltip.
    const xx=Math.max(left+7,Math.min(left+pW-7,X(clippedX)+dx));
    const yy=Math.max(top+7,Math.min(top+pH-7,Y(clippedY)+dy));
    const tooltip=escape("Case "+r.case_id+" | "+r.province+" | K="+k+
     " | Average Distance="+distance.toFixed(2)+" km | Average Rating="+rating.toFixed(2));
    if(distance>X_MAX||rating<Y_MIN||rating>Y_MAX){
     el.push('<rect x="'+(xx-8)+'" y="'+(yy-8)+'" width="16" height="16" fill="none" stroke="#A34E4E" stroke-width="1.4" stroke-dasharray="2 2"><title>'+tooltip+' (outside axis range)</title></rect>');
    }
    if(method.shape==="triangle")
     el.push('<polygon points="'+xx+','+(yy-8)+' '+(xx-7)+','+(yy+6)+' '+(xx+7)+','+(yy+6)+'" fill="'+method.color+'" opacity=".9"><title>'+tooltip+'</title></polygon>');
    else
     el.push('<circle cx="'+xx+'" cy="'+yy+'" r="6.5" fill="'+method.color+'" opacity=".79" stroke="white" stroke-width=".8"><title>'+tooltip+'</title></circle>');
   }
  }
  if(counts.some(n=>n!==21))console.warn("K="+k+" has "+counts.join("/")+" points, expected 21 per algorithm");
 }
 el.push(text(W/2,H-25,
  "Zoomed view: X = 0–80 km, Y = 3–5. Dashed borders flag clipped data; tooltips retain exact values.",
  20,"middle",400,"#667085"));
 svgSave(filename,el);
}


/** One standalone SVG per TDMC metric with independent Y scale and labeled data points. */
function tdmcSeparateMetricFigures(series,kValues){
 const configurations=[
  {name:"Precision@K",file:"figure_4_4a_tdmc_precision.svg",title:"TDMC-APD: Precision@K",color:"#7450A4",minTop:0.5},
  {name:"Recall@K",file:"figure_4_4b_tdmc_recall.svg",title:"TDMC-APD: Recall@K",color:"#3478B9",minTop:0.08},
  {name:"F1@K",file:"figure_4_4c_tdmc_f1.svg",title:"TDMC-APD: F1-score@K",color:"#53A38E",minTop:0.12}
 ];
 for(const cfg of configurations){
  const s=series.find(item=>item.name===cfg.name);
  if(!s||s.values.length!==kValues.length||s.values.some(v=>!Number.isFinite(v))){
   missing(cfg.file,"Missing or invalid metric values");continue;
  }
  const W=1220,H=700,L=148,R=91,T=147,B=118,w=W-L-R,h=H-T-B;
  const top=Math.max(cfg.minTop,Math.ceil(Math.max(...s.values)*1.12*1000)/1000);
  const X=i=>L+w*i/(kValues.length-1),Y=v=>T+h-v/top*h;
  const el=border(W,H,cfg.title,"TDMC-APD relevance evaluation across recommendation sizes");
  for(let i=0;i<=5;i++){
   const v=top*i/5,y=Y(v);
   el.push('<line x1="'+L+'" y1="'+y+'" x2="'+(L+w)+'" y2="'+y+'" stroke="#E4E6EF" stroke-dasharray="5 6"/>',
    text(L-17,y+6,v.toFixed(3),17,"end"));
  }
  const pts=s.values.map((v,i)=>[X(i),Y(v)]);
  el.push('<polyline points="'+pts.map(p=>p.join(",")).join(" ")+'" fill="none" stroke="'+cfg.color+'" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>');
  pts.forEach(([x,y],i)=>{
   el.push('<circle cx="'+x+'" cy="'+y+'" r="9" fill="'+cfg.color+'" stroke="white" stroke-width="2"><title>K='+kValues[i]+': '+s.values[i].toFixed(5)+'</title></circle>',
    text(x,Math.max(T+20,y-20),s.values[i].toFixed(3),20,"middle",700,cfg.color),
    text(x,T+h+35,kValues[i],19));
  });
  el.push(text(W/2,H-40,"Recommendation size (K)",21),
   text(48,T+h/2,cfg.name,21,"middle",600,"#263041",-90));
  svgSave(cfg.file,el);
 }
}

/** Four thesis-friendly visualizations for TDMC-APD Precision/Recall/F1 (real K-level values). */
function tdmcFourFigures(series, kValues) {
 const metrics=series.map(s=>({...s,values:s.values.map(Number)}));
 if(metrics.length!==3||metrics.some(s=>s.values.length!==kValues.length||s.values.some(v=>!Number.isFinite(v)||v<0||v>1))){
  missing("TDMC four chart variants","Incomplete or invalid Precision/Recall/F1 values");return;
 }
 const [precision,recall,f1]=metrics;
 const presets=[.5,.08,.12];
 const axes=metrics.map((s,i)=>Math.max(presets[i],Math.ceil(Math.max(...s.values)*1.12*100)/100));
 const coords=(i,l,t,w)=>l+i*w/(kValues.length-1);
 const grid=(e,l,t,w,h,max,n=4,fmt=v=>v.toFixed(2))=>{
  for(let i=0;i<=n;i++){
   const v=i*max/n,y=t+h-i*h/n;
   e.push('<line x1="'+l+'" y1="'+y+'" x2="'+(l+w)+'" y2="'+y+'" stroke="#E0E3EA" stroke-dasharray="4 5"/>',
    text(l-12,y+6,fmt(v),14,"end"));
  }
 };
 // 1. Three independent vertical panels, one axis per metric.
 {
  const W=1830,H=710,e=border(W,H,"TDMC-APD: Precision, Recall and F1",
   "Three separate scales | K = 5, 10, 15, 20, 25, 30 | data labels show exact values");
  metrics.forEach((s,j)=>{
   const px=35+j*605,py=135,pw=575,ph=485,l=px+87,t=py+65,w=pw-129,h=ph-149,hi=axes[j];
   e.push('<rect x="'+px+'" y="'+py+'" width="'+pw+'" height="'+ph+'" rx="14" fill="white" stroke="#E6E0E9"/>',
    text(px+pw/2,py+36,s.name,22,"middle",700,s.color));
   grid(e,l,t,w,h,hi,4,v=>v.toFixed(3));
   const points=s.values.map((v,i)=>[coords(i,l,t,w),t+h-v/hi*h]);
   e.push('<polyline points="'+points.map(p=>p.join(",")).join(" ")+'" fill="none" stroke="'+s.color+'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>');
   points.forEach(([x,y],i)=>{
    e.push('<circle cx="'+x+'" cy="'+y+'" r="7" fill="'+s.color+'" stroke="white" stroke-width="2"><title>K='+kValues[i]+': '+s.values[i].toFixed(4)+'</title></circle>',
     text(x,Math.max(t+16,y-17),s.values[i].toFixed(3),15,"middle",600,s.color),
     text(x,t+h+29,kValues[i],16));
   });
   e.push(text(l+w/2,py+ph-21,"Recommendation size (K)",16));
  });
  svgSave("figure_4_4_tdmc_small_multiples.svg",e);
 }
 // 2. Dual axis: left Precision / right Recall and F1. Explicitly label both axes.
 {
  const W=1300,H=720,L=146,R=166,T=172,B=122,w=W-L-R,h=H-T-B,maxLeft=axes[0],maxRight=Math.max(axes[1],axes[2]);
  const e=border(W,H,"TDMC-APD: Dual-Axis Trends","Left axis: Precision | Right axis: Recall and F1 | different scales");
  grid(e,L,T,w,h,maxLeft,5,v=>v.toFixed(2));
  for(let i=0;i<=5;i++){
   const v=i*maxRight/5,y=T+h-i*h/5;
   e.push(text(L+w+15,y+5,v.toFixed(3),14,"start",400,"#3478B9"));
  }
  e.push(text(54,T+h/2,"Precision",19,"middle",700,precision.color,-90),
   text(W-33,T+h/2,"Recall / F1",19,"middle",700,"#3478B9",90));
  metrics.forEach((s,j)=>{
   const hi=j===0?maxLeft:maxRight;
   const pts=s.values.map((v,i)=>[coords(i,L,T,w),T+h-v/hi*h]);
   e.push('<polyline points="'+pts.map(p=>p.join(",")).join(" ")+'" fill="none" stroke="'+s.color+'" stroke-width="4"/>');
   pts.forEach(([x,y],i)=>e.push('<circle cx="'+x+'" cy="'+y+'" r="6.5" fill="'+s.color+'"><title>'+s.name+' K='+kValues[i]+': '+s.values[i].toFixed(4)+'</title></circle>'));
   const lx=245+j*315,ly=H-55;
   e.push('<line x1="'+lx+'" y1="'+ly+'" x2="'+(lx+38)+'" y2="'+ly+'" stroke="'+s.color+'" stroke-width="4"/>',
    text(lx+50,ly+5,s.name,17,"start"));
  });
  kValues.forEach((k,i)=>e.push(text(coords(i,L,T,w),T+h+31,k,16)));
  e.push(text(L+w/2,T+h+70,"Recommendation size (K)",17));
  svgSave("figure_4_4_tdmc_dual_axis.svg",e);
 }
 // 3. Empirical P-R points joined in K order; labels are K, not an interpolated retrieval curve.
 {
  const W=1280,H=790,L=166,R=90,T=148,B=135,w=W-L-R,h=H-T-B;
  const xmax=Math.max(.08,Math.max(...recall.values)*1.17);
  const ymax=Math.max(.5,Math.max(...precision.values)*1.17);
  const X=v=>L+v/xmax*w,Y=v=>T+h-v/ymax*h;
  const e=border(W,H,"TDMC-APD: Precision–Recall by K",
   "Each marker is an observed Top-K evaluation; lines connect K in ascending order");
  for(let i=0;i<=5;i++){
   const rv=i*xmax/5,pv=i*ymax/5;
   e.push('<line x1="'+X(rv)+'" y1="'+T+'" x2="'+X(rv)+'" y2="'+(T+h)+'" stroke="#E0E3EA" stroke-dasharray="4 5"/>',
    '<line x1="'+L+'" y1="'+Y(pv)+'" x2="'+(L+w)+'" y2="'+Y(pv)+'" stroke="#E0E3EA" stroke-dasharray="4 5"/>',
    text(X(rv),T+h+27,rv.toFixed(3),14),text(L-12,Y(pv)+6,pv.toFixed(2),14,"end"));
  }
  const points=kValues.map((k,i)=>[X(recall.values[i]),Y(precision.values[i])]);
  e.push('<polyline points="'+points.map(p=>p.join(",")).join(" ")+'" fill="none" stroke="'+precision.color+'" stroke-width="4"/>');
  points.forEach(([x,y],i)=>{
   e.push('<circle cx="'+x+'" cy="'+y+'" r="8" fill="'+precision.color+'" stroke="white" stroke-width="2"/>',
    text(Math.min(W-80,x+28),Math.max(T+18,y-14),"K="+kValues[i],17,"middle",600,precision.color));
  });
  e.push(text(W/2,H-60,"Recall@K",20),text(44,T+h/2,"Precision@K",20,"middle",600,"#263041",-90));
  svgSave("figure_4_4_tdmc_precision_recall_curve.svg",e);
 }
 // 4. Three series with a compact exact value table under the figure.
 {
  const W=1370,H=900,L=155,R=92,T=147,plotH=430,w=W-L-R,yMax=Math.max(.5,...metrics.flatMap(s=>s.values))*1.1;
  const X=i=>coords(i,L,T,w),Y=v=>T+plotH-v/yMax*plotH;
  const e=border(W,H,"TDMC-APD: Metric Trends with Data Table",
   "Shared axis for comparison; the table preserves small Recall and F1 values");
  grid(e,L,T,w,plotH,yMax,5);
  metrics.forEach(s=>{
   const pts=s.values.map((v,i)=>[X(i),Y(v)]);
   e.push('<polyline points="'+pts.map(p=>p.join(",")).join(" ")+'" fill="none" stroke="'+s.color+'" stroke-width="3.4"/>');
   pts.forEach(([x,y])=>e.push('<circle cx="'+x+'" cy="'+y+'" r="5.5" fill="'+s.color+'"/>'));
  });
  kValues.forEach((k,i)=>e.push(text(X(i),T+plotH+27,k,15)));
  const y0=636,headerH=45,rowH=52,tabLeft=105,tabW=1160,firstCol=225,cw=(tabW-firstCol)/kValues.length;
  e.push('<rect x="'+tabLeft+'" y="'+y0+'" width="'+tabW+'" height="'+(headerH+rowH*3)+'" rx="10" fill="white" stroke="#DADCE4"/>',
   text(tabLeft+24,y0+29,"Metric / K",17,"start",700));
  kValues.forEach((k,i)=>e.push(text(tabLeft+firstCol+(i+.5)*cw,y0+29,k,17,"middle",700)));
  metrics.forEach((s,i)=>{
   const yy=y0+headerH+i*rowH;
   e.push('<line x1="'+tabLeft+'" y1="'+yy+'" x2="'+(tabLeft+tabW)+'" y2="'+yy+'" stroke="#E3E1E8"/>',
    '<rect x="'+(tabLeft+16)+'" y="'+(yy+18)+'" width="14" height="14" rx="3" fill="'+s.color+'"/>',
    text(tabLeft+41,yy+31,s.name,17,"start",600));
   s.values.forEach((v,j)=>e.push(text(tabLeft+firstCol+(j+.5)*cw,yy+31,v.toFixed(4),17)));
  });
  e.push(text(W/2,H-24,"Exact numeric values are retained; no logarithmic transform is applied.",14,"middle",400,"#667085"));
  svgSave("figure_4_4_tdmc_line_with_table.svg",e);
 }
}

function parseCsv(input){
 const records=[];let row=[],f="",q=false;
 input=input.replace(/^\uFEFF/,"");
 for(let i=0;i<input.length;i++){let ch=input[i];
  if(q){if(ch==='"'&&input[i+1]==='"'){f+='"';i++;}else if(ch==='"')q=false;else f+=ch;}
  else if(ch==='"'&&f==="")q=true;else if(ch===","){row.push(f);f="";}else if(ch==="\n"){row.push(f.replace(/\r$/,""));records.push(row);row=[];f="";}else f+=ch;
 }
 if(q)throw Error("Unclosed quote in "+plansPath);
 if(f||row.length){row.push(f.replace(/\r$/,""));records.push(row);}
 const headers=records.shift()||[];
 return records.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
const algorithm=fs.existsSync(algorithmPath)?JSON.parse(fs.readFileSync(algorithmPath,"utf8")).summary:null;
const runs=fs.existsSync(plansPath)?parseCsv(fs.readFileSync(plansPath,"utf8")):null;
const ks=[5,10,15,20,25,30],base="Weighted Profile-Matching Baseline",tdmc="TDMC-APD";
if(algorithm) {
 const values=(method,field)=>ks.map(k=>{const row=algorithm.find(r=>r.algorithm===method&&num(r.k)===k);return row?num(row[field]):NaN;});
 const labels=ks.map(String);
 const compare=(field,file,title,yLabel,yMax=null)=>lineChart(file,title,"Weighted Profile-Matching Baseline vs TDMC-APD  |  K = 5–30",[
  {name:"Weighted Profile-Matching Baseline",labels,values:values(base,field),color:colors.baseline},
  {name:"TDMC-APD",labels,values:values(tdmc,field),color:colors.tdmc}
 ],{yLabel,yMax});
 compare("diversity","figure_4_1_topic_diversity.svg","Topic Diversity by Recommendation Size","Topic Diversity",1);
 const detailPath=path.resolve(opts.algorithmRows||"comparison/algorithm_comparison/algorithm_results.csv");
 if(fs.existsSync(detailPath)){
  const detail=parseCsv(fs.readFileSync(detailPath,"utf8"));
  ratingDistanceSixPanels("figure_4_2_rating_distance_6_panels.svg",detail);
 }else missing("figure_4_2_rating_distance_6_panels.svg","Missing "+detailPath+"; run npm run eval:algorithms");
 // These are TDMC-only, NOT a comparison with Baseline.
 const tdmcMetrics=[
  {name:"Precision@K",labels,values:values(tdmc,"precision"),color:"#7450A4"},
  {name:"Recall@K",labels,values:values(tdmc,"recall"),color:"#3478B9"},
  {name:"F1@K",labels,values:values(tdmc,"f1"),color:"#53A38E"}];
 tdmcFourFigures(tdmcMetrics,ks);
 tdmcSeparateMetricFigures(tdmcMetrics,ks);
}else missing("Figures 4.1–4.4","Missing "+algorithmPath+"; run npm run eval:algorithms");

if(runs?.length){
 const models=["gemini","gpt","claude"];
 const byModel=models.map(m=>runs.filter(r=>r.model===m));
 const reliable=(field,collection)=>mean(collection.map(r=>num(r[field])));
 const rel=models.map((m,i)=>reliable("plan_precision_judged",byModel[i]));
 horizontalBars("figure_4_5_ai_plan_relevance.svg","Final Itinerary Attraction Relevance",
  "Comparison of average judged relevance across 21 plans per model",["Gemini","GPT","Claude"],rel,
  models.map(m=>colors[m]),{unit:"%",percentage:true});
 const dist=models.map((m,i)=>reliable("route_km",byModel[i]));
 lollipop("figure_4_6_route_distance_models.svg","Mean Total Route Distance by AI Model",
  "Total km per itinerary; shorter alone does not imply a better itinerary",
  ["Gemini","GPT","Claude"],dist,models.map(m=>colors[m]),{unit:" km"});
 const provinceNames=["กรุงเทพมหานคร","เชียงใหม่","ภูเก็ต"],provinceLabels=["Bangkok","Chiang Mai","Phuket"];
 const provinceDistances=provinceNames.map(p=>reliable("route_km",runs.filter(r=>r.province===p)));
 horizontalBars("figure_4_7_route_distance_provinces.svg","Mean Total Route Distance by Province",
  "Mean across available model plans",provinceLabels,provinceDistances,
  [colors.gemini,colors.gpt,colors.claude],{unit:" km"});
 // Avoid triple-counting shared TDMC ranking: each case/province should occur once.
 const cases=[1,2,3,4,5,6,7];const unique=new Map();
 for(const r of runs){
   const key=String(r.case_id)+"|"+r.province;
   if(!unique.has(key)) unique.set(key,r);
 }
 const caseRows=[...unique.values()];
 const casePrecision=cases.map(c=>reliable("tdmc_precision_at_k",caseRows.filter(r=>Number(r.case_id)===c)));
 profileHeatmap("figure_4_8_tdmc_precision_case.svg","TDMC Precision@10 by Profile and Province",
  "Seven user profiles across three provinces",caseRows);
 const caseRelevance=cases.map(c=>reliable("plan_precision_judged",runs.filter(r=>Number(r.case_id)===c)));
 lollipop("figure_4_9_plan_relevance_case.svg","Final Plan Relevance by Test Case",
  "Mean across model plans for each case",cases.map(c=>"Case "+c),
  caseRelevance.map(v=>v*100),cases.map(()=>colors.gemini),{unit:"%"});
}else missing("Figures 4.5–4.9","Missing "+plansPath+"; run npm run eval:groundtruth");

// Optional independently validated files: CSV columns model, average_cost_usd, avg_input_tokens, avg_output_tokens, avg_seconds.
// Do not infer token usage or price from unrelated values.
const resourceFile=path.resolve(opts.resources||"comparison/evaluation/resource_summary.csv");
if(fs.existsSync(resourceFile)){
 const rows=parseCsv(fs.readFileSync(resourceFile,"utf8"));
 const metric=(column,file,title,label,unit)=> {
  const chosen=["gemini","gpt","claude"].map(m=>rows.find(r=>r.model?.toLowerCase()===m));
  if(chosen.some(r=>!r||!Number.isFinite(num(r[column])))){missing(file,"Missing validated "+column);return;}
  barChart(file,title,"Input: "+path.relative(process.cwd(),resourceFile),["Gemini","GPT","Claude"],
   chosen.map(r=>num(r[column])),[colors.gemini,colors.gpt,colors.claude],{yLabel:label,fmt:v=>v.toFixed(3)+unit});
 };
 metric("average_cost_usd","figure_4_10_api_cost.svg","Average AI API Cost per Itinerary","USD / plan"," USD");
 metric("avg_seconds","figure_4_11_processing_time.svg","Average AI Processing Time","Seconds / plan"," s");
 metric("avg_input_tokens","figure_4_12_input_tokens.svg","Average Input Tokens","Tokens / plan","");
 metric("avg_output_tokens","figure_4_13_output_tokens.svg","Average Output Tokens","Tokens / plan","");
}else missing("Figures 4.10–4.13","Optional validated resource_summary.csv not present");

const report={
 generated,skipped,
 sources:{algorithm:algorithm?algorithmPath:null,plans:runs?plansPath:null},
 notes:[
 "Do not label shared TDMC rank scores as AI model precision.",
 "Algorithm summary and production plan logs may represent different ranking runs.",
 "Average attraction distance is not the same as full itinerary route distance.",
 "Missing measurements are not treated as zero."
 ]};
fs.writeFileSync(path.join(out,"figure_manifest.json"),JSON.stringify(report,null,2),"utf8");
console.log("\nFigures generated:",generated.length,"| skipped:",skipped.length,"\nFolder:",out);
if(skipped.length)console.table(skipped);
