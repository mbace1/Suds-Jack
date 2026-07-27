# Tiny 2D — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v1 — 2026-07-27
**The log starts here**
- The one-button momentum skater as it stands: raised-cosine hill chain with a
  net descent, ballistic skater with tangential-landing grading, fever
  multiplier, the daylight clock, and the three parallax silhouette layers.
- Carried onto `main` as its own project — it had been living only on the
  deployed site. Numbered from the module token it already had (`?v=1`), so the
  version on the arcade does not jump when the log takes over from it.
