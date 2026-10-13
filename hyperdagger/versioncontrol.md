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
