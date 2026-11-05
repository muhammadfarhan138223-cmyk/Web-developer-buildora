import {networkError,providerError} from './provider-errors.js';
const catalog={
  openrouter:{name:'OpenRouter',base:'https://openrouter.ai/api/v1'},
  openai:{name:'OpenAI',base:'https://api.openai.com/v1'},
  groq:{name:'Groq',base:'https://api.groq.com/openai/v1'},
  deepseek:{name:'DeepSeek',base:'https://api.deepseek.com/v1'},
  mistral:{name:'Mistral',base:'https://api.mistral.ai/v1'},
  together:{name:'Together AI',base:'https://api.together.xyz/v1'},
  xai:{name:'xAI',base:'https://api.x.ai/v1'},
  anthropic:{name:'Anthropic',base:'https://api.anthropic.com/v1'},
  gemini:{name:'Google Gemini',base:'https://generativelanguage.googleapis.com/v1beta'}
};
export const providerCatalog=Object.entries(catalog).map(([id,p])=>({id,name:p.name})).concat({id:'custom',name:'Other OpenAI-compatible provider'});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
export function validateConnection(input){
  if(!input||typeof input!=='object')fail('Choose an AI provider in Settings.');
  const {provider,apiKey,model}=input;
  if(typeof apiKey!=='string'||!apiKey.trim()||apiKey.length>4096||/[\r\n]/.test(apiKey))fail('Enter a valid provider API key.');
  if(model!==undefined&&(typeof model!=='string'||model.length>200||/[\r\n]/.test(model)))fail('Enter a valid model ID.');
  let base=catalog[provider]?.base;
  if(provider==='custom'){
    let url;try{url=new URL(input.baseUrl)}catch{fail('Enter a valid HTTPS API base URL.')}
    const allowed=(process.env.AI_ALLOWED_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean);
    if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||!allowed.includes(url.hostname))fail('This custom API host is not enabled. Ask the server owner to add its exact hostname to AI_ALLOWED_HOSTS.');
    base=url.href.replace(/\/$/,'');
  }
  if(!base)fail('Unsupported provider. Choose an available provider or an approved compatible endpoint.');
  return {provider,apiKey:apiKey.trim(),model:provider==='gemini'?model?.replace(/^models\//,''):model,base};
}
async function request(config,suffix,body){
  const headers={'Content-Type':'application/json'};
  if(config.provider==='anthropic'){headers['x-api-key']=config.apiKey;headers['anthropic-version']='2023-06-01'}
  else if(config.provider==='gemini')headers['x-goog-api-key']=config.apiKey;
  else headers.Authorization=`Bearer ${config.apiKey}`;
  let response;try{response=await fetch(config.base+suffix,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(config.timeoutMs||(body?90000:20000))})}catch(error){throw networkError(error)}
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=providerError(response.status,data);const raw=response.headers.get('retry-after');const delay=Number(raw)*1000;error.retryAfterMs=raw?Math.max(0,Number.isFinite(delay)?delay:Date.parse(raw)-Date.now()):undefined;throw error;}
  return data;
}
export async function modelCatalog(input){
 const config=validateConnection(input), collected=[]; if(config.provider==='openrouter')await request(config,'/key'); let suffix='/models'; const seen=new Set();
 for(let page=0;page<20;page++){
  const data=await request(config,suffix);
  for(const m of (config.provider==='gemini'?data.models:Array.isArray(data)?data:data.data)||[]){
   if(config.provider==='gemini'&&!m.supportedGenerationMethods?.includes('generateContent'))continue;
   const id=config.provider==='gemini'?m.name?.replace(/^models\//,''):m.id;
   if(!id||/(embedding|whisper|tts|dall-e|moderation|transcri|imagen|veo|realtime)/i.test(id))continue;
   if(m.architecture?.output_modalities&&!m.architecture.output_modalities.includes('text'))continue;
   const price=m.pricing; const known=price&&price.prompt!=null&&price.completion!=null;
   collected.push({id,name:m.displayName||m.name||id,pricing:known?(Number(price.prompt)===0&&Number(price.completion)===0?'free':'paid'):'unknown',context:m.context_length||m.inputTokenLimit||null});
  }
  const token=config.provider==='gemini'?data.nextPageToken:config.provider==='anthropic'&&data.has_more?data.last_id:null;
  if(!token||seen.has(token))break;seen.add(token);suffix='/models?'+(config.provider==='gemini'?'pageToken=':'after_id=')+encodeURIComponent(token);
 }
 return [...new Map(collected.map(m=>[m.id,m])).values()].sort((a,b)=>(a.pricing==='free'?-1:0)-(b.pricing==='free'?-1:0)||a.id.localeCompare(b.id));
}
export async function listModels(input){return (await modelCatalog(input)).map(m=>m.id)}
export async function providerHealth(provider){
 const target=catalog[provider];if(!target)fail('Select a supported provider for the connection check.');
 try{const response=await fetch(target.base+'/models',{redirect:'error',signal:AbortSignal.timeout(10000)});await response.body?.cancel();return {reachable:true,provider,status:response.status,message:`Server reached ${target.name}. This checks connectivity only; use Test & load models to verify your key.`}}
 catch(error){throw networkError(error)}
}
export async function generateWithKey(input,messages,maxTokens=8000,timeoutMs=90000){
  const c={...validateConnection(input),timeoutMs};if(!c.model)fail('Select or enter a model in Settings.');let data,content;
  if(c.provider==='anthropic'){
    data=await request(c,'/messages',{model:c.model,max_tokens:maxTokens,system:messages.filter(m=>m.role==='system').map(m=>m.content).join('\n'),messages:messages.filter(m=>m.role!=='system')});content=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
  }else if(c.provider==='gemini'){
    data=await request(c,`/models/${encodeURIComponent(c.model)}:generateContent`,{systemInstruction:{parts:[{text:messages.filter(m=>m.role==='system').map(m=>m.content).join('\n')}]},contents:messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{maxOutputTokens:maxTokens}});content=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('\n');
  }else{data=await request(c,'/chat/completions',{model:c.model,messages,max_tokens:maxTokens,...(c.provider==='openrouter'?{reasoning:{effort:'low',exclude:true}}:{})});content=data.choices?.[0]?.message?.content}
  if(!input.allowPartial && (data.candidates?.[0]?.finishReason==='MAX_TOKENS'||data.stop_reason==='max_tokens'||data.choices?.[0]?.finish_reason==='length'))(()=>{throw Object.assign(new Error('This file reached the model output limit. Completed steps are kept; the builder can retry a compact version.'),{status:422,code:'OUTPUT_LIMIT'})})();
  if(typeof content!=='string'||!content.trim())fail('The model returned no text. Try another text-generation model.',502);
  return {content,provider:c.provider,model:c.model};
}

export async function generateWithRouting(input,messages,maxTokens=8000){
 const models=[input.model],deadline=Date.now()+((process.env.NETLIFY||process.env.VERCEL)?45000:230000);
 let lastError,discovered=false;
 for(let i=0;i<models.length;i++){
  if(Date.now()>=deadline)break;
  try{return {...await generateWithKey({...input,model:models[i]},messages,maxTokens,Math.max(1,Math.min((process.env.NETLIFY||process.env.VERCEL)?25000:90000,deadline-Date.now()))),fallbackIndex:i}}
  catch(error){lastError=error;
   if(![429,502,503,504].includes(error.status)&&error.code!=='OUTPUT_LIMIT')throw error;
   if(!discovered&&input.autoFallback===true){
    discovered=true;const live=await modelCatalog(input).catch(()=>[]);
    models.push(...live.filter(m=>m.id!==input.model&&(m.pricing==='free'||input.allowPaidFallback===true)).slice(0,2).map(m=>m.id));
   }
   if(i+1<models.length)await new Promise(resolve=>setTimeout(resolve,500+Math.random()*500));
  }
 }
 throw lastError||Object.assign(new Error('The provider took too long. Retry to resume completed build steps.'),{status:504,code:'PROVIDER_TIMEOUT'});
}
