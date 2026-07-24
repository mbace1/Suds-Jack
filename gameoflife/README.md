# The Game of Life

Mini games and interactive stories that always revert to the notion of going
back to nature. Play a small thing on a screen; be handed something real.

> **Share it:** *Small pixel games and stories that always send you back
> outside. Two minutes each — a Roman aqueduct, an arctic tern, a zen teacup,
> a constellation — and after every second one, the game itself rests and
> invites you out to real water, real birds, or a poem in the evening.
> Free, no install, EN/FI/JA:* `https://mbace1.github.io/Suds-Jack/gameoflife/`

**The cycle is the design.** After every second finished experience the hub
rests and opens an *invitation* instead: find moving water, watch wind for a
minute, and in the evening (18:00–05:00 local) read a poem or look at a
painting rather than go out in the dark. Accepting the invitation resets the
cycle; declining leaves it standing for the next visit.

**The hub is zen.** It never shows a menu — it offers ONE experience at a
time, drawn from the registry by the content mix (**70% stories / 20% games /
10% kernels of wisdom**, preferring things not yet visited today), with a
quiet "something else, perhaps" link for a single redraw. A three-dot row
makes the cycle visible: two breaths of play, then the `~` rest. A living
pixel sky above the title follows the real hour — dawn, noon sun, dusk,
stars — so the app itself keeps the day-rhythm it points you toward.

**Content crosses cultures.** `js/poems.js` is a pool of public-domain poems
— Bashō, Issa, Shiki, Eino Leino, Wordsworth — each carried in all three
languages, so a Japanese haiku can arrive in Finnish and a Finnish nocturne
in Japanese. Evening invitations rotate through the pool regardless of
source culture.

**The invitations know the season.** `nature.js` reads the month
(meteorological seasons, northern hemisphere for now): winter days suggest
frost and bare-tree silhouettes, spring days buds and birdsong, summer days
barefoot grass and working shade, autumn days leaf-catching. Evening poems
prefer the current season's verses.

## Playing

No build step. Open `gameoflife/index.html` in a browser, or serve the repo
root with any static server. Live URL (once deployed to `gh-pages`):
`/Suds-Jack/gameoflife/`.

Languages: **suomi / English / 日本語** — auto-picked from the browser,
switchable in the hub, persisted in `localStorage`.

## Current experiences

| id | kind | name | shape |
|----|------|------|-------|
| `aqueduct` | game | The Stone River | Visual story of Roman aqueducts → rotate-the-stones channel puzzle (3 levels) → *go find real water flowing downhill* |
| `forest` | story | The Forest Path | Branching pixel walk → guided four-breath pause → *take the walk for real* |
| `tern` | story | The Longest Summer | An arctic tern's pole-to-pole migration, two choices, one astonishing true fact → *follow a real bird out of sight* |
| `cup` | wisdom | A Cup of Tea | Nan-in's overflowing cup — you do the pouring, the point makes itself → *empty a moment under the sky* |
| `hanami` | story | Under the Blossoms | Hanami from Emperor Saga's court to Edo's riverbanks; mono no aware is the learning → *find one thing on a tree that will be gone in two weeks* |
| `berry` | story | The Right to Roam | A Finnish blueberry summer teaching jokamiehenoikeus, rights and their quiet duties → *carry one thing out of your nearest everyone's-place* |
| `stars` | game | The Night Compass | Trace the Big Dipper (Otava / 北斗七星) star by star, then follow its pointers to Polaris → *go find one real star tonight* |
| `maple` | story | The Year of the Old Maple | One tree through four seasons — spring unpacks, autumn reveals, winter waits ready → *adopt a tree and visit it once per season* |
| `plate` | story | The Silver Plate | Paris 1838: run the exposure, watch the crowd erase itself, meet the first human ever photographed → *sit still two minutes in a busy place* |
| `seam` | story | The Golden Seam | Gather a shattered tea bowl from the void, then honor the break in glowing kintsugi gold → *trace a repaired object's history for a minute* |
| `dots` | story | The Four Dots | Padua 1610: pass the nights watching four specks beside Jupiter refuse to hold still, then meet the first moons of another world → *find the brightest non-Moon light tonight* |
| `glass` | game | The Glass Plate | Palo Alto 1878: release Muybridge's horse, the tripwires fire twelve cameras, one frame proves all four hooves airborne — then spin the stills into a zoetrope → *blink-freeze a running animal* |

## Visual standard (2026-07 master doc)

New experiences follow the owner's art direction (see
`ideas/2026-07-master-ideas.md` + reference art in `ideas/ref/`): 16-bit
scenes floating in a pure black void as **irregular jagged vignettes** (`plate`/`seam`/`dots`) or **cinematic
letterboxed widescreen** (`glass`), muted graphic-novel environment tones, and
luminescent **cyan/gold** for interactive elements that **break the frame**
into the void. `plate`/`seam`/`dots` are the pilots; existing experiences migrate
gradually. Shared `pixel.js` now gives every scene **crisp defined sections** (a 1px
darker seam between `bands()` colours) and optional **outline edges** on `disc`/`rect`
(a defined rim), plus a warm `EMBER` contrast accent and `EDGE` ink in the palette.
For reference-grade scenes it also provides **halftone dithering** (`bayer` +
`rampDither` for stippled tonal ramps) and `softDisc` (feathered vignette halos) —
`seam` is the first scene rebuilt to full reference fidelity (dithered Raku glaze,
gold veins, cyan overflow), matching `ideas/ref/kintsugi-overflow.png`.

New content should keep the registry near the 70/20/10 story/game/wisdom mix.

## Architecture (what a new experience needs)

```
gameoflife/
  index.html            shell + all CSS
  js/
    main.js             zen hub (one weighted offering), routing, rest-cycle, overlays
    i18n.js             every user-facing string, fi/en/ja (en is the fallback)
    poems.js            cross-cultural public-domain poem pool, all three languages
    palette.js          single source of truth for all colours
    pixel.js            PixelScreen: 192×128 canvas upscaled with hard pixels
    storage.js          localStorage state: completions, cycle counter, feedback
    nature.js           invitation picker (rotating, evening-aware)
    audio.js            gentle WebAudio kit (plink/step/chime/water/breath)
    experiences/
      aqueduct.js       each experience exports { id, start(host, ctx) }
      forest.js         ctx = { t, audio, onComplete }; start returns { destroy }
```

Adding an experience is three edits: a module in `js/experiences/` (exporting
`id` and a `kind` of `story`/`game`/`wisdom`), one entry in `REGISTRY` in
`main.js`, and its strings (all three languages) in `i18n.js`. Everything
else — the offering draw, completion tracking, feedback, the rest cycle —
comes for free.

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

## Contributing ideas (stories, games, graphics)

`ideas/TEMPLATE.md` holds fill-in templates for the four content types —
story, game/puzzle, wisdom kernel, and graphics/scene notes — matched to the
70/20/10 mix. Two ways to deliver an idea:

1. **Paste it into a Claude session** — a filled template, a fragment, or
   three loose sentences; any of the three languages.
2. **Commit a markdown file to `gameoflife/ideas/`** on any branch and
   mention it in a session.

Rules of thumb: every idea needs its *nature revert* (the real-world thing it
sends the player to do); wisdom sources and poems must be public domain;
graphics are described in words or mood references — everything is drawn in
code at 192×128 from `palette.js`, no image assets.

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
