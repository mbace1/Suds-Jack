# Suds-Jack — repo guide

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

## Versioning & release discipline

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
