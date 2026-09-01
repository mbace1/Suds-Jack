# Toko Move — current state / handoff

## Active work
- Branch: `toko-move-v212-live-network`
- PR: #385
- Target: v2.12 / hub 2012
- This branch version is authoritative while #385 is open.
- Current `main` was integrated through PR #405 into the feature branch, preserving concurrent agent work without modifying `main`.
- Expanded `movesuggestions.md` from main is preserved intact and remains the speculative design notebook.

## Core rule
Toko Move is NOT a line-drawing game. The existing colored Helsinki HSL tram/metro network is the board. Player decisions are: **pick jobs, wait, catch, ride, get off/transfer, or walk**.

## Implemented on PR #385
- Full exact GTFS tram/metro source layers visible.
- Deterministic gameplay vehicles circulate on exact source geometry; NOT live HSL realtime positions.
- New `core-v212.js` is the active base runtime. It imports no `RouteDrawer`, has no draft/add-line state, and draws no fake nearby trams.
- `main-v212.js` now boots directly from that clean core; the legacy `main-v210 -> main-v211` wrapper chain is bypassed at runtime.
- Transfer hubs + simplified major-street walking graph.
- CATCH only enables when a compatible visible gameplay vehicle reaches the current hub **moving toward the selected leg**.
- Walk-interception forecasts are direction-aware too; wrong-way vehicles no longer count as catches.
- The exact visible vehicle caught is stored/highlighted as the ride identity.
- That selected visible vehicle is now the sole Toko Move ride simulation: delivery completion no longer waits for a duplicate hidden `flow-core` courier carrier.
- One-transfer choices board the first physical vehicle only; transfer remains ARRIVED -> GET OFF -> WAIT -> CATCH second visible vehicle.
- WALK consumes gameplay ticks and respects cargo restrictions; courier walking is visibly animated.
- Dispatch offers three local jobs; a second job can be collected at the same pickup hub and delivery order can be changed before departure.
- Dispatch exposes value, deadline, approaching services, ETA and transfer tradeoffs without naming one correct answer.
- Hub tactics exposes several approaching services + walk exits simultaneously.
- Near-miss feedback teaches closed catch windows.
- Skill moments emit `INTERCEPTED`, `TIGHT CONNECTION`, and `REPLAN` as modular event hooks rather than hidden scoring.
- Early disembark lets the courier leave at an intermediate gameplay anchor and re-plan instead of hard failing.

## Important files
- `toko-move/js/core-v212.js` — clean no-drawing base runtime, exact HSL rendering, water/context, HUD and boot lifecycle.
- `toko-move/js/live-network.js` — deterministic exact-path gameplay fleet, direction-aware lookup, vehicle identity/selection/highlight.
- `toko-move/js/mobility-v212.js` — authoritative physical ride state, transfer/disembark and walking.
- `toko-move/js/deliveries.js` — dispatch/two-job carry/scoring; creates lightweight physical ride tokens rather than `flow.inject` delivery carriers.
- `toko-move/js/hubs-walking.js` — transfer hubs + simplified walking links.
- `toko-move/js/interception-v212.js` — direction-aware walk-to-intercept planner.
- `toko-move/js/job-board-v212.js` — concurrent local job offers with neutral live tradeoff information.
- `toko-move/js/hub-tactics-v212.js` — multi-option hub availability + near-miss feedback.
- `toko-move/js/moments-v212.js` — modular skill-moment events.
- `toko-move/js/recovery-v212.js` — early-disembark / re-plan control.
- `toko-move/js/route-choice.js` — direction-correct arrival-gated boarding, current/next stop UI, GET OFF/WALK/interception actions.
- `toko-move/js/main-v212.js` — v2.12.2 composition/overlays.

## Source rules
- HSL GTFS geometry stays exact; never present authored approximation as real HSL geometry.
- Walking links are gameplay abstractions, not exact pedestrian navigation.
- OSM coastline edges are open lines; never close/fill them.
- Keep HSL/OSM attribution.

## Extended-feature candidates from `movesuggestions.md`
Keep these modular until the core loop proves their value: client-specific reputation, day-phase job pressure, authored weather/scenario modifiers, post-run route replay, daily seeded challenges, contextual information upgrades, audio/haptic opportunity cues, and optional live-HSL ambient/reference mode. None should alter factual HSL geometry or masquerade as live data.

## Next larger steps
1. Browser-test the clean-core dispatch -> catch -> ride -> early exit/transfer -> get off -> second job/next dispatch loop.
2. Delete or quarantine unused legacy Toko Move wrappers only after browser gates prove nothing still references them.
3. Extend recovery to intentionally boarding a non-suggested service, preserving legibility and recovery.
4. Improve two-job overlap so riding time becomes real planning time rather than only a queued second destination.
5. Add scenario pressure by changing deterministic vehicle frequency/waiting, never HSL geometry.

Strategic question: **What opportunities are moving through Helsinki right now, and which one do I exploit?**
