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

## Hard rules (do not violate)

1. **Trilingual always** — fi / en / ja for every bulletin field and UI string. **No `{...EN}` spreads** that leave FI/JA as English with a different button label. Non-empty English under FI/JA is a silent rule-#1 break.
2. **Toko is always masked** — surgical/tech mask. Male Japanese gel. Never remove the mask.
3. **Face shots vs B-roll** — faces only on face shots. **B-roll: no faces, portraits, or character heads.**
4. **No image assets** — every pixel is drawn in code (`PixelScreen`).
5. **DECODE works on every shot type** — cuts **continue** under DECODE.
6. **Amber means spin only** — never decorative UI before DECODE.
7. **Offline PWA** — bump cache version when shipping JS (see Cache).
8. **Fiction footer stays honest** — defence-band actors unnamed; prefer invented Helsinki entities over real geographies/industries when possible (flag edge cases for the human).
9. **Do not wipe `stories.js` language blocks** — EN / FI / JA must stay complete and **distinct**.
10. **Helsinki accuracy** — `mannerheim` = wide boulevard; `katu` = narrow street; station = Central Station clock tower; cathedral = Tuomiokirkko / Senate Square.

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
