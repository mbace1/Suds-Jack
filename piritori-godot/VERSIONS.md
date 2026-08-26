# Piritori → Eden — Version Log

<!-- Same rules as VERSIONS.md at the site root, which this follows:
  - Add a new ## vN entry at the top for every deploy that changes the build.
  - The source is a separate repo (mbace1/piritori-eden); each entry names the
    commit it was built from.
  game.js has no per-module cache tokens here - it is one Godot .pck/.wasm
  pair, versioned as a whole build.
-->

## v4 — 2026-08-25
**The Godot port replaces the JS v3 prototype**
- Full rebuild in Godot 4.7.2, exported to WebAssembly. Five modes (map,
  location, ledger, battle, news), a seven-day authored campaign, formation
  battles on a 3×3 board, fi/en/ja throughout.
- Twelve of the thirteen 3D crew and NPC bodies remeshed and retextured this
  cycle; Jaska built from an owner-supplied likeness photo, with ten idle and
  talking animations.
- Built from [mbace1/piritori-eden](https://github.com/mbace1/piritori-eden)
  commit `de48cd5`.
