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

### Q-027 — Implement the Rush S/A/B/C tier + leg-goal system

- status: Queued
- repo: Suds-Jack
- size: M
- blocked-by: — (Q-025, Q-026 both landed)
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

### Q-025 — RUSH's dead life-counter is gone

- status: **Landed** in `991daf08` (`v226`)
- repo: Suds-Jack
- size: S
- blocked-by: —
- design: RUSH_DESIGN.md §1.4

Body corrected on landing — the original framing was wrong. `checkExtraLife()`'s
caller already grew `player.maxHp`/`hp` directly on every threshold; the
extra-life mechanic already worked. `rush.lives` was a separate, purely
internal counter nothing ever read (not the HUD, not `designer.js`, not
`lang.js`) — inert, not broken. Landed fix: removed `rush.lives` and the dead
`loseLife()`; `nextLife` (the real threshold gate) stays. No observable
behavior changed. A first pass at this branch added a revive-on-death
mechanic instead — reverted before merge, since that would have been a real
balance change, not a fix for what was actually wrong.

### Q-026 — Verify Rush spawn supply at high `rush.level`

- status: **Landed** in `5f767783` (finding, `Suds-Jack@main`) /
  `6e5ffa58` (reusable script, `scripts/rush-supply-sample.mjs`, `gh-pages`)
- repo: Suds-Jack
- size: S
- blocked-by: —
- design: RUSH_DESIGN.md §3.2

Sampled `getEnemySchedule()`'s spawn-side supply against the real `TUNING`
data at `rush.level` 1–7 (40 seeds/level). Unlike Godot's own finding (a hard
ceiling below B tier), this build's supply roughly *tracks* the S-tier PAR:
`'swarm'`/`'spike'`-kind levels clear it with room, plain `'normal'`-kind
levels (the majority) fall short by 0.05–0.3 kills/s — small enough to read
as "a tight ceiling," not "unreachable." Full table in `RUSH_DESIGN.md` §3.2.
