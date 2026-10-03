import { buildMessages } from '../src/ai/contextManager.js'
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

    const projectContext = body.projectContext || {}
    const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : []
    const messages = buildMessages(message, projectContext, conversationHistory)
    const result = await routeRequest({
      messages,
      temperature: 0.35,
      maxTokens: 12000,
      timeoutMs: 60000,
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
