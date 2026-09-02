# Toko Move — versions

## v2.19 — 2026-09-02

**The camera.** The owner's reading of v2.18 was exact — "the map is clutter with fast moving objects" — and the fix is not fewer trams. It is a camera: the thing that decides what is NEAR right now. `js/camera.js` owns a centre, a zoom and the arithmetic; it owns no canvas and draws nothing, which is why `test/camera.mjs` can prove it in bare node (36 checks) instead of by looking at a screenshot.

**Three scales, snapped** (owner: "snap to 3 scales is primary option, but pinch to zoom second"). They are stated in METRES of viewport height and converted through the board, so they keep their meaning if an anchor moves the box: CITY = the whole 4.9 × 8.4 km board (×1), ROUTE = 4000 m so a 2 km radius fits (×2.10), STOP = 1300 m (×6.47). The rail sits over the map's own top-right corner, not in the HUD strip — the HUD is the shift, the rail is the map.

**Pinch, wheel, drag, double-tap** are all secondary and all present. Zoom is about the POINT, never the centre: a map that zooms to its own middle walks whatever you were looking at off the screen. Nearest-notch is judged in log space, because zoom is multiplicative and the boundary between ×1 and ×2.1 is ×1.45, not ×1.55 — a linear rule names a band you are not in at every notch.

**Follow has a dead zone** (42% of the viewport). Recentring on every metre the courier moves makes the map the thing that moves and the courier the thing that stands still, and then no landmark holds. A drag drops the follow — a pinch that also pans is a map sliding away under the gesture meant to scale it — and a ◎ appears to take it back.

**The fleet rule, the owner's words applied**: "when I zoom in the whole area can be the barrier but when zoomed out, only trams that will pass by me, and in a circle of 2km map scale". Zoomed in, the viewport is the only filter. At CITY scale a vehicle needs both: a line that passes within 180 m of where you stand, and a position inside the 2 km circle — measured with longitude scaled by cos(lat), or the circle is an ellipse on the ground. The vehicle you are riding is never filtered out of its own ride. **It hides badges, never lines**: every route stays drawn at full length at every scale, so the map still says what exists, and the HUD says `ROUTE · 9/102 near` so a filter is never mistaken for a bug.

**Label density follows the camera too.** Twenty-two names over the whole city is a wall of type at CITY scale; zoomed out the board now keeps only the names that are decisions — the transfer spots and the two ends of the job in hand. The dots stay drawn, so one zoom step brings any name back.

Two things found on the way. `boardRect()` is the board in canvas pixels and moves with the camera, so once you can zoom it is regularly wider than the screen — and the legend, the frame and the label placement all used it as "the area I may draw in", laying their work out against a rectangle three screens wide. `viewRect()` is the intersection, which is what those three meant all along. And `fitLatLon` rebuilt the entire projection on every call — a cos and two closures, per point, per path, per frame; affordable at one fixed scale, not once the answer changes continuously. It is memoised on the five numbers it depends on.

## v2.18 — 2026-09-02

The five-minute shift. flow-core's day is sixty seconds of wall time, built for Piritori's day simulation, and Toko Move had been running on it: a tram crossed Helsinki in three seconds, and every headway change made to keep catches reachable inside sixty seconds only added vehicles — 272 on screen at v2.17. `createFlow` now takes an optional `ticksPerDay` (flow-core's default is untouched; its contract passes 29/29), and Toko Move asks for 3000 ticks: 07:00–10:00 of game time in five minutes of wall time, a tram's 50-minute pass in about 83 seconds. Vehicles per line go from 8 back to 3. The HUD clock shows minutes.

Game-time quantities scale with the day — vehicle speed, deadlines, walking cost. Wall-time ones do not: the 120- and 80-tick lookahead horizons are 12 and 8 seconds at the shared tick rate and stay put, and the catch window is now stated as **seconds** (callers still pass 2.2; it means 2.2 seconds, inside Loop 18's 2–8 second window).

Vehicles are spaced **evenly** around the out-and-back cycle, offset per line by hash. They were hash-scattered, and scattered phases bunch: measured at Lasipalatsi from tick 0, the gap to the next same-direction vehicle reached 1453 ticks on a line whose even headway is 556. Evenly spaced, the worst gap is 508 (51 s) and the mean 229 (23 s) across all forty line-directions there.

Dispatch is constrained by the network (Loop 47). The first offer a bot took had no compatible vehicle for 1204 ticks — two minutes on the tutorial job — while five lines were arriving at that very hub. `refreshOffers` now draws six candidates and keeps three; when the live fleet is wired in, at least one kept offer has a catch inside 30 seconds, and on the first job that one leads (Loop 43). Bare-node gates install no judge and see the old behaviour.

Six modules were imported at two different cache tokens — `live-network`, `deliveries` (three!), `hubs-walking`, `transit-layers`, `board`, `route-choice` — which instantiates each twice and splits its state. All normalised to one token each.

Report card, five-minute shift: 4/6 delivered, score 756, late 0, riding 52% / waiting 44%, dead air 5%, first catch in 2 ticks, worst wait 519 (one headway), mean 183.

## v2.17 — 2026-09-02

The shift becomes playable, measured rather than asserted. Every number below came from `test/report.cjs` playing the real page, and each was set originally without anyone checking it against the clock it runs on.

**Vehicle speed is derived from the clock.** A tram took 2083 ticks to cross its route against a 600-tick shift — at 1.6 minutes per tick, 55.6 hours of game time for one pass, about 67x too slow. A stop saw ~0.3 tram arrivals per shift while every job needs a catch, and the first catchable vehicle appeared at tick 585 of 600: a shift completed nothing. Speed is now stated as what it means (`END_TO_END_MINUTES`, tram 50, metro 45) and converted through `ticksPerDay`.

**The catch window is in ticks.** It was a raw path-index distance, hardcoded 2.2 at six call sites, and a path index is not a unit of anything — 2.2 on a 241-point tram path is a different real distance from 2.2 on a 682-point metro path, and the time a vehicle spends inside it scales with speed. Fixing the speed alone therefore made catching *impossible*, verified: not one choice enabled in a whole shift.

**Headway tightened to 8 vehicles per line** — a tram every 3.9 ticks, 7.8 per direction, about a 13-minute headway. Completions went 0 → 3, waits to 9-30 ticks.

**A shift is six jobs, not ten.** A job's journey measures 50-230 ticks in a 600-tick day, so ten needed roughly 2.5x the hours available and the back half was unreachable however often the trams ran. The authored campaign is still ten (a chain, each job starting where the last ended); a shift plays six of it.

**A deadline allowed for flying, not riding.** Offers set `limit = 110 + dist*7` from the straight-line graph distance while the journey goes through the network with transfers at each change. Now `dist*16`.

Together: waiting fell from a shift that was 100% unfinishable to roughly half riding, dead air 3-8%, and jobs that complete and score.

Known and not fixed: the same job can take 59 or 220 ticks depending on where the vehicles happen to be — a 4x spread that no fixed deadline covers. A deadline derived from the chosen route's own estimate, rather than from distance, is the next question.

Also fixes three bugs in the report bot itself, each of which libelled the game before it was caught: dead air claimed to account for walking and did not, GET OFF was never pressed so finished rides read as zero completions, and completion accounting sat after a `continue` and never ran.

## v2.16 — 2026-09-02

The city layer becomes data, which is what a second chapter actually costs. `js/city-build.js` turns a city DEFINITION plus a source pack into a graph; `cities/helsinki.city.js` is chapter 1's definition and `js/real-helsinki.js` is a three-line door onto it. A definition owns which real stops its anchors resolve to, what each is called and what it is for, the walk links, and the per-mode speeds, capacities and vehicle counts — and owns no geometry at all, which still comes from the committed pack exactly as the agency published it.

`test/city-build.mjs` holds both halves of the claim rather than asserting them in prose. Helsinki's graph is compared against a **frozen fingerprint of the output the hand-written v2.11 builder produced** — every node's id, name, tags, capacity and projected position, every edge's endpoints, mode and time — so the generalisation is proved to have cost nothing. Then a second definition over the same pack builds a different working board with its own anchors, speeds, capacities and carrier counts, which is the bet chapter 2 rests on. Three definition failure modes fail at build time: an anchor that resolves to nothing, a walk link to a place not on the board, and a declared mode with no service through it. Five mutations run against the gate, all caught.

Nagoya remains blocked on data, and the blocker is recorded in `CAMPAIGN.md` §5: the sandboxed agent environment's egress proxy denies `api.odpt.org`, `overpass-api.de` and `api.openstreetmap.org` by policy, so it is a network limit rather than a missing token. Drawing the network by hand instead is explicitly ruled out — authored geometry presented as real is the one thing the canon forbids, and it would poison the chapter meant to prove the pipeline generalises.

## v2.15 — 2026-09-02

The key. Thirteen tram colours with nothing naming them is a code you break by tapping, so the families actually drawn on the board get a strip along the bottom in the same ink. It is built from the VISIBLE layers rather than from the palette — hiding a line in the MAP inspector takes it out of the key too, and a family added later appears without anyone maintaining a list. Grouped by ink rather than by family, because M1 and M2 deliberately share one colour (they share track across the whole board) and two identical orange chips side by side would ask a question the map does not mean to raise; they read as one `M1 M2` entry instead. It wraps rather than running off the frame.

## v2.14 — 2026-09-01

Stop names now draw LAST, after the moving vehicles, and step around them: they are the layer that identifies everything else and were being printed under whatever tram badge happened to be passing. `live-network.js`'s draw reports the boxes it painted so the label pass can avoid them.

The board answers questions. Tapping a stop opens what is APPROACHING it — line, mode, direction-aware, with a real ETA in the same ticks the deadlines use, plus its HSL stop identity and whether it is a transfer spot. It never names a route to take; the offers already present tradeoffs without an answer, and this is the same rule applied to the map. It binds `pointerup` AND `touchend`, never `click` — the trap `hub/shell.js` and the Toko signature both paid for. Two bugs found building it: the stop-to-path match compared raw degrees, so a stop matched about twice as far east-west as north-south, and the first cut reported the raw path-index gap as "stops out", which it never was — a vehicle covers `path.length-1` indices per `1/speed` ticks, so the gap converts to an actual ETA.

The five inherited gates now test the v2.12 runtime instead of the v2.11 modules it replaced — the reason a SyntaxError in a file the page imports sat here behind a green-looking suite. `version-sync` reads the v2.12 chain and asserts the superseded wrappers are out of the page; it also stops demanding hub == VERSIONS.md, since the hub advertises what is LIVE and the log records what has LANDED. Only one direction is ever wrong and it is the one that shipped on main — hub claiming 2.12.2 against a 2.11 tree. The hub may lag; it may never lead. `route-choice` walks the shipped dispatch loop rather than v2.11's auto-assigned job, and `real-helsinki` pins what replaced the deleted per-job events: the shift is one chain, the back half carries more pressure than the front, and every job has a deadline and a payout. All six gates are green together for the first time.

## v2.13 — 2026-09-01

The board. The map was drawn to the whole HSL pack while every delivery anchor sits inside 9.1% of its area, so the metro ran out to Espoo and Vuosaari and the twenty-two places you actually deliver to were a knot of overlapping labels in the middle. The viewport is now a gameplay box derived from the resolved anchors, the canvas takes that box's own shape, and everything outside it is clipped to a framed edge — the board is the board, not whatever the pack happens to reach.

Line identity replaces one flat green. GTFS `route_color` is null on all 34 lines, so the documented fallback was painting thirty distinct tram services in one indistinguishable colour; each tram FAMILY now carries its own ink (variants share it — 4, 4H and 4T are one corridor) with HSL's metro orange kept and pinned. The palette is solved, not picked: a hand-picked set measured 32 pairs under the house colour-distance convention, and maximising raw separation drives to the gamut corners, so the search was constrained to the product's own tonal range and the minimum perceptual gap maximised inside it — min dE76 37.0 across all fourteen. Recorded as an owner override at the top of `board.js`, since it contradicts `TRANSIT_LAYERS.md`'s colour rule while leaving its geometry rule fully intact.

Main streets are drawn as ground — thin, flat grey, under everything, no caps — from the same abstractions `hubs-walking.js` already declared for walking. Transfer spots are drawn as real interchange markers rather than plain stops, because they are where the game's decisions happen. Stop labels claim a box and pick a free side, transfer spots claiming first; a label with nowhere to go is dropped rather than printed through its neighbour (Lasipalatsi printed through Kamppi, Länsiterminaali ran off the frame as "siterminaali"). District names drop to a watermark under the network instead of competing at the same size.

One projection now serves the transit layers, water, roads, stops, live vehicles and the walker — `core-v212.js` publishes it as `tm.project` and `main-v212.js` reads it, replacing a second copy that computed the same thing. The old path went through `flow.graph.fit`, which letterboxes with `Math.min`: a portrait board in a landscape canvas is exactly how the city ended up squeezed into a column. Wide screens get the map beside the dispatch board; a phone keeps them stacked.

Also fixes the missing brace in `route-choice.js` that made this build a SyntaxError and took the whole ES module graph down with it.

`test/board.mjs` is the new gate — the box holds every anchor with room off the frame, the box stays a genuine crop, the aspect fit may only grow (never crop away a stop you deliver to), the projection is not mirrored or flipped, every tram family has ink, the palette holds its dE floor, roads stay quieter than every service, and each drawn street names a real anchor. All ten checks were mutation-tested.

## v2.11 — 2026-08-30

Route-choice pass. Each active delivery now derives up to three useful fixed-transit approaches from the real HSL gameplay services: direct routes first, then one-transfer alternatives ranked by stop count and transfer cost. The job sheet names the line, mode, direction and transfer station before the player commits. Suggested services are interactive: tapping one isolates its exact HSL source layer in the map inspector. This turns the real network into an explicit decision surface without reintroducing traveler clutter or inventing transit geometry. The v2.10 22-location board, escalating ten-job campaign, cargo constraints and late-shift events remain intact.

## v2.10 — 2026-08-29

Map-to-gameplay pass. The board expands to 22 HSL-resolved locations with Hietalahti, Meilahti, Arabia and Olympiaterminaali. Visual hierarchy is tightened around land/water, district context, the active origin/destination and useful transit. The ten-job shift is rebuilt as a teaching curve: short centre run, speed-sensitive food, west-harbour corridor, first transfer, transit-only medical cargo, rush-hour northbound work, a delayed north-east run, metro-window express work, a harbour multi-stop and a final tram-only circuit. Job events now add rush, delay and harbour pressure while keeping route geometry sourced from HSL. Passenger clutter remains suppressed and tram telegraphs stay on exact GTFS paths.

## v2.9 — 2026-08-29

Readable real-map pass. The delivery board expands from 12 to 18 HSL-resolved anchors, adding Lasipalatsi, Ooppera, Messukeskus, Länsiterminaali, Eira and Käpylä. The ten-job route is retuned around the actual HSL network and now ranges across south Helsinki, West Harbour, downtown, Töölö, Pasila, Käpylä, Kallio, Kalasatama and Katajanokka. Passenger queue/load marks are suppressed in Toko Move, while route-relevant tram cues move along exact GTFS paths near the current leg to telegraph useful options. Transit layers use GTFS route colours when present, with HSL tram green and metro orange only as source-compatible fallbacks. Selected stops get stronger emphasis and HSL stop identity. The map also restores real OpenStreetMap coastline/inland-water context from the committed ODbL extract where that extract covers the gameplay view.

## v2.8 — 2026-08-29

Real-map conversion. The committed HSL pack is now the full current network: 292 stops and 34 exact GTFS route layers, generated with zero shape tolerance. All 12 delivery anchors resolve to HSL stop identities and real geographic coordinates. Gameplay fixed services are derived from HSL stop sequences (22 useful services through the delivery board, including M1/M2), while the old authored tram/metro skeleton is no longer used. Raw HSL route geometry is drawn through the same geographic projection as the delivery anchors, each route remains independently toggleable/soloable, and the full MAP inspector now derives its viewport from source geometry instead of a clipping box. The GTFS reader was upgraded to handle HSL's very large stop_times file without converting it to one oversized JavaScript string.

## v2.7 — 2026-08-29

Full-network refresh pipeline. GitHub Actions can now fetch the official HSL GTFS feed, build the Helsinki tram + metro pack with zero geometric approximation tolerance, validate that the old central clipping box is gone, and open a data PR only when the source changes. The runtime now accepts both the old clipped pack and the future full-Helsinki pack without crashing, and the opening screen/hub are bumped to v2.7.

## v2.6 — 2026-08-29

Visible-build pass. The opening screen now shows a large, unmistakable `v2.6` build number so hub testers can immediately confirm which Toko Move revision is loaded. Hub metadata is bumped in lockstep. The exact HSL transit inspector from v2.5 remains the active map-development path.

## v2.5 — 2026-08-29

Exact transit inspector pass. The playable delivery build now exposes the committed HSL GTFS geometry through a dedicated MAP view instead of falsely overlaying it on the still-authored gameplay graph. Every source tram/metro line-direction is independently visible, hideable and soloable, with tram-only, metro-only and show-all controls. Geometry is rendered directly from the committed source paths with no octolinear redraw or hand-authored approximation. The source limitation remains explicit: the current exact pack is clipped to central Helsinki while the restored full-feed packer waits for a complete HSL GTFS ZIP. Also fixes the main module's quote escaping bug.

## v2.4 — 2026-08-29

Exact-transit foundation. Restores the repo's HSL city packs and GTFS tooling, adds one display layer per source line-direction, preserves each committed GTFS path object unchanged, and gates independent layer visibility. The authoritative rule is now explicit: Helsinki transit geometry must come from source data rather than approximated route drawing.

## v2.3 — 2026-08-29

Cargo behaviour and visual identity pass. Cargo types now alter routing or scoring: hot/fresh food rewards fast delivery, fragile cargo is constrained to tram routing and earns a safe direct-run bonus, equipment stays on transit, market goods use tram routes, and express work pays a speed bonus. The UI gains cargo badges, a live deadline meter, stronger Helsinki typography, coloured destination markers, and a light harbour/city overlay on the map.

## v2.2 — 2026-08-29

Delivery depth pass. The ten Central Helsinki jobs now have cargo types, per-job deadlines and score values; late deliveries still count but pay half score. Three later jobs become multi-stop A → B → C runs, and the first express job triggers an 08:00 rush-hour passenger wave that competes for the same network capacity. HUD and job sheet now show the current leg, deadline and score.

## v2.1 — 2026-08-29

Reliability and geography pass for the Central Helsinki delivery game. The startup copy and HUD now describe the delivery objective, the main module cache token is bumped, and the daylight smoke gate tests the Helsinki graph instead of the old Kallio route. The board expands south and east with Ruoholahti, Senaatintori and Katajanokka, and the ten-job route now crosses those areas.

## v2 — 2026-08-29

Central Helsinki becomes the authored game board. The primary objective is now a chain of ten concrete A → B courier jobs across Pasila, Töölö, Kallio, Sörnäinen, Kalasatama, Hakaniemi, Kamppi, Rautatientori and Kauppatori. Existing metro, tram and rail services form the transport skeleton; player-drawn lines solve the gaps.

## v1 — 2026-08-18

The day half joins the hub: the same flow-core city as Piritori — provably, by
seed — moving people to school and work in daylight. No product, no heat, no
fights; the goals panel and the clean transit read are the whole game.
