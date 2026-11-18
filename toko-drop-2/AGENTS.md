# Toko Drop 2.0 — agent pointers

## Producer design docs

Read `[`DESIGN.md`](DESIGN.md)` before design-affecting work. Also read [`docs/ACTIVEPRODUCER.md`](docs/ACTIVEPRODUCER.md).

Items are tagged **SHIPPED** / **LOCKED-NOT-BUILT** / **PROPOSAL**. Do not decide open design questions silently — list them in the PR description or ask the producer (D-sign) / Mikael. Do not implement LOCKED-NOT-BUILT systems without a producer brief.

Playable 2.0 tree (this branch). Do not merge Drop Zero into 2.0 without a joint Mikael + producer decision.

## Sakurai skill (adopted 15 Nov 2026)

Design and review Toko Drop 2.0 using the sakurai skill (`.claude/skills/sakurai` at the repo root): apply its principles, cite the chapter, and bring design questions back to D-sign/Mikael instead of deciding quietly. The Drop-specific mapping (all **PROPOSAL** until Mikael picks) is in [`DESIGN.md`](DESIGN.md) §6. The skill is an unofficial AI summary of Sakurai's videos, not his words (see `.claude/skills/sakurai/NOTICE.md`).

## Testers: unlock and room jump (v154)

- `?unlock=all` opens every campaign room (HARD PAIN's too) and lets START AT pick any of the 9 arcade worlds.
- `?room=N` goes straight into campaign room N. N is its number on the grid (1–36) or its id, e.g. `?room=12` or `?room=undertow`. It also implies `?unlock=all`.
- Both make the page a **sandbox**. Saved progress is read but never written: grades, bests, the furthest world, the kept run, the play record and settings changes all live in memory until the page closes. The language picker is the one exception, because it writes to localStorage directly. The title shows `TEST UNLOCK · NOT SAVED`.
- `?world=N` (existing) still starts an arcade run in world N.
- `?bossphases=off` gives the v153 bosses (one rage at half health, old health) for an A/B. `?bossphases=all` also puts the three-phase bosses in the campaign boss rooms.
- Console helpers: `__toko.unlock`, `__toko.sandbox` (what the sandbox kept), `__toko.room(id)`, `__toko.bossWave()`.


## The itch.io upload

- **What to make:** ONE file, `tokodropv<N>.html`, where `<N>` is the version: `tokodropv155.html`, then `tokodropv156.html` and so on. Only the number changes. Owner, 18 Nov 2026: "Just .html for now". v155 went up this way and "It works well". Do not make a zip unless the owner asks.
- **What it is:** the whole game in one page. It contains `js/` bundled, three.js, and every `levels/*.json`, so itch needs no other file.
- **Building it:** run `tools/itch-html.cjs`. It needs esbuild, which is not vendored, so install it somewhere scratch:

      npm i --prefix /tmp/esb esbuild@0.24.2
      NODE_PATH=/tmp/esb/node_modules node toko-drop-2/tools/itch-html.cjs
      # → toko-drop-2/tokodropv<N>.html   (do not commit it)

  It rewrites two lines in the bundle only, never in the game's own files. main.js's level `fetch` reads the room from the page instead. record.js's version read from its `?v=` URL becomes the number itself. If either line changes shape, the tool stops and says so instead of building a broken file.
- **Before handing it over:** put the file alone in an empty folder, serve that folder and open the page. Check three things:
  - it makes no request besides the page itself
  - the HUD reads `2.0 · v<N>`
  - a campaign room starts: `__toko.room(Object.keys(__TOKO_LEVELS)[0])`
  
  In a sandbox with no GPU the screen stays black (WebGPU `createBuffer` errors). The file and the zip both do that there, so judge it by those three checks, not by the picture.
- **Upload settings** (owner, 18 Nov): HTML, "This file will be played in the browser", 960 × 540, Mobile friendly on, Fullscreen button on, free with donations ("$0 or donate"), release status In development. See DESIGN.md §5.
- **The zip, if it is ever asked for again:** name it `tokodropv<N>.zip`. Put `index.html` first, at the top level and not in a folder; itch refuses the zip otherwise. Add `js/`, `vendor/` and `levels/`:

      zip -q -X -D tokodropv$N.zip index.html && zip -q -r -X -D tokodropv$N.zip js vendor levels
