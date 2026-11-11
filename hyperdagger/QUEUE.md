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

### HD-025 — A pad on a touch screen: it shoots, the menus can be walked, the run says what it wants

- status: In progress
- size: M
- blocked-by: —
- design: Mikael, 11 Nov 2026 playtest (iPad + DualSense) — *"Dualsense with ipad doesn't work well. The menus are hard to navigate. Controller doesn't shoot. Lack of communication of clear objectives. In general hard to read."*

Ahead of HD-024's remaining steps. The trigger was ignored in touch mode (0 daggers in 3 s held; 25 after). Pad hints in the pad's own shapes; the pause list cut to RESUME + five rows + MORE; a run progress strip, an objective line and a controls card; the HUD a size up on a tablet. Gate: `test/pad-tablet.cjs`.

### HD-024 — The top visual: sky, lit bodies, the sea as a surface, the platforms, SDF as the hero

- status: In progress
- size: L
- blocked-by: —
- design: Mikael, 11 Nov 2026 — asked *"What's the top visual we can aim for"*, given five gaps in order of payoff, answered *"All in order"*

In order, each looked at on a contact sheet before the next:

1. **The sky.** The largest thing in every frame and the least drawn. A season declares what hangs in it (`sky.air`): EMBER smoke lit from below, INCA the sun's shafts and gilded cloud bars, HAUL dusk stratus across a low sun and heat off the road.
2. **The world lights the bodies.** One shared shader term (`voxel.js`, `WORLD_LIGHT`): the season's key as a stepped modulation, a rim that follows the body's roundness, and the same four event lights the floor reads. `light` per season.
3. **INCA's sea as a surface.** The crest is a block mesh; a shaded, foaming face.
4. **HAUL's platforms.** Slabs with a cab. Built in code (no Blender or mesh generator in the cloud session), toward the landspeeder direction (HD-014).
5. **SDF as the hero look.** As far as it can go without a real GPU: budgets and a fallback. It does not become the default without frame times from a real phone.

All of it sits behind the switches the look already has: EFFECTS OFF and the lowest perf tier draw the sky and the bodies as they were. VOID stays the control.

### HD-023 — Three seasons, feature complete: a run can be finished, and finishing counts

- status: In progress
- size: L
- blocked-by: HD-022 (#640) — built on its branch
- design: Mikael, 11 Nov 2026 — *"Plan and execute to ship 3 seasons feature complete. Act as Game design and art direction"*; ROADMAP "Feature Complete Ship"

Looked at first (the back half of every season, and a bot that kills every body the instant it exists and is never touched):

- **Seasons 1 and 2 cannot be finished.** The season wave table (12 Oct) returns before the tuned HYPER director runs, and spawns about one skull per breathing gap. The clock drains 1 s/s and a skull pays 1 s. The perfect bot is dead at 31 s in EMBER with one kill, and INCA spawned nothing in its first 22 s. "Survive to 5:00" is on the menu and nobody can.
- The table's `kind` is a toast and nothing else: the roster (watchers, husks, brutes, spiders, blinkers, serpents, dreads, totems, thorns, the leviathan) never appears in a season. It draws from `Math.random` per frame, so pressure depends on frame rate and a daily seed is not a seed.
- `waveIdx` is never reset: a second run starts in the last act.
- HAUL's table is dead data (TRUCK has no director, so not even the toast).
- EMBER and INCA share one best (the key is the mode's).
- Every finished run is 300.0 s, tier S, and ties with every other; the menu does not know a season was cleared.

Design decisions (mine, as asked):

1. **The table steers the tuned director instead of replacing it.** An act is `{t, kind, name, density, gap}`. `density` multiplies the tuned budget or cadence (1 = as tuned), `kind` leans the picks (`skulls` → swarm, `heavies` → spike), `gap` is a real valley when the act opens, and the act is named on screen. EMBER gets the whole HYPER roster back; INCA keeps skulls only, on its own cadence; HAUL's acts drive the convoy's skull rate.
2. **INCA: the sea pays.** A crest you clear in the air buys 2 s. The sea was only a cost; in the wave-led acts there are few skulls to buy time from, and jumping it is the season's verb.
3. **The clock stays the score; a clear is ranked by kills.** A finished run is 300.0 s as before. Among clears, more kills is better: stored per season and mode, shown on the end screen and on the menu, with a seal on the season's tab.
4. **The run ends on a beat:** LAST STAND at 30 s to go, a count for the last ten.
5. INCA gets its own best; EMBER keeps the old key.

Out of scope: the pause menu's restyle, HD-014 landspeeders, HD-016, new sculpts.

Gate: `test/seasons.cjs` (acts open and are named, the roster arrives, a second run starts in act one, the crest pays through a real jump, a clear is saved and shown) and a bare-node check of the tables; the perfect bot must reach 300 s in seasons 1 and 2.

### HD-022 — The look: particles, fluids and light, a different one per season

- status: In progress
- size: L
- blocked-by: —
- design: Mikael, 10 Nov 2026 — *"Plan and execute the most visually impressive version of the game. Utilizing SDF and other systems that aren't that demanding but can be tweaked for impressive visuals. Including expert particle effects and fluids. Remember, seasons have slightly different styles and looks"*; `SEASONS.md` (a season is the arena's art); `ROADMAP.md` (the SDF track stays opt-in)
- gate: plan before code; one PR; Mikael's yes to merge; no rule, hitbox, timing or score changes

Read off screenshots of v60 in all three seasons: a kill is grey cubes on a black floor, a shot is invisible, and nothing in the frame is liquid or lit by what happens in it. The seasons differ in palette and arena, not in how a fight LOOKS.

Three cheap systems, each a module, each declared per season in `seasons.js` (`fx`), each scaled by the existing perf tiers and switchable from the pause menu:

1. **Particles** (`js/fx-particles.js`). Stateless: a particle is its birth record, and the vertex shader flies it (gravity, drag, one floor bounce, curl). Nothing is simulated on the CPU, so thousands cost two draw calls. Hard pixels and an ordered-dither fade, because the image is a coarse software raster and a soft alpha puff is the wrong language. Kinds: spark, ember, smoke, droplet, flash, ring.
2. **The floor is a fluid** (`js/fx-fluid.js`). A small ping-pong render target over the disc, read by the floor shader.
   - EMBER: kills spill a molten pool that spreads, crusts and cools, so a long run paints the arena.
   - INCA: the sea ripples. Steps, landings, nails, kills and the wave all ring it, the wave leaves a foam wake, and the sun's path bends through it.
   - HAUL: none. The road moves under you, so its liquids are smoke and fire in the air.
3. **Light from events.** A kill, a muzzle and an explosion light the floor around them for a few frames, in the season's colour.

Under RENDER · SDF only: an SDF body dies as **raymarched liquid** (a few smooth-unioned lobes in a bounded proxy, pooled) instead of only cubes. CLASSIC keeps its voxel deaths and gains the three systems above.

Per season:
- **EMBER** — fire in the dark: white-hot sparks that bounce, embers rising off the pools, low smoke, hot nail streaks.
- **INCA** — water and light: droplets and rings, spray off the crest, foam, glitter on the sun path, gold motes.
- **HAUL** — speed and smoke: missile flame and smoke swept back by the wind, fireballs, sparks under the convoy, dust streaks at road speed.

Not in this item: SDF as the default, new enemies or arenas (ROADMAP builds 4–5), the 300.0 scoring tie, any change to hit, damage, spawn or timing.

Exit: before/after screenshots of each season, a new gate (`test/fx-look.cjs`) that proves the effects fire, differ by season and switch off, `perf.cjs` and the whole existing suite green, and Mikael's look at it. Frame times on real hardware stay unmeasured here and are named as such.


## Landed

### HD-021 — One arena navigation per touch gesture

- status: Landed (#638, f8353e757)
- size: S
- blocked-by: —
- design: v60 live acceptance; preserve the existing test-arena route and record isolation

A real touch on the test-arena chip delivers both pointerup and touchend.
On the deployed site both handlers assign location.href and abort the first
navigation. Guard the shared handler once per menu render; retain native
keyboard activation and the original exit/record assertions. Add a delayed
navigation regression and prove the old implementation fails it.



### HD-020 — SDF on the live menu: RENDER · CLASSIC | SDF

- status: Landed (#628, fe9a50b73)
- size: S
- blocked-by: —
- design: Mikael, 22 Oct 2026 — *"Can you make an SDF toggle in the main menu?"*, *"It should also work"*; the SDF builds are #626 (`ROADMAP.md`, the SDF conversion track)

#626's SDF builds (the skull family, and since build 3 the Watcher and the Totem, with carved wounds) and their Classic / SDF choice move from the separate `/hyperdagger-sdf/` preview onto the live game's menu. The choice becomes one segmented row, RENDER · CLASSIC | SDF, so START fits a phone held sideways. Build 3's test-arena link becomes a header chip. CLASSIC stays the default, and `test/sdf-play.cjs` proves the choice reaches play in all three seasons.


### HD-019 — The menu is the season: pick 1-3, see its arena and rules, press START

- status: Landed (#624, a6f299ec)
- size: M
- blocked-by: —
- design: Mikael, 18 Oct 2026 — *"Redesign menu. Make it look very different and nicer. Only show season1-3, have the back ground and rules change as you choose it. Have a start button under neath"*

The menu offers seasons 1-3 only, as three tabs. Picking one builds that season's arena behind the menu, live, and shows its rules; START underneath starts it. Picking no longer starts a run. The mode row goes (the season declares its mode, v50), and RUN FREE / DAILY moves to the pause menu, applying from the next run (HD-004's daily runs keep their way in).

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
