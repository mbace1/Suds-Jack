# Toko Move baseline

Toko Move is a mobile-first, family-friendly traffic simulation derived from
the owner’s 2021 Project Move concept. It is not a cosmetic mode inside
Piritori → Eden; it is a separate daily game built on the same neutral graph,
agents, route renderer and deterministic helpers.

## Four layers

1. **Need** — home, work, school, shops and visits create reasons to move.
2. **Local / private** — walking, cycling and cars trade speed, distance,
   capacity and emissions.
3. **Public** — transit moves larger groups but creates shared queues and
   transfers.
4. **Service** — freight, care, maintenance and shops keep the other layers
   available.

The player taps two places to draw a route, chooses its mode and reads the
result directly on the map. A healthy day completes journeys, covers most of
the city and keeps emissions below the goal. Growth adds demand until a clean
diagram becomes hectic.

## First-slice controls

- tap a start and destination to open a shortest-path route;
- choose walk, bike, transit or car before drawing;
- draw up to five routes and remove the newest route;
- isolate one of four traffic layers without changing the network;
- pause or restart a compressed 07:00–19:00 day.

The source slide’s old Q4 2021 and free-with-paid-content assumptions are
historical context, not current product decisions.

