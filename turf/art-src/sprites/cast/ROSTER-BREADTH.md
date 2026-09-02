# Roster breadth: does the recipe hold on a silhouette it was not tuned for?

The prompt recipe in `turf/tools/spritekit/` was built and proven on **one**
character, and everything learned came from her specifics — her knife decided
the melee facing, her ponytail broke the scale anchor. So four more were run
through it with **no per-character tuning**: same `build.mjs`, same 4-phase
cycle, same reference-is-identity-only rule, front diagonal, one shot each.

Each was chosen to break a *different* assumption, not to add volume.

| | breaks | reference |
|---|---|---|
| **sledge** | a **two-handed** weapon held across the body | casting sheet 2, row 2 |
| **hoodie** | the head **enclosed in a hood** | casting sheet 2, row 3 |
| **longcoat** | **legs hidden** under a coat past the knee | casting sheet 2, row 3 |
| **leopard** | **loose long hair** + bulky fur | casting sheet 2, row 4 |

References are **cropped straight from the casting sheet** (`crop.cjs`) rather
than re-generated. The sheet is the design; a re-generation is a copy of it
with drift already in it.

## What held

**The core claim generalises.** Contact opposition — the thing the whole
screen-space recipe exists to produce — passed on all four, unprompted and
first try:

```
sledge .548   hoodie .484   longcoat .538   leopard .431      (legIoU, lower region)
```

**No mirror failures anywhere.** Every mirrored score sat between 0.51 and
0.68, nowhere near the 0.80 gate. Notably that includes **sledge**: a
two-handed weapon does **not** drag the body round the way a one-handed one
does. The melee facing bug was caused by a weapon held *to one side*, and a
weapon held across the body with both hands is immune to it.

**Identity held on all four**, including the two hardest to keep: the hood
stayed up in every frame, and the leopard coat stayed bulky and open.

## What broke, and it is silhouette-specific

**Sledge is the weak one — 1 of 4 pairs distinct, and its loop closure is a
NEAR-DUPLICATE at 0.812.** The cause is legible in the frames: both hands are
locked to a bar across the chest, so **the arms cannot swing**. A run cycle
gets much of its frame-to-frame difference from arm swing, and a two-handed
carry deletes that source. The hammer also crosses the leg region and occludes
it. So a two-handed weapon is safe for *facing* and expensive for *phase
separation* — the opposite trade from a one-handed one.

Every other failure was on an **adjacent** or **loop-closure** pair, never on
an opposition pair. Those are the softer properties, and the ones that already
scored worst on the original character.

```
                contact-opp   pass-opp   adjacent   loop
sledge             .548        .678       .723      .812  NEAR-DUPLICATE
hoodie             .484        .567       .707      .610
longcoat           .538        .671       .545      .565
leopard            .431        .454       .452      .349
```

`longcoat`'s `pass` pair at .671 is the hidden-legs cost, as expected: less
visible leg means less to separate. It did **not** break the validator, which
was the risk — the coat still leaves enough boot and shin to score.

## The scale anchor, answered

This was the open question (task 4 on #419), and four characters settle it.
Head-width spread across the cycle, before any normalisation:

```
longcoat   6.0%   short messy hair              normalises to 0.0%
hoodie    11.6%   hood — rigid, encloses head   normalises to 0.0%
leopard    6.3%   long loose hair               normalises to 9.8% — WORSE
sledge    28.2%   bald, but arms in the band    normalises to 8.6%
```

**A hood is the best case, not the worst.** It is a rigid frame around the head
and it holds perfectly — the intuition that a hood would behave like hair is
backwards. Loose hair is the failure, confirming the ponytail result.
`sledge`'s 28.2% is a different fault entirely: he is bald, so nothing about
his *head* moves — his raised arms and the hammer reach into the top-of-ink
band and get measured as head.

**So: rescaling can make the spread worse, and on `leopard` it did.**
`normalise.cjs` now re-measures what it wrote and, when the spread did not
improve, **throws the rescale away and copies the originals through**, saying
which character it gave up on and why. A fixer that can quietly make things
worse is worse than no fixer.

## Reading

The recipe is not character-specific and does not need per-character prompt
work. What *is* character-specific is which gate will complain, and that is
predictable from the silhouette before a single frame is generated:

- **arms pinned** (two-handed carry, hands in pockets, arms folded) → phase
  separation is expensive; budget re-rolls or add frames.
- **legs hidden** (long coat, skirt, robe) → the `pass` pair will be the one
  that scores worst.
- **loose hair** → the scale anchor cannot be trusted; normalise
  `--origin-only` and gate with `drift.cjs --no-scale`.
- **hood, cap, bald with arms down** → nothing to worry about.


## Rear, added 2026-09-02 — and rear keeps beating front

All four now have rear cycles, generated against back-view references cropped
from the same casting sheet. 11 of 12 opposition/closure pairs distinct, no
mirrors anywhere.

```
                contact-opp   pass-opp   loop
sledge             .298        .564      .418
hoodie             .497        .638      .606
longcoat           .638        .651      .510   pass = suspicious
leopard            .625        .543      .513
```

**`sledge` rear is the best set of the four, and its front was the worst.**
Front scored .548 with a genuine near-duplicate loop closure at .812, because
both hands are locked to a bar across the chest and the hammer crosses the leg
region. From behind, the hammer is on the far side of the body and stops
occluding the legs, so the stride reads clearly. That is now the **third**
time rear has first-passed better than front (12-phase rear needed 0 re-rolls
against front's 3; melee and ranged rear both landed first try). Worth
planning around: if a character has to be re-rolled, expect it to be the front.

`longcoat`'s `pass` pair at .651 is the predicted hidden-legs cost, unchanged
from the front result.
