# Slay Kallio — Version Log

<!-- Same rules as VERSIONS.md at the site root:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
  The ?v= tokens on the module tags are independent integers: they are cache
  busters tracking module churn, not releases. -->

## v1 — 2026-09-04
**The first bench**
- The whole shape of the thing, end to end: pick one of four Kallio characters,
  fight six benches, take a card or a friend after each, and either clear the
  last one or fall over on it.
- `js/engine.js` is the rules and nothing else — no DOM, no three.js, no clock,
  deterministic from a seed. `js/data.js` is every card, character, friend,
  enemy and encounter, each named in BOTH themes, so the fantasy skin is a
  lookup rather than a second data set.
- The damage pipeline is Balatro's shape over Slay the Spire's numbers: base,
  then adds, then mults, and the breakdown rides on the log entry so the view
  can pop each `+3` and `×2` in turn. `preview()` and `resolveAttack` run the
  SAME code, so the number quoted on a card is the number that lands.
- Four characters, each with a mechanic of its own: the barista's Buzz (a
  strength that fades with the turn), the bassist's scaling on cards played
  before it, the tinker's free Finds and hand counting, the driver's block that
  hits and block that stays.
- Twelve friends (jokers). Every one of them bends arithmetic you already do
  rather than adding a verb.
- **Cardboard puppets**: a painted cutout drawn on a canvas from a `look` table,
  standing on a 3D card wedge with a strip of tape over its feet. Killing one
  topples it about its feet on an axis tilted between the camera's x and the
  depth axis, so it foreshortens as it goes and lands flat on the bench.
- **The park is a tilt-shift**, and the sharp band FOLLOWS THE BENCH: the
  backdrop is repainted when the bench's row on screen moves, because a
  miniature photograph is only convincing while the one sharp stripe lies on
  the thing you are looking at. `?bg=<url>&stereo=sbs&eye=left` swaps the
  painting for a photograph through the same focus pass — the seam for testing
  real (and stereo-pair) summer park pictures.
- Two formats from one camera rule: fit the ACTION WIDTH, not the bench.
  Landscape reads the whole seat; portrait fits a narrower width, flattens the
  camera (a phone has no room for a floor) and puts the hand along the bottom.
- Gates: `node slaykallio/test/core.mjs` (252 checks, bare node, includes a bot
  finishing 160 runs) and `NODE_PATH=$(npm root -g) node slaykallio/test/smoke.cjs`
  (55 checks in a browser, driven off game state rather than the clock).
