# Toko Move — choice + consequence studies

All four illustrations APPROVED pt151u on 7 Nov 2026, published in same PR632. No gameplay code changes. Primary approved imagery is in PR632; latest approved encounter/weather pack was separately shipped before this study.

## Preview / assets
CONTACT.png shows four paired formats. masters/{crossing,saved-seat,sealed-place,demonstration}-master.png are1024². crops/<scene>-169.png are1024×576; -916.png are576×1024. Real direct crops of identical source master pixels, no stretching, portrait repaint or padding. crop-metadata.json contains boxes/common safe area.
Sources: four untouched generated JPG plates, traced master-shapes.json, deterministic compose.py. Full-frame layers: integrated plate + independently registered identity. saved-seat identity is intentionally transparent, because courier faces away. No fake face on rear head. Crossing identity is narrow profile projection, not a front disc pasted over rear hair.

## Scenes / cameras
A elevated crossing → B reverse rear-shoulder saved-seat callback: actual same-run choice consequence, woman consistent sage/grey hair/paper bag. C inside kiosk hatch looking out: sealed parcel information versus ride choice, Kauppatori-side illustrative staging. D high wide overview: proposed demonstration halt, not implemented cause. See SCENES-GAMEPLAY.md for exact code/doc sources, options, gating and clear implemented/proposed distinctions.

## Inspection / limits
All eight individual crops inspected at delivered resolution plus contact. A retains both figures/crossing in each, trims outer curb ends in portrait. B retains both entire heads, welcoming hand, parcel and central EMPTY seat; portrait is tighter and crops outer shoulders/right seat but does not chop courier rear head. C preserves face/seal/box, counter and part of pointing finger/tram cab in portrait; landscape conveys kiosk/vehicle context more fully. Tram is further back, not next to same-depth oversized courier. D deliberately uses earlier approved sparse wide overview; crowd/identity are small at1024 to preserve realistic vehicle proportions. Landscape trims rear pantograph/rail extents; cab/crowd/courier intact. No claim entire vehicle/furniture visible in every format. No repeated frontal parcel exchange poses.

## References / rights
Approved actual images used in generation: sunny-open-backgrounds bench/tram masters; sunny-open-perspectives kiosk/doorway masters; sunny-dual-crop-v2 platform master; new-locations tram master; approved encounter tourist master. First crossing test was camera/pose reference for later callback, final crossing regenerated to wider environment.
New real Artic interior photo visually inspected for seat/pole/door proportions:
https://commons.wikimedia.org/wiki/File:Interior_of_%C5%A0koda_Artic_tram_in_Helsinki,_2020_April.jpg
Photo Yehia Eweis / Helsinki City Museum, CC BY4.0: https://creativecommons.org/licenses/by/4.0/ . Illustration is a stylized adaptation of interior proportions, not photographic reproduction; no endorsement implied. Original photo is NOT bundled; public reference stays outside pack at /workspace/toko-artic-interior-reference.jpg. Red headrests/grey seats/silver poles follow observed vehicle hardware; final spatial arrangement is editorial cutaway, not engineering diagram.

## Rules / readiness
Open cream space and essential scene props, stylish articulated figures and real Helsinki vehicle language/scale. Flat navy/ochre/sage/green/yellow, no neon/painted cyberpunk/3D/UI. One cyan exact courier face where visible; ordinary people otherwise. Network rules unchanged: outdoor metro only Kalasatama/east, no invented shared tram interchange; bridge exception unverified/not depicted. These final scenes contain trams, no outdoor metro claim. Geography honestly illustrative, no invented named storefront architecture, routes, costs or mechanics.
Only exact identity independent; bodies/environment/props integrated rasters, NOT rigs. See MOTION.md. Python3+Pillow+DejaVu Sans required for compositor. No gameplay code/build edits or unsolicited integration work. Approved art, not approval to implement proposed mechanics.

## Approval and historical captions
All approved illustration/source/layer/contact bytes are unchanged. Original CONTACT/source compositor still says “review-only”; this is its historical review caption, superseded by approval-record.json. Demonstration art is approved, but demonstration gameplay cause is explicitly NEW PROPOSAL. No third-party reference photo bundled.
