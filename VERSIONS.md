# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v21 is added, move v11–v20 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

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
