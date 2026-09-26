# Drop Cabal — Version Log

<!-- Same rules as toko-drop/VERSIONS.md, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v5 — 2026-09-26

**Toko saw you play.** The recap this game gives Toko at the table — the stage, the score, the kills and the lives, and on the game-over screen where you went down, your best and the one thing that most changes a stage here (the roll's i-frames, the grenade) —
is now also written to the shared play log (`hub/playlog.js`) as you leave,
by `hub/playlog-auto.js`, in the game's own words. The next time you open Toko
Live or the arcade's counter, he opens on it once: *"LAST TIME, DROP CABAL: …"*,
then the TELL button filed under this game. `toko-live/LEVELS.md` level 1.

## v4 — 2026-09-23

**Toko at the table.** The signature in the corner opens the counter over this
game instead of navigating away to the arcade, so the run you want to say
something about is still there when you get back. Esc or BACK returns you to
it, and a note filed here lands under this cabinet through the arcade's own
transport. It borrows the stage pause the game already had.

Everything but the two lines below lives in `toko/js/table.js`, which works out
which game it is standing in from the path and keeps its own input off the
window — the game never sees a tap, a touch or a key that happened at the
table. `window.__tokoTable` is this game's half: how to stop the clock, and
what he should already know when he opens.

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
