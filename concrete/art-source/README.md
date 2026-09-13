# CONCRETE — Blender art edition

Art direction: stylized realism, original human skater, warm window light, cool industrial shadows, worn wood and painted steel. The original game physics remain authoritative.

## Editable sources

The authoring scripts reproduce the editable files listed below. The generated Blender files and layered decals are also supplied in the companion source ZIP; they are not required by the web runtime.

- `warehouse.blend`: modular bays, trusses, lights, door, ride structures, lockers, benches, a spare-board rack, utility bins and perimeter props before runtime batching.
- `skater.blend`: weighted skeleton, clothing, head/face details and twelve named in-place action clips.
- `board.blend`: concave deck, grip surface, trucks, wheels, bearings and bolts.
- `decals.ora`: layered original signage; opens in Krita or another OpenRaster editor.
- `textures.py`: deterministic sources for six material families and the effects atlas.
- `render_props.py`: reproducible Blender preview of the warehouse gear corner.

The .blend files pack their textures. They require Blender 5.2 or compatible newer versions. Blender 5.2.1 LTS was used. Krita is optional; no paid software or third-party artwork is required.

## Reproduce

1. Run `python art-source/textures.py` with Pillow and NumPy.
2. Run `blender --background --factory-startup --python art-source/export.py`.
3. Run `python art-source/optimize.py` with Pillow to create WebP-textured GLBs.
4. Run `python art-source/validate.py`.
5. Serve the repository with any static HTTP server. Open `/concrete/` through the Hub.

Authoring/export is separate from the no-build game runtime. The game consumes committed GLBs and ordinary ES modules. `?quality=desktop` and `?quality=mobile` select variants; otherwise touch/small screens select mobile.

## Runtime contract

Meters, glTF Y-up, board aligned to the game Z axis. `assets/manifest.json` owns URLs and clip names. GLTFLoader is vendored from the same Three.js r185 release as the renderer. Art loading switches each corresponding procedural fallback only after its GLB succeeds. Failed models do not prevent skating.

World position, speed, jump timing, ramp heights, rail snapping and score are controlled by the existing game. The animation mixer and foot/grab IK affect visuals only. All clips are in-place. A single atlas-backed particle pool handles sparks, dust, landings and speed streaks.

## Compression and limits

WebP is used instead of KTX2: this environment denied the external KTX-tool download. The original PNGs and reproducible sources are retained for a later GPU-compression pass. No KTX support is claimed.

`assets/validation.json` records exact payload sizes, geometry counts, animation names and hashes. Browser draw/triangle counters include shadow rendering, so triangle counts can be about twice unique model geometry.

Physical mobile/controller testing has not been performed. Browser tests exercise keyboard input, emulated touch, full art loading, combo banking, grind entry, grab contact, bail/recovery, pause/resume and the missing-model fallback.

## Licenses

All models, textures, decals and effects in this art pass were authored for CONCRETE. No paid packs, likenesses or third-party textures were used. Three.js remains MIT-licensed; see `vendor/LICENSE.three`. No AI-generated imagery is included.
