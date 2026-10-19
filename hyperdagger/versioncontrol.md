# Hyper Daggers change log

This is the short coordination log: what changed, which commit, and whether it is on the live page. `VERSIONS.md` stays the in-game version narrative. This file does not replace it. For v48 and below, read `VERSIONS.md`. This log does not retell that history.

Append a new entry when a change lands. Do not rewrite old entries.

Each entry names the pull request, the commit, and whether the live page moved.

Do not deploy or merge from this file. Mikael approves merges.

Grok Build, D-sign, and Middler all write here. One log, not a private one.

Live page: https://mbace1.github.io/Suds-Jack/hyperdagger/

## 2026-10-03 — in-run HUD only

PR #576, squash `426fcd6faf1286961a8d07a8412ffdea3ed6cc75` (`426fcd6`), 3 Oct 2026, 13:01 EEST. The commit is the in-run frame only: `hyperdagger/index.html`. It is the parent of the squash in the next entry.

The live page did not move for this pull request. The gh-pages tip before the publish below was still the 30 Sep Pajatso commit `8e787631`.

## 2026-10-04 — gun and dash on main, then on the live page

PR #578, squash `0c8492c0f6436823b87a5dcb081da7cbe6703c6f` (`0c8492c`), 4 Oct 2026, 08:21 EEST. Parent `426fcd6`. Title on main: gun hold-only and dash back, without the old Toko files.

The hyperdagger folder on that squash matches commit `be1a5043b3b6c88bdcd5b0c79d4817b12f5b962c` (`be1a5043`, 27 Sep 2026, 23:51 EEST), the tip of `origin/claude/devil-daggers-hyper-demon-4vmk67`. A diff of `hyperdagger/` between that commit and `0c8492c` is empty. That hash is a commit, not a separate tree object. The pull request GitHub merged was opened from `hyper-dagger-27sep` (`6b89e049ca677adec60f85320d21e0163d3c3566`), which carried this tip onto main.

Correction: not only `hyperdagger/` landed. The squash also took `hub/versions.json`, `scripts/hd-loop.mjs`, and `scripts/hd-shell.mjs`. Old Toko files on `be1a5043` did not land. Those paths differ between `426fcd6` and `be1a5043`, and none of them are in the squash.

Because the squash replaced `hyperdagger/` with that 27 Sep tip, the folder on main is that tip, not `426fcd6` plus a patch. The in-run hide rules are in the tip. The #576 stylesheet order is not: `0c8492c` has `image-rendering: pixelated` before `crisp-edges`.

Live behavior in that tree: a short stick tap sets jump, firing is hold, a flick dashes, and seasons ember and inca are `mode: 'hyper'`. `input.js` says a tap on either stick jumps and holding the right stick fires. The pull request text says a short right-stick tap jumps.

The live page did move. gh-pages `dae58935792548c2bc7d5f6946c7fbdb83e2558c` (`dae58935`), 4 Oct 2026, 13:15:55 EEST, message "Publish Hyper Dagger from main 0c8492c (hyperdagger/ only)." The expected "about 13:17" was the commit time above, not 13:17. Tokens re-checked the same afternoon from that commit and from the live files: `js/main.js?v=85` in `index.html`, and `const CACHE = 'hyperdagger-v55'` in `sw.js`.

Checked when this log was opened, 4 Oct 2026, Europe/Helsinki: `origin/main` had moved on to `8aa15e0cc7d19bd157fcec119fe9bdd98d6b75dc` (PR #579, 13:24 EEST). That commit is not a Hyper Daggers change, and gh-pages was still `dae58935`. The live page was still the publish above, not the new main tip.

## 2026-10-17 — v57, the 12 Oct playtest fixes, on main and on the live page

PR #619, merge commit `a7b38706a4faed24afe8e09afd283c4a872780b1` (`a7b38706`), 17 Oct 2026, 23:13:25 EEST, merged by Mikael with "Create a merge commit". Parents: `27f7ad45` (main) and `82a223e1` (the PR head, `release/hyperdagger-v57`). Every gate in the PR's table passed on `82a223e1`.

It combines 19 pull requests as merges: #587 #588 #589 #591 #592 #593 #594 #595 #596 #597 #604 #605 #606 #608 #609 #610 #611 #612 #615. Fifteen closed as merged on their own. #605, #608, #611 and #612 were stacked on other feature branches, so GitHub left them open. Their commits are all in `a7b38706`, and they were closed by hand with a note. Two test-only commits came from #600 and three from #602 as cherry-picks. Those two PRs are not part of this landing.

The live page did move. gh-pages `cc5bd534`, 17 Oct 2026, 23:29:45 EEST, message "Publish Hyper Dagger v57 from main a7b38706 (PR #619)". Pages run 39066951974 (build, deploy and status report) concluded success at 23:31 EEST. It is the newest Pages run, so nothing superseded it. Read back from `cc5bd534` through the GitHub API:
- `index.html` asks for `js/main.js?v=108`, `sw.js?v=108` and `../hub/shell.js?v=94`.
- `sw.js` sets `const CACHE = 'hyperdagger-v78'`.
- `hub/versions.json` has hyperdagger at v57.
- The cabinet's controls line reads "short click = jump, hold = stream".

What the publish carried besides `hyperdagger/` (minus `test/`, where the site's own two files were left as they were):
- The cabinet's controls line in `hub/games.js`.
- The one `hub/versions.json` row. It had read v51 since before v54 shipped, and `versions.mjs --check` named it as the only disagreement.
- The token cascade a catalogue change needs on the site: `games.js` 130→131, `hub.js` 134→135, `hub-entry.js` 57→58, `shell.js` 93→94 in every page that asked for 93, and the arcade worker v123→v124.
- The shell token on this game's page is the site's (`?v=94`), not main's `?v=43`.

Not verified: the live page was not opened. This session's network policy refuses `mbace1.github.io`. The game's gates (offline, press-edges, menu-focus, menu-input, pause-resume-tap, hud-lock) passed against the site tree before the push. The arcade smoke gave the same 46 passes and 4 failures on that tree as on the untouched site, so the publish added no failure. Those 4 are failures of main's arcade test on the site's arcade, and they predate this publish.

## 2026-10-18 — v58, season 3 without truck shots, crate saves or a cargo score, on main and on the live page

PR #622, merge commit `61a458088a92a41683cb14c7bb5e752263f3a6dd` (`61a45808`), 18 Oct 2026, 15:33:03 EEST. Parents: `bbaa15df` (main) and `b796786a` (the PR head, `feat/hyperdagger-hd018-no-truck-shots`). The full smoke passed 220/0 on `b796786a`. The other gates are listed in the PR. The same day, #620 (the v57 landing record) and #621 (the HD-016, HD-017 and HD-018 plans) were merged with merge commits, as `f7d7001d` and `87853b89`.

What it changed, for a player: in season 3 the look locks skulls only, landing in a loose crate saves nothing, and the clock is the run time (TIME SURVIVED). The TRUCK best moved to `hyperDaggerHiTruckV58`, so a v57 best that carried the load is not offered as one to beat.

The live page did move. gh-pages `3b8fb141`, 18 Oct 2026, 15:37:18 EEST, message "Publish Hyper Dagger v58 from main 61a45808 (PR #622)". Pages run 39128050530 (build, deploy and status report) concluded success at 15:39 EEST. It is the newest Pages run. Read back from `3b8fb141` through the GitHub API:
- `index.html` asks for `js/main.js?v=109`, `sw.js?v=109` and `../hub/shell.js?v=94`.
- `sw.js` sets `const CACHE = 'hyperdagger-v79'`.
- `hub/versions.json` has hyperdagger at v58.
- Season 3's data has no cab lock and no `cargoScore`.

The publish carried `hyperdagger/` (minus `test/`, where the site's own two files were left as they were) and the one `hub/versions.json` row. No catalogue line changed, so no token cascade was needed. The deployed `VERSIONS.md` still read "v58 — in progress"; the dated heading in this entry's commit reaches the site with the next Hyper Dagger publish.

Not verified: the live page was not opened. This session's network policy refuses `mbace1.github.io`. Before the push, the offline, press-edges, hud-lock and goal-card gates passed against the site tree, with the site's own hub and toko files.
