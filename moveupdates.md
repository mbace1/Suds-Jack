# Toko Move — current state / handoff

## Current branch / PR
- Branch: `toko-move-v212-live-network`
- PR: #385
- Public target version: v2.12 / hub numeric 2012
- Base: `main` after merged v2.11

## Core design correction
Toko Move is **not** a line-drawing game. The player does not create tram routes.

The game board is the existing Helsinki HSL network:
- all colored tram and metro lines should remain visible in normal gameplay
- player waits at hubs/stops
- chooses an existing service
- catches it when a gameplay vehicle reaches the hub
- rides it
- gets off / transfers
- may later choose to walk between selected connected hubs

Do not reintroduce player-drawn transit lines or language like `build a line`.

## Geography / source rules
- Transit geometry comes from the checked-in HSL GTFS pack.
- Exact source paths must remain exact; no authored approximation should be presented as real HSL geometry.
- The pack contains 30 tram source route layers + 4 metro source route layers.
- HSL source/license text already exists in the project.
- Coast/water context uses the existing OSM extract in `flow-core/data/kallio-water-v1.json`.
- OSM water edges are open lines; never close/fill them.

## Current gameplay structure
The delivery campaign remains 10 jobs across 22 real HSL-resolved anchors.

Typical flow:
1. Job becomes active.
2. Courier waits at the current origin.
3. UI derives direct or one-transfer fixed HSL choices.
4. v2.12 now checks the moving gameplay fleet.
5. `CATCH` is enabled only when that service has a gameplay vehicle at the current hub.
6. Catching injects the delivery trip pinned to that exact existing fixed service chain.
7. On a multi-leg authored job, the next leg returns to a waiting state and requires another catch.

The moving vehicles are deterministic gameplay traffic on exact GTFS path geometry. They are **not live HSL realtime positions**.

## v2.12 files
### `toko-move/js/live-network.js`
Creates deterministic gameplay vehicles across every HSL tram/metro source layer. Exposes vehicle positions and nearest-vehicle checks.

### `toko-move/js/hubs-walking.js`
Defines selected transfer hubs and a deliberately simplified major-street walking graph. Walking links are gameplay abstractions, not exact pedestrian routing.

Current hubs include:
- Rautatientori
- Lasipalatsi
- Kamppi
- Hakaniemi
- Sörnäinen
- Töölöntori
- Pasila
- Kauppatori
- Kalasatama
- Ooppera
- Länsiterminaali

Current street/corridor layer includes simplified links inspired by:
- Mannerheimintie
- Helsinginkatu
- Hämeentie
- Kaivokatu / Simonkatu
- Bulevardi / Hietalahdenkatu
- Kaisaniemi corridor
- Eteläranta
- Tyynenmerenkatu
- Kalasatama corridor
- Pasila corridor

### `toko-move/js/main-v212.js`
Wires the moving network and transfer-hub / walking overlay into the v2.11 runtime.

### `toko-move/js/route-choice.js`
Current v2.12 behavior:
- keeps all HSL source layers visible in normal gameplay
- prevents player drawing on the map
- shows direct / one-transfer choices
- estimates when the next gameplay vehicle reaches the current hub
- disables CATCH until a relevant vehicle is at the hub
- labels waiting state / arrival estimate

### `toko-move/js/deliveries.js`
Delivery state machine. `catchChoice()` pins the trip to fixed runtime HSL routes. Transfers launch another waiting state.

## Important technical debt
1. `toko-move/js/main.js` is still the old underlying runtime and still imports/creates `RouteDrawer`. v2.11+ neutralizes drawing in `route-choice.js`. Proper cleanup should remove Toko Move's RouteDrawer entirely rather than relying on capture-phase input suppression.
2. Wrapper chain currently runs `main-v212 -> main-v211 -> main-v210 -> main.js`. Consolidate this soon instead of adding more wrappers.
3. `main.js` still contains old user-facing wording such as `build or transfer` and line-budget HUD code. v2.11/2.12 patches over some of this. Remove residual line-building language at source.
4. The moving gameplay vehicle overlay is separate from flow-core carrier simulation. Boarding currently gates on a visible gameplay vehicle, then the delivery is handled by flow-core fixed-route carriers. A future cleanup should unify those concepts or explicitly bind the selected gameplay vehicle to the actual ride state.
5. CATCH arrival uses proximity along the source path, not real HSL schedule/headsign data.
6. Walking is visual/data-only so far; no WALK action/time-cost state is implemented yet.
7. Selected transfer hubs are an initial gameplay set, not a statement that other HSL stops do not exist.

## Next recommended work
Priority order:
1. Make riding explicit: show `ON TRAM <line>` and current/next stop while the courier is aboard.
2. Make getting off explicit at transfer/destination hubs instead of fully implicit completion.
3. Add WALK as an alternative action only along `hubs-walking.js` links, with a clear time cost and cargo restrictions.
4. Allow walking to intercept a tram at another hub.
5. Expose multiple jobs at once so the player chooses work based on where vehicles are currently moving.
6. Add service disruptions that affect waiting/vehicle frequency rather than drawing fake closures.
7. Consolidate runtime wrappers and delete Toko Move line-drawing code paths.

## Visual hierarchy target
1. Colored HSL lines
2. Moving numbered vehicles
3. Transfer hubs
4. Major walkable streets
5. Minor HSL stops
6. Geographic context / coast / parks

The strategic question should become:
**Wait for tram, transfer, or walk?**

The intended game fantasy is a courier reading Helsinki's moving transit network, not designing it.
