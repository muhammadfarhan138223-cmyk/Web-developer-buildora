const DEFAULT_TIMEOUT = 60000

function abortError() {
  return Object.assign(new Error('Request timed out'), { status: 0, name: 'AbortError' })
}

function assertContent(content, provider) {
  if (!content) {
    throw Object.assign(new Error(`${provider} returned an empty response`), { status: 502 })
  }
  return content
}

async function fetchJson(url, options, provider, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const body = await response.text()
    let data = null
    try {
      data = body ? JSON.parse(body) : null
    } catch {
      data = null
    }

    if (!response.ok) {
      const message = data?.error?.message || data?.error || body || `${provider} request failed`
      throw Object.assign(new Error(`${provider} ${response.status}: ${message}`), { status: response.status })
    }

    return data || {}
  } catch (error) {
    if (error?.name === 'AbortError') throw abortError()
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function sendOpenRouter({ messages, model, temperature = 0.7, maxTokens, timeoutMs = DEFAULT_TIMEOUT }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw Object.assign(new Error('No OPENROUTER_API_KEY'), { status: 401 })

  const data = await fetchJson(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://nexusai.builder',
        'X-Title': 'NexusAI Builder',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
    },
    'OpenRouter',
    timeoutMs,
  )

  return {
    content: assertContent(data.choices?.[0]?.message?.content || '', 'OpenRouter'),
    usage: data.usage || null,
  }
}

function toGeminiContents(messages) {
  const contents = []
  const systemParts = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push({ text: msg.content })
      continue
    }
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })
  }

  return {
    contents,
    systemInstruction: systemParts.length ? { parts: systemParts } : null,
  }
}

export async function sendGemini({ messages, model, temperature = 0.7, maxTokens, timeoutMs = DEFAULT_TIMEOUT }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw Object.assign(new Error('No GEMINI_API_KEY'), { status: 401 })

  const { contents, systemInstruction } = toGeminiContents(messages)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const data = await fetchJson(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(systemInstruction ? { systemInstruction } : {}),
        generationConfig: {
          temperature,
          ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
        },
      }),
    },
    'Gemini',
    timeoutMs,
  )

  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  return {
    content: assertContent(content, 'Gemini'),
    usage: data.usageMetadata || null,
  }
}

export async function sendGroq({ messages, model, temperature = 0.7, maxTokens, timeoutMs = DEFAULT_TIMEOUT }) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw Object.assign(new Error('No GROQ_API_KEY'), { status: 401 })

  const data = await fetchJson(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
    },
    'Groq',
    timeoutMs,
  )

  return {
    content: assertContent(data.choices?.[0]?.message?.content || '', 'Groq'),
    usage: data.usage || null,
  }
}

export async function sendOpenAI({ messages, model, temperature = 0.7, maxTokens, timeoutMs = DEFAULT_TIMEOUT }) {
  const apiKey = process.env.OPENAI_API_KEY
  const baseURL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  if (!apiKey) throw Object.assign(new Error('No OPENAI_API_KEY'), { status: 401 })

  const data = await fetchJson(
    `${baseURL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
    },
    'OpenAI',
    timeoutMs,
  )

  return {
    content: assertContent(data.choices?.[0]?.message?.content || '', 'OpenAI'),
    usage: data.usage || null,
  }
}

const providers = { openrouter: sendOpenRouter, gemini: sendGemini, groq: sendGroq, openai: sendOpenAI }

export async function sendToProvider(provider, request) {
  const fn = providers[provider]
  if (!fn) throw Object.assign(new Error(`Unknown provider: ${provider}`), { status: 400 })
  return fn(request)
}
