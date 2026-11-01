# Toko Move: minimal metro look test

This folder lines the game's art up with its UI. Mikael's verdict on the painted pack was: *"The ui is good, everything else needs to go."* He later sent two flat-vector illustration refs (`_refs/`) and asked for motion-ready layers, with *"Use Toko face for one of the people."*

- **Pass 3 (Nov 1, 2026): zoomed in, with varied camera angles.** Mikael's note on pass 2 was *"This is good, keep making it better, can be zoomed in and not always from the sitting side perspective."* The heroes are now close: knees-up or waist-up, with big heads and hands. Each scene uses a different camera:
  - **day** (tram 4, Sealed Parcel, opportunity) is a **three-quarter shot across the aisle**. The CP2077 bench pose is drawn flat: the courier leans on his knees with the parcel in both hands, a dozing rider with headphones sits beside him, and the window is behind.
  - **night** (last metro to Vuosaari, info) is **seat-forward, over the shoulder, looking out the rainy glass** at the bridge lights. On 9:16 the card sits up on the dark glass.
  - **strap** (tram 4, inspectors, notice) is a **standing strap-hold at the door bay**, low and waist-up. It is a new, optional extra and ships 16:9 only.
  - **disruption** stays the **wide isometric stop**, and **disruption-close** adds a **close platform crop** on the courier at the halted nose. Both use the same code at 2.15×.
  - **How:** each interior starts as three flat-vector plates in `_plates/`: `full`, `empty` (the people removed) and `glass` (the panes keyed #00FF00). The plates were made from the two refs plus the CP2077 pose ref. `plates.py` cuts them into a motion stack. Glass is cut from the key and the outside is bled about 70 px for drift, with a seamless mirrored tile for scrolling. People come from the full − empty difference, and the courier is split from his neighbours. The courier's placeholder head is swapped for the bible Toko face (cyan, white ring, traced master face). The signage, HUD and card are still drawn in code. The flat look holds: no painting, no photoreal and no cyberpunk.
  - Pass 2 (wide side-sit) is archived in `_prev/pass2-side/`: stills, `illus_pass2.py`, CONTACT and MP4.
- **Pass 2 (Nov 1, 2026): more style and detail, toward the refs.** Mikael's note on v1 was *"Too blocky, needs to be closer to the references. So a bit more style and details."* The axis is now **CP2077 staging → flat-vector execution → Bithell-style card**. The CP2077 metro concept is used only for pose and staging: the courier sits on the bench in a side-on car with the window behind. The flat-vector refs set the medium. The Subsurface Circular-style minimal written UI is the card on top. v1 is kept in `_prev/` for comparison.
  - **People:** articulated figures with tapered limbs, hands, hair silhouettes (bun, ponytail, long + hood, curly, grey, beanie), open jackets over shirts or closed coats with collar and buttons, shoes with soles, and props (backpack, phone, book, coffee, headphones, sealed parcel, crossbody strap). Faces stay featureless with an ear and a nose bump, as in the refs. The courier is the only exception, with the Toko face.
  - **Cars:** framed windows with mullions and sills, a door bay with leaves, windows and threshold, ceiling light panels, a dado rail with a darker lower wall band, floor edge lines, a gold rail with ball-jointed poles, strap handles, and L-shaped seats (tilted back shell, cushions, pedestal, floor shadow). The city outside has clouds, towers, a dome, window-grid blocks and trees, and it still tiles seamlessly.
  - **Stop:** the disruption scene is now icon-clean isometric after the tram ref. It has a three-car tram with a sloped nose, windscreen and pantograph, a glass shelter with a bench and ad panel, a ticket machine, a bin, paving joints, catenary masts, far iso blocks and flat cast shadows. It is mirrored so the card corner stays clear.
  - **Still flat:** no gradients, no texture and no painting. The bible palette is unchanged, and there are 3–4 people per scene.
- **Medium:** flat vector drawn in code (Pillow). Pass 1 was more minimal than the refs and was rejected as too blocky. Pass 2 sits between the refs and the bible UI, as above. The palette, Inter type, line chips and HUD all come from `../itch-bible/ART-BIBLE.md`.
- **Hero:** the bible event card, which is a Toko face, one line, and two buttons priced in seconds. The left button is filled navy and is the primary choice; the right one is ghost.
- **Toko face:** exactly one passenger has it, and that is the courier. It is the cyan mood disc with a white ring and the white traced-master face (`toko/js/master.js`). Everyone else has a plain flat head. Never magenta.
- **Rejected:** the painted cyberpunk metro cars (`../cyberpunk-metro/`, `../cyberpunk-metro-2d/`). They stay untouched, as history.

## Contents
| path | what |
|---|---|
| `scenes/{day,night,disruption,disruption-close}-{169,916}.png`, `scenes/strap-169.png` | Hero stills at 1920×1080 and native 1080×1920. Day is the three-quarter across-the-aisle sit on tram 4 (yellow opportunity card). Night is over the shoulder out the rainy glass on the last metro (cyan info card, 23:51). Strap is the door-bay strap-hold, with inspectors boarding at Rautatientori (notice card). Disruption is line 4 halted at Ooppera in iso, wide and close (coral warning card). |
| `layers/<scene>/<169\|916>/NN-*.png` + `layers/<scene>/MOTION.md` | Full-frame transparent layer stacks that composite exactly to the stills. Plate interiors use `01-outside` (bled), `02-car`, `03-people`, `04-courier`, `05-signage`, `06-hud` and `07-card`, plus `01-outside-tile.png` for the window scroll. The iso stop uses `01-backdrop` … `09-card`. |
| `_plates/` + `plates.py` | The source plates (`<scene>-<tag>-{full,empty,glass}.jpg`, 1280×720 or 720×1280) and the cutter. `alt-day-across-wide.jpg` is an unused wider take. The cut cache is in `_cache/plates/`. |
| `card-closeup.png`, `card-moods.png` | The card as hero, over a soft day interior, plus all four moods (opportunity, info, warning, notice). |
| `transitions/<name>/f1–f5.png`, `transitions-sheet.png` | 14 transitions, 5 transparent keyframes each. They cover card stamp-in ×4 moods, night ink fade, disruption grey-out with coral pulse, iris to the courier's Toko face, the HUD (+N s counter, job dot, deadline ring, clock roll), and the NIGHT, DISRUPTION and SEALED PARCEL chips. |
| `sample-motion.mp4` | 1280×720, 30 fps, 11.5 s, with a different camera on each beat. Day across the aisle (window scroll, sway, slow push-in on the face) → yellow card → Take it → +40 s to the HUD → iris on the courier face → wide iso stop, line 4 greys out → cut to the close platform crop → coral card → ink wash → night over the shoulder (lights drift, rain runs down the glass) → cyan card → job dot fills. `mp4-frames/` holds the grabs. |
| `board/` | Schematic HSL board stills and layers (the bible map at a tighter crop). These are support material, not the hero. |
| `CONTACT.png` | Everything above on one sheet. Row 0 shows pass 2 (archived) next to the three refs, and row 1 is the day hero with both 9:16 interiors. |
| `_prev/` | The v1 "too blocky" day still and `illus.py`, kept for comparison, plus `ai-probe-day.jpg`: a one-off AI style probe made from the refs and used only as a target for proportions. It is not in any deliverable. |

## Rebuild
```
python3 make_scenes.py && python3 make_board.py && python3 make_card_closeup.py \
 && python3 make_transitions.py && python3 make_sample_mp4.py && python3 make_contact.py
```

## Code
- `plates.py` cuts the pass 3 interior plates into layers and places the courier's Toko head. `illus.render()` routes `plate=True` scenes through it.
- `illus.py` holds the scenes, the people (`person()` spec dicts), the courier, the iso camera and the layers. `head_xy()` and `plate_xy()` give the motion origins.
- `look.py` and `beats.py` hold the board camera and layers, the card, and the HUD.
- `ui_extra.py` holds the chips.
- `bible_render.py` is an unmodified local copy of `itch-bible/make_bible.py`, used for the palette, geometry and faces.
- `_cache/sea_ref.png` is the board's solved water mask.

## Rules held
- Day paper is `#f4f1e8` and night ink is `#0f1418`. Halted grey `#b8c2c6` and coral `#e2683c` are used for disruption only.
- Toko cyan is used only on the courier face and the info card face.
- There are no headings or second sentences on cards, and the clock uses tabular figures.
- Isometric is used only at the stop (ref 2). Interiors are close and vary the angle (three-quarter, over the shoulder, strap-hold). There is no A→B route line, no HSL wordmarks and no mature content.
