# Kindling — the Nano Banana pipeline

How to generate art for this game and get it into the repo in a state that can
actually be cut. Written to be run from inside Claude Code, where the PR is a
`git push` rather than a hand-off.

`ART_REQUESTS.md` says **what** to make. This says **how**.

---

## 0. The one thing that has gone wrong four times

Every delivery so far has described art that did not travel with it:

| | what arrived | why it could not be used |
|---|---|---|
| PR #282 | base64 chunks + `rebuild_pack.py` | chunks truncated; the archive will not open |
| PR #281 | 19 WebP files | thumbnails — scenes at 160×90, bibles at 256×362 |
| batch1 branch | `MANIFEST.json` | the PNGs it names are in no branch |
| the sheets themselves | presentation boards | labels and dark card baked in, no alpha |

So the pipeline below ends with a **measurement**, not an opinion. Run
`cut.mjs check` on anything before committing it. Today, on everything in
`approved/`, it says:

```
0/10 usable
  ember.webp  256x362  9245 colours  92672px ink
      9245 colours (expected <= 64)
      8.3% lost on a half-scale round trip — NOT 1:1 pixel art
```

That is the honest state, and it is why nothing has been wired into the runtime.

---

## 1. What the model can and cannot do

From `../../ART_PIPELINE.md` and `eeri/VERSIONS.md`, where this was learned the
expensive way on another project in this repo:

- **`gemini-2.5-flash-image` (base Nano Banana) is the workhorse.** On Eeri it
  produced 23 of 26 approved concepts; Pro was needed for three. Start on base.
- **It cannot output transparency.** Ask for it and you get a white or checkered
  background painted into the image. See §2.
- **It cannot count.** "A 4×6 grid of 40px cells" comes back as a picture of a
  grid with roughly the right number of roughly-sized things in it. Generate
  **one pose per image** and assemble the sheet yourself.
- **ASK FOR 4×, NOT 1:1.** This is the one that cost a whole round trip. An
  image model puts roughly a constant NUMBER of features into a picture whatever
  size you ask for, so a request for 320×180 comes back as a 320×180-sized
  *idea* — few, large shapes. batch1-v2 was technically perfect and artistically
  a regression on the code-drawn placeholder for exactly this reason: an arch
  that was a thin grey hoop, lollipop trees, a flat brown ground band.

  So say the size twice, and say it like this:

  > Draw this at a native resolution of 320×180, but output the image at
  > 1280×720, where every art pixel is exactly a 4×4 block of identical image
  > pixels. Do not anti-alias anything. No in-between colours at any edge.

  Then `fit … 320x180` divides by exactly four and recovers a true 1:1 grid.
  The reference sheets are authored this way — their blocks are four to six
  screen pixels across in a 1700px image — which is why they carry detail the
  first delivery did not.

- **The colour count is an AUTHORING problem, not an export problem.** A
  re-delivery at the right size, in PNG, with alpha, still fails if it was
  anti-aliased: size and format are transfer faults and a thousand in-between
  edge colours is not. Ask in these words: *quantise to a limited palette, no
  anti-aliasing, nearest-neighbour only.* (Measured independently in PR #287:
  the current sheets run 3,110–20,073 distinct colours, while 74–100% of their
  pixels sit within 24 of a colour already in `js/palette.js` — so the hues are
  right and only the edges are wrong.)

- **It cannot hold a pixel grid.** Everything it makes is an illustration in a
  pixel-art *style*. That is fine — `fit` is what turns it into pixel art — but
  it means you must never accept its output directly as an asset.
- **`--ref` is how a character survives a re-pose.** A pose change described in
  words alone comes back a different character. Attach the approved concept.
- **The reference dominates the pose**, so when you re-pose, say what to copy
  and what to disown: *"copy only the body plan and proportions; do not copy the
  pose, the background or the framing."*

---

## 2. THE MAGENTA RULE

Ask for a **flat #FF00FF magenta background**, every time, on everything.

Magenta appears nowhere in this game's palette, so keying it out cannot eat any
of the art. A model that refuses to give you transparency will happily give you
a flat colour, and a flat colour is one command away from alpha.

Say it in the prompt like this, verbatim:

> The background is a completely flat, solid, uniform magenta (#FF00FF) with
> nothing on it — no gradient, no vignette, no shadow, no texture, no border and
> no frame. The subject does not touch the edges of the image.

Then `cut.mjs key` handles the rest: a hue-ratio key (so a dark magenta edge
keys as surely as a bright one), a **despill** pass that pulls the pink halo out
of antialiased edges, and an outward **bleed** so the downscale in the next step
cannot sample magenta out of pixels that are supposed to be invisible.

---

## 3. What to say in every prompt

Paste this block at the end of every request in `ART_REQUESTS.md`:

> Style: 16-bit pixel art, dark fantasy, crafted 2D. Chunky readable shapes,
> hard edges, no antialiasing, no gradients, no blur, no glow bloom, no
> outlines drawn in a colour other than the art's own. Limited palette. Flat
> lighting except where stated.
>
> The background is a completely flat, solid, uniform magenta (#FF00FF) with
> nothing on it — no gradient, no vignette, no shadow, no texture, no border and
> no frame. The subject does not touch the edges of the image.
>
> No text, no letters, no numbers, no labels, no captions, no watermark, no
> logo, no UI chrome, no panel, no card, no drop shadow. Do not present this as
> a sheet, a poster or a reference board. Just the subject on magenta.

Those three paragraphs kill, in order: the illustration look, the missing alpha,
and the presentation board. The third one matters most — **every sheet delivered
so far has been a board**, and a board cannot be cut because the background is
not separable from the art.

---

## 4. The run

Four steps, and the tool is `kindling/tools/cut.mjs`.

```bash
# 0. generate — one subject per image, magenta background, square where possible
#    (whatever generator wrapper you use; base flash model first)

# 1. magenta -> real alpha, with despill and edge bleed
node kindling/tools/cut.mjs key raw/ember_idle_01.png work/ember_idle_01.png

# 2. down to the native grid and snapped to the game's own palette.
#    The size is the CELL for a sprite, or 320x180 for a scene layer.
node kindling/tools/cut.mjs fit work/ember_idle_01.png cut/ember_idle_01.png 40x40

# 3. only if the generator gave you a real grid sheet (it usually will not)
node kindling/tools/cut.mjs slice cut/sheet.png cut/cells 40

# 4. the gate — run it before committing anything
node kindling/tools/cut.mjs check cut/ --cell 40
```

`fit` reads the palette straight out of `kindling/art-src/palette.js`, so a generated
sheet and a code-drawn element cannot end up disagreeing about what colour the
stone is. It also forces alpha **binary**: a half-transparent pixel in a 40px
sprite is a smudge, not an edge.

### Sizes to fit to

| asset | fit to |
|---|---|
| scene layers A1–A4 | `320x180` |
| daytime travel layers C1–C4 | `960x180` |
| Ember / Mossling frame | `40x40` |
| Ashling frame | `32x32` |
| Moss Knight frame | `56x56` |
| object atlas cell | `16x16` (bonfire states `48x48`) |

---

## 5. The gate

`cut.mjs check` fails a file for any of:

- **any semi-transparent pixel** — alpha must be 0 or 255
- **more than 64 colours** — anything more is an illustration, not pixel art
- **more than 2% lost on a half-scale round trip** — the real test. True pixel
  art halved and doubled back with nearest-neighbour is unchanged; a faux-pixel
  illustration falls apart, because its "pixels" are not on a grid.
- **a sheet that is not a whole number of cells**

A file that passes all four is cuttable. A file that fails the round-trip test
cannot be rescued by editing — it has to be regenerated or re-`fit`.

---

## 6. Where it goes, and the PR

```
kindling/art-src/
  raw/          what the model returned          — not committed
  work/         keyed, pre-fit                   — not committed
  production/   the finished PNGs                — COMMITTED, this is the art
```

Only `production/` is committed. Add a line per file to
`kindling/art-src/production/MANIFEST.json` naming its grid, cell size and what
each cell holds, so `js/assets.js` can read it without anybody guessing.

Then, from inside Claude Code:

```bash
git checkout -b art/kindling-<what>
git add kindling/art-src/production
git commit -m "Kindling art: <what>, cut and fitted to 320x180"
git push -u origin art/kindling-<what>
```

**Commit the PNGs as binaries.** Three deliveries in a row have shipped a
document describing files that were not in the branch — a manifest, a zip
rebuild script, and a README. If `git show <branch>:<path>` does not print
bytes, the art did not arrive.

---

## 7. Two things to check by eye that no gate can

- **Is it the right character?** The gate measures pixels, not identity. The
  most recent Ember attempt came back as a white-haired figure in a blue robe —
  a different creature entirely from the sheet's dark stone monster with horns,
  fangs and a maroon scarf. Compare against `approved/art-bible/ember.webp`
  before you commit.
- **Does it read at 1:1?** Open it at actual size, not zoomed. Ember is 26
  pixels tall. If you cannot tell it from a Mossling at that size, the crown is
  not doing its job and no amount of colour will fix it.
