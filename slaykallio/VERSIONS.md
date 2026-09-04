# Slay Kallio — Version Log

<!-- Same rules as VERSIONS.md at the site root:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
  The ?v= tokens on the module tags are independent integers: they are cache
  busters tracking module churn, not releases. -->

## v2 — 2026-09-04
**The bridge, the bums, and a picture on every card**
Owner's direction, verbatim: gritty and realistic, the camera from the other
direction so the bench back panels are gone, a background like tilt-shift
nature (a real photo is fair game), heroes who are Kallio bums, everything in
English, enemies that are rats and mutating blobs and other bum cutouts, basic
pictures on every card, a thick wooden bridge, much closer to the characters,
tin soldiers and painted cardboard figures.

- **The bench is gone; the board is a THICK PLANK BRIDGE.** A bench has a
  backrest and a backrest crosses a standing figure at the chest — every puppet
  was being cut in half by a slat. A bridge carries its structure underneath,
  so beams, braces and piles take the eye down into the canal instead of
  putting a fence across the fight. Thirty boards with a shadow gap between
  each and nail heads over the stringers: eleven wide boards read as a pier.
- **Nothing stands above the deck over the play area, and the gate says so.**
  It caught the one thing left — a far-side top rail above head height that
  still drew a line straight across the frame. It is gone; two broken stubs on
  the end posts say it used to be there.
- **The camera is close.** The action width went 6.6 → 4.6, and the eye sits a
  little above the deck tilted down about ten degrees: dead level hides the
  boards entirely, and any higher turns the bridge into a floor plan.
- **The roster is four Kallio bums, in English.** Late the park drinker, Ilona
  the busker, Roope the bottle collector, Vekku the cart pusher — the same four
  mechanics, re-themed to the life. Finds are Bottles now. Personal names stay
  as they are; a gate fails on any Finnish left in a title, a card, a friend, an
  enemy or an encounter name, in either skin.
- **Rats, mutating blobs and rival bum cutouts.** The blob is drawn as
  something about to become something else: half-formed limbs and two eyes that
  do not match.
- **Tin soldiers AND cardboard cutouts.** `look.base` picks a stamped metal
  oval with a lip, or a cardboard wedge with tape over the feet. Mixing them is
  the point — a row of these should look collected, not manufactured.
- **Gritty is in the drawing, not in a filter**: the ink line is drawn twice at
  different weights, paint is scumbled in broken strokes of a lighter tint of
  the fill (never white — white on a small head reads as a smear across the
  face), outlines are nicked, and everything carries streaks, stains and a
  directional light with a genuinely dark shadow side.
- **`js/cardart.js`: a picture on every card**, painted on a 96×62 panel in the
  same register and cached per picture and accent. A card with only words on it
  is a spreadsheet row.
- **The backdrop is photographic now**: canopy as scattered dabs rather than
  lollipops, haze eating contrast with distance, the canal with a smeared
  reflection, film grain, and a stronger tilt-shift. `?bg=<url>` still swaps in
  a real plate through the same focus pass.
- Gates: 260 checks in `test/core.mjs`, 60 in `test/smoke.cjs`.

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
