# Toko Move — sunny city arrivals

Three new exterior compositions, following explicit approval of **all three** `sunny-new-locations` pairs. Those approved files and all earlier art remain untouched. Approval history is recorded in this pack's `approval-record.json`. This new pack remains for review. No build, git, push, post or deployment changes.

## New scenes
- **Kalasatama approach:** orange classic M100-inspired metro arriving around the urban elevated curve. Courier pauses with parcel on parapet, body toward tracks and face glancing back. Real approach photograph guides the railway/building relationship. This replaces an initial exaggerated viaduct candidate; final is not the previous Siilitie platform composition.
- **Central Station exterior pickup:** recognizable granite arch, gridded window and lantern carriers; courier takes a parcel beside a luggage trolley. No outdoor metro or invented railway track in the square.
- **Katajanokka canal crossing:** courier mid-stride across low steel bridge, parcel under arm, phone in other hand, cafe worker indicating destination. No market/park bench/elderly-recipient repetition; no big ferry in the narrow canal.

All are simplified Helsinki-inspired vignettes, not measured architecture or precise current transit geometry. The bridge/canal facades are contextual simplifications, not claims of a newly named real bridge or exact door location. Kalasatama is in the game city dataset and is a supported outdoor-metro location; no outdoor metro placed west of it. Metro/tram geography remains separate. User-reported new bridge-tram exception remains unverified here and is not depicted or given a route number.

## Actual deliverables
`CONTACT.png`: **1480 × 2040**, three paired views.

`masters/{kalasatama,station,canal}-master.png`: **1024 × 1024** RGB PNG.

`crops/{kalasatama,station,canal}-169.png`: **1024 × 576**.
`crops/{kalasatama,station,canal}-916.png`: **576 × 1024**.

All SIX were individually opened and visually inspected after final compositing. Each pair is direct pixel crops of the SAME master: no distortion, resampling, padding, blank filler expansion or alternate portrait generation. `crop-metadata.json` provides each crop box and the common action intersection. Train/courier/parcel, pickup hands, and walking courier/bridge/cafe destination remain readable. Medium landscape pickup/arrival frames deliberately crop lower bodies; portrait pickup shows the full trolley and stance. Peripheral architecture, statue tops or bridge ends can continue off-frame; these are editorial scene views, not complete isolated landmark/vehicle assets.

## Canonical rules
Sunny cream/navy/ochre/sage palette and orange metro; flat graphic illustration, natural articulated poses, stylish modest detail. No rain, neon, painted cyberpunk or blocky blob figures. Real photos guide recognizable vehicles/landmarks and sensible scale. Elevated overall and medium environmental views, not literal overhead portraits. Geographic inspiration must be labelled honestly; no invented landmark/transit joins. ONE exact cyan Toko-faced courier, normal people otherwise; never magenta or a generated replacement smile. Face stays tied to the head perspective, not stamped onto a hair crown. Both actual formats must be inspected. Preserve approvals, and include approved art with future development PRs using it.

## Actual layers and limits
Each `layers/<scene>/` has two **1024-square RGBA** PNGs:
1. `00-integrated-plate.png`: all bodies, vehicles, architecture, ground and shadows. Station generated sign lettering removed; Kalasatama notice panel simplified; canal's mistakenly cyan hands recoloured to skin.
2. `10-exact-courier-identity.png`: transparent white traced master on cyan perspective disc and white ring. Loops are the snapshot from `toko/js/master.js`, not generation.

Source-over reproduces master. **Not animation rigs.** No independently separated bodies, vehicles, architecture or limbs; independent movement **0 px**, including face relative to body. Whole-composite hold/dissolve or carefully bounded push only. Walking, train glide and parallax need redraw/clean-plate work. Station source has more granite raster texture than other scenes; these are PNG plates, not vector source files. No rough matte extraction presented as production-ready.

## Real references downloaded, opened and used
- **Kalasatama M100 approach**, Miska Sallinen:
  https://vaunut.org/kuva/176248
  https://kuvat.vaunut.org/df792a00a25608f32255a154c1998eff.jpg
- **Central Station lantern carriers**, Toinen Linja:
  https://www.toinenlinja.fi/fi/01531
  https://www.toinenlinja.fi/photos/web/01/01531_Kivimiehet_rautatieaseman_paaovella.jpg
- **Katajanokka canal/bridge**, Ritva Sillanmäki:
  https://sillarit.com/2024/11/07/street-views-from-katajannokka/
  https://sillarit.com/wp-content/uploads/2024/11/img_03523.jpg

Reference photos are local study inputs, not asserted freely redistributable. Clear rights before publishing those originals. Approved `sunny-new-locations` images were the primary illustration-style references. Real photos establish material/silhouette/context rather than copied pixels. The photographer's facade photo `references/img_0329.jpg` was inspected but not a generation input. An earlier canal host had a TLS error and ipernity refused access; neither supplied an image used in generation.

## Sources / rebuild
`sources/{kalasatama,station,canal}.jpg`: native untouched generated plates.
`sources/master-shapes.json`: exact master loop snapshot.
`sources/compose.py`: Pillow compositor/contact builder, `python3 sources/compose.py`, writes only this folder. Requires DejaVu Sans for captions.


## Latest approval update
Detailed city-arrivals variants approved by latest user clarification. Metro approach remains illustrative, not verified Kalasatama geometry.


## Approved-only publishing audit — 7 Nov 2026
Approve the detailed ones — all three detailed city-arrivals pairs; metro approach illustrative only.
Only approved scenes/variants are distributed here. Earlier references to other tests are prose history, not approval. Third-party reference photographs, rejected source variants and weather layers omitted. Exact inventory and layer-level reproduction: ../approved-exteriors/APPROVED-ART.json and reproduce.py. Existing generated source plates and exact registered layers are included. Partial-sheet CONTACT is rebuilt with approved images only; illustration PNG/JPG bytes unchanged. No new portrait invented for older 16:9-only tests.
