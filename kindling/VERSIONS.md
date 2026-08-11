# Kindling — versions

## v1 — 2026-08-11

The first build. A care companion in one room, in the shape Finch established: you
tick off the small real things you did, they become fuel, the fuel keeps a fire,
and the fire is the light you see the room by.

- **The room** (`js/room.js`). One 192×128 canvas: hearth, creature, woodpile,
  two shelves, a door and a window. The light is a measured ramp out of the
  hearth — how far it reaches across the floor IS the day's tally, so the picture
  states the loop with no label on it. All of it is dithered inside `cached()`
  and keyed on the light quantised to twelve steps; flame, smoke, sparks, the
  creature and the lantern in the window are drawn live on top.
- **The sheet** (`js/state.js`). Six default care lines plus up to fourteen of
  your own, a five-step check-in, and a streak counted back from today. The day
  turns at **04:00**, not midnight. Untick freely; the lifetime count only ever
  goes up.
- **Breathing** (`js/breathe.js`). Four rounds of 4 in / 4 hold / 6 out, paced on
  the fire itself rather than a second meter. Each completed round is banked, so
  stopping early keeps what you did.
- **The errand** (`js/errand.js`). Three kindling sends the creature out for 90
  seconds of real time; the outcome is seeded at departure and computed on
  return, so it survives a reload and a closed tab. It comes back with two lines
  for the journal and often something for the shelf. There is no bad outing.
- **Growth.** Five stages off the lifetime count of small things kept — a spark,
  a wisp, a tender, a keeper, an elder. Screen time earns nothing.
- **Nothing leaves the browser.** One localStorage key, no account, no network
  call, no leaderboard. Said once, on the first visit, in the app's own voice.
- `node kindling/test/smoke.cjs` — the gate, driven off game state.

Known and deliberate: the app is English only (the catalogue entry says so); the
Finnish and Japanese in `hub/games.js` want the same native read the counter's
packs do.
