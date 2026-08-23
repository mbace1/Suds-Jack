# Cities — real networks, same layers

## Owner's direction, 2026-08-23

> The base game has multiple layers where we want to test simulated challenges
> on abstract settings, this allows for more building and expanding type
> challenges.
>
> I'm talking about adjacent layers that are dubbed "cities" with real cities
> public transportations on a minimalistic map and in the same layers as the
> base game (tram, metro, bus, etc.), while cars remain but we can include
> realtime congestion maps as a visual layer.
>
> technically, if you have "cities" open in the game app, with the tram layer
> visible and gps, you could catch a tram in real time as you see that tram and
> nearby trams on the map.

## What that settles

The abstract boards **stay** and stay primary — they are where a challenge can
be tuned, because a generated board can be dealt again and a real one cannot.
Cities is **adjacent**: same layer system, same visual language, real network.

It also settles the thing left open on 2026-08-19. Toko Move dropped Helsinki
because a real map made it *"feel exactly same to play as mini motorways, with
abstract Maps and not in the real world"* — that judgment was about the **base
game**, and it stands. Cities is not that decision being reversed; it is a
different mode with a different reason to exist.

And the last paragraph is the part that makes this more than a skin: with GPS
and live positions, the app is **useful on a platform**. That is a real product
claim, and it is what most of the constraints below are about.

## What was verified, 2026-08-23

Not assumed — looked up, with the sources at the bottom. Three of these change
what is worth building first.

**1. Digitransit needs a registered key.** The APIs at `api.digitransit.fi` have
required a `digitransit-subscription-key` since 2023, and rate and quota limits
have been enforced since 31 January 2024. Keys come from
`portal-api.digitransit.fi`. There is no anonymous tier to build against.

**2. Live vehicle positions are MQTT, not REST.** `mqtts://mqtt.hsl.fi:8883`
carries around 1500 vehicles at roughly 1 Hz, filtered by a topic path
(`/hfp/v2/journey/ongoing/vp/tram/…`) so you subscribe to trams in one geohash
rather than to the country. It works from a browser over WebSocket, but it needs
an MQTT client — which means **a vendored library**, the first real dependency
this game would take. `sudsjack/` and `eeri/` already vendor three.js, so there
is precedent, but it should be a decision rather than a drift.

**3. The data is CC BY 4.0, and that is a condition.** HSL's open data, and
Fintraffic's, are Creative Commons Attribution — free to use commercially, on
the condition the source is credited. So **an attribution line has to be on
screen whenever a city is drawn**. `js/city.js` refuses to lay out a pack that
has lost its `source` or `licence`, which makes that structural instead of a
thing somebody remembers.

**4. Congestion has one open source and a lot of closed ones.** Fintraffic's
**Digitraffic** publishes Finnish road traffic — measurement stations, speeds,
volumes, incidents — under CC BY 4.0, so it can be redrawn in this game's own
style. Google, TomTom and HERE traffic layers generally may **not** be: their
terms tie the data to their own map rendering. That asymmetry decides the
question in the direction above — a congestion layer is cheap and legal in
Finland and expensive and restricted everywhere else, which argues for building
it where it is free and treating global coverage as a later, licensed problem.

**5. GPS needs HTTPS, which the site already is.** `navigator.geolocation` is
secure-context only; `gh-pages` serves over HTTPS, so "where am I on this map"
costs nothing beyond asking permission.

### The rule those four add up to

**No key ships in the page, and no city needs the network to be drawn.**

A pack is fetched **once**, by hand, and committed as JSON. The game only ever
reads a file, which keeps the arcade's offline-first promise honest and keeps a
key out of a static site where it would be public the moment it shipped.

> **Superseded in part, later the same day.** Point 1 above sent the first cut
> of the fetcher through Digitransit's keyed GraphQL, and the "paste your own
> key" design was built around it. Then the **static GTFS feed** turned up:
> keyless, the same data, and refreshed daily. So for Helsinki there is no key
> anywhere — not for the network, not for the live positions — and the opt-in
> key design comes back only for Japan, where ODPT wants free registration. The
> point is kept rather than edited away because the correction is the useful
> part: *the keyed API was the first thing the documentation offered, and it was
> the wrong road.*

## What is built (2026-08-23)

Nothing is wired into the game yet, deliberately — how a city is *rendered*
depends on what you do on one, which is still open. What exists is the part that
is true under every answer.

### `toko-move/js/city.js` — the seam

The only file in the game that knows a stop ever had a latitude. Everything
downstream still sees board units.

- `validate(pack)` — refuses a pack with no source or licence, duplicate stop
  ids, coordinates that are not on Earth, or a line calling somewhere the pack
  does not hold.
- `project(pack, board)` — equirectangular with the latitude correction, **one
  scale for both axes**. Fitting each axis to its own range fills the board and
  stretches the city, which is the difference between a map of somewhere and a
  picture of a network.
- `octolinear(at, lines)` — bends it onto the 45° grid.
- `layout(pack, board)` — both, plus each stop's true position kept alongside,
  because a bent stop that has forgotten where it is cannot be put back on a map
  when the GPS layer needs it.

### What the fitter is, and is not

Proper octolinear map generation is an optimisation problem with a literature
behind it — Nöllenburg and Wolff solve it as an integer program, and it is slow
enough that Transport for London still draws theirs by hand. This is **not**
that. It is a relaxation: every leg pushes its two stops toward the nearest 45°
direction while every stop is pulled back toward where it really is. It is a
logical option, offered to be measured, and it reports on itself.

Measured on a synthetic city with a real one's shape — six radial trunks and a
ring, 86 stops, stops every ~400 m, each leg wobbled off straight the way a tram
that follows streets is:

| bend | pull | legs on the grid | mean drift | worst |
|---|---|---|---|---|
| 0.50 | 0.12 | 24% | 2.8 | 8.1 |
| 0.85 | 0.04 | 63% | 4.5 | 11.5 |
| 0.95 | 0.010 | 91% | 5.8 | 18.2 |
| **0.98** | **0.004** | **100%** | **6.2** | **21.1** |

So the **whole** network reaches the grid while the average stop moves 6 units
on an 860-wide board — under one per cent of the width. That number is the one
that matters: it is the difference between a diagram of the place and a diagram
of somewhere. Converged by 400 rounds; 1200 gives the same answer.

**Turn `pull` to 0 and you get a tidy diagram of nowhere. Turn `bend` to 0 and
you get a map.** This whole mode lives in that ratio, and it is one constant.

### What the picture showed that the numbers did not — and what was done

Rendered and looked at, because this repo has now twice shipped something whose
every assertion passed and which was wrong on screen. Three things, two fixed.

**1. Stop spacing was uneven — fixed.** Snapping keeps each leg's own length, so
a stretch where the real stops are close together came out as a staircase of
tiny steps beside a neighbour with one long one: legible as geometry, illegible
as a diagram. Every printed transit map evens the spacing out, so each leg is
now pulled toward the median leg as well as toward the grid. `even` is how far,
and the sweep has a clear knee:

| even | on grid | spread | mean drift | worst |
|---|---|---|---|---|
| 0 | 100% | 0.308 | 6.7 | 26.3 |
| **0.15** | 100% | **0.060** | 13.9 | 34.0 |
| 0.45 | 100% | 0.024 | 15.5 | 39.2 |
| 1.00 | 100% | 0.011 | 15.5 | 41.2 |

0.15 buys five sixths of the evenness for half the drift the rest costs. There
is now a `spread` in the report, because **100% on the grid says nothing about
whether the legs are the same size** and the first render passed every check it
had while looking like a staircase.

**2. A GTFS stop is a PLATFORM — fixed, and it is the biggest one.** A tram stop
appears twice in `stops.txt`, one per direction, and a metro station three or
four times. An unmerged pack draws every station as a little cluster of
near-identical dots with the line stitched through them. GTFS says so itself —
`location_type` 1 is a station, `parent_station` points a platform at it — so
the feed's own answer is used where it has one, and `merge()` in `city.js` falls
back to proximity **and** name for sources that have no such field, which is
every OpenStreetMap extract and every hand-made pack. Name matching allows a
prefix, because an operator marks one face of an interchange `Kamppi M` while
the other is just `Kamppi`; the radius is what keeps that honest.

**3. The core is crowded, and that is NOT fixed.** About a fifth of the stops in
a radial city land within 12 units of another — six arms and a ring meeting in
the middle. Measured across four seeds, the projection alone collides 17-18
times and bending takes it to 17-21, so **this is the projection's doing rather
than the fitter's**, and evening the spacing does not make it worse. The fix is
a third force — repulsion between stops that are not neighbours — which is the
standard next term in this kind of relaxation and the next iteration. Until it
exists the gate pins the invariant that bending must not add crowding of its
own.

### One claim that measured false

The median leg was chosen as the evenness target with a reason attached: that a
handful of long suburban runs drag a *mean* upward and then every downtown leg
is stretched to match. **That is not true here.** On a network with one line
running well out of town, across three seeds, targeting the mean gives spread
0.082-0.084 against the median's 0.083-0.085, with identical drift. They are the
same — the projection scales the whole city to the board, so one long leg among
ninety barely moves a mean.

The median stays because it is the more robust of two equal choices, and the
gate now pins the **tie** rather than the belief, so nobody goes looking for a
benefit that was never there.

### `scripts/city-pack.mjs` — the fetcher

    node scripts/city-pack.mjs --city hsl
    node scripts/city-pack.mjs --city hsl --gtfs ~/Downloads/hsl.zip   # offline

Downloads a GTFS feed, or reads one off disk, and writes a pack. No key. It
leans entirely on `scripts/gtfs.mjs` below.

**It has not been run against a live feed.** This sandbox reaches
`raw.githubusercontent.com` and nothing else — `dev.hsl.fi`, `api.digitransit.fi`,
`digitraffic.fi` and Overpass are all blocked from here — so every failure path
is exercised, the reader is proven against a hand-built feed, and the download
is not. **It wants one run on a machine with a network** before anything is
claimed for it; the first thing it will tell you is whether those URLs are still
where the documentation says.

No real city pack is committed, for a related reason: inventing stop coordinates
from memory would be fabricating the one thing in this mode that has to be
true.

## Answered, 2026-08-23

**1. What do you do on a city board?** *"Let's see if we can gamify this, so all
look good for now."* → keep all four shapes open; the fitter and the pack are
the same under each, so nothing is blocked. The one that has to be picked before
the renderer is written, and it can wait.

**2. Which cities.** **Helsinki → Nagoya → New York → Tokyo**, settled
2026-08-23. Nagoya (6 lines, 87 stations) is Helsinki-scale, so it tests whether
the pack format travels; Tokyo (13 lines, 286 stations) is the stress test and
comes last because it is one.

  **Nagoya has a data problem, and it is worth knowing now.** ODPT grew out of
  the Tokyo Olympics and is still Tokyo-centred; outside Tokyo, Japanese transit
  open data is overwhelmingly **bus** GTFS rather than rail. Nagoya City
  Transportation Bureau moved its open data to the city's own catalogue in
  November 2024, and no subway GTFS turned up in the search. So the second city
  may have no machine-readable network at all through the usual door.

  **The way round is OpenStreetMap**, and it is worth taking seriously because
  it works for *every* city on earth including Tokyo: subway and tram lines are
  in OSM as route relations with their stops in order, which is exactly a pack.
  One caveat that is the owner's call rather than mine: OSM is **ODbL**, and a
  pack extracted from it is a *Derivative Database* — so that JSON would have to
  be offered under ODbL, with attribution to OpenStreetMap and a link to the
  licence. The rendered map is a *Produced Work* and the game's own code is
  unaffected. Worth a proper read before the first OSM-derived pack is
  committed.

  **Which Japanese city is still open.** The direction says *"Naga prefecture
  city with the biggest metro map"*, and those are two different cities:
  **Nagoya** runs 6 lines / 87 stations, and the biggest metro map in Japan is
  **Tokyo** at 13 lines / 286 stations. Nagoya is the natural second — it is
  Helsinki-scale, so it tests whether the pack format travels without also
  testing whether the fitter survives 286 stations. Tokyo is the stress test and
  is worth doing *because* it is hard, just not second. Say which and I will
  fetch it; both are in the table below without a URL until then.

**3. When does live data arrive?** *"Depending on what cities offer good live
data, we can expand."* → the expansion order follows the feeds, and the table
below is that survey. Taking my own recommendation on the timing: after a city
stands up as a static board, because a live layer over a map that does not read
yet has nothing to be live on.

**4. Is "catch a tram" a mode or the point?** *"You could get points for live
hopping."* → **the live map is scored**. That is a better answer than either of
mine: it makes the live layer a game rather than a utility bolted to one, and it
gives the GPS a reason to exist beyond a blue dot. It also raises a question
neither of us has asked — what stops you claiming a ride you did not take? The
honest version needs GPS to agree with a vehicle's position for a while, which
is a real design problem and a good one.

**5. Congestion, local and global.** Surveyed below, and the answer is blunt:
**there is no free, globally redistributable real-time congestion feed.** Google,
TomTom, HERE and Mapbox all forbid storing the data beyond a short cache or
drawing it outside their own map rendering, which is exactly what this game
would do. The open efforts — the World Bank's Open Traffic, GraphHopper's
`open-traffic-collection` — are a per-country patchwork and mostly historic
rather than live.

That has a consequence for the base game, which is what you were pointing at:
**the global layers cannot be fed by real congestion, so they should stay
simulated.** Real traffic is a *local* garnish, available where a country
happens to publish it — Finland does, under CC BY 4.0 — and the sea and air
layers are simulated because nothing else is on offer at that scale. Better to
know that before designing a challenge around live global data.

**6. Does a city get its own clock?** Read as *cities run on real time*. Which
means a city cannot use the mission format as it stands: `survive 600s` against
a compressed morning and `survive 600s` against the wall clock are different
objects, and the live one cannot be paused, sped up, or replayed. That is a
format change, not a value change, and it is the next thing to design.

## The feeds, looked up

Everything here was searched for rather than remembered, and every URL is in
Sources. **None has been fetched from this sandbox** — it reaches
`raw.githubusercontent.com` and nothing else — so treat "no key" as documented
rather than proven until one run succeeds.

| city | network data | key? | licence |
|---|---|---|---|
| **Helsinki** | `dev.hsl.fi/gtfs/hsl.zip` — GTFS, 464 routes, tram + metro + ferry, refreshed daily (last 2026-08-18) | **no** | CC BY 4.0 |
| Helsinki (alt) | HSL ArcGIS open data portal — routes, stops, zones as GeoJSON / KML / shapefile | no | CC BY 4.0 |
| Helsinki (alt) | Digitransit routing API, GraphQL | **yes** | CC BY 4.0 |
| **New York** | `web.mta.info/developers/data/nyct/subway/google_transit.zip` — GTFS | no | MTA terms — check |
| **Japan** | ODPT (`odpt.org`) — railway + bus, GTFS and GTFS-RT, per operator | yes, free registration | per operator |
| live vehicles, Helsinki | MQTT `mqtt.hsl.fi:8883`, ~1500 vehicles at ~1 Hz, topic-filtered | **no** | CC BY 4.0 |
| live vehicles, NYC | MTA GTFS-RT — keys reported dropped, docs still say otherwise | verify | MTA terms |
| congestion, Finland | Fintraffic Digitraffic — speeds, volumes, incidents | no | CC BY 4.0 |
| congestion, global | TomTom / HERE / Mapbox / Google | yes | **may not be redrawn in our own style** |

### What that changed in the code

The first cut of `scripts/city-pack.mjs` went through Digitransit's GraphQL and
needed a registered key. **The static GTFS feed needs no key at all** — for
Helsinki, for New York, for most agencies on earth — and it is the same data. So
the keyed path is gone rather than kept as an option: a build step that needs a
secret is one nobody else can run, including whoever picks this up in a year.

Which means the whole of Cities, network *and* live positions, can be built
**without a single key**, and the "paste your own key" design in the section
above is no longer needed for Helsinki. It comes back only for Japan, where ODPT
does want free registration.

### `scripts/gtfs.mjs` — reading a feed without a dependency

GTFS is a zip of CSVs, so both halves are written out: a ZIP central-directory
reader (stored and deflate, verified byte-identical to `/usr/bin/unzip` on every
file of a test feed) and a CSV parser that handles quotes — because
`"Kamppi, platform 3"` is one field and a reader that splits on commas silently
moves every column after it. That is sixty lines against a dependency, in a repo
that has none.

Four things it does that a naive reader does not, each one a real trap:

- **The longest pattern wins.** A route has dozens of trips and most are short
  workings; the 06:14 that turns back early is not the line as anybody thinks of
  it, and taking the first trip in the file picks one about as often as not.
- **Stops are sorted by `stop_sequence`**, because GTFS does not promise the
  rows are in order and a real feed's are not.
- **The BOM is stripped.** Agencies ship UTF-8 BOMs, which turn `route_id` into
  `﻿route_id` and make every lookup of the first column miss.
- **The local header's own name and extra lengths** are read, not the central
  directory's — they differ, and using the directory's lands you mid-file.

Gate: 315 checks, up from 291. All five mutations of the reader are caught, and
two of them only after the fixture was made harder — the first one put the short
working *after* the full line, so "take the longest" and "take the first" agreed
and the check proved nothing. The gate also learned to report a throw as a
failure rather than dying on it, because a broken reader was hiding nine other
checks behind a stack trace.

## Sources

- Digitransit — [API registration](https://digitransit.fi/en/developers/api-registration/),
  [routing API](https://digitransit.fi/en/developers/apis/1-routing-api/),
  [vehicle positions](https://digitransit.fi/en/developers/apis/5-realtime-api/vehicle-positions/),
  [high-frequency positioning](https://digitransit.fi/en/developers/apis/5-realtime-api/vehicle-positions/high-frequency-positioning/),
  [portal](https://portal-api.digitransit.fi/)
- HSL — [open data](https://www.hsl.fi/en/hsl/open-data),
  [journey planner](https://www.hsl.fi/en/hsl/journey-planner),
  [disruptions](https://www.hsl.fi/en/travelling/services-now)
- Fintraffic Digitraffic — [road traffic](https://www.digitraffic.fi/en/road-traffic/),
  [terms of service](https://www.digitraffic.fi/en/terms-of-service/)
- HSL — [GTFS feed](https://dev.hsl.fi/gtfs/hsl.zip),
  [ArcGIS open data portal](https://public-transport-hslhrt.opendata.arcgis.com/),
  [route and station maps](https://www.hsl.fi/en/travelling/route_and_station_maps),
  [GTFS-RT docs](https://hsldevcom.github.io/gtfs_rt/),
  [feed on Mobility Database](https://mobilitydatabase.org/feeds/gtfs/mdb-865)
- HSL's own map tooling, which is the best available reference for how this
  network is drawn in print — [hsl-map-style](https://github.com/HSLdevcom/hsl-map-style),
  [hsl-routemap-server](https://github.com/HSLdevcom/hsl-routemap-server),
  [hsl-map-generator-server](https://github.com/HSLdevcom/hsl-map-generator-server)
- New York — [MTA developer resources](https://www.mta.info/developers),
  [GTFS static on data.ny.gov](https://data.ny.gov/Transportation/MTA-General-Transit-Feed-Specification-GTFS-Static/fgm6-ccue),
  [real-time data feeds](https://datamine.mta.info/)
- Japan — [Public Transportation Open Data Center](https://www.odpt.org/en/overview/),
  [data catalogue](https://ckan.odpt.org/en/dataset/)
- Congestion — [GraphHopper's open-traffic-collection](https://github.com/graphhopper/open-traffic-collection)
  (per-country survey), [World Bank Open Traffic](https://github.com/opentraffic)
- A worked MQTT client, for reference: [otsaloma/helsinki-transit-live](https://github.com/otsaloma/helsinki-transit-live)
