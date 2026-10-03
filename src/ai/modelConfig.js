/**
 * Central model configuration. Environment variables can override every chain.
 * Defaults prefer inexpensive/free-capable routes and then fail over across providers.
 */

const DEFAULT_SIMPLE_MODELS = [
  { provider: 'openrouter', model: 'openrouter/free' },
  { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
]

const DEFAULT_MEDIUM_MODELS = [
  { provider: 'openrouter', model: 'openrouter/free' },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
]

const DEFAULT_COMPLEX_MODELS = [
  { provider: 'openrouter', model: 'openrouter/free' },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
]

function parseEnvModels(envVar) {
  if (!envVar) return null
  try {
    const parsed = JSON.parse(envVar)
    if (Array.isArray(parsed)) return parsed.filter(isValidModelEntry)
  } catch {
    return envVar
      .split(',')
      .map((entry) => {
        const [provider, ...modelParts] = entry.trim().split(':')
        return { provider: provider?.trim(), model: modelParts.join(':').trim() }
      })
      .filter(isValidModelEntry)
  }
  return null
}

function isValidModelEntry(entry) {
  return Boolean(entry && typeof entry.provider === 'string' && typeof entry.model === 'string' && entry.provider && entry.model)
}

export const modelConfig = {
  simple: parseEnvModels(process.env.AI_SIMPLE_MODELS) || DEFAULT_SIMPLE_MODELS,
  medium: parseEnvModels(process.env.AI_MEDIUM_MODELS) || DEFAULT_MEDIUM_MODELS,
  complex: parseEnvModels(process.env.AI_COMPLEX_MODELS) || DEFAULT_COMPLEX_MODELS,
  retry: {
    maxRetries: Math.min(parseInt(process.env.AI_MAX_RETRIES || '2', 10), 3),
    baseDelayMs: parseInt(process.env.AI_BASE_DELAY_MS || '700', 10),
    maxDelayMs: parseInt(process.env.AI_MAX_DELAY_MS || '6000', 10),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '60000', 10),
  },
  circuitBreaker: {
    failureThreshold: parseInt(process.env.AI_CB_FAILURE_THRESHOLD || '3', 10),
    cooldownMs: parseInt(process.env.AI_CB_COOLDOWN_MS || '30000', 10),
  },
}

export function getAvailableProviders() {
  const providers = []
  if (process.env.OPENROUTER_API_KEY) providers.push('openrouter')
  if (process.env.GEMINI_API_KEY) providers.push('gemini')
  if (process.env.GROQ_API_KEY) providers.push('groq')
  if (process.env.OPENAI_API_KEY) providers.push('openai')
  return providers
}

export function getModelChain(tier) {
  const chain = modelConfig[tier] || modelConfig.medium
  const available = getAvailableProviders()
  if (available.length === 0) return []
  return chain.filter((entry) => available.includes(entry.provider))
}
