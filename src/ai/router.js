import { classifyTask } from './taskClassifier.js'
import { getModelChain, modelConfig } from './modelConfig.js'
import { sendToProvider } from './providers.js'
import { classifyError, isRecoverable, tagError, ErrorType } from './errorClassifier.js'
import { sleep, computeBackoff, retryWithBackoff } from './retry.js'
import { CircuitBreaker } from './circuitBreaker.js'

const breaker = new CircuitBreaker(
  modelConfig.circuitBreaker.failureThreshold,
  modelConfig.circuitBreaker.cooldownMs,
)

function remainingMs(request) {
  return request.deadline ? request.deadline - Date.now() : Infinity
}

async function attemptProvider(provider, model, request) {
  return retryWithBackoff(
    async () => {
      const budget = remainingMs(request) - 1500
      const timeoutMs = Math.max(4000, Math.min(request.timeoutMs || modelConfig.retry.timeoutMs, budget))
      const result = await sendToProvider(provider, {
        ...request,
        model,
        timeoutMs,
      })
      breaker.recordSuccess(provider)
      return { ...result, provider, model }
    },
    {
      maxRetries: modelConfig.retry.maxRetries,
      baseDelayMs: modelConfig.retry.baseDelayMs,
      maxDelayMs: modelConfig.retry.maxDelayMs,
      shouldRetry: (err) => {
        // A timeout means this provider is slow: fail over to the next one instead of waiting again.
        if (remainingMs(request) < 20000) return false
        const type = classifyError(err)
        return type === ErrorType.RATE_LIMIT || type === ErrorType.OVERLOADED || type === ErrorType.SERVER_ERROR
      },
    },
  )
}

export async function routeRequest(request) {
  const messages = request.messages || []
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const tier = request.taskTier || classifyTask(lastUser?.content || '')
  const chain = getModelChain(tier)

  if (chain.length === 0) {
    throw Object.assign(new Error('No AI provider is configured. Add at least one provider API key on the server.'), {
      __errorType: ErrorType.AUTH_ERROR,
      __configurationError: true,
    })
  }

  const errors = []

  for (let index = 0; index < chain.length; index += 1) {
    const { provider, model } = chain[index]

    if (remainingMs(request) < 5000) {
      errors.push(tagError(new Error('Time budget used up'), ErrorType.TIMEOUT))
      break
    }

    if (breaker.isOpen(provider)) {
      errors.push(tagError(new Error(`Provider temporarily cooling down: ${provider}`), ErrorType.OVERLOADED))
      continue
    }

    try {
      const result = await attemptProvider(provider, model, request)
      return { ...result, tier, fallbackIndex: index }
    } catch (error) {
      const type = classifyError(error)
      const tagged = tagError(error, type)
      errors.push(tagged)
      breaker.recordFailure(provider)

      // Provider-specific auth/model errors should not block other providers.
      if (!isRecoverable(type)) throw tagged
      if (index < chain.length - 1) await sleep(computeBackoff(0, 250, 1500))
    }
  }

  const last = errors.at(-1)
  throw Object.assign(new Error('All configured AI providers are temporarily unavailable.'), {
    __errorType: last?.__errorType || ErrorType.UNKNOWN,
    __allProvidersFailed: true,
    __innerErrors: errors,
  })
}

export { breaker as circuitBreaker }
