# Day · tram 4 · Sealed Parcel · three-quarter across the aisle — motion

Pass 3. The camera sits across the aisle, close, with the courier framed knees-up on the bench, after the CP2077 bench pose drawn flat. The masters are `169/` (1920×1080) and `916/` (1080×1920). Each is its own native plate, not a crop. Every layer is a full-frame RGBA PNG, and stacking them 01→07 rebuilds `scenes/day-*.png` exactly.

| layer | what moves | amount | loop |
|---|---|---|---|
| 01-outside | Window scroll. Use `01-outside-tile.png` (seamless: the biggest pane plus its mirror, with flat sky and pavement bands) and offset x by −t·speed, modulo the tile width. For a pure parallax drift, `01-outside.png` bleeds about 70 px past the frames. | 150 px/s at 1280 wide | tile period about 11 s |
| 02-car | The empty car with the glass punched out (walls, frames, bench, gold pole, straps). Car sway. | y = 1.4 px·sin(2πt/1.6 s) | 1.6 s |
| 03-people | The dozing rider with headphones, arms crossed. Same sway with a 0.08 s lag. | ≤ 2 px | 1.6 s |
| 04-courier | The courier, parcel in both hands, ochre bag. The placeholder head is replaced by the bible Toko face (cyan, white ring, white traced face) sitting on the collar. Sway plus a 0.8 px head bob at 2× frequency. The face never deforms. | ≤ 3 px | 0.8 s |
| 05-signage | The in-car display (4 · MUNKKINIEMI › LASIPALATSI). Static. | none | n/a |
| 06-hud | Ring drain and clock roll (`transitions/hud-clock-roll`). | n/a | n/a |
| 07-card | `card-stamp-opportunity`: *A rider at Lasipalatsi needs this before Töölö.* `Take it` is +40 s and `Leave it` is +0 s. | ≤ 28 px | one-shot |

- **Push-in:** the MP4 scales the composite 1.00→1.035 about the courier's face over 2.4 s. Keep the push at or under 4 % so the plate stays sharp.
- **Parallax:** 01 at 1.0×, 02 at 0.6×, 03–04 at 0.5×, and 05–07 locked. Keep the total under 40 px.
- **Origins:** `illus.head_xy('day', W, H)` returns the Toko face centre, used for the iris and the push-in.
- **Source:** `_plates/day-<tag>-{full,empty,glass}.jpg`, cut by `plates.py`. The masks are full − empty for people and the keyed green for glass.
