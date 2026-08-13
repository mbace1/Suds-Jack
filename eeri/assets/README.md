# EERI — asset drop-in contract

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
| `girder_v1.glb` | `state0` stacked · `state1` slung · `state2` seated as a span | needs `grip`; the span state is walked on, so its top is flat and 1 tile deep |
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
| `skyline` | −30 | −30…130 × 0…30 | 4096 × 900 * |
| `far` | −14 | −20…120 × 0…20 | 4096 × 600 * |
| `mid` | −6 | −12…110 × 0…14 | 3660 × 420 |
| `near` | −2 | −8…104 × 0…8 | 3360 × 240 |
| `fore` | +2.2 | −8…104 × −1…5 | 3360 × 180 |

\* canvas width is capped at 4096 px; the plane stretches it to the rect,
so paint to 4096 wide and treat the horizontal scale as slightly coarse —
these layers are far away.

The sky itself (gradient + clouds + sun) stays code-drawn; it is the
backdrop, not a kit piece.

## Sources

Working files (`.blend`, `.aseprite`, `.svg`, `.kra`) go in `eeri/art-src/`,
not here — this folder ships. Keep exports optimised: GLB < 400 KB,
layer PNGs indexed/flattened where the tool allows.
