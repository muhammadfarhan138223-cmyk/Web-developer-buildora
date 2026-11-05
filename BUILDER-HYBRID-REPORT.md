# Builder Hybrid implementation — 21 October 2026

## Scope and preservation
Only Builder and the frontend editor/preview infrastructure were changed. SHA-256 checks confirm all 19 protected page, layout, SEO, auth and database files match the pre-task baseline. No production deployment, database mutation or saved-project deletion was performed. Local browser tests used disposable fixtures on port 3008.

## Delivered
- `/builder` defaults to Chat; `/builder/chat` and `/builder/work` are separate views with a top segmented switch.
- Navy/purple styling, local Builder dark/light toggle, collapsed Files explorer, desktop AI drawer and mobile AI bottom sheet.
- Files and folders: creation, editing, recursive rename/deletion, validation and in-page confirmation dialogs. Renaming does not rewrite source imports automatically.
- Resizable editor/preview, mobile Code/Preview tabs, existing Save/auth gate and ZIP import/export retained.
- Existing provider integration, staged generation and review/apply flow retained.
- Debounced browser-only HTML/CSS/JS/React/TypeScript/JSX/TSX compilation, multi-file relative imports, src alias, JSON/CSS imports and automatic React App mounting.
- Readable build/runtime errors, refresh, fullscreen and rendered New Tab preview.
- Opaque sandbox iframe with scripts allowed but without same-origin access; network connections, forms and external scripts blocked. HTTPS images/fonts/styles remain permitted.

## Minimal shared changes
`src/App.jsx` adds Builder subroutes and the detached preview route. `server/http.mjs` and `vercel.json` add private route aliases/noindex headers only. No auth or database server logic changed. `package.json`/lockfile add pinned `esbuild-wasm@0.21.5`; existing lockfile package versions were preserved. Runtime assets are prepared by `server/prepare-builder-runtime.mjs` and shipped locally in `public/builder-runtime`.

## Licensing
esbuild WASM, React and React DOM use MIT licenses. Notices are included in `public/builder-runtime/LICENSES.txt`. Official esbuild package: https://github.com/evanw/esbuild/blob/main/npm/esbuild-wasm/package.json . No third-party cloud runtime was added.

## Validation
- Existing production build passed, including SSR build.
- All 48 tests passed (37 existing, 11 new).
- Actual browser previews verified: HTML + CSS + JavaScript, multi-file JavaScript, React JSX, TypeScript, React TSX with interactive state.
- Editor changes triggered preview updates; broken syntax and thrown runtime errors appeared and cleared after correction.
- ZIP imports tested with five fixtures. File and folder create/rename/delete tested through UI with disposable data.
- Chat/Work route switching, Files collapse/drawer, Ask AI drawer/bottom sheet, keyboard pane resizing and refresh checked.
- New Tab rendered the compiled document in a separate sandbox iframe, rather than source code.
- Fullscreen entry displayed the website; reliable exit behavior in the embedded test browser was inconclusive and required a reload. Recheck fullscreen entry/exit in normal Chrome before release.
- Desktop 1366×768 and mobile 390×844 layouts checked; no page horizontal overflow.
- All four local Builder routes returned HTTP 200 with noindex/nofollow.

## Practical limits / not verified
- This phase previews frontend code only. Python/PHP/Java/C++ and server runtimes were intentionally not added.
- Bundled packages are React and React DOM. Arbitrary npm dependencies are not installed; unsupported package imports show an explanation.
- TypeScript is transpiled and syntax checked; semantic type checking is not included.
- Sandboxed generated pages cannot access host storage/cookies or make API requests. Backend-connected app testing requires a later isolated execution design.
- Live AI generation with a real provider key was not exercised. Existing provider/rate-limit/review tests pass, but provider quota cannot be eliminated or guaranteed.
- Authenticated cloud Save/ZIP export UI was not exercised with a real account; existing backend account/export tests passed and its gate was preserved.
- Native new-tab popup behavior depends on browser settings. The exact preview link was opened and its rendered content verified separately.

## Check locally
Open http://127.0.0.1:3008/builder/chat or http://127.0.0.1:3008/builder/work while the local server is running. The demonstration project is the existing React studio starter. Live buildora.farhanbalouch.com remains unchanged until a separate deployment.
