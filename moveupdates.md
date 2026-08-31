# Toko Move — current state / handoff

## Current branch / PR
- Active gameplay branch: `toko-move-v212-live-network`
- PR: #385
- Public target version: v2.12 / hub numeric 2012
- `main` may advance independently; rebase/refresh before merging gameplay work.

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

## Current gameplay loop on PR #385
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

## v2.12 files on PR #385
- `toko-move/js/live-network.js` — deterministic gameplay vehicles across exact HSL source layers.
- `toko-move/js/hubs-walking.js` — selected transfer hubs and simplified major-street walking graph.
- `toko-move/js/mobility-v212.js` — Toko Move mobility controller for hub/walk/disembark state without changing shared `flow-core`.
- `toko-move/js/main-v212.js` — wires moving network, hubs, walking layer, and mobility.
- `toko-move/js/route-choice.js` — route choices, arrival-gated CATCH, GET OFF, WALK actions.
- `toko-move/js/deliveries.js` — delivery state machine; still pins trips to fixed runtime HSL routes.

## Cargo / walking rule
Current prototype rule:
- may walk: documents, hot food, parts, fresh food (`modes: null`)
- transit only: fragile, equipment, express, market goods (explicit transit modes)

## Important technical debt
1. `toko-move/js/main.js` still imports/creates `RouteDrawer`; newer Toko Move code blocks drawing at input level. Remove it from Toko Move at source.
2. Wrapper chain remains `main-v212 -> main-v211 -> main-v210 -> main.js`; consolidate.
3. Residual line-building wording/HUD behavior remains underneath newer layers.
4. Visible gameplay vehicle and flow-core carrier are still separate concepts. Bind them.
5. Vehicle arrival is gameplay proximity along GTFS source path, not realtime HSL.
6. Walking uses coarse gameplay tick cost and simplified street links, not exact pedestrian routing.
7. Transfer hubs are an initial gameplay set, not a claim that other HSL stops do not exist.

## Next recommended work
1. Bind selected visible vehicle identity through boarding, ride, and disembark.
2. Show current stop + next stop while aboard.
3. Animate courier walking between hubs.
4. Highlight interception opportunities: walk to another hub to catch an approaching tram.
5. Add multiple simultaneous jobs.
6. Add service disruptions through frequency/wait effects, never fake geometry.
7. Consolidate wrappers and remove line-drawing code paths from Toko Move proper.

## Visual hierarchy target
1. Colored HSL lines
2. Moving numbered vehicles
3. Transfer hubs
4. Major walkable streets
5. Minor HSL stops
6. Geographic context / coast / parks

The strategic question should remain: **Wait for tram, transfer, or walk?**

The fantasy is a courier reading Helsinki's moving transit network, not designing it.
