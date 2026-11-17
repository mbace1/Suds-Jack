# Toko Move — outdoor weather tests

Exploratory artwork, **not yet approved for development**. Existing approved pack is untouched. Nothing posted, committed, pushed or wired into the build.

## Six clean stills
All PNG RGB, **1024 × 576 (16:9)**, without HUD or event cards:
- `stills/tram-dry-169.png`, `tram-rain-169.png`: **Opera Platform**, a fictional Ooppera-inspired civic tram-stop treatment.
- `stills/harbour-dry-169.png`, `harbour-rain-169.png`: **Market Quay**, a fictional Kauppatori-inspired parcel hand-off.
- `stills/metro-dry-169.png`, `metro-rain-169.png`: **Market Stairs**, a fictional Hakaniemi-inspired market-district metro entrance.

These are architectural/mood inspirations, not exact geographic reconstructions or wayfinding illustrations. Any signage is fictional. Strongest pair: **Market Quay** — clear hand-off, warm dry palette versus cool rain, prominent parcel and skyline. The stair scene supplies the most different camera angle.

`CONTACT.png` (1320 × 1510) displays matched pairs plus a layer sample. No 9:16 crops: cropping these compositions would lose the recipient, arrival tram or opposing commuter. No MP4 requested.

## Layer manifest
Each `layers/{tram,harbour,metro}/` contains five **1024 × 576 full-frame RGBA PNGs**:
1. `00-integrated-illustration.png` — opaque raster environment AND bodies, with blank courier head; incidental generated signage replaced.
2. `10-rain-cool-grade.png` — translucent cool wash, rain version only.
3. `20-pavement-sheen.png` — sparse transparent ground sheen, rain version only.
4. `30-courier-traced-identity.png` — exact white traced master, cyan disc and white ring; use in BOTH versions.
5. `40-rain-streaks.png` — transparent diagonal streaks, rain version only.

Dry: 00 → 30. Rain: 00 → 10 → 20 → 30 → 40. Standard source-over compositing. Exactly one cyan Toko identity in each final. No generated smile substituted for the master. Palette guided by `../itch-bible/ART-BIBLE.md`; illustrative plate shades are not a strictly indexed UI palette.

**Important delivery limit:** weather and identity are independently layered, but architecture, vehicle and human bodies remain an integrated generated raster plate. This is NOT a fully separated character/environment animation rig. No rough matte extraction or invented hidden scenery is supplied as production-ready. See MOTION.md before animating.

## Source and reproduction
- `sources/{tram,harbour,metro}.jpg`: original generated plates, **1280 × 720**. Generated with the approved `minimal-metro-look/scenes/day-169.png` as visual reference; prompts requested dry fictional Helsinki-inspired treatments, navy courier, ochre satchel, plain cyan disc, articulate flat-vector figures and no UI. Generated incidental signage was cleaned in compositing.
- `sources/master-shapes.json`: snapshot of the four traced loops used from `toko/js/master.js`.
- `sources/render.py`: Pillow compositor; deterministic seeds, disc placement, sign cleanup, weather, and contact layout. Run with `python3 sources/render.py` from anywhere in this checkout. Reads the original master path; does not modify it. Pillow and DejaVu Sans needed.

Finals deliberately normalized to 1024 × 576; no claim of native 1920 output or editable SVG. Source JPG grain/subtle tonal variation remains. Rain is a controlled weather-overlay test, not a physically repainted drenched-cloth simulation: no added umbrellas or pose changes, ensuring the composition stays exactly matched.

When approved, include approved art alongside any future development PR that uses it; do not leave the approved delivery outside that PR. These tests alone do not authorize posting or development integration.


## Approved-only publishing audit — 7 Nov 2026
Sunny ones work, rain doesn’t — sunny subset approval; rain excluded.
Only approved scenes/variants are distributed here. Earlier references to other tests are prose history, not approval. Third-party reference photographs, rejected source variants and weather layers omitted. Exact inventory and layer-level reproduction: ../approved-exteriors/APPROVED-ART.json and reproduce.py. Existing generated source plates and exact registered layers are included. Partial-sheet CONTACT is rebuilt with approved images only; illustration PNG/JPG bytes unchanged. No new portrait invented for older 16:9-only tests.
