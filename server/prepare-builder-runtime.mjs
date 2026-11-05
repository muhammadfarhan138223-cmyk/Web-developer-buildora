import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';import {createRequire} from 'node:module';import path from 'node:path';
const require=createRequire(import.meta.url);const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');const root=path.resolve('public/builder-runtime');await mkdir(root,{recursive:true});
const entry=`import React from 'react';import * as ReactDOM from 'react-dom';import * as ReactDOMClient from 'react-dom/client';import * as JSXRuntime from 'react/jsx-runtime';import * as JSXDevRuntime from 'react/jsx-dev-runtime';export {React,ReactDOM,ReactDOMClient,JSXRuntime,JSXDevRuntime};`;
const result=await build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',minify:true,define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline',plugins:[{name:'trusted-vendor-files',setup(api){api.onResolve({filter:/.*/},args=>({path:(args.importer&&args.importer!=='<stdin>'?createRequire(args.importer):require).resolve(args.path),namespace:'trusted'}));api.onLoad({filter:/.*/,namespace:'trusted'},async args=>({contents:await readFile(args.path,'utf8'),loader:'js'}))}}]});await writeFile(path.join(root,'vendor.js'),result.outputFiles[0].text);
const packages={'react':['React',Object.keys(require('react'))],'react-dom':['ReactDOM',Object.keys(require('react-dom'))],'react-dom/client':['ReactDOMClient',['createRoot','hydrateRoot']],'react/jsx-runtime':['JSXRuntime',['jsx','jsxs','Fragment']],'react/jsx-dev-runtime':['JSXDevRuntime',['jsxDEV','Fragment']]};
const adapters={};for(const [id,[name,keys]] of Object.entries(packages))adapters[id]=`import {${name} as value} from 'buildora:vendor';export default value;export const {${keys.filter(k=>/^\w+$/.test(k)&&!['default','__esModule'].includes(k)).join(',')}}=value;`;
await writeFile(path.join(root,'adapters.json'),JSON.stringify(adapters));
const wasmRoot=path.dirname(require.resolve('esbuild-wasm/package.json'));await copyFile(path.join(wasmRoot,'esbuild.wasm'),path.join(root,'esbuild.wasm'));
await copyFile(path.join(wasmRoot,'esm/browser.js'),path.join(root,'esbuild.js'));
const licenses=['esbuild-wasm','react','react-dom'];let text='Buildora frontend preview runtime — third-party notices\n\n';for(const p of licenses){const folder=path.dirname(require.resolve(p+'/package.json'));let license;for(const file of ['LICENSE','LICENSE.md'])try{license=await readFile(path.join(folder,file),'utf8');break}catch{}text+=`\n${p}\n${license||'See package license'}\n`;}
await writeFile(path.join(root,'LICENSES.txt'),text);console.log('Prepared self-hosted compiler and React runtime.');
const vueDir=path.dirname(require.resolve('vue/package.json'));
const compilerDir=path.dirname(require.resolve('@vue/compiler-sfc/package.json'));
const tailwindDir=path.dirname(require.resolve('@tailwindcss/browser/package.json'));
await copyFile(path.join(vueDir,'dist/vue.runtime.esm-browser.prod.js'),path.join(root,'vue.js'));
await copyFile(path.join(compilerDir,'dist/compiler-sfc.esm-browser.js'),path.join(root,'vue-compiler.js'));
await copyFile(path.join(tailwindDir,'dist/index.global.js'),path.join(root,'tailwind.js'));
for(const [name,dir] of [['Vue',vueDir],['Vue compiler',compilerDir],['Tailwind CSS browser',tailwindDir]]){let license='';for(const file of ['LICENSE','LICENSE.md'])try{license=await readFile(path.join(dir,file),'utf8');break}catch{}if(!license)throw new Error('Missing license for '+name);text+='\n'+name+'\n'+license+'\n'}
await writeFile(path.join(root,'LICENSES.txt'),text);console.log('Prepared MIT-licensed Vue and Tailwind browser assets.');
