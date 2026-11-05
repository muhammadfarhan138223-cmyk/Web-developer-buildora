import {validPath,applyChanges} from '../lib/files.js';
import {parseAIResponse} from './responseParser.js';
import {scanProject} from '../lib/projectScanner.js';

export function parseBuildPlan(content){
 const raw=String(content).trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
 let plan;try{plan=JSON.parse(raw)}catch{throw Object.assign(new Error('The build plan was incomplete. Retry to create a fresh plan.'),{code:'INCOMPLETE_STEP'})}
 if(!plan||!Array.isArray(plan.files)||!plan.files.length||plan.files.length>32)throw new Error('Build plans must contain 1–32 small files.');
 const paths=new Set();
 for(const file of plan.files){if(!file||!validPath(file.path)||paths.has(file.path)||typeof file.purpose!=='string'||file.purpose.length>1500)throw new Error('The model returned an invalid build plan.');paths.add(file.path)}
 if(plan.delete!==undefined&&(!Array.isArray(plan.delete)||plan.delete.length>32||plan.delete.some(path=>!validPath(path)||paths.has(path))))throw new Error('Invalid deletion in build plan.');
 return {summary:String(plan.summary||'Build complete').slice(0,1500),architecture:String(plan.architecture||'').slice(0,5000),files:plan.files,delete:plan.delete||[]};
}
export function cancellableWait(ms,signal){return new Promise((resolve,reject)=>{
 if(signal?.aborted)return reject(new DOMException('Stopped','AbortError'));
 const abort=()=>{clearTimeout(timer);reject(new DOMException('Stopped','AbortError'))};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve()},ms);signal?.addEventListener('abort',abort,{once:true});
})}
export async function runStagedBuild({message,snapshot,request,checkpoint,onCheckpoint=()=>{},onProgress=()=>{},signal,paceMs=6000,wait=cancellableWait}){
 const compatible=checkpoint?.version===1&&checkpoint.message===message&&JSON.stringify(checkpoint.snapshot)===JSON.stringify(snapshot);
 let job=compatible?checkpoint:{version:1,message,snapshot,plan:null,completed:[]};
 if(compatible){
  job.plan=parseBuildPlan(JSON.stringify(job.plan));
  if(!Array.isArray(job.completed)||job.completed.length>job.plan.files.length||job.completed.some((op,i)=>op.type!=='write'||op.path!==job.plan.files[i].path||typeof op.content!=='string'))throw new Error('Saved build checkpoint is invalid. Start with a revised prompt.');
 }
 let lastStart=0;
 async function step(body,parse){
  for(let attempt=0;attempt<3;attempt++){
   if(signal?.aborted)throw new DOMException('Stopped','AbortError');
   await wait(Math.max(0,paceMs-(Date.now()-lastStart)),signal);lastStart=Date.now();
   try{const response=await request({...body,compact:attempt>0});return parse(response.content)}
   catch(error){
    const retry=[429,502,503,504].includes(error.status)||['OUTPUT_LIMIT','INCOMPLETE_STEP'].includes(error.code);
    if(!retry||attempt===2)throw error;
    const delay=error.status===429?Math.max(15000*(attempt+1),Math.min(120000,Number(error.retryAfterMs)||0)):2000*(attempt+1);
    onProgress(`Waiting ${Math.ceil(delay/1000)}s before retry ${attempt+1}/2. Completed files are kept.`);await wait(delay,signal);
   }
  }
 }
 if(!job.plan){onProgress('Planning pages, components, styling and backend…');job.plan=await step({mode:'build-plan',message,projectContext:scanProject(snapshot)},parseBuildPlan);onCheckpoint(job)}
 let working=applyChanges(snapshot,job.completed);
 for(let i=job.completed.length;i<job.plan.files.length;i++){
  const file=job.plan.files[i];onProgress(`Building ${i+1}/${job.plan.files.length}: ${file.path}`);
  const op=await step({mode:'build-file',message,plan:job.plan,file,projectContext:scanProject(working,file.path+' '+file.purpose)},content=>{
   const parsed=parseAIResponse(content);
   if(parsed.malformed.length||parsed.operations.length!==1||parsed.operations[0].type!=='write'||parsed.operations[0].path!==file.path)throw Object.assign(new Error(`Incomplete ${file.path}; completed files are kept. Send the same prompt to resume.`),{code:'INCOMPLETE_STEP'});
   if(file.path.endsWith('.json')){try{JSON.parse(parsed.operations[0].content)}catch{throw Object.assign(new Error(`Invalid JSON in ${file.path}`),{code:'INCOMPLETE_STEP'})}}
   applyChanges(working,parsed.operations);return parsed.operations[0];
  });
  working=applyChanges(working,[op]);job={...job,completed:[...job.completed,op]};onCheckpoint(job);
 }
 const operations=[...job.completed,...job.plan.delete.map(path=>({type:'delete',path}))];
 return {operations,files:applyChanges(snapshot,operations),text:job.plan.summary,malformed:[]};
}
