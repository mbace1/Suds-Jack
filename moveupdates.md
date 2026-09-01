# Toko Move — current state / handoff

## Active work
- Branch: `toko-move-v212-live-network`
- PR: #385
- Target: v2.12 / hub 2012
- This branch version is authoritative while #385 is open.
- Expanded `movesuggestions.md` from main is preserved on the feature branch and remains the speculative design notebook.

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
- WALK choices show whether a specific walk leads to a useful downstream catch.
- Courier walking is visibly animated between hubs.
- Dispatch board presents three concurrent local jobs after each delivery, always originating from the courier's actual current hub.
- Cargo-invalid jobs are disabled instead of allowing soft-locks.
- Dispatch no longer labels one job `BEST NOW`. It exposes value, deadline, approaching services, ETA and transfer tradeoffs so the player chooses.
- New hub tactics panel exposes several approaching services and walk exits simultaneously while waiting.
- Hub panel follows the notebook rule: **availability, not recommendation**.
- Near-miss feedback records when a service was catchable and then leaves the hub, showing `MISSED <line> · about Nt ago` for a short learning window.
- Waiting is therefore an active planning state rather than dead time.

## Important files
- `toko-move/js/live-network.js` — gameplay fleet, exact-path positions, vehicle identity/selection/highlight.
- `toko-move/js/hubs-walking.js` — transfer hubs + simplified walking links.
- `toko-move/js/mobility-v212.js` — physical ride identity, target-arrival latch, manual transfer/disembark, walking.
- `toko-move/js/interception-v212.js` — walk-to-intercept planner.
- `toko-move/js/job-board-v212.js` — concurrent local job offers with live tradeoff information, no solved recommendation.
- `toko-move/js/hub-tactics-v212.js` — multi-option hub availability + near-miss feedback.
- `toko-move/js/route-choice.js` — waiting UI, arrival-gated boarding, current/next stop UI, GET OFF/WALK/interception actions.
- `toko-move/js/main-v212.js` — v2.12 runtime overlays, dispatch board, hub tactics, interception guidance, animated walker.
- `toko-move/js/deliveries.js` — dispatch offer generation, scoring/progression, fixed-service delivery trips.

## Source rules
- HSL GTFS geometry stays exact; never present authored approximation as real HSL geometry.
- Walking links are gameplay abstractions, not exact pedestrian navigation.
- OSM coastline edges are open lines; never close/fill them.
- Keep HSL/OSM attribution.

## Next larger steps
1. Finish clean integration of the latest main drift without overwriting Radio Free / Skltr / other agents or main's expanded `movesuggestions.md`.
2. Browser-test dispatch -> catch -> ride -> transfer -> get off -> next dispatch, including near-miss and walk interception states.
3. Remove RouteDrawer from Toko Move source and consolidate the v210/v211/v212 wrapper chain.
4. Make selected visible vehicles the sole ride simulation, removing the duplicate flow-core carrier.
5. Continue implementing the strongest notebook loops: generous boarding windows, recoverable stay-aboard mistakes, multi-job overlap, soft-fail lateness, and contextual vehicle emphasis.

Strategic question: **What opportunities are moving through Helsinki right now, and which one do I exploit?**
