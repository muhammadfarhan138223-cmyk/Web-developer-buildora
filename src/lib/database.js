import { getSupabaseClient } from './supabaseClient.js'

const unavailable = (data = null) => ({ data, error: { message: 'Supabase is not configured.' } })

export async function saveProject(userId, project) {
  const supabase = getSupabaseClient()
  if (!supabase || !userId) return unavailable()
  const { data, error } = await supabase.from('projects').upsert({
    id: project.id,
    user_id: userId,
    name: project.name,
    description: project.description || '',
    files: project.files || {},
    framework: project.framework || 'react',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select().single()
  return { data, error }
}

export async function loadProjects(userId) {
  const supabase = getSupabaseClient()
  if (!supabase || !userId) return { data: [], error: null }
  const { data, error } = await supabase.from('projects')
    .select('id, name, description, framework, updated_at, created_at')
    .eq('user_id', userId).order('updated_at', { ascending: false })
  return { data: data || [], error }
}

export async function loadProject(projectId) {
  const supabase = getSupabaseClient()
  if (!supabase || !projectId) return unavailable()
  const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single()
  return { data, error }
}

export async function deleteProject(projectId) {
  const supabase = getSupabaseClient()
  if (!supabase || !projectId) return { error: null }
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  return { error }
}

export async function saveConversation(userId, projectId, messages) {
  const supabase = getSupabaseClient()
  if (!supabase || !userId || !projectId) return unavailable()
  const { data, error } = await supabase.from('conversations').upsert({
    user_id: userId,
    project_id: projectId,
    messages: messages || [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,project_id' }).select().single()
  return { data, error }
}

export async function loadConversations(userId, projectId) {
  const supabase = getSupabaseClient()
  if (!supabase || !userId || !projectId) return { data: [], error: null }
  const { data, error } = await supabase.from('conversations').select('*')
    .eq('user_id', userId).eq('project_id', projectId).order('updated_at', { ascending: false })
  return { data: data || [], error }
}
