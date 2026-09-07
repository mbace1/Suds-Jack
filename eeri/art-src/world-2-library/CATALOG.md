# World 2 — source asset catalog

All files here are **optional source pieces**, not production manifest entries.
The live Pipeworks backdrop set (`assets/2d/pipeworks_*`) is unaffected by
anything in this folder; promotion is always a separate deliberate art-lane
change.

Sixteen renders were handed over by the owner in chat on **2026-08-17** and
are now on disk. Until then this catalog listed names with **no files behind
them**, which is exactly the failure the World 3 catalog also records: a
catalog entry with nothing behind it reads as an asset you have. Every entry
below is a real file — if you add a name here, add the bytes in the same
commit.

**Backgrounds differ per file** and it matters when you composite:

- `*` **alpha** — already cut out, drop straight onto a layer
- `*` **white** — needs keying; they are studio-white, not transparent

## Midground / connectors

- `midground/service-wall-a.png` (white) — plain cement/card wall panel, one
  round pipe mouth, blue structural straps. The quiet connector piece.
- `midground/pipe-wall-a.png` (alpha) — long wall with two teal pipe mouths
  and an overhead pipe run. Repeats well.
- `midground/pipe-wall-b.png` (alpha) — second take: blue elbow crossing the
  face, two mouths, heavier blue banding.
- `midground/hatch-wall-a.png` (alpha) — wall with a square hatch opening and
  a round pipe mouth. The hatch is the only piece in the set that reads as a
  way THROUGH rather than a way past.
- `midground/pipe-rack-a.png` (white) — dense multi-level pipe rack with
  valves and gauges. The busiest piece here; use it once a screen at most.
- `midground/plant-facade-a.png` (alpha) — large industrial pipe-and-valve
  façade with orange panel blocks and yellow handrails. The World 2 hero
  backdrop candidate.
- `midground/service-bay-a.png` (white) — pipe run on a built shelf with a
  yellow handrail, valve wheel and beacon above.
- `midground/drainage-channel-a.png` (opaque black) — dry culvert section
  between two abutments with a large pipe mouth. Pairs with the next one.
- `midground/canal-water-a.png` (alpha) — the same channel shape filled with
  the crafted blue water sheet, hard-cut edge. Use it against
  `drainage-channel-a` to show a section before and after flooding.
- `midground/valve-junction-a.png` (alpha) — big horizontal valve junction,
  orange handwheel, hose loop, braced foot.
- `midground/standpipe-valve-a.png` (alpha) — tall vertical pipe and valve
  assembly with hose. Reads as a foreground occluder as easily as midground.
- `midground/pump-platform-a.png` (alpha) — pump skid on a slatted platform
  with beacon, hose and a striped barricade.

## Accents / smaller dressing

- `accents/valve-post-a.png` (white) — compact vertical valve post with an
  orange wheel on a base plate.
- `accents/hydrant-post-a.png` (white) — cross-shaped hydrant/standpipe with
  a diagonal brace and a hazard plate.
- `accents/drain-grate-a.png` (white) — circular grate in a cement/card
  square. Face-on: it is a floor piece drawn flat, so it belongs on a wall or
  cropped into a ground edge, not lying in perspective.
- `accents/stacked-pipes-a.png` (alpha) — strapped concrete-pipe stack on
  timber dunnage. Sits on the ground line as-is.

## Composition notes

Prefer one or two strong Pipeworks identifiers per screen rather than filling
every gap with pipework. These pieces are intentionally modular: crop them at
frame edges, hide parts behind other layers, and use negative space so
gameplay stays readable.

The set leans **grey/blue with orange and yellow accents**. That is narrower
than World 1's palette on purpose — it is what makes a Pipeworks screen read
as Pipeworks at a glance — so resist recolouring pieces toward Groundworks
sand and kraft.
