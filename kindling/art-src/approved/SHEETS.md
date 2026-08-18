# The approved sheets, read out

`README.md` beside this file is the handoff index from the art pass. It names a
`BETTERMENT_ACCEPTED_ART_REPO_PACK.zip` — **that zip is not in the repository**,
on this branch or any other. The sheets were delivered to the session as images
and reviewed there.

This file is the archive that survives that: **what the sheets actually show**,
written down at the level of detail a renderer needs. It exists because a
reference nobody can open is a reference nobody can check a change against, and
because this game draws every pixel in code — there is nothing to import even
when the zip does arrive.

If the pack lands later, the files replace nothing here: this stays as the read,
and the images become the check on it.

---

## The thirteen sheets

**Scenes** — `moonlit_monster_campfire_ruins`, `moonlit_campfire_beneath_the_castle`,
`cozy_campfire_amid_twilight_ruins`, `pixel_art_journey_to_the_hilltop_castle`,
`layered_daytime_paths_4layer`.
**Libraries** — `pixel_fantasy_environment_art_library`,
`bonfire_camp_pixel_art_environment_sheet`, `daytime_paths_and_open_areas_sheet`,
`layered_ruins_foreground_4layer`.
**Characters** — `betterment_kindling_dark_fantasy_art_bible` (the global one),
`ember_character_art_bible_sheet`, `mossling_forest_ruin_companion_art_bible`,
`ashling_ember_drake_character_sheet`, `moss_knight_enemy_guardian_art_bible`.
**UI** — `cozy_pixel_art_fantasy_game_ui_kit`.

---

## 1. The camp, as staged

Every night scene stages the same picture, and it is a **left-to-right** one.
Read across:

| x | what stands there |
|---|---|
| far left | a huge tree, **cropped by the top and left edges** — trunk, roots, canopy over the whole corner. An iron **lantern** hangs off it on a bracket, lit. |
| left | a **banner** hanging from a beam on the tree: dark cloth, gold sigil, torn hem |
| left-centre | the **ruin** — one whole arch and one broken one behind it, mossy along every top edge, wall blocks tumbling off the ends |
| centre | the **bonfire**, in a ring of stones, logs stacked in a cone |
| centre | the **companion**, sitting on a **rug**, to one side of the fire, with a mug |
| centre-right | the gear on the ground: **sword** stuck point-down, **shield** leaning, **helmet**, a **book**, a **potion** |
| right | crumbled wall stacks, then the ground opening out |
| far right | a **signpost**, cropped by the edge |
| horizon right | a **castle on a hill**, silhouetted, with a handful of **lit orange windows** |
| sky | a **full moon** top-right, stars, flat cloud bars |

Three things about that staging are load-bearing:

- **The fire is not in the middle of the frame.** It sits left of centre with the
  ruin behind it and the world opening to the right. That is what gives the
  picture somewhere to recede to.
- **The foreground is cropped.** The tree, the brambles and the signpost all run
  off the edge. Nothing in front fits inside the frame.
- **The distance is cold and the near ground is warm**, and the seam between them
  is the reach of the fire. This is the same rule the game already runs on.

### The daytime scenes are the same place with the light changed
`pixel_art_journey_to_the_hilltop_castle` is blue sky, white cumulus, green
grass, the same arch, the same signpost, the same castle. **The cold half
changed; the vocabulary did not.** That is the region-palette rule in §8 of
`../../ART_GUIDE.md`, demonstrated.

---

## 2. Ember — the companion, and it is not what this game has been drawing

The `ember_character_art_bible_sheet` is unambiguous, and the game's creature is
a different animal. Ember is:

- a **dark blue-black body of porous stone**, speckled with a few lighter pits —
  not fur, not green
- **one big round head** on a small round body, head taking most of the height
- **two large white eyes**, set wide, with dark pupils and a catch light
- **two small fangs** standing up from the lower lip
- **two pale tan horns**, curving up and back — *the* silhouette feature
- a **dark maroon scarf** round the neck, hanging down the front, with a longer
  flap behind
- **ember glow** at the cracks, the tail tip and the hands
- chunky round paws; no neck, no waist

The call-outs name the reason: *"Big head, clear horns, scarf, and tail flame
create a strong, readable silhouette at small sizes."*

### The age ladder, verbatim from the sheets
`YOUNG → ADULT → ELDER`, and the global bible states how age is carried:
**"horn size, posture, accessories, and surface detail (cracks, moss, wear)"** —
explicitly *not* body type, which is the same sentence used to say gender is not
body type either. Elders are described as more aggressive and volatile, with
larger horns and more ember output.

That maps onto this game's five stages without inventing anything:

| stage | horns | what else changes |
|---|---|---|
| spark | nubs | no scarf, no arms, an ember where the tail will be |
| wisp | short, curving | scarf appears; the body lengthens; tail with a lit tip |
| tender | up and back | arms and feet separate from the mass |
| keeper | long | broader across; carries a flame in one hand |
| elder | long and **branched** | a mantle, moss and lit cracks in the stone |

### The family
- **Mossling** — the same build in moss and bark, with **antlers** instead of
  horns, mushrooms on it, a staff. Green accent.
- **Ashling** — a hatchling ember-drake: **wings**, spinal spikes, a snout,
  ember cracks. Smaller than Ember (~1.2u against ~1.6u).
- **Moss Knight** — the enemy: stone-and-iron armour under moss, sword and
  cross shield, ~2.4u, described as a slow guardian who telegraphs.

The scale chart on the global bible gives those numbers relative to each other,
which is the only place the roster's sizes are stated.

### Animation, stated per character
Every character sheet ships the same four strips, and the frame counts are
given: **IDLE 8f · WALK 6f · RUN 6f · ATTACK/CAST 8f** (Moss Knight replaces run
with GUARD 8f). The shared principles panel names five:

1. **Idle breath** — a gentle bob, with the ember flicker riding on it
2. **Weight and impact** — real anticipation, then squash and stretch
3. **Follow-through** — cloth, antlers, leaves and accessories **lag** the body
4. **Secondary motion** — ambient detail carries the personality
5. **Exaggerated action poses** — strong silhouettes on the gameplay beats

Point 3 is the one this game was missing entirely: the scarf and the tail must
lag, not travel with, the body.

---

## 3. The environment libraries

Between the three library sheets the vocabulary is: **ruined arches** (full,
partial, and wall caps), **crumbled wall stacks** in five sizes, **rubble**,
**stair fragments**, **doorways**, **bridges**, **gate and portcullis**, **tower
and wall silhouettes**, **hanging banners** in five colours, **lantern posts**,
**shields and helmets**, **stone grave markers**, **signposts** (three kinds,
one with a lantern), **cliff rocks**, **rock clusters**, **foreground
brambles**, **root and vine overlays**, **moss and lichen overlays**, **grass
edge strips**, **flowers**, **mushrooms**, **modular path and border pieces**,
**trees** (oak, birch, conifer, stump), **creek and water**, **fences**.

Two production rules come with them and both are quotable:

- **"no more than four stackable layers where practical"** — background/base →
  structure → foreground detail → optional FX/top-detail (`README.md`)
- **"do not invent perspective depth that the supplied layers cannot support"**

The second is a correction to how this scene was being built: depth here is
**value steps between flat layers**, never a receding ground plane.

### The bonfire, as a five-state object
`bonfire_camp_pixel_art_environment_sheet` draws the fire as a progression, and
it is the game's own bands with the names already attached:

**UNLIT RING → LOW EMBERS → MEDIUM FIRE → FULL FIRE → SPARKS ONLY**

with separate pieces for stacked logs, ashes, smoke puffs and ember particles.
The stone ring is a constant in all five; only what is inside it changes.

---

## 4. The UI kit

`cozy_pixel_art_fantasy_game_ui_kit` is a full component set, and it is
**leather and felt, not glass**:

- every panel is a dark stitched plate: rounded corners, a lighter inner border,
  and a **dashed stitch line** inset from the edge
- **goal rows**: a coloured icon tile on the left, the goal name large, a
  `+20 FLAMES` line under it small and warm, and a **check box on the right** —
  empty as a dashed square, done as a filled tick
- **HUD chips** across the top: `FLAMES` with a fire mark, `LVL` with an XP bar,
  `BOND` with a heart
- **bonfire progress**: five circular nodes joined by a connector, empty as cold
  rings, filled as warm discs, with a fire mark at the head of the row
- **primary buttons**: warm orange with a stitched border and a mark, and each
  one drawn again **disabled** — desaturated, never removed
- **bottom navigation**: five items — `TODAY · JOURNEY · INVENTORY ·
  REFLECTIONS · COMPANION` — the active one warm, the rest cold
- **warning badges** are a fire mark and a plate, and the copy on them is
  *"Your fire is low. Take care today."* — a statement, never a telling-off,
  which is the rule `test/smoke.cjs` already greps for

The kit's own note: button surfaces stay **clean and restrained**; the craft
texture lives on the panels and the scene, not on the type.

---

## 5. What this overturns in `../../ART_GUIDE.md`

The guide was written from the prose canon, before any of these existed. Two of
its rules were guesses and the sheets settle them the other way:

1. **"No surface texture below 3px."** The reference is textured everywhere —
   every stone block is drawn individually. The rule was right about *lines cut
   into a mass* and wrong as stated. It becomes: **texture is a value step, never
   a line** — a block reads by being a slightly different value from its
   neighbour, and mortar is the absence between them, not a stroke.
2. **The companion.** The guide describes a base body of one mass plus one head
   with a pale crescent, and says nothing about horns, a scarf or fangs. Ember's
   identity is now fixed by the sheet, and the trait-zone table in §4 is what
   the variants (Mossling's antlers, Ashling's wings) write into.

Everything else in the guide survives the reference, including the 3-pixel rule,
which the sheets restate as *"readable silhouettes at small sizes"* and prove
with the small-size row on the global bible.
