# Workability repair — November 9, 2026

## Actual failures repaired
- Retired Supabase URL failed DNS. With owner approval, Buildora now uses the active shared MovieHub project pahpvndzfdngxpfdvrqy. MovieHub's Site URL, existing data, tables and redirect URLs were preserved. The owner added three explicit Buildora return URLs. Old accounts from the retired project are not migrated.
- Separate buildora_projects/buildora_conversations tables were created with owner RLS, authenticated grants and no anonymous access. Existing unrelated tables were not altered. Logout revokes only the local session.
- API keys previously lived only in tab memory. Save settings now encrypts the provider key in IndexedDB using AES-GCM and a non-exportable browser CryptoKey, with the owner ID as additional authenticated data. Refresh restores it for that signed-in account. This is device storage, not cross-device synchronization or protection against malicious same-origin scripts/extensions. Clearing the key deletes its saved record.
- AI requests and provider-model tests require actual server-validated login. Guests retain editor/preview. An invalid old session no longer disables the sign-in form. Email/password is the supported login flow; unverified OAuth buttons were removed.
- JavaScript detector now recognizes console, alert, timers and browser globals. JavaScript containing HTML strings is no longer mistaken for JSX solely because it contains markup. Ordinary non-module HTML/CSS/JS can preview without downloading the WASM compiler.
- console.log/info/warn/error and alert messages appear in Output. Classic script functions used by HTML onclick handlers are exposed in the iframe, rather than lost inside a bundler closure. Unsupported browser APIs, backend calls and packages still report errors; sandbox isolation was not weakened.
- Profile uses P. Guide, privacy, feature and pricing text now describe the actual frontend-only flow. Unavailable Pro pricing card was hidden. Work metadata targets Code into Preview; its sitemap priority is 1.0, with no claim that Google honors priority as a ranking signal.

## Verification and limits
The full suite passed 61/61 tests, including encryption save/restore/account isolation, JS console/alerts, classic onclick, HTML/CSS/JS/React/TS/TSX/Vue compilation, account-required API gates, owner isolation, and Vercel/Netlify adapters. The final cloud deployment runs the production/SSR build.

Public Supabase settings returned HTTP 200 with email login enabled. Owner RLS policies were inspected. Browser control timed out, so a real email-confirmation/password-login and visual click-through of every button was not performed. Live provider generation with a real key was not tested. These must not be described as verified.

Security advisor found no missing-policy finding for the new Buildora tables. It reported pre-existing missing-policy notices on unrelated tables (left untouched) and disabled leaked-password checks: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

After deploying: refresh the site, sign up/confirm email or sign in with an account from the active project, save a provider key, then refresh Settings to check restoration. Preview remains usable without account setup.
