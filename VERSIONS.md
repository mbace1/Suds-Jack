# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v31 is added, move v21–v30 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v29 — 2026-06-29
**Movement VFX — blob stretch + motion trails**
- Blobs now lunge: goo vertex shader gains `uStretch`/`uStretchDir`, driven by smoothed per-enemy velocity — elongate along travel, compress height (punchy, eases to 0 when idle)
- New pooled `TrailPool` (InstancedMesh, cap 256, translucent ghost spheres, shrink-to-zero fade) — fast movers (blobs + TORO) drop afterimage trails on a ~0.06 s cadence
- Trails are material-agnostic so the Phong TORO gets them too; cubes keep their flop as their movement signature
- Shader stretch is blob-only (player wobble-0 unaffected); 2 pools total = 2 extra draw calls
- Verified: stretch ~0.37 while moving (relaxes to 0 idle), trails active and bounded under cap, zero errors

## v28 — 2026-06-29
**Perf gate + pooled death chunks (WebGL overhaul pt.1)**
- Always-on subtle FPS meter (bottom-left, above version): EMA of raw frame time, tinted green ≥55 / amber 30–54 / red <30
- Death chunks moved from per-spawn `Mesh`+`SphereGeometry`+`MeshBasicMaterial` to a single pooled `InstancedMesh` (cap 256, per-instance color + matrix) — 1 draw call, zero per-spawn allocation
- Eliminates the GC spike when a dense swarm (18–22 enemies) dies near-simultaneously (was 100–150 throwaway meshes)
- Opacity fade replaced by shrink-to-zero so the chunk material stays opaque (no transparency sort)
- All spawn sites (enemy death, hit-chunks, cargo, gate burst) and both update loops rewired to the pool; `clearFX` empties it
- Verified: 1 InstancedMesh, 300-burst caps at 256 and recycles, settles to 0, frame cost stable, zero errors
- Note: blob `ShaderMaterial` + hit flash/squash/breathing already existed (doc's Phase 1/2 largely done); bloom stays off until Phase 4

## v27 — 2026-06-29
**Personal bests (local, future-proofed for a leaderboard)**
- New `tokoDropPB` localStorage record (schema-versioned): bestScore / bestTime / bestWave + capped top-10 `runs[]`
- Each run stored as a leaderboard-shaped `RunRecord`: score, time, wave, seed, mode, orientation, ISO date
- Legacy `tokoDropHi` integer migrated into `bestScore` on first load; kept in sync for backward-compat
- Title screen shows a `BEST  N PTS · WAVE N · Xm Ys` line (only once a run exists)
- Death screen shows per-metric `★ BEST SCORE / TIME / WAVE` badges for whatever you just beat
- Pure additive — no gameplay logic touched; bloom remains off (deferred to the WebGL plan's Phase 4)

## v26 — 2026-06-29
**Difficulty curve reshape + pacing pulses**
- Curve now climbs to ~8/10 by wave 10 (the "knee"), then plateaus with a slow creep toward 9/10 — tuned for competitive 5–10 min runs
- `getWaveScale` rewritten piecewise: speed 1.2→2.28 by wave 10 (cap 2.7); fire interval 1.0→0.42 by wave 10 (floor 0.30)
- Budget plateaus: `8 + min(wave,10)×3.3 + max(0,wave−10)×1.0` (wave 1≈11, wave 10≈41, wave 20≈51)
- New wave rhythm via `waveKind()`: **swarm** every 3rd wave (rush of cheap fast bodies, ×1.5 budget, tight burst), **breather** lull after any intense wave (×0.7), alongside existing spike (4th, ×1.6) and boss (8th, ×2.5)
- Spawn cadence tightened (0.18–0.68 s; swarms 0.08–0.36 s) so the crowd is on-field before a fast clear can trip instant wave-end
- Verified: waves field real crowds (w1≈6, swarm w3≈18–20), pulses visible, stationary dummy now dies by wave 6

## v25 — 2026-06-27
**Deck-first defaults (Steam Deck pt.2)**
- A connected gamepad now defaults the arena to LANDSCAPE — the Deck "just works" with no title-screen fiddling
- Auto-default only applies when the player hasn't explicitly chosen an orientation; an explicit pick (new `tokoDropOrientSet` flag) is always respected
- A pad connecting later flips an un-chosen orientation to landscape live on the title screen
- `gamepadconnected` immediately switches the UI to gamepad mode (touch joysticks hidden on sight)

## v24 — 2026-06-27
**Gamepad support + input auto-detect (Steam Deck pt.1)**
- Gamepad polling added to `InputManager.pollGamepad()` (called once per frame)
- Left stick = move, right stick = aim + auto-fire (matches touch model), deadzone 0.20
- Dash on A / right bumper / right trigger; pause on Start; A also starts game from title
- Auto-detect: any gamepad activity sets `usingGamepad`, which hides the on-screen touch joysticks; a screen touch reverts to touch controls
- Title control hints updated for gamepad buttons
- Rumble/haptics deferred to a later update

## v23 — 2026-06-27
**Landscape / Steam Deck mode**
- New ORIENTATION toggle on title screen — PORTRAIT (tall 22×36) or LANDSCAPE (wide 38×22)
- Landscape arena optimised for Steam Deck (16:10) and sideways mobile
- Arena dims now swappable at runtime: `applyArenaMode()` rebuilds floor + border geometry, swaps camera framing, and updates grid uniforms
- Grid frequencies converted to `uGridX`/`uGridZ` uniforms (derived from arena size + `GRID_CELL`) so cells stay square in either orientation
- Landscape camera: rest (0,27,14), look (0,0,−2); portrait unchanged (0,27,21)/(0,0,−3)
- Orientation persists in `localStorage` (`tokoDropLandscape`); applied on title load and game start; toggle live-updates the title arena

## v22 — 2026-06-25
**Wave ends on last kill — no empty arena wait**
- Removed `pendingSpawns.length === 0` gate from wave-end condition
- Wave ends the moment all living enemies die; remaining scheduled spawns are flushed
- Eliminates the empty-arena pause while waiting for stragglers to spawn

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
