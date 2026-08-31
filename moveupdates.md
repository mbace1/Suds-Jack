# Toko Move — current state / handoff

## Active work
- Branch: `toko-move-v212-live-network`
- PR: #385
- Target: v2.12 / hub 2012
- This branch version is authoritative while #385 is open.
- Drift with current `main` was resolved with a normal merge commit. Unrelated Turf / Radio Free / Skltr / asset work from `main` was preserved untouched.

## Core rule
Toko Move is NOT a line-drawing game. The existing colored Helsinki HSL tram/metro network is the board. Player decisions are: **pick a job, wait, catch, ride, get off/transfer, or walk**.

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
- Interception planner ranks walk-to-catch opportunities against the moving fleet.
- Best interception is drawn on the map as `WALK Xt · CATCH line +Yt`.
- WALK choices show whether that specific walk leads to a useful downstream catch.
- Courier walking is visibly animated between hubs.
- New dispatch board presents three concurrent job offers after each completed delivery.
- All offers originate at the courier's actual current hub; accepting a job never teleports the courier to a remote pickup.
- Job offers are ranked against the current moving network using first useful vehicle arrival, estimated ride/transfer cost, deadline and value.
- `BEST NOW` highlights the strongest current offer and can change as vehicle timing changes.
- Cargo-mode restrictions are applied before ranking; an offer that cannot be reached using its allowed transit modes is disabled instead of trapping the player.
- Completing a delivery leaves the courier at the real arrival hub and generates a fresh local dispatch board there.

## Important files
- `toko-move/js/live-network.js` — gameplay fleet, exact-path positions, vehicle identity/selection/highlight.
- `toko-move/js/hubs-walking.js` — transfer hubs + simplified walking links.
- `toko-move/js/mobility-v212.js` — physical ride identity, target-arrival latch, manual transfer/disembark, walking.
- `toko-move/js/interception-v212.js` — walk-to-intercept planner.
- `toko-move/js/job-board-v212.js` — concurrent local job offers ranked against live gameplay vehicle timing.
- `toko-move/js/route-choice.js` — waiting UI, arrival-gated boarding, current/next stop UI, GET OFF/WALK/interception actions.
- `toko-move/js/main-v212.js` — v2.12 runtime overlays, dispatch board mount, interception guidance, animated walker.
- `toko-move/js/deliveries.js` — dispatch offer generation, scoring/progression, fixed-service delivery trips.

## Source rules
- HSL GTFS geometry stays exact; never present authored approximation as real HSL geometry.
- Walking links are gameplay abstractions, not exact pedestrian navigation.
- OSM coastline edges are open lines; never close/fill them.
- Keep HSL/OSM attribution.

## Next larger steps
1. Browser-test the new dispatch board plus full catch/ride/get-off loop before merge.
2. Remove RouteDrawer from Toko Move source and consolidate the v210/v211/v212 wrapper chain.
3. Make selected visible vehicles the sole ride simulation, removing the duplicate flow-core carrier.
4. Add disruptions through vehicle frequency/waiting changes, never fake HSL geometry.
5. Expand major transfer-hub tactical UI without overwhelming the map.

Strategic question: **Which job is best now, then wait, transfer, or walk?**
