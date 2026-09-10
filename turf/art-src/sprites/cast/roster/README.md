# The owner's own roster — 26 characters, cut out at last

These are **the casting sheets, cut**. Not generated, not re-drawn, not
"inspired by": every file here is a crop of `turf/references/`'s own pixels,
keyed and fitted to 192×288 with no model in the loop.

    node turf/tools/sheet-cut.mjs turf/references/casting-sheet-full.png <out>
    node turf/tools/sheet-cut.mjs turf/references/casting-sheet-3.png    <out>

## Why this was worth doing

Asked on 2026-09-10 whether Slay Kallio had all of TURF's characters, the
honest answer needed an enumeration rather than a memory, and the enumeration
found the gap: the thirty `*-plate.png` files are **new characters generated in
the sheets' technique** — `turfGrim` says in as many words to copy the
technique and never the reference's specific character — so the owner's *own*
twenty-six existed in this repo only as two magenta PNGs. Two of them
(`gunner`, `leopard`) had been cropped by hand in 2026-08 and carried through a
whole pose table. The other twenty-four had never been cut out at all.

**The sheet is the design.** A generation off it is a copy with drift already
in it, which is why `cast/README.md` takes its references by cropping rather
than re-generating — and why Idle is the one pose that never needs a model:
*"that same reference crop run straight through `key → fit 192x288
--no-quantise`, with no generation step at all — the highest-fidelity Idle this
pipeline can produce, and a free one."* This is that, for all twenty-six.

## The two things the tool gets right that a nominal grid does not

**Cells are found by PROJECTION.** `cast/README.md` records that the sheet's
rows and columns "bleed slightly past their nominal boundary", and that a
nominal crop put a sliver of a neighbouring character into `gunner-idle` twice.
Asking where the ink actually stops cannot make that mistake. It also tightens
each figure's own top: a row band is as tall as its tallest member, so a short
character cut to the band stands in the air.

**A prop can BRIDGE two cells.** `sledge` holds his hammer across his body and
the handle reaches into his own back view, merging two figures into one 300px
run — which silently shifted every name after it in that row on the first pass.
Any run much wider than the row's median is split at its thinnest interior
column, which is where the two bodies very nearly stop touching.

## The fringe, and why it is a two-stage key

The sheets are antialiased **against magenta**, so the pixel ring where a
figure meets the background is the figure's colour *blended with the key* —
nowhere near the key, so a distance threshold keeps it, and every character
comes out wearing a magenta rim. It is this repo's white-sticker-outline note
in reverse.

Stage two recognises contamination rather than proximity: magenta has no green
in it, so a blended pixel reads as R and B both well above G. **Only pixels on
the edge are tested**, or `mohawk-green`'s purple trousers would be eaten out
of the middle of him. Two passes, ~2px of erosion.

Residual: a few isolated specks survive on thin shapes fully enclosed by
antialiasing — a knife blade held clear of the body, a bandaged hand. Two on
twenty-six figures, single pixels. Left rather than chased, because the fix is
a stronger colour test and a stronger colour test starts eating purple.

## Naming

Descriptive and short, because the sheet has no names and inventing lore for a
reference file is how a reference stops being one. Seven were already cut and
keep the names they were given:

| already had one | as |
|---|---|
| `gunner` `leopard` | full pose sets in `cast/` |
| `sledge` `hoodie` `longcoat` `blonde` | walk cycles in `cast/` |
| `cook-mask` | the same person as `slomo` |

Do not re-cut those seven from here — the existing crops are hand-tightened and
their pose sets are registered against them.

## Front only

The sheets draw every character front and back. `sheet-cut.mjs` writes the
front of each pair by default and `--all` writes both, suffixed `f`/`b`.
Slay Kallio mirrors its row in code and never draws a back; TURF's isometric
board does need both, and should pass `--all`.

## What this unlocks

A pose set for any of these is now **12 generations against a local reference
crop**, which is the budget `cast/README.md` measured — not a re-derivation of
the recipe. Nothing here needs an API key; the next step does.
