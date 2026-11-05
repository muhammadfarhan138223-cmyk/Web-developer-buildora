import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { serveProduction } from '../server/http.mjs';
import { closeDatabases } from '../server/local-backend.js';
import handler from '../api/chat.js';

test('persistent accounts, cookie sessions, recovery and owner-isolated projects over HTTP', async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'buildora-auth-'));
  process.env.BUILDORA_DATA_DIR=dir;process.env.AUTH_PROVIDER='local';
  const server=await serveProduction(handler,0);await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  async function call(route,method='GET',body,cookie='',extra={}) {
    const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(cookie?{cookie}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
    return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],rawCookie:r.headers.get('set-cookie')};
  }
  try {
    const config=await call('/api/config');assert.equal(config.data.authProvider,'local');assert.ok(!JSON.stringify(config.data).includes('API_KEY'));
    assert.equal((await call('/api/projects')).status,401);
    assert.equal((await call('/api/export','POST',{files:{'index.html':'test'}})).status,401);
    const credentials={email:'owner@example.test',password:'Safe-password-123'};
    const created=await call('/api/auth/signup','POST',credentials);assert.equal(created.status,201);assert.match(created.rawCookie,/HttpOnly/);assert.match(created.rawCookie,/SameSite=Lax/);
    const cookie=created.cookie;assert.ok(created.data.recoveryCode);
    assert.equal((await call('/api/integrations/github','POST',{action:'verify',token:'test'})).status,401);
    const realFetch=global.fetch,githubCalls=[];
    global.fetch=async(url,options)=>{
      if(!String(url).startsWith('https://api.github.com/'))return realFetch(url,options);
      githubCalls.push({url,options});
      const data=String(url).includes('/git/ref/heads/')?{object:{sha:'parent'}}:String(url).endsWith('/git/commits/parent')?{tree:{sha:'base-tree'}}:String(url).endsWith('/git/trees')?{sha:'new-tree'}:{sha:'new-commit'};
      return new Response(JSON.stringify(data),{status:200});
    };
    try{
      const publish=await call('/api/integrations/github','POST',{action:'commit',token:'test-token',owner:'test-owner',repo:'test-repo',branch:'main',files:{'index.html':'<h1>Project</h1>'}},cookie);
      assert.equal(publish.status,200);assert.match(publish.data.url,/new-commit/);assert.equal(JSON.parse(githubCalls.find(c=>c.url.endsWith('/git/trees')).options.body).base_tree,'base-tree');assert.equal(JSON.parse(githubCalls.at(-1).options.body).force,false);
    }finally{global.fetch=realFetch}
    const exported=await call('/api/export','POST',{files:{'index.html':'<h1>Export</h1>'}},cookie);assert.equal(exported.status,200);assert.equal(Buffer.from(exported.data.archive,'base64').subarray(0,2).toString(),'PK');
    assert.equal((await call('/api/auth/login','POST',{...credentials,password:'wrong-password-123'})).status,401);
    const project={name:'Saved workspace',files:{'index.html':'<h1>Real saved content</h1>'}};
    assert.equal((await call('/api/projects/project123','PUT',project,cookie)).status,200);
    assert.equal((await call('/api/projects/project123/conversation','PUT',{messages:[{role:'user',content:'hello'}]},cookie)).status,200);
    closeDatabases();
    assert.equal((await call('/api/projects/project123','GET',null,cookie)).data.data.files['index.html'],project.files['index.html']);
    assert.equal((await call('/api/projects/project123/conversation','GET',null,cookie)).data.data[0].messages[0].content,'hello');
    const other=await call('/api/auth/signup','POST',{email:'other@example.test',password:credentials.password});
    for(const method of ['GET','PUT','DELETE'])assert.equal((await call('/api/projects/project123',method,method==='PUT'?project:null,other.cookie)).status,404);
    assert.equal((await call('/api/projects','GET',null,other.cookie)).data.data.length,0);
    assert.equal((await call('/api/projects/badfiles1','PUT',{files:{'../escape':'bad'}},cookie)).status,400);
    assert.equal((await call('/api/auth/logout','POST',{},cookie,{origin:'https://unrelated.example'})).status,403);
    assert.equal((await call('/api/auth/signup','POST',credentials)).status,409);
    const recovered=await call('/api/auth/recover','POST',{...credentials,password:'New-password-456',recoveryCode:created.data.recoveryCode});
    assert.equal(recovered.status,200);assert.notEqual(recovered.data.recoveryCode,created.data.recoveryCode);
    assert.equal((await call('/api/auth/session','GET',null,cookie)).data.user,null);
    assert.equal((await call('/api/auth/recover','POST',{...credentials,recoveryCode:created.data.recoveryCode})).status,401);
    const login=await call('/api/auth/login','POST',{...credentials,password:'New-password-456'});assert.equal(login.status,200);
    assert.equal((await call('/api/projects/project123','DELETE',{},login.cookie)).status,200);
    assert.equal((await call('/api/projects','GET',null,login.cookie)).data.data.length,0);
    const privateRoute=await fetch(base+'/projects');assert.equal(privateRoute.status,200);assert.match(privateRoute.headers.get('x-robots-tag'),/noindex/);
    const catalog=await fetch(base+'/templates/cafe');assert.equal(catalog.status,200);assert.match(await catalog.text(),/Sunday Coffee/);
    await call('/api/auth/logout','POST',{},login.cookie);
    assert.equal((await call('/api/projects','GET',null,login.cookie)).status,401);
    const home=await (await fetch(base)).text();assert.match(home,/application\/ld\+json/);assert.match(home,/Farhan Balouch/);assert.match(home,/<main id="main"/);assert.equal((home.match(/<h1[ >]/g)||[]).length,1);
    assert.equal((await fetch(base+'/builder')).headers.get('x-robots-tag'),'noindex, nofollow');
    assert.equal((await fetch(base+'/robots.txt')).headers.get('content-type'),'text/plain');
  } finally {await new Promise(resolve=>server.close(resolve));closeDatabases();delete process.env.BUILDORA_DATA_DIR;await rm(dir,{recursive:true,force:true});}
});
