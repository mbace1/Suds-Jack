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

**Ask for ONE OBJECT explicitly, and say it twice.** The first piece pass read
"one tower crane" as "a scene containing a tower crane" for three of the five
tall pieces — `P-far-core` came back as a lift core with two more frames
cropped by the frame edges, so its ink bounds spanned the whole image and it
composited as a wide smear. The clause that works is in `sheet-fix.mjs`:

> EXACTLY ONE single object, complete and whole, centred with clear empty
> magenta all around it and nothing touching any edge of the frame. no other
> objects, no scenery, no second copy. the magenta runs all the way down under
> the object: NO ground, NO floor, NO table, NO shadow, NO base plinth.

That last sentence is what makes a piece PLACEABLE. A piece that arrives on
its own plinth cannot be seated on the layer's grade, and a run of pieces each
standing on its own little base is the "not connected to ground" read.

The grade strips are the exception and take the opposite instruction — they
MUST run off both ends, because they are what make the layer continuous.

## The pieces (v12) — `pieces/`

36 objects, one per file, keyed and composed by `tools/build-layers.mjs`.
`tools/montage.mjs` lays them out KEYED on neutral grey, which is the only
review that answers both questions at once: is the piece on register, and does
it key cleanly. A magenta contact sheet hides the second one.

| lane | pieces |
|---|---|
| `skyline` | slab · step · pair · tower · **stack** · **crane** |
| `far` | frame5 · frame3 · frame2 · hoard · silo · **core** · **crane** |
| `mid` | scaff3 · scaff1 · hoard · hut · stack · skip · pipes · mixer · **tower** |
| `near` | hoard · spoil · pipes · cones · drums · pallet · fence |
| `fore` | stand · net · pipe · spoil · drums |
| grade | `G-far` · `G-mid` · `G-near` |

**bold** = `hero`: rare, and the only thing breaking the height line.

Stored at 1024 px, JPEG q88 (`tools/packpieces.mjs`) — a piece is composited
at most ~400 px tall, so the 1500 px frames the generator returns are pure
weight. They are SOURCES: the pipeline re-keys them on every build, and the
key is chroma-based, so mild JPEG ringing at an edge is despilled anyway.

## The segments (v7–v11) — superseded, kept as the material reference

These five are still the register every piece is generated against (passed as
`--ref`), which is what stops the pool drifting. They are no longer composited
directly: one segment stamped across a rect is the v2 build, and it shipped
three identical frames per screen.

| file | layer | notes |
|---|---|---|
| `C-skyline.jpg` | skyline | flat card blocks + two balsa tower cranes; nearly a silhouette, correct for the furthest lane |
| `C-far.jpg` | far | grey-board tower frames, magenta showing through the bays, one taped ochre hoarding |
| `C-mid.jpg` (`C-mid-a`) | mid | balsa scaffold towers lashed with paper bands, overlapping card hoarding |
| `C-near.jpg` | near | torn corrugated dirt bank, paper-tube pipes, folded card cones. **The density model for the rest.** |

| `C-fore.jpg` | fore | two standards cropped off the top, spoil sweeping the bottom, a pipe run crossing high — built to the v4 fore contract, graded to near-silhouette by the compositor |

**Built and live (eeri v12)** as `assets/2d/groundworks_*_v3.png`:

    cd eeri/art-src
    MESHY_WORK=… PIECES=craft/pieces OUT=../assets/2d node tools/build-layers.mjs

Placement is seeded, so that rebuild is byte-for-byte reproducible. The key
lives in `tools/keylib.js` — read its header before touching a threshold; all
three of its rules are there because the alternative shipped.

Not yet concepted: any second world.

## The earth (v13) — `earth/`

The ground is ~30% of every frame and had been "fixed" twice without getting
better: v10 gave it the material kit, v11 fixed the detail map's contrast.
Both worked the MATERIAL axis. Neither touched the fact that every band shared
one map at one density, so the largest surface on screen was an evenly-spaced
motif marching across 136 world units between four dead-straight horizontals.

| file | becomes | notes |
|---|---|---|
| `S-topsoil` `S-mid` `S-packed` `S-gritty` | the four strata detail maps | regenerated from a MATERIAL-only prompt, high-passed at radius 62 |
| `E-fringe` | the `fringe` cutout | felt tufts on the grass lip |
| `E-tear` | **nothing — pulled** | came back a painted hoarding, not a ripped edge |
| `F-*` | seven cutouts in the cut face | pipe, drum, root, brick, stones, bottle |

**A DETAIL MAP MUST TILE, WHICH MEANS IT MUST BE FEATURELESS.** The first cut
inherited the house craft block, which names split pins and masking tape — so
every section came back with fixings in specific places, and at a 3-unit
repeat you could count the same brass pin forty-five times. `detailmap.mjs`
gained a `highpass` argument for exactly this, and it fixes a pin or a tape
patch; it cannot fix `S-packed` and `S-gritty`, which are photographs of a
specific card *assemblage* — the arrangement itself is the subject, and there
is no filter that turns an object into a material. Those two were pulled and
the bands they served fall back to `flute`, which is genuinely uniform, at two
densities.

**The test is TILE IT 3×3 AND LOOK.** Nothing else shows it — a single patch
of any of the four reads as convincing card. `tools/montage.mjs` does not
answer this question; a 3×3 does.

    node tools/bake-earth.mjs out/earth-baked          # EARTH=… to point elsewhere
    node tools/detailmap.mjs <src> <out> 0.40 512 62   # strength, size, highpass

And one that is not about texture at all: a decorative strip laid along a
straight boundary makes it WORSE. The first attempt ran a torn-card edge along
every band boundary and turned four straight lines into four regular rows of
identical bumps. A boundary wants to be irregular in POSITION — the bands
interlock in geometry now (`tongues` in `level.js`), which costs no asset.

## Pipeworks (v15) — `pipeworks/`

World 2's pool, same contract as the groundworks pieces (ONE object on
magenta, no ground, no plinth), refs drawn from the groundworks pool so the
kit cannot drift. 23 of 26 on flash, Pro only for the crane / standpipe /
pipe bridge (fine lattice). Water is CUT PAPER — layered blue card with
scalloped torn edges — never a rendered liquid. Composited by
`tools/build-layers.mjs` with `WORLD=pipeworks`; see the tool for the pool
table and the `sink` note (white base slivers are buried, not re-rolled).
