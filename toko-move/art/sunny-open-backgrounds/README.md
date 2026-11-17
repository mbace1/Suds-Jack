# Toko Move — open-background studies

The clarification is LESS BACKGROUND / SCENERY, not removal of all object detail. Two fresh sunny vignettes retain articulated clothed figures, parcel action and essential props while omitting city/foliage backdrop. Continuous cream ground was generated as part of each scene, not added padding. These new tests await approval.

## Approval matrix (latest clarification)
| Pack | Scenes | Status |
|---|---|---|
| sunny-dual-crop-v2 | platform + harbour, both formats | Approved earlier |
| sunny-new-locations | metro + tram + park, both formats | Approved earlier |
| sunny-city-arrivals | metro approach + station + canal, both formats | Detailed variants approved by latest clarification |
| sunny-minimal-comparisons | metro + tram, both formats | Approved: pt137u |
| sunny-minimal-comparisons | park | NOT explicitly approved |
| sunny-open-backgrounds | tram + bench | New tests, review only |

Approved image pixels were preserved. Approval metadata updated in the detailed and low-detail folders; this matrix supersedes their earlier review-only README wording. City-arrivals metro approach remains illustrative rather than verified Kalasatama geometry.

## Manifest / size
- CONTACT.png: two rows, actual landscape and portrait previews.
- masters/tram-master.png and bench-master.png: 1024×1024.
- crops/{tram,bench}-169.png: actual 1024×576 crop.
- crops/{tram,bench}-916.png: actual 576×1024 crop of the SAME master, no stretching/repaint/padding.
- crop-metadata.json: exact crop rectangles and common safe areas.
- sources/{tram,bench}.jpg: original GenerateImage plates.
- sources/compose.py: repeatable identity overlay, crop and preview assembly.
- sources/master-shapes.json: exact traced Toko face polygons, originating in toko/js/master.js.
- layers/<scene>/00-integrated-plate.png: original integrated illustration.
- layers/<scene>/10-exact-courier-identity.png: separately registered transparent cyan/white face overlay.

## Camera / comparison notes
Tram: elevated three-quarter shelter/parcel vignette, recognizably long green/yellow Helsinki Artic-inspired vehicle with articulation, doors and pantograph. Wide crop retains whole tram body; pantograph is close to top and lower courier legs are clipped. Portrait deliberately focuses cab + parcel action; rear tram and most shelter are peripheral and cropped. This is not a promise that full vehicle AND shelter fit the portrait frame.

Bench: closer elevated medium handoff to seated recipient; bench/bicycle are the only street props. Landscape retains heads/handoff and nearly all furniture (lowest bench tips clipped). Portrait retains courier, recipient and complete handoff; rear bicycle/bench edge are cropped. Strongest expression of the requested less-scenery direction.

All four crops and final contact visually inspected. Subject details have NOT been globally reduced like the prior low-detail test. No dense invented background or tiny inset image surrounded by fake added canvas.

## Rules
Sunny only, flat graphic editorial cream/navy/ochre/sage palette; preserve elegant articulated figures, natural hands/poses and plausible transit scale. No blocks/blobs, neon, painted cyberpunk, 3D or UI. Exactly one cyan Toko courier face per scene using traced master; ordinary faces for everybody else. No mask stamped on back of head.
Actual 16:9 and 9:16 crops from one source master; core face/parcel interaction visible in both. Essential action is invariant, peripheral scenery may be framed differently. No unverified place/route labels or invented interchange. Outdoor metro only Kalasatama/east within game scope, tram sites separate; user-reported bridge exception unverified and not depicted. These are unnamed simplified Helsinki-inspired vignettes, not geographic reconstructions.

## Actual layer readiness
Integrated raster plates, not vector source or animation rigs. Only exact courier identity overlay independently separated. Bodies, hands, parcel, vehicle, shelter, bicycle and shadows remain baked together. Plate includes generated face placeholder beneath registered overlay; not a freely movable head. Independent component movement allowance 0 px without repainting. No production-ready body/vehicle mattes claimed. Slight raster shading remains on objects; the stylistic change is sparse scenery, not aggressive detail reduction. No build/git/push changes.

## References inspected first / used in generation
- ../sunny-dual-crop-v2/CONTACT.png and masters/platform-master.png + harbour-master.png: approved sparse treatment.
- ../sunny-new-locations/masters/tram-master.png: approved Helsinki vehicle and figure language.
- ../sunny-city-arrivals/masters/station-master.png: approved detailed handoff figure treatment.
- ../minimal-metro-look/scenes/disruption-169.png: original flat illustration reference.
Earlier steep-tram candidates were rejected during this test for dual-crop fit and duplicate cyan heads; neither used as final pixels. No new real-place claims or geography research needed for these established vehicle/unnamed prop scenes.


## Approval update
Both tram+shelter and bench handoff pairs are approved: pt139u, Those are approved. This supersedes earlier review-only wording. Image pixels unchanged.


## Approved-only publishing audit — 7 Nov 2026
pt139u: Those are approved — tram+shelter and bench handoff.
Only approved scenes/variants are distributed here. Earlier references to other tests are prose history, not approval. Third-party reference photographs, rejected source variants and weather layers omitted. Exact inventory and layer-level reproduction: ../approved-exteriors/APPROVED-ART.json and reproduce.py. Existing generated source plates and exact registered layers are included. Partial-sheet CONTACT is rebuilt with approved images only; illustration PNG/JPG bytes unchanged. No new portrait invented for older 16:9-only tests.
