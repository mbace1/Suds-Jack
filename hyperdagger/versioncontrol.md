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


## SDF skull pilot — implemented on codex/hyper-sdf-skull, pending review

**Goal:** compare one signed-distance-field skull with the existing renderer
before deciding whether to extend SDFs to other enemies.

**Implemented:** bounded-proxy raymarch for the regular Skull behind
`hyperdagger/?skull=sdf`; comparison controls at
`hyperdagger/sdf-preview.html` (separate diagnostic route, never the cabinet
entry). The default renderer is unchanged. Geometry, gameplay hit radius,
movement, HP and voxel gibs retain the existing contract.

**Verified locally:** `test/sdf-skull.cjs` compiled/rendered the shaders with
Chromium 153 + SwiftShader, used the comparison/rotation controls, entered the
real game with START, held the mouse to kill a staged skull, verified material
disposal, and checked default play. Surface-depth tests put geometry behind
and in front of the marched surface; the rear plane left a bone pixel
[133,122,102], and the front green plane fully occluded it [0,255,0].
`node scripts/hd-shell.mjs --check`, `test/killers.mjs` and syntax/diff checks
also passed. The whole historical smoke suite was not rerun.

**Performance:** the A/B harness can force GPU completion each frame with
`?benchmark`. An 18-frame, 12-skull run on this shared software renderer at
640px width measured voxel median/p95 2300/6200 ms and SDF 33/6066 ms. Both
had multi-second stalls; this is an unstable diagnostic sample, **not evidence
of an SDF speedup or a phone/tablet frame budget**. The comparison uses a small
standalone scene, not the full game's postprocessing and cubemap costs.
Screenshots and raw measurements live under `test/evidence/sdf-skull/`.

**Next:** test the opt-in game on a physical iPad and desktop GPU, including a
close skull and a full swarm; refine the sculpt against the owner target.

**Exit:** acceptable hardware frame times plus visual approval before making
SDFs the default or expanding the roster. Not merged; not live on Hub.


## SDF build 2 — selectable preview and skull-family conversion

Goal: a player can choose Classic / SDF before START, use all three seasons,
and return to Classic. A separate `/hyperdagger-sdf/?skull=sdf` preview is
prepared for direct testing without replacing the cabinet.

Implemented: persistent renderer choice; mouse, touch, R and pad up/down;
five distinct skull profiles; season tint; gallery profile selector. Existing
health, radii, movement, scores and voxel gibs stay authoritative. SDF damage
flashes but does not yet cut geometric bullet holes.

Verified locally on the exact preview tree with the site's hub/Toko imports:
`sdf-menu.cjs` passed mouse selection, reload persistence, R, real START,
portrait touch, 44px controls, pad down and all five profile/HP/radius checks.
`sdf-skull.cjs` passed depth occlusion, each profile's actual shader render,
real held-fire kill, disposal, original collision/gibs and Classic override.
Killer coverage, syntax, diff and generated precache checks passed. Full
historical smoke and physical-device performance were not rerun/certified.

Deployment keeps shared imports aligned to the site (shell 102, signature 3,
table 5). The preview index omits worker registration: the existing worker's
broad activation cleanup must not run from a second cabinet. No current
cabinet files are replaced. The PR tracks source and deployment SHAs.

Next and exit: `ROADMAP.md` now owns the staged conversion plan and physical
GPU budgets. Test on iPad before enabling SDF as the main cabinet's default.


## SDF build 3 — preview expansion, source PR #626

Goal: make SDF visibly affect damage, non-skull bodies and the arena material.
Implemented: six recent CSG trajectory holes per enemy, Watcher orbital iris,
Totem helical shell/core, charge/spawn pulses, world-space season lighting,
and 2D SDF floor inlays. Gameplay and floor collision are not converted. A dedicated test-arena entry
uses VOID's legacy director with an initial Watcher/Totem, separate best,
history and log keys, forced free-run scoring, and no daily board. Standard
season wave tables remain unchanged.

Browser evidence: the wound pixel test exposes a green background through a
previously solid forehead ([140,128,107] → [0,255,0]); this fails if the wound
only paints the surface. Six-cut cap checked. Both new core renders change
from [143,18,4] idle to [255,56,14] charged in the isolated render control.
The seven-profile HP/radius gate and pointer/touch/R/pad menu gate passed.
Combat gates use real START and held mouse fire, observing a Watcher wound,
kill/material disposal and a Totem's emitted SDF skull. Floor control changes [153,153,153] to [54,54,54] with engravings off/on.
Natural timeout writes the test best/history and leaves seeded normal records
and daily records unchanged. Physical iPad performance and the full
historical smoke suite are not certified; no 95% fidelity claim is made.

The preview tree uses the site's shared imports and omits worker registration.
Source and deployment SHAs plus live verification are tracked in PR #626.
Next: physical-device frame budget, then articulated enemies and a small 3D
arena patch; keep the current Classic/SDF menu recovery.


## 2026-10-19 — v59, the menu is the season, on main and on the live page

PR #624, merge commit `a6f299ec172e73edb78a51470239551988115212` (`a6f299ec`), 19 Oct 2026, 11:59:15 EEST. Parents: `1de54988` (main) and `ca8bbeb3` (the PR head, `feat/hyperdagger-menu-redesign`). The full smoke passed 220/0 on `ca8bbeb3`. The other gates are listed in the PR. Codex reviewed it with no findings.

What it changed, for a player (HD-019): the menu offers seasons 1 to 3 as tabs, builds the picked season's arena behind the menu with that season's rules, and starts it from START underneath. A tab only picks. The mode row is gone, RUN FREE / DAILY moved to the pause menu and applies from the next run, and the menu shows no HUD and no hand.

The live page did move. gh-pages `b536d0a2`, 19 Oct 2026, 12:05:51 EEST, message "Publish Hyper Dagger v59 from main a6f299ec (PR #624)". Pages run 39227527492 (pages build and deployment) concluded success at 12:07 EEST. It is the newest Pages run. Read back from `b536d0a2` through the GitHub API:
- `index.html` asks for `js/main.js?v=110`, `sw.js?v=110` and `../hub/shell.js?v=94`.
- `sw.js` sets `const CACHE = 'hyperdagger-v80'`.
- `hub/versions.json` has hyperdagger at v59.
- The three player seasons carry their menu `card`, and `main.js` has the START path.

The publish carried `hyperdagger/` (minus `test/`, where the site's own two files were left as they were) and the one `hub/versions.json` row. No catalogue line changed, so no token cascade was needed. The deployed `VERSIONS.md` still read "v59 — in progress". The dated heading in this entry's commit reaches the site with the next Hyper Dagger publish.

Not verified: the live page was not opened. This session's network policy refuses `mbace1.github.io`. Before the push, the offline, menu-input, press-edges, hud-lock and goal-card gates passed against the site tree, with the site's own hub and toko files.

## 2026-11-09 — v60 integration preparation (not merged or published)

Goal: finish #628 as the opt-in SDF integration on the real hub route before
converting another enemy. Classic stays the default; the separate build-3
preview stays online until its retirement is explicitly agreed.

Implemented on `codex/hyperdagger-v60-integration`: #628 (`33ff40cb`) and its
complete #626 ancestor (`baa953c5`), with current main `27f68b37` incorporated
in local merge `128e4cfcf`. The merge was clean, including `hub/versions.json`;
the PR API's older base/mergeability report was not used as conflict evidence.
The diff against main remains Hyper Dagger plus its one hub version row.
The v59 landing documentation from #625 is reconciled without claiming that
PR itself merged. The roadmap now distinguishes history, opt-in v60,
hardware budgets, one articulated conversion, and a later 3D arena patch.

The renderer row exposes v60 even in short landscape. Inca SDF's longer card
previously put START's bottom at 396.56 px in an 844×390 viewport; reducing
short-screen row gaps retains 44 px targets and makes the complete button
fit. `main.js` / worker registration are 115, cache `hyperdagger-v85`, with
the 71-entry precache regenerated. Other game-module tokens are unchanged.

Test additions: `sdf-loop.cjs` uses the hub's real Play link, title/menu,
weapon input, simulation death and tap retry for both renderers across all
three seasons, and checks the loaded-asset safeguard. `HD_SITE_ROOT` lets
that gate and the offline gate test a prepared production tree. Existing
smoke assertions remain: the court now uses real W input instead of assuming
40 frames reach the wall, and the palette fixture is kept clear of shale
and removed after sampling, before it can chip a pile's initial 70 HP.

Verified baseline over HTTPS on 9 November: hub version 59, main cache v80;
separate preview title build 3, main token 113, no worker registration.
Source and prepared production-tree version/precache checks agree. The
prepared release preserves production shell 226 and signature 3, and changes
only `hyperdagger/` and its version row; no production push has occurred.

Validation is ongoing; final gate results and exact source head must be
recorded before merge approval. Chromium 156 / SwiftShader proves browser
correctness only. Physical iPad, Android and desktop GPU measurements are
unavailable: no hardware p95 or game/real-time budget is certified. Completed
runs still tie at 300.0 seconds; this remains an owner scoring decision.

Open findings: the natural-spawn gate's 20-second observation can contain no
skull because the director chooses 10-second breathers and Brutes. Both
unseeded and seed-628 runs reproduced it; its assertions and limit are still
intact pending explicit approval of a longer observation. The Inca carry
assertion is unchanged. Toko's idle interruption also still reproduces:
with only its 24 s timer shortened to 12 s diagnostically, real input events
every second were interrupted by two unsolicited lines. No Toko fix is
included in this lane.

Next: complete the final-tree gates, including the six encounter loops and
full smoke, resolve every Gate finding in its proper lane, and obtain review
and Mikael's explicit merge approval. Exit: approved tested head merged,
scoped publish to `/hyperdagger/`, successful Pages deployment and actual
live hub/menu/combat verification. Until then v60 is neither merged nor live.

## 2026-11-09 — test-arena pause exit closes the remaining pin/key path

Source inspection found that #628's title tabs used a clean-page exit, but
the pause menu still changed the test run's season in place. Selecting HAUL
there retained `?mode=hyper`, so the season could use HYPER's disc/rules;
`hiKey()` could also select a normal best while that test run was active.
The title and pause handlers now share `leaveSdfTestArenaForSeason()`, which
remembers the normal season and reloads `./` before changing run state.

`test/sdf-exit.cjs` passed all three exits with real taps: normal menu → test
chip → START → pause → season → clean normal menu → START. EMBER and INCA
resume HYPER, HAUL starts TRUCK with a convoy, all URL pins are gone, and
sentinel normal best/history/log and daily records stay unchanged. No debug
hook selects, exits, starts or ends the action under test.

This changes `main.js` again: module and worker-registration tokens are 116,
cache `hyperdagger-v86`, generated precache still 71 entries. No other runtime
module changed. The final full-tree validation is being refreshed for this
fix. The earlier Inca carry assertion passed unchanged in the ongoing smoke
rerun; a CSS-fade fixture synchronization fix still needs its complete rerun.

GitHub CI on `653df868c` failed before creating any jobs; the public gates
summary says “Internal server error”, correlation
`189172f1-f550-4623-9a18-d7807a63837e`. A bounded retry of each affected run
returned 403, “This workflow run cannot be retried”. These results are not
code-test evidence and remain blocking. Fresh review was requested via the
repository's `review` label; no fresh review result has been received yet.
No merge or production publish has occurred.

## 2026-11-09 — two-finger START input batch

The intermittent focus failure is a real jump, not platform motion. A
synchronous trace reproduced `jumps: 1`, `floor: 0`, rise 1.34: START's
pointerdown changed the run state before the same native batch's second
finger reached touchstart. The old coordinate-only drain recognized the
START finger but let the second contact become a gameplay tap.

The UI drain now retains the initiating native event timestamp. Every
contact from that exact batch is UI; later event timestamps use the normal
input path. This adds no blanket time window. Six repeated real two-finger
START cases now had zero jumps/rise, and `menu-focus.cjs` passed 11/0,
including a new real later-tap control proving deliberate jumping still
works. Existing no-jump assertions and their thresholds remain unchanged.

Tokens: input 111, main/worker registration 117, cache `hyperdagger-v87`,
71-entry generated precache. Other runtime modules are unchanged. The final
validation is serializing software-GPU work: a full smoke rerun hit its
30-second navigation timeout while additional diagnostics were running.
The unchanged Inca carry assertion has passed; no carry assertion was
softened. The broad hub smoke's Pajatso A-button/navigation failure also
reproduced on untouched main `27f68b37`, so that finding belongs in the hub
lane and still blocks a clean release. Normal Toko Live runtime passed;
the separately forced idle-typing probe still demonstrates its known bug.

## 2026-11-09 — v60 integrated validation and release hold

Merged current main `84cb8eff` into the integration (`7a852114`), preserving
Toko Move v3.22 and all unrelated upstream changes. Hyper runtime bytes remain
identical to tested `6939caad`: main 117, input 111, cache v87, 71 precache
entries. Full serial gameplay smoke passed **220/0**, including unchanged
Inca carry checks. All six Classic/SDF season encounter loops, three test-arena
pause exits, menu/input/focus, pause/resume, run-end, daily keys/GC, offline,
HUD, action feedback and software correctness checks passed. Local production
staging also passed all six loops, exits and offline. After merging latest
main, real hub entry and offline were checked again and passed.

Feature-pins initially exposed two fixture issues: rounded drain reached 1
before actual drain completion, and isolated pad movement inherited arena
obstacles/motion. Wait for actual drain and reset that movement fixture;
all original zero-height/strike and distance assertions remain. Follow-up
passed 19/0. The unrelated hub deployment-only Pajatso stand-in now has its
own four-line test-only PR #634; full hub smoke passes on latest main with
that fixture fix. It is not folded into this Hyper branch.

`sdf-play` remains **34/1**: Ember's natural director can produce no skull
in its unchanged 20-game-second window. Automatic approval review rejected
extending observation to 60 seconds as weakening the gate; the requested
user decision is pending. No extension or assertion weakening was applied.
The final runtime CI gate jobs are green after one retry of an unrelated
Toko Move event-card failure, with no Toko code change. Toko Live/Night Shift/
looks are green; the forced Toko Live idle-typing diagnostic still reproduces
its separate issue. Fresh Codex review was requested and is pending. Final
source push will need its own CI result.

Evidence: `test/evidence/v60-integration/validation.json` and six settled
phone-landscape menu captures. Software rendering is correctness evidence,
not physical GPU validation. iPad/Android/desktop hardware measurements are
unavailable. The 300-second scoring tie remains a design decision. No next
enemy or 3D arena conversion has begun. The separate preview remains build 3.
Main hub remains v59: no merge or deployment was performed. A local scoped
release candidate (`56cce635`) exists for review; fetch and reconcile current
production again before any explicitly approved merge/publish.

Version generator verification: the Hyper row is v60 and precache is current.
A full generation also proposes unrelated Radio Free 38 → token 73 on main;
that pre-existing row drift was left in its own lane. Only the Hyper version
row differs from main.

## 2026-11-09 — approved observation follow-up, all SDF play checks pass

Owner replied “Continue” to the specific 20-to-60-game-second observation
request. This authorizes that fixture change, not merge or publication.
The seed (628), three-body target, 4,000-frame cap and every original
assertion remain. The first longer observation caught a second fixture
problem: invulnerability stops hits, not Ember's 30-second life clock. At
30 seconds the run timed out; the next fire touch retried it, disposing the
parked skull without killing it. Both original kill/debris assertions
failed as they should (33/2); this intermediate log is retained.

Stage 90 seconds of life before the longer natural observation. No runtime
behavior changes. The complete follow-up `sdf-play.cjs` passes **35/0**:
Ember naturally supplied three SDF skulls at 26.2 game seconds; Haul supplied
three at 17.9 seconds. All real weapon kills, gibs/spray, splitter minis,
Watcher volley, Totem wounds/death, arena exits and Classic recovery pass.
Both logs live in `test/evidence/v60-integration/`.

Fetched and merged main `3e3513628` (Toko original-logotype work) cleanly at
`27804313d`; Hyper runtime still matches frozen `6939caade8` byte for byte.
Codex's review of that runtime completed with no major issues (PR #628,
comment 6749109493). This supersedes the earlier pending-review report.
CI on `e14fb56b` passed gates, looks and Night Shift, but Toko Live failed:
the Betterment question received two replies (3→5), job 129386639785. The
known idle-aside bug remains a release blocker under AGENTS.md §2b; no
Toko runtime fix is mixed into Hyper. PR discussion also reports the same
failure on one retry. Final follow-up source still needs fresh CI/review.

Production advanced to `d1b31eed4`; local release staging merged it cleanly,
preserving shell token 229 and all unrelated production changes. Live HTTPS
recheck still reports hub v59 and separate SDF preview build 3. Neither
branch was merged or published. Hardware performance remains unmeasured;
no next enemy/arena conversion or scoring change was started.

Latest-production staging follow-up passed all six season/renderer loops
(38.2 s) and offline (6/0, 4.0 s), with production shell 229 retained.
## 2026-11-09 — shared-counter prerequisite (Toko lane)

Toko idle-aside fix changes only the paused-table import in Hyper main
(table 6), main/worker registration 111, signature 10 and worker cache v81.
Generated precache has 69 entries (the old table 1/5 duplicate collapses).
No Hyper mechanics or release number change. The v60 branch must retain its
SDF work when incorporating this prerequisite and choose fresh main/cache
tokens. Toko/PATCH_NOTES.md owns the behavior change and regression evidence.

## 2026-11-09 — merge approved; isolated CI prerequisite integrated

Mikael: “Continue merge and project.” This explicitly approves merge and
continuation once required checks pass; no further routine merge approval
is needed for this integration and its necessary prerequisites. PR #634
(reviewed, green) merged at `6944c929`. Toko idle-activity fix is isolated
in PR #635, head `35a458509`; it fixes the confirmed CI failure and adds
positive plus two failing negative controls. The legacy brand diagnostic
also fails on untouched main at its hard-coded Hyper START coordinate;
required Toko Live/hub/offline checks pass locally and fresh CI is pending.

Local integration merge `9cf7d63e8` preserves all SDF/menu work and combines
table 6/signature 10 with fresh Hyper main/registration 118 and cache v88.
Input stays 111; other enemy/shader tokens are unchanged. Generated precache
has 70 entries, now including inherited dialogue/language token 26. The
Toko prerequisite remains a separate PR; once it lands, #628's diff against
main is Hyper-only plus its hub version row. Final runtime checks are being
rerun before merging/publishing. No live v60 claim yet; preview is retained.
