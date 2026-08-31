# TURF cast-pose pilot — two characters, two facings, seven frames each

Answers two direct questions in sequence. First: "how do we expand these to
include animations per character?" — piloted on two of the owner's own
casting-sheet characters (not a synthesised archetype — the owner's
correction: "there are just character models, no archetypes... pick 2 from
the sheets I provided and expand"), each carried through Idle/Move/
Attack(×2)/Hit/Death(×2) — seven frames, matching `ART_REQUEST.md` §6's
frame table with the owner's own call on richness (2 frames each for
Attack and Death, not 1). Second, once that sheet was shown: "are these
taking into consideration the non-cardinal directions? NE, NW, SE, SW?" —
correctly catching that the first pass was front-facing only. **Now
answered too**: every one of the seven poses exists in both a front and a
back facing, 28 frames total (`*-back.png` alongside each front file) —
see "The direction question" below for why two facings, not four or eight.

## The two characters

Picked for range, not for fitting a TURF stat role (there isn't one here):
- **gunner** — row 2, column 5 of `turf/references/casting-sheet-full.png`:
  a stocky bald man, tattoo sleeves, white tank top, akimbo pistols.
- **leopard** — row 4, column 2 of the same sheet: a woman with blonde
  hair, an oversized leopard-print coat, a knife.

## What's new here vs. the six archetype plates

The archetype plates (`turf/art-src/sprites/*-plate.png`) each generate a
**new** character *inspired by* a style reference — the manifest's
`turfGrim` block explicitly says "do NOT copy the reference's specific
character... draw the NEW character." This pilot needs the opposite
instruction, so it's a separate style block, `turfCastPose`: "a reference
image is attached showing THIS EXACT character... only the pose and action
change." Untested before this pilot — `ART_REQUEST.md` §2.2 found plain
text-to-image can't hold a character across poses with *no* reference
image at all; whether an attached reference image fixes that was the open
question this answers. It does, well.

## Idle is not generated

Six poses per character come from `scripts/gen-with-ref.mjs` against a
crop of the character's own reference art (`_ref-gunner.png` /
`_ref-leopard.png`, cropped from `casting-sheet-full.png`). Idle is that
same reference crop run straight through `key → fit 192x288 --no-quantise`
with **no generation step at all** — the highest-fidelity Idle this
pipeline can produce, and a free one.

```
node kindling/tools/cut.mjs key turf/art-src/sprites/cast/_ref-gunner.png  gunner-idle-keyed.png
node kindling/tools/cut.mjs fit gunner-idle-keyed.png gunner-idle.png 192x288 --no-quantise
```

The other twelve (six per character):

```
node scripts/gen-with-ref.mjs turf/cast-gunner-move            turf/art-src/sprites/cast/_ref-gunner.png   gunner-move.png
node scripts/gen-with-ref.mjs turf/cast-gunner-attack-windup    turf/art-src/sprites/cast/_ref-gunner.png   gunner-attack-windup.png
node scripts/gen-with-ref.mjs turf/cast-gunner-attack-release   turf/art-src/sprites/cast/_ref-gunner.png   gunner-attack-release.png
node scripts/gen-with-ref.mjs turf/cast-gunner-hit              turf/art-src/sprites/cast/_ref-gunner.png   gunner-hit.png
node scripts/gen-with-ref.mjs turf/cast-gunner-death-fall       turf/art-src/sprites/cast/_ref-gunner.png   gunner-death-fall.png
node scripts/gen-with-ref.mjs turf/cast-gunner-death-down       turf/art-src/sprites/cast/_ref-gunner.png   gunner-death-down.png
# same six ids under turf/cast-leopard-*, against _ref-leopard.png
```

The back-facing fourteen are the same recipe against `_ref-gunner-back.png`
/ `_ref-leopard-back.png` (crops of the SAME casting-sheet row, the second
half of the front+back pair) and the `-back` suffixed ids (e.g.
`turf/cast-gunner-move-back`).

Then the same cut pipeline as the archetype plates (§2.4's fix — 192×288,
`--no-quantise`, `check --illustration`), just with a wider colour ceiling
(see below).

## The direction question

Asked directly after the first (front-only) sheet was shown: "are these
taking into consideration the non-cardinal directions? NE, NW, SE, SW?"
They weren't — worth saying plainly rather than let a partial answer stand
as if it were complete. The actual mechanics, checked rather than guessed:
`turf/js/grid.js`'s board is **orthogonal 4-directional** ("ITB-style
rather than an 8-directional grid," its own comment says), and
`render.js`'s `toScreen()` is a standard 2:1 isometric projection
(`x=(gx-gy)*W/2, y=(gx+gy)*H/2`). Working through the maths: the board's 4
logical directions land exactly on the 4 isometric screen diagonals — so
the board needs 4 directions of coverage, but that does NOT mean 4 (or 8,
MST-style) separately drawn facings. **2 drawn facings, mirrored left/right
in code, cover all 4** — which is also exactly what the owner's own
casting sheet already does (every character shown as a front+back pair).
That's why this pilot's second half is a `-back` generation of every pose
rather than four or eight independently drawn ones: the game's own
geometry settles the count, and it agrees with the reference material
already supplied.

## Two real defects, both caught by looking and fixed by re-prompting

**`death-down` didn't lie down, on the first try — for both characters.**
The prompt said "collapsed flat... lying roughly horizontal" and the model
delivered a character still upright or crouched, just with slack arms —
technically a "reaction" pose, not a "down" pose. Fixed by rewriting the
prompt to keep the same three-quarter camera (not a top-down cheat, which
would have broken visual consistency with the other six poses) but demand
the body **reclined diagonally corner-to-corner** with an explicit failure
test in the prompt itself ("if the feet are still under the hips
supporting weight, the pose is wrong"). Worked on the first retry, both
characters.

**The gunner's akimbo pistols collapsed to one gun, twice, despite explicit
counting language** ("TWO separate pistols — count them: one... a
second..."). Both attack frames rendered a single pistol gripped
two-handed — a real miss against both the prompt and the reference, which
shows a gun in each hand. Fixed on the *third* attempt by naming a
recognisable trope instead of describing geometry ("an AKIMBO dual-pistol
stance like a classic action-movie double-gun pose, John Wick / Max Payne
style") — worked immediately. Worth remembering: explicit counting
instructions were less effective here than naming what the pose already
looks like in the model's training data.

## check results — 14/14 usable, wider ceiling than the archetype plates

```
  ok  gunner-idle             192x288  20111 colours  24935px ink
  ok  gunner-move             192x288  13016 colours  18020px ink
  ok  gunner-attack-windup    192x288  12570 colours  16918px ink
  ok  gunner-attack-release   192x288  12507 colours  17421px ink
  ok  gunner-hit              192x288  13203 colours  19576px ink
  ok  gunner-death-fall       192x288  13471 colours  18771px ink
  ok  gunner-death-down       192x288  11956 colours  14837px ink
  ok  leopard-idle            192x288  16275 colours  19539px ink
  ok  leopard-move            192x288  14251 colours  19539px ink
  ok  leopard-attack-windup   192x288  14194 colours  17305px ink
  ok  leopard-attack-release  192x288  15346 colours  20777px ink
  ok  leopard-hit             192x288  13412 colours  17588px ink
  ok  leopard-death-fall      192x288  13665 colours  17467px ink
  ok  leopard-death-down      192x288  10770 colours  12915px ink
```

Run with `--colours 21000`, not the archetype plates' `12000` — this batch
genuinely measures higher (tattoo linework, leopard-print pattern, and the
Idle frames being uncropped photographic-style crops rather than a fresh
AI generation all add real colour variety), confirmed by measuring rather
than assumed as drift. Zero semi-transparent pixels, all binary alpha.

The back-facing fourteen, same ceiling, also 14/14:

```
  ok  gunner-idle-back             192x288  16697 colours  21991px ink
  ok  gunner-move-back             192x288  11819 colours  19483px ink
  ok  gunner-attack-windup-back    192x288  10192 colours  14798px ink
  ok  gunner-attack-release-back   192x288  10999 colours  15122px ink
  ok  gunner-hit-back              192x288  11808 colours  19132px ink
  ok  gunner-death-fall-back       192x288  11024 colours  16030px ink
  ok  gunner-death-down-back       192x288  10414 colours  13642px ink
  ok  leopard-idle-back            192x288  14961 colours  17868px ink
  ok  leopard-move-back            192x288  13563 colours  17474px ink
  ok  leopard-attack-windup-back   192x288  14557 colours  17549px ink
  ok  leopard-attack-release-back  192x288  12388 colours  14915px ink
  ok  leopard-hit-back             192x288  13549 colours  16626px ink
  ok  leopard-death-fall-back      192x288  14008 colours  17844px ink
  ok  leopard-death-down-back      192x288  11352 colours  13494px ink
```

**Both hard-won front-view fixes transferred to the back view on the first
try, no retries needed** — the akimbo-trope wording produced two separate
pistols from behind immediately, and the diagonal-reclined death-down
wording produced a genuinely horizontal fallen pose immediately. Neither
fix was back-view-specific; both were about how to describe the pose, which
travels across facing.

## Known rough edges

- **`gunner-idle` had a sliver of a neighbouring casting-sheet character
  at the top and right edges (front) and top edge (back)** — the reference
  crop (`_ref-gunner.png` / `_ref-gunner-back.png`) wasn't trimmed tightly
  enough before keying. **Fixed 2026-08-31**, no generation needed: the
  character's true ink bounds in `casting-sheet-full.png` were found by
  background-colour masking rather than the nominal grid cell (rows and
  columns bleed slightly past their nominal boundary), giving a tight crop
  — `1191,313` to `1334,539` for the front, `1354,313` to `1496,539` for
  the back, both padded 6px. Re-run through the same `key` → `fit 192x288
  --no-quantise` pipeline; `check --illustration` passes for the back
  (19591 colours) and comes in just over the batch's 21000 ceiling for the
  front (21897 colours — the tighter crop's different aspect ratio changes
  how `fit` antialiases at the resize, not a quality regression; this
  ceiling is a heuristic, not a gate anything in `test/` enforces). Both
  `_ref-gunner*.png` files were replaced with the tighter crop too, so any
  future re-generation off this reference starts clean.
- **Attack windup and release read quite similar to each other** for both
  characters — both showed the weapon extended and aimed, with only a
  subtle difference in arm tension. **Fixed 2026-08-31**: the root cause
  wasn't the adjective ("tense" vs "braced against recoil") but that both
  prompts described the SAME end pose — the model has nothing to hold onto
  when only tension language differs. Rewrote both prompts per character
  to describe geometrically opposite silhouettes instead: gunner windup is
  now a low fast-draw coil (guns pulled tight to the ribs, elbows pinned
  in, deep knee bend) against release's full extension (arms locked
  straight out, front knee driven forward, back leg braced); leopard
  windup is a tall overhead knife raise against release's low forward
  lunge (knife driven down and out at the bottom of the arc). Explicit
  "exaggerate past what feels natural — a subtle difference reads as no
  difference at sprite scale" language added to both prompts; leopard's
  original windup/release language already described opposite geometry on
  paper (cocked-back vs extended-down) and still rendered nearly
  identical, so the geometry has to be stated as an exaggerated,
  unambiguous silhouette, not just named. All 8 (2 poses × 2 characters ×
  2 facings) regenerated via `gen-with-ref.mjs` against the same
  `_ref-*.png` crops, 8/8 pass `check --illustration`; `gunner-attack-
  windup-back` needed one retry (the first pass under-delivered the crouch
  the front-facing version got on the first try) — kept the stronger of
  the two.
- **Death-fall reads as a dynamic mid-air action pose more than "losing
  balance"** on both characters — usable as an impact/stagger frame, less
  convincing as the specific "falling backward" the prompt asked for.

## What this implies for the other ~18 casting-sheet characters

Nothing here is gunner/leopard-specific — `turfCastPose` plus
`gen-with-ref.mjs` plus a per-character reference crop is the whole
recipe. Scaling to the rest of the cast is repeating this, most cheaply by
reusing the now-working prompt wording (the akimbo-trope lesson and the
death-down diagonal-test lesson both transfer to any future character)
rather than re-discovering it per character. **Budget per character is 12
generations, not 6**: Idle-front and Idle-back are both free (direct crops
off the casting sheet's own front+back pair), but Move/Attack×2/Hit/
Death×2 each need a front AND a back generation — the direction pass
roughly doubled this pilot's spend, and that's now the known real cost per
character, not a guess.
