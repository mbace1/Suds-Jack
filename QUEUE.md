# Queue

The **work queue** for Toko Drop across both repos — this one
(`mbace1/Suds-Jack`, the Three.js build) and `mbace1/toko-drop-godot`. High-
level planning happens in design docs (here: `toko-drop/RUSH_DESIGN.md` and
friends; there: `design/`); this file is the ordered, reviewable list of what
that planning turned into, and which repo each piece is destined for.

It is a *queue*, not a status report. `VERSIONS.md` remains the living record
of what shipped in this repo (`PORT_STATUS.md` plays that role on the Godot
side); this file describes what is queued to change and who is holding it.
When an item lands, the relevant status doc gets updated in the same commit —
that rule does not change.

**IDs are shared across both repos' `QUEUE.md` files.** The Godot repo's
`QUEUE.md` was first and currently runs `Q-001`–`Q-024`; this file continues
the same sequence from `Q-025` rather than restarting at `Q-001`, so a commit
message or `git log -S "Q-NNN"` search means the same thing regardless of
which repo you're standing in. If you add an item here, check both files'
highest number first.

---

## How this file works with version control

The point of keeping the queue in git rather than in a tracker is that a
planning change and the code that satisfies it can arrive in the same commit,
reviewed together. That only holds if the file is built so two branches
editing it in parallel do not collide. Four rules make that true (identical
to the Godot repo's — one convention, not two):

**1. Stable IDs, allocated high-water-mark.** Every item is `Q-NNN`, assigned
once and never reused, renumbered or recycled — not even after a `Dropped`.
Take the next number above the highest that has *ever* appeared in **either**
repo's `QUEUE.md`, including in git history.

**2. One item per block, blocks are append-mostly.** Each item is a fenced
block under a status heading. Adding work appends a block; two branches
adding different items touch different lines and merge clean. Never reflow
or re-sort a whole section to make it look tidy — a cosmetic re-sort turns
every other open branch into a conflict.

**3. Status changes move exactly one line.** The `status:` line inside the
block, plus moving the block under the matching heading. Do not rewrite the
body while changing status; if the plan changed, that is a separate edit with
its own reasoning.

**4. Landing is recorded, not implied.** When an item lands, its status line
gains the commit SHA (and PR number, if there was one) that closed it. That
is what makes `git log -S "Q-NNN"` a complete history of one piece of work
across both repos.

Commit messages reference items as `Q-NNN` anywhere in the subject or body.
Branches carrying a single item are named `claude/<slug>-<qid>` or similar —
whatever the branch, the ID goes in the commit.

### Item template

Copy this block, take the next ID (check both repos' files first):

```
### Q-000 — one-line title

- status: Queued
- repo: toko-drop-godot | Suds-Jack | both
- size: S | M | L
- blocked-by: —
- design: design/SOME_DOC.md §N   (or a doc in this repo, e.g. RUSH_DESIGN.md §N)
- gate: what has to be green before this is done

Two or three sentences of what and why. Enough that someone picking it up
cold does not have to re-derive the reasoning, and no more — the reasoning
itself lives in the design doc this points at.
```

Statuses: `Queued` → `In progress` → `Landed` (with SHA) — or `Blocked`
(with what on) or `Dropped` (with why, kept in place, never deleted).

`repo:` is what "submit to repos" means in practice: an item marked
`toko-drop-godot` is planned here (or there) and *executed there*; its
landing SHA will be from that repository. Design work happens in one place
so the two builds do not drift; the code lands wherever it belongs. Per the
leadership split (`CLAUDE.md`'s Toko Drop section): a gameplay/mode/mechanic
item is designed in **this** repo first, then proposed to the Godot repo — a
graphics/physics item runs the other way.

---

## Queued

### Q-025 — Wire `rush.lives`, or cut it

- status: Queued
- repo: Suds-Jack
- size: S
- blocked-by: —
- design: RUSH_DESIGN.md §1.4
- gate: a Rush run either genuinely spends a banked life on death (reviving
  at full HP, decrementing `rush.lives`, ending the run only at 0), or the
  HUD life counter and `checkExtraLife()`/"EXTRA MAN!" machinery are removed

`TUNING.rush.lives` and `rush.checkExtraLife()` are fully wired to award and
display extra lives, but nothing ever calls `rush.loseLife()` — a Rush run
currently ends on the third hit (`player.hp` reaching 0) regardless of how
many lives are banked. Found while writing `RUSH_DESIGN.md`; it's a shipped-
code gap, not a design disagreement, so it belongs in review before the tier
system in that doc (§3) leans on "lives" meaning anything to a player.

### Q-026 — Verify Rush spawn supply at high `rush.level`

- status: Queued
- repo: Suds-Jack
- size: S
- blocked-by: —
- design: RUSH_DESIGN.md §3.2
- gate: a played or scripted sample of `getEnemySchedule()` output at
  `rush.level` 4–6, checked against the S-tier PAR kill rate (2.0 kills/s)
  in the same doc

`getEnemySchedule()` was tuned for the base game's wave pacing and is reused
under Rush by substituting `rush.level` for wave count. The Godot repo's own
(unshipped) Rush design found its spawn director had a hard supply ceiling
below B tier until telegraphs were made to pipeline
(`design/RUSH_TIERS_AND_LEVELS.md` §5) — this build's schedule has never been
checked against Rush's own roster/pacing for the same failure mode.

### Q-027 — Implement the Rush S/A/B/C tier + leg-goal system

- status: Queued
- repo: Suds-Jack
- size: M
- blocked-by: Q-025, Q-026 (the numbers this depends on need to be real
  before the UI ships against them)
- design: RUSH_DESIGN.md §3
- gate: per-level PAR kill table live in the HUD, stamped ladder on the run
  summary, all three goal slots (UNTOUCHED / UNBROKEN / NEVER LOCKED) and the
  star tracked and shown, `scripts/cabinets.sh` and the Rush smoke/playthrough
  gates stay green

The design (adapted from the Godot repo's unshipped `design/RUSH_TIERS_AND_LEVELS.md`,
reconciled against what actually shipped — RUSH_DESIGN.md §4 records every
place the two disagree and why) is finished; the numbers are explicitly
PROPOSED and expected to move after first playtest. Implement against the
method, not the specific thresholds.

---

## Landed

*(nothing queued here yet has landed — see each repo's own `VERSIONS.md` /
`PORT_STATUS.md` for what shipped before this file existed.)*
