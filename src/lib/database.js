import { getSupabaseClient } from './supabaseClient.js'
import { getBackendConfig, databaseRequest } from './backend.js'
const local = () => getBackendConfig()?.authProvider === 'local'

const unavailable = (data = null) => ({ data, error: { message: 'Supabase is not configured.' } })

export async function saveProject(userId, project) {
  if(local()) return databaseRequest(`/api/projects/${encodeURIComponent(project.id)}`,{method:'PUT',body:JSON.stringify(project)})
  const supabase = getSupabaseClient()
  if (!supabase || !userId) return unavailable()
  const { data, error } = await supabase.from('buildora_projects').upsert({
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
  if(local()) return databaseRequest('/api/projects')
  const supabase = getSupabaseClient()
  if (!supabase || !userId) return { data: [], error: null }
  const { data, error } = await supabase.from('buildora_projects')
    .select('id, name, description, framework, updated_at, created_at')
    .eq('user_id', userId).order('updated_at', { ascending: false })
  return { data: data || [], error }
}

export async function loadProject(projectId) {
  if(local()) return databaseRequest(`/api/projects/${encodeURIComponent(projectId)}`)
  const supabase = getSupabaseClient()
  if (!supabase || !projectId) return unavailable()
  const { data, error } = await supabase.from('buildora_projects').select('*').eq('id', projectId).single()
  return { data, error }
}

export async function deleteProject(projectId) {
  if(local()) return databaseRequest(`/api/projects/${encodeURIComponent(projectId)}`,{method:'DELETE',body:'{}'})
  const supabase = getSupabaseClient()
  if (!supabase || !projectId) return { error: null }
  const { error } = await supabase.from('buildora_projects').delete().eq('id', projectId)
  return { error }
}

export async function saveConversation(userId, projectId, messages) {
  if(local()) return databaseRequest(`/api/projects/${encodeURIComponent(projectId)}/conversation`,{method:'PUT',body:JSON.stringify({messages})})
  const supabase = getSupabaseClient()
  if (!supabase || !userId || !projectId) return unavailable()
  const { data, error } = await supabase.from('buildora_conversations').upsert({
    user_id: userId,
    project_id: projectId,
    messages: messages || [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,project_id' }).select().single()
  return { data, error }
}

export async function loadConversations(userId, projectId) {
  if(local()) return databaseRequest(`/api/projects/${encodeURIComponent(projectId)}/conversation`)
  const supabase = getSupabaseClient()
  if (!supabase || !userId || !projectId) return { data: [], error: null }
  const { data, error } = await supabase.from('buildora_conversations').select('*')
    .eq('user_id', userId).eq('project_id', projectId).order('updated_at', { ascending: false })
  return { data: data || [], error }
}
