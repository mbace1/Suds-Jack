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

- status: Landed (partial); the open daily-key part is in progress (#605, #606); the shared run end is in progress (#609)
- size: M
- blocked-by: —
- design: PLATFORM.md, SEASONS.md, VERSIONS.md

Daily keys and board include season. Recap shows tier. Full death/complete path unification still open for v57.

### HD-003 — Polish main menu for seasons and modes

- status: Landed (partial); the open season-vs-saved-mode part is in progress (#591); touch/gamepad menu polish is in progress (#610, #611, #612)
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

## In progress

### HD-001 — short press jumps, hold fires

- status: In progress
- size: M
- blocked-by: —
- design: Mikael's locked gun grammar (this block)

A short press is a jump on sticks, mouse, and pad. Firing happens only while the button is held: mouse and pad stream after the stream delay, and touch streams while the right stick is held. Walking does not start the stream. A short press does not shotgun, and a short alt press (RMB/LT) does not dump a homing burst. Dash stays as it is. The old shotgun tap's height boost is not replaced.

### HD-005 — Feature completeness pass on current seasons

- status: In progress (#604)
- size: L
- blocked-by: HD-002
- design: SEASONS.md, VERSIONS.md v54

Verify Season 1 rubble/rockfall, Season 2 jumpable waves/tide/drain, and Season 3 truck/cargo/gaze all feed the pure timer correctly on PURE and HYPER. Confirm mobile and gamepad paths. Update VERSIONS.md and hub note.


### HD-007 — Name the killer on every death screen

- status: In progress (#592)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), the death screen said "felled by something", which teaches the player nothing. Every enemy and hazard, in every season, must supply a real killer name on the death screen. Never fall back to "something".

### HD-008 — Keep the kill counter visible during runs

- status: In progress (#593)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), the kill counter shows before a run but disappears from the HUD in seasons 1 and 2. Keep it visible for the whole run so players can track kills without leaving the season.

### HD-009 — Verify fire, jump, and dash feedback in seasons 1 and 2

- status: In progress (#594)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), fire, jump, and dash had no visible feedback in seasons 1 and 2; the browser ran ~5x slow, so the miss may be frame-rate. Check muzzle flash, dash streak, and jump puff before adding new VFX.

### HD-010 — Season start goal card and clear clock HUD copy

- status: In progress (#595)
- size: M
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), the season clock counts down without explaining what it scores, and Season 3's "load 36 · +0s" is opaque. Show a one-line goal card at each season start (survive, haul crates, etc.), label what the countdown means, and explain Season 3's load line.

### HD-011 — Perf budget smoke check and delta-time clamp review

- status: In progress (#597)
- size: M
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), the box browser ran ~5x slower than real time, so slow devices can silently play in slow motion. Add a perf budget smoke check and review delta-time clamping so underpowered clients fail loudly instead of distorting feel.


### HD-012 — Death-screen load debug line overlaps HUB

- status: In progress (#596)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest, free.png)

From NOTES.md (12 Oct 2026 free mode), the debug line "load 33 · +0s" sits on top of the HUB button on the death screen (free.png). Move or hide that line so the HUB control stays readable and clickable.

### HD-013 — Desktop start click must lock the mouse for look

- status: In progress (#596)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest, free-midrun.png)

From NOTES.md (12 Oct 2026 free mode), the run-start click does not lock the mouse on desktop, so mouse look never engages (free-midrun.png). Capture the pointer on start so look works without a second click.

### HD-014 — Season 3 trucks become floating landspeeders

- status: In progress (#598, #599, #600, #602, #603, #607, #613)
- size: M
- blocked-by: HD-006
- design: NOTES.md (12 Oct 2026, Mikael design direction)
- gate: after HD-006; plan before code; separate PR; Mikael's yes to merge

From NOTES.md (12 Oct 2026), Mikael's design direction: highway trucks become floating landspeeder platforms — no wheels, they hover, and cargo still rides on them. Cargo and haul rules stay the same so existing haul checks still mean something.

Plan sketch: change the truck mesh/visuals only — remove wheels, add a hover height or bob, and a glow or thruster under the hull. Do not change collision, cargo attachment, jackknife, haul scoring, or tests. Keep the existing haul and smoke checks green.

## Landed

### HD-006 — Season 3 new runs must survive the first five seconds

- status: Landed (#590, 603e76d)
- size: M
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), new Season 3 runs died at 1.3 s and 0.7 s with 0 kills, death screen "felled by something". Free mode on the truck highway shows the same deaths (2.0, 0.7, 2.0 s). Add a headless test that a new run survives the first 5 s with no input so spawn kills cannot return silently.

## Blocked

No items.

## Dropped

No items.
