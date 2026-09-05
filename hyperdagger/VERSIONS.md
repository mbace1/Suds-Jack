# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md -->

## v38 — 2026-08-22
**Retro voxel heaven — the roster is your Meshy art: the mesh alive, cubes underneath**

Owner's brief: a total voxel redo with smaller voxels, maximum visual
payoff, "retro voxel heaven", keeping the established plan. The first bench
sheet settled the whole direction in one picture: the string-art skull at ×1
and at ×27 have the SAME silhouette. Subdividing a blob is not detail. The
payoff had to come from the sculpt, and — the owner's own correction when an
SDF skull draft went up: "there are already skulls that look like this" — the
sculpts are theirs, from Nano Banana through Meshy. The engine's job is to
make them voxels.

**The hybrid — the owner's second correction, on seeing the lattice alone:
"what about the 3d models? these voxel balls alone don't look that good."**
So it is both, which is what v4.35 always described: the real Meshy mesh
rides as the ALIVE-SKIN — Lambert-lit, textured, the sculpt as sculpted —
and the lattice cut from that same mesh sits underneath. Skin and lattice
come from ONE prepared root, so they coincide exactly. A wound past 22% of
the lattice sheds the skin and the cube body underneath, holes and all,
fights on; a death bursts into cubes; the jaw and every other part hide
under the skin while it is up. `skin: false` gives cubes-only, and the skins
ride the perf tier's hull switch, so a low tier spawns bare lattices.

**The voxel route.** A manifest kind with `as: "voxel"` is turned upright (`tilt`, `yaw`), scaled to the HEIGHT of the
string-art slot it replaces (so hitboxes and every gameplay number hold),
rasterized at `pitch` (default: a third of the slot's pitch — the ×27 mini
size the game already budgets), and registered so `modelFor(kind)` hands it
to the enemy class. Chips, severed islands, gibs and the bone-yard all work
unchanged, because to the rest of the engine it is just voxels. Fourteen
kinds are registered: skull, dread, brute, spider, totem, watcher, husk,
blinker, thorn, egg, revenant, leviathan, serpent, serpent head.

**Colour is snapped, not sampled.** A Meshy bake carries texture detail far
finer than the lattice, and a cell sampled on its own is one random speck of
it — the first cut rendered as static. One pass of a 26-neighbour average
over the surface cells keeps the features a skull is made of (a socket's dark
spans many cells) and drops the ones it is not; then `palette: "bone"` runs
luminance through an S-curve and BANDS it to five values on the sculpt's
ivory, keeping a strong source red as crimson (the totem's mouths survive).
`lift` pulls a dark bake up the curve (brute, dread). `eyes` — normalized
[x,y,z] in the model's box, z=1 the front — burn HDR ember within `eyeR`
cells, recessed inside the socket, the way the sculpt's are. `jaw` cuts the
bottom fraction into a hinged jaw with the hinge on the def (`hinge`), so
the skull keeps its bite: the string-art skull's hand-tuned pivot offsets
drew the voxelized jaw over the head as stripes.

**The cube look.** Three things retro voxel art has that a smoothed hull
throws away, all switchable through `setVoxelStyle` and all free per cube:
every face under ONE light (top 1.0, front .86, +x .74, −x .58, back .50,
bottom .40 — a `faceShade` attribute on the one box geometry every sprite,
gib and bone shares; the light sits high, forward and to one side, which is
why a lit cube reads as a cube and not a hexagon); the baked AO snapped to
six value bands (with the per-voxel grain dropped when banding — rounded
flecks read as dirt: "a skull that looked unwashed"); and the lattice life
at 0.45 of the v4.31 shimmer, so a small voxel stays a small voxel. **Cubes
are the default look now**; LOOK SMOOTH still exists.

**The ladder still applies.** The governor walks string-art models down
×27 → ×8 → ×1; a voxelized asset has no subdivision to walk, so a T4 phone
would have got 16,653 cells per skull every spawn. Each kind is also cut at
double pitch as `def.lod`, and `modelFor()` hands that out when the ladder
is at its floor. Measured off the game: 149,549 cells across one of each of
the fourteen at fine pitch, 22,661 at the floor — the skull 16,653 → 2,323,
the leviathan 25,631 → 3,728.

**Traps, all found by rendering:** `pitch` already meant the lattice cell
size, and the rotation key reused the word — `pitch: 0.75` sliced the brute
into 0.75-unit cubes (the key is `tilt`). The brute export arrived nose-down;
a yaw cannot fix that, and its sign was settled by rendering four tilts, not
by reasoning (+0.75). Tilting changes the bounding-box height, so the
upright brute is ~6.5k cells and the foreshortened one was 39k — the smaller
number is the honest one. A dark bake lands in the bottom bands and loses
its sockets (`lift`). The watcher lost its iris to the bone remap
(`palette: "keep"` + one ember at the pupil). A skin cut alongside a lattice
may only be worn by a body cut from the SAME mesh: an enemy that spawns
before the assets finish loading holds the string-art sculpt, and a Meshy
skin over that would shed into a different skull — it stays a bare sculpt and
the next spawn gets the real pair. Cubes are also strictly heavier than a
hull under the SPHERE projection, which renders six cube faces per capture:
the gate's projection section had always left that option switched on when
it finished, which cost nothing while enemies wore smoothed skins and
stalled the suite outright once they wore full lattices — it restores the
default now. Skins ride the perf tier's hull switch, so the checks that test
a skin have to force the tier that HAS one — under a software renderer the
governor settles low and sheds them, which is the design working, not a bug.
Nor could the gate leave a run playing while it waited for fourteen sculpts
to load: the stationary player dies, the loop stops, and nothing ever puts a
skin on anything — it waits for the art, THEN starts the run.
The GLB urls are tokened (`?v=N`), because
the loader asks for them by that url and an untokened request cannot match a
tokened cache entry. The GLBs are NOT precached, though: 5 MB of art that
fails soft is the wrong thing to make somebody download before the worker is
useful, and sw.js is network-first with a cache write on every success, so
they land the first time you actually play. A cold offline visit gets the
string-art sculpts, which is the fail-soft path working as designed. The
offline gate found this honestly — it cut the cord mid-install and the first
kind the loader asked for was still in flight. And the smoke gate hung:
its hull section reached into "whatever dread just spawned", which now has no
hull by design — `debug.hullProbe()` proves LOOK SMOOTH on a string-art body
instead.

**What it costs to boot, measured rather than guessed:** cutting all fourteen
lattices is 1,446 ms of main-thread work in total (skull 210, leviathan 191,
thorn 26) — the rest of the ~14 s to a fully-armed roster is fetching and
parsing 5 MB of GLB. So the kinds are fetched ONE at a time, in the order the
director introduces them (skull first, leviathan last), with a frame yielded
between each: the menu is up immediately, the game is playable at once, and
the roster upgrades from string art to sculpt as each asset lands. `?assets=0`
skips the lot — the gate uses it on the pages that test the mode registry
rather than the art, because four reloads of 5 MB was most of the suite's
wall clock.

**The bench.** `voxel-lab.html` lists every registered asset, and
`__lab.revox(kind, overrides)` re-cuts one live from the loaded mesh — tilt,
yaw, lift, eyes, jaw, pitch — so an export is turned by looking at it. Copy
the printed cfg into `assets/manifest.json` when it reads right. Every art
question in this release was answered from a picture off this bench.

## v37 — 2026-08-22
**The Meshy art was in the repo and the loader was never called**

Deploying v36 meant looking at what is actually on `gh-pages`, and what is on
it is **5.1 MB of Meshy exports that no branch had ever carried**: twenty-one
GLBs in `hyperdagger/assets/` — skull, brute, husk, dread, blinker, watcher,
spider, thorn, totem, serpent, serpenthead, egg, revenant, leviathan, plus six
environment pieces and a floor texture. Art added straight to the deploy
target, which is the failure mode this repo already knows about: one reclaimed
container and it is gone. It is in the branch now.

**And none of it had ever been on screen**, for two separate reasons:

- `preloadMeshEnemies()` **was never called from anywhere.** The whole
  mesh-enemy system — loader, template cache, per-enemy skin swap, the
  MESH_FOR_TYPE table — was written, shipped and unreachable. Exactly the
  shape of the TRUCK bug in v36, found the same way: by asking what actually
  runs rather than what exists.
- It looked in `models/enemies/`, a second asset home that exists in no
  branch, while the documented one (`assets/README.md`) is `assets/`. So even
  called, it would have 404'd three times per boot and fallen back to voxels.

**One seam now: `assets/manifest.json`.** A kind listed there is loaded; a
kind absent is never requested, so the file existing is what makes "no art
registered" cost nothing — not even the GLTF loader is fetched. A kind is a
bare filename or `{ file, size, tint }`: `size` is the largest dimension in
world units, `tint` MULTIPLIES the baked albedo, so a Meshy export can be
pulled toward the house palette without flattening its texture away.
`scripts/hd-shell.mjs` reads the same file, so the worker and the loader
cannot disagree about which art exists.

**The skins were also being thrown away.** `mesh-enemies.js` re-materialed
every export to ONE flat unlit `MeshBasicMaterial` — and on an unlit pipeline
a flat fill means no shading at all, so the totem rendered as a featureless
pale slab with the texture Meshy baked for it discarded. `meshassets.js`
already had the right conversion (Lambert, albedo map kept, lit by the asset
rig on layer 2 so nothing native is touched); it is now exported as
`toLambert()` and both importers share it. Rendered side by side the
difference is the whole point of the pipeline: a white blob becomes a column
of three screaming faces, and the skull and spider read as sculpts with their
baked texture on. Worth naming for whoever turns them on: the Meshy exports
are flesh-toned, and the house palette is black and white with dark red as the
only contrast colour. `tint` is the knob for that.

skull's fit moved 1.15 -> 1.40, the height of the string-art slot it replaces,
because `assets/README.md` is explicit that a mismatch there changes how an
enemy LOOKS against how it HITS.

**Nothing is registered by default, and the gate is why.** Turning `skull` on
hung the suite: a registered kind replaces that enemy's hand-authored sculpt
AND its smoothed alive-hull — the whole v4.31/v4.32 look — so the hull section
waits for a skin that is no longer there. That is not a broken test, it is the
gate refusing a silent art swap. The mechanism ships working, the manifest
ships empty with the fourteen available exports listed in it, and turning one
on is one line followed by a look at a render. Which is the method: a suite
that certifies *works* cannot see *looks*.

**Gate: 108 checks** (was 92 at v36). One watches for 404s across the whole
run — a miss here is fail-soft by design, which is exactly why it needed its
own watch: three GLB requests could fail on every boot with nothing failing.
The rest cover the seam and the hybrid rather than any particular art — the
loader ran, everything declared loaded, the manifest parses, the worker
precaches the manifest but deliberately not the art it names, every voxelized
body wears the mesh it was cut from, no skin lands on a body that was not cut
from it, and past 22% of the lattice the skin sheds and the cubes show. `debug.getMeshSkins()` reports what was
declared against what loaded, because a system that fails soft needs a way to
say it did nothing.

## v36 — 2026-08-21
**The mode lab — an experiment is a declaration, not a branch**

Owner's direction: this stops being "a game with modes" and becomes a
platform for testing FPS jump-and-dash ideas. PURE (Devil Daggers), HYPER
and TRUCK are the three current guesses at what this body of movement is
FOR, and there will be more — platformer courses, speed runs, wall running.
Bone Dust started as a DD arena clone and shipped as a directional bullet-hell
dodger; the point of a lab is that the shipped game is allowed to be a surprise.

**TRUCK was lost, and that is why this release is a registry.** v33's notes
promise "Mode cycles PURE → HYPER → TRUCK". The toggle was a two-way flip,
`truck.js` was never imported by `main.js`, and the string "truck" appeared
nowhere in it. A whole named mode existed only on paper for three releases
and no gate noticed, because every gate knew the modes by name.

- **`js/modes.js`** — the registry. A mode declares `abilities`, `director`,
  `lethality`, `arena`, `edge` and its own `hiKey`; `main.js` asks the
  registry instead of asking `mode === 'pure'` in twelve places. Adding an
  experiment is one entry and no new branches. `?mode=<id>` deep-links one,
  which is what makes a movement idea shareable for a playtest.
- **The ability vocabulary** — `jumps`, `dash`, `reap`, `glide`, `airDash`,
  `wallRun`. `applyAbilities(player, mode)` is the single call that
  configures the body, so no mode can half-configure it by forgetting a
  field. The DEFAULT jump count is main's deliberate one — extra height
  comes from a downward shotgun, not a free air jump — and a mode that wants
  a freer body says so.
- **GLIDE** — hold jump while falling and gravity is cut to `glideGravity`.
  Only on the way down: a glide that also lifts is a double jump with extra
  steps, and the thing under test is hang time, not height.
- **AIR DASH** — a charge that lets a dash punch THROUGH its own cooldown,
  but only airborne and only as many times as the mode granted. Refills on
  landing, so it buys air control and never an infinite dash.
- **MOVE** — a fourth entry, and the actual bench: no director, nothing
  lethal, every ability on, the rim clamps so you cannot fall out. New
  mechanics land here first, where a bad one is obvious in ten seconds
  instead of hidden behind a fight.
- **WALL RUN is declared and not implemented** (`wallRun: false`). It needs
  walls and the disc arena has none — a court/course arena is the
  prerequisite. It is in the vocabulary so the next arena has somewhere to
  plug into, and the gate reads it as a declaration, not a feature.

**Three bugs, all of them the same bug — code nothing had ever run:**

- `applyAbilities` folded every edge that was not `clamp` into `open`, so
  PURE and HYPER — `edge: 'void'` — were configured with **no floor at all**
  and the body fell through the arena. The declared edge now passes straight
  through, and the gate asserts there is something under every mode's feet.
- `main.js` called `truck.reset(player)`; `truck.js` only had `seed(player)`.
  An instant TypeError on the one path nothing could reach.
- The track scrolled `T.truck.scrollSpeed` units **per frame** with no `dt` —
  ~50× too fast at 60 fps and faster on a better screen.

**The floor is now a value, not an assumption.** `player.floorY` is the
surface under the feet: 0 on the disc, written per frame by the track, and
`-Infinity` where there is no platform — which is how "the floor left"
becomes an ordinary fall instead of a special case. `TruckTrack.preUpdate`
runs BEFORE `player.update` for the same reason: after it, the body never
reads as grounded and jumps never refill, which is the whole mode.
Platform depth moved into tuning (`platformDepth` 5.4-6.8 on a 6.5 spacing),
so the early track is a road with seams — the pressure is that it LEAVES the
moment you touch it, not that every step is a jump. Real holes arrive later,
when the generator widens the spacing.

**A way out of a run.** The mode toggle only lives on the menu, and MOVE has
no lethality at all — so before this there was no way to change experiment
except reloading the page. The pause menu gains **END RUN**, which resets the
field, puts the disc back and returns to the menu. (It deliberately does not
wear `data-k`: the option rows share its chrome and the generic handler would
have written `opts[undefined]`.)

**The track is a route, not a scatter.** Platform x was an independent roll
across the full width, which makes islands — a stationary body fell through
the gaps between them at random, which is also what made the gate flaky. It
is a bounded random walk now (±1.6 a step, clamped to ±5), so every slab
overlaps the one before it laterally and the road visibly wanders instead of
teleporting.

**Gate: 92 checks** (was 71). The new section does not test "pure and hyper";
it walks `MODES`, so whatever is in the registry has to boot, has to get the
body it declared, and has to have a floor. Losing a mode the way TRUCK was
lost is now structurally impossible. `debug.getModes()` is the lab bench
readout: every entry, its resolved abilities, and what the player actually is
right now. The track's own checks ask whether it keeps laying itself ahead of
the player, NOT whether a bot that never steers stays on it — a road is a
route, and certifying survival there would only measure whether it happened
to run straight.

## v35 — 2026-08-21
**Reconciliation — the branch that was building on a v22-era game**

A second lineage of this game had been developed in parallel on
`claude/devil-daggers-hyper-demon-4vmk67`, branched before v26 and never
merged, while `main` moved 478 commits ahead. Both sides rewrote the same
files. `main` is adopted wholesale as the canonical lineage; the four
releases it lacked are re-applied here, adapted rather than dragged across.

Ported in:
- **The difficulty curve** (`T.director` in tuning.js). Minute one is a
  PARADE — first pulse at t=10, ~9.5 s cadence, six types debuting before
  the minute is out, on a budget so low each arrives nearly alone (measured
  per-pulse pressure in minute one is LOWER than the old curve even though
  six things debut instead of four). Minute two is the SQUEEZE: same
  cadence, budget climbing seven times faster. **HYPER only** — PURE keeps
  its fixed, learnable DD_SPAWNSET, which is the whole point of it.
- **The pressure ceiling.** Budget controls the spawn RATE; what kills you
  is the standing POPULATION, and population runs away when spawns outpace
  kills — a death spiral, since falling behind makes you fall further
  behind. Measured over a real run the uncapped curve went 6 → 41 → 88 live
  threats; with the ceiling a firing player sees 4.5 → 30 → a PLATEAU at
  ~35. It governs the totem exhale too: that is the real faucet (several
  totems on a ~2 s cycle out-produce the entire pulse system), and gating
  only the pulses moved the measured population by barely one body.
- **The uplit asset rig.** Native geometry is unlit MeshBasic, so these
  lights touch imported GLBs only — and which lights is not a free choice.
  This arena has two light sources: the floor and the ember horizon. So the
  hemisphere is INVERTED (ground term = the grid, sky term = the void) and
  three crimson horizon lights ring the player; both answer the same
  beat/trauma signals the floor does. An import is lit BY the arena.
- **`ARENA_ASSETS.floorPanel`** — a Meshy floor tile merged to one geometry,
  instanced across the disc, clipped to the rim and quarter-turned at
  random. Dormant until one is registered.

Deliberately NOT ported: the plate-and-seam floor texture. `main` had
already replaced the Tron grid with uneven soot and old blood, explicitly
"without drawing a luminous grid" — newer art that supersedes it, and
overwriting it would undo a decision made after mine.

Two defects found on `main` while porting, both fixed here:
- **`enemy.js` was imported at two different tokens** (`?v=61` from main.js,
  `?v=63` from truck.js), so the browser instantiated the module twice and
  every enemy class existed as two distinct constructors. This is the same
  defect v34 fixed for voxel.js and tuning.js; enemy.js still had it. The
  whole graph is normalized to one token (v=64) and audited.
- **`meshassets.js` duplicated `mesh-enemies.js`.** The enemy-skin registry
  is deleted from it — `mesh-enemies.js` owns that and is already wired —
  and it keeps only what that module does not do: the floor-panel field and
  the mesh voxelizer. `bakeShading` is exported from voxel.js and shared
  rather than copied.

Note for whoever ships next: `models/enemies/` does not exist, so
`mesh-enemies.js` requests three GLBs that 404 on every boot. It is
fail-soft (voxel fallback) but it is three wasted requests and a console
warning until the models land or the registry is emptied.

## v34 — 2026-08-21
**The game boots again, and the offline promise is real**
- `vendor/jsm/loaders/GLTFLoader.js` + `utils/BufferGeometryUtils.js` were MISSING:
  v33 added `mesh-enemies.js` importing them and shipped neither, and `enemy.js`
  imports it statically — so the module graph failed and `window.__hd` never
  existed. The game did not start at all on `main`. (`gh-pages` was unaffected
  only because its `enemy.js` predates that import.)
- one token per module: `voxel.js` was imported at both `?v=61` and `?v=63`, and
  `tuning.js` likewise, so the browser instantiated each TWICE and `TUNING` —
  documented as the single source of truth for enemy feel — was two objects.
- the precache list was a hand-kept list that had drifted to almost nothing: 2
  of the game's 12 modules, both UNTOKENED while the page asks for `?v=63`, no
  `main.js`, no three.js, no postprocessing chain. `scripts/hd-shell.mjs` now
  WALKS the import graph from `index.html` — resolving the importmap, which is
  how three.js and its addons get in — and the gate regenerates and compares.
- `offline.cjs` looked for a cache named `hyper-dagger-v` while `sw.js` has
  always written `hyperdagger-v`, so it found no cache and read zero entries —
  indistinguishable from a genuinely empty precache, which is how the list above
  went unnoticed. It reads the name off `sw.js` now.
- cache bumped to `hyperdagger-v34`: the list changed materially, and a worker
  keeps a cache of the same name rather than reinstalling it.

## v33 — 2026-08-19
**Three-mode platform (PURE / HYPER / TRUCK)**
- PURE: edge void death, DD spine, thief bank siphon, Meshy GLB option (voxel fallback)
- HYPER: killBonus 3s, density ramp, dash + REAP
- TRUCK: Clustertruck track, falling platforms, fall death
- Mode cycles PURE → HYPER → TRUCK. Shared player + dagger gunfeel.

## v31 — 2026-08-09
**PURE now follows the Devil Daggers gameplay spine**
- PURE abandons the random pressure director for a fixed, learnable spawnset:
  spawners arrive from 3 seconds onward on the reference cadence, emit 9+1 or
  10+1 skull waves every 20 seconds, and lead into gem thieves and centipedes.
- Spawner, leader and centipede health/gem yields now form the reference's
  early economy. PURE is one-hit survival with dash and REAP disabled; HYPER
  remains an optional remix.
