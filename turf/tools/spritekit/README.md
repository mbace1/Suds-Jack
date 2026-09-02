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

## Attack clips are gated on the WEAPON, not on the silhouette

`reach.cjs`, and it exists because `phase.cjs` gave a wrong answer twice.

A pistol or a knife is about **2% of a sprite's pixels**. The torso, head and
legs that did not move are most of the rest. So silhouette IoU on an attack
clip is dominated by the part that is supposed to stay still, and a weapon
travelling a quarter of a body height barely shifts the score. Ranged
`recover` vs `ready` scored **0.839 — NEAR-DUPLICATE** on two frames where the
gun is at the *hip* in one and the *chest* in the other.

That mis-reading had already been written into this repo as fact: melee
`recover` was documented as impossible to separate from `ready`, after three
rounds of stronger wording made the number worse (0.747 -> 0.790 -> 0.877). The
frames were fine the whole time. **Three prompt re-rolls were spent arguing
with a broken ruler, and then the broken reading was recorded as a property of
the model.** That is the expensive version of this mistake, and it is why the
correction is left in `build-melee.mjs` rather than quietly deleted.

`reach.cjs` measures the extreme ink in the direction the weapon travels — for
a character angled at the lower-right, the rightmost ink — and reports **how
high up that happens**, from 0 at the feet to 1 at the top of the head. That
single number orders an attack:

```
ranged   ready .27   raise .64   aim .72   fire .86   <- the recoil is visible
melee    ready .52   contact .62   recover .79   anticipation .92
```

Measured that way, melee ready vs recover sit **0.270 apart — distinct**.

Honest limit: the extreme-ink probe latches onto whatever reaches furthest,
which is not always the weapon. Ranged `recover` reads 0.076 because his braced
back leg reaches further right than the gun he has pulled in. It still
separates the phases, but read the number as *where the silhouette's extremity
is*, not as *where the weapon is*, and look at the frames.

## The scale anchor, solved by not having one

`register.cjs` replaces the measured anchor with a search, and it closes the
open question every other approach here failed on.

Head width was always a **proxy** for "the figure is the same size", and every
proxy broke in a character-specific way: loose hair joins the head blob
(leopard, blonde), a raised arm or a weapon crosses the head band (sledge,
ranged `fire`), and a bald man has no hair to measure at all. Worse, when the
proxy breaks, normalising on it makes things *worse* — leopard went 6.3% in and
9.8% out.

`register.cjs` measures nothing. For each frame it searches scale and
horizontal offset and keeps whichever **overlays best on an anchor frame**,
optimising the real objective instead of a stand-in for it. There is no feature
left to break.

Three choices make it work, and each was a bug first:

- **The ground line is pinned, not searched.** It is the one thing genuinely
  known, and searching it lets a frame float.
- **The score covers the TORSO BAND only** (15–65% of ink height). The head is
  out because that is where the hair moves; the legs are out because in a run
  cycle they are *supposed* to differ — scoring them shrinks a frame to make
  its stride match the anchor's.
- **The horizontal anchor is the ink's centroid, not the centre of the bottom
  row.** In a wide stride the bottom row is a single boot off to one side.
  Pinning to it threw leopard's `contact-left` sideways by more than the search
  could pull back, and it saturated the scale range at 1.45 while still scoring
  0.225. With the centroid it lands at 1.125 and 0.747. (`normalise.cjs` has the
  same fault; it matters less there because it is not also searching.)

Results on the two clips the old anchor could not do:

```
leopard      scales 0.995 - 1.125    worst torso overlay 0.747
blonde x12   scales 0.920 - 1.035    worst torso overlay 0.752
sledge       scales 0.860 - 1.200    worst torso overlay 0.887
hoodie       scales 1.000 - 1.175    worst torso overlay 0.717
longcoat     scales 1.000 - 1.470    worst torso overlay 0.716
```

All five register without saturating, including the three the measured anchor
could not do: leopard and blonde (hair in the head blob) and sledge (28.2%, a
weapon in the head band on a bald man).

The blonde set was **already head-width normalised** and still needed
corrections up to 8% — which is exactly the 10.1% residual the old anchor
reported and could not remove. And the body-height rhythm survives at 9.6%, so
this fixes the scale without deleting the animation, which was the original
reason bbox height was rejected as an anchor.

The overlay score is **information, not a gate**, and I got that wrong once
before checking: it was briefly written up with a 0.75 pass line, and across
five characters the worst overlay ran **0.716 to 0.887** — with the two lowest
being `hoodie` and `longcoat`, the two whose scale was already perfect. A
swinging coat moves inside the torso band and costs overlay without costing
accuracy, so there is no threshold to draw.

What *is* a failure is **saturation** — the search wanting to go past the end
of the range means it never found a fit at all, and `register.cjs` exits
non-zero on it.

Search cost is ~1.8 s for a 12-frame clip: coarse at 0.04 and 3px, then a
refinement pass around the winner.

**Why the range has to be so wide** — and the one structural thing still wrong.
`cut.mjs fit` scales every frame **independently** to fill the 192x288 cell, so
a frame whose silhouette is wide gets shrunk relative to a narrow one. On
`longcoat` that is a 32% difference between two frames of the same walk: its
`contact-left` (coat swept wide, long stride) needs **1.47** to match the
others, and at RANGE = 1.45 it saturated by a hair.

Registering after the fit therefore re-upscales a frame the fit had already
downscaled, which costs a little sharpness on exactly the frames that needed the
most correction. The right order is **register before fit**, but that needs a
fit that applies one COMMON scale across a clip, and `cut.mjs` is a shared tool
whose per-image behaviour is correct for its other callers. Worth doing; not
done here.

## A knockdown is about losing control, not about where the limbs are

The KO phases were first written the way every other clip is written — pure
geometry, where the limbs go and how low the hips sit. Every frame came back
with the character still **in control and still fighting**: `stagger` read as an
alert idle, `buckle` as an athletic crouch ready to pounce, `fall` as a jumping
attack with the knife raised and the teeth gritted. The limb positions were all
correct. It still did not read as a death.

Two things fixed it, and both are about intent rather than pose:

**1. Say how much control is left, and what the face is doing.** Each phase now
opens with a `CONTROL:` line (*mostly gone* / *gone* / *none* / *she is
unconscious*) and a `FACE:` line (*dazed and unfocused* / *slack, eyes closed*),
and the geometry comes after. A slack face and open hands read as a knockout;
the same skeleton with a gritted jaw reads as an attack.

**2. Invert the prop rule.** Every identity block ends with something like *"the
knife is part of her and must stay visible in every pose, never dropped"* — which
is correct for every clip except this one. Told that, the model draws an
unconscious character **still gripping her weapon**, and a fist closed around a
knife reads as intent no matter how limp the rest of the body is. The KO half now
overrides it: the hand opens, the weapon falls loose or lies on the ground beside
her. Nothing else in the identity changes.

`buckle` also needed a negative test aimed at the exact wrong answer, because
"knees give way" and "crouch" produce the same skeleton: *if this looks like a
crouch — feet flat, both knees bent the same, weight balanced, back straight,
head up — the pose is WRONG. A crouch is something you choose; this is something
that happened to her.* The fix is one knee **on the ground** and the two legs
doing different things, since a collapse is asymmetric and a crouch is not.

Continuity is its own check that no gate performs: the first pass had her land
**face-down** in `ko_impact` and **face-up** in `settled`, so she rolled over
while unconscious. Both are now face-up, stated explicitly as *she does not roll
over between frames*.

**A reaction clip is not registered.** `register.cjs` scores the overlap of the
torso band, which assumes the body keeps roughly one orientation. A knockdown
rotates the figure 90 degrees between standing and lying, so that band does not
correspond at all — worst overlay measured 0.46-0.51 against 0.72-0.89 on every
other clip. Searching for the scale that maximises a meaningless number is worse
than not searching, so `make.mjs` marks the clip `register: false` and goes
straight to `--origin-only`.

## Rear fails wherever the pose text names the face

Every builder takes `--rear`, and `make.mjs` passes it through. Locomotion and
melee rear both worked first try. The reaction set did not, and the reason is
worth knowing before writing any new pose text.

Three of eight rear frames came back **facing the viewer** — `impact`, `recoil`
and `catch`, the three whose pose text is written around *her chin lifting*,
*chin high* and *eyes*. A rear view and a named face are a contradiction, and
the model resolved it the way it always resolves a contradiction: by dropping
one clause. It turned her round so the face it had been told about could be
seen. The two down phases had the matching fault, landing her face **up**.

The fix is not to strip the face out of the pose text — a reaction genuinely is
described by what the head does. It is to **tell the rear view how to read
it**:

> READ THE POSE BELOW FROM BEHIND. It describes a reaction in terms of her
> chin, her eyes and her chest because that is how a reaction is described —
> but from this angle none of those are in the picture. Where it says her chin
> lifts, draw the back of her head tipping back and her hair swinging. Where it
> says her chest, draw her shoulder blades and her spine. Do NOT turn her round
> to face the viewer so that those things can be seen.

Plus, for a down pose, naming what IS uppermost: the back of the jacket, the
hair spread out, and **the soles of the boots**. All five re-rolled frames came
back correct first try.

The general rule: **a rear view needs a translation clause for any pose
vocabulary that only exists on the front.** Legs and weapons do not need one —
a knee and a blade look like themselves from any angle — which is why
locomotion and melee never hit this.

## Two gates, two questions, on every attack

`reach.cjs` reporting SAME weapon position is **not a verdict**. Rear melee
`anticipation` and `recover` both hold the blade high — 0.036 apart on the
weapon — and are plainly different poses: one is coiled and low, the other
upright. The silhouette scores them 0.706.

So the weapon probe and the body probe answer different questions and an attack
clip needs both. `reach.cjs` now says so when it finds a matched pair, and
`make.mjs` runs `drift.cjs` after it so scale and ground line are checked too.

## The gates were all relative, and that hid 63 broken frames

Every check written before this one compares frames to **each other**:
`phase.cjs` scores silhouette overlap between poses, `reach.cjs` compares
weapon positions, `drift.cjs` measures spread across a clip. That whole family
shares one blind spot — **two frames broken the same way agree perfectly** — and
it hid a defect across the entire tree: **63 of 133 committed frames were
cropped by the cell edge**, in sets nobody was editing, and every gate passed
them. It was found because the owner looked at the pictures.

`verify.cjs` asks only questions a single frame can answer wrongly by itself,
and its thresholds come from the measured distribution over 105 known-good
frames rather than from intuition:

```
edge      0 on every good frame        -> any ink on the border FAILS
magenta   0 on every good frame        -> any key survivor FAILS
softFrac  0.0000 on every good frame   -> partial alpha means something
                                          resampled smoothly; FAILS over 2%
coverage  0.125 - 0.565, median 0.327  -> FAILS outside 0.08-0.70, warns under 0.20
colours   1538 - 4046                  -> reported, never gated: it tracks how
                                          painterly the generator was, not
                                          whether the frame is correct
```

It runs in CI over the **whole committed tree**, not the frames a PR touched,
because that is exactly how the clipping survived.

## The fit was per-frame, and that was the cause

`cut.mjs fit` scales each image independently to fill its cell. That is correct
for a single illustration and wrong for an animation: a frame with a wide
silhouette comes out smaller than a narrow one — **32% between two frames of
longcoat's own walk**. It is also why `register.cjs` needed a scale range up to
1.47; it was undoing damage the fit had just done, by upscaling frames that had
already been downscaled. Two resamples, the second landing hardest on the frames
that could least afford it.

`fitclip.cjs` replaces it: the clip is measured as a whole, **one scale** is
chosen so the largest frame fits, and every frame is placed at that scale with
the ground line pinned. Relative size differences survive, which matters because
the body-height rhythm is a required feature. And nothing can be clipped —
the scale is derived from the widest and tallest frame, so no frame can overhang.

The pipeline is now **one resample**: `fitclip` lays the clip out, `register`
measures the residual per-frame drift on that layout and `--report`s it as
factors, and `fitclip` re-renders from the keyed originals with those factors
folded into its own transform.

### Three bugs found while building it, all mine

- **`normalise.cjs` centred on the middle of the bottom row.** In a wide stride
  that row is a single boot, so it parked the boot mid-cell and threw the body
  off the canvas. I had already found and fixed this exact fault in
  `register.cjs`, written a comment saying it "matters less" in `normalise.cjs`
  because that file was not also searching, and shipped it. It did not matter
  less: it was the primary cause of all 63.
- **Centroid placement made the shrink guard fire.** With an asymmetric
  silhouette — a coat swept to one side — centring the ink's *mass* leaves the
  far edge overhanging, so the guard shrank 3% at a time and 25 iterations later
  the clip was 0.47x too small: longcoat came out filling **4.7%** of the cell
  against a normal 30%. The **bbox centre** makes the fit correct by
  construction and the guard never fires.
- **The despeckle threshold was in the wrong units.** 40px measured at the
  source's 832x1248 is a *quarter* of a pixel in a 192x288 cell, so it removed
  nothing; the check that measured specks at output scale kept reporting them.
  It is a fraction of the largest component now, which is scale-free — and a
  dropped weapon runs several percent of the body, so it survives.

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

For an attack clip — melee or ranged — **mirror the reference first**
(`flip.cjs`), normalise `--origin-only`, and gate with `reach.cjs`:

```sh
node flip.cjs ref/gunner.png ref/gunner-mirrored.png
node normalise.cjs /tmp/cut /tmp/norm ready.png raise.png aim.png fire.png recover.png --origin-only
node reach.cjs /tmp/norm ready.png raise.png aim.png fire.png recover.png
```

`--origin-only` is not optional there: a weapon swinging up crosses the
top-of-ink band and gets measured as head (ranged `fire` read a 138px "head"
against a real ~74px one), so rescaling on it mis-sizes every frame.
`normalise.cjs` now says so when it sees it.

For a reaction clip, swap in `build-react.mjs`, use `ASPECT=1:1` for the down
phases, and relax the two locomotion-only gates:

```sh
node normalise.cjs /tmp/cut /tmp/norm impact.png recoil.png catch.png --origin-only
node drift.cjs /tmp/norm impact.png recoil.png catch.png --no-scale --no-rhythm
node phase.cjs /tmp/norm pairs.json full     # whole-body, so `full`, not `lower`
```

## Is it an app? — `make.mjs`

`node make.mjs <move|move12|melee|ranged|react|idle> <identity.txt> <ref.png> <outDir>`

One command runs the whole chain: build the prompts, generate, key the magenta,
fit to 192×288, normalise, gate, and export a GIF. It was written to answer
whether the recipe is stable enough to wrap, and the answer is **yes for the
pipeline, not yet for the judgement**.

What it proves: every clip-specific decision this toolchain has learned is now
**four fields in one table** — the phase list, the canvas each phase wants, how
it is normalised, and which gate reads it. That is the entire body of knowledge,
and it is small:

```
move    2:3   scale+origin   phase (lower)
melee   2:3   origin only    reach          + mirrored reference
ranged  2:3   origin only    reach          + mirrored reference
react   2:3, and 1:1 for the down phases    origin only   phase (full, --no-scale --no-rhythm)
idle    2:3   one frame, then breathe.cjs   no gate — the breath is computed
```

Everything else in `make.mjs` is plumbing. An app would be a form over that
table plus a queue, and the generation cost is the only thing that scales.

What it does **not** solve, and what stops this being a product rather than a
tool: **no gate here can tell you a pose is good.** They tell you a pose is
distinct, in scale, and on the ground. So the run ends by printing the path to
a GIF and saying so, and a person still has to watch it.

The first end-to-end run on a character the recipe had never seen made the case
both ways. It completed unattended — and its gate immediately caught a real
fault: `anticipation` and `followthrough` came back with the knife at the same
height (0.983 and 0.956, a separation of 0.036, flagged SAME weapon position),
when followthrough is supposed to end low. A human never had to notice that.
A human does still have to decide whether the re-roll is better.
