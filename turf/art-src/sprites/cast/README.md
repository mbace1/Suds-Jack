# TURF cast-pose pilot — four characters, two facings, seven frames each

Answers three direct questions in sequence. First: "how do we expand these
to include animations per character?" — piloted on two of the owner's own
casting-sheet characters (not a synthesised archetype — the owner's
correction: "there are just character models, no archetypes... pick 2 from
the sheets I provided and expand"), each carried through Idle/Move/
Attack(×2)/Hit/Death(×2) — seven frames, matching `ART_REQUEST.md` §6's
frame table with the owner's own call on richness (2 frames each for
Attack and Death, not 1). Second, once that sheet was shown: "are these
taking into consideration the non-cardinal directions? NE, NW, SE, SW?" —
correctly catching that the first pass was front-facing only, answered by
generating the back half of every pose (14 more frames, 28 total). Third,
once the branch/merge situation was flagged and handed off: "you can focus
on delivery of art" — answered by scaling the proven recipe to two more
characters, **hammer** and **bottle**, same 28-frame shape each, bringing
the roster to four characters / 56 frames. See "The direction question"
below for why two facings, not four or eight, and "Scaling to hammer and
bottle" for what changed (and broke, and got fixed) going from 2 to 4.

## The four characters

Picked for range, not for fitting a TURF stat role (there isn't one here):
- **gunner** — row 2, column 5 of `turf/references/casting-sheet-full.png`:
  a stocky bald man, tattoo sleeves, white tank top, akimbo pistols.
- **leopard** — row 4, column 2 of the same sheet: a woman with blonde
  hair, an oversized leopard-print coat, a knife.
- **hammer** — row 2, column 2: a heavyset bald man in a dark olive puffer
  jacket, a two-handed sledgehammer.
- **bottle** — row 3, column 3: a lean unshaven man in a worn trench coat,
  gripping a glass bottle — an improvised weapon rather than a real one,
  picked deliberately for contrast with the other three.

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

## check results — 56/56 usable, wider ceiling than the archetype plates

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

Hammer and bottle, 28/28 (`--colours 22000` — `bottle-idle` measured
21762, just over the gunner/leopard batch's `21000` ceiling, so this is
the ceiling that actually fits four characters' worth of real data):

```
  ok  hammer-idle              192x288  15903 colours  33092px ink
  ok  hammer-move               192x288   7968 colours  17679px ink
  ok  hammer-attack-windup      192x288   8958 colours  22611px ink
  ok  hammer-attack-release     192x288  12856 colours  23930px ink
  ok  hammer-hit                192x288   8429 colours  20318px ink
  ok  hammer-death-fall         192x288   6887 colours  13505px ink
  ok  hammer-death-down         192x288   6856 colours  11614px ink
  ok  hammer-idle-back          192x288  10414 colours  27044px ink
  ok  hammer-move-back          192x288   6415 colours  22732px ink
  ok  hammer-attack-windup-back 192x288   7153 colours  19223px ink
  ok  hammer-attack-release-back 192x288  6742 colours  21049px ink
  ok  hammer-hit-back           192x288   5610 colours  21444px ink
  ok  hammer-death-fall-back    192x288   4677 colours  12718px ink
  ok  hammer-death-down-back    192x288   4596 colours  10709px ink
  ok  bottle-idle               192x288  21762 colours  28535px ink
  ok  bottle-move               192x288  14228 colours  21689px ink
  ok  bottle-attack-windup      192x288  13307 colours  21495px ink
  ok  bottle-attack-release     192x288  14931 colours  25238px ink
  ok  bottle-hit                192x288  14404 colours  22583px ink
  ok  bottle-death-fall         192x288  11006 colours  14470px ink
  ok  bottle-death-down         192x288  10714 colours  12522px ink
  ok  bottle-idle-back          192x288  15075 colours  25124px ink
  ok  bottle-move-back          192x288  11155 colours  21473px ink
  ok  bottle-attack-windup-back 192x288  10760 colours  21804px ink
  ok  bottle-attack-release-back 192x288   8687 colours  15015px ink
  ok  bottle-hit-back           192x288  10424 colours  20107px ink
  ok  bottle-death-fall-back    192x288   9773 colours  15346px ink
  ok  bottle-death-down-back    192x288   9020 colours  12234px ink
```

## Known rough edges

- **Fixed**: `gunner-idle` carried a sliver of a neighbouring casting-sheet
  character at its left edge (`_ref-gunner.png` wasn't trimmed tightly
  enough before keying). Re-cropped tighter (124px wide instead of 170)
  and re-cut — clean now, no regeneration needed since Idle is a direct
  crop. `gunner-idle`'s colour count changed slightly as a result (20111 →
  19269) — expected, a tighter crop is a smaller, slightly different image.
- **Attack windup and release read quite similar to each other** on
  gunner/leopard — both show the weapon extended and aimed, with only a
  subtle difference in arm tension. Hammer's pair reads more distinctly
  (a full overhead raise vs. a driven-through downward swing) since a
  swung weapon's two beats are physically more different than a pistol's —
  worth picking pose language that leans on the WEAPON's own motion shape
  rather than one generic windup/release template for every archetype.
  Not revisited for gunner/leopard here.
- **Death-fall reads as a dynamic mid-air action pose more than "losing
  balance"** on all four characters — usable as an impact/stagger frame,
  less convincing as the specific "falling backward" the prompt asked for.
  Consistent enough across four different characters that it's probably a
  wording problem worth a real fix pass, not a per-character fluke.

## Scaling to hammer and bottle: two more real defects, both fixed

The gunner/leopard recipe transferred directly — same `turfCastPose`
block, same `gen-with-ref.mjs` call shape, same 192×288/`--no-quantise`
cut. Two new, genuinely different defects turned up anyway, each caught by
looking rather than assumed fine because the earlier two defects were:

**`bottle`'s bottle vanished in half his poses.** `CAST_BOTTLE`'s shared
description never actually said he was holding one — an oversight, not a
model failure — so Move/Hit/Death-fall (both facings, 6 frames) came back
with empty hands; only Attack-windup/release and Death-down happened to
keep it because those pose prompts describe gripping it directly. Fixed by
adding "gripping a glass bottle in one hand at all times... never set down
or forgotten" to the shared description and regenerating the 6 affected
frames — clean on the retry. The lesson: a prop that matters to a
character's read needs to be in the SHARED description, not left to
individual pose prompts to keep re-establishing it.

**Three of bottle's six back-facing poses reverted to a front view**
(Move/Hit/Death-fall-back all showed his face, not his back) on the first
attempt, despite the identical "seen from BEHIND" wording that held 6/6
for gunner, leopard, AND hammer's own back set. Checked rather than
patched blind: a plain retry of the same three prompts, no wording change,
came back correctly back-facing 3/3. Conclusion, not assumption — this was
generation variance on this particular character/pose/reference
combination, not a systemic weakness in the back-view instruction (hammer
proved that instruction alone is sufficient, 6/6, same session). Worth
knowing: a `-back` batch isn't reliably 6/6 on the first pass the way the
front batch has been — budget for a look-and-maybe-retry pass, not just a
generate-and-ship one.

## What this implies for the other ~16 casting-sheet characters

Nothing here is character-specific — `turfCastPose` plus `gen-with-ref.mjs`
plus a per-character reference crop is the whole recipe, now proven across
four very different builds (lean/heavy, armed/improvised, male/female).
Scaling to the rest of the cast is repeating this, most cheaply by reusing
the now-working prompt lessons (akimbo-style naming beats geometric
counting; the death-down diagonal self-check; anchor any load-bearing prop
in the shared description, not just the pose text; look at the back set
before assuming 6/6) rather than re-discovering them per character.
**Budget per character is 12 generations, not 6**: Idle-front and
Idle-back are both free (direct crops off the casting sheet's own
front+back pair), but Move/Attack×2/Hit/Death×2 each need a front AND a
back generation — the direction pass roughly doubled the original pilot's
spend, and that's now the known real cost per character across four
characters, not a guess from one.
