# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v31 is added, move v21–v30 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v21 — 2026-06-25
**Harder early waves; run summary on death**
- Budget formula `4 + wave×2.8` → `8 + wave×3.0` — wave 1 jumps from budget 6 to 11; ramp steepens
- Enemy speed floor `1 + w×0.16` → `1.2 + w×0.14` — enemies 20% faster from wave 1; same ceiling
- Variants (twins/groups/elites) now roll from wave 1 (was wave 2+)
- Death screen now shows wave reached, time survived (Xm Ys), and score on one line
- `runTimer` added — tracks seconds played per run, resets on game start
- HUD version label updated to `v21`

## v20 — 2026-06-25
**Seamless wave flow — zero interruption**
- Wave transition stripped to bare minimum: no announcement overlay, no particle burst, no shake, no bullet clear
- Score still increments; roguelike upgrade screen still works when enabled
- `announceWave()` no longer called between waves

---

## Archive

**v11–v19 summary (2026-06-24 – 2026-06-25)**
- v11: Portrait-optimised arena — 22×36 (HALF_X=11, HALF_Z=18), updated camera/intro
- v12: Wave ramp (budget ×2.8, speed 0.16, interval floor 0.26); gate burst FX; player bullet trails; hit vignette; title animation
- v13: Version number "v13" in HUD bottom-left
- v14: GDD.md added — 14-section living design document with per-section version stamps
- v15: Bloom post-processing (EffectComposer + UnrealBloomPass, ACES tone mapping) — later reverted
- v16: Arcade default (roguelike OFF); wave duration 30 s→20 s; announcement 900 ms→450 ms; input reset on game start; toggle-start bug fixed
- v17: localStorage key renamed `tokoDropRogue`→`tokoDropRogue2` to clear stale ON default
- v18: Bloom reverted; roguelikeMode hardcoded `false` at startup
- v19: Wave-end timer gate removed (waves end on last enemy death); convoy spawn 12–24 s→3–8 s

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
