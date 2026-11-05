import test from 'node:test';
import assert from 'node:assert/strict';
import {networkError,providerError} from '../server/provider-errors.js';
import {providerHealth,generateWithKey,listModels} from '../server/byok.js';
test('blocked network, DNS, TLS and timeouts get distinct safe errors',()=>{
 for(const [cause,code] of [['EACCES','NETWORK_BLOCKED'],['ENOTFOUND','DNS_FAILED'],['SELF_SIGNED_CERT_IN_CHAIN','TLS_FAILED'],['ETIMEDOUT','PROVIDER_TIMEOUT']]){const error=networkError({cause:{code:cause},message:'private-token'});assert.equal(error.code,code);assert.ok(!error.message.includes('private-token'))}
});
test('key, model, quota and upstream failures stay distinct without reflecting secrets',()=>{
 assert.equal(providerError(400,{error:{message:'API key not valid: private-token'}}).code,'INVALID_API_KEY');
 assert.equal(providerError(404,{}).code,'MODEL_NOT_FOUND');assert.equal(providerError(429,{}).code,'PROVIDER_QUOTA');assert.equal(providerError(503,{}).code,'PROVIDER_UNAVAILABLE');assert.ok(!providerError(400,{error:{message:'private-token'}}).message.includes('private-token'));
});
test('health accepts an auth challenge as connectivity, not authenticated readiness',async()=>{
 const original=global.fetch;global.fetch=async()=>new Response('{}',{status:403});
 try{const health=await providerHealth('gemini');assert.equal(health.reachable,true);assert.match(health.message,/connectivity only/);await assert.rejects(listModels({provider:'gemini',apiKey:'test'}),e=>e.code==='PROVIDER_FORBIDDEN')}finally{global.fetch=original}
});
test('Gemini prefix normalization and truncated generation rejection',async()=>{
 const original=global.fetch;let called;
 global.fetch=async(url)=>{called=url;return new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial files'}]}}]}))};
 try{await assert.rejects(generateWithKey({provider:'gemini',apiKey:'test',model:'models/example'},[{role:'user',content:'hello'}]),e=>e.status===422);assert.match(called,/\/models\/example:generateContent$/)}finally{global.fetch=original}
});
