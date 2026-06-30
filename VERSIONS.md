# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v60 is reached, move v51–v59 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v59 — 2026-06-30
**Boss identity — every-8th-wave boss now looks and behaves like a boss**
- Boss-wave enemies (3× HP, 1.5× scale) get a **pulsing gold ground ring** that follows them, making the boss unmistakable from the top-down view
- **Enrage**: below 35% HP the boss speeds up ×1.45 for a desperate final phase, and its aura ring flares **red** and throbs
- `Enemy.setBoss(maxHp)` flags the boss + stores its enrage threshold; aura managed in `main.js` (`makeBossAura`/`bossAuras`/`clearBossAuras`), disposed on death and on all run-reset paths
- Cache-bust `?v=14` → `?v=15`; HUD label → v59

---

## v58 — 2026-06-30
**Blob behaviour pass — each blob gets a distinct signature (like the v40 cubes)**
- **GLOBBO → Pouncer**: stalks at base speed, then crouches (squash telegraph) and leaps at the player at ~3× speed; cycles every ~2 s when within range
- **WEEVA → Drifting spiral turret**: still weaves, but now also slowly closes on the player (was meandering in place, never approaching) while firing its accelerating spiral
- **SPITTOR → aimed ring**: its 8-bullet ring is now rotated so one bullet leads straight at the player, reading as a real threat instead of a fixed grid
- **FANNER → heavier beat**: every 3rd volley fans wider (9 shots over ~0.95π vs 6 over 0.6π)
- **SPLITTA → pre-burst tell**: pulses green once at ≤2 HP, telegraphing its on-death bullet burst
- `_ring()` gains a `base` angle param; new blob state (`_pounceState/_pounceT/_pounceDir`, `_fannerShot`)
- Cache-bust `?v=13` → `?v=14`; HUD label → v58

---

## v57 — 2026-06-30
**Bigger, more readable bullets + release tooling**
- Bullet visuals enlarged for readability: enemy non-fat `1.25 → 1.6`; player bullets get a visual-only `×1.3` boost (`PLAYER_BULLET_VISUAL_BOOST`). Fat bullets unchanged at `3.0`
- Player hitbox is **unchanged**: `playerBulletScale` drives both the player-bullet collision radius and the "bigger bullets" upgrade, so the new boost enlarges only the rendered halo/core — no difficulty change
- `scripts/bump-version.sh <N>`: one command bumps the cache-bust token across the module graph, the HUD label, the README H1, and prepends a `VERSIONS.md` stub (replaces the error-prone 6-spot manual edit; README header had drifted to v50)
- `scripts/release.sh`: resyncs local + remote feature branch to the merged `gh-pages` tip after a squash-merge, ending the recurring branch divergence and the stop-hook false positive
- Cache-bust `?v=12` → `?v=13`; HUD label → v57

---

## v56 — 2026-06-30
**Gate laser beam now aligns with its posts**
- The visible laser/glow beam was rotated by `angle + π/2`, but three.js Y-rotation maps local +X to `(cos θ, -sin θ)`, flipping the z-axis vs. the post placement direction `(-sin a, cos a)`. For most random angles the beam was mirrored and crossed the posts instead of connecting them (only lined up at angle 0/π/2)
- Fix: rotate the beam by `-(angle + π/2)` so it matches the posts and the hitbox; gates now look consistent at every orientation
- Cache-bust `?v=11` → `?v=12`; HUD label → v56

---

## v55 — 2026-06-30
**No-cache headers on index.html to fix stale mobile browser caching**
- Added `Cache-Control: no-cache, no-store, must-revalidate` + Pragma + Expires meta tags so mobile browsers always fetch a fresh `index.html`
- Cache-bust `?v=10` → `?v=11`; HUD label → v55

---

## v54 — 2026-06-30
**Revert bullet sizes to pre-v51 bullet-hell scale**
- Player bullet `0.7 → 1.0`, enemy non-fat `0.85 → 1.25`, fat `2.5 → 3.0`; collision radii unchanged
- Cache-bust `?v=9` → `?v=10`; HUD label → v54

---

## v53 — 2026-06-30
**Fix feedback form buttons on mobile — touch events no longer swallowed**
- Root cause: `InputManager` called `e.preventDefault()` on all `touchend` events except `#dsgn` and `#upgrade-panel`, suppressing synthetic `click` events on the game-over feedback chips and buttons
- Fix: added `#overlay` to the `inUI` exclusion selector in `input.js` so touches on overlay children are not preventDefault-ed; browser now fires click events normally for feedback chips, SEND & CONTINUE, and SKIP
- Cache-bust `?v=8` → `?v=9`; HUD label → v53

---

## v52 — 2026-06-30
**Contra-style weapon pods: glyphs on moths, 8 weapons, kill-all bonus**
- Moths now always drop weapon pods with a letter glyph (S/B/L/R + Lv2 S2/B2/L2/R2); gates give non-weapon drops (HP/invincible/firerate)
- New weapon modes: **L** (Laser — pierce), **L2** (Laser+pierce faster), **R** (Rapid — 2× fire rate), **R2** (Hyperspeed — 3.6× fire rate), **S2** (7-way spread), **B2** (5-shot burst)
- Kill all moths before any escape → **2-choice pod pair** spawns side-by-side at last kill; walking into one dismisses the other. Lv2 pods (28% chance) unlock from wave 4+
- `equipWeapon(podId)` helper sets `_weaponMode` and weapon-local pierce flag; pierce card (`BULLET_CONFIG.playerPiercing`) stacks independently
- Glyph rendered via `makeGlyphTexture()` → `THREE.Sprite` that bobs with the orb; disposed on collect/remove
- HUD weapon indicator now shows pod letter in pod color
- Cache-bust `?v=7` → `?v=8`; HUD label → v52

---

## v51 — 2026-06-30
**ORANGE_CUBE shoots while moving + smaller bullet-hell visuals**
- ORANGE_CUBE state machine (moving→aiming→shooting→cooldown) replaced with always-moving flop + independent fire timer (`_fireT`): cube continuously tumbles toward its repositioning target while firing a bullet wall every 3–4.5 s, no pauses
- Pre-fire emissive flash now triggers when `_fireT < 0.6` (was tied to the `aiming` state)
- ORANGE_CUBE now fires non-fat bullets so the wall travels at full enemy speed (7 u/s), matching the bullet-hell aesthetic; removed the aim-arrow mesh (no longer has an aiming phase)
- All bullet visual scales reduced ~30%: player `1.0 → 0.7`, enemy non-fat `1.25 → 0.85`, fat `3 → 2.5`; collision radii unchanged (`BULLET_R = 0.15`, `FAT_BULLET_R = 0.45`)
- Cache-bust token `?v=6` → `?v=7`; HUD label → v51

---

## v50 — 2026-06-30
**Feedback form interactivity fix — buttons and textarea now respond**
- Root cause: `#overlay` has `pointer-events: none` in CSS, and inline `pointer-events:auto` on child elements is overridden by the inherited block in some browsers/contexts
- Fix: `showGameOver()` now sets `overlay.style.pointerEvents = 'auto'` so the death-screen feedback chips, textarea, and SEND/SKIP buttons are fully interactive
- `returnToTitle()` resets `overlay.style.pointerEvents = ''` to restore the CSS default (`none`) for all other overlay states (title, wave announcement)
- Cache-bust token `?v=5` → `?v=6` across `index.html` + all relative imports; HUD label → v50

---

## Archive

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
