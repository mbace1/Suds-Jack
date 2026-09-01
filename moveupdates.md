# Toko Move — current state / handoff

## Active work
- Branch: `toko-move-v212-live-network`
- PR: #385
- Target: v2.12 / hub 2012
- Gameplay code described below is still on PR #385 unless noted; rebase/refresh before merging because `main` may move independently.
- Agent handover with the full design rules and v2.12 architecture: root `TOKO_MOVE_CLAUDE_HANDOVER.md` (on the PR #385 branch until it merges).

## Lane status (recorded 2026-09-01)
Three lineages share the name; know which one you are touching.

1. **`main` — v2.11, canon.** The v2.x delivery game. Its `route-choice.js` shipped a
   missing `}` (the `for(const a of city.lines||[])` loop in `routeChoices` never closed)
   that killed the whole module graph — the page was dead on arrival until fixed on
   `claude/toko-move-transition`. The five bare-node gates under `toko-move/test/` are
   green on that branch and now run in CI.
2. **PR #385 (`toko-move-v212-live-network`) — v2.12.2, authoritative while open.**
   Runtime moved to the `core-v212.js`/`main-v212.js` chain; the v2.11 wrappers are
   legacy (see the handover doc). Its copy of `route-choice.js` carries the **same
   missing brace** at tip `6c03d296` — v2.12.2 is dead on arrival until it is added
   (verified: with that one brace the build boots clean). Its gates still test the
   v2.11 modules, which is how the syntax error survived unexercised — they need
   re-pointing at the v2.12 chain before merge.
3. **PR #306 (`claude/toko-move-graphics-zti7gj`) — v1 line-drawing lane, SUPERSEDED.**
   Tip `d516a9a5` (v14). Its v13 is what the live gh-pages cabinet still serves.
   Worth mining: the GTFS pipeline (already adopted), `city.js` folding/name logic,
   the sea-reconstruction analysis. Nobody resumes it without the owner asking.

Deploy rule: the live cabinet moves to v2 only after PR #385 lands with green gates,
and only on the owner's word. Deploys never merge.

Campaign scope: Helsinki is chapter 1 of four — Nagoya, New York, Tokyo follow.
`toko-move/CAMPAIGN.md` holds the per-city data paths and what Helsinki proved.

## Core rule
Toko Move is NOT a line-drawing game. The existing colored Helsinki HSL tram/metro network is the board. Player decisions are: **wait, catch, ride, get off/transfer, or walk**.

## Current PR #385 behavior
- Full exact GTFS tram/metro source layers visible.
- Deterministic gameplay vehicles circulate on exact source geometry; NOT live HSL realtime positions.
- Transfer hubs are stronger waiting/decision nodes.
- Simplified major-street walking graph connects selected hubs/anchors.
- CATCH only enables when a compatible visible gameplay vehicle reaches the current hub.
- The exact vehicle caught is stored as the ride identity and highlighted while aboard.
- Ride UI exposes vehicle id, line/mode, approximate current stop and next stop.
- Arrival is gated by both the delivery sub-trip completing and that same selected visible vehicle physically reaching its target hub. Vehicle target arrival is latched so timing mismatch cannot cause an early arrival or a missed stop.
- One-transfer suggestions board only the first physical vehicle to the transfer hub; they no longer auto-ride the second service.
- Transfer loop is now: ARRIVED -> GET OFF -> WAIT AT HUB -> catch a second real arriving vehicle.
- WALK consumes gameplay ticks and is blocked for transit-only cargo.
- Authored job progression advances only after the final physical ride of that authored leg.

## Important PR files
- `toko-move/js/live-network.js` — gameplay fleet, exact-path positions, vehicle identity/selection/highlight.
- `toko-move/js/hubs-walking.js` — transfer hubs + simplified walking links.
- `toko-move/js/mobility-v212.js` — physical ride identity, target-arrival latch, manual transfer/disembark, walking.
- `toko-move/js/route-choice.js` — waiting UI, arrival-gated boarding, current/next stop UI, GET OFF/WALK actions.
- `toko-move/js/deliveries.js` — fixed-service delivery trips; supports physical sub-rides whose destination is the selected ride leg endpoint.

## Cargo walking rule
Prototype: `modes:null` may walk (documents/hot food/parts/fresh food). Explicit transit-mode cargo may not walk (fragile/equipment/express/market goods).

## Source rules
- HSL GTFS geometry stays exact; never present authored approximation as real HSL geometry.
- Walking links are gameplay abstractions, not exact pedestrian navigation.
- OSM coastline edges are open lines; never close/fill them.
- Keep HSL/OSM attribution.

## Next
1. Browser-test PR #385 physical ride/transfer state and fix timing/state regressions before merge.
2. Long term remove the duplicate flow-core carrier concept from Toko Move; selected visible vehicle should become the sole ride simulation.
3. Animate walking and highlight interception opportunities.
4. Add multiple simultaneous jobs.
5. Remove `RouteDrawer` from Toko Move source and consolidate runtime wrappers.
6. Remove remaining line-building wording/HUD remnants.

Strategic question: **Wait for tram, transfer, or walk?**
