# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v186 — 2026-07-18
**NEX DEUS gets its own boss — THE CUSTODIAN (39 types)**
- **Every 6th surge, the machine ITSELF steps in**: no rings, no lost players — a broad faceted diamond avatar with a silver SHEEN that shrugs every bullet (deflection sparks, shield telemetry)
- **The dash is the key, again**: dash THROUGH the Custodian to crack the shell (`SHELL CRACKED — UNLOAD!`) — for 3 seconds it takes damage like anyone, then the sheen reseals. The cabinet's verb opens its boss
- **The fight**: it drifts at you, then glitch-teleports on a strobing white tell and fires an aimed 5-fan on arrival; below 33% HP it enrages — faster teleports, radial rings, the standard phase machinery (aura, phase call, announcer)
- Its touch is melee, its emissive tells the whole story (silver sheen / white glitch strobe / open-shell red), and the glitch tile still hides on boss waves for the greedy
- Cache-bust `?v=139` → `?v=140`; HUD label → v186

---

## v185 — 2026-07-17
**NEX DEUS backlog — CHAINED SECRETS (cabinet backlog sweep complete)**
- **Every surge wave hides ONE glitch tile** — a faint magenta shimmer somewhere away from center. Only a **DASH through it** cracks the cache: `SECRET ×n!` paying 800×chain
- **The chain is consecutive waves**: find it every wave and the multiplier climbs; miss a wave and the machine forgets you (chain resets silently at the next surge)
- **Chain 3+**: `THE MACHINE WHISPERS` — a level-2 weapon pod materializes on the tile alongside the pay
- Chain state resets per run; the tile clears with the level on every wave/exit; quest multiplier applies inside NEX DEUS COMMUNION
- This closes the one-item-per-cabinet backlog sweep: gaundrop v181, loadout v182, kaikki v183, binding v184, nexdeus v185
- Cache-bust `?v=138` → `?v=139`; HUD label → v185

---

## v184 — 2026-07-17
**BINDING backlog — THE BASEMENT SHOP**
- **A SHOP room joins the basement lattice** (~12% of free door rolls, never overriding the item/boss cadence): no enemies, doors open from the first second, three pedestal deals priced in what the basement trades — blood and points
- **The deals**: `DEAL: 1 HP` (pay a heart, pick an upgrade card), `DEAL: 1 MAX HP` (pay a heart container, pick a RARE), `+2 HP: 1500 PTS` (points buy a patch-up). Floating gold price tags over each pedestal; sold pedestals grey out and read `SOLD`
- Can't afford it? A `NOT ENOUGH BLOOD` / `NOT ENOUGH POINTS` bump and the shieldTink — never a punishment, just the till saying no
- Pedestals clear on every room swap and cabinet exit; minimap doors advertise `SHOP` in gold
- Cache-bust `?v=137` → `?v=138`; HUD label → v184

---

## v183 — 2026-07-17
**KAIKKI backlog — SHOP TIER 2, the flamethrower class**
- **Three tier-2 items appear in THE SHOP from mission 4**: **LIEKINHEITIN** (₵3000, one-time — a hose of fat fast fire: rapid-2 pod + fire rate + big rounds), **MAGNEETTI** (₵1400, one-time — cash and pickups fly to you; in the money game, that's a build), **KILPI** (₵900, restocked — a shield charge per visit)
- Before mission 4 the shop shows only the original seven — tier 2 arrives exactly when the wallet can dream about it
- All names stay in the cabinet's Finnish (KONEPISTOOLI energy); descriptions localized en/ja/fi
- Cache-bust `?v=136` → `?v=137`; HUD label → v183

---

## v182 — 2026-07-17
**LOADOUT backlog — the RESCUE mission joins the rotation**
- **Mission 5 of 5: RESCUE** — 2-4 hostages in soldier fatigues wander the compound yard under a TROOPER/GLOBBO guard detail. Walk up to carry each one out (`HOSTAGE SECURED`, 1000×count); any melee body that reaches one kills them (`HOSTAGE DOWN…`)
- Mission completes when every hostage is resolved — freed or lost; a **clean extraction** (none lost) drops a bonus weapon pod on the spot
- Hostages wander wall-clamped (the compound's own collision), the HUD objective line tracks `RESCUE — n HELD · m LOST`, and the mission banner reads `MISSION n — RESCUE`
- Rotation is now purge → demolish → holdout → assault → rescue (kit picks every 2nd mission unchanged); hostages clear on exit and quest hand-back
- Cache-bust `?v=135` → `?v=136`; HUD label → v182

---

## v181 — 2026-07-17
**GAUNDROP backlog — generator spawn telegraphs + TREASURE VAULTS**
- **Spawn telegraphs**: every generator now glows hot and swells for half a second before pouring, and the pour itself throws amber sparks at the spawn point — the ghost stream is dodgeable news instead of a surprise
- **TREASURE VAULTS**: from level 2 (two from level 5), a dead-end alcove is carved off the halls — a closed cell with exactly one open neighbor becomes a gold nook holding 3 bright-gold piles (400 + 60/level each) and a 40% potion roll. Finding them is the reward; a locked door or a generator moving in on one is emergent spice
- Roadmap: M6 arc (v178-v180) and the gaundrop backlog rows marked shipped
- Cache-bust `?v=134` → `?v=135`; HUD label → v181

---

## v180 — 2026-07-17
**Roguelike depth (M6) — three new cards + CURSED cards; queue: M6 arc complete**
- **Three new upgrade cards** (pool 10 → 13): **Close Shave** (grazes pay TRIPLE), **Suds Feast** (every 25 kills restores 1 HP — `THE SUDS PROVIDE`), **Long Slide** (dash carries 30% farther, stacking to +70%)
- **CURSED CARDS**: from wave 6, ~35% of card screens turn one slot PURPLE — power with the price printed on the card, never the only choice: **Berserk Oath** (+40% fire rate, −1 max HP), **Glass Cannon** (1.5× piercing shots, −1 max HP), **Lead Boots** (+2 max HP, −15% speed), **Blood Money** (kills pay DOUBLE, dash recharges slower)
- Cursed styling is unmistakable: purple card, violet glow, a `CURSED` tag over the name; all effects localized en/ja/fi
- Max-HP prices clamp at 1 (a curse can bruise, never kill); all new run-state resets on every run start
- VERSIONS: v170–v179 archived (decade rule)
- Cache-bust `?v=133` → `?v=134`; HUD label → v180

---

## Archive

**v170–v179 summary (2026-07-16 – 2026-07-17)**
- v170: Cabinets moved to OPTIONS (title shows a one-line armed reminder) + difficulty/variety pass across all five
- v171: Walls of bullets — DRAPER the wall-weaver (curtain looms) + the ARENA CURTAIN mid-wave event
- v172: Per-cabinet high scores (full runs only) + NEX DEUS unlock bars (`BEST x/req`, `LOCKED (n/5)` status)
- v173: NEX DEUS — the sixth cabinet: zone-surge eruptions from all five rosters, dash-cuts-everything, timed lost-player rescues, heavy-glow neon
- v174: TWIN PRISMS second boss (alternates with OMEGA; survivor enrages instantly) + announcer variety pass + `phase` key
- v175: Living arena 1 — gate chains, RISK gates (green/red), drifting gates, VAULT crate (loud greed), ESCORT bot
- v176: Living arena 2 — steam vents, DRAIN whirlpool (eats bullets), SUDS SURGE foam wall, HAZARD 2×$ + VAULT$ room kinds
- v177: Curtain variations — crossing doubles, shearing diagonals, TOKOTRON/NEX DEUS cabinet curtains
- v178: SMASH floor structure — bosses end floors, BONUS room between, palette shift + tougher lattice per floor
- v179: Daily modifiers — GLASS (1 HP, ×2 kills), SURGE DAY (double hazards), RICH DAY (double loot, +40% enemies); leaderboard tags the mode

**v160–v169 summary (2026-07-14 – 2026-07-15)**
- v160: TOKOTRON character pass — robot dressing on the whole roster (visors, stepping legs, gyro rings, brain-core) + civilians as real people with rescue halos and a help-wave
- v161: Cabinet identity audit — torchlit gaundrop walls, hooded WRAITH, spectral ghosts, winged FLITs, organic rocks, trooper helmet, command-post mast, kaikki lit windows
- v162: Scrolling arenas — gaundrop 2.0×/loadout 1.9×/kaikki 1.7× worlds with clamped camera follow + fog reveal; taxonomy recorded (rooms vs scrolling vs fixed)
- v163: BINDING chasms — red-rimmed pits: bodies blocked, bullets sail over; fliers cross; pits placed before rocks
- v164: Sound identity — per-cabinet gun voices + stingers (waveZap, keyJingle, hungerKnell, descend, kaChing); classic byte-identical
- v165: FIX — Roguelike B gold card rotates every OFFER (was accept-only; players only ever saw the gauntlet)
- v166: Bonus quests randomized + scarce — ~55% of card screens, random pick of six, no back-to-back repeats
- v167: Parity 1 (graphics) — procedural GROUND per cabinet (slabs/boards/concrete/asphalt), BRICK dungeon walls, kaikki blood, loadout muzzle flash
- v168: Parity 2 (gameplay) — TOKOTRON electrodes; GAUNDROP key inventory + locked gold doors + 30-cap hordes
- v169: Parity 3 (props/people) — shaped key/flask/meat pickups, bone door arches, kaikki THUG (36 enemy types)

**v150–v159 summary (2026-07-13 – 2026-07-14)**
- v150: THE BINDING OF TOKO — cabinet #3 (Binding of Isaac tribute): basement floors on the room lattice, ITEM-room free picks, floor bosses paying RARE picks
- v151: Cabinet graphics pass — RetroPass pipeline (per-cabinet render targets, palettes, glow, scanlines), per-cabinet materials, 12 Hz stepped animation
- v152: LOADOUT — cabinet #4 (Re-Loaded tribute): kit pick at the door, PURGE/DEMOLISH/HOLD OUT missions, gunmetal look
- v153: Cabinet row — single-select mod on the title + OPTIONS under SMASH TV; TAP TO START plays the armed cabinet
- v154: Roguelike B — ALL cabinets as gold-card bonus quests (RAID/DELVE/OP/DETOUR) with pinball multipliers + RARE payouts
- v155: TOKOTRON remake — instant full-wave spawns on 8-wave loops; GRUNT/BRUTE/ORB/PROG/MINDER roster; civilian family variety
- v156: GAUNDROP remake — real tile mazes, KEY + locked exit, GHOST streams, wall-phasing WRAITH, hunger drain + POTION
- v157: BINDING remake — seeded rock rooms, in-room FLIT/SPITTLE/CHARGER/HOPPER spawns, REAL branching doors, hearts economy
- v158: LOADOUT remake — THE COMPOUND walled base, TURRET + TROOPER, ASSAULT command-post mission, heavier weapon feel
- v159: KAIKKI IRTI 3 — cabinet #5: money from everything, alley crates, THE SHOP (bought arsenal), DOS-VGA streets

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
