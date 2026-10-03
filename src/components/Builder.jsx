import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Loader2, CheckCircle2, AlertCircle, FileCode2,
  Trash2, Eye, Code2, MessageSquare, Plus, Download, Save, Upload, CloudDownload, Database,
} from 'lucide-react'
import { useStore } from '../store.js'
import { loadConversations, loadProject, loadProjects, saveConversation, saveProject } from '../lib/database.js'
import { parseAIResponse } from '../ai/responseParser.js'
import { scanProject } from '../lib/projectScanner.js'
import CodeView from './CodeView.jsx'
import Preview from './Preview.jsx'
import JSZip from 'jszip'
import { configureSupabase, getSupabaseConfig } from '../lib/supabaseClient.js'

export default function Builder() {
  const [input, setInput] = useState('')
  const [view, setView] = useState('chat')
  const [showSupabase, setShowSupabase] = useState(false)
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseConfig()?.url || '')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [supabaseStatus, setSupabaseStatus] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const importInputRef = useRef(null)

  const {
    conversation, addMessage, isGenerating, setGenerating,
    progress, updateProgress, clearProgress,
    generatingError, setGeneratingError,
    projectFiles, applyOperations, refreshPreview,
    projectName, setProjectName, newProject, activeFile, setActiveFile, user,
  } = useStore()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [conversation, scrollToBottom])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [input])

  async function handleSend() {
    const message = input.trim()
    if (!message || isGenerating) return

    setInput('')
    addMessage({ role: 'user', content: message, timestamp: Date.now() })
    setGenerating(true)
    setGeneratingError(null)
    clearProgress()

    const steps = [
      { label: 'Understanding request', icon: 'understand' },
      { label: 'Analyzing project', icon: 'inspect' },
      { label: 'Planning implementation', icon: 'plan' },
      { label: 'Generating code', icon: 'implement' },
      { label: 'Checking generated files', icon: 'validate' },
    ]

    const createdSteps = steps.map((s) => ({ ...s, id: Math.random().toString(36), status: 'pending' }))
    useStore.setState({ progress: createdSteps })

    try {
      // Step 1: Understanding
      updateStep(0, 'active')
      const projectContext = scanProject(projectFiles)
      await sleep(300)
      updateStep(0, 'done')

      // Step 2: Inspecting
      updateStep(1, 'active')
      await sleep(300)
      updateStep(1, 'done')

      // Step 3: Planning
      updateStep(2, 'active')
      await sleep(400)
      updateStep(2, 'done')

      // Step 4: Implementing — call the API
      updateStep(3, 'active')

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          projectContext,
          conversationHistory: conversation.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Request failed (${response.status})`)
      }

      const data = await response.json()

      // Parse and validate file operations before applying anything.
      const parsed = parseAIResponse(data.content)
      const validation = validateOperations(parsed.operations)
      if (!validation.ok) throw new Error(validation.error)

      if (parsed.operations.length > 0) {
        applyOperations(parsed.operations)
        refreshPreview()
      }

      updateStep(3, 'done')

      // Step 5: Validate generated file structure.
      updateStep(4, 'active')
      await sleep(200)
      updateStep(4, 'done')

      addMessage({
        role: 'assistant',
        content: data.content,
        text: parsed.text,
        summary: parsed.summary,
        operations: parsed.operations,
        provider: data.provider,
        model: data.model,
        providerNotice: data.fallbackIndex > 0 ? 'The AI automatically switched to another available provider.' : null,
        timestamp: Date.now(),
      })

      // Persist when Supabase is connected; local persistence remains the fallback.
      if (user?.id) {
        const latest = useStore.getState()
        await saveProject(user.id, {
          id: latest.projectId,
          name: latest.projectName,
          files: latest.projectFiles,
          framework: latest.projectFiles['package.json'] ? 'react' : 'html',
        })
        await saveConversation(user.id, latest.projectId, latest.conversation)
      }
    } catch (err) {
      updateStep(-1, 'error')
      setGeneratingError(err.message || 'Something went wrong')
      addMessage({
        role: 'assistant',
        content: `I ran into an issue: ${err.message || 'Unknown error'}. Please try again.`,
        isError: true,
        timestamp: Date.now(),
      })
    } finally {
      setGenerating(false)
    }
  }


  function handleConnectSupabase(event) {
    event.preventDefault()
    try {
      configureSupabase(supabaseUrl, supabaseKey)
      setSupabaseStatus('Supabase connected. Reloading the builder…')
      window.setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      setSupabaseStatus(error.message || 'Could not connect Supabase.')
    }
  }

  async function handleLoadCloud() {
    if (!user?.id) {
      setGeneratingError('Sign in to load projects from Supabase.')
      return
    }

    const { data: projects, error } = await loadProjects(user.id)
    if (error) {
      setGeneratingError(error.message || 'Could not load your cloud projects.')
      return
    }

    const latest = projects?.[0]
    if (!latest) {
      addMessage({ role: 'assistant', content: 'No saved cloud projects were found for this account.', timestamp: Date.now() })
      return
    }

    const { data: project, error: projectError } = await loadProject(latest.id)
    if (projectError || !project) {
      setGeneratingError(projectError?.message || 'Could not load the selected project.')
      return
    }

    const { data: conversations } = await loadConversations(user.id, latest.id)
    useStore.getState().setProject({
      id: project.id,
      name: project.name,
      files: project.files || {},
    })
    useStore.setState({
      conversation: conversations?.[0]?.messages || [],
      activeFile: project.files?.['index.html'] ? 'index.html' : Object.keys(project.files || {}).sort()[0] || null,
    })
    refreshPreview()
    addMessage({ role: 'assistant', content: `Loaded “${project.name}” from Supabase.`, timestamp: Date.now() })
  }

  async function handleSave() {
    if (!user?.id) {
      addMessage({
        role: 'assistant',
        content: 'Your project is already saved locally on this device. Sign in and connect Supabase to sync it to the cloud.',
        timestamp: Date.now(),
      })
      return
    }

    const state = useStore.getState()
    const { error } = await saveProject(user.id, {
      id: state.projectId,
      name: state.projectName,
      files: state.projectFiles,
      framework: state.projectFiles['package.json'] ? 'react' : 'html',
    })

    if (error) {
      setGeneratingError(error.message || 'Could not save the project.')
      return
    }

    await saveConversation(user.id, state.projectId, state.conversation)
    addMessage({ role: 'assistant', content: 'Project saved to Supabase.', timestamp: Date.now() })
  }

  function validateOperations(operations) {
    for (const op of operations || []) {
      if (!op?.path || op.path.startsWith('/') || op.path.includes('..') || op.path.includes('\\')) {
        return { ok: false, error: `Invalid file path returned by the AI: ${op?.path || 'unknown'}` }
      }
      if (!['write', 'delete'].includes(op.type)) {
        return { ok: false, error: `Unsupported file operation for ${op.path}.` }
      }
      if (op.type === 'write' && typeof op.content !== 'string') {
        return { ok: false, error: `Invalid file content for ${op.path}.` }
      }
    }
    return { ok: true }
  }

  function updateStep(index, status) {
    const state = useStore.getState()
    if (index < 0) {
      // mark all as error
      useStore.setState({
        progress: state.progress.map((p) => ({ ...p, status: 'error' })),
      })
      return
    }
    useStore.setState({
      progress: state.progress.map((p, i) =>
        i === index ? { ...p, status } : p.status === 'active' ? { ...p, status: 'done' } : p
      ),
    })
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function mimeForPath(path) {
    const ext = path.split('.').pop()?.toLowerCase()
    const map = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      ico: 'image/x-icon', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', wav: 'audio/wav',
      woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', pdf: 'application/pdf', zip: 'application/zip',
    }
    return map[ext] || 'application/octet-stream'
  }

  async function handleImportZip(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const zip = await JSZip.loadAsync(file)
      const imported = {}

      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue
        if (path.includes('node_modules/') || path.includes('.git/')) continue
        if (/^\.env(?:\.|$)/i.test(path.split('/').pop() || '')) continue
        const normalizedPath = path.replace(/^\.\//, '')
        const isBinary = /\.(png|jpe?g|gif|webp|svg|ico|avif|mp4|webm|mp3|wav|woff2?|ttf|otf|pdf|zip)$/i.test(normalizedPath)
        imported[normalizedPath] = isBinary
          ? `data:${mimeForPath(normalizedPath)};base64,${await entry.async('base64')}`
          : await entry.async('string')
      }

      if (!Object.keys(imported).length) throw new Error('The ZIP does not contain readable project files.')

      // Bolt/GitHub downloads often wrap the project in one top-level folder.
      // Remove that wrapper so the builder sees package.json/src at the project root.
      const paths = Object.keys(imported)
      const firstSegments = new Set(paths.map((path) => path.split('/')[0]))
      const wrapper = firstSegments.size === 1 && paths.every((path) => path.includes('/'))
        ? [...firstSegments][0]
        : null
      const normalizedFiles = wrapper
        ? Object.fromEntries(paths.map((path) => [path.slice(wrapper.length + 1), imported[path]]))
        : imported

      const projectId = useStore.getState().projectId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined)
      useStore.setState({
        projectId,
        projectName: file.name.replace(/\.zip$/i, '') || 'Imported Project',
        projectFiles: normalizedFiles,
        conversation: [],
        activeFile: normalizedFiles['index.html'] ? 'index.html' : Object.keys(normalizedFiles).sort()[0] || null,
      })
      refreshPreview()
      addMessage({ role: 'assistant', content: `Imported ${Object.keys(normalizedFiles).length} project files.`, timestamp: Date.now() })
    } catch (error) {
      setGeneratingError(error.message || 'Could not import the ZIP file.')
    }
  }

  async function handleDownload() {
    const zip = new JSZip()
    for (const [path, content] of Object.entries(projectFiles)) {
      const binaryMatch = typeof content === 'string' && content.match(/^data:[^;]+;base64,(.*)$/s)
      if (binaryMatch) zip.file(path, binaryMatch[1], { base64: true })
      else zip.file(path, content)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName || 'project'}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-neutral-900 hidden sm:block">NexusAI</span>
          </div>
          <div className="h-6 w-px bg-neutral-200 hidden sm:block" />
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-sm font-medium text-neutral-700 bg-transparent border-none focus:outline-none focus:ring-0 max-w-[200px]"
            placeholder="Project name"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
            <button
              onClick={() => setView('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'chat' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => setView('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'code' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span className="hidden sm:inline">Code</span>
            </button>
            <button
              onClick={() => setView('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'preview' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={handleImportZip}
          />
          <button onClick={() => importInputRef.current?.click()} className="btn-ghost btn-sm" title="Import ZIP project">
            <Upload className="w-4 h-4" />
          </button>
          {user?.id && (
            <button onClick={handleLoadCloud} className="btn-ghost btn-sm" title="Load latest cloud project">
              <CloudDownload className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => { setSupabaseStatus(null); setSupabaseKey(''); setShowSupabase(true) }} className="btn-ghost btn-sm" title="Connect Supabase">
            <Database className="w-4 h-4" />
          </button>
          <button onClick={handleSave} className="btn-ghost btn-sm" title="Save project">
            <Save className="w-4 h-4" />
          </button>
          <button onClick={handleDownload} className="btn-ghost btn-sm" title="Download project">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={newProject} className="btn-ghost btn-sm" title="New project">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>


      {showSupabase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Connect Supabase</h2>
                <p className="mt-1 text-sm text-neutral-500">Use the public project URL and publishable/anon key. Never enter a service-role key here.</p>
              </div>
              <button onClick={() => setShowSupabase(false)} className="btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleConnectSupabase} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Project URL</label>
                <input value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} className="input" placeholder="https://your-project.supabase.co" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Publishable / anon key</label>
                <input value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} type="password" className="input" placeholder="sb_publishable_… or anon key" required />
              </div>
              {supabaseStatus && <p className="text-sm text-primary-600">{supabaseStatus}</p>}
              <button type="submit" className="btn-primary w-full">Connect Supabase</button>
            </form>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {view === 'chat' && (
          <ChatPanel
            conversation={conversation}
            isGenerating={isGenerating}
            progress={progress}
            generatingError={generatingError}
            messagesEndRef={messagesEndRef}
          />
        )}
        {view === 'code' && (
          <CodeView files={projectFiles} activeFile={activeFile} setActiveFile={setActiveFile} />
        )}
        {view === 'preview' && <Preview files={projectFiles} />}
      </div>

      {/* Chat input */}
      {view === 'chat' && (
        <div className="border-t border-neutral-200 bg-white p-3 shrink-0">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build or change..."
                rows={1}
                className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 pr-12 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                disabled={isGenerating}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="btn-primary rounded-xl !px-3 !py-3"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-neutral-400 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  )
}

function ChatPanel({ conversation, isGenerating, progress, generatingError, messagesEndRef }) {
  if (conversation.length === 0 && !isGenerating) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">N</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">
            What would you like to build?
          </h2>
          <p className="text-neutral-500 mb-8">
            Describe a website, app, or feature in plain language. I'll inspect, plan, build, and validate it for you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {[
              { title: 'Landing page', desc: 'A SaaS landing page with hero, features, and pricing' },
              { title: 'Todo app', desc: 'A todo app with add, complete, and delete actions' },
              { title: 'Blog', desc: 'A blog with posts list and individual post pages' },
              { title: 'Dashboard', desc: 'An analytics dashboard with charts and stats' },
            ].map((s) => (
              <SuggestionCard key={s.title} title={s.title} desc={s.desc} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {conversation.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}

        {isGenerating && <ProgressSteps steps={progress} />}

        {generatingError && (
          <div className="flex items-center gap-2 rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{generatingError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

function SuggestionCard({ title, desc }) {
  return (
    <div className="card p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-default">
      <h3 className="font-semibold text-neutral-900 text-sm mb-1">{title}</h3>
      <p className="text-sm text-neutral-500">{desc}</p>
    </div>
  )
}

function Message({ message }) {
  const isUser = message.role === 'user'
  const isError = message.isError

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-in-right">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary-600 text-white px-4 py-2.5 text-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-[85%] w-full">
        <div className={`rounded-2xl rounded-bl-md px-4 py-3 text-sm ${isError ? 'bg-error-50 border border-error-200' : 'bg-white border border-neutral-200'}`}>
          {message.text && (
            <p className="whitespace-pre-wrap text-neutral-700 mb-3">{message.text}</p>
          )}
          {!message.text && message.content && (
            <p className="whitespace-pre-wrap text-neutral-700">{message.content}</p>
          )}

          {message.operations && message.operations.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Files changed</p>
              {message.operations.map((op, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                  {op.type === 'write' ? (
                    <FileCode2 className="w-4 h-4 text-primary-500" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-error-500" />
                  )}
                  <span className="font-mono text-xs">{op.path}</span>
                  <span className={`badge ${op.type === 'write' ? 'bg-primary-50 text-primary-700' : 'bg-error-50 text-error-700'}`}>
                    {op.type}
                  </span>
                </div>
              ))}
            </div>
          )}

          {message.providerNotice && (
            <div className="mt-3 text-xs text-primary-600">{message.providerNotice}</div>
          )}

          {message.summary && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <p className="text-sm text-neutral-600">{message.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProgressSteps({ steps }) {
  return (
    <div className="rounded-2xl rounded-bl-md bg-white border border-neutral-200 px-4 py-3 animate-slide-up">
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            {step.status === 'done' && (
              <CheckCircle2 className="w-4 h-4 text-success-500" />
            )}
            {step.status === 'active' && (
              <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
            )}
            {step.status === 'pending' && (
              <div className="w-4 h-4 rounded-full border-2 border-neutral-200" />
            )}
            {step.status === 'error' && (
              <AlertCircle className="w-4 h-4 text-error-500" />
            )}
            <span className={`${
              step.status === 'done' ? 'text-neutral-400 line-through' :
              step.status === 'active' ? 'text-neutral-900 font-medium' :
              step.status === 'error' ? 'text-error-600' :
              'text-neutral-400'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
