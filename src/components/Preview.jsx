import React, { useMemo, useRef, useEffect, useState } from 'react'
import { Eye, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react'
import { useStore } from '../store.js'
import { NAV_SCRIPT, escapeScript, resolvePage, buildStaticPreview } from '../lib/previewBuilder.js'

function isReactProject(files) {
  return Boolean(
    files?.['package.json'] &&
    Object.keys(files).some((path) => /^src\/main\.(jsx|tsx)$/.test(path)),
  )
}

function collectExternalImports(sourceFiles, files) {
  const declarations = []
  const seen = new Set()

  for (const path of sourceFiles) {
    const source = files[path] || ''
    const imports = source.matchAll(/import\s+(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?/g)

    for (const match of imports) {
      const specifier = match[1].trim()
      const moduleName = match[2]
      if (moduleName.startsWith('.') || moduleName.startsWith('@/')) continue

      if (moduleName === 'react') {
        const defaultImport = specifier.match(/^([A-Za-z_$][\w$]*)/)?.[1]
        if (defaultImport && !seen.has(defaultImport)) {
          declarations.push(`const ${defaultImport} = window.React;`)
          seen.add(defaultImport)
        }
        const namedMatch = specifier.match(/\{([^}]+)\}/)
        if (namedMatch) {
          for (const raw of namedMatch[1].split(',')) {
            const [original, alias] = raw.trim().split(/\s+as\s+/)
            if (!original) continue
            const local = alias || original
            if (!seen.has(local)) {
              declarations.push(`const ${local} = window.React.${original};`)
              seen.add(local)
            }
          }
        }
        continue
      }

      if (moduleName === 'react-dom/client') {
        const namedMatch = specifier.match(/\{([^}]+)\}/)
        if (namedMatch) {
          for (const raw of namedMatch[1].split(',')) {
            const [original, alias] = raw.trim().split(/\s+as\s+/)
            if (!original) continue
            const local = alias || original
            if (!seen.has(local)) {
              declarations.push(`const ${local} = window.ReactDOM.${original};`)
              seen.add(local)
            }
          }
        }
        continue
      }

      // Third-party packages are not bundled in this isolated browser preview.
      // Define harmless component fallbacks so the preview can still render.
      const namedMatch = specifier.match(/\{([^}]+)\}/)
      if (namedMatch) {
        for (const raw of namedMatch[1].split(',')) {
          const [original, alias] = raw.trim().split(/\s+as\s+/)
          if (!original) continue
          const local = alias || original
          if (!seen.has(local)) {
            declarations.push(`const ${local} = /^use[A-Z]/.test('${local}') ? window.__NexusFallbackHook : window.__NexusFallbackComponent;`)
            seen.add(local)
          }
        }
      }

      const defaultImport = specifier.match(/^([A-Za-z_$][\w$]*)/)
      if (defaultImport && !specifier.startsWith('{')) {
        const local = defaultImport[1]
        if (!seen.has(local)) {
          declarations.push(`const ${local} = window.__NexusFallbackModule;`)
          seen.add(local)
        }
      }
    }
  }

  return declarations.join('\n')
}

function stripModuleSyntax(source) {
  return source
    .replace(/^\s*import[\s\S]*?from\s*['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^\s*import\s*['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+(?=(const|let|var|function|class)\b)/gm, '')
    .replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '')
}

function buildReactPreview(files) {
  const sourceFiles = Object.keys(files)
    .filter((path) => /^src\/.*\.(jsx|tsx|js|ts)$/.test(path))
    .sort((a, b) => {
      const aMain = /^src\/main\.(jsx|tsx)$/.test(a)
      const bMain = /^src\/main\.(jsx|tsx)$/.test(b)
      return Number(aMain) - Number(bMain)
    })

  const externalDeclarations = collectExternalImports(sourceFiles, files)

  const bundle = sourceFiles
    .map((path) => `\n/* ===== ${path} ===== */\n${stripModuleSyntax(files[path])}`)
    .join('\n')

  const mainPath = sourceFiles.find((path) => /^src\/main\.(jsx|tsx)$/.test(path))
  const mainSource = stripModuleSyntax(files[mainPath] || '')
  const rootMatch = mainSource.match(/createRoot\s*\(\s*document\.getElementById\(['"]([^'"]+)['"]\)/)
  const rootId = rootMatch?.[1] || 'root'
  const css = Object.entries(files)
    .filter(([path, content]) => path.endsWith('.css') && !path.includes('node_modules') && !/@tailwind\b|@apply\b/.test(content || ''))
    .map(([path, content]) => `<style data-file=\"${path}\">${content}</style>`)
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NexusAI Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  ${css}
</head>
<body>
  <div id="${rootId}"></div>
  <script type="text/babel" data-presets="react,typescript">
    window.__NEXUS_PREVIEW__ = true;
    window.__NexusFallbackComponent = function NexusFallbackComponent(props) {
      return React.createElement('span', { ...props, style: { display: 'inline-flex', width: '1em', height: '1em', alignItems: 'center', justifyContent: 'center' } }, '•');
    };
    window.__NexusFallbackModule = {};
    window.__NexusFallbackHook = function () { return typeof window !== 'undefined' ? { pathname: window.location.pathname } : {}; };
    ${externalDeclarations}
    ${escapeScript(bundle)}
  </script>
  ${NAV_SCRIPT}
</body>
</html>`
}

export default function Preview({ files }) {
  const iframeRef = useRef(null)
  const previewKey = useStore((s) => s.previewKey)
  const [frameError, setFrameError] = useState(null)
  const [page, setPage] = useState('index.html')
  const [notice, setNotice] = useState('')
  const filesRef = useRef(files)
  filesRef.current = files

  const reactProject = isReactProject(files)
  const hasIndexHtml = Boolean(files?.['index.html'])

  const activePage = files?.[page] ? page : 'index.html'

  const srcDoc = useMemo(() => {
    if (reactProject) return buildReactPreview(files)
    return buildStaticPreview(files, activePage)
  }, [files, reactProject, previewKey, activePage])

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (event.data?.type !== 'nexus-navigate') return
      const target = resolvePage(event.data.href, filesRef.current)
      if (target) {
        setNotice('')
        setPage(target)
      } else {
        setNotice(`Page not found: ${event.data.href}`)
        setTimeout(() => setNotice(''), 4000)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!iframeRef.current || !srcDoc) return
    iframeRef.current.srcdoc = srcDoc
  }, [srcDoc, previewKey])

  if (!hasIndexHtml && !reactProject) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-50 p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No preview entry point was found yet.</p>
          <p className="text-xs text-neutral-400 mt-1">Ask the AI to create an index.html entry point.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700">Live Preview</span>
          {reactProject && <span className="badge bg-primary-50 text-primary-700">React</span>}
          {!reactProject && (
            <span className="text-xs text-neutral-400">{activePage}</span>
          )}
          {notice && <span className="text-xs text-error-600">{notice}</span>}
        </div>
        <div className="flex items-center gap-1">
          {!reactProject && activePage !== 'index.html' && (
            <button onClick={() => setPage('index.html')} className="btn-ghost btn-sm text-xs">
              Home
            </button>
          )}
          <button
            onClick={() => useStore.getState().refreshPreview()}
            className="btn-ghost btn-sm"
            title="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {frameError && (
            <span className="text-xs text-error-600" title={frameError}>Preview error</span>
          )}
        </div>
      </div>
      <div className="flex-1 bg-white relative">
        <iframe
          ref={iframeRef}
          title="NexusAI live preview"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-forms allow-popups"
          onLoad={() => setFrameError(null)}
          onError={() => setFrameError('The preview frame could not load.')}
        />
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 px-3 py-1.5 text-[11px] text-neutral-500 shadow-sm backdrop-blur">
            <ExternalLink className="w-3 h-3" />
            Isolated preview
          </div>
        </div>
      </div>
    </div>
  )
}
