# Work page polish — November 5, 2026

Builder Work now uses a centered rounded studio panel with restrained animated radial lighting, dark/light palette inheritance, responsive mobile spacing and reduced-motion support. The panel adapts to the screen rather than forcing a literal square that would crowd editor controls.

CodeMirror now enables real automatic line wrapping, so pasted one-line code fits the editor width without changing the source or losing undo history. This is visual wrapping, not a source formatter that rewrites indentation.

The selected HTML file is now passed to the preview, fixing the pages.html versus index.html mismatch. Opening JS/CSS components keeps the project's current HTML entry. /builder now opens Work by default; /builder/chat remains separate. The primary link is https://buildora.farhanbalouch.com/builder/work .

Homepage, public-page SEO, authentication and stored project data were not changed. Work remains an intentionally non-indexed application screen. No production deployment was performed. Production build was run; browser screenshots and mobile visual verification were not performed in this update.
