# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

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
