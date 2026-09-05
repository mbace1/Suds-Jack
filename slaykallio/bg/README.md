# The photograph plate

Drop a photo in here as **`plate.jpg`** and it becomes the backdrop behind the
bridge. No code change: `js/main.js` looks for `bg/plate.jpg` at boot, and if it
is not there the request simply fails and the painted park stays up. A missing
plate is the default, not an error.

    slaykallio/bg/plate.jpg      ← put it here

It goes through exactly the same focus pass as the painting, so it is
tilt-shifted with the sharp band on the deck and gets the vignette and grade
with it. Nothing else needs touching.

## What makes a good plate

- **Landscape, and wide.** It is scaled to fill the frame at its own distance;
  something around 1600×900 or larger has enough to survive the blur.
- **A horizon a little above the middle**, with a treeline or a far bank. The
  bridge deck sits across the lower-middle of the frame, so the interesting
  half of the photograph should be the top half.
- **Nothing important in the centre-bottom.** The bridge covers it.
- **Overcast or late light** suits the palette; bright midday sun fights the
  grade, which is deliberately desaturated and warm-shadowed.

## Testing one without committing it

    /slaykallio/?bg=https://example.com/photo.jpg

and one eye of a side-by-side stereo pair:

    /slaykallio/?bg=<url>&stereo=sbs&eye=left

## Licensing

Whatever goes here ships with the game, so it needs to be a photo that may be
redistributed — your own, or something under CC0 / CC BY / a permissive stock
licence. If it is CC BY, put the attribution in this file.
