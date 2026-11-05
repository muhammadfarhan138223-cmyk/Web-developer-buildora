import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {templateCatalog} from '../src/lib/templateCatalog.js';import {templateFiles} from '../src/lib/templateFiles.js';import {validateFiles} from '../src/lib/files.js';import {buildStaticPreview} from '../src/lib/previewBuilder.js';import {structuredData,publicRoutes,metadata} from '../src/lib/site-meta.js';
test('all released templates provide valid source and runnable static assets or declared React entry',()=>{
 for(const item of templateCatalog){if(item.locked){assert.throws(()=>templateFiles(item.id),/not available/);continue}const files=templateFiles(item.id);validateFiles(files);assert.ok(files['index.html'].includes('viewport'));if(files['package.json']){assert.ok(JSON.parse(files['package.json']).scripts.dev);assert.ok(files['src/main.jsx'])}else{new vm.Script(files['script.js']);const preview=buildStaticPreview(files,'index.html');assert.ok(preview.includes('aria-expanded'));assert.ok(preview.includes('prefers-reduced-motion'));assert.ok(files['style.css'].includes('@media'));}}
});
test('creator identity links to official site and private dashboards stay out of sitemap',()=>{
 const graph=structuredData('https://buildora.farhanbalouch.com')['@graph'];const person=graph.find(x=>x['@type']==='Person');assert.equal(person.url,'https://farhanbalouch.com/');assert.equal(graph.find(x=>x['@type']==='SoftwareApplication').creator['@id'],person['@id']);assert.ok(!publicRoutes.includes('/projects'));assert.ok(!publicRoutes.includes('/builder'));for(const item of templateCatalog)assert.ok(metadata['/templates/'+item.id]);
});
import {applyTemplateToWorkspace} from '../src/lib/templateWorkspace.js';
test('using a template replaces validated workspace files and rejects unsafe files before mutations',()=>{
 let state={files:{'old.txt':'saved before replacement'},name:'Old'};const store={newProject(){state={files:{},name:'Untitled'}},setProjectFiles(files){state.files=files},setProjectName(name){state.name=name},setActiveFile(file){state.active=file}};
 assert.throws(()=>applyTemplateToWorkspace(store,{'../bad':'escape'},'Unsafe'));assert.equal(state.name,'Old');
 applyTemplateToWorkspace(store,templateFiles('cafe'),'Sunday Coffee');assert.equal(state.name,'Sunday Coffee');assert.equal(state.active,'index.html');assert.ok(state.files['script.js']);assert.equal(state.files['old.txt'],undefined);
});
