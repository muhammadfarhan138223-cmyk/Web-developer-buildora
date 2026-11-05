import React, { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store.js'
import { bootstrapBackend } from './lib/backend.js'
import { initializeAuthClient } from './lib/supabaseClient.js'
import { onAuthStateChange, getCurrentUser } from './lib/auth.js'
import Landing from './pages/Landing.jsx'
const Login=lazy(()=>import('./pages/Login.jsx'))
const Info=lazy(()=>import('./pages/Info.jsx'))
const DetachedPreview=lazy(()=>import('./builder/DetachedPreview.jsx'));
const Builder=lazy(()=>import('./components/Builder.jsx'))
import AppBoundary from './components/AppBoundary.jsx';
import Seo from './components/Seo.jsx'
const Settings=lazy(()=>import('./pages/Settings.jsx'))
const Connections=lazy(()=>import('./pages/Connections.jsx'))
const ContentPage=lazy(()=>import('./pages/ContentPage.jsx'))

const Templates=lazy(()=>import('./pages/Templates.jsx'));
const Projects=lazy(()=>import('./pages/Projects.jsx'));
const Pricing=lazy(()=>import('./pages/Pricing.jsx'));
export default function App() {
  useEffect(()=>{
    let active=true, subscription
    async function init(){
      try {
        const config=await bootstrapBackend();if(!active)return
        initializeAuthClient(config);useStore.setState({backendConfig:config,backendError:''})
        subscription=onAuthStateChange(session=>{if(active)useStore.getState().setUser(session?.user || null)})
        const user=await getCurrentUser();if(active)useStore.getState().setUser(user)
      }catch(error){if(active)useStore.setState({user:null,authLoading:false,backendError:error.message})}
    }
    init()
    const state=useStore.getState();if(!state.projectId)state.newProject()
    return()=>{active=false;subscription?.unsubscribe()}
  },[])
  return <BrowserRouter><Seo/><AppBoundary><Suspense fallback={<div className="app-loading" role="status">Opening Buildora…</div>}><Routes><Route path="/" element={<Landing/>}/>{['/login','/signup','/recover','/reset-password'].map(path=><Route key={path} path={path} element={<Login key={path}/>}/>)}<Route path="/guide" element={<Info/>}/><Route path="/privacy" element={<Info/>}/><Route path="/settings" element={<Settings/>}/><Route path="/connections" element={<Connections/>}/>{['/features','/about','/terms','/cookies','/acceptable-use','/security','/brand','/contact'].map(path=><Route key={path} path={path} element={<ContentPage/>}/>)}<Route path="/templates" element={<Templates/>}/><Route path="/templates/:id" element={<Templates/>}/><Route path="/projects" element={<Projects/>}/><Route path="/pricing" element={<Pricing/>}/><Route path="/builder/preview" element={<DetachedPreview/>}/><Route path="/builder/*" element={<Builder/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Suspense></AppBoundary></BrowserRouter>
}
