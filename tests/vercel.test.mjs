import test from 'node:test';import assert from 'node:assert/strict';
import handler from '../api/[...path].js';
test('Vercel adapter handles parsed JSON and returns API responses with origin protection',async()=>{
 const original=global.fetch;global.fetch=async(url)=>String(url).includes('/auth/v1/user')?new Response(JSON.stringify({id:'test-owner'})):new Response(JSON.stringify({models:[{name:'models/test',supportedGenerationMethods:['generateContent']}]}));
 const invoke=async(path,body,origin='https://buildora.test')=>{let content,status=200,headers={};const response={writableEnded:false,set statusCode(n){status=n},get statusCode(){return status},setHeader(k,v){headers[k]=v},end(value){content=value;this.writableEnded=true}};await handler({method:body?'POST':'GET',url:path,body,headers:{authorization:'Bearer test-session',host:'buildora.test',origin,'content-type':'application/json'},socket:{remoteAddress:'vercel-test'}},response);return {status,headers,data:JSON.parse(content)}};
 try{const config=await invoke('/api/config');assert.equal(config.status,200);const models=await invoke('/api/models',{provider:'gemini',apiKey:'test-only'});assert.equal(models.status,200);assert.equal(models.data.models[0],'test');assert.equal((await invoke('/api/models',{},'https://unrelated.test')).status,403)}finally{global.fetch=original}
});
