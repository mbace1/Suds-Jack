# World 2 — index

## Existing sources, by reference

The waterworks pool already exists and is **not copied in here** — a piece
that exists twice drifts twice. It lives at `art-src/craft/pipeworks/` and is
wired into `POOLS.pipeworks` in `tools/build-layers.mjs`:

| layer | pieces |
|---|---|
| skyline | `W-sky-tower`, `W-sky-gas`, `W-sky-pump`, `W-sky-pipes`, `W-sky-crane` |
| far | `W-far-tank`, `W-far-rack`, `W-far-house`, `W-far-stand`, `W-far-bridge` |
| mid | `W-mid-run`, `W-mid-valve`, `W-mid-elbow`, `W-mid-pumpskid`, `W-mid-sluice`, `W-mid-stack`, `P-mid-tower`\* |
| near | `W-near-water`, `W-near-culvert`, `W-near-hose`, `W-near-sand`, `W-near-pump` |
| fore | `W-fore-stand`, `W-fore-run`, `W-fore-spoil` |
| grades | `WG-far`, `WG-mid`, `WG-near` — compositor internals, not placeable |

\* `P-mid-tower` is borrowed from the **groundworks** pool on purpose: a
scaffold tower is world-agnostic site furniture, and one shared silhouette
ties the two worlds to one site without the backdrops repeating.

Those sources are magenta-backed and unkeyed. The direction pieces below are
committed **already keyed**.

## Direction pieces — the files actually in this folder

Twelve keyed PNGs, added to show **direction** for World 2 rather than to fill
a slot in a level. Each **leads with a different material**, and the filename
says which — the point of the set is the spread, and a name ending in its
material is a name you can shop by.

| folder | file | material lead |
|---|---|---|
| `background/` | `gasholder-foil.png` | kitchen foil — crinkled drum, soft sheen, three guide rails |
| `background/` | `pipebridge-straw.png` | paper straws — four parallel runs on card trestles, thin and quiet |
| `midground/` | `manifold-band.png` | rubber bands — five capped pipes into a header, banded joints |
| `midground/` | `pumphouse-tube.png` | cardboard tube — spiral seam along the length, capped both ends |
| `midground/` | `sluicegate-mesh.png` | wire mesh — woven screen in a card frame, weed-green waterline |
| `midground/` | `valvewheel-cork.png` | cork — three handwheels square-on as true circles |
| `foreground/` | `grating-tulle.png` | tulle — dark drainage screen, tall and narrow, an occluder |
| `foreground/` | `hoserun-cleaner.png` | pipe cleaner — chenille hose sagging across the whole frame |
| `props/` | `watersheet-paper.png` | **cut paper — THE water rule, made a picture** (see below) |
| `props/` | `standpipe-straw.png` | paper straws — three bundled upright, taped, cork handle |
| `props/` | `sandbags-hessian.png` | hessian sacking — open weave, loose threads, damp lower course |
| `props/` | `steamvent-cotton.png` | cotton wool — teased clouds spreading across the picture plane |

### `watersheet-paper` is the important one

World 2's single locked look rule is that **water is cut paper, never a
rendered liquid** — layered blue card with hand-torn scalloped edges. That
rule predates this library and lives in `build-layers.mjs`. This piece exists
so the rule is a **picture to point at rather than a sentence to argue with**,
which is the only form in which an art rule survives contact.

## What the set cost, and what it taught

Four of the twelve needed a re-roll, and **three failed the same new way** —
a failure World 1 never surfaced because World 1 has no pipes in it:

**A pipe world is full of circular openings, and an opening is the hardest
thing to keep flat.** The model wants to show you the pipe's *mouth*, because
a mouth is what says "pipe" — but a mouth is a circle whose axis points at the
camera, so drawing it tilts the object, and out comes the ellipse that means
the piece is carrying ground. `manifold-band` grew two dark oval openings,
`pumphouse-tube` and `hoserun-cleaner` one each. Telling it "no ellipses" does
not help: it is not trying to draw an ellipse, it is trying to draw a pipe.

The fix is to hand it the only two legal endings — **cap it, or crop it** (a
flat disc facing camera is a true circle; a pipe off the frame edge has no end
to draw). Full statement in README § "Cap it, or crop it"; the reusable
`ENDS` clause is in `tools/fix-w2lib.mjs`.

The fourth was the familiar one: `pumphouse-tube` and `steamvent-cotton` both
came back with a cast shadow, which keys as an opaque maroon smear (keylib's
`mn > 45` floor, `ART_PIPELINE.md` trap 14). Both are objects that
conceptually **sit** — a shed on a plinth, a stack on a base — and a thing
that sits is a thing the model grounds. They needed the float clause with the
sitting denied outright.

## Not in the library on purpose

- `WG-*.jpg` — compositor grade strips, consumed by `build-layers.mjs`.
- Machines, cast and pickups — those go through the 3D/manifest seams, not the
  layer library.
- `textures/` and `candidates/` are empty by design: the swatch rule is
  inherited from World 1 (**a detail map must be featureless — tile it 3×3 and
  LOOK**), and nothing has been generated for World 2 yet.
