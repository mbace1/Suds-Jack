# Hyper Dagger — the Blender pipeline (HD-015)

This is the contract between Blender and the game for **hard-surface parts**.
Every number lives in **`contract.json`** beside this file. The Blender library
and the node validator both read that file, so the two cannot drift. This README
is the reasoning; where the two disagree, `contract.json` wins.

The plan and its decisions: `../docs/HD-015-blender-pipeline-plan.md`.

## Why Blender here, and where it stops (a recorded override)

The root `ART_PIPELINE.md` §0 says: *"A Meshy feature is always the primary
choice."* **This lane overrides that for one class of asset**, on the owner's
direction (Mikael, 13 Oct 2026: *"We should have a blender pipeline also on the
PC with PRs."*).

- **Meshy stays the route for sculpts**: skulls, enemies, monuments, anything
  that becomes a voxel lattice through `assets/manifest.json` (`as: "voxel"`).
- **Blender is the route for hard-surface parts whose dimensions the game
  depends on.** An image-to-3D mesh has no exact size, no named parts and no
  chosen origin. The landspeeder hull needs all three: its deck top sits at the
  truck's origin, its cab centre is the gaze target, and its pods sit at fixed
  points.
- **For now the lane carries one asset, the speeder hull** (Mikael, 15 Oct).
  Nothing else goes through it until that has worked end to end.

## Versions

Two Blender versions are in use: **4.5.13 LTS and 5.2.1 LTS**. Both install as
the `bpy` Python module (4.5.13 on Python 3.11, 5.2.1 on 3.13), so everything
here runs headless on the PC, in a cloud session and in CI.

Measured on 13 Oct 2026:

- Both export the same test file with identical node names and positions.
- Both accept every flag in `contract.json`'s `export` block, and the results
  match: no extensions, no images.
- A `.blend` saved by 4.5.13 opens in 5.2.1 cleanly. One saved by 5.2.1 opens in
  4.5.13 with interface warnings, and anything newer than 4.5 in it is dropped.
  So **sources are saved from 4.5.13.**

## Who models, and how

**Claude builds the meshes by script** (Mikael, 15 Oct). Each asset is a
generator, `assets/<name>.py` in this folder, using `bpy` and `bmesh` only:

```
blender -b -P hyperdagger/pipeline/assets/speeder.py      # on the PC
python3.11 hyperdagger/pipeline/assets/speeder.py         # anywhere bpy 4.5.13 is installed
```

A generator builds the model, validates it against `contract.json`, saves the
`.blend` to `hyperdagger/art-src/`, exports the `.glb` files to
`hyperdagger/assets/vehicles/` and renders previews to a scratch folder. The
`.blend` is committed so anyone can open the result in Blender. **The script is
the source of truth.** If someone hand-edits a `.blend`, add a line below
saying the script no longer rebuilds that asset.

The PR is the review point. It carries the generator, the `.blend`, the `.glb`
files and the manifest line, with the preview renders and an in-game screenshot
attached. A green validator says the file fits; only the pictures say it looks
right. Mikael merges.

## Ground rules (every asset)

| | |
|---|---|
| Units | metres, unit scale 1.0 |
| Frame | Blender **+Z up, the front along +Y**. The exporter's "+Y up" turns that into the game's +Y up with the front toward −Z. Measured: a point at Blender (−1.2, 3.0, −2.4) lands at glTF (−1.2, −2.4, −3.0). |
| Origin | the point the game puts the object at; for the speeder, **the centre of the deck top** |
| Transforms | applied on every mesh: location 0, rotation 0, scale 1. Empties carry a location and nothing else. |
| Export | exactly `contract.json`'s `export` block: `.glb`, no Draco (no decoder is vendored), no images, no cameras, lights or animation |
| Materials | named from `HULL`, `ACCENT`, `GLASS`, `GLOW`, `DARK`, at most 4 a file. The game supplies the colours: each truck keeps its random trailer colour and `GLOW` follows the season. |
| Names | lower-case with hyphens: `speeder-mid.glb` |
| Where | `.glb` in `hyperdagger/assets/vehicles/`, source in `hyperdagger/art-src/`, generator in `pipeline/assets/` |
| Deploy | the game needs `assets/` only. `art-src/` and `test/` stay out of the publish: the `.blend` files are megabytes and nothing serves them. |
| URLs | every file listed in `manifest.json` with a `v` token from its first release, because the Pages CDN caches a 404 for minutes |

## The speeder

HD-014 turns season 3's trucks into landspeeders: B2 skiff, C2 float, D2 pods,
E2 glow pool, F2 stall (Mikael, 13 Oct, on #598). Steps 3–4 of HD-014 build
that look procedurally first. This asset replaces two named procedural parts,
`hull` (the trailer body) and `cab`. **The procedural roof stays** and remains
the surface you land on, so `topAt()`, standing, cargo and the deck pin never
see the art.

**Three cuts by length.** Each truck draws its own size (`convoy.js`): width
2.6–3.4, depth 7.0–11.5, trailer height 2.0–3.8. The game picks the cut nearest
the truck's length and fits it.

| cut | depth | cab centre (Blender) |
|---|---|---|
| short | 7.75 | (0, +5.425, −2.19) |
| mid | 9.25 | (0, +6.175, −2.19) |
| long | 10.75 | (0, +6.925, −2.19) |

All three are modelled at width 3.0 and trailer height 2.9, the middle of the
convoy's ranges. Fitted, a cut scales at most 10% along its length and 13%
across.

**The height band.** Trailer height varies ±31% on its own, more than three
length cuts can hold. Two empties, `band_lo` and `band_hi`, mark a plain stretch
of the hull's sides at least 1.2 m tall. Only vertices between them stretch with
the truck's height; everything above and below just moves. That keeps the pods,
fins and nose at their true size. Keep the band to flat side walls. Nothing
with a shape of its own goes inside it.

| rule | value | why |
|---|---|---|
| meshes | `hull`, `cab` | the procedural parts they replace (HD-014 step 2 names them) |
| empties | `pod_FL`, `pod_FR`, `pod_RL`, `pod_RR`, `glow`, `band_lo`, `band_hi` | thruster points, the glow pool's centre, the height band |
| hull top | Z between −0.1 and 0 | sits right under the procedural roof, never above it |
| lowest point | Z ≥ −3.6 | the road is 4.0 below the nominal deck; keep air under the pods |
| overhang | 0.4 across, 0.2 along | fins may stand proud of the deck, but not reach the next lane |
| cab | 2.76 × 2.6 × 2.3, centre within 0.1 of its cut's | the game moves the cab to each truck's own cab position, the gaze target (`cabLocal`) |
| budget | hull ≤ 1,500 triangles, cab ≤ 600, file ≤ 150 KB | per cut; draw calls per truck no more than the procedural truck |

## What the game does with it (HD-015 step 4)

A `vehicles` block in `assets/manifest.json` names the cuts with `as: "parts"`.
The convoy loads them and swaps each truck's named parts for the nearest cut's,
fitted as above. Everything is fail-soft: a missing or broken file logs one
warning and the trucks stay procedural. The block is added in step 4, not before,
because the offline worker precaches the manifest and an edit with nothing to
read it would cost a cache bump for nothing.

## Status

| step | what | state |
|---|---|---|
| 1 | this README and `contract.json` | this PR |
| 2 | `scripts/hd-asset-check.mjs`, its test, a CI lane | queued |
| 3 | `hd_blender.py` and `test/blender.mjs`, under both versions | queued |
| 4 | the loader, and the manifest's `vehicles` block | queued |
| 5 | `assets/speeder.py`: the hull in three cuts | after HD-014 steps 3–4 |
