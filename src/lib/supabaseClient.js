import { createClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'nexusai-supabase-config'
const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function readStoredConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.url && parsed?.anonKey) return parsed
  } catch {
    // Ignore invalid local configuration.
  }
  return null
}

function getConfig() {
  if (envUrl && envAnonKey) return { url: envUrl, anonKey: envAnonKey, source: 'environment' }
  const stored = typeof window !== 'undefined' ? readStoredConfig() : null
  return stored ? { ...stored, source: 'local' } : null
}

let activeConfig = getConfig()
let client = createClientIfConfigured(activeConfig)

function createClientIfConfigured(config) {
  if (!config?.url || !config?.anonKey) return null
  try {
    return createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch {
    return null
  }
}

export function getSupabaseClient() {
  return client
}

export function getSupabaseConfig() {
  return activeConfig
}

export function configureSupabase(url, anonKey) {
  const cleanUrl = String(url || '').trim().replace(/\/$/, '')
  const cleanKey = String(anonKey || '').trim()

  if (!/^https:\/\/[^\s/]+\.supabase\.co$/i.test(cleanUrl)) {
    throw new Error('Enter a valid Supabase project URL.')
  }
  if (!cleanKey || cleanKey.length < 20) {
    throw new Error('Enter the Supabase publishable/anon key.')
  }

  const config = { url: cleanUrl, anonKey: cleanKey, source: 'local' }
  client = createClientIfConfigured(config)
  if (!client) throw new Error('Supabase configuration could not be initialized.')

  activeConfig = config
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  return config
}

export function clearLocalSupabaseConfig() {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  activeConfig = envUrl && envAnonKey ? { url: envUrl, anonKey: envAnonKey, source: 'environment' } : null
  client = createClientIfConfigured(activeConfig)
}

export function isSupabaseConfigured() { return Boolean(client) }
