# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v50 is reached, move v41–v49 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v49 — 2026-06-30
**Code-health pass: real arena flop bounds + dead-code removal**
- Cube flop wall-reflection now uses the **real per-axis arena half-dimensions** (`HALF_X`/`HALF_Z`, minus the cube radius) instead of a hardcoded `H = 17.5` phantom square. Portrait (11×18) and landscape (19×11) differ on each axis, so the old single value let cubes flop several units past the visible wall before the separation pass yanked them back. `_flopMove(dt, spd, H, …)` → `_flopMove(dt, spd, halfX, halfZ, …)`; `update()` now receives `halfX, halfZ` from the main loop
- Removed dead `restartTimer` (set in `triggerGameOver`, never read since v46 dropped the death-screen auto-return)
- Cache-bust token `?v=4` → `?v=5` across `index.html` + all relative imports so the deploy refreshes
- Verified: smoke suite green (ORANGE/TORO/BAMBU/feedback), and cubes spawned at the X wall reflect back inside (max |x| 10.0 < 11) with zero console errors

---

## v48 — 2026-06-30
**Cache-bust the whole module graph — deployed updates actually reach players**
- Symptom: after deploying, the live site kept showing an old HUD version. Cause: `index.html` always loaded `js/main.js?v=3` (token never changed between releases), so browsers/CDN served the cached `main.js` from the identical URL; and the modules `main.js` imports (`enemy.js`, `bullet.js`, …) had no cache-bust token at all
- Bumped the entry token `?v=3` → `?v=4`, and added the same `?v=4` token to **every** relative import across `main.js`, `designer.js`, `player.js`
- Token is identical on every import of a given module (e.g. all three importers use `./enemy.js?v=4`) so the browser still loads one instance — no duplicate-module bugs
- Process note: bump this token (and the HUD label) every release so deploys are guaranteed to refresh
- HUD label → v48 so a successful deploy is visually obvious
- Verified: full module graph loads with `?v=4`, smoke test green (ORANGE moves, TORO upright, BAMBU growth + charge, feedback save), zero console errors

---

## v47 — 2026-06-30
**ORANGE_CUBE movement fix — no longer freezes against a wall**
- Root cause: the initial `_target` was a fully-random point in ±16 on both axes, but the portrait arena is only ±11 wide in X (landscape ±11 in Z). Cubes routinely got an unreachable target, flopped into a wall where the bounds-clamp pinned them, and never closed to the `td < 2.2` firing threshold — so they sat in 'moving' forever, reading as frozen
- Targets now come from `_orangeTarget(playerPos)`: a point on a ring ~6–9 around the player, clamped to a ±10 box that fits inside *both* arena orientations, so it's always reachable. Used for the first target (set lazily on the first 'moving' update, since it needs `playerPos`) and every reposition after shooting
- Arrival threshold widened 2.2 → 2.6 (just over one flop stride) so a cube can't straddle the target point and hop back and forth across it forever
- Added a 5 s move-timeout safety (`_moveT`): a cube that still can't settle stops and shoots from where it is rather than flopping endlessly
- Verified: 3 cubes spawned at arena edges all traverse in and cycle moving→aiming→shooting→cooldown; zero errors

---

## v46 — 2026-06-30
**BAMBU growth + lob charge, bullet-hell projectiles, death-screen feedback form**
- BAMBU now grows all 3 segments instantly in sequence (`_growTimer` 8.0 → 0.18, `_maxSegs` always 3) right after emerging, instead of one segment every 8 s
- Lob telegraph animates a charge orb rising up through each stalk segment to the tip, then fires the instant it reaches the top; first lob comes ~1.3 s after spawn (`_bambuFireTimer` initial 1.3) so the climb reads right after growth
- Bullets reworked into bullet-hell style: solid bright-white core + saturated additive colour halo, no motion tail — clearly distinct from the matte goo splatter chunks (which fall and squash on the floor); trail rendering removed from `bullet.js`
- Death-screen feedback form: quick-pick reason chips (the first few predicted from this run's hit telemetry — top attacker, crowding, dash-down, bullet density, swarm — plus generic ones) and a free-text box
- Feedback saved to `localStorage` under `tokoDropFeedback` (last 100); `_feedback()` console summary (reason tally + comments), `_feedbackExport()` CSV download
- Death screen no longer auto-returns to title (so there's time to leave feedback); SEND & CONTINUE / SKIP buttons, or Space / Start, dismiss it via new `returnToTitle()`

---

## v45 — 2026-06-30
**Four bug fixes: ORANGE_CUBE flop, TORO orientation, gate laser visibility, gate lifetime**
- ORANGE_CUBE flop fixed: constructor `else if` was preventing the flop init block from running (ORANGE_CUBE is in `CUBE_TYPES`); changed to a separate `if` so both blocks run — ORANGE_CUBE now tumbles toward its target using `_flopMove` with `exact=true`
- TORO stands upright like a wheel: `mesh.rotation.x = Math.PI/2` (flat pancake) → `0` (upright ring); the rolling dash animation via `group.rotation.y` was already correct
- Gate laser beam visible: laser `BoxGeometry(4, 0.12, 0.12)` → `(4, 0.25, 0.5)`; glow `(4, 0.55, 0.55)` → `(4, 0.7, 1.1)` with opacity 0.22 → 0.28
- Gates persist across waves: removed gate-clearing from `spawnWave()`; instead cap at 2 active gates by removing the oldest before spawning a new one; `clearFX()` still clears all gates on game restart/death

---

## v44 — 2026-06-29
**Enemy separation — no more stacking**
- Post-update separation pass: after all enemies move each frame, pairs closer than `radiusA + radiusB + 0.25` are pushed apart by half the overlap each, split symmetrically
- Two passes per frame resolve chain-reaction bunching (A pushed into C) without visible jitter
- For flopping cubes, `_flopX0/_flopZ0` (the flop's start anchor) is nudged by the same delta so the tumble animation stays consistent with the corrected position
- Both enemies clamped to arena bounds after each nudge
- O(n²) per pass; at the reduced caps from v43 (≤14 non-swarm, ≤22 swarm) this is ~100–242 pair checks × 2 passes — negligible at 60 fps

---

## v43 — 2026-06-29
**ORANGE_CUBE flop + difficulty ramp rebalance**
- ORANGE_CUBE now tumbles like other cubes — removed explicit exclusion from flop setup; during 'moving' state calls `_flopMove` with `exact=true` so it rolls freely toward its target without cardinal snapping, visually distinct from the hop-and-snap of YELA/REDD/PURP
- `_flopMove` gains optional 6th param `exact=false`; when true, uses the raw normalized heading directly (no 70/20/10 cardinal-snap split), enabling diagonal tumbling
- Difficulty ramp substantially reduced across the board:
  - Budget: `8 + wave×3.3` → `5 + wave×1.8` (wave 3 swarm was 27 budget, now 13)
  - Kind multipliers: boss 2.5→2.0, spike 1.6→1.4, swarm 1.5→1.25, breather 0.7→0.6
  - Enemy cap: now grows with wave (`4+wave`, max 14 normal / `5+wave×1.4`, max 22 swarm); early waves stay sparse
  - Enemy speed: `1.2 + wave×0.12` → `1.1 + wave×0.09` (wave 1 was 1.32, now 1.19)
  - Fire interval: gentler acceleration, floor 0.35 (was 0.30)

---

## v42 — 2026-06-29
**Bullet origin tracking — full attacker identity on every hit**
- `Bullet` class gains `originType` field (enemy type enum value, null for player/gate/dash-boom)
- `BulletPool.spawnDir(...)` extended with `originType` parameter (default null, no caller breakage)
- All 6 enemy-side `spawnDir` calls in `enemy.js` pass `this.type`; `_ring()` helper forwards its new `originType` param
- BAMBU lob and SPLITTA death-burst in `main.js` pass `e.type` / `EnemyType.SPLITTA`
- Bullet collision: `b.originType` captured before `recycleAt` wipes it, forwarded to `tryHitPlayer` → `recordHitEvent`
- `_hitReport()` now shows exact attacker type with % for every bullet hit; `attacker` column already in CSV
- Combined with v41's melee+poison attacker tags: every hit event now has a fully resolved attacker

---

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
