# Day · tram 4 · Sealed Parcel — motion

The masters are `169/` (1920×1080) and `916/` (1080×1920). Every layer is a full-frame transparent PNG, and stacking them 01→08 rebuilds `scenes/day-*.png`.

| layer | what moves | amount | loop |
|---|---|---|---|
| 01-outside | Window scroll. Use `01-outside-tile.png` (seamless, 1600 px wide at 1080 scale) and offset x by −t·speed, modulo tile width. | 160 px/s at 1280 wide, 240 px/s at 1920 | seamless (tile period 6.7 s at 1920) |
| 02-car-shell + 03-fixtures | Car sway, one group. 03 holds the gold rail, poles, strap handles and the L-shaped seats with their floor shadows. | y = 1.6 px·sin(2πt/1.6 s) | 1.6 s |
| 04-people | Three riders: the reader (left seat), the phone rider (pink coat) and the standing rider with a backpack holding a strap. Same sway with a 0.08 s lag. The strap hand stays pinned to the handle, so rotate the raised arm ±1.5° about the shoulder instead. The phone rider can tilt her phone hand 2 px every 3 s. | ≤ 2 px | 1.6 s |
| 05-courier | Seated, parcel on the lap, ochre crossbody strap (the CP2077 staging, drawn flat). Same sway plus a tiny head bob, 1 px at 2× frequency. The Toko face never deforms. | ≤ 3 px | 0.8 s |
| 06-signage | Static. Optionally blink the yellow next-stop text (on 1.2 s, off 0.2 s). | none | 1.4 s |
| 07-hud | The ring drains clockwise and the clock rolls each minute (`transitions/hud-clock-roll`). | n/a | n/a |
| 08-card | Stamps in with `transitions/card-stamp-opportunity` (0.45 s). The face pops after the panel lands. The primary button press is 0.25 s. Exit is fade plus 24 px down. | ≤ 28 px | one-shot |

- **Parallax for layered transfers:** drift camera x ±20 px with 01 at 1.0×, 02–03 at 0.6×, 04–06 at 0.5×, and 07–08 locked. Keep the total under 40 px so the 9:16 and 16:9 masters both hold.
- **Beat:** the card says *A rider at Lasipalatsi needs this before Töölö.* `Take it` is +40 s and `Leave it` is +0 s. On `Take it`, the `+40 s` chip flies to the HUD clock (`transitions/hud-cost-counter`).

- **Pass 2:** people are now articulated (tapered limbs, hair silhouettes, open or closed jackets over shirts, shoes, bag, phone, book) and the car has framed windows, a door bay, ceiling light panels and a dado rail. 9:16 is the same car with the camera shifted, and the reader seat is off-frame.
