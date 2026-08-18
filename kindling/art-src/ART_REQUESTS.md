# What to post to the art pipeline

Paste-ready descriptions for the sheets this game needs, in build order. Written
to be posted one at a time — each is self-contained.

---

## 0. Why this file exists

The approach changed (owner direction, 2026-08-17): **cut assets out of sheets**
rather than hand-draw everything in code. That is right, and it is blocked on one
thing — **what is in the repo cannot be cut from.**

| what landed | size | usable? |
|---|---|---|
| `references/*` — the five scene concepts | **160 × 90** | no |
| `art-bible/*` — the five character sheets | 256 × 362 | no |
| `environments/*` — the three libraries | 160–256 wide | no |
| `ui/fantasy_ui_kit.webp` | 160 × 200 | no |

At 160×90 the whole companion is about thirteen pixels tall, the sword is four,
and the stone courses are gone. These are thumbnails of the art, not the art.
(The second delivery, PR #282, ships the same pack as base64 chunks with a
`rebuild_pack.py`; it produces 107,789 bytes against a manifest claiming 116,809
and the archive will not open. Truncated chunks.)

So every request below states its size, and the size is the part that matters
most.

---

## 1. The delivery rules that make a sheet cuttable

These apply to **every** request. They are the difference between a sheet I can
slice and a sheet I can only look at.

1. **PNG with a real alpha channel.** Not WebP, not JPEG, and **not elements sat
   on a dark card**. Every current sheet is a presentation board — labelled
   panels on a near-black background with drop shadows and captions baked in.
   A board is a lovely thing to read and impossible to cut: the background is
   not separable from the art.
2. **One element per cell, on a fixed grid, on transparency.** State the cell
   size in the filename or a companion `.json`. A 16×16 grid of 32×32 cells is
   worth ten beautiful boards.
3. **No labels, no captions, no frames, no drop shadows** inside the art area.
   Put those on a separate contact sheet if they help review.
4. **True pixel art at 1:1** — authored on the pixel grid, not an illustration
   with a pixel filter over it. The test: scaling the file down by half must not
   change what it looks like at 2× nearest-neighbour. A faux-pixel illustration
   turns to mush the moment it is resampled, and every asset here gets resampled.
5. **The native grid is 320 × 180.** That is this game's canvas (see §2). Deliver
   sources at **1:1** for that grid. If a 4× review copy is wanted alongside,
   scale it **nearest-neighbour only** — never smooth.
6. **A limited palette, shared across the whole set.** The colours already
   measured off the references are in `kindling/js/palette.js`; matching them
   keeps a cut asset and a code-drawn one in the same world.
7. **No text in any asset.** The game is heading for fi / en / ja and text baked
   into a sprite cannot be translated.

---

## 2. The canvas this art is for

**320 × 180**, integer-scaled up to the device. Chosen because it is exactly 2×
the delivered reference thumbnails and the same 16:9, so a reference can be laid
over a render at 2× and compared directly.

At that size:

| thing | height on screen |
|---|---|
| Ember (adult) | ~26 px |
| Mossling | ~26 px |
| Ashling | ~20 px |
| Moss Knight | ~38 px |
| the whole ruined arch | ~60 px |
| the bonfire at full | ~40 px |

Those come from the scale chart on the global art bible (Ember ~1.6u, Mossling
~1.6u, Ashling ~1.2u, Moss Knight ~2.4u) applied to a 26px adult.

---

## 3. The requests, in build order

### REQUEST A — Bonfire camp, four separated layers (night)

> Night bonfire camp in a ruined forest clearing, dark fantasy, 16-bit pixel art.
> Deliver as **four separate PNG files with transparency**, all **320 × 180**,
> designed to stack back into one scene:
>
> - **A1 — sky and distance.** Deep navy night sky (#04142c at the top grading to
>   #12253f at the horizon), stars, flat horizontal cloud bars, a full moon in the
>   upper right, a warm ember glow low on the right horizon. A castle on a hill in
>   silhouette on the right with a few small orange lit windows, and a dark
>   conifer treeline closing the horizon. Nothing in this layer is lit by fire.
> - **A2 — the ruin.** One whole ruined stone arch left of centre and one more
>   broken arch behind it to the right, both thick masonry with visible offset
>   courses and moss along the top surfaces only. Crumbled wall stacks at four
>   different heights running off to the right, with rubble at their feet, and an
>   iron gate in a stone surround where the wall ends. Transparent everywhere
>   else — the sky must show through the arch openings.
> - **A3 — the near ground and camp furniture.** The earth floor with flat stone
>   path pieces set into it, grass tufts, small flowers and mushrooms, a woven rug,
>   a ring of stones for the fire, stacked logs, a sword stuck point-down in the
>   earth, a leaning shield with a gold cross, a helmet on its side, a woodpile.
>   No fire and no firelight baked in.
> - **A4 — the foreground.** A huge tree cropped by the top-left corner (trunk with
>   vertical bark banding, spreading roots, canopy only across the top), an iron
>   lantern hanging off it on a bracket, a torn dark-red banner with a gold sigil
>   hanging from a beam, a rock cluster cropped by the bottom-left corner, and
>   brambles cropped by the bottom-right corner. Near-black silhouettes with one
>   lit edge; no interior detail.
>
> The fire and all firelight are drawn by the game, not baked into any layer —
> the light level is gameplay. Keep every layer flat: **no perspective ground
> plane**, depth comes from value steps between layers.

### REQUEST B — Ember sprite sheet

> Character sprite sheet for **Ember**, the companion: a small round monster of
> dark porous blue-black stone, one big head on a small body, two large white eyes
> set wide with dark pupils, two small fangs, two pale tan horns curving up and
> back, a dark maroon scarf at the throat hanging down the front, ember glow at
> the cracks and at the tail tip. 16-bit pixel art, side/three-quarter view,
> facing left.
>
> **One PNG with transparency, a uniform 40 × 40 grid, no labels, no background.**
> Rows:
>
> | row | frames | contents |
> |---|---|---|
> | 1 | 8 | IDLE — gentle breathing bob, scarf and tail lagging the body |
> | 2 | 6 | WALK |
> | 3 | 6 | RUN |
> | 4 | 8 | CAST / ATTACK — anticipation, impact, follow-through |
> | 5 | 4 | SIT, DOZE, LOOK UP, GREET (one frame each) |
> | 6 | 5 | the five AGE STAGES, idle pose only |
>
> The age stages read **only** through horn size, posture, accessories and surface
> detail — never body type. Horn length steps clearly at every stage: nub, short
> curve, up-and-back, long, long-and-branched. Stage 1 has no scarf. Stage 5 has a
> mantle over the shoulders and glowing cracks in the stone.
>
> Adult stands **26 px tall** on the 40 px grid, feet on the bottom edge of the cell.

### REQUEST C — Daytime travel, four separated layers, horizontally tileable

> Daytime forest path and open country, the same world as the night camp, 16-bit
> pixel art. This is the travelling view, so it **scrolls horizontally**: deliver
> **four PNG layers with transparency at 960 × 180 each** (three screens wide),
> and each layer must **tile seamlessly left to right**.
>
> - **C1 — sky.** Saturated blue (#3d95d9 up top through #9cd0ec at the horizon),
>   soft white cumulus, a pale haze band above the horizon.
> - **C2 — distance.** Blue-grey hills, a castle on a hill, a far treeline.
> - **C3 — the route.** A dirt path with stepping stones winding left to right,
>   olive-green grass and meadow either side, a stone bridge over a creek, a wooden
>   fence, a ruined stone arch and wall fragments overgrown with moss, a signpost,
>   a lantern post.
> - **C4 — the foreground.** Birch and conifer trunks cropped by the top edge,
>   bushes, brambles, flowers and mushrooms cropped by the bottom edge, in near
>   silhouette.
>
> Parallax: C1 barely moves, C4 moves fastest, so **C4 needs the most variation
> along its length** and C1 the least.

### REQUEST D — Mossling, Ashling and Moss Knight sprite sheets

> Three more sprite sheets, **same format and grid rules as Request B**, same
> world and palette.
>
> - **Mossling** (40 × 40 grid, 26 px tall) — the forest companion: the same round
>   build as Ember but made of moss, leaves and bark, with **antlers** instead of
>   horns, small mushrooms growing on it, a satchel, and a wooden staff. Green,
>   gentle. Rows: idle 8, walk 6, run 6, cast 8, four one-off poses, five age stages.
> - **Ashling** (32 × 32 grid, 20 px tall) — the hatchling ember-drake: small, dark
>   ash-and-char scales, **small wings**, spinal spikes, a short snout, ember cracks
>   glowing through, a tail with an ember tip. Rows: idle 8, walk 6, run 6,
>   **breath attack 10**, four one-off poses, five age stages.
> - **Moss Knight** (56 × 56 grid, 38 px tall) — the enemy: heavy stone-and-iron
>   armour overgrown with moss and vines, a closed helm with a dark slit, a large
>   kite shield with a gold cross, a worn sword. Slow, top-heavy, broad silhouette.
>   Rows: idle 8, walk 6, **attack 8**, **guard 8**, four one-off poses,
>   five variants (moss, rust, moon-blue, ember-marked, elder).
>
> Every one of them needs a readable silhouette at 1:1 with no colour — the shape
> alone has to say which creature it is.

### REQUEST E — Object and prop atlas

> A single **PNG atlas with transparency, 16 × 16 cells on a uniform grid, no
> labels, no background**, 16-bit pixel art in the same palette. Small objects
> seen against firelight:
>
> Bonfire states (unlit ring, low embers, medium fire, full fire, sparks only) —
> these five at 48 × 48 instead. Then at 16 × 16: stacked logs, ash pile, smoke
> puff, ember particle, mug, bottle, potion, book, scroll, key, coin, lantern,
> torch, sword, shield, helm, gauntlet, moss fragment, ember-seed, spark, feather,
> bone, shell, pinecone, mushroom (×3), flower (×4), grass tuft (×3), small rock
> (×3), stone marker, cairn, rug, satchel, cooking pot, bedroll.

### REQUEST F — UI kit at 1:1

> The leather-and-felt UI kit, delivered as **cuttable 9-slice pieces on
> transparency** rather than as a presentation board. One PNG per family, each
> with its corner/edge/centre regions on a stated grid:
>
> panel, panel-inset, goal row (unchecked and checked), primary button (normal,
> pressed, disabled), secondary button (same three), icon button, tab (active and
> inactive), bottom-nav item (active and inactive), progress bead (empty and
> filled) with its connector, HUD chip, portrait frame (×4), banner (×5 colours),
> warning badge, and the dashed stitch as a repeatable edge tile.
>
> Dark theme and parchment theme as two sets. **No text baked in.**

---

## 4. What happens on this side while those are made

The game keeps its code-drawn scene, and it moves to the 320 × 180 grid the art
is being authored for, so that a delivered layer drops straight in rather than
needing a re-fit. `js/assets.js` will do what Eeri's does: read a manifest where
every element is either `placeholder` (drawn in code, what exists now) or `live`
(a cut PNG), so the two can coexist and each asset can switch over the moment it
arrives without a rewrite.

Two consequences worth stating before they surprise anyone:

- **This project has been "no image assets" since it started**, and cutting real
  sprites ends that. The offline service worker's precache list has to name every
  PNG, and the deploy script has to carry them — otherwise the app loads online
  and is blank on a train, which this repo has shipped before.
- **A cut asset cannot be lit by the fire the way a drawn one can.** The whole
  scheme is that everything is painted cold and warmed toward the flame by
  distance. A PNG is already coloured, so firelight over it has to be a *tint
  pass* — which is why Requests A and C both say the fire and its light are not
  baked into any layer.
