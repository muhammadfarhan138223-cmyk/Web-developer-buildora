import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from './store.js'
import { onAuthStateChange, getCurrentUser } from './lib/auth.js'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Builder from './components/Builder.jsx'
import { useEffect } from 'react'

function AuthGuard({ children }) {
  const user = useStore((s) => s.user)
  const authLoading = useStore((s) => s.authLoading)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-sm">N</span>
        </div>
      </div>
    )
  }

  // Allow access to builder even without auth (guest mode)
  return children
}

export default function App() {
  const setUser = useStore((s) => s.setUser)
  const newProject = useStore((s) => s.newProject)

  useEffect(() => {
    let subscription = null

    async function initAuth() {
      const user = await getCurrentUser()
      setUser(user)

      subscription = onAuthStateChange((session) => {
        setUser(session?.user || null)
      })
    }

    initAuth()

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [setUser])

  // Initialize a default project if none exists
  useEffect(() => {
    const state = useStore.getState()
    if (!state.projectId) {
      newProject()
    }
  }, [newProject])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/builder"
          element={
            <AuthGuard>
              <Builder />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
