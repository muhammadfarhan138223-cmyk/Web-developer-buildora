import {Readable} from 'node:stream';
import {handleApi} from '../../server/http.mjs';
import chat from '../../api/chat.js';
export default async function handler(request,context={}){
 const url=new URL(request.url);
 const req=Readable.from((async function*(){if(request.body){const reader=request.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;yield Buffer.from(value)}}finally{reader.releaseLock()}}})());
 req.method=request.method;
 req.url=url.pathname.replace(/^\/.netlify\/functions\/api\/?/,'/api/')+url.search;
 req.headers=Object.fromEntries(request.headers);req.headers.host=url.host;
 req.socket={remoteAddress:context.ip||'netlify'};
 let statusCode=200,body='';const headers=new Headers({'Content-Type':'application/json'});
 const res={writableEnded:false,set statusCode(n){statusCode=n},get statusCode(){return statusCode},setHeader(k,v){headers.set(k,String(v))},end(value=''){body=String(value);this.writableEnded=true},writeHead(n){statusCode=n}};
 await handleApi(req,res,chat);
 return new Response(body,{status:statusCode,headers});
}
