# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v60 is reached, move v51–v59 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v64 — 2026-07-01
**Language toggle — English / 日本語 / Suomi**
- New `lang.js` i18n module: `STRINGS` table for `en`/`ja`/`fi`, `t(key, ...args)` lookup with English fallback, `cycleLang()`/`langLabel()`, choice persisted under `tokoDropLang`
- Title screen gains a **LANGUAGE** toggle chip (ENG → 日本語 → SUOMI) that re-renders the title in the chosen language
- Localized: title subtitle, best-run line, tap-to-start, controls block, orientation + roguelike toggles and their hints, death screen (YOU DIED / wave-time-pts / best badges / seed), wave banner, and the full feedback panel (both chip headings, all positive + negative chip labels including telemetry-derived ones, textarea placeholder, SEND/SKIP)
- Left in English by design: on-canvas HUD labels (canvas monospace renders CJK unreliably) and roguelike upgrade cards
- `bump-version.sh` now also token-syncs `lang.js`
- Cache-bust `?v=19` → `?v=20`; HUD label → v64

---

## v63 — 2026-07-01
**Positive feedback on the death screen**
- Death-screen feedback now leads with a green **"WHAT DID YOU ENJOY?"** chip row (weapon pods / boss fights / movement feel / dodging / enemy variety / visuals) above the existing red "WHAT WENT WRONG?" row
- Chip-row rendering refactored into a shared `addChipRow(heading, reasons, set, accent)` helper (pos = green, neg = red); positive picks persisted under `liked`/`likedIds` in `tokoDropFeedback`
- `window._feedback()` console summary now tallies LIKED and WENT WRONG separately
- Cache-bust `?v=18` → `?v=19`; HUD label → v63

---

## v62 — 2026-07-01
**Boss enrage now actually affects the boss (TORO)**
- v59's enrage multiplied `spd`, but the every-8th-wave boss is almost always a TORO, whose charge behaviour uses hardcoded speeds — so enrage was visual-only (red ring) on the real boss
- Enraged TORO now stalks faster between dashes (idle 0.8 → 1.5), winds up quicker (rev 1.6 s → 1.0 s), and dashes ~2× as often (recovery idle gap ×0.45)
- Cache-bust `?v=17` → `?v=18`; HUD label → v62

---

## v61 — 2026-06-30
**PURP_CUBE spiral polish — distinct 2-arm galaxies**
- PURP_CUBE fired one bullet every 0.5 s rotating a fixed `+0.55` rad — identical and mechanical on every cube
- Now fires a **2-arm spiral** (opposite bullets at `θ` and `θ+π`) and each cube gets a **per-cube spin rate + direction** (`_purpSpin`, ±0.42–0.76 rad/shot), so multiple PURPs make varied interlocking galaxy patterns
- Cache-bust `?v=16` → `?v=17`; HUD label → v61

---

## v60 — 2026-06-30
**SLUDGE_CUBE poison zone now reads as a hazard**
- Poison pools had a flat green circle that looked identical whether actively lethal or harmlessly fading — no readable danger boundary
- Active zone now has a **bright pulsing rim** on the lethal edge (`z.radius`, exactly matching the collision) plus a saturated pulsing fill, so the player can read where and when it hurts
- When spent (after the 1 s grace, `isDangerous` already false) it **desaturates to dull grey-green** and drops the rim — clearly safe
- `PoisonZone.remove()` now disposes geometries/materials
- Cache-bust `?v=15` → `?v=16`; HUD label → v60

---

## Archive

**v50–v59 summary (2026-06-30)**
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
