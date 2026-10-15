# HD-015 — A Blender pipeline for Hyper Dagger: PLAN (for review, no code)

- Queue item: HD-015 (`hyperdagger/QUEUE.md`). Size L. Step 5 waits on HD-014 steps 3–4.
- Owner direction (Mikael, 13 Oct 2026): *"We should have a blender pipeline also on the PC with PRs."*
- Gate: plan before code. Mikael answered §8 on 13–15 Oct; code lands in small PRs. Merging needs Mikael's yes.
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

## 3. The loop (on the PC or in a cloud session)

**Claude builds the meshes by script** (Mikael, §8). Each asset is a generator, `pipeline/assets/<name>.py`, written against `bpy` and `bmesh` only, so the same file runs in the PC's Blender and in a cloud session's `bpy` module.

```
git switch -c art/hd-015-speeder origin/main
blender -b -P hyperdagger/pipeline/assets/speeder.py      # on the PC
python3.11 hyperdagger/pipeline/assets/speeder.py         # in a cloud session, with bpy 4.5.13
#   builds the three cuts, validates them against contract.json, saves
#   hyperdagger/art-src/speeder.blend (from 4.5.13), exports
#   hyperdagger/assets/vehicles/speeder-{short,mid,long}.glb and renders previews to scratch
node scripts/hd-asset-check.mjs hyperdagger/assets/vehicles/speeder-*.glb
git add hyperdagger/pipeline/assets/speeder.py hyperdagger/art-src/speeder.blend \
        hyperdagger/assets/vehicles/ hyperdagger/assets/manifest.json
#   open a PR with the template; attach the renders and an in-game screenshot
```

The PR is the review point. CI runs the validator on it. The renders and an in-game screenshot are the evidence, because a green validator says the file fits, not that it looks right. Mikael merges.

The `.blend` is committed (Mikael, §8) so anyone can open the result in Blender. The script stays the source of truth: if someone hand-edits a `.blend`, that asset's README line says the script no longer rebuilds it.

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
| Cab | its bounding-box centre within 0.1 u of its cut's nominal cab centre (below). The loader then moves it to each truck's own cab position, because that point is the gaze and missile target (`cabLocal`). |
| Three cuts | by length (§5): **short** depth 7.75, **mid** 9.25, **long** 10.75; all width 3.0 and trailer height 2.9. Cab 2.76 × 2.6 × 2.3, its centre at Blender (0, depth/2 + 1.55, −2.19): +5.425, +6.175, +6.925. |
| Height band | empties `band_lo` and `band_hi` mark a plain stretch of the hull's sides. Only vertices between them stretch with the truck's height; everything above and below moves without scaling. |
| Budget | per cut: `hull` ≤ 1,500 triangles, `cab` ≤ 600, file ≤ 150 KB. Draw calls per truck no more than the procedural truck after HD-014 step 2 (HD-011 measures it). |
| Where | `hyperdagger/assets/vehicles/<name>-<cut>.glb`, lower-case and hyphens, listed under a new `vehicles` block in `manifest.json` with `as: "parts"` and a `v` token from day one (the Pages CDN caches a 404 for minutes) |
| Sources | `hyperdagger/art-src/<name>.blend`. The Hyper Dagger publish must keep omitting `art-src/` and `test/`. |

## 5. Trucks are not one size (the one real design question)

Each truck draws its own size: width 2.6–3.4, depth 7.0–11.5, trailer height 2.0–3.8 (`convoy.js` L240–241, `_truck` signature L238). The deck must stay identical for the same seed, so the art has to fit the truck, never the other way round.

- **S1 Stretch.** One hull, scaled per axis to each truck. Cheapest. Height varies up to about ±31%, which squashes or stretches pods and fins.
- **S2 Three cuts.** Short, mid and long hulls. The nearest is picked and scaled by 15% or less. Three files to make and keep in step.
- **S3 Modular.** Nose, middle and tail pieces, with the middle stretching. Details stay true size. The most authoring work, and the loader has to assemble.

**Decided: S2, three cuts** (Mikael, 15 Oct). The cuts are by length, and they keep the hull within 10% along it; width varies 13% at most.

**Height needs one more rule**, because trailer height varies ±31% on its own and three length cuts cannot hold it under 15%. The fix is the **height band** in §4: a plain stretch of the sides takes all the height change, so the pods, fins and nose keep their true size. The alternative was a fixed-height hull with taller trucks hovering higher, which would change the gap under every truck and with it HD-014's pods and glow pool.

## 6. Step plan (small PRs, each needing Mikael's yes)

1. **Contract.** `pipeline/README.md`, `pipeline/contract.json` and the override line in `ART_PIPELINE.md` §0. Docs and data only. The manifest's `vehicles` block moved to step 4: the offline worker precaches the manifest, so an edit with nothing to read it would cost a cache bump for nothing. **Landed in this PR (#601), 15 Oct.**
2. **The validator.** `scripts/hd-asset-check.mjs`: bare node, no dependencies. It reads the GLB's JSON chunk and checks names, bounds (accessor min/max plus node translation), transforms, triangle counts (index counts), material names, no Draco or images, and size. `hyperdagger/test/asset-check.mjs` runs it against a good fixture written by three's `GLTFExporter` in node (as `powder/test/roundtrip.mjs` does) and against broken variants. A new `hyperdagger_assets` lane in `gates.yml` runs it on `^hyperdagger/(assets|pipeline)/` and the script itself. This is Hyper Dagger's first CI lane; the 40-minute smoke gate stays local.
3. **The Blender library.** `pipeline/hd_blender.py`, imported by every asset generator: building the frame (the deck plane at Z 0 as a reference, each cut's envelope and cab envelope, the empties, the stub materials), `validate` against `contract.json`, `export` with every flag named, and three preview renders: three-quarter front, side and underside. `hyperdagger/test/blender.mjs` runs setup → validate → export under both `bpy` versions and hands each GLB to the node validator, and the two exports must agree on part names, bounds and triangle counts. CI runs it only when `pipeline/` changes, with the pip cache on, since each wheel is about 370 MB. Preview renders are not yet tested headless: Eevee wants a GPU, so they use Cycles on the CPU at low samples.
4. **The loader.** The manifest's `vehicles` block, and `as: "parts"` in the convoy: once the three GLBs load, each truck takes the cut nearest its length, and its named procedural parts have their geometry replaced by the cut's parts of the same name, fitted per §5: scaled along length and width, stretched only inside the height band, with the cab moved to the truck's own cab position. `topAt`, standing, cargo and the jackknife are untouched. Fail-soft: a bad or missing file leaves the boxes. Smoke: the HD-014 deck pin passes with the asset loaded and with it missing, and draw calls per truck are no more than procedural.
5. **The first asset: the speeder hull** (B2 skiff with D2 pods) in three cuts, built by Claude's generator script. It goes after HD-014 steps 3–4 land, so the procedural skiff is the baseline it has to beat.

## 7. Risks

- **Two validators drifting.** Avoided by one `contract.json` read by both.
- **Binaries in git.** No LFS in this repo. Keep one current `.blend` per asset, textures unpacked or absent, about 5 MB at most.
- **The deploy copying sources.** `art-src/` must stay out of the published tree.
- **Two Blender versions.** Every exporter flag is named rather than left to a default, and the gate exports under both and compares. If the two ever disagree, 4.5.13 is the reference, because both versions open its files.
- **A mesh built by script can look like a script.** The procedural boxes it replaces already do; the bar is that the renders and the in-game screenshot read better than the procedural skiff, and Mikael judges that, not the gate.
- **Art that looks right in Blender and wrong in the game.** The game renders unlit with fog and bloom. The PR needs an in-game screenshot, not only Blender renders.

## 8. Questions for Mikael — answered 13–15 Oct

1. ~~Size handling: S1 stretch, S2 three cuts, or S3 modular?~~ **S2, three cuts.** Height is handled by a stretch band (§5).
2. ~~Which Blender version is on the PC?~~ **Answered (13 Oct): 4.5.13 and 5.2.1.** Both are supported and both are in the gate (§3, step 3).
3. ~~Who models?~~ **Claude, by script.** One generator per asset under `pipeline/assets/` (§3).
4. ~~Commit the `.blend` sources?~~ **Yes**, in `hyperdagger/art-src/`, never deployed, saved from 4.5.13.
5. ~~What else goes through this lane?~~ **Nothing for now.** Only the hull, until it has worked end to end; then the lane is reconsidered.
