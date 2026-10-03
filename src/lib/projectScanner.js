/**
 * Project scanner — creates a compact, useful context package for the coding agent.
 * It intentionally excludes secrets and avoids sending huge/unrelated files.
 */

const MAX_TOTAL_CONTEXT = 24000
const MAX_FILE_CONTEXT = 6000
const SECRET_FILE = /(^|\/)(\.env|\.env\.|.*\.pem$|.*\.key$|.*secret.*)/i
const IMPORTANT_FILES = new Set([
  'package.json',
  'vite.config.js',
  'vite.config.ts',
  'next.config.js',
  'next.config.ts',
  'index.html',
  'src/main.jsx',
  'src/main.tsx',
  'src/App.jsx',
  'src/App.tsx',
  'src/index.css',
  'src/app.css',
])

export function scanProject(files, query = '') {
  if (!files || Object.keys(files).length === 0) {
    return {
      framework: 'unknown',
      packageManager: 'unknown',
      styling: 'unknown',
      files: [],
      summary: 'Empty project. No files have been created yet.',
    }
  }

  const paths = Object.keys(files).filter((path) => !SECRET_FILE.test(path))
  const framework = detectFramework(files, paths)
  const packageManager = detectPackageManager(paths)
  const styling = detectStyling(paths)

  const scored = paths
    .map((path) => ({
      path,
      content: typeof files[path] === 'string' ? files[path] : '',
      score: relevanceScore(path, files[path], query),
    }))
    .sort((a, b) => b.score - a.score)

  const selected = []
  let total = 0

  for (const file of scored) {
    if (total >= MAX_TOTAL_CONTEXT) break
    const raw = file.content || ''
    const safeRaw = /^data:[^;]+;base64,/i.test(raw)
      ? '[binary asset omitted from AI context]'
      : redactSecrets(raw)
    const content = safeRaw.length > MAX_FILE_CONTEXT
      ? `${safeRaw.slice(0, MAX_FILE_CONTEXT)}\n/* ...file truncated for context... */`
      : safeRaw

    const cost = content.length
    if (selected.length > 0 && total + cost > MAX_TOTAL_CONTEXT && !IMPORTANT_FILES.has(file.path)) continue

    selected.push({
      path: file.path,
      description: describeFile(file.path, raw.length),
      content,
    })
    total += cost
  }

  const hasViteConfig = paths.some((p) => p.startsWith('vite.config'))
  const hasSupabase = paths.some((p) => p.toLowerCase().includes('supabase'))

  let summary = `Project type: ${framework}\n`
  summary += `Files: ${paths.length}\n`
  summary += `Build tool: ${hasViteConfig ? 'Vite' : 'unknown'}\n`
  summary += `Styling: ${styling}\n`
  if (hasSupabase) summary += 'Backend: Supabase integration detected\n'
  summary += `Context files included: ${selected.length}\n`

  return {
    framework,
    packageManager,
    styling,
    files: selected,
    summary,
  }
}

function detectFramework(files, paths) {
  if (paths.includes('package.json')) {
    try {
      const pkg = JSON.parse(files['package.json'])
      if (pkg.dependencies?.next || pkg.devDependencies?.next) return 'next'
      if (pkg.dependencies?.react || pkg.devDependencies?.react) return 'react'
      if (pkg.dependencies?.vue || pkg.devDependencies?.vue) return 'vue'
      if (pkg.dependencies?.svelte || pkg.devDependencies?.svelte) return 'svelte'
      if (pkg.dependencies?.fastapi || paths.some((p) => p.endsWith('.py'))) return 'python'
      return 'node'
    } catch {
      // Fall through to extension detection.
    }
  }

  if (paths.some((p) => /\.(jsx|tsx)$/.test(p))) return 'react'
  if (paths.some((p) => p.endsWith('.py'))) return 'python'
  if (paths.some((p) => p.endsWith('.html'))) return 'html'
  return 'unknown'
}

function detectPackageManager(paths) {
  if (paths.includes('pnpm-lock.yaml')) return 'pnpm'
  if (paths.includes('yarn.lock')) return 'yarn'
  if (paths.includes('bun.lockb') || paths.includes('bun.lock')) return 'bun'
  return 'npm'
}

function detectStyling(paths) {
  let styling = paths.some((p) => /tailwind\.config\.(js|ts)$/.test(p)) ? 'tailwind' : 'css'
  if (paths.some((p) => /\.(scss|sass)$/.test(p))) {
    styling = styling === 'tailwind' ? 'tailwind+scss' : 'scss'
  }
  return styling
}

function relevanceScore(path, content, query) {
  let score = IMPORTANT_FILES.has(path) ? 100 : 0
  if (/^(src\/)?(components|pages|app|lib|api)\//.test(path)) score += 25
  if (/\.(jsx|tsx|js|ts|css|html|py)$/.test(path)) score += 15

  const q = String(query || '').toLowerCase().split(/\s+/).filter((word) => word.length > 3)
  const haystack = `${path} ${content || ''}`.toLowerCase()
  for (const word of q) {
    if (haystack.includes(word)) score += 3
  }

  return score
}


function redactSecrets(value) {
  return String(value || '')
    .replace(/(sk-[A-Za-z0-9_-]{16,})/g, '[REDACTED_API_KEY]')
    .replace(/(AIza[0-9A-Za-z_-]{20,})/g, '[REDACTED_API_KEY]')
    .replace(/(sb_(?:publishable|secret)_[A-Za-z0-9_-]{12,})/g, '[REDACTED_SUPABASE_KEY]')
    .replace(/((?:service_role|anon_key|api[_-]?key|secret[_-]?key)\s*[:=]\s*["']?)[^\s,"']{8,}/gi, '$1[REDACTED]')
}

function describeFile(path, size) {
  const ext = path.split('.').pop()?.toLowerCase()
  const sizeLabel = size > 1000 ? `${Math.round(size / 1024)}KB` : `${size}B`
  const descriptions = {
    jsx: 'React component',
    tsx: 'React component (TypeScript)',
    js: 'JavaScript module',
    ts: 'TypeScript module',
    css: 'Stylesheet',
    html: 'HTML page',
    json: 'JSON config',
    py: 'Python module',
    md: 'Markdown',
  }
  if (path === 'package.json') return 'package manifest'
  if (path === 'index.html') return 'HTML entry point'
  if (path.startsWith('vite.config')) return 'Vite config'
  if (path.startsWith('tailwind.config')) return 'Tailwind config'
  if (path.includes('supabase')) return 'Supabase integration'
  return `${descriptions[ext] || ext || 'file'}, ${sizeLabel}`
}
