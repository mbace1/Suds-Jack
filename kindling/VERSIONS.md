# Kindling — versions

## v7 — 2026-08-17

**The art arrived, and the game is dressed to it.**

Thirteen approved sheets came in from the art pass: five scene concepts, four
environment libraries, four character bibles and a full UI kit. They are **not in
the repository** — `agent/betterment-approved-art-handoff` ships a README naming
a `BETTERMENT_ACCEPTED_ART_REPO_PACK.zip` that never landed, and there is no
binary art on any branch. So the archive is `art-src/approved/SHEETS.md`: the
handoff index, plus the sheets **read out** at the level of detail a renderer
needs. This project draws every pixel in code, so there was never anything to
import — what was missing was a target, and now there is a written one that a
change can be checked against.

**Two of the Art Guide's rules were guesses and the sheets settle them the other
way.** "No surface texture below 3px" was right about lines cut into a mass and
wrong as stated — the reference is textured everywhere, so it becomes *texture is
a value step, never a line*. And the companion was invented: canon describes one
mass plus one head and says nothing about horns, a scarf or fangs.

**EMBER.** The companion is not the moss-green animal this game has been drawing.
The sheet is specific: a body of dark porous stone nearly the colour of the
night, one big head on a small body, large white eyes set wide, two small fangs,
two pale tan horns curving up and back, a dark maroon scarf, ember glow at the
cracks and the tail tip. The consequence of the first clause is the whole build —
a dark body cannot carry its own silhouette, so the sheet puts that job on the
horns and the scarf, and they are drawn in the two lightest colours the creature
owns. Growth is the sheet's own age ladder ("horn size, posture, accessories, and
surface detail", explicitly not body type): horn length runs 2 → 3 → 4 → 5 → 7 px
across the five stages, which makes the 3-pixel rule true by construction rather
than by luck. Measured silhouette change per step: 62 / 73 / 62 / 112 px.

**THE CAMP.** It was never a room, and it is not a clearing with furniture in it —
every reference scene stages the same picture left to right, and now so does this
one: a tree cropped by the top-left corner with a lit lantern and a torn banner on
it, one whole arch and one broken behind it, the bonfire in its ring of stones left
of centre, the companion on a rug, the gear on the ground (sword, shield, helmet),
crumbled wall stacks carrying everything ever brought home, a gate where the wall
ends, and a castle on the horizon with a few windows lit. Mushrooms and small
flowers on the lit ground — the only saturated colour down there that is not the
fire.

**Animation, because the sheets ask for it by name.** Every character sheet ships
IDLE 8f / WALK 6f / RUN 6f / ATTACK 8f and five shared principles, and the third
one — *follow-through: cloth and accessories lag the body* — was the thing this
game had none of. Everything moved together, so the creature read as one rigid
piece. Now the scarf and the tail are driven off the breathing clock run two
frames late, the tail-tip ember flickers on its own beat, and the camp has a live
layer over the cached blit: the hanging lantern flickers, the banner sways as a
travelling wave biggest at the hem, six ember motes drift, the grass leans, and
three castle windows breathe on uneven clocks. None of it costs a repaint, and
all of it stops under `prefers-reduced-motion`.

**The UI kit** is leather and felt, not glass: a dashed stitch line inset inside
every panel, a hairline felt grain, stitched icon tiles, progress as beads on a
string rather than a bar, and disabled buttons desaturated rather than removed.
All of it additive — the stitch is a pseudo-element and the grain is a gradient,
so the mobile layer still owns none of the state machine.

**The arcade cabinet was advertising a room the game does not have.** The `hearth`
marquee still drew the retired hut — a mantel, a stone hearth, a window. Redrawn
as the camp, to the rack's own cover rules: sky as flat bars with hard seams, the
arch as a framing device *lighter* than the sky behind it, and Ember cropped by
the bottom edge with the two-colour rim (ember off the fire, cold moonlight off
the other side). Its first fire was one smooth cone — a traffic cone — so it is
three tongues now, narrow and tall, because a 12px-wide flame on a 128px canvas
is fatter than it is hot.

### Four things found by looking rather than by testing

Every one of these passed every gate and was only visible in a render:

- **The arch had a black hole through it.** The distance was painted only where
  the ruin was not, so the arch openings showed raw `VOID`. Anything with a hole
  in it needs something behind the hole; the far plane now paints across the full
  width first.
- **The masonry hashed per pixel, which is noise, not texture.** A wall of noise
  reads as poured concrete however carefully the ramp is chosen. Blocks are now
  quantised 4×3 with courses offset by half a block, and the joint is the block's
  own last row and column dropped two steps down the ramp — the mortar is the
  absence between stones, never a line drawn on top of them.
- **The tree was a green cliff.** Canopy discs hung to y=54 and buried the trunk.
  A tree is a trunk you can see with leaves above it; the moment the leaves reach
  the ground it is a hedge.
- **Moss ran round the whole arc**, which turned the arch into a hoop of vine.
  Moss is a horizontal-surface plant and the sides of an arch are not horizontal.

Plus two that were straightforwardly wrong: the castle's tall tower was painted in
the light stone tone and read as a bright column hanging under the moon (a far
object is a shape cut out of the sky — one value, only its moonward edge lifted),
and the gate's bars were painted in warm rust, making a white picket fence out of
the brightest thing in the right half of a picture whose brightest thing is
supposed to be the fire.

### And two bugs the gates did catch

- **`.bm-nav { position: relative }` silently un-fixed the bottom navigation.**
  The nav is `position: fixed`; a later rule of equal specificity dropped it into
  the document flow at the end of the page, where it landed on top of the goal
  list and made the Add button untappable. A fixed element is already a
  containing block for its own pseudo-elements, so the rule bought nothing.
- **The band-brightness ruler was measuring the wrong thing, for the second time
  after an art pass.** Counting pixels above a sum-of-channels threshold saturates
  once the scene has a blue sky, moonlit stone and warm earth in it: a whole day
  moved the count from 18474 to 19056, and the first step went *down*. The ruler
  is firelight — red leading blue — and the bands now read 1243 → 2322 → 3261 →
  4137 → 5089 → 5997. Both times the page was right and the ruler was wrong.

Gates: smoke 66, offline 15, betterment-ux 20, hub green.

## v6 — 2026-08-17

**The Art Guide, and the growth silhouettes it asks for.**

`BETTERMENT_GDD.md` §17 is an *art-guide handoff* — a list of eleven things the
guide must define — and §18.9 names the guide itself as the next design artifact.
There are no art files anywhere in the PR stack or the repo to work from (5 js,
3 css, 3 cjs, 1 md, 1 html across #272–#275; the only PNGs in `kindling/` are the
PWA icons this project generates from its own palette). So the style was cropped
from the text.

- **`ART_GUIDE.md`** — the artifact §17 asks for, written to its own eleven
  bullets, with every rule traced to the document it comes from. It invents
  nothing; what it adds is arithmetic, because "growth silhouettes" and
  "inherited trait zones" are not numbers and a renderer needs numbers.
- **The 3-pixel rule.** A trait or a stage that does not change the silhouette by
  at least three pixels does not exist at 192×128, where the companion is about
  24px tall. This is the rule #275's lineage work breaks: sixteen gene
  combinations render as sixteen near-identical creatures, because only the ember
  colour changes the fur rather than adding an ornament of one or two pixels.
- **Growth silhouettes** (§5, cropped from GDD §17 and DESIGN G3, "shape is more
  memorable than +20% size"). Five stages that differ by SHAPE: a spark is a tiny
  ember body with a flame tip, a wisp lengthens, a tender grows arms and puts its
  feet apart, a keeper broadens and carries a lamp, an elder wears a mantle and a
  branching crown. The body is an ellipse now rather than a disc, because a disc
  can only be bigger and bigger is the one thing canon says a stage must not be.
- **The gate measures it** rather than trusting it: consecutive stages differ by
  123 / 85 / 64 / 144 pixels of silhouette, against a floor of 3.

## v5 — 2026-08-16

**The pivot to the ruin — first draft.** The cozy hut is retired (owner direction);
the world is a moonlit dark-fantasy ruin with a bonfire in it. What did not change
is the thing underneath: no score, and what you get for looking after yourself is
still LIGHT, in the same five bands.

- **Two ramps, one subtraction.** Everything is painted from a COLD ramp and
  warmed toward the fire by `lightAt`. The environment is moonlit; the fire is the
  only warm thing in it. Paint the stone warm to begin with and the picture goes
  flat, which is what the first attempt did.
- **Four planes**: sky (with a moon opposite the fire, and stars from the date) ·
  far treeline and a broken tower · the ruin — two wall sections with a COLLAPSE
  between them, a free-standing arch, the ledges, the gate · the fire, the ground
  and the companion · and a cropped fallen column and bracken in front of it all.
- **The gate still keeps the promise.** A full fire reaches the far wall and lights
  the iron, because "a good day shows you the way out" has to be visible or it is
  not a promise. The first cut left eight warm pixels there and the gate might as
  well not have existed.
- **The five-goal target is settled** (owner): the day's denominator stays five
  however many goals are configured. Recorded in `BETTERMENT_OWNER_DIRECTION.md`.

Three passes, and the honest state of it: the cold/warm split, the bonfire, the
moon, the gate reveal and the layered foreground read. The RUINED ARCHITECTURE does
not yet — the free arch is a thin hoop rather than masonry with mass, the wall is so
dark that the ledges float, and the banner is a red smear behind them. Each of those
is a composition question, and this project's method for those is a reference from
the owner rather than a fourth guess from me.

Gate notes: the smoke gate's brightness ruler was re-aimed. It measured TOTAL
brightness, which was right for a dark interior and wrong for a moonlit ruin where
the sky is always lit — a day going from coals to a full fire moved it 1.3×. It now
counts WARM pixels (red leading blue), which measures the firelight the design
actually promises: 584 → 3289 across a day.

## v4 — 2026-08-16

**The mobile-first UX layer** (PR #267), merged onto the room work. The v2/v3 care
loop stays authoritative — goals, once-only payouts, mood, breathing, warmth,
growth, errands, journal, the 04:00 rollover and local-only storage are all
untouched — and a new presentation layer sits on top of it.

- **`js/modern-ux.js` + `modern-ux.css`** — large goal rows with explicit check
  states, a five-step Today progress bar, a flames/level HUD, a fixed bottom
  navigation, and real Journey / Inventory / Reflections / Companion
  destinations backed by the existing errand, found-object and growth state.
  A goal-management screen with a preset library (Body, Hygiene, Mind,
  Connection, Daily care) sits behind Today, so the everyday screen is not a
  list-configuration screen. Dark mode is the default, with an optional
  parchment surface. `test/betterment-ux-smoke.cjs` covers the new layer.
- **`BETTERMENT_OWNER_DIRECTION.md` is the newest design authority** and
  supersedes the older "no progress bars, no level presentation, cozy hut"
  calls. The visual target ahead is a layered-2D dark-fantasy bonfire scene.

Reconciled while merging the two lineages:

- **The name stays Kindling** (owner's call). `Betterment` is the lane and the
  direction, not the app's title — so the manifest, `<title>` and masthead read
  Kindling again. The folder, the cache name, the catalogue entry and the
  `kindlingState` key were never going to move: renaming those breaks the
  deployed URL and every existing save for no gain.
- **A merge bug caught before it shipped.** The UX layer relabelled the action
  row BY INDEX (`actions[2]` → "Reflect"), which was the journal button when it
  was written and is "say hello" after v3 — so the merge would have shipped a
  hello button labelled Reflect. It matches on what the buttons say now.
- **One hello, two doors.** The Companion page's greeting calls the same
  `idle.hello()` the base layer owns, so the two cannot drift into two different
  creatures. It still pays nothing.
- **`bm-manage-goals` was a 19px control**; the floor here is 44px and this is a
  mobile-first overhaul, so it is styled as a real one now.
- **The contrast ruler was wrong, not the page.** The check glyph is deliberately
  `color: transparent; font-size: 0` — a DOM label behind a drawn box — and the
  gate was measuring it as 1.09:1 text. Text that is not rendered is not a
  contrast failure; the state is carried by `aria-pressed` and checked there.
- **One token for the release: everything in this folder is `?v=4`,** and the
  worker's cache name with it. The merge arrived carrying four different numbers
  at once — `sw.js` at v4 while its module token said v2, `main.js?v=2` beside
  `modern-ux.js?v=4` beside `modern-ux-accessibility.css?v=3` — and my own v3 had
  changed three modules' bytes without moving their token at all, which would
  have served an installed user v2 out of cache indefinitely. That drift is the
  one bug this folder has rules about, and half of it was mine.

## v3 — 2026-08-15

**Room life** — Slice 1 of `BETTERMENT_DESIGN.md` (PR #267). The room should feel
like a small place living rather than a diagram waiting for input, and none of it
is allowed to pay.

- **`js/idle.js`** — the creature's own business. Six behaviours chosen by the
  room's state rather than a timer alone: it sits close to the coals on a dim
  day, goes and looks up at the shelf once there is something on it, watches the
  window, carries a stick toward the woodpile and immediately forgets why,
  stretches, settles. It is handed a READER of the room and has no way to change
  anything — screen time earns nothing, and the gate now proves it: ninety
  seconds of watching moves no counter.
- **Saying hello.** The one interaction in the app with no payout at all: it
  turns to you, says something small, and that is the whole transaction.
- **A facing.** The creature can turn — but the LIGHT does not turn with it. The
  lit crescent, the ember rim and the catch light in its eye stay on the hearth
  side however it is standing; only the eyes, nose and tail follow the facing.
- **Five bands, five rooms.** A day holds five small things, so the static light
  snaps to six states while the flame still eases continuously through them: a
  lick, a second tongue, smoke, a third tongue, and embers lifting off a full
  fire. The gate asserts each band lights strictly more of the room than the one
  below it.
- **The window knows the time.** Night, small hours, dawn, day and dusk are read
  off the local clock; the stars are laid out from the date, so tonight is not
  last night and it is still the same sky all evening. Nothing is fetched and
  nothing claims to be the real weather where you are.
- `prefers-reduced-motion` holds the creature still where it stands — the gate
  caught that the first cut let it wander for someone who had asked it not to.

## v2 — 2026-08-11

Offline, installable, and reachable by keyboard.

- **`sw.js`** — cache-first, its own version, scoped to this folder (a narrower
  scope wins its own pages, which is also why `scripts/deploy-hub.mjs` skips a
  folder shipping its own worker). A thing you open once a day, often on a phone
  and often first thing, cannot need a signal. `test/offline.cjs` kills the
  server, goes offline and plays a whole day through — tick, check in, breathe,
  send the creature out, bring it home, read the journal — asserting the network
  served nothing at all after it was cut.
- **The precache list cannot drift.** Every entry is fetched by the smoke gate,
  the page's own `?v=` token is compared with the worker's, and the four
  `../hub/*` files that give this page its way home are checked against the
  tokens `hub/shell.js` actually imports. A list a token behind the page is an
  app that loads online and comes up blank on a train, and that has happened in
  this repo before.
- **`manifest.webmanifest` + icons**, so it can live on a home screen where a
  daily thing belongs. The PNGs are GENERATED by `tools/make-icons.mjs` from the
  app's own palette — the one place the no-image-assets rule has to bend, bent
  the way the brand's SVGs are, so a handed-over icon cannot drift from the app.
- **The focus follows a view swap** — but only when the last input was a key, so
  a tap never raises a ring nobody asked for.
- Module tokens moved to `?v=2` together with the worker's cache name.

## v1 — 2026-08-11

The first build. A care companion in one room, in the shape Finch established: you
tick off the small real things you did, they become fuel, the fuel keeps a fire,
and the fire is the light you see the room by.

- **The room** (`js/room.js`). One 192×128 canvas: hearth, creature, woodpile,
  two shelves, a door and a window. The light is a measured ramp out of the
  hearth — how far it reaches across the floor IS the day's tally, so the picture
  states the loop with no label on it. All of it is dithered inside `cached()`
  and keyed on the light quantised to twelve steps; flame, smoke, sparks, the
  creature and the lantern in the window are drawn live on top.
- **The sheet** (`js/state.js`). Six default care lines plus up to fourteen of
  your own, a five-step check-in, and a streak counted back from today. The day
  turns at **04:00**, not midnight. Untick freely; the lifetime count only ever
  goes up.
- **Breathing** (`js/breathe.js`). Four rounds of 4 in / 4 hold / 6 out, paced on
  the fire itself rather than a second meter. Each completed round is banked, so
  stopping early keeps what you did.
- **The errand** (`js/errand.js`). Three kindling sends the creature out for 90
  seconds of real time; the outcome is seeded at departure and computed on
  return, so it survives a reload and a closed tab. It comes back with two lines
  for the journal and often something for the shelf. There is no bad outing.
- **Growth.** Five stages off the lifetime count of small things kept — a spark,
  a wisp, a tender, a keeper, an elder. Screen time earns nothing.
- **Nothing leaves the browser.** One localStorage key, no account, no network
  call, no leaderboard. Said once, on the first visit, in the app's own voice.
- `node kindling/test/smoke.cjs` — the gate, driven off game state.

Known and deliberate: the app is English only (the catalogue entry says so); the
Finnish and Japanese in `hub/games.js` want the same native read the counter's
packs do.
