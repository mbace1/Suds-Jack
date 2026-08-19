# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v33 — 2026-08-19
**Three-mode platform (PURE / HYPER / TRUCK)**
- PURE: edge void death, DD spine, thief bank siphon, Meshy GLB option for skull/spider/totem (voxel fallback).
- HYPER: killBonus 3s floor, pulse density ramp, dash + REAP.
- TRUCK: Clustertruck-style track (`js/truck.js`), falling platforms, fall death, ramping skulls.
- Mode button cycles PURE → HYPER → TRUCK. Shared player body + dagger gunfeel.

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
