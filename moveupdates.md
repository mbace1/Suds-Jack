# Toko Move — current state / handoff

## Active work
- Branch: `toko-move-v212-live-network`
- PR: #385
- Target: v2.12 / hub 2012
- Gameplay code described below is still on PR #385 unless noted; rebase/refresh before merging because `main` may move independently.

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
