# EERI — World 2 (Pipeworks): the execution plan

> **Audience: whoever picks up World 2 — most likely the Design/Level lane.**
> `WORLD2.md` is the *grey box* (what the world is, what art it needs).
> This file is the *plan* (what to build, in what order, at what cost, and
> in how many pull requests).
>
> Canon order is unchanged: `PHASING.md` → `DESIGN.md` → `ART_BRIEF.md` →
> `assets/README.md` → `VERSIONS.md`. Nothing here overrides them.
>
> Written 2026-08-15, against `main` at `e14fa31` + PR #234.

---

## 0. Read this before trusting any earlier plan

An earlier draft of this plan circulated with figures that are now wrong.
If you are holding it, these are the corrections:

| the old draft said | the truth on `main` today |
|---|---|
| "commit the `kid.js` respawn fix first" | **already done** — it is in PR #234 |
| a **v16** entry | `main` went **decimal**; #234 takes `v15.2`, so this work is **`v15.3`** |
| `REACH.gap` is 3 | it is **4** |
| rooms 79/0, smoke 173/0, base `ba4568e` | **88/0**, **198/0**, base `e14fa31` |
| `LEVELCRAFT.md` is unwritten | **`LEVEL2.md` already covers most of it** — see §1 |

The reason the draft drifted is worth recording, because it is the same
failure this project keeps paying for: it was written on a branch that had
**not fetched `main` first**, so it planned against a tree that no longer
existed. CLAUDE.md's Eeri section opens with `git fetch origin main gh-pages`
for exactly this reason. **Do that before you start.**

## 0.1 What is already delivered (PR #234)

- **The P0 respawn fix.** `Player.update`'s fall handler carried a hardcoded
  `x = 43` — a LEVEL 2 coordinate — so every fall in every level teleported
  the kid there, bypassing `level.fallRespawn()`. Live on `main` and on the
  deployed site until #234 merges.
- **`WORLD2.md`** — the grey box: theme, three levels' beat tables, the
  `pipeworks_*` layer table, the two ride machines, the costing.
- **`LEVEL2.md`** — one level documented completely, as the worked example
  every other level is cut from.
- **The `EERI 1-1` address scheme** (`js/levelid.js`) — incidental to World
  2, but it means levels 4–6 get `#eeri-2-1`…`#eeri-2-3` for free the moment
  they are authored. Nothing to do.

---

## 1. Four pull requests, not one

The whole of World 2 is **18–27 agent-hours** — revised down, because the
backdrop set turned out to be already painted (see §0.2). As a single PR
that is a diff nobody can review, and it welds a risky engine change to
routine level authoring. Split it:

| # | scope | effort | risk | blocks |
|---|---|---|---|---|
| **0** | **Art lane: flip `pipeworks` to `live`**, add `sky` | ~0.5 h | low | nothing (levels grey-box without it) |
| **1** | **Docs** — `LEVELCRAFT.md`, `WORLD2.md` revision | 1–1.5 h | low | nothing |
| **2** | **Water + pipe + `pump`** | 4–5 h | low–medium | levels 4, 5 |
| **3** | **The hoist, alone** | **4–8 h** | **high** | level 6 beat 3 |
| **4** | **Levels 4–6 + the bot + docs alongside** | 8–10 h | medium | — |

**PR 0 is the Art lane's and is nearly free** — the paintings exist and
measure to the contract; it is a status flip plus the missing `sky`. It does
not block anything, because levels grey-box on the code placeholder.

PR 1 and 2 can merge while 3 is still being fought with. **PR 3 is isolated
deliberately** so it can be reverted without taking the levels with it.

**If PR 3 fails or overruns, World 2 still ships.** DESIGN §4.2 says level 3
of a world takes no new verb, so level 6 falls back to pipes and water at
their hardest. Do not let the hoist hold the world.

---

## PR 1 — the docs

### `LEVELCRAFT.md` (new)

The "how to author a level here, and what we already learned" file.
`VERSIONS.md` records *what shipped*, `DESIGN.md` records *what the game
does*, and neither says this.

**Do not rewrite `LEVEL2.md`.** It already carries the beat-by-beat worked
example, the `check()` checklist, and the trap list. `LEVELCRAFT.md` should
**link** to it and add only what is missing:

- **The skill ladder.** One verb per level: L1 stomp · L2 climb · L3 both +
  the crane · L4 wade · L5 pipe · L6 hoist. *A level that introduces two
  ideas is two levels.*
- **The gate discipline** — the commands and what each can and cannot see.
  `rooms.mjs` proves geometry; `playthrough.cjs` proves playability; the
  second exists because the first passed a level nobody could finish.
- **The traps**, generalised, harvested from `VERSIONS.md` v7–v15.2:
  - a hazard placed by feel lands on the beat that needs stillness (the vent
    inside the girder's seating window)
  - anything that adds to the player's reach must be added to the reach
    model, or `check()` refuses correct rooms — *worse than not checking*
  - a rise the player did not ask for is not the game's to cut
  - one `?v=` token per module — four occurrences now
  - **a debug constant in shipping code outlives the debugging session**
  - a tireless bot beats levels a child would put down, which is why the
    playthrough gate measures COST as well as completion

### `WORLD2.md` revision

1. **Promote the hoist from fallback to committed** (owner's call). Keep the
   honest costing — it is still the only expensive item and the reason is
   still true.
2. **The backdrop is DONE — done in this PR.** §3.1 used to call it "the
   single biggest item". The art lane had already built it and parked it
   (art lineage **v16**, *"world 2's backdrop, built ahead of need"*). Five
   `pipeworks_*` PNGs are on disk and **measure to the contract exactly**.
   §3.1 now says so.

   What remains is a **status flip in `assets/manifest.json`**, not a
   painting job — and it is the **Art lane's**, not Design/Level's. Two
   loose ends for them: `pipeworks_sky` does not exist (groundworks ships
   one), and `f_pipe_v1.png` is on disk with no manifest entry.

**This is the second time in two days that a plan was written against work
that already existed.** Both times the cause was the same — not looking at
the other lane before estimating. §0 records the first. Check `git log` and
`ls assets/2d/` before costing anything in this file.

---

## PR 2 — water, the pipe, and the `pump` verb

### (a) The water tile — cheapest, the pattern exists

`underfoot()` (`level.js:72-76`) is char-agnostic and is the single sampling
point that `beltAt` and `tarpAt` both sit on. That is the hook. Mirror the
belt exactly: a char, a `level.js` reader, a speed scale in `kid.js`.

> **Trap.** `TILES` in `parts.js:102-120` is **declarative only — nothing
> imports it.** The four string constants (`SOLID_CHARS`, `BELT_CHARS`,
> `TARP_CHAR`, `CLIMB_CHAR`) are the real contract, so `TILES` can silently
> disagree with them. Add to both, and consider a gate check that they agree.

**Deep water is not a new thing** — it is a `pit` drawn differently, so
`fallRespawn` already handles it.

New `check()` rule: deep water needs a lip to be handed back to.

### (b) The pipe — authored points and a scripted move

Closest in shape to the machine mount in `main.js`.

New `check()` rule, and it is **the ladder's own two-end contract
generalised: both mouths must be standable.** A pipe delivering you into a
wall is the vertical version of a ladder ending in mid-air — the mistake the
parts kit exists to make impossible.

### (c) The `pump` verb — three tables, and two fail *silently*

The pipe-layer needs **no new verb** — it is the excavator's `span`
re-dressed, which is why it is the cheap second machine. `pump` is new, and
three places must move together:

1. `MACHINE_REACH[type].verbs` must list `'pump'` — four separate `check()`
   rules look the machine up by verb (`parts.js:551, 617, 653, 679`).
   `machine()` copies `verbs`/`arm` off this table, so an unknown type
   **throws at part-construction time** — loud, which is fine.
2. `MACHINE_SPEED[type]` — **missing means a silent `|| 3` default**
   (`parts.js:502`).
3. `rideTime()`'s if/else chain (`parts.js:505-508`) has no `'pump'` branch,
   so **`work` silently stays 0 and `estimate()` under-counts** rather than
   erroring. **This is the one most likely to be missed.**

---

## PR 3 — the hoist (isolated on purpose)

**The first non-tile solid in the game.** There is nothing to reuse, and
that was checked rather than assumed:

- `Player` collision is **static-tile only**. Every contact goes through
  `solidCell` (`kid.js:413-430`); nothing in the class can be told "you are
  standing on an object". Entity contact today is only ever a one-frame
  *impulse* — `bounce()`, `struck()` — after which the player is airborne.
- **`mode === 'riding'` is not a precedent.** It reparents the kid's mesh
  into the seat node and teleports the physics body every frame
  (`main.js:487-503`); `player.update` is never called. It *suspends*
  collision rather than standing on anything.
- The girder becomes a **real tile** when seated (`pieces.js:164-183` calls
  `level.fillRow`) — which is precisely why it is not a moving platform.
- Tile meshes are built **once** per `Level` (`level.js:173-330`), so an
  animated tile has no home in the renderer either.

### The build

- **`Hoist` in a new `js/hoist.js`**, following `robots.js`'s entity shape
  exactly — `constructor(scene, level, def)` adding its own meshes to the
  passed group, `update(dt, reduced)` writing `group.position`, and
  loose-scalar predicates like `Robot.landedOn(x, y, hw, vy)`. Built in
  `buildSite()`, returned on `site`, updated in the loop beside the robots.
  **Everything must live inside `group` or it leaks on level change**
  (`main.js:344-345`).
- **A platform pass in `Player.update`, after the tile pass.** Falling, and
  the feet crossed the platform top this frame → snap to the top, ground
  him, record the carrier. Then carry him **the way the belt is carried**
  (`kid.js:435-438`): after the move, through `moveX` so walls still stop
  him, and **without touching `vx`** — he keeps full control on ground that
  disagrees with him. That is the house rule the belt already set.
- **`level.platforms`** as the list the player reads, so the new code reads
  `this.level.platforms` in the same style as `this.level.beltAt(...)`.
- **The reach model must learn it.** `parts.js:766-772` says so in a comment,
  and it bit last time: the gizmo lab reported its own bolts unreachable.
- `check()` rules generalising the ladder: travel clear of solids, bottom
  boardable from somewhere standable, top delivering somewhere standable.

### Where the time will actually go

Not the entity — the edge cases. Riding it down while jumping, stepping off
at the top, being carried into a ceiling, tunnelling through it at speed,
and the prover having no vocabulary for a floor that moves. **Budget for
that, and keep it out of the levels PR.**

---

## PR 4 — levels 4–6, the bot, and the docs alongside

### The rooms

Levels 4–6 into `js/rooms.js` on `WORLD2.md`'s beat tables, then
`rooms.mjs` until it stops complaining. Expect real iteration per room: 100
bolts, exactly 3 golden, a midway checkpoint, the ride in the back half, and
the flag past everything.

### The playthrough bot learns the new verbs

It has stalled on an unknown verb **once already** (the climb), for a full
five-minute budget.

- `need()` (`playthrough.cjs:50-64`) knows only bank / wall / girder — a
  `pump` job needs a fourth entry.
- **The hoist is the harder case.** The bot holds `right` every tick on foot
  (`:100`), which walks it straight off a platform. *"Stand still and wait
  for it"* is genuinely new behaviour, not a tweak.

### Docs alongside

- **`ASSET_PLAN.md` §4 is stale** — it still plans worlds 2–4 as *scaffold
  heights / demolition / night-shift*, flagged
  `[ASSUME — world list is design's call]`. DESIGN §4.2 is the owner's later
  answer, so the ASSUME is resolved. **The art lane would otherwise build
  the wrong world.**
- `assets/manifest.json` — `pipeworks` layers, the two machines, the pieces,
  the `water` texture, all as `placeholder` drop points with node contracts
  written down. Bump `v`.
- `assets/README.md` — node contracts for `pump_v1` / `pipelayer_v1` /
  `pipe_v1`, and the `pipeworks` rect table. **`smoke.cjs` parses this
  table**, so it is checked, not decorative.
- `DESIGN.md` — §0.2's built-state table gains the three new verbs; §6/§8
  gain world 2's queue.
- `VERSIONS.md` — **`v15.3`**, decimal, and it must record that **Phase B
  was started on explicit owner direction** past a Gate A that is an owner
  judgement, rather than looking like an agent jumping a gate.
- `hub/games.js` + `hub/versions.json` — refresh the eeri note/controls.
  Regenerate with `node scripts/versions.mjs`, do not hand-edit.

---

## 2. Lanes

Two agents editing one module is how two lineages start.

| file | lane |
|---|---|
| `js/rooms.js`, `js/parts.js`, `js/level.js`, `js/kid.js`, `js/hoist.js`, `test/**` | **Design/Level** |
| `js/main.js`, `js/palette.js`, `assets/manifest.json` | **SHARED — coordinate first, and say so in the commit message** |
| `ASSET_PLAN.md`, `assets/**`, `art-src/**` | **Art** |

## 3. Verification

```
node eeri/test/rooms.mjs                                 # geometry + every new rule bites
NODE_PATH=$(npm root -g) node eeri/test/smoke.cjs        # the game
NODE_PATH=$(npm root -g) node eeri/test/playthrough.cjs  # a bot finishes levels 1-6
NODE_PATH=$(npm root -g) node eeri/test/dev-menu.mjs     # main's own
NODE_PATH=$(npm root -g) node eeri/test/fx-smoke.mjs     # main's own
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs         # the cabinet
```

**Run them one at a time.** Two browser gates in parallel starve each other
on a software renderer and fail on movement timings that look exactly like
real regressions. That cost a debugging pass in the session that wrote this.

Specifically:

- Every new `check()` rule needs a **room broken on purpose** in
  `rooms.mjs`. The pattern is `bites(name, room, expect)`, which matches a
  **lower-cased substring of the problem message** — so each new rule needs
  a distinctive phrase. Use the existing `furniture()` / `hundred` fillers so
  a bad room breaks exactly one rule.
- `playthrough.cjs` must finish **six** levels, and its **COST** figure per
  level is the readable measure of whether World 2 is hostile.
- `smoke.cjs`'s one-token-per-module check must stay green — `hoist.js` gets
  exactly one token everywhere it is imported.
- **Falling into deep water must hand you to the near lip**, not to any
  fixed column. That is the regression guard for the P0 in #234.

## 4. The rules that are not negotiable

- **`main` is the only place to author.** `gh-pages` is a deploy target.
- **`git fetch origin main gh-pages` before starting**, and diff both. This
  project has produced four lineages; two of them were only discovered after
  the fact, and version numbers did not detect either.
- **Never reuse a version number.** Read the other lineage's `VERSIONS.md`
  before writing a heading.
- **Deploys never merge.**
