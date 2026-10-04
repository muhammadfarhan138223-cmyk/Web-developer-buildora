import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn, signUp, signInWithProvider } from '../lib/auth.js'
import { Loader2, AlertCircle, Sparkles, Github } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleProvider(provider) {
    setError(null)
    const { error } = await signInWithProvider(provider)
    if (error) setError(error.message || 'Could not start social sign-in.')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      // After signup, try to sign in immediately (email confirmation is OFF)
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
    }

    navigate('/builder')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/buildora-logo.png" alt="Buildora" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="card p-8">
          <div className="flex rounded-lg bg-neutral-100 p-1 mb-6">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'signin' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-100">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleProvider('google')}
                className="btn-secondary btn-sm"
              >
                <span className="font-semibold">G</span>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleProvider('github')}
                className="btn-secondary btn-sm"
              >
                <Github className="w-4 h-4" />
                GitHub
              </button>
              <button
                type="button"
                onClick={() => handleProvider('facebook')}
                className="btn-secondary btn-sm"
              >
                <span className="font-bold text-blue-600">f</span>
                Facebook
              </button>
            </div>
          </div>

          <div className="mt-4">
            <Link to="/builder" className="flex items-center justify-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
              <Sparkles className="w-4 h-4" />
              Continue without an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
