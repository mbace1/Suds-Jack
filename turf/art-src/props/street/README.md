# Street furniture — cover and dressing for the board

Sixteen props matched to the owner's own sheet
(`turf/art-src/reference/props-street.png`). One `.spec.txt` each — the object
description — plus the shared style block in `tools/spritekit/build-prop.mjs`.

```
street dressing   hydrant · dumpster · tyres · lamp · brazier · cabinet
                  trolley · fence
hard cover        sandbags · skip · blocks · cylinders · generator · pipes
                  tank · carwreck
```

The second batch is deliberately all **solid cover** at the owner's direction —
fewer poles and thin verticals, more things a unit can get behind.

## Magenta is the working format, transparency is the asset

The shipped PNGs are keyed to transparency, because that is what the game
needs. `_sheet.png` and `_sheet-hard.png` are on **magenta**, because that is
the format this project hands art around in — every reference the owner sends
is a magenta sheet, and a set shown on any other background cannot be laid
beside them. `contact.cjs` makes them.

## Every prop is 192x288 and that is a trap

`fitclip` normalises each asset to its own cell for fidelity, so **a fire
hydrant and a burnt-out car are identical pixel sizes on disk**. Nothing in the
file says how big the thing is. `props.json` is the seam: `heightM` per object,
plus footprint in tiles and a cover class. A person is 1.8m and draws at
`UNIT_H = 18px` on a 32x16 tile (`js/render.js`), so `px = 18 * heightM / 1.8`.

`_sheet-true-scale.png` is the same sixteen drawn from those numbers —
`contact.cjs --scale props.json` — and it is the sheet to look at when judging
whether the set hangs together as objects rather than as pictures.

**These are not the character pipeline and the rendering block says so.** The
cast plates are pixel-art-shaped; this sheet is INKED ILLUSTRATION, measured at
46.8% pure black over a dark palette. Asking for "pixel art" here would flatten
exactly the quality it has. `ART_REQUEST.md` reserves `palette.json`'s
thirty-two colours for tiles, UI and drops — props are neither, and they are
generated at illustration fidelity like the cast.

## The style word that was wrong

The first eight came out **half as inked and much paler** than the reference,
and passed every existing gate while doing it:

```
             ink    luminance   saturation
reference   46.8%      52          43%
first pass  23.7%      71          27%
```

The cause was one clause in my own prompt: *"muted, desaturated, dirty colours
— nothing bright, nothing saturated."* **The reference is not desaturated.** It
is DARK and fairly saturated — the muted impression comes from the low
luminance, not from the colour, and I had read it backwards and written the
mistake into the prompt. Replacing that with *"roughly half the object's area is
deep shadow or solid black; the object is dark overall; its colours are rich,
not washed"* moved the set to ~47% ink and luminance in the forties, first try.

`styleref.cjs` measures those three numbers against a reference so the next
person does not have to notice it by eye.

## A proxy chased for five generations

Worth recording because it cost more than the style bug. The first batch came
back with dusty-pink backgrounds instead of magenta, and I spent five
generations trying to force `#FF00FF` — dropping the reference image, then
escalating the wording (which made it *worse*, the lever that never works), then
bisecting down to a minimal prompt.

**The question was never the corner pixel; it was whether `cut.mjs key` could
key it.** It could, first time, on all eight. The character raws have off-magenta
corners too — `[171,102,128]` on a shipped one — and that pipeline has always
worked, because the key matches a range rather than a value. One command would
have answered it.

## Known confound in styleref.cjs

An asset that is intrinsically dark or made mostly of thin lines reads as
"over-inked" however well it is drawn: tyres 66.9%, trolley 62.4%, fence 59.0%,
against a 46.8% reference — all three correct pictures. The number is only
meaningful on an asset with real solid surfaces. And it measures the LOOK, never
whether the object is any good: a well-lit bin with the right numbers can still
be the wrong bin.
