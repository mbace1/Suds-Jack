# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md -->

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
