// Pure helpers for the static (HTML/CSS/JS) live preview.
// Supports multipage sites: index.html, about.html, contact.html ...

export function escapeScript(text) {
  return String(text || '').replace(/<\/script/gi, '<\\/script')
}

// Injected into every preview. Stops links from loading the builder app
// inside the preview frame and asks the parent to switch pages instead.
export const NAV_SCRIPT = [
  '<script>(function(){',
  "  document.addEventListener('click', function(e){",
  "    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;",
  '    if (!a) return;',
  "    var href = a.getAttribute('href') || '';",
  '    if (/^(mailto:|tel:)/i.test(href)) return;',
  '    e.preventDefault();',
  "    if (/^https?:\\/\\//i.test(href)) { window.open(href, '_blank', 'noopener'); return; }",
  "    if (href.charAt(0) === '#') {",
  '      var el = href.length > 1 ? document.getElementById(href.slice(1)) : null;',
  "      if (el) el.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo({ top: 0, behavior: 'smooth' });",
  '      return;',
  '    }',
  "    parent.postMessage({ type: 'nexus-navigate', href: href }, '*');",
  '  }, true);',
  "  document.addEventListener('submit', function(e){ e.preventDefault(); }, true);",
  '})();</' + 'script>',
].join('\n')

export function injectBeforeBodyEnd(html, snippet) {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, () => `${snippet}\n</body>`)
  return `${html}\n${snippet}`
}

// Turns a link like "about.html", "/about", "./contact#form" into a project file path.
export function resolvePage(href, files) {
  let p = String(href || '').split('#')[0].split('?')[0].trim()
  p = p.replace(/^(\.\/)+/, '').replace(/^\/+/, '')
  if (!p) return 'index.html'
  const base = p.replace(/\/$/, '')
  const candidates = [p, `${base}.html`, `${base}/index.html`]
  return candidates.find((c) => typeof files?.[c] === 'string') || null
}

const normalizeAsset = (value) => String(value || '').trim().replace(/^(\.\/)+/, '').replace(/^\/+/, '')
const isExternal = (value) => /^(https?:)?\/\//i.test(value) || /^data:/i.test(value)

export function buildStaticPreview(files, page = 'index.html') {
  let html = files?.[page]
  if (typeof html !== 'string') return null

  // Inline base64 assets
  for (const [path, content] of Object.entries(files)) {
    if (typeof content === 'string' && /^data:[^;]+;base64,/i.test(content)) {
      const assetPath = path.replace(/^public\//, '').replace(/^\.\//, '')
      for (const candidate of [path, assetPath, `/${assetPath}`, `/${path}`]) {
        html = html.split(`"${candidate}"`).join(`"${content}"`)
        html = html.split(`'${candidate}'`).join(`'${content}'`)
        html = html.split(`url(${candidate})`).join(`url(${content})`)
        html = html.split(`url(./${candidate})`).join(`url(${content})`)
      }
    }
  }

  const inlinedCss = new Set()
  const inlinedJs = new Set()

  // <link rel="stylesheet" href="style.css"> -> inline <style>
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel=["']?stylesheet/i.test(tag)) return tag
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
    if (!href || isExternal(href)) return tag
    const key = normalizeAsset(href)
    if (typeof files[key] !== 'string') return ''
    inlinedCss.add(key)
    return `<style data-file="${key}">${files[key]}</style>`
  })

  // <script src="script.js"></script> -> inline <script>
  html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (tag, src) => {
    if (isExternal(src)) return tag
    const key = normalizeAsset(src)
    if (typeof files[key] !== 'string') return ''
    inlinedJs.add(key)
    return `<script data-file="${key}">${escapeScript(files[key])}</script>`
  })

  // Shared CSS files that the page forgot to link
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('.css') && !path.includes('node_modules') && !inlinedCss.has(path)) {
      html = html.replace(/<\/head>/i, () => `<style data-file="${path}">${content}</style>\n</head>`)
    }
  }

  // Backwards compatible: index.html without any script tag still gets main.js
  const mainKey = ['main.js', 'script.js', 'app.js'].find((k) => typeof files[k] === 'string')
  if (page === 'index.html' && mainKey && inlinedJs.size === 0) {
    html = injectBeforeBodyEnd(html, `<script data-file="${mainKey}">${escapeScript(files[mainKey])}</script>`)
  }

  return injectBeforeBodyEnd(html, NAV_SCRIPT)
}
