# What already exists, and what it is worth here

Searched rather than assumed, and the top find was **benchmarked against this
repo's own frames** rather than recommended on its README.

## 1. Chromium is not needed at all — `@napi-rs/canvas`

[`Brooooooklyn/canvas`](https://github.com/Brooooooklyn/canvas) — Skia behind
the Canvas 2D API, as a native Node addon, no system dependencies.

Every measurement in spritekit runs inside `pg.evaluate` in a headless
Chromium, and `COST.md` measured that as the roster run's real constraint: ~27
minutes of API against **~4 hours of local processing**, nearly all of it
browser start-up. The fix proposed there was pooling one browser. This is
better — it removes the browser.

Measured on the 105 committed frames, same edge-contact check, same answer:

```
@napi-rs/canvas     105 frames    710 ms
playwright/chromium 105 frames  11002 ms      15.5x
```

Extrapolated to a full roster run that is **~4 hours down to ~15 minutes**.

Two things checked before believing it, because a silent quality regression
here would be worse than the slowness:

- **`imageSmoothingEnabled = false` is honoured.** A 3x upscale reproduces the
  source's 16117 colours with **0 partial-alpha pixels**; with smoothing on the
  same operation gives 70023 colours and 10052 soft pixels. (And `verify.cjs`'s
  `softFrac` gate would catch it if that ever changed.)
- **Downscale is bit-identical to Chromium.** Running `fitclip.cjs`'s actual
  transform — translate, scale 0.2217, drawImage — through both engines and
  comparing pixel by pixel: **0 of 55296 pixels differ in silhouette, 0 colour
  channels differ, largest delta 0.**

### Done — and the browser was not the whole story

Ported. `img.cjs` is the one image backend and **nothing in spritekit imports
playwright any more**. Measured over the full post-generation chain on one clip
(fitclip, register, fitclip, drift, verify, edge, anim): **30909ms -> 2277ms,
13.5x**. Rebuilding all 17 committed sets end to end takes **98 seconds**.

Parity, checked per tool rather than assumed:

```
edge / verify / drift / reach / phase   output text IDENTICAL
fitclip / breathe                       0 pixels differ (PNGs 15% smaller)
anim                                    GIF byte-identical
register                                factors differ slightly — see below
```

**Two findings the port itself produced, both worth more than the speed.**

**The browser was not the bottleneck in `register.cjs`.** The first port ran it
at 24.8s against the browser's 8.8s — nearly 3x *slower*. One cause was mine: I
recomputed the source's ink bbox inside `mask()`, which the coarse-to-fine
search calls ~1800 times a frame. Hoisting it got to 15.4s — still slower. The
real cost is **rasterising a candidate at all**: allocate a canvas, drawImage,
getImageData, 1800 times. A candidate mask is only an affine transform of a
binary bitmap, so it is now inverse-sampled into a `Uint8Array` over just the
rows the score reads, and the clamp loop uses the transformed *bbox*, which is
the transform of the bbox and therefore free. **1200ms — 7.4x faster than the
browser it replaced.**

**That one is not bit-identical, and the number is small but real.** Nearest
sampling by flooring rounds differently from canvas `drawImage`, so the search
settles on slightly different factors (s 0.97 -> 0.98, 1.09 -> 1.095), and two
of four output frames differ. Judged on the objective rather than waved away —
mean pairwise torso IoU across the finished clip, one rasteriser for both:

```
unregistered          0.7037
browser factors       0.7606
fast-sampler factors  0.7595
```

It captures **98% of the registration benefit** and the optimum is genuinely
flat around there. Recorded rather than claimed identical, because "close
enough" is a thing to measure, not to assert.

## 2. The strategic one — pose-conditioned generation

[`lllyasviel/ControlNet`](https://github.com/lllyasviel/ControlNet) (34k) and
[`comfyui_controlnet_aux`](https://github.com/Fannovel16/comfyui_controlnet_aux).

**Nearly everything in this repo's prompt work exists because poses can only be
described in words.** The screen-space vocabulary, the phase-opposition gates,
the mirror check, the "read the pose from behind" clause, the three levers —
all of it is compensation for having no direct control over the skeleton.
ControlNet takes a pose skeleton as an *image* and conditions on it, which
deletes that entire problem class: a 12-phase run cycle becomes twelve
skeletons, and phase opposition is guaranteed by construction rather than
measured after the fact.

The honest trade, and it is a real one: **Gemini gives identity almost for free
and poses badly; ControlNet poses exactly and identity becomes the hard part**
(IP-Adapter or a per-character LoRA). It is also a different stack — self-hosted
diffusion or a hosted runner — against the current single API call. Worth a
spike on one character before anyone commits, not a migration.

## 3. Atlas packing, for when the roster is real

[`odrick/free-tex-packer`](https://github.com/odrick/free-tex-packer) (1.3k),
with `free-tex-packer-core` usable as a library. 26 characters x 6 clips x 2
facings is a lot of loose PNGs and the game will want atlases plus frame
metadata. Not needed yet; needed before shipping.

## 4. What does NOT exist

A search for sprite-animation consistency or generated-character validation
tooling returns nothing. `phase.cjs`, `reach.cjs`, `drift.cjs` and `verify.cjs`
appear to have no prior art to borrow from, which is worth knowing — it means
the gates have to be earned by measurement here, and it explains why the
thresholds keep having to come from this repo's own distributions.
