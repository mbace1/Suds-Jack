# The look

Notes taken off Flashback screens supplied by the owner, 2026-08: three jungle
screens, one interior, two city screens. This is a study of **how the pictures
are built**, not a copy of any of them — the layouts here are ours, the
construction is what is being learned. Nothing from those screens is in this
repository.

The point of writing it down: the fourteen rooms this project shipped in v45
were invented without anyone looking at what a screen of this kind is actually
made of, and that is why they read as a different game. Getting the vocabulary
right fixes every room, including ones nobody has drawn yet.

## 1. Three layers, and only three

Every screen resolves into:

- **The field.** One big flat colour covering most of the picture — a cyan-teal
  sky in the jungle, a khaki-olive haze in the city. Not a gradient, not a
  texture. It is the single loudest thing on screen and it does the work of
  saying where you are.
- **The silhouette layer.** The same hue, shifted a step darker or lighter, no
  outline, no detail: palm shapes behind the jungle, a city skyline behind the
  street. It reads as distance because it is *lower contrast*, never because it
  is smaller or blurrier.
- **The near masses.** Saturated, outlined, textured, and the only layer with
  any modelling in it.

Our rooms currently have four or five bands of flat colour and no silhouette
layer at all, which is why they read flat and why the horizon looks like a
horizon rather than like distance.

## 2. The near masses are outlined and mottled — never flat

Every solid thing that touches the play area has:

- a **near-black outline** on the side facing air,
- a **lighter top surface**, one to three pixels, where light lands,
- a **mottle** of two adjacent tones scattered through the body — bark in the
  jungle, damp concrete in the city. Not noise: clustered blotches, a few pixels
  across, in the same hue family.

Ours are one flat fill plus one lit band. The mottle is most of the difference.

## 3. Edges are ragged, and that is the tell

Nothing meets air along a straight tile edge. Jungle trunks are scalloped in
bark plates; the city stone crumbles. Where the room art stops entirely — the
interior screen — it does not run to the frame, it ends in a **torn edge against
pure black**, and the black is a shape, not a border.

This is the single cheapest, highest-return change available to us: our tiles
end on the grid, and it is what makes them look like tiles.

## 4. The screen is framed left and right

Full-height masses crop both sides — trunks in the jungle, columns and blocks in
the city — so the picture is a window rather than a strip. The hard cut between
screens works because each screen is *already* framed.

## 5. Platforms are slabs on visible supports

A floor is a thick slab, 12–20 px through, with a lit top and a dark underside,
and it is **held up by something you can see**: a pillar, a trunk it grows out
of, or thin metal legs. A platform floating on nothing does not appear.

## 6. The furniture is man-made and bolted on

The recurring pieces, all of them small, high-contrast and drawn in a
different material family from the mass they sit on:

- **railings** — thin vertical posts with a top rail, along any platform edge
- **ladders** — a vertical striped pole or a rung stack
- **truss bridges** — a lattice of thin diagonals spanning a gap
- **lamps** — a post with a bright head, the only real light source
- **terminals and screens** — a small dark panel with a few bright glyphs
- **grilles and vents** — a hatched rectangle
- **strip lights** — short bright bars set into a floor edge
- **machinery** — boxes with pipes, bolted to a mass
- **hanging vines / cables** — thin lines dropping from an overhang

In the jungle this furniture is *bolted onto the trees*, which is the whole
story of the setting told without a word: someone industrialised this place.

## 7. Light is rare and saturated

Two or three glowing elements per screen at most, and they are the only
saturated colours in the picture: a lamp head, a strip light, a terminal glow.
Everything else is muted. That is what makes the glow read.

## 8. Verticality, and how you cross it

Three or four floor levels per screen, and they are joined by **ladders and
lifts**, not by jumping. Jumping is for gaps in a floor, not for changing
storey. Our rooms make you jump to climb, which is a different game.

## 9. Where the enemies stand

One per level, standing still on a floor, small in the frame, in a colour that
appears nowhere else in the screen — purple, dark red. They read as targets
because the palette reserves their hue for them.

---

## What this asks of the code

- `scenery.js` needs a **silhouette layer** between the field and the masses.
- `level.js`'s tile painting needs **ragged edges**, a **mottle**, and a **dark
  underside** — the lit top band is already there.
- Both need a **furniture pass**: railings, ladders, trusses, lamps, terminals,
  grilles, drawn as decoration keyed off the map rather than as tiles.
- The room format needs **ladders and lifts** as first-class things, because
  point 8 is a rule about movement, not decoration.
- Biomes stay one number (`room.t`). None of the above is biome-specific; the
  palette does that job, which is the arrangement we already have and it is the
  right one.

## Order of work

1. Ragged edges + mottle on the tile masses. Biggest return, no new data.
2. The silhouette layer.
3. The furniture pass, and the map characters it needs.
4. Ladders and lifts as movement.
