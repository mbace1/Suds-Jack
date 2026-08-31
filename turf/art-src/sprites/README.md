# TURF sprite plates — cut, checked, ready for the Aseprite hand pass

Delivered per `turf/ART_REQUEST.md` §0 Path A (generate through this repo's
own pipeline) → §5 (key → fit → check). These are the **key-pose plates**
§4/§6 ask for — one per Milestone 1 archetype, idle-equivalent — not a
finished animation set. §6 explains why: the remaining move/attack/hit/death
frames are a bounded hand pass in Aseprite, traced against these for
proportion and drawn from `turf/art-src/palette.json` directly, because
multi-pose consistency from one text-to-image generation is unreliable with
this pipeline's tooling.

## Commands run, in order

```
GEMINI_API_KEY=... node scripts/assets.mjs gen --only turf
# for each of the six:
node kindling/tools/cut.mjs key   <raw>.png              <name>-keyed.png
node kindling/tools/cut.mjs fit   <name>-keyed.png        <name>-fit.png  32x40 --palette turf/art-src/palette.json
node kindling/tools/cut.mjs check <name>-fit.png
```

Raw generations (uncut, full-res, content-hashed) stay where `assets.mjs`
put them: `assets/out/2d/turf-*-plate.*.png`, tracked in `assets/index.json`
same as every other asset this pipeline makes. The six files here are the
`fit` output — 32×40, alpha-cut, quantised to the 32-colour art palette —
renamed from their content-hash filenames to the archetype id, since these
are curated hand-off deliverables rather than cache entries.

## check results — 6/6 usable

```
  ok  blade-plate           32x40  20 colours  260px ink
  ok  niner-plate           32x40  16 colours  298px ink
  ok  wrench-plate          32x40  21 colours  345px ink
  ok  grunt-blunt-plate     32x40  18 colours  333px ink
  ok  grunt-handgun-plate   32x40  16 colours  298px ink
  ok  grunt-shotgun-plate   32x40  18 colours  409px ink
```

All under the 64-colour ceiling (14-21 actual, well inside the 32-colour art
palette), zero semi-transparent pixels — binary alpha, real pixel art rather
than a shrunk illustration.

## One correction to ART_REQUEST.md §5 step 5

The doc's own example command is `check <out>-fit.png --cell 32`. Run
literally, this FAILS all six — not on colour count or alpha, the only
failure is `"32x40 is not a whole number of 32px cells"`. `--cell N` checks
whether an image tiles into an even grid of **square** N×N cells; it exists
for verifying a multi-sprite SHEET, not a single already-cropped 32×40
sprite (`cut.mjs`'s own `check` source: the cell note is the only thing
pushed into `notes` here, colours/alpha both pass). Dropping `--cell`
entirely gives the real result: 6/6 usable, shown above. Worth fixing in the
doc — the command as written can never pass for a 32×40 (non-square) fit.

## Two things worth a look before this goes further

**Silhouette at true scale.** `turf/js/render.js`'s placeholder draws units
at `UNIT_H = 18` (canvas px) against `TILE_W = 32`; these fit to 32×40 per
§5's own proposed default. At native 1:1 size (no upscaling) the six read
as distinct poses and the cold-blue-vs-warm-rust faction split is legible,
but it's a small, busy sprite — worth a look side-by-side with the real
board (§5 step 4's own caveat: "confirm it once one plate is actually cut
and looked at next to the board... before fitting the other five to
match") before committing five more archetypes to the same 32×40 grid.

**Shading ran richer than the two-step rule again.** Same finding as §2.1's
casting-sheet feedback: several jackets here show three tonal steps rather
than a flat base+shadow (visible pre-quantisation in the raw generations;
`fit --palette` snaps it to the 32-colour set regardless, so it does not
survive as extra colours, but the *shapes* of the shading remain slightly
softer than a hard two-step split would draw them). Not a blocker — `check`
passes clean — but the next prompt batch should state the two-step rule
explicitly rather than rely on the style block alone, per §2.1's own
recommendation, which this batch didn't yet act on.
