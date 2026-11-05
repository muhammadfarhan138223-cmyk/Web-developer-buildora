import { create } from 'zustand';
const read=()=>{try{return JSON.parse(localStorage.getItem('buildora-preferences')||'{}')}catch{return {}}};
const stored=typeof window==='undefined'?{}:read();
export const usePreferences=create(set=>({appearance:stored.appearance||'dark',editorFontSize:stored.editorFontSize||13,theme:stored.theme||'midnight',provider:stored.provider||'openrouter',model:stored.model||'openrouter/free',baseUrl:stored.baseUrl||'',apiKey:'',githubToken:'',autoFallback:stored.autoFallback??true,allowPaidFallback:stored.allowPaidFallback??false,
  update:values=>set(state=>{const next={...state,...values};try{localStorage.setItem('buildora-preferences',JSON.stringify({appearance:next.appearance,editorFontSize:next.editorFontSize,theme:next.theme,provider:next.provider,model:next.model,baseUrl:next.baseUrl,autoFallback:next.autoFallback,allowPaidFallback:next.allowPaidFallback}))}catch{}return values})
}));
export function aiCredentials(){const {provider,model,apiKey,baseUrl,autoFallback,allowPaidFallback}=usePreferences.getState();return apiKey?{provider,model,apiKey,baseUrl,autoFallback,allowPaidFallback}:null}
export const themes=[{id:'sage',name:'Sage studio',color:'#759758'},{id:'ocean',name:'Ocean blue',color:'#4765e8'},{id:'sunset',name:'Sunset coral',color:'#df7652'},{id:'midnight',name:'Midnight violet',color:'#aa97f4'}];
