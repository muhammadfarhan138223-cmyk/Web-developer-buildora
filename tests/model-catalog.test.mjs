import test from 'node:test';
import assert from 'node:assert/strict';
import {modelCatalog} from '../server/byok.js';
import {SYSTEM_PROMPT} from '../src/ai/contextManager.js';
import {reactStarterFiles} from '../src/lib/reactStarter.js';
test('live Gemini catalog follows pages, excludes non-generation models and never assumes free pricing',async()=>{
 const original=global.fetch;const urls=[];
 global.fetch=async url=>{urls.push(url);return new Response(JSON.stringify(urls.length===1?{models:[{name:'models/flash',supportedGenerationMethods:['generateContent']},{name:'models/embedding',supportedGenerationMethods:['embedContent']}],nextPageToken:'next page'}:{models:[{name:'models/pro',supportedGenerationMethods:['generateContent']}]}))};
 try{const models=await modelCatalog({provider:'gemini',apiKey:'test'});assert.deepEqual(models.map(m=>m.id),['flash','pro']);assert.ok(models.every(m=>m.pricing==='unknown'));assert.match(urls[1],/pageToken=next%20page/)}finally{global.fetch=original}
});
test('catalog distinguishes reported free and paid prices, filters image-only output and deduplicates',async()=>{
 const original=global.fetch;
 global.fetch=async()=>new Response(JSON.stringify({data:[{id:'paid',pricing:{prompt:'0.1',completion:'0.2'}},{id:'free',pricing:{prompt:'0',completion:'0'}},{id:'unknown'},{id:'unknown'},{id:'image',architecture:{output_modalities:['image']}}]}));
 try{const models=await modelCatalog({provider:'openrouter',apiKey:'test'});assert.equal(models[0].id,'free');assert.equal(models.find(m=>m.id==='paid').pricing,'paid');assert.equal(models.find(m=>m.id==='unknown').pricing,'unknown');assert.equal(models.length,3)}finally{global.fetch=original}
});
test('React starter contains declared runtime, imported CSS, components and real settings; generation defaults to React',()=>{
 const pkg=JSON.parse(reactStarterFiles['package.json']);assert.match(pkg.scripts.dev,/--host 0.0.0.0/);assert.ok(pkg.dependencies.react);assert.match(reactStarterFiles['src/main.jsx'],/import '.\/styles.css'/);assert.match(reactStarterFiles['src/App.jsx'],/localStorage.setItem/);assert.ok(reactStarterFiles['src/components/Header.jsx']);assert.match(SYSTEM_PROMPT,/default to React/);assert.doesNotMatch(SYSTEM_PROMPT,/Every page must load Tailwind/);
});
