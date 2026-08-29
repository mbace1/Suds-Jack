# Toko Live versions

## v17 — 2026-08-29

- Restored factual news conversation and live public-source refresh on the deployed branch.
- Preserved the Helsinki Free Radio rule: only `sourced: true` RFH stories may enter Toko's factual news wire; parody stories remain excluded.
- Added visible V17 labeling to the live shell.
- Kept evidence-aware project cards, cross-project comparison, visual critique, decision memory, project-status reasoning and hidden DOS/personality commands from v12–v16.
- Toko brand-board copy now suppresses the stale `GO MAKE YOUR OWN` phrasing in the live DOM.
- `gh-pages` is the current deployment authority for Toko Live.

### Known follow-up

- `main/toko-live/main.js` still predates the deployed spatial-memory implementation. The GitHub connector truncates the deployed file on retrieval, so a safe byte-for-byte branch sync was not attempted in this pass. Do not treat `main` as the current Toko Live runtime until that file is reconciled.
- Browser-render validation has not been performed in this pass.
