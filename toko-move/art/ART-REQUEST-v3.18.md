# Toko Move — art request, after v3.18 (2026-11-08; the stop, the modules and the logo added 2026-11-09)

The owner's direction on v3.17:

> *"The traveling on a tram visual is a great one and should be used more. The
> neck is a bit disconnected but the background looks great moving. Similar ones
> should for a longer loop of travel, animations and choices.*
> *The waiting on a stop visual is great but needs lots of improvement and
> polish. Making it a bit closer to the art of the other visuals.*
> *We need 3 options at every choice. 2 regular and 3rd can sometimes be special
> or very special."*

Three options and the lower-third menus shipped in code in v3.18. This request
is for the art those directions need. The game will not invent art in the
meantime. As before, it waits for approved art and puts each piece in at the
beat it draws.

## The look to match

The approved exterior packs are the reference: `toko-move/art/approved-exteriors/`
(`CONTACT-APPROVED.png`, `APPROVED-ART.json`), especially:
- `sunny-open-perspectives` (kiosk, doorway, cyclist, metro);
- `sunny-new-locations`;
- `encounters-weather-studies`;
- `choice-consequence-studies`.

The rules those packs settled, and the game relies on:

- **The courier** is the same person in every picture. Navy coat, brown
  shoulder bag, the parcel. Their head is Toko's face: the cyan disc with the
  white ring, read as a head **on the neck**. Keep the identity on its own
  registered layer, as `10-exact-courier-identity.png` does.
- **Sunny works, rain does not** (the owner). Day pictures are sunny. Snow is
  the one weather drawn, and only where a scene asks for it.
- **Real proportions.** Trams are long, people are small next to them, and
  places are recognisably Helsinki without claiming a measured reconstruction.
- **No text in the art.** Signs, the line number and place names are drawn by
  the game.

## Formats

- **Masters:** 1024 × 1024.
- **Crops:** 16:9 (1024 × 576) and 9:16 (576 × 1024), as real crops of the
  master. No repainting for the second format.
- **Scene layers:** PNG with transparency, each the full frame, so the game can
  stack and move them.
  - The stop is drawn at 1080 × 1920 and 1920 × 1080 today.
  - The tram's window tile is 1222 × 1920 and 1670 × 1080 today.
  - Matching those sizes lets a new layer replace an old one file for file.
- **Each pack:** a `CONTACT.png`, an approval record and source notes, like the
  packs in PR #632.

## 1 · THE STOP, in the illustration style — priority 1

The owner, 2026-11-09: *"The waiting for a tram art needs to be replaced with
better styles, but otherwise same layout works. Toko face get buried behind
map though. Ask for this and all modular elements."*

**Same layout, better style.** Keep today's composition: the shelter left of
centre, the street and rails running diagonally, the tram arriving along
them, the courier standing right of centre, the place's landmark behind. Redraw
it in the approved illustration style.

**Keep the courier's face clear of the corner map.** The game shows a small
map in the top-right corner (about a third of the screen's width, square,
just below the top bar).
- Keep the courier's face out of the top third of the picture, in both
  formats. Today it stands at about a third of the height, right of centre,
  which is exactly where the map sits on a phone.
- The game moves the map aside when they still meet (v3.22), but the
  composition should not need it.

**Every element as its own layer.** Full-frame transparent PNGs, at the stop's
sizes (1080 × 1920 and 1920 × 1080). The game composes them and moves some
(the tram drives in and out, people come and go):

| layer | how many | notes |
|---|---|---|
| `01-backdrop` | 1 generic, plus one each for Rautatientori, Kamppi, Lasipalatsi, Kauppatori, Hakaniemi, Kalasatama if possible | the city behind, sunny |
| `01b-land-<place>` | 23 (today's places) | the landmark behind the stop, its own layer, so one backdrop can serve many places |
| `02-street` | 1 | the road, rails and pavement |
| `03-tram-<model>` | 7: artic, nr2plus, vario, nr2, nr1, museum, metro | the arriving vehicle, alone, so it can drive in |
| `04-shelter` | 1 (+ a snow cap variant) | the shelter, bench, pole and timetable |
| `05-person-<n>` | 8–12 single waiting figures | **one person per layer**, so the game can choose who waits: a commuter, a student, a pensioner, a parent with a pram, a cyclist, a tourist… |
| `05b-wx-snow` | 1 | snow on the ground and in the air (no rain) |
| `06-courier` | 1 (+ a snow variant) | the courier with the parcel; the face on its own registered layer as before |
| `07-actor-<card>` | 16 | the story cards' people, standing at the stop |
| `08-night-<layer>` | the backdrop, street, shelter and people again | the night palette |

**Naming and placement:** the same names as today, so a new layer replaces an
old one file for file.

## 2 · THE RIDE, longer — priority 2

The tram interior works. The window band scrolls behind the car and the
courier. The owner wants more of it: a longer stretch of travel, with things
happening and choices made aboard.

- **The neck.** In `04-courier` (all variants: base, old, museum, rush),
  Toko's disc sat above the neck. v3.19 moved it down onto the collar in the
  game's copies. Please redraw it at the source, which replaces that fix.
- **Window views, seamless on the horizontal**, at the tile sizes above, for:
  1. the city centre;
  2. the harbour and the sea;
  3. a park (Töölönlahti, Kaisaniemi);
  4. a bridge over water (Pitkäsilta, the Kulosaari bridge, for the metro);
  5. Kallio's streets.

  The game picks one by where the ride goes.
- **The courier in three poses:** seated with the parcel, standing at a pole,
  and looking at the phone. The game alternates them on a long ride.
- **Passengers as separate layers,** two or three people each, so riders can
  board and leave at a stop.
- **The metro interior,** the same way: car, window tile, people, courier.
- **Snow and night** for the window tiles. The night window already exists
  and works.

How it is used: a ride holds on the interior for its whole length (v3.19), the
window band carries the travel, and aboard cards (the choir, the spruce, the
inspector…) are played in the car.

## 3 · THE NEW SPECIAL OPTIONS — priority 3

v3.18 gave every choice a third option, and two of them travel. Today they are
shown only on the map:

- **The taxi** (special): the courier in the back seat with the parcel, the
  city going by. One scene, both formats, sunny and snow.
- **The cargo-bike lift** (very special): the courier in a cargo bike's box,
  or riding behind its rider, along a Helsinki street. One scene, both
  formats, sunny.

## 4 · THE VERY SPECIAL MOMENTS — priority 4

The rare third options are the moments the city should remember, drawn like
the crossing and the wallet. One scene each, both formats, sunny unless noted:

1. The choir: the carriage singing Finlandia, and the courier singing too.
2. The cold plunge: steam, the ice hole by the public sauna.
3. The ice swimmer: the man in a towel and the courier at the ice hole (snow).
4. The reindeer on Mannerheimintie, eating the courier's pulla.
5. The ghost tram's driver turning to answer (night).
6. The wallet's owner, found in the library corner.
7. The two gulls escorting the courier along the quay.
8. Aino at her door, with the flowers and the coffee.

## 5 · MODULAR PEOPLE AND THINGS, for cards made from modules — priority 2

The owner wants *"100x content so it never feels stale … randomized from
modules"*. From v3.22 the game assembles story cards from parts: a person, what
they want, a twist, three options. For those cards to show who they are about,
the stop needs **people and things as cutouts**, in the stop's camera, standing
where an actor stands today:

- **People (20–30):** a man in a Marimekko scarf, a woman with a dog, a
  student in overalls, a pensioner with a trolley, a tourist with a backpack,
  a cyclist, a busker with a guitar, a child in a snowsuit, a kiosk worker,
  a hockey fan in a jersey, a commuter with coffee, a jogger, a mother with a
  pram, a delivery robot, a man carrying a ladder, a woman with a cello case,
  twins in matching coats, a chef on a break, a priest, a grandfather with a
  grandson.
- **Things (15–20), carried or set down:** a sofa, a spruce, a cello case, a
  birthday cake, a mattress, a fishing rod, a bag of cinnamon buns, a cat
  carrier, a bike with a flat tyre, a wedding dress bag, a lost glove, a
  shopping trolley, a stack of pizza boxes, a stroller, a rug.
- One figure or thing per file, full frame, transparent, standing at the
  actor's mark; snow variants where clothes would change.

## 6 · THE LOGO — priority 1

The owner, 2026-11-09: *"The toko Midori Games logo face part is good but the
text is bad, use the original I have given you."*
- The original lockup is not in the repository. Every branch was searched:
  only the face masters (`toko/master/`) and banners set in a stock font
  (`branding/toko-midori/`).
- The game's lettering (`toko/js/wordmark.js`) was drawn by eye after the
  face.

**Asked for:** the original *Toko Midori Games* logotype, as the owner gave it.
- The vector (SVG/PDF/AI) if it exists, else the largest PNG, on white and on
  transparent.
- It goes to `toko/master/`. Its outlines then replace the drawn ones in
  `wordmark.js`, which every lockup, the sting, the trailer's title card and
  the end card already draw from.

## Not asked for

- Rain scenes (the owner: sunny works, rain does not).
- Text, signage or real slogans in any picture.
- A free-roaming shop or storefront system (a new mechanic, not art).

## Where it goes

- The approved art goes to this PR while it is open.
- The game adds each piece at its beat, in its own version, and records it in
  `toko-move/VERSIONS.md`. Nothing ships as art-only without its use.
