# Slay Kallio — design doc

*Mostly Slay the Spire 2, with some Balatro jokers thrown in.* Owner's brief,
2026-09-04. This file is the design authority; `VERSIONS.md` is what shipped.

## 1. What it is

A single-player deckbuilder fought on a **thick plank bridge** over a Kallio
canal. You pick one of four bums, walk six spans, and either take the last one
or end up flat on the boards. Every fight is cards: play them from a hand of
five against three energy, watch what the other side has already told you it is
about to do, and get your arithmetic bigger than theirs.

Everything the player reads is **in English**. Personal names stay as they are —
a name is not a language — and a gate fails on any Finnish left in a title, a
card, a friend, an enemy or an encounter name, in either skin.

Two things are being practised here, and both are the point:

1. **Deep logic and artefact synergy** — the thing that makes Slay the Spire
   worth a hundred runs is not the cards, it is that a card, a relic and a
   status compound into a number nobody designed on purpose. That needs a
   damage pipeline with named stages, not a pile of special cases.
2. **A unique look that works in BOTH formats** — horizontal (mobile held
   sideways, Switch) and vertical (a phone in one hand). The visual test is
   whether the same scene reads at both aspect ratios without a second layout.

## 2. The look

**Tin soldiers and painted cardboard cutouts, and all of it gritty.** Each
figure is a 2D cutout — flat fills inside a heavy, wobbling ink line — standing
on a **3D base**: either a tin soldier's stamped oval with a raised lip, or a
cardboard wedge with a strip of tape over the feet. `look.base` picks which, and
mixing them is the point: a row of these should look **collected** rather than
manufactured. The cutout is flat. The base is not, and the tape is what tells
you so.

**Gritty is in the drawing, not in a filter.** The ink line is drawn twice at
different weights, so it varies the way a loaded brush does. Paint is
**scumbled** — short broken strokes of a lighter tint of the fill — and never
white: white on a small head reads as a smear across the face rather than as
light on it. Outlines are nicked, because a cutout that has been carried around
is not cut clean. Every figure carries streaks, stains and specks scaled by its
own `grime` value, and one warm light from the left with a genuinely dark
shadow side.

When something dies it **falls over in 3D**: the whole puppet pivots about its
feet on an axis tilted between the camera's x and the depth axis, so the flat
shape foreshortens as it goes down, bounces once, and lies on the boards. A flat
cutout tipping in the picture plane would read as a sprite rotating. Tipping
*into* the scene is what makes it a physical object that was standing there.

### The bridge, and why it is not a bench

The arena is a **thick wooden plank bridge** over a canal — the deck is the play
area. It replaced a park bench, and the reason is mechanical rather than
thematic: **a bench has a backrest, and a backrest crosses a standing figure at
the chest.** Every puppet was being cut in half by a slat. A bridge carries its
structure *underneath*, so beams, cross-braces and piles take the eye down into
the water instead of putting a fence across the fight.

Three rules hold the staging, and the gate checks all three:

- **Nothing stands above the deck over the play area.** The gate walks the
  bridge's geometry and fails on anything that rises above the boards in the
  lane the puppets stand in. It caught the one thing left — a far-side top rail
  above head height that still drew a line straight across the frame. It is
  gone; two broken stubs on the end posts say it used to be there.
- **The deck is many boards, not one slab.** Thirty planks with a dark board
  beneath them so each gap is a shadow, nail heads over the stringers, no two
  tones the same, and none of them quite flat or quite level. Eleven wide boards
  read as a pier; thirty read as a footbridge somebody nailed down.
- **The camera is close and nearly level.** Action width 4.6, a little above
  the deck and tilted down about ten degrees. Dead level hides the boards
  entirely and makes the understructure the whole lower half of the frame; any
  higher turns the bridge into a floor plan.

Behind it the park is **tilt-shifted**: sharp in one band, blurring away above
and below, with a matching out-of-focus foreground along the bottom edge. The
painting is built to be **photographic** rather than cartoon — canopy as
scattered dabs rather than lollipops, haze eating contrast with distance, the
canal with the treeline smeared down into it, film grain over the lot.

**The sharp band follows the deck.** The backdrop is repainted whenever the
deck's row on the screen moves, because a miniature photograph is only
convincing while the one sharp stripe lies on the thing you are looking at, and
the deck sits in a completely different place in portrait than in landscape.

**The photograph seam is built in, not planned.** `?bg=<url>` puts a real
photograph behind the bridge through the same focus pass, and
`&stereo=sbs&eye=left` crops one eye out of a side-by-side stereo pair. Testing
real (and stereoscopic) plates is a URL, not a rewrite. The painted park is the default so
the game never depends on an asset it does not carry.

## 3. Both formats, one camera rule

**Fit the ACTION WIDTH, not the bridge.** The deck runs off both ends of the
frame on purpose. The camera works out how far back it
must stand for the play area to span the frame, at that frame's aspect.

| | landscape | portrait |
|---|---|---|
| field of view | 36° | 46° |
| action width | 4.6 units | 3.4 units (the puppets stand closer) |
| camera height | 1.6 | 1.25 — flatter |
| aim | 0.28 | 0.46 |
| hand | fanned, overlapping, along the bottom middle | a five-column grid across the full width |

Portrait is **flatter**, deliberately: a phone frame is tall, so every degree of
downward tilt spends screen on the water instead of on the fight.

## 4. The fight

Slay the Spire's turn, unchanged because it works: 3 energy, draw 5, play until
you cannot, end the turn, hand goes to the discard, block goes with it. Enemies
**telegraph** — the number on the intent is the number that lands, run through
the same function that resolves it.

Statuses are the small vocabulary everything else leans on: **Vulnerable** (×1.5
taken), **Weak** (×0.75 dealt), **Strength** (permanent +), **Buzz** (a strength
that fades at the end of the turn).

## 5. The damage pipeline — where the synergy lives

One function, `computeDamage`, in three named stages:

```
base   = card + scaling + strength + buzz
        ↓  adds     (+3 from a friend, +1 per card played…)
        ↓  mults    (×2 every third attack, ×1.5 vulnerable, ×0.75 weak…)
final  = floor
```

Two rules make it a system rather than a pile of cases:

- **The breakdown rides on the log entry**, so the view can pop the base, then
  each `+3`, then each `×2` in turn — Balatro's whole feel is watching the sum
  get built. The numbers on screen are not a re-derivation; they are the ones
  that were used.
- **`preview()` and the real play call the same code.** A card's face text is
  written from its effects at the current state, so a Seeing Double-doubled Swing says
  *Deal 12 damage* on its face. In a full-information game, quoting a number you
  do not then use is the unforgivable bug.

## 6. The roster — six Kallio bums, each a different question

Every character has a mechanic, not a stat block. The starting deck is 4 Swing,
4 Cover Up and **two cards that teach the mechanic on the first turn**.

**A character is named by their CLASS** (owner, 2026-09-06), the way Slay the
Spire names the Ironclad. Six Finnish first names used to stand here — the one
thing the English rule exempted, on the grounds that a name is not a language —
and "Vekku" told a new player nothing about what the deck does, which is the
entire job of a character select. The person is still there; they are in the
blurb, where they cost nothing to read past.

| | the mechanic | the question it asks |
|---|---|---|
| **The Park Drinker** | **Buzz** — strength that fades with the turn | can you spend it all in one turn? |
| **The Busker** | cards scale with **how many you played before them** | what order do you play in? |
| **The Bottle Collector** | **Bottles** — free 0-cost tokens, and cards that count your hand | do you spend the hand or hold it? |
| **The Cart Pusher** | block that **hits**, and block that **stays** | is defending an attack? |
| **The Dog Walker** | **Fetch** — the dog goes in at the end of your turn | what is this turn worth later? |
| **The Old Boxer** | **Thorns**, and cards that count the hits he took | is being hit a resource? |

The fantasy skin renames every one of them and re-dresses the same figure — the
Sot, the Bard, the Tinker, the Warden, the Houndmaster, the Pit Fighter. Since
v15 the NAME is the thing the skin swaps, which is what a class name buys you:
there is no personal name that has to hold still across the two. It is a
**lookup, not a second data set**:
every card, character, friend, enemy and encounter carries a name in both
themes and the gate fails if one is missing.

## 7. Friends (the Balatro half)

Twelve of them, capped at five. A friend **bends arithmetic you already do** —
it never adds a verb, because a verb is a card's job. Third Time (×2 on every
third attack), Bucket Drummer (+1 per card played before it), First Light (×1.5
on the first attack), Sharp Eye (Vulnerable becomes ×1.75), Empty Hands (end
with nothing in hand, gain 5 block), Morning Can (+1 energy, −1 card).

That last one is the shape to copy: a friend that **costs** something is a build
decision. A friend that only gives is a number.

## 8. The run

**Owner, 2026-09-05: "aim for StS2 parity" — multiple characters, lots of
cards, an Eldritch night theme: the run starts in daylight, and as evening
comes things start mutating.** That supersedes what this section and §9 said
before (a map "comes later"; no upgrades; one act). What shipped as v11:

**Two acts, and a choice at every span.** The route is rolled from the seed up
front (`engine.buildRoute`): at each of an act's six steps you are offered two
or three spans — a fight, an elite, an event, a rest — and the act ends on its
boss. The rules the gate holds: the first step is fights only; an elite is
never offered before the third step and always by the fifth; a rest is always
among the last step's options; no step offers the same span twice. The
encounter pool is twenty-two, split by act (`ACTS` in `data.js`); act one is
the canal bridge and ends on the Bridge King, act two is under the bear and
ends on **the Bear** — the Karhupuisto statue from the plate, woken.

**The hour.** `hourOf(state)` runs 0 → 1 across the whole route. The world is
lit for it (three rigs per skin — day, evening, night — lerped by the arena)
and the photograph behind the bridge follows it (day, dusk and night plates,
one per stage per seed). Past dusk what spawns is **mutated**: level 1 through
the evening (+15% HP, and the figure grows eyes), level 2 at night (+30% HP,
1 Strength). A boss is never mutated — a boss *is* the night.

**Events** are places with two or three things to do; every option's label
states its price, because this is a full-information game. **Rests** heal 30%
or upgrade a card. **Upgrades are one rule, not a second version of every
card** (`engine.upgrade`): +3 damage or block (+1 per hit on a multi-hit), one
harder on a scaling card, +1 draw, one deeper on a self-status, a power costs
one less. `describe` and `preview` read the moved numbers, so an upgraded
card's face is right by construction.

**Six characters** (the Dog Walker — Fetch, the dog goes in at the end
of the turn; the Old Boxer — Thorns, and cards that count the hits he
took), ninety-five cards, twenty friends, seventeen enemies, twelve events.
A card after every fight, a friend from the elites and the act openers, 6 HP
back each time.

The bestiary is the owner's list: **rats** (small, quick, several at once),
**mutating blobs** (drawn as something about to become something else: half-formed
limbs and two eyes that do not match), and **rival bum cutouts** the same size as
you.

**A map comes later, and on purpose.** A branching run map in front of the same
six fights is a menu, not more game — the same finding TURF's parity doc records.
The order to add things is: more enemy behaviour → more encounters → then a map.

## 8a. A picture on every card

`js/cardart.js` paints a 96×62 panel per card in the same register as the
puppets: flat fills, a heavy wobbling line, one warm light from the left, a wash
of grime. A card with only words on it is a spreadsheet row, and this game is
about a hand you read at a glance. Pictures are cached per picture-and-accent,
so re-rendering the hand on every play does not repaint ten canvases. A gate
fails on a card with no picture, on a picture `cardart.js` cannot draw, and on a
set of pictures that has collapsed to fewer than fifteen distinct drawings.

## 9. What is still NOT in, and why

- **A drawn map.** The fork is a choice of two or three spans, not a DAG you
  can see ahead. The route data is already the whole map; drawing it is the
  torn-paper art pass the owner's references point at (v12).
- **Shops, potions, a third act, ascension.** No gold economy exists yet, and
  each of those is a system, not a table.
- **Sound beyond a synth kit.** No samples anywhere on this site.

## 10. The gates

```
node slaykallio/test/core.mjs                              # the rules, bare node
NODE_PATH=$(npm root -g) node slaykallio/test/smoke.cjs    # the game, in a browser
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs           # the cabinet
```

`core.mjs` runs in bare node — no browser, no GPU — so it can be run on every
edit, and it asserts **exact numbers**: a Swing is 6, a doubled Swing is 12,
Third Time's third attack is 12, Encore after three cards is 16. It also
runs a dumb bot over **160 whole runs** and asserts every character can reach the
boss and that none of them wins every time or never wins.

`smoke.cjs` covers what the rules cannot see: that a puppet is a painted cutout
rather than a blank plane, that a dead one turns out of the picture plane and
comes to rest, that everybody is inside the frame in **both** orientations, that
the sharp band of the backdrop is where the deck is, that a thumb can play a
card at an enemy with no mouse anywhere — and the three staging rules above:
nothing above the deck over the play area, a deck built of many boards, and a
camera close enough that a figure fills a real part of the frame.

**A gate that certifies *works* cannot see *looks*.** Every art change here ends
in a screenshot, the same rule the rest of this repo has paid for.
