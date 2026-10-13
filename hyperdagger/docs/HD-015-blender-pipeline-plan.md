# HD-015 — A Blender pipeline for Hyper Dagger: PLAN (for review, no code)

- Queue item: HD-015 (`hyperdagger/QUEUE.md`). Size L. Step 5 waits on HD-014 steps 3–4.
- Owner direction (Mikael, 13 Oct 2026): *"We should have a blender pipeline also on the PC with PRs."*
- Gate: plan before code. Mikael picks the open questions in §8, then code lands in small PRs. Merging needs Mikael's yes.
- Base: `origin/main` @ `603e76d82` (#590). Line numbers are for that commit.

## 1. Why Blender, and where it stops

The root `ART_PIPELINE.md` §0 says: *"A Meshy feature is always the primary choice."* This plan overrides that for one class of asset, and the override is recorded here and, when step 1 merges, in the pipeline README and as one line in `ART_PIPELINE.md` §0.

- **Meshy stays the route for sculpts.** Skulls, enemies, monuments: anything that becomes a voxel lattice through `assets/manifest.json` (`as: "voxel"`). Nothing in that lane changes.
- **Blender becomes the route for hard-surface parts whose dimensions the game depends on.** The first is HD-014's landspeeder hull. Its deck top must sit at the truck's origin, its cab centre is the gaze target, and its thruster pods sit at fixed points. An image-to-3D mesh has no exact dimensions, no named parts and no chosen origin. A Blender export has all three.
- **Two Blender versions are in use: 4.5.13 LTS and 5.2.1 LTS** (Mikael, 13 Oct 2026). Both are on PyPI as the `bpy` module, 4.5.13 for Python 3.11 and 5.2.1 for 3.13. A cloud session installed both, ran each headless and exported the same test file from each, with identical node names and positions. So the script runs and is tested in the cloud and in CI, not only on the PC.

## 2. What exists now

- **The asset seam.** `assets/manifest.json` lists GLBs. `mesh-enemies.js` and `meshassets.js` load them, voxelize enemies and place the backdrop. `GLTFLoader` is vendored (`vendor/jsm/loaders/`). **No Draco or meshopt decoder is vendored.** Everything is fail-soft: a broken file logs once and the procedural slot stays.
- **The trucks are procedural boxes** (`js/convoy.js` `_truck()` L238–297). HD-014 step 2 (PR #600) removes the wheels and names the parts `hull`, `deck`, `edge`, `cab`, `glass`, `brake`. Steps 3–4 add the picked look procedurally: B2 skiff, C2 float, D2 pods, E2 glow pool, F2 stall.
- **Two Blender precedents in this repo.** `powder/pipeline/` enforces its contract at load and ships a setup/validate/export script that has never run in Blender, because nobody knew the `bpy` wheels would install in a cloud box. `concrete/art-source/` keeps `.blend` sources (Blender 5.2.1 LTS), an export script and a validator. This plan borrows Powder's shape: one contract, enforced where the file is read.

## 3. The loop on the PC

```
git switch -c art/hd-015-speeder origin/main
blender -b -P hyperdagger/pipeline/hd_blender.py -- setup speeder        # template scene, saved to art-src/
#   model in Blender
blender -b hyperdagger/art-src/speeder.blend -P hyperdagger/pipeline/hd_blender.py -- validate
blender -b hyperdagger/art-src/speeder.blend -P hyperdagger/pipeline/hd_blender.py -- export
#   writes hyperdagger/assets/vehicles/speeder.glb and three preview renders to a scratch folder
node scripts/hd-asset-check.mjs hyperdagger/assets/vehicles/speeder.glb
git add hyperdagger/assets/vehicles/speeder.glb hyperdagger/assets/manifest.json hyperdagger/art-src/speeder.blend
#   open a PR with the template; attach the three renders and an in-game screenshot
```

The PR is the review point. CI runs the validator on it. The renders and an in-game screenshot are the evidence, because a green validator says the file fits, not that it looks right. Mikael merges.

Claude Code on the PC can drive the same commands headless, including modelling by script, and open the PR with `gh`. A cloud session can do the same through `bpy`, minus your hands in the viewport.

**Versions.** The script and the gate run under both 4.5.13 and 5.2.1. Measured on 13 Oct: a `.blend` saved by 4.5.13 opens in 5.2.1 cleanly, and one saved by 5.2.1 opens in 4.5.13 with interface warnings only, for a plain mesh. Anything newer than 4.5 in a 5.2.1 file would be dropped on the way back. So **sources are saved from 4.5.13** unless an asset needs a 5.x feature, and then its README line says so.

## 4. The contract (draft numbers; the review settles them)

One file, `hyperdagger/pipeline/contract.json`, holds every number below. The Blender script and the node validator both read it, so the two cannot drift.

| | |
|---|---|
| Units | metres, unit scale 1.0 |
| Frame | Blender **+Z up, front (the cab end) along +Y**. The exporter's default "+Y up" turns that into the game's +Y up with the front toward −Z, which is where the convoy puts the cab. Tick nothing else. |
| Origin | **the centre of the deck top**, the same point as the truck group's origin (`convoy.js` L235–237) |
| Nothing above the deck | every mesh's max Z ≤ 0. The procedural roof stays the landing surface, so `topAt()` and the HD-014 deck pin never see the art. |
| Transforms | applied on every mesh (rotation 0, scale 1). Empties may carry a translation. |
| Format | `.glb`, **no Draco** (no decoder is vendored and a hull does not need one), no textures in v1 |
| Materials | by name only: `HULL`, `ACCENT`, `GLASS`, `GLOW`, `DARK`. The game supplies the colours, so each truck keeps its random trailer colour and `GLOW` follows the season. At most 4 per file. |
| Required parts | mesh `hull`; mesh `cab`; empties `pod_FL`, `pod_FR`, `pod_RL`, `pod_RR`; empty `glow` |
| Cab | its bounding-box centre within 0.1 u of the nominal cab centre below, because that point is the gaze and missile target (`cabLocal`) |
| Nominal size | width 3.0, depth 9.25, trailer height 2.9: the middle of the convoy's ranges. Cab 2.76 × 2.6 × 2.3, centre at Blender (0, +6.175, −2.19). |
| Budget | `hull` ≤ 1,500 triangles, `cab` ≤ 600, file ≤ 150 KB. Draw calls per truck no more than the procedural truck after HD-014 step 2 (HD-011 measures it). |
| Where | `hyperdagger/assets/vehicles/<name>.glb`, lower-case and hyphens, listed under a new `vehicles` block in `manifest.json` with `as: "parts"` and a `v` token from day one (the Pages CDN caches a 404 for minutes) |
| Sources | `hyperdagger/art-src/<name>.blend`. The Hyper Dagger publish must keep omitting `art-src/` and `test/`. |

## 5. Trucks are not one size (the one real design question)

Each truck draws its own size: width 2.6–3.4, depth 7.0–11.5, trailer height 2.0–3.8 (`convoy.js` L240–241, `_truck` signature L238). The deck must stay identical for the same seed, so the art has to fit the truck, never the other way round.

- **S1 Stretch.** One hull, scaled per axis to each truck. Cheapest. Height varies up to about ±31%, which squashes or stretches pods and fins.
- **S2 Three cuts.** Short, mid and long hulls. The nearest is picked and scaled by 15% or less. Three files to make and keep in step.
- **S3 Modular.** Nose, middle and tail pieces, with the middle stretching. Details stay true size. The most authoring work, and the loader has to assemble.

Recommendation: **S1 for the first asset**, with the smallest and largest truck rendered in the PR. Move to S2 only if the extremes read wrong.

## 6. Step plan (small PRs, each needing Mikael's yes)

1. **Contract.** `pipeline/README.md`, `pipeline/contract.json`, the override line in `ART_PIPELINE.md` §0, an empty `vehicles` block in the manifest. Docs and data only.
2. **The validator.** `scripts/hd-asset-check.mjs`: bare node, no dependencies. It reads the GLB's JSON chunk and checks names, bounds (accessor min/max plus node translation), transforms, triangle counts (index counts), material names, no Draco or images, and size. `hyperdagger/test/asset-check.mjs` runs it against a good fixture written by three's `GLTFExporter` in node (as `powder/test/roundtrip.mjs` does) and against broken variants. A new `hyperdagger_assets` lane in `gates.yml` runs it on `^hyperdagger/(assets|pipeline)/` and the script itself. This is Hyper Dagger's first CI lane; the 40-minute smoke gate stays local.
3. **The Blender script.** `pipeline/hd_blender.py` with `setup`, `validate` and `export`. Setup builds the template: the deck plane at Z 0 as a wire reference, the nominal envelope, the cab envelope, the five empties and stub materials. Export writes the GLB with the contract's flags plus three preview renders: three-quarter front, side and underside. `hyperdagger/test/blender.mjs` runs setup → validate → export under both `bpy` versions and hands each GLB to the node validator, and the two exports must agree on part names, bounds and triangle counts. CI runs it only when `pipeline/` changes, with the pip cache on, since each wheel is about 370 MB. Preview renders are not yet tested headless: Eevee wants a GPU, so they use Cycles on the CPU at low samples.
4. **The loader.** `as: "parts"` in the convoy: once the GLB loads, each truck's named procedural part has its geometry replaced by the GLB's part of the same name, scaled per §5. `topAt`, standing, cargo and the jackknife are untouched. Fail-soft: a bad or missing file leaves the boxes. Smoke: the HD-014 deck pin passes with the asset loaded and with it missing, and draw calls per truck are no more than procedural.
5. **The first asset: the speeder hull** (B2 skiff with D2 pods), modelled on the PC through the loop. It goes after HD-014 steps 3–4 land, so the procedural skiff is the baseline it has to beat.

## 7. Risks

- **Two validators drifting.** Avoided by one `contract.json` read by both.
- **Binaries in git.** No LFS in this repo. Keep one current `.blend` per asset, textures unpacked or absent, about 5 MB at most.
- **The deploy copying sources.** `art-src/` must stay out of the published tree.
- **Two Blender versions.** Every exporter flag is named rather than left to a default, and the gate exports under both and compares. If the two ever disagree, 4.5.13 is the reference, because both versions open its files.
- **Art that looks right in Blender and wrong in the game.** The game renders unlit with fog and bloom. The PR needs an in-game screenshot, not only Blender renders.

## 8. Open questions for Mikael

1. Size handling: **S1** stretch, **S2** three cuts, or **S3** modular?
2. ~~Which Blender version is on the PC?~~ **Answered (13 Oct): 4.5.13 and 5.2.1.** Both are supported and both are in the gate (§3, step 3).
3. Who models: you by hand, Claude Code on the PC by script, or both?
4. Commit the `.blend` sources to `hyperdagger/art-src/`, or keep them on the PC and commit only GLBs?
5. After the hull, what else goes through this lane: the season hands, season 1's shale, platforms?
