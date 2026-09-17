# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v250 — 2026-09-16
**The zoom was v247 dollying the camera in on phones; v249's memory budget never bound on the phone it was written for** *(and the version is on the title screen now, so a bug report can name its own build)*
- **"Zooms in weirdly" — found, and it was not the context loss.** Measured on
  a 412×790 portrait viewport: `camera.position.y` creeps from the rest 27.0
  down to **19.6 over about twenty seconds of play**, then keeps drifting. That
  is v247's framing dolly ("the camera frames the fight, not the floor")
  running in PORTRAIT. It arrives too slowly to read as a camera move — it just
  leaves the arena looking wrong, which is exactly how it was reported.
- **Why portrait is the wrong place for it.** Portrait's rest framing is
  hand-tuned and **already crops the corners**: at rest the near corners sit at
  **1.65×** the horizontal frustum and 1.23× the vertical. Dollying in from
  there hides the side walls of a *fixed-screen* arena shooter — you stop being
  able to see where the next body will arrive. `ARENA_PRESETS` has said
  *"Portrait keeps its fixed framing"* since v111; v247 quietly broke that
  invariant. `framingAllowed()` now requires `landscapeMode`. Verified both
  ways: portrait holds 27.0 flat across a 30 s run, landscape still dollies
  20.5 → 13.8, so the v247 feature is untouched where it was designed and tuned.
- **v249's pixel budget did nothing.** It capped the backing store at 2.0 Mpx
  and called it a fix. The owner's phone is **412×790 CSS px**: at `dpr` 2 that
  is **1.3 Mpx — already under the budget**, so the cap computed 2.48,
  `Math.min` picked 2, and the game asked for exactly what it had asked for
  before. Confirmed by measuring the canvas: v249 backs **824×1580**, v250 backs
  **618×1185**. *Writing a limit is not the same as writing a limit that binds.*
- **The memory was never mostly in the colour buffer — it is in MSAA.**
  `antialias: true` costs 4× the colour buffer **and** 4× depth:

  | | |
  |---|---|
  | dpr 2.0, antialias on | **~54 MB** ← what it was asking for |
  | dpr 2.0, antialias off | ~17 MB |
  | dpr 1.5, antialias off | **~13 MB** ← what a phone gets now |

  A small screen now starts a rung lower (`_smallScreen` → dpr ladder
  `1.5 / 1.25 / 1 / 1`; desktop keeps `2 / 1.5 / 1.25 / 1`) and **never turns
  MSAA on at all** — confirmed at the context, not just the intent
  (`getContextAttributes().antialias === false`). `_smallScreen` is
  deliberately generous (`maxTouchPoints`, or a short edge ≤ 820): capping a
  narrow desktop window costs nothing, missing a phone costs the context.
- **One resize path.** v249's `webglcontextrestored` handler hand-rolled a
  *partial* copy of `resize()` — pixel ratio and drawing-buffer size, but not
  `camera.aspect`, not the retro render target, not the UI canvas. It calls
  **`resize()`** now. Stated honestly: this was **not** the zoom (a lose/restore
  cycle leaves aspect, fov and camera distance bit-identical), it is a
  duplication removed before it becomes one.
- **The version is on the title screen**, which is what was asked for. One
  `GAME_VERSION` constant feeds the HUD label, the on-screen diagnostic line
  and the title, so they cannot drift. The title reads e.g.
  `v250 · dpr 1.25 · GPU RESETS 1`.
  **It reports state, not intent, and this took two tries:** the first cut read
  `renderer.getPixelRatio()` while building the title and printed `dpr 2.00` on
  a phone whose backing store was already 1.5, because the title is built
  before the boot `resize()` applies the budget. It now measures the **drawing
  buffer against the CSS box** and is refreshed from `resize()`, so it tracks
  rotation and every rung of the ratchet. A diagnostic that reports the intent
  is worse than none — five of the last six releases were spent unsure which
  build a screenshot was of.
- `scripts/bump-version.sh` follows `^const GAME_VERSION` now, instead of the
  `fillText('vN'` literal it used to rewrite — that literal is gone, and a bump
  that silently matches nothing is worse than one that fails.
- Cache-bust `?v=202` → `?v=203`; HUD label → v250
- **Docs, same day, no game code** (owner: *"please save these as guiding
  thoughts"*): `toko-drop/PROGRESSION_DESIGN.md` — the owner's direction on
  waves ("every wave spawns at once"), revenge bullets, distinct modes and a
  campaign, and the main mode's session/"one more go"; what the code does
  today for each (the 3-second pour is deliberate, `main.js:303`; revenge is
  binary — the ONLY bullets in the default mode, and absent in classic;
  VOLATILE rings are the one full-speed corpse); a reference study (GW3,
  Sektori, Blade Rush); and 15 open questions. `TOKO_DROP_ROADMAP.md`
  reconciled with `main`'s copy (v228/v229/v231 ticks, the Godot-sibling
  note) — the two had forked with no git ancestor for the file.
- **Docs, later the same day:** `PROGRESSION_DESIGN.md` §7 records the
  owner's Q&A answers (ARCADE stays endless; waves become pulses; test the
  mixed field; three doors now, maybe Sektori-style unlocks at launch; ROGUE
  its own door; Rush is likely the campaign but not necessarily with the
  Blade-Rush-copied rules) and §8 the enemy-FAMILY direction — colour should
  follow shape/movement families, not shooting; the five DRIFTERs wear five
  hues, the three HOLDER blobs three; green already means "leaves something
  on the floor"; PYRA is `HUNTER` at speed 0. Five family questions queued.
- **Docs, again:** §8.4 looks at the SHAPES (owner: *"look at the shapes
  and rethink this question"*) — `design/roster-sheet-2026-09-16.png`, all
  21 base species from the lab. Ten are the same gel dome across six
  movement roles, five the same cube, six one-offs that already read. The
  colour complaint is really ten domes asking colour to do shape's job. Q16
  re-asked with a/b/c. Q11 answered: the campaign unit is a GW3-style room
  with a timed goal, S/A/B/C/F tiers, mechanics and level shapes added
  along the path.
- **Docs:** Q16 answered — family = shape class (dome, cube, each one-off;
  more may arise). §8.5. Q17 (within-family differentiation) queued.

**Scope, honestly.** The zoom is *fixed and measured*. The `bump-version.sh`
break and the lying version line were mine and are both verified here. The
white screen is **made much less likely, not proven fixed**: no phone GPU
exists in this sandbox and SwiftShader never loses a context, so the evidence
is the memory arithmetic above plus the persisted ratchet. If it recurs, the
title screen now names the build and the rung it is standing on.

---

## Archive

**v240–v249 summary (2026-09-05 – 2026-09-16)**
- v240: The floor draws a level's region on both render paths — PR #447's v238 term brought across by hand
- v241: skipped on purpose — an unmerged lineage had already used it (the same reason v238 was skipped)
- v242: HOTFIX — a half-float overflow in v240's shape term; real, fixed, and NOT the white screen (`scripts/shader-lint.mjs` added to catch the class)
- v243: BOOST LANE, a Rush level, and the first Rush-level cross-build parity measurement against the port
- v244: The white-out explains itself — on-screen diagnostics, and the game survives losing the GPU
- v245: The swarm arrives as a fan, not a pile
- v246: A contrast floor — no body darker than the ground it stands on
- v247: The camera frames the fight, not the floor
- v248: The white-out narrows itself — an auto-bisect ladder names the suspect that brings the picture back
- v249: **Found it.** Android was reclaiming the WebGL context ~5s in; `preventDefault()`, a persisted loss ratchet, and a pixel budget
- **The lesson of the decade:** five releases were spent guessing at a bug no sandbox could reproduce (SwiftShader is 32-bit float everywhere and never loses a context). It was solved by making the game *diagnose itself on the owner's device* — and v250 then found that v249's budget never actually bound. Ship the instrument before the fix.

**v230–v239 summary (2026-08-28 – 2026-09-05)**
- v230: QOL — haptic pulse on a shield block, a test buzz when haptics are switched on
- v231: itch.io press kit — `press/PRESS.md`, screenshots, the controls table
- v232: RUSH abilities ported from the Godot port (heat exchange, hyper bomb, overcharge, quantum shield)
- v233: RUSH onboarding — its own tutorial hints, seen once
- v234: THE RUSH LADDER panel; the v232 abilities were firing themselves off the boost button — a dedicated ability bind
- v235: The ZONE boost scheme removed — it was never reachable
- v236: The arena is a shape, not two numbers — `js/arena.js` (SDF), 8,396 exact checks; P0 of the level editor
- v237: THE LEVEL EDITOR — drop-downs on top, tap to place, a 0.1s timeline, play-from-here; `js/level.js`
- v238: skipped on purpose — PR #447, an unmerged lineage, had used both v237 and v238
- v239: One level format for two engines — the Godot port reads the editor's JSON; `toko-drop/levels/`; cross-build parity 46/46 · 34/34

**v220–v229 summary (2026-07-31 – 2026-08-28)**
- v220: Revenge speaks the species' language — aimed/fan/ring by dialect, corpse colors split from living colors, sludge trail poured as gel blobs
- v221: Each mode drafts its own roster — CLOSE COMBAT gets its own pool, stationary artillery sits out
- v222: Goo pass 2 — corpse matter (both chunk pools) gets a gel-nugget node graph under WEBGPU
- v223: Arena pass — rim vignette, grid distance falloff, a lit pool that follows the player
- v224: RUSH MODE ships — boost is the answer, the gun the fallback; heat is the shared cost
- v225: RUSH gets its own bare arena and four-body roster, no main-game furniture
- v226: RUSH's dead `lives` counter and `loseLife()` removed — the HP-growth extra-life mechanic was already correct
- v227: RUSH gets S/A/B/C tiers, a stamped ladder, and two per-level goals (chainUnbroken, neverLocked)
- v228: Arena pass 2 — the floor answers mass (live enemies), pops (kills) and prizes (pickups), both renderers in parity
- v229: Haptics (`js/haptics.js`) + two motion-comfort flashes (hit vignette, wave-clear) found ungated by REDUCE MOTION and fixed

**v210–v219 summary (2026-07-25 – 2026-07-31)**
- v210: MOVEMENT PROFILES — each species declares its share of the swarm forces
- v211: FLUID retired — behaviour is species identity; per-enemy movement sliders in the tuner (standing rule: no global behaviour toggle)
- v212: Contextual death-screen feedback — a rotating question beside a live specimen of what killed you
- v213: TOKOTRON unstuck — splat-pool saturation diagnosed by screenshot; minimalist grid floor; solid player core
- v214: TOKOTRON reference rules — rescue curve 1000→5000 capped, EXTRA MAN at 25k, pickup-free vector room
- v215: THE FRUIT LADDER — six fruits, one per depth rung, each carrying its value; badges retired
- v216: The enemy lab stops being a fork — rebuilt on js/specimen.js, vendored three, both builds (roadmap-v2 Phase 1)
- v217: Wave director v1 — composition/cadence/escalation move into TUNING.waves as data, equivalence proven byte-for-byte
- v218: Goo/gel TSL pass past parity — depth-varying thickness, hit-seethe octave, uTear pop burst (flag build only)
- v219: Testing lives where you play — tester viewport fills the tab; the lab reachable from game and hub

**v200–v209 summary (2026-07-24 – 2026-07-25)**
- v200: THE JUICE PASS — every death detonates (option A, for everyone)
- v201: The swarm gets a voice — sound pass for every new mechanic + perf juice guard
- v202: The roguelike learns the swarm's language — three swarm-native cards
- v203: THE SHEPHERD — the first enemy designed FOR the swarm game (40 types)
- v204: Cabinet audit + the gate that keeps them honest — and LOADOUT gets its briefings
- v205: BINDING item pools — the basement changes character as you descend
- v206: KAIKKI: civilians as WITNESSES — you can't loot in front of an audience
- v207: BINDING: room revisits — the basement is a map, not a corridor
- v208: KAIKKI street jobs — the order changes, not just the wave number
- v209: NEX DEUS: the surge is the arena tearing open

**v190–v199 summary (2026-07-19 – 2026-07-24)**
- v190: Instanced floor splats — puddles + slime trails share one InstancedMesh (dozens of draw calls → 1)
- v191: WEBGPU (BETA) toggle — node-pipeline renderer flag-gated; floor + splat TSL ports; boot-script importmap
- v192: Real WebGPU backend — flag build jumps to three r180 (classic stays r167); adaptive adapter with WebGL2 fallback
- v193: Field feedback — motion-trail afterimages off under the flag; slime fizz confirmed keeper; M7 promotion criterion recorded
- v194: Gels wobble under WEBGPU — full TSL port of the goo FX (positionNode displacement + emissiveNode SSS)
- v195: RetroPass TSL port — cabinets keep palette/scanline/glow looks under the flag (zero ConditionalNodes; ÷0 NaN lesson)
- v196: FLUID MODE — the movement lab: dodge bullet lanes, boids schooling, split-on-death minnows
- v197: FLUID wave archetypes — STREAM / RING / PINCER currents, deterministic per wave, bannered
- v198: CLOSE COMBAT + FLUID become the DEFAULT for all players (absent key = ON; saved choices respected)
- v199: Identity pass — TWIN-STICK SWARM SURVIVAL branding across title/OG/manifest/README/GDD

**v180–v189 summary (2026-07-17 – 2026-07-19)**
- v180: Roguelike depth (M6) — three new upgrade cards + CURSED cards (power with a printed price)
- v181: GAUNDROP backlog — generator spawn telegraphs + TREASURE VAULT alcoves
- v182: LOADOUT backlog — the RESCUE mission (carry hostages out; clean sweep pays a bonus pod)
- v183: KAIKKI backlog — SHOP tier 2 from mission 4 (flamethrower / magnet / shield)
- v184: BINDING backlog — the BASEMENT SHOP room (pedestal deals priced in blood + points)
- v185: NEX DEUS backlog — CHAINED SECRETS (dash a hidden glitch tile every wave for a climbing multiplier)
- v186: NEX DEUS boss — THE CUSTODIAN (sheen shrugs bullets; dash-through cracks the shell; 39 enemy types)
- v187: CLOSE COMBAT mode — no enemy fire, shooters drafted as chasers, REVENGE RINGS on death
- v188: CLOSE COMBAT fixes — env-kill tag stops the gate fountain; drafted shooters press instead of kiting
- v189: Instanced bullet rendering — the whole bullet field draws in three InstancedMeshes (~900 → 3 draw calls)

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
