import {getSupabaseClient} from './supabaseClient.js';
let config = null
export function getBackendConfig() { return config }
export async function api(path, options = {}) {
  const session=await getSupabaseClient()?.auth.getSession();
  if(session?.data?.session?.access_token)options={...options,headers:{Authorization:`Bearer ${session.data.session.access_token}`,...options.headers}};
  let response
  const ownController = options.signal ? null : new AbortController()
  const timer = ownController ? setTimeout(()=>ownController.abort(),path==='/api/models'?30000: path==='/api/integrations/github'?120000:20000) : null
  try {
    response = await fetch(path, { credentials:'same-origin', ...options, signal:options.signal || ownController.signal, headers:{'Content-Type':'application/json', ...options.headers} })
  } catch (error) {
    if (error.name === 'AbortError' && !ownController) throw error
    if(path==='/api/chat')throw Object.assign(new Error(error.name==='TimeoutError'?'This build step timed out. Completed files are kept.':'The connection was interrupted. Completed files are kept.'),{status:503,code:'CONNECTION_INTERRUPTED'})
    if (error.name === 'AbortError') throw new Error('The server request took too long. The server may still be processing it; check the result before retrying a publish action.')
    throw new Error('Buildora cannot reach its server. Start the app with npm run dev (or npm start after building), keep that terminal open, then reload this page.')
  } finally { if(timer)clearTimeout(timer) }
  const data = await response.json().catch(()=>null)
  if (!data) throw new Error('The AI backend is missing on this deployment. On Netlify, deploy the full source with netlify.toml and netlify/functions—not only the dist folder. Locally, run START-BUILDORA.cmd.')
  if (!response.ok) throw Object.assign(new Error(data.error || `Request failed (${response.status}).`),{status:response.status,code:data.code,retryAfterMs:data.retryAfterMs})
  return data
}
export async function bootstrapBackend() { config=await api('/api/config'); return config }
export async function databaseRequest(path, options) {
  try { return {error:null,...await api(path,options)} } catch(error) {return {data:null,error}}
}
