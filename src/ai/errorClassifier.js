export const ErrorType = {
  RATE_LIMIT: 'rate_limit',
  QUOTA_EXCEEDED: 'quota_exceeded',
  INSUFFICIENT_CREDITS: 'insufficient_credits',
  TIMEOUT: 'timeout',
  OVERLOADED: 'overloaded',
  MODEL_UNAVAILABLE: 'model_unavailable',
  NETWORK_ERROR: 'network_error',
  SERVER_ERROR: 'server_error',
  AUTH_ERROR: 'auth_error',
  BAD_REQUEST: 'bad_request',
  UNKNOWN: 'unknown',
}

const RECOVERABLE_TYPES = new Set([
  ErrorType.RATE_LIMIT,
  ErrorType.QUOTA_EXCEEDED,
  ErrorType.INSUFFICIENT_CREDITS,
  ErrorType.TIMEOUT,
  ErrorType.OVERLOADED,
  ErrorType.MODEL_UNAVAILABLE,
  ErrorType.NETWORK_ERROR,
  ErrorType.SERVER_ERROR,
  // One provider can be misconfigured while another is healthy.
  ErrorType.AUTH_ERROR,
])

export function isRecoverable(errorType) {
  return RECOVERABLE_TYPES.has(errorType)
}

export function classifyError(err) {
  if (!err) return ErrorType.UNKNOWN
  if (err.__errorType) return err.__errorType

  const message = String(err.message || '').toLowerCase()
  const status = Number(err.status || err.statusCode || 0)

  if (err.name === 'AbortError' || message.includes('timeout') || message.includes('timed out')) {
    return ErrorType.TIMEOUT
  }
  if (message.includes('network') || message.includes('fetch failed') || message.includes('econnreset') || message.includes('enetunreach')) {
    return ErrorType.NETWORK_ERROR
  }

  if (status === 401 || status === 403) return ErrorType.AUTH_ERROR
  if (status === 402) return ErrorType.INSUFFICIENT_CREDITS
  if (status === 429) {
    return message.includes('quota') || message.includes('credits') || message.includes('billing')
      ? ErrorType.QUOTA_EXCEEDED
      : ErrorType.RATE_LIMIT
  }

  // Providers often use 400/404 for an unavailable or deprecated model.
  if (
    status === 404 ||
    message.includes('model_not_found') ||
    message.includes('model not found') ||
    message.includes('does not exist') ||
    message.includes('unknown model') ||
    message.includes('invalid model') ||
    message.includes('unsupported model')
  ) {
    return ErrorType.MODEL_UNAVAILABLE
  }

  if (status >= 500 || message.includes('overloaded') || message.includes('capacity') || message.includes('server error')) {
    return message.includes('overloaded') || message.includes('capacity')
      ? ErrorType.OVERLOADED
      : ErrorType.SERVER_ERROR
  }

  if (message.includes('rate limit') || message.includes('rate_limit') || message.includes('too many requests')) {
    return ErrorType.RATE_LIMIT
  }
  if (message.includes('quota') || message.includes('credits') || message.includes('billing')) {
    return ErrorType.QUOTA_EXCEEDED
  }

  if (status === 400 || message.includes('invalid_request') || message.includes('bad request')) {
    return ErrorType.BAD_REQUEST
  }

  return ErrorType.UNKNOWN
}

export function tagError(err, errorType) {
  const tagged = err instanceof Error ? err : new Error(String(err))
  tagged.__errorType = errorType
  return tagged
}
