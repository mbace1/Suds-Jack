# Toko Move — current state / handoff

## Active work
- Branch: `toko-move-v212-live-network`
- PR: #385
- Target: v2.12 / hub 2012
- This branch version is authoritative while #385 is open.
- Current `main` was integrated through PR #405 into the feature branch, preserving concurrent agent work without modifying `main`.
- Expanded `movesuggestions.md` from main is preserved intact and remains the speculative design notebook.

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
- Dispatch exposes value, deadline, approaching services, ETA and transfer tradeoffs without naming one job as the correct answer.
- Hub tactics panel exposes several approaching services and walk exits simultaneously while waiting.
- Hub panel follows the notebook rule: **availability, not recommendation**.
- Near-miss feedback records when a service was catchable and then leaves the hub, showing `MISSED <line> · about Nt ago` for a short learning window.
- Explicit skill moments record `INTERCEPTED` when a walk turns into a catch within an 8-tick margin and `TIGHT CONNECTION` when a transfer is caught within 6 ticks.
- Skill moments are event hooks first, not a hidden score formula; later progression/reputation can consume them without changing the current core rules.
- Experimental recovery control allows `GET OFF AT <current stop>` before the suggested destination. The hidden delivery trip is marked consumed, the courier remains at the real intermediate anchor, and the active job is re-planned from there instead of failing.
- Early disembark emits a `REPLAN` moment. This prototypes the notebook principle that mistakes and intentional deviations should create new routing problems rather than hard fail states.

## Important files
- `toko-move/js/live-network.js` — gameplay fleet, exact-path positions, vehicle identity/selection/highlight.
- `toko-move/js/hubs-walking.js` — transfer hubs + simplified walking links.
- `toko-move/js/mobility-v212.js` — physical ride identity, target-arrival latch, manual transfer/disembark, walking.
- `toko-move/js/interception-v212.js` — walk-to-intercept planner.
- `toko-move/js/job-board-v212.js` — concurrent local job offers with live tradeoff information, no solved recommendation.
- `toko-move/js/hub-tactics-v212.js` — multi-option hub availability + near-miss feedback.
- `toko-move/js/moments-v212.js` — modular explicit skill-moment events for interception and tight transfers.
- `toko-move/js/recovery-v212.js` — experimental early-disembark / re-plan control.
- `toko-move/js/route-choice.js` — waiting UI, arrival-gated boarding, current/next stop UI, GET OFF/WALK/interception actions.
- `toko-move/js/main-v212.js` — v2.12 runtime overlays, dispatch board, hub tactics, skill moments, recovery, interception guidance, animated walker.
- `toko-move/js/deliveries.js` — dispatch offer generation, scoring/progression, fixed-service delivery trips.

## Source rules
- HSL GTFS geometry stays exact; never present authored approximation as real HSL geometry.
- Walking links are gameplay abstractions, not exact pedestrian navigation.
- OSM coastline edges are open lines; never close/fill them.
- Keep HSL/OSM attribution.

## Extended-feature candidates from `movesuggestions.md`
Keep these modular until the core loop proves their value: client-specific reputation, day-phase job pressure, authored weather/scenario modifiers, post-run route replay, daily seeded challenges, contextual information upgrades, audio/haptic opportunity cues, and optional live-HSL ambient/reference mode. None of these should alter factual HSL geometry or masquerade as live data.

## Next larger steps
1. Browser-test dispatch -> catch -> ride -> early exit/transfer -> get off -> next dispatch, including near-miss and walk interception states.
2. Remove RouteDrawer from Toko Move source and consolidate the v210/v211/v212 wrapper chain.
3. Make selected visible vehicles the sole ride simulation, removing the duplicate flow-core carrier.
4. Extend recovery from early exit to deliberately boarding a non-suggested service, while keeping it recoverable and legible.
5. Move from one chosen job at a time toward two simultaneous active jobs only after the dispatch board is stable and readable.

Strategic question: **What opportunities are moving through Helsinki right now, and which one do I exploit?**
