# Toko Move — versions

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
