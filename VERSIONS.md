# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When v41 is added, move v31–v40 into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v33 — 2026-06-29
**Pre-death tear**
- Goo vertex shader gains `uTear` — violent high-frequency thrash (0.22×radius) that convulses the blob as it dies
- Driven during `updateDeath`: strongest at death onset (~1), fading to 0 over the 0.28 s pop
- Death now reads as a rupture/burst rather than a clean scale-pop; blobs only (Phong cubes unchanged)
- Verified: uTear spikes to ~0.87 at death onset, decays, death completes cleanly, zero shader errors

## v32 — 2026-06-29
**In-shader hit ripple**
- Goo vertex shader gains `uHit`/`uHitDir` — a concentric surface shockwave that spreads from the bullet's impact point and expands as it decays
- `Enemy.hit(impactX, impactZ)` triggers it; ripple eases out over ~0.28 s on top of the existing emissive flash + squash
- Impact direction passed from the bullet position so the wave originates where the shot lands (blobs only — Phong cubes unaffected)
- Verified: uHit 1→0 decay on a surviving blob, clean shader compile, zero errors

## v31 — 2026-06-29
**Player movement VFX — velocity stretch**
- Player now lunges along travel via the goo `uStretch`/`uStretchDir` uniforms (added v29), driven by smoothed velocity
- Subtle while walking (~0.15), strong elongation along a dash (~0.44), relaxes to 0 when idle
- Complements the existing dash ghost-trail (the player's "trail they leave")
- Player-only change; verified idle 0 / walk 0.15 / dash 0.44 / relax 0, zero errors

## v30 — 2026-06-29
**Better-planned enemy clusters — pincer spawns**
- Groups (3+ count) now fan across a ~1.5 rad arc instead of clumping at one edge point — they arrive on a broad front and pincer the player from several directions
- Group members stagger their entry (×0.12 s each) for a rolling advance, and get a ×1.2 speed push so a cluster pushes in with intent rather than drifting
- Twins (count 2) stay paired; single enemies unchanged
- Fixes "slow-moving clusters that don't challenge" — a swarm now surrounds rather than presenting one dodge-able blob
- Verified: swarm wave 3 fields 15 enemies across a 345° spawn-direction span, zero errors
- (Systemic spawn/movement pass; per-enemy individual tuning still planned for later)

---

## Archive

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
