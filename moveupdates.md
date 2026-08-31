# Toko Move — current state / handoff

## Active work
- Branch: `toko-move-v212-live-network`
- PR: #385
- Target: v2.12 / hub 2012
- `main` has a copy of this handoff, but this branch version is authoritative while #385 is open.

## Core rule
Toko Move is NOT a line-drawing game. The existing colored Helsinki HSL tram/metro network is the board. Player decisions are: **wait, catch, ride, get off/transfer, or walk**.

## v2.12 implemented on PR #385
- Full exact GTFS tram/metro source layers visible.
- Deterministic gameplay vehicles circulate on exact source geometry; these are NOT HSL realtime positions.
- Transfer hubs are stronger waiting/decision nodes.
- Simplified major-street walking graph connects selected hubs/anchors.
- CATCH is only enabled when a compatible gameplay vehicle reaches the current hub.
- WALK consumes gameplay ticks and is blocked for transit-only cargo.
- GET OFF explicitly gates progression at the arrival hub.
- The exact visible vehicle caught at the hub now becomes the ride identity (`vehicleId`) for the trip.
- `LiveNetwork.selectedVehicleId` highlights that same vehicle while the courier is aboard.
- Mobility ride state now derives approximate current + next gameplay stop from the selected vehicle's exact path position.
- Selection is cleared when walking, changing authored leg, or getting off.

## Important files
- `toko-move/js/live-network.js` — whole gameplay fleet, exact-path positions, vehicle lookup/selection/highlight.
- `toko-move/js/hubs-walking.js` — transfer hubs + simplified major-street walking links.
- `toko-move/js/mobility-v212.js` — walking, explicit disembark, selected ride identity, current/next stop state.
- `toko-move/js/route-choice.js` — arrival-gated boarding and interaction UI.
- `toko-move/js/main-v212.js` — v2.12 runtime wiring.
- `toko-move/js/deliveries.js` — existing job state machine / fixed HSL route injection.

## Cargo walking rule
Prototype: `modes:null` may walk (documents/hot food/parts/fresh food). Explicit transit-mode cargo may not walk (fragile/equipment/express/market goods).

## Geography/source rules
- HSL GTFS geometry stays exact; never present authored approximation as real HSL geometry.
- Major-street walking links are gameplay abstractions, not exact pedestrian navigation.
- OSM coastline edges are open lines; never close/fill them.
- Keep HSL/OSM attribution.

## Technical debt / next
1. Update ride UI to prominently display selected vehicle + current stop + next stop from mobility ride state.
2. The visible vehicle identity is now bound, but flow-core still advances the delivery carrier independently. Next deeper step is making ride completion depend on that selected vehicle reaching the destination/transfer hub.
3. For one-transfer route choices, make transfer fully manual: get off first vehicle, wait, catch second visible vehicle.
4. Animate courier walking between hubs and highlight useful interception opportunities before choosing WALK.
5. Multiple simultaneous jobs so moving vehicle positions affect job selection.
6. Remove `RouteDrawer` from Toko Move source and consolidate `main-v212 -> main-v211 -> main-v210 -> main.js` wrappers.
7. Remove remaining line-building language/HUD remnants.

## Visual hierarchy
1. Colored HSL lines
2. Moving numbered vehicles
3. Transfer hubs
4. Major walkable streets
5. Minor HSL stops
6. Geography/coast/parks

Strategic question: **Wait for tram, transfer, or walk?**
