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

## Ground data — water, streets, place names (added v2.20)

The same rule as the transit geometry, applied to everything under it: real
source data, its provenance carried in the file, its licence on screen, and no
authored shape presented as a real one. Three packs live in
`toko-move/cities/ground/` and are read by `js/ground.js`:

| pack | source | licence | extent |
|---|---|---|---|
| `helsinki-water.json` | OpenStreetMap via Overpass | ODbL 1.0 | 60.148–60.218N — the whole board |
| `helsinki-streets-centre.json` | OpenStreetMap via Overpass | ODbL 1.0 | **60.17–60.20 / 24.93–24.98 only** |
| `helsinki-districts.json` | City of Helsinki osa-aluejako 2015 (dhh16 mirror) | open city data | the Era II extent |

All three were produced by the Piritori map work and recovered from `gh-pages`
commit `606058bb`. **Their importers (`map/tools/water-import.mjs`,
`streets-import.mjs`, `districts-extract.mjs`) are not in any branch of this
repository** — the packs name them in `generatedBy` and the code did not
survive. Regenerating or extending them means writing the fetch again.

### Known limits, and what fixes each

- **Streets stop at the centre extract.** Outside it the board keeps its
  schematic corridors, and the on-screen credit names the extent. The fix is one
  Overpass query for the full board box on a machine with outbound access — the
  egress proxy here refuses `overpass-api.de` by policy, so this is not a token
  problem.
- **The open sea is shaded, not filled.** An OSM coastline is a directed open
  line; closing it puts a lid across the harbour mouth. The water pack's own
  note states the real fix: the assembled water polygons from
  `osmdata.openstreetmap.de`, clipped to the box, added as more `areas` — no
  schema change needed.
- **A third of the street pack is never drawn** (`service`, `track`, and the 260
  closed `pedestrian` rings, which are squares mapped as areas). That filter
  lives in `js/ground.js` and is held by `test/ground.mjs`.
