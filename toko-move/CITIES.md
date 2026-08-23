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
key out of a static site where it would be public the moment it shipped. The
**live** layer is then opt-in: you paste your own Digitransit key, it goes in
`localStorage`, and it is the same shape `hub/feedback.js` already uses for its
`SHEET_ENDPOINT`. Nobody who just wants to play a board ever meets a key.

## What is built (2026-08-23)

Nothing is wired into the game yet, deliberately — how a city is *rendered*
depends on what you do on one, and that is question 1 below. What exists is the
part that is true under every answer.

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

### What the picture showed that the numbers did not

Rendered and looked at, because this repo has now twice shipped something whose
every assertion passed and which was wrong on screen. Two things:

- **Stop spacing is uneven.** `minLeg` is a target inside the snap, not a
  constraint, so a stretch of one line can come out as a staircase of tiny legs
  while its neighbour has one long one. Real diagrams even the spacing out.
  That is the next iteration, not a constant to tune.
- **Collisions are mostly the city, not the fitter.** The synthetic city has two
  stops within 12 units *before* anything is bent, and bending adds one. Which
  means a real pack wants an interchange-merging pass — the thing every printed
  transit map already does — rather than a stronger repulsion force.

### `scripts/city-pack.mjs` — the fetcher

Turns a Digitransit GraphQL answer into a pack. Takes the **longest** pattern
per route, because `patterns` returns short workings and diversions too and the
06:14 that turns back early is not the line as anybody thinks of it; keeps one
direction, because a line and its return are one stroke on a diagram.

**It has not been run against the live API.** This sandbox can reach
`raw.githubusercontent.com` and nothing else — `api.digitransit.fi`,
`digitraffic.fi` and Overpass are all blocked from here — so both failure paths
are exercised and the success path is not. It wants one run on a machine with a
network and a key before anything is claimed for it.

No real city pack is committed, for the same reason: inventing stop coordinates
from memory would be fabricating the one thing in this mode that has to be true.

## Open questions

**1. What do you DO on a city board?** This is the one that gates everything —
the fitter is the same under all of them, the renderer is not.

  - **(a) Expansion.** The real network is drawn faint underneath as what
    already exists, and you draw new lines on top against a brief — *"the
    western estates have no tram, you have 3 lines and 40 minutes"*. This is my
    recommendation: it is the only one where the base game's verb still works,
    it is exactly your "building and expanding type challenges", and a real
    city's awkward shape is a better puzzle than a generated one.
  - **(b) Operate.** The network is fixed and you allocate trains against real
    demand — closer to a management game, and a different verb from the base.
  - **(c) Viewer.** No game at all: it is the live map, and missions come later.
  - **(d) All three, chosen per mission**, the way `layer:` already works.

**2. Which city first, and which modes?** Helsinki tram + metro is the obvious
first — small enough to be legible at 86-odd stops, the data is open, and you
live there so you can tell me when it looks wrong, which nobody else can.

**3. The live layer — when?** (a) After a city stands up as a static board, or
(b) as the first thing, because it is the part that is genuinely novel. I lean
(a): a live layer over a map that does not read yet has nothing to be live on.

**4. Is "catch a tram" a mode, or the point?** A game with a live map inside it
and a live map with a game inside it are different products with the same code.
It changes what the front door says, not what gets built next.

**5. Congestion.** Digitraffic is open and Finland-only. Do we build the car
layer's real congestion for Finland now and accept that it does not travel, or
hold it until there is a licensed global source?

**6. Does a city get its own clock?** The abstract missions run at an hour a
minute. A live city runs at one second a second, and those cannot be the same
mission format — a `survive`-style goal against real time is a different thing
from one against a compressed morning.

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
- A worked MQTT client, for reference: [otsaloma/helsinki-transit-live](https://github.com/otsaloma/helsinki-transit-live)
