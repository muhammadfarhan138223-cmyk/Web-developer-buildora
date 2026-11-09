import {publicRoutes} from '../src/lib/site-meta.js';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { authMode, publicConfig } from './config.js';
export const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'X-Content-Type-Options': 'nosniff'
};
export function loadEnv() {
  try {
    process.loadEnvFile('.env');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
export async function handleApi(req, res, handler) {
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = data => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
  const route = req.url.split('?')[0];
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({error:'Cross-origin requests are not allowed.'});
    if (req.headers.origin) {
      let origin; try { origin = new URL(req.headers.origin).origin } catch { return res.status(403).json({error:'Invalid origin.'}) }
      const allowed = [`http://${req.headers.host}`, `https://${req.headers.host}`, ...(process.env.SITE_URL ? [new URL(process.env.SITE_URL).origin] : [])];
      if (!allowed.includes(origin)) return res.status(403).json({error:'Cross-origin requests are not allowed.'});
    }
    if (req.method === 'GET' && ['/api/health','/api/config'].includes(route)) return res.json({ok:true,...publicConfig()});
    if (['POST','PUT','PATCH','DELETE'].includes(req.method) && !String(req.headers['content-type'] || '').includes('application/json')) return res.status(415).json({error:'Use application/json.'});
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 5 * 1024 * 1024) return res.status(413).json({
        error: 'Request too large'
      });
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString();
    try {
      req.body = raw ? JSON.parse(raw) : {};
    } catch {
      return res.status(400).json({
        error: 'Invalid JSON'
      });
    }
    if (route === '/api/export' && req.method === 'POST') {
      const {authorize}=await import('./access.js');await authorize(req,true);
      const {validateFiles}=await import('../src/lib/files.js');let files;try{files=validateFiles(req.body.files)}catch(e){return res.status(400).json({error:e.message})}
      const {default:JSZip}=await import('jszip');const zip=new JSZip();
      for(const [name,content] of Object.entries(files)){const binary=content.match(/^data:[^;]+;base64,(.*)$/s);zip.file(name,binary?binary[1]:content,binary?{base64:true}:{})}
      return res.json({archive:await zip.generateAsync({type:'base64',compression:'DEFLATE'})});
    }
    if (route === '/api/provider-health' && req.method === 'POST') {
      const {enforceLimit}=await import('./access.js');if(!enforceLimit('health:'+req.socket.remoteAddress))return res.status(429).json({error:'Wait before checking again.'});
      const {providerHealth}=await import('./byok.js');return res.json(await providerHealth(req.body.provider));
    }
    if (route === '/api/models' && req.method === 'POST') {
      const {authorize}=await import('./access.js');await authorize(req,true);
      const {enforceLimit}=await import('./access.js');
      if(!enforceLimit('models:'+req.socket.remoteAddress))return res.status(429).json({error:'Please wait before testing another connection.'});
      const {modelCatalog}=await import('./byok.js');const catalog=await modelCatalog(req.body);return res.json({models:catalog.map(m=>m.id),catalog});
    }
    if (route === '/api/integrations/github' && req.method === 'POST') {const {githubAction}=await import('./integrations.js');return res.json(await githubAction(req));}
    if (route === '/api/chat') return await handler(req, res);
    if (authMode() === 'local') {
      const {handleLocal} = await import('./local-backend.js');
      return await handleLocal(req,res,route);
    }
    return res.status(404).json({error:'API route not found.'});
  } catch (error) {
    if (!res.writableEnded) res.status(error.status || 500).json({ error: error.status ? error.message : 'The server could not complete this request. Please try again.',code:error.status?error.code:undefined });
  }
}
export async function serveProduction(handler, port = Number(process.env.PORT || 3000), host = process.env.HOST || '127.0.0.1') {
  const root = path.resolve('dist');
  const mime = {
    '.html': 'text/html',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json',
    '.woff2': 'font/woff2'
  };
  const server = http.createServer(async (req, res) => {
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
    if (req.url.startsWith('/api/')) return handleApi(req, res, handler);
    try {
      let route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const publicPages=publicRoutes,privatePages=["/builder", "/projects", "/login", "/signup", "/recover", "/reset-password", "/settings", "/connections"];
      if(publicPages.includes(route))route=(route==='/'?'/index':route)+'.html';
      else if(privatePages.includes(route)||/^\/builder\/(chat|work|preview)\/?$/.test(route)){route='/index.html';res.setHeader('X-Robots-Tag','noindex, nofollow')}
      const file = path.resolve(root, '.' + route);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end();
      }
      const content = await readFile(file);
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  server.listen(port, host, () => console.log(`Buildora: http://${host}:${server.address().port}`));
  return server;
}
