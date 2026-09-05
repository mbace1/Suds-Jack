# Toko Live versions

## v44 — 2026-09-05

- Added a single-answer authority layer for high-confidence project status, decision, next-step and opinion questions.
- The authority layer is registered before the older specialist handlers so those queries no longer fan out across competing Enter listeners.
- Added typo-tolerant explicit project aliases for the main projects while leaving arbitrary/freeform discussion untouched.
- Polished mobile conversation layout again: the conversation gets 72% of the viewport, the Toko stage is smaller, the input is a larger touch target and remains visible at the bottom of the chat.
- Added touch-action/overscroll cleanup so canvas interaction and chat scrolling fight each other less.
- Hub cabinet reports v44. Toko Move was not changed.

## v43 — 2026-09-05

- Added passive runtime regression diagnostics for project resolution and authoritative status/decision/next/opinion questions.
- Added detection for multiple Toko replies following one user turn without generating any extra conversation itself.
- Kept diagnostics available through `window.TokoRegression` for browser inspection.

## v42 — 2026-09-03

- Cleaned up touch interaction for cross-project cards: first tap focuses a side/tab, second tap asks. Touch no longer implicitly cycles the card before a double tap resolves.
- Expanded the conversation area: more horizontal room on desktop and a larger share of the viewport on mobile.
- Reduced prompt-menu height so Toko's actual conversation log gets priority.
- Cache-busted the Toko Live stylesheet and deployed the v39-v42 brain modules together.
- Toko Move was not changed.

## v41 — 2026-09-03

- Added deterministic conversation stress checks for status, decisions, next steps, opinions, comparisons, corrections, typos and follow-ups.
- Hardened project resolution against common misspellings and compact project names.
- Added a narrow duplicate-reply guard for identical Toko replies emitted within the same response burst.

## v40 — 2026-09-03

- Added evidence-aware Toko opinions grounded in project goal/current problems/next milestone plus explicit accepted, rejected and superseded decisions.
- Toko now tracks an evidence signature per project and can say when her position actually moved because project evidence or an explicit decision changed.
- Rejected directions are not casually reopened without new evidence.

## v39 — 2026-09-03

- Replaced the active decision layer with Decision Memory 2.0.
- Decisions now have lifecycle states: accepted, rejected, superseded or undecided.
- Stored items include user provenance, project scope, topic, timestamp and an explicit reason when the user gives one with because/since/so that.
- Superseding a direction marks the previous accepted item as superseded instead of leaving two apparently active decisions.
- Toko can answer filtered memory questions such as what was rejected, what changed, what is undecided and why a decision was made.

## v38 — 2026-09-02

- Added a compact project-state model for every core project: goal, current state, problems, established decisions and next milestone.
- Toko can now answer explicit project status, decision and next-priority questions from this structured state instead of assembling a generic response.
- Decision-memory approvals are folded into project-state answers while authored baseline decisions remain separate.
- Added a high-confidence routing guard for these authoritative questions so competing Enter handlers do not all answer the same request.
- Kept freeform/creative conversation outside the guard so the new router does not swallow arbitrary discussion.
- Hub cabinet reports v38. Toko Move was not changed.

## v37 — 2026-09-02

- Began conversation-routing cleanup with a narrow capture-phase authority layer.
- Project status/decision/next-step requests now have a single deterministic route when an explicit project is resolved.
- This reduces duplicate-module replies without rewriting the large deployed runtime.

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

- Core `main/toko-live/main.js`, the v42 shell/layout, and the v39-v42 source modules have been reconciled with the deployed architecture. v43-v44 should be mirrored back to `main` after this deployed regression cycle settles.
- Browser-render validation has not been performed in this pass.
