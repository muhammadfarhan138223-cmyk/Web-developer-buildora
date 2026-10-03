import { getSupabaseClient } from './supabaseClient.js'

const notConfigured = () => ({
  data: null,
  error: { message: 'Supabase is not configured. Connect a Supabase project first.' },
})

export async function signUp(email, password) {
  const supabase = getSupabaseClient()
  if (!supabase) return notConfigured()
  return await supabase.auth.signUp({ email, password })
}

export async function signIn(email, password) {
  const supabase = getSupabaseClient()
  if (!supabase) return notConfigured()
  return await supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithProvider(provider) {
  const supabase = getSupabaseClient()
  if (!supabase) return notConfigured()
  return await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/builder` },
  })
}

export async function signOut() {
  const supabase = getSupabaseClient()
  if (!supabase) return { error: null }
  return await supabase.auth.signOut()
}

export async function getSession() {
  const supabase = getSupabaseClient()
  if (!supabase) return { session: null, error: null }
  const { data, error } = await supabase.auth.getSession()
  return { session: data?.session || null, error }
}

export async function getCurrentUser() {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

export function onAuthStateChange(callback) {
  const supabase = getSupabaseClient()
  if (!supabase) return { unsubscribe() {} }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return subscription
}
