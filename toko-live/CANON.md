# Toko Live — who Toko is (canon)

The owner's notes of 2026-09-24, for anything on this page that draws or
describes Toko. The source of truth is `toko/BRAND.md` §2c; this is the part
Toko Live has to act on.

## The original is the face

- The owner's master artwork is `toko/master/` (white on yellow, yellow on
  white). `toko/js/master.js` is it traced to exact outlines — tall thick
  arches for eyes with a narrow slot, strokes that end in slanted cuts, two
  deep U curves for the mouth. Draw the face from that, not from memory.
- The master has **no pupils**: it is the face at rest, eyes shut, smiling. It
  acts by a blink (the eyes squash) and a breathing smile.

## Colour

- **Magenta is the original colour** (`#F0027F`, with black). With no reason to
  choose, Toko is white on magenta.
- **The original Toko can be any of the colours** — the nine carriers in
  `toko/js/palette.js` `STICKER` (green, red, sky, orange, blue, yellow,
  purple, lime, pink). The master file is the yellow one.
- **Other colours may be used for different contexts or moods.** A reaction, a
  topic, a time of day can each take its own colour; the face stays the face.
- One face, one ground: never two colours inside the mark, never a gradient
  across it.

## Versions — valid, not original

- **Toko Slomo is the Kallio Noir version of Toko** — grey hair, a mask, a
  knife behind his back (`turf/art-src/reference/toko-slomo-run.png`, the
  owner's hand-made sheet; Piritori's `toko-slomo-noodles-*` scenes). Valid. Not
  the original — do not present him as the face of Toko Live.
- **This page's own figure is not original.** The dark hooded body, the arms
  with magenta hands and the ring head in `main.js`'s `draw()` were drawn by an
  assistant. `face-guard.js` (the owner's, 2026-08-29) already falls back to
  the approved face alone; a redraw should put the traced face on a coloured
  ground and add nothing the master does not have.
- Generated art is not a reference: `piritori/art/rooms/toko.webp` (a noodle
  keeper in a yellow smiley mask; the sign reads "HENSLONKI") is flagged.

## What Toko says about it

The counter's dialogue (`toko/js/dialogue.js`, with `.fi`/`.ja` packs) carries
two topics for exactly this, which Toko Live gets through the shared chat:
**WHAT COLOUR ARE YOU?** and **WHO IS TOKO SLOMO?**
