# Slay Kallio — design doc

*Mostly Slay the Spire 2, with some Balatro jokers thrown in.* Owner's brief,
2026-09-04. This file is the design authority; `VERSIONS.md` is what shipped.

## 1. What it is

A single-player deckbuilder fought on a **park bench** in Kallio, Helsinki, in
high summer. You pick one of four locals, walk six benches, and either take the
last one or end up flat on it. Every fight is cards: play them from a hand of
five against three energy, watch what the other side has already told you it is
about to do, and get your arithmetic bigger than theirs.

Two things are being practised here, and both are the point:

1. **Deep logic and artefact synergy** — the thing that makes Slay the Spire
   worth a hundred runs is not the cards, it is that a card, a relic and a
   status compound into a number nobody designed on purpose. That needs a
   damage pipeline with named stages, not a pile of special cases.
2. **A unique look that works in BOTH formats** — horizontal (mobile held
   sideways, Switch) and vertical (a phone in one hand). The visual test is
   whether the same scene reads at both aspect ratios without a second layout.

## 2. The look

**Painted cardboard puppets on a real summer afternoon.** Each character is a
2D cutout — flat gouache fills inside a wobbly ink line, on paper that shows its
grain — standing on a **3D cardboard base with a strip of tape over its feet**.
The cutout is flat. The base is not, and the tape is what tells you so.

When something dies it **falls over in 3D**: the whole puppet pivots about its
feet on an axis tilted between the camera's x and the depth axis, so the flat
shape foreshortens as it goes down, bounces once, and lies on the seat. A flat
cutout tipping in the picture plane would read as a sprite rotating. Tipping
*into* the scene is what makes it a physical object that was standing there.

The arena is a **park bench** — the seat is the play area, with a granite block
at one end and a statue base at the other. Behind it the park is **tilt-shifted**:
sharp in one band, blurring away above and below, with a matching out-of-focus
foreground along the bottom edge. That is the Instagram-miniature look the brief
asks for, and it does a real job — it says *the bench is the game and the park is
where the game is happening*.

**The sharp band follows the bench.** The backdrop is repainted whenever the
bench's row on the screen moves, because a miniature photograph is only
convincing while the one sharp stripe lies on the thing you are looking at, and
the bench sits in a completely different place in portrait than in landscape.

**The photograph seam is built in, not planned.** `?bg=<url>` puts a real
photograph behind the bench through the same focus pass, and `&stereo=sbs&eye=left`
crops one eye out of a side-by-side stereo pair. Testing real (and stereoscopic)
summer-park plates is a URL, not a rewrite. The painted park is the default so
the game never depends on an asset it does not carry.

## 3. Both formats, one camera rule

**Fit the ACTION WIDTH, not the bench.** The camera works out how far back it
must stand for the play area to span the frame, at that frame's aspect.

| | landscape | portrait |
|---|---|---|
| field of view | 38° | 46° |
| action width | 6.6 units | 4.1 units (the puppets stand closer) |
| camera height | 1.25 | 1.0 — flatter |
| aim | 0.30 | 0.35 |
| hand | fanned, overlapping, along the bottom middle | a five-column grid across the full width |

Portrait is **flatter**, deliberately: a phone has no room for a floor, and every
degree of downward tilt trades sky and canopy for lawn nobody plays on. The real
3D ground is a thin band under the bench for the same reason — anything wider is
a sharp slab across the bottom that undoes the miniature look.

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
  written from its effects at the current state, so a Crema-doubled Strike says
  *Deal 12 damage* on its face. In a full-information game, quoting a number you
  do not then use is the unforgivable bug.

## 6. The roster — four Kallio locals, each a different question

Every character has a mechanic, not a stat block. The starting deck is 4 Strike,
4 Defend and **two cards that teach the mechanic on the first turn**.

| | who | the mechanic | the question it asks |
|---|---|---|---|
| **Nita** | barista | **Buzz** — strength that fades with the turn | can you spend it all in one turn? |
| **Jape** | bassist | cards scale with **how many you played before them** | what order do you play in? |
| **Kaisa** | tinker | **Finds** — free 0-cost tokens, and cards that count your hand | do you spend the hand or hold it? |
| **Reino** | tram driver | block that **hits**, and block that **stays** | is defending an attack? |

The fantasy skin renames every one of them and re-dresses the same figure —
alchemist, bard, tinker, knight. It is a **lookup, not a second data set**:
every card, character, friend, enemy and encounter carries a name in both
themes and the gate fails if one is missing.

## 7. Friends (the Balatro half)

Twelve of them, capped at five. A friend **bends arithmetic you already do** —
it never adds a verb, because a verb is a card's job. Third Time (×2 on every
third attack), Kick Drum (+1 per card played before it), Karaoke Night (×1.5 on
the first attack), Metal Detector (Vulnerable becomes ×1.75), Terrace (empty
your hand, gain 5 block), Double Espresso (+1 energy, −1 card).

That last one is the shape to copy: a friend that **costs** something is a build
decision. A friend that only gives is a number.

## 8. The run

Six fights on a straight line — flock, gull and pigeon, floater, karaoke, the
ticket inspector (elite), the bouncer (boss). A card after every fight, a friend
after three of them, 8 HP back each time.

**A map comes later, and on purpose.** A branching run map in front of the same
six fights is a menu, not more game — the same finding TURF's parity doc records.
The order to add things is: more enemy behaviour → more encounters → then a map.

## 9. What is NOT in v1, and why

- **A map, shops, campfires.** See above.
- **Card upgrades.** Every card would need a second version, which doubles the
  data before the first version is proven interesting.
- **A second act.** Six fights is enough to tell whether a build comes together.
- **Sound beyond a synth kit.** No samples anywhere on this site.

## 10. The gates

```
node slaykallio/test/core.mjs                              # the rules, bare node
NODE_PATH=$(npm root -g) node slaykallio/test/smoke.cjs    # the game, in a browser
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs           # the cabinet
```

`core.mjs` runs in bare node — no browser, no GPU — so it can be run on every
edit, and it asserts **exact numbers**: a Strike is 6, a Crema-doubled Strike is
12, Third Time's third attack is 12, Encore after three cards is 16. It also
runs a dumb bot over **160 whole runs** and asserts every character can reach the
boss and that none of them wins every time or never wins.

`smoke.cjs` covers what the rules cannot see: that a puppet is a painted cutout
rather than a blank plane, that a dead one turns out of the picture plane and
comes to rest, that everybody is inside the frame in **both** orientations, that
the sharp band of the backdrop is where the bench is, and that a thumb can play
a card at an enemy with no mouse anywhere.

**A gate that certifies *works* cannot see *looks*.** Every art change here ends
in a screenshot, the same rule the rest of this repo has paid for.
