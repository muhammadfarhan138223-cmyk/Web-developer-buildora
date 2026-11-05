import { build, loadEnv } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import config from '../vite.config.js';
import { metadata, structuredData, publicRoutes } from '../src/lib/site-meta.js';
const env={...loadEnv('production',process.cwd(),''),...process.env};
const site=(env.VITE_SITE_URL || env.SITE_URL || 'https://buildora.farhanbalouch.com').replace(/\/$/,'');
if(site && !/^https?:\/\/[^/]+$/.test(site)) throw new Error('SITE_URL must be an origin, such as https://example.com');
const define={'import.meta.env.VITE_SITE_URL':JSON.stringify(site)};
await build({...config,configFile:false,define});
await build({...config,configFile:false,define,build:{ssr:'src/entry-server.jsx',outDir:'.buildora-build',emptyOutDir:true}});
const {render}=await import(pathToFileURL(path.resolve('.buildora-build/entry-server.js')));
const template=await readFile('dist/index.html','utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
for(const route of publicRoutes) {
  const meta=metadata[route],url=site+(route==='/'?'/':route);
  const tags=`<meta property="og:type" content="website"/><meta property="og:site_name" content="Buildora"/><meta property="og:title" content="${escape(meta.title)}"/><meta property="og:description" content="${escape(meta.description)}"/><meta name="twitter:card" content="summary"/><meta name="twitter:title" content="${escape(meta.title)}"/><meta name="twitter:description" content="${escape(meta.description)}"/><meta name="author" content="Farhan Balouch"/><link rel="author" href="https://farhanbalouch.com/"/>${site?`<link rel="canonical" href="${escape(url)}"/><meta property="og:url" content="${escape(url)}"/>`:''}<script type="application/ld+json">${JSON.stringify(structuredData(site)).replaceAll('<','\\u003c')}</script>`;
  const html=template.replace(/<title>.*?<\/title>/,`<title>${escape(meta.title)}</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(meta.description)}"/>`).replace('content="noindex, nofollow"',`content="${site?'index, follow':'noindex, nofollow'}"`).replace('<!--SEO-->',tags).replace('<div id="root"></div>',`<div id="root">${render(route)}</div>`);
  const output=`dist/${route==='/'?'index':route.slice(1)}.html`;await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,html);
}
await writeFile('dist/robots.txt',site?`User-agent: *\nAllow: /\nDisallow: /builder\nDisallow: /projects\nDisallow: /login\nDisallow: /signup\nDisallow: /recover\nDisallow: /reset-password\nDisallow: /settings\nDisallow: /connections\nDisallow: /api/\nSitemap: ${site}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${site?publicRoutes.map(r=>`<url><loc>${escape(site+r)}</loc></url>`).join(''):''}</urlset>`);

await writeFile('dist/_redirects','/api/* /.netlify/functions/api/:splat 200!\n'+publicRoutes.map(route=>route+' '+(route==='/'?'/index':route)+'.html 200').join('\n')+'\n/* /index.html 200\n');
