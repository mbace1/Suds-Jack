# Suds Jack — Version Log

<!-- Same rules as VERSIONS.md at the site root, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
  This project carries no ?v= module token, so the log is the only number it
  has — starting at v1 rather than guessing at what came before.
-->

## v2 — 2026-08-19
**The horizon mesh game reaches `main`, and the way home comes back**
- `game.js` was **rewritten on `gh-pages`** — the horizon vector landscape with
  Bomb Jack controls (437 lines, canvas `#c`). Only `index.html` and
  `style.css` were carried back to `main`, so `main` held the NEW shell over
  the OLD 902-line tube shooter, which looks for `#gameCanvas`. The page threw
  `Cannot read properties of null (reading 'getContext')` on load and the game
  did not run at all. The live site was fine; the source tree was not.
  `game.js` is now brought across, and `index.html`/`style.css` were already
  byte-identical.
- **`gh-pages` is a deploy target, not a workspace.** This is the same lineage
  split `eeri/` has paid for three times, arriving from the other direction:
  not two histories, but one file left behind. Author on `main`.
- The **HOME button** is back: `../hub/shell.js` had been dropped from
  `index.html` in the rewrite, and `test/hub-smoke.cjs` fails on it — *every
  game carries the home button*. It is the only cabinet the arcade could not
  get you out of, and the live copy has never had it.

## v1 — 2026-07-27
**The log starts here**
- The original canvas vector tube shooter, with the mobile touch controls.
- Numbered from 1: there was no prior version number to continue from
