# Strap-hold · tram 4 door bay · inspectors — motion (16:9 only this pass)

Pass 3, an optional extra angle. The camera is low and close at the door bay, waist-up. The courier stands with one arm up on a strap and the parcel hugged to his chest. Two riders behind are turned away: a phone rider in a pink coat and a rider with a backpack. Stacking 01→07 rebuilds `scenes/strap-169.png`.

| layer | what moves | amount | loop |
|---|---|---|---|
| 01-outside | The street through the door glass and windows. Tile or drift as on day. | 120 px/s | tile |
| 02-car | Doors, frames, poles, rail, empty straps and seats. Sway. | 1.4 px | 1.6 s |
| 03-people | The two riders. Sway with a lag. The phone rider tilts her phone 2 px every 3 s. | ≤ 2 px | 1.6 s |
| 04-courier | The strap hand stays pinned, because the handle is in this layer. Rotate the body ±0.8° about the hand instead of translating it. | ≤ 0.8° | 1.6 s |
| 05–07 | Signage 4 · › RAUTATIENTORI, the HUD, and `card-stamp-notice`: *Inspectors board the 4 at Rautatientori.* `Show the app` is +15 s and `Step off` is +120 s. | | |
