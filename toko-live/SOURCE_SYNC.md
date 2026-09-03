# Toko Live source sync

As of 2026-09-03, the core Toko Live runtime on `main` has been reconciled with the deployed spatial runtime from `gh-pages`.

Synced on `main`:

- `main.js` — same spatial/card/performance runtime as deployed core
- `index.html` — v42 shell and version labeling
- `style.css` — larger conversation layout, including mobile proportions
- `decision-memory-v39.js`
- `project-state.js`
- `router-guard.js`
- `evidence-opinion.js`
- `conversation-stress-v41.js`
- `mobile-interaction-v42.js`

`gh-pages` remains the deployment branch. Historical additive conversation modules that predate v39 still live there and should be ported only when they are modified, rather than overwriting the synchronized core with an older `main.js`.

Rule going forward: make core Toko Live changes on `main`, then carry the exact changed source to `gh-pages`; do not independently fork `main.js` again.
