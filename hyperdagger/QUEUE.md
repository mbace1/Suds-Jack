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

No items. This queue is empty on purpose. Nothing here is waiting to be built.

HD-001 is written. It is the In progress block, not a second item.

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
