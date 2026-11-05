import { getSupabaseClient } from './supabaseClient.js'
import { api, getBackendConfig } from './backend.js'
import { useStore } from '../store.js'
import {usePreferences} from './preferences.js'
const local = () => getBackendConfig()?.authProvider === 'local'
const emit = user => window.dispatchEvent(new CustomEvent('buildora-auth',{detail:user}))
const unavailable = () => ({data:null,error:{message:'Authentication is not configured. Open the setup guide or restart the Buildora server.'}})
async function localAuth(path, body) {
  try {const result=await api(path,{method:'POST',body:JSON.stringify(body)});if(result.user)emit(result.user);return {data:{...result,session:result.user?{user:result.user}:null},error:null}} catch(error){return {data:null,error}}
}
export async function signUp(email,password) {
  if(local())return localAuth('/api/auth/signup',{email,password})
  const client=getSupabaseClient();return client ? client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/login'}}) : unavailable()
}
export async function signIn(email,password) {
  if(local())return localAuth('/api/auth/login',{email,password})
  const client=getSupabaseClient();return client ? client.auth.signInWithPassword({email,password}) : unavailable()
}
export async function signOut() {
  try {
    if(local()) await api('/api/auth/logout',{method:'POST',body:'{}'})
    else {const result=await getSupabaseClient()?.auth.signOut();if(result?.error)throw result.error}
    usePreferences.getState().update({apiKey:'',githubToken:''});useStore.getState().newProject();useStore.getState().setUser(null);emit(null);return {error:null}
  } catch(error) {return {error}}
}
export async function getCurrentUser() {
  if(local()) return (await api('/api/auth/session')).user
  const client=getSupabaseClient();if(!client)return null
  const {data,error}=await client.auth.getUser();if(error && error.name !== 'AuthSessionMissingError')throw error;return data?.user || null
}
export function onAuthStateChange(callback) {
  if(local()) {const handler=e=>callback(e.detail?{user:e.detail}:null);window.addEventListener('buildora-auth',handler);return {unsubscribe:()=>window.removeEventListener('buildora-auth',handler)}}
  const client=getSupabaseClient();if(!client)return {unsubscribe(){}}
  return client.auth.onAuthStateChange((_event,session)=>callback(session)).data.subscription
}
export async function recoverAccount(email,recoveryCode,password) {
  if(local()){const result=await localAuth('/api/auth/recover',{email,recoveryCode,password});if(!result.error){useStore.getState().setUser(null);emit(null)}return result}
  const client=getSupabaseClient();return client ? client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset-password'}) : unavailable()
}
export async function updatePassword(password) {
  const client=getSupabaseClient();return client ? client.auth.updateUser({password}) : unavailable()
}
export async function signInWithProvider(provider) {
  const client=getSupabaseClient();return client ? client.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+'/builder'}}) : unavailable()
}
