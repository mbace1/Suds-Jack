# EERI — asset drop-in contract

> **READ `PHASING.md` FIRST.** It is newer owner direction (2026-08-14) and
> **supersedes this file where they disagree** — the 80/20 reference ratio
> (Crafted World is the default answer, Tropical Freeze is the seasoning),
> the tool-reality table, and the phase gates. This file remains canon for
> everything it does not contradict.

This folder is the seam between the game and the art (ART_BRIEF §2, §4, §5).
The game runs **today** with zero files here — every entry in
`manifest.json` marked `"placeholder"` is built in code. To ship a real
asset:

1. Put the file at the path named in `manifest.json`
   (`assets/2d/…png` or `assets/3d/…glb`).
2. Flip that entry's `"status"` to `"live"`.
3. Bump the manifest `"v"` (it is the cache token on every asset URL).
4. Run `node eeri/test/smoke.cjs` — it fails if a live file is missing or
   a model breaks its node contract.

Nothing else changes. If a live asset fails to load or breaks contract,
the game logs a warning and ships the placeholder — a grey box beats a
broken page, but the smoke gate still fails so it cannot ship silently.

**How the assets are MADE is [`/ART_PIPELINE.md`](../../ART_PIPELINE.md)** —
canonical for concept → mesh → rig → animate → integrate, with the credit
costs and a trap index. Two rules from it that bite here:
- **A Meshy feature is always the primary choice.** It auto-rigs a humanoid
  with a 24-bone skeleton and skin weights for 5 credits and applies any of
  600+ animation clips for 3 each.
- **Anything to be rigged is concepted in a T-POSE.** A limb resting against
  the torso cannot be separated from it, and Meshy's rigger requires clearly
  defined limbs. The pose is a technical requirement of the concept.

**TWO KINDS OF RIG live behind this seam.** A hand-cut model declares the
`nodes` the game rotates. A Meshy auto-rigged character is a **skinned** mesh
declaring the named `clips` it can play — it has a bone skeleton, not the
game's node names. `"rig": "skinned"` picks which contract is checked, and
such an entry also carries `"height"` **in tiles**, because Meshy rigs to
real-world metres and the seam rescales on load. Both come back through the
same `getModel` call, so game code cannot tell them apart.

## 3D models (`assets/3d/*.glb`)

Spec: ART_BRIEF §5. glTF 2.0 single-file GLB · 1 unit = 1 tile · origin at
ground/foot contact · +Y up · **facing +x** · flat normals · vertex colours
or one shared palette-strip texture · no PBR channels · transforms applied.
The game animates **named nodes** (rigid hierarchies, no skinning):

### `eeri_v1.glb` — the kid (≈ 1.5 u tall + hat)
| node | pivot | driven by |
|---|---|---|
| `hipL`, `hipR` | hip joint | run/ride/climb swing (rotation.z) |
| `body` | waist | lean, breath (rotation.z, position.y, scale.y) |
| `armL`, `armR` | shoulder (children of `body`) | swing (rotation.z) |
| `head` | neck | nod/sway (rotation.z) |

### `excavator_v1.glb` — first machine (≈ 3 u long, 2.1 u tall)
| node | pivot | driven by |
|---|---|---|
| `house` | slew centre on deck | idle vibration (position.y) |
| `boom` | house front hinge (child of `house`) | W/S control (rotation.z, rest ≈ 0.52) |
| `stick` | boom end hinge (child of `boom`) | follow (rotation.z, rest ≈ −1.35) |
| `bucket` | stick end hinge (child of `stick`) | working angle (rotation.z, rest ≈ −0.6) |
| `seat` | cab seat base (empty) | Eeri parents here while riding |
| `step` | the climb-up point (empty) | the mount move passes through it |
| `wheels` | group; each child spins about its **local z** | rolling |
| `beacon` | amber lamp, cab roof or rear corner | lit + turning while UNMANNED, dark once Eeri is aboard |

The cab must be open and the seat readable — Eeri stays visible while
riding (the Yoshi rule, ART_BRIEF §3.6), **and the empty seat is how a
player tells an unmanned machine from a tamed one** (§1.2). Draw the seat
to be read from the side at 32 px, empty.

### Manipulable world pieces — `assets/3d/<piece>_v1.glb`

Spec: ART_BRIEF §5.1. Things a machine digs, lifts or breaks. Same GLB
rules as the cast. Each ships **all of its states in one file** as sibling
nodes named `state0`, `state1`, `state2`… (state0 = untouched); the game
shows exactly one at a time, so they must share an origin and register
against each other. A piece that is carried also needs a `grip` node —
the point the bucket or hook takes hold of.

| file | states | notes |
|---|---|---|
| `bank_v1.glb` | `state0` full · `state1` half · `state2` dug flat | half-dug wants a fresh cut face and spill at the foot |
| `girder_v1.glb` | `state0` stacked · `state1` slung · `state2` seated as a span | needs `grip`; the span state is walked on, so its top is flat and 1 tile deep. State origins: `state0` on the ground under the stack centre, `state1` hangs from `grip` at its origin (the game rests the load on the ground when the grip comes down — the rest depth is read off `state1`'s own bounding box), `state2` at the span centre with its top at +1 |
| `wall_v1.glb` | `state0` intact · `state1` cracked · `state2` rubble | rubble is a different silhouette, not a shorter wall |
| `load_v1.glb` | `state0` grounded · `state1` slung · `state2` placed | needs `grip` |

Add the file to `manifest.json` under a `"pieces"` block with the same
`status` / `nodes` shape the models use.

## 2D layers (`assets/2d/*.png`)

Spec: ART_BRIEF §4. PNG with alpha, flat-colour cutout shapes, shading
painted in (key light upper-left), depth tint toward the sky **baked into
the painting** (`LAYER_TINT`: skyline 0.58 · far 0.38 · mid 0.20 ·
near 0.07 · fore 0). Each layer is one image covering a fixed world rect
at **30 px per unit** (`PPU` in `js/layers.js`):

| layer | z | world rect (x0…x1 × y0…y1) | PNG size |
|---|---|---|---|
| `sky` | −48 | −60…170 × −6…40 | 4096 × 1380 * |
| `skyline` | −30 | −30…130 × 0…30 | 4096 × 900 * |
| `far` | −14 | −20…120 × 0…20 | 4096 × 600 * |
| `mid` | −6 | −12…110 × 0…14 | 3660 × 420 |
| `near` | −2 | −8…104 × 0…8 | 3360 × 240 |
| `fore` | +2.2 | −8…104 × −2…14 | 3360 × 480 |

\* canvas width is capped at 4096 px; the plane stretches it to the rect,
so paint to 4096 wide and treat the horizontal scale as slightly coarse —
these layers are far away.

**These numbers are checked.** `eeri/test/smoke.cjs` reads this table and
compares it against `LAYER_RECTS` × `PPU` in `js/layers.js`, and a live PNG
whose pixel size does not match its row fails the gate rather than being
silently stretched onto the plane. Paint to the row.

The sky ships as a layer like the rest since v9 — the crafted paper sky
(palette gradient × paper-grain luminance, cotton-wool cloud cutouts, ONE
paper sun) built by `art-src` tooling; `drawSky` stays as its code
placeholder. A naively tiled prop sheet grows a second sun — the sun is
cropped out and stamped once.

### What each layer is FOR (v4 — the depth pass)

The stack is not five pictures at five distances; each one has a job, and
a layer that does another layer's job flattens the diorama:

- **`skyline`** — quiet. Low internal contrast, heavily hazed. It sets the
  city and then gets out of the way. Crisp two-tone blocks here read as
  *near* and fight the playfield; that is a bug, not a style.
- **`far`** — the half-built frames. Structure you read as distance.
- **`mid`** — the built stage: scaffold bays, hoarding, the SMB3
  flats conceit showing its bolts.
- **`near`** — dressing just behind the action; it may overlap the
  playfield's silhouette, that is what sells the lane.
- **`fore`** — **the occluder lane, and it must be CROPPED.** Every piece
  here runs off the top or the bottom of the rect. Narrow verticals you
  pass behind (scaffold standards), low sweeps along the bottom (spoil,
  drums), and high crossings (a pipe run). Dark, near-silhouette, no sky
  tint. Two rules learned the hard way: a big shape parked at eye level is
  a blob with the game hidden behind it, and a heap whose crest sits below
  the playfield's ground line (y = 4) reads as a hole cut in the earth
  rather than a mound in front of it.

## Sources

Working files (`.blend`, `.aseprite`, `.svg`, `.kra`) go in `eeri/art-src/`,
not here — this folder ships. Keep exports optimised: GLB < 400 KB,
layer PNGs indexed/flattened where the tool allows.
