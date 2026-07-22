# The Game of Life

Mini games and interactive stories that always revert to the notion of going
back to nature. Play a small thing on a screen; be handed something real.

**The cycle is the design.** After every second finished experience the hub
rests and opens an *invitation* instead: find moving water, watch wind for a
minute, and in the evening (18:00–05:00 local) read a poem or look at a
painting rather than go out in the dark. Accepting the invitation resets the
cycle; declining leaves it standing for the next visit.

## Playing

No build step. Open `gameoflife/index.html` in a browser, or serve the repo
root with any static server. Live URL (once deployed to `gh-pages`):
`/Suds-Jack/gameoflife/`.

Languages: **suomi / English / 日本語** — auto-picked from the browser,
switchable in the hub, persisted in `localStorage`.

## Current experiences

| id | name | shape |
|----|------|-------|
| `aqueduct` | The Stone River | Visual story of Roman aqueducts → rotate-the-stones channel puzzle (3 levels) → *go find real water flowing downhill* |
| `forest` | The Forest Path | Branching pixel walk → guided four-breath pause → *take the walk for real* |

## Architecture (what a new experience needs)

```
gameoflife/
  index.html            shell + all CSS
  js/
    main.js             hub, routing, rest-cycle, feedback + interlude overlays
    i18n.js             every user-facing string, fi/en/ja (en is the fallback)
    palette.js          single source of truth for all colours
    pixel.js            PixelScreen: 192×128 canvas upscaled with hard pixels
    storage.js          localStorage state: completions, cycle counter, feedback
    nature.js           invitation picker (rotating, evening-aware)
    audio.js            gentle WebAudio kit (plink/step/chime/water/breath)
    experiences/
      aqueduct.js       each experience exports { id, start(host, ctx) }
      forest.js         ctx = { t, audio, onComplete }; start returns { destroy }
```

Adding an experience is three edits: a module in `js/experiences/`, one entry
in `REGISTRY` in `main.js`, and its strings (all three languages) in
`i18n.js`. Everything else — cards, completion tracking, feedback, the rest
cycle — comes for free.

## Testing loop

Two scripts live in `test/` and gate every greenlight:

```sh
node gameoflife/test/check_levels.mjs   # aqueduct levels stay solvable (no deps)
node gameoflife/test/smoke.cjs          # 18-check headless run-through (needs playwright + its Chromium)
```

The smoke test serves the repo root itself, drives the hub in all three
languages, plays into both experiences, forces the day and evening interludes,
and fails on any console error. If `playwright` is installed globally, point
`NODE_PATH` at the global `node_modules`.

Everything is also inspectable from the console via `window.__gol`
(same convention as `__dc` / `__hd` in the sibling projects):

```js
__gol.debug.start('aqueduct')   // jump straight into an experience
__gol.debug.showInterlude()     // preview the current nature invitation
__gol.debug.setLang('ja')       // flip language live
__gol.debug.feedback()          // dump collected feedback entries
__gol.store.getState()          // raw persisted state
```

Feedback is deliberately minimal: 1–5 leaves + optional free text, stored
locally under `golState.feedback`. Reviewing a playtest = ask the tester to
paste `__gol.debug.feedback()`.

## Content pipeline (beta → main → live)

1. New experiences and refinements are developed on `claude/*` beta branches.
2. Playtest via the testing loop above; iterate on the branch.
3. **Greenlight**: content that feels right is merged to `main`.
4. **Deploy**: the published site is served from the `gh-pages` branch (a
   separate curated site root) — copy `gameoflife/` onto `gh-pages` to go
   live at `/Suds-Jack/gameoflife/`, same as the sibling demos.

Module imports carry `?v=N` cache-busters; bump them together when shipping
to `gh-pages` so clients pick up coherent versions.

## Roadmap — an expanding experience

Ideas queue, roughly in order; each lands as its own small versioned addition:

- **More experiences**: seed-to-tree patience garden; star-map tracing that
  ends with "go find one real star"; a tide/moon rhythm toy; a mycelium maze.
- **Seasonal awareness**: invitations that know winter from summer (northern
  hemisphere first, then configurable).
- **A day-shape**: morning/evening hub moods beyond the current evening check.
- **Shared feedback**: opt-in export of feedback to an issue/form endpoint,
  replacing the copy-paste loop.
- **Sound garden**: let the ambient kit grow one instrument per accepted
  invitation.
