# Toko Live — the levels

Owner, 2026-09-26: *"In the end we want to export cool MP4s that work as
marketing for Toko and the games"* — and *"use that and expand to higher levels
of Toko Live"*. This is the ladder. Each level is something a person can DO
that they could not do on the level below, and each has an exit test that is
seen, not asserted: a screenshot, a recorded loop, a file that plays.

Read `CANON.md` first (and `toko/BRAND.md` §2c): only the face is original.
Nothing on this ladder gives Toko a body without the owner drawing it.

| | Level | A person can… | Exit test |
|---|---|---|---|
| 0 | **One tree** | — (housekeeping) | `main.js` byte-identical on `main` and `gh-pages`; one log, one number |
| 1 | **He saw you play** ✓ 2026-09-26 | open Toko Live and hear about their last runs, in every game | the recap of a real run in each tabled game reaches Toko Live through `hub/playlog.js` |
| 2 | **He answers you** | leave a note in a game and, next visit, hear what changed about it | a note filed under a game + a later `CHANGED` entry for that game → he brings it up once |
| 3 | **Clay Toko** | see him as clay: matte, thumbprinted, on twos, with boil | recorded loop judged against the owner's clay reference, not a still |
| 4 | **He shows the games** | ask to see a game and watch a real clip of it on the stage | the stage plays a recorded, deterministic loop of that game |
| 5 | **He cuts your clip** | ask for a clip of their own run and download a vertical MP4 | a 15–20 s 1080×1920 file of *their* run, clay bumper, end card, −16 LUFS |
| 6 | **Toko's channel** | watch the workshop's own bulletins — what shipped, what is next | a scheduled render of `versions.json` + `CHANGED` into an MP4, the same kit |

## Owner direction, 2026-09-26: colours and behaviour, not proportions

*"The proportions of Toko are right but we should explore many colors and
alternative ways of video behavior."* So level 3 is wider than clay: it is a
**variation sheet** — the same traced face, the same proportions, across the
colours the canon already allows (the nine `STICKER` flats and moods, one face
on one ground) and across ways of moving on video (the blink and the breathing
smile he has; turn, nod, pop; glitch as an event; on-twos boil; clay). Rendered
side by side as loops for the owner to pick from, never judged from stills.

## What every level after 2 stands on: the film kit

Radio Free Helsinki (v63–v70) already built the pipeline: a deterministic film
planner on a beat grid, the one-sentence caption rule, a synthesised score at
−16 LUFS, WebCodecs export via a vendored encoder, and the 3D Toko inside the
film. Levels 4–6 lift that into a shared `toko/film/` kit rather than a second
copy — Radio Free keeps using it, and every game gets a trailer from a script,
not a build. `MOTION.md` in `radiofree/` is the rulebook it came with.

Two facts to design around, both measured here:

- **Offline is not live.** A film is rendered frame by frame, so the clay can be
  far heavier than anything the stage can afford at 60 fps, and "on twos" is
  exact — frame N is frame N. The stage gets a light clay; the films get the
  full one. Same module, two budgets.
- **The codec is the browser's.** Headless Chromium has no H.264 and writes AV1
  into the MP4; desktop Chrome writes H.264. A file meant for upload is either
  exported from desktop Chrome or re-muxed by ffmpeg — say which it is.

## Lanes

- `toko/js/toko3d.js` and `radiofree/` are the Radio Free lane's. The clay
  variant lands as an OPTION on `makeToko3D`, never a change to the default,
  so their film does not move under them.
  **It has landed, on the site first**: Radio Free v72 (2026-09-26, owner:
  *"Clay Toko is ok, Aardman"*) added `style: 'clay'` — plasticine, thumbprints,
  rolled strokes, re-lumped per held drawing, on twos. `main` does not have it
  yet; bring that file back from `gh-pages` before level 3 builds on it, and
  build ON it rather than beside it.
- `toko/js/{table,signature,chat}.js` and the game seams (`__tokoTable`) are the
  table's (see `toko/PATCH_NOTES.md`).
- `SOURCE_SYNC.md` holds: core changes on `main`, the exact bytes carried to
  `gh-pages`. Level 0 exists because v46 and v47 were authored on the site and
  a branch, and `main` sat at v19.
