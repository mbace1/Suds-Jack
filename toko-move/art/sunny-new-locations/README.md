# Toko Move — three NEW sunny locations

Three new location illustrations, not another revision of the approved tram/ferry pair. Approved images and all previous packs are untouched. No build/git/push/post operations.

## Scenes / preview
`CONTACT.png`: 1480 × 2040, three landscape/portrait pairs.

| Scene | Camera and story | Actual files under `crops/` |
|---|---|---|
| Eastern outdoor metro | Medium-wide platform-height oblique: orange M300-style train, parcel courier waiting safely behind yellow edge, ordinary seated commuter. Siilitie-inspired material vocabulary. Strongest new pair. | `metro-169.png`, `metro-916.png` |
| Inner-city tram street | Elevated three-quarter urban stop: green/yellow Artic, waiting riders, rail, bicycle and crossing. Hämeentie/Kallio-inspired street setting. | `tram-169.png`, `tram-916.png` |
| Bay path hand-off | Shallow elevated medium view: courier gives parcel to older recipient beside bench/bicycle, reeds and Töölönlahti-inspired wooded shore. | `park-169.png`, `park-916.png` |

All masters **1024 × 1024**. Landscape crops **1024 × 576**; portrait crops **576 × 1024**, exact aspect ratios. Every crop is a direct pixel crop of its own shared master. **No padding, graphic background expansion, resampling, stretching or separately generated portrait.** Each scene has its own deliberate crop boxes, recorded in `crop-metadata.json`.

All SIX crops were individually opened at delivered resolution after compositing. Core train cab/platform/courier relationships and park hands/parcel/recipient remain intact in both formats. These are deliberate medium/environmental framing studies: receding tram cars, peripheral commuters, vegetation, bicycle wheels or lower legs can continue outside a crop. This pack does **not** claim complete nose-to-tail vehicle isolation or a full-body/whole-bench view in every crop. The tram front cab and main boarding doors are preserved; the long rear recedes outside portrait. Source/master is available for alternative editorial crops. There is no tiny scene floating in absurd blank filler.

## Geography / scope clarification
- Outdoor metro and tram illustrations are **separate places**, not a shared platform or invented interchange.
- The user identifies outdoor metro geography as Kalasatama and eastward, with a newly opened bridge-tram exception to the previous broad “no trams east” simplification. Do **not** convert that nuance into an absolute no-tram rule across eastern Helsinki.
- This pack does not depict the bridge exception: exact service/opening was not independently verified in this pass. No invented current route number or opening claim.
- Siilitie is supported in this checkout's game data: `toko-move/cities/helsinki.json` includes `Siilitien metroasema` (line 2681 when checked). The real Siilitie reference is an outdoor station. This makes the eastern outdoor-metro treatment a supported concept, **not** a claim of exact rebuilt platform topology.
- Hämeentie tram context comes from a real Lintulahti/Sörnäinen-area Artic photograph; no fabricated exact junction, route number or transfer claim. Incidental generated route mark was removed.
- Park is a seasonal/generalized bay-edge illustration, not a measured 2026 shoreline reconstruction. Reference is an older spring photograph translated into summer. The delivered crops avoid the historical distant wheel appearing in an unused master margin; master margins should not be taken as current landmark documentation.

## Canonical rules carried forward
Sunny flat graphic cream/navy/ochre/sage finish; orange for metro. No rain, neon or cyberpunk. Use real vehicle silhouettes and sensible scale; don't substitute a toy train. “Top down” means overall elevated environmental views, not literal overhead portraits; medium views provide deliberate variety. Articulated ordinary people and restrained meaningful detail, not blocky blobs. Only the courier gets cyan Toko identity; visible marks come from the exact traced master, never magenta or a generated smile. If the head faces away, don't stamp a forward mark on its crown; here the courier is interpreted as glancing back toward camera while body turns toward the vehicle/recipient. Both actual formats must be checked, with action safe in their intersection. Preserve approvals and include approved art alongside development code when later used in a PR. New artwork in this folder is still for review.

## Actual separation, not a rig
Each `layers/<scene>/` has two full-frame **1024-square RGBA** PNGs:
1. `00-integrated-plate.png`: integrated bodies, architecture, vehicles, ground, shadows. Extra cyan metro commuter recoloured into an ordinary head; incidental tram route mark removed.
2. `10-exact-courier-identity.png`: transparent exact traced master loops on a perspective oval/circle and ring.

Source-over reproduces master. No independently separated people/vehicle/foliage/architecture. **Independent movement: 0 px**, including head mark relative to body. Whole-composite hold/dissolve or restrained push-in is available with crop clearance checked. Walk cycles, tram/metro glide and parallax require clean plates/redraws. These raster studies are not vector source rigs. Park has more foliage/raster tonal detail than the transport scenes; that may need simplifying in a production separation pass. No rough matte is represented as production-ready.

## Real public references downloaded, opened, used
- **Siilitie M300 outdoor platform**, Onni Tikkala:
  https://vaunut.org/kuva/154092
  https://kuvat.vaunut.org/6824025bb981f0a7aae123b865a07185.jpg
- **Artic 405 at Hämeentie / Lintulahti**, Tuukka Varjoranta:
  https://vaunut.org/kuva/144144
  https://kuvat.vaunut.org/ee7acaad8ed76f370adbf87802528a7e.jpg
- **Töölönlahti reeds / Linnunlaulu shoreline**, Toinen Linja:
  https://www.toinenlinja.fi/fi/01675
  https://www.toinenlinja.fi/photos/web/01/01675_Toolonlahden_etelapaan_kaislikkoa_taustalla_Linnunlaulun_huviloita.jpg

Photos are reference-only local copies in `references/`, not asserted to be freely redistributable. Clear rights before shipping originals. `references/references.json` records original links. Real photos guide vehicle/material/context, not exact geographic fidelity or copied photo pixels. Approved sunny pack and earlier approved close harbour guided style.

## Reproduction / assets
- `sources/{metro,tram,park}.jpg`: untouched native generated source plates.
- `sources/master-shapes.json`: exact four traced loops from `toko/js/master.js`.
- `sources/compose.py`: Pillow compositor; `python3 sources/compose.py` writes only this pack. DejaVu Sans for contact captions.
- `masters/*.png`, `crops/*.png`, `layers/*/*.png`, `crop-metadata.json`.
- `approval-record.json`: records latest prior pair's user approval, without changing its pixels.


## Approved-only publishing audit — 7 Nov 2026
pt134u: Approved, more — all three pairs.
Only approved scenes/variants are distributed here. Earlier references to other tests are prose history, not approval. Third-party reference photographs, rejected source variants and weather layers omitted. Exact inventory and layer-level reproduction: ../approved-exteriors/APPROVED-ART.json and reproduce.py. Existing generated source plates and exact registered layers are included. Partial-sheet CONTACT is rebuilt with approved images only; illustration PNG/JPG bytes unchanged. No new portrait invented for older 16:9-only tests.
