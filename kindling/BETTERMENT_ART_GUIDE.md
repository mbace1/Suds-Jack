# BETTERMENT — Art Guide

**Status:** visual source of truth  
**Project:** Betterment / `kindling/`  
**Based on:** `BETTERMENT_GDD.md` + Kindling amendment  
**Primary target:** mobile portrait  
**Date:** 2026-08-17

This guide defines how Betterment should look and how art should be built. It is not a mood board. Every rule below exists to support the mobile UX, the bonfire care loop, combat readability, companion lineage, and the two-day Kindling consequence.

---

# 1. Visual thesis

**Betterment is a dark-fantasy self-care game rendered as layered 2D craft illustration with retro pixel-game language.**

The desired mixture is:

- handcrafted paper/card/felt construction;
- flat 2D layers rather than 3D diorama depth;
- deliberate pixel edges, icons and animation accents;
- dark ruins, forest, bonfire and moonlight;
- a small strange but lovable monster;
- modern mobile hierarchy and large touch surfaces;
- restrained UI texture.

The scene should feel like an old fantasy game assembled by hand from cut material, then sharpened with retro game notation.

**Crafted 2D illustration first. Retro game language second. Modern mobile UX always.**

---

# 2. What this is not

Do not drift toward:

- photorealism;
- 3D render / miniature diorama / clay render;
- fully pixel-art UI at tiny native sizes;
- cozy cottage interiors as the main fantasy;
- soft generic wellness-app illustration;
- noisy felt texture over every button;
- faux-medieval ornate UI frames that reduce tap/readability;
- generic Soulslike realism;
- chibi mobile-game gloss;
- full-screen particle noise.

The Dark Souls influence is **bonfire ritual, lonely ruins, danger and world tone**, not copying FromSoftware forms, armor, logos, enemies, UI or exact compositions.

---

# 3. Mobile composition is the first art constraint

Every primary scene is designed for a phone before it is treated as an illustration.

## 3.1 Today composition

The main portrait stack is:

1. compact HUD;
2. large scene panel;
3. Fire progress / state;
4. large goal cards;
5. optional next-tier card;
6. primary journey CTA;
7. bottom navigation.

The scene must remain readable at approximately **360–430 px device width**.

## 3.2 Scene focal hierarchy

Within the scene:

1. **bonfire** — strongest warm focal point;
2. **companion** — strongest character silhouette;
3. **immediate ground / care state**;
4. **one readable landmark**;
5. background atmosphere;
6. foreground framing.

Do not create five equally detailed visual zones.

## 3.3 Safe zones

Important character faces, fire state, enemy tells and reward objects must stay away from:

- top UI crop;
- bottom scene-caption edge;
- device rounded-corner areas;
- locations likely to be covered by transient labels.

---

# 4. Layered 2D construction

The art should look dimensional because of overlap, scale, occlusion and light — **not because it is rendered as 3D geometry**.

Each scene should be authored in layers that can move independently.

## 4.1 Layer stack

### Layer 0 — distant background
- moon / sky;
- distant tree mass;
- castle silhouette;
- fog bands.

### Layer 1 — far architecture
- ruined arch;
- broken tower;
- wall shapes;
- hanging banner silhouettes.

### Layer 2 — middle environment
- tree trunks;
- stone piles;
- roots;
- low walls;
- shrine pieces.

### Layer 3 — gameplay plane
- bonfire;
- companion;
- enemies;
- combat props;
- important pickups.

### Layer 4 — foreground framing
- branch;
- dark grass;
- broken masonry edge;
- hanging leaves;
- shadow cutout.

### Layer 5 — transient effects
- embers;
- ash;
- tiny smoke layers;
- attack slash;
- hit spark.

Foreground should frame, not obscure interaction.

## 4.2 Parallax

Use subtle 2D parallax only when it adds life:

- background: 0.2×;
- far architecture: 0.35×;
- mid layer: 0.6×;
- gameplay plane: 1×;
- foreground: 1.2×.

Today does not need camera panning by default. Combat and Journey transitions may use tiny lateral shifts.

---

# 5. Craft + pixel hybrid rules

The hybrid only works if each side has a clear job.

## 5.1 Craft language owns

- large silhouettes;
- materials;
- environmental construction;
- cloth / card / felt / paper edges;
- background layering;
- large creature body masses.

## 5.2 Pixel language owns

- eyes and tiny face changes;
- fire cores;
- icons;
- check states;
- combat hit effects;
- small UI symbols;
- spark/ember animation;
- edge accents;
- occasional dithering.

## 5.3 Texture budget

Texture belongs mostly in illustration.

Buttons and goal cards should use:

- mostly flat surfaces;
- a subtle grain/noise layer at very low opacity;
- strong borders / shadow offsets;
- texture only as accent, not as primary readability.

**Never cover body text or checkbox state with felt/fabric noise.**

---

# 6. Material vocabulary

Use a limited repeatable material set.

## Environment

- charcoal paper / dark card for sky and deep shadow;
- grey-brown card for stone;
- muted green felt/paper for moss;
- torn fibrous paper for bark;
- stitched or folded cloth for banners;
- translucent vellum/paper for fog;
- tiny pixel/dither fire effects over layered orange paper shapes.

## Creature

The monster should feel partly handmade but not literally like a plush toy.

Use:

- clean cut-paper/felt body masses;
- pixel eyes/mouth;
- hard retro highlight blocks;
- a few stitched/notched edge details;
- ember-lit accent zones.

---

# 7. Core palette

Dark mode is the canonical presentation.

These are direction values, not rigid final production swatches.

## Dark environment

- near-black blue: `#080D13`
- charcoal navy: `#111821`
- slate blue: `#1C2933`
- cold stone: `#39434A`
- muted moss: `#59694F`
- dead brown: `#5B4634`

## Fire family

- deep ember: `#7A2F13`
- burnt orange: `#C95A1E`
- fire orange: `#F28A2F`
- warm gold: `#F3B84B`
- hottest cream: `#FFE7A9`

## UI / readable light

- warm paper: `#F1E3C4`
- dim paper: `#C4B79D`
- inactive line: `#4A3F31`

## Accent families

Keep category colors dark and desaturated enough to belong to the world:

- Body / movement: moss green;
- Water / body care: desaturated blue;
- Mind: dusty violet;
- Connection: muted berry/violet;
- Daily care: rust/amber.

No candy-spectrum rainbow dashboard.

---

# 8. Bonfire visual system

The bonfire is the most important visual state machine in the product.

## 8.1 Care states

### 0 / 5 — Coals
- low red-orange core;
- very small light pool;
- companion close to fire;
- world mostly cold.

### 1 / 5 — Spark
- first visible flame tongue;
- tiny warm rim on creature.

### 2 / 5 — Small flame
- two flame shapes;
- more ground texture visible.

### 3 / 5 — Steady
- stable silhouette;
- environment begins reading clearly.

### 4 / 5 — Strong
- broader warm pool;
- one extra background detail revealed.

### 5 / 5 — FIRE TENDED
- confident but not gigantic flame;
- warm light reaches the companion and nearby ruin;
- small settle animation;
- optional tiny ember arc.

The visual difference between 4 and 5 should be obvious.

---

# 9. Missed-day / Kindling states

This system must be visually unforgettable without becoming grotesque.

## 9.1 First fully missed day — Warning

Art state:

- fire reduced to weak coals;
- colder blue scene;
- more foreground darkness;
- companion huddles closer;
- falling ash or one dark ember icon;
- no injury, sickness or crying animation.

Suggested visual label:

**THE FIRE IS FADING**

Use restrained warning treatment, not red flashing danger UI.

## 9.2 Second consecutive fully missed day — Kindling event

The return scene becomes a special composition.

- no normal goal list initially;
- bonfire centered larger than usual;
- companion absent;
- a recognizable ember/ash silhouette remains in the fire;
- old creature trait marker appears in the ember;
- scene is still, then one ember rises.

Copy presentation can use:

**THE FIRE WAS NOT TENDED**  
**[NAME] BECAME KINDLING**

No gore. No body. No comedy death animation.

## 9.3 Kindled ancestor mark

Each Kindled creature gains a lineage mark:

- small ember halo;
- ash-grey portrait edge;
- burnt corner / charred pixel marker;
- optional inherited Ember Trait icon.

The user should recognize a Kindled ancestor instantly in the family tree.

---

# 10. Companion visual system

The companion is a **small fantasy monster**, not a human-like mascot.

Target emotional mix:

- strange;
- compact;
- slightly scruffy;
- readable silhouette;
- capable in combat;
- vulnerable enough that lineage matters;
- never saccharine.

## 10.1 Base proportions

Default young companion:

- body: 45–55% total height;
- head: 35–45%;
- limbs: short and graphic;
- eyes: large enough to read at phone scale;
- one signature asymmetry preferred.

Avoid tiny hands/feet with complex anatomy.

## 10.2 Growth stages

Growth must change **silhouette**, not only scale.

### Spark
- almost ember/imp shape;
- tiny legs or floating feet;
- minimal horns/ears.

### Wisp
- longer top silhouette;
- more expressive tail/ears;
- first recognizable trait zone.

### Tender
- confident biped/quadruped hybrid silhouette;
- clear combat stance;
- first equipment slot readable.

### Keeper
- broader body;
- larger horn/ear/tail identity;
- stronger stance;
- mature face.

### Elder
- unmistakable crown/horns/mantle/flame structure;
- should remain charming, not become generic giant demon.

---

# 11. Breeding / inherited trait art system

Creature art must be modular enough for lineage without looking procedurally assembled from random stickers.

## 11.1 Trait zones

Each creature has authored slots:

1. **body silhouette family**;
2. **head silhouette**;
3. **horn / ear set**;
4. **eye shape**;
5. **eye color**;
6. **marking layer**;
7. **tail type**;
8. **ember accent**;
9. **craft-material accent**;
10. **rare mutation overlay**.

## 11.2 Inheritance principle

Offspring should look like plausible descendants, not slot-machine collisions.

Use:

- 1 dominant parent body family;
- 2–3 secondary inherited traits;
- one palette blend family;
- low probability mutation.

## 11.3 Rare traits

Rare should mean **visually memorable**, not automatically stronger.

Examples:

- split horn;
- one luminous eye;
- ash tail;
- paper-wing stubs;
- moss mane;
- charred edge;
- moon-blue ember;
- inherited Kindled-ancestor ember mark.

---

# 12. Companion expression set

Every companion needs a small reusable expression/pose kit.

Minimum:

- idle;
- blink;
- look at player;
- look at fire;
- happy completion reaction;
- curious;
- sleep/rest;
- warning-day huddle;
- journey leave;
- journey return;
- combat idle;
- strike;
- guard;
- skill;
- hit;
- victory;
- retreat.

Do not solve emotion with speech bubbles alone.

---

# 13. Combat visual grammar

Combat must read in under one second on a phone.

## 13.1 Layout

Preferred portrait combat staging:

- enemy top / upper-middle;
- companion lower-middle;
- environment behind;
- large HP/state treatment near each character;
- three large bottom actions: **STRIKE / GUARD / SKILL**.

## 13.2 Character scale

Combat versions may be 20–35% larger than Today scene versions so tells and poses read clearly.

## 13.3 Attack effects

Keep effects graphic and short:

- 2–4 frame slash;
- pixel spark burst;
- paper tear streak;
- ember impact;
- tiny screen/scene nudge.

Avoid long VFX obscuring characters.

## 13.4 Damage language

Stylized:

- knockback;
- squash/stretch;
- soot puff;
- dropped moss/card fragments;
- flashing rim light.

No blood or realistic wounds.

---

# 14. Enemy families

Enemies should feel like inhabitants of this handmade ruin world.

## Moss Knight
- squat armor-like stone/card shell;
- moss plume;
- blunt readable weapon;
- slow telegraphs.

## Bell Crawler
- low insect/crab silhouette;
- tiny hanging bell body;
- cloth/string details;
- movement-focused enemy.

## Paper Crow
- sharp folded wing shapes;
- black card silhouette;
- pale pixel eye;
- attacks in pairs/swarms.

## Root Hound
- branch/root body;
- long low silhouette;
- warm eye points;
- fast strike telegraph.

## Hollow Lantern
- hanging warm light with empty paper shell;
- floats;
- deceptive friendly silhouette;
- skill/status enemy.

## Rust Guardian
- chunky old metal/card construct;
- asymmetrical shield;
- strongest early-region defender.

Each family should have a silhouette that reads in black fill alone.

---

# 15. World-region visual rules

## 15.1 Birch Ruins

**Role:** first world / baseline.

- pale birch trunks;
- broken grey stone;
- dark green moss;
- cold blue night;
- warm bonfire orange;
- simple arches.

## 15.2 Drowned Courtyard

- dark teal water planes;
- submerged stairs;
- algae felt/paper strips;
- broken fountains;
- reflective moon shapes.

## 15.3 Bell Keep

- vertical stone masses;
- hanging cloth banners;
- ropes and bells;
- wind-driven silhouettes;
- colder slate palette.

## 15.4 Ashwood

- charred black trunks;
- rusty red ground accents;
- ash drift layers;
- eggs / ember-seeds;
- stronger breeding/lineage imagery.

## 15.5 Old Gate

- monumental arch silhouette;
- fewer but larger shapes;
- deep blue-black negative space;
- aged gold/rust motifs;
- guardian-scale encounters.

Region identity should come from **3–5 repeatable motifs**, not dozens of unique textures.

---

# 16. UI design language

The UI is not a medieval parchment overlay. It is a modern mobile interface living inside the same visual world.

## 16.1 Goal cards

Goal cards should be:

- large;
- full-width or near full-width;
- 72–96 px class touch height;
- mostly flat dark surfaces;
- strong left category/icon area;
- clear goal text;
- visible reward line;
- large right-side check state.

## 16.2 Check system

Unchecked:

- dark square;
- warm/grey outline;
- empty center.

Checked:

- moss/ember state;
- large high-contrast check;
- no tiny tick icon.

Progressive Tier II:

- visually smaller than the first goal;
- tagged **GO FURTHER**;
- different border/accent;
- never looks mandatory.

## 16.3 Fire progress bar

The 5-segment Fire bar is a key identity element.

Rules:

- exactly five large segments;
- each segment lights warm orange/gold;
- label changes to **FIRE TENDED** at 5/5;
- extra completed goals do not add segments;
- bonus progress is expressed elsewhere as Flames/Bond.

## 16.4 Buttons

Buttons use:

- simple dark fill;
- 2 px class border;
- strong pressed offset;
- little or no cloth texture;
- uppercase retro label where useful;
- modern tap dimensions.

Primary CTA can use ember orange.

Secondary buttons remain dark.

---

# 17. Icon grammar

Icons should be bold enough to survive phone scale.

## Core icons

- Flames — angular flame / ember triangle;
- Bond — linked ember / heart-like knot without looking like health HP;
- Body — boot / movement mark;
- Water — drop;
- Hygiene — sparkle/brush mark;
- Mind — moon/spiral;
- Connection — linked dots;
- Daily care — simple satchel/check;
- Journey — arch/path;
- Inventory — small reliquary box;
- Reflect — rune/notebook;
- Companion — monster head;
- Combat — crossed blunt marks;
- Lineage — branching ember tree;
- Kindled ancestor — ash ember.

Use 1–2 pixel/weight logic consistently.

---

# 18. Typography

The art direction can be retro without sacrificing reading speed.

Use two roles:

## Display / game labels

- pixel-inspired or blocky mono treatment;
- uppercase;
- short labels only;
- headings, states, rewards.

## Body / functional copy

- highly legible mono or humanist sans/mono;
- normal modern rendering;
- never force long body copy into a tiny bitmap font.

Examples of display copy:

- TODAY
- FIRE TENDED
- GO FURTHER
- JOURNEY
- KINDLED
- STRIKE
- GUARD
- SKILL

---

# 19. Animation principles

Betterment should feel alive but not restless.

## Ambient budget

At rest, normally animate only:

1. fire;
2. companion breath/blink;
3. one environmental loop;
4. rare ember/spark.

## Completion reaction

On a goal check:

- immediate checkbox snap;
- 150–300 ms warm pulse;
- companion reacts;
- bonfire increments if below 5;
- a few embers rise;
- UI settles quickly.

Total celebration should be under ~1 second unless a major milestone happens.

## Reduced motion

Reduced-motion mode:

- no parallax;
- no hops/shakes;
- minimal fire animation;
- use fade/brightness/state swap instead.

---

# 20. Lighting rules

The fire is not a global orange filter.

Use:

- cold environment base;
- warm local light near fire/companion;
- hard-ish 2D shadow boundaries;
- limited soft bloom;
- layered paper value changes rather than realistic GI.

Combat can temporarily exaggerate warm/cold contrast for hits/skills.

---

# 21. Asset production rules

## Environment assets

Prefer transparent layered assets for:

- branches;
- trunks;
- arches;
- stones;
- banners;
- moss strips;
- foreground silhouettes;
- fog bands;
- fire layers.

## Companion assets

Keep modular pieces separated by trait zone where practical:

- body;
- head/face;
- horns/ears;
- markings;
- tail;
- ember accent;
- equipment.

## Enemy assets

Each enemy needs at minimum:

- idle;
- telegraph;
- attack;
- hit;
- defeat/retreat.

## Export philosophy

The implementation may rasterize/composite assets, but source art should preserve separated layers for animation and lineage variation.

---

# 22. First art production batch

Do not start with dozens of creatures or regions.

## Batch A — Today vertical slice

Produce:

1. Birch Ruins background layers;
2. bonfire at 0/5, 1/5, 3/5, 5/5;
3. one base companion at Tender stage;
4. idle + completion reaction + sleep/huddle;
5. foreground branches/stone frame;
6. category icon set;
7. Fire progress icon/treatment;
8. one large goal-card visual spec;
9. warning-day state;
10. Kindling-event state.

## Batch B — Combat slice

Produce:

1. companion combat idle;
2. strike/guard/skill poses;
3. Moss Knight;
4. Moss Knight telegraph/attack/hit;
5. combat hit effects;
6. one Birch Ruins combat backdrop.

## Batch C — Lineage slice

Produce:

1. 3 horn/ear variants;
2. 3 tail variants;
3. 3 marking variants;
4. 3 ember-accent variants;
5. one rare mutation;
6. Kindled ancestor portrait treatment;
7. simple lineage-tree node treatment.

This is enough to prove the visual system before scaling.

---

# 23. Review checklist

Every new art asset or screen should pass these questions:

1. Does it read on a phone without zooming?
2. Is the important shape readable as silhouette?
3. Is it visibly layered 2D rather than fake 3D?
4. Does craft texture support rather than obscure information?
5. Does pixel language appear in controlled accents?
6. Is the bonfire or monster still the focal point?
7. Are UI surfaces cleaner than environment surfaces?
8. Is the interaction target large enough?
9. Does the art support dark mode first?
10. Could this creature support inherited traits later?
11. Could combat poses read at this scale?
12. Does this feel like Betterment rather than a generic wellness app or generic Soulslike?

---

# 24. Locked visual direction

Until deliberately changed, Betterment art should follow this sentence:

> **A dark bonfire fantasy built as layered handcrafted 2D shapes, sharpened with retro pixel-game accents, centered on a strange little monster, and presented through large modern mobile UX.**

The next art work should be produced against the **Today vertical slice**, not as disconnected mood images.
