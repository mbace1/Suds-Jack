# Drop Cabal — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v3 — 2026-07-27
**A controller plays it properly, and Start opens a menu**
- Reads a gamepad **natively** instead of through the hub's key bridge: left stick
  runs, **right stick aims** (the bridge could never carry a crosshair — a keystroke
  has no axis), R2/R1/A fire, B rolls, X lobs a bomb
- Fire sits on three buttons because R2 is the one some browsers spend on their own
  UI before the page sees it, and a polled API has no way to take it back
- **Start (tapped) opens a pause menu**: aim speed and scanlines, kept in
  `dropCabalOpts`. Held, it still belongs to the shell's way back to the arcade
- Catalogue entry moved to `pad: 'native'`, so nothing is layered on top of it

## v2 — 2026-07-27
**The log starts here**
- Layered depth shooting, the gel roster, dual virtual sticks — the state this log starts from.
- Numbered from the module token this project already carried (`?v=2`), so the
  version on the arcade does not jump when the log takes over from it
