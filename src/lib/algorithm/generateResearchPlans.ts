import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { TEST_PROFILES } from "./experimentConfig";

// Default run: 1 case, 1 province, 3 paid model calls, 1 round.
// --all --rounds 5 --confirm-batch-cost: 135 calls.
const argv=process.argv.slice(2);
const all=argv.includes("--all");
const roundsIndex=argv.indexOf("--rounds");
const rounds=roundsIndex<0?1:Number(argv[roundsIndex+1]);
if(!Number.isInteger(rounds)||rounds<1||rounds>5)throw Error("Invalid --rounds (1 to 5)");
if(all&&rounds>1&&!argv.includes("--confirm-batch-cost"))throw Error("Add --confirm-batch-cost for paid batch");
const daysIndex=argv.indexOf("--days");
const days=daysIndex<0?3:Number(argv[daysIndex+1]);
if(!Number.isInteger(days)||days<1||days>14)throw Error("Invalid --days");
const caseIndex=argv.indexOf("--case");
const caseId=caseIndex<0?"case1":argv[caseIndex+1];
const provinceIndex=argv.indexOf("--province");
const provinceChoice=provinceIndex<0?null:argv[provinceIndex+1];
const selected=all?TEST_PROFILES:TEST_PROFILES.filter(x=>x.id===caseId);
if(!selected.length)throw Error("Invalid case");
const specs=[["gemini","OPENROUTER_MODEL_GEMINI"],["gpt","OPENROUTER_MODEL_GPT"],["claude","OPENROUTER_MODEL_CLAUDE"]];
for(const k of ["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","OPENROUTER_API_KEY",...specs.map(s=>s[1])])
  if(!process.env[k])throw Error("Missing env variable "+k);
const client=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const output=path.join(process.cwd(),"comparison","plan_runs.json");
const rawDir=path.join(process.cwd(),"comparison","generated_plans");
const tags=(v:unknown):string[]=>Array.isArray(v)?v.map(String):[];
async function loadCandidates(province:string,profile:any){
  const places:any[]=[];
  for(let from=0;;from+=1000){
    const {data,error}=await client.from("attraction").select("att_id,name_th,province,travel_type,activities,atmosphere,budget,travel_companion,suitable_duration").eq("province",province).range(from,from+999);
    if(error)throw error;
    places.push(...(data??[]));
    if((data??[]).length<1000)break;
  }
  const score=(p:any)=>tags(p.travel_type).filter(x=>tags(profile.trip.travelType).includes(x)).length*10+
    tags(p.activities).filter(x=>tags(profile.trip.activities).includes(x)).length*5;
  return places.filter(p=>p.att_id&&p.name_th)
    .sort((a,b)=>score(b)-score(a)||String(a.att_id).localeCompare(String(b.att_id))).slice(0,30);
}
async function main(){
  await fs.mkdir(rawDir,{recursive:true});
  let saved:any={runs:[]};
  try{saved=JSON.parse(await fs.readFile(output,"utf8"))}catch(e:any){if(e.code!=="ENOENT")throw e}
  if(Array.isArray(saved))saved={runs:saved};
  if(!Array.isArray(saved.runs))throw Error("plan_runs.json must contain runs[]");
  for(const profile of selected){
    const provinces=all?profile.testProvinces:[provinceChoice||profile.testProvinces[0]];
    for(const province of provinces){
      if(!profile.testProvinces.includes(province))throw Error("Province does not belong to "+profile.id);
      const pool=await loadCandidates(province,profile);
      if(pool.length<3)throw Error("Insufficient attraction records: "+province);
      const byId=new Map(pool.map((p:any)=>[String(p.att_id),p]));
      for(const [label,key] of specs)for(let round=1;round<=rounds;round++){
        const runId=[profile.id,province,label,String(round).padStart(2,"0")].join("-");
        if(saved.runs.some((x:any)=>x.run_id===runId)){console.log("SKIP",runId);continue}
        const model=process.env[key]!;
        const prompt=JSON.stringify({instruction:"Create a Thai travel itinerary. Return ONLY JSON with places array of {att_id,day,start,end}, and summary. Use ONLY candidate att_id. Include 2-4 attractions per day. Do not invent opening hours, route times or precise prices.",profile,province,days,candidates:pool.map((p:any)=>({att_id:p.att_id,name:p.name_th,travel_type:p.travel_type,activities:p.activities,atmosphere:p.atmosphere,suitable_duration:p.suitable_duration}))});
        const started=Date.now();let response:any;let generated:any;let error:string|null=null;
        try{
          const http=await fetch("https://openrouter.ai/api/v1/chat/completions",{
            method:"POST",headers:{"Authorization":"Bearer "+process.env.OPENROUTER_API_KEY,"Content-Type":"application/json","X-Title":"TravelWish Research"},
            body:JSON.stringify({model,temperature:0.3,max_tokens:2500,messages:[{role:"system",content:"You plan Thai trips. Reply only valid JSON."},{role:"user",content:prompt}]})
          });
          response=await http.json();
          if(!http.ok)throw Error("OpenRouter "+http.status+": "+JSON.stringify(response.error).slice(0,300));
          let raw=String(response.choices?.[0]?.message?.content??"").trim();
          if(raw.startsWith("```"))raw=raw.replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,"");
          generated=JSON.parse(raw);
          if(!Array.isArray(generated.places))throw Error("Response has no places[]");
          for(const item of generated.places)if(!byId.has(String(item.att_id)))throw Error("Unknown attraction ID "+item.att_id);
        }catch(e:any){error=String(e?.message??e)}
        const elapsed=Date.now()-started;
        await fs.writeFile(path.join(rawDir,runId+".json"),JSON.stringify({profile,province,days,model,pool,generated,usage:response?.usage,error,created_at:new Date().toISOString()},null,2));
        const places=(generated?.places??[]).map((item:any)=>{
          const p:any=byId.get(String(item.att_id));
          return {kind:"attraction",id:String(item.att_id),name:p?.name_th,province:p?.province,verified:p?true:null,travel_type:p?.travel_type,activities:p?.activities,atmosphere:p?.atmosphere,budget:p?.budget,travel_companion:p?.travel_companion,day:item.day,start:item.start,end:item.end};
        });
        saved.runs.push({case_id:profile.id,province,model,run_id:runId,expected_days:days,budget_thb:profile.trip.budget,profile:{travel_type:profile.trip.travelType,activities:profile.trip.activities,atmosphere:profile.trip.atmosphere,companion_tags:[profile.trip.companion]},places,constraints:[{name:"generation",status:error?"fail":"pass",evidence:error??"Valid model response"}],api:{request_success:!error,input_tokens:response?.usage?.prompt_tokens??null,output_tokens:response?.usage?.completion_tokens??null,cost_usd:response?.usage?.cost??null,latency_ms:elapsed}});
        await fs.writeFile(output,JSON.stringify(saved,null,2));
        console.log(error?"FAILED":"SAVED",runId,error??"");
      }
    }
  }
  console.log("Saved",saved.runs.length,"runs at",output);
}
main().catch(e=>{console.error(e);process.exitCode=1});
