# Mesh assets — Meshy exports land here

Drop a GLB in this folder and name it in **`manifest.json`**. That file is the
only seam: the loader reads it, and `scripts/hd-shell.mjs` reads the same file
to build the offline precache, so the worker and the game can never disagree
about which art exists. A kind that is not named is never requested — which is
what keeps "no art registered" costing nothing (not even the GLTF loader is
fetched) instead of 404ing on every boot.

```json
"skull": {
  "file": "skull.glb", "as": "voxel", "palette": "bone",
  "jaw": 0.26, "eyes": [[0.35,0.60,0.62],[0.65,0.60,0.62]], "eyeR": 2.0
}
```

## What `as: "voxel"` does (v38 — the house route)

The export is turned upright, scaled to its slot, and cut into a voxel
lattice; the mesh itself is kept as the **alive-skin**. Both come from one
prepared root, so they coincide exactly:

- **alive** — you see the Meshy mesh, Lambert-lit and textured, the sculpt as
  sculpted;
- **wounded** — past 22 % of the lattice shot away the skin comes off and the
  cube body underneath, holes and all, keeps fighting;
- **dead** — it bursts into cubes.

Chips, severed islands, gibs and the bone-yard need no special cases, because
underneath it is only ever voxels.

| key | meaning |
|---|---|
| `file` | the GLB in this folder |
| `as` | `"voxel"` for the route above. Omit for a mesh-only skin. |
| `v` | cache token, default 1 — **bump it whenever the file changes** |
| `skin` | `false` = cubes only, no mesh skin |
| `tilt` / `yaw` | radians about x / y, to stand the export up facing +z |
| `height` | world height; defaults to the slot's own, so hitboxes hold |
| `pitch` | lattice cell size; defaults to a third of the slot's voxel size |
| `palette` | `"bone"` (house ramp) or `"keep"` (the bake's own colours) |
| `lift` | scales luminance before the bone curve — for a dark bake |
| `eyes` | `[[x,y,z], …]` normalized in the model's box, **z = 1 is the front** |
| `eyeR` | ember radius in cells around each eye (default 1.6) |
| `jaw` | bottom fraction that becomes the hinged jaw (skull only) |
| `smooth` | colour-blur passes over surface cells (default 1) |

**`tilt` is the rotation. `pitch` is the cell size.** They are easy to confuse
and the first cut of this did: `pitch: 0.75` sliced the brute into 0.75-unit
cubes instead of standing it up.

**Hitboxes are locked per enemy class**, so `height` defaults to the height of
the string-art slot being replaced (skull 1.40, watcher 0.76, dread 2.50,
leviathan ~6.3). Overriding it changes how an enemy LOOKS against how it HITS.

**Tokened URLs from day one.** The Pages CDN caches 404s for ~10 minutes, so a
brand-new untokened path can serve a black screen right after deploy. The
loader always asks for `?v=N`; bump `v` in the manifest when you replace a file.

## Turning an export by looking at it

`voxel-lab.html` lists every registered asset. In its console:

```js
__lab.revox('brute', { tilt: 0.75, lift: 1.45 })   // re-cut live from the loaded mesh
__lab.voxelConfig('brute')                          // what it is using now
```

Copy the config into `manifest.json` when it reads right. Every art decision in
v38 was made from a picture off that bench — including the brute's tilt sign,
which was settled by rendering four values rather than by reasoning about them.

Everything is fail-soft: a missing or broken GLB logs one console warning and
the slot keeps its built-in string-art model. Budgets and prompt guidance:
`../ART_PIPELINE.md`.
