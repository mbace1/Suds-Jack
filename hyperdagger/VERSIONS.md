# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v21 — 2026-08-07
**Shotgun economy + the offline gate**
- The tap-burst gets DD's actual economy: the burst wins the MOMENT, the
  stream wins the MINUTE. Burst count now scales with weapon level
  (10/12/12/14) and the lockout is 0.8 s, so burst DPS sits below stream
  DPS at every level — tap-spam is no longer the optimal close-range play.
  The gate asserts the invariant arithmetically, so no future tuning pass
  can silently re-break it.
- New `test/offline.cjs` (6 checks): worker takes control, precache
  populated, the game boots and STARTS A RUN with the server dead and the
  browser offline. The arcade HOME shell is the one tolerated miss — it is
  deliberately not precached, because offline the hub it leads to is
  unreachable and a dead button is worse than none.

## v20 — 2026-08-07
**Enemy release hygiene — caught by the new long-run health gate**
- The smoke gate gained a spawn/kill plateau check (geometry, textures,
  scene-graph size across repeated cycles) and it immediately caught a
  leak: an enemy killed by flagging `alive = false` without `killEnemy`
  was spliced out of the array but its group stayed in the scene and its
  GPU resources were never released. Production kill paths were safe by
  convention; debug and edge paths were not.
- `VoxelEnemy.remove()` is idempotent now, and the prune loop releases on
  splice — every death path frees exactly once, by construction.

## v19 — 2026-08-07
**The mesh hull — smooth skin alive, voxels where it tears**
- Enemies no longer read as cube stacks (owner: "too Minecraft", decided off
  a rendered A/B/C test): while ALIVE each wears a smoothed mesh skin built
  from its own voxel lattice — culled outer faces, welded corners, 3 passes
  of heavy Laplacian smoothing, one flat color per face (HDR eyes stay
  crisp). The voxels remain the physics currency: chips tear real holes and
  the skin re-forms around them (0.1 s throttle), severed islands and deaths
  still burst instanced cubes.
- The hull rides as a child of the InstancedMesh with count=0 hiding the
  cubes — every transform, chip, detach and burst path is untouched.
- `noHull` opts a model out: the gauntlet keeps its checkerboard, the
  blinker keeps its glitch shards.
- LOOK SMOOTH / CUBES in the pause menu (persisted); the perf governor
  falls back to cubes below tier T2. Smoke gate grows to 31 checks.

## v18 — 2026-08-07
**Detail overhaul — sculpted models, baked AO, serpent swoop, glow trim**
- The skull family is authored at 11×5×10 (357 source voxels, was 7×3×6 / 91)
  with real anatomy: jaw, teeth rows, nasal cavity, flared cheekbones, deep
  sockets with the pupil recessed inside, brow ridge, dome. Serpent rings are
  open armored hoops with a dorsal ridge; the head has a dark maw, recessed
  eyes and horn tips; the watcher grew an armored lens + antenna. voxelSize
  rescaled everywhere so world size and hitboxes are unchanged.
- parseModel now BAKES SHADING: neighbor-occlusion darkens crevices, sky
  exposure lifts tops, a deterministic hash grain breaks flat fills. HDR glow
  voxels pass through untouched, so bloom still bites the same.
- The AUTO subdivision ladder sits one tier lower ([3,2,2,1,1], coarse ceil
  ×8) — detail now comes from the sculpt, not from subdividing a blob.
- Neon trimmed (owner's call): edge rim 0.30→0.15, grid glow 1.8→1.5.
- The serpent CRUISES AS A SINE IN Y (4.8±3.9, stiffer steering) — it dives
  to the floor and arcs overhead instead of flying level; chain-follow turns
  that into a visible body wave.

## v17 — 2026-08-07
**HYPERDEMON visual push — pastel sky, glowing grid, neon rims, dash smear**
- Sky: a dim pastel iridescence (three hue cycles drifting around the
  horizon, desaturated toward white) replaces the greyscale band shimmer;
  the red ember horizon stays the danger line.
- Grid: `uGlow` 1.8 lifts the major lines past the bloom threshold — the
  floor itself glows, hotter on music beats.
- Neon rim: a new edge-detect pass tinted by the STYLE accent, placed
  before the smear so silhouettes streak and flare; EDGE toggle in the
  pause menu, shed automatically below perf tier T1.
- Motion smear is dynamic: damp 0.74 at rest, up to 0.86 mid-dash — the
  hardest smear is always transient (the 0.82-starburst trap stays closed).

## v16 — 2026-08-07
**Devil Daggers gunfeel — TAP = shotgun, HOLD = stream**
- The reference's two-mode trigger, manually aimed on desktop and pad: a press
  released inside 0.22 s dumps a 10-dagger burst in a wide cone (recoil, FOV
  kick, its own synth voice) and locks the hand for 0.6 s; holding past the
  delay runs the stream. The old fire-while-moving auto-stream is REMOVED on
  desktop/pad — aim and trigger discipline are the skill again.
- Touch alone keeps auto-fire while moving (two sticks already claim both
  thumbs). Tips card rewritten to teach tap-vs-hold.
- The smoke gate now lives in-repo at `test/smoke.cjs` (19 checks) like every
  other project's, so it survives environment resets.

## v15 — 2026-07-31
**tuning.js — every feel number in one file**
- New `js/tuning.js` (toko-drop's pattern): player body, mouse/touch/pad look
  rates + turn ramp, pad stick shaping, touch gesture windows, aim assist,
  dash, the full weapon table, gem physics, REAP, style bleed, HYPER economy.
- Pure refactor — behavior provably unchanged (49-section suite green).
- Drift fix: style bleed documented at its real 5 + v·0.045 (the v4.1 soften).

## v14 — 2026-07-31
**REAP + controller-first aim**
- REAP (R/E, ✕/LB): spend the bone-yard — devours every settled bone within
  7 u into a damage pulse scaled by the pile; bare floor refuses without
  burning the cooldown. The carnage is now a resource as well as a threat.
- Controller-first aim, gamepad only (mouse untouched, touch untouched by
  explicit decision): radial stick shaping with a response curve, a turn ramp
  for fast 180s that decays 3× faster than it builds, and sticky-reticle aim
  assist (slows tracking near a target, never aims for you) with an
  AIM ASSIST pause-menu toggle.
- Press kit under `press/` (PRESS.md + six 1280×720 shots).

## v13 — 2026-07-27
**The log starts here**
- Voxel enemies, the style meter, gamepad support and the paced onboarding — the state this log starts from.
- Numbered from the module token this project already carried (`?v=13`), so the
  version on the arcade does not jump when the log takes over from it
