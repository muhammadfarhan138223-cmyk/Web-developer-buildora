/**
 * Retry helper with exponential backoff and jitter.
 *
 * Used by the model router before failing over to the next provider.
 */

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Compute exponential backoff delay with optional jitter.
 */
export function computeBackoff(attempt, baseDelayMs, maxDelayMs) {
  const exp = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
  const jitter = Math.random() * 0.3 * exp
  return Math.min(exp + jitter, maxDelayMs)
}

/**
 * Retry a function with exponential backoff.
 *
 * @param {function} fn - async function to retry
 * @param {object} opts - { maxRetries, baseDelayMs, maxDelayMs, shouldRetry }
 * @returns {Promise<*>} result of fn
 */
export async function retryWithBackoff(fn, opts = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = () => true,
  } = opts

  let lastError
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err
      if (attempt >= maxRetries || !shouldRetry(err)) {
        throw err
      }
      const delay = computeBackoff(attempt, baseDelayMs, maxDelayMs)
      await sleep(delay)
    }
  }
  throw lastError
}
