# TURF cast-pose pilot — two characters, seven frames each

Answers a direct question: "how do we expand these to include animations
per character?" Rather than answer in the abstract, this pilots the actual
pipeline on two of the owner's own casting-sheet characters (not a
synthesised archetype — the owner's correction: "there are just character
models, no archetypes... pick 2 from the sheets I provided and expand"),
each carried through Idle/Move/Attack(×2)/Hit/Death(×2) — seven frames,
matching `ART_REQUEST.md` §6's frame table with the owner's own call on
richness (2 frames each for Attack and Death, not 1).

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

Then the same cut pipeline as the archetype plates (§2.4's fix — 192×288,
`--no-quantise`, `check --illustration`), just with a wider colour ceiling
(see below).

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

## Known rough edges, not fixed in this pilot

- **`gunner-idle` has a sliver of a neighbouring casting-sheet character
  at the left edge** — the reference crop (`_ref-gunner.png`) wasn't
  trimmed tightly enough before keying. Cosmetic, fixable with a tighter
  crop or a `trim` pass; not fixed here because it doesn't block judging
  the pilot's actual question (does identity hold across poses).
- **Attack windup and release read quite similar to each other** for both
  characters — both show the weapon extended and aimed, with only a subtle
  difference in arm tension. A real two-beat read (clear draw-back, then
  clear extension/impact) would need another prompt pass; not attempted
  here since the pilot's job was proving identity-holding, not perfecting
  pose staging.
- **Death-fall reads as a dynamic mid-air action pose more than "losing
  balance"** on both characters — usable as an impact/stagger frame, less
  convincing as the specific "falling backward" the prompt asked for.

## What this implies for the other ~18 casting-sheet characters

Nothing here is gunner/leopard-specific — `turfCastPose` plus
`gen-with-ref.mjs` plus a per-character reference crop is the whole
recipe. Scaling to the rest of the cast is repeating this, most cheaply by
reusing the now-working prompt wording (the akimbo-trope lesson and the
death-down diagonal-test lesson both transfer to any future character)
rather than re-discovering it per character.
