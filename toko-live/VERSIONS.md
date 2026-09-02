# Toko Live versions

## v36 — 2026-09-02

- Connected character reactions to detected user intent instead of relying only on loose reaction keywords.
- Added semantic states for correction, probing, comparison, next-step requests, inspection/testing, agreement and curiosity.
- Preserves the user's current intent/project briefly while Toko replies, so performance does not reset or get reclassified from Toko's own prose.
- Hardened opinion memory so only user-authored `.tc-you` turns can update stored stance; Toko replies are excluded and new entries record `source: user` provenance.
- Kept these changes additive and left the large deployed `main.js` untouched.
- Hub cabinet now reports v36.
- Toko Move was not changed in this pass.

## v35 — 2026-09-02

- Added character reaction language for agreement, disagreement, uncertainty, curiosity, correction and consideration.
- Reactions now carry briefly across the exchange instead of snapping immediately back to neutral.
- Added restrained pointer/focus orientation and rare listening mannerisms to make Toko feel present without constant motion.
- Expanded the v34 performance layer while keeping the approved Toko artwork unchanged.
- Added the reaction layer as a separate additive module so the large deployed runtime remains untouched.
- Hub cabinet now reports v35.
- Toko Move was not changed in this pass.

## v34 — 2026-09-02

- Continued Toko character development without introducing alternate Toko artwork.
- Added a state-driven performance layer to the existing character: distinct listening, thinking, talking, pleased and correction/glitch body motion.
- Added quiet breathing, restrained head/body tilt, talk cadence, pleased lift, correction jitter and a small touch acknowledgement.
- Respects `prefers-reduced-motion`.
- Hub cabinet now reports v34 and uses the approved Toko face only.
- Cache-busted both the Toko Live character-performance module and the hub cabinet entry.
- `gh-pages` remains the deployed Toko Live authority.

## v17 — 2026-08-29

- Restored factual news conversation and live public-source refresh on the deployed branch.
- Preserved the Helsinki Free Radio rule: only `sourced: true` RFH stories may enter Toko's factual news wire; parody stories remain excluded.
- Added visible V17 labeling to the live shell.
- Kept evidence-aware project cards, cross-project comparison, visual critique, decision memory, project-status reasoning and hidden DOS/personality commands from v12–v16.
- Toko brand-board copy now suppresses the stale `GO MAKE YOUR OWN` phrasing in the live DOM.
- `gh-pages` is the current deployment authority for Toko Live.

### Known follow-up

- `main/toko-live/main.js` still predates the deployed spatial-memory implementation. Do not treat `main` as the current Toko Live runtime until that file is reconciled.
- Browser-render validation has not been performed in this pass.
