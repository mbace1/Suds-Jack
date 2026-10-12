# Hyper Daggers queue

The plan queue for Hyper Daggers only. The root `QUEUE.md` is the Toko Drop queue. Do not add Hyper Daggers items there, and do not add Toko items here.

`VERSIONS.md` stays the in-game version narrative. `versioncontrol.md` is the coordination log of what already landed. This file is what is planned, before the code starts.

## How this file works

Stable IDs, allocated high-water-mark. Every item is `HD-NNN`, from HD-001 upward. An ID is assigned once, when its block is written in this file, and is never reused, renumbered, or recycled, including after Dropped. These are not `Q-NNN`, so they cannot collide with the Toko queue.

One item per block, and blocks are append-mostly. Adding work appends a block. Do not reflow or re-sort a section to make it look tidy.

Status changes move exactly one line: the status line inside the block, and the block moves under the matching heading. Do not rewrite the body while changing status. If the plan changed, that is a separate edit.

Landing is recorded, not implied. When an item lands, its status line gains the commit SHA, and the pull request number if there was one.

The next plan is written here before the code starts, by whoever is building it (D-sign or Grok Build). Middler does not pick up Hyper Daggers features. Do not deploy or merge from this file. Mikael approves merges.

### Item template

```
### HD-000 — one-line title

- status: Queued
- size: S | M | L
- blocked-by: —
- design: the doc this follows, if there is one

Two or three sentences of what and why.
```

Statuses: Queued, In progress, Landed (with the SHA), Blocked, or Dropped. A dropped item stays in place. It is not deleted.

## Queued

### HD-002 — Unify scoring contract for all modes and seasons

- status: Landed (partial)
- size: M
- blocked-by: —
- design: PLATFORM.md, SEASONS.md, VERSIONS.md

Daily keys and board include season. Recap shows tier. Full death/complete path unification still open for v57.

### HD-003 — Polish main menu for seasons and modes

- status: Landed (partial)
- size: S
- blocked-by: —
- design: SEASONS.md (owner brief on menu labels)

Explicit mode buttons + ALL, grouped rows, best line shows season · mode. Touch/gamepad polish remains for v57.

### HD-004 — Daily seeded runs and remote leaderboard for all modes

- status: Landed (script ready)
- size: M
- blocked-by: —
- design: existing daily board skeleton in main.js

Script accepts season. Game sends season. Endpoint empty until deployed. Top-10 display ready.

### HD-005 — Feature completeness pass on current seasons

- status: Queued
- size: L
- blocked-by: HD-002
- design: SEASONS.md, VERSIONS.md v54

Verify Season 1 rubble/rockfall, Season 2 jumpable waves/tide/drain, and Season 3 truck/cargo/gaze all feed the pure timer correctly on PURE and HYPER. Confirm mobile and gamepad paths. Update VERSIONS.md and hub note.

## In progress

### HD-001 — short press jumps, hold fires

- status: In progress
- size: M
- blocked-by: —
- design: Mikael's locked gun grammar (this block)

A short press is a jump on sticks, mouse, and pad. Firing happens only while the button is held: mouse and pad stream after the stream delay, and touch streams while the right stick is held. Walking does not start the stream. A short press does not shotgun, and a short alt press (RMB/LT) does not dump a homing burst. Dash stays as it is. The old shotgun tap's height boost is not replaced.

## Landed

No items.

## Blocked

No items.

## Dropped

No items.
