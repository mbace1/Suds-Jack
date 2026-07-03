# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v94 — 2026-07-03
**HOTFIX: game black-screened since v93 (SyntaxError in designer.js) + a real syntax gate**
- `designer.js:97` contained `function getPathfunction getPath(...)` — a stray fragment from the v93 tester refactor glued onto the real definition. `main.js` imports `designer.js` at boot, so the SyntaxError killed the whole module graph → nothing loaded
- **Why it shipped**: `node --check` silently exits 0 on ES modules (it only parses CommonJS) — every syntax check in the v79–v93 pipeline was a no-op. Diagnosed by loading the game in headless Chromium against a local three.js testbed, which surfaced the exact console error
- **New gate**: `scripts/check-syntax.sh` compiles every `toko-drop/js/*.js` as a real ES module (`vm.SourceTextModule`) — verified to catch this exact error — and `scripts/pre-commit` now runs it whenever game files are staged, so a parse-broken file can no longer be committed (re-install hook: `cp scripts/pre-commit .git/hooks/pre-commit`)
- Verified end-to-end in the headless testbed: full game boots to the title with zero console errors; the enemy harness (spawn all 17 types → 30 update frames → hit/kill pass) reports ALL OK
- Cache-bust `?v=47` → `?v=48`; HUD label → v94

---

## v93 — 2026-07-03
**In-menu enemy tester replaces the LIVE TUNING page — pause menu simplified**
- **Each enemy page now opens with a live specimen viewport**: the selected enemy spawns in a self-contained mini three.js scene embedded in the pause menu (own renderer/camera/lights/grid floor) — it moves, telegraphs, breathes, and wears the current CFG + TUNING + material values, chasing a ghost target. **HIT / KILL / RESPAWN** debug buttons poke it (HIT pops BAMBU segments and PYRA holes too); killed specimens play their death anim and auto-respawn. Zero contact with wave state — separate scene, stub bullet pool, no scoring/collisions, torn down on resume
- **LIVE TUNING page removed** (per request): the 31 behavior sliders are gone; the **material presets + 5 material sliders + COPY/APPLY TUNING JSON** moved to the bottom of every enemy page (behavior values remain reachable via APPLY PASTED JSON). Persisted `tokoTUNING` edits still load and apply
- **SETTINGS slimmed to volume + reduce-motion only** — the OPEN ENEMY LAB button moved next to the JSON tools as OPEN FULL LAB ↗ (the in-menu tester covers the common case now)
- `GOO_TIME` is advanced by the tester loop while paused so goo wobble stays alive in the preview
- Pause menu is now: ⚙ SETTINGS · ENEMIES (17 tester pages) — the requested structure
- Cache-bust `?v=46` → `?v=47`; HUD label → v93

---

## v92 — 2026-07-03
**Weapon pickup simplified: convoy-clear drops one pod, not a 2-choice pair**
- Clearing every moth before any escape now drops a **single random weapon pod** (same generous 12s pickup window) instead of two side-by-side pods where grabbing one deleted the other — the choice moment was more UI than fun and read poorly mid-swarm
- The reward structure is otherwise unchanged: full clear still guarantees a weapon (vs. the 55/25/20 pod/score/multiplier roll on partial kills)
- `_pairedWith` pickup-pairing plumbing removed (spawn, collection-dismissal, and field init) — the 2-choice mechanic has no other users
- Cache-bust `?v=45` → `?v=46`; HUD label → v92

---

## v91 — 2026-07-03
**Title-screen fix: stray vertical line + squeezed buttons (overlay scrollbar)**
- The reported vertical line on the intro screen's right side was the `#overlay` scrollbar introduced by v80's crop fix: on screens where the title content overflows `100svh`, `overflow-y:auto` + `scrollbar-width:thin` rendered a thin track, and its gutter narrowed the centered column — which is what shifted the button layout
- Overlay is now scrollable but chromeless: `scrollbar-width:none` + `::-webkit-scrollbar{display:none}` (touch/wheel scrolling unaffected), plus `overscroll-behavior:contain` so overlay scrolling can't chain anywhere
- No layout/geometry changes beyond removing the gutter — buttons return to their full-width centering
- Cache-bust `?v=44` → `?v=45`; HUD label → v91

---

## v90 — 2026-07-03
**Satin gel materials: TUNING.material goes live (MeshPhysicalMaterial port of the lab's satinGoo)**
- **Blobs and cubes now render with `MeshPhysicalMaterial`** — clearcoat, sheen, transmission, thickness/IOR, attenuation — driven by `TUNING.material` with per-family overrides (cube = firmer candy-glass: roughness 0.10, transmission 0.25). This is the lab's `satinGoo()` look replacing the custom goo `ShaderMaterial` (blobs) and `MeshPhong` (cubes)
- **Nothing animated was lost**: the goo vertex FX (radius-normalized lumps, directional hit ripple, pre-death tear) are injected into the physical material via `onBeforeCompile`, and the lab's soft-translucency glow (back-light SSS + wrap lighting) is added into the emissive term. Emissive flashes/telegraph tints and death fades work through the material's native `.emissive`/`.opacity`
- **Live restyling**: every satin material registers in a set (`SATIN_MATS`, pruned on despawn); `applySatinValues()` pushes `TUNING.material` onto all of them — so the LIVE TUNING page's new **MATERIAL PRESETS** row (SATIN/JELLY/GLASSY/CANDY/CLAY/NEON via `applyMaterialPreset`) and **5 material sliders** (SSS/roughness/clearcoat/sheen/transmission) restyle enemies already on screen. This un-defers the last piece of Part 6
- Player, TORO torus, BAMBU stalk, PYRA ring, OMEGA crystal keep their existing materials for now (the gel *families* were the scope; specialists can follow if the look lands)
- Preset/slider edits persist via the same touched-paths `tokoTUNING` mechanism
- Cache-bust `?v=43` → `?v=44`; HUD label → v90

---

## Archive

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
