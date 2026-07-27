# Tiny 2D — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

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
