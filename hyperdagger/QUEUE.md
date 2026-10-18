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

### HD-004 — Daily seeded runs and remote leaderboard for all modes

- status: Landed (script ready)
- size: M
- blocked-by: —
- design: existing daily board skeleton in main.js

Script accepts season. Game sends season. Endpoint empty until deployed. Top-10 display ready.

### HD-005 — Feature completeness pass on current seasons

- status: Landed (partial): seasons 1–2 pinned on PURE and HYPER, pad and touch (#604), and the daily best filed under the mode played (#605), via #619, a7b38706; Season 3 truck/cargo/gaze pins are still open
- size: L
- blocked-by: HD-002
- design: SEASONS.md, VERSIONS.md v54

Verify Season 1 rubble/rockfall, Season 2 jumpable waves/tide/drain, and Season 3 truck/cargo/gaze all feed the pure timer correctly on PURE and HYPER. Confirm mobile and gamepad paths. Update VERSIONS.md and hub note.


### HD-016 — The convoy crashes on its own

- status: Queued
- size: M
- blocked-by: HD-017 step 1 (the seeded convoy), HD-018
- design: Mikael, 17 Oct 2026 — yes to the convoy crashing on its own, Clustertruck's comedy at the cost of fairness
- gate: after HD-014 lands (both rewrite `convoy.js`); plan before code; separate PR; Mikael's yes to merge

From the 17 Oct comparison with Clustertruck. Today's trucks are polite drivers: FOLLOW never lets one drive through the truck ahead. So the only chaos is a jackknife the player causes with missiles, plus the scripted pile-up at 180 s. Clustertruck's trucks crash on their own, and the disaster is the joy.

Plan sketch:
- A crash is the existing fold (crawl, trailer swung across the lane, load spilled), so there is no new wreck state. It has two causes:
  - A REAR-END: now and then one truck ignores FOLLOW for a few seconds and closes on the truck ahead. On contact both jolt and the rear one folds.
  - A BLOWOUT: a truck at speed folds in the middle of a lane change.
- A one-second tell comes first: hazard lights blink and the truck wobbles. Surprise is the comedy. The tell keeps a fall the player's misread rather than a coin flip.
- It can happen to the truck you stand on. A crawling wreck is still floor (the pile-up proves it). The danger is being left behind while the convoy drives off, so the move is to jump ship.
- Rate: none in the first wave (learn the platforms), then roughly one every 20–30 s, and more after the finale. The rate is data on the season, measured with `hd-loop`, not set by eye.
- The way forward always holds: a crash never leaves the road ahead empty, because laying works off the frontmost truck within reach.
- Every roll comes from the run's own stream, so a daily run crashes the same way for everyone.
- Settled 18 Oct: the player does not shoot trucks or save crates, and the load is not the score (HD-018). A crash costs nothing directly. The danger is being left behind on a wreck.

### HD-017 — Hand-built roads on some days

- status: Queued
- size: L
- blocked-by: —
- design: Mikael, 17 Oct 2026 — yes to some days using a hand-built road, for mastery and speedruns; 18 Oct — just one road for now; HD-004 (daily runs)
- gate: plan before code; step 1 is its own small PR; Mikael's yes to merge each step

Clustertruck's mastery comes from authored levels with lines you can learn. Season 3's road is generated. And, found while planning this item, it is not seeded either. `convoy.js` draws every gap, lane, deck height, speed and brake from `Math.random`. So a DAILY run shares the enemy schedule but every player gets a different road, and HD-004's promise that everyone faces the same seed does not hold for season 3.

Plan sketch:
1. Seed the convoy. A daily run draws its road from the run seed, so the same day gives everyone the same road. Free runs stay random. A check proves two daily runs lay the same trucks, and that a free run does not.
2. Segments are the authoring unit: short hand-built pieces of 10–20 s, written as data. Each lists every truck's lane, gap, deck height and speed, plus scripted events (brake at t, lane change at t, crash at t). A first set, as examples:
   - THE STAIRS: decks stepping up.
   - THE LADDER: gaps only the double jump clears.
   - THE WEAVE: lane changes under your feet.
   - THE BRAKE WALL: a row braking at once.
   - THE FUNNEL: one lane only.
3. ONE hand-built road for now (Mikael, 18 Oct). It is a named, fixed chain of segments out to 300 s, with the pile-up still at 180 s. On its day it replaces the generated road, and the goal card names it (TODAY'S ROAD: THE LADDER). The trucks drive their script, so a line can be learned, and nothing the player does changes it (since HD-018, v58, the missiles do not reach the trucks).
4. The daily board and run history stay keyed as they are (season:mode). The road's name rides on the entry.
- Later: generated days could draw from the same segments, so the hand-built pieces turn up in ordinary runs too.
- Schedule, as read from "just one for now": one road, and it is the daily one day a week, the same road every week, so a player races their own last time. Correct this line if that is not what was meant.

## In progress

### HD-014 — Season 3 trucks become floating landspeeders

- status: In progress (#598, #599, #600, #602, #603, #607, #613)
- size: M
- blocked-by: HD-006
- design: NOTES.md (12 Oct 2026, Mikael design direction)
- gate: after HD-006; plan before code; separate PR; Mikael's yes to merge

From NOTES.md (12 Oct 2026), Mikael's design direction: highway trucks become floating landspeeder platforms — no wheels, they hover, and cargo still rides on them. Cargo and haul rules stay the same so existing haul checks still mean something.

Plan sketch: change the truck mesh/visuals only — remove wheels, add a hover height or bob, and a glow or thruster under the hull. Do not change collision, cargo attachment, jackknife, haul scoring, or tests. Keep the existing haul and smoke checks green.

Note, 18 Oct (HD-018, v58): there is no haul scoring any more, and the missiles no longer jackknife a truck. The fold itself stays, for the pile-up and HD-016. Read "do not change haul scoring" as "do not bring a cargo score back", and "jackknife" as the fold.

## Landed

### HD-001 — short press jumps, hold fires

- status: Landed (#587, via #619, a7b38706)
- size: M
- blocked-by: —
- design: Mikael's locked gun grammar (this block)

A short press is a jump on sticks, mouse, and pad. Firing happens only while the button is held: mouse and pad stream after the stream delay, and touch streams while the right stick is held. Walking does not start the stream. A short press does not shotgun, and a short alt press (RMB/LT) does not dump a homing burst. Dash stays as it is. The old shotgun tap's height boost is not replaced.

### HD-002 — Unify scoring contract for all modes and seasons

- status: Landed (#605, #606, #609, via #619, a7b38706)
- size: M
- blocked-by: —
- design: PLATFORM.md, SEASONS.md, VERSIONS.md

Daily keys and board include season. Recap shows tier. Full death/complete path unification still open for v57.

### HD-003 — Polish main menu for seasons and modes

- status: Landed (#591, #610, #611, #612, via #619, a7b38706)
- size: S
- blocked-by: —
- design: SEASONS.md (owner brief on menu labels)

Explicit mode buttons + ALL, grouped rows, best line shows season · mode. Touch/gamepad polish remains for v57.

### HD-006 — Season 3 new runs must survive the first five seconds

- status: Landed (#590, 603e76d)
- size: M
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), new Season 3 runs died at 1.3 s and 0.7 s with 0 kills, death screen "felled by something". Free mode on the truck highway shows the same deaths (2.0, 0.7, 2.0 s). Add a headless test that a new run survives the first 5 s with no input so spawn kills cannot return silently.

### HD-007 — Name the killer on every death screen

- status: Landed (#592, via #619, a7b38706)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), the death screen said "felled by something", which teaches the player nothing. Every enemy and hazard, in every season, must supply a real killer name on the death screen. Never fall back to "something".

### HD-008 — Keep the kill counter visible during runs

- status: Landed (#593, via #619, a7b38706)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), the kill counter shows before a run but disappears from the HUD in seasons 1 and 2. Keep it visible for the whole run so players can track kills without leaving the season.

### HD-009 — Verify fire, jump, and dash feedback in seasons 1 and 2

- status: Landed (#594, via #619, a7b38706)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), fire, jump, and dash had no visible feedback in seasons 1 and 2; the browser ran ~5x slow, so the miss may be frame-rate. Check muzzle flash, dash streak, and jump puff before adding new VFX.

### HD-010 — Season start goal card and clear clock HUD copy

- status: Landed (#595, via #619, a7b38706)
- size: M
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), the season clock counts down without explaining what it scores, and Season 3's "load 36 · +0s" is opaque. Show a one-line goal card at each season start (survive, haul crates, etc.), label what the countdown means, and explain Season 3's load line.

### HD-011 — Perf budget smoke check and delta-time clamp review

- status: Landed (#597, via #619, a7b38706)
- size: M
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest)

From NOTES.md (12 Oct 2026), the box browser ran ~5x slower than real time, so slow devices can silently play in slow motion. Add a perf budget smoke check and review delta-time clamping so underpowered clients fail loudly instead of distorting feel.


### HD-012 — Death-screen load debug line overlaps HUB

- status: Landed (#596, via #619, a7b38706)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest, free.png)

From NOTES.md (12 Oct 2026 free mode), the debug line "load 33 · +0s" sits on top of the HUB button on the death screen (free.png). Move or hide that line so the HUB control stays readable and clickable.

### HD-013 — Desktop start click must lock the mouse for look

- status: Landed (#596, via #619, a7b38706)
- size: S
- blocked-by: —
- design: NOTES.md (12 Oct 2026 playtest, free-midrun.png)

From NOTES.md (12 Oct 2026 free mode), the run-start click does not lock the mouse on desktop, so mouse look never engages (free-midrun.png). Capture the pointer on start so look works without a second click.

### HD-018 — Season 3: no truck shots, no crate saves, the load is not the score

- status: Landed (#622, 61a45808)
- size: S
- blocked-by: —
- design: Mikael, 18 Oct 2026 — *"You don't shoot trucks.. or save crates"*, then *"Sure"* to taking out the three mechanics that let you

v53 made the cabs gaze targets (three missiles jackknife a truck). v54 let a stomp set a loose crate back for +1 s, and made the run's time the clock plus the load (−1 s per spill). All three came from a "go ahead on all" round, not a brief. HD-018 takes them out:
- The look locks skulls only.
- A stomp saves nothing.
- The clock is the run time again (TIME SURVIVED, the TRUCK mode's words).

Crates still ride and spill as floor and spectacle, and the fold stays for the pile-up and HD-016. The convoy's now-unused hit and cab proxy, and the cargo's unused stomp, are removed with HD-016, so that the HD-014 stack's files are not touched twice.

## Blocked

No items.

## Dropped

No items.
