import React from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, Code2, Eye, Zap, Shield, Layers,
  ArrowRight, Check,
} from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-lg text-neutral-900">NexusAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost btn-sm">Sign In</Link>
            <Link to="/builder" className="btn-primary btn-sm">
              Start Building
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-100 px-3 py-1 text-sm text-primary-700 mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            AI-powered website builder
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 tracking-tight text-balance mb-6 animate-slide-up">
            Describe it.{" "}
            <span className="text-primary-600">NexusAI builds it.</span>
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-8 text-balance animate-slide-up">
            An AI coding agent that understands your request, inspects your project,
            writes the code, checks generated file changes, and routes around temporary AI provider failures — like a focused engineering team in your browser.
          </p>
          <div className="flex items-center justify-center gap-3 animate-slide-up">
            <Link to="/builder" className="btn-primary">
              Start Building Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-neutral-900 mb-4">
            How it works
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            NexusAI follows a structured engineering process for every request.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Code2, title: 'Understand', desc: 'Analyzes your request and inspects your existing project files.' },
            { icon: Layers, title: 'Plan', desc: 'Creates an internal implementation plan without exposing raw reasoning.' },
            { icon: Zap, title: 'Build', desc: 'Writes or modifies files with production-quality code and real content.' },
            { icon: Eye, title: 'Validate', desc: 'Checks generated file operations and gives you an isolated live preview.' },
          ].map((f) => (
            <div key={f.title} className="card p-6 hover:shadow-md hover:border-primary-200 transition-all">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{f.title}</h3>
              <p className="text-sm text-neutral-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech */}
      <section className="bg-neutral-50 border-y border-neutral-100 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 mb-4">
                Built for real projects
              </h2>
              <p className="text-neutral-600 mb-6">
                NexusAI works with the technologies you already use. It knows when
                a project needs just frontend code and when a real backend with
                database and authentication is required.
              </p>
              <div className="space-y-3">
                {[
                  'React, TypeScript, JavaScript, HTML & CSS',
                  'Tailwind CSS with responsive, accessible design',
                  'Supabase: auth, database, storage, and realtime',
                  'Multi-provider AI with automatic failover',
                  'Live preview with instant code updates',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-neutral-700">
                    <Check className="w-4 h-4 text-success-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="font-semibold text-neutral-900">Example conversation</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-md bg-primary-600 text-white px-3.5 py-2 max-w-[80%]">
                    Create a landing page for a coffee shop with a menu and contact form
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2 max-w-[80%]">
                    <p className="text-neutral-700 mb-2">On it. I'll create a landing page with:</p>
                    <ul className="text-xs text-neutral-500 space-y-1 ml-3 list-disc">
                      <li>Hero section with coffee shop name</li>
                      <li>Menu grid with real items and prices</li>
                      <li>Contact form with validation</li>
                      <li>Responsive design for mobile and desktop</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <div className="w-4 h-4 rounded-full border-2 border-success-500 border-t-transparent animate-spin-slow" />
                  <span>Generating index.html, styles.css, script.js...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600 mb-6">
          <Shield className="w-4 h-4" />
          No credit card required
        </div>
        <h2 className="text-3xl font-bold text-neutral-900 mb-4">
          Start building in seconds
        </h2>
        <p className="text-neutral-600 mb-8 max-w-xl mx-auto">
          Just describe what you want. NexusAI handles the rest.
        </p>
        <Link to="/builder" className="btn-primary">
          Open the Builder
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <span className="text-sm text-neutral-500">NexusAI Builder</span>
          </div>
          <p className="text-xs text-neutral-400">
            Built with React, Vite & Supabase
          </p>
        </div>
      </footer>
    </div>
  )
}
