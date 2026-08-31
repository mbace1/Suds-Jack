# TURF — the art request

One document to hand to whoever makes the art — a person, Codex, or the Nano
Banana pipeline. `turf/GDD.md` and `turf/PRODUCTION_PIPELINE.md` are the design
canon; this is the *what, the look, and the steps* for the six Milestone 1
archetypes, written so it works from alone.

**Current state: everything on screen is code-drawn placeholder** — flat
canvas silhouettes, no image assets, `turf/js/render.js`'s `drawUnit`. That
stays live until someone actually wires a sprite renderer in (§6 says why
that's a separate step). What this document asks for are **real, cuttable
sprite plates** — not mood-board references this time: generated on a flat
magenta key, meant to go through `kindling/tools/cut.mjs`'s key → fit → check
pipeline (§5) and come out the other end as actual pixel art, the seed for a
hand pass in Aseprite for whatever frames aren't generated (`PRODUCTION_PIPELINE.md`
§4's own plan — "AI-assisted generation for placeholder sprites now...
hand-pixel-art pass in Aseprite later").

---

## 0. Two ways to fill this request

**A — generate it here, one command.** The repo has a working graphics
pipeline (`assets/README.md`): Nano Banana draws the 2D, prompts live in
`assets/manifest.mjs`, bytes land under `assets/out/`. Six entries live there
now under `turf/*` (§4) plus a `turfGrim` style block (§2).

```bash
node scripts/assets.mjs status                 # what exists, missing, drifted
node scripts/assets.mjs gen --dry               # what a run would do, calls nothing
node scripts/assets.mjs gen --only turf         # generate them (costs money)
```

**The only thing missing is a key.** Checked this session:
`generativelanguage.googleapis.com` answers — the 403 it returns is *Google's
own* "unregistered caller" reply (confirmed via `node scripts/assets.mjs
doctor`), not the egress proxy refusing the host, so the route is open and
nothing needs a network-policy change. Set `GEMINI_API_KEY`
(aistudio.google.com/apikey) and all six generate on the spot.

**B — deliver files by hand.** Everything below still applies — the format
rules in §1 and the style in §2 most of all, since a hand-drawn delivery that
ignores the magenta-key convention can't run through the same cutting tool as
a generated one.

---

## 1. The format: what makes it CUTTABLE

An asset described in a chat, or pasted as an inline picture, cannot be cut
into the game — this has cost other projects in this repo two lost batches
already (`piritori/ART_REQUEST.md` §0.1). Every plate, generated or hand-drawn:

- **PNG, sRGB, full resolution** — never a screenshot, never re-compressed.
- **Flat solid magenta `#FF00FF` background, edge to edge.** Not near-black,
  not a gradient, not a vignette — a single flat colour with nothing else on
  it, because that is the one colour `kindling/tools/cut.mjs key` turns into
  real alpha (with despill, so the antialiased fringe a model leaves around
  every edge doesn't survive as a pink halo). `#FF00FF` must never appear on
  the subject itself — no magenta cloth, no magenta highlight.
- **2:3 portrait**, not square — a standing figure in a 1:1 frame either gets
  cropped or leaves most of the square empty. Same call `piritori/fig-you-stand`
  already made for the same reason; `assets/manifest.mjs`'s six `turf/*-plate`
  entries are set to `aspect: '2:3'`.
- **No ground shadow, no cast shadow onto the magenta** — a shadow is a soft
  gradient sitting on the key colour, and `key` cannot despill what it can't
  tell apart from the background it's erasing.
- Named after the id it answers (`blade-plate.png`, `grunt-blunt-plate.png`),
  subject clear of the frame edges, no labels/captions/frames/variant grids.

**On pose — deliberately not a T-pose.** T-pose is only a requirement for
anything headed to Meshy for rigging (`ART_PIPELINE.md` §0's rule). TURF has
no 3D/rig plan right now — it's a 2D canvas tactics game — so these are asked
for in a natural ready/alert stance instead, the pose an Aseprite artist would
actually want to trace from. **If a 3D or Godot direction is ever decided for
TURF**, re-request in T-pose per that doc's rule before sending anything to
Meshy; don't assume these plates work for that without redoing them.

---

## 2. The style: Metal Slug Tactics' TECHNIQUE, not its content

TURF's GDD already names Metal Slug Tactics as an influence — "clean
isometric pixel-art silhouette and readability language... re-skinned toward
gritty realism rather than pulpy cartoon war-comic energy." That line is the
whole brief: borrow MST's **rendering discipline**, not its subject matter.

**What "MST technique" means concretely:**
- A **hard 1px black outline** carries the whole silhouette — the shape has
  to read in outline alone, because at this game's scale (a unit on an 11×9
  isometric grid) that outline is most of what a player actually sees.
- **Flat fills, at most two shade steps per surface** (a base tone and one
  shadow tone) — no gradients, no soft airbrushed shading, no anti-aliased
  edges. This is the same "Master System rule" the rest of this repo's pixel
  art already follows (`CLAUDE.md`: "the shape has to live in the silhouette
  because there is no shading to put it in").
- **Strong per-faction colour-blocking**, readable at a glance from across
  the board — trim/gear colour, not photographic rim-lighting (a magenta-key
  plate has no implied light source to rim-light against; the faction colour
  is a flat region on the cloth, not a lighting effect).

**What stays TURF's own, not MST's:** Nordic 90s street-crime subject
matter, muted and desaturated — Insomnia/Trainspotting register, not a war
comic. Cold blue-cyan (`PAL.PLAYER` **#6fb8d9**) trim for the operator squad,
warm rust-orange (`PAL.ENEMY` **#c9663f**) trim for the rival crew — read
straight off `turf/js/palette.js`, so a screen with both factions on it
reads warm-vs-cold at a glance the same way the in-game silhouettes already
do.

```js
// assets/manifest.mjs
turfGrim: `TURF house style. Pixel art in the register of Metal Slug
Tactics' character sprites — not its cartoon war-comic content, its
TECHNIQUE: a hard 1px black outline carrying the whole silhouette, flat
colour fills with at most two shade steps per surface (a base tone and one
shadow tone — no gradients, no soft airbrushed shading, no anti-aliased
edges), strong per-faction colour-blocking readable at a glance from a
distance, since this is seen small on an isometric tactics grid. Nordic
90s street-crime subject matter, muted and desaturated — Insomnia /
Trainspotting register, not a war comic.

THE BACKGROUND IS A FLAT SOLID MAGENTA #FF00FF filling the entire frame
around the subject — no gradient, no texture, no vignette, no cast shadow
on it. This is a cutting key, not a colour choice, and #FF00FF must never
appear anywhere on the subject itself (skin, cloth or metal). The subject
is otherwise alone in frame: no set dressing, no ground plane, no text, no
logos, no UI, no watermark.`,
```

`turf/art-src/palette.json` is the matching **art palette** — now **thirty-two
colours** (doubled 2026-08-28, see §2.1) that `fit --palette` (§5) snaps a
generated plate to. It is deliberately **not** `turf/js/palette.js` — that
`PAL` object is the whole UI+terrain+HUD palette, and a character sprite has
no business quantising against floor-tile greys.

---

## 2.1 First-draft feedback (2026-08-28)

The owner sent a Nano Banana casting sheet — ~20 characters, front+back,
generated outside this pipeline — as a first look at the register before
spending credits on the actual six. Two things learned from it, folded back
into this document rather than left as a one-off conversation:

- **The palette was too small.** The sheet's variety — several hair colours,
  a second skin tone, denim, sneakers, chains — has nowhere to live in a
  fourteen-colour palette built for streetwear-plus-faction-trim alone.
  Doubled to thirty-two (`turf/art-src/palette.json`): a second skin ramp,
  four hair tones, an olive and a tan cloth ramp alongside the original
  neutral, denim, a third metal step, pale highlights on both faction ramps,
  and three non-faction accent colours (white/red/gold) for the sneaker
  stripes and jewelry that showed up on nearly every figure. Existing keys
  keep their original values; everything is additive.
- **Casting specific characters to specific archetypes is deliberately not
  locked here yet.** The Milestone 1 class list (`blade`/`niner`/`wrench` /
  three grunt variants) may still change, and animated frames are a later
  pass anyway — so this document keeps asking for the six archetypes by
  *role*, not by a specific look pinned to a specific character off that
  sheet. Revisit this section once the roster settles.
- **Shading ran richer than the two-step rule** on that sheet — several
  jackets read with three or four visible tonal steps rather than a flat
  base+shadow. §2's flat-fill rule stays the target regardless, because it's
  what actually cuts clean through `fit`'s palette-snap (§5) rather than
  muddying into banding; a future batch should say so explicitly in the
  prompt rather than assume the style block alone holds the line.

## 2.2 Multi-frame animation sheets: tested, not just theorised (2026-08-28)

§6 predicted a multi-pose sheet from a single generation would be unreliable
and asked for one key pose per archetype instead. Three owner-supplied
candidate animation sheets (IDLE/MOVE/ATTACK/HIT/DIE rows, front+back, all
outside this pipeline) got run through the real tools — `key`, then `fit
--palette` + `check` on an extracted frame — rather than judged by eye. The
prediction held, with a sharper, now-measured shape to it:

- **IDLE and MOVE rows are genuinely usable as delivered.** Frame pitch is
  tight and consistent (measured center-to-center spacing: 108–123px across
  all three sheets' IDLE rows, 161–162px on one), and a cropped frame put
  through the full `key → fit 32x40 --palette → check` pipeline came back
  **`1/1 usable`** — real, cuttable pixel art, not just a clean-looking
  composite.
- **ATTACK/HIT/DIE rows fail for two separate, independently confirmed
  reasons, on every sheet tested:**
  1. **Motion-trail and blood FX get eaten by `key`.** They're rendered as
     soft, partially-translucent effects blending toward the magenta
     background in the source image, and `key`'s magenta-ratio test can't
     tell "faded to background" from "background." Severity scales with how
     opaque the model drew the effect — one sample kept a faint ghost of a
     slash trail near the blade where the paint was more solid, while the
     rest of the same trail (and every blood-splatter burst tested, on all
     three sheets) vanished outright. This isn't a `key` bug to fix; a
     translucent effect keyed against a flat colour is an unsolvable
     conflict, which is exactly why every other game in this repo draws
     slash trails/blood/muzzle flashes in code (hyperdagger's DebrisPool,
     dropcabal's tracers) and never bakes them into sprite art.
  2. **Frame pitch on these rows isn't uniform.** Measured center-to-center
     spacing on ATTACK rows ranged 129–222px *within a single sheet*, and DIE
     rows consistently widen frame-to-frame (e.g. 147→198px, 203→239px,
     159→209px across the three sheets) rather than holding a pitch. A
     single fixed-`--cell` `slice` call cannot auto-extract these; each frame
     would need hand-cropping regardless of how clean the art inside it is.
  - One sample also left stray pixel debris from its own column-number
    captions after keying — the concrete failure §1's "no labels/captions on
    the plate" rule exists to prevent.
- **What this changes going forward:** §6 already didn't ask for multi-pose
  sheets as the default plan, for a different reason (character drift across
  poses). This adds a second, harder reason that applies even when a sheet
  holds together visually: **never bake motion FX into a plate meant for
  keying**, full stop, on IDLE/MOVE sheets or single key-pose plates alike —
  say so explicitly in the prompt going forward, the same way "no ground
  shadow" is already said explicitly. IDLE/MOVE-style sheets remain a
  reasonable ask when they come up; ATTACK/HIT/DEATH stay single-pose,
  FX-free requests per §6's original plan, cut and hand-finished in Aseprite.

## 2.3 The casting-sheet style — now the reference, not a first draft (2026-08-31)

The owner delivered two full casting sheets — six characters at a larger scale
on one, twenty on the other, every figure a front+back turnaround pair on the
same flat magenta this pipeline keys on — and asked for this exact rendering
to become the target. They are committed at
`turf/art-src/reference/casting-sheet-1.png` and `casting-sheet-2.png`, so
anyone writing a prompt against this document can look at them directly
rather than read a description of them.

**This supersedes §2's two-shade-step rule.** Every figure on both sheets
carries real tonal range — highlight/midtone/shadow across three or four
visible steps per surface, strand-level hair, simple facial shading — not a
flat base+shadow fill. §2.1 caught this same richness on the first-draft
sheet and asked a future batch to hold the flat-fill line explicitly; the
owner has now done the opposite on purpose, delivering two full sheets in
the richer register and asking for it by name. The hard outline and
silhouette-first read stay — that is still what carries at the game's actual
on-board scale — but "at most two shade steps" is retired as the ask for the
six archetype plates. `assets/manifest.mjs`'s `turfGrim` style block and §4's
six prompts below are rewritten to this register.

**Checked against the real pipeline, not just eyeballed.** Six figures
cropped from these sheets — one matched to each of §4's archetypes — were
run through the actual `key → fit --palette turf/art-src/palette.json →
check` pipeline this session: **6/6 came back real cuttable pixel art** —
binary alpha, 17–24 colours each (comfortably inside the 32-colour art
palette), no semi-transparent fringe. The richer shading was never a keying
risk, only a style question, and it survives quantisation intact.

**Two real gaps that same crop test found, worth stating so a future batch
doesn't repeat them:**
- **No faction trim.** Every figure on both sheets is neutral streetwear —
  no cold blue-cyan, no warm rust-orange. Nothing on these sheets
  demonstrates §3's colour-block rule, so a prompt written against this
  reference still has to state the trim colour explicitly; it does not come
  along for free just by pointing at the sheet.
- **A crop from a multi-character sheet drags its neighbour in.** Three of
  the six test crops caught a sliver of the adjacent figure at a frame edge
  — a boot at the top, a weapon tip at the side — because the sheet packs
  figures edge to edge. That is a crop problem, not a `key`/`fit` problem,
  and it is why §4's prompts ask for one isolated figure per generation
  rather than "crop this out of a sheet": a model asked to draw a single
  figure alone on magenta has no neighbour to leak.

**Casting stays loose, per §2.1.** These sheets are a style and fidelity
reference, not a lock to a specific look per archetype — the class list may
still change and likeness is decoupled from class (GDD §5.1) — so §4's six
prompts keep describing role and pose, now matching this richer rendering
register, the same way they always described role and pose against the
flatter one.

---

## 3. Colours and roles, read off the game's own numbers

A plate that disagrees with the game's own numbers is a reference for a
different game — every stat and weapon below is read directly from
`turf/data/*.json`.

### 3.1 Operators (player squad, `turf/data/units.json`)

| id | archetype | weapon | stat | look |
|---|---|---|---|---|
| `turf/blade-plate` | melee | knife (dmg 4, rng 1) | 9 hp, move 4 | fast, close-quarters |
| `turf/niner-plate` | ranged | pistol (dmg 2, rng 5) | 8 hp, move 4 | steady, mid-range |
| `turf/wrench-plate` | control | pipe (dmg 1, rng 1, knockback 2) | 10 hp, move 3 | heaviest, built to shove |

### 3.2 Rival grunts (`turf/data/enemies.json`)

| id | archetype | weapon | stat | look |
|---|---|---|---|---|
| `turf/grunt-blunt-plate` | melee | bat (dmg 2, knockback 1) | 5 hp, move 3 | rangy, swings wide |
| `turf/grunt-handgun-plate` | ranged | handgun (dmg 2, rng 5) | 4 hp, move 3 | the leanest of the six |
| `turf/grunt-shotgun-plate` | ranged | shotgun (dmg 4, rng 2, knockback 1) | 5 hp, move 3 | bulkiest, built for close range |

---

## 4. The six prompts (`assets/manifest.mjs`)

```
turf/blade-plate:
A lean street operator holding a fixed-blade knife low and ready, weight
forward like they close distance fast. Dark practical streetwear (jacket,
boots), hood down, with cold blue-cyan (#6fb8d9) trim on the jacket
zip/cuffs/laces as the faction colour-block. Pixel art rendered with the
tonal richness of a real character casting sheet — highlight/midtone/shadow
modelling, strand-level hair — not a flat two-tone fill, carried by a hard
clean 1px outline at the silhouette edge. Standing three-quarter view, whole
body, feet together and clear of the bottom edge (no ground shadow), ALONE
IN FRAME with nothing else entering from any edge, centred on a FLAT SOLID
MAGENTA #FF00FF background — no text, no logos, no UI.

turf/niner-plate:
A street operator sighting down a pistol held two-handed at chest height,
calm and settled rather than lunging — this one plays the long game. Dark
practical streetwear, cold blue-cyan (#6fb8d9) trim on the jacket/gloves as
the faction colour-block. Pixel art rendered with the tonal richness of a
real character casting sheet — highlight/midtone/shadow modelling,
strand-level hair — not a flat two-tone fill, carried by a hard clean 1px
outline at the silhouette edge. Standing three-quarter view, whole body,
feet together and clear of the bottom edge (no ground shadow), ALONE IN
FRAME with nothing else entering from any edge, centred on a FLAT SOLID
MAGENTA #FF00FF background — no text, no logos, no UI.

turf/wrench-plate:
The heaviest-built of three street operators, gripping a length of pipe in
both hands like a bar about to swing — built for a shove, not a stab. Dark
practical streetwear, wider stance than a lean fighter, cold blue-cyan
(#6fb8d9) trim on the jacket as the faction colour-block. Pixel art
rendered with the tonal richness of a real character casting sheet —
highlight/midtone/shadow modelling, strand-level hair — not a flat two-tone
fill, carried by a hard clean 1px outline at the silhouette edge. Standing
three-quarter view, whole body, feet together and clear of the bottom edge
(no ground shadow), ALONE IN FRAME with nothing else entering from any
edge, centred on a FLAT SOLID MAGENTA #FF00FF background — no text, no
logos, no UI.

turf/grunt-blunt-plate:
A rangy street thug gripping a baseball bat with a wide, wound-up swing
stance. Rough street clothes, no armour, warm rust-orange (#c9663f) trim on
the jacket/cap as the faction colour-block. Pixel art rendered with the
tonal richness of a real character casting sheet — highlight/midtone/shadow
modelling, strand-level hair — not a flat two-tone fill, carried by a hard
clean 1px outline at the silhouette edge. Standing three-quarter view,
whole body, feet together and clear of the bottom edge (no ground shadow),
ALONE IN FRAME with nothing else entering from any edge, centred on a FLAT
SOLID MAGENTA #FF00FF background — no text, no logos, no UI.

turf/grunt-handgun-plate:
The leanest of a rival street crew, holding a handgun low and loose,
unhurried — this one has range and knows it. Rough street clothes, warm
rust-orange (#c9663f) trim as the faction colour-block. Pixel art rendered
with the tonal richness of a real character casting sheet —
highlight/midtone/shadow modelling, strand-level hair — not a flat two-tone
fill, carried by a hard clean 1px outline at the silhouette edge. Standing
three-quarter view, whole body, feet together and clear of the bottom edge
(no ground shadow), ALONE IN FRAME with nothing else entering from any
edge, centred on a FLAT SOLID MAGENTA #FF00FF background — no text, no
logos, no UI.

turf/grunt-shotgun-plate:
The bulkiest of a rival street crew, a sawn-off shotgun held tight to the
hip, built for a close, ugly fight rather than a clean one. Rough street
clothes, warm rust-orange (#c9663f) trim as the faction colour-block. Pixel
art rendered with the tonal richness of a real character casting sheet —
highlight/midtone/shadow modelling, strand-level hair — not a flat two-tone
fill, carried by a hard clean 1px outline at the silhouette edge. Standing
three-quarter view, whole body, feet together and clear of the bottom edge
(no ground shadow), ALONE IN FRAME with nothing else entering from any
edge, centred on a FLAT SOLID MAGENTA #FF00FF background — no text, no
logos, no UI.
```

---

## 5. The pipeline: plate → real pixel art

Six numbered steps, each one a real command against tools already in this
repo. Nothing here is aspirational — `kindling/tools/cut.mjs` is Piritori's
too (`CLAUDE.md`), and this is the same four-verb tool every other cuttable
asset in this repo already goes through.

1. **Generate.** `node scripts/assets.mjs gen --only turf` (path A) or a
   hand delivery matching §1/§2 (path B). Lands at
   `assets/out/2d/turf-<id>.<hash>.png`.
2. **Look, before spending another step on it.** The owner's own method,
   already established in this repo (`CLAUDE.md`'s Toko Drop diagnosis): a
   reference, then render → LOOK → name what's wrong → redo. Specifically
   check — does the silhouette alone read at small scale (shrink it on
   screen to roughly the size it'll actually appear on the board)? Is
   `#FF00FF` genuinely flat and edge-to-edge, or did the model sneak in a
   gradient/vignette that will despill badly? Redo before cutting anything
   that fails either question — cutting a bad plate just gets you a bad
   sprite faster.
3. **Key.** `node kindling/tools/cut.mjs key <in>.png <out>-keyed.png` — the
   magenta becomes real alpha, despilled.
4. **Fit.** `node kindling/tools/cut.mjs fit <out>-keyed.png <out>-fit.png
   32x40 --palette turf/art-src/palette.json` — downsamples to the native
   sprite grid and snaps every opaque pixel to the sixteen colours in
   `turf/art-src/palette.json`, never to the full UI/terrain `PAL`. **32×40
   is a proposal, not a locked number**: the current code-drawn placeholder
   (`render.js`'s `drawUnit`) reads about 20-24px tall on the internal
   canvas, so a 32×40 sprite is deliberately a bit roomier — real art
   usually wants more headroom than a flat-fill placeholder does — but
   confirm it once one plate is actually cut and looked at next to the
   board, before fitting the other five to match.
5. **Check.** `node kindling/tools/cut.mjs check <out>-fit.png` — **no
   `--cell` flag** for a single 32×40 plate: `--cell` verifies a sheet tiles
   into square N×N cells, and 40 isn't a whole multiple of 32, so passing
   `--cell 32` here fails every single-sprite fit on a dimension question
   that has nothing to do with the art (confirmed directly — six real fits
   run both ways, §2.3). Without `--cell` it confirms binary alpha (no
   semi-transparent fringe left over) and a colour count that actually
   landed on the 32-colour art palette, not just a shrunk illustration that
   happens to be small. A result that fails this is not real pixel art yet,
   whatever it looks like at a glance. (`--cell` is still the right flag for
   an actual multi-frame sheet, per §6.)
6. **Hand off.** The checked plate is the *key pose* per archetype — the
   seed for whatever the rest of §6's frame list needs, drawn by hand in
   Aseprite against it for consistent proportions and palette. This
   document does not ask Nano Banana to generate the other frames directly
   (§6 says why) or wire anything into `turf/js/render.js` (§7 says why
   that's separate).

---

## 6. The animation guide

`PRODUCTION_PIPELINE.md` §2.1's asset spec lists Idle / Walk / Attack / Hit /
Death per unit — written before Milestone 1 confirmed the actual shape of
the game, which is **turn-based and tile-snapped**, not real-time free-roam.
§2.2 then replaced theory with a real test of three owner-supplied sheets,
and it sharpened the picture further than "turn-based means a small budget"
did: **idle and move rows came back as genuinely usable multi-frame
sheets — tight, consistent frame pitch, a cropped frame passing the full
pipeline 1/1.** Attack/hit/death rows failed on every sheet tried, but for
two specific, *named* reasons (motion-trail/blood FX defeating the magenta
key; irregular frame pitch on those rows) — not because generating multiple
poses at once doesn't work. That distinction matters: the original plan
below assumed multi-pose consistency itself was the risk, and §2.2 showed it
mostly isn't.

**"Animations like in MST"** (owner direction, 2026-08-31) means real
motion, not a pose held still and blended between tiles. Metal Slug Tactics'
characters visibly breathe at idle and visibly run tile to tile even though
the game underneath is turn-based — the polish is in the motion itself, not
loosened by the turn structure. That raises idle and move from "one frame,
reuse the key pose" to real short cycles, which §2.2 already proved this
pipeline can generate as sheets:

| frame | count | what it's for | how it's made |
|---|---|---|---|
| **Idle** | 2–3 | a subtle breathing/weight-shift loop, not a dead held pose | generated as a real sheet (§2.2 proved this works) |
| **Move** | 3–4 | an actual stride cycle a unit visibly runs through while sliding tile to tile, not one blended mid-step pose | generated as a real sheet (§2.2 proved this works) |
| **Attack** | 2 | windup + impact, weapon-specific: knife lunge, pistol/handgun recoil, shotgun blast, pipe/bat swing-through (also the knockback beat) | single-pose generation, hand-extended in Aseprite — sheets still fail here |
| **Hit** | 1 | a recoil/flinch reaction with real snap — MST's hit reactions read as an impact, not a soft flinch | single-pose generation, hand-extended in Aseprite |
| **Death/KO** | 2 | falling + down, for a collapse with actual follow-through rather than a single static drop | single-pose generation, hand-extended in Aseprite |

**Total per archetype: 10–12 frames** (2–3 + 3–4 + 2 + 1 + 2, up from the
original 4–7 plan) — idle and move are now real generated sheets instead of
single held poses; attack and death keep the original method (single-pose
generation, hand-finished) but each now asks for one more frame than the
original bare minimum (attack 1→2, death 1→2), matching the impact MST
reads with even in a single frame. Hit stays at its original 1 — a single
sharp recoil frame was already the right ask, not a row that needed more.

**Attack/hit/death still don't become sheets, and the reason still holds:**
§2.2's two failure modes are about *what* those rows draw (baked FX, a
swing or a fall that doesn't hold a fixed frame pitch), not about how many
poses are asked for in one image — a bigger or better-prompted sheet doesn't
fix a translucent slash trail defeating a hard alpha key. The reliable ask
for those three rows is still one strong single-pose plate per beat,
hand-extended in Aseprite against `turf/art-src/palette.json`'s colours —
5 frames × 6 archetypes = 30 frames of bounded manual work, on top of the
generated idle/move sheets.

**Laying out a generated idle/move sheet:** equal-size square cells on one
flat-magenta canvas, then `node kindling/tools/cut.mjs slice <sheet>.png
<dir> <cell-px> idle1,idle2,idle3,move1,move2,move3,move4` cuts it into one
file per named cell — a real tool call already in this repo. Attack/hit/death
stay single-pose, FX-free requests, generated and cut one at a time.

**Not yet in `assets/manifest.mjs`.** This section raises the *ask* for
idle/move; it does not by itself add the twelve sheet specs (2 rows × 6
archetypes) that would make `node scripts/assets.mjs gen --only turf` (§0
Path A) actually produce them — that command today still only generates the
six single key-pose stills from §4. Writing twelve real sheet prompts (one
per archetype per row, each needing its own careful frame-by-frame
description to hold character consistency across the sheet) is real
authoring work of its own, not implied by this document raising the target.
Until those specs exist, an idle/move sheet is either hand-delivered (§0
Path B) or a follow-up task against this section.

---

## 7. Not requested yet

- **No environment/backlot plate.** The channel/cover geometry
  (`turf/data/encounters.json`) is still a Milestone 1 fixed layout being
  balanced (see `turf/VERSIONS.md`'s open item on the bot-playthrough
  difficulty) — a reference plate for it now would likely need redoing once
  the layout settles. Ask again once Phase 2's variable encounters land.
- **No elite/boss variant.** `PRODUCTION_PIPELINE.md` §2.2 calls a boss a
  "Phase 1 stretch goal, not a requirement" — same reasoning, don't spend
  credits ahead of the design.
- **No runtime sprite integration.** Even once cut, quantised and checked,
  wiring an actual sprite renderer into `turf/js/render.js` (replacing
  `drawUnit`'s canvas silhouettes with drawImage calls, handling per-frame
  timing, 8-direction-vs-mirroring for the isometric facing) is a separate,
  deliberate engineering change — not implied by generating or cutting art.
  Say the word when the plates exist and this becomes its own task.
