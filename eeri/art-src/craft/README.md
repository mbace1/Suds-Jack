# Groundworks — the CRAFTED layer concepts (2026-08)

The 80% (see `/ART_TARGET.md` §0.1). These replace the v3 layer art, which was
competent vector cartoon — gradients, gloss, outline strokes — and failed the
Crafted World test: no cut edges, no tabs, no visible construction. It read as
"brown shape".

These pass it. Every piece is nameable as a material and every join is
pointable at: corrugated fluting on every cut edge, balsa strips lashed with
paper bands and split pins, panels overlapping with real laps and cast paper
shadows, masking tape at the joins, frayed cuts, off-square.

**The style block is the asset.** Reuse it verbatim on every environment
concept for this game, and keep it in sync with `/ART_TARGET.md` rung 1b:

> STYLE — a hand-built cardboard-and-paper DIORAMA photographed flat-on, in
> the manner of a craft-model stage set. EVERY object is visibly made from cut
> craft materials: corrugated cardboard, coloured construction paper, painted
> balsa strips, felt, masking tape, split pins. THE CONSTRUCTION IS THE POINT
> and must be unmistakable: exposed CUT EDGES showing the corrugated fluting
> and the real thickness of every piece; panels OVERLAPPING each other with
> visible laps and cast paper shadows; folded tabs and creased flaps where
> pieces join; split-pin and bolt fixings at the joints; a little frayed at
> the cut lines. Slightly off-square and imperfect, hand-cut, never
> machine-perfect. Flat matte paper colour only — NO gloss, NO gradients, NO
> shiny highlights, NO black outline strokes. Soft even shadowless light.
> Muted natural card tones: kraft brown, warm ochre, dull safety orange, grey
> board, pale blue-grey steel.

Plus, on every layer segment:

> The entire background above and behind everything is FLAT PURE MAGENTA
> #FF00FF with nothing in it, to be cut out later. Do not put sky, clouds or
> scenery in the background. Seen straight from the side, no perspective, no
> vanishing point.

**Ask for SPARSE explicitly, per layer.** The v3 build butted every tile
against the last and the near lane became a solid wall that fought the
playfield. Say "only three or four separate objects in the whole strip with
big empty gaps between them" — `C-near` did exactly that and it is the best of
the set.

| file | layer | notes |
|---|---|---|
| `C-skyline.jpg` | skyline | flat card blocks + two balsa tower cranes; nearly a silhouette, correct for the furthest lane |
| `C-far.jpg` | far | grey-board tower frames, magenta showing through the bays, one taped ochre hoarding |
| `C-mid.jpg` (`C-mid-a`) | mid | balsa scaffold towers lashed with paper bands, overlapping card hoarding |
| `C-near.jpg` | near | torn corrugated dirt bank, paper-tube pipes, folded card cones. **The density model for the rest.** |

Not yet concepted: `fore` (the occluder lane — dark, cropped, sparse) and any
second world.

Next step is not more concepts: it is running these through `cutout.mjs` →
`build-layers.mjs` to the layer rects at 30 px/unit with the depth tint baked,
then LOOKing at the stack in game.
