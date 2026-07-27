# Adding an experience

Everything the hub needs is three edits and one file. This page is the bar an
experience has to clear — most of it is enforced by the gate, and the gate is
not a nice place to find out.

Copy `js/experiences/_template.js`, rename it, and work through the list.

## The three edits

1. **The module** — `js/experiences/<id>.js`, exporting
   `{ id, kind, start(host, ctx) }`.
   - `kind` is `'story'`, `'game'` or `'wisdom'`. Aim the roster at
     **70 / 20 / 10** — check what it currently is before choosing, because the
     hub's draw weights by kind and a thin category means the same thing keeps
     being offered.
   - `ctx` is `{ t, audio, onComplete }`. `start` returns `{ destroy }`.
2. **The registry** — one entry in `REGISTRY` in `js/main.js`, plus the import.
3. **The strings** — `js/i18n.js`, in **all three** language blocks (en, fi, ja).
   Both `exp.<id>.name` and `exp.<id>.desc`, plus every key the module asks for.

## The bar

**Every string exists in all three languages.** `t()` returns the key when it
misses, and a raw key is still a non-empty string — so a missing translation
does not throw, it just quietly ships `lt.s1` where the story should be. That
happened. `check_levels.mjs` now fails on it and names the file and the missing
languages, but write the strings as you go rather than at the end.

**The first screen is already moving.** A still opening reads as a broken page
while someone is deciding whether to stay. The motion should belong to the
scene — mist crossing the trunks, steam off the tea, dust turning in the void —
not a generic wobble. If the scene uses `scr.cached()`, the moving part must be
drawn **after** the blit, outside the cached callback; wrapping a scene in
`cached()` without lifting its live layer out is exactly how this regresses.

**It ends by pointing outside.** The outro is two paragraphs: what happened,
then a `.nature-note` naming a real, small, doable thing. "Find two trees that
might be one." Not "reflect on nature."

**It is true.** These are real stories about a real world; a reader who looks it
up should find you were straight with them. Where the science is unsettled, say
so — `eel`'s whole ending is that nobody knows.

**It is playable with a thumb and readable by a screen reader.** Controls are
44 px, text meets WCAG AA, and the story lives in `.exp-text` (the canvas is
`aria-hidden` — the text is the channel that can actually be followed). The
shared chrome gives you all of this for free, so mostly: don't add your own
buttons outside `.exp-buttons`.

**It has a deterministic smoke block.** Drive it via `__gol.debug.start('<id>')`
in `test/smoke.cjs`: assert the intro text, advance through the beats, assert
the truth. Match the wording to the actual string — assert on a phrase you have
copied, not one you remember.

## The gate

From the repo root:

```
node gameoflife/test/check_levels.mjs
NODE_PATH=/opt/node22/lib/node_modules node gameoflife/test/smoke.cjs
```

`check_levels` is fast and static: aqueduct level solvability, and the i18n
completeness scan. `smoke.cjs` drives a real browser and additionally checks,
across **every registered experience**, that the first screen animates, that
every text colour clears WCAG AA and every control is 44 px. It iterates
`__gol.debug.ids()` — never add a hardcoded id list, because one silently
skipped two whole experiences and both were broken.

## Art

The house style is in `js/pixel.js` and `js/palette.js`; read
`ideas/2026-07-master-ideas.md` and the reference art in `ideas/ref/` before
inventing a look. Two rules worth knowing before you spend an afternoon:

- **Dithering is opt-in per scene.** It suits rich tonal surfaces (glaze, ice,
  deep water) and fights flat graphic scenes — `plate` was given the treatment
  and reverted because it muddied a clean vignette.
- **Sample `bayer()` at the cell index.** Drawing in 2px cells while calling
  `bayer(x, y)` reaches only 4 of its 16 thresholds, all low, and the stipple
  collapses into blobs or dashes. Use `bayer(x >> 1, y >> 1)` — or just dither
  per pixel inside a `cached()` layer, where it is free.

## Shipping

Develop on a `claude/*` branch → gate → merge to `main` → re-gate → copy
`gameoflife/` (minus `test/` and `ideas/`) onto `gh-pages`. Bump every `?v=N`
cache-buster together, one coherent version per ship.
