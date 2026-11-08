# Toko Move — art request, after v3.18 (2026-11-08)

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

## 1 · THE STOP, in the illustration style — priority 1 (v3.20)

The waiting scene is the one main view still in the older flat vector style. It
is on screen at every card, so it matters most.

Today it is a stack, from the back. The game composes these and drives the tram
in and out:

| layer | today | what it is |
|---|---|---|
| `01-backdrop` | 1 | the city behind |
| `01b-land-<place>` | 23 | each place's landmark behind the stop |
| `02-street` | 1 | the road and rails |
| `03-tram-<model>` | 7 | the arriving tram: Artic, Nr II+, Variotram, Nr II, Nr I, the museum tram, metro |
| `04-shelter` | 1 | the shelter, bench and stop pole |
| `05-people` | 1 | who waits |
| `05b-wx-rain`, `05b-wx-snow` | 2 | weather on the stop |
| `06-courier` | 1 | the courier |
| `07-actor-<card>` | 16 | the person a story card is about (the busker, the granny, the tourist and her map, the gull…) |

What is asked:

- **A generic stop** in the illustration style, as the same layers. The tram
  must be its own layer, so it can drive in and out.
- **Per-place backdrops** for the busiest stops, if possible: Rautatientori,
  Kamppi, Lasipalatsi, Kauppatori, Hakaniemi, Kalasatama. The other places can
  keep a generic backdrop with their landmark.
- **Snow** for the stop. **Night** for the stop, in the night palette.
- **The 16 actors** redrawn standing at the new stop, if the budget allows. A
  card without its actor still works.

How it is used: every stop card stands in front of it. When a card is about
someone, they stand at the stop.

## 2 · THE RIDE, longer — priority 2 (v3.19)

The tram interior works. The window band scrolls behind the car and the
courier. The owner wants more of it: a longer stretch of travel, with things
happening and choices made aboard.

- **The neck.** In `04-courier` (all variants: base, old, museum, rush),
  Toko's disc sits left of the neck, and the skin shows beside it. Please
  correct it at the source.
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

How it is used: a ride holds on the interior longer, the window band carries
the travel, and aboard cards (the choir, the spruce, the inspector…) are
played in the car.

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

## Not asked for

- Rain scenes (the owner: sunny works, rain does not).
- Text, signage or real slogans in any picture.
- A free-roaming shop or storefront system (a new mechanic, not art).

## Where it goes

- The approved art goes to this PR while it is open.
- The game adds each piece at its beat, in its own version, and records it in
  `toko-move/VERSIONS.md`. Nothing ships as art-only without its use.
