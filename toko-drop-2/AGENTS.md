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


## Tests and scripts (in the repo from v156)

Until v156 the gates lived only in the 2.0 source bundle; they are in `test/` and `scripts/` now, at the game's tokens. Run everything from `toko-drop-2/`:

    bash scripts/smoke.sh                                   # the gate before every commit (bare node + the browser)
    node test/<name>.mjs                                    # one bare-node suite: sim, hero, species, campaign, bossphases, follow…
    NODE_PATH=$(npm root -g) node test/smoke.mjs --quick --gl   # the browser smoke alone; --gl in a sandbox with no GPU

- **`--gl`** runs every scenario on WebGL 2. Without a GPU, WebGPU fails and the browser smoke reports a black screen for every scenario. The browser smoke takes 20–40 minutes under SwiftShader; run it in the background.
- **Tokens:** a test imports `../js/x.js?v=N` at the game's own token. A test on an old token loads a second copy of the module, and two copies of a module do not share state: v156 found five suites failing for that reason alone. `scripts/bump-version.sh <N>` moves `test/` and `scripts/` with the game; `scripts/check-tokens.mjs` skips `itch/` (minified) and `tools/`.
- **The 1.x oracle:** `test/director.mjs` and `test/pickups.mjs` compare against 1.x's own source at `../toko-drop` (set `TOKO_1X` to use another tree). Without it they say "skipped" and still pass.
- **Boss phases:** `test/lib/boss.mjs` turns `BOSS_PHASES` off, because the species specs test the v153 single rage. `test/bossphases.mjs` tests the phases themselves.
- `scripts/pre-commit` is written for 2.0 as a repo of its own (it reads paths from the root and compares with `origin/main`). Do not install it in Suds-Jack; it belongs to the planned `mbace1/toko-drop` source repo.

## The itch.io upload

- **What to make:** ONE file, `tokodropv<N>.html`, where `<N>` is the version: `tokodropv155.html`, then `tokodropv156.html` and so on. Only the number changes. Owner, 18 Nov 2026: "Just .html for now". v155 went up this way and "It works well". Do not make a zip unless the owner asks.
- **What it is:** the whole game in one page. It contains `js/` bundled, three.js, and every `levels/*.json`, so itch needs no other file.
- **Building it:** run `tools/itch-html.cjs`. It needs esbuild, which is not vendored, so install it somewhere scratch:

      npm i --prefix /tmp/esb esbuild@0.24.2
      NODE_PATH=/tmp/esb/node_modules node toko-drop-2/tools/itch-html.cjs
      # → toko-drop-2/tokodropv<N>.html

  It rewrites two lines in the bundle only, never in the game's own files. main.js's level `fetch` reads the room from the page instead. record.js's version read from its `?v=` URL becomes the number itself. If either line changes shape, the tool stops and says so instead of building a broken file.
- **Where it lives:** move the file into `itch/` and commit it, replacing the previous version's `.html` (only the current one is kept). `itch/` is the kit: the `.html`, `cover.png` and `screenshots/`, with a README. It goes to `gh-pages`, then back to `main`, like any change here, so the producer (and anyone) finds it at `toko-drop-2/itch/` in the repo or at https://mbace1.github.io/Suds-Jack/toko-drop-2/itch/. The game never loads anything from `itch/`.
- **Screenshots:** `scripts/itch-shots.mjs <zip> <outdir>` renders them from an itch zip: the nine worlds mid-fight, the campaign grid and a boss room, 1920 × 1080. In a sandbox with no GPU pass `--gl`, or every picture comes out blank. Save them as JPEG (quality 88) in `itch/screenshots/`.
- **The GIF:** `scripts/itch-clips.mjs <outdir> --only nine-worlds --gif 16` films the nine worlds with the game's own bot and makes `nine-worlds.gif`. As with the screenshots, pass `--gl` in a sandbox with no GPU. World 7 films on seed 1017 (1007 lands on a CHALLENGE MISSED banner). Make the small copy with ffmpeg at 8 fps, 360 px and 96 colours. Both go in `itch/gif/` every release.
- **Before handing it over:** put the file alone in an empty folder, serve that folder and open the page. Check three things:
  - it makes no request besides the page itself
  - the HUD reads `2.0 · v<N>`
  - a campaign room starts: `__toko.room(Object.keys(__TOKO_LEVELS)[0])`
  
  In a sandbox with no GPU the screen stays black (WebGPU `createBuffer` errors). The file and the zip both do that there, so judge it by those three checks, not by the picture.
- **Upload settings** (owner, 18 Nov): HTML, "This file will be played in the browser", 960 × 540, Mobile friendly on, Fullscreen button on, free with donations ("$0 or donate"), release status In development. See DESIGN.md §5.
- **The zip, if it is ever asked for again:** name it `tokodropv<N>.zip`. Put `index.html` first, at the top level and not in a folder; itch refuses the zip otherwise. Add `js/`, `vendor/` and `levels/`:

      zip -q -X -D tokodropv$N.zip index.html && zip -q -r -X -D tokodropv$N.zip js vendor levels
