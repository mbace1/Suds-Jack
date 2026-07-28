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
| **Cache `?v=N` cadence** | **Grok on `gh-pages`** — bump worker + all module imports in the same commit |
| Plumbing verify, inbox notes, branch experiments | Claude on `claude/radio-free-helsinki-pvtsw5` (standing down on art and tokens) |

Claude’s poly/3D plates stay on the branch only — **not for merge** unless the human asks for a fresh 3D decision.

**Do not both edit `gh-pages` blind.** Announce in the commit message if live (e.g. `agent: grok live on visuals`).

**Do not port `wire.json` without explicit human approval.**

---

## Coordination

| | `gh-pages` (live, authoritative) | `claude/radio-free-helsinki-pvtsw5` |
|---|---|---|
| Toko | **masked** male gel, `full` face-shot mode | unmasked — **violates hard rule #2** |
| Cuts | weighted-random face/graphic/broll | fixed cycle |
| DECODE | mutates whichever shot is up (**rule #5**); cuts continue | holds graphic — **violates #5** |
| B-roll | `visuals.js`, 10 plates — **only ones that ship** | branch-only art, not canonical |
| Bulletins | `stories.js` (trilingual COPY) | `wire.json` (human gate) |

**Where the branches disagree, this file wins.**

---

## Intent

A **fictional pirate news broadcast** in a vertical phone feed. Toko (masked male Japanese gel from Toko Drop) reads the wire. Subject is **propaganda technique**, not real accusations. Every bulletin is invented; DECODE shows the spin.

Feel: half Metal Gear codec, half TikTok feed, phosphor green, offline-first, **no image assets**.

---

## Hard rules (do not violate)

1. **Trilingual always** — fi / en / ja for every bulletin field and UI string.
2. **Toko is always masked** — surgical/tech mask. Male Japanese gel. Never remove the mask.
3. **Face shots vs B-roll** — faces only on face shots. **B-roll: no faces, portraits, or character heads.** Pure Helsinki locations only.
4. **No image assets** — every pixel is drawn in code (`PixelScreen`).
5. **DECODE works on every shot type** — face, graphic, and broll. Cuts **continue** under DECODE.
6. **Amber means spin only** — never decorative UI before DECODE.
7. **Offline PWA** — bump cache version when shipping JS (see Cache).
8. **Fiction footer stays honest** — defence-band actors unnamed.
9. **Do not wipe `stories.js` language blocks** — EN / FI / JA must stay complete.
10. **Helsinki accuracy** — `mannerheim` = wide boulevard; `katu` = narrow street; station = Central Station clock tower; cathedral = Tuomiokirkko / Senate Square.

---

## Shot system (`codec.js`)

Live weighted-random cut sequencer:

| Shot | Weight | What draws |
|------|--------|------------|
| face | 0.20 | Large masked Toko (`toko.draw(..., full=true)`) |
| graphic | 0.15 | Story chart (`story.visual`) |
| broll | 0.65 | Helsinki footage |

**B-roll rotation (`pickBroll`):**
- Story’s own `story.broll` leads at **~60%** and opens every live post (guaranteed first look).
- Never the same broll key twice in a row.
- Otherwise uniform over `BROLL_KEYS` minus last key.
- Idle/static cards prefer `story.broll` so the feed shows Helsinki art while scrolling.

Cut window: **3.2–5.5 s**. Canvas: **144×276**. Panel: **128×152**.

---

## B-roll panels (`visuals.js`)

`BROLL_KEYS` is the **source of truth** for what exists (keep it exported — other tools/validators read it):

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

**Adding a panel:** pure location fn → register in `PANELS` + `BROLL_KEYS` → optional `story.broll` → `drawAllPlates` → bump cache (one commit, all tokens).

`scr.bands(...)` must exist on `PixelScreen` (`screen.js`).

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

## Cache protocol (mandatory — Grok owns this)

1. Bump `sw.js` → `VERSION = 'vN'` and `V = '?v=N'`.
2. Bump `index.html` → `main.js?v=N`, `sw.js?v=N`, manifest.
3. Bump **every** `import '...?v='` to the **same** N in one commit.
4. Check: `grep -o "?v=[0-9]*" index.html sw.js js/*.js | sort -u` → one value.

Current token: **v12** (confirm in `sw.js` before assuming).

Leave `../toko/js/signature.js?v=2` alone (brand kit).

Offline: worker `ignoreSearch` covers stale tokens; offline reload works.

---

## Debug surface (keep stable for the other agent)

| Helper | Purpose |
|--------|----------|
| `__rfh.debug.shot()` | Live shot `{ type, key }` — required to measure rotation |
| `__rfh.debug.drawAllPlates()` | Every `BROLL_KEYS` at d=0 and d=1 |
| `__rfh.debug.brollKeys()` | Export of plate list |
| `__rfh.debug.stories()` | Roster ids (do not hardcode length) |

If the sequencer is refactored, keep something that reports live shot type + key.

---

## Traps already paid for

| Failure | Fix |
|---------|-----|
| `scr.bands is not a function` | Implement on `PixelScreen` before shipping plates that call it |
| New panels invisible | Align all `?v=N` in one commit |
| Language blocks wiped | Restore full EN/FI/JA from history |
| Narrow street labeled Mannerheimintie | `mannerheim` vs `katu` |
| B-roll with faces | Reject |
| `pickBroll` always returned `story.broll` | Unreachable plates + frozen-looking cuts — use lead ~60% + no consecutive repeat |
| Broken plate only fails sometimes | `drawAllPlates` |
| Re-import load-time modules | Use `__rfh.debug.*` |
| Hardcoded roster size | `stories().length` |
| `behavior: 'auto'` scroll | Use `'instant'` |
| `line()` long rays | Round endpoints before slope |
| Bayer cell / grain | `bayer(x>>1,y>>1)` for 2px cells; grain from `Math.random()` |

---

## Goals

**Done / keep stable**
- Weighted cuts + rotation that reaches every plate
- Masked Toko + trilingual Reader
- DECODE on all shots (cuts continue)
- 10 Helsinki B-roll plates with motion
- City ambient, offline PWA, `drawAllPlates` / `shot()`

**Good next (if asked)**
- More pure Helsinki B-roll (verify geography + plates probe)
- Stronger per-story `broll` wiring
- Motion polish if a panel feels static

**Out of scope unless human asks**
- Real news / named defence actors
- Image/video assets, landscape redesign, drop trilingual
- Port `wire.json` or Claude poly plates

---

## Verify before claiming shipped

1. Private tab / hard refresh on live URL.
2. Tune in ≥12 s — B-roll cuts change; not the same still.
3. DECODE — text + picture shift; Toko tears; **cuts still change**.
4. FI / EN / JA — no missing keys.
5. Console clean.
6. `__rfh.debug.drawAllPlates()` → `{ ok: true, count: 10, ... }`.
7. Optional: real offline (register worker, cut network, reload, read).

Also useful: sample `__rfh.debug.shot()` across posts; confirm low-frequency plates (e.g. `katajanokka`) can appear.

---

## Tone for the human

Direct, no roleplay, practical. Prefer plan-then-code. Helsinki details matter. Prefer shipping visible cuts over speculative refactors.
