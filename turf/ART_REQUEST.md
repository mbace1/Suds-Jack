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

`turf/art-src/palette.json` is the matching **art palette** — sixteen colours
(ink, two skin tones, three neutral-streetwear tones shared by both
factions, the cold operator ramp, the warm enemy ramp, two metal tones) that
`fit --palette` (§5) snaps a generated plate to. It is deliberately **not**
`turf/js/palette.js` — that `PAL` object is the whole UI+terrain+HUD palette,
and a character sprite has no business quantising against floor-tile greys.

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
zip/cuffs/laces as the faction colour-block. Pixel art, hard 1px black
outline, flat fills, at most two shade steps per surface. Standing
three-quarter view, whole body, feet together and clear of the bottom edge
(no ground shadow), centred on a FLAT SOLID MAGENTA #FF00FF background —
no text, no logos, no UI.

turf/niner-plate:
A street operator sighting down a pistol held two-handed at chest height,
calm and settled rather than lunging — this one plays the long game. Dark
practical streetwear, cold blue-cyan (#6fb8d9) trim on the jacket/gloves as
the faction colour-block. Pixel art, hard 1px black outline, flat fills, at
most two shade steps per surface. Standing three-quarter view, whole body,
feet together and clear of the bottom edge (no ground shadow), centred on a
FLAT SOLID MAGENTA #FF00FF background — no text, no logos, no UI.

turf/wrench-plate:
The heaviest-built of three street operators, gripping a length of pipe in
both hands like a bar about to swing — built for a shove, not a stab. Dark
practical streetwear, wider stance than a lean fighter, cold blue-cyan
(#6fb8d9) trim on the jacket as the faction colour-block. Pixel art, hard
1px black outline, flat fills, at most two shade steps per surface.
Standing three-quarter view, whole body, feet together and clear of the
bottom edge (no ground shadow), centred on a FLAT SOLID MAGENTA #FF00FF
background — no text, no logos, no UI.

turf/grunt-blunt-plate:
A rangy street thug gripping a baseball bat with a wide, wound-up swing
stance. Rough street clothes, no armour, warm rust-orange (#c9663f) trim on
the jacket/cap as the faction colour-block. Pixel art, hard 1px black
outline, flat fills, at most two shade steps per surface. Standing
three-quarter view, whole body, feet together and clear of the bottom edge
(no ground shadow), centred on a FLAT SOLID MAGENTA #FF00FF background —
no text, no logos, no UI.

turf/grunt-handgun-plate:
The leanest of a rival street crew, holding a handgun low and loose,
unhurried — this one has range and knows it. Rough street clothes, warm
rust-orange (#c9663f) trim as the faction colour-block. Pixel art, hard 1px
black outline, flat fills, at most two shade steps per surface. Standing
three-quarter view, whole body, feet together and clear of the bottom edge
(no ground shadow), centred on a FLAT SOLID MAGENTA #FF00FF background —
no text, no logos, no UI.

turf/grunt-shotgun-plate:
The bulkiest of a rival street crew, a sawn-off shotgun held tight to the
hip, built for a close, ugly fight rather than a clean one. Rough street
clothes, warm rust-orange (#c9663f) trim as the faction colour-block. Pixel
art, hard 1px black outline, flat fills, at most two shade steps per
surface. Standing three-quarter view, whole body, feet together and clear
of the bottom edge (no ground shadow), centred on a FLAT SOLID MAGENTA
#FF00FF background — no text, no logos, no UI.
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
5. **Check.** `node kindling/tools/cut.mjs check <out>-fit.png --cell 32` —
   confirms binary alpha (no semi-transparent fringe left over) and a colour
   count that actually landed on the sixteen-colour art palette, not just a
   shrunk illustration that happens to be small. A result that fails this is
   not real pixel art yet, whatever it looks like at a glance.
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
plate for proportions and drawn from `turf/art-src/palette.json`'s sixteen
colours directly, which is a bounded, honest amount of manual work (18–36
frames total across all six archetypes) rather than a pipeline claim this
tooling can't actually back up.

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
  Say the word when the plates exist and this becomes its own task.
