# `assets/fx/` — visual effect assets

**Empty on purpose, and it may well stay that way.**

Every effect in `js/fx.js` is drawn from geometry and palette colour, the
same rule the rest of this project follows: no image assets, nothing to
load, nothing to keep in step with the code that uses it.

This folder exists for the one case that rule does not cover — a **sprite
sheet for a particle that a quad cannot be** (a printed spark shape, a
smoke puff with real silhouette). If that day comes:

1. Put the PNG here.
2. Add it to `assets/manifest.json` under `ui` (it is DOM/material art, not
   a scene layer), `status: "placeholder"` until it is real.
3. Bump the manifest `v`.
4. `node eeri/test/dev-menu.mjs` — it fails on binary audio in the sibling
   folder, and the same discipline applies here.

Until then, adding a file here is a decision to be made deliberately, not a
default. A particle you can re-tune in a slider beats one you have to
re-export.
