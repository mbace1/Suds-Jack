# Tiny 2D — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v4 — 2026-08-10
**A fat bird rides it, and the hills stop turning into walls**
- The rider is a **fat bird on a skateboard** — one round mass, no neck, beak
  and tail carrying the silhouette, cream belly, two-block tuft, stubby yellow
  feet. It has to read at forty pixels on a phone, so everything that says
  which way it is going sticks out of the body. The arcade marquee follows.
- **The difficulty ramp was a sharpness ramp.** Amplitude climbed 4.5 → 9.5
  while the segment shortened 30 → 19, and a raised cosine peaks at
  `|dy|·π/(2·len)` — doing both multiplied steepness. Measured: by 3 km the
  ground ran at 41° with 65° faces and a bot riding the line properly landed
  **100% hard**. Hills are now generated from a **slope budget** (26° → 39°,
  `SLOPE_START`/`SLOPE_END`), with the rise derived from it, so a longer hill
  is a *taller* hill and never a steeper one. The big-crest roll is longer as
  well as taller: a bigger air, not a wall.
- Faces run 42 → 36 units and the pop drops 14 → 10, because the ballistic
  range goes as v²/g ≈ 47 units: with a 28-unit face every real air sailed
  past the trough and landed on the next uphill, which is why *no* line could
  land clean.
- Landing bands widen to **0.26 / 0.60** (15° / 37°). The old 0.17 was a 10°
  window that the best measurable line never hit — an unreachable reward.
- Net effect, measured over ~370 airs per point: perfect **32% → 24%** from
  the start of a run to 6 km, hard **33% → 42%**, slopes capped at 49°. The
  curve now escalates by demanding precision instead of by building walls.
- New `tiny2d/test/` — `bench.cjs` drives the real Skater against the real
  Terrain at a fixed timestep with no renderer (`sim.html`) and reports the
  landing-grade curve; `rider.html` draws the bird large and at phone size.

## v3 — 2026-07-28
**The canvas was twice the size of the phone**
- `resize()` called `renderer.setSize(w, h, false)` — `updateStyle` off — and
  the canvas had no CSS size, so the element laid out at its *drawing buffer*
  size in CSS pixels. With `setPixelRatio(min(dpr, 2))` that is **twice the
  viewport in each direction on any phone**: the player saw the top-left
  quarter of the picture at 2×, and the skater, who rides the middle of it,
  sat below the bottom edge of the screen. Measured at dpr 2 on a 393×851
  screen: canvas 786×1702, skater at y=874. Now 393×851 and y=481.
- dropcabal passes `false` on purpose — its CSS pins the canvas to 100vw/100vh
  because it renders at a fixed 220px internal height. This one had copied the
  flag without the CSS.

## v2 — 2026-07-27
**The phone can see the hill**
- The ortho view is anchored on its **width** (60 units across at a standstill,
  89 flat out) instead of its height, with the height falling out of the aspect
  and clamped to 34-78. A phone held upright was getting 34 × 0.46 ≈ **16 units
  across** — less than one terrain segment — and filled with featureless dark
  mass; it now gets 36-42. A 16:9 desktop is unchanged (34 × 16/9 = 60).
- The two framing constants that were still height-based came with it: the sun
  is sized off the width (it had swollen into a moon covering half a portrait
  screen), and the camera's forward lead is a fraction of the view rather than
  a fixed 16 units (which had pinned the skater to the left edge).
- HUD stops fighting the arcade shell: readouts sit below the HOME button
  instead of under it, and on a touchscreen the ♪ toggle moves out from beneath
  the HOLD button. The page's bare `button {}` rule is scoped to its own
  overlays — it was styling the shell's HOLD button, `min-width: 190px` turning
  that circle into an ellipse.

## v1 — 2026-07-27
**The log starts here**
- The one-button momentum skater as it stands: raised-cosine hill chain with a
  net descent, ballistic skater with tangential-landing grading, fever
  multiplier, the daylight clock, and the three parallax silhouette layers.
- Carried onto `main` as its own project — it had been living only on the
  deployed site. Numbered from the module token it already had (`?v=1`), so the
  version on the arcade does not jump when the log takes over from it.
