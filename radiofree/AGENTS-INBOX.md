# Radio Free Helsinki — notes from the other branch

For whoever is working `gh-pages`. Written from **`claude/radio-free-helsinki-pvtsw5`**,
which has been building the same app in parallel and did not know `AGENTS.md`
existed until a human pointed at it. Read `AGENTS.md` first — it wins. This file
is only what it does not yet cover.

---

## State of the two branches

| | `gh-pages` (live, authoritative) | `claude/radio-free-helsinki-pvtsw5` |
|---|---|---|
| Toko | masked male gel, `full` face-shot mode | **unmasked — violates hard rule #2** |
| Cut system | weighted-random face/graphic/broll, 3.2–5.5 s | fixed cycle graphic→broll→wide→broll |
| DECODE | mutates whichever shot is up (rule #5) | **stops cutting and holds the graphic — violates #5** |
| B-roll lives in | `visuals.js`, 10 plates | `broll.js`, 9 plates (6 of yours + 3 poly) |
| Bulletins | 13, in `stories.js` | 16, in **`wire.json`** (fetched, validated) |
| Gate | manual checklist | `test/smoke.cjs`, 91 headless checks |

**Where the branch is wrong, `AGENTS.md` wins.** The mask and rule #5 are not
worth arguing; if that branch ever merges, both go.

---

## Traps already paid for — you will hit these

**A plate is only drawn when a post happens to reach that beat.** So a broken
one ships in silence and fails only some of the time. That is exactly how four
approved panels went live calling a `PixelScreen.bands()` that did not exist.
Fixed both sides now, but the *shape* of the bug will come back with the next
panel. **Write a test that draws every `BROLL_KEYS` entry on purpose**, in both
`d = 0` and `d = 1`, and fails if one throws or comes out near-empty. Ten
seconds of work, and it is the only thing that would have caught it.

**Import tokens drifting apart is not cosmetic.** Measured in a browser on the
deployed build before fixing it: `screen.js` was fetched under **three** tokens
and `palette.js` under four — so the page was building three separate
`PixelScreen` classes from one file. `AGENTS.md` already calls token alignment
mandatory; this is what it actually costs when it slips. Now aligned at v10.

*Correction to the record:* an older deploy commit says radiofree "does not
survive an offline reload". It does. Tested against the deployed tree — the
worker's last-resort `caches.match(req, {ignoreSearch: true})` covers stale
tokens, so offline boots and reads fine. Do not go hunting that bug.

**A module with live bindings must never be imported twice.** On the branch,
`stories.js` fills `export let` bindings once at boot, so a second
`import('./js/stories.js')` — from a test, from a console — gets a fresh and
**empty** copy. It crashed the test harness on `sector.freq`. Anything
inspecting app state should go through `window.__rfh.debug.*`, never a
re-import. Same hazard applies to any module you give load-time state.

**Never hardcode the roster size in a test or a string.** It went stale twice.
Read it off `__rfh.debug.stories().length` and derive the `NN/NN` tags from it.

**`behavior: 'auto'` is not "jump".** In `scrollTo`/`scrollIntoView` it means
*defer to CSS*, and the feed is `scroll-behavior: smooth` — so `'auto'`
politely animates and a programmatic jump lands a frame late. `'instant'` is
the one that lands.

**`PixelScreen.line()` must round its endpoints before computing the slope.**
Stepping from rounded coordinates with an unrounded slope lets Bresenham miss
the target and run to its guard limit. It drew two long rays across a panel.

**Dither in 2 px cells must sample `bayer(x >> 1, y >> 1)`** — the *cell* index.
Sampling at even pixel coordinates only ever reaches 4 of the matrix's 16
values, all low, and the stipple collapses into blobs.

**Video grain must not come from `bayer()` at all.** The low cells are the same
cells every frame, so the "noise" sits perfectly still and reads as a
perforated screen. Plain `Math.random()` positions.

### If you ever add a 3D plate
The branch has `poly.js`, a painter's-algorithm renderer under three of its
plates. Two traps it paid for, in case that code ever comes across:
- a polygon reaching behind the near plane is dropped **whole** — ground planes
  starting behind the camera vanish and the shot is bare sky;
- two full-length ground planes stacked on each other have the **same average
  depth**, so the sort is a coin toss and one covers the other at random. Butt
  the strips together in x instead.

---

## What is on the branch and worth taking

**`wire.json` — the bulletins as data.** The whole roster and all three
language blocks in one fetched file. Adding a bulletin becomes a JSON edit plus
`node radiofree/tools/validate-wire.mjs`; no build, no deploy, no token bump.
Three parts make it safe:

1. **Validated before a word reaches the screen.** `js/wire.js` is one
   dependency-free validator; the app runs it on the download and the CLI runs
   it on a file, so a wire that passes in a terminal cannot be rejected in a
   browser for a reason the author never saw. It reads the legal art keys from
   the modules that actually draw them, so the allow-list cannot drift.
   It fails on a missing language, a missing field, malformed `{{…|…}}`, a
   bulletin with **no** markup at all, and — the silent one — a `visual` or
   `broll` the build cannot draw.
2. **Network-first for the wire, cache-first for the shell** (`sw.js`).
   Cache-first for content would pin a listener to whatever they downloaded
   first: the app keeps updating on token bumps and the news never does.
3. **It can fail, so it fails on air.** A 404, a timeout or a bad payload
   installs a baked-in station-identification post in all three languages that
   still decodes — never an empty feed.

**This is the one thing needing a human.** `AGENTS.md` rule #9 says do not wipe
the `stories.js` language blocks, and moving them into `wire.json` is exactly
the kind of restructuring that rule guards against — even though nothing is
lost and completeness is machine-checked. **Do not port it on an agent's say-so.**

Also portable, and cheap: three extra bulletins (`surprise-bundle`,
`up-to-ten`, `no-comment`), `STORIES.md` (the content bar — register is The
Onion, one new technique per bulletin, plain readings must be specific), and
`test/smoke.cjs`.

---

## Verify before claiming shipped

`AGENTS.md`'s checklist, plus the two it does not have:

6. **Draw every plate on purpose**, both decode states — see above.
7. **Offline reload for real**: register the worker, cut the network, reload,
   tune in, read a bulletin. Manual refresh does not exercise it.

---

## Please don't both edit at once

`gh-pages` moved four times in one hour while this branch was working, twice
mid-rebase. If two of us are live at the same time, say so in a commit message
or split the surface — one on art, one on plumbing. Half the work in this file
was spent discovering divergence rather than fixing anything.
