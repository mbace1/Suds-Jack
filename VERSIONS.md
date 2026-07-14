# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v157 — 2026-07-14
**BINDING remake — Isaac-shaped rooms, roster, and choices (cabinet overhaul #3, user direction)**
- **Room layouts**: every fight room draws a seeded ROCK pattern — four pillars, center cross, diagonal ring, flanking bars, or scattered boulders — that blocks bullets and bodies both ways (the dungeon wall kit, applied to the basement)
- **Four cabinet-only enemies, ALREADY IN THE ROOM when you walk in** (no door pours — the reference's room contract): **FLIT** — hovering mote orbiting a slowly shrinking ring, wallpaper alone, a closing net in a swarm; **SPITTLE** — gel spitter waddling in pulses, 3-shot arcs; **CHARGER** — bone knight that prowls until you cross its lane, rattles a 0.45 s tell, charges flat out, stuns itself; **HOPPER** — squat tell → ballistic hop, harmless in the air, dangerous where it lands. Compositions scale per floor; bosses keep the full smash boss
- **REAL branching doors**: between the item/boss cadence beats, each exit door rolls its OWN room kind — the door you take is the choice you made (roadmap backlog item)
- **Hearts economy**: basement kills sometimes drop a fast-fading suds-heart — the item build is the run, hearts keep it alive long enough to matter (cash drops stay out of the basement)
- Base gun + dash untouched (user: "very similar base gun"); tester lists all four
- Cache-bust `?v=110` → `?v=111`; HUD label → v157

---

## v156 — 2026-07-14
**GAUNDROP remake — a real dungeon crawl (cabinet overhaul #2, user direction)**
- **Real tile mazes**: every level carves a fresh dungeon on a seeded grid — wide drunkard-walk corridors, three wired-in room clearings, extra loop openings, merged stone runs. You enter at the near corner; the **exit waits at the far one, LOCKED from level 2 — find the KEY** (red tile flips gold, `LOCKED — FIND THE KEY` pings if you jump the gun)
- **Two cabinet-only enemies**: **GHOST** — one-hit shroud that streams straight at you and spends itself ON you (1 HP each, no score; the stream is the threat); **WRAITH** (level 3+) — the dungeon's dread: phases THROUGH walls, bullets pass through it, costs 1 HP on touch then dissipates. Route around it or feed it and run
- **Generators pour ghosts** (faster with depth, per-generator rate), **BAMBU lobbers** arc shots over the walls from level 2, deeper levels add REDD_MINI generators
- **Hunger drain** (the reference's signature): the dungeon ticks you down — starving costs 1 HP with a `STARVING — EAT SUDS!` warning; **suds food = time** (resets the clock, HUD shows a pulsing countdown under 10 s). **POTION** pickup clears the whole floor (generators excepted)
- HUD level line (`LEVEL N — FIND THE KEY / EXIT OPEN`); tester lists both new types; shooting + dash untouched
- Cache-bust `?v=109` → `?v=110`; HUD label → v156

---

## v155 — 2026-07-14
**TOKOTRON remake — its own roster, its own pacing (cabinet overhaul #1, user direction)**
- **Robotron pacing for real**: the ENTIRE wave materializes AT ONCE around a recentered player (spawn flashes, 1.4 s of grace, no trickle) on **scripted 8-wave loops** that escalate per loop — brute waves, minder waves, orb hells all have their own beat
- **Five cabinet-only enemies** (never in the classic pool): **GRUNT** — straight-line swarm walker that speeds up the longer it lives (the wave's clock); **BRUTE** — unkillable hulk, bullets only shove it, hunts civilians, waves end around it; **ORB** — rim-runner that avoids you while strobing out up to 3 **PROG** hunters (strafing aimed-shot turrets); **MINDER** — the converter: grapples a civilian for ~1 s (glow tell) and reprograms it into a hostile PROG — kill it mid-grapple to break the conversion
- **Civilian family variety**: kid (small, quick, panicky), tall (steady), elder (slow amble) — silhouettes, colors, and wander speeds differ; the rescue chain stays the reward
- Orange cubes remain honored guests; new types wear their own neon (danger-red grunts, amber brutes, brain-purple minders); tester lists all five
- Toko shooting + dash untouched (user boundary)
- Cache-bust `?v=108` → `?v=109`; HUD label → v155

---

## v154 — 2026-07-14
**Roguelike B: ALL the cabinets are bonus quests (user direction)**
- The gold rare card now **rotates through the whole cabinet row**: BONUS GAUNTLET → **TOKOTRON RAID** (survive 2 flood waves) → **GAUNDROP DELVE** (find the exit of one dungeon level) → **LOADOUT OP** (complete 2 missions with the build you brought) → **BASEMENT DETOUR** (clear 3 basement rooms) — then back around, gauntlet tiers still ramping. Declining a quest keeps the same offer for the next card screen
- Each quest borrows its cabinet's **full machinery mid-run** — look, RetroPass profile, spawn systems, walls/generators/civilians/rooms — with the gauntlet's pinball multiplier (×2, +1 per beat) applied to kills, pickups, and clears, a **BONUS QUEST ×N tag** on the HUD, and a **RARE pick + 3000×mult payout** on completion
- Everything borrowed is handed back on completion AND on death (records stay tagged `roguelike`); classic waves resume right where the detour began
- en/ja/fi quest card strings
- Cache-bust `?v=107` → `?v=108`; HUD label → v154

---

## v153 — 2026-07-14
**Cabinet row — the arcade cabinets become a single-select mod (user direction)**
- The four stacked launcher chips on the title are now **one compact CABINET row** (TOKOTRON / GAUNDROP / BINDING / LOADOUT): pick one — only one can be armed at a time — and **TAP TO START plays it**; tap the active chip again to go back to classic. Selection persists (`tokoDropCabinet`)
- The same selection lives in **OPTIONS right under SMASH TV** as a CABINET cycle button (OFF → TOKOTRON → GAUNDROP → BINDING → LOADOUT), colored per cabinet with the cabinet's own hint line
- All four start paths (tap, Space, pad A, Start) route through the selected cabinet; gamepad menu nav picks up the new chips automatically
- Groundwork for Roguelike B cabinet bonus quests (next) and the per-cabinet remakes
- Cache-bust `?v=106` → `?v=107`; HUD label → v153

---

## v152 — 2026-07-14
**LOADOUT — cabinet #4 (Re-Loaded tribute): pick your kit, run the missions**
- **LOADOUT chip on the title** (toxic-green launcher): military gunmetal look — near-black olive floor, toxic-green vector bounds, desaturated Lambert enemies, pale-olive player with green dash ghosts, own RetroPass profile (320p nearest pixels, 24-level posterize, mild glow + scanlines)
- **Pick your loadout at the door**: run starts with a 3-of-4 kit pick — GUNNER (twin spread + fire rate), LANCER (laser + pierce), RUNNER (rapid + speed), JUGGERNAUT (heavy burst + HP); each kit = weapon pod + matching perk. A fresh pick is offered every 2nd mission
- **Mission objectives, not waves**: rotating scripted goals with a MISSION banner and a live objective line on the HUD — **PURGE** (wipe the flood), **DEMOLISH** (destroy the generators dug in behind cover), **HOLD OUT** (survive the timer while enemies trickle in). Cover walls block bullets and bodies both ways; mission clear pays a wave-scaled bonus and wipes the field
- Reuses the Gaundrop kit (walls, generators) with its own placement; skips gates/bounty/foam/daily like the other cabinets; records tagged `loadout`
- Cache-bust `?v=105` → `?v=106`; HUD label → v152

---

## v151 — 2026-07-14
**Cabinet graphics pass — per-cabinet renderers, materials, and sprite-era stepped animation (roadmap M5)**
- **New `js/retro.js` — the RetroPass post pipeline**: scene renders into a per-cabinet low-res target, then a fullscreen shader applies the cabinet's treatment — bright-pass **glow**, contrast/saturation grade, **NES 16-color palette quantization**, **32-level posterize with ordered dither** + paint pre-blur, and subtle **scanlines** aligned to internal rows. Zero cost when no cabinet is active; classic + SMASH render byte-identical
- **Per-cabinet art (user direction)**: **TOKOTRON** = vector monitor — near-black Lambert faces + **additive inverted-hull neon shells** (cyan player, pink cubes with crisp edge line-work, teal blobs, amber heavies), fog removed, 0.7× res with linear upscale so the lines glow instead of pixelate, high contrast. **GAUNDROP** = NES — every material color **snapped to a real 16-entry NES palette**, whole frame quantized to the same table, 240p-class pixels. **BINDING** = paint-meets-16bit — satin kept but desaturated toward flesh, soft pre-blur + SNES-depth posterize at 400p
- **Sprite-era stepped animation** (12 Hz, cabinets only): the shared shader clock, every enemy wobble/strobe oscillator, cube flops (rotation steps through 4 sprite frames — positions stay smooth so collisions are untouched), the player's dash flicker (square-wave blink) and dash-ghost fades all step; gameplay, input, and movement stay 60 fps. **Dash ghosts wear each cabinet's neon**
- PIXEL PREVIEW (DEV) now previews the shared retro pass; the old 0.22-DPR trick is gone. Flat-lit cabinets skip the shadow pass entirely (faster than classic). retro.js registered in bump loop + sw.js precache
- Cache-bust `?v=104` → `?v=105`; HUD label → v151

---

## v150 — 2026-07-13
**THE BINDING OF TOKO — cabinet #3 (Binding of Isaac tribute): rooms, floors, and an item economy**
- **BINDING OF TOKO chip on the title** (fleshy-pink launcher): basement-gloom look (dark red-black, fleshy red vector bounds, pixel rendering), built directly on the SMASH room lattice — doors, exits, minimap, entry-from-opposite-wall all work room to room
- **The Isaac loop, item-first** per the user's direction: every ~3rd room is an **ITEM ROOM** — no enemies, doors already open, one glowing `?` pedestal mid-room; touching it opens a **free 3-card upgrade pick** and returns you to the same room. Every 6th room is the **FLOOR BOSS**; clearing it pays a **RARE pick on the spot** and the next door starts a new floor (`BINDING — FLOOR N` banners). Mods stack for the whole run — the build IS the run
- Normal/swarm/heavy rooms use the full smash composition (shooters, wardens, valuables, prizes) so the combat depth carries over; the room script is seeded, doors advertise what's next
- Card panels gained an `afterPick` mode (free picks don't chain a new wave); the gauntlet card never appears inside the basement; runs tagged `binding`; every borrowed toggle restored on exit
- VERSIONS: v141–v149 archived (decade rule)
- Cache-bust `?v=103` → `?v=104`; HUD label → v150

---

## Archive

**v141–v149 summary (2026-07-13)**
- v141: SIREN — screamer support; 0.8 s inhale tell → 1.6× speed surge to the pack within 7 units
- v142: TEST MODE (OPTIONS → DEV) — all enemies from wave 1 with a budget floor; runs leave no records
- v143: CLOAKER — shimmer-flanks ~90°, 0.6 s decloak tell, aimed 3-burst; still hittable while cloaked
- v144: MAGNA — amber tether pull (1.1 u/s within 11); dash grants ~1.2 s immunity; stacked cap 2.0
- v145: Elite affixes — VOLATILE (fuse glow → 8-bullet death ring), SWIFT (1.35× + ribbons), ANCHORED (shove-immune)
- v146: ROGUELIKE B — OFF→A→B chip; BONUS GAUNTLET rare card: scripted smash rooms with pinball multiplier (×2+1/room), rare-upgrade payout, tier 2 mega-boss; fixed a smash double-clear-bonus bug
- v147: Arcade Tribute Wing designed (roadmap M5, five cabinets, 2P goal, IP rule) + PIXEL PREVIEW toggle (0.22× nearest-neighbor world, crisp HUD)
- v148: TOKOTRON — cabinet #1 (Robotron tribute): dark vector room, flood waves, civilians (1000×chain rescues)
- v149: GAUNDROP — cabinet #2 (Gauntlet tribute): torchlit maze levels, wall cover, enemy generators, suds food, gold exit tile

**v131–v139 summary (2026-07-12 – 2026-07-13)**
- v131: Trust-based daily leaderboard — `scripts/leaderboard-sheet.gs` (plausibility caps, 60 s GET cache) + death-screen DAILY TOP 10 with explicit initials + POST (zero UI until LEADERBOARD_ENDPOINT is set)
- v132: Visual feedback round — death pop tinted/smaller/faster-fading (no more white panels), organic slime pools + undulating sludge ribbon + BubblePool fumes, glyph badges on every pickup
- v133: Secondary objectives (GDD §9b) — BOUNTY marked targets (8 s window → cash + guaranteed pod) and CLEANSE foam zones (hold ~1.2 s → full-screen bullet cleanse paying per bullet)
- v134: Controller menu navigation — geometric gold-outline focus across every menu; A activates, B backs out; sliders adjust with left/right
- v135: SMASH TV floor chevrons at telegraphing doors (window 0.9→1.4 s), no spawns from the player's entry door in a room's opening seconds, pickup expiry blink (last 2.5 s)
- v136: OMEGA gained 3 HP-phases (fans / NEW twin-arm spiral / ring rage) with strobing transitions; 1.5 s wave breather with WAVE CLEAR banner; hi-res always-on-top pickup badges (boss act field renamed `_bossPhase` — collided with the wobble-phase offset)
- v137: ANNOUNCER VOL. slider (independent of master) + sustained-fire shot-noise ducking to 50% over ~2.5 s
- v138: Gates teach themselves — pulsing DASH THROUGH! tag until the first-ever gate detonation (persisted)
- v139: Death screen down to two buttons — CONTINUE flips to SEND & CONTINUE when there's anything to send; SKIP removed; content milestones M4–M6 designed on the roadmap; real-device pass done

**v120–v129 summary (2026-07-07 – 2026-07-12)**
- v120: SMASH TV design round two — risk-priced exits (HEAVY 2×$, pod-poor PRIZE$ rooms), greed prize placement near doors, shooter entrance "!" pings (both modes), room-transition black dip, PWA install (manifest + icons)
- v121: Recorded announcer intro on the title — ffmpeg-processed `announcer-intro.mp3` (bass boost / presence EQ / PA slap / compression / stereo widen)
- v122: FIX — intro voice actually plays: own INTRO VOICE toggle (default on) + gesture-safe triggers (toggle flip, OPTIONS resume, post-run title)
- v123: Classic wave rhythm made readable — color-coded wave banners (normal/SWARM/HEAVY/BOSS!) + boss klaxon in both modes
- v124: WARDEN shield-bearer (aura makes nearby enemies bullet-immune; never shields itself), live scoring feedback (streak heat tiers, 2× multiplier tag + drain bar, 25k milestone popups), GDD §2 no-interruption boundary recorded
- v125: GRAZE — near-misses while vulnerable pay +25 (dash i-frames don't); WARDEN escorts under late bosses
- v126: FIX — OMEGA clamped inside the walls (could be pushed out through SMASH TV doors); feedback chips refreshed to probe the new systems (warden blocks, room exits, rooms/loot/graze positives)
- v127: SHARE button on the death screen (native sheet / clipboard) + first-run tutorial hints (move/aim/dash/graze, input-aware, non-interrupting)
- v128: Offline PWA — `sw.js` precaches the module graph at install; cache-first for tokened URLs, network-first shell; cache name rotates with the ?v= token
- v129: FIX — powerup GPU leak (undisposed sphere geometry/material per pod, orphaned spheres on cash/prize swaps); auto perf-mode at sustained low FPS; perf mode also drops the shadow pass; FPS-EMA tab-switch guard; OPTIONS-rotation arena refit

**v110–v119 summary (2026-07-04 – 2026-07-06)**
- v110: FIX — arena always follows the viewport (stale ORIENTATION-chip choice pinned vertical maps onto landscape screens); toggle removed
- v111: Landscape camera re-framed — symmetric top/bottom margins, ~19% more arena on screen
- v112: Aspect-aware landscape zoom — fitPresetCamera() dollies in until the arena just fits the viewport
- v113: FIX — death screen fits landscape (compact @media block; chips/textarea/buttons all on screen)
- v114: SMASH TV feel — glowing door telegraphs, room-long door bursts, kill-drop floor cash, wave intro card, applause
- v115: SMASH TV rooms — fixed studio-room size both orientations, post+lintel door frames, walk-out EXIT doors entering the next room from the opposing wall, 3×3 traversal minimap with room kinds (MOBS/SWARM/HEAVY/PRIZE$/BOSS!)
- v116: Composed waves (both modes) — melee mobs flood, shooters capped/spaced/spread as tactical problems; floor valuables (cash piles, big prizes, rare multipliers)
- v117: SEND & CONTINUE posts feedback + run summary to a Formspree inbox (explicit consent, fire-and-forget)
- v118: QoL — vendored three.js (no CDN), Sheets-ready feedback (scripts/feedback-sheet.gs + SHEET_ENDPOINT), loot value popups, bill-stack/gift-box valuables meshes, BOSS IN N, favicon + OG tags
- v119: FIX — cache-bust vendored imports (Pages edge caches 404s ~10 min; the brand-new vendor/ path black-screened right after the v118 deploy)

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
