# Validator fixtures — two frames that must be rejected

Both pairs are real generator output. Both are worthless as animation. Any
duplicate gate that passes them is not doing its job, so they exist to prove a
validator works rather than to be trusted on description.

Run:

```sh
node ../phase.cjs . pairs.json
```

Expected:

```
near-duplicate   legIoU 0.847   NEAR-DUPLICATE legs
mirror           mirrorIoU 0.948   MIRROR of the other frame
```

## near-duplicate-a / -b

Asked for two opposite contacts of a run by requesting the second as a delta on
the first ("swap which leg is planted"). The model kept the facing and did not
swap the legs. Verified by eye at full resolution as well as by metric: the
planted/trailing assignment is identical in both.

## mirror-a / -b

Asked for both contacts in a single image. The model produced genuinely
different legs — by horizontally mirroring the whole character, which reverses
the facing and destroys the animation.

## Why exact-pixel similarity cannot be the gate

Measured on these same two pairs, whole-image exact-pixel similarity gives:

| pair | exact-pixel similarity | verdict at a >97% threshold |
|---|---|---|
| near-duplicate | 69.86% | passes |
| mirror | 42.40% | passes |

Two separate generations are never pixel-identical, so exact equality has no
power here. The signal is in the silhouette — specifically the lower body,
where a stride actually differs — and in comparing against the mirrored
silhouette as well as the direct one.

For calibration, frames that genuinely differ score legIoU 0.30–0.53; frames
that merely look different score 0.65–0.87.
