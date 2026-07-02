# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

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
