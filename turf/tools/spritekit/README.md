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

## Reactions: what the down poses needed, and what the metrics cannot do

`build-react.mjs` covers hit (impact / recoil / catch) and KO (stagger /
buckle / fall / ko_impact / settled). It is the same screen-space rule, but
these are whole-body reactions, so the anchor is where the **body mass** sits
in the picture rather than a foot or a weapon.

**A character with no floor under her cannot be told to lie on the ground.**
The OUTPUT block bans a drawn floor and a cast shadow, so the model had nothing
to lie *along* and drew a standing pose **rotated onto its head** — legs
vertical, boots at the top of the frame — for `fall`, `ko_impact` and
`settled` alike. Escalating the wording did not move it. What did:

- **Name the bottom edge of the picture as the ground line**, then place the
  ends of the body against it — *head near the bottom-left corner, boots near
  the bottom-right, everything strung out low between them*. The pose becomes
  a layout instruction, which is the same trick that made locomotion work.
- **Give it a measurable self-check**: *the picture of her must be clearly
  wider than it is tall*. That is checkable by eye and by bbox aspect.
- **Say the ground is implied and not drawn**, or the two clauses contradict
  each other and the model resolves the contradiction by ignoring one.
- **Drop the standing facing lock on the down phases.** "Angled toward the
  lower-right" describes a figure on its feet; asserted over a body lying
  down, it reads as a contradiction and pulls the pose back upright.
- **Generate the down frames on a square canvas.** A 2:3 portrait frame fights
  a horizontal pose; `fall` came back vertical three times at 2:3.

`fall` took three attempts. The one that worked was not stronger wording — it
was the `ko_impact` vocabulary reused verbatim with the landing removed. When
a phase resists, **change the words, do not raise your voice**; that is the
same lever the melee facing bug turned out to need.

### Head width is not a valid scale anchor for a reaction

`drift.cjs` gained `--no-scale` and `--no-rhythm`, and `normalise.cjs` gained
`--origin-only`, because two of the three checks are **locomotion-only rules**:

- Body-height rhythm comes from Bible §7.4, which is about a stride. A
  knockdown has no stride to bob through.
- Head width is pose-invariant *through a run cycle*. A reaction breaks that
  assumption on purpose: a head snapped back or lolling is genuinely **wider
  in projection** than a level one. Measured across five slice widths (0.08 /
  0.10 / 0.12 / 0.16 / 0.22) the best spread on the hit/KO set was 47.6% — the
  ruler is not the problem, the premise is.

`measure.cjs` is now the single in-page measurement both tools inject, so the
checker and the fixer cannot disagree about what head width means. It scores a
connected blob rather than the longest ink run in a row, which stops a hand and
a head on the same row reading as one 160px head — but **an arm still merges at
the shoulder**, and a ponytail, hat or hood is part of the head blob either
way. A scale anchor that survives moving hair is still open.

So a reaction clip is normalised `--origin-only` and gated on its ground line
alone, which does hold (0px spread over the five standing frames). Its *phase
separation* is still fully checked, and all seven pairs scored distinct — the
best-separated set built so far, none above 0.53.

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

For a reaction clip, swap in `build-react.mjs`, use `ASPECT=1:1` for the down
phases, and relax the two locomotion-only gates:

```sh
node normalise.cjs /tmp/cut /tmp/norm impact.png recoil.png catch.png --origin-only
node drift.cjs /tmp/norm impact.png recoil.png catch.png --no-scale --no-rhythm
node phase.cjs /tmp/norm pairs.json full     # whole-body, so `full`, not `lower`
```
