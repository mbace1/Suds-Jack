# Toko Drop 2.0 — Concept art handoff for Claude

Prepared by Toko Art (2026-10-31, Europe/Helsinki). Do **not** invent a new look; ground work in the files under this folder and in `js/scenery.js` / `js/floor.js` / `js/tuning.js`.

## Visual lanes (locked)

| Lane | What | Status |
|------|------|--------|
| **2.0 watercolor** | Mood + design language for concepts | Active |
| **2.0 3D cel-shaded** | Later style option | Planned |
| **2.0 3D textured** | Later style option | Planned |
| **Midori Edition / 4.0** | Drive kit: Wall and Floor, enemy idea, HUD… | Alternate — do not use as 2.0 target |

Style picker / Gallery later should expose: watercolor · 3D cel-shaded · 3D textured. Mood pics 1–2 belong under Gallery → concept art.

## Mood + design refs (must read)

- `mood/mood-01-board.jpg` — watercolor **mood** piece only (not production target alone).
- `mood/mood-02-cubes.jpg` — **design**: Yella Cube (diagonal + slime trail), Orange Cube (row shots). Cubes have **no letters**.
- `mood/press-classic.png`, `mood/press-rush.png` — **camera**: ~30° high three-quarter portrait, slab foreshortened, twin-stick screenshot angle.

### Hero
White translucent **dome/blob** (half-sphere slime) from the mood/cube sheets — **not** a cyan teardrop.

### Enemies (2.0 design)
Letterless Yella + Orange cubes only in these concepts. Midori roster is 4.0.

## World 1 — The Surface (grid)

Code: `scenery` world 1 = grid in void; floor style `grid`; campaign Surface (`rail #5555cc`, base navy, gridHi teal). Level `three-rings.json`: **three circles side-by-side** (centers −11 / 0 / +11), short bridges — not stacked vertically.

Art in this pack:
- `world-1/01-surface-three-rings-v2.jpg` — gameplay concept
- `world-1/01-grid-rail-modules.jpg` — modular rail / grid / void / light pool / arena layout

**Implement:** modular rail pieces form arena bounds; void beyond; teal grid floor; no curb, no lawn.

## World 2 — The Well / driveway

Code: driveway scenery — concrete curb on far + two long sides, open near side, lawn beyond; camera follows; concrete floor with grit/oil. Campaign Well (teal undertow / current).

Art in this pack:
- `world-2/02-well-concept-v3.jpg` — gameplay concept (curb, grass corners, cracks, storm drain)
- `world-2/02-curb-lawn-modules-v2.jpg` — modules (straight/corner/open curb, grass tuft, lawn, cracked concrete, drain, **Arena layout**)

**Implement:** curb modules tile the rectangle; grass on non-play; extra env meshes outside; cement details (cracks, drain).

## What Claude should do

1. Drop these images into the repo under something like `toko-drop/art/concepts/2.0/` (or the project’s existing art path).
2. Wire Gallery → concept art to show `mood-01` and `mood-02` (and optionally world concept frames).
3. Add style option stubs: `watercolor` | `cel` | `textured` (watercolor first).
4. For meshes: author **simple modular glTF / Three.js geometries** that match the module sheets (curb segments, rail arcs, drain disc, grass billboard/tuft). Fit scales to `tuning.js` curbWidth/Height and rail/grid cell sizes. Prefer extending `scenery.js` patterns over a new pipeline.
5. Do **not** replace 2.0 with Midori Edition jelly-cube walls.
6. Do **not** post to social or ship marketing crops without Mikael.

## Mesh bots

A Grok Bot executor (or Claude in Cursor) can generate placeholder meshes (Box/Extrude/Lathe → glTF) that match the module silhouettes. Final art-directed meshes may still need a 3D pass (Blender / Meshy). Start with code-built modules that match the sheets; swap later.

## Out of scope for this pack

Worlds 3–6 (Vein, Void, Foam, Kiln), full Midori enemy kit, game balance, social posts.
