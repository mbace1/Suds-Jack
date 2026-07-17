# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v176 — 2026-07-17
**The living arena, part 2 — hazards + HAZARD/VAULT rooms (approved arc, step 5 / M5b)**
- **STEAM VENTS**: floor grates that glow amber for a full readable second, then ERUPT — damage + knockback to ANYTHING standing on them, enemies included (luring is a legal tactic). Classic: 2-3 vents every 3rd wave from 7; SMASH HAZARD rooms are the vent venue (5-6)
- **DRAIN**: a whirlpool with a visible swirl — gentle pull on every body (player 1.1 u/s, enemies 0.7) and it **eats any bullet that crosses it, both sides**. Cover that moves the fight. Classic every 5th wave from 9; always in HAZARD rooms
- **SUDS SURGE** (SMASH only, wave 6+, ~40% of rooms): `SUDS SURGE INCOMING!` + alarm, then a foam wall sweeps one lane of the room — enemies brushed hard aside (and hurt), the player damaged only on a direct hit. The show's commercial-break spectacle
- **Two new SMASH room kinds** join the lattice from wave 5: **HAZARD 2×$** (vent-heavy + drain, pays double floor loot like HEAVY) and **VAULT$** (the armored crate venue — v175's vault spawns in-room)
- New stingers: `ventBlast` (hot hiss + low kick) and `surgeFoam` (long soft whoosh); hazards clear on every wave spawn, run start, quest entry, and title return
- Cache-bust `?v=129` → `?v=130`; HUD label → v176

---

## v175 — 2026-07-17
**The living arena, part 1 — gates round 2 + VAULT & ESCORT objectives (approved arc, step 4 / M5b)**
- **GATE CHAINS**: bank a second gate within 6 s of the last and the pay climbs — `GATE CHAIN ×N! +500×N` (score-mult doubles it). Route planning is now a minigame
- **RISK GATES** (wave 5+, ~35% of gates): the beam alternates green/red on a readable 1.6 s clock — dash on green for a **DOUBLE PRIZE**, on red it's a harmless `DUD!` (the cost is the waste, never damage)
- **DRIFTING GATES** (wave 10+): gates wander slowly and bounce inside the walls, so the late-game route never sits still
- **VAULT CRATE** (classic/SMASH, wave 5+, every 4th wave, never boss): an armored gold-wired box — 8 hits to crack, and **every hit pings the room**: enemies within 9 units surge at you (the SIREN mechanism). Inside: a weapon pod + a fat cash drop + a 40% score-mult roll. Loud greed, your call
- **ESCORT BOT** (classic/SMASH, wave 6+, offset every 4th wave): a little soap-bot trundles wall to wall in ~14 s. Enemies never chase it — but stray enemy fire (2 hits) or any body that touches it kills it. Deliver it alive and it gifts a weapon pod. Protecting it is pure positioning
- Objectives never stack with each other or boss waves; all die with the wave/run (vault, bot, and chain state clear on every spawn, run start, quest entry, and title return)
- Cache-bust `?v=128` → `?v=129`; HUD label → v175

---

## v174 — 2026-07-17
**TWIN PRISMS — the second boss + announcer variety (approved arc, step 3 / M4)**
- **New boss: TWIN PRISMS** (38 types) — boss waves now alternate headliners: OMEGA's lone crystal or a PAIR of sharp magenta shards orbiting in opposite directions. The twins trade tight aimed 4-fan volleys in strict turns (the rhythm is the read: one fires, you press the other) — and when one shatters, **the survivor enrages INSTANTLY**: phase-3 ring rage at 1.45× speed regardless of remaining HP, with a `THE SURVIVOR RAGES!` call
- The run seed picks which boss opens (daily runs share the schedule); consecutive bosses within a run always differ. Escort WARDENs unchanged for both headliners
- Each shard pre-fire strobes like OMEGA (pink flicker), carries a boss aura, and pays boss score; the pair totals a bit more HP than OMEGA but you fight it half at a time
- **Announcer variety pass**: every line pool deepened (start/wave/boss/streak/prize/money/mult/ouch/gameover/clear/exit/bounty) + a new `phase` key — the booth now calls boss act changes ("IT'S FURIOUS NOW!")
- Roadmap: M4 boss + announcer items marked shipped; NEX DEUS row updated to v172/v173 shipped state
- Cache-bust `?v=127` → `?v=128`; HUD label → v174

---

## v173 — 2026-07-17
**NEX DEUS — the final cabinet (approved arc, step 2)**
- **The sixth cabinet is real**: clear all five NEX bars (v172) and NEX DEUS joins the OPTIONS cycle — a fixed near-black arena, hard magenta rim, void-glass tiles, heavy-glow neon RetroPass profile, its own twin-voice gun hum
- **ZONE SURGES**: neon rings appear at wave start, each strobing down to ERUPT a squad drawn from ONE cabinet's roster (grunts+orbs / ghosts+wraith / flits+spittles+hoppers / troopers+turrets / thug riots) — the arena itself is the spawner; the wave holds open until every ring has fired
- **THE DASH CUTS** (this cabinet only): dashing wipes enemy bullets along your path (+10 each) and wounds every enemy you pass through — i-frames become an offensive verb
- **LOST PLAYERS**: humans drop in mid-wave on an 8 s countdown — the rescue halo shrinks and goes ember-red as the machine reclaims them; chained rescues pay 1500×chain and every 3rd gives +1 HP; a loss resets the chain
- Roguelike B: **NEX DEUS COMMUNION** joins the quest deck (2 surge waves, ×3 pinball ramp) — unlocked profiles only; full runs record a `nexdeus` best like any cabinet
- Locked profiles can never arm it: the OPTIONS cycle skips the slot and a stale save falls back to OFF
- Cache-bust `?v=126` → `?v=127`; HUD label → v173

---

## v172 — 2026-07-17
**Per-cabinet records + NEX DEUS unlock tracking (approved arc, step 1)**
- **Every cabinet now keeps a personal best** (localStorage `tokoDropCabBests`), recorded on death for FULL cabinet runs only (Roguelike B quests don't count): TOKOTRON/GAUNDROP/LOADOUT/KAIKKI record the wave/mission/level reached, BINDING records the floor
- **NEX DEUS unlock tracking**: beat the bar in all five cabinets — TOKOTRON wave 5, GAUNDROP level 3, BINDING floor 2, LOADOUT mission 4, KAIKKI mission 3 — to unlock the final cabinet (arrives next version). OPTIONS shows each cabinet's `BEST x/req` in its hint plus a `NEX DEUS: LOCKED (n/5)` status line that flips pink when you're ready
- Title armed-note now shows your best for the armed cabinet (`CABINET: TOKOTRON · BEST 4 · OPTIONS`)
- Cache-bust `?v=125` → `?v=126`; HUD label → v172

---

## v171 — 2026-07-16
**Walls of bullets — the DRAPER and the ARENA CURTAIN (user direction)**
- **New enemy: DRAPER, the wall-weaver** (37 types) — a violet loom slab with glowing end-spools that holds ~11 units, faces you (the loom IS the tell), strobes a 0.9 s wind-up while its spools spin, then **looms a 15-slot marching bullet CURTAIN with one 2-slot gap**. Dash the gap or dash the wall — both are answers. Classic pool from wave 7 (shooter budget); guest appearances in LOADOUT floods (mission 4+) and KAIKKI streets (mission 5+)
- **ARENA CURTAIN event** (classic + SMASH, wave 6+, never boss waves, ~55% of eligible waves): mid-wave, a `BULLET CURTAIN!` warning + two-tone alarm, one beat later a **full arena-spanning wall of slow bullets sweeps from a random wall** with two 3-slot dash-or-weave gaps. Slow enough to read, wide enough to matter — and every bullet is grazeable
- New stingers: `curtainAlarm` (two-tone warning) + `curtainSweep` (the wall leaves the rail)
- Cache-bust `?v=124` → `?v=125`; HUD label → v171

---

## v170 — 2026-07-16
**Cabinets to OPTIONS + a difficulty and variety pass (user direction)**
- **The cabinet picker is OPTIONS-only now** (the cycle button under SMASH TV): the title row is gone — when a cabinet is armed, the title shows a one-line colored reminder (`CABINET: TOKOTRON · OPTIONS`) so TAP TO START never launches a surprise
- **Every cabinet got harder** (user: most are too easy): TOKOTRON comps ~25% bigger; GAUNDROP generators 2+lvl/2 (cap 6) pouring faster (0.9-1.5 s ghosts), WRAITH from level 2 (two from 5), welcome party 6+2·lvl; BINDING floors scale steeper on every room kind; LOADOUT opens with 2 turrets, purge is a real occupation force (12+3w, cap 32), trickle 1.8 s at cap 20; KAIKKI is a proper riot (14+4w, cap 46)
- **More enemy VARIETY in every cabinet** (user: waves need it): TOKOTRON wave scripts pull guests from wave 2 (REDD_MINI packs, BOTFLY pairs, a WEEVA turret); GAUNDROP generator pool adds SLUDGE_CUBE (poison in the halls) and YELA_CUBE, WEEVA prowls from level 3; BINDING breeds classic GLOBBOs and a PURP_CUBE into its rooms; LOADOUT floods add YELA_CUBE + CLOAKER ambushers from mission 3; KAIKKI adds FANNER (m2), SPITTOR (m3), and TORO joyriders (m4)
- VERSIONS: v161–v169 archived (decade rule)
- Cache-bust `?v=123` → `?v=124`; HUD label → v170

---

## Archive

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
