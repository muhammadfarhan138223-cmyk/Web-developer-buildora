import {buildStepMessages} from '../server/build-step.js';
import {conversationMessages} from '../server/conversation.js';
import { buildMessages, buildPlanMessages, buildPageMessages } from '../src/ai/contextManager.js'
import { routeRequest } from '../src/ai/router.js'
import { classifyError, ErrorType } from '../src/ai/errorClassifier.js'
import { authorize, enforceLimit, validateBody } from '../server/access.js'
import { generateWithRouting, generateWithKey } from '../server/byok.js'

export default async function handler(req, res) {
  const origin = req.headers?.origin
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Cross-origin API requests are not allowed.' }) }
    catch { return res.status(403).json({ error: 'Invalid origin.' }) }
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!String(req.headers?.['content-type'] || '').includes('application/json')) return res.status(415).json({ error: 'Use application/json.' })

  try { validateBody(req.body || {}) } catch (e) { return res.status(400).json({ error: e.message }) }
  let userId
  try { userId = await authorize(req,true) } catch (e) {
    return res.status(e.status || 503).json({ error: e.status===401 ? 'Sign in to use AI. The frontend editor and preview do not require an account.' : e.status ? e.message : 'Authentication service unavailable.' });
  }
  if (!enforceLimit(userId)) {
    return res.status(429).json({ error: 'Please slow down for a moment. Buildora will automatically be ready again shortly.', code: 'RATE_LIMITED' })
  }

  try {
    const body = req.body || {}
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!message) {
      return res.status(400).json({ error: 'Tell Buildora what you want to build or change.' })
    }
    if (message.length > 20000) {
      return res.status(413).json({ error: 'That request is too large. Please split it into smaller steps.', code: 'MESSAGE_TOO_LARGE' })
    }

    const mode = body.mode
    let messages
    let maxTokens = 8000
    let temperature = 0.35
    let taskTier

    if (mode === 'conversation') {
      messages=conversationMessages(body);maxTokens=8000;
    } else if (mode === 'build-plan' || mode === 'build-file') {
      messages=buildStepMessages(body);maxTokens=mode==='build-plan'?4000:6000;
    } else if (mode === 'plan') {
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

    const result = body.connection ? mode==='conversation' ? await generateWithKey({...body.connection,allowPartial:true},messages,maxTokens) : await generateWithRouting(body.connection,messages,maxTokens) : await routeRequest({
      messages,
      temperature,
      maxTokens,
      timeoutMs: 60000,
      deadline: Date.now() + 240000,
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
    if(req.body?.connection && error.status) return res.status(error.status).json({error:error.message,code:error.code,retryAfterMs:error.retryAfterMs});
    const type = classifyError(error)
    const configurationError = Boolean(error.__configurationError)

    if (configurationError) {
      return res.status(503).json({
        error: 'AI is not configured. Add your OpenRouter key for free models, or connect an installed Ollama model. See the Setup guide. Your editor and saved projects still work.',
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
