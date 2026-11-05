// Optional browser verification: node tests/verify-react-starter.mjs
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {build,preview} from 'vite';
import {reactStarterFiles} from '../src/lib/reactStarter.js';
const root=path.resolve('.buildora-build/react-qa');
for(const [name,content] of Object.entries(reactStarterFiles)){const target=path.join(root,name);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,content)}
await build({root,configFile:false});
const server=await preview({root,configFile:false,preview:{host:'127.0.0.1',port:3004,strictPort:true}});
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3004');await page.getByRole('heading',{name:/Good things/}).waitFor();await page.screenshot({path:'../Buildora-react-starter.png',fullPage:true});await page.getByRole('link',{name:'settings',exact:true}).click();await page.getByLabel('Appearance',{exact:true}).selectOption('dark');await page.getByRole('button',{name:'Save appearance'}).click();await page.reload();assert.equal(await page.getByLabel('Appearance',{exact:true}).inputValue(),'dark');await page.getByRole('link',{name:'work',exact:true}).click();await page.getByRole('heading',{name:'A distinctive identity'}).waitFor();await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS: React starter builds, renders, navigates, persists theme and fits mobile.');}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
