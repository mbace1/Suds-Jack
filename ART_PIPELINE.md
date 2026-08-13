# The art pipeline — concept to shipped asset

**Canonical. This supersedes the scattered notes in `eeri/art-src/MESHY.md`,
`eeri/assets/README.md` and the per-project sheets.** Those still hold
*project-specific* material (contracts, rosters, style blocks); this holds the
method.

Every rule below was paid for. Where a rule exists, the failure that bought it
is named, because a rule without its failure gets "improved" away by the next
session.

---

## 0. The rule that governs the rest

**A Meshy feature is always the primary choice. Look up what Meshy offers
BEFORE building anything, and only build where Meshy has no feature.**

This is the owner's direction and it exists because it was learned the
expensive way. One session built a mesh slicer, a cut-plane authoring tool, a
hole-capper, a bind-rotation system and a joint-swing test — several hundred
lines and four wrong turns — to give one character an arm that moved. Meshy
rigs a humanoid with a 24-bone skeleton and skin weights for **5 credits in
about a minute**, and returns walk and run clips in the same response.

`docs.meshy.ai` is the source of truth and this list goes stale. Re-read it
before starting anything.

| feature | endpoint | for |
|---|---|---|
| Text to 3D | `/openapi/v2/text-to-3d` | prompt → textured model |
| Image to 3D | `/openapi/v1/image-to-3d` | one concept image → textured model |
| **Multi-Image to 3D** | `/openapi/v1/multi-image-to-3d` | **2–8 views conditioned together**, texturing driven from all of them |
| **Auto Rigging** | `/openapi/v1/rigging` | **skeleton + skin weights**; returns walk + run free |
| **Animation** | `/openapi/v1/animations` | **600+ clip library** onto a rigged character |
| Retexture | `/openapi/retexture/v1` | **repaint an existing model** from a prompt; PBR to 8K |
| UV Unwrap | `/openapi/uv-unwrap/v1` | UV layout for an existing model |
| Remesh / Convert / Resize | `/openapi/v1/remesh`, `/convert`, `/resize` | polycount, topology, format, scale |
| Retopology | (product) | clean quad/tri topology, 3K–100K |
| Text to Image / Image to Image | `/openapi/text-to-image/v1` | Meshy's own concept art, tuned for 3D |
| Printability, Creative Lab | various | 3D-print prep, novelty products — unused here |

---

## The shape of it

```
  ┌ STAGE 1 ─────────┐   ┌ STAGE 2 ────────┐   ┌ STAGE 3 ──┐   ┌ STAGE 4 ─────┐
  │ CONCEPT          │   │ MESH            │   │ RIG       │   │ ANIMATE      │
  │ Nano Banana      │──▶│ image-to-3D  or │──▶│ humanoid: │──▶│ 600+ clips   │
  │ gemini-3-pro-    │   │ multi-image-3D  │   │ Meshy     │   │ 3 cr each    │
  │ image            │   │ 30 cr           │   │ 5 cr      │   │ walk+run     │
  │ free             │   │                 │   │ machines: │   │ free w/ rig  │
  │ ** T-POSE **     │   │ ** --raw **     │   │ slice.mjs │   │              │
  └──────────────────┘   └─────────────────┘   └───────────┘   └──────────────┘
        │                       │                    │                │
     LOOK large            LOOK large           swingtest        LOOK the cycle
     vs the brief          vs the concept       every joint      across frames
                                                                       │
                                                              ┌ STAGE 5 ──────┐
                                                              │ INTEGRATE     │
                                                              │ materials,    │
                                                              │ tokens, gate  │
                                                              └───────────────┘
```

**Every stage ends in a picture, and the picture is the gate.** The one time
this was skipped, a character shipped with 8/8 contracted nodes, a passing
49-check gate, and an arm across his face. A contract check cannot see a
picture. Neither can a triangle count.

---

## Stage 1 — Concept (Nano Banana)

    node concept.mjs "<prompt>" --model gemini-3-pro-image --ar 1:1 \
         [--ref approved.jpg] --out out/<proj> --name <stem>

### The T-pose rule

**Anything that will be rigged is drawn in a T-POSE. Always.** Not "usually",
not "A-pose is fine". A mesh is rigged from where its geometry sits in space,
so a limb resting against the body cannot be separated from it — a character
drawn standing naturally arrives with its arms fused to its ribs, and Meshy's
rigger explicitly requires "clearly defined limbs". The pose is a **technical
requirement of the concept**, not something fixed later.

- Arms **straight out horizontal**, like the crossbar of a T.
- Background visible through **each armpit** and **between the legs**.
- Nothing overlapping anything.

**"T-pose" is a far stronger instruction than "A-pose."** Four attempts at
"arms abducted 45 degrees" came back with the arms hanging at the sides; "both
arms stretched out straight and horizontal, pointing left and right to the
edges of the frame, like the crossbar of a letter T" worked first time. The
model treats "A-pose" as a hint and "T-pose" as a spec.

### Keeping the character across a re-pose

`--ref <image>` attaches an approved concept. **Use it** — a pose change
described in words alone comes back a different character.

But **the reference dominates the pose**. Passing the approved concept and
asking for a T-pose returns the original pose every time. Name the image a
**costume swatch** explicitly:

> The attached image is a COLOUR AND COSTUME SWATCH ONLY. Do NOT copy its
> pose. Copy only the face, the [garments], and the flat matte finish.
> IGNORE ITS POSE ENTIRELY.

Always re-pose **from the approved concept**, never from the original brief.

### Camera

**Dead front-on hides anything that runs front-to-back.** Eeri's four cap
spikes march back along the crown, so a front view shows exactly one — and
that single view is all the mesher gets to infer a head from, so the mesh came
back with a nub where the silhouette key should be. Turn the figure **~25°**
and **lift the camera** a little; the T-pose survives and the crown reads.

Better still, generate a **turnaround** and use **Multi-Image to 3D** (below).
That is the real fix and it is a built-in.

### What every prompt needs

- single subject, **full body in frame**, generous empty margin
- plain flat background (mid grey), **no cast shadow** — a cast shadow gets
  meshed as geometry
- flat even lighting, no rim light, no bloom
- explicit "no dirt, no grime, no scratches, no weathering, no rust"
- the project's style block appended verbatim (see the per-project sheets)

### Disqualifiers — do not push these to Meshy

- **Thin, spindly or floating parts.** Spider legs, detached spikes, wisps.
  Meshy webs them together or drops them. Ask for "thick", "chunky",
  "fused to the body" variants.
- **Deep interior cavities that matter.** An open maw reads; a hollow ring
  comes back solid.
- **A silhouette that needs colour to read.** Squint at 10%. If you cannot
  name it from the outline, the game cannot either.
- **Painted-on detail pretending to be geometry.** Flat decal eyes are fine
  (re-lit in engine); armour plates that are only painted will disappoint.

---

## Stage 2 — Mesh

    node meshy.mjs image <concept.jpg> --raw --lowpoly \
         --polycount 6000 --topology triangle --out out/<proj> --name <stem>

### `--raw` is not optional for flat palettes

`remove_lighting` and `image_enhancement` **both default TRUE** and both wreck
a flat colour scheme — the first flattens the value range, the second
re-grades the input. Everything asked to "glow" in Hyper Dagger came back
**pink**. `--raw` sets both false. Eeri's navy and olive survive with it on.

### Prefer Multi-Image to 3D when the silhouette has depth

`multi-image-to-3d` "conditions on all of your input views together and drives
texturing from them". Feed front + 3/4 + side + back. **This is the correct
fix for detail that a single view foreshortens away** — reach for it before
fighting the camera angle.

### Meshy adds grime

"No rust, no grime" survives the concept and dies in the mesh; a generated
excavator came back weathered and a generated kid came back with mottled skin
and blotchy trousers, against a brief demanding flat toy paint. **The fix is
`Retexture`** — repaint the existing model from a prompt — **not regenerating
the mesh.** That is a built-in and it was missed for a whole session.

---

## Stage 3 — Rig

### Characters: Meshy's auto-rigger. Always.

    node eeri/art-src/tools/meshyrig.mjs rig <image-to-3d-task-id> <heightMeters>

5 credits, about a minute. Returns `rigged.glb` plus **walk and run for free**.

Input requirements — and the T-pose rule exists to satisfy the third:

- GLB, **textured**, under **300k faces**
- **bipedal humanoid with clearly defined limbs**
- **facing +Z** (glTF forward). Meshy's own image-to-3D output already is.
  **Do not pre-rotate toward the game's facing** or the skeleton comes out
  sideways — rotate at the root when you mount it.

The skeleton is Mixamo-style, 24 bones:

    Hips  Spine Spine01 Spine02  neck Head head_end headfront
    LeftUpLeg LeftLeg LeftFoot LeftToeBase          (and Right…)
    LeftShoulder LeftArm LeftForeArm LeftHand       (and Right…)

`LeftForeArm` is the **elbow**, `LeftLeg` the **knee**. It is **skinned**, so
a bent joint deforms instead of parting company — no cut faces, no caps, no
hollow limb at extreme angles.

### Machines: `slice.mjs`, because they are not bipedal

Meshy's rigger does not handle them. `eeri/art-src/tools/slice.mjs` cuts one
fused mesh into contracted nodes by testing each triangle's centroid:

    node slice.mjs inspect <file.glb> [yaw] [x|y]   # measured grid to author cuts from
    node slice.mjs check <rig>                      # cuts colour-coded + pivot dots
    node slice.mjs cut <rig>                        # write the rigged GLB
    node rigview.mjs <rigged.glb>                   # contract + three real poses
    node swingtest.mjs <rigged.glb> <node>          # PROVE each joint moves

Set `MESHY_WORK` to the work tree holding `node_modules/` and `out/`.

Non-obvious things it has to do, all learned by shipping the broken version:

- **A figure normalises by HEIGHT, a machine by LENGTH.** On one rule a
  standing figure came out 1.4 units tall and walked off the inspect frame.
- **Face +x with a ROTATION, never a mirror.** A mirror reverses triangle
  winding and renders the model inside-out, and it puts the cab on the wrong
  side.
- **Bake the rig's scale into the geometry, not onto the root.** The game
  parents Eeri into `seat` at runtime; a scaled root made him 2.9× life size.
- **Cap the cut faces.** A sliced piece is an open shell and the first joint
  to swing shows the inside of a hollow leg.
- **A wheel is a circle.** Cut with a horizontal plane it comes out sawn in
  half, the bottom spinning and the top left on the chassis.
- **Test priority and parent order are different orders.** `bucket` must be
  tested before `stick` (specific first) and built after it (parent first).
- **`rest` and `bind` are different rotations.** `rest` is a pose on the
  driven node, inherited by children — folding a boom folds the stick and
  bucket. `bind` corrects how the part was *modelled* and goes on an inner
  holder wrapping the geometry only. **Using `rest` where `bind` is meant
  silently does nothing** (see the trap index).

### Never run `gltf-transform optimize` on a rig

Its join/prune passes merge the scene graph and **silently destroy every node
name** — 8/8 nodes to 0/8, and the model would have loaded and been refused.
Use the surgical commands `resize` then `webp`.

---

## Stage 4 — Animate

    node meshyrig.mjs anim <rig-task-id> <actionId> <name>

3 credits each from a **600+ clip library**. Categories: DailyActions,
WalkAndRun, Fighting, BodyMovements (climbing, jumping, vaulting, hanging,
falling), Dancing. Rough id ranges: idle 0/11/12/243–254 · walking 1/30/106–124
· running 14–16/509–539 · jumping 460–472 · climbing 434–449 · sitting 32–33/
52–60/344–372.

Clips are authored by animators, so the counter-swing, the elbow pump and the
jump anticipation are simply present. **Do not hand-author what the library
has.**

`post_process` supports `change_fps` (24/25/30/60), `fbx2usdz` and
`extract_armature`.

---

## Stage 5 — Integrate (three.js)

- **`MeshStandardMaterial` renders BLACK in an unlit scene.** Several projects
  here render with no lights (`MeshBasicMaterial`, `NoToneMapping`). Convert
  every imported material on load to `MeshBasicMaterial` or
  `MeshLambertMaterial`, carrying `map` and `color` across.
- **Vendor `GLTFLoader` and match the version.** It must match the vendored
  `three.module.min.js` REVISION exactly.
- **Clone skinned meshes with `SkeletonUtils.clone`.** A plain `.clone()`
  shares the skeleton, and every copy ends up in whatever frame was sampled
  last.
- **Bump the module's `?v=` token when and only when its bytes change**, and
  write it into every importer. A precache list one token behind the page is
  an app that loads online and is blank on a plane.
- **The asset seam**: `assets/manifest.json` + `js/assets.js`. Every model
  swaps from code placeholder to file with a one-word edit against a node
  contract. A live asset that fails to load or breaks contract logs a warning
  and ships the placeholder — but the smoke gate still fails, so it cannot
  ship silently.

---

## Verification — what actually catches things

| check | catches | why the obvious thing missed it |
|---|---|---|
| Render **LARGE** beside the concept | the whole class of "that isn't the character" | the only picture taken was gameplay-size, where the kid is 40 px |
| **32-px silhouette** alongside | detail that only exists at poster size | dino spikes and a tee print are sub-pixel on a 1.5-unit figure |
| **`swingtest.mjs`** on every driven joint | a joint that does not move | the render looked completely plausible — the arm was in a *believable* place, just always the same one |
| **Animation across frames**, not one still | a dead cycle, a march instead of a run | a settled single frame cannot show a counter-swing |
| Node-contract check | a missing node | necessary, **not sufficient** — see the top of this section |

**A passing contract is not a passing asset.**

---

## Costs

| step | credits |
|---|---|
| Nano Banana concept | free |
| image-to-3D | 30 |
| multi-image-to-3D | 30 |
| remesh (vs regenerating) | 5 |
| **auto-rig** (incl. walk + run) | **5** |
| **library animation** | **3** |

A complete character — concept, mesh, rig, idle/walk/run/jump/sit — is
**41 credits**. Instance repeatable assets rather than regenerating them.

---

## Trap index

Every one of these shipped or nearly shipped.

**Concept**
1. "A-pose" is read as a hint. Say T-pose.
2. A `--ref` image drags its pose along. Call it a costume swatch and disown
   the pose explicitly.
3. A dead-front view loses front-to-back silhouette. Turn 25°, lift the
   camera, or use multi-image.
4. A cast shadow in the concept becomes geometry in the mesh.

**Mesh**
5. `remove_lighting` / `image_enhancement` default TRUE and wash out flat
   palettes. Use `--raw`.
6. Meshy adds grime the prompt forbade. Fix with **Retexture**, not a re-roll.
7. Per-part generation makes a bobblehead: a generated head and torso come
   back the same size, so scaling each to its own declared length destroys
   proportion. Generate the whole figure.

**Rig**
8. `gltf-transform optimize` destroys every node name.
9. A scaled root is inherited by anything the game parents in at runtime.
10. A mirror reverses winding and renders inside-out.
11. **`rest` vs `bind`.** three.js composes euler XYZ as `Rx·Ry·Rz`, so a
    correction set on the driven node is applied *after* the game's angle, not
    before. A T-posed arm then spins on its own axis: it hangs correctly, the
    render looks right, and the hand never moves. Corrections go on an inner
    holder.
12. Pre-rotating a mesh to the game's facing breaks Meshy's rigger, which
    wants +Z.

**Integrate**
13. `MeshStandardMaterial` is black in an unlit scene.
14. A plain `.clone()` of a skinned mesh shares the skeleton.
15. A `?v=` token that did not move when the bytes did.

**Process**
16. Verifying the contract and the gate, and never looking at the asset.
17. Building a tool for something Meshy already does. **Check first.**
