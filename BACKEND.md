# Buildora backend 2.1.1

Run on Node 24+ with persistent storage. The server serves the frontend and real APIs on the same origin.

## Available services

- Accounts: signup, login, session, logout, recovery code rotation; scrypt password hashing, hashed seven-day session tokens, HttpOnly cookies.
- Storage: persistent SQLite users/projects/conversations with owner checks; project list, save, load, delete and authenticated ZIP export.
- AI: guest bring-your-own-key generation; native Gemini/Anthropic and OpenAI-compatible adapters; server-default free routes or Ollama; selected-model support and output-limit rejection.
- Diagnostics: key-free provider connection check, authenticated model-list check, distinct network/key/permission/quota/model errors. No raw provider messages or secret keys are logged.
- Integrations: explicit GitHub commits using a user-supplied token, Supabase starter source and VS Code handoff.
- Protection: same-origin checks, bounded payloads/files, per-process rate limits, path validation and account-gated exports/publishing.

## The screenshot error

The observed local environment returned EACCES before internet permission was granted. After permission, a key-free request reached Google's models endpoint and returned HTTP 403, the expected authentication challenge for that request. This verifies network access, not the user's key or generation.

A server launched by a restricted coding environment may inherit its restrictions. For normal use, extract the ZIP and launch START-BUILDORA.cmd yourself, or run npm start from your own terminal after npm install and npm run build. Keep the terminal open. Do not change the API key to fix a NETWORK_BLOCKED error.

Use npm run doctor for a key-free connectivity check. In Settings, use Check server connection first, then paste your key and choose Test & load models. Select an exact returned model rather than guessing a model name. Keys remain in tab memory and must be reentered after refresh.

## Deployment

Local mode requires a persistent Node server and persistent BUILDORA_DATA_DIR. Enable HTTPS and COOKIE_SECURE=true, configure HOST/PORT, and back up the database. Static-only hosting cannot run these APIs. Social OAuth needs owner-supplied Supabase/provider configuration. Browser Node preview is an external WebContainer runtime and is not a hosted deployment service.

No real key or model call was available for live generation verification in this repair. Unit tests use controlled provider responses; the connectivity probe uses the real public endpoint without credentials. This is not a complete remote-container platform or a security audit.
