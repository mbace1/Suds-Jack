# Slay Kallio — Version Log

<!-- Same rules as VERSIONS.md at the site root:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
  The ?v= tokens on the module tags are independent integers: they are cache
  busters tracking module churn, not releases. -->

## v19 — 2026-09-07
**Nobody on this bridge is holding a gun**
v18 shipped the TURF cast and named the weapons question as open. Looking at
all thirty-two plates at full size answers it, and the answer is not the one
v18 assumed.

**"No weapons" cannot be applied literally here.** Every plate in the set
carries something — a knife, a bat, a pipe, a bottle, a flail. The concept
pack's rule taken at face value rejects the entire set and leaves nothing to
cast. So the line goes where it actually matters: **a knife is not the problem,
a FIREARM is.** A street knife on a bum reading the far end of a Helsinki
bridge is plausible. A man drinking in a park with a pistol in his hand is a
different game, in a different country.

**Eight of the thirty-two are armed with guns**, and v18 had cast two of them:
the Old Boxer was holding a pistol and the Dealer two. That is what "lean
weapon-light" is worth as a filter — it is a preference, not a rule, and it
loses to whatever else the plate is good at. `FIREARMS` in `plates.js` is the
rejected list now, hand-kept the way the concept pack keeps a verdict per sheet
(no pixel test can see a gun), and `core.mjs` fails if the cast ever intersects
it.

**Five recasts, and three of them are better castings on their own terms**,
which is the sign the constraint was doing work rather than costing something:

| | was | is | why |
|---|---|---|---|
| The Old Boxer | `gunner` (pistol) | **`grunt-ragged`** | bandaged fists and no weapon at all — he simply IS an old boxer |
| The Dealer | `denny` (two pistols) | **`grunt-smoke`** | cigarette, bottle, ragged coat |
| Night Shift | `grunt-tanner` (pistol) | **`cleaver`** | an apron and a face mask: he is a night shift |
| The Bridge King | `grunt-ragged` | **`knuckle`** | shirtless, scarred, a flail — a boss reads as one |
| The Bouncer | `knuckle` | **`grunt-duffy`** | heavy, bearded, a length of pipe |

The six left alone were already clean: barfly's bottle for the Park Drinker,
milo's can for the Bottle Collector, sledge's scavenged hammer for the Cart
Pusher, and knives on the three bums across the planks.

Gates: core 719, smoke 125.

## v18 — 2026-09-07
**TURF's cast, standing on this bridge**
Owner: *"I would like the turf art used on those figures."* `turf/art-src/sprites/`
holds **32 real character plates** the owner already has and this game paints
its figures in code, so `art: drawn / turf` in the menu swaps one for the other.

**The plate replaces the PAINT, not the process.** `paintCutout` still runs
newsprint, torchlight, nicks, fibre and grime over the top, because those
passes are what make a figure belong to this bridge rather than to TURF's
board. A plate dropped in raw would stand in TURF's own lighting in front of a
Kallio evening — which is v10's lesson taken the other way round: a cutout is
an unlit plane, so the torch has to be painted INTO it. The gate measures the
warm pixels to prove the pass actually ran.

**Thirteen of the twenty-three figures are cast**, and the other ten are the
point of the lookup rather than an omission: a roster of street operators has
no rat, no blob, no pigeon and no bear in it, so those keep the drawn cutout
and a mixed row is the normal state. The gate asserts both halves — nothing
non-person is cast, and every person IS, because a half-plated row is worse
than none.

**Sized off the INK, never the file.** Every plate is padded differently, so
fitting one to its frame stands a short figure in the air and a tall one
through the planks. TURF's own `render.js` pays for this exact lesson on its
props; here the bounds are scanned once at load and the figure is placed on the
same baseline the painted ones stand on, which is what lets drawn and plated
figures share a row without one of them floating.

**They ship from `figures/`, not `art-src/`.** A Slay Kallio deploy is a copy of
the folder minus `test/` and `art-src/`, so runtime art under art-src/ would
arrive as a 404. TURF has the same note from the opposite direction. Gated.

**THE CAVEAT, and it is the owner's call rather than mine.** This project ruled
on this once already: `art-src/concepts/README.md` rejected six concept sheets
on two filters, and one was **no weapons** — *"nearly every figure in the pack
carries a knife, which is TURF's grammar and not a game whose verbs are a
swing, a bottle and a shopping trolley."* Most of these plates carry one too.
The casting leans on the weapon-light end (barfly's bottle for the Park
Drinker — the one plate that IS the mechanic; milo's can for the Bottle
Collector; the two tank-top idles) but the Old Boxer is still holding a pistol
and the Dealer two. It is a toggle so the picture can settle it, not a rule
quietly reversed.

Gates: core 717, smoke 125. And a screenshot of both, side by side.

## v17 — 2026-09-07
**Paper Mario: the figures are card, so move the card**
Owner, after the same direction was written up for TURF (`turf/ART_REQUEST.md`
§12): *"can you test the Paper Mario type figures here now? as a toggle in the
menu?"* — and this is the right place to test it, because the figures here are
already flat cutouts standing on bases and already topple in 3D when they die.
**Nothing had to be drawn.**

`js/motion.js` is the vocabulary, and it is PURE — no three.js, no DOM, no
clock — so `test/core.mjs` asserts the arithmetic in bare node the way it does
the rules. Everything is in the figure's **own height**, so one number reads
the same on a rat and on the Bridge King, and every rotation and squash is
anchored at the **feet**: a cutout stands on a base, and about the centre a
rotation reads as a sprite being spun rather than a thing tipping.

- **attack** — 0.20s leaning AWAY, 0.11s committing, 0.30s recovering. The
  anticipation is what makes a lunge read as a lunge instead of a slide, and
  it is longer than the strike by design. The commit is under half a step, so
  it never reads as the figure having MOVED — this game says where everyone
  stands.
- **hurt** — knocked back, and **the card bends**. The shear is the whole
  point: a rigid figure sliding backwards is a token being moved; a bending
  one is a thing being hit. Three.js has no shear field, so the flex composes
  its own matrix.
- **hop** — not used by a fight on a bridge where nobody walks, but it is the
  verb the TURF brief is really about, so it exists and the debug seam can
  play it.
- **breath** — held, tiny, and phase-offset per figure so a row of six does
  not breathe in unison, which is the tell.

**One difference from the TURF brief, and it reverses a recommendation.**
Over there the idle breath is off by default, because `anim.js` stops its rAF
the moment nothing is animating and a breath never stops. Here the scene
renders every frame regardless — it is three.js with a torch that gutters — so
the breath is free, and it is on.

**Where it goes in the object.** A new `flex` group sits BETWEEN the base and
the body. Putting the squash on the whole group made the figure's *stand*
breathe with it, which reads as the camera bobbing; a tin oval does not
squash. The group's origin is already the feet, because the plane geometry is
translated up by half its height at build time.

**It is a toggle, not a replacement** (`figures: paper` / `figures: still`,
persisted under `slayKallio.figures`), and the switch is one module-level
setting in `puppet.js` rather than a field walked over every figure — so it
reaches the enemies already standing on the bridge and the two looks can be
compared mid-fight. That is the only way to know whether motion actually
carries a verb.

**A contact sheet needs its own clock.** The first strip taken of this was a
picture of the wall: a frame grab is about a second under SwiftShader and the
whole attack is 0.61s, so it caught the lunge once and the breath five times.
`__sk.debug.scrub(clip, t)` holds a clip at an exact moment — the same rule
every gate in this project already follows, driven off state rather than off
time — and `unfreeze()` gives the figures back. Both are gated, because a debug
hook that can freeze every figure for good is exactly the kind that gets left
on.

Gates: core 711, smoke 118. And a screenshot, because a gate can say the card
deforms and cannot say whether a lunge reads as a lunge. Looking at it: the
anticipation is doing the work — the lean away is what makes the commit read —
and the honest reservation is that at this camera the commit is closer to a
lean than a lunge. Worth trying 0.35-0.40 before it starts looking like a move.

## v16 — 2026-09-06
**A bot that knows the character, and the rebalance it justified**
v14 asked six bots to play six characters and found that the greedy control
was measuring the bot. This is the follow-through, and it starts by admitting
that five of those six bots were still general policies: not one of them is
built to spend a strength that expires, to count a hand of free tokens before
emptying it, or to feed a dog all turn. So a 7% column could still mean the
instrument was short.

**`native` is one card policy per character**, and it shares `synergist`'s
drafting and its walk exactly — the two columns differ ONLY in how the hand is
played, so any gap between them is about the mechanic and nothing else. The
Park Drinker gets the drink down first and dumps every attack in the same turn
(buzz not spent is thrown away). The Bottle Collector cashes the counters while
the hand is full and THEN empties out — which is where `hoarder` went wrong, by
sitting on cards that were no longer worth holding. The Cart Pusher covers up
first and swings the block-counter last. The Dog Walker feeds fetch early
because the dog is paid at the end of the turn. The Old Boxer blocks only what
would actually kill him: being hit is his resource.

It changes the reading completely. **The Dog Walker went 5% → 24%** — nobody
had ever played her. And it lets the two genuinely weak characters be named,
because now four different policies say the same thing about them.

**THE COLLECTOR WAS ONE NUMBER.** `dig_the_bin` cost 1. That is a third of a
turn's energy spent purely on SETUP, on a character whose whole line is dig,
then cash — so he dug and then could not afford the cards that count what he
dug. At cost 0 the bots go 3%/6%/7% → **13%/29%/16%**, and this is the
measurement that matters: nothing else moved him at all. Deepening the counters
(per 3 → per 2) reads within noise of the control; so does deepening the
hand-counters. One cost, the entire character.

**THE DRINKER WAS DIFFUSE**, and is the honest half of this entry. No single
number moved him at 200 seeds; three together (72 HP not 68 — he was the
frailest character in the game AND the weakest at his own line, which is two
disadvantages for one price; First Sip 3 Buzz; Never Sober 3 a turn) take his
best line 8% → 14%. **He is still last, and the reason is structural rather
than numeric: buzz does not compound.** Block that stays and cards that count
what came before them both grow across a fight; a strength that expires at the
end of the turn is flat forever, so the Drinker cannot build into a boss the
way the Cart Pusher can. That is a design question, not a dial, and it is left
open rather than papered over with a fourth buff.

Best lines now **14 / 29 / 30 / 35 / 24 / 16** against v14's 8 / 29 / 8 / 35 /
24 / 16.

**AND A MEASUREMENT BUG, in the instrument added in this very version.** The new
HP ledger asks what an ordinary fight actually costs, since the deaths list can
only say where a run ENDS. Its first cut subtracted HP at the end of a fight
from HP at the start — but the post-fight heal lands in the same step that
closes the fight, so it was reporting the cost NET of the heal: 5.4 HP against
a 6 HP heal, which reads as a run with no attrition at all and would have had
me cutting the heal. It sums the DROPS now. An ordinary fight costs **8.9**, an
elite 16, a boss 41.5, and about a third of all the HP a good line loses goes
to ordinary fights. A heal is not a fight being cheaper.

Two smaller things fell out of it. `bots.mjs` runs its report only when it IS
the command, so the instrument can be imported and pointed at one question — a
sweep over a single tuning number — instead of printing a matrix nobody asked
for. And twelve event checks in `core.mjs` were written as literals (`hp ===
68`), so moving the Drinker's HP by two points failed all twelve at once; not
one of them is about his HP, they are about what the EVENT does, so they read
`CHARACTERS.drinker.hp` now.

Gates: core 700, smoke 108.

## v15 — 2026-09-06
**A character is named by their class, not by a person**
Owner: *"maybe just English class names"*. The roster was six Finnish first
names — Late, Ilona, Roope, Vekku, Sanna, Kake — with the trade as a subtitle
under each. That was the ONE exemption in the English rule the owner set on
2026-09-04, granted on the reasonable grounds that a name is not a language.
It was the wrong exemption to take: a character select's whole job is to tell
you what the deck DOES before you commit a run to it, and "VEKKU" does not do
that job in any language. Slay the Spire calls its four the Ironclad, the
Silent, the Defect and the Watcher for exactly this reason.

So the class IS the name now, in both skins — **The Park Drinker / The Sot**,
**The Busker / The Bard**, **The Bottle Collector / The Tinker**, **The Cart
Pusher / The Warden**, **The Dog Walker / The Houndmaster**, **The Old Boxer /
The Pit Fighter** — and the `title` field is gone rather than being kept as a
second line saying the same thing twice. The person did not go anywhere; the
blurb was already carrying them, and it is the line that also says what the
mechanic is.

**One thing this quietly fixes.** The fantasy skin used to rename the title and
hold the first name still, so the switch read "Late · the sot" — a Finnish name
in front of a fantasy epithet, which is the seam showing. With the class as the
name the skin swaps the whole thing, which is what a lookup was for.

**And the gate gets stricter rather than looser.** The English check used to
skip `name` on characters because personal names lived there; it reads the name
now, so there is no field in the game a Finnish word can sit in unremarked. Two
new structural checks pin the direction: every character names a class in both
skins (`/^The \w/`, and none of the six retired first names may come back
through it), and `title` must stay undefined with a real blurb behind it.

Gates: core 700, smoke 107.

## v14 — 2026-09-05
**Six bots that play differently, and what they found**
`test/bots.mjs` — a measuring instrument, never a gate. Every balance number
this game had came from ONE bot, which plays the highest-value card it can
afford and takes the first reward. That bot empties its hand; Roope's whole
mechanic is holding one. So "the collector wins 2%" could have meant the
character was weak OR that the instrument could not hold it, and one bot can
never tell you which.

Six can. Each is a policy over **six decisions**, not just card play — how it
drafts and where it walks matter as much as what it plays: `card`, `map`,
`event`, `rest`, `pick`, `draft`.

- **greedy** — THE CONTROL: the engine's own `botStep`, imported rather than
  copied, so its column reproduces v11's recorded rates by construction. At
  150 seeds it does (7/13/2/12/5/14 against the logged 7.5/11/2.5/10/6/11).
  A control that reproduces the known numbers is what makes the other five
  columns mean anything — the discipline TURF's balance work landed on.
- **aggressive** — damage above all, takes elites, upgrades at rests.
- **defensive** — blocks to the INCOMING number and no further, avoids elites.
- **hoarder** — plays hand-counting cards while the hand is full, then holds.
- **synergist** — powers first, cheap cards next, the card that counts what you
  played before it LAST; drafts toward the character's mechanic.
- **random** — the floor every other column is read against.

**THE FINDING, and it is a big one: `synergist` beats `greedy` by 17 points on
Ilona and 19 on Vekku.** Playing your powers on turn one, and the scaling card
last, is worth more than any tuning in this game — and the greedy bot answers
that question backwards every single turn, because it sorts by face value.
Every balance number before this one was measuring a bot that did not know
what order to play in.

**The negative result matters too.** `hoarder` did NOT rescue the collector
(3% against greedy's 2%; `synergist` got it to 7%). The hypothesis that Roope
was merely being mis-measured is wrong: holding the hand is not what he needs.
He is the weakest character at his own best line, and that is now a finding
rather than a suspicion.

**And a shape nobody had seen: surviving is not winning.** `defensive` reaches
act two far more than anyone (69–100% against greedy's 42–81%) and wins least
of the five. Both bosses are damage checks, not survival checks — 77% of
defensive's deaths are the Bear.

**A real bug the bots found, on one seed in nine hundred.** A rest that offers
an upgrade when every card is already upgraded had NO WAY OUT: the panel listed
nothing, the phase never ended, and the engine's own bot escaped by dropping
the parked half of any two-part event. `skipPick()` and `pickable()` are the
fix; the panel now offers "every card is already as good as it gets, walk on",
and a two-part event still finishes. Five checks in core, one in smoke.

One trap paid for inside that gate: `upgrade()` moves the numbers **inside**
each effect, so a probe that upgrades the deck and puts `up` back has not put
the deck back — it silently hands every later check a stronger card. The deck
is deep-copied and restored whole.

Gates: core 698, smoke 107.

## v13 — 2026-09-05
**The cutouts are made of paper now, not painted like it**
The rest of the owner's reference set (a cardboard diorama, a newsprint
collage, a torn-paper relief): the figures were *painted* cardboard and read as
painted — the material was named in the fills and never shown. Two marks show
it, and they are the two a collage always has.

**FIBRE.** A torn edge is pale, because the core of the board is lighter than
its printed face. The silhouette gets an intermittent light rim, and so does
every nick — a nick is where the card was torn, so it shows its core too, which
is what finally makes a nick read as damage rather than as a dot of nothing.
v10 learned the opposite lesson about a WARM ADDITIVE rim (forty glowing spots,
"chickenpox"); this one is desaturated, `source-atop`, and ragged rather than a
clean outline. **And it is lit from one side**: at one alpha all the way round
it read as a white sticker outline — the core shows where the light reaches it
and disappears on the shadow side, so the band is filled through a gradient
from the torch.

**NEWSPRINT.** Rows of dashes too small to read, which is what print is at this
size. In **two inks**: a dark dash is invisible on the figures that are mostly
black, which is most of them at night, so a lighter pass is offset three pixels
under it and every fill has print in it somewhere. The card stock takes the same
two marks in CSS — a horizontal print rule in the background stack, and one
inset highlight along the near edge for the torn core.

**A real bug, found by a DAYLIGHT plate.** The hero's name and HP were being
painted a second time on top of the run panel's own: the label gutter reserved
the anchor point but not the label's own box, which hangs 58px above it. Every
render of this game for a week has been at dusk or at night, where the
collision sat in the dark and nobody saw it. The gutter is measured off the
plate's rect now, so it follows the portrait layout for free — and the first fix
was wrong in a way worth recording: it guarded on `offsetParent`, which is
**always null for a `position: fixed` element**, so it read the plate's height
as zero and collapsed the gutter right back to the broken value. Gated.

Gates: core 693, smoke 106.

## v12 — 2026-09-05
**The route is a torn-paper map**
From the owner's references (a city map of Kallio in torn dark paper, with
pins and a tape line): the fork is no longer a row of buttons. `js/map.js`
draws the whole act — every span of every step as a paper disc pinned to a
torn sheet, the walked route as a strip of tape, dashed threads from where
you stand to what you can take next, the boss's paw at the end of the trunk.
You can see the route ahead, which is what a map is for; the route data
already knew it (`buildRoute` rolls the act up front), this only draws it.

**The one rule that keeps both formats honest is `pos(step, option)`**: it is
the only place the orientation lives. Landscape runs the route left to
right, portrait bottom to top, and the text stays upright in both because
nothing is rotated — only the positions swap axes. Three options across a
phone's width collide below their pins, so the middle one takes the shelf
above. **The paper follows the hour**: kraft in the afternoon, near-black at
night, the same numbers that tint the light.

**The drawing is the picture; the buttons are the targets.** A real 48px
button is laid over each pin of the current step, so a thumb, an arrow key
and a pad all land on the same thing, and the focus ring is a ring on the
map. Hovering or focusing a pin names it in a caption under the sheet.

Two staging faults the portrait render found: the panel title sat on the
HUD's DECK button (portrait panels now start below the plate), and my own
shot harness advanced the engine under the view and photographed a stale
map for a turn — the panel now re-applies the hour when it opens, and
`__sk.debug.redraw()` exists so a harness can move the state and ask the view
to catch up.

Gates: five checks (105 total) — the sheet is painted, every span of
the act is a pin, the buttons sit on the current step's pins, the paper is
kraft by day and dark by night, and the portrait map keeps its pins inside
the sheet with its title clear of the HUD.

## v11 — 2026-09-05
**Two acts, a choice at every span, events, rests, upgrades, six bums, the hour, and the Bear**
Owner: *"aim for StS2 parity"*, then *"multiple characters, lots of cards
(class specific and neutral), Eldritch night theme. start run during day, as
evening comes, things start mutating"*, and a set of Kallio photographs: *"you
can use these as backgrounds"*.

**The run.** No longer six fights on a line. Two acts (`ACTS`), each six
spans then a boss; at every span the route offers two or three — a fight, an
elite, an event, a rest — rolled from the seed up front (`buildRoute`), so a
seed is a whole map. The rules the gate holds over forty seeds: the first step
is fights only, an elite is never offered before the third step and always by
the fifth, a rest is always on the span before the boss, no step repeats a
span, and every one of the twelve events is reachable. Beating an act boss
heals half your max HP — measured: without it every character reached act two
at ~40% and the Bridge King was 48% of all deaths; with it, 85%.

**Events** (`EVENTS`, twelve, both skins): the bear in the park, the sauna,
behind the Alepa, the man with the megaphone, the last tram, a dog with no
collar, something under the surface (a 50/50 the label states), somebody you
used to know, the kiosk, move along, the shop window, the gulls. Every option
names its price on the label — full information. An option that touches a
specific card (remove, upgrade) parks the rest in `state.pick` and waits.
**Rests** heal 30% or upgrade a card. **Upgrades are one rule, not a second
version of every card** (`upgrade()`): +3 damage or block, +1 a hit on a
multi-hit, one harder on a scaling card, +1 draw, one deeper on a self-status,
a power costs one less; `describe` and `preview` read the moved numbers so the
face is right by construction. Upgraded cards wear a `+`.

**Six characters.** Sanna the dog walker — **Fetch**: every card feeds the
dog, and at the end of your turn it goes in at the weakest enemy; Kake the old
boxer — **Thorns**, and cards that count the hits he took (`struck`). Ninety-
five cards (five more per existing bum, ten each for the new two, nine
neutrals, two curses), twenty friends (eight new, three of which cost
something), seventeen enemies, twenty-two encounters. New statuses: Frail,
Thorns, Fetch; new powers; new scales (Buzz, discard, struck, Fetch, missing
HP).

**The hour** (`hourOf`, 0 → 1 across the route). Three light rigs per skin —
day, evening, night — and the arena lerps every number between them; the run
opens under a sun with no torch and ends under a torch with no sun. **The
plates follow the hour**: the owner's photographs of Kallio, sorted into day
(Karhupuisto, Vaasanaukio), dusk (Sörnäinen, the church at sunset) and night
(streets, a lit doorway, a bar), one per stage per seed. **Past dusk what
spawns is mutated** — level 1 through the evening (+15% HP, and the figure
grows eyes), level 2 at night (+30% HP, 1 Strength). Never a boss: a boss IS
the night. The label carries ✶ per level.

**The bestiary.** Pigeons (four in a row; a joke alone, a wall of pecks
together), gulls, the Gull King, the tar blob, blob spawn, the dealer (curses),
the preacher (buffs the whole row), the other one, the bouncer, the night
shift, and **the Bear** — the Karhupuisto statue from the plate, woken, act
two's boss, drawn by a new `bear` painter. Birds by a new `bird` painter.
Twelve new card pictures.

**Bugs the pass surfaced, all pre-existing:**
- **Enemy debuffs on the hero never lasted.** Statuses ticked after the enemy
  phase, so a Weak or a Frail an enemy had just applied was gone before your
  next turn. Slay the Spire's own rule: a debuff applied during the enemy turn
  skips its first tick (`hero.fresh`). Found by the gull's snatch, the first
  enemy debuff a test ever checked.
- **The camera never came forward again.** `ensureHeadroom` only ever pushed
  back and only `resize()` reset it, so after the Bear every later fight was
  shot from the boss's seat. Found by a lighting check that walked all
  twenty-two encounters.
- **The English gate flagged English.** `\bon\b` and `\bse\b` matched "+1
  energy on the first turn". The ruler was wrong, not the text.
- A debug `start` that drained the replay by hand left the body's `busy`
  class on and the hand under `pointer-events: none` — every tap missed.

Gates: `core.mjs` 693 (was 261), `smoke.cjs` 100 (was 76). Bot over
80 seeds: every character reaches act two, wins 2–9 in 80, both bosses ~87%
of deaths. Honest limit, recorded: the collector wins 2%; a bot that empties
its hand cannot play a character built to hold one, so that number says more
about the bot than the bum.

## v10 — 2026-09-05
**Light the RANK, gutter the torch, and repaint the two worst drawings**
Owner picked three of the art items off v9's list: legibility of the enemy row,
a flickering torch, and the enemies themselves.

**The rank.** v9's falloff was doing exactly what it was told and hiding the
figure whose intent you most needed to read. Two parts, because a cutout is an
unlit `MeshBasicMaterial` plane and a scene light cannot touch it: a second,
dimmer warm `PointLight` that **follows the enemy row** (its x is the mean of
the living foes, recomputed each frame) lights the deck and the bases, and
`Arena.lightAt(x)` hands every cutout a light LEVEL that the puppet multiplies
into `mat.color`. It is **floored** (`figureFloor`): past the floor a figure
stops getting darker and only stops getting warmer, so the falloff stays a look
and stops being a missing telegraph. The hit flash now rides on that level
rather than replacing it — otherwise a flash reset a figure standing in the dark
to full brightness and left it there.

**The gutter.** Three incommensurate sines, with a slow one that occasionally
takes the others down with it; a steady light is a dimmer, and the
unreliability is most of what reads as dread. Off under
`prefers-reduced-motion`, and both halves are gated.

**And the torch moved to x −3.6, beside the party** — DD's actual staging, and
the only position consistent with the rim painted into every cutout. At −1.4 it
stood to the hero's RIGHT while his warm edge was painted on his left.

**The two worst drawings.** The rat was a body and two ears while every bum had
a hat, hair, a prop and a silhouette; the blob was a flat green lump. A cutout
has no shading to be wrong in, so everything has to be a shape or a mark:

- **Rat** — a hunched back (the arch is where the shape has to happen), matted
  fur breaking the outline, ribs through a thin flank, a bald kinked tail, a
  chewed ear, a milky eye, claws, one broken tooth.
- **Blob** — this is where *Eldritch Kallio* actually lands. The mass sags to
  one side under its own weight, a pseudopod reaches where the body is not
  going, four eyes at three sizes with one clouded over, and **the canal's
  rubbish suspended inside it**: a trolley wheel, bottle caps, a ring-pull,
  something that used to have a bone in it.

**Four faults found by rendering the cast at full size, none visible in the
scene** — the method the repo's own rule prescribes, and the reason it exists:

1. **Every figure had glowing chickenpox.** v9's rim pass finds every edge in
   the alpha, and `nicks()` punches HOLES in that alpha, so it drew a warm ring
   around each of forty nicks. Light the clean silhouette, THEN take the bites
   out — which is also the true order, since a cutout is painted first and
   carried around afterwards.
2. **The rat's fur read as a boar.** Evenly spaced triangles are a comb whatever
   their heights are; the gaps are what make it fur, so the walk now skips.
3. **The rat's ear read as its eye** — a big ringed disc in the middle of the
   skull pulled every glance, while the actual eye was a 5px square nobody
   could see. Ears are flaps set back on the skull now; the eye is a bead with
   a milky cast and a glint.
4. **Two literal rectangles.** The blob's pupils were `fillRect` and its mouth
   was a black bar — a square is the one shape that reads as UI rather than as
   an animal, and the bar read as a letterbox cut in the card.

Gates: four more (76 total) — no figure darker than the floor, the rank light
following the row that is actually there, the torch taking more than ten
distinct values over thirty frames, and holding at exactly one under reduced
motion.

## v9 — 2026-09-05
**Eldritch Kallio: the hour moved to evening, and the look to Darkest Dungeon**
Owner: *"let's go Eldritch Kallio and looking a bit more like Darkest Dungeon.
evening is darker etc"*, then *"art make over"*.

**Darkest Dungeon's look is a LIGHTING SETUP before it is an art style** — one
warm source close to the party, everything past its falloff going to black, and
a cold edge separating a figure from the dark behind it. So the hour is data
(`MOOD` in `data.js`, one rig per skin) and every surface reads it rather than
each being tinted by hand:

- **A torch, not a sun.** A `PointLight` with a real `distance` and `decay`,
  because a directional cannot fall off and the falloff IS the effect: it is
  what makes the ends of the deck disappear and the middle of the bridge the
  only place there is. Fog takes what the falloff cannot — a plank at the frame
  edge is no further from the light than one just off centre, but it IS further
  from the camera.
- **A film grade on the backdrop**, in a colourist's terms rather than a CSS
  filter stack: exposure, a black that is LIFTED rather than crushed, saturation
  pulled out, shadows tinted cold and highlights toward the torch, grain, and a
  vignette doing most of the work of making a frame feel enclosed. The two
  things that actually sell evening — the lifted black and the split tint — have
  no filter primitive, which is why it is a pixel pass.
- **The torch is PAINTED INTO the puppets.** A cutout is an unlit plane, so
  nothing the scene's lights do reaches it; the moment the world went to evening
  the figures stayed in daylight and stood in front of the night instead of in
  it. Three passes in the order a painter would work — a cold wash gathering to
  the far edge, a warm one on the near, then a **rim** on each side. The rim is
  the load-bearing one: a dark figure against a dark backdrop has no outline
  until something draws one, and DD's whole cast is legible for exactly that.

**And the UI had to follow, which was the bigger half of the work.** Cards are
the brightest thing on screen by area; five lit rectangles over a night scene
read as holes cut in it. Dark leather stock with bone text (DD's own move),
dark card-art panels with the same corner falloff the frame has, and the same
substitution on the roster picks and the friend cards — one cream gradient that
turned out to be the loudest thing in the game once the hand was darkened.

**A real bug the makeover surfaced**: the act card printed the encounter's raw
**id**. `nameOf(table, id)` wants a lookup keyed by id (CARDS, ENEMIES), and was
handed the encounter object plus its own id — so `enc['rats']` was undefined
every time and it fell through to the id, which also meant the fallback after
`||` could never fire. Nobody noticed for the game's whole life because the ids
happened to read as words; the fantasy skin put **KING_RAT** across the screen.
All twelve act cards now name the encounter, and none overflows in either
format (the longest wraps to two lines on a phone).

Gates: five checks (72 total) — the torch has a real distance and decay, the far
end is fogged, the backdrop is NOT fogged (fogging a graded picture flattens it),
every act card shows a name, and the render is genuinely **lit from one side**.
That last one is measured off the pixels, because every value above can be right
while the frame is flat; verified non-vacuous by flattening the rig, which reads
11 against 10 and fails. Two traps paid for inside it: a WebGL drawing buffer is
cleared once composited, so it must be rendered and read in the same task or
every pixel comes back black — a very convincing way to pass a darkness check —
and one sampled ROW is a lottery, the first attempt landing in the shadow at the
deck's leading edge and calling the far side brighter on a frame whose falloff
is 4:1 fifty pixels lower.

## v8 — 2026-09-05
**The owner's photograph, and the plate is CUT to the frame rather than stretched onto it**
The plate is the Kallio bear — Karhupuisto's own granite bear, supplied by the
owner with "you can crop as needed", cropped so the statue sits at the LEFT of
the frame and the dense treeline fills the middle. That placement is forced by
what portrait does (below), not by taste: whatever is in the middle of the plate
is what stands behind the fight in both formats, so the middle has to be quiet.

Dropping it in immediately exposed the seam's real fault. `fitFrame` scales the
backdrop plane to the frame and the texture was STRETCHED onto it — which the
painted park survives, because a canopy of scattered dabs has no proportions to
get wrong, and which turned the photograph into a vertical smear the moment the
phone was held upright. So `fromImage` now takes the frame's aspect and cuts the
largest centred rectangle of that shape out of the plate; `Arena.cutPlate` recuts
whenever the frame changes shape or the deck row moves, exactly as the painting
is repainted on the row. Portrait therefore keeps only the middle of a landscape
plate — a fact a plate is framed around, not a fault to fix in code.

Two bugs found while wiring it, both of the same family — a thing that runs
twice and only the wrong run survives:

- **The cut in flight DROPPED the next request.** Boot asks for a cut at the
  camera's placeholder square aspect and the first resize asks for the real one
  a tick later; a `_cutting` guard that simply returned left the plate cut
  square and stretched onto a 16:9 plane — the exact fault the cut removes. It
  folds the request into the run in flight now. `main.js` also calls `resize()`
  before asking for the plate, so the placeholder pass is not paid at all.
- **A theme switch silently dropped the plate.** `setTheme` builds a fresh
  background material, so pressing T put the painting back and nothing said so.

Gate: four checks (67 total). The plate must be in use and its texture's aspect
must match the frame's in BOTH orientations — verified non-vacuous by forcing
the old stretch back and watching portrait fail at 1.78 against 0.47.

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
