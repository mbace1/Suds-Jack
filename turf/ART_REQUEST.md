# TURF — the art request

One document to hand to whoever makes the art — a person, Codex, or the Nano
Banana pipeline. `turf/GDD.md` and `turf/PRODUCTION_PIPELINE.md` are the design
canon; this is the *what, the look, and the steps* for the six Milestone 1
archetypes, written so it works from alone.

**Current state: everything on screen is code-drawn placeholder** — flat
canvas silhouettes, no image assets, `turf/js/render.js`'s `drawUnit`. What
this document asks for are **real, cuttable sprite plates**, generated on a
flat magenta key, meant to go through `kindling/tools/cut.mjs`'s key → fit →
check pipeline (§5) and come out the other end as actual pixel art — the
seed for a hand pass in Aseprite for whatever frames aren't generated
(`PRODUCTION_PIPELINE.md` §4's own plan — "AI-assisted generation for
placeholder sprites now... hand-pixel-art pass in Aseprite later").

**The production plan, as of 2026-08-31 (§8 has the detail): one character,
fully animated and actually in the game, before any of the other five.**
Six archetypes generated in parallel with nobody wired into the engine gets
you six folders of loose PNGs and zero proof the pipeline (art *and* the
engine changes animated sprites actually need — §9 names them) works end to
end. So the order is deliberately narrow: take one pilot character
(recommended: `blade`, §8) to **100% feature complete** — every animation
frame generated or hand-finished, cut, checked, and genuinely playing in the
live game — before spending a single generation on a second character.
Colour variations of that same proven pipeline come next, then the
remaining archetypes as new models. §8 has the staged plan; §9 has what the
engine and process still need beyond art to make that first character real.

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

**SUPERSEDED 2026-08-31 — see §2.3.** The brief below asked for MST's flat
2-shade-step technique. The owner's own reference sheets, seen for the first
time that day, show something richer — 3-4 tonal shading bands with real
material detail — and §2.3 explains why and what actually shipped. Left in
place rather than deleted because §2.1's palette-doubling reasoning and
§2.2's animation-sheet findings both still hold and refer back to it.

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
  **Wrong call, corrected in §2.4**: the richer shading wasn't the problem
  and flattening it wasn't the fix. §2.4 explains what was actually wrong.

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

## 2.3 The style corrected against real references (2026-08-31)

§2's MST brief was written from the GDD's own words, never checked against
an actual picture. The owner then supplied real reference sheets —
`turf/references/`: a ~20-character casting sheet, two detail crops of it,
and a front/back run-cycle sheet for one character — and said to use them as
the target. They are not the casting sheet §2.1 already described in prose;
they are its actual pixels, seen here for the first time.

**Measured against a jacket region, not eyeballed:** 3-4 discrete tonal
bands (a base tone, a soft mid-shadow, a deeper crease/fold shadow, a
highlight), not the two §2 asked for. Real material detail — quilting
seams, worn/scuffed texture, drawstrings, hardware — placed as deliberate
pixels rather than implied. Still a genuine hard-edged pixel grid, still a
dark near-black outline carrying the silhouette, still chibi/SD proportions
— the shift is in tonal range per surface, not in what kind of art this is.

**One place the prompt deliberately contradicts its own reference.** The
reference sheets show a soft cast shadow under the feet, sitting on the
magenta background. That is exactly the kind of alpha gradient §1 already
warns about — `key` cannot separate a soft shadow from the background it is
erasing — so the style block copies the reference's technique and
explicitly withholds its shadow, even though the reference itself has one.

**The current prompt text lives in code, not here.** `assets/manifest.mjs`'s
`turfGrim` style block and the six `turf/*-plate` specs are the literal
source `scripts/assets.mjs` and `scripts/gen-with-ref.mjs` compose from —
reproducing that text in this document a second time is exactly the kind of
duplication that let §2's two-shade-step wording sit uncorrected here after
the actual style had already changed once (§2.1's casting-sheet feedback).
Read the manifest for the exact current wording; §4 below states the
content facts (pose, weapon, faction colour) that do not change with style.

**A reusable tool came out of doing this properly.**
`scripts/gen-with-ref.mjs <asset-id> <ref-image> [out]` attaches an
arbitrary local reference image to a manifest asset's composed prompt —
`assets.mjs`'s own `ref` field only chains to another asset this pipeline
already generated, which cannot serve an owner-supplied photo. Full
provenance, findings and the two real defects caught along the way (a
shotgun archetype that first drew a knife; a documented prompt/bytes
mismatch caught by checking rather than assumed fine) are in
`turf/art-src/sprites/README.md`.

## 2.4 The delivered plates were low-fidelity because of §5, not §2 (2026-08-31)

The owner looked at the delivered contact sheet next to the real reference
and called it "way too messy and low detail," and asked whether a setting
in this document was asking for that. **Yes — §5 step 4, and it wasn't
subtle.** The raw generation for `blade-plate` is a genuinely good
832×1248 illustration, close to reference quality as generated (see
`turf/art-src/sprites/README.md` for the side-by-side). §5 then downsampled
it to **32×40** and force-snapped every pixel to a **32-colour** palette —
a combined ~99.85% pixel-budget cut plus a hard palette clamp. That is the
right pipeline for genuine retro pixel art. It is the wrong pipeline for
what these references actually are: measured directly (`palettecount.cjs`
over a 55×55 jacket patch), **2574 distinct colours in 3025 pixels** —
smooth anti-aliased digital shading with a pixel-grid *aesthetic*, not a
quantised retro palette. §2.1 saw the same mismatch three days earlier,
correctly named the shading as "richer than the two-step rule," and then
drew the wrong conclusion from it — that the *art* should flatten to fit
the pipeline, rather than that the *pipeline* was the wrong tool for this
art. It wasn't a generation problem either time.

**The fix needed no new tooling.** `kindling/tools/cut.mjs fit` already
takes `--no-quantise` for exactly this case — its own comment names
Piritori hitting the identical mismatch first ("correct for illustration,
where snapping an ink-line painting to fourteen flats destroys it") — and
`check` already takes `--illustration` to stop expecting a 1:1 pixel-art
round trip. §5 below is rewritten to use both. Re-cut (not regenerated —
the existing raw plates were already good) at **192×288**, colours kept as
generated: 6/6 pass `check --illustration --colours 12000` (measured
8357–11975 colours per plate), and the result reads clean at both full
size and shrunk to roughly in-game scale.

`turf/art-src/palette.json`'s thirty-two colours (§2.1) aren't wrong or
wasted — they stay the art spec for anything in this game that *is* meant
to be classic quantised pixel art (tiles, UI, drops). They're simply no
longer what the character plates snap to.

**One honest new cost.** §6's animation guide assumed the remaining
frames (Move/Attack/Hit/Death) would be a hand pass in Aseprite tracing a
flat, ≤32-colour key pose — fast, mechanical work. Tracing a ~9,000-colour
illustration plate at 192×288 to matching fidelity is real character art,
not palette-matching, and is a bigger per-frame ask than §6 currently
states. Not resolved here — flagged for whoever scopes that pass next.
## 2.5 A parallel crop test found the same two gaps a different way (2026-08-31)

Before `gen-with-ref.mjs` existed, a separate pass tried the more obvious
thing first: crop a figure straight out of the owner's casting sheets
(committed at `turf/art-src/reference/casting-sheet-1.png` /
`casting-sheet-2.png`) and run it through `key → fit → check` as-is. Six
crops, one matched to each §4 archetype, all came back technically usable
under the *old* `--palette turf/art-src/palette.json` cut §2.4 has since
retired — confirming the richer shading survives keying fine, which was
never actually the risk (§2.4 already established the risk was the
32-colour snap destroying detail, not the keying step).

Two real gaps that test found, both still worth knowing even though this
isn't the technique that shipped:
- **No faction trim.** Every figure on both sheets is neutral streetwear —
  nothing demonstrates §3's colour-block rule, so it always has to be
  stated explicitly in a prompt rather than assumed to come along for free.
  §4's table already does this for every archetype; independent
  confirmation this was the right call.
- **A crop from a multi-character sheet drags its neighbour in** — a boot
  or weapon tip from the adjacent figure, three times out of six, because
  the sheet packs figures edge to edge. The same failure mode resurfaced
  later in a different spot: `turf/art-src/sprites/cast/README.md` notes
  `gunner-idle`'s reference crop wasn't trimmed tight enough either. Not
  fixed either time yet — worth a `trim` pass or tighter cropping whenever
  someone next touches either.

## 2.6 There are no class archetypes — a "class" is a skill combination (GDD §5.1, revised 2026-08-31)

GDD §5.1 was rewritten this round: `blade`/`niner`/`wrench` (and the three
grunt weapon-profiles) are **starting kits** — an opening weapon and stat
line — not permanent boxes. Past Milestone 1, a unit's actual identity comes
from which skill lines it has picked up at level-ups, drawn from *any* line
regardless of its starting kit, plus whatever weapon it happens to be
holding (the already-shipped v7 loot drops can hand a `wrench`-kit unit a
handgun mid-run). Two units that both started as `blade` can read as
genuinely different builds by the end of a run.

**What that means for art, concretely:** §4's six prompts still describe
role/pose/weapon by *starting kit* — that part hasn't changed, and it's
still the right unit of art production (a starting kit is a real, stable
silhouette; a skill build is not). What changes is what NOT to bake into a
plate: no visual signal that says "this figure is permanently a
melee-only character" beyond the weapon it's shown holding in that one key
pose, because the same body, once in the roster, might end the run holding
something else entirely and playing a hybrid build the plate never depicted.
The colour system already has this covered without extra work — §2.3 and
GDD §5.1 both land on **faction colour only** (cold operator / warm rival)
as the sprite's one accent; there is no secondary "class colour" to paint
on, so nothing here asks for one. A unit's build reads from the UI, not the
sprite.

**A second, separate "no archetypes" finding, about casting rather than
skills:** §8 records the owner correcting this document's own framing —
"there are just character models, no archetypes" — meaning even the *six
weapon-role archetypes* (`blade`/`niner`/`wrench`/three grunts) are this
document's invention to fill Milestone 1's stat table, not how the owner
thinks about the cast. The real cast is the ~20 actual characters on the
casting sheets; §8's pilot cast two of them directly rather than generating
synthetic archetype designs. This section's point and that one are
compatible, not the same: this one says a unit's *build* isn't boxed by its
starting kit; §8's says the *cast itself* isn't boxed by these six designs
either.

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

## 4. The six prompts — content facts only; the exact text lives in code

**`assets/manifest.mjs` is the literal source of truth**, not this section.
Duplicating six evolving prompt bodies in two places is exactly what let
this section quote "flat fills, at most two shade steps" for three days
after §2.3 changed the actual style — a copy nobody was reading stayed
stale while the real one moved. What still belongs here, because it does
NOT change with rendering style, is the content each archetype has to get
right (read straight from §3's stat table) and the accent colour rule:

| id | must be holding | build | faction accent |
|---|---|---|---|
| `turf/blade-plate` | a fixed-blade knife, held low and ready | lean, weight forward | cold blue-cyan `#6fb8d9` |
| `turf/niner-plate` | a pistol, two-handed at chest height, calm | steady | cold blue-cyan `#6fb8d9` |
| `turf/wrench-plate` | a length of pipe, gripped like a bar to swing | heaviest of the three operators, widest stance | cold blue-cyan `#6fb8d9` |
| `turf/grunt-blunt-plate` | a baseball bat, wide wound-up swing stance | rangy | warm rust-orange `#c9663f` |
| `turf/grunt-handgun-plate` | a handgun, held low and loose, unhurried | leanest of the three grunts | warm rust-orange `#c9663f` |
| `turf/grunt-shotgun-plate` | a compact sawn-off **pump-action shotgun** — a firearm, never drawn as a knife (see `turf/art-src/sprites/README.md` for why that note exists) | bulkiest of the three grunts | warm rust-orange `#c9663f` |

Every archetype: standing three-quarter view, whole body, feet together and
clear of the bottom edge, centred on frame, no text/logos/UI. The accent is
a clear trim block — zip, cuffs, a patch, a stripe — never the whole
outfit, per §2.3.

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
   192x288 --no-quantise` — downsamples with area averaging (not a hard
   palette snap) and forces binary alpha. **§2.4 explains why this changed
   from `32x40 --palette turf/art-src/palette.json`**: this art is a
   thousands-of-colours illustration with a pixel-grid aesthetic, not
   classic quantised pixel art, and forcing it through a 32×40/32-colour
   crush is what made the first delivery read as "messy and low detail."
   192×288 is 2:3 at 6× the linear size of the original 32×40 target —
   confirmed against a real fit (§2.4) to still read clean shrunk to
   roughly in-game scale, not just picked as a round number.
5. **Check.** `node kindling/tools/cut.mjs check <out>-fit.png
   --illustration --colours 12000` — **no `--cell` flag on a single
   already-cropped sprite** (that question is for a multi-sprite SHEET).
   `--illustration` turns off the 1:1-pixel-art round-trip test (this art
   is never meant to survive a half-scale-and-back unchanged) and raises
   the default colour ceiling from 64 to 4096; `--colours 12000` raises it
   again to match what this art actually measures at (8357–11975 per plate
   across the six Milestone 1 archetypes — still capped, so a plate that
   comes back as a near-photograph rather than an illustration still
   fails). What still fails regardless: any semi-transparent pixel (alpha
   must be binary) and a non-whole `--cell` count if that flag is used at
   all.
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

**Superseded by a real pilot, not just a bigger ask.** The paragraph and
table both used to stop at *asking* for more frames and assuming the
remaining work would be a hand pass in Aseprite, because §2.2's finding was
read as "multi-pose generation doesn't work, full stop." §8 tested that
more precisely and found a narrower, more useful truth: **baking multiple
poses into one generated image doesn't hold together** (still true, see
below) **but generating each pose SEPARATELY, each conditioned on a
reference image of the same character (`scripts/gen-with-ref.mjs`), holds
identity reliably** — proven on two real characters across all seven poses,
attack/hit/death included, not just idle/move. That changes what "the
remaining frames are a hand pass in Aseprite" meant: for a character with a
usable reference image, every pose in the table below can be a real
generation, not a trace.

| frame | count | what it's for | how it's made |
|---|---|---|---|
| **Idle** | 1 | the reference crop itself, run through `key→fit`, no generation step — the highest-fidelity idle this pipeline can produce, and free (§8) | direct crop of the character's own reference art |
| **Move** | 1 | a single dynamic mid-stride pose, not a walk cycle — §8's pilot deliberately didn't attempt a multi-frame cycle | `gen-with-ref.mjs` against the character's reference |
| **Attack** | 2 | windup + release/impact, weapon-specific | `gen-with-ref.mjs`, proven on two real weapon types (akimbo pistols, a knife) |
| **Hit** | 1 | a recoil/flinch reaction | `gen-with-ref.mjs` |
| **Death/KO** | 2 | falling + down, with an explicit "are the feet still under the hips" failure test baked into the prompt (§8 — needed on the first try, both characters) | `gen-with-ref.mjs` |

**Total per character: 7 poses, ×2 for the back facing (§8) = 14 frames,
costing 12 generations** (Idle is free in both facings — a direct crop
either way; the other six poses each need a front AND a back generation,
§8's measured real cost, not the guess this section used to make). This is
the owner's own frame-richness call (2 for Attack and Death, not 1), and
it's not a plan anymore for two of the roster — it shipped, see §8.

**What §2.2 still gets right, and what it doesn't apply to anymore:** its
two failure modes (baked FX defeating the magenta key; irregular frame
pitch) are about a SHEET — one image trying to hold several poses at fixed
grid cells. Both reasons still hold for that technique, and nothing in §8
contradicts them: §8 never generated a sheet. It generated fourteen
separate 192×288 images, each one pose, each conditioned on a reference
crop for identity — a technique §2.2 never tested because `gen-with-ref.mjs`
didn't exist yet. **The `slice` layout this section used to describe (one
flat-magenta canvas, multiple poses at fixed cells, cut apart afterward) is
not the path that worked** — leaving the tool call here only as a note in
case a future sheet experiment wants it, not as the recommended technique.

**One real gap the pilot didn't close: no idle or move CYCLE.** "Animations
like in MST" above asks for a breathing loop and a real stride cycle, not
one static pose each. §8's pilot deliberately shipped a single Idle
(a free crop) and a single Move (one dynamic pose, its own words: "not a
walk-cycle silhouette") — the lighter, cheaper version, not the MST-cycle
ambition this section states. Getting a real 2–3-frame idle loop and a real
3–4-frame stride cycle is still open work, using the same proven
`gen-with-ref.mjs` per-pose technique, just more poses per character than
the seven §8 budgeted for.

**In `assets/manifest.mjs` for two characters, not six.** §8's pilot
(`turf/cast-gunner-*` / `turf/cast-leopard-*`, 28 ids) is real, committed,
and generates via `node scripts/assets.mjs gen --only turf` (§0 Path A) —
but that's two of the owner's own cast characters, piloting the technique,
not the six archetype plates from §4. Extending this to `blade`/`niner`/
`wrench`/the three grunts (or to more of the ~20-character cast, per §2.6)
means writing the same shape of per-pose, reference-conditioned prompts for
each — real authoring work, not implied by the pilot having proven the
technique works.

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
- **No runtime sprite integration — still true for all of it.** Even once
  cut and checked, wiring `turf/js/render.js` to draw sprites instead of
  `drawUnit`'s silhouette (replacing the canvas silhouette with drawImage
  calls, per-frame timing, left/right facing) is a separate, deliberate
  engineering change, not implied by generating or cutting art. §8's pilot
  proved the ART side works for two characters; §9 point 1 found the ENGINE
  side isn't ready for any character yet, pilot included — no positional
  tweening exists to animate a move across, so even a finished sprite set
  has nowhere to play yet. The board itself is orthogonal 4-directional
  (`turf/js/grid.js`'s own comment: "ITB-style rather than an 8-directional
  grid"), not isometric 8-way — §8/§9 point 3 settles facing against that
  fact rather than Metal Slug Tactics' own isometric convention.

---

## 8. The production plan: one pilot proven, then colour variants, then new models

Six archetypes generated and cut in parallel, with nobody actually wired
into the game, proves nothing except that six PNGs exist. Stage 0 below
answers the real questions — does a character's identity hold across
poses, does the frame count in §6 work, does facing need real art or just
mirroring — before spending credits generating five more characters
against an unproven plan.

**Stage 0 — piloted, and the headline finding is real: it works.**

Not `blade`, and not synthesised to spec: **the owner corrected this
document's own framing first** — "there are just character models, no
archetypes" (§2.6 has the design-side version of the same point). The six
weapon-role archetypes are this document's own invention to fill
Milestone 1's stat table, not how the owner thinks about the cast; the
real cast is the ~20 characters on the casting sheets
(`turf/art-src/reference/casting-sheet-{1,2}.png`), and the pilot cast two
of them directly — the owner's own pick, "you can pick 2 from the sheets I
provided and expand": **gunner** (a stocky bald man, tattoo sleeves, akimbo
pistols) and **leopard** (a woman in an oversized leopard-print coat, a
knife). Full prompts, defects, fixes and check results are in
`turf/art-src/sprites/cast/README.md`; the ids are `turf/cast-gunner-*` /
`turf/cast-leopard-*` in `assets/manifest.mjs`, already generating via §0
Path A.

What actually shipped, checked against a real "100% feature complete" bar
— every line below, not just generation:
1. **Identity held across poses.** §6's technique (`gen-with-ref.mjs`,
   `turfCastPose` style block, a reference-image crop per character) proved
   reliable across seven poses per character, not just idle/move — the
   real, harder version of §2.2's original open question.
2. **Both facings.** The owner asked directly whether the pilot covered
   NE/NW/SE/SW — it didn't yet, at that point. Answered properly rather
   than assumed: `render.js`'s isometric projection maps the board's 4
   orthogonal directions onto the 4 screen diagonals, so 2 drawn facings
   (front + back), mirrored left/right in code, cover all 4 — matching the
   front+back convention the reference sheets already use. Both hard-won
   front-view prompt fixes (the akimbo-pistol wording, the death-down
   diagonal test) carried over to the back view with no retries needed.
3. **Checked, not just generated.** All 28 frames (14 poses × 2 characters)
   pass `check --illustration` — see the cast README for the full numbers.
4. **Real cost measured, not guessed.** 12 generations per character (Idle
   is a free direct crop in both facings; the other six poses each need a
   front AND a back generation) — §9 point 6 uses this as the basis for
   costing the rest of the cast.

**What Stage 0 did NOT close, named plainly rather than rounded up:**
- **No runtime integration.** Nothing is wired into `turf/js/render.js` yet
  — §7's bullet and §9 point 1 both still apply, to these two characters as
  much as to the other six designs.
- **No idle/move CYCLE.** §6's "animations like in MST" ambition (a real
  breathing loop, a real stride cycle) wasn't attempted — Idle is one free
  crop, Move is one dynamic pose, by design, the cheaper version.
- **Known rough edges** (cast README): `gunner-idle`'s reference crop caught
  a sliver of a neighbouring casting-sheet character (§2.5's crop-bleed
  problem, in a new spot) — **fixed 2026-08-31**, no generation needed: a
  tighter crop straight off `casting-sheet-full.png` (found by locating the
  character's true ink bounds rather than eyeballing a cell, since row/
  column bleed slightly past the sheet's nominal grid), re-run through the
  same `key`/`fit 192x288 --no-quantise` pipeline, both front and back —
  `_ref-gunner.png`/`_ref-gunner-back.png` were replaced with the tighter
  crop too, so any future re-generation off this reference starts clean.
  Attack windup/release reading too similar — **fixed 2026-08-31**: the two
  prompts described the same end pose with only tension language differing
  ("tense" vs "braced against recoil"), which the model can't hold onto.
  Rewritten to describe geometrically opposite silhouettes instead (gunner:
  low fast-draw coil vs full-extension lunge; leopard: tall overhead raise
  vs low forward lunge), plus an explicit instruction to exaggerate the
  pose past what feels natural. All 8 (2 poses × 2 characters × 2 facings)
  regenerated, 8/8 usable. Still open, genuinely unfixed without another
  generation: death-fall reads as a dynamic action pose more than "losing
  balance." Doesn't block judging the pilot's actual question (does
  identity hold), and would need its own prompt pass.
- **The other ~18 cast characters** and the six original archetype designs
  (`blade`/`niner`/`wrench`/three grunts) still only have their single §4
  key-pose plate each, no animation set.

**Stage 1 — colour variations, once a body is proven.** The cheapest reuse
of a finished animated character is a recolour, not a redesign: same body,
same frames, same timing, a different palette assignment — most obviously
the faction trim swap (cold operator → warm rival). Not every archetype
recolours convincingly from one body (§3.2's "leanest of the six" grunt and
the "heaviest" operator are not the same base figure), so this stage is
"reuse where the build actually matches," not "reskin everything once and
call it six characters." Worth checking once runtime integration exists to
actually judge a recolour in motion, not just as a still.

**Stage 2 — the remaining models.** Whatever Stage 0 and Stage 1 didn't
cover as recolours gets its own full pass through the same checklist,
costed off Stage 0's measured 12-generations-per-character number (§9
point 6) rather than guessed fresh each time.

---

## 9. What else this needs to reach production capacity

Five real gaps stand between "a pilot's plates are checked" and "a pilot
is a finished animated character in the game" — one resolved by §8, four
still open, named here because they're not the kind of thing more art
generation fixes on its own.

**1. The engine does not yet animate movement — verified, not assumed.**
`turf/js/render.js`'s `drawUnit` reads `unit.x`/`unit.y` directly with no
interpolation state, and `combat.js`'s `moveUnit` mutates them in one step;
`main.js`'s enemy-phase loop (`runEnemyPhase`) renders the new position
immediately and then just *pauses* 600ms before the next actor, rather than
animating the transition. A unit currently **snaps** between tiles. A
perfect move-pose sprite has nowhere to visibly play if nothing tweens
position first — this blocks runtime integration for §8's pilot exactly as
much as for any future character. Needs a real (if small) engine change: a
`displayX`/`displayY` or `moveT` that interpolates over a short duration
independent of when the game state itself updates.

**2. `state.log` is the existing hook to drive animation state from —
use it, don't invent a second one.** `combat.js` already pushes typed
events (`{type:'move',...}`, `{type:'attack',...}`, `{type:'pickup',...}`,
`{type:'enemy-turn',...}`) that `main.js`'s `attackText` already reads to
build toast copy. The same log is the natural trigger for "play the attack
frames now" / "play the hit-flinch now" — a presentation layer that
consumes `state.log` deltas each render, rather than a parallel event
system the engine doesn't otherwise have.

**3. Facing — RESOLVED by §8, not still open.** 2 drawn facings (front +
back), mirrored left/right in code, checked against `render.js`'s actual
isometric projection and `grid.js`'s actual 4-directional board rather than
assumed — see §8 point 2. What's still open is the *code*: the mirroring
itself isn't implemented (point 1's engine gap blocks it having anywhere
to run), only the source art for both facings exists.

**4. A per-character proportion reference, before animating further.**
§8's pilot held identity through image-conditioning rather than a drawn
turnaround/proportion sheet, and it worked — but that was Nano Banana
holding consistency across ITS OWN generations of the same character. Any
frame drawn or cleaned by hand from here (§6's idle/move CYCLE gap, most
likely) still wants a small proportion reference — height in pixels, joint
positions, a silhouette at rest — made once, so a hand-adjusted frame
traces against the same skeleton rather than an eyeballed guess.

**5. A per-character asset bundle needs its own manifest, not just loose
hashed PNGs.** `assets/README.md`'s "filename carries the hash of the spec"
convention works for one plate; an animated character is now 14+ frames
across two style blocks plus whatever a future idle/move cycle adds — a
set, not a file. `turf/art-src/sprites/cast/README.md` is doing this job by
hand right now (prompts, defects, check results, all in one document) and
it's worked for two characters; whether that scales past this pilot without
becoming its own stale-copy problem (the exact failure §2's flat-fill text
sitting uncorrected for three days already demonstrated once) is worth
watching as more characters land.

**6. Iteration cost is measured, not guessed, going forward.** §8's
pilot cost 12 generations per character, not 6 — the direction pass alone
roughly doubled the nominal spend, and that's now real data instead of an
estimate. §2.2 and §2.4's own testing both add: the first generation isn't
usually the cost — it's the redo when a plate fails the "look" step (§5
step 2) or a pose doesn't read as asked (§8's death-down and akimbo-pistol
fixes, both needing a second or third prompt attempt). Budget Stage 2's
remaining characters off the pilot's real 12/character number plus a redo
margin, not off a fresh guess.

---

## 10. Encounter backgrounds — the camera is not optional

**Owner, 2026-09-03, on a screenshot of `underpass`: "that background doesn't
fit the grid directions."** Correct, and it is a geometry problem with an
exact answer rather than a matter of taste.

### 10.1 The one hard requirement

The board is a **2:1 isometric grid** (`render.js`: `TILE_W` 32, `TILE_H`
16). A tile's edges therefore run at

```
atan(16 / 32) = atan(0.5) = 26.57° from horizontal
```

which is what you get from an **orthographic camera at 45° yaw and 30°
elevation** — the same camera `tools/render-frames.mjs` already uses to cut
sprite frames, so the whole game agrees on one viewpoint.

**A background must be rendered from that camera.** Then the plate's ground
lines — kerbs, paving seams, rails, fence runs, wall bases — are parallel to
the grid's tile edges, and the board reads as standing *in* the place rather
than floating on top of a photograph of one.

### 10.2 The test, which takes ten seconds

Open the plate, lay the game's grid over it, and look at where a **ground
line** in the art meets a **tile edge**. Parallel: it fits. Converging:
it does not, and no amount of tinting or scrim will fix it, because the
disagreement is between two projections and only one of them can be right.

### 10.3 What we have, judged

| plate | verdict | why |
|---|---|---|
| `courtyard.jpg` | **fits** | true iso render; building corners and the yard's floor diamond run on the grid's own axes |
| `schoolyard.jpg` | **fits** | same camera; the pitch is a diamond, fences and the hut run parallel to the tiles |
| `dockyard.jpg` | **does not fit** | a one-point PERSPECTIVE plate — the rails and paving seams run near-horizontal to a vanishing point off frame, cutting across the grid at every angle but the right one |

`dockyard.jpg` is a good picture and a wrong one for this job. It was
carrying three of the seven encounters until v32; those now sit on the two
that fit. **It is kept in the repo** — it would serve as a title card or a
between-block interstitial, where nothing has to line up with it.

### 10.4 What is actually being asked for

**More plates in that camera.** Two backgrounds across seven encounters is
repetition the player will notice by the third block; the request is for
**four to six more**, all shot or rendered at 45° yaw / 30° elevation,
orthographic or a long enough lens that the ground lines stay parallel.

Same world as `GDD.md` §2 — a grim, rain-lit Nordic city at night, sodium
lamps and wet stone. Subjects worth having, one per encounter mood already
in `data/encounters.json`:

1. **A loading dock** — roller shutters, pallets, a truck bay. Replaces what
   `dockyard.jpg` was meant to do, in the right camera.
2. **An underpass / road tunnel mouth** — concrete, graffiti, standing
   water, headlights off frame. `underpass` currently borrows a courtyard.
3. **A warehouse floor**, interior — racking, roof lights, a swept lane
   through stacked crates.
4. **A depot yard** — containers and a chain fence, for the `destroy`
   mission's cache.
5. **A street crossing / junction** — for `the-crossing`'s extraction, with
   an obvious way OUT of frame on one edge.
6. **A back lot behind flats** — bins, a rusted swing frame, washing lines.

**Frame requirements**, all of them checkable before delivery:

- **Landscape, at least 1600px wide.** The board is width-bound on a phone
  and the plate is CSS `cover`, so anything narrower is upscaled.
- **The playable floor is a DIAMOND in the middle**, big enough to seat an
  11×9 grid with a margin — the board is drawn centred and the camera pans
  over it.
- **Nothing important in the middle third.** Twelve sprites, their health
  bars, ammo pips, cover props and telegraph markers all sit there. The plate
  is atmosphere; the fight is the subject.
- **Dark and low-contrast by default.** `index.html` already lays a
  `rgba(7,8,11,.55)` to `.85` gradient over it. A bright or busy plate fights
  the HUD text that sits over the stage edges.
- **Light from one direction, consistent with the sprite plates** — the cast
  is lit from the upper left.
- **No people, no vehicles mid-frame.** They read as units that cannot be
  selected, which is the same readability bug the cache had before v26 gave
  it a marker.

### 10.5 Board size — grown in v32, and where the limit is

The owner also asked for a bigger grid, meaning **more squares**. Done: every
board is two columns wider (13x9 and 11x10, about 20% more tiles).

**Columns are the safe axis.** Growing ROWS lengthens the crew's approach,
which is the most load-bearing number on these maps — `test/balance.mjs`
reads **0% on all three deadline missions** at +2 rows, because the crew can
no longer cross in time. Growing COLUMNS leaves approach distance alone: at
+2, six of seven encounters do not move at all.

**Anchors move with the board or the growth is not neutral.** The crew keeps
its back to the bottom edge (that edge is cover — nothing gets behind them),
rivals and reinforcements still enter from the top, extraction pads stay on
the far edge, props drift to the middle.

**The limit is +2 for now**: +4 columns takes `the-depot` to 0%, +6 takes
`warehouse` to 100%. Going wider than this needs per-encounter re-tuning, not
a bigger number — and `the-depot` is the standing warning, since its cache
position is non-monotonic (y=2 is a chokepoint between two dumpsters; y=1 and
y=3 both read ~100%).

**For the art, this means the playable diamond is wider than it was.** A
plate delivered against §10.4 should seat a **13x9** grid with margin, not
11x9.

## 11. Props — six the board wants, and the rule for sizing them (2026-09-03)

**What exists.** TWENTY-FOUR props. The first eight are the cut of
`references/prop-sheet-1.png`; the street set of sixteen (dumpster, cabinet,
skip, cylinders, pipes, tank, carwreck, hydrant, tyres, brazier, trolley,
fence, sandbags, blocks, generator, and the lamp, which is dressing rather
than cover) landed in 2026-09 and took the pools from 4/4 to 11/12. The six
subjects listed in §11.1 are what the board still wants on top of that.

The original eight:
`crate` (crate on a pallet), `statue` (the granite bear), `bikerack` (rack
with a bicycle), `noticeboard` (tram-stop panel) for **full cover**;
`barrier` (concrete jersey barrier), `bollard`, `bin`, `bench` for **partial
cover**. That sheet is fully cut — there is no ninth prop anywhere in this
repo, on any branch.

**They are drawn against a person, not against the plate.** `props.json` is
the single source: each prop declares `heightM`, its real height in metres,
and `js/render.js` derives `PROP_H` as `SPRITE_H x heightM / 1.8`. A gate
fails if the two disagree, and a second gate fails if a prop's pool does not
match its declared `cover` class. Roughly, against a 1.8m adult:

| prop | board units | reads as |
|---|---|---|
| noticeboard | 31 | over head height |
| statue | 27 | head height, on a plinth |
| bikerack | 24 | shoulder |
| crate | 22 | chest |
| bin, barrier | 20 | waist to chest |
| bench, bollard | 18, 17 | hip |

A new prop needs a `heightM` in `props.json`, decided by what the object IS —
never by how much of its cell the drawing fills. **Width follows the plate's
own ink**, and so does height: the renderer scales and centres on the INK box,
not the frame, because these cells are padded differently (the burnt-out car
fills 44% of its frame, the hydrant 96%) and several objects are drawn
off-centre in theirs. A plate may therefore be padded however the cutter
likes; it just has to have the object drawn standing on its own feet.

**Two of the eight are landmarks and are rationed.** `RARE_PROPS` caps the
statue and the tram-stop panel at one each per board. One granite bear reads
as a place; two read as a prop shop. Anything delivered that is a *monument*
rather than street furniture joins that set.

### 11.1 The six asked for

Same camera as everything else here — **45° yaw, 30° elevation
orthographic**, the §10.1 requirement, and the same plate format as
`prop-sheet-1.png` (magenta field, one object per cell, no ground shadow —
the board draws its own).

1. **Dumpster**, lid down, dented, Nordic municipal green. Full cover. The
   single most-missed piece: every encounter description in
   `data/encounters.json` says back-alley and none of them can draw one.
2. **Stacked tyres**, four or five, weathered. Full cover, and the one prop
   that reads as *deliberately placed* rather than municipal.
3. **Scaffold tower section**, one bay, boards on top. Full cover, tall,
   and the only vertical that is not a sign.
4. **Kerb with a snow bank / grit pile**. Partial cover, low, and the piece
   that makes a board read as winter without repainting the ground.
5. **Bicycle on its side**, unlocked, front wheel buckled. Partial cover.
   Reads as aftermath, which no current prop does.
6. **Bus shelter end panel**, cracked glass in a steel frame. Partial cover
   that you can see THROUGH — worth having because every current partial
   prop is opaque, and the rules already say partial cover does not block
   line of sight.

**Why sparingly.** A cover tile always gets art, so prop count is set by the
encounter's cover list, not by taste. Variety comes from the pool being
wide enough that the greedy spread in `assignPropArt` never has to repeat
within four tiles. Six more props takes the full pool from 4 to 8 and the
partial pool from 4 to 7, which is enough for the widest board here.

### 11.2 The floor quad — what a new background plate must also declare

A plate is no longer centred in the viewport; it is **seated on the board**
(v33). `js/plates.js` carries each plate's **floor quad** — the flat ground a
fight happens on — as fractions of the image:

| field | means |
|---|---|
| `w`, `h` | the plate's pixel size, DECLARED (placement has to be right on the first paint, not one frame after an `onload`) |
| `cx`, `cy` | the floor's centre |
| `halfH` | half its height, far vertex to near vertex — this is what the board's diamond is matched to |
| `halfW` | half its width; not used for placement, but it is the number that says whether the board will leave a margin |

Measure them off the delivered picture, do not estimate them from the render
settings. `test/smoke.mjs` fails a plate that is in play with no quad, or one
whose quad runs off its own image.

**Deliver a floor with room around it.** The board matches the floor's
HEIGHT, so a plate whose ground runs to the very edge of the frame gives the
grid nothing to sit inside; the two plates that work both have a yard visibly
larger than the fight in it. A floor between **1.9:1 and 2.4:1** sits closest
to the board's own 2:1 and wastes the least.
