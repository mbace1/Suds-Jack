# spritekit — generate and validate TURF animation frames

A small pipeline for producing per-character animation frames and proving they
are actually animation rather than a set of similar pictures. Built by probing
what this image model can and cannot be made to do, over five rounds; the
numbers quoted below are measured, not estimated.

Nothing here is TURF-specific except the reference art it is pointed at.

```
build.mjs      identity + pose      -> prompt text
gen.mjs        prompt + reference   -> raw PNG
slice.cjs      multi-frame strip    -> individual frames
                 (…then kindling/tools/cut.mjs key / fit --no-quantise)
phase.cjs      frame pair           -> duplicate / mirror / opposition scores
drift.cjs      a cycle              -> scale, origin, body-height rhythm
normalise.cjs  a cycle              -> scale + origin fixed in post
anim.cjs       a cycle              -> looping GIF to actually watch
```

## The finding that matters

**The model cannot be asked for a phase-opposite frame relationally.** It has
two failure modes and will pick one:

| ask | what happens | measured |
|---|---|---|
| both frames in one image | gets opposite legs by **mirroring the character**, destroying the facing | mirrorIoU **0.948** |
| "swap the legs from this frame" | keeps the facing, **doesn't swap the legs** | legIoU **0.847** |
| absolute screen-space pose, identity-only reference | works | legIoU **0.50**, no mirror |

So `build.mjs` describes every pose in **positions in the picture** ("planted
foot on the RIGHT SIDE OF THE PICTURE"), never body-relative ("his right leg",
ambiguous to the model) and never relative to another frame. The reference
image supplies identity only and is always a **neutral standing pose**, so
there is no pose available to copy.

Once that was in place a full 8-frame locomotion set (front + rear, 4 frames
each) generated with **zero retries** and passed every check.

## Rules that were each paid for once

- **Never write "FRAME 1 / FRAME 2" in a prompt.** That wording alone caused
  `LEFT CONTACT` / `RIGHT CONTACT` to be rendered into the image, over an
  explicit ban on text. Remove the frame numbering and the labels stop.
- **Name any held prop in the identity block, not the pose block.** A prop only
  mentioned in some poses silently disappears from the others.
- **Mirror-check every "opposite" pair.** A flipped frame scores as *distinct*
  on plain IoU (0.438) and is worthless. Only the mirror test catches it.
- **Rear is a separate generation, not a flipped front** (Sprite Bible §15).
  Verified: front vs rear scored 0.357, i.e. genuinely redrawn.
- **Fix scale and origin in post, not in the prompt.** Asking the model to hold
  a stable origin does not work; a deterministic pass does. Origin 26px → 0px,
  head width 7.7% → 0.0%.
- **Reference resolution matters more than prompt wording at the margin.**
  The same recipe that left pass frames failing (legIoU 0.717) off a ~153px
  reference passed cleanly (0.439) off a ~256px one.

## Scoring

`phase.cjs` reports IoU over the silhouette after anchoring both frames on the
ground-contact point, with the leg region scored separately (that is where a
stride actually differs) and a mirrored comparison alongside.

```
mirrorIoU >= 0.80   MIRROR of the other frame   worthless
legIoU    >= 0.80   near-duplicate legs         worthless
legIoU    >= 0.65   suspicious                  look at it
otherwise           distinct
```

Reference points from real frames: genuinely different poses land 0.30–0.53;
a pair that merely *looks* different lands 0.69–0.85.

`drift.cjs` deliberately does **not** anchor scale on the bounding box. A run
cycle is supposed to change height between frames — Sprite Bible §7.4 requires
that rhythm and §9.4 rejects animation without it — so normalising bbox height
would fix the metric by deleting the animation. Scale is measured on head
width, which does not compress through a cycle; height variation is reported
as a feature that must be **present**.

## Honest limits

- These metrics catch duplicates, mirrors, drift and flat cycles. They cannot
  tell you a pose is *good*. Acceptance still needs an eye, which is what
  `anim.cjs` is for — watch the loop before approving it.
- Loop closure is the softest check in practice; the wrap-around pair scored
  worst of the six on the front cycle (0.705) and fine on the rear (0.517).
- `gen.mjs` needs `GEMINI_API_KEY`. Everything else runs offline.
- `anim.cjs` needs `gifenc`, deliberately not vendored — install it in scratch
  and expose it with `NODE_PATH`, the same rule `CLAUDE.md` sets for
  `scripts/enemy-loop.mjs`.

## A worked cycle

```sh
# identity: one paragraph naming the costume AND any held prop
for p in contact-left pass-right contact-right pass-left; do
  node build.mjs id_blonde.txt $p > /tmp/p_$p.txt
  ASPECT=2:3 node gen.mjs /tmp/p_$p.txt /tmp/raw_$p.png ref/blonde.png
  node ../../../kindling/tools/cut.mjs key /tmp/raw_$p.png /tmp/k_$p.png
  node ../../../kindling/tools/cut.mjs fit /tmp/k_$p.png /tmp/cut/$p.png 192x288 --no-quantise
done
node normalise.cjs /tmp/cut /tmp/norm contact-left.png pass-right.png contact-right.png pass-left.png
node drift.cjs /tmp/norm contact-left.png pass-right.png contact-right.png pass-left.png
node phase.cjs /tmp/norm pairs.json
NODE_PATH=/tmp/spritekit/node_modules node anim.cjs /tmp/cycle.gif /tmp/norm 2 110 \
  contact-left.png pass-right.png contact-right.png pass-left.png
```

Prefer `rear-` prefixed poses for the rear diagonal; `build.mjs` switches the
view block automatically.
