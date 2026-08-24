# The ground — what the board is made of

The spec for the land under the lines, and the format the importer writes.
Owner ruling 2026-08-19: the map's blocks and water come from **real geometry**,
not from procedural invention and not from a painted plate.

> "b — let's get the specs down and then generate art to fit that."

So this is the spec. Art is made to fit it, not the other way round.

---

## 1. Why this exists

`city.js` holds ten stops projected from real WGS84 positions and **nothing
else**. The renderer therefore draws routes over a void, while the owner's
target map is mostly *land, water and blocks* with the lines sitting on top.

Inventing that ground would break the one promise this board makes — that a
local can hold it up against the real place and check it. Kallio is a high
block between two waters, and a map that forgets the water is a map of
somewhere else.

## 2. The format

`flow-core/ground.js`, generated and committed:

```js
export const GROUND = {
  kallio: {
    source: '<the URL it came from>',
    box: { x0, y0, x1, y1 },     // the board plus 14 units of margin
    land: [[x, y], …],           // a closed ring in DESIGN UNITS
  },
};
```

- **Design units, not degrees.** One unit is 10 metres, and the projection is
  `project()` in `city.js` — imported by the importer rather than repeated, so
  the ground and the stops cannot drift apart. The contract test re-derives all
  ten stops through it and compares against the hand-written node table.
- **`land` is a closed ring; everything outside it is water.** One shape, and
  the water is the negative space — the same trick the fight board uses for
  cover, and it means a coastline is the only thing anybody has to get right.
- **Committed, not fetched.** No build step, and four games here ship offline
  workers; a map that needs the network to know where the sea is would break
  that. Re-run the importer when the source changes, which for a coastline is
  approximately never.
- **A product decides whether to draw it.** Behind `theme.relief`, like the
  torn tags and the card shadows — Piritori is a paper diorama, Toko Move is
  flat daylight, and flow-core stays neutral by carrying geography rather than
  a look.

## 3. Running it

```bash
node flow-core/tools/ground.mjs --dry     # fetch, project, clip, print, write nothing
node flow-core/tools/ground.mjs           # …and write flow-core/ground.js
```

## 4. What is done, and the one thing that is not

**Done and checked:** the format above; the importer, with Sutherland–Hodgman
clipping to the real board and Douglas–Peucker simplification; `project()`
exported from `city.js` and proven against every stop by the contract test.

**Not done: the source.** It needs a LANDMASS — where the water starts —
and the obvious one is OpenStreetMap's `natural=coastline`.

**Overpass is blocked here.** `overpass-api.de` answers CONNECT with 403 at the
egress gateway, which is the same failure `api.meshy.ai` has and is recorded
the same way (`assets/README.md`). **Allowing `overpass-api.de` in the
environment's domains finishes this**: claude.ai/code → the cloud icon above
the message box → edit the environment → Network access → Custom → allowed
domains.

**One reachable alternative was tried and rejected on inspection.** Who's On
First `890537285` is Kallio's macrohood polygon carrying Helsinki's own city
GIS geometry — authentic, public domain, and the wrong *kind* of shape. It is
an **administrative** boundary: a point-in-polygon test puts the open water
south of Hakaniemi and the whole of Eläintarhanlahti **inside** it. Drawn as
land it would paint the harbour as ground, which is a worse map than no map at
all. Its URL is kept in the importer so nobody spends the afternoon finding it
twice.

Two things worth knowing when the real source lands:

1. **A closed ring cannot go straight into Douglas–Peucker.** Wrapping it so
   the first point repeats at the end makes the baseline segment zero-length,
   every distance is measured against nothing, and a 37-point coastline
   simplifies to a single point. It happened. The ring is split at its two most
   distant points and each half simplified as an open chain.
2. **Blocks are a second dataset, not this one.** The targets' raised paper
   slabs are city blocks, which fall out of the street network rather than the
   shoreline: draw the land, lay the streets over it as strips, and the blocks
   are what shows between them. Same importer, one more query.

---

## 5. The source landed — 2026-08-24

**The ground is generated.** `flow-core/ground.js` exists, built by
`flow-core/tools/ground-data.mjs` from committed data in `flow-core/data/`,
with no network at all.

The water was fetched on a machine that can reach Overpass and brought here as
data. §4's blocker stands for anyone re-running `ground.mjs` — `overpass-api.de`
is still 403 at the gateway — but nothing needs to re-run it: a coastline
changes approximately never, and the offline workers wanted committed data
anyway.

### 5.1 Two independent confirmations of §4's rejection

§4 rejected Who's On First's Kallio macrohood because a point-in-polygon test
put the open water inside it. The Piritori → Eden map work hit the **identical
trap with a different dataset** — Helsinki's own official sub-district polygons —
and tested five points before believing it: Eläintarhanlahti, Töölönlahti,
Sörnäistenselkä, Kruunuvuorenselkä and the open sea south of the city. All five
fall *inside* a district (`TRANSIT_LAYERS.md` §11.3).

Two sessions, two datasets, one conclusion worth stating flatly so nobody tries
a third: **an administrative boundary is not a coastline.** Their union is not
land and their complement is not water.

### 5.2 One departure from §2's format, and it is the data's

§2 asked for `land`: **one** closed ring, water as the negative space. Real
Kallio does not have one.

OSM maps the sea as `natural=coastline` — a directed **open** line with land on
its left and the water only *implied*. Closing one into a polygon puts a lid
across the harbour mouth. The extract arrives as **27 open coastline runs** plus
**27 separate inland water bodies**, and no amount of processing turns that into
a single ring without inventing the joins.

So `ground.js` carries:

```js
water: [[[x, y], …], …]   // closed rings — fillable bodies
coast: [[[x, y], …], …]   // open runs — stroke them
rail:  [{ service, mode, shape: [[x, y], …] }]
```

A renderer **draws** the sea rather than inferring it. That is more honest about
what is known, and it means the negative-space trick — which was elegant — is
not load-bearing for a shape that does not exist.

### 5.3 The margin had to change, and here is the measurement

`ground.mjs` used `PAD = 14` (140 m). Against the real coastline, **the nearest
water is 129 m from the board's edge** — so at 140 m the sheet catches two
slivers in one corner and the map still forgets the water §1 says it must not:

| pad | | water areas | coast runs |
|---:|---|---:|---:|
| 14 | 140 m | 0 | 2 |
| 30 | 300 m | 2 | 7 |
| **60** | **600 m** | **11** | **14** |
| 100 | 1000 m | 22 | 22 |

`ground-data.mjs` defaults to **60**, which puts a shore on both sides of the
block — §1's "high block between two waters". It is a *drawn-extent* decision
rather than a data one, so it is `--pad` and easy to change.

### 5.4 Rail came with it

Since the geometry was being imported anyway, `ground.js` also carries the
**real tram and metro alignments** through the board — 11 line directions from
HSL's own GTFS, clipped and projected the same way.

For Toko Move that is the difference between a Mini Metro on an abstract graph
and one **on the real map of Kallio**, which is what its catalogue entry already
claims. A drawn line can follow the rails that are actually there.

§4's note 2 — that blocks fall out of the street network — is still true and
still undone. `map/kallio-corridors-v1.json` in the Piritori repo is that street
network if anyone wants it; it is corridors that carry service, not every street,
and it is honest about the difference.
