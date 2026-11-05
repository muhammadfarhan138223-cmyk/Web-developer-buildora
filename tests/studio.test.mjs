import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../src/lib/backend.js';
import {buildStepMessages} from '../server/build-step.js';
test('transient build network failure exposes retryable status without retrying publish actions',async()=>{
 const original=global.fetch;global.fetch=async()=>{throw new TypeError('network')};
 try{await assert.rejects(api('/api/chat'),e=>e.status===503&&e.code==='CONNECTION_INTERRUPTED');await assert.rejects(api('/api/integrations/github'),e=>e.status===undefined)}finally{global.fetch=original}
});
test('planned files enforce safe path membership before constructing generation requests',()=>{
 for(const path of ['../server.js','/etc/passwd','src/nope.jsx'])assert.throws(()=>buildStepMessages({mode:'build-file',file:{path},plan:{files:[{path:'src/App.jsx'}]}}),e=>e.status===400);
 const messages=buildStepMessages({mode:'build-file',message:'A cafe website',file:{path:'src/App.jsx'},plan:{files:[{path:'src/App.jsx'}],architecture:'sage cafe'},projectContext:{files:[]}});
 assert.ok(messages[0].content.includes('src/App.jsx'));assert.ok(messages[1].content.includes('sage cafe'));
});
