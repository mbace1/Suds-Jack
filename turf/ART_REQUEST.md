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
That changes the frame budget a lot: nobody needs an 8-direction walk cycle
for a unit that visually slides from one known tile to another on its own
turn. Adapted to what TURF actually does, per archetype:

| frame | count | what it's for |
|---|---|---|
| **Idle** | 1 | the standing ready pose — this *is* the key-pose plate from §4/§5, no separate generation needed |
| **Move** | 1 | a single mid-stride "committed step" pose, blended toward during the tile-to-tile slide `render.js` already animates positionally — not a cycle, since the game never holds on a walking pose long enough for one to read |
| **Attack** | 1–2 | the weapon-specific action: knife lunge, pistol/handgun recoil, shotgun blast, pipe/bat swing-through (which should read as mid-swing, since that's also the knockback beat). Two frames (windup + release) if the budget allows; one (release only) is enough for Milestone 1 |
| **Hit** | 1 | a recoil/flinch reaction — read `combat.js`'s `resolveAttack` for what it needs to sell: a hit event exists whether or not it kills |
| **Death/KO** | 1–2 | a collapse — one frame is a static "down" pose, two (falling + down) reads better but isn't required |

**Total per archetype: 4–7 frames**, not the dozens a real-time action game
would need — this is the actual honest ask once the game's own turn
structure is accounted for, and it is why this document does not request
Nano Banana generate a multi-pose sheet in one image: character consistency
across multiple poses from a single text-to-image generation is an
unsolved, unreliable problem with this pipeline's tooling (no ControlNet,
no LoRA, no pose conditioning) — asking for six sheets of six frames each is
asking for thirty-six chances for the model to drift off-model. The reliable
ask is one strong key-pose plate per archetype (§4); the remaining 3–6
frames per archetype are a **hand pass in Aseprite**, traced against that
plate for proportions (18–36 frames total across all six archetypes)
rather than a pipeline claim this tooling can't actually back up. **What
that hand pass actually means changed at §2.4**: the key-pose plates are
now full-colour illustration (192×288, thousands of colours), not a flat
≤32-colour fill an artist can palette-match mechanically — tracing to
matching fidelity is real character art, a bigger per-frame ask than this
paragraph originally scoped, and not yet resolved.

**If a grid sheet is attempted anyway** (a per-archetype experiment, not
this request's default): lay every pose out as equal-size square cells on
one flat-magenta canvas, then `node kindling/tools/cut.mjs slice <sheet>.png
<dir> <cell-px> idle,move,attack,hit,death` cuts it into one file per named
cell — that tool call is real and already in this repo, it just isn't the
default plan here because of the consistency problem above.

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
  Say the word when the plates exist and this becomes its own task. **Still
  true**, but the board is orthogonal 4-directional (`turf/js/grid.js`'s own
  comment: "ITB-style rather than an 8-directional grid"), not isometric
  8-way — whoever picks this up should settle facing count against that
  fact, not against Metal Slug Tactics' own (isometric) convention.

## 8. Multi-frame animation, piloted (2026-08-31)

**Correction that changes how §3-§7 should be read going forward**: the
six archetypes (`blade`/`niner`/`wrench`/three grunts) are this document's
own invention, built to fill Milestone 1's stat table — they are not how
the owner thinks about the cast. The owner's own words: "there are just
character models, no archetypes." `turf/references/casting-sheet-full.png`
is ~20 actual characters; a future roster is more likely built by picking
from that cast than by generating fresh archetypes to spec.

Piloted the actual "how do we add animation" question on two of those
casting-sheet characters (owner's pick: "you can pick 2 from the sheets I
provided and expand") — full results, prompts, defects and fixes in
`turf/art-src/sprites/cast/README.md`. Short version: **it works.** A new
style block (`turfCastPose`, opposite instruction from `turfGrim` — hold
the reference character's identity rather than avoid copying it) plus
`scripts/gen-with-ref.mjs` against a crop of the character's own casting-
sheet art holds identity across seven poses (Idle/Move/Attack×2/Hit/
Death×2, the owner's frame-richness call) reliably enough to be the real
answer, not just a hopeful one. Two prompt-level defects were caught and
fixed (a "lying down" pose that stayed standing; dual pistols that
collapsed to one gun until named as a recognisable trope instead of
described geometrically) — both fixes are reusable wording for any future
character, not one-offs.

Not done: the other ~18 characters, `render.js` integration (§7's own
item), and settling the facing-count question above.
