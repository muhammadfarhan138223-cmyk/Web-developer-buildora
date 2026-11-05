# Shared Nexus AI + Buildora accounts

Both sites use Nexus_ai (xweusvbeppjsmfszpmfn) and its existing auth.users. No existing user or Nexus data was deleted. Nexus GitHub source already uses this same URL and public key.

Buildora tables: public.buildora_projects and public.buildora_conversations. RLS restricts rows to owners and rejects a conversation linked to another user's project. A real transaction test verified these restrictions and rolled back its test users/data.

Google, GitHub and Facebook are already enabled. Live authorize redirects returned 302 and their public client IDs match the supplied screenshots. Provider secrets belong only in Supabase/provider dashboards. Rotate the exposed screenshots' secrets in those dashboards; never commit them to either website.

A shared account means the same email/password works at both login pages. Sessions in different browser origins remain separate. Automatic cross-site SSO has not been implemented. Existing Nexus code was inspected, not overwritten.

Email confirmation remains enabled. Login completion requires a real user and its confirmation/OAuth consent; no real user's password was requested or tested.

Supabase security advisor reports leaked-password protection disabled. Review https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . No auth-security setting was weakened.

Saved and verified Supabase redirect allowlist: Nexus current /app and /login, Buildora final domain /builder, /login and /reset-password, plus those three routes on http://127.0.0.1:3005 . Existing Nexus Vercel /app remains. The project-wide default Site URL was preserved to avoid changing Nexus signup email behavior.
