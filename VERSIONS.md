# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v21 is added, move v11–v20 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v12 — 2026-06-24
**Wave ramp, gate FX, player bullet trails, hit vignette, title animation**
- Wave budget multiplier 1.8 → 2.8; speed ramp 0.12 → 0.16 (cap 3.2); interval floor 0.35 → 0.26
- Gate dash-through: 14-shard teal burst + shake + pickup sound when gate deactivates
- Player bullets now show a green glow trail (opacity 0.45, 0.22-unit step spacing)
- Hit vignette: red radial gradient on screen edges for 0.32 s on any real hit
- Title screen: `@keyframes tokoGlow` pulse on title text + staggered `tokoFadeUp` entrance

## v11 — 2026-06-24
**Portrait-optimised arena**
- Arena reshaped from square 36×36 to 22×36 (HALF_X=11, HALF_Z=18) to fill portrait screens
- Camera raised and pulled back (0,27,21), look-at z=−3, FOV 58→60 for better portrait framing
- Floor grid frequencies adjusted (17.1×, 28×) to keep grid cells square on non-square floor
- Enemy spawn changed from circle to ellipse matching arena proportions (×0.85 on each axis)
- CargoCluster, Gate, escape-bounds, bullet-bounds all updated for asymmetric arena
- Player boundary clamping now uses separate halfX/halfZ in player.js
- Intro screen: viewport-relative title size (`clamp`), touch-first control hints, portrait label

## v10 — 2026-06-24
**Death → title · new upgrade cards · audio pass**
- Death screen returns player to title after 2.8 s instead of auto-restarting
- Four new upgrade cards: Pierce (bullets pass through), Magnet (pickups drift to you), Shield (absorbs 1 hit; resets each wave), Dash Boom (radial shot ring on every dash)
- Shield shown in HUD as "✶ SHLD" indicator; recharged at wave start
- Pierce tracks per-bullet hit-set so each enemy is only hit once per shot
- Magnet sets drift velocity toward player within 9 u; increases as pickup gets closer
- Dash Boom fires 12 player bullets radially on dash-start transition
- `tryHitPlayer()` helper centralises shield check at all 3 damage sites (bullets, melee, poison)
- Audio pass: `enemyDieType(cat)` with distinct sounds for blobs, cubes, TORO, BAMBU, PYRA
- `audio.pickup()` — 3-note ascending arpeggio for item collection (was waveClear jingle)
- Cargo drone death now uses blob sound category

---

## Archive

**v1–v9 summary (2026-06-24)**
- v1: Initial baseline — 13 enemy types, roguelike upgrade cards, goo shader, audio, gates
- v2: Goo shader upgrade — vertex wobble, Fresnel rim, animated SSS pulse
- v3: Goo shader fix — radius-normalised frequency + analytic normals; wobble now visible
- v4: Roguelike mode toggle (ON/OFF chip, localStorage persist)
- v5: Seeded PRNG per run; budget-based wave gen; mid-wave cargo convoy; HP powerup
- v6: Spike waves (4th, 1.6×); enemy variants (elite/elite-lite/twin/group); goo moth convoy
- v7: Silent convoy — always sinusoidal sweep; per-kill drifting powerup drops; no announcements
- v8: Boss waves (8th, 2.5×) — guaranteed top-tier enemy, 3× HP / 1.5× scale
- v9: Minimal wave announcement — small "WAVE N" flash only (22 px, 900 ms)
