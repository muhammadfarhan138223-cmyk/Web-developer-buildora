import {cloudConfig} from './cloud-config.js';
export function authMode() {
  return !process.env.NETLIFY && !process.env.VERCEL && process.env.AUTH_PROVIDER === 'local' ? 'local' : 'supabase'
}
export function publicConfig() {
  const mode = authMode()
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || cloudConfig.url
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || cloudConfig.publicKey
  const ai = Boolean(process.env.OPENROUTER_API_KEY || (process.env.AI_FREE_ONLY === 'false' && (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || (process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL))) || process.env.OLLAMA_MODEL)
  return { version:'2.1.1', authProvider: mode, authConfigured: mode === 'local' ? !process.env.VERCEL : Boolean(url && publicKey), supabase: mode === 'supabase' ? { url, publicKey } : null, aiConfigured: ai, aiMode: process.env.OLLAMA_MODEL ? 'local-model' : process.env.AI_FREE_ONLY !== 'false' ? 'free-models' : 'configured-providers' }
}
