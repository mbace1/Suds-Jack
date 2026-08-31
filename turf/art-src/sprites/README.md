# TURF sprite plates — v3, cut for illustration fidelity instead of retro pixel art

**Supersedes v2 in this same directory's git history — same generated
bytes, a different cut.** v2 fixed *what* the art looked like (matching the
owner's reference technique instead of Metal Slug Tactics' flat 2-step).
The owner then looked at v2's delivered contact sheet next to the real
reference and called it "way too messy and low detail." The generation
wasn't the problem a second time either: the raw `blade-plate` generation
is a genuinely good 832×1248 illustration, close to reference quality as
generated. What was actually wrong was `ART_REQUEST.md` §5 step 4 —
downsampling that to **32×40** and force-snapping every pixel to a
**32-colour** palette, a combined ~99.85%-of-pixels-plus-hard-palette-clamp
cut built for genuine retro pixel art, applied to reference material that
measures (`palettecount.cjs` over a 55×55 patch of the owner's own
reference) at **2574 distinct colours in 3025 pixels** — smooth
illustration shading with a pixel-grid look, not a quantised palette. Full
reasoning is in `ART_REQUEST.md` §2.4. v3 re-cuts the same v2 raw
generations — nothing was regenerated — at 192×288 with `cut.mjs`'s own
`--no-quantise` flag (built for exactly this mismatch; its comment names
Piritori hitting the same problem first) and checks with `--illustration`.

**Supersedes v1 (MST flat-2-step) further back** in this same directory's
git history. The original `turfGrim` style block asked for Metal Slug
Tactics' flat-2-shade-step technique because that was ART_REQUEST.md §2's
stated brief — but the owner's own reference sheets (`turf/references/`: a
full ~20-character casting sheet, two detail crops of it, and a front/back
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

Then the cut pipeline — **changed at v3**, see the top of this file and
ART_REQUEST.md §2.4/§5 for why:

```
node kindling/tools/cut.mjs key   <raw>.png       <name>-keyed.png
node kindling/tools/cut.mjs fit   <name>-keyed.png <name>-fit.png  192x288 --no-quantise
node kindling/tools/cut.mjs check <name>-fit.png --illustration --colours 12000
node scripts/assets.mjs index    # after manually placing raw output at its content-hashed name
```

v1/v2 used `fit ... 32x40 --palette turf/art-src/palette.json` and a bare
`check` (implying the 64-colour, 1:1-pixel-art-round-trip default) — that
combination is still correct for genuine retro pixel art elsewhere in this
repo, just not for these plates.

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

## check results — 6/6 usable (v3, `--illustration --colours 12000`)

```
  ok  blade-plate          192x288   9124 colours  13567px ink
  ok  niner-plate          192x288  11272 colours  19229px ink
  ok  wrench-plate         192x288   9426 colours  13799px ink
  ok  grunt-blunt-plate    192x288   8357 colours  11696px ink
  ok  grunt-handgun-plate  192x288  11975 colours  22895px ink
  ok  grunt-shotgun-plate  192x288  10300 colours  15013px ink
```

All under the 12,000-colour ceiling, zero semi-transparent pixels. File
sizes 35-59 KB each (`_contact-sheet.png` shows all six at full size and
shrunk to roughly in-game scale — the silhouette and faction trim both
still read at the small size, which was the actual open question, not just
"does it look good big").

For contrast, the v2 numbers this replaces:

```
  ok  blade-plate-fit          32x40  22 colours  317px ink
  ok  grunt-blunt-plate-fit    32x40  20 colours  272px ink
  ok  grunt-handgun-plate-fit  32x40  21 colours  531px ink
  ok  grunt-shotgun-plate-fit  32x40  21 colours  351px ink
  ok  niner-plate-fit          32x40  22 colours  441px ink
  ok  wrench-plate-fit         32x40  24 colours  321px ink
```

Both passed their own gate — the gate wasn't wrong, it was checking the
right thing for the wrong pipeline. 13567px of ink vs 317px is the actual
size of the cut this revision undoes.

## Still true, unchanged by this revision

- `--cell` should NOT be passed to `check` for a single already-cropped
  sprite — it asks whether an image tiles into square N×N cells, a question
  for a multi-sprite sheet, not one 192×288 plate. Fixed in ART_REQUEST.md
  §5 step 5.
- **Faction trim reads clearly on four of six, subtly on `grunt-blunt-plate`**
  — the rust-orange patch and hood lining are there, but the jacket itself
  is a cool dark tone that competes with the warm accent more than the
  other five. Not a blocker (the accent is present, and re-rolling six more
  times chasing perfect colour balance isn't proportionate), but worth a
  note for whoever picks the next batch of archetypes.
- Per ART_REQUEST §7: no runtime sprite integration, no environment plate,
  no boss/elite variant, no multi-frame animation sheet — still all
  deliberately out of scope here.
- Per ART_REQUEST §2.4: the Aseprite hand pass for Move/Attack/Hit/Death
  frames (§6) is now tracing real illustration detail at 192×288, not
  palette-matching a flat fill — a bigger per-frame ask than §6 originally
  scoped, and not resolved by this revision.

## Resolved by this revision

- **Silhouette at true scale was tight.** At the old 32×40 native size the
  six read as distinct poses but the faction trim was too small an area to
  register, and the whole plate read as a blur once actually looked at
  next to the reference. §5 step 4's own caveat asked to confirm 32×40
  against the real board before locking it in — that confirmation is what
  surfaced this, and the fix was to stop cutting the detail out rather
  than to pick a different small number.
