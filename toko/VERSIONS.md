# Toko Midori Games — versions

The brand's own release number: the mark, the carriers, the sting, the
signature and the counter. It is one number for all of them because they are
one thing — the face on the sticker is the face on the badge is the face
talking at the counter, and a version that only covered a third of that would
say nothing useful.

The `?v=N` token the arcade imports `chat.js` with is a separate thing: it
tracks every module-graph change so a browser cannot serve half of one build
and half of another. Bump both when shipping.

Kept newest-first — `scripts/versions.mjs` reads the first `## vN` heading and
writes it into `hub/versions.json`, which is what a cabinet shows.

## v5 — 2026-07-29

The signature stops being a stamp and becomes a door.

- **The badge in a game's corner links to the counter.** `sign({ counter: true
  })` points it at `../#toko`, so the shortest path from "that boss is unfair"
  to saying so is two taps, from inside the game. Signed on `toko-drop`,
  `hyperdagger`, `dropcabal`, `paperboy`, `flashprince`.
- It is **a link only where there is a cursor**. Bottom-left is where half
  these games put the left stick, and a 44px anchor sitting on it would eat
  the touch that starts a run. Under a thumb the badge stays a picture and the
  HOME button in the opposite corner is the way out.
- Navigation is on `pointerup` **and** `touchend`, never `click` — the same
  trap `hub/shell.js` hit: these games `preventDefault` every touch outside
  their own UI, and a cancelled `touchstart` takes the synthesised click with
  it.
- **The counter knows which cabinet you just left.** The referrer names it, so
  he opens on that game instead of a generic hello, the closed bar asks *how
  was hyper dagger?* before you open him at all, and the note that follows
  files under that game. No referrer (bookmark, typed address, `file://`) is
  just the ordinary greeting — it is a nicety, never a mechanism.
- This log, so the counter has a version number like every other project on
  the floor. `scripts/versions.mjs` now reads projects that are not cabinets.

## v4 — 2026-07-29

The cache-buster reaches the whole counter. `chat.js` carries its own `?v=` on
to `dialogue.js`, which carries it on to both language packs — before this, a
release shipped a new `chat.js` against three cached modules.

## v3 — 2026-07-28

The counter becomes the front door for feedback, and learns two more
languages.

- The note box, posting through the arcade's own transport rather than a
  second one, and never claiming a delivery that did not happen
- Notes taken in front of a cabinet file under that game's id
- Your own past notes read back out of the archive; the hi-scores off your own
  machine, shown and sent nowhere
- `CHANGED` — a hand-kept log of what actually got fixed, which is what stops
  a suggestion box going stale
- The parser: type at him and he matches by word overlap, or admits the miss
- The cabinet rack, the favourites rack, the mantra and the position
- Finnish and Japanese packs; the tokeniser learns `\p{L}`, which the Finnish
  parser had been broken on the whole time

## v2 — 2026-07-27

The counter — a Sierra-style conversation panel for the top of the arcade. A
hand-written topic tree, no network call, no model. Toko's head blinks at rest
and works while he speaks.

## v1 — 2026-07-27

The brand. One `GEO` table behind both the canvas mark and the SVG files, the
two-colour system, the lockups and sticker sheet, `glitch.js`, the sting, the
signature, the brand board, and `test/brand.cjs` to hold all of it still.
