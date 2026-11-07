# Toko Move — sunny Helsinki vehicles / dual-crop revision

## Canonical art rules (restated)
1. “Top down” means **elevated wide/isometric overall location**, not literal overhead close portraits. Environment first; small naturally posed people.
2. A Helsinki tram must use a real Helsinki vehicle reference: recognizable cab, low-floor body, door/window rhythm, articulations and green/yellow treatment. No generic mini-train substitution.
3. Keep people/vehicles/stalls at believable relative scale. A full-sized passenger ferry must dominate people and small market tents, not look like a toy yacht.
4. Waterfront context must make sense: open water beyond the quay here, **no invented opposite-water civic building**. Architectural inspiration is not exact geographic reconstruction.
5. **Every style must support actual 16:9 AND 9:16 crops of the same master.** Keep complete essential vehicle and courier/action within the crop intersection. No separately generated portrait alternative, stretching, or claiming crops work without inspecting both.
6. Sunny flat graphic palette/finish; no rain, neon, painted cyberpunk or blocky blob people. Modest stylish detail.
7. Exactly one cyan Toko courier when visible. Visible face uses the exact traced master, never a generated imitation or magenta. Ordinary people have ordinary heads/faces. Don't stamp a forward face on a back-of-head pose.
8. Preserve approved art and previous revisions. Art used in future development must accompany its development PR. New tests are not automatically approved. No build/git changes in this revision.
9. Layer claims must be honest: integrated raster artwork is not an independently animated character/environment rig.

## Deliverables and checked crops
- `CONTACT.png`: **1600 × 1330**, all four actual deliverables.
- `masters/platform-master.png`, `masters/harbour-master.png`: **1792 × 1792** RGB PNG.
- `crops/platform-169.png`, `crops/harbour-169.png`: **1792 × 1008**, exact 16:9.
- `crops/platform-916.png`, `crops/harbour-916.png`: **1008 × 1792**, exact 9:16.
- `crop-metadata.json`: pixel boxes, sizes, source placement and intersection.

Both locations use identical crop boxes in master coordinates, right/bottom exclusive:
- Landscape: `[0, 392, 1792, 1400]`
- Portrait: `[392, 0, 1400, 1792]`
- Common safe area: `[392, 392, 1400, 1400]`

The four delivered crops were individually opened at their delivered dimensions after final compositing, along with CONTACT. Whole tram ends, shelter/riders and whole ferry/mast plus parcel exchanges remain in BOTH formats. Secondary empty surroundings are expendable. The portrait ferry has modest side margins but neither hull end is cut.

## What changed
**Platform:** real Artic X54 photograph used to guide the longer multi-articulated modern Helsinki vehicle, angular cream cab, dark glazing, low grey equipment roof and multiple doors, adapted to green/yellow illustration colours. This is an Artic-inspired drawing, not an engineering-accurate fleet asset or exact route depiction. Earlier generic triple-car source was rejected during revision. Rider size remains small against the full tram.

**Harbour:** regenerated after an initial attempt still oversized the people. Final ferry is much larger than the small stalls/people, with Suomenlinna-reference slanted wheelhouse, black hull, passenger decks and orange rescue boat. Opposite-water building is gone entirely; background is open muted harbour water. Two little parcel-exchange vignettes, only one cyan courier.

All earlier folders remain untouched, including approved `sunny-camera-studies/stills/03-elevated-metro.png` and `04-close-quay.png`. Rejected close overheads and previous wide art remain preserved in their original folders. These new files are review-stage revisions, not a new approval.

## Master construction: no distortion / no alternate portrait
Generated square source paintings are **1024 × 1024**. Rather than pretend the generator obeyed safe-area instructions, the compositor keeps each scene at its **native pixel scale**, places it at `[384,384]` within a 1792-square master, and extends quiet surroundings using flat graphic pavement/water. Exterior quiet source margins are feathered into the extension; no character or vehicle is extracted or stretched. This is graphic background extension, not reconstructed hidden scenery or independent background animation.

Both deliverables are direct pixel crops from that completed SAME master: no resampling of the delivered crops and no separate portrait generation. Negative space is intentional to protect both formats. The master is not a native 1792 generated-detail claim: original detailed artwork remains 1024 pixels across. Some subtle raster tonal variation remains; these are PNGs, not editable SVG vectors.

## Actual layers / limitations
`layers/{platform,harbour}/` each contains full-frame 1792-square RGBA:
- `00-integrated-extended-plate.png`: all architecture, ground, vehicle, people and shadows, plus quiet background extension. Extra generated cyan heads are recoloured to ordinary heads.
- `10-traced-courier.png`: genuinely transparent exact four-loop master identity with perspective ellipse and ring.

Standard source-over reproduces master. No body/vehicle/architecture/hand separation. Independent translation for those and identity: **0 px**. Parent layers for whole-frame dissolve or conservative centered 100–102% push. No tram glide, walking, ferry motion or independent parallax without clean plates/redraw. No MP4 in scope.

## Real references actually used
1. **Helsinki Artic X54 at Kauppatori**, photograph by **Jussi Mäkinen**, Vaunut.org:
   - Page: https://vaunut.org/kuva/151287
   - Downloaded photo: https://kuvat.vaunut.org/d99cb3100f3faf3189d266b50b62c778.jpg
   - Local: `references/artic-x54-full.jpg` (also a small page thumbnail).
2. **Ferry to Suomenlinna**, Toinen Linja, actual ferry/human/quay reference:
   - Page: https://www.toinenlinja.fi/en/02535
   - Downloaded photo: https://www.toinenlinja.fi/photos/web/02/02535_Ferry_to_Suomenlinna.jpg
   - Local: `references/suomenlinna-ferry.jpg`.

Both downloaded photos were opened before generation and passed as image references. These are reference-only local copies; no claim of redistribution rights or photographer endorsement. Check reference-photo rights before publishing or bundling those originals in a development release.

Additional live context consulted:
- https://www.myhelsinki.fi/fi/places/kauppatori/ — real waterfront market and year-round Suomenlinna ferry context (page read; image download blocked, **not** used as a visual input).
- https://commons.wikimedia.org/wiki/File:HKL_HST_Artic_412,_Mannerheimintie,_2019_(01).jpg
- https://commons.wikimedia.org/wiki/File:Helsingin_kauppatori.JPG
- https://commons.wikimedia.org/wiki/File:Ferry_Terminal_Helsinki_2018.jpg
Commons pages were readable but image hosts refused downloads; their photos were **not** passed to generation. Accessible Vaunut and Toinen Linja photographs above replaced them. Approved sunny references guided early iterations; final scale retries emphasized the real photos.

## Sources / reproduction
`sources/platform.jpg`, `harbour.jpg`: native final generated plates. `iteration-harbour-first.jpg`: earlier scale attempt kept for provenance, not a deliverable. `master-shapes.json`: exact traced loops from `toko/js/master.js`. `compose.py`: Pillow compositor; run `python3 sources/compose.py`. Writes only this new folder. DejaVu Sans needed for CONTACT captions. No build, git, posting or deployment operations performed.


## Approved-only publishing audit — 7 Nov 2026
Latest sunny-dual-crop-v2 tram AND harbour approved, relayed before pt131u Make more new ones with the rules.
Only approved scenes/variants are distributed here. Earlier references to other tests are prose history, not approval. Third-party reference photographs, rejected source variants and weather layers omitted. Exact inventory and layer-level reproduction: ../approved-exteriors/APPROVED-ART.json and reproduce.py. Existing generated source plates and exact registered layers are included. Partial-sheet CONTACT is rebuilt with approved images only; illustration PNG/JPG bytes unchanged. No new portrait invented for older 16:9-only tests.
