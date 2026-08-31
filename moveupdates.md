# Toko Move — current state / handoff

## Active work
- Branch: `toko-move-v212-live-network`
- PR: #385
- Target: v2.12 / hub 2012
- This branch version is authoritative while #385 is open.

## Core rule
Toko Move is NOT a line-drawing game. The existing colored Helsinki HSL tram/metro network is the board. Player decisions are: **wait, catch, ride, get off/transfer, or walk**.

## Implemented on PR #385
- Full exact GTFS tram/metro source layers visible.
- Deterministic gameplay vehicles circulate on exact source geometry; NOT live HSL realtime positions.
- Transfer hubs are stronger waiting/decision nodes.
- Simplified major-street walking graph connects selected hubs/anchors.
- CATCH only enables when a compatible visible gameplay vehicle reaches the current hub.
- The exact vehicle caught is stored as the ride identity and highlighted while aboard.
- Ride UI exposes vehicle id, line/mode, approximate current stop and next stop.
- Arrival is now gated by TWO conditions: the flow delivery sub-trip has completed AND that same selected visible vehicle has physically reached its ride target hub. Vehicle target arrival is latched so timing mismatch cannot cause an early arrival or a missed stop.
- One-transfer suggestions now board only the first physical vehicle to the transfer hub. They no longer auto-ride the second service.
- At the transfer hub: ARRIVED -> GET OFF -> WAIT AT HUB -> catch a second real arriving vehicle.
- WALK consumes gameplay ticks and is blocked for transit-only cargo.
- Authored job progression only advances after the final physical ride of that authored leg.

## Important files
- `toko-move/js/live-network.js` — gameplay fleet, exact-path positions, vehicle identity/selection/highlight.
- `toko-move/js/hubs-walking.js` — transfer hubs + simplified walking links.
- `toko-move/js/mobility-v212.js` — physical ride identity, target-arrival latch, manual transfer/disembark, walking.
- `toko-move/js/route-choice.js` — waiting UI, arrival-gated boarding, current/next stop UI, GET OFF/WALK actions.
- `toko-move/js/deliveries.js` — fixed-service delivery trips; now supports physical sub-rides whose destination is the selected ride leg endpoint.

## Cargo walking rule
Prototype: `modes:null` may walk (documents/hot food/parts/fresh food). Explicit transit-mode cargo may not walk (fragile/equipment/express/market goods).

## Source rules
- HSL GTFS geometry stays exact; never present authored approximation as real HSL geometry.
- Walking links are gameplay abstractions, not exact pedestrian navigation.
- OSM coastline edges are open lines; never close/fill them.
- Keep HSL/OSM attribution.

## Technical debt / next
1. Browser-test the physical ride/transfer state against real v2.12 route choices and fix any timing/state regressions before merge.
2. The selected vehicle now gates arrival, but flow-core still advances its own abstract carrier underneath. Long term, remove that duplicate carrier concept from Toko Move rather than merely synchronizing the two.
3. Animate courier walking and highlight interception opportunities before choosing WALK.
4. Multiple simultaneous jobs so vehicle positions affect job selection.
5. Remove `RouteDrawer` from Toko Move source and consolidate `main-v212 -> main-v211 -> main-v210 -> main.js` wrappers.
6. Remove remaining line-building language/HUD remnants.

## Visual hierarchy
1. Colored HSL lines
2. Moving numbered vehicles
3. Transfer hubs
4. Major walkable streets
5. Minor HSL stops
6. Geography/coast/parks

Strategic question: **Wait for tram, transfer, or walk?**
