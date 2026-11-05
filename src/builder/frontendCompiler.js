import {transformVue} from './vuePreview.js';
import {validateFiles} from '../lib/files.js';
import {detectCode} from './chatFiles.js';
const ext=['','.vue','.tsx','.ts','.jsx','.js','.mjs','.json','.css','/index.tsx','/index.ts','/index.jsx','/index.js'];
export function normalizePath(path,from=''){
 const parts=(path.startsWith('/')?path.slice(1):from.split('/').slice(0,-1).concat(path).join('/')).split('/'),out=[];
 for(const p of parts){if(!p||p==='.')continue;if(p==='..'){if(!out.length)throw new Error('Import leaves the project.');out.pop()}else out.push(p)}return out.join('/');
}
export function resolveImport(spec,from,files){
 const root=spec.startsWith('@/')?'src/'+spec.slice(2):normalizePath(spec,from);
 const found=ext.map(e=>root+e).find(p=>typeof files[p]==='string');
 if(!found)throw new Error(`Cannot find “${spec}” imported by ${from||'entry'}. Check the filename and import path.`);return found;
}
export function detectFrontend(files,page){
 validateFiles(files);const html=page&&files[page]!==undefined?page:files['index.html']!==undefined?'index.html':Object.keys(files).find(p=>p.endsWith('.html'));
 const reactEntry=['src/main.tsx','src/main.jsx','src/index.tsx','src/index.jsx'].find(p=>files[p]!==undefined);
 if(html&&reactEntry&&!/<script\b/i.test(files[html])&&!(files[html].match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]||'').replace(/<div[^>]*id=["']root["'][^>]*>\s*<\/div>/gi,'').trim())return {type:'react',entry:reactEntry};
 const vue=Object.keys(files).find(p=>p.endsWith('.vue'));if(vue&&(!html||!files[html].trim()))return {type:'vue',entry:vue};
 if(html&&(/<script\b|<body[^>]*>\s*\S|<(h[1-6]|main|section|div|p)\b/i.test(files[html])))return {type:'html',page:html};
 const entry=['src/main.tsx','src/main.jsx','src/index.tsx','src/index.jsx','src/main.ts','src/main.js','main.tsx','main.jsx','main.ts','main.js','index.tsx','index.jsx','index.ts','index.js','script.js'].find(p=>files[p]!==undefined);
 if(entry)return {type:/\.[jt]sx$/.test(entry)?'react':'script',entry};
 const app=['src/App.tsx','src/App.jsx','App.tsx','App.jsx'].find(p=>files[p]!==undefined);if(app)return {type:'react-app',entry:app};
 const source=Object.keys(files).filter(p=>/\.[jt]sx?$/.test(p));if(source.length===1)return {type:/\.[jt]sx$/.test(source[0])?'react-app':'script',entry:source[0]};
 const css=Object.keys(files).find(p=>p.endsWith('.css'));if(css&&!html)return {type:'style',entry:css};
 const unsupported=Object.keys(files).find(p=>/\.(svelte|astro|scss|sass|less|pug|php|py|java|cpp)$/.test(p));if(unsupported)throw new Error('This browser preview cannot compile '+unsupported+'. Import its compiled HTML/CSS/JavaScript output. Backend runtimes are not supported.');
 if(html)return {type:'html',page:html};
 throw new Error('Add index.html, main.js, main.ts, or a React JSX/TSX entry file to start the frontend preview. Backend runtimes are outside this preview phase.');
}
const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'=["\\\']([^"\\\']+)["\\\']','i'))?.[1];
const escapeScript=s=>String(s).replace(/<\/script/gi,'<\\/script');
const escapeStyle=s=>String(s).replace(/<\/style/gi,'<\\/style');
const inject=(html,text)=>/<\/head>/i.test(html)?html.replace(/<\/head>/i,()=>text+'</head>'):text+html;
export const previewPolicy="default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline' https:; img-src data: blob: https:; font-src data: https:; connect-src 'none'; media-src data: blob: https:; object-src 'none'; base-uri 'none'; form-action 'none'";
export function needsTailwind(files){return Object.values(files).some(s=>/\b(?:bg-|text-|rounded-|flex|grid|p-[0-9]|min-h-|font-bold|w-full)/.test(s))}
export function canPreviewDirectly(files,page){try{if(needsTailwind(files)||Object.values(files).some(s=>/^\s*<template[\s>]/.test(s)))return false;const project=detectFrontend(files,page);if(project.page&&files[project.page].trim()&&detectCode(files[project.page]).language!=='html')return false;return project.type==='html'&&!/^\s*(?:import\b|export\b|(?:const|function)\s)/.test(files[project.page])&&!/<script\b/i.test(files[project.page])&&!['script.js','main.js','app.js'].some(p=>files[p]!==undefined)&&!Object.entries(files).some(([p,text])=>p.endsWith('.css')&&/@import|url\(/i.test(text))}catch{return false}}
export async function compileFrontend(files,{build,vendorSource='',adapters={},vueCompiler,vueSource='',tailwindSource=''},page){
 // A pasted React component must not be interpreted as HTML merely because its tab is index.html.
 const candidate=page&&files[page]!==undefined?page:'index.html';
 if(typeof files[candidate]==='string'&&/\.html?$/.test(candidate)&&files[candidate].trim()){
  const detected=detectCode(files[candidate]);
  if(detected.language!=='html'){const normalized={...files};delete normalized[candidate];normalized[detected.path]=detected.content;return compileFrontend(normalized,{build,vendorSource,adapters,vueCompiler,vueSource,tailwindSource});}
 }
 const project=detectFrontend(files,page);let html=project.page?files[project.page]:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>';
 if(project.type==='style')html=html.replace('<div id="root"></div>','<main id="root" class="container"><h1>CSS preview</h1><p>Your stylesheet is applied to this sample. Import your HTML for the complete website.</p><section class="card"><h2>Sample card</h2><button class="button btn">Sample button</button><input placeholder="Sample input"></section></main>');
 const virtual={...files};const entries=[];let serial=0;
 html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,tag=>{
  const src=attr(tag,'src'),type=attr(tag,'type');if(type&&type!=='module'&&!/javascript|ecmascript/i.test(type))return tag;
  if(src){if(/^(https?:)?\/\//.test(src)){if(/(?:cdn\.tailwindcss\.com|@tailwindcss\/browser)/.test(src)&&tailwindSource)return '';throw new Error('External script URLs are not executed. Import local source files; React and Vue are included in this frontend sandbox.')}entries.push(resolveImport(src,project.page||'',virtual));}
  else{const code=tag.replace(/^<script\b[^>]*>/i,'').replace(/<\/script>$/i,'');if(code.trim()){const key=(project.page?.split('/').slice(0,-1).join('/')||'')+'/__inline'+serial+++'.js';virtual[key.replace(/^\//,'')]=code;entries.push(key.replace(/^\//,''));}}
  return '';
 });
 html=html.replace(/<link\b[^>]*>/gi,tag=>{if(!/rel=["']stylesheet["']/i.test(tag))return tag;const href=attr(tag,'href');if(!href||/^(https?:)?\/\//.test(href))return tag;entries.push(resolveImport(href,project.page||'',virtual));return ''});
 if(!project.page){if(project.type==='vue'){virtual['__mount.js']=`import {createApp} from 'vue';import App from './${project.entry}';createApp(App).mount('#root');`;entries.push('__mount.js')}else if(project.type==='react-app'){virtual['__mount.jsx']=`import React from 'react';import {createRoot} from 'react-dom/client';import App from './${project.entry}';createRoot(document.getElementById('root')).render(<App/>);`;entries.push('__mount.jsx')}else entries.push(project.entry);}
 if(!entries.length){const js=['script.js','main.js','app.js'].find(p=>virtual[p]!==undefined);if(js)entries.push(js)}
 if(!entries.some(p=>p.endsWith('.css'))&&!entries.some(p=>/import\s*['"].*\.css/.test(virtual[p]||''))){const css=['style.css','styles.css','src/styles.css','src/index.css'].find(p=>virtual[p]!==undefined);if(css)entries.unshift(css)}
 for(const [name,source] of Object.entries({...virtual})){if(name.endsWith('.vue')){const transformed=transformVue(source,name,vueCompiler);virtual[name]=transformed.code;virtual[name+'.css']=transformed.css;entries.unshift(name+'.css');virtual[name+'.loader']=transformed.loader}}
 const main=entries.map(p=>`import ${JSON.stringify('./'+p)};`).join('\n');virtual['__builder_entry.js']=main;
 const plugin={name:'buildora-frontend-files',setup(api){
  api.onResolve({filter:/.*/},args=>{
   if(args.path==='vue')return {path:'vue',namespace:'vue-runtime'};
   if(args.path==='buildora:vendor')return {path:'vendor',namespace:'vendor'};
   if(Object.prototype.hasOwnProperty.call(adapters,args.path))return {path:args.path,namespace:'adapter'};
   if(args.kind==='entry-point')return {path:'__builder_entry.js',namespace:'project'};
   if((args.kind==='url-token'||args.kind==='import-rule')&&/^(https?:|data:|blob:)/.test(args.path))return {path:args.path,external:true};
   if(!/^(\.|\/|@\/)/.test(args.path)&&args.kind!=='url-token'&&args.kind!=='import-rule')return {errors:[{text:`Package “${args.path}” is not bundled. This phase supports local modules, React and React DOM.`}]};
   try{const resolved=resolveImport(args.path,args.importer,virtual);if(args.kind==='url-token'&&/^data:/.test(virtual[resolved]))return {path:virtual[resolved],external:true};return {path:resolved,namespace:'project'}}catch(e){return {errors:[{text:e.message}]}}
  });
  api.onLoad({filter:/.*/,namespace:'vue-runtime'},()=>({contents:vueSource,loader:'js'}));
  api.onLoad({filter:/.*/,namespace:'vendor'},()=>({contents:vendorSource,loader:'js'}));
  api.onLoad({filter:/.*/,namespace:'adapter'},args=>({contents:adapters[args.path],loader:'js'}));
  api.onLoad({filter:/.*/,namespace:'project'},args=>{const source=virtual[args.path];const extension=args.path.split('.').pop();if(/^data:/.test(source))return {contents:`export default ${JSON.stringify(source)}`,loader:'js'};return {contents:source,loader:virtual[args.path+'.loader']||{jsx:'jsx',tsx:'tsx',ts:'ts',css:'css',json:'json',svg:'dataurl',png:'dataurl',jpg:'dataurl',webp:'dataurl'}[extension]||'js',resolveDir:'/'};});
 }};
 let result;try{result=canPreviewDirectly(files,page)?{outputFiles:[{path:'out/direct.css',text:entries.filter(p=>p.endsWith('.css')).map(p=>virtual[p]).join('\n')}],warnings:[]}:await build({entryPoints:['__builder_entry.js'],bundle:true,write:false,outdir:'out',format:'iife',platform:'browser',jsx:'automatic',target:'es2020',define:{'process.env.NODE_ENV':'"production"'},plugins:[plugin],logLevel:'silent'})}catch(e){throw new Error((e.errors||[]).map(x=>(x.location?`${x.location.file}:${x.location.line}:${x.location.column} `:'')+x.text).join('\n')||e.message)}
 const js=result.outputFiles.filter(f=>f.path.endsWith('.js')).map(f=>f.text).join('\n');const css=result.outputFiles.filter(f=>f.path.endsWith('.css')).map(f=>f.text).join('\n');
 // Data assets stay within the opaque frame; never fetch project paths from the host app.
 html=html.replace(/\b(src|poster)=["']([^"']+)["']/gi,(all,key,value)=>{if(/^(https?:|data:|blob:)/.test(value))return all;try{const path=resolveImport(value,project.page||'',virtual);return /^data:/.test(virtual[path])?`${key}="${virtual[path]}"`:all}catch{return all}});
 const bridge=`<script>(function(){const send=(message)=>parent.postMessage({type:'buildora-preview-error',message:String(message)},'*');addEventListener('error',e=>send((e.filename?e.filename+':'+e.lineno+' ':'')+e.message));addEventListener('unhandledrejection',e=>send(e.reason?.message||e.reason));document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a)return;const href=a.getAttribute('href');if(href?.startsWith('#')){e.preventDefault();document.getElementById(href.slice(1))?.scrollIntoView();return}if(href&&!/^(https?:|mailto:|tel:)/.test(href)){e.preventDefault();parent.postMessage({type:'buildora-preview-navigate',href},'*')}})})();<\/script>`;
 html=html.replace(/<base\b[^>]*>/gi,'').replace(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/gi,'');
 html=html.replace(/<head[^>]*>/i,tag=>tag+`<meta http-equiv="Content-Security-Policy" content="${previewPolicy}">`);
 html=inject(html,`<meta http-equiv="Content-Security-Policy" content="${previewPolicy}"><style>${escapeStyle(css)}</style>${bridge}`);
 if(needsTailwind(files)&&tailwindSource)html=inject(html,`<script>${escapeScript(tailwindSource)}</script>`);
 const script=`<script>${escapeScript(js)}<\/script>`;html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,()=>script+'</body>'):html+script;
 return {html,type:project.type,page:project.page||null,warnings:result.warnings||[]};
}
export function previewTabDocument(html){const attr=html.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Buildora project preview</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style></head><body><iframe title="Rendered project" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${attr}"></iframe></body></html>`;}
