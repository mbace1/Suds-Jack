# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v33 — 2026-08-12

**The ring, the seat, and the floor.** Three more pieces from the same
concept-to-mesh pipeline as v32, chosen for cost: one obelisk asset stands
six times around the void (clones share geometry and one material — a whole
ring for one texture), the dais that was already meshed in the v32 batch takes
the arena centre, and the floor gets stone paneling that is not a mesh at all.

The dais is the one piece allowed inside the rim, because it is floor, not
scenery: sunk to ankle height (top 0.14u) under the spot the Leviathan rises
through, and dimmed to 0.22 — at monument brightness it was a bone-white splat
that fought the fight for attention and camouflaged bone-white skulls flying
over it. At 0.22 it is a carved shadow. Nothing collides with it.

The paneling is a pre-graded 128² bake (assets/env/floor.png, 19 KB) drawn
into the same canvas the procedural soot uses, so the reactive floor shader —
music pulse, hurt flush — never knows the difference. Graded to the old
floor's near-black envelope with oxblood in the seams; if the fetch fails the
procedural floor simply stays, offline included (it is precached).

New payload: obelisk 210 KB + dais 201 KB + floor 19 KB ≈ 430 KB.
Meshy spend for everything in this entry: 30 credits (the obelisk — the dais
was already paid for, the floor texture cost nothing).

## v32 — 2026-08-11

**Monuments in the void.** The first mesh assets this game has ever shipped:
four carved silhouettes standing beyond the rim — a broken hand reaching up out
of the dark, a ruined basalt gate, a toppled colossus head, and an inverted
mountain hanging into nothing.

This does not take back the v26 reset. That rule was about the *play field*:
nothing the player could mistake for cover, nothing competing with the fight.
These sit at r 38–52 against an arena of 26, are dimmed to roughly the horizon
ring's value, and are deliberately only four. The scene fog does the rest — a
monument is a silhouette dissolving into the void, not a backdrop. Nothing is
collided against, spawned near, or reachable.

Built through a concept-to-mesh pipeline (generated concept art → image-to-3D →
remesh), then simplified to 3.3–4.7k triangles with 512px textures: **1.03 MB
for all four**, precached with the rest of the shell so the offline promise
holds. Two rules fall out of this renderer having no lights at all — every
imported material is converted to `MeshBasicMaterial` (a standard material with
no light renders pure black), and the baked albedo is the only shading there
is, which is why the concepts were lit flat to begin with.

Also vendors `GLTFLoader` + `BufferGeometryUtils` (r167, matching the vendored
three) and adds `environment`, `camera`, `scene` to `window.__hd` for the gate.

## v31 — 2026-08-09
**PURE now follows the Devil Daggers gameplay spine**
- PURE abandons the random pressure director for a fixed, learnable spawnset:
  spawners arrive from 3 seconds onward on the reference cadence, emit 9+1 or
  10+1 skull waves every 20 seconds, and lead into gem thieves and centipedes.
- Spawner, leader and centipede health/gem yields now form the reference's
  early economy. PURE is one-hit survival with dash and REAP disabled; HYPER
  remains an optional remix.
- Gems live for 10 seconds, cross the arena only while the hand is idle, and
  are pushed away by shotgun blasts. Upgrades move to 10/70 gems; later gems
  become RMB/LT homing ammunition, and banking 150 unlocks the final hand.
- Stream and burst tiers move to the reference-shaped 20/40/80/106 and
  10/20/40/60 cadences. A second downward burst near the apex completes the
  double dagger jump.
- Basic skulls gain deeper sockets, longer swept horns and a separately
  hinged jaw that bites faster at close range. The original ash-and-bone claw
  returns while keeping the bottom-centre framing.

## v30 — 2026-08-09
**The weapon and clock own the frame**
- The firing hand moves from the lower-right corner to the bottom centre, with
  four separated fire-dagger fingers rising from a near-black crimson palm.
- Every dagger tier now begins dark and grows hotter, preserving the four-tip
  silhouette while making the weapon read against the empty arena.
- Kills, gems and style leave the active run HUD. The survival clock remains;
  Hub, pause and Toko controls dim until hovered and return fully on menus,
  pause and death.
- The gameplay gate now locks the centred hand pose, hot-finger/dark-palm
  palette and timer-only active frame alongside the v29 movement checks.

## v29 — 2026-08-09
**Movement and fire finally reward the same skills as the reference**
- Direct sliding becomes velocity-based 90s-FPS movement: forward-strafe runs
  faster than a straight line, air steering preserves momentum, and a timed
  landing hop carries speed into the next arc.
- The free double jump is removed. A downward tap-burst just after takeoff now
  produces the real extra-height move: a one-charge dagger jump.
- Straight-running is no longer safe. Basic skulls outrun it but turn slowly,
  making circle-strafing the readable answer instead of simply backing away.
- The stream starts sooner and forms a slower, denser whip; tap-burst daggers
  travel much faster with a shorter recovery and uneven fingertip origins.
- Dagger hits use an authored 8px nearest-filtered impact star, and the gate
  now covers acceleration, diagonal speed, hopping, dagger jumps and projectile
  cadence alongside the v28 software-rendering checks.

## v28 — 2026-08-09
**The frame finally reads like software rendering**
- High-DPI cleanliness is replaced by a deliberately coarse internal raster,
  enlarged with nearest-neighbour pixels across every performance tier.
- The luminous grid becomes a deterministic 128px soot-and-blood floor with
  broken slab seams, chunky texels and no filtering or mip blur.
- The desktop crosshair is gone. The four-finger claw and its ember stream now
  carry the aim, matching the reference instead of a generic browser FPS HUD.
- The gameplay gate covers raster scale, hard pixel enlargement, the unfiltered
  floor and crosshair removal alongside the existing combat checks.

## v27 — 2026-08-09
**Enemies and weapon finally own distinct silhouettes**
- The basic chaser gains a broad swept-horn profile, deeper black sockets,
  hotter red eyes and warmer bone. Its face reads against the void before the
  player is close enough to parse voxel detail.
- The old tube-like gauntlet is replaced by an original four-finger claw with
  separated bone digits, dark palm breaks and ember-orange fingertips.
- Tap fire now produces a longer, visible claw kick and roll while held fire
  stays a tighter vibration. Warm tapered dagger projectiles replace the white
  box streaks and launch farther from the near plane.
- The controlled reference frame and software-WebGL gameplay gate cover the
  new silhouette dimensions, four firing tips, recoil response, projectile
  colour, minimal arena and zero browser errors.

## v26 — 2026-08-08
**Devil Daggers becomes the visual target**
- The procedural background kit is gone: five rifts, twelve pylons, twenty-four
  horns, ninety-six shards, four arches and the lattice are replaced by one
  dim horizon line. The floor, enemies and weapon now own the frame.
- The view returns to a conventional fixed 90-degree perspective. Rendering
  drops antialiasing, lowers exposure, tightens black fog and keeps all
  spherical, rear-view, smear, chroma and edge overlays off by default.
- The sky is an almost-black void with one low red ember band. Grid intensity
  falls below the bloom threshold and background dust drops from 400 motes to
  80 faint points.
- Enemy hulls retain their authored low-poly planes instead of being heavily
  smoothed. The first-person hand moves to bone, ash and orange-red dagger
  colours across its weapon tiers.
- A focused software-WebGL gate verifies the conventional camera, minimal
  environment, firing path and zero browser errors; a controlled basic-skull
  frame is captured for visual comparison.

## v25 — 2026-08-08
**Remove what does not help the fight**
- The v24 combat-driven projection, rear holograms, spectral rim, contrast
  escalation and muzzle-star treatment are removed. Camera FOV no longer
  expands with style, pressure or weapon level.
- New clean defaults keep spherical projection, smear, chromatic separation
  and edge tint off. A fresh settings key ensures the reset applies to
  returning players instead of inheriting the previous spectacle stack.
- The peripheral red warning, dash speedlines and screen-space impact ripple
  are disabled. Bloom is reduced from 0.50 to 0.32 with a tighter threshold,
  leaving enemy silhouettes and the arena grid legible.
- The focused software-WebGL gate verifies a playable run, stable FOV, firing,
  restrained bloom, absent overlays and zero browser errors.

## v24 — 2026-08-08
**The view becomes part of the weapon**
- The spherical projection now opens dynamically from a wide, stable aiming
  view toward nearly 180 degrees as combat pressure, weapon power and style
  rise. Peripheral expansion is continuous rather than a binary effect.
- Rear threats are separated from rear space as animated red holograms:
  darker rear geometry, enlarged silhouette-preserving outlines and live scan
  breakup keep actual enemy shapes readable against the arena.
- The final image gains combat-reactive spectral separation, pearlescent edge
  colour, hardened contrast and short radial muzzle stars. Shotgun bursts and
  dagger streams now change the frame itself without covering the reticle.
- Reduced-motion and performance tiers retain their existing fallbacks. New
  smoke probes lock the dynamic projection, FOV and chromatic escalation.

## v23 — 2026-08-08
**The arena wraps around you**
- A real spherical projection now bends the live 3D arena through the side
  view and toward the world behind the player while preserving a conventional
  forward centre for precise aiming.
- A separate enemy-only cube capture burns real rear silhouettes into the
  spherical view. Small distant forms receive a shape-preserving dilation;
  generic warning bars no longer cover the scene on supported quality tiers.
- The performance governor updates the static world and moving threats at
  separate cadences, disables the extra captures on low tiers, and retains the
  lightweight peripheral warning as its fallback. VIEW SPHERE / NORMAL is
  available in the pause menu.
- Projection state and capture health are exposed to the smoke gate. The
  offline graph, hub copy and cache tokens ship with the playable build.

## v22 — 2026-08-08
**Near-parity world and enemy art pass**
- The remaining placeholder enemies are now full 3D source sculpts: Watcher,
  Spider, Leviathan, Revenant, Husk, Totem, Egg and Blinker gain readable
  anatomy, depth, damage surfaces and distinct silhouettes from every angle.
- The arena gains an original procedural environment kit: five abyss rings,
  twelve ritual pylons with split horns, ninety-six orbiting void shards, four
  broken horizon gates and a reactive spherical threat lattice.
- A peripheral threat shader makes enemies behind the camera visible as a
  signed red burn, completing the 360-degree awareness language without HUD
  arrows. Environment motion and emissive intensity react to combat, trauma,
  music and the Leviathan while the performance governor sheds assets by tier.
- The offline graph, smoke gate, hub copy and cache tokens ship together.

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
