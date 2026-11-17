# Toko Move — sunny camera studies

Four fresh **sunny-only** exterior angle tests, responding to “Sunny ones work, rain doesn't” and “Also make different views like the top down”. Existing art preserved; no build or git operations. These are review-stage visual tests, not new development approvals.

## Preview and stills
`CONTACT.png`: 1600 × 1080 contact sheet.
All four final stills are **1280 × 720 RGB PNG**, native source dimensions, 16:9, without UI:

| File under `stills/` | Camera / story |
|---|---|
| `01-overhead-tram.png` | **True vertical overhead**: tram roof, platform, foreshortened bodies, shoes and long shadows. Courier briefly glances upward. Strongest first preview for the new camera direction. |
| `02-overhead-quay.png` | **True vertical overhead**: parcel exchanged between two people, stall canopy and cafe table left, quay edge and water right. Both look down at the exchange; courier's face is hidden. Most graphic composition. |
| `03-elevated-metro.png` | Elevated three-quarter: courier climbs sunny stairs with parcel, shading face with hand; ordinary commuter behind. |
| `04-close-quay.png` | Closer street-level: delivery slip, parcel on parapet, vendor pointing toward the destination. |

Opera Platform / Market Quay / Market Stairs are fictional simplified Helsinki-inspired treatments, not exact location reconstructions. No text or real-world wayfinding claims.

## Identity and finish
Visual sources were inspected before generation: all three accepted dry outdoor stills, plus both original flat-vector attachments (transit people and isometric tram). Generation uses accepted sunny images as explicit image references; the tram overhead also uses the original tram reference.

Palette: paper cream, navy, ochre, sage, warm dry sunlight; cyan reserved for courier. No magenta, neon, rain or painted cyberpunk. Bodies have articulated hands and modest clothing detail. Generated plates retain slight raster texture and some tonal variation; these are not editable vector fills.

Where visible, the courier mark is composited from the **exact four traced loops** in `toko/js/master.js`, not a generated imitation. The source snapshot is `sources/master-shapes.json`. Small in-plane rotations and an elliptical metro head adapt the mark to pose. The raised metro hand is restored above the new disc using a narrow skin holdout. In overhead quay the courier's head points down: the crown and a cyan face rim are visible, but **no forward smile is stamped onto the back of the head**. Other figures have ordinary stylized heads/faces.

## Actual layers — intentionally modest
All PNG layers are full-frame 1280 × 720 RGBA:
- Every `layers/<scene>/00-integrated-plate.png`: complete environment and bodies. This is an opaque integrated plate, not a separated rig.
- Views 01, 03, 04: `10-traced-courier-identity.png`, a genuinely transparent brand overlay.
- View 03 only: `20-hand-occlusion-holdout.png`, original foreground hand pixels restored over the disc. This is a static compositing holdout, **not** an independent articulated hand.
- View 02: no exposed face, therefore no invented identity overlay.

Standard source-over order follows filenames. No fake architecture/people mattes or claimed hidden reconstruction. **Independent body, vehicle, head, architecture and hand movement: 0 px.** Parent identity/hand with the plate. Safe preview motion: whole-composite dissolve or centered 100–102% push-in. No pan beyond canvas. Shadow, water and cloth animation require a proper redraw/clean-plate separation pass. These are polished angle studies first, not a production animation package.

## Sources and reproducibility
- `sources/*.jpg`: four untouched native generated plates, 1280 × 720.
- `sources/compose.py`: Pillow identity compositor/contact builder; reads bundled master-loop snapshot, writes only this pack. Run `python3 sources/compose.py` from anywhere.
- `sources/master-shapes.json`: exact trace coordinates used, copied from the earlier outdoor pack's snapshot of the master.

Prompts specified dry sunshine, flat-vector finish, fictional Nordic tram platform / quay / market stairs, native 16:9, no UI and deliberate camera differences. Overheads explicitly required 90-degree downward view with no horizon or distant facades; overhead quay deliberately hides the face. Metro source generated a provisional face despite instructions; the final replaces it with the trace while preserving the foreground hand.

All four final PNGs and the contact sheet were visually opened and inspected after compositing. No MP4 or portrait crop. Future approved art must accompany the development PR that uses it; these tests have not been posted or pushed.


## Approved-only publishing audit — 7 Nov 2026
pt126u: Others approved — only 03 elevated stairs and 04 street-level harbour; overhead 01 rejected and 02 nearly works excluded.
Only approved scenes/variants are distributed here. Earlier references to other tests are prose history, not approval. Third-party reference photographs, rejected source variants and weather layers omitted. Exact inventory and layer-level reproduction: ../approved-exteriors/APPROVED-ART.json and reproduce.py. Existing generated source plates and exact registered layers are included. Partial-sheet CONTACT is rebuilt with approved images only; illustration PNG/JPG bytes unchanged. No new portrait invented for older 16:9-only tests.
