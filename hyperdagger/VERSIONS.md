# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

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
