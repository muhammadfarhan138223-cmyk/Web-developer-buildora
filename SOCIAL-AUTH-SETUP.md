# Enable real social login

Current status: local email/password works; Google, GitHub and Facebook OAuth are not activated because no Supabase project or provider apps were supplied.

## Buildora itself

1. Create a Supabase project. Apply the included database migrations in order; verify owner RLS and authenticated table grants.
2. Set AUTH_PROVIDER=supabase, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on the Buildora server. Never use a secret or service-role key for the public key.
3. In Supabase Authentication URL configuration set the real Site URL and allow your site origin with /builder, /login and /reset-password redirects. Local development origins can be added separately.
4. In Google Cloud, GitHub developer settings and Meta developer settings create the corresponding OAuth applications. Copy the callback URL shown by the Supabase provider setup into each application. Put the issued client ID/secret into that provider's Supabase configuration, not into browser code or chat.
5. Enable each provider in Supabase. Complete provider-required consent, domain verification, privacy URLs and app review before offering it publicly.
6. Restart Buildora and test each provider in a signed-out browser. Local SQLite accounts are separate from Supabase users; there is no automatic account migration.

Official guides: [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [GitHub](https://supabase.com/docs/guides/auth/social-login/auth-github), [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

## Apps generated in Buildora

Connections → Supabase app starter accepts the generated app's own project URL and public key. It creates source, schema.sql and a README. Apply the schema, enable providers and allow the generated app's origin separately. A browser preview URL may change. Never reuse a private service key or claim that social login is active before testing those credentials.

## Going public

Use HTTPS and an actual domain. Publish operator contact details and review the included factual policy pages for your deployment. Hosting, account verification emails, backups, provider costs and operational security remain the operator's responsibility.
