# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md -->

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
