/** Visualize real personalization CSV outputs. Run after eval:personalization. */
import fs from "node:fs";
import path from "node:path";
const source=path.resolve("comparison/personalization");
const out=path.resolve("comparison/figures");
fs.mkdirSync(out,{recursive:true});
function readCsv(file){
 const raw=fs.readFileSync(path.join(source,file),"utf8").replace(/^\uFEFF/,"");
 const lines=[];let row=[],field="",quote=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];
  if(quote){if(c==='"'&&raw[i+1]==='"'){field+='"';i++;}else if(c==='"')quote=false;else field+=c;}
  else if(c==='"')quote=true;
  else if(c===','){row.push(field);field="";}
  else if(c==='\n'){row.push(field.replace(/\r$/,""));lines.push(row);row=[];field="";}
  else field+=c;
 }
 if(field||row.length){row.push(field);lines.push(row);}
 const headers=lines.shift()||[];
 return lines.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
const esc=x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const txt=(x,y,s,size=20,anchor="middle",color="#252334",weight=500)=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-family="Arial, Noto Sans Thai, sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'">'+esc(s)+'</text>';
const palette=v=>{const opacity=.12+.84*Math.min(1,Math.max(0,v));return 'fill="#7351A5" fill-opacity="'+opacity+'"';};
const provinces=["กรุงเทพมหานคร","เชียงใหม่","ภูเก็ต"],en=["Bangkok","Chiang Mai","Phuket"];
function save(name,rows){const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 940" width="1280" height="940"><rect width="1280" height="940" fill="#FBFAFD"/>'+rows.join("\n")+"</svg>";fs.writeFileSync(path.join(out,name),svg,"utf8");console.log("+",name);}
const coverage=readCsv("preference_coverage.csv");
const k=10,algorithm="TDMC-APD",dims={left:270,top:190,cw:295,ch:88};
for(const metric of ["micro_coverage","macro_coverage"]){
 const e=[txt(640,74,metric==="micro_coverage"?"Preference Coverage (Micro)":"Preference Coverage (Macro)",32,"middle","#252334",700),
  txt(640,111,"TDMC-APD | K = 10 | values as percentages (7 profiles x 3 provinces)",18,"middle","#667085",400)];
 en.forEach((p,j)=>e.push(txt(dims.left+j*dims.cw+dims.cw/2,dims.top-25,p,23,"middle","#252334",700)));
 for(let i=1;i<=7;i++){
  const y=dims.top+(i-1)*dims.ch;
  e.push(txt(dims.left-35,y+48,"Case "+i,22,"end"));
  provinces.forEach((province,j)=>{
   const rec=coverage.find(r=>+r.case_id===i&&r.province===province&&r.algorithm===algorithm&&+r.k===k);
   const val=rec&&rec[metric]!==""?Number(rec[metric]):NaN;
   const x=dims.left+j*dims.cw+7;
   e.push('<rect x="'+x+'" y="'+y+'" width="'+(dims.cw-14)+'" height="'+(dims.ch-10)+'" rx="12" '+(Number.isFinite(val)?palette(val):'fill="#E4E4E9"')+'/>',
    txt(x+(dims.cw-14)/2,y+47,Number.isFinite(val)?(val*100).toFixed(1)+"%":"N/A",23,"middle",val>=.6?"#FFFFFF":"#252334",700));
  });
 }
 e.push(txt(640,869,"Computed from categorical attraction tags, not from subjective ratings",17,"middle","#667085",400));
 save("figure_4_3_preference_"+metric+"_heatmap.svg",e);
}
const jaccard=readCsv("profile_jaccard.csv");
for(let z=0;z<provinces.length;z++){
 const province=provinces[z],e=[txt(640,74,"Pairwise Profile Jaccard — "+en[z],31,"middle","#252334",700),
  txt(640,111,"TDMC-APD | K = 10 | shared attraction IDs between profiles",18,"middle","#667085",400)];
 const x0=312,y0=165,cell=92;
 for(let a=1;a<=7;a++){
  e.push(txt(x0+(a-.5)*cell,y0-23,"Case "+a,16,"middle","#252334",600),
   txt(x0-27,y0+(a-.5)*cell+6,"Case "+a,16,"end","#252334",600));
  for(let b=1;b<=7;b++){
   const val=a===b?1:Number(jaccard.find(r=>r.province===province&&r.algorithm===algorithm&&+r.k===k&&+r.case_a===Math.min(a,b)&&+r.case_b===Math.max(a,b))?.jaccard);
   const x=x0+(b-1)*cell,y=y0+(a-1)*cell;
   e.push('<rect x="'+(x+3)+'" y="'+(y+3)+'" width="'+(cell-6)+'" height="'+(cell-6)+'" rx="10" '+(Number.isFinite(val)?palette(val):'fill="#E4E4E9"')+'/>',
    txt(x+cell/2,y+cell/2+8,Number.isFinite(val)?val.toFixed(2):"N/A",19,"middle",val>=.6?"#FFFFFF":"#252334",600));
  }
 }
 e.push(txt(640,869,"Diagonal = same profile (1.00); off-diagonal = two different profiles",17,"middle","#667085",400));
 save("figure_4_3_jaccard_"+["bangkok","chiangmai","phuket"][z]+".svg",e);
}
