// Step-by-step multipage website builder.
// Instead of asking a (free) model for a whole website in one huge reply,
// we ask for a small plan first, then one page per request.
import { parseAIResponse } from '../ai/responseParser.js'

const FILE_RE = /^[a-z0-9-]+\.html$/
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/
const defaultWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const clip = (value, max) => String(value ?? '').trim().slice(0, max)

export function isResumeRequest(message = '') {
  const text = String(message).trim()
  return text.split(/\s+/).length <= 5 &&
    /^(please\s+)?(continue|resume|retry|try again|dobara|phir se|jari rakho)\b/i.test(text)
}

export function isSiteRequest(message = '', files = {}) {
  if (files?.['package.json']) return false
  return /\b(create|build|make|generate|design|banao|bana)\b/i.test(message) &&
    /(website|web site|multi-?\s?page|landing|portfolio|\bsite\b)/i.test(message)
}

export function parsePlan(text) {
  const raw = String(text || '')
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) return null

  let data
  try { data = JSON.parse(raw.slice(start, end + 1)) } catch { return null }

  const seen = new Set()
  const pages = []
  for (const item of Array.isArray(data?.pages) ? data.pages : []) {
    const file = String(item?.file || '').trim().toLowerCase().replace(/^\.?\//, '')
    if (!FILE_RE.test(file) || seen.has(file)) continue
    seen.add(file)
    pages.push({
      file,
      title: clip(item.title || file.replace('.html', ''), 40),
      purpose: clip(item.purpose, 200),
      sections: (Array.isArray(item.sections) ? item.sections : []).slice(0, 6).map((s) => clip(s, 60)),
    })
  }
  if (pages.length === 0) return null

  const indexAt = pages.findIndex((p) => p.file === 'index.html')
  if (indexAt > 0) pages.unshift(...pages.splice(indexAt, 1))
  if (indexAt === -1) pages.unshift({ file: 'index.html', title: 'Home', purpose: 'Landing page', sections: ['hero', 'highlights', 'call to action'] })

  return {
    siteName: clip(data.siteName || 'My Website', 60),
    tagline: clip(data.tagline, 120),
    accent: HEX_RE.test(data.accent || '') ? data.accent : '#2563eb',
    accentDark: HEX_RE.test(data.accentDark || '') ? data.accentDark : '#1d4ed8',
    font: /^[A-Za-z0-9 ]{2,40}$/.test(data.font || '') ? data.font : 'Poppins',
    pages: pages.slice(0, 6),
  }
}

export function extractNavFooter(html = '') {
  return {
    nav: html.match(/<nav[\s\S]*?<\/nav>/i)?.[0] || '',
    footer: html.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || '',
  }
}

const isCompleteHtml = (html) => typeof html === 'string' && /<\/html>\s*$/i.test(html.trim()) && /<\/body>/i.test(html)

// Accepts a proper file block, or (for weak models) raw HTML in the reply.
export function pickPageHtml(content, file) {
  const parsed = parseAIResponse(content)
  const writes = parsed.operations.filter((op) => op.type === 'write')
  const op = writes.find((o) => o.path === file) || writes.find((o) => /\.html$/.test(o.path))
  if (op && isCompleteHtml(op.content)) return op.content

  const text = String(content || '')
  const start = text.search(/<!doctype html|<html[\s>]/i)
  const end = text.toLowerCase().lastIndexOf('</html>')
  if (start !== -1 && end > start) {
    const html = text.slice(start, end + 7)
    if (isCompleteHtml(html)) return html
  }
  return null
}

export function buildStyleCss(plan) {
  return `:root {
  --accent: ${plan.accent};
  --accent-dark: ${plan.accentDark};
}
html { scroll-behavior: smooth; }
body { font-family: '${plan.font}', system-ui, -apple-system, sans-serif; }

@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes floatBlob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -40px) scale(1.12); } 66% { transform: translate(-25px, 25px) scale(.94); } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
@keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
@keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 60%, transparent); } 50% { box-shadow: 0 0 0 14px transparent; } }

/* Animated hero / banner background */
.hero-bg {
  position: relative; overflow: hidden; color: #fff;
  background: linear-gradient(120deg, var(--accent), var(--accent-dark), #0f172a, var(--accent));
  background-size: 300% 300%; animation: gradientShift 16s ease infinite;
}
.blob { position: absolute; border-radius: 9999px; filter: blur(48px); opacity: .35; background: #fff; animation: floatBlob 14s ease-in-out infinite; pointer-events: none; }
.blob-2 { background: var(--accent); opacity: .45; animation-duration: 18s; animation-delay: -5s; }
.blob-3 { background: #fbbf24; opacity: .25; animation-duration: 22s; animation-delay: -9s; }

/* Soft animated background for alternating sections */
.soft-bg {
  background: linear-gradient(120deg, color-mix(in srgb, var(--accent) 10%, #fff), #fff, color-mix(in srgb, var(--accent) 14%, #fff));
  background-size: 250% 250%; animation: gradientShift 20s ease infinite;
}

/* Entrance animations (hero text) */
.fade-up { opacity: 0; animation: fadeUp .8s ease forwards; }
.d1 { animation-delay: .1s; } .d2 { animation-delay: .3s; } .d3 { animation-delay: .5s; } .d4 { animation-delay: .7s; }
.float { animation: floatY 5s ease-in-out infinite; }
.btn-glow { animation: pulseGlow 2.6s ease-in-out infinite; }

/* Scroll animations */
.reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s ease, transform .7s ease; }
.reveal-left { opacity: 0; transform: translateX(-36px); transition: opacity .7s ease, transform .7s ease; }
.reveal-right { opacity: 0; transform: translateX(36px); transition: opacity .7s ease, transform .7s ease; }
.reveal.visible, .reveal-left.visible, .reveal-right.visible { opacity: 1; transform: none; }

.hover-lift { transition: transform .25s ease, box-shadow .25s ease; }
.hover-lift:hover { transform: translateY(-6px); box-shadow: 0 14px 28px rgba(0, 0, 0, .14); }

#site-nav { transition: box-shadow .3s ease; }
#site-nav.nav-scrolled { box-shadow: 0 6px 20px rgba(0, 0, 0, .12); }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .hero-bg, .soft-bg, .blob, .float, .btn-glow { animation: none; }
  .fade-up, .reveal, .reveal-left, .reveal-right { opacity: 1; transform: none; animation: none; transition: none; }
  .hover-lift, .hover-lift:hover { transition: none; transform: none; }
}
`
}

export const SCRIPT_JS = `(function () {
  var btn = document.getElementById('menu-btn');
  var menu = document.getElementById('mobile-menu');
  if (btn && menu) btn.addEventListener('click', function () { menu.classList.toggle('hidden'); });

  var nav = document.getElementById('site-nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('nav-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var items = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  function showAll() { items.forEach(function (el) { el.classList.add('visible'); }); }
  if (!('IntersectionObserver' in window)) { showAll(); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  items.forEach(function (el) { io.observe(el); });
  setTimeout(showAll, 4000);
})();
`

// fetch wrapper: retries when the AI engine is busy (503/429/504) or the network drops.
export function createApiCaller({ fetchImpl, wait = defaultWait, delays = [12000, 25000] } = {}) {
  const doFetch = fetchImpl || ((...args) => fetch(...args))
  return async function callApi(payload) {
    let lastError
    for (let attempt = 0; attempt <= delays.length; attempt += 1) {
      try {
        const response = await doFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const error = new Error(data.error || `Request failed (${response.status})`)
          error.retryable = [429, 502, 503, 504].includes(response.status)
          throw error
        }
        return await response.json()
      } catch (error) {
        lastError = error
        const retryable = error.retryable ?? error instanceof TypeError
        if (!retryable || attempt >= delays.length) throw error
        await wait(delays[attempt])
      }
    }
    throw lastError
  }
}

async function generatePage({ job, page, callApi, wait }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const data = await callApi({
      mode: 'page',
      message: job.message,
      spec: job.plan,
      page,
      nav: job.nav,
      footer: job.footer,
      retryNote: attempt > 0 ? 'Your previous answer was cut off or incomplete. Write a shorter page (under 120 lines) and finish with </html>.' : '',
    })
    const html = pickPageHtml(data.content, page.file)
    if (html) return html
    await wait(2500)
  }
  throw new Error(`${page.file} code could not be completed`)
}

/**
 * Runs plan -> style.css/script.js -> one request per page.
 * Never throws: returns { job, finished, written, error } so the UI can offer "continue".
 */
export async function runSitePipeline({ message, job, callApi, writeFile, onProgress = () => {}, wait = defaultWait, pause = 1500 }) {
  const written = []
  let current = job || null

  const report = (labels, statuses) => onProgress({ labels, statuses })

  try {
    if (!current) {
      report(['Planning website'], ['active'])
      const data = await callApi({ mode: 'plan', message })
      const plan = parsePlan(data.content)
      if (!plan) throw new Error('The AI could not plan the website. Please try again.')
      current = { message, plan, remaining: plan.pages.map((p) => p.file), nav: '', footer: '' }
      writeFile('style.css', buildStyleCss(plan)); written.push('style.css')
      writeFile('script.js', SCRIPT_JS); written.push('script.js')
    }

    const labels = ['Planning website', ...current.plan.pages.map((p) => `Writing ${p.file}`)]
    const statusFor = (activeFile) => [
      'done',
      ...current.plan.pages.map((p) => {
        if (p.file === activeFile) return 'active'
        return current.remaining.includes(p.file) ? 'pending' : 'done'
      }),
    ]

    for (const page of current.plan.pages) {
      if (!current.remaining.includes(page.file)) continue
      report(labels, statusFor(page.file))
      const html = await generatePage({ job: current, page, callApi, wait })
      writeFile(page.file, html); written.push(page.file)
      current.remaining = current.remaining.filter((f) => f !== page.file)
      if (!current.nav || page.file === 'index.html') {
        const { nav, footer } = extractNavFooter(html)
        current.nav = nav.slice(0, 4000)
        current.footer = footer.slice(0, 4000)
      }
      report(labels, statusFor(null))
      if (current.remaining.length) await wait(pause)
    }
    return { job: current, finished: true, written }
  } catch (error) {
    return { job: current, finished: false, written, error }
  }
}
