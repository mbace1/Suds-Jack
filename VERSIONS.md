# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v116 — 2026-07-05
**Composed waves — mob floods stay, shooters become deliberate; floor valuables with rare multipliers**
- **Wave design (both modes)**: the schedule is now composed from two pools. **Melee mobs flood** (groups/twins of cheap bodies — the fodder you mow), while **shooting enemies are placed deliberately**: capped (1 at wave 1 → 5 by wave 12; swarms allow 1, boss waves 2), arriving spaced ~3s apart, and given **maximally separated positions** — spread entry angles in normal mode, different doors in SMASH TV — so their fire lanes cross the arena and each shooter is a prioritisation problem, not part of the noise. Shooters no longer appear in the random mob draw at all
- **Floor valuables (SMASH TV)**: 3-6 items scattered per room — everyday **cash piles** (small orb, 150 + wave×10), occasional **big prizes** (large orb, 1000 + wave×50, ~14%), and a **rare score-multiplier orb** (~4%). They lie there the whole room; walk over them. Values carried per-item (`pu._value`), doubled by an active multiplier; kill-drop nuggets unchanged
- Spawn schedule now explicitly sorted by delay (shooter/mob interleave broke the drain queue's ordering assumption)
- Cache-bust `?v=69` → `?v=70`; HUD label → v116

---

## v115 — 2026-07-05
**SMASH TV rooms: fixed studio-room size, real door frames, walk-out exits with a minimap room choice**
- **One fixed room size in both orientations** (new `smash` arena preset, 30×22 ≈ the show's 4:3 room); `fitPresetCamera()` (generalized from v112) fits it to whatever screen you hold — portrait just views it from farther out. Toggling SMASH TV on the title reframes the arena immediately
- **Real doorways**: the glow quads grew posts + lintel frames — enemies now spawn AT the door mouth and visibly step through into the room
- **Room traversal like the show**: clearing a room no longer chains straight to the next wave — 2-3 **EXIT doors open (green)**, a **ROOM CLEAR! / BONUS** tally card shows, and you **walk out through a door of your choosing**; the next room starts with you entering through the **opposing wall** (brief mercy window). No backtracking through the wall you came in from
- **Educated moves**: rooms live on a 2D lattice with deterministic per-run kinds — each EXIT door and the **zoomed 3×3 minimap** (top-right, live player dot, visited-room marks) show what's behind it: MOBS / SWARM / HEAVY / **PRIZE$** (lighter wave, 3 convoys) / **BOSS!** (every 8th room, all exits lead there)
- Announcer gets exit lines ("THE DOORS ARE OPEN — MOVE!"); room intro card now names the room kind
- Cache-bust `?v=68` → `?v=69`; HUD label → v115

---

## v114 — 2026-07-05
**SMASH TV mode actually feels like the show — visible doors, room-long door bursts, floor cash, intro card, applause**
- **Visible doors**: four glowing doorway quads at the arena edge midpoints (matching the spawn angles). Dim while idle; a door **flares up in the ~0.9s before a burst pours through it** — the show's "they're coming through THAT wall" telegraph. Built at run start, torn down with the run
- **Room-long door bursts**: instead of dumping most of the wave up front, entries now arrive as bursts of ~3 every ~2-3s from ONE door at a time (walking around the room). The wave can't end while bursts are still queued — the room keeps pouring; clearing between pulses just buys a breather
- **Cash on the floor**: kills have a 15% chance to drop a score nugget that lies where the enemy died for 6s — walk over it. Big money. Big prizes
- **Game-show wave intro**: big "WAVE N" (or "WAVE N — BOSS!") card flashes on the HUD at each room start
- **Applause**: staggered noise-burst crowd swell on room clear (through the master volume)
- All of it gated on the SMASH TV toggle; normal mode untouched
- Cache-bust `?v=67` → `?v=68`; HUD label → v114

---

## v113 — 2026-07-05
**FIX: death screen fits landscape — compact layout on short viewports instead of hiding half below the fold**
- On a ~430px-high landscape phone the death screen was cut off mid-chips: the textarea and SEND/SKIP buttons were only reachable by scrolling (the reported "death screen not working for landscape")
- The `@media (max-height: 560px)` compact block now also covers the death screen: "YOU DIED" 52→28px, tightened stat/seed/heading margins, smaller chips (10.5px / 4px padding), chip rows widened to 620px so each fits one line on a wide screen, tighter buttons — the whole screen (score → chips → textarea → buttons) fits ~400px with no scrolling. Elements got classes (`d-title`/`d-sub`/`fb-head`/`fb-row`; `fb-chip`/`fb-btn` already existed) so the media query can override their inline styles
- Portrait death screen unchanged (media query only bites under 560px height)
- Cache-bust `?v=66` → `?v=67`; HUD label → v113

---

## v112 — 2026-07-04
**Landscape zoom is now aspect-aware — the camera dollies in until the arena just fits YOUR screen**
- v111's fixed landscape framing was capped by the 16:9 fit, leaving unused margin on wider phones ("still needs zooming in"). New `fitLandscapeCamera()` binary-searches the camera distance along the preset's view ray until the arena's four corners just fit the current viewport (|x| ≤ 0.96, |y| ≤ 0.93) — at 19.5:9 the camera comes in from dist 23.3 → ~19.8 and top/bottom margins drop from 0.305/0.326 to ~0.21/0.18
- Refits live: on rotation and any resize while on the title (camera-only, no geometry churn), and at every run start; a run keeps its framing mid-fight
- Same view ray/tilt as v111; 16:9 screens get the identical v111 framing (they were already at the fit limit). Portrait untouched
- Cache-bust `?v=65` → `?v=66`; HUD label → v112

---

## v111 — 2026-07-04
**Landscape camera zoomed in — arena's top gap now matches the bottom gap**
- The landscape camera framed the arena low: the far edge sat 0.63 NDC from the screen top while the near edge sat 0.22 from the bottom (the reported "blur bar on top" far from the edge). New framing (`camRest [0, 20.5, 13.5]`, `camLook [0, 0, 2.5]`) was solved numerically: top/bottom margins now 0.305/0.326 (symmetric) and the arena fills ~19% more of the screen height, same 3/4 view tilt (61.8° vs 59.3°)
- Fit constraint is the arena's near corners at 16:9 (x = −0.96); phone aspects (19.5:9, 2:1) have more side headroom. Portrait framing untouched
- Cache-bust `?v=64` → `?v=65`; HUD label → v111

---

## v110 — 2026-07-04
**FIX: landscape screens never get the vertical map — arena always follows the viewport, ORIENTATION toggle removed**
- v106's auto-orientation deferred to any explicit ORIENTATION-chip choice forever — so a stale saved "portrait" pick (from any past tap on the toggle) pinned the tall arena onto a landscape screen. Viewport aspect (`innerWidth > innerHeight`) is now the **single source of truth**: checked at boot, re-checked live on rotation at the title, and re-derived at every run start. Old `tokoDropLandscape`/`tokoDropOrientSet` saves are deliberately ignored
- The ORIENTATION toggle chip is gone from the title (there's nothing to choose — a manual pick could only ever create a mismatch); the title column gets shorter, which also helps landscape phones
- A running game still never swaps bounds mid-fight; rotating mid-run takes effect on the next run
- Cache-bust `?v=63` → `?v=64`; HUD label → v110

---

## Archive

**v100–v109 summary (2026-07-03 – 2026-07-04)**
- v100: Trail rework — afterimages spawn behind movers; SLUDGE poison is one continuous ribbon (PoisonZone invisible pure-damage)
- v101: Hand-brushed TOKO DROP logo on the title (yellow, cleaned); roguelike cards every 3rd wave
- v102: Logo glow — elliptical radial-gradient wash replaced the pink-square drop-shadow; logo alpha scrubbed
- v103: Pause menu simplified — settings-first, tester behind one button with VFX in the preview, plain-language knobs + LOOK presets + COPY MY SETTINGS
- v104: FIX — stale saved _bulletSpeed made enemy bullets crawl/fizzle; loadCFG ignores it
- v105: FIX — sludge ribbon crumpled at rest spots; distance-spaced timestamped points + 3s expiry + degenerate-tangent guard
- v106: FIX — landscape: auto arena orientation from viewport aspect (+ live rotation re-pick at title); title scrolls (data-ui tap guard) + compact @media(max-height:560px) layout
- v107: Player joins the satin look — makeSatinMat white blob; uStretch/uStretchDir added to the satin vertex inject; LOOK presets restyle the player
- v108: Audio for silent mechanics — BAMBU lob splash, BOTFLY homing-launch zip (Pages deploy needed a re-trigger, same transient as v94)
- v109: SMASH TV mode (4-door rush, +40% budget, prize-heavy drops, second convoy) + speech-synthesis arcade announcer + OPTIONS button on the title

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
