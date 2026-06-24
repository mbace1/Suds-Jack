# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v11 is added, move v1–v10 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v8 — 2026-06-24
**Boss waves**
- Every 8th wave (8, 16, 24…) is a boss wave: 2.5× budget, "★ BOSS ★" overlay (1.8 s)
- Guaranteed top-tier enemy (TORO → PYRA → BAMBU → PURP_CUBE priority) at t=0
- Boss scaling: 3× HP, 1.5× scale — clearly larger than elite (1.2×) or elite-lite
- Boss wave supersedes spike-wave logic; `isBoss` checked before `isSpike`
- `boss` flag propagated through `pendingSpawns` to spawn trickle

## v7 — 2026-06-24
**Silent wavy convoy with drifting drops**
- Convoy spawns silently — no overlay announcement, no HUD indicator
- Always sinusoidal sweep (amplitude 3–8 units, freq 0.7–1.7 Hz) — straight path removed
- Each killed moth drops a slow-drifting random powerup (speed 0.8–1.4 u/s, random angle)
- Drops expire after 7 s if not collected; drift applied to collision x/z each frame
- Removed score-bonus-for-full-clear; convoy is now ambient ambient event

## v6 — 2026-06-24
**Spike waves, enemy variations, goo moths, score bonus**
- Every 4th wave is a spike wave (1.6× budget) with "★ SPIKE WAVE ★" overlay
- Enemy variants: elite (2× HP + 1.2× scale), elite-lite (1.5× HP), twin (pair), group (3–4 cheap)
- Cargo convoy critters reworked as goo moths: golden goo-shader body + flapping wing children
- Convoy sweep randomly straight or sinusoidally curved
- Convoy reward is a score bonus (wave × 500) shown in flash overlay — no powerup drop
- Add `_hpMult` / `_radiusMult` to Enemy for clean elite HP bar and collision scaling

## v5 — 2026-06-24
**Seeded random waves + mid-wave cargo convoy**
- Mulberry32 PRNG seeded per run; seed shown bottom-right in HUD and on game-over screen
- Budget-based wave generator replaces fixed per-wave schedules; budget escalates with wave
- CargoCluster: golden drone formation crosses arena mid-wave, bullet-hittable
- HP powerup type added (red orb, +1 HP); fire-rate boost duration extended 5 → 8 s
- Convoy HUD indicator shows live drone count; "CONVOY!" overlay on spawn

## v4 — 2026-06-24
**Roguelike mode toggle**
- ON/OFF chip in title screen; persists to `localStorage` (`tokoDropRogue`)
- ON (default): upgrade card panel between waves
- OFF: pure arcade — wave clears go straight to the next wave with no cards

## v3 — 2026-06-24
**Goo shader visual fix — wobble now visible**
- Radius-normalised spatial frequency: every blob shows same lump count regardless of size
- Analytic normal perturbation so lumps catch directional light (biggest visual win)
- Amplitude 0.13 × radius (was 0.038 flat — sub-pixel at gameplay scale, invisible)

## v2 — 2026-06-24
**Goo shader upgrade**
- Vertex wobble: three radius-normalised travelling sine lobes
- Richer Fresnel rim + tighter specular highlight term
- Animated SSS pulse via `uTime`; shared `GOO_TIME` uniform updated once per frame

## v1 — 2026-06-24
**Initial feature baseline**
- Twin-stick bullet-hell arena with 13 enemy types (blobs, cubes, specials)
- Roguelike upgrade cards between waves (speed, fire rate, HP, dash CD, nuke, big bullets)
- Per-enemy goo shader on blob types; cube enemies use MeshPhongMaterial
- Screen shake, death chunks + puddles, poison zones, slime trails, sludge ribbons
- Audio manager; designer debug overlay (ESC); gate obstacles

---

## Archive
*(empty — move v1–v10 here when adding v11, summarising into one block)*
