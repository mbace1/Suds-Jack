# The four frames that prove idle cannot be generated frame-by-frame

`build-idle.mjs` works — the stance held perfectly across four generated
breath phases, feet planted, no drift, identity intact. It is still the wrong
approach, and these four files are why.

The control is the obvious one nobody had run: generate **the same phase
twice** and see what pure roll-to-roll noise scores.

```
settle vs settle (second roll)      0.956     <- SAME phase
hold   vs hold   (second roll)      0.887     <- SAME phase
settle vs hold                      0.903     <- OPPOSITE phases
settle vs hold   (both 2nd roll)    0.928     <- OPPOSITE phases
settle vs hold   (cross-roll)       0.949     <- OPPOSITE phases
```

**The ranges overlap completely.** Two rolls of one prompt differ *more*
(0.887) than two rolls of opposite prompts (0.949). A breath is smaller than
the generator's own variance, so no threshold and no band separates a correct
idle from four random rolls of the same prompt — and no amount of prompt work
fixes it, because the signal is below the noise floor.

The direct measure says the same thing. Ink height across the four phases went
257 / 253 / 262 / 253, so `hold` is correctly the tallest, but `settle` — which
must be the *shortest* — came out taller than both mid frames. The breath is
about 9px on a 257px figure and the jitter is the same size.

So the shipped idle is `breathe.cjs`: one generated frame, and the breath
computed. Everything above 55% of the ink height lifts 0-2px and settles, the
feet never move, the seam row repeats to fill the gap. Deterministic, loops
exactly, costs nothing, cannot drift identity — and it is how hand-drawn sprite
idles have always been made.
