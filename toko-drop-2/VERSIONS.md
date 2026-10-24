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

## v43 — 2026-10-24
**Portrait levels are bigger on the phone, and every world has something round its floor: a ground that fades into the dark, a glowing edge, and its own things standing along the sides**
- Owner, 2026-10-24, looking at all nine worlds side by side: *"Make the portrait mode levels a bit bigger and put graphics on the sides."*
- BIGGER: the portrait camera is flatter, 41.6° → 30° (landscape's is 28.2°). The floor is fitted to the phone's width either way, so the flatter view gives it more of the height — world 1 went from 43% to 52% of a 412 × 915 phone, measured, with a wider far edge — and nothing about the level changes: the same floor, the same campaign rooms, the same balance. A steeper camera was measured too and made the floor SMALLER (35%); a longer floor (22 × 48) was bigger still but changes the game, so it was left alone.
- THE SIDES (`render/scenery.js`, `_surround`; numbers in `TUNING.scenery.surround`): every floor that had nothing round it gets a ground running 16–18 m past it and fading into the dark, and props along the far side and the two sides — never the near side, nothing stands between you and the fight. The grid: its lines go on past the rail, far fainter than its own, with rows of short lit bollards like a runway's lights (tall neon posts were tried first and, seen from above, streaked out from the floor like a starburst). The cistern: two rows of stone columns in dark water. The boiler: pipes down both sides and stacks glowing under their rims. The river: rocks and reeds on its banks. The ice: shards. The deep: rock spires and glowing kelp (the dark rule hides them until you go near — by design). The core: towers in magenta bands over dim traces. Placed by a fixed hash, so a world stands the same every time.
- THE EDGE: worlds 4–9 had no rail, so on the driveway-sized floors you could not see where the floor stopped. Each now has a thin line glowing in its own rail colour all the way round.
- The boiler's soot is half as dark: at full strength it read as the shadow of something standing on the floor.
- NEON's floors, SURVIVAL and the campaign's rooms get the grid's surround.
- Cache tokens `?v=42` → `?v=43`; HUD label → `2.0 · v43`

---

## v42 — 2026-10-24
**Arcade boss waves are fought like the campaign's boss rooms: the boss's health on screen, a clock and a grade, and the wave over when the boss is down**
- Owner, 2026-10-24, picking from the plan: boss waves fought like the campaign boss rooms (CAMPAIGN_PLAN.md step 5).
- `sim/bossfight.js`: a boss wave is a fight ON A CLOCK from the wave's start. The clock line under MENU names the boss and the grade it is on course for with that line's seconds (`OMEGA · S 29s`, as a room's HUD does), and a bar under it is the boss's health — every boss of the wave in one bar, in its colour (the TWIN PRISMS are one fight).
- The boss down ends the wave: what it brought is POPPED (`api.pop`: it bursts as a kill does but pays nothing, keeps no streak, splits into nothing and fires no corpse in HARDCADE), the enemy bullets go with it, nothing more comes, and the wave clears. 1.x let the round's clock carry the adds into the next wave; that is still the behaviour with `waves.bossFight.on = false`, which the 1.x oracle in `test/director.mjs` now runs with, so it still proves everything else is 1.x's.
- Graded S/A/B on lines the bot measured, as the rooms were: `scripts/boss-tiers.mjs` fights every world's boss wave with both headliners at three skills over 24 seeds and writes `tuning/bossfights.js` (S the sharp bot's median, A the average's, B the rough's, a floor between the steps). The bot cannot dodge a boss as well as it shoots one, so it fights with lives to spare and the hits it took are reported beside the times. The grade pays its share of 1000 × the wave (S 1, A 0.6, B 0.35, C 0.15 — an S on wave 8 is 8,000, with the clear's 4,000 on top), and an S or an A drops a pod where the boss fell. One banner says it: `TWIN PRISMS DOWN · S · +12,000` (the clear's bonus joins it rather than writing over it).
- The bot moved out of `scripts/room-tiers.mjs` into `scripts/bot.mjs` so both passes play the same game; the room pass's output is byte-identical across the move.
- Found on the way: the first cut settled the fight after the round end, so a boss killed past its round's clock let the adds carry into the next wave and the fight never ended. The fight is settled first now, and `test/bossfight.mjs` (in the smoke) holds that case, the pops paying nothing, HARDCADE's pops firing nothing, and an S's pod. The smoke checks the HUD: the clock line, the bar under it, and the banner.
- Cache tokens `?v=41` → `?v=42`; HUD label → `2.0 · v42`

---

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
