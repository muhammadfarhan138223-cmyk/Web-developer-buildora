import { buildMessages, buildPlanMessages, buildPageMessages } from '../src/ai/contextManager.js'
import { routeRequest } from '../src/ai/router.js'
import { classifyError, ErrorType } from '../src/ai/errorClassifier.js'

const rateBuckets = globalThis.__nexusRateBuckets || new Map()
globalThis.__nexusRateBuckets = rateBuckets
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 12

function getClientKey(req) {
  const forwarded = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown'
  return String(forwarded).split(',')[0].trim() || 'unknown'
}

function isRateLimited(req) {
  const key = getClientKey(req)
  const now = Date.now()
  const bucket = rateBuckets.get(key) || { startedAt: now, count: 0 }
  if (now - bucket.startedAt >= RATE_WINDOW_MS) {
    bucket.startedAt = now
    bucket.count = 0
  }
  bucket.count += 1
  rateBuckets.set(key, bucket)
  return bucket.count > RATE_LIMIT
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Please slow down for a moment. NexusAI will automatically be ready again shortly.', code: 'RATE_LIMITED' })
  }

  try {
    const body = req.body || {}
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!message) {
      return res.status(400).json({ error: 'Tell NexusAI what you want to build or change.' })
    }
    if (message.length > 20000) {
      return res.status(413).json({ error: 'That request is too large. Please split it into smaller steps.', code: 'MESSAGE_TOO_LARGE' })
    }

    const mode = body.mode
    let messages
    let maxTokens = 8000
    let temperature = 0.35
    let taskTier

    if (mode === 'plan') {
      messages = buildPlanMessages(message)
      maxTokens = 1500
      temperature = 0.3
      taskTier = 'medium'
    } else if (mode === 'page') {
      const file = String(body.page?.file || '')
      if (!/^[a-z0-9-]+\.html$/.test(file) || !Array.isArray(body.spec?.pages) || body.spec.pages.length > 8) {
        return res.status(400).json({ error: 'Invalid page request.', code: 'AI_BAD_REQUEST' })
      }
      messages = buildPageMessages({
        message,
        spec: body.spec,
        page: body.page,
        nav: typeof body.nav === 'string' ? body.nav : '',
        footer: typeof body.footer === 'string' ? body.footer : '',
        retryNote: typeof body.retryNote === 'string' ? body.retryNote.slice(0, 300) : '',
      })
      maxTokens = 6000
      taskTier = 'medium'
    } else {
      const projectContext = body.projectContext || {}
      const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : []
      messages = buildMessages(message, projectContext, conversationHistory)
    }

    const result = await routeRequest({
      messages,
      temperature,
      maxTokens,
      timeoutMs: 60000,
      ...(taskTier ? { taskTier } : {}),
    })

    return res.status(200).json({
      content: result.content,
      usage: result.usage || null,
      provider: result.provider,
      model: result.model,
      tier: result.tier,
      fallbackIndex: result.fallbackIndex,
    })
  } catch (error) {
    const type = classifyError(error)
    const configurationError = Boolean(error.__configurationError)

    if (configurationError) {
      return res.status(503).json({
        error: 'NexusAI needs an AI provider key on the server before it can generate code.',
        code: 'AI_PROVIDER_NOT_CONFIGURED',
      })
    }

    if (error.__allProvidersFailed) {
      return res.status(503).json({
        error: 'The AI engine is switching between available providers, but none is ready right now. Please try again shortly.',
        code: 'AI_PROVIDERS_EXHAUSTED',
        type,
      })
    }

    if (type === ErrorType.BAD_REQUEST) {
      return res.status(400).json({ error: 'The AI provider rejected this request. Try a shorter or simpler instruction.', code: 'AI_BAD_REQUEST' })
    }

    return res.status(500).json({
      error: 'Something unexpected happened while generating the project. Please try again.',
      code: 'AI_UNKNOWN_ERROR',
    })
  }
}
