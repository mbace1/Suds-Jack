# Radio Free Helsinki — agent handoff

Read this **before** changing anything under `radiofree/`.
Human-facing overview: `README.md`. Parallel-branch notes: [`AGENTS-INBOX.md`](AGENTS-INBOX.md).

**Live URL:** https://mbace1.github.io/Suds-Jack/radiofree/  
**Branch to edit for live:** `gh-pages` (not `main`).

---

## Coordination (read first)

A second agent has been building in parallel on `claude/radio-free-helsinki-pvtsw5`.

| | `gh-pages` (live, authoritative) | `claude/radio-free-helsinki-pvtsw5` |
|---|---|---|
| Toko | **masked** male gel, `full` face-shot mode | unmasked — **violates hard rule #2** |
| Cuts | weighted-random face/graphic/broll, 3.2–5.5 s | fixed cycle |
| DECODE | mutates whichever shot is up (**rule #5**) | holds graphic, stops cutting — **violates #5** |
| B-roll | `visuals.js`, 10 plates | `broll.js`, separate set |
| Bulletins | `stories.js` (trilingual COPY) | `wire.json` (fetched) |

**Where the branches disagree, this file wins.** Mask-on and DECODE-keeps-cutting are not negotiable.

**Do not both edit `gh-pages` blind.** If you are working live, say so in the commit message (e.g. `agent: grok live on visuals`). Split surface if needed — one on art, one on plumbing.

**Do not port `wire.json` without explicit human approval.** Rule #9 guards the language blocks; moving them is a human decision even when machine-validated.

---

## Intent

A **fictional pirate news broadcast** in a vertical phone feed. Toko (masked male Japanese gel from Toko Drop) reads the wire. Subject is **propaganda technique**, not real accusations. Every bulletin is invented; DECODE shows the spin.

Feel: half Metal Gear codec, half TikTok feed, phosphor green, offline-first, **no image assets**.

---

## Hard rules (do not violate)

1. **Trilingual always** — fi / en / ja for every bulletin field and UI string. No English-only patches.
2. **Toko is always masked** — surgical/tech mask over nose and mouth. Male Japanese gel. Never remove the mask.
3. **Face shots vs B-roll** — faces only on face shots (expanded masked Toko). **B-roll panels must never contain faces, portraits, or character heads.** Pure Helsinki locations only.
4. **No image assets** — every pixel is drawn in code (`PixelScreen`). No PNGs for panels.
5. **DECODE works on every shot type** — face, graphic, and broll. Text mutates; panels recolor toward amber; Toko tears. Cuts **continue** under DECODE; do not freeze on the graphic.
6. **Amber means spin only** — never use amber as decorative UI before DECODE.
7. **Offline PWA** — bump cache version when shipping JS changes (see Cache).
8. **Fiction footer stays honest** — defence-band actors stay unnamed ("the alliance", "a neighbouring state").
9. **Do not wipe `stories.js` language blocks** — EN / FI / JA COPY must stay complete. Partial rewrites have already wiped languages once; restore from git history if that happens.
10. **Helsinki accuracy matters** — Mannerheimintie is a **wide** boulevard (`mannerheim`); narrow tram street is `katu`. Station = Central Station clock tower. Cathedral = Tuomiokirkko / Senate Square.

---

## Shot system (`codec.js`)

While a post is **live**, a weighted-random cut sequencer runs:

| Shot | Weight | What draws |
|------|--------|------------|
| face | 0.30 | Large masked Toko (`toko.draw(..., full=true)`) |
| graphic | 0.20 | Story chart (`story.visual`) |
| broll | 0.50 | Helsinki footage (`story.broll` preferred ~85%, else random from `BROLL_KEYS`) |

Cut window: **3.2–5.5 s**. Idle/static posts always show the graphic.

Canvas: **144×276** (portrait). Panel buffer: **128×152**.

---

## B-roll panels (`visuals.js`)

Registered in `PANELS` and listed in `BROLL_KEYS`:

| Key | Location |
|-----|----------|
| esplanadi | Esplanadi + drones |
| kamppi | Kamppi plaza night |
| harbour | South harbour / ships |
| gulf | Gulf waterfront |
| cathedral | Tuomiokirkko / Senate Square |
| katu | Narrow street tram |
| mannerheim | Wide Mannerheimintie tram (approaching) |
| station | Central Station clock tower |
| suomenlinna | Fortress islands + ferry |
| katajanokka | Waterfront + Uspenski silhouette |

**Adding a panel**
1. Pure location function `(scr, t, d) => { ... }` — **no faces**.
2. Only existing `PixelScreen` methods: `px`, `rect`, `disc`, `ellipse`, `line`, `bands`, `scanlines`, `clear`.
3. Register in `PANELS` and `BROLL_KEYS`.
4. Optionally set `story.broll = 'yourKey'` in `stories.js`.
5. Run `drawAllPlates` (below) before claiming shipped.
6. Bump cache version (all tokens).

`scr.bands(x, y, w, h, [colorTop, colorBottom])` is required for sky/ground gradients. **It must exist on `PixelScreen`** (`screen.js`). Missing `bands` silently kills those shots.

---

## File map

| File | Owns |
|------|------|
| `js/main.js` | Feed, scroll, tune-in, language switch, loop, `drawAllPlates` |
| `js/codec.js` | Post screen, cut sequencer, Reader (typing + lip-sync amp) |
| `js/toko.js` | Masked gel anchor, booth, decode tear |
| `js/visuals.js` | All graphics + B-roll panels |
| `js/stories.js` | STORIES + COPY en/fi/ja + broll keys |
| `js/i18n.js` | Chrome strings fi/en/ja |
| `js/screen.js` | PixelScreen + `bands` + dither + line |
| `js/audio.js` | Synth codec + carrier hiss + city bed |
| `js/palette.js` | Colours |
| `sw.js` | Offline precache (`VERSION` / `V`) |
| `index.html` | Shell CSS + `?v=N` entry |
| `test/plates.cjs` | Headless runner for `drawAllPlates` |

---

## Cache protocol (mandatory on every ship)

1. Bump `sw.js` → `VERSION = 'vN'` and `V = '?v=N'`.
2. Bump `index.html` → `main.js?v=N`, `sw.js?v=N`, manifest token.
3. Bump **every** `import '...?v='` in modules that import each other to the **same** N.
4. Without this, users (and other AIs testing the live URL) only see old art.

Import tokens drifting apart is not cosmetic: one file can be fetched under multiple tokens and the page builds multiple incompatible class copies. Align everything.

Confirm current token in `sw.js` before assuming (was **v11** when this section was last edited).

Offline note: the worker’s last-resort `caches.match(req, { ignoreSearch: true })` covers stale tokens. Offline reload works; do not treat “offline broken” as a live bug without re-testing against the deployed tree.

---

## Traps already paid for

| Failure | Fix / rule |
|---------|------------|
| `scr.bands is not a function` | Implement `PixelScreen.bands` in `screen.js` before shipping any B-roll that calls it |
| New panels invisible on live | Cache still on old `?v=` — bump **everything** to one N |
| Language blocks empty after partial `stories.js` edit | Restore full EN/FI/JA from previous commit |
| Tram drawn narrow, labeled Mannerheimintie | `mannerheim` = wide boulevard; `katu` = narrow street |
| B-roll with faces | Reject / redraw without characters |
| Broken plate only fails sometimes | A plate draws only when a post reaches that beat — **draw every `BROLL_KEYS` entry on purpose** at `d=0` and `d=1` (`drawAllPlates`) |
| Re-import of modules with load-time state | Second `import('./js/stories.js')` gets empty bindings. Inspect via `window.__rfh.debug.*`, never re-import |
| Hardcoded roster size in tests/strings | Read `__rfh.debug.stories().length`; derive `NN/NN` tags from it |
| `scrollTo` / `scrollIntoView` with `behavior: 'auto'` | Feed uses smooth CSS; `'auto'` still animates. Use `'instant'` for a true jump |
| `PixelScreen.line()` long rays | Round endpoints **before** computing slope (already fixed in `screen.js`) |
| Dither in 2 px cells looks like blobs | Sample `bayer(x >> 1, y >> 1)` — the **cell** index |
| Video grain frozen / perforated | Do **not** drive grain from `bayer()`; use `Math.random()` positions |
| 3D plates (if ever ported from branch) | Polygons behind near plane drop whole; stacked ground planes with same avg depth sort randomly — butt strips in x |

---

## Goals

**Done / keep stable**
- Weighted face / graphic / broll cuts
- Masked Toko + trilingual Reader
- DECODE on all shot types (cuts continue)
- Core + expanded Helsinki B-roll with motion
- City ambient under carrier
- Offline PWA
- Forced plate probe (`drawAllPlates`)

**Good next work (if asked)**
- More pure Helsinki B-roll (still no faces): night harbour, Design District alley, Olympic Stadium silhouette — verify geography + run plates probe
- Stronger per-story `broll` wiring in `stories.js`
- Motion polish only if a panel still feels static
- Never prioritize more face variety over mask-on / pure B-roll rules

**Out of scope unless human asks**
- Real news / real named actors on defence band
- Image assets or video files
- Landscape / non-portrait panel redesign
- Removing trilingual support
- Porting `wire.json` without explicit approval

**Portable ideas from the parallel branch (human gate)**
- `test/smoke.cjs` headless checks
- Extra bulletins + `STORIES.md` content bar (Onion register, one technique per bulletin)
- `wire.json` + validator — **only with human ok**

---

## Verify before claiming "shipped"

1. Private tab or hard refresh on the live URL.
2. Tune in, stay on one post ≥12 s — confirm B-roll cuts appear (cathedral / tram / station / etc.).
3. Toggle DECODE — text and picture both shift; Toko tears; **cuts still change**.
4. Switch FI / EN / JA — bulletin text changes; no missing keys.
5. Console clean: no `bands` / missing export errors.
6. **Draw every plate on purpose** (both decode states):
   ```js
   // after Tune In
   __rfh.debug.drawAllPlates()
   // → { ok: true, count: 10, ... }
   ```
   or `node radiofree/test/plates.cjs`
7. **Offline for real**: register the worker, cut the network, reload, tune in, read a bulletin. Manual refresh alone does not exercise this.

Console helpers: `window.__rfh.debug.open(id)`, `.toggleDecode()`, `.setLang('ja')`, `.stories()`, `.drawAllPlates()`, `.brollKeys()`.

---

## Tone for the human

Direct, no roleplay, practical. Prefer plan-then-code. Helsinki details matter. Prefer shipping visible cuts over speculative refactors.
