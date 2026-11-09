import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConnection,listModels,generateWithKey} from '../server/byok.js';
import handler from '../api/chat.js';
import {authStarter} from '../src/lib/authStarter.js';
test('custom provider rejects private/unapproved hosts, credentials and redirects',()=>{
  for(const baseUrl of ['http://127.0.0.1:11434','https://internal.example/v1','https://user:pass@example.com/v1'])assert.throws(()=>validateConnection({provider:'custom',apiKey:'test',baseUrl}));
  process.env.AI_ALLOWED_HOSTS='trusted.example';
  try{assert.equal(validateConnection({provider:'custom',apiKey:'test',baseUrl:'https://trusted.example/v1'}).base,'https://trusted.example/v1');assert.throws(()=>validateConnection({provider:'custom',apiKey:'test',baseUrl:'https://trusted.example:9999/v1'}));}finally{delete process.env.AI_ALLOWED_HOSTS}
});
test('BYOK adapters use per-request credentials and provider-specific protocol',async()=>{
 const original=global.fetch,calls=[];
 global.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/models')?{data:[{id:'model-z'},{id:'model-a'}]}:url.includes('anthropic')?{content:[{type:'text',text:'anthropic output'}]}:url.includes('googleapis')?{candidates:[{content:{parts:[{text:'gemini output'}]}}]}:{choices:[{message:{content:'compatible output'}}]}),{status:200})};
 try{
  assert.deepEqual(await listModels({provider:'openai',apiKey:'ephemeral-key'}),['model-a','model-z']);
  for(const provider of ['openai','anthropic','gemini']){const result=await generateWithKey({provider,apiKey:'ephemeral-key',model:'chosen-model'},[{role:'system',content:'instruction'},{role:'user',content:'build'}]);assert.ok(result.content);assert.equal(result.model,'chosen-model')}
  assert.equal(calls[1].options.headers.Authorization,'Bearer ephemeral-key');assert.equal(calls[2].options.headers['x-api-key'],'ephemeral-key');assert.equal(calls[3].options.headers['x-goog-api-key'],'ephemeral-key');assert.ok(calls.every(c=>c.options.redirect==='error'));
  assert.equal(process.env.OPENAI_API_KEY,undefined);
 }finally{global.fetch=original}
});
test('AI requires an account even with a key, and authenticated BYOK succeeds',async()=>{
 const original=global.fetch;let calls=0;global.fetch=async(url)=>{calls++;return String(url).includes('/auth/v1/user')?new Response(JSON.stringify({id:'test-owner'})):new Response(JSON.stringify({choices:[{message:{content:'Signed-in response'}}]}))};
 const response=()=>({code:200,setHeader(){},status(n){this.code=n;return this},json(data){this.data=data;return this}});
 const request={method:'POST',headers:{'content-type':'application/json'},socket:{remoteAddress:'127.0.0.1'},body:{mode:'conversation',message:'Hi',connection:{provider:'openai',apiKey:'test-only',model:'selected-model'}}};
 try{const guest=response();await handler(request,guest);assert.equal(guest.code,401);assert.equal(calls,0);const signed=response();await handler({...request,headers:{...request.headers,authorization:'Bearer test-session'}},signed);assert.equal(signed.code,200);assert.match(signed.data.content,/Signed-in response/)}finally{global.fetch=original}
});
test('auth app starter contains real Supabase auth, OAuth, owner policies and editor workspace',()=>{
 const files=authStarter('https://project.supabase.co','sb_publishable_example');
 assert.match(files['src/App.jsx'],/signInWithOAuth/);assert.match(files['src/App.jsx'],/signInWithPassword/);assert.match(files['schema.sql'],/enable row level security/);assert.match(files['schema.sql'],/with check/);assert.ok(files['my-app.code-workspace']);assert.equal(JSON.parse(files['package.json']).dependencies['@supabase/supabase-js'],'2.117.3');
});
