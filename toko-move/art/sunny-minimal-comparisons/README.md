# Sunny minimalist comparison tests — review only

Restyles of the APPROVED `../sunny-new-locations` metro, tram and park compositions, requested by pt135u. Approved pixels remain untouched. These are comparative style tests, not a replacement approved pack.

## Preview and files
- CONTACT.png: approved landscape / minimal landscape / approved portrait / minimal portrait, three rows.
- masters/{metro,tram,park}-master.png: 1024×1024 clean illustrated masters.
- crops/{metro,tram,park}-169.png: 1024×576.
- crops/{metro,tram,park}-916.png: 576×1024.
- crop-metadata.json: actual source-pixel boxes, common safe area, identity placement.
- sources/{metro,tram,park}.jpg: original generated plates, unmodified.
- sources/compose.py: repeatable edge-preserving grain cleanup, exact trace overlay and direct crop compositor.
- sources/master-shapes.json: exact traced face polygon data copied from prior compositor, originating in toko/js/master.js.
- layers/<scene>/00-integrated-plate.png and 10-exact-courier-identity.png: full-frame RGBA compositing assets.

## Direction / inspection
Metro removes tile grids and small tree detail; tram removes almost all facade/window detail and foliage strokes; park replaces dense reeds/grass/water rendering with large quiet planes. Articulated clothed figures, vehicle proportions, parcel action and sunny context remain. Park is the strongest material reduction. These are regenerated composition matches, not identical pixel geometry with a filter applied to approved art. All six final crops were checked visually. Core parcel action, face and vehicle cab remain in both formats. Landscape may cut lower bodies and peripheral bicycle; the long tram tail extends off frame as in the approved composition. Portrait crops preserve the cab/action, not the entire articulated tram.

## Canonical rules
Sunny only. Flat cream/navy/ochre/sage palette with orange metro and green/yellow Helsinki tram. No neon, rain, cyberpunk, 3D, painted texture or blocky blob people. Keep elegant articulated poses and believable transit scale. One cyan courier face using exact traced polygons; all other people have ordinary faces. No face pasted onto a rear-facing head.

Every scene must yield actual 16:9 and 9:16 crops from the SAME master pixels, no stretching, portrait repaint or padding. Preserve common core action. Elevated overall scenes are preferred over literal overhead portraits when exploring wide cameras.

No new geographic assertions: these restyle existing eastern outdoor metro / inner-city tram street / bay-path scenes. Outdoor metro stays Kalasatama/east within game scope; tram sites separate. User-reported new bridge tram exception remains unverified and is not depicted. No absolute east-Helsinki tram prohibition is implied. City-arrivals curved approach is illustrative, NOT a verified Kalasatama reconstruction.

## Actual layer readiness / limitations
Integrated raster illustrations, NOT vector deliverables or character rigs. Exact cyan/white identity overlay is independent; body, parcel, other people, vehicles, architecture and cast shadows are NOT independently separated. Plate contains the generated cyan face placeholder; overlay is registered to cover it, not a freely movable detached head. Independent movement allowance: 0 px without repainting/reconstruction. Full-frame camera movement would need overscan/recomposition. No invented production-ready mattes.

Three bilateral cleanup passes reduce incidental generator grain without posterizing the art. Large areas are flat, but minor tonal variation/antialiased raster edges remain; not a mathematically pure limited-color SVG. Further simplification/true vector tracing would be separate production work. This pack has no MP4 and no build/git changes.

## Generation references
Primary: ../sunny-new-locations/masters/{metro,tram,park}-master.png.
Original style: ../minimal-metro-look/scenes/disruption-169.png; tram also ../minimal-metro-look/_refs/ref-iso-tram-shelter.png.
No new location research or factual claims for these restyles. City-arrivals was NOT a style reference.


## Latest approval update
Metro and tram low-detail pairs approved by pt137u. Park is NOT explicitly approved. This supersedes earlier review-only wording for those two scenes only.


## Approved-only publishing audit — 7 Nov 2026
pt137u: The tram and metro low details are good too — park NOT approved.
Only approved scenes/variants are distributed here. Earlier references to other tests are prose history, not approval. Third-party reference photographs, rejected source variants and weather layers omitted. Exact inventory and layer-level reproduction: ../approved-exteriors/APPROVED-ART.json and reproduce.py. Existing generated source plates and exact registered layers are included. Partial-sheet CONTACT is rebuilt with approved images only; illustration PNG/JPG bytes unchanged. No new portrait invented for older 16:9-only tests.
