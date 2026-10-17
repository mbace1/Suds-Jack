# 3D benchmark: Kyoto Toko at the irori, at the Aardman / *Kubo* bar

Production standard, order of work step 2. This is a **calibration for the owner, not a film**: one shot, about
8 s, that shows what "Aardman and Laika's *Kubo*" means in this house's clay. *Welcome Home* (RFH film 4,
Tue 27 Oct) takes its lighting, materials and acting pass.

**Starting point:** the look test `plan/looks/toko-japan-clay.png` (left half) and `clay/japan/film-jp.js`.

## What the look test lacks, against the references

| | the look test | the bar (Aardman, *Kubo*) | the benchmark does |
|---|---|---|---|
| Light | Blown-white shoji, a flat fill. The irori glows but lights nothing. | Motivated sources that model the puppet: warm firelight from below, cool daylight behind, a rim that separates the figure. Haze in the air. | Key = the irori's ember glow, low and warm, on the mask and hands. Cool backlight through the shoji: paper fibres lit, a soft shaft. A rim on the hat and shoulders. AO pass (`makeAO` exists in `lib/post.js`, unused so far). Kettle steam and a thread of smoke in the light. |
| Set | Sparse; the irori oversized; wet-looking planks | Dense, specific, everything at puppet scale | Tatami with cloth borders; a **jizai-kagi** pot hook with its fish-shaped *yokogi* holding the tetsubin over the fire; *hibashi* in the ash; a zabuton; smoke-blackened beams; strings of *hoshigaki*; the 令和8年 calendar; the rotary phone with its note (電話は午前中のみ). All rescaled to Toko |
| Materials | One smooth clay for everything | Plasticine with thumbprints, felt, knit, wood grain, cast iron, paper | A quilted *hanten* jacket (stitched panels), a knit cap, cast-iron kettle (pitted), raked ash, paper shoji with fibre, wood with grain and wear |
| Acting | A held pose | Anticipation, follow-through, holds; eye-lines | On twos. Toko lifts the cup (anticipation: a small dip first), blows on it (the steam bends away), sips, settles, then a slow head tilt toward the window. With a mask, the head tilt and the hands do the acting |
| Camera | Fixed, front-on | Lenses, motivated moves, rack focus | A 50 mm-equivalent from a low seated eye line. A slow dolly in. Rack focus from the steam in the foreground to Toko as the cup comes up |

## Out

- No face: the mask is the face (canon).
- No text overlays.
- No RFH branding: this is a Toko-channel look.

## Deliverables

- An 8 s clip with sound: room tone, the fire's tick, the kettle's hiss, a sip.
- A still of the hero frame, set beside the look test as before and after.
- Notes on what *Welcome Home* takes from it.
