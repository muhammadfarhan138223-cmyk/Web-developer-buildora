# Reference transformation and production release — 2026-10-17

Production: https://buildora.farhanbalouch.com/
Deployment: https://buildora-updated-nb6w09li0-personaluser.vercel.app
Vercel deployment ID: dpl_8zH8VwMMa7jGCUtsnEz5asZqLbSq (READY).

## Implemented
- Separate navy/violet landing, shared responsive navigation/footer and matching login/signup/recovery. Existing email/social Supabase integration preserved.
- Template catalog: 7 free sources, category/search/availability filters, detail routes, isolated actual-source preview for static templates and source application to the workspace. 2 planned premium cards remain unavailable; no fake purchases.
- Private projects dashboard uses existing database ownership rules to open, rename, duplicate and delete projects. Signed-in browser successfully loaded an existing Supabase project without changing it.
- Workspace: desktop panel width controls, mobile Chat/Code/Preview views, Markdown chat/code copying, source reference attachments, regenerate/edit-selected/clear controls, open-file tabs, folder creation, font-size settings, tablet/fullscreen preview controls.
- File-wise AI planning/checkpoints/retry/fallback retained. No provider secrets included. Runtime keeps static previews isolated; generated code is never executed on the Buildora app server.
- Public pages and template details prerender with titles/descriptions/canonical/OG/Twitter, sitemap and creator Person/Organization links. Creator Farhan Balouch and https://farhanbalouch.com/ appear in structured data, About, landing and footer. No additional biography invented.
- Heavy editor code loads when the workspace opens; initial JS around 441 KB (129 KB gzip), editor chunk around 857 KB (288 KB gzip).
- Vercel Node catch-all backend supports config, catalog, integrations and export alongside direct chat route. Correct production routing and origin checks tested. Serverless mode forces Supabase; Node 24 and clean pnpm lockfile installation used.
- Recoverable page-load error screen handles stale lazy chunks after updates.

## Verification
- 37/37 Node tests passed, including persistent local authentication/owner isolation, actual full-stack starter API, template source validation/application, provider fallbacks, partial-file rejection/resume, Netlify and Vercel bridges.
- Local and Vercel production builds passed. First cloud npm installation crashed against old cache; clean pnpm frozen-lockfile installation succeeded.
- Production HTTP 200: landing, templates, cafe detail, projects, login, sitemap and /api/config. Config reports Supabase. /api/models with missing key returns HTTP 400 JSON rather than SPA HTML.
- Browser verified landing, templates search and actual static source preview, matching login, signed-in project loading and desktop editor/preview. Existing user workspace retained.
- Narrow-layout controls were visible during initial browser inspection. This session's subsequent explicit viewport override did not change the browser width, so a complete 390px interaction pass could not be confirmed. Mobile CSS and tab implementation are included; no claim of complete device QA.
- No real provider-key generation or completed social OAuth consent flow tested this release. Existing Supabase accounts/config were preserved. Supabase management connector denied read access this turn; no migration was needed or applied.
- GitHub branch creation returned 403 Resource not accessible by integration; no GitHub commit or PR created. Direct Vercel deployment succeeded using existing authorized CLI account.

## Remaining limits
Premium access/payment, token-by-token generation streaming, full AST import/export repair, terminal-driven agent execution and automated testing of arbitrary generated apps are not complete features. React/Node preview package compatibility and provider quota still apply. Static-template contact sections intentionally state that external contact services are not connected. End-to-end cloud project mutations were not tested against the user's data; local API ownership tests passed.

--- Historical verification ---

# Studio redesign — 2026-10-14

- Rebuilt builder presentation: landing-matched sage/cream palette, DM Sans/Manrope and editorial serif accents, preview-first workspace, explicit Files & code mode, responsive mobile stacking, light/dark toggle and brand variants.
- Original generated studio sculpture asset bundled in public/images/studio-sculpture.png. Displayed in the fresh-project welcome card with subtle CSS motion and reduced-motion support. No generated video is included.
- Added server-side generation skill instructions for visual direction, responsive interactions, real Node APIs, SEO and output budgets. They guide model generation; they do not guarantee design quality or correctness.
- Working fallback model is reused through the remainder of each build. Transient chat network errors can retry; publish operations do not automatically retry. Persistent checkpoint recovery has an explicit Resume build control; detailed errors remain available.
- 33/33 automated tests passed. Production client and public-page prerender builds passed.
- Browser checked at 1366x850 and 390x844. Light/dark themes rendered, mobile code/preview navigation worked; document scroll width equaled viewport width on mobile. Existing user's files/conversation retained.
- Updated local backend on http://127.0.0.1:3005/builder. Config and generated image return HTTP 200. Supersedes earlier port 3006 instructions for this session.
- Searchable public pages retain existing metadata/prerendering; private builder remains noindex. Generated projects receive SEO guidance but need their own deployment/domain configuration.
- Live AI generation using a real user key was not tested this turn. Provider daily quotas, availability and browser runtime constraints still apply. No cloud deployment or GitHub push performed.

--- Earlier verification history ---

# Latest verification — resilient generation (2026-10-13)

- Node test suite: 31/31 passed. Includes simulated 429 cooldown, incomplete responses, bounded retries, checkpoint resume without repeating completed files, invalid path rejection, cancellation, fragmented terminal escape filtering and stalled-process deadline.
- Production client and prerender build passed.
- Updated backend running at http://127.0.0.1:3006; workspace and static preview inspected in browser.
- Live generation with a real provider key has NOT been verified this turn. Tests mock provider responses; they do not prove the quality or successful compilation of arbitrary AI-generated apps.
- Browser Node runtime installation and generated full-stack app startup remain dependent on browser/WebContainer support, package registry connectivity and generated code. Installation now stops after 180 seconds; server startup after 60 seconds, with a useful error.
- Port 3005 is an older backend process that Windows denied permission to terminate. Use 3006 for this version. Browser project storage is separate per port. Existing 3005 projects remain there; source ZIP contains no user projects or keys.
- Supabase OAuth allowlist from earlier setup includes production Buildora and local port 3005, not new port 3006. Local 3006 is for guest builder testing; use configured production/3005 origin for OAuth until the allowlist is updated.
- No cloud deployment or GitHub push this turn. No claim that free-provider quotas can be bypassed.

## Generation behavior

Plan once, then generate one complete file per request (up to 32 files per plan), paced by at least six seconds between steps. Shared architecture and existing source context accompany each step. On truncation or incomplete output, retry concise output; on 429 honor the reported delay up to the bounded retry window. Each step has at most three attempts. The backend can try up to two eligible alternate models if automatic fallback is enabled; unpriced/paid alternatives require paid-fallback opt-in. Failed authentication is not retried. Successful primary requests no longer make unnecessary catalog requests.

Completed files are checkpointed in browser storage without connection credentials. Sending the exact same prompt against the unchanged workspace resumes them. Changes apply together only after review; partial files are never written to the project. Discard removes the checkpoint. Storage capacity and closing the tab can interrupt work; reconnect the key after refresh. Whole build has a 30-minute bound. Daily or account-wide exhaustion can still require waiting or using another available provider.

---

# Latest shared-auth and deployment verification

- Existing Nexus_ai restored; existing users/data preserved. Nexus source confirms same shared Supabase auth project.
- Live buildora_projects/buildora_conversations migration applied. Owner access and cross-owner denial verified in a rolled-back SQL transaction.
- Email, Google, GitHub and Facebook auth providers enabled. Health/settings HTTP 200; authorize responses 302 with matching client IDs. User login/consent still requires end-to-end testing.
- Supabase redirect URLs saved and visually verified for https://buildora.farhanbalouch.com plus Nexus current URLs and local port 3005. Existing Nexus Vercel redirect and default Site URL preserved.
- Netlify server function adapter, API rewrites, grouped dropdown, explicit Test & Save, minute model refresh and opt-in paid fallback included. 25 automated tests passed. Provider generation uses mocked responses in tests, not a real user key.
- Final domain configured for canonical metadata and sitemap. Source must still be deployed to Netlify with functions; this does not claim the public deployment is updated.
- Supabase advisor found leaked-password protection disabled in existing settings; remediation linked in SHARED-LOGIN.md.

## Earlier verification history

# Builder and model-selection upgrade — 13 October 2026

- Production build passes (1,706 modules). All 23 automated tests passed; catalog tests passed again after pagination changes.
- Browser checks passed: automatic debounced model discovery, default selection, free/paid filter, explicit save confirmation, no key in browser storage, cleared key after reload, mobile Settings layout, and React starter creation. Model responses were mocked; no real user key was used.
- React starter was built separately and rendered in Edge. Home/Work/Settings navigation, persisted appearance, responsive width and absence of uncaught browser errors passed. Screenshot inspected. This verifies the starter under local Vite preview, not WebContainer boot or arbitrary model output.
- Mobile builder overlapping panels fixed. React starter contains real CSS, reusable components, animation with reduced-motion support and local appearance settings. It does not pretend to provide auth/database features.
- Generation instructions now default new builds to React/Vite and require complete styles, interactions and real Node routes for full-stack requests. Exact model-generated design quality remains dependent on the selected model and prompt; no live generation was performed.
- Latest local UI preview for this upgrade: port 3003. Older 3002 process could not be stopped by this environment. For provider network access run START-BUILDORA.cmd yourself; this agent's preview may have restricted outbound networking.
- Model discovery uses provider catalogs, Gemini/Anthropic pagination, pricing where reported and filters known non-text model IDs. A listed model does not guarantee account access/quota; providers without price metadata show Pricing varies. Large catalogs are bounded to 20 pages.
- References: https://ai.google.dev/api/models and https://openrouter.ai/docs/api/api-reference/models/get-models

## Earlier verification and remaining deployment limits

# Verification — 12 October 2026

## Backend repair 2.1.1

- Twenty automated tests pass, including typed network/key/quota/model failures and truncated-output rejection.
- Real key-free connectivity checks reach Gemini (HTTP 403 authentication challenge) and OpenRouter (HTTP 200). No user key or generation was tested by these probes.
- The original restricted process returned EACCES. The permission-granted process reaches both providers. START-BUILDORA.cmd should be launched by the user outside the restricted agent environment for normal use.
- Settings now includes Check server connection; model list requests have a consistent timeout, and failed generation restores the prompt.
- Real browser → local backend → Gemini check passed on port 3002: connectivity success, followed by INVALID_API_KEY for a deliberately invalid test credential. No user secret was read or used. The older preview process on port 3000 could not be replaced in this environment.

## Passed

- Production Vite build: 1,705 modules plus prerendered public HTML for twelve public pages.
- Sixteen automated Node tests covering path/size validation, atomic changes, incomplete AI output, secret exclusion, static preview, rate/origin checks, model routing, paid-fallback blocking and the real HTTP notes starter.
- HTTP auth integration: signup, incorrect-password rejection, duplicate signup, HttpOnly/SameSite session, save/load/conversation persistence after database close/reopen, cross-account read/write/delete isolation, invalid files, origin rejection, password recovery rotation, revoked sessions and logout.
- HTTP SEO checks: founder/schema present without executing JavaScript, private-route noindex header, robots content type.
- Edge 155 browser QA: desktop/mobile landing, responsive navigation, login layout, signup, save, logout/login, saved project reopen, reload persistence, recovery and delete. Zero uncaught JavaScript errors in this flow.
- Earlier workspace QA: dark/light themes, create/edit/rename, search, reload persistence, ZIP import/export and mobile overflow checks.
- Desktop landing and login screenshots visually inspected; mobile landing captured and horizontal overflow assertion passed.

## Upgrade checks

- BYOK provider protocol tests use controlled responses for OpenAI-compatible, Anthropic and Gemini APIs; per-request keys never mutate server environment. Custom hosts reject unapproved endpoints.
- Guest BYOK generation is tested with a controlled model response. This is not a claim of a live provider call.
- Export API rejects guests and returns a valid ZIP for an authenticated session. GitHub publishing rejects guests; its commit protocol uses a mocked upstream to verify base-tree preservation and non-forced branch updates.
- Browser QA: model-loading and generated content use mocked upstream responses; real signup/save/export, guest project preservation after signup, API key absence from storage, key clear on refresh, theme/logo persistence, mobile overflow and all public routes pass. No page errors.
- 18 SVG logos and one locally stored generated editorial photograph included. Desktop, midnight and mobile screenshots captured.

## Limits

- Browser runtime now has cross-origin isolation in Edge 155, but WebContainer boot did not finish during the 45-second check. A bounded timeout and actionable error replace indefinite booting. Full browser Node execution is not claimed as verified. The real notes API passed independently under local Node.
- No live AI request was made: no provider key or local model was supplied. Free-only route behavior was tested without spending money. Provider availability/quotas are external.
- No domain or Supabase project was supplied. Domainless builds intentionally prevent indexing and omit invented canonical URLs. Live Supabase auth, deployed policies, email redirects and cloud hosting were not verified.
- Local accounts use persistent server SQLite, not email verification. Recovery codes are required for forgotten passwords. Backup and account deletion operations are managed by the server operator.
- Public security/load/dependency audits, distributed rate limits, billing, teams, remote containers and generated-app deployment are not completed. This is not a claim of full Bolt/Replit parity.
- ZIP excludes credentials, user databases, QA accounts, node_modules and generated bundles. Install dependencies and build after extraction.
