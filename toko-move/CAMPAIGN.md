# The campaign — four cities

*Owner's direction, reaffirmed 2026-09: the high goals are **Helsinki, then
Nagoya, then New York, then Tokyo** as maps. This document puts that goal into
the v2 canon — the physical-transit delivery game (`OWNER_OVERRIDE_V2.md`, root
`TOKO_MOVE_CLAUDE_HANDOVER.md`, root `moveupdates.md`) — so it stops living only
in a superseded branch.*

## 1. What a chapter is now

A chapter is a real city whose actual transit network is **the board**. The
verbs are v2's verbs — pick jobs, wait, catch, ride, get off/transfer, walk —
never line-drawing. Moving to a new city means new geometry, new services, new
jobs; the runtime and rules stay.

The strategic question stays the same in every city: *what opportunities are
moving through this city right now, and which one do I exploit?* What changes
per chapter is what the city itself teaches.

| # | city | what its network teaches | state |
|---|---|---|---|
| 1 | **Helsinki** | trams + metro sharing streets; harbours; transfers at Rautatientori/Hakaniemi | **playable** (v2.x, full HSL pack: 292 stops, 34 exact route layers) |
| 2 | **Nagoya** | a pure-subway grid, and the Meijō line — a full circle, so "which direction do I board" becomes a real decision | needs the network |
| 3 | **New York** | express vs local on the same corridor: two services, same line, different stops | needs the network |
| 4 | **Tokyo** | density: many operators, many transfers, and choosing NOT to ride is often right | needs the network |

## 2. Where each network comes from

The pipeline already exists and is keyless where it matters. Fetch once on a
networked machine, commit the pack, and the game only ever reads a file.

- **Helsinki** — done. `scripts/city-pack*.mjs` + `scripts/gtfs.mjs`, HSL GTFS
  (CC BY 4.0), zero-tolerance geometry; a GitHub Actions refresh pipeline
  exists since v2.7. OSM water under ODbL. Both credits are licence conditions
  and stay on screen.
- **Nagoya and Tokyo** — Japan's feeds come through the Public Transportation
  Open Data Center (odpt.org), not one agency zip; most ODPT feeds need a
  registered (free) developer token, so the fetch is a documented manual step,
  never a build step. Which exact feeds, and their terms, must be read before
  anything ships.
- **New York** — the MTA publishes subway GTFS; its open-data terms need
  reading before shipping, and express/local patterns live in `stop_times`, so
  the packer must learn service patterns (not just route shapes) for chapter 3
  to teach what it exists to teach.

Rules that travel with the data, already locked in `TRANSIT_LAYERS.md` and
kept here in one line each: geometry stays exact, never authored approximation
presented as real; coastline edges stay open lines; attribution stays on
screen.

## 3. What Helsinki proved that generalises

- The **pack schema** (`cities/*.json`: stops, lines with exact paths, water,
  source + licence per dataset) is city-agnostic. So is the pipeline.
- **Anchors/hubs are derived, not authored**: delivery anchors resolve to real
  stop identities; transfer hubs fall out of the network. A new city should
  need job authoring and tuning, not new engine work.
- The **data traps live in the folding**, not the fetching: platforms fold
  into stations, a fold's display name has to be chosen deliberately, real
  networks are denser than a board wants. Helsinki paid for these lessons once
  (see the v1-lane record below); do not pay for them again per city.

## 4. The superseded lane, for the record

Toko Move had a second life as a Mini Metro homage (line-drawing, shape
passengers, an abstract campaign) on `claude/toko-move-graphics-zti7gj`
(PR #306, tip `d516a9a5`). The owner superseded that direction — the recorded
override is `OWNER_OVERRIDE_V2.md`, and the core rule in `moveupdates.md` is
explicit: *Toko Move is NOT a line-drawing game.* The live site still serves
that lane's v13 until a v2 build is deployed on the owner's word.

What that lane contributed and the v2 lane already adopted: the GTFS pipeline
and the committed Helsinki/Kallio packs. What it holds that may still be worth
mining: the platform-folding and name-choice logic (`js/city.js` there), the
sea-reconstruction analysis (three closures tried, none complete — its
CITIES.md has the table), and a four-city research file. Nothing else from it
should be merged; two games cannot share one directory.

## 5. What a new chapter costs, as of v2.16

The city layer is **data**. `js/city-build.js` turns a city DEFINITION plus a
source pack into a graph; `cities/helsinki.city.js` is chapter 1's definition,
and `js/real-helsinki.js` is a three-line door onto it. A definition owns which
real stops its anchors resolve to (by alias), what each is called and what it is
for, which anchors are walkable to each other, and the per-mode speeds,
capacities and vehicle counts. It owns **no geometry**: paths and stop sequences
come from the committed pack exactly as the agency published them.

`test/city-build.mjs` holds both halves of that claim — Helsinki's graph is
compared against a frozen fingerprint of what the hand-written v2.11 builder
produced, and a second definition over the same pack is proved to build a
different working board with its own rules.

So chapter 2 is now: **a pack, a definition, a marquee, a catalogue entry.**

### The blocker, stated plainly

The pack is the only hard part, and it cannot be produced from inside the
sandboxed agent environment: the egress proxy denies `api.odpt.org`,
`overpass-api.de` and `api.openstreetmap.org` by organisation policy, so this is
a network limit rather than a missing token — a token would not help. It needs a
run with real outbound access.

Do **not** work around it by drawing a Nagoya network by hand. Authored geometry
presented as a real one is the single thing `TRANSIT_LAYERS.md` and
`OWNER_OVERRIDE_V2.md` both forbid, and it would poison the chapter that is
supposed to prove the pipeline generalises.

### When there is network

1. Fetch a GTFS feed for the city and run the packer, exactly as Helsinki's was
   built — `scripts/gtfs.mjs` reads a feed with no dependency and zero shape
   tolerance. For Nagoya the candidates are the Nagoya Municipal Transportation
   Bureau's GTFS-JP publication and, failing that, OpenStreetMap route relations
   via Overpass (ODbL — the same licence the coastline extract already carries,
   so the attribution line already exists).
2. Write `cities/nagoya.city.js`: the anchors you can actually deliver to, their
   aliases as the feed spells them, the walk links, and the mode table.
3. Add a `city-build` case for it, a marquee, and a catalogue entry.

The Meijō Line is why Nagoya is chapter 2: it is a true loop, so *which
direction you board* is a real decision rather than a formality — the first
thing Helsinki's network cannot teach.
