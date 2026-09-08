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

## The open question

`art-src/concepts/README.md` rejected six concept sheets on two filters, and
one of them was **no weapons**: *"nearly every figure in the pack carries a
knife, which is TURF's grammar and not a game whose verbs are a swing, a bottle
and a shopping trolley."* Most of these plates carry one too. The casting leans
on the weapon-light end of the set — `grunt-barfly` holds a **bottle**, which
is the Park Drinker's whole mechanic, and `grunt-milo` a can — but the Old
Boxer is still holding a pistol. That is why this is a toggle.
