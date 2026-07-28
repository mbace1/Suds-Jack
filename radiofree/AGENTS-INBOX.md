# Radio Free Helsinki — notes from the other branch

For whoever is working `gh-pages`. Written from **`claude/radio-free-helsinki-pvtsw5`**,
which has been building the same app in parallel and did not know `AGENTS.md`
existed until a human pointed at it.

**Read [`AGENTS.md`](AGENTS.md) first — it wins.** Durable traps, coordination
rules, verify checklist, and hard rules from this file have been folded into
`AGENTS.md` (2026-07-28). Keep this file for branch-state detail and what is
still only on the Claude side (`wire.json`, smoke harness, extra bulletins).

---

## Division of labour (set by the human, 2026-07-28)

**The art and the cache tokens are yours.** Not shared, not negotiated — yours.
Every picture that ships is one of your plates, and you own the `?v=N` cadence.

I am standing down on both, from now:

- **I will not push art to `gh-pages`.** The three poly plates on my branch
  (`esplanadi`, `harbour`, `treeline`, built on a small painter's-algorithm
  renderer) and the dusk re-light I did to make them sit beside yours are
  **not canonical and not for shipping.** They exist on the branch, they are
  not an option on the table, and you should not fold them in. If anyone ever
  asks for 3D footage, that is a fresh human decision, not a merge.
- **I will not bump `?v=N` again.** Tell me if a change of mine needs one and
  you make the call, or land it yourself.

What I did already push, before this was settled: token alignment (v10, v12)
and the rotation fix in `codec.js`. No pictures — nothing under `js/` on this
branch is drawn by me. If you want the token commits reverted, say so and I
will do it rather than argue.

---

## What I need from you

Short list, all cheap:

1. **Keep `__rfh.debug.shot()` and `drawAllPlates`.** They are now the only way
   I can verify anything without touching art. If you refactor the sequencer,
   keep something that reports the live shot type and key.
2. **Bump the worker and the module imports in one commit.** This has now
   drifted apart twice — modules on v10 while `sw.js` went to v11, and before
   that three tokens at once. One line catches it:
   `grep -o "?v=[0-9]*" index.html sw.js js/*.js | sort -u`
3. **Say if `katajanokka` ever airs.** After the rotation fix I measured 9 of 10
   plates on air in one pass; that one did not come up in ~24 cuts. It is
   reachable by construction, but I have not seen it with my own eyes and you
   are closer to the art than I am.
4. **`BROLL_KEYS` in `visuals.js` is the source of truth** for what exists.
   Keep it exported — my validator reads it from your module rather than
   holding a copy, which is what stops the two drifting.
5. **The `wire.json` question is for the human, not for us.** Do not port it on
   my say-so and I will not push it. Rule #9 guards `stories.js` against
   exactly that restructuring.

---

## State of the two branches

| | `gh-pages` (live, authoritative) | `claude/radio-free-helsinki-pvtsw5` |
|---|---|---|
| Toko | masked male gel, `full` face-shot mode | **unmasked — violates hard rule #2** |
| Cut system | weighted-random face/graphic/broll, 3.2–5.5 s | fixed cycle graphic→broll→wide→broll |
| DECODE | mutates whichever shot is up (rule #5) | **stops cutting and holds the graphic — violates #5** |
| B-roll lives in | `visuals.js`, 10 plates — **the only ones that ship** | `broll.js`, 9 plates (6 of yours + 3 poly, none for shipping) |
| Bulletins | 13, in `stories.js` | 16, in **`wire.json`** (fetched, validated) |
| Gate | `drawAllPlates` + checklist | `test/smoke.cjs`, 91 headless checks |

**Where the branch is wrong, `AGENTS.md` wins.** The mask and rule #5 are not
worth arguing; if that branch ever merges, both go.

---

## Traps already paid for — you will hit these

*(Also listed in `AGENTS.md` — kept here for narrative detail.)*

**A plate is only drawn when a post happens to reach that beat.** So a broken
one ships in silence and fails only some of the time. That is exactly how four
approved panels went live calling a `PixelScreen.bands()` that did not exist.
Fixed both sides now, but the *shape* of the bug will come back with the next
panel. **Write a test that draws every `BROLL_KEYS` entry on purpose**, in both
`d = 0` and `d = 1`, and fails if one throws or comes out near-empty. On
`gh-pages` this is `__rfh.debug.drawAllPlates()` / `test/plates.cjs`.

**Import tokens drifting apart is not cosmetic.** Measured in a browser on the
deployed build before fixing it: `screen.js` was fetched under **three** tokens
and `palette.js` under four — so the page was building three separate
`PixelScreen` classes from one file. Align every `?v=N` to one version.

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

Use the checklist in `AGENTS.md` (includes draw-every-plate + offline-for-real).

---

## Log

**2026-07-28 — the rotation was pinned.** `pickBroll` returned `story.broll`
unconditionally while `AGENTS.md` documented "~85%, else random from
`BROLL_KEYS`". Since every story sets one, three plates — `esplanadi`,
`suomenlinna`, `katajanokka` — were structurally unreachable and had never
aired, and every broll cut inside a post showed the same still, so 65% of the
sequencer was one held frame. Now: the story's plate leads at 60% but never
twice running, the rest of the pool fills the gaps. Measured across the whole
feed afterwards — 9 of 10 plates aired in one pass, zero consecutive identical
cuts. `__rfh.debug.shot()` was added to make that measurable at all; an
untestable rotation is how three plates sat off the air unnoticed.

**Token drift came straight back.** Modules were aligned to v10; `sw.js` was
then moved to v11 on its own, which is the same split the protocol warns
about. All at v12 now. If you bump the worker, bump every module import in the
same commit — the check is one line:
`grep -o "?v=[0-9]*" index.html sw.js js/*.js | sort -u`.

---

## Please don't both edit at once

`gh-pages` moved four times in one hour while this branch was working, twice
mid-rebase. If two of us are live at the same time, say so in a commit message
or split the surface — one on art, one on plumbing. Half the work in this file
was spent discovering divergence rather than fixing anything.
