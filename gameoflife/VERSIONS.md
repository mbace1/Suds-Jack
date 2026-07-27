# The Game of Life — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v40 — 2026-07-27
**Offline again**
- The terminal rewrite had dropped the service-worker registration, so the app
  quietly stopped working with no signal. Restored.
- `sw.js` was still declaring v38 against a page asking for v40, and `crt.js`
  was never added to the precache list — a stale shell with no screen to draw
  through. Both fixed.
- The offline gate hung instead of failing when there was no worker to wait
  for, and still looked for the old card markup; it names the terminal's own
  now.

## v39 — 2026-07-27
**The log starts here**
- The retro-futurist terminal: the CRT viewport, the sparse hub and the screen accent.
- Numbered from the module token this project already carried (`?v=39`), so the
  version on the arcade does not jump when the log takes over from it
