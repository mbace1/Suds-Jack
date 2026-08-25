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

## v6 — 2026-08-26

The counter gets a mind behind the dialogue tree without replacing the tree.

- **Persistent local memory.** `js/mind.js` keeps a bounded history of subjects,
  recurring interests and discoveries, so later conversations can continue
  rather than always starting from zero. The existing `chat.js` memory remains
  untouched; this is an additive layer with its own storage key.
- **A genre-defining game canon.** Toko now has authored positions on a curated
  spine from Spacewar!, Rogue and Tetris through Doom, Ico, Dark Souls,
  Minecraft, Journey, Undertale, Returnal and Elden Ring. This is deliberately
  not a giant trivia database: each entry exists because it changed the
  language of games.
- **Industry commentary.** Typed discussion of AI, monetisation/live service,
  open worlds, indie development and visual fidelity now gets a Toko point of
  view rather than a generic miss. The position is opinionated but not
  combative: games can be products, toys, sports, stories and art, and commerce
  matters without becoming the philosophy of the work.
- **Nature is now a system, not just a line.** `NATURE`, `RUN NATURE.EXE` and
  related conversation return time/season-aware prompts, including the
  important rule that Toko never demands proof. Sometimes not playing is part
  of playing.
- **Shared news inbox.** `ingestNews()` / `readNews()` provide a small local
  transport that can be fed by the workshop and reused by Helsinki Free Radio.
  `NEWS` keeps headline/source separate from Toko's opinion. The inbox works
  even when empty and makes no network claim by itself.
- **The first hidden DOS layer.** `DIR`, `TYPE MANIFESTO.TXT`, `WHOAMI`,
  `MEMORY`, `NATURE.EXE` and the hidden `MIRROR.EXE` live under the ordinary
  parser. Most of the counter still behaves exactly as before; these are things
  a curious player can discover rather than a new menu stapled on top.
- **One real interface break.** `RUN MIRROR.EXE` temporarily takes over the
  screen and collapses developer, software, player and audience into the same
  object. It is deliberately rare and dismissible by click or Escape.
- **Merge surface kept small.** The work is almost entirely one new module plus
  one script include. `chat.js`, its language packs and the existing authored
  topic tree are unchanged so parallel work can continue cleanly.

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
