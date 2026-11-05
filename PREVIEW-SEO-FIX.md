# Preview and indexing fix

The deployed screenshot already contains the new Paste code button. The displayed bug was React source pasted into an HTML-named file, not proof of a failed deployment. The compiler now detects that case and virtually assigns the correct React entry before compiling. The on-disk editor filename is preserved; Paste code still creates the detected filename explicitly.

The production site URL now defaults to https://buildora.farhanbalouch.com when neither SITE_URL nor VITE_SITE_URL is set. Previously a missing environment value produced site-wide Disallow rules and noindex public pages. Public page metadata, sitemap and existing server-rendered pages use the canonical domain. Homepage layout/content was not changed.

Workspace, saved projects and account pages remain deliberately noindex. A Search Console robots warning for /builder is expected under that policy; it does not show that public /features, /about, /templates or /pricing are blocked. Google controls actual indexing and timing.

Deploy from this source folder with `npx vercel@latest --prod`. Submit https://buildora.farhanbalouch.com/sitemap.xml in the existing Search Console property's Sitemaps screen. Search Console submission was not performed by this update.

The terminal screenshot reports Vercel Authentication protection. If the custom production domain also prompts visitors to log in to Vercel, its project owner must configure public production access in Deployment Protection. This update does not weaken that protection automatically. Protected preview deployment URLs can remain private.

Validation: the 12 frontend compiler tests passed, including the new misnamed JSX regression test. No live AI calls or repeat full test suite were run for this small fix. No production deployment was made by Codex.
