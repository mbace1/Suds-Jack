# TURF sprite plates — v2, matching the owner's real reference sheets

**Supersedes the v1 (MST flat-2-step) delivery** in this same directory's git
history. The original `turfGrim` style block asked for Metal Slug Tactics'
flat-2-shade-step technique because that was ART_REQUEST.md §2's stated
brief — but the owner's own reference sheets (`turf/references/`: a full
~20-character casting sheet, two detail crops of it, and a front/back
run-cycle sheet for one character) had never actually been looked at by
whoever wrote that brief. They show something different: 3-4 tonal shading
bands per surface with real material detail (quilting, distress texture,
drawstrings, hardware), not a flat base+shadow fill.

## What actually generated these bytes

Not `scripts/assets.mjs gen` — that command's own `ref` field only chains to
another MANIFEST-generated asset, never an arbitrary local upload, so a real
owner-supplied reference photo can't go through it. This session added
`scripts/gen-with-ref.mjs` for exactly that gap: it resolves an asset's
composed prompt from `assets/manifest.mjs` (same style block + per-asset
prompt `assets.mjs gen` would use) and calls the same underlying
`generateImage` with a reference image attached.

```
node scripts/gen-with-ref.mjs turf/blade-plate         turf/art-src/sprites/_style-ref.png  blade-plate.png
node scripts/gen-with-ref.mjs turf/niner-plate         turf/art-src/sprites/_style-ref.png  niner-plate.png
node scripts/gen-with-ref.mjs turf/wrench-plate        turf/art-src/sprites/_style-ref.png  wrench-plate.png
node scripts/gen-with-ref.mjs turf/grunt-blunt-plate   turf/art-src/sprites/_style-ref.png  grunt-blunt-plate.png
node scripts/gen-with-ref.mjs turf/grunt-handgun-plate turf/art-src/sprites/_style-ref.png  grunt-handgun-plate.png
node scripts/gen-with-ref.mjs turf/grunt-shotgun-plate turf/art-src/sprites/_style-ref.png  grunt-shotgun-plate.png
```

`turf/art-src/sprites/_style-ref.png` is a crop of the owner's own casting
sheet (front/back pair, one character, clean background, no baked shadow —
the cleanest single exemplar in `turf/references/casting-sheet-detail-1.png`).
The manifest's `turfGrim` style block carries its own instruction to copy
only the reference's TECHNIQUE, never its specific character/pose/
background — worth reading if editing that block, because a reference
attached without that clause risks the model copying identity, not style.

Then the standard cut pipeline, unchanged:

```
node kindling/tools/cut.mjs key   <raw>.png       <name>-keyed.png
node kindling/tools/cut.mjs fit   <name>-keyed.png <name>-fit.png  32x40 --palette turf/art-src/palette.json
node kindling/tools/cut.mjs check <name>-fit.png
node scripts/assets.mjs index    # after manually placing raw output at its content-hashed name
```

## Two real defects, both resolved before this was called done

**`grunt-shotgun-plate` first came back holding a combat knife**, not the
sawn-off shotgun ART_REQUEST §3.2 specifies for that archetype (dmg 4, rng 2,
knockback 1 — a firearm's stat profile). Caught by looking, not assumed
correct because the render quality was otherwise good. Fixed by stating the
weapon more forcefully in that one prompt on the first retry; the final
manifest-driven generation (above) got it right without needing the extra
emphasis.

**The delivered bytes didn't match the manifest's own prompt hash, briefly.**
While writing `gen-with-ref.mjs` and moving the "copy technique, not
identity" instruction into the shared `turfGrim` block, the wording changed
slightly from what the first batch was actually generated with — a real
discrepancy between "what the manifest says produced this" and "what
actually did." Rather than leave that gap documented-but-unfixed, all six
were regenerated through the finished `gen-with-ref.mjs` tool against the
final manifest text, which is also what validated the tool end to end rather
than shipping it untested. `node scripts/assets.mjs status --only turf`
reports all six `ok` — the file on disk and the hash the manifest computes
now genuinely agree.

## A recurring artifact, verified harmless rather than assumed so

Every raw generation in both batches carries a faint soft smudge near the
top of the frame (never the same position twice), most likely the model
echoing the reference sheet's own cast-shadow habit in a different spot
after being told not to draw one under the feet. Checked by pixel inspection
after `key`, not by eye: despeckle removes every one of them cleanly —
`semiSampled: 0` and clear margins on all four sides, all six files, both
batches. No regeneration was needed for this on its own.

## check results — 6/6 usable

```
  ok  blade-plate-fit          32x40  22 colours  317px ink
  ok  grunt-blunt-plate-fit    32x40  20 colours  272px ink
  ok  grunt-handgun-plate-fit  32x40  21 colours  531px ink
  ok  grunt-shotgun-plate-fit  32x40  21 colours  351px ink
  ok  niner-plate-fit          32x40  22 colours  441px ink
  ok  wrench-plate-fit         32x40  24 colours  321px ink
```

All under the 64-colour ceiling (20-24 actual, inside the 32-colour art
palette), zero semi-transparent pixels.

## Still true, unchanged by this revision

- `--cell` should NOT be passed to `check` for a single already-cropped
  sprite — it asks whether an image tiles into square N×N cells, a question
  for a multi-sprite sheet, not one 32×40 plate. Fixed in ART_REQUEST.md §5
  step 5.
- **Faction trim reads clearly on four of six, subtly on `grunt-blunt-plate`**
  — the rust-orange patch and hood lining are there, but the jacket itself
  is a cool dark tone that competes with the warm accent more than the
  other five. Not a blocker (the accent is present, and re-rolling six more
  times chasing perfect colour balance isn't proportionate), but worth a
  note for whoever picks the next batch of archetypes.
- **Silhouette at true scale is still tight.** At native 1:1 (no upscaling)
  the six read as distinct poses, but the faction trim colour is a small
  enough area at 32×40 that it barely registers. Same limitation the v1
  batch had, not a regression from the style change — worth a look next to
  the real board (§5 step 4's own caveat) before this size is locked in.
- Per ART_REQUEST §7: no runtime sprite integration, no environment plate,
  no boss/elite variant, no multi-frame animation sheet — still all
  deliberately out of scope here.
