# Toko Move — current state / handoff

## Current branch / PR
- Branch: `toko-move-v212-live-network`
- PR: #385
- Public target version: v2.12 / hub numeric 2012
- Base: `main` after merged v2.11

## Core design correction
Toko Move is **not** a line-drawing game. The player does not create tram routes.

The game board is the existing Helsinki HSL network:
- all colored tram and metro lines remain visible in normal gameplay
- player waits at transfer hubs/stops
- chooses an existing service
- catches it only when a gameplay vehicle reaches the hub
- rides it
- explicitly gets off at the arrival hub
- can walk along selected major-street links when cargo allows
- can use walking to reposition toward another hub and intercept a different service

Do not reintroduce player-drawn transit lines or language like `build a line`.

## Geography / source rules
- Transit geometry comes from the checked-in HSL GTFS pack.
- Exact source paths must remain exact; no authored approximation should be presented as real HSL geometry.
- The pack contains 30 tram source route layers + 4 metro source route layers.
- HSL source/license text already exists in the project.
- Coast/water context uses `flow-core/data/kallio-water-v1.json`.
- OSM water edges are open lines; never close/fill them.
- Major-street walking links are gameplay abstractions between real HSL-resolved anchors, not exact pedestrian navigation.

## Current gameplay loop
1. Job becomes active.
2. Courier waits at the current hub.
3. UI derives direct or one-transfer fixed HSL choices.
4. v2.12 checks the moving gameplay fleet.
5. `CATCH` is enabled only when that service has a gameplay vehicle at the current hub.
6. Catching injects the delivery trip pinned to that exact existing fixed service chain.
7. On arrival, completion is intercepted by the Toko Move mobility controller and the player must press `GET OFF`.
8. At a waiting hub, cargo that permits walking can choose one connected major-street link instead of waiting for transit.
9. Walking consumes gameplay ticks; on arrival at the next hub the player can catch transit or keep walking.
10. Authored multi-stop jobs return to a waiting state after each completed leg.

The moving vehicles are deterministic gameplay traffic on exact GTFS path geometry. They are **not live HSL realtime positions**.

## v2.12 files
### `toko-move/js/live-network.js`
Deterministic gameplay vehicles across every HSL tram/metro source layer. Exposes vehicle positions and nearest-vehicle checks.

### `toko-move/js/hubs-walking.js`
Selected transfer hubs and simplified major-street walking graph.

Current hubs include Rautatientori, Lasipalatsi, Kamppi, Hakaniemi, Sörnäinen, Töölöntori, Pasila, Kauppatori, Kalasatama, Ooppera and Länsiterminaali.

Current corridor layer includes simplified links inspired by Mannerheimintie, Helsinginkatu, Hämeentie, Kaivokatu/Simonkatu, Bulevardi/Hietalahdenkatu, Kaisaniemi, Eteläranta, Tyynenmerenkatu, Kalasatama and Pasila corridors.

### `toko-move/js/mobility-v212.js`
Toko Move–specific mobility controller layered around `DeliveryChallenge` without changing shared `flow-core`.

Responsibilities:
- virtual current hub after walking
- walking time/cost state
- cargo permission for walking
- interception of completed delivery trips so arrival waits for explicit `GET OFF`
- return to normal `DeliveryChallenge.step()` only after player disembarks

Walking cost is currently derived from straight-line distance between real resolved anchors and converted into coarse gameplay ticks. It is a gameplay cost, not a claim about real walking time.

### `toko-move/js/main-v212.js`
Wires the moving network, transfer hubs, walking overlay and `MobilityController` into the current runtime.

### `toko-move/js/route-choice.js`
Current behavior:
- keeps all HSL source layers visible in normal gameplay
- blocks line drawing
- shows direct / one-transfer fixed HSL choices
- estimates next gameplay vehicle arrival at the current hub
- disables CATCH until a relevant vehicle is at the hub
- shows explicit `GET OFF` action on arrival
- shows WALK alternatives from the current hub, including street/corridor name and tick cost
- walking is hidden/blocked for cargo whose existing mode restriction requires transit

### `toko-move/js/deliveries.js`
Existing delivery state machine. `catchChoice()` still pins trips to fixed runtime HSL routes. The v2.12 mobility controller wraps its step/current-location behavior rather than modifying shared flow-core.

## Cargo / walking behavior
Current rule is intentionally simple:
- cargo with `modes: null` may walk: documents, hot food, parts, fresh food
- cargo with explicit transit modes may not walk: fragile, equipment, express, market goods

This keeps the existing cargo rules coherent while the walking mechanic is being proven.

## Important technical debt
1. `toko-move/js/main.js` still imports/creates `RouteDrawer`; newer Toko Move code blocks drawing at input level. Remove it from Toko Move at source.
2. Wrapper chain is still `main-v212 -> main-v211 -> main-v210 -> main.js`. Consolidate soon.
3. `main.js` still has residual line-building wording/HUD behavior that newer layers patch over.
4. The visible gameplay vehicle and flow-core carrier are still separate concepts. CATCH is gated by the visible vehicle, then flow-core carries the injected trip. Bind them eventually.
5. Vehicle arrival is proximity along GTFS source path, not real schedule/headsign/realtime data.
6. Walking uses coarse gameplay tick cost and simplified street links; it is not exact pedestrian routing.
7. `GET OFF` currently gates challenge progression at the arrival hub, but the visible moving vehicle is not yet the same object as the flow-core carrier.
8. Transfer hubs are an initial gameplay set, not a claim that other HSL stops do not exist.

## Next recommended work
1. Make the visible selected vehicle the actual ride identity throughout boarding/travel/disembark.
2. Show current stop + next stop while aboard.
3. Make walking visually animate the courier between hubs instead of only changing state after a timer.
4. Highlight tram interception opportunities: `walk there now and catch this approaching tram`.
5. Expose multiple jobs at once so vehicle positions influence job choice.
6. Add service disruptions that alter vehicle frequency/waiting rather than fake geometry.
7. Consolidate wrappers and remove all line-drawing code paths from Toko Move proper.

## Visual hierarchy target
1. Colored HSL lines
2. Moving numbered vehicles
3. Transfer hubs
4. Major walkable streets
5. Minor HSL stops
6. Geographic context / coast / parks

The strategic question should remain:
**Wait for tram, transfer, or walk?**

The fantasy is a courier reading Helsinki's moving transit network, not designing it.
