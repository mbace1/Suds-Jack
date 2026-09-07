# Radio Free Helsinki — agent handoff

Read this **before** changing anything under `radiofree/`.
Human-facing overview: `README.md`. Parallel-branch notes: [`AGENTS-INBOX.md`](AGENTS-INBOX.md).

**Live URL:** https://mbace1.github.io/Suds-Jack/radiofree/  
**Branch to edit for live:** `gh-pages` (not `main`).

---

## Division of labour (human-set, 2026-07-28)

| Surface | Owner |
|---------|--------|
| **Art / B-roll plates / visuals.js** | **Grok on `gh-pages`** — only these plates ship |
| **Cache `?v=N` cadence** | **Grok on `gh-pages`** — bump worker + **all** module imports (including leaf) in the same commit |
| Plumbing verify, FI/JA restore, inbox notes | Claude may land non-art fixes; stands down on art and choosing new token numbers |

Claude’s poly/3D plates stay on the branch only — **not for merge** unless the human asks for a fresh 3D decision.

**Do not both edit `gh-pages` blind.** Announce in the commit message if live.

**Do not port `wire.json` without explicit human approval.**

---

## Coordination

| | `gh-pages` (live, authoritative) | `claude/radio-free-helsinki-pvtsw5` |
|---|---|---|
| Toko | **masked** male gel, `full` face-shot mode | unmasked — **violates hard rule #2** |
| Cuts | weighted-random face/graphic/broll | fixed cycle |
| DECODE | mutates whichever shot is up; cuts continue | holds graphic — **violates #5** |
| B-roll | `visuals.js`, 10 plates — **only ones that ship** | branch-only |
| Bulletins | `stories.js`, **14** (trilingual COPY) | `wire.json` (human gate) |

**Where the branches disagree, this file wins.**

---

## Intent

A **fictional pirate news broadcast** in a vertical phone feed. Toko (masked male Japanese gel from Toko Drop) reads the wire. Subject is **propaganda technique**, not real accusations. Every bulletin is invented; DECODE shows the spin.

Feel: half Metal Gear codec, half TikTok feed, phosphor green, offline-first, **no image assets**.

---

## House rules (guidelines, not blockers)

Owner's call, 2026-07-28: these are **high-level guidelines**, not gates. They
encode things that have gone wrong before, so departing from one should be a
decision someone made on purpose and said out loud — not a thing you discover
in a diff. If a rule is in the way of what the human asked for, the human wins;
note it in the commit and here.

1. **Trilingual always** — fi / en / ja for every bulletin field and UI string. **No `{...EN}` spreads** that leave FI/JA as English with a different button label. Non-empty English under FI/JA is a silent rule-#1 break.
2. **Toko is the brand mark, and the mask IS the face.** Corrected 2026-07-28
   by the owner — the "surgical mask / male Japanese gel" wording this rule used
   to carry was a local invention of this folder, and two drawings made from it
   were rejected. The real definition is `toko/BRAND.md` and the measured
   geometry table `GEO` in `toko/js/face.js`: a rounded head with round-capped
   arcs reversed out of it, **magenta `#f0027f` ground, paper-white ink, two
   colours and nothing else**. The eye is a semicircle crown plus two straight
   parallel legs, closed at rest (that closed arch is the logo) and gaining a
   pupil line only when he is looking at you. **Import the geometry, never copy
   it** — `BRAND.md` records four wrong answers already paid for on the eye
   alone. The news anchor (`js/anchor.js`) does this; the teal gel in
   `js/toko.js` is the older codec portrait and is not the brand.
3. **Face shots vs B-roll** — faces only on face shots. **B-roll: no faces, portraits, or character heads.**
4. ~~**No image assets** — every pixel is drawn in code.~~ **DISMISSED
   2026-07-28 by the owner.** Footage is now photographic — see *Submitting
   art* below. The rest of the app still draws: the sign-off test card, the
   decode graphics, Toko.
5. **DECODE works on every shot type.** It **cuts home to the STORY GRAPHIC
   and holds there** — on a codec post and on a cut package alike. The panels
   decode as hard as the words do (the truncated chart re-bases, the valuation
   tower goes hollow, the packed auditorium empties), so the graphic is the one
   shot that decodes and the one DECODE goes to. Decoded, the lower third is
   capped at 62% and the graphic card goes **compact** — 78% buried the picture
   entirely, which meant DECODE cut to something you could not see.
6. **Amber means spin only** — never decorative UI before DECODE.
7. **Offline PWA** — bump cache version when shipping JS (see Cache).
8b. **REAL EVENTS, INVENTED ACTORS — always both.** Owner's call, 2026-07-31,
   and the rule the premise rests on. The event is real and is not embellished;
   every company, ministry, operator and named person is invented and audibly
   so (`Piggies and Birds Inc`, `Ka-Boom Nordics Oy`) — a pun tells the listener
   the name is not a claim. **No real person is quoted, ever.** A parody name
   must not be a one-to-one mask for one identifiable firm when the story
   attaches something unflattering; aim at the kind of company, not at a company
   with the serial numbers filed off. Places and infrastructure may be real —
   geography is not an accusation. Full spec, with worked transformations, in
   `EDITORIAL.md`; that file is what the daily generator will be handed.

8. **Fiction footer stays honest** — defence-band actors unnamed; prefer invented Helsinki entities over real geographies/industries when possible (flag edge cases for the human).
9. **Do not wipe `stories.js` language blocks** — EN / FI / JA must stay complete and **distinct**.
10. **Helsinki accuracy** — `mannerheim` = wide boulevard; `katu` = narrow street; station = Central Station clock tower; cathedral = Tuomiokirkko / Senate Square.

---

## Adding a bulletin — it is a JSON edit now

The wire lives in **`wire.json`**, fetched at boot. Adding a bulletin is a
roster entry plus a copy block in each of `copy.en` / `copy.fi` / `copy.ja`,
then:

```
node radiofree/tools/validate-wire.mjs      # exit 0 = safe to publish
```

**No build, no deploy, no cache-token bump.** The app picks it up on the next
load, because `wire.json` is served network-first while the shell stays
cache-first (`sw.js`). Making the wire cache-first to save a request would pin
a listener to whatever bulletins they downloaded first and quietly undo the
whole arrangement.

`js/wire.js` is the validator — the same function the CLI runs and the app runs
on the download, so a wire that passes in a terminal cannot be rejected in a
browser for a reason you never saw. It fails on a missing language, a missing
field, malformed `{{…|…}}`, a bulletin with no markup at all, and the silent
one: a `visual` or `broll` this build cannot draw.

### Where a new bulletin lands, and how an old one leaves

Give a bulletin **`"filed": "YYYY-MM-DD"`** and it sorts to the **top** of the
feed. Dates sort newest first; inside one day's batch the three bands keep
their order, so a drop lands on top and is still grouped rather than scattered
across the dial. A bulletin with **no `filed`** is the standing backlog and
sits below everything dated, in the order the file lists it — which is why the
seventeen already on the wire are untouched and in exactly the arrangement they
had.

Two ways to take one off, and neither deletes it:

| | |
|---|---|
| `"retired": true` on a story | that one, by name, out of the rotation |
| `"keep": n` at the top level | keep the newest *n*, let the tail fall off the bottom |

The copy stays in the wire either way, so un-retiring is a one-word edit rather
than a rewrite. Both are **reported, never silent** — the validator warns with
a count and the app logs the ids, because a feed that quietly got shorter reads
as bulletins that were never written. Retiring *everything* is an error: an
empty broadcast is the failure the whole format exists to prevent.

`node radiofree/tools/validate-wire.mjs` prints the rotation top-first with the
filing dates, so you can see a bulletin land before you publish it.

If the wire 404s, times out or fails validation, the feed shows a baked-in
**station identification** post in all three languages that still decodes —
never an empty column. `__rfh.debug.wire()` reports `source` and the errors.

**Never `import()` `stories.js` twice to read the wire.** It holds it in live
bindings filled once by `loadWire()`, so a second import gets an EMPTY copy.
Go through `__rfh.debug.wireData()`.

`radiofree/STORIES.md` is the content bar: The Onion register, one new
technique per bulletin, every plain reading specific.

---

## Submitting art

Footage frames are image files now. If you are handing art in, this is what
makes it drop straight in.

**Format and size.** 2:3 portrait. The shipped set is **784×1168**; that is the
floor, bigger is fine. PNG preferred (lossless, and these are pixel art); JPG
accepted — the current three are JPG at 160–250 KB each. Keep each file under
about 250 KB: they go in the offline precache, which is otherwise ~100 KB of
JS, and the app gets read on a metro.

**The safe area — this is the one that bites.** A 2:3 frame in a phone-shaped
post is cropped by `object-fit: cover`, and the slow Ken Burns push scales to
1.09 on top of that. So:

- Keep the subject inside the **central ~70% of the width**. Roughly 11% is
  cropped off each side at rest, and another ~4% at the far end of the push.
  In `cathedral` the flagpoles sit right on that line.
- Keep anything essential **out of the bottom third** — the lower third
  (dateline, headline, two lines of copy) sits over it on a dark scrim.
- `object-position` is `50% 42%`, so the frame favours the upper half.

**Look.** Night. Dark, green-cast, high contrast, dense: individually lit
windows, real depth, converging lines. Warm practical light — street lamps, lit
tram windows, headlights — is welcome and in the reference set, but keep it
**dim and desaturated**. Nothing should approach a saturated amber: rule #6
still holds, amber means "the spin is showing" and scenery does not get to
spend that. **No faces, characters or portraits in footage** (rule #3).

**Dropping it in.** Name the file after its footage key and put it in
`radiofree/img/<key>.jpg`, then add it to the `SHELL` list in `sw.js` and bump
the cache token. `js/photo.js` maps every footage key to a frame; add yours to
`FOR_KEY` there.

The ten keys, and what each wants:

| key | shot | frame |
|---|---|---|
| `cathedral` | Tuomiokirkko / Senate Square | ✅ shipped |
| `katu` | narrow street, tram head-on | ✅ shipped |
| `mannerheim` | wide boulevard, tram approaching | ✅ shipped |
| `esplanadi` | the park avenue | borrows `katu` |
| `kamppi` | plaza at night | borrows `katu` |
| `station` | Central Station clock tower | borrows `katu` |
| `harbour` | south harbour, cranes and ships | borrows `mannerheim` |
| `gulf` | the waterfront | borrows `mannerheim` |
| `suomenlinna` | the fortress islands, ferry | borrows `cathedral` |
| `katajanokka` | waterfront, Uspenski silhouette | borrows `cathedral` |

Seven still borrow. A borrowed frame never contradicts its dateline — the
mapping goes to the nearest shot, not to a default — but the seven are the
open work.

---

## Shot system (`codec.js`)

| Shot | Weight | What draws |
|------|--------|------------|
| face | 0.20 | Large masked Toko |
| graphic | 0.15 | Story chart (`story.visual`) |
| broll | 0.65 | Helsinki footage |

**B-roll rotation:** story’s own plate leads ~60% and opens every live post; never the same key twice in a row; else uniform over `BROLL_KEYS` minus last. Idle cards prefer `story.broll`.

Cut window: **3.2–5.5 s**. Canvas: **144×276**. Panel: **128×152**.

---

## B-roll panels (`visuals.js`)

`BROLL_KEYS` is the **source of truth** (keep exported):

esplanadi, kamppi, harbour, gulf, cathedral, katu, mannerheim, station, suomenlinna, katajanokka.

**Adding a panel:** pure location fn → `PANELS` + `BROLL_KEYS` → optional `story.broll` → `drawAllPlates` → **one** cache bump covering **every** import including leaves (`toko.js`, `visuals.js` → `palette`/`screen`).

`scr.bands(...)` must exist on `PixelScreen`.

---

## File map

| File | Owns |
|------|------|
| `js/main.js` | Feed, scroll, tune-in, lang, loop, `drawAllPlates`, `__rfh.debug` |
| `js/codec.js` | Post screen, cut sequencer, Reader |
| `js/toko.js` | Masked gel, booth, decode tear |
| `js/visuals.js` | Graphics + B-roll plates |
| `js/stories.js` | STORIES + COPY en/fi/ja + broll keys |
| `js/i18n.js` | Chrome strings fi/en/ja |
| `js/screen.js` | PixelScreen + bands + dither + line |
| `js/audio.js` | Synth + carrier + city bed |
| `js/palette.js` | Colours |
| `sw.js` | Offline precache |
| `index.html` | Shell + `?v=N` entry |
| `test/plates.cjs` | Headless `drawAllPlates` |

---

## Cache protocol (mandatory — Grok owns cadence)

**One commit. One token. Every file.**

1. `sw.js` → `VERSION = 'vN'` and `V = '?v=N'`.
2. `index.html` → `main.js?v=N`, `sw.js?v=N`, manifest.
3. **Every** `import '...?v='` in **every** module under `js/`, including leaves that only import `palette` / `screen` (`toko.js`, `visuals.js`, …).
4. Gate: `grep -o "?v=[0-9]*" index.html sw.js js/*.js | sort -u`  
   Must show **one** radiofree value (plus brand-kit `?v=2` only).

Partial bumps (main/codec at N while leaves still on N−1) build **two `PixelScreen` classes** from one file and can zero the precache hit rate. Offline may still “work” via `ignoreSearch` — that is the safety net, not a clean ship.

**Current token: v13.** Confirm in `sw.js` before assuming.

Leave `../toko/js/signature.js?v=2` alone.

---

## Debug surface (keep stable)

| Helper | Purpose |
|--------|----------|
| `__rfh.debug.shot()` | Live `{ type, key }` |
| `__rfh.debug.drawAllPlates()` | Every B-roll at d=0 and d=1 |
| `__rfh.debug.brollKeys()` | Plate list |
| `__rfh.debug.stories()` | Roster ids — **do not hardcode length** (now 14) |

---

## Traps already paid for

| Failure | Fix |
|---------|-----|
| `scr.bands is not a function` | Implement on `PixelScreen` first |
| New panels invisible | Align all `?v=N` in one commit |
| Leaf imports left on old token | Same — `toko.js` / `visuals.js` matter |
| FI/JA were `{...EN}` (silent) | Real per-language COPY; verify switch shows native script |
| Language blocks wiped | Restore from history |
| Narrow street labeled Mannerheimintie | `mannerheim` vs `katu` |
| B-roll with faces | Reject |
| `pickBroll` always `story.broll` | ~60% own + no consecutive repeat |
| Broken plate only sometimes | `drawAllPlates` |
| Re-import load-time modules | `__rfh.debug.*` |
| Hardcoded roster size | `stories().length` |
| `behavior: 'auto'` scroll | `'instant'` |
| `line()` / bayer / grain | endpoints rounded; cell index; random grain |

---

## Goals

**Done / keep stable**
- Weighted cuts + rotation reaching the pool
- Masked Toko + trilingual Reader (14 bulletins, real FI/JA)
- DECODE on all shots; 10 Helsinki B-roll; ambient; offline PWA
- `drawAllPlates` / `shot()`; v13 aligned including leaves

**Open / good next (if asked)**
- Dedicated `wafer` graphic for `ram-discipline` (still on `coin`)
- Confirm `katajanokka` on air under real viewing
- More pure Helsinki B-roll (geography + plates probe)
- Human eye on `ram-discipline` HSINCHU / “three major fabs” framing vs fiction footer

**Out of scope unless human asks**
- Real news / named defence actors; image assets; drop trilingual; port `wire.json` or poly plates

---

## Verify before claiming shipped

1. Private tab / hard refresh.
2. Tune in ≥12 s — B-roll cuts change.
3. DECODE — text + picture; cuts still change.
4. FI / EN / JA — **native** bulletin text, not English under FI/JA.
5. Console clean.
6. `__rfh.debug.drawAllPlates()` → ok.
7. Token grep = one radiofree value.
8. Optional: real offline reload.

---

## Tone for the human

Direct, no roleplay, practical. Prefer plan-then-code. Helsinki details matter. Prefer shipping visible cuts over speculative refactors.
