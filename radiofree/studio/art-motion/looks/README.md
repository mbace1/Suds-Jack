# Looks: approved style kits (2 Nov 2026)

**Owner, 3 Nov:** "All the 3d tests look great and those can be used in the future. Some textures and vfx can be
explored there. Maybe look on GitHub for additions."

These are short look demos, each built around a fitting concept. They are kits to build real films from, not films.
All are code-drawn (three.js r167 from `clay/vendor`, or canvas 2D) and render through `pipeline/render.mjs`.

| look | folder | demo | status | fits |
|---|---|---|---|---|
| 3D toy-world traffic, soft anime grade (level-crossing stop) | `cars/` | `previews/02-11-LOOK-3D-Cars-demo.mp4` | **approved for future use** | infrastructure stories: data centres, roads, grids, mines (Muhos "Cut First") |
| 3D robot in a misty forest (wakes, looks, jumps) | `robot/` | `previews/02-11-LOOK-3D-Robot-demo.mp4` | **approved for future use** | Brink / military-AI stories; a generic machine character |
| GL 8-bit bumper | `gl/8bit/` | `previews/02-11-LOOK-GL-8bit-demo.mp4` | not chosen (owner: GL is 3D) | Gameplay Laboratory intro |
| GL 16-bit bumper | `gl/16bit/` | `previews/02-11-LOOK-GL-16bit-demo.mp4` | not chosen (owner: GL is 3D) | Gameplay Laboratory intro |
| GL early-3D (PS1-style) bumper | `gl/3d/` | `previews/02-11-LOOK-GL-early3d-demo.mp4` | **THE GL LOOK** (owner, 3 Nov: "GL needs to be 3d") | Gameplay Laboratory intro |

**References.**
- **Cars:** the owner saw code-made videos on 2 Nov. The closest one found is a Claude Opus 5.5 code-made anime town
  with a level crossing, by @pound75423, listed in TripoGrowthLab/awesome-opus-5-5-prompts.
- **Robot:** no source found yet.

**Known weaknesses to fix when a film uses these.**
- **Cars:** a single camera move; small detail at phone size; a milky horizon; a plain site hall.
- **Robot:** a too-close opening; a mechanical stand; sliding feet; game-like trees; no sound.
- **GL:** the 8-bit scientist is small; the 16-bit runner has stick limbs; the early-3D intro hooks late.

**Next (owner, 3 Nov):** explore textures and VFX. See the GitHub survey below once it lands.

## GitHub survey: textures and VFX (3 Nov, from search summaries; no code downloaded yet)

| candidate | what it adds | licence | fit with our setup | verdict |
|---|---|---|---|---|
| **ambientCG / Poly Haven** PBR materials and HDRIs | real moss, bark, asphalt, grass and concrete surfaces (colour, normal, roughness, AO maps) | **CC0** (both sites) | plain JPG/PNG maps loaded by three's TextureLoader; vendor 1K maps, a few MB per material | **shortlist #1**: fixes the "game-like" forest and the plain road and site |
| **three.quarks** ([github](https://github.com/Alchemist0823/three.quarks/)) | particle VFX engine: dust, falling leaves, sparks, smoke, rain, trails | **MIT** (per its docs) | ES module on npm; vendor one build file; works with stock three.js | **shortlist #2**: leaves and dust for the robot, dust or rain for the convoy |
| **three-good-godrays** ([github](https://github.com/ameobea/three-good-godrays)) | screen-space raymarched god rays | not confirmed: check the LICENSE file | needs pmndrs/postprocessing alongside our own post.js | maybe: the robot demo already fakes god rays cheaply |
| **N8AO** ([npm](https://npmjs.com/package/n8ao)) | ambient occlusion pass | not confirmed: check the LICENSE file | standalone N8AOPass | low priority: our post.js already runs GTAO |
| **three-gpu-pathtracer** ([github](https://github.com/gkjohnson/three-gpu-pathtracer)) | physically based path tracing, for hero frames | **MIT** | needs real GPU throughput; under SwiftShader a single frame would take a very long time | parked: perhaps for a single still, not for films |

**Next step, needs the owner's OK:** download and vendor shortlist #1 (a handful of CC0 materials) and #2 (three.quarks,
MIT), each with its licence file next to it. Then show before/after stills on the robot and cars demos behind a `?fx=1`
flag, so the approved looks stay reproducible.
