# Radio Free Helsinki — agent handoff

Read this before changing anything under `radiofree/`.
Human-facing overview lives in `README.md`. This file is for agents.

Live URL: https://mbace1.github.io/Suds-Jack/radiofree/  
Branch to edit for live: **`gh-pages`** (not `main`).

---

## Intent

A **fictional pirate news broadcast** in a vertical phone feed. Toko (masked male Japanese gel from Toko Drop) reads the wire. The subject is **propaganda technique**, not real accusations. Every bulletin is invented; DECODE shows the spin.

Feel: half Metal Gear codec, half TikTok feed, phosphor green, offline-first, no assets.

---

## Hard rules (do not violate)

1. **Trilingual always** — fi / en / ja for every bulletin field and UI string. No English-only patches.
2. **Toko is always masked** — surgical/tech mask over nose and mouth. Male Japanese gel. Never remove the mask.
3. **Face shots vs B-roll** — faces only on face shots (expanded masked Toko). **B-roll panels must never contain faces, portraits, or character heads.** Pure Helsinki locations only.
4. **No image assets** — every pixel is drawn in code (`PixelScreen`). No PNGs for panels.
5. **DECODE works on every shot type** — face, graphic, and broll. Text mutates; panels recolor toward amber; Toko tears.
6. **Amber means spin only** — never use amber as decorative UI before DECODE.
7. **Offline PWA** — bump cache version when shipping JS changes (see Cache below).
8. **Fiction footer stays honest** — defence band actors stay unnamed ("the alliance", "a neighbouring state").
9. **Do not wipe `stories.js` language blocks** — EN / FI / JA COPY must stay complete. Partial rewrites have already wiped languages once; restore from git history if that happens.
10. **Helsinki accuracy matters** — Mannerheimintie is a wide boulevard; do not draw it as a narrow side street. Station should read as Central Station (clock tower). Cathedral = Tuomiokirkko / Senate Square.

---

## Shot system (codec.js)

While a post is **live**, a weighted-random cut sequencer runs:

| Shot | Weight | What draws |
|------|--------|------------|
| face | 0.30 | Large masked Toko in upper panel (`toko.draw(..., full=true)`) |
| graphic | 0.20 | Story's chart/diagram (`story.visual`) |
| broll | 0.50 | Helsinki footage (`story.broll` preferred ~85%, else random from `BROLL_KEYS`) |

Cut window: **3.2–5.5 s**. Idle/static posts always show the graphic, not random B-roll.

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

**Adding a panel:**
1. Write a pure location function `(scr, t, d) => { ... }` — no faces.
2. Use only `PixelScreen` methods that exist: `px`, `rect`, `disc`, `ellipse`, `line`, `bands`, `scanlines`, `clear`.
3. Register in `PANELS` and `BROLL_KEYS`.
4. Optionally set `story.broll = 'yourKey'` in `stories.js`.
5. Bump cache version.

`scr.bands(x, y, w, h, [colorTop, colorBottom])` is required for sky/ground gradients. **It must exist on `PixelScreen`** (`screen.js`). Missing `bands` silently kills those shots.

---

## File map

| File | Owns |
|------|------|
| `js/main.js` | Feed, scroll, tune-in, language switch, loop |
| `js/codec.js` | Post screen, cut sequencer, Reader (typing + lip-sync amp) |
| `js/toko.js` | Masked gel anchor, booth, decode tear |
| `js/visuals.js` | All graphics + B-roll panels |
| `js/stories.js` | STORIES + COPY en/fi/ja + broll keys |
| `js/i18n.js` | Chrome strings fi/en/ja |
| `js/screen.js` | PixelScreen + `bands` + dither |
| `js/audio.js` | Synth codec + carrier hiss + city bed |
| `js/palette.js` | Colours |
| `sw.js` | Offline precache (`VERSION` / `V`) |
| `index.html` | Shell CSS + `?v=N` entry |

---

## Cache protocol (mandatory on every ship)

1. Bump `sw.js` → `VERSION = 'vN'` and `V = '?v=N'`.
2. Bump `index.html` → `main.js?v=N`, `sw.js?v=N`, manifest token.
3. Bump **every** `import '...?v='` in modules that import each other to the same N.
4. Without this, users (and other AIs testing the live URL) only see old art.

Current expected token at time of writing this doc: **v8** (confirm in `sw.js` before assuming).

---

## Goals (current direction)

**Done / keep stable**
- Weighted face / graphic / broll cuts
- Masked Toko + trilingual Reader
- DECODE on all shot types
- Core + expanded Helsinki B-roll with motion
- City ambient under carrier
- Offline PWA

**Good next work (if asked)**
- More pure Helsinki B-roll (still no faces): e.g. night harbour, Design District alley, Olympic Stadium silhouette — always verify geography
- Stronger per-story `broll` wiring in `stories.js`
- Motion polish only if a panel still feels static
- Never prioritize more face variety over mask-on / pure B-roll rules

**Out of scope unless human asks**
- Real news / real named actors on defence band
- Image assets or video files
- Landscape/non-portrait panel redesign
- Removing trilingual support

---

## Pitfalls already hit

| Failure | Fix |
|---------|-----|
| `scr.bands is not a function` | Implement `PixelScreen.bands` in `screen.js` |
| New panels invisible on live site | Cache still on old `?v=` — bump everything |
| Language blocks empty after partial `stories.js` edit | Restore full EN/FI/JA from previous commit |
| Tram drawn on a narrow street labeled Mannerheimintie | Use `mannerheim` for the wide boulevard; `katu` for narrow |
| B-roll with faces | Reject / redraw without characters |
| Import tokens disagree across modules | Align all `?v=N` to one version |

---

## Verify before claiming "shipped"

1. Private tab or hard refresh on the live URL.
2. Tune in, stay on one post ≥12 seconds — confirm B-roll cuts appear (cathedral / tram / station / etc.).
3. Toggle DECODE — text and picture both shift; Toko tears.
4. Switch FI / EN / JA — bulletin text changes; no missing keys.
5. Console clean: no `bands` / missing export errors.

Console helpers: `window.__rfh.debug.open(id)`, `.toggleDecode()`, `.setLang('ja')`, `.stories()`.

---

## Tone for the human

Direct, no roleplay, practical. Prefer plan-then-code. Helsinki details matter. Prefer shipping visible cuts over speculative refactors.
