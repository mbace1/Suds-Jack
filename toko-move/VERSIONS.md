# Toko Move — versions

## v2.26 — 2026-09-02

**The shift shows itself back.** A run ended in four numbers — delivered, score, bonuses, late — which was survivable while nothing could go wrong and became the worst possible ending the moment v2.25 made a shift losable. Four numbers tell you that you failed and nothing about where. `js/shiftlog.js` is the design doc's own experiment #6, the one item on its list of eight that had never been built, and its strongest-directions list calls post-run replay "a core learning tool".

**It records by WATCHING.** Nothing in `deliveries.js` or `mobility-v212.js` knows the file exists: it polls from the draw loop, notices what changed and writes it down — the same discipline as turf's `anim.js` reading `state.log` rather than being called by `combat.js`. So it cannot break the game it observes, and it can be deleted without touching a rule. `test/shiftlog.mjs` drives every branch of it in bare node against a stub, because it owns no DOM and no clock; five mutations (never closing a job, inverting lateness, allowing negative spare, dropping the noise threshold, and dropping HTML escaping) are each caught.

**The one thing it computes rather than observes is the alternative**: at the moment you board, what the best plan from where you stand was worth against what you actually took, both from the same timetable the panel quoted at you. `at Länsiterminaali you boarded a ~1307t plan · a ~1018t one was on the board · 289t` — that is a sentence a player can learn from, and it appeared on the job that failed.

That comparison could not fire at first and the reason is worth keeping: `mobility.catchChoice` executes a chosen plan as a **single physical leg**, and `selectedPlan` was that leg rather than the plan clicked. One leg is by construction no worse than a whole trip, so the check was structurally incapable of ever finding a better alternative. The ride keeps the plan the player actually pressed now.

## v2.25 — 2026-09-02

**The game can be lost now, and the ride has a decision in it.** Both halves at once, because neither works alone: tension without input is a clock you watch, and input without stakes is busywork.

**The deadline was a distance formula and never bit.** `late` was 0 in every run this game had ever been measured on, and the report card's `margin` column — the one number that would have said why — had never once been recorded correctly: it read `remaining()` at the moment a completion was *noticed*, by which point the challenge had already moved to the next job, so it printed `—` for every job of every run. Fixed, the answer was **75%, 58%, 42% and 14% of the deadline left spare.** A deadline with half of itself to spare is not a deadline.

So a deadline is the trip's **real cost plus a grace**. `planCost` in the job board asks the same timetable the panels quote at you for the cheapest door-to-door plan; `deadlineFor` takes 1.35× it. Bare node installs no estimator and falls through to the old formula, which is what keeps every gate written before this measuring what it meant to. First measured run afterwards: deadlines roughly halved (1155→544, 1075→666), spare 47 / 42 / 0 / 29%, and **`late 1`** — the first failable shift in the project's history. The job that failed was the one that ate a 517-tick transfer wait, which is exactly what should cost you.

**Getting off early** is the only decision the ride ever had in it. 71% of a five-minute shift is spent aboard with nothing to press; the verb list already said *ride* and *get off*, and what was missing is that you could only get off where the plan said. A tram passing an interchange where a faster continuation is standing right now is the most ordinary decision in transit and the game could not express it.

It is offered **only while the vehicle is really at a stop** — the same 2.2-second window a catch uses, because stepping off between stops is not a thing you can do — and **only when leaving beats staying**, measured: what the rest of this ride plus the plan's remainder costs, against the best plan from here. Across a measured shift it was computed 85 times, was worth taking 46 of them, and the best single case saved **360 ticks — 36 seconds of a 300-second shift.** Usually staying aboard is right, which is correct and is why the button is not always there.

## v2.24 — 2026-09-02

**The outer board stopped being invented.** 78% of the board had no OSM streets, and that 78% was drawn with twelve hand-authored corridors — the one kind of geometry this project's own rules say must never sit on the board as though it were real. It is now HSL's own service corridors, from the GTFS feed, under CC BY 4.0: `cities/ground/helsinki-corridors.json`, 696 traces covering 60.149–60.218 / 24.895–24.995, which is essentially the whole board. **There is no authored geometry on the map any more.**

It is emphatically **not a street map** — it has every street a bus or tram uses and no street without a route on it — and the credit line says exactly that in its own clause. That is the right shape for the coarse layer anyway: an arterial is precisely a street a bus runs on.

Three things had to be true for it to be usable rather than merely present.

**Rail, metro and ferry corridors are dropped.** A ferry corridor stroked as a road is a street across the harbour. The mutation test caught this as a hole in the GATE rather than in the code — the check asked whether the *pack* contained ferries, never whether the *drawn runs* excluded them, so deleting the filter passed. Each run carries its mode now and the gate asks the runs.

**Each corridor is clipped to the ground the street pack does not cover.** Otherwise the two layers draw the same street twice with slightly different geometry — the doubling that made this a choice between them rather than a combination of them. 653 bus and tram corridors become 519 clipped runs, none wholly inside the extract.

**One line per street.** A GTFS shape exists per direction and per route, so a street a bus runs both ways along arrives as two traces a few metres apart, and six routes down Mäkelänkatu arrive as six. Points are hashed into ~20 m cells and the busiest run in a place wins: 519 become 367. Busiest first on purpose — the trunk should survive, and it is the one whose geometry the most services agree on.

Tiers come from the feed's own trip counts rather than a guess: the real distribution's quartiles are 458 / 992 / 2394, so those are the thresholds, and the camera reveals major at city scale, adds mid at route, all at stop — the same hierarchy the OSM streets use.

**Which source you are looking at no longer depends on the camera.** The first cut chose by the camera centre, so panning across the extract boundary swapped the entire ground layer under you. Geography decides now: both are on screen at once and the seam is where the data's seam actually is.

**A layout rule was silently deleting a licence.** The credit line wraps and was capped at the last two lines — invisible until the HSL clause made it three, at which point the line that fell off the top was `© OpenStreetMap contributors (ODbL 1.0)`. The cap is gone; the legend asks how many lines there are instead of assuming, and a credit that will not fit pushes the legend up rather than losing a clause.

Two self-inflicted wounds, both the same mistake: editing this dense file by splicing between two text markers deletes everything between them. It took out `viewRect`/`courierLatLon`/`layersNear`/`fleetFilter` once and `drawLandmarkLayer` once, and **both times the module still parsed** — a bare-node import reports "document is not defined" and looks like success. Only booting the real page caught it. Load the page, not the module.

## v2.23 — 2026-09-02

**The street importer, written and gated — everything either side of the fetch.** Measured first, because "the streets only cover the centre" is a shrug until it is a number: the board is **41.2 km²** and the committed extract covers **9.2 km², 22% of it**. Fifteen of the twenty-two delivery anchors and twenty-eight of the forty-one districts stand on ground with no streets under them — Töölö, Kamppi, Senaatintori, Kauppatori, Katajanokka, Eira, Käpylä, Pasila, Jätkäsaari, Länsisatama, Arabianranta, Meilahti.

`toko-move/scripts/streets-import.mjs` replaces the `map/tools/streets-import.mjs` that the pack names in its own `generatedBy` and that **exists in no branch of this repository** — the tool was lost and the data outlived it. It prints the exact Overpass query for the board box plus a margin, turns an `out geom` response into a pack in the schema already in use, and validates one.

It cannot fetch from here and says so rather than pretending: the egress proxy refuses `overpass-api.de` by organisation policy, a network limit rather than a missing token. So the fetch is one documented manual step on a networked machine, and both sides of it are done and tested.

`--check` is the step worth insisting on. Three questions: does the pack cover the board, is it tiered, and — the one that matters — **does it still contain every named street the committed extract knows?** An import that quietly lost Mannerheimintie passes the first two. It counts distinct NAMES rather than ways on purpose, because a real `out geom` import returns whole ways and will have far fewer roads for the same city: the committed extract is **82% two-point fragments**, 5652 ways carrying only 14291 points, because its geometry arrived per segment.

`test/streets-import.mjs` runs the importer **with no network at all**, which is the whole difficulty. The Overpass response is synthesised from the committed extract — every real way turned back into the element it came from — and put through the real parser: 5652 ways of real Helsinki geometry round-trip point for point, junk is skipped rather than mis-tiered, and the coverage check **fails on the pack we ship**, which is correct and is what will announce the fix.

**One street file, and the file says what it covers.** The first cut looked for a full-board pack and fell back to the centre extract, which meant probing for a file that is not there — a 404 on every load, the same noise the superseded water fetch was removed for one version earlier. Extent is a property of a pack, not of its name: `helsinki-streets.json` is the only name, `streetsCoverBoard()` reads its bounding box, and the credit line stops saying "centre extract" on its own. Replacing the file IS the change.

**And four gates that existed were not in CI.** `board`, `camera`, `ground` and the new `streets-import` all ran only when someone remembered to — the same failure the toko-move CI block's own comment warns about, two feet below where they should have been listed.

## v2.22 — 2026-09-02

**The transfer is priced at the moment you choose it.** The report card was extended first, because the sentence "there is nothing to do while you wait at a transfer" was a guess about a number nobody was keeping. Measured: **transfer waits are 77% of all platform time** — 501 ticks across four transfers against 146 across five first catches, worst single wait 256t — and the correction to the guess is just as useful: **0% of that waiting had nothing on offer.** A walk was there 40% of the time, a second job 18%, both 42%. The problem was never an empty platform.

The problem was that **the panel was showing none of it**. A two-leg plan advertised `ARRIVES ~10t` — the wait for leg one — while leg two sat behind a 250-tick headway at an interchange nobody had looked at yet. This game's rule is that no route is marked as the answer; it is not that the facts are withheld. A cost you only discover after committing is not a choice, it is a reveal. Every choice now carries `~550t door to door · then WAIT 200t at Ooppera`, and the two numbers are separate on purpose: a total alone lets a plan hide a long stand behind an otherwise reasonable figure, and the stand is the part a player feels.

**The horizon was hiding more than the transfer.** `arrivalState` scanned 120 ticks forward for the next vehicle, so a line whose next service was 200 ticks out reported `WAITING` and no number at all — and the moment plans are compared on total time, a plan with no number loses to a plan with a bad one. The transfer lookahead would have needed a 900-tick scan of its own.

Both scans are gone. A vehicle here is a **triangle wave** — `cycle = (phase + tick × speed) mod 2`, out on [0,1] and back on (1,2] — so a stop at path index *i* sits at `q = i/(n-1)` outbound and `2-q` inbound, and the wait is how far the wave has to travel to reach that value. One subtraction per vehicle, exact, **no horizon at all**. `LiveNetwork.nextArrival` is checked in `test/route-choice.mjs` against the 3000-tick scan it replaces on 1088 cases across all 34 layers: the only disagreement is 22 ticks, which is exactly the width of the catch window — the scan reports the moment a vehicle ENTERS it, the closed form the moment it is at the stop. Five mutations of the solver (dropping the standing-here case, flipping the return direction, forgetting the modulo wrap, an off-by-one on the path length, ignoring vehicle speed) are each caught.

**The report card was wrong twice in the same direction, and both times it made the game look worse than it is.** It now splits FIRST catch from TRANSFER catch instead of tallying transfers as a mark, and counts what was on the table during each waiting tick. And DEAD AIR — already once corrected for ignoring walks — was counting a stop where a second job was on offer as time spent doing nothing: 79% of the waiting in one run was exactly that. Taking on a second parcel while you stand there is a decision. With the definition fixed, dead air is **1%**.

**And there were two clocks.** The dispatch board's `est` was `hit.dt + stops×3 + transfers×5` — a formula with two magic numbers in it and no relation to how fast anything on this board moves — printed as `est` a few pixels from the catch panel's real figure, for the same trip. A game whose entire verb set is *read the network and time it* cannot have two clocks. `js/timetable.js` is now the one that answers, and both panels ask it.

Pulling it out found three more copies of the same divergence. `firstArrival` in the dispatch board scanned **120 ticks** (the same horizon artefact, so a service twelve seconds further out reported "no useful vehicle") and **passed no direction at all** — the board could advertise a tram arriving in 0t that runs the other way and cannot take you anywhere near your destination. It takes a LEG now, because a leg is the thing that knows which way you mean to go. And the board carried its own `nearestPathIndex` that did not scale longitude by cos(lat), measuring a stop as about twice as far north-south as east-west: a third copy of a function that already existed twice, and the only one of the three that was wrong.

Two plans that started on the same line also printed the same sentence twice, because the label named only the first leg. They are deduplicated by plan and named by interchange now: `TRAM 4T +0t · ~292t · direct | TRAM 1H +7t · ~588t · via Ooppera (+289t there)` — the direct one is here now and takes half as long, and until this version the board could not say so.

Report card, three runs at v2.22 against v2.21's two: **transfer waits fall from 77–78% of platform time to 13–35%**, dead air is 1% under the corrected definition, and deliveries and score are unchanged at 4/6 and 756. One number moved the other way and is not explained: first-catch waits rose from ~140t to ~660t. The card is noisy run to run and the bot's policy changed in the same release, so that is recorded rather than attributed.

Honest about what this did not prove: the bot now picks the best-scoring enabled choice, and it was also given the other decision the estimates enable — letting a catchable vehicle go for a better plan. That is left out. An enabled plan has no wait left in its total so it almost always wins; the rule fired four times in a whole shift for 21 ticks, and its arbitrary hold-out guard added noise to a card that is already noisy run to run. Taking the vehicle in front of you is very nearly always right. The estimate's job is to say **which** vehicle in front of you, and what the one after it will cost.

## v2.21 — 2026-09-02

**Landmarks, folded.** Owner's direction: "bigger spots like the white church can look a bit like a low poly origami, mostly grey night version map colors though." Six of them — Tuomiokirkko, Uspenski, Kallion kirkko, Päärautatieasema, Ooppera, Länsiterminaali — drawn in `js/landmarks.js` as flat polygons in three greys with one light direction shared by all six. Origami taken as a technical instruction rather than a mood: a folded model has flat faces and hard creases and is read entirely by which face catches the light, so there is no gradient, no outline, and nothing shaded inside a face. **The crease IS the value change** — the first cut kept the three greys within a step of each other and every building came out a grey blob with a tower on it.

**The dome was a cone.** Two long facets meeting at a point is what you get if you draw a dome as a triangle, and the cathedral read as a spike with two tent pegs beside it. A dome's whole character is the shoulder: it leaves the drum almost vertically, turns hard and arrives flat. Four folds a side, apex at r×1.3, and the lantern is a separate little drum standing on top rather than the tip of the cone.

**Where they are, stated exactly.** `cities/ground/helsinki-landmarks.json` places each one as an **offset in metres from a real HSL stop** — the stop coordinate is source data, the offset is the only invented number in the file, and the pack says so at length: not footprints, not traced, not fetched, accurate to about a block, and **not to be credited to OpenStreetMap**. The on-screen credit line says `landmarks: map symbols, placed by hand` in its own clause for exactly that reason. If a networked run ever fetches the OSM building ways, an `at` pair replaces `anchor`+`offset` and nothing else changes.

They are sized in metres and **clamped in pixels** (15–96): true scale alone makes a cathedral eight pixels wide at route scale, and a fixed pixel size makes it an icon that never becomes a building. Clamped, it is a symbol far out and a shape up close. Hidden entirely at CITY scale, where a 15px building among the whole of Helsinki is a speck arguing with a stop dot. They live inside the cached ground layer, above the streets and under the network — a tram passes in front of the cathedral, and the cathedral stands on the street.

The ground gate is 224 checks now, and the five new landmark assertions were mutation-tested: an offset wandering past 400 m, an unknown form, an unknown anchor, a second pale church, and the pack crediting OpenStreetMap for an authored position are each caught.

## v2.20 — 2026-09-02

**The night map, and real ground under it.** Owner's direction: "a more readable map with streets and water that is based in a gray scale with some contrast colors like dark blue for water... mostly grey night version map colors though." Recorded in `board.js` as an override, because it replaces the warm paper board that file was written for.

**The ground is real data, and it was already in this repository.** Three packs, recovered from the Piritori map work on `gh-pages` (commit `606058bb`) and committed under `toko-move/cities/ground/`, read by the new `js/ground.js`:

- **water** — OpenStreetMap via Overpass, ODbL 1.0. 111 fillable bodies and 139 coastline edges spanning **the whole board** (60.148–60.218N), where the pack in use covered 60.17–60.20 — which is why Eira, Länsisatama and Käpylä had been sitting on blank paper.
- **streets** — OpenStreetMap via Overpass, ODbL 1.0. 5652 ways carrying class and tier. **Centre extract only** (60.17–60.20 / 24.93–24.98, about the middle third of the board), and that limit is handled rather than hidden: inside it the real streets are the ground, outside it the board keeps its schematic corridors, and never both in the same place — an invented line beside a real one along the same street is the one thing this map may not do. The on-screen credit names the extent.
- **districts** — City of Helsinki osa-aluejako 2015 via the dhh16 mirror. 41 real sub-district label points, ordered by how much of the extent each covers, replacing **nine names typed into the runtime by hand** and hung off whichever delivery anchor was nearest.

**Streets are a hierarchy, revealed by the camera** — city shows arterials, route adds mid, stop adds the rest, which is the owner's "the closer you zoom, the more major streets you see". A third of the pack is never drawn: `service` and `track` are parking aisles and yard access, and 260 of the pedestrian ways are **closed rings** — squares mapped as areas. Stroked as lines they draw a box around every block, and the stop-scale view was an outline of the ground floor of Helsinki rather than a street grid.

**The sea is shown, not filled.** An OSM coastline is a directed OPEN line with land on its left, and closing it into a polygon invents a shape the data does not contain — the Piritori lane tried three closures and completed none. So the water is shaded outward from the shore on the side the winding itself says is water, in three fading passes. Flip the winding and the shading goes inland, which is exactly the error it would be.

**The line inks were re-solved, because they had to be.** Six of the fourteen fail 3:1 on the night ground (1 at 1.83:1, 4 at 1.77, 5 at 2.31, 6 at 1.79, 10 at 1.76, 15 at 1.85) — a dark line on a dark board is not a quieter line, it is an absent one. Same constrained search, same pinned metro orange, new band: L 56–78, chroma 32–56, **min dE76 = 32.5** (the paper solve reached 37.0 and had more room). Widening to L 54–80 / chroma 58 reaches 41.1 and buys it in neon — mint, lemon and hot pink, the highlighter set the first solve exists to avoid. The floor in `test/board.mjs` moved to 32.0 to match.

**And the rule that keeps a street from reading as a service changed shape.** The paper board did it with luminance: roads under 1.9:1, lines at least 1.6× louder. At night a line must be LIGHT to be legible at all — the quietest is metro orange at 3.9:1 — so 1.6× caps a road at 2.44:1, and a road held there is nearly the board colour. The first cut of this palette obeyed the old rule and drew streets that were not visible on screen; a gate that certifies an invisible layer is measuring the wrong thing. What actually separates them is **colour**: every road ink has Lab chroma under 9 and every line over 30, a gap of nearly four times. The gate holds that, plus a lightness ceiling, plus the tier order, plus a floor so a street cannot vanish.

`test/ground.mjs` is a new gate (189 checks): every pack states its source, licence and extent; the on-screen credit names OpenStreetMap, ODbL, the City of Helsinki and the street extent; water spans the board; the tiers are a real hierarchy; a missing pack is empty rather than a crash and claims no attribution it cannot support.

**Two bugs the report card found that no gate could.** The shift went from 5 deliveries to ONE, and the page had no errors: `route-choice.js` carried `Math.floor(tick/2)` in its render key, so the panel rewrote its own innerHTML four times a second and destroyed the CATCH buttons with it. A press arriving mid-swap lands on a detached element and does nothing — on a phone, a tap that silently fails at exactly the moment the game asks you to be quick. The panel is now rebuilt only when what it says changes, and the arrival line, the enabled state and the verb are refreshed **in place**. And the zoom rail was placed from a measurement taken while it was still `hidden`, so `offsetWidth` was 0, the rail landed a full width right of the map over the job sheet, and at z-index 30 it ate the clicks it covered.

**The ground is cached offscreen.** Water, streets and place names change when the camera changes and at no other time; painted every frame they cost the city view half its frame rate for a picture identical to the one before it. Painted into an offscreen canvas keyed on the camera and blitted, all three scales run at 60. Same discipline as `gameoflife`'s `scr.cached`, same rule: keep every moving part outside it.

The old `flow-core/data/kallio-water-v1.json` fetch is gone. The ground pack supersedes it in every respect, and that path does not exist on the deployed site — so every load of the live cabinet was taking a 404 for a file whose contents were already on screen from somewhere better.

Report card, v2.20: 5 jobs taken, 4/6 delivered, score 756, late 0, dead air 4%, riding 69%.

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
