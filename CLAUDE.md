# Suds-Jack — repo guide

> **You are on `gh-pages`. This branch is a DEPLOY TARGET, not a workspace.**
> `main` is the authoring branch and its `CLAUDE.md` is the full one (~1,200
> lines, one section per project). This file is a short, older copy. If you
> are about to author anything here, check `origin/main` first.

## Eeri (`eeri/`) — MULTI-AGENT. Read the docs before you touch a file.

A Mario 3 / Yoshi-shaped platformer for a six-year-old, on a worksite of
Tonka × Cat machines. More than one agent works it at once, so **the docs
are the coordination** and skipping them is how work gets deleted.

**Reading order:**

1. **`eeri/PHASING.md`** — newest owner direction (2026-08-14) and it
   **supersedes the other docs where they disagree**. Holds the three things
   canon does not: the **80/20 reference ratio** (Yoshi's Crafted World 80,
   Tropical Freeze 20 — the *default* answer to any look question is Crafted
   World; if a level reads as "dramatic layered 2.5D with some toys in it",
   the ratio is inverted), the **tool-reality table** (routing rule: *legs →
   Meshy rig · wheels/tracks → sliced nodes · deformation → code*), and the
   **phase gates** — no agent starts Phase N+1 while a Phase N item in its
   own lane is open.
2. `eeri/DESIGN.md` (on `main`) — what the game does; §6 is the art queue.
3. `eeri/ART_BRIEF.md` — the look. `eeri/ASSET_PLAN.md` — the queue + costs.
4. `eeri/assets/README.md` + `assets/manifest.json` — the seam.
5. `eeri/VERSIONS.md` — what shipped, and the traps.
6. `/ART_PIPELINE.md` — the method. Every stage ends in a picture.

**LANES — who owns which files.** Two agents editing one module is how two
lineages start. Stay in your lane; if you must cross it, say so in the
commit message.

| lane | owns |
|---|---|
| **Art** | `assets/**`, `art-src/**`, `js/craft.js`, layer paintings, `PAL` colour values, `ASSET_PLAN.md` |
| **Design/Level** | `js/rooms.js`, `js/parts.js`, `js/level.js`, `js/kid.js`, `js/input.js`, `js/robots.js`, `js/flag.js`, `test/**`, `DESIGN.md` |
| **Shared — coordinate first** | `js/main.js`, `js/assets.js`, `js/palette.js`, `js/layers.js`, `assets/manifest.json`, `index.html` |

**THE BRANCH RULE, and it has already cost this project THREE times.**
Authoring Eeri anywhere but `main` starts a lineage with **no common
ancestor** — `git merge-base` returns *nothing* — and then neither tree
can be merged into the other without hand work. It has happened between
two `claude/*` branches, between `main` and `gh-pages`, and again with
`claude/eeri-platformer-levels-dtfh0x`. Each time the lineages
independently reached the same version numbers, so nothing looked wrong:
there were two different v11s and then two different v13s.

**All three are now joined into `main` (v12 and v14). `main` is the one
tree and it is ahead of every other branch. Start from it.**

- **Author on `main`.** Deploy to `gh-pages` as a copy limited to `eeri/`
  plus `hub/games.js` and `hub/versions.json`. **Deploys never merge.**
  And edit `hub/games.js` **in place, only the eeri entry** — this
  branch's catalogue carries cabinets `main` does not, and copying it
  wholesale deletes one.
- **Before any Eeri work: `git fetch origin` and check `git merge-base`
  against `origin/main`.** Nothing back means you are on a fourth lineage
  — stop and reconcile before writing anything.
- **A version number cannot detect a fork.** Never reuse one: read the
  other lineage's `VERSIONS.md` before writing a new heading. v13 is
  skipped on purpose because two different trees had already used it.
- **`--allow-unrelated-histories` is not the tool.** It was tried: the
  Eeri branches descend from `gh-pages`, so merging one drags the whole
  deployed site — toko-drop, toko, voxel — into `main`. Scope the join to
  `eeri/js`, `eeri/test`, `index.html` and the manifest.
- **Merge by KIND, against the content ancestor.** There is no git
  ancestor, but each lineage's `VERSIONS.md` names where it forked, and
  that commit's tree usually *is* a real ancestor in content — verify with
  a byte comparison on a file neither side touched, then let a genuine
  three-way `git merge-file` do the work. Both joins were done that way
  and most conflicts were a single import line.

**Four gates, all green before a deploy** (they live on `main`):

```
node eeri/test/rooms.mjs                                 # the room prover
NODE_PATH=$(npm root -g) node eeri/test/smoke.cjs        # the game
NODE_PATH=$(npm root -g) node eeri/test/playthrough.cjs  # a bot finishes every level
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs         # the cabinet
```

`rooms.mjs` proves a room's *geometry*; `playthrough.cjs` proves it is
*playable* — it exists because the prover passed a level nobody could finish.

**Traps worth knowing before you spend a day on one:** one `?v=` token per
module, or the browser instantiates it twice, the module's state splits, and
the art silently never loads (2.7 MB of layer PNGs, twice); a ride-ending
hazard may never stand between a machine and its job; the skinned rig is
modelled facing +z and `FACE_TURN` already does the +z→+x turn, so any extra
yaw points Eeri at the camera.

## Toko Drop (`toko-drop/`)

Browser bullet-hell survival game (three.js, ES modules, no build step).

- **`js/tuning.js` is the single source of truth for enemy look & feel.**
  Constants covered by `TUNING` must be read from it, never hardcoded in
  `enemy.js`/`main.js`. The pause menu will eventually edit it live (port
  brief Part 6). The visual reference is `enemy-lab.html` (standalone page);
  when the brief and the lab disagree, the lab wins. See
  `TOKO_DROP_PORT_BRIEF.md` for the full enemy visual/behavior port plan.
- `js/enemy.js` — enemy types, behaviors, goo shader, SDF gel-dome blob geometry
- `js/main.js` — game loop, waves, collisions, HUD, title/pause/death screens
- `js/bullet.js`, `js/player.js`, `js/input.js`, `js/audio.js`, `js/lang.js`
  (en/ja/fi strings), `js/designer.js` (pause menu: settings + enemy tuner)
- Forward planning lives in **`TOKO_DROP_ROADMAP.md`** (milestones toward
  public 1.0 and beyond); `GDD.md` holds design truths, `VERSIONS.md` holds
  what shipped.

## Versioning & release discipline

- **`scripts/cabinets.sh` is the cabinet gate** (v204): boots all six cabinets,
  plays each, and fails on mode leaks (CLOSE COMBAT/SHEPHERD reaching a
  cabinet), a dead retro pass, or any page error. Run it alongside `smoke.sh`
  whenever a release touches mode-wide systems or `inCabinet()`.
- **`scripts/webgpu-smoke.sh` is the TSL gate** (v236) — **run it for any
  change that touches a node graph.** `smoke.sh` and `cabinets.sh` both rewrite
  the importmap to the CLASSIC bundle, so neither has ever executed one line of
  the WebGPU build: v218/v222/v223/v228 all shipped on hand-checks alone. This
  was measured, not assumed — a bogus `TSL.*` call injected into
  `makeFloorMat()` (a graph that throws on boot for every WebGPU player) passed
  **green through check-syntax.sh, smoke.sh AND cabinets.sh**, and only this
  gate caught it. It also refuses to pass vacuously: it asserts `IS_GPU` and
  that the floor is a NodeMaterial with a `colorNode`, so a silently-classic
  boot fails loudly instead of green-lighting a run that tested nothing.

## Showing, not describing (v211)

`scripts/enemy-loop.mjs` records a **looping GIF of an enemy behaving**, driven
by the real game code, so movement/feel questions get answered with a moving
picture instead of a paragraph. Use it whenever the question is "does this read
right?" — attach the loop to the reply.

```
node scripts/enemy-loop.mjs                    # every scenario
node scripts/enemy-loop.mjs dodge charge       # named ones
node scripts/enemy-loop.mjs --out /tmp/g --frames 26
```

Scenarios live in a `SCENARIOS` map at the top of the script — add one rather
than hand-rolling a capture. Notes that cost time to learn:
- It stages a **throwaway copy** of `toko-drop/` with a capture harness appended
  to `main.js`; nothing test-only ever reaches the shipped tree.
- **Never `waitUntil: 'networkidle'`** — the service worker keeps the network
  warm, so `goto()` never resolves.
- Screenshots under swiftshader run ~1.5 s each, so a 26-frame loop takes about
  a minute per scenario. Run it in the background and wait on the output file.
- Dev-only deps (`gifenc`, `pngjs`) are NOT vendored into the game; install them
  in a scratch dir and run with `NODE_PATH` pointing at it.
- **Every commit touching game files needs a `## vN` entry at the top of
  `VERSIONS.md`** (pre-commit hook enforces; install via
  `cp scripts/pre-commit .git/hooks/pre-commit`). At every multiple of 10,
  archive the prior decade's entries into the Archive section.
- `scripts/bump-version.sh <N>` bumps the `?v=` cache token across the whole
  module graph, the HUD version label, the README H1, and prepends a
  VERSIONS.md stub. Any new file with a `?v=` import must be added to its
  file loop.
- The live site is served from the **`gh-pages` branch**
  (mbace1.github.io/Suds-Jack/toko-drop/). Ship = PR into `gh-pages`, squash
  merge, then `scripts/release.sh` to resync the working branch.
- Never skip hooks (`--no-verify`); never force-push to the default branch.

## Multi-game workflow (agreed 2026-07-06)

- **Toko Drop changes always go via PR + squash into `gh-pages`** — the
  hooks, VERSIONS.md discipline, smoke tests, and deploy verification hang
  off that flow.
- **Other games (`neon-ronin/`, `Skltr/`, …) may be pushed directly to
  `gh-pages`** as long as the commit touches only that game's directory.
  Agents resync their working branch over such pushes (`scripts/release.sh`).
- **After ANY push, confirm the "pages build and deployment" Actions run
  concluded `success`** — deploys fail transiently (v94, v108) and a failed
  or superseded deploy looks exactly like "the site is broken".
- **New file paths need `?v=` cache tokens from day one** (v118/v119 lesson):
  the Pages CDN caches responses INCLUDING 404s for ~10 min, so a brand-new
  untokened path can serve a black screen right after its first deploy.

## Playtest feedback pipeline

- Death-screen **SEND & CONTINUE** POSTs the feedback + run summary to the
  inbox configured in `main.js` (`SHEET_ENDPOINT` if set, else the Formspree
  fallback, ~50/month). `scripts/feedback-sheet.gs` is the unlimited Google
  Sheets sink — deploy per its header, paste the `/exec` URL into
  `SHEET_ENDPOINT`. SKIP sends nothing; no automatic beacons.
