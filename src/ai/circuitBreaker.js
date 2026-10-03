/**
 * Small in-memory circuit breaker used by the server-side provider router.
 * It prevents repeatedly hammering a provider that is currently unhealthy.
 */
export class CircuitBreaker {
  constructor(failureThreshold = 3, cooldownMs = 30000) {
    this.failureThreshold = failureThreshold
    this.cooldownMs = cooldownMs
    this.failures = new Map()
  }

  isOpen(provider) {
    const state = this.failures.get(provider)
    if (!state?.openedAt) return false

    if (Date.now() - state.openedAt < this.cooldownMs) return true

    // Cooldown expired: allow one probe. A failed probe will reopen the circuit.
    state.openedAt = null
    state.count = Math.max(0, this.failureThreshold - 1)
    this.failures.set(provider, state)
    return false
  }

  recordFailure(provider) {
    const state = this.failures.get(provider) || { count: 0, openedAt: null }
    state.count += 1
    if (state.count >= this.failureThreshold) {
      state.openedAt = Date.now()
    }
    this.failures.set(provider, state)
  }

  recordSuccess(provider) {
    this.failures.delete(provider)
  }

  remainingCooldown(provider) {
    const state = this.failures.get(provider)
    if (!state?.openedAt) return 0
    return Math.max(0, this.cooldownMs - (Date.now() - state.openedAt))
  }

  reset(provider) {
    if (provider) this.failures.delete(provider)
    else this.failures.clear()
  }
}

export const globalCircuitBreaker = new CircuitBreaker()
