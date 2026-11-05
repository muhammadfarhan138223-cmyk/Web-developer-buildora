import { createClient } from '@supabase/supabase-js'
let client = null
export function getSupabaseClient() { return client }
export function initializeAuthClient(config) {
  if (config.authProvider !== 'supabase') { client = null; return }
  const {url,publicKey} = config.supabase || {}
  if (!url || !publicKey) throw new Error('Supabase is selected but its URL and public key are missing on the server.')
  client = createClient(url, publicKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
}
