# Toko Move — encounters + weather studies (review only)

Four NEW illustrations requested by pt148u. No approved files, git branches, pushes or PRs changed. Not approved yet. Primary references freshly read from PR632 approved inventory at commit 57a8c83af6c631c3ba3ddd7c26c90a48378a82db; live PR state/inventory checked before generation.

## Gameplay grounding / scenes
- **tourist** — trading directions with a paper-map tourist. `toko-move/js/events.js:24–25`, encounter `tourist`: tourist asks for cathedral directions, Trade directions is an existing choice. Art only depicts map conversation; no cathedral/route reconstructed, map lines abstract. Sunny medium three-quarter framing, suitcase + parcel preserve roles.
- **wallet** — handing a found wallet in at a kiosk. `events.js:28–29`, encounter `wallet`: Hand it in at the kiosk is an existing option. Small brown open wallet with visible card is distinct from courier parcel. Side/three-quarter counter pickup framing; no invented reward/UI.
- **wind** — bright overcast tram stop, coat hem/leaves and commuter holding hat communicate gusts. Weather art exploration, not a claim of new mechanical effects. Elevated three-quarter shelter/vehicle setting uses approved Helsinki tram language. More restrained than rejected rain FX; no rain used.
- **snow** — light snow at generic pedestrian steps, parcel held while using handrail. This illustrates existing WALK verb (`CAMPAIGN.md:11–14`, art bible opening); snow is purely visual exploration, no new slip/stamina/deadline mechanic. Final is pedestrian stairs, NOT an invented metro station. The first metro snowfall candidates were discarded for composition; not delivered as final art.

No question needed: event deck supplied two coherent existing encounters. No fragile-cargo penalty, new boarding mechanic, route, seconds cost or UI invented. Campaign/geometry docs, event deck and itch-bible palette read before selection. Art remains illustrative rather than measured geography.

## Files / actual dimensions
- CONTACT.png: all four paired formats, 1480×2700.
- masters/{tourist,wallet,wind,snow}-master.png: 1024×1024.
- crops/<scene>-169.png: 1024×576; crops/<scene>-916.png: 576×1024.
- crop-metadata.json: exact crop boxes/common source-pixel safe area.
- sources/<scene>.jpg: untouched final generated plate.
- sources/master-shapes.json + compose.py: exact Toko trace, registered identity compositor and direct crops/contact generator.
- layers/<scene>/00-integrated-plate.png and 10-exact-courier-identity.png: full-frame RGBA assets.
- asset-sha256.json: file byte hashes for reproducibility.

Four 1024-square masters yield actual SAME-PIXEL16:9 and9:16 crops. No stretching, separate portrait generation, padding or post-generation canvas expansion. Exact face overlay adapts ellipse perspective; only courier is cyan, others ordinary. Head faces are visible in all final scenes, not stamped on back of head.

## Visual inspection / framing limits
All eight delivered crops visually inspected at resolution plus contact sheet. Tourist pair is strongest balanced two-person crop; full figures in portrait, medium framing in landscape. Wallet pair keeps both heads, brown wallet/card, both accepting hands and parcel; portrait trims peripheral courier arm/bag and outer worker shoulder/kiosk. Wind keeps heads/parcel/hat gesture and body pose; portrait trims outer bag/coat and cab right edge; landscape excludes pantograph/upper rear vehicle. Snow portrait retains whole courier and most stairs; landscape is medium framing, cutting lower legs/outer steps while retaining head, box, rail-grip and snow caps. Core situation remains readable; not a promise of whole vehicle/furniture in every crop. No partial rear-head portrait like the earlier cyclist test.

## Canonical visual/network rules
Less BACKGROUND, not crude/blocky people. Open cream paper with grounded essential props, modest detailed articulated tailoring, flat navy/ochre/sage and Helsinki green/yellow tram. Palette bible cream #f4f1e8, navy #233d4d, identity cyan #33b2d2; final illustration paper is warm as approved source style. No painted cyberpunk, neon, UI, photorealism or 3D. Weather newly explored here is restrained wind and light snow/overcast; old rejected rainy pack was NOT a reference or source.
Outdoor metro only Kalasatama/east within game scope, sites separate from tram. Unverified bridge-service exception not depicted. Final four contain no metro site claim and no named route/location labels. Tram proportions inherited from approved real-reference-informed art, no new vehicle subtype/doorway hardware introduced.

## Actual source references (primary approved art)
From live PR632 pack:
- sunny-open-backgrounds/masters/bench-master.png and tram-master.png.
- sunny-open-perspectives/masters/kiosk-master.png and doorway-master.png.
- sunny-minimal-comparisons/masters/tram-master.png.
- sunny-camera-studies/stills/03-elevated-metro.png (filename historical; approved stairs pose reference, not geography).
Final illustrations use these actual images in GenerateImage. No third-party photos bundled. Existing metro photo was consulted only in discarded snow-metro attempt; no photographic/new transit claims in final snow study.

## Reproduction
Python3 + Pillow and DejaVu Sans at /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf. Run `python3 sources/compose.py`. All deterministic source inputs bundled. Generation itself is not reproducible from seed; original plates archived. Exact registered identity/composite/crop outputs reproducible.

## Approval and delivery status
Review only, NOT part of PR632. No git/push/PR updates. Approved reference pixels and unrelated local checkout changes untouched. If approved later, ship selected approved variants with full assets/manifest, not code-only, and avoid treating a partial-sheet approval as approval for siblings.


## Approval update
All four scenes approved by pt150u on 7 Nov 2026; included in PR632. Supersedes earlier review-only status. Original illustration bytes unchanged. See SCENES-GAMEPLAY.md.
