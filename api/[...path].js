import {Readable} from 'node:stream';
import {handleApi} from '../server/http.mjs';
import chat from './chat.js';
// Vercel parses JSON before invoking Node functions; adapt it back to a bounded stream.
export default async function handler(request,response){
 const raw=request.body==null?'':typeof request.body==='string'?request.body:Buffer.isBuffer(request.body)?request.body:JSON.stringify(request.body);
 const req=Readable.from(raw?[Buffer.from(raw)]:[]);
 req.method=request.method;req.url=request.url;req.headers=request.headers;
 req.socket={remoteAddress:String(request.headers['x-forwarded-for']||request.socket?.remoteAddress||'vercel').split(',')[0].trim()};
 return handleApi(req,response,chat);
}
