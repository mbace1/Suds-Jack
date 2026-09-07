# TURF — Asset & Production Pipeline
*Companion to composite-gdd.md*

Assumptions now resolved in the GDD (§10) — updated here accordingly:
- Unit roles: classic tactics triangle — melee / ranged (handgun or shotgun) /
  support-control. Character theming (which punk/addict/enforcer fills which role)
  deferred to a later pass.
- Enemies: mostly identical grunts + 1–2 elites as the primary model, layered with
  weapon-profile variety — melee grunts split blunt (knockback) vs. sharp (bleed/high
  damage), ranged grunts split handgun (steady mid-range) vs. shotgun (short-range
  burst). A scripted boss is a Phase 1 stretch goal, not a requirement.
- Hazards: two types from the start — physical cover (blocks movement/LOS entirely)
  and XCOM-style ranged cover (reduces ranged hit chance/damage without blocking
  movement or LOS outright).

---

## 1. Pipeline Philosophy

Two build targets, two speeds:
- **Web/JS prototype (now):** disposable-quality art acceptable, structure and data
  format matter more than final polish — this build exists to validate *feel*.
- **Godot port (later):** this is where final art, animation, and audio actually
  ship. Nothing in the web prototype should be built in a way that blocks reuse —
  data formats and asset naming conventions should port cleanly, even if the pixel
  art itself gets redrawn at higher fidelity.

Rule of thumb: **build data-driven, not hardcoded.** Units, weapons, enemies, and
grid layouts should be defined in JSON/data files from day one, not baked into code.
This is the single highest-leverage decision for pipeline speed — it's what lets an
art pass, a balance pass, and a level pass happen independently.

---

## 2. Asset Categories

### 2.1 Unit sprites (player squad)
- Isometric pixel art, MST-referenced silhouette clarity (readable at small scale,
  strong color-blocking per faction).
- Per unit, minimum state set for Phase 1:
  - Idle (grid-standing)
  - Walk/move cycle (4–8 directions depending on iso grid convention — recommend
    8-direction for MST-style readability, or 4-direction + mirroring to cut cost)
  - Attack animation (per weapon archetype — melee swing, ranged fire, knockback)
  - Hit/stagger reaction
  - Death/KO
- Phase 1 needs only the 3 starting archetypes (punk/addict/enforcer). Don't build
  a bigger roster than the GDD's 3-unit squad calls for yet.

### 2.2 Enemy sprites (rival gang)
- Base grunt sprite (reused/palette-swapped for the "mostly identical" bulk of
  enemies) plus weapon-profile variants: melee-blunt, melee-sharp, ranged-handgun,
  ranged-shotgun — 4 sprite variants minimum, built as palette/prop swaps on a
  shared skeleton to keep cost down.
- 1–2 elite variants: distinct silhouette, not just a palette swap, so they read as
  a threat-tier change at a glance.
- Same animation state minimum as player units, but AI-driven variants can skip
  idle-cycle polish early (only movement/attack/death strictly needed to test combat
  feel).
- Boss unit (if attempted in Phase 1) needs full animation set + a distinct attack
  telegraph shape — treat as stretch scope, not baseline.

### 2.3 Environment / grid tiles
- Base floor tile set (isometric, Nordic urban: concrete, asphalt, wet pavement
  variants).
- **Two hazard/cover object sets**, visually distinct from each other so players can
  read the mechanical difference at a glance:
  - *Full cover* (blocks movement + LOS): dumpsters, fences, parked cars.
  - *Partial/ranged cover* (reduces ranged hit chance/damage, doesn't block
    movement/LOS): low walls, crates, rubble piles, curbs.
- Grid highlight overlays (move range, attack range, telegraphed target tile) —
  these are UI-functional, prioritize clarity over mood art at this stage.

### 2.4 UI
- Turn order indicator, HP/action-point readouts, weapon/ability icons, enemy
  intent telegraph icon (Q from GDD §4 — full ITB-style visibility by default).
- Keep UI framework-driven (HTML/CSS overlay or a UI library) rather than
  hand-painted panels at prototype stage — swap for final art during Godot port.

### 2.5 Audio (Phase 2, not Phase 1-critical)
- SFX: footstep/movement tick, weapon-specific hit sounds, hazard interaction,
  turn-start/turn-end cues.
- Music: not required for Phase 1 feel-test; add ambient loop in Phase 2 slice for
  tone-setting.

---

## 3. Data Architecture

Recommend a flat, human-editable JSON schema from day one so units/weapons/enemies
can be tuned without touching code:

```
/data
  /units.json        // archetype base stats, sprite refs, animation refs
  /weapons.json       // range, damage, area, knockback, archetype tag
  /enemies.json        // enemy archetype stats + weapon refs
  /encounters.json     // grid size, enemy composition, hazard placement (Phase 1: single entry)
  /trinkets.json        // (Phase 2) passive item defs
```

- `units.json` and `enemies.json` reference weapons by ID from `weapons.json` —
  keeps the melee/ranged/knockback archetype split (GDD §8) reusable across both
  player and enemy rosters instead of duplicating stat blocks.
- `encounters.json` is the seed for procedural/variable grid size later (GDD's
  MST-style "grid size may change between encounters") — even Phase 1's single
  fixed encounter should live in this format, not be hardcoded, so Phase 2's
  expansion to 3–5 encounters is a data-add, not a rebuild.

---

## 4. Tooling

- **Engine (prototype):** Three.js or lightweight custom canvas/WebGL renderer —
  consistent with your existing web-prototype pattern.
- **Art tool:** Aseprite (industry-standard for iso pixel art + animation export,
  and it exports clean sprite sheets that port well to Godot's AnimatedSprite2D
  later).
- **Art production approach:** AI-assisted generation for placeholder sprites now
  (unblocks Milestone 1 without waiting on final art), hand-pixel-art pass in
  Aseprite later once the core loop and unit roster are validated. Placeholder
  sprites should still respect final target dimensions/frame counts so the later
  swap is drop-in, not a rebuild.
- **Data editing:** plain JSON is fine at this scale; if the data files grow past
  ~20-30 entries each, consider a lightweight spreadsheet-to-JSON export step
  (Google Sheets → JSON) so balance passes don't require hand-editing raw files.
- **Version control:** repo lives inside [[toko-drop]] (the Suds-Jack repo/hub),
  alongside your other Suds-Jack projects — new project folder within that
  existing structure rather than a standalone repo.

---

## 5. Production Milestones

### Milestone 1 — Phase 1 combat feel-test (from GDD §8)
- [ ] Grid renderer (mid-size, MST-scale) with move/attack range highlighting
- [ ] 3 player unit archetypes: sprites (placeholder-quality OK), stats, weapons
- [ ] 2–3 enemy grunt archetypes: sprites, stats, basic AI (move toward + attack
      nearest, or simple threat-priority logic)
- [ ] Turn order system, move+act economy (either order, once each)
- [ ] Full enemy intent telegraph (target tile + attack type shown pre-turn)
- [ ] Win/loss detection: eliminate-all-enemies win, squad-wipe loss
- [ ] One hazard type (cover blocking LOS/movement)
- **Exit criteria:** the single encounter is fun/tense to play through repeatedly
  with no progression systems attached. This is the gate before Phase 2 starts.

### Milestone 2 — Phase 2 vertical slice (from GDD §9)
- [ ] Encounter sequencing (3–5 fights in a row, `encounters.json` expanded)
- [ ] XP/leveling system (per-unit, minimal — stat bump + skill unlock)
- [ ] Loot drops: weapon swaps from `weapons.json` pool
- [ ] Variable grid size/enemy count per encounter entry
- [ ] Basic run-start/run-end UI flow (squad select → sequence → results)
- **Exit criteria:** a full 3–5 fight run is completable start to finish, with
  visible unit growth between fights.

### Milestone 3 — Godot port planning (not scoped yet)
- Deferred until Milestone 2 validates the loop. Revisit engine comparison
  (GDD §7) at that point with actual asset volume known.

---

## 6. Open Production Questions

- Target frame budget for animations (how many frames per state — affects Aseprite
  workload significantly at scale, once the hand-art pass begins).
- Which AI-generation tool/workflow for placeholder sprites (affects whether output
  dimensions/frame structure need manual cleanup before use).
