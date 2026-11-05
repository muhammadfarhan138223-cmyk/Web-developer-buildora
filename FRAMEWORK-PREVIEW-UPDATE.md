# Frontend preview support update

Supported: HTML/CSS/JavaScript, React JSX, TypeScript/TSX, Vue 3 single-file components (including script setup and scoped CSS), and Tailwind v4 browser utility generation. Vue components can import local .vue files. Standalone CSS has sample markup; it cannot reconstruct the original missing HTML. The iframe remains opaque and does not run backends.

Paste code detects Vue and other supported source types, including when supported source is pasted into index.html. The compiler uses a virtual corrected filename, preserving editor files. Single JSX/TSX modules should export a default component. Complete projects need their real entry and local imports.

Work > project actions (…) > Import source files / Import folder imports text source with relative folder structure, excluding node_modules, .git, dist and .env. ZIP import and ordinary file operations remain available. Use Paste code for a standalone snippet, and a new project before importing a complete unrelated project.

Vue/compiler-sfc 3.5.22 and Tailwind browser 4.1.14 are pinned, self-hosted and MIT licensed; notices ship in public/builder-runtime/LICENSES.txt. No CDN script permissions or cloud execution were added. Vue runtime templates are compiled before iframe execution. Tailwind browser compilation is for preview; exported production projects should use their own normal Tailwind build rather than relying on this editor's preview runtime.

This does not claim every framework or npm package is supported. Svelte/Astro, Angular decorators/templates, Sass/Less/Pug, backend runtimes and arbitrary dependencies need additional dedicated compilers or compiled browser output. Unsupported detected formats produce readable errors; they are not silently emulated.

Validation: 20 focused compiler/conversation tests cover Vue SFC and local component imports, script setup TypeScript, scoped CSS, Tailwind runtime inclusion/syntax, previous React/JS/TS formats and error handling. Browser-rendered Tailwind computed styles and click interaction were not visually verified during this update. Production build completed. No production deployment was performed. Homepage source/layout was not modified.

Deploy the existing source folder using npx vercel@latest --prod, then hard refresh the custom domain.
