# Toko Move — Claude Code handover

## Read this first

Toko Move is a Helsinki courier game built around the **existing HSL tram and metro network**. It is **not** a line-drawing game and must never regress into one.

The current active development branch is:

- `toko-move-v212-live-network`
- PR `#385`
- playable/version target: `v2.12.2`

The latest important visual correction is commit `523a2b1dbec3dda98a41d8b58de32d3cb7631286`.

## Non-negotiable design rules

1. **Do not draw transport lines from A to B.**
   - No RouteDrawer.
   - No player-created transit lines.
   - No straight/dashed route recommendation line between current location and destination.
   - No overlay that visually reads like the player is drawing a network.

2. **The full colored HSL tram + metro network is the game board.**
   - All exact source route layers should be visible in normal gameplay by default.
   - Colors come from HSL/GTFS route colors, with HSL fallbacks.
   - Geometry comes from the committed HSL source pack and must remain exact.
   - Do not fake, simplify, octolinearize, or hand-author routes and present them as HSL geometry.

3. **Moving gameplay vehicles run on those exact routes.**
   - They are deterministic gameplay vehicles, not live HSL realtime positions.
   - Catching must use the visible vehicle at the hub.
   - Direction matters: a vehicle going the wrong way is not a valid catch.

4. **Walking is a separate gameplay abstraction.**
   - Walking links connect selected hubs via major-street abstractions.
   - They are not exact pedestrian navigation.
   - Walking may be drawn as a neutral street layer, but it must not look like a transit route the player created.

5. **Do not break shared `flow-core`.**
   - `flow-core` is shared with Piritori and other systems.
   - Toko Move-specific behavior belongs under `toko-move/`.
   - `flow-core.addRoute` still exists for other products/tests; that does not mean Toko Move should use it.

## Current visual hierarchy

Normal gameplay should read in this order:

1. exact colored HSL tram/metro lines
2. moving numbered/colored vehicles
3. transfer hubs / important waiting points
4. major walkable streets
5. smaller stop/location labels
6. water/coast/geographic atmosphere

The HSL network should be the strongest structural layer. Do not obscure it with route guidance overlays.

## Current runtime architecture

Active files:

- `toko-move/index.html`
- `toko-move/js/core-v212.js`
- `toko-move/js/main-v212.js`
- `toko-move/js/transit-layers.js`
- `toko-move/js/live-network.js`
- `toko-move/js/route-choice.js`
- `toko-move/js/mobility-v212.js`
- `toko-move/js/hubs-walking.js`
- `toko-move/js/interception-v212.js`
- `toko-move/js/job-board-v212.js`
- `toko-move/js/hub-tactics-v212.js`
- `toko-move/js/moments-v212.js`
- `toko-move/js/recovery-v212.js`
- `toko-move/js/deliveries.js`

`core-v212.js` is the clean base runtime. It intentionally imports **no RouteDrawer** and has no player line-creation state.

`main-v212.js` composes the live vehicle, walking, hub, job-board and recovery systems on top of the clean core.

Legacy `main-v210.js` / `main-v211.js` wrappers are no longer the intended active architecture. Do not reintroduce them into the runtime chain.

## Why the recent regression happened

Even after RouteDrawer was bypassed, `main-v212.js` still drew a dashed interception line from the current hub to the walking/interception destination. Visually this looked like the old A→B route-drawing mechanic, even though the underlying HSL network existed.

Commit `523a2b1` removes that route-like interpolation and keeps interception guidance as local UI/label information instead. It also reinforces the exact colored HSL route layer in normal gameplay.

Do not re-add a map line for interception guidance.

## Current gameplay loop

- choose a local courier job
- inspect the moving network
- wait for a useful tram/metro or walk to reposition
- catch a visible compatible vehicle
- ride that exact vehicle
- get off / transfer / intentionally exit early if useful
- complete delivery
- choose next job

The player should constantly ask:

> What opportunities are moving through Helsinki right now, and which one do I exploit?

## Already implemented

- exact colored HSL route layers
- deterministic visible tram/metro fleet
- direction-aware catch logic
- direction-aware walk-to-intercept forecasting
- transfer hubs
- simplified walking network
- animated walking
- dispatch board with multiple local offers
- neutral tradeoff presentation; no single “correct route” recommendation
- second-job carry at same pickup hub
- hub tactics panel
- near-miss feedback
- `INTERCEPTED`, `TIGHT CONNECTION`, `REPLAN` event moments
- recoverable early disembark
- selected visible vehicle is the authoritative Toko Move ride state

## Design documents

- `moveupdates.md` = factual implementation state / technical handoff
- `movesuggestions.md` = Toko / Claude Code open design notebook; speculative ideas are allowed there and are **not automatically approved or implemented**

Always read both before larger gameplay/design changes.

## Extended-feature ideas worth preserving

Potential later systems from `movesuggestions.md` include:

- reputation by client/job type
- day-phase job pressure
- authored weather/scenario modifiers
- post-run route replay
- daily seeded challenges
- information upgrades
- audio/haptic opportunity cues
- optional live-HSL ambient/reference mode

Keep these modular. None may alter factual HSL geometry or masquerade as realtime HSL data unless explicitly implemented from a real realtime source and clearly labeled.

## Immediate next steps

1. Test the actual playable map visually and confirm **all colored HSL lines are visible at once** in normal gameplay.
2. Confirm there is **no route-like A→B guidance line anywhere** after choosing a job or walk/interception option.
3. Test full loop: dispatch → catch → ride → transfer / early exit → get off → delivery → next dispatch.
4. Verify wrong-direction vehicles cannot be caught or counted as interception opportunities.
5. Only after reference checking, quarantine/delete legacy Toko Move wrapper files that are genuinely unused.
6. Extend recoverable improvisation: allow deliberately boarding a non-suggested service without turning that into a hard fail.
7. Improve two-job planning while riding.

## Collaboration / other agents

Other agents are actively changing this repository. Do not overwrite their work.

Before integrating or merging:

- compare current `main` against `toko-move-v212-live-network`
- inspect which files changed on `main`
- preserve unrelated Skltr / Turf / Radio Free / other project changes
- if `main` moved, merge `main` **into the Toko Move feature branch** first
- resolve only real overlapping files
- do not force-push or rewrite shared branch history
- keep `movesuggestions.md` from `main` if it contains newer Toko design notes
- preserve the latest hub versions for other projects when updating `hub/versions.json`

## Hub/version rule

Playable builds should show a visible version number and the hub metadata should be updated when the build is actually published.

Current intended playable label: `v2.12.2`.

Do not claim a version is live/playable until the corresponding code is actually on the branch/environment the hub points to.

## Source/attribution rules

- HSL GTFS route geometry: exact source geometry; keep attribution/licensing intact.
- OSM water/coast: coastline edges are open directed lines; do not close/fill them as polygons.
- Keep HSL and OpenStreetMap credits visible where required.

## Final warning

If a change makes the map look like the player is **constructing a transit network**, it is almost certainly wrong for Toko Move.

The transit network already exists. The game is about **reading it, timing it, catching it, transferring through it, and exploiting it**.
