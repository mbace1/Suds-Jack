# Toko Move — current state / handoff

## Active work
- Branch: `toko-move-v212-live-network`
- PR: #385
- Target: v2.12 / hub 2012
- This branch version is authoritative while #385 is open.
- Drift with current `main` was resolved with a normal merge commit. Unrelated Turf / Radio Free / Skltr / asset work from `main` was preserved untouched. #385 returned to mergeable state after that integration.

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
- Arrival is gated by flow sub-trip completion AND that same selected visible vehicle physically reaching its ride target hub.
- One-transfer suggestions board only the first physical vehicle to the transfer hub.
- Transfer loop: ARRIVED -> GET OFF -> WAIT AT HUB -> catch a second real arriving vehicle.
- WALK consumes gameplay ticks and is blocked for transit-only cargo.
- Authored job progression advances only after the final physical ride of that authored leg.
- New interception planner evaluates each available walk link against the moving fleet at the destination hub.
- It ranks walk-to-catch opportunities using walk time + predicted wait for an exact gameplay vehicle that continues toward the delivery target.
- The best interception is now drawn directly on the map as a highlighted walking move with `WALK Xt · CATCH line +Yt` guidance.

## Important files
- `toko-move/js/live-network.js` — gameplay fleet, exact-path positions, vehicle identity/selection/highlight.
- `toko-move/js/hubs-walking.js` — transfer hubs + simplified walking links.
- `toko-move/js/mobility-v212.js` — physical ride identity, target-arrival latch, manual transfer/disembark, walking.
- `toko-move/js/interception-v212.js` — walk-to-intercept planner using the deterministic fleet.
- `toko-move/js/route-choice.js` — waiting UI, arrival-gated boarding, current/next stop UI, GET OFF/WALK actions.
- `toko-move/js/main-v212.js` — v2.12 runtime overlays plus visible interception recommendation.
- `toko-move/js/deliveries.js` — fixed-service delivery trips / physical sub-rides.

## Cargo walking rule
Prototype: `modes:null` may walk (documents/hot food/parts/fresh food). Explicit transit-mode cargo may not walk (fragile/equipment/express/market goods).

## Source rules
- HSL GTFS geometry stays exact; never present authored approximation as real HSL geometry.
- Walking links are gameplay abstractions, not exact pedestrian navigation.
- OSM coastline edges are open lines; never close/fill them.
- Keep HSL/OSM attribution.

## Next larger steps
1. Remove RouteDrawer from Toko Move source instead of blocking it at input level, and consolidate the v210/v211/v212 wrapper chain.
2. Make selected visible vehicles the sole ride simulation, removing the duplicate flow-core carrier for Toko Move rides.
3. Animate the courier physically along walking links and make interception success/failure visible second-to-second.
4. Add multiple simultaneous courier jobs so moving vehicle positions create meaningful job-selection decisions.
5. Add disruptions through vehicle frequency/waiting changes, never fake HSL geometry.

Strategic question: **Wait for tram, transfer, or walk?**
