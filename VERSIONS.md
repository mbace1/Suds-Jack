# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v74 — 2026-07-02
**Wave-clear flash — the instant-end (v22) now gets a visual + audio beat**
- Waves have ended instantly on the last kill since v22, but nothing marked the moment — added a brief white screen pulse (`waveClearFlashT`, 0.4 s, fades from 30% opacity) drawn on the HUD canvas the instant `enemies.every(dead)` triggers
- Also wired up `audio.waveClear()` — a 4-note ascending chime that's existed in `audio.js` since early versions but was never actually called anywhere
- Cache-bust `?v=29` → `?v=30`; HUD label → v74

---

## v73 — 2026-07-02
**Per-blob visual accents — the 5 blobs now read distinctly at a glance**
- Each blob got a distinct *behaviour* in v58 (pounce/aimed-ring/wide-fan/orbit-spiral/burst) but all still shared the identical goo shader, making them hard to tell apart mid-swarm. Added small glowing accent beacons (children of the mesh, own `MeshBasicMaterial`, additive) so silhouette + colour now differ per type without touching the shared goo shader (used by every blob **and** the player)
- **GLOBBO** (Pouncer): single forward beacon. **SPITTOR**: one large "mouth" beacon. **FANNER**: 3-wide fan of beacons. **WEEVA**: single beacon that continuously orbits the body (echoes its fired spiral). **SPLITTA**: twin "eye" beacons
- Beacon colour reuses each type's `bulletColor` — the colour of the bullets it actually fires, reinforcing recognition
- Cache-bust `?v=28` → `?v=29`; HUD label → v73

---

## v72 — 2026-07-02
**New powerup: Score Multiplier — gate drops now have 4 options**
- New **Score Multiplier** powerup (gold orb): doubles all kill-streak score for 10 s. Drops from gates alongside HP/Invincible/Fire Rate
- Pulsing gold `×2 SCORE` HUD indicator (right side, below HI) shows while active; localized in en/ja/fi
- `scoreMultT` timer added alongside the existing streak-flash/hit-flash timers; multiplies the `100 × streak` kill score only (the once-per-wave clear bonus is unaffected — a deliberate scope choice, not a bug)
- Cache-bust `?v=27` → `?v=28`; HUD label → v72

---

## v71 — 2026-07-02
**Boss-exclusive enemy: OMEGA — every-8th-wave boss is no longer just a scaled-up regular**
- New **OMEGA** enemy type: a faceted crystal core (icosahedron geometry, distinct from every blob/cube/TORO silhouette) that only ever spawns as the guaranteed every-8th-wave boss — never appears in the regular enemy pool
- Behaviour: holds a mid-range orbit around the player while firing an aimed 5-shot fan; once enraged (<35% HP, reusing v59's `_enraged` flag) it switches to a full 12-point radial ring burst — a genuine pattern change, not just a speed-up like the pre-v62 TORO enrage
- **Bug fix discovered while wiring this up**: the squash-spring animation was resetting `mesh.scale` toward ~1.0 every frame for any non-TORO/BAMBU/PYRA enemy, silently erasing the elite/boss `_radiusMult` size boost applied at spawn — meaning OMEGA (and existing elite blobs/cubes) wouldn't actually render bigger despite having more HP. Fixed by baking `_radiusMult` into the per-frame scale assignment
- `getEnemySchedule()`'s boss-selection now always picks OMEGA instead of choosing from `[TORO, PYRA, BAMBU, PURP_CUBE]`; those four remain in the regular pool as normal/elite/twin/group spawns, unaffected
- Cache-bust `?v=26` → `?v=27`; HUD label → v71

---

## v70 — 2026-07-02
**New weapon pod: Homing (H/H2) — 10th weapon type**
- New **Homing** pod: fires a bullet that gradually steers toward the nearest alive enemy each frame (a turn, not a snap-lock, so it stays dodgeable/avoidable by enemies rather than a guaranteed hit). Lv1 turn rate 6, Lv2 (`HOMING2`) locks on tighter at turn rate 10 and fires ~33% faster (`baseRate × 0.75`)
- `BulletPool.spawnDir()` gains `homing`/`turnRate` params; `BulletPool.update()` gains an optional `enemies` arg and a `_steerHoming()` step that finds the nearest alive enemy and rotates the bullet's velocity toward it each frame
- `WEAPON_PODS` grows to 10 entries (`H`/`H2` added to `LV1_WEAPONS`/`LV2_WEAPONS`); reuses the existing glyph/equip/HUD pipeline unchanged
- Cache-bust `?v=25` → `?v=26`; HUD label → v70

---

## Archive

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
