import test from 'node:test';
import assert from 'node:assert/strict';
import {runStagedBuild,parseBuildPlan,cancellableWait} from '../src/ai/stagedBuild.js';
import {terminalText,withDeadline} from '../src/lib/runtimeOutput.js';
const plan={summary:'Ready',architecture:'Shared CSS and React',files:[{path:'src/styles.css',purpose:'styles'},{path:'src/App.jsx',purpose:'app'}]};
const block=(path,content)=>({content:'```file:'+path+'\n'+content+'\n```'});
const base={message:'Build a website',snapshot:{'old.txt':'keep'},paceMs:0,wait:async()=>{}};
test('interrupted file build resumes after completed checkpoint without changing original workspace',async()=>{
 let saved,calls=[];
 await assert.rejects(runStagedBuild({...base,onCheckpoint:j=>saved=structuredClone(j),request:async b=>{calls.push(b.mode);if(b.mode==='build-plan')return {content:JSON.stringify(plan)};if(b.file.path.endsWith('.css'))return block(b.file.path,'body{color:red}');throw Object.assign(new Error('quota'),{status:429})}}),/quota/);
 assert.equal(saved.completed.length,1);assert.deepEqual(base.snapshot,{'old.txt':'keep'});
 const paths=[];const result=await runStagedBuild({...base,checkpoint:saved,request:async b=>{paths.push(b.file.path);return block(b.file.path,'export default function App(){return <h1>Hello</h1>}')}});
 assert.deepEqual(paths,['src/App.jsx']);assert.equal(result.operations.length,2);assert.match(result.files['src/styles.css'],/red/);
});
test('429 respects cooldown then retries; output truncation requests compact version',async()=>{
 let calls=0,delays=[],compact=[];
 const result=await runStagedBuild({...base,wait:async ms=>delays.push(ms),request:async b=>{
  if(b.mode==='build-plan')return {content:JSON.stringify({...plan,files:plan.files.slice(0,1)})};compact.push(b.compact);calls++;
  if(calls===1)throw Object.assign(new Error('busy'),{status:429,retryAfterMs:20000});
  if(calls===2)return {content:'```file:src/styles.css\nbody{'};
  return block(b.file.path,'body{margin:0}');
 }});assert.deepEqual(compact,[false,true,true]);assert.ok(delays.includes(20000));assert.equal(result.operations.length,1);
});
test('wrong file paths are never applied and retries are bounded',async()=>{
 let count=0;await assert.rejects(runStagedBuild({...base,request:async b=>{if(b.mode==='build-plan')return {content:JSON.stringify(plan)};count++;return block('wrong.js','oops')}}),/Incomplete/);assert.equal(count,3);
 assert.throws(()=>parseBuildPlan(JSON.stringify({files:[{path:'../escape',purpose:'bad'}]})),/invalid/);
});
test('cancellation interrupts cooldown promptly',async()=>{
 const abort=new AbortController();const pending=cancellableWait(60000,abort.signal);abort.abort();await assert.rejects(pending,{name:'AbortError'});
});
test('terminal escape codes split between chunks are removed',()=>{
 const clean=terminalText();assert.equal(clean('\x1b[3'),'');assert.equal(clean('2mInstalled\x1b[0m\r\n'),'Installed\n');assert.equal(clean('\x1b]0;secret title'),'');assert.equal(clean('\x07Ready'),'Ready');
});
test('runtime deadlines stop stalled processes and preserve successful results',async()=>{
 let killed=false;await assert.rejects(withDeadline(new Promise(()=>{}),5,'timed out',()=>killed=true),/timed out/);assert.ok(killed);assert.equal(await withDeadline(Promise.resolve(0),50,'oops'),0);
});
