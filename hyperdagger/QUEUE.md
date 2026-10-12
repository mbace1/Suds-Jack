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

- status: Queued
- size: M
- blocked-by: —
- design: PLATFORM.md, SEASONS.md, VERSIONS.md

Make every mode and season combination report a single survival time as the score. Ensure both death and clean completeRun paths update personal bests, history, and daily tables. Standardize the recap to always show time, season, mode, and best delta.

### HD-003 — Polish main menu for seasons and modes

- status: Queued
- size: S
- blocked-by: —
- design: SEASONS.md (owner brief on menu labels)

Season buttons already exist. Add clear mode selector (or override), show current season blurb, personal best, and today's daily best on the title screen. Ensure gamepad and touch navigation covers the new controls.

### HD-004 — Daily seeded runs and remote leaderboard for all modes

- status: Queued
- size: M
- blocked-by: —
- design: existing daily board skeleton in main.js

Seed the director from UTC date + mode + season. Post finished runs (death or complete) to the existing Google Apps Script endpoint. Show top-10 and rank on the death/completion screen and today's best on the menu. Keep fully off if endpoint is empty.

### HD-005 — Feature completeness pass on current seasons

- status: Queued
- size: L
- blocked-by: HD-002
- design: SEASONS.md, VERSIONS.md v54

Verify Season 1 rubble/rockfall, Season 2 jumpable waves/tide/drain, and Season 3 truck/cargo/gaze all feed the pure timer correctly on PURE and HYPER. Confirm mobile and gamepad paths. Update VERSIONS.md and hub note.

## In progress

No items.

## Landed

No items.

## Blocked

No items.

## Dropped

No items.
