/**
 * Task classifier — determines which model tier a request needs.
 *
 * Simple  → fast/free models (rename, small CSS, formatting)
 * Medium → stronger coding models (create page, multi-component, API integration)
 * Complex → strongest models (architecture, large refactor, backend/database)
 */

const SIMPLE_KEYWORDS = [
  'rename', 'rename a', 'change text', 'change the text', 'change color',
  'change the color', 'small css', 'fix typo', 'fix a typo', 'format',
  'formatting', 'align', 'center', 'padding', 'margin', 'font size',
  'change font', 'background color', 'rename button', 'update label',
  'small fix', 'tiny change', 'quick fix', 'change title', 'update title',
]

const COMPLEX_KEYWORDS = [
  'architecture', 'refactor', 'redesign', 'restructure', 'database schema',
  'migration', 'rls', 'row level security', 'auth', 'authentication',
  'backend', 'api route', 'endpoint', 'supabase', 'edge function',
  'multi-file', 'full page', 'entire page', 'complete page',
  'state management', 'complex form', 'dashboard', 'admin panel',
  'e-commerce', 'checkout', 'payment', 'stripe', 'subscription',
  'realtime', 'webhook', 'crdt', 'multi-tenant',
]

const MEDIUM_KEYWORDS = [
  'create page', 'create a page', 'add page', 'new page', 'add a page',
  'create component', 'add component', 'new component',
  'responsive', 'mobile', 'tablet', 'media query',
  'api integration', 'fetch data', 'display data',
  'form', 'validation', 'submit',
  'modal', 'drawer', 'sidebar', 'navbar', 'footer',
  'animation', 'transition', 'hover',
  'table', 'list', 'grid', 'card',
  'navigation', 'route', 'router',
]

function keywordMatch(text, keywords) {
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

/**
 * Classify a task string into 'simple', 'medium', or 'complex'.
 */
export function classifyTask(text) {
  if (!text || typeof text !== 'string') return 'medium'

  const wordCount = text.trim().split(/\s+/).length

  // Very short requests with simple keywords → simple
  if (wordCount <= 25 && keywordMatch(text, SIMPLE_KEYWORDS)) {
    return 'simple'
  }

  // Complex keywords always escalate
  if (keywordMatch(text, COMPLEX_KEYWORDS)) {
    return 'complex'
  }

  // Medium keywords
  if (keywordMatch(text, MEDIUM_KEYWORDS)) {
    return 'medium'
  }

  // Long detailed requests tend to be more complex
  if (wordCount > 80) {
    return 'complex'
  }

  if (wordCount > 30) {
    return 'medium'
  }

  return 'simple'
}
