# The figures — the owner's own cast, standing on this bridge

Owner, 2026-09-07: *"I would like the turf art used on those figures."*
Owner, 2026-09-13: *"continue development with the new directions and assets."*

**From v34 these are the owner's OWN 26** — the casting sheets, cut
(`turf/tools/sheet-cut.mjs` → `turf/art-src/sprites/cast/roster/`), not
characters generated in their technique. v18–v33 cast the thirty generated
`*-plate.png` files, and most of those had been derived from one of these, so
the change is largely the original taking the place of its copy.
`leopard-*` and `gunner-*` are the two with full pose sets and come from
`turf/art-src/sprites/cast/` as before. `js/plates.js` casts them onto the
person-shaped figures; `test/core.mjs` fails if a cast plate is not one of the
26, is missing from the tree, or points at `art-src/`.

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

**This section is history, kept because the reasoning outlived the rule.** It
was written when the cast was the thirty generated `*-plate.png` files; those
are gone from this game as of v34 and `WITH_GUNS` is a note about that set, not
about the owner's 26.

`art-src/concepts/README.md` rejected six concept sheets partly on **no
weapons**: *"nearly every figure in the pack carries a knife, which is TURF's
grammar and not a game whose verbs are a swing, a bottle and a shopping
trolley."*

Taken literally that rejects the whole set — every one of those plates carries
something. v19 drew the line at firearms and refused eight. **Owner,
2026-09-09: *"of course they can have firearms."*** So it is not a rule, and
`WITH_GUNS` in `js/plates.js` stays as a **note**: a real fact about the
generated set, established by a pass over all thirty-two at full size, and
nothing enforces it.

**The cast was not reverted with the rule.** Three of v19's five recasts were
better castings on their own terms, and when v34 replaced the generated plates
with the owner's originals it kept those readings: the bandaged fists ARE the
Old Boxer, the apron and face mask ARE the Night Shift. A constraint that
improved the work does not get undone because it was lifted.

## Pose sets (v25)

**Two characters are not single stills.** `gunner` and `leopard` were carried
through TURF's whole seven-pose table — idle, move, attack-windup,
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

## The inventory, after v34

**The cast is the owner's 26**, cut from `casting-sheet-full.png` (20) and
`casting-sheet-3.png` (6) by `turf/tools/sheet-cut.mjs` into
`turf/art-src/sprites/cast/roster/`. **23 of the 26 stand on this bridge**;
`beanie-nine`, `fade-red` and `redhood-blue` are spare. `test/core.mjs` fails
on a cast plate that is not one of the 26.

`gunner` and `leopard` are two of those 26 and are also the only two with a
full seven-pose set (in `turf/art-src/sprites/cast/`, not in `roster/`), which
is what makes them the only two figures here that can ACT. Cutting a set for
any of the other 24 is twelve generations against a local reference crop rather
than a re-derivation of the recipe — see `turf/art-src/sprites/cast/README.md`.

**The 30 generated `*-plate.png` files are gone from this game.** They were new
characters made in the casting sheets' technique, not the owner's people, and
most of them had been derived from one of his — so v34 was largely the original
taking the place of its copy. They remain in `turf/art-src/sprites/` because
TURF's own board still uses them; nothing here reads them.

**Ten figures are not cast at all and never will be**: the rats, the blobs, the
pigeons, the gull and the bear keep their painted cutouts, because a roster of
street operators has no rat in it. A mixed row is the normal state here rather
than a gap — the gate asserts nothing non-person is cast AND that every person
is, since a half-plated row is worse than none.
