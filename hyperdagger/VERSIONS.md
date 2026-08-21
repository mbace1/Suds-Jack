# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md -->

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
