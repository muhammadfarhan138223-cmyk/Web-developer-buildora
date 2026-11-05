# Buildora

An editable AI-assisted website workspace, founded by **Farhan Balouch**.

## Start

For backend connection troubleshooting, run `npm run doctor` and read **BACKEND.md**. Version 2.1.1 distinguishes blocked networking, DNS/TLS failures, invalid keys, quota limits and missing models. In Settings, use **Check server connection**, then **Test & load models**.

Install Node.js **24 or newer**, then run from this folder:

```sh
npm install
npm run build
npm start
```

Open http://127.0.0.1:3000. Keep the server terminal open. For development, use `npm run dev` and open the printed address (normally port 5173). For the exact tested dependency versions use pnpm 11 and `pnpm install --frozen-lockfile` instead of npm install.

Local signup, login, recovery codes and saved projects work without Supabase or any API key. Data lives in `.buildora/buildora.sqlite`; preserve this folder when updating. Back up the SQLite database with the server stopped. Never publish database files.

AI generation needs your own OpenRouter free-model key or installed Ollama model. Copy `.env.example` to `.env`, configure one option and restart. Free-only routing is enabled by default; there is no paid provider fallback unless you explicitly disable it. No credentials or local model are bundled.

## New in this release

Open **Settings** to choose a provider, paste your own API key, test it and select a model. API keys and GitHub tokens stay in tab memory, clear on refresh/sign-out, and are not stored in the database. Own-key requests use your provider account pricing. Guest creation is enabled with your own key; save/export and GitHub publishing require an account.

Four website themes, 18 SVG logo variants, AI-generated editorial artwork, DM Sans/Manrope fonts, reduced-motion-aware animation, policy pages and a brand kit are included. Connections contains explicit GitHub commits, VS Code links and a real Supabase auth/notes starter.

Social login code is integrated but Google/GitHub/Facebook credentials have not been configured by the owner. See SOCIAL-AUTH-SETUP.md. These buttons do not simulate successful login.

## Included

- Responsive landing page, header/footer, founder section and FAQs.
- Prerendered public pages, metadata, Organization/Person structured data and domain-aware sitemap/robots.
- Split chat, explorer, CodeMirror editor, themes, static preview and browser Node runtime integration.
- ZIP import/export, reviewed AI changes, one-step undo and a Node notes starter.
- Persistent SQLite auth with scrypt passwords, hashed sessions, HttpOnly cookies, recovery codes and owner-scoped saved projects.
- Optional Supabase adapter; never put a service-role key in the public configuration.

Run `npm run build` then `npm test`. See **SETUP-ROMAN-URDU.md** for simple instructions, **AUDIT.md** for file structure and changes, **FULL-CODE.md** for complete copy/paste source, and **VERIFICATION.md** for what was and was not tested.

This is a working local foundation, not complete Bolt/Replit infrastructure. Live AI, cloud deployment and WebContainer execution need their external configuration and verification. Local accounts require persistent Node hosting; they do not run on a static host or ephemeral serverless filesystem.
