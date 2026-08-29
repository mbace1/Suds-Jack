# TURF — Composite Design Document (Working Title)
*Grid-based tactics roguelike — Nordic 90s street underworld*

---

## 1. Elevator Pitch

Three street operators — punks, addicts, hustlers, low-level muscle — fight through
turf wars in a grim, rain-lit Nordic city. Combat is turn-based on a grid, paced by
**Metal Slug Tactics'** aggressive movement-and-combo energy, occasionally sharpened
by **Into the Breach's** full-information enemy telegraphs. Between fights, your crew
levels up and loots gear **Mewgenics/RPG-lite** style — no breeding, no permadeath
economy. You keep your people. You get better gear. The city doesn't get any nicer.

---

## 2. Influence Map

| System | Primary influence | What we take | What we drop |
|---|---|---|---|
| Turn/action economy | Into the Breach / XCOM | Move + act, either order, once each | MST's strict move-then-act lock |
| Telegraphing | Into the Breach | Full visibility of enemy target/intent by default | ITB's near-zero RNG dogma (we allow some) |
| Combat energy/tone | Metal Slug Tactics | Numerous weaker enemies, changing grid, chain-y feel | MST's Adrenaline/Sync as core (deferred, see §9) |
| Progression | Mewgenics (lightly) / RPG-lite | XP levels, loot-driven builds, persistent named crew | Breeding, genetics, permadeath-as-currency |
| Puzzle precision | Tactical Breach Wizards | Clean, readable turn resolution, no wasted info | Its non-roguelike single-author level design (we're procedural/run-based) |
| Resource-as-hand | Fights in Tight Spaces | (Reference only, not adopted at launch) | Card-based action economy — not used |

---

## 3. Core Loop

1. **Squad select** — 3 units drawn from your persistent crew roster.
2. **Encounter** — grid battle, eliminate all enemies to win.
3. **Loot/XP** — drops and experience distributed to surviving units.
4. **Repeat** — next encounter, larger/harder grid, more enemies.
5. **Run ends** on squad wipe (primary), or occasionally a turn-limit survival objective.

No meta-currency, no breeding, no external "power grid" resource at launch — those are
explicitly *rarely/never* per your calibration. The loss condition is almost always
**your three units going down.**

---

## 4. Combat Rules (v1)

- **Turn structure:** Each unit gets one Move and one Action per turn, usable in
  either order (Move→Act, Act→Move, or just one). This is the XCOM/ITB standard —
  deliberately *not* MST's "commit to move, lose access to act first" lock, since
  you chose the looser option.
- **Grid:** Mid-to-large, MST-scale — bigger than ITB's tight 8×8, populated with
  more numerous but individually weaker enemies. Grid size may change between
  encounters (MST-style variability), not fixed like ITB.
- **Telegraphing:** Default mode shows full enemy intent — target tile, attack type
  — before you act, ITB-style. A future mode/toggle can hide this down to partial
  intent (aggressive/defensive icon only) for higher difficulty or late-game tension.
- **Win condition (v1):** Eliminate all enemies. (Survive-N-turns and hold-objective
  modes come later as secondary mission types.)
- **Loss condition:** Squad wipe (primary). Turn-limit survival failure (secondary,
  sometimes). Resource depletion (rare, not in v1).

---

## 5. Progression & Itemization (v1 → roadmap)

**v1 (build first):**
- Simple weapon swaps: each weapon changes a unit's basic attack profile — range,
  damage, area (e.g., knife = melee/high dmg, pistol = short range, pipe = knockback).
- A handful of passive trinkets (flat stat bonuses — found gear, no equip complexity).
- XP levels: units gain levels from combat, unlocking small stat bumps or a new
  active skill slot.

**Roadmap (post-slice):**
- Armor layer, consumables (drug-buffs fit the theme — temporary aggressive
  boosts with a comedown/downside, thematically rich and mechanically spicy).
- Territory-control bonuses tied to the turf-war framing.
- **Gear-driven combo/sync unlocks** — specific weapon or trinket pairings between
  two units unlock a bespoke combo attack, itemizing MST's Synchronization instead
  of making it a free universal passive. This is your stated long-term goal (9C).

**Explicitly not doing:** breeding, genetic inheritance, permadeath-as-currency.
Units are persistent named characters who survive within a run and carry XP/loot
forward; losing a unit mid-run is a real loss (squad wipe risk), not a system input.

## 5.1 Classes & Subclasses (owner direction, 2026-08-28)

Every unit has a **class** (three at launch — the existing `blade`/`niner`/`wrench`
archetypes graduate into class names) and each class has **subclasses** with their
own unique skills. This is Phase 2+ scope — no engine or `data/*.json` change ships
with this entry, it is the shape to build toward once Milestone 1's combat feel is
validated (§8/§9).

**The likeness is loose — the colour is the class.** Mewgenics' own answer to "how
do you tell a hundred different-looking characters apart at a glance" is not the
character's body, it's a colour read off their trait/class, independent of what
they look like. TURF adopts that directly: a unit's hair, build, skin tone and
jacket style are drawn freely from the cast (ART_REQUEST.md §2.1 already commits
to this — casting is not locked to specific archetypes) — **class is signalled by
an accent colour, not by who's wearing it.** Some looks will naturally suit some
classes better than others, and that's fine variety, not a rule.

That has to reconcile with a rule the game already depends on: a screen with both
factions on it reads warm-vs-cold at a glance (§6, and `art-src/palette.json`'s
whole operator/enemy split). The resolution is a two-layer read rather than
picking one system over the other — **faction stays the primary hue family
(operators cool, rivals warm), class is a secondary accent within that family**:
an operator's class colour rotates through the cool side (cyan, teal, blue-violet),
a rival's through the warm side (orange, amber, red). From across the board you
still read "cold = mine, warm = theirs" instantly; up close, the specific accent
tells you which class you're looking at. `art-src/palette.json`'s 32 colours
(§2.1) already has headroom for this — `operator_pale`/`enemy_pale` and the new
hair/cloth ramps give a class accent somewhere to live without touching the
faction-read greys.

**Illustrative subclass split** (names and numbers not final — the shape is the
point):

| class | subclass | unique skill idea |
|---|---|---|
| **Blade** (melee) | Slasher | bonus move after a kill — momentum rewards aggression |
| | Shiv | bonus damage against a flanked/already-engaged target — positioning reward |
| **Niner** (ranged) | Marksman | no move-and-shoot penalty; bonus damage at max range |
| | Enforcer | hits reduce the target's move range next turn instead of raw damage — control over burst |
| **Wrench** (control) | Bruiser | knockback travels further and damages anything it collides with |
| | Anchor | can end its turn planted, granting adjacent allies a defensive bonus — zone control, not offense |

## 5.2 Crew Naming

A persistent named roster (§3, §5) needs a name generator before it needs the
class tree wired up, so that half is built: `turf/js/names.js` + `turf/test/names.mjs`,
seeded off the same `makeRng` every other random draw in this engine already uses,
so a crew member's name replays identically for a given seed.

The pool is deliberately narrow rather than a global name list — genre stereotypes
narrowing the pool was the brief. TURF's setting is a Nordic border city, so
surnames are Finnish-majority with Sweden / Norway / Russia / Estonia — Finland's
actual neighbours — mixed in at minority weight; first names follow the same
split. A nickname layer (~40% of units) adds the genre joke on top: a build hint
('small'/'big') mostly draws a literally-fitting nickname (Tank, Bear... / Tiny,
Mouse...) but sometimes reaches for the mismatch on purpose — a big guy called
Smalls — plus a neutral pool (Ghost, Magpie, Knuckles...) and a HANDLE register
(catlady05, DialUp, GLHF99...) for the internet-username stereotype, a genuinely
different joke from a street nickname and drawn independent of build.

**A unit's identity is its name — nothing else.** `randomName()` returns a name
and nothing else on purpose: it has no idea what class its unit will play, and
it shouldn't. Class is assigned to a unit *in the game* (squad-select or
recruitment), same as §5.1's colour-not-likeness rule — a name is permanent, a
class is not baked into who someone is. Concretely, when the roster lands:
`unit.name` is set once (at creation) and never touched by class re-specs;
`unit.class`/`unit.subclass` live in a separate field that a respec can change
without touching the name. Don't let a future "starter kit" shortcut generate a
name and a class in the same call — that recouples exactly what this section
decouples.

**Not yet wired to the roster.** `data/units.json` still has three fixed ids
(`blade`/`niner`/`wrench`) with no name field — hooking `randomName()` up to an
actual persistent crew is the same Phase 2 roster work as §5.1, not done here.

---

## 6. Setting & Tone

Nordic 90s urban decay — concrete estates, sodium streetlights, rain, graffiti,
payphones, static-y radios. Cast: street punks, addicts, small-time pimps, low-level
muscle, fighting over blocks and stashes rather than saving the world. Visual
direction takes MST's clean isometric pixel-art *silhouette and readability* language
but re-skins it toward gritty realism rather than pulpy cartoon war-comic energy —
closer to a pixel-art *Insomnia*/*Trainspotting* aesthetic than *Metal Slug*'s
arcade tone.

---

## 7. Tech & Platform Plan

- **Prototype build target:** Web-based, JS/TS (Three.js or similar) — consistent
  with your existing browser-first prototyping pattern (see [[toko-drop]] /
  [[hyperdagger]]).
- **Intended port target:** Godot 4.x, primarily for controller support and a
  cleaner mobile/handheld pipeline — same porting pattern as Toko Drop's planned
  Godot port.
- **Unity — comparison notes (for later decision, not v1):**
  - *Pros:* mature 2D/isometric tilemap tooling, huge tactics-genre precedent
    (many grid-tactics indies ship in Unity), stronger out-of-box turn-based grid
    pathfinding plugins.
  - *Cons vs Godot:* heavier engine footprint, licensing/runtime fee history,
    steeper C# overhead if your pipeline is JS/GDScript-native, less friendly to
    your browser-prototype-first workflow.
  - *Godot advantages:* GDScript is closer in spirit to your JS prototyping loop,
    excellent controller input mapping out of the box, lighter export pipeline for
    Switch-likes/Steam Deck, free/open license fits an indie/agent-driven pipeline.
  - **Recommendation for later:** prototype and prove the core loop in web/JS first
    (fast iteration), then port to Godot once mechanics are locked — skip Unity
    unless a specific plugin need (e.g., advanced pathfinding) justifies it.

---

## 8. Prototype Scope (Phase 1 — build this first)

**Goal:** Prove the core combat *feel* only. No meta-progression yet.

- 1 single encounter.
- Fixed squad: 3 units, each with a distinct weapon (melee/short-range/knockback
  archetype split) to test the action-economy feel.
- Mid-size grid, MST-scale enemy count (aim for 5–8 weaker enemies vs your 3).
- Full ITB-style telegraphing on.
- Win condition: eliminate all enemies.
- No loot, no XP, no persistence — pure combat-turn feel test.

## 9. Phase 2 (immediately after Phase 1 validates)

- ~~Expand to 3–5 encounters in sequence.~~ 2 of 3–5 shipped (`backlot` →
  `loading-dock`, `js/main.js`'s `SEQUENCE`) — v4.
- ~~Add basic XP/leveling between fights.~~ Shipped, scoped to one run (not a
  cross-session save): a won encounter pays every surviving unit a clear
  bonus + a per-kill bonus (`combat.js`'s `awardXp`), levels cost
  progressively more XP and buy +2 max HP, healed immediately. No skill-slot
  unlock yet — that half of this line waits on §5.1's class/subclass system
  reaching the engine. `js/main.js`'s `crewProgress` carries level/XP/max HP
  across `SEQUENCE`, keyed by `defId` — v6.
- Introduce simple weapon-swap loot drops.
- Keep grid size/enemy count variable per encounter (MST-style unpredictability).
- Still no armor/consumables/combo-synergies — those stay on the roadmap (§5).

---

## 10. Open Design Questions (for next planning pass)

- ~~Exact unit archetypes for the 3-unit starting squad (roles, not just weapons).~~
  Addressed by §5.1 — three classes, two subclasses each, illustrative skills.
  Still open: whether enemy grunts get subclasses too, or stay single-archetype.
- Enemy archetypes and how "weaker but numerous" translates to actual stat design.
- Whether telegraphing is per-enemy-type or universal in v1.
- Grid traversal rules: obstacles, cover, elevation, hazards (drug-den fires? broken
  glass? Nordic-specific set dressing with mechanical teeth).
- Turn-limit survival mode specifics, for the "sometimes C" fail state.
