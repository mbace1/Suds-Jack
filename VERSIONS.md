# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v109 — 2026-07-04
**SMASH TV mode + arcade announcer, OPTIONS button on the title**
- **SMASH TV MODE toggle**: enemies pour in tight bursts from **4 "doors"** at the arena edge midpoints (groups spill out of a single door instead of fanning 86°), every wave gets **+40% budget** with extra group entries and a 0.6× compressed spawn cadence, moth drops lean harder into prizes (40% pod / 30% score / 30% multiplier vs 55/25/20), and a **second prize convoy** runs each wave. Persisted (`tokoDropSmash`), applies from the next wave
- **ANNOUNCER toggle**: over-the-top game-show commentary via the browser's speech synthesis — original soap-themed lines in the arena-show spirit ("BIG BUBBLES! BIG PRIZES!", "TOTAL CLEANUP! I LOVE IT!") at wave start, boss entrances, 5-kill streaks, prize/score/multiplier pickups, player hits, wave clears, and game over. Deliberately **not** an imitation of any real person's voice — it uses the device's stock en-US voice pitched down (0.6) with excited pacing (1.12). Throttled to one line per 3s (game over/boss interrupt); respects the volume slider; silently no-ops where speechSynthesis is unavailable. Toggling it on speaks a mic-check line
- **OPTIONS on the title screen**: replaces the "settings are in the pause menu" hint — opens the same panel (headered OPTIONS, new `options` game state; RESUME/ESC returns to the title). Both new toggles live in its SETTINGS page under GAME SHOW
- Cache-bust `?v=62` → `?v=63`; HUD label → v109

---

## v108 — 2026-07-04
**Audio for the silent mechanics: BAMBU lob splashdown + BOTFLY homing launch**
- `audio.lobSplash()` — wet low thud (150→55 Hz sine) + a short splash of noise, played where main.js drains `_lobLanded`; the goo lob's landing was completely silent even though it damages inside the ring
- `audio.botShot()` — soft rising zip (380→1150 Hz triangle) when a BOTFLY launches its homing shot; previously the first warning a player got was the projectile already on their tail. BOTFLY sets a `_shotReady` flag in its fire block, drained in main.js next to the other per-enemy FX drains (same pattern as `_trailReady`)
- Both go through the existing `_tone`/`_noise` helpers, so the master volume slider applies
- Cache-bust `?v=61` → `?v=62`; HUD label → v108
- (Deploy note: the first Pages deployment of this version hit GitHub's transient "Deployment failed, try again later" — same as v94; this follow-up commit re-triggered it)

---

## v107 — 2026-07-04
**Player joins the satin look — same gel material as the enemies, LOOK presets restyle it too**
- The player was the last mesh on the legacy goo `ShaderMaterial`; it now uses `makeSatinMat(0xffffff, 'blob', r)` like everything else, so the whole cast shares one material system and the pause menu's LOOK presets (SATIN/JELLY/GLASSY/…) restyle the player live along with the enemies
- The satin vertex inject gained the **directional squash-stretch** displacement from the goo shader (`uStretch`/`uStretchDir`) — the player's walk lunge and dash elongation drive it every frame and would otherwise have been lost in the swap
- Dash/mercy flicker and the red hit flash now write the physical material's native `opacity`/`emissive` (same `uniforms ?? gooU` adapter pattern enemies use); wobble set gentler than enemy blobs (0.6× vs 1.0) so the hero reads calm
- Cache-bust `?v=60` → `?v=61`; HUD label → v107

---

## v106 — 2026-07-04
**FIX: landscape actually works — auto arena orientation from viewport + title fits/scrolls on short screens**
- The arena stayed portrait-sized on a landscape phone: the landscape preset only ever applied via the manual title toggle or a gamepad. Orientation now defaults from the **viewport aspect** (`innerWidth > innerHeight` → wide arena) when the player hasn't explicitly chosen, and **re-picks live on rotation** while on the title (`syncAutoOrientation()`, called from `resize()`; the gamepadconnected handler now routes through it too). An explicit toggle choice still wins forever
- Half the title screen was cropped in landscape: `#overlay` was `pointer-events:none` on the title, so the v80 scroll machinery couldn't work there. The title overlay is now interactive (reset on start); the window tap-to-start guard keys off `data-ui` on the actual chips/buttons instead of the whole overlay, and a touch that moved >12px counts as a scroll, not a start
- Short viewports (`max-height: 560px`) get a compact title: logo width additionally capped by height (43vh ≈ 26vh tall at its 1.64 aspect), tightened margins between the chips/help/language rows
- Cache-bust `?v=59` → `?v=60`; HUD label → v106

---

## v105 — 2026-07-04
**FIX: sludge ribbon crumpled (v100 regression) — distance-spaced points + age expiry**
- Trail points were pushed every 0.15s regardless of movement; since v84 SLUDGE moves in flop(0.3s)/rest(~1.3s) cycles, so rests filled the 12-point ring buffer with coincident points. The ribbon derives its quad orientation from consecutive-point deltas — near-zero deltas produced garbage perpendiculars, and at v100's full width (the ribbon is the sole visual now) it rendered as crumpled bowties stuck at rest spots with gaps between flops
- Points now push by **distance** (≥0.35 units moved), carry timestamps, and the ribbon **expires points older than 3s** (matching the poison zones' lethal window) so a resting SLUDGE's old ribbon can't outlive its hazard; coincident-segment perpendiculars reuse the previous direction instead of exploding
- Cache-bust `?v=58` → `?v=59`; HUD label → v105

---

## v104 — 2026-07-03
**FIX: enemy bullets back to normal speed (stale saved slider value was restoring on every boot)**
- The reported slow, early-fizzling enemy bullets weren't a code change to bullets at all: the old global **Bullet Speed** slider (menu, removed in v103) persisted `BULLET_CONFIG.enemySpeed` into `tokoCFG`, and `loadCFG()` silently restored it on every boot. A low value saved while exploring the old cluttered menu made bullets crawl — and since bullet lifetime is 4s, crawling bullets expired mid-arena ("dissipate early"). With the slider gone there was no visible way to recover
- `loadCFG()` now **ignores** `_bulletSpeed` from old saves and `saveCFG()` no longer writes it — enemy bullets always fly at the built-in speed (7). No RESET needed; the fix applies on next load
- Unused `BULLET_CONFIG` import dropped from designer.js
- Cache-bust `?v=57` → `?v=58`; HUD label → v104

---

## v103 — 2026-07-03
**Pause menu simplified: settings-first, tester behind one button, VFX in the preview, plain-language options**
- **Pausing now lands on a clean SETTINGS view with no sidebar** — volume, screen shake, performance mode, and one **OPEN ENEMY TESTER →** button. The 17-enemy list only appears once you're inside the tester (with a ← back item), and re-pausing always starts at settings
- **The tester preview now shows VFX**: HIT sparks goo droplets at the impact point, kills splatter droplets + leave a fading splat decal, and BAMBU/PYRA part-pops shed chunks — a tiny self-contained droplet system inside the tester scene (drains the enemy's queued chunk data), torn down with the menu
- **Options cut to plain language**: each enemy page is now the viewport + HIT/KILL/RESPAWN + up to three knobs — *Speed*, *Health (hits to kill)*, *Seconds between attacks* — plus the six one-tap **LOOK** style buttons (SATIN/JELLY/…) and a single **COPY MY SETTINGS** feedback button (tuned numbers → clipboard). Removed: hitbox-radius slider, global bullet speed, EXPORT CFG textarea, the 5 material-jargon sliders (SSS/clearcoat/sheen…), COPY/APPLY TUNING JSON textareas, and the OPEN FULL LAB link
- Preset picks still persist (`tokoTUNING`); header RESET still restores everything
- Cache-bust `?v=56` → `?v=57`; HUD label → v103

---

## v102 — 2026-07-03
**Logo glow: soft oval wash instead of the pink square**
- The v101 logo's neon glow used CSS `drop-shadow`, which (amplified by faint paper-texture alpha left in the PNG) read as a soft pink rectangle behind the lettering — the reported "pink in a square"
- Replaced with an **elliptical radial-gradient wash** behind the logo (red core → purple mid → fully transparent at ~74%), fading to nothing in an oval; the lettering keeps only a tight red drop-shadow for pop
- `logo.png` alpha scrubbed: residual paper-texture pixels (alpha < 25) zeroed so nothing outside the brush strokes can catch a glow
- Cache-bust `?v=55` → `?v=56`; HUD label → v102

---

## v101 — 2026-07-03
**Hand-drawn logo on the title screen + roguelike upgrades offered less often**
- **The title is now the hand-brushed TOKO DROP lettering** from the concept art (`toko-drop/logo.png`): cropped from the drawing, stray speed-lines/specks removed via connected-component filtering, strokes solidified, tinted yellow (#ffdd33) with the existing red/purple neon drop-shadow glow. `alt="TOKO DROP"` keeps it accessible; the old text title is retired
- **Roguelike pacing**: an upgrade card is now offered every **3rd** cleared wave instead of after every wave — with instant wave-ends chaining fast, the every-wave card picker interrupted constantly ("offered way too often")
- Cache-bust `?v=54` → `?v=55`; HUD label → v101

---

## v100 — 2026-07-03
**Trail rework: afterimages trail BEHIND movers; SLUDGE lays one continuous ribbon**
- **Motion-trail afterimages** now spawn one body-radius behind the mover along its velocity — previously they spawned at the mover's exact position, so each ghost was born inside/under the body and mostly hidden before it faded (the "trails are under the blobs" report)
- **SLUDGE's poison trail is a single continuous ribbon** instead of a chain of filled circles: `PoisonZone` is now an invisible pure-damage hazard (same lingering damage, same lethal window), and the existing `SludgeRibbon` is promoted to the one visual — widened to match the poison hitbox (`enemy.radius × 1.5` half-width vs the zones' ×1.8 radius), pulsing saturated green while the trail is lethal, fading out over 2s when the cube dies. The v60 "spent zone desaturates" read carries over: the ribbon's ring-buffer tail drops old points on roughly the same clock as the zones expire
- YELA's small slime dots unchanged (only sludge was the complaint)
- Cache-bust `?v=53` → `?v=54`; HUD label → v100

---

## Archive

**v90–v99 summary (2026-07-03)**
- v90: Satin gel materials — TUNING.material live via MeshPhysicalMaterial (blobs+cubes), goo vertex FX preserved via onBeforeCompile, presets/sliders restyle live
- v91: Title-screen fix — overlay scrollbar hidden (stray vertical line + squeezed buttons)
- v92: Convoy-clear drops a single weapon pod (2-choice pair removed)
- v93: In-menu enemy tester (mini-scene specimen viewport per enemy page, HIT/KILL/RESPAWN); LIVE TUNING page folded into enemy pages; SETTINGS = volume + reduce-motion
- v94: HOTFIX — v93 shipped a designer.js SyntaxError (game black-screened; node --check no-ops on ESM); added scripts/check-syntax.sh gate + headless testbed diagnosis; Pages deploy also failed transiently and needed a re-trigger
- v95: Gentler waves 1–5 (speed −0.012·(6−wave), budget ×0.85→×1.0; wave 6+ identical) + scripts/smoke.sh headless boot/harness test
- v96: Satin materials extended to TORO/BAMBU/PYRA/OMEGA + moths with per-family looks
- v97: PERFORMANCE MODE toggle — pixelRatio 1.25 + transmission off, reversible live
- v98: Removed the blob "eye" beacons (v73) — blobs read by silhouette + motion tell
- v99: SPLITTA — embedded bulges removed, always splits into exactly 3 GLOBBOs

**v80–v89 summary (2026-07-02 – 2026-07-03)**
- v80: Landscape crop fix (scrollable #overlay + rotation-safe canvas resize + viewport-fit=cover); shipped v78/v79 tuning prep
- v81: Pause-menu SETTINGS page (volume + reduce-motion moved off the title) + ENEMY LAB launcher
- v82: Port Part 2 — SDF gel-dome blob geometry (floor-contact origin), per-blob silhouettes, grounded drag, motion tells; fixed enemy-lab.html's missing smin (crashed on load); Enemy.fxY anchor plumbing
- v83: Family-matched death particles — angular chunks only from cubes; smooth droplet pool for everything else
- v84: Port Part 3 — rigid edge-pivot cube flop (arc 135°→45°), speed-derived cadence; fixed cube hover + elite stride/rest-height bugs
- v85: Port Part 4 — TORO rolls about its axle (5 rim spikes actually on the rim), exact-length telegraph with arrowhead; fixed hardcoded ±17 dash bounds escaping the portrait arena
- v86: Port Part 5 — BAMBU flared-cylinder bamboo tower + telegraphed parabolic lob with flashing landing ring (damage only inside the ring at impact); BambuAoE removed
- v87: Port Part 6 — LIVE TUNING pause-menu page (31 sliders into TUNING, copy/paste JSON, touched-paths persistence); port brief complete
- v88: BOTFLY flying homing bot (slow homing shots, charge-up tell); H/H2 pods removed — homing is enemy-exclusive; per-side homing steer in bullet.js
- v89: Moth drops diversified — 55% pod / 25% score nugget (250 + wave×25) / 20% Score Multiplier; convoy-clear 2-pod choice untouched


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
