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

## Canon (2026-09-24)

`CANON.md` records the owner's notes on who Toko is — the traced master face,
magenta as the original colour with every carrier colour still original, other
colours for contexts and moods, and Toko Slomo as the Kallio Noir version
(valid, not original). Any change to how this page draws Toko follows it.

## 2026-09-26 — Level 0 of LEVELS.md: one tree again

v46 and v47 were authored on `gh-pages` and on the Radio Free branch while
`main` sat at v19, so the rule above had quietly stopped holding. The branch's
own v47 diff was carried onto `main` (CANON.md, this file, the log) and
`main.js` was taken from the site: it is byte-identical on both branches again.
The log is the site's — v47, with v46 recording the same menu fix `main` had
filed as v19 — and `hub/versions.json` reads 47 on both. `index.html` still
differs by design (the site loads the historical layers; `main` the synced
core), so its `main.js?v=` is `main`'s own count.

