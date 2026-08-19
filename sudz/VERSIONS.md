# Suds Jack — Version Log

<!-- Same rules as VERSIONS.md at the site root, which this follows:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
  game.js has an independent integer ?v= cache token. The log is the public
  release number shown by the arcade.
-->

## v5 — 2026-08-19
**Make the update impossible to miss**
- A bright, persistent `BUILD v5` badge now sits below the HUD on the title,
  during play and on game over. It is HTML rather than a faint canvas footer,
  so the live build number stays readable on mobile and desktop.
- The v4 camera adjustment was too subtle. The central eye now sits at 48% of
  the screen instead of 31%, the playable web is shorter and 23% wider, and a
  stronger depth curve packs the distant rings tightly around the eye.
- Terrain relief is reduced again so the view reads as a flat Tempest web rather
  than a road. Gameplay, timing, collision depth and controls remain unchanged.
- `game.js?v=53` and `style.css?v=1` make both the camera and badge fresh URLs.
  `test/core.mjs`: 26 bare-Node checks retain the gameplay gate and pin the v5
  framing plus visible build marker.

## v4 — 2026-08-19
**The road becomes a Tempest web**
- The vanishing point moves from the top of the screen down into the playfield,
  putting the camera lower behind Jack instead of looking down an uphill road.
- Nonlinear depth now compresses the distant grid into a tight central eye while
  the near rim opens wider across the screen. Incoming objects use the same
  projection, so their approach remains readable and collision timing is unchanged.
- Terrain elevation is visually flatter so the converging lane web owns the
  silhouette. Scoring, hazards, waves, controls and the three-life loop are unchanged.
- `game.js?v=52` makes the new framing a fresh URL. `test/core.mjs`: 23 bare-Node
  checks retain the complete v3 gameplay gate and pin the v4 camera constants.

## v3 — 2026-08-19
**The horizon becomes a game**
- Owner direction: continue the live Horizon Mesh lane-survival game. This is
  work on `sudz/`; the separate Hyper-Dagger-based `sudsjack/` rebuild remains
  set down.
- Incoming objects now travel from the horizon through the collision line.
  The shipped loop never advanced `thing.depth`, so pickups, damage, stomps,
  scoring and game over were all unreachable while objects accumulated at the
  vanishing point.
- The spawn table is ordered correctly and introduces its vocabulary by wave:
  orbs and stompable crawlers first, low-flying darts and boost triangles in
  wave 2, then lane-blocking spikes. The previous first branch swallowed every
  later threshold, so darts, boosts and spikes could never exist.
- Terrain rows now recycle at the far horizon instead of being regenerated past
  the player. Player, pickups and hazards all sample the same interpolated mesh,
  so a visible peak is the peak that launches Jack.
- Seven explicit waves increase travel and spawn pressure. Chains, multiplier,
  three-life damage, game over, best score and restart are all reachable.
- Native gamepad movement/jump now matches the hub's controller claim. The HOME
  shell is restored, the title teaches the real rules, and `game.js?v=51` makes
  the corrected build a new URL.
- `test/core.mjs`: 19 bare-Node checks prove travel, bounded recycling, scoring,
  waves, damage, game over, restart, versioning and the way home.

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
