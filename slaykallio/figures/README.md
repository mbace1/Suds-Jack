# The figures — TURF's cast, standing on this bridge

Owner, 2026-09-07: *"I would like the turf art used on those figures."*

These are copies of the owner's own TURF character plates
(`turf/art-src/sprites/`), cast onto the person-shaped figures of Slay Kallio
by `js/plates.js` and shown when the menu's `art:` toggle is on **turf**.

## Why they live here and not in `art-src/`

A Slay Kallio deploy is a copy of the folder **minus `test/` and `art-src/`**.
Runtime art under `art-src/` would arrive on the site as a 404. TURF carries
the same note from the opposite direction — its `art-src/sprites/` *is* the
runtime path, which is why a TURF deploy has to carry it.

`test/core.mjs` fails if any cast plate is missing from the tree, or if the
cast ever starts pointing at `art-src/`.

## What a plate has to be

- **192×288 PNG, transparent**, one standing figure.
- **Padded however it likes.** The loader scans the INK bounds and places the
  figure on the same baseline the painted cutouts stand on, so drawn and plated
  figures share a row without one of them floating. Sizing to the FILE stands a
  short figure in the air and a tall one through the planks.
- **No baked lighting that has to survive.** The plate replaces the PAINT and
  not the process: newsprint, torchlight, nicks, fibre and grime all still run
  over it, which is what makes it belong to this bridge instead of to TURF's
  board.

## Swapping one

Copy the PNG in and change the one line in `CAST` (`js/plates.js`). Nothing
else knows a figure's art by name.

## The weapons rule, and the owner lifting it

`art-src/concepts/README.md` rejected six concept sheets partly on **no
weapons**: *"nearly every figure in the pack carries a knife, which is TURF's
grammar and not a game whose verbs are a swing, a bottle and a shopping
trolley."*

Taken literally that rejects the whole set — every one of the 32 plates carries
something. So the line is drawn where it matters: **a knife is not the problem,
a gun is.** A street knife on a bum reading the far end of a bridge is
plausible; a man drinking in a park with a pistol in his hand is a different
game in a different country.

v19 drew the line at firearms on that reasoning and refused eight plates.
**Owner, 2026-09-09: *"of course they can have firearms."*** So it is not a
rule. `WITH_GUNS` in `js/plates.js` stays as a **note** — a real fact about the
set that cost a pass over all thirty-two at full size, and the thing you want
to know while casting — and nothing enforces it:

    denny · deuce · grunt-handgun · grunt-shotgun · grunt-tanner ·
    grunt-track · niner · gunner

**The cast was not reverted with the rule.** Three of v19's five recasts are
better castings on their own terms and that reasoning outlives the permission:
`grunt-ragged`'s bandaged fists ARE the Old Boxer, `cleaver`'s apron and face
mask ARE the Night Shift, `knuckle` is a Bridge King. A constraint that
improved the work does not get undone because it was lifted.

## Pose sets (v25)

Two of the thirty-two are not plates at all. **`gunner` and `leopard` were
carried through TURF's whole seven-pose table** — idle, move, attack-windup,
attack-release, hit, death-fall, death-down — in both facings, and that art sat
in `turf/art-src/sprites/cast/` for a fortnight with nothing reading it while
this game moved a single still card around.

A posed character ships as **seven files named `<name>-<pose>.png`** and has no
bare `<name>.png`: its standing frame is `<name>-idle.png`, so the set is one
naming rule and nothing has to remember which file is the special one.
`WITH_POSES` in `js/plates.js` is the list; `motion.js`'s `frameAt` picks which
frame is showing, off the same stage durations the transform uses.

**Front only.** TURF needs two facings because its board is isometric and a
unit can walk away from the camera. Here everybody faces across the bridge and
`body.scale.x = facing` already mirrors the enemy row, so a rear frame would
never be drawn — seven files a character instead of fourteen.

Adding a pose set to another character is a copy of its seven fronts plus its
name in `WITH_POSES`. Generating one for a character that has none is 12 API
calls and is documented in `turf/art-src/sprites/cast/README.md`.

## What is still spare, counted properly

An earlier version of this file said nineteen, which was wrong twice over. The
real enumeration:

- **30 `*-plate.png`** in `turf/art-src/sprites/`, plus **`gunner`** and
  **`leopard`** in `cast/` with pose sets — **32 characters**.
- **22 are cast here** (16 plates at v18–v23, `leopard`, and five more plus
  `gunner` at v26).
- **10 spare**: `blade`, `denny`, `deuce`, `grunt-handgun`, `grunt-shotgun`,
  `grunt-tanner`, `grunt-track`, `niner`, `reed`, and nothing else.

All ten are PEOPLE, so they do not help the ten drawn figures (rats, blobs,
pigeons, a gull, a bear); what they buy is more human enemies. `vex` and
`leopard` are the only two women in the set and both are now cast — the Bottle
Thief and the Dog Walker — so **a third woman needs new art, not a recast.**

## And these 32 are not the owner's 26

Worth saying plainly, because the names invite the confusion. The `*-plate.png`
files are **new characters generated in the casting sheet's technique** — the
`turfGrim` style block says in as many words to copy the technique and never
the reference's specific character. The owner's own roster is a different set:
**26 people across `turf/references/casting-sheet-full.png` (20) and
`casting-sheet-3.png` (6)**, front and back, and only `gunner` and `leopard`
have ever been cut out of them into transparent sprites. Everyone else on those
sheets exists here as a magenta-keyed reference PNG and nothing more.
