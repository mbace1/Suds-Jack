# Suds-Jack + Piritori Status Snapshot
**Date:** 2026-10-25  
**Repo:** mbace1/Suds-Jack (main)  
**Live site:** https://mbace1.github.io/Suds-Jack/

## Active lanes (Implemented / Tested / Merged / Live)

### Toko Move (store path)
- **Goal:** Publish pure transport simulator on itch.io first (contract title). No Piritori assets.
- **Recent:** v2.64 (current HSL network + rival fix + itch packaging + store-build seam). M1–M3 largely done. Ship bar, Finnish language, and phone LIVE still open.
- **Status:** Implemented + tested on main; not yet on itch.io. Hub version tracks VERSIONS.md.
- **Next (smallest):** Finish M4/M5 polish (stranger first minutes + language) and confirm ship bar on a real phone before M7 upload.
- **Gates:** `test/itch.cjs`, `test/ship.cjs`, `test/stranger.cjs`, `test/lang.cjs`, `test/shifts.cjs`.
- **Exit:** Owner uploads M2 zip (or butler) to itch.io; live page matches packaged build.

### Piritori (Era I)
- **Goal:** Playable Era I slice (7-day spine, map-first, markets, encounters, 2v2/3v3 battles) that respects DESIGN_AUTHORITY hierarchy.
- **Canon:** DESIGN_AUTHORITY.md → DESIGN_LOCKS.md → GAME_DESIGN_DOCUMENT.md → ART_BIBLE.md → UX_SPEC.md → MAP.md + kallio-era1-2003-v1.json → content/era1-slice-v1.json → art/v3/manifest.json.
- **Status:** Strong design docs and content JSON on main. Runtime prototypes exist (piritori/, piritori-c09, piritori-c17). Playable end-to-end spine not yet proven on the real UI. Era II phase-gated.
- **Publishing:** Separate product. Shares only neutral flow-core with Toko Move. Spin-off title “Toko Move: Piritori” planned after Toko Move ships.
- **Next (smallest):** One full map-first opening + 7-day spine playthrough through the real interface (not debug hooks), with formation battle that can be lost and still progress.
- **Gates:**  
  `node piritori/map/validate-map.mjs`  
  `node piritori/content/validate-slice.mjs`  
  `node piritori/test/v3-contract.mjs`  
  `node piritori/test/v3-state.mjs`  
  `node piritori/test/v3-battle.mjs`  
  `NODE_PATH=$(npm root -g) node piritori/test/v3-playthrough.cjs`  
  `node piritori/test/fight.mjs`  
  `node piritori/test/market.mjs`
- **Exit:** Owner can complete the Era I slice on phone/desktop via the published hub path and name what felt wrong.

### Hyper Dagger
- **Recent:** v58 (HD-018) — season 3 no truck shots, no crate saves, load is not the score.
- **Status:** Merged and versioned on main / hub.
- **Next:** Owner playtest of season 3 feel.

### Hub / Arcade
- **Status:** Stable after recent token, versions.json, shell, and playlog fixes. Path-scoped gates.
- **Next:** Keep one-token-per-module discipline; never regenerate versions.json on deployed tree without --check.

## Publishing order (owner, 2026-10-24)
1. Toko Move on itch.io (approved title, pure transport).
2. Toko Move: Piritori (separate adult spin-off, own itch page, shares only flow-core).
3. Rebrand spin-off to Piritori as the bigger title. Toko Move stays published beside it.

## Agent infrastructure
- AGENTS.md + CLAUDE.md + .claude/skills/ (project-work-state, game-playtest, hub-release, etc.) already in place.
- Claude Code is the primary coding agent.

## Immediate recommendation
Finish Toko Move store readiness first. Then advance Piritori Era I playable spine. Use the four-fact PROGRESS.md pattern per lane.
