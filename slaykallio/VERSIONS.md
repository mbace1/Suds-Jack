# Slay Kallio — Version Log

<!-- Same rules as VERSIONS.md at the site root:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
  The ?v= tokens on the module tags are independent integers: they are cache
  busters tracking module churn, not releases. -->

## v7 — 2026-09-05
**A photograph is a file you drop in**
The owner asked for a real photo behind the bridge. The plumbing existed
(`?bg=<url>`), but using it meant editing a URL into the page, so a photograph
was never going to be the default by accident.

- **`bg/plate.jpg` is now the backdrop if it exists.** No code change to add
  one: drop the file in and it is picked up at boot, through the SAME
  tilt-shift as the painting, so it gets the sharp band on the deck, the
  vignette and the grade. `?bg=` still overrides it for testing a plate
  without committing it.
- **A missing plate is the default, not an error.** `setPhoto` rejects and the
  painted park is already on screen.
- The one honest cost: probing for an optional file 404s on a tree that has no
  plate. That is named in `test/smoke.cjs` rather than hidden by contorting the
  code to avoid asking — and the allowance is **narrow**, verified by pointing
  the constant at a different missing path and watching the gate fail. The
  console's URL-less echo of the same request is dropped as a strictly less
  informative duplicate of the response listener, which still reports every
  other 4xx with its URL.
- `bg/README.md` says what makes a good plate (landscape, horizon above the
  middle, nothing important centre-bottom, overcast light) and that whatever
  goes there ships, so it needs to be redistributable.
- Gates: 261 in bare node, 63 in a browser.

**No photograph is included.** Every image host — Wikimedia Commons, Unsplash,
Pixabay, `upload.wikimedia.org` — is refused by this sandbox's egress proxy, so
one could not be fetched or licence-checked from here. The seam is ready and
proven end to end with a synthetic stand-in plate (fetched 200, `arena.photo`
true, rendered through the focus pass); the stand-in was then deleted, because
a test fixture is not art.

## v6 — 2026-09-05
**The run was flat, and that mattered more than the character spread**
`test/balance.mjs` is new — a measuring tool, not a gate, beside `core.mjs` the
way turf keeps `balance.mjs` beside `smoke.mjs`. Its first run found something
worse than an unbalanced roster.

- **Every character arrived at the boss on 91-99% HP, and 100% of losses were
  the final encounter.** The run was five free fights and one coin flip. That
  is a curve problem, not a card problem, and no amount of per-character tuning
  would have shown it — the win-rate column looked merely uneven.
- **Cutting the post-fight heal did not fix it.** Swept 8/4/2/0: win rates fell
  (collector 35%→8%) and losses stayed at the boss (291 of 295 at heal 0). You
  arrived poorer at the same coin flip. The middle fights could not threaten
  anyone in absolute terms, so the heal was never the cause.
- **Escorting the bigger enemies is what worked.** The bin rat, the King Rat and
  the blob now bring company. HP on arriving at each fight went 100 / 99 / 96 /
  93 / 83 / 77 — attrition is real, and the elite has started ending runs.
- **Roope was stranded and is not any more** (15% → 26%): 66→72 HP, Bottles 3→4,
  and Armful 2→3 block per card in hand, which was the single biggest lever
  (+7 points on its own).
- **The busker was NOT nerfed**, because nothing measurable justified it. Encore
  4→3 per card changed *nothing* — not one win, not one loss — and Hat Out 5→4
  moved 69%→66%, which is inside noise across 150 seeds.
- Post-fight heal 8 → 6.

**The tool still reports FLAT (98% of deaths are the boss) and that verdict is
left standing.** Moving the threshold so it reads green would be exactly the
mistake Kindling's band-brightness gate made twice — the page was right and the
ruler was wrong. Some of the remaining flatness is correct (a boss should kill
runs) and some is a bot artefact: a bot kills fast enough to skip the damage a
real player takes. The next honest move on it is a playtest, not another sweep.

Honest limits, recorded in the tool's own header: the bot always drafts the
first reward, so **rare cards are close to invisible to it**, and a character
whose mechanic rewards holding a hand is being judged by a bot that empties it.

## v5 — 2026-09-05
**The concept pack, filtered — three sheets kept, six rejected**
The owner supplied `Slay_Kallio_Sideview_Concept_Pack_v0.1` (nine sheets
salvaged from TURF and the wider art library) with one instruction: *these are
quite different so need filtering before any use*. They are — three
incompatible renderings and mostly a different game's cast. The filter and the
reason for every verdict is `art-src/concepts/README.md`.

- **Five filters**, in order: identity only and never pixels (this game paints
  its figures in code, so nothing transfers as art); no weapons (nearly every
  figure carries a knife or gun — that is TURF's grammar, and this game's verbs
  are a swing, a bottle and a shopping trolley); would this person be sleeping
  under the bridge; real marks come off; profile or nothing.
- **Kept three.** The Alepa wanderer (the only sheet both on-brief and carrying
  an explicit full-body profile), the white-suit heavy, and one roster sheet for
  two figures out of twenty.
- **Rejected six**, including the pack's own first pick — a mohawk knife
  fighter, whose side-walk row is the best locomotion reference in the set and
  useless here, because these puppets never walk. They stand, wobble, lunge and
  topple.
- **Two identities rebuilt from scratch in `puppet.js`'s own grammar.** Late
  took the wanderer: yellow bucket hat, lank hair, olive parka open over a
  black hoodie, navy tracksuit with white side stripes, rubber clogs and a lit
  cigarette trailing smoke. The Bridge King took the heavy: cream suit, black
  shirt, gold chain, slicked hair — the one person on this bridge with money,
  which is the whole characterisation.
- **`heavy` is a real proportion change**, not a scale-up: wider through the
  middle, shorter in the leg, thicker neck, wider jaw and a jowl. A wide body
  under a normal head just reads as a tall man in a big coat, which is exactly
  what the first attempt did.
- New painter parts: `lank` and `slick` hair, a `bucket` hat, `clog` shoes,
  tracksuit `stripe`s, an `under` layer showing through an open coat, a
  `chain`, and a cigarette with drifting `smoke`.
- No pixels were copied, traced or sampled, and no trademark is reproduced —
  the sheets were looked at and the figures were drawn.

## v4 — 2026-09-04
**Look at the whole cast, not just the first fight**
Rendering every encounter for the first time — the blob, the rival bum, the
King Rat and the Bridge King had shipped without anyone laying eyes on them —
found four things no gate could see, and one it should have.

- **A crash, not a blemish.** The fantasy `Imp Lord` look was missing its
  `shape`, so it fell through to the person painter and read a `bottom` colour
  a rat does not have. Encounter 5 in the fantasy skin threw on spawn. Fixed,
  and now gated: every look must declare a shape, that shape must have a
  painter, and the look must carry the colours that painter reads.
- **The boss was cropped by the top of the frame.** The camera fits the action
  WIDTH, which says nothing about height, and the Bridge King stands a head
  taller than anyone else. `ensureHeadroom()` pulls back only for the fight
  that needs it — the margin is 0.035, enough to stop a crown being cut and not
  enough to zoom the other five encounters out.
- **The end of a three-wide row sat on the frame edge.** The layout was
  guessing the visible width from the action width, which is the width the
  camera was ASKED to fit and not what you can see at the plane the figures
  stand on. `arena.halfWidthAt(z)` answers it properly.
- **A unit label could sit off the top of the screen** — on the boss, the one
  fight where reading the intent matters most. Labels are clamped into the
  frame; the puppet is what the camera makes room for.
- **`__sk.debug.jumpTo(i)`** goes straight to an encounter. Nobody should have
  to win five fights to see whether the sixth one reads, and the gate now uses
  it to walk all six.
- The framing check measures each sprite's own BOUNDS rather than its centre
  point, and runs over every encounter in both orientations. That is what turns
  all of the above from things somebody has to notice into things that fail.
- Gates: 261 in bare node, 62 in a browser.

## v3 — 2026-09-04
**The timber gets grain, and the understructure gets light**
A look pass on v2's bridge, done the way the repo says to do them: render, look,
name what is wrong, redo.

- **The deck was flat brown bands.** Per-plank tone alone cannot make timber —
  grain, knots, split ends and stains do not survive as a colour value. The wood
  is a drawn texture now (`woodTexture()`), painted once and shared by every
  plank and beam, with each board still tinted its own tone on top. Grain runs
  along V, which on these boxes is the depth axis: the direction the boards
  actually run.
- **The separate "worn strip" mesh is gone.** The texture carries its own wear
  band, and having both drew a hard line straight across the deck where the two
  treatments met — visible in the render, invisible to every gate.
- **The understructure was an unreadable dark void.** The bounce off the water
  went 0.35 → 0.85 and is aimed up into it, so beams, braces and piles read as
  timber rather than as one black mass. A bridge that does not read as built
  gives up the only reason the board is a bridge.
- **The cards were the same brown as the deck** and competed with it. The card
  stock is cooler and greyer now, so the hand reads as a separate object in
  front of the scene rather than as more bridge.
- **The bases were the brightest thing on the deck**, pulling the eye off the
  figures standing on them. Cardboard and tin both knocked back.
- Gates unchanged and green: 260 + 60, plus the arcade's own.

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
