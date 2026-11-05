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
test('guest can generate with an explicit own key without a Buildora account',async()=>{
 const original=global.fetch;global.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'```file:index.html\n<h1>Guest project</h1>\n```'}}]}));
 const res={code:200,setHeader(){},status(n){this.code=n;return this},json(data){this.data=data;return this}};
 try{await handler({method:'POST',headers:{'content-type':'application/json'},socket:{remoteAddress:'127.0.0.1'},body:{message:'Build a page',connection:{provider:'openai',apiKey:'test-only',model:'selected-model'}}},res);assert.equal(res.code,200);assert.match(res.data.content,/Guest project/)}finally{global.fetch=original}
});
test('auth app starter contains real Supabase auth, OAuth, owner policies and editor workspace',()=>{
 const files=authStarter('https://project.supabase.co','sb_publishable_example');
 assert.match(files['src/App.jsx'],/signInWithOAuth/);assert.match(files['src/App.jsx'],/signInWithPassword/);assert.match(files['schema.sql'],/enable row level security/);assert.match(files['schema.sql'],/with check/);assert.ok(files['my-app.code-workspace']);assert.equal(JSON.parse(files['package.json']).dependencies['@supabase/supabase-js'],'2.117.3');
});
