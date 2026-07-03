# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v88 — 2026-07-03
**New enemy: BOTFLY flying homing bot — and homing leaves the player's arsenal**
- **BOTFLY** (17th enemy type, unlocks wave 5, cost 4): a pink goo bot hovering at ~y1.5 on flapping translucent wings. Holds an ~8-unit band around the player while drifting tangentially, and every 3.8s fires a **slow homing shot** (speed ×0.62, turn rate 1.8 — outrunnable and dashable, per the "slower rate" design) with a 0.5s charge-up emissive flicker as the tell. No contact damage — it flies
- **Homing removed from the player weapon roster** (the requested trade): `H`/`H2` pods no longer appear in the LV1/LV2 drop pools, making homing an enemy-exclusive threat. The HOMING firing modes stay implemented but unreachable, in case a pod ever returns
- `bullet.js`: `spawnDir` gains a `speedMult` param; homing now steers per side — player homing bullets chase the nearest enemy (as since v70), enemy homing bullets chase the player (shared `_steerToward` helper; `bullets.update` takes `playerPos`). The 4s bullet lifetime keeps a dodged homing shot from circling forever
- Death FX: hovers mean its droplets rain down from flight height (fxY); dies with goo droplets (not cube chunks) and the blob death sound
- GDD: backlog item closed, BOTFLY documented in §15
- Cache-bust `?v=41` → `?v=42`; HUD label → v88

---

## v87 — 2026-07-03
**Port brief Part 6: LIVE TUNING page in the pause menu — the port is complete**
- New **🎛 LIVE TUNING** page in the pause-menu list (between SETTINGS and the enemy pages): 31 sliders writing **directly into `TUNING`**, grouped BLOB (breathe/drag/tells) · CUBE FLOP (squish/cadence) · TORO (rev/telegraph/dash) · BAMBU LOB (telegraph/flight/arc/spread) · FX (trail/poison cadence). Everything listed is read by the game per-frame or per state transition, so edits apply to the live run on unpause
- **COPY TUNING JSON** serializes the whole `TUNING` object; **APPLY PASTED JSON** deep-merges pasted JSON back in (only keys that exist) — the round-trip path for promoting tuned values into `tuning.js`
- Edits persist across reloads as **touched paths only** (`tokoTUNING`) — future default changes in `tuning.js` aren't shadowed by stale saved copies of values never edited. The header **RESET** button now clears both `tokoCFG` and `tokoTUNING`
- Deliberately absent: material preset buttons/sliders (no material system to drive yet) and the spawn-a-specimen preview (the brief marked it optional — it would complicate wave state); segment geometry + lob cooldown apply on next spawn, with the cooldown already editable as Fire Interval on BAMBU's enemy page
- This closes out **all six parts** of `TOKO_DROP_PORT_BRIEF.md` (v79 wiring, v82 blobs, v84 flop, v85 TORO, v86 BAMBU, v87 tuner)
- Cache-bust `?v=40` → `?v=41`; HUD label → v87

---

## v86 — 2026-07-03
**Port brief Part 5: BAMBU bamboo tower + parabolic lob + flashing landing ring**
- **Body rebuilt**: each segment is now a cylinder flaring wider toward its top (`bottomR 0.20+i·0.02`, `topR 0.36+i·0.03`, h 0.6) with a thin node lip between segments — an actual bamboo stalk instead of the old cross of rounded boxes. Emerge-from-floor and pop-a-segment-per-hit behavior kept (segment heights rescaled to `segHeight`)
- **Attack cycle rebuilt** (the important gameplay change — the player now sees where the lob lands *before* it lands): every `lobCooldown` 4s, BAMBU picks a landing point near the player (±`lobSpread` 1.2) → a **flashing landing ring** (`RingGeometry(0.55, 0.95)`, 22Hz) marks it for `lobTelegraph` 0.7s while the charge orb climbs the stalk and the tower visibly squash-strains → an emissive blob (r 0.34) flies a **visible parabola** (arc height 2.4, `lobFlight` 1.0s) from the tower top, ring flashing faster (40Hz) → **splashdown**: droplet burst, splat decal, and damage only if the player is inside the ring at impact
- Replaces the old instant straight-line fat bullet aimed at the player's position + the separate orange `BambuAoE` circle (class removed — it was visual-only and implied an AoE that never damaged); telemetry logs these hits as source `'lob'`
- Tower gains the lab's idle breathe; lob blob/ring are hidden if BAMBU dies mid-cycle and cleaned up on despawn
- `main.js` now imports TUNING (first use outside enemy.js)
- Cache-bust `?v=39` → `?v=40`; HUD label → v86

---

## v85 — 2026-07-03
**Port brief Part 4: TORO rolls like a wheel + exact-length telegraph with arrowhead**
- **Wheel orientation fixed**: torus + rim spikes now live in a `_wheel` subgroup spinning about the axle (local Z) while the outer group yaws to face the travel/dash direction — TORO visually *rolls*. Previously the whole group spun about the vertical axis (like a coin on a table) and the 6 spikes were laid out in the horizontal plane while the torus stood upright — they didn't even ring the wheel. Now `TUNING.toro.rimSpikes` (5) spikes ring the rim in the wheel plane
- Rev-up keeps the accelerating spin (`3 + ramp·8` rad/s, ramp now TUNING-driven); during the dash, spin rate = `dashSpeed / rimRadius` so ground speed and rotation match
- **Telegraph**: the fixed 36-unit line is replaced by a shaft (`indicatorWidth` 0.34) stretched to the **exact dash length** — computed against the real arena walls along the dash direction — plus a 3-sided cone arrowhead (0.5 × 0.9) whose **tip sits exactly at the impact point**. Flash cadence unchanged
- **Latent bug fixed**: the dash clamp used hardcoded `±17` bounds from the old square arena — in portrait mode (halfX 11) TORO could dash ~6 units *outside* the side walls (and its telegraph pointed at a spot off-screen). Dash + telegraph now clamp to the live per-axis arena bounds minus the wheel radius
- Idle creep also yaws the wheel to face its movement
- Cache-bust `?v=38` → `?v=39`; HUD label → v85

---

## v84 — 2026-07-03
**Port brief Part 3: rigid edge-pivot cube flop + speed-derived cadence**
- `_flopMove` rewritten to the goo-flop/enemy-lab math: the cube mechanically tips over its leading bottom edge — pivot arc sweeps `arcStartDeg`→`arcEndDeg` (135°→45°), center displacement `L + D·cos(ang)` (0→2L), height `D·sin(ang)` where `L` = half-extent and `D = L·√2` — replacing the old smoothstep glide + sine hop (which slid the contact point). Linear arc sweep, no easing
- **Cadence now derives from each type's speed** (TUNING.flop): `cycle = 2L/speed`, flop lasts `min(0.30, cycle·0.65)`, rest for the remainder — average ground speed stays exactly the configured speed; fast minis scurry with quick flops, slow SLUDGE does a heavy flop… pause… flop rhythm (was: fixed 0.06s rest between back-to-back flops for everyone)
- Landing squish now `TUNING.flop.landSquish` (0.32, was 0.5); land-flat orientation reset kept; direction-picking and wall bouncing untouched
- **Two latent bugs fixed by the same math**: cubes rested at `y = radius` but their box half-extent is `0.9·radius` — every cube hovered slightly off the floor; and stride/rest-height ignored `_radiusMult`, so elite/boss cubes sank into the ground and understrode their own body width. Both now use `L = 0.9·radius·mult`
- Cube family also gets the gentle at-rest breathe from the lab (`TUNING.flop.breatheAmp` 0.10) between flops; `_phase` desync moved to common init
- Cache-bust `?v=37` → `?v=38`; HUD label → v84

---

## v83 — 2026-07-03
**Death particles match the family: cube-looking chunks only from cube enemies**
- The pooled chunk system used one deliberately low-poly `SphereGeometry(1, 5, 3)` for every burst — at 5×3 segments it reads as an angular cube-ish nugget, so *every* enemy appeared to shatter into cubes (the reported issue)
- Split into two instanced pools: the angular pool now serves only the **cube family** (YELA/ORANGE/SLUDGE/REDD/PURP + minis) and hard shards (gate dash-through burst); a new smooth-droplet pool (`SphereGeometry(1, 9, 7)`) serves **blobs, TORO, BAMBU, PYRA, OMEGA, pickup pops, and moth kills** — goo bursts into round droplets, still 1 draw call per pool
- Routing via a `chunksFor(type)` helper on every spawn site (death chunks, non-fatal hit sparks, BAMBU segment/PYRA hole pops)
- GDD: new **Backlog** section — flying homing bots (slow homing shots) + removing Homing from the player weapon roster when they land, and port Parts 3–6
- Cache-bust `?v=36` → `?v=37`; HUD label → v83

---

## v82 — 2026-07-02
**Port brief Part 2: blob gel-dome geometry, per-blob silhouettes, grounded drag + motion tells**
- **Blob geometry replaced**: all 5 blob types now share one SDF-generated gel dome (most of a ball with a flat rounded-off bottom, `smax(|p|−1, −y−domeCut, domeRound)`, shrink-wrapped 72-detail sphere — exact port of `enemy-lab.html`'s `blobGeo`) instead of per-instance `SphereGeometry`. Origin at the floor contact point → rest y=0 and every squash/breathe/drag anchors to the ground
- **Per-blob silhouettes** (TUNING.blob): squat baseline {1.05, 0.82, 1.05}; SPITTOR snouty (long Z), FANNER wide flat pancake, WEEVA taller drill dome
- **Grounded drag** (all blobs): body yaws to face motion, stretches along travel, nose lifts / rear drags (`drag = min(speed×0.10, 0.35)`); replaces the old world-space `uStretch` shader smear (the goo wobble + hit-ripple shader paths are kept unchanged — ripples now radiate from the contact point)
- **Motion tells**: GLOBBO lunging-slime speed pulses while stalking (pounce machine from v58 kept — the brief's tell layered on, not replacing gameplay); SPITTOR inflates +22% over 0.45s before firing (was flat +35%/0.6s) and recoils 0.18 on fire; WEEVA ±3% scale vibration at 40Hz; FANNER sways `rotation.z` at 7Hz; SPLITTA's two children visibly bulge inside before the split; whole-body breathe (0.13 / 0.18 SPLITTA)
- **Fixed enemy-lab.html crash**: the lab referenced `smin` without defining it (`ReferenceError` on load — it can't ever have rendered); added the standard polynomial smooth-min the brief specifies
- Blob y-anchor plumbing: new `Enemy.fxY` getter keeps damage numbers, hit sparks, death chunks, motion-trail ghosts, and HP bars at mid-body height now that blob `position.y` is 0
- Created `CLAUDE.md` (brief's verify step): tuning.js single-source-of-truth note + versioning/release conventions
- Cache-bust `?v=35` → `?v=36`; HUD label → v82

---

## v81 — 2026-07-02
**Pause-menu rework: SETTINGS page (volume + reduce-motion moved from title) + ENEMY LAB launcher**
- The pause menu's left list now has a **⚙ SETTINGS** page above an "ENEMIES" group of the existing per-enemy tuning pages; the menu opens on SETTINGS (players pausing mid-run mostly want volume/motion — tuning is one tap away)
- **VOLUME slider and REDUCE MOTION toggle moved from the title screen into the pause menu** (the standing request from v77's "sound bar seems like a menu item"): state + persistence stay in `main.js`, the menu reads/writes through getter/setter accessors passed to `initDesigner`; localized labels reused (en/ja/fi, new `settings`/`settingsHint` keys)
- Title screen slimmed accordingly — keeps orientation/roguelike/language/run-history plus a faint "settings are in the pause menu (⏸)" pointer
- **OPEN ENEMY LAB ↗** button on the SETTINGS page launches `enemy-lab.html` (deployed since v80) in a new tab — the visual reference for the Parts 2–6 enemy overhaul; noted in-menu as a separate page that doesn't affect the run
- Full Part 6 (live TUNING tuner with material presets/sliders) deliberately deferred until Parts 2–5 wire those visuals into the game — sliders bound to nothing would be noise
- Cache-bust `?v=34` → `?v=35`; HUD label → v81

---

## v80 — 2026-07-02
**Landscape crop fix (scrollable overlay + rotation-safe canvas) + TUNING wiring goes live**
- **Death/title overlay no longer crops on short landscape screens** (the reported bug — phone/PC in landscape cut off the game-over stats at the top and the feedback buttons at the bottom, with no way to reach them since `body` has `overflow:hidden`): `#overlay` now caps at `100svh`/`100vw` and scrolls internally (`overflow-y:auto`, `touch-action:pan-y`). Scrolling works because v53 already exempted `#overlay` touches from `preventDefault` and `showGameOver()` sets `pointerEvents:auto`
- **Rotation dead-strip fix**: some phones fire `resize` before the rotated dimensions settle, leaving the canvas at the old size (black strip on one edge). Added `orientationchange` re-resize (immediate + 250ms + 600ms) and a `visualViewport` resize listener; `viewport-fit=cover` added to the meta viewport so cutout letterboxing stops reserving a dead strip
- Verified numerically (projected all arena corners at aspects 0.46–2.16) that the 3D camera itself was NOT the crop cause — the arena fits the frustum at all common landscape aspects, so camera framing is untouched
- Ships v78 (tuning.js/enemy-lab/port-brief assets) and v79 (Part 1 TUNING wiring) — both behavior-neutral
- `scripts/bump-version.sh` now includes `enemy.js` in the cache-token loop (it carries the `tuning.js?v=` import since v79)
- Cache-bust `?v=33` → `?v=34`; HUD label → v80

---

## Archive

**v70–v79 summary (2026-07-02)**
- v70: New Homing weapon pod (H/H2) — 10th weapon type; `spawnDir` homing/turnRate params
- v71: OMEGA boss-exclusive enemy (crystal core, orbit+fan → enraged radial ring); fixed `_radiusMult` being erased by the squash-spring each frame
- v72: Score Multiplier powerup (gold orb, 2x kill-streak score 10s) — 4th gate drop
- v73: Per-blob accent beacons (bulletColor-matched) — 5 blobs readable at a glance
- v74: Wave-clear white flash + wired up the never-called `audio.waveClear()` chime
- v75: Settings — volume slider (master gain) + reduce-motion toggle, persisted
- v76: Run History panel — top 10 runs by score from existing `pb.runs` data
- v77: Title/pause polish — smaller controls block, chip-styled volume, "PAUSED" title, VISUAL tab removed
- v78: Added tuning.js + enemy-lab.html + port brief as assets (no wiring)
- v79: Port brief Part 1 — enemy.js reads 12 exact-match constants from TUNING (BAMBU cooldown/segments, YELA/SLUDGE trail+poison cadence, 8 TORO state constants); mismatched/not-yet-built values left hardcoded; zero behavior change

**v61–v69 summary (2026-06-30 – 2026-07-02)**
- v61: PURP_CUBE 2-arm spiral fire with per-cube spin rate/direction
- v62: Boss enrage fixed to actually speed up TORO's charge behaviour (was visual-only)
- v63: Positive feedback chip row ("WHAT DID YOU ENJOY?") added to the death screen
- v64: Language toggle — English/日本語/Suomi, `lang.js` i18n module
- v65: Full localization — on-canvas HUD + roguelike upgrade cards now translate
- v66: Language picker — three chips shown at once instead of a cycling button
- v67: Smaller death-screen buttons + hidden "fix" feedback list (`tokoDropFixList`, `_fixlist()`)
- v68: Feedback chip rows trimmed from 6 to 4 each
- v69: Fixed WEEVA (unscaled 12.5 bullets/sec from wave 2) and PURP_CUBE (doubled bullet output) — real cause of wave 8 being unreachable

---

**v50–v60 summary (2026-06-30)**
- v50: Feedback form interactivity fix — `showGameOver()` sets `overlay.style.pointerEvents='auto'`; reset in `returnToTitle()`
- v51: ORANGE_CUBE shoots while moving (state machine → flop + `_fireT`); all bullet visual scales reduced ~30%
- v52: Contra-style weapon pods — moths drop lettered pods (S/B/L/R + Lv2), 8 weapon modes, kill-all 2-choice pod pair; `equipWeapon()`/`makeGlyphTexture()`
- v53: Fix feedback buttons on mobile — added `#overlay` to InputManager `inUI` exclusion so `touchend` preventDefault no longer eats synthetic clicks
- v54: Revert bullet sizes to pre-v51 bullet-hell scale (player 1.0, enemy 1.25, fat 3.0)
- v55: No-cache meta headers on `index.html` to fix stale mobile caching
- v56: Gate laser beam aligned with its posts — rotate by `-(angle+π/2)` (three.js Y-rotation flips z)
- v57: Bigger readable bullets (enemy 1.6; player visual-only ×1.3 `PLAYER_BULLET_VISUAL_BOOST`, hitbox unchanged) + `scripts/bump-version.sh` & `scripts/release.sh`
- v58: Blob behaviour pass — GLOBBO pouncer, WEEVA drifting spiral turret, SPITTOR aimed ring, FANNER wide 3rd volley, SPLITTA low-HP pre-burst pulse
- v59: Boss identity — pulsing gold ground ring (`makeBossAura`) + enrage (×1.45 speed, red ring) below 35% HP via `Enemy.setBoss()`
- v60: SLUDGE_CUBE poison zone hazard readability — pulsing rim while lethal, desaturates when spent

**v40–v49 summary (2026-06-29 – 2026-06-30)**
- v40: Cube behaviour variety — each cube type is now a distinct archetype (YELA/minis rush, REDD flanks, PURP orbits+spiral, SLUDGE zones, ORANGE positions+shoots); `_flopMove` generalised with per-type heading
- v41: Hit-event telemetry system — every HP-loss records a snapshot (wave, time, source, attacker, dash-ready, enemy counts, upgrades); `_hitReport()` / `_hitLog()` / `_hitExport()` console helpers; `tokoDropHitLog` localStorage
- v42: Bullet origin tracking — `Bullet.originType` field; all enemy `spawnDir` calls pass `this.type`; `_hitReport()` shows exact attacker type with %
- v43: ORANGE_CUBE flop + difficulty ramp rebalance (budget 8+w×3.3 → 5+w×1.8; caps grow with wave; speed/fire gentled)
- v44: Enemy separation — post-update O(n²) pass pushes overlapping pairs apart by half-overlap; 2 passes per frame; flopping cubes anchor-nudged to keep tumble animation consistent
- v45: Four bug fixes — ORANGE_CUBE flop constructor `else if` → `if`; TORO `rotation.x = Math.PI/2` → `0` (upright wheel); gate laser BoxGeometry enlarged; gate-clearing removed from `spawnWave()` (cap at 2 active)
- v46: BAMBU growth (3 segments instantly, `_growTimer` 0.18) + lob charge-orb animation; bullet-hell style bullets (white halo + core, no trail); death-screen feedback form (predicted chips + free-text, `tokoDropFeedback`); `returnToTitle()` dismisses death screen
- v47: ORANGE_CUBE movement fix — `_orangeTarget()` picks a reachable ring-point ±10; arrival threshold 2.2 → 2.6; 5 s move-timeout
- v48: Cache-bust entire module graph — `?v=3` → `?v=4` on entry + all relative imports so browser/CDN refreshes; HUD label → v48
- v49: Real per-axis flop bounds (`halfX`/`halfZ` replace hardcoded H=17.5); dead `restartTimer` removed; `?v=4` → `?v=5`

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
