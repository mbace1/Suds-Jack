# The photograph plate

`plate.jpg` is the backdrop behind the bridge. `js/main.js` looks for it at boot,
and if it is not there the request simply fails and the painted park stays up.
A missing plate is the default, not an error — so swapping the backdrop is a
matter of replacing one file, with no code change.

    slaykallio/bg/plate.jpg      ← the plate

It goes through exactly the same focus pass as the painting, so it is
tilt-shifted with the sharp band on the deck and gets the vignette and grade
with it.

## What ships

The Kallio bear — the granite bear in Karhupuisto, which is the park this game
is named out of. Supplied by the owner (2026-09-05, *"here, you can crop as
needed"*) and cropped to `x 400, y 40, 800×500` of the original, upscaled to
1600×1000.

The crop puts the statue at the LEFT and the treeline through the middle, and
that is not a taste call — see below.

## What makes a good plate

- **It is CUT to the frame, never stretched onto it.** The largest centred
  rectangle of the frame's own shape is taken out of the plate. So:
- **Whatever is in the MIDDLE is what stands behind the fight**, in both
  formats — portrait keeps only the middle of a landscape plate, and that is
  the half of the picture the puppets are standing in front of. Put the
  interesting thing off to one side and leave the middle a quiet mass.
- **Landscape, and wide.** Portrait throws most of the width away, so a plate
  wants width to spare: 1600×900 is a floor, not a target.
- **A horizon a little above the middle**, with a treeline or a far bank. The
  bridge deck sits across the lower-middle of the frame, so the interesting
  half of the photograph should be the top half.
- **Nothing important in the centre-bottom.** The bridge covers it.
- **Overcast or late light** suits the palette; bright midday sun fights the
  grade, which is deliberately desaturated and warm-shadowed. (The shipped
  plate is bright midday and gets away with it because the blur and vignette
  eat most of the contrast, but it is the exception.)

## Testing one without committing it

    /slaykallio/?bg=https://example.com/photo.jpg

and one eye of a side-by-side stereo pair:

    /slaykallio/?bg=<url>&stereo=sbs&eye=left

## Licensing

Whatever goes here ships with the game, so it needs to be a photo that may be
redistributed. The current plate was supplied by the repository owner for this
use. Anything replacing it should be your own, or CC0 / CC BY / a permissive
stock licence — and if it is CC BY, put the attribution in this file.
