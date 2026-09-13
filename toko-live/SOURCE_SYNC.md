# Toko Live source sync

As of 2026-09-09, the core Toko Live source on `main` is reconciled through v45 with the deployed `gh-pages` architecture.

Synced on `main`:

- `main.js` — same spatial/card/performance runtime as the deployed core
- `index.html` — v45 shell and version labeling
- `style.css` — v44 conversation/mobile layout
- `decision-memory-v39.js`
- `project-state.js`
- `router-guard.js`
- `evidence-opinion.js` — v45 feedback-aware opinions
- `conversation-stress-v41.js`
- `mobile-interaction-v42.js`
- `regression-v43.js`
- `routing-authority-v44.js`
- `feedback-loop-v45.js` — normalized external/playtest feedback evidence

`gh-pages` remains the deployment branch. Historical additive conversation modules that predate v39 still live there and should be ported only when they are modified, rather than overwriting the synchronized core with an older runtime.

Rule going forward: make core Toko Live changes on `main`, then carry the exact changed source to `gh-pages`; do not independently fork `main.js` again.

Browser-render validation is still a separate release check; source parity alone does not count as visual/play validation.
