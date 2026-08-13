# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v25 — 2026-08-13
**The pressure ceiling — measured, not guessed**
- Instrumented the real director over a 150 s run and read what is actually
  ALIVE rather than what the budget says. v4.36's curve had a cliff in it:
  minute one averaged 6 live threats, minute two averaged 41 and the late
  game climbed to 88 with no ceiling. Budget controls the spawn RATE; what
  kills you is the standing POPULATION, and population runs away whenever
  spawns outpace kills — which is also a death spiral, since falling behind
  makes you fall further behind.
- New `T.director.ceiling`: the director refuses to add pressure while the
  floor is already at capacity (10 + 0.15·t, capped at 38 live threats;
  totems and eggs don't count — they are furniture, and shouldn't crowd out
  real pressure). Debuts are exempt: a new threat always gets its moment.
- The first cut of this gated only the pulse filler and moved the measured
  population by ONE body. The real faucet is the totem exhale — six totems
  on a ~2 s cycle out-produce the entire pulse system — so the ceiling
  governs that path too. Late-game population is now flat at the ceiling
  (46 avg / 47 peak) instead of climbing past 88.
- Budget rateB softened 1.9 → 1.45 with the ceiling doing the bounding, and
  the unlock list compressed: an unlock only opens ELIGIBILITY, the debut
  lands on the NEXT pulse, so measured arrival ran 8-14 s behind the
  numbers and blinker was slipping out of minute one.
- Debug: `getPressure()` reports live count vs the current ceiling.

## v24 — 2026-08-13
**The arena — an uplit rig and a floor made of plates**
- The asset light rig was a generic studio setup (white key from above); it
  is now motivated by the world, which has exactly two light sources: the
  glowing grid floor and the ember horizon. The hemisphere is INVERTED —
  ground term = the white grid, sky term = the void — so imported meshes are
  lit from the floor up, which is why a Meshy skull now reads as standing in
  the arena instead of pasted into it. Three crimson horizon lights ring the
  player, and both the uplight and the ember answer the same uPulse/trauma
  signals the floor does, so assets flush on damage and beat with the music.
- The floor is PANELS, not a wireframe. The old texture was two grids of
  hairlines over black — placeholder scaffolding the moment anything lit
  stood on it. Now each plate is a physical object: recessed seams, a bevel
  that catches light on two sides and falls away on the other two, corner
  bolts, vent slots on some plates, per-plate value variation, at 512px with
  anisotropy (the floor is almost always seen at a grazing angle). The
  plates stay near-black; it is the SEAM that uGlow lifts into bloom, so the
  light now reads as coming up through the floor rather than drawn on it.
- New `ARENA_ASSETS.floorPanel`: register a Meshy floor tile and it is
  merged to one geometry, instanced across the disc, clipped to the arena
  radius (the rim must still end cleanly — no barrier visual) and randomly
  quarter-turned so a directional tile doesn't stripe the floor. It inherits
  the same light rig as the enemies, which is the whole point.
- Debug: `getAssets()` gains arena/panels/uplit/ember; `getFloorCanvas()`.

## v23 — 2026-08-13
**The balance pass — minute one is a parade, minute two is the squeeze**
- Owner's brief: more varied enemies in the first minute, harder in the
  second. The whole director schedule moves into `tuning.js` (`T.director`)
  so the curve is one file: unlock list, pulse cadence, budget knees, and
  the totem/thorn/leviathan clocks.
- MINUTE ONE is now a parade: the first pulse lands at t=10 (was 20) and
  cadence is ~9.5 s, so six types debut before the minute is out (skulls,
  watcher, husk, brute, spider, blinker) plus totems and thorns — eight
  distinct threats where the old curve showed four. Crucially the early
  budget rate is tiny (0.2/pulse), so each debut arrives nearly alone:
  per-pulse pressure in minute one actually DROPS (2.8–5.1 vs 3.8–9.0).
  Variety up, per-encounter difficulty down.
- MINUTE TWO is the squeeze: the parade is over, so the same cadence spends
  a budget climbing 1.9/pulse — total minute-two pressure is up ~61%. Same
  enemies, suddenly in numbers.
- Fixed while in there: the heavy-pulse centrepiece gates hardcoded t=100
  and t=120, the OLD serpent/dread unlock times, so they silently disagreed
  with the pool the moment it was retuned. They read from the pool now.
- New debug hooks the gate needed and hand-tuning wants: `freezeDirector()`
  (stop spawns, keep everything else live) and `setInvulnerable()` — since
  a player who never moves no longer survives the length of the suite.
- Gate at 49 checks; the curve's SHAPE is asserted (minute-one variety and
  low per-pulse pressure, minute-two ≥2.5x), so a future rebalance can move
  numbers but not silently flatten it.

## v22 — 2026-08-07
**Mesh asset integration — the Meshy pipeline's landing pad**
- New `js/meshassets.js`: register a Meshy GLB per MODELS slot and it takes
  over that enemy — the mesh rides in the v4.32 hull slot as the alive-skin,
  and the lattice is VOXELIZED from the mesh at load (surface rasterization
  with texture-color sampling + enclosed-interior fill + the AO bake), so
  chips, chunk detachment, death bursts and the bone-yard work unchanged.
- Damage tells the truth: when enough lattice is gone (`shed`, default 22%)
  the skin cracks off and the wounded voxel body fights on under the
  re-formed hull.
- A three-light asset rig (white hemisphere + key, dim crimson fill) lights
  ONLY imported assets — everything native stays unlit MeshBasic. Imports
  are re-materialed to Lambert with the albedo map kept.
- GLTFLoader r167 + BufferGeometryUtils vendored (dynamic import — the
  110 KB loader is only fetched when assets are registered); everything is
  fail-soft, so a missing or broken GLB falls back to the built-in model.
- `assets/README.md` documents the drop-in; smoke gate at 40 checks.

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
