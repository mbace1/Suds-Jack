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

- Expand to 3–5 encounters in sequence.
- Add basic XP/leveling between fights.
- Introduce simple weapon-swap loot drops.
- Keep grid size/enemy count variable per encounter (MST-style unpredictability).
- Still no armor/consumables/combo-synergies — those stay on the roadmap (§5).

---

## 10. Open Design Questions (for next planning pass)

- Exact unit archetypes for the 3-unit starting squad (roles, not just weapons).
- Enemy archetypes and how "weaker but numerous" translates to actual stat design.
- Whether telegraphing is per-enemy-type or universal in v1.
- Grid traversal rules: obstacles, cover, elevation, hazards (drug-den fires? broken
  glass? Nordic-specific set dressing with mechanical teeth).
- Turn-limit survival mode specifics, for the "sometimes C" fail state.
