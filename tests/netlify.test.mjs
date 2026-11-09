import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/api.mjs';
import {generateWithRouting} from '../server/byok.js';
test('Netlify bridge returns JSON config and model API instead of SPA HTML',async()=>{
 const original=global.fetch,old=process.env.NETLIFY;process.env.NETLIFY='true';
 global.fetch=async(url)=>String(url).includes('/auth/v1/user')?new Response(JSON.stringify({id:'test-owner'})):new Response(JSON.stringify({models:[{name:'models/flash',supportedGenerationMethods:['generateContent']}]}));
 try{
  let r=await handler(new Request('https://buildora.example/.netlify/functions/api/config'));assert.equal(r.status,200);assert.equal((await r.json()).authProvider,'supabase');
  r=await handler(new Request('https://buildora.example/.netlify/functions/api/models',{method:'POST',headers:{'Content-Type':'application/json',authorization:'Bearer test-session',origin:'https://buildora.example'},body:JSON.stringify({provider:'gemini',apiKey:'test'})}),{ip:'test-client'});assert.equal(r.status,200);assert.equal((await r.json()).catalog[0].id,'flash');
  r=await handler(new Request('https://buildora.example/.netlify/functions/api/models',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://evil.example'},body:'{}'}));assert.equal(r.status,403);
 }finally{global.fetch=original;if(old===undefined)delete process.env.NETLIFY;else process.env.NETLIFY=old}
});
test('busy model falls back to free catalog model without touching paid alternatives',async()=>{
 const original=global.fetch,calls=[];
 global.fetch=async(url,options)=>{
  if(url.endsWith('/key'))return new Response('{}');
  if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'paid',pricing:{prompt:'1',completion:'1'}},{id:'free',pricing:{prompt:'0',completion:'0'}}]}));
  const body=JSON.parse(options.body);calls.push(body.model);
  return body.model==='busy'?new Response('{}',{status:429}):new Response(JSON.stringify({choices:[{message:{content:'complete code'}}]}));
 };
 try{const result=await generateWithRouting({provider:'openrouter',apiKey:'test',model:'busy',autoFallback:true},[{role:'user',content:'build'}]);assert.equal(result.model,'free');assert.deepEqual(calls,['busy','free'])}finally{global.fetch=original}
});
