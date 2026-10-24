# Toko Drop 2.0 — Version Log

<!-- Rules:
  - A new top `## vN — YYYY-MM-DD` entry, with a bold one-line title and
    bullets, for EVERY commit that touches game files. Game files are
    everything except docs (*.md), scripts/, test/, .github/ and spec/.
  - `scripts/bump-version.sh <N>` moves the `?v=N` cache tokens, the HUD
    label (`2.0 · vN`) and this file's stub together. Fill the stub in
    before committing: the hook refuses an entry that still says TODO.
  - At each multiple of 10, roll the previous decade into the Archive
    below, one line per version.
  - `scripts/pre-commit` checks the commit being made, not the disk. It
    refuses a game-file commit that does not change this file, leaves a
    malformed top entry or an unfilled stub anywhere, skips an archive, or
    carries a version that origin/main already has. Main is what Pages
    serves, so changed bytes under a released `?v=N` would sit stale on
    phones. Install it once per clone:
      cp scripts/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
    Never `--no-verify`.
-->

## v41 — 2026-10-24
**The game loads on the live site again: `_base.js` is `base.js`, because GitHub Pages leaves out every file whose name starts with "_"**
- Owner's phone on v40, from the arcade: *"the file that failed: 404 …/toko-drop-2/js/sim/species/_base.js?v=40"* — v40's own report, and the whole cause. The arcade is served by GitHub Pages, whose Jekyll build drops any file or folder whose name starts with `_` (there is no `.nojekyll` at the site root, and adding one would change how every game on the site is built, which is not this game's call). Every local server serves the file, so the smoke, the site smoke and the hub route check were all green against a game the live site could not load.
- `js/sim/species/_base.js` → `base.js`; HOPPA, WORMA, STEAMA, BUBBLA and GLOWA import it by the new name.
- A gate in `scripts/check-syntax.sh` (run by the pre-commit hook and the smoke): no shipped page or file under `js/`, `vendor/` or `levels/` may have a name starting with `_` or `.`. Checked both ways: a stray `js/_probe.js` fails it.
- The load box tells a 404 from a dropped connection: *"that file is missing from the site — a bug"*, not *"check the connection"*.
- Cache tokens `?v=40` → `?v=41`; HUD label → `2.0 · v41`

---

## v40 — 2026-10-24
**A file that drops on the way no longer stops the game: the page checks every file and loads itself again**
- Owner's phone, 2026-10-24: *"failed to load …/toko-drop-2/js/main.js?v=39"* — an hour after the deploy, with every file on the live branch and the same tree passing the smoke. The same box came up once at v31, and v32–v38 then loaded. So it was not a missing file: the game is ~210 module downloads, and one that drops on a phone's connection fails the whole load.
- The browser remembers a failed module for the life of the page, so v32's retry (importing main.js again in the same page) could never recover from one; only a fresh page can. Now: on a failed load the page checks every file at once (six at a time, past the cache — which also replaces a bad copy the cache may hold — and including three behind the import map), says how far it has got, and reloads itself. At most twice in two minutes; past that it names the file and shows a RELOAD button. main.js clears the count once the game is up.
- The box also says which browser it is (Chrome, an app's in-app WebView, Safari…) and its version, and whether the arcade's own service worker (the hub's `sw.js`, whose scope covers this folder) was answering the page — the owner's second report was *"fails after I click cabinet icon"*, and the hub's worker cannot be ruled in or out from here (opened from the hub with that worker running, the game loads in Chromium).
- v32's check walked the files one at a time, which on a phone takes long enough that the screenshot showed only its first line.
- Checked in a real browser with one module's download cut: once, and the game came up on its own after one reload with nothing on screen; every time, and after two reloads the box named `js/sim/rules.js` and offered RELOAD.
- Cache tokens `?v=39` → `?v=40`; HUD label → `2.0 · v40`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

- **v39** (2026-10-24) — The intro plays every time a run starts from the title, and never on a retry
- **v38** (2026-10-24) — The start screen is ARCADE with HARD beside it, CAMPAIGN and MENU, and a MENU button stays at the top right while you play
- **v37** (2026-10-24) — Each arcade world asks its own challenge, three of them close their walls in for it, and the banners move off the fight
- **v36** (2026-10-24) — The arcade's challenge waves: what the campaign teaches, the arcade asks
- **v35** (2026-10-24) — The strategy curve: every room names the skills it asks for, and the rooms climb in measured steps
- **v34** (2026-10-24) — Grades you can read: the HUD says which grade you are on course for, the results put your number against the lines, and an F says why
- **v33** (2026-10-24) — The campaign is a grid of thirty tiles, and every room has a card with START
- **v32** (2026-10-24) — A game that fails to load says which file failed and why, and tries once more
- **v31** (2026-10-23) — THE CAMPAIGN, rebuilt: thirty rooms, thirty challenges, each with its chart, graded on tiers set by bot play
- **v30** (2026-10-23) — The campaign's framework: a room is a goal and its mods (CAMPAIGN_PLAN.md)
- **v29** (2026-10-23) — Worlds 4-9 each have a gel of their own
- **v28** (2026-10-23) — Worlds 4-9 each have a floor of their own
- **v27** (2026-10-23) — Arcade becomes nine worlds and can be won; the title is ARCADE with a HARD switch, and the campaign
- **v26** (2026-10-23) — The campaign's six worlds wear their own floors and play by their one rule each, as in 1.x
- **v25** (2026-10-23) — THE CAMPAIGN, from 1.x: eighteen rooms in six worlds, each with its own clock and goal, graded S to F
- **v24** (2026-10-23) — 1.x's settings in OPTIONS: LANGUAGE, VOLUME, the announcer with its own volume, and REDUCE MOTION
- **v23** (2026-10-23) — OPTIONS, like 1.x: the title keeps the modes, every switch moves to one page, and the pause menu and the death screen open it too
- **v22** (2026-10-23) — Each new world has its own gel (HOPPA hops the driveway, WORMA swims under the sewer), and WORLDS · NEON on the title swaps in abstract floors
- **v21** (2026-10-23) — Splatter: kills throw real goo that pools, smears and dries on the floor — on by default, SPLATTER on the title turns it off
- **v20** (2026-10-23) — SURVIVAL is back, and its floor changes size as you play
- **v19** (2026-10-23) — Worlds: the grid goes down a vortex to the driveway, the driveway down a drain to the sewer
- **v18** (2026-10-23) — The flick dash; the arena bigger and the right way round
- **v17** (2026-10-23) — Gates, pickups and the DASH pod; enemies dangerous on arrival; SDF gels on the title
- **v16** (2026-10-22) — The start intro, behind an INTRO button beside ARCADE
- **v15** (2026-10-22) — DRAPER and CLOAKER: all 27 of 1.x's gel types are in
- **v14** (2026-10-22) — The arena's light: shots and blasts light the floor, bodies cast shadows
- **v13** (2026-10-22) — Arcade juice: bullets glow, hits spark, kills flash and ring
- **v12** (2026-10-22) — PURP, PYRA, BOTFLY and BULWARK, and SLUG, REDD and SHEPHERD held to 1.x again
- **v11** (2026-10-22) — Jelly that dents when hit, and big gels die sliced in two
- **v10** (2026-10-22) — The first graphics pass: the gels are jelly now
- **v9** (2026-10-22) — Four more of 1.x's roster, and every earlier port held to 1.x
- **v8** (2026-10-22) — The bosses: OMEGA, the TWIN PRISMS and the WARDEN, as 1.x had them
- **v7** (2026-10-22) — A third dash on test: CUT goes through and hurts
- **v6** (2026-10-22) — The PUSH dash on test beside 1.x's, and tougher gels to push around
- **v5** (2026-10-21) — 1.x's rules underneath: a species module each, 1.x's crowd, score, hits and HARDCADE
- **v4** (2026-10-20) — 1.x's gelatin, on 1.x's floor, in 1.x's units — and ARCADE / HARDCADE / SURVIVAL
- **v3** (2026-10-19) — A game: twin sticks, six species, the night, HARDIVAL — playable from the menu
- **v2** (2026-10-19) — The slab fills the screen; the garage, lawns and street sit at its edges
- **v1** (2026-10-19) — M0: repo and rules — a blank night driveway with the version on screen
