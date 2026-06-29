# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v50 is reached, move v41–v49 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v41 — 2026-06-29
**Hit-event telemetry system**
- Every HP-loss event records a full snapshot: wave + kind, time in run + time in wave, HP before/after, damage source (bullet/melee/poison), specific attacker type (melee + poison resolved; bullets anonymous), dash-available flag, live enemy count + type breakdown, enemy bullet count on field, gap since previous hit, active upgrades list, score
- `timeSinceLastHit` enables cluster-hit detection (≤3 s gap = "blender" moment flag)
- `dashReady` flag reveals whether the escape option was unavailable when hit
- Session log persisted to `localStorage` under `tokoDropHitLog` (last 20 runs)
- `window._hitReport()` — formatted console analysis: source/attacker breakdown, wave-kind heatmap, top enemy types at hit moments, bullet density, dash-down rate, cluster hits, avg hit gap, shield-absence rate, powerup timing suggestion, and tuning notes
- `window._hitLog()` — raw JSON for deeper inspection
- `window._hitExport()` — downloads a `.csv` with one row per event across all stored sessions; opens directly in Excel / Google Sheets and grows each time you export
- `collectedUpgrades` array tracks roguelike picks per run; snapshot included in every event
- `tryHitPlayer(source, attackerType)` extended; melee passes `e.type`, poison passes `SLUDGE_CUBE`, bullets pass null
- HUD label bumped to `v41`

---

## v40 — 2026-06-29
**Cube behaviour variety (per-enemy pass pt.1)**
- Cubes no longer share one aimless random walk — each type is now a distinct archetype:
  - **YELA + REDD/PURP minis** — direct rushers (flop straight at the player)
  - **REDD_CUBE** — flanker (approaches from a side angle, straightens as it closes)
  - **PURP_CUBE** — circler + spiral (orbits at ~5 radius, fires a rotating spiral; gained a bullet `0xcc66ff`)
  - **SLUDGE_CUBE** — positional zoner (advances to ~7 then holds, laying poison)
  - **ORANGE_CUBE** — position & shoot, now actually targets near the player and aims its bullet-wall *at* the player (was random point + random direction)
- `_flopMove` generalised to steer toward a per-type desired heading (cardinal-snapped, keeps the tumbling-cube look)
- Verified: YELA closes, PURP holds radius ~5 while sweeping 35–57° + spiral fire, SLUDGE advances; zero errors

---

## Archive

**v30–v39 summary (2026-06-29)**
- v30: Pincer cluster spawns — groups fan across an arc, stagger entry, push in with intent
- v31: Player movement VFX — velocity-driven directional stretch (walk/dash lunge)
- v32: In-shader hit ripple — concentric shockwave from the bullet's impact point
- v33: Pre-death tear — violent `uTear` convulsion as a blob dies
- v34: Impact spark — goo bits flung from the contact point on a non-fatal hit
- v35: Hit-feedback polish — enemy-weight kill shake + muzzle flash
- v36: Per-enemy trail tuning — `TRAIL_CFG` motion signatures (TORO bold, blobs subtle)
- v37: Powerup/pickup VFX — collection pop + magnet pull-streak
- v38: Gate glow-beam halo + convoy golden trail ribbon
- v39: Bullet visual pass — additive glow cores, brighter colours, pulsing enemy bullets

**v20–v29 summary (2026-06-25 – 2026-06-29)**
- v20: Seamless wave flow — no announcement/burst/shake between waves
- v21: Harder early waves (budget 8+w×3.0, speed floor +20%); death run-summary; `runTimer`
- v22: Wave ends on last kill — pending spawns flushed, no empty-arena wait
- v23: Landscape / Steam Deck arena mode (ORIENTATION toggle, runtime `applyArenaMode`)
- v24: Gamepad support + input auto-detect (sticks, dash/pause buttons, hides touch UI)
- v25: Deck-first defaults — connected gamepad auto-selects landscape unless explicitly set
- v26: Difficulty curve reshape (8/10 by wave 10, plateau) + pacing pulses (swarm/breather)
- v27: Personal bests — `tokoDropPB` structured records, title + death-screen bests
- v28: Perf gate (FPS meter) + pooled death chunks (InstancedMesh, 1 draw call)
- v29: Movement VFX — blob directional stretch + pooled motion-trail afterimages

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
