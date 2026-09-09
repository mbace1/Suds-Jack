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

## What is still spare

Nineteen of the thirty-two are uncast — the eleven that were always free plus
the eight above. All nineteen are PEOPLE, so they do not help the ten drawn
figures (rats, blobs, pigeons, a gull, a bear); what they buy is more human
enemies. `vex` and `leopard` are the only two women in the set and `leopard` is
the Dog Walker, so a second woman means `vex` or nothing.
