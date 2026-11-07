# Toko Move — open perspectives

Four NEW sunny open-background camera/setting tests. Primary references are freshly inspected APPROVED `sunny-open-backgrounds` tram+shelter and bench handoff (pt139u). Those approval records/README updated; all prior image pixels preserved. All four pairs approved 7 Nov 2026: “Perfect all approved”.

## Scenes
1. **metro** — elevated eastern outdoor metro platform fragment, orange M300-inspired cab/short side and waiting parcel courier. No tram. Isolated platform is an editorial cutaway, not literal surveyed station geometry.
2. **kiosk** — eye-level side/three-quarter cafe hatch parcel pickup, modest awning/counter fragment and ordinary worker.
3. **cyclist** — rear-shoulder courier showing parcel to cyclist beside bicycle rack/low steps. Courier face is NOT visible: no cyan mask stamped on rear head. Natural back/side head, ochre bag and navy coat identify courier.
4. **doorway** — frontal threshold delivery from inside a generic apartment entrance. Adapted from suggested vehicle doorway to avoid inventing new tram-interior hardware. It reads frontal, not a dramatic low-angle view.

## Manifest
- CONTACT.png: all four 16:9 / 9:16 pairs, 1480×2700 preview.
- masters/{metro,kiosk,cyclist,doorway}-master.png: 1024×1024 clean masters.
- crops/<scene>-169.png: 1024×576; crops/<scene>-916.png: 576×1024.
- crop-metadata.json: exact pixel crop rectangles and common safe intersections.
- sources/<scene>.jpg: untouched generated plates.
- sources/compose.py: reproducible identity registration and direct crops/contact.
- sources/master-shapes.json: traced Toko polygons originating in toko/js/master.js.
- layers/<scene>/00-integrated-plate.png: full-frame integrated source.
- layers/<scene>/10-exact-courier-identity.png: registered exact cyan/white face layer; cyclist layer is deliberately empty because face is occluded.
- Real third-party reference photo omitted from distribution; source URLs remain below. It is not required by the compositor.

## Actual crop inspection / limitations
All EIGHT crops inspected at delivered size plus CONTACT. No stretching, portrait repaint, upscaling, added padding or artificial exterior canvas. Same master pixels per pair. Open cream space is part of generated composition.
- Metro portrait retains courier/parcel + cab, cropping rear train and seated passengers; landscape crops top rear roof edge/outer platform edge. No whole-train-in-every-format claim.
- Kiosk portrait is a full standing pickup; landscape is medium framing with lower legs/outer awning cropped. Both heads/hands/parcel intact.
- Cyclist portrait is a tight over-shoulder framing: rear courier head/shoulder intentionally enters from left edge, cyclist's outer body/rear bike cropped right. Both hands/parcel, cyclist face and rack remain readable. Landscape crops lower bike/legs. This is the tightest/least spacious portrait of the four.
- Doorway portrait retains threshold and full figure but crops away jambs; landscape retains jambs/handle and core face/parcel, crops lower body/step. Thus the doorway-setting cue is stronger in landscape.
Strongest self-contained pair: kiosk. No awkward reverse-facing identity mask. Exact identity is an affine ellipse projection of traced master on the three visible couriers; ordinary others.

## Canonical rules
Less BACKGROUND, not crude reduced figure detail. Retain stylish articulated clothes/poses, believable people/vehicle scale and recognizable Helsinki forms. Open cream ground + essential grounded props, sunny only, no dense scenery, rain, neon, cyberpunk, painted/3D look, UI or invented signage. One cyan exact courier face only when physically visible, no magenta/other cyan people. Actual same-master16:9+9:16 crops with core action safe/readable. No fake padding or separate portrait generation.
Outdoor metro only Kalasatama/east in game scope. Tram sites separate; user-reported bridge tram exception remains unverified, not depicted. No invented interchange or named station/location reconstruction. Kiosk/steps/entrance are generic design fragments, not fake real landmarks.

## Source/style references
Primary: ../sunny-open-backgrounds/masters/tram-master.png and bench-master.png.
Metro also: ../sunny-new-locations/masters/metro-master.png and its real M300 source.
Real photo page fetched this turn: https://vaunut.org/kuva/154092 — Onni Tikkala, Siilitie M300 photo. Image: https://kuvat.vaunut.org/6824025bb981f0a7aae123b865a07185.jpg . Photo informs vehicle, not new station layout. Rights of original photograph not assumed transferable.
No new factual vehicle details needed for generic kiosk/rack/doorway fragments.

## Honest readiness
Integrated raster illustrations, NOT animation rigs/vector exports. Only registered exact courier identity independently separated. Environment/body/parcel/vehicle/shadows integrated; base contains face placeholder beneath overlay. Independent movement allowance 0px without repainting/reconstruction. Empty cyclist overlay is not a missing face asset. Moderate raster shading remains as in approved primary references; these tests reduce scenery rather than all object detail. No MP4/build/git/push changes.


## Reproduction and integration
From this folder run `python3 sources/compose.py`. Dependencies: Python 3, Pillow (`python3 -m pip install Pillow`) and DejaVu Sans at `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf` (Debian/Ubuntu package fonts-dejavu-core). All image/trace inputs required by compositor are bundled. Other approved packs cited above are provenance only, not runtime dependencies. No original third-party photos redistributed.

Future gameplay integration should ship these approved assets alongside the consuming development PR, select the provided crop appropriate to display format, and keep integrated illustration fixed unless reconstructed. This art-only pack does not change gameplay, build, deployment or animation infrastructure.
