# Toko Move — exact transit layers

## Owner lock — 2026-08-29

Tram and metro geometry must come from source transit data. Do not redraw, smooth, simplify, octolinearise, or invent route shortcuts for the street view.

Every HSL line-direction is its own display layer. A layer can be shown, hidden, or soloed without changing any other route.

## Source currently committed

`toko-move/cities/kallio.json` is copied byte-for-byte from the real-network Cities work in PR #306. It was built from HSL GTFS, fetched 2026-08-21, licensed CC BY 4.0. It contains real stop coordinates and traced route paths.

Important: the pack is a bounding-box extract (`60.17–60.20`, `24.93–24.98`). Its own source note says it is **not the whole network**. Therefore this file is authoritative inside its extract, but it does not satisfy the final requirement of every Helsinki tram route by itself.

## Rendering contract

`js/transit-layers.js` keeps each source `line.path` unchanged and gives every source line-direction independent visibility state. It deliberately separates exact street geometry from the current authored delivery graph.

Do not force this geometry onto the current approximate `helsinki.js` coordinate system. The delivery board must move onto the same real projection before these layers become the playable basemap.

## Next data step

Generate or recover a full Helsinki HSL GTFS pack using the existing `scripts/gtfs.mjs` work from PR #306, retaining every current tram route and the metro network needed by the game. Then point the same layer controller at that full pack. No hand-authored replacement routes.
