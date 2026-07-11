# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v128 — 2026-07-11
**Roadmap M2: offline PWA — service worker caches the game for offline play**
- **`toko-drop/sw.js`** (new, `?v=` tokened from day one): the whole module graph + shell + icons + logo + intro clip are **precached at install** (the first load races the worker, so runtime caching alone would leave offline boot to the evictable HTTP cache; verified — 20 entries, full title boots with the network cut). Tokened requests serve **cache-first** (immutable per release), the untokened page shell **network-first** with cache fallback, so the installed PWA plays offline but picks up new releases the moment it's online
- Release discipline built in: the cache name embeds the literal `?v=` token so `bump-version.sh`'s global replace rotates it every release (sw.js added to the script's file loop); activation deletes old caches; only `res.ok` responses are cached (an edge 404 can't get pinned — v118/v119 lesson); GET + same-origin only, so feedback POSTs pass through untouched
- Registered from `main.js` after `load` (never competes with boot), silent no-op where unsupported
- Cache-bust `?v=81` → `?v=82`; HUD label → v128

---

## v127 — 2026-07-11
**Roadmap M2: SHARE button on the death screen + first-run tutorial hints**
- **SHARE** (death screen, next to SEND/SKIP): native share sheet where it exists (mobile), clipboard fallback on desktop with a brief "COPIED!" flip. Shares `TOKO DROP — score · wave (· SMASH TV) · seed` + the game URL; doesn't dismiss the screen, so feedback can still be sent. en/ja/fi
- **First-run tutorial hints**: a brand-new player's first ~22 s get four fading callouts low on the HUD — move, aim & fire, dash, and the graze rule ("near-misses pay score — dashes don't graze"). Input-aware (touch wording vs keyboard/stick), text-only per the GDD §2 boundary (no pauses, no input), marked seen (`tokoDropHintsSeen`) only after the full sequence plays so dying mid-sequence re-shows them next run
- Cache-bust `?v=80` → `?v=81`; HUD label → v127

---

## v126 — 2026-07-11
**Roadmap M1 groundwork: OMEGA wall clamp + feedback chips ask about the new systems**
- **OMEGA stays inside the walls**: the boss's 7.5-unit orbit is wider than half the SMASH TV room, so a wall-hugging player could push the crystal out through the doors (milder version possible in classic portrait too). Its position is now clamped to the arena every frame, like TORO
- **Feedback chips refreshed** (roadmap M1): death-screen chips now probe the v114–v125 systems. New telemetry-driven "Wardens blocked my shots" chip (fires after 6+ shielded shots — tracked by a new per-run `shieldBlocks` counter that also rides the feedback payload) and a SMASH TV-only "Room exits confused me" chip. Positive chips are mode-aware: SMASH TV asks about door-to-door rooms, cash & prizes, grazes; classic swaps "Bullet-hell dodging" for "Close-call grazes" once you actually grazed. en/ja/fi
- BOTFLY and WARDEN added to the telemetry chip name table (previously showed raw type names)
- Cache-bust `?v=79` → `?v=80`; HUD label → v126

---

## v125 — 2026-07-11
**GRAZE system + boss escorts — risk pays, late bosses scale in tactics**
- **GRAZE (both modes)**: an enemy bullet skimming within 0.55 units of you **while vulnerable** pays +25 score (doubled by an active multiplier) with a whisper-quiet zip + a tiny white spark, once per bullet. Dash i-frames don't graze — the reward tracks real risk, so weaving through fire beats dashing through it. Grazes feed the 25k milestones, show on the death screen (`· N GRAZE`, en/ja/fi), and ride along in the feedback payload for balance data
- **Boss escorts**: from the 2nd boss (wave 16) OMEGA arrives under a **WARDEN umbrella** — two wardens from the 3rd (wave 24). Later bosses scale in TACTICS, not just HP: break the shield line first or fight a bullet-immune boss
- Cache-bust `?v=78` → `?v=79`; HUD label → v125

---

## v124 — 2026-07-11
**Main-mode round: WARDEN shield-bearer, live scoring feedback, streak-heat juice — all in-action, no between-wave interruptions**
- **WARDEN** (new enemy #18, wave 7+, cost 5 — rare): a cyan shield-bearer blob projecting a visible **floor aura (r 4.5)** that makes every enemy inside it **immune to bullets** (even piercing). It never attacks and never shields itself — the priority-target puzzle layered on top of the v116 shooter play. Gets the "!" entrance ping; the shield drops the instant it dies. Deflections read clearly: cyan sparks + a dull `shieldTink` instead of the hit sound
- **Live scoring feedback (both modes, HUD-only)**: streak meter now escalates through **heat tiers** (gold → orange at ×10 → red-hot glow at ×20, size grows with streak); an active **2× score multiplier** shows a pulsing tag + draining time bar under the score; **milestone popups** flash mid-action for every 25,000 points (with a three-note sparkle) and at streak ×10/×20/×30
- **Design boundary recorded in GDD §2** (agreed): classic/arcade mode has NO between-wave interruptions — screens/choices/reward beats belong to Roguelike mode exclusively; only non-interrupting feedback (fading banners, sounds, HUD meters) is allowed in classic. Everything in this release honors it
- Difficulty-curve tuning deferred until real playtest runs land in the feedback inbox — that data drives the next balance pass
- Cache-bust `?v=77` → `?v=78`; HUD label → v124

---

## v123 — 2026-07-09
**Main (classic) mode: readable wave rhythm — color-coded wave banners + a boss klaxon**
- Classic mode computed a wave RHYTHM (normal / swarm / spike / boss every 8th) since forever but never surfaced it — the `announceWave()` helper was even dead code. Now **each wave opens with a brief color-coded banner** naming the incoming pressure so the rhythm is readable and you can plan the next ~20s: `WAVE N` (gold), `WAVE N — SWARM` (cyan), `WAVE N — HEAVY` (orange), `WAVE N — BOSS!` (red, lingers a beat longer)
- **Boss klaxon** (`audio.bossHorn()`) — two ominous rising low tones + a noise swell on every boss wave in **both** modes, independent of the spoken announcer, so you always get the "here comes the boss" beat
- The wave-banner renderer is now duration-aware (`waveIntroDur`) and color-driven (`waveIntroColor`); the SMASH TV room card reuses it, now tinted by room kind. Dead `announceWave()` removed
- Cache-bust `?v=76` → `?v=77`; HUD label → v123

---

## v122 — 2026-07-08
**FIX: recorded title intro now actually plays — its own INTRO VOICE toggle + reliable gesture-safe triggers**
- The v121 intro was gated on the ANNOUNCER toggle and only fired from `showTitle()`, but returning from OPTIONS (where the toggle lives) doesn't re-render the title and cold loads can't autoplay before a gesture — so it commonly never played
- **New INTRO VOICE toggle** in OPTIONS → GAME SHOW (own `tokoDropIntroVoice` flag, **on by default**, fully independent of the announcer commentary). `audio.introJingle()` now gates on `setIntroVoice`, not the announcer
- **Reliable triggers**, all inside a user gesture so audio is unlocked: flipping the toggle ON plays it immediately (hear exactly what it is); returning to the title from OPTIONS (RESUME) plays it; landing on the title after a run plays it. Still once per title visit; cold-load autoplay-block still self-retries on the next title render
- en/ja/fi strings for the new toggle
- Cache-bust `?v=75` → `?v=76`; HUD label → v122

---

## v121 — 2026-07-08
**Recorded announcer intro on the title screen (when the announcer toggle is on)**
- A real voice clip ("TOKO DROP — START SHOOTING!") plays on the title screen when the **ANNOUNCER** toggle is on — `toko-drop/audio/announcer-intro.mp3` (62 KB), played via `audio.introJingle()` through an `HTMLAudioElement` at the master volume
- **Post-processed offline** (ffmpeg, per the user's spec): rumble cut → **bass boost** (low-shelf +6 dB @110 Hz) → mud-cut + **presence EQ** (+4 dB @2.6 kHz) → short PA slap (`aecho`, the "**announcer vocalizer**") → **compression** (4:1, +5 dB makeup) → **stereo widen** (`extrastereo`) → limiter; encoded 128 kbps MP3 (baseline codec, plays everywhere; source m4a was HE-AAC which Chromium can't reliably decode)
- Plays **once per title visit** (`_titleIntroPlayed`, reset in `startGame`); if a cold load blocks autoplay before any gesture, the flag un-sets so the next title re-render (after any chip/toggle tap) plays it. No-ops when the announcer is off or volume is 0
- `scripts/bump-version.sh` now also tokenizes `js/audio.js` so the new mp3 path's `?v=` cache token bumps with every release (v118/v119 new-path lesson)
- Cache-bust `?v=74` → `?v=75`; HUD label → v121

---

## v120 — 2026-07-07
**Design round two: risk-priced exits, greed placement, shooter entrance pings (both modes), room-transition dip, PWA install**
- **Risk-priced exits (SMASH TV)**: the minimap choice is now a trade, not a freebie — **HEAVY rooms pay 2× floor loot** (+1 item, label reads "HEAVY 2×$"), **PRIZE$ rooms drop far fewer weapon pods** from moths (20/45/35 vs the smash-standard 40/30/30 — loot-rich but firepower-poor), SWARM's reward stays its streak-scoring bodies
- **Greed placement (SMASH TV)**: big gold prizes now spawn NEAR a door — the walls that pour enemies — so grabbing the gift box is a risk you choose; cash piles stay scattered
- **Shooter entrance pings (BOTH modes)**: when a deliberate shooter (v116) enters, a pulsing "!" hangs over it for ~1.6s and a sharp two-note alert plays — the game tells you the tactical picture changed
- **Room-transition dip (SMASH TV)**: walking through an exit now fades to black for ~half a second with the room swap at the fade peak — traversal reads as going THROUGH the door, not a teleport (upgrade-card rooms skip it; the card panel is its own transition)
- **PWA install**: `manifest.webmanifest` + 192/512 icons — the game installs to a phone home screen and runs fullscreen
- Cache-bust `?v=73` → `?v=74`; HUD label → v120

---

## Archive

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
