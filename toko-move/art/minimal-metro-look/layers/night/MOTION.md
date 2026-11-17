# Night · last metro to Vuosaari · over the shoulder out the rainy glass — motion

Pass 3. The camera is seat-forward, just behind and beside the courier, looking out the rain-streaked glass at the bridge lights (the Kulosaari crossing). The masters are `169/` and `916/`, each a native plate. On 9:16 the card sits up on the dark glass (y = 300) so it does not cover the parcel and hand. Stacking 01→07 rebuilds `scenes/night-*.png`.

| layer | what moves | amount | loop |
|---|---|---|---|
| 01-outside | What is seen through the glass: sky, rain on the pane, the city silhouette, the bridge and the yellow lights. Drift it slowly sideways (the bleed is about 70 px). Don't scroll the tile, because the mirror would show the baked rain as V shapes. | −10 px/s at 1280 | ≤ 45 px over the beat |
| (code) rain | The MP4 adds `rain()`: 70 thin diagonal streaks sliding down the pane, clipped to the glass (the inverse of 02's alpha). | 520 px/s·v | continuous |
| 02-car | The dark wall, window frame and ledge, the orange pole and the seat with the rust edge. Sway. | y = 1.0 px·sin(2πt/1.1 s) | 1.1 s |
| 03-people | Empty in this shot (the courier rides alone). | n/a | n/a |
| 04-courier | Seen from behind the shoulder: slate jacket, ochre strap, hand on the parcel at the ledge, and the Toko face. Sway plus a 0.6 px bob. | ≤ 2 px | 0.9 s |
| 05-signage | M · VUOSAARI › KULOSAARI. Static. | none | n/a |
| 06-hud / 07-card | `card-stamp-info`: *Last metro to Vuosaari leaves Kamppi.* `Catch it` is +60 s and `Walk` is +900 s. Then the job dot fills. | ≤ 28 px | one-shot |
