# Deploy the full Buildora backend on Netlify

The old deployment served HTML for /api/models. Uploading only dist does not deploy server functions.

1. Extract the source ZIP. Keep netlify.toml and netlify/functions/api.mjs in the project root structure.
2. Deploy from a Git repository with Netlify builds enabled, or use Netlify CLI from this source folder: npx netlify-cli deploy --build --prod. Sign in to your own Netlify account and choose the existing Buildora site.
3. Build command: npm run build. Publish directory: dist. Functions directory: netlify/functions. Node: 24.
4. AUTH_PROVIDER=supabase is used on Netlify. Public connection defaults point to the existing Nexus_ai project; no service-role or OAuth client secret is included. Override SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY only if intentionally changing projects.
5. Verify /api/health returns JSON, then test a provider key in Settings. An HTML response means functions were not deployed.
6. API keys are entered by each user in Settings. No shared free secret keys are included. Providers control quotas and pricing.

This ZIP prepares deployment; it does not update the currently published Netlify site automatically. Node runtime hosting, long AI generations and provider quotas remain subject to platform limits. Generated React projects need the browser runtime or local npm install / npm run dev.

Final production domain: https://buildora.farhanbalouch.com . Attach this custom domain to the same Netlify site and verify its DNS/HTTPS. Supabase allows /builder, /login and /reset-password on this domain. Nexus URLs and the old Nexus Vercel callback remain unchanged.
