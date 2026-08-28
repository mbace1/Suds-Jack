# TURF — Version Log

<!-- Same rules as toko-drop/VERSIONS.md:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v1 — 2026-08-28
**Milestone 1: the single-encounter combat feel-test, from `composite-gdd.md`
§8 and `production-pipeline.md`'s Milestone 1 checklist.**

- Grid-tactics engine (`js/grid.js`, `js/combat.js`, `js/ai.js`) — pure data
  in/out, zero DOM, verified in bare node (`test/smoke.mjs`, 23 checks) the
  same way `eeri/test/rooms.mjs` verifies Eeri's rooms.
- 3 player operators (melee/ranged/control triangle — Blade's knife, Niner's
  pistol, Wrench's knockback pipe) vs 6 enemy grunts across 3 weapon-profile
  archetypes (blunt melee, handgun, shotgun) on an 11×9 board, "The Backlot".
- Move + act, either order, once each per unit (the XCOM/ITB standard the
  GDD calls for over MST's move-then-act lock).
- Two cover kinds with genuinely different mechanics: full cover blocks
  movement and line of sight outright; partial cover only softens a ranged
  hit (-30% to-hit) and never blocks anything. Only ranged attacks read
  cover — melee is always a guaranteed hit at hitChance 1, so cover is a
  reason to close distance rather than a wall you hide behind forever.
- Full ITB-style telegraph: every enemy's planned move-and-attack is visible
  before it happens, recomputed after every player action (not just once
  per round) so it never goes stale mid-turn.
- Knockback (the pipe's whole reason to exist): pushes along the dominant
  axis of the hit, stopping at the first blocked tile — a target shoved into
  a wall or another body just stops there rather than tunnelling through.
- Everything is data (`data/*.json`) per the pipeline doc's §3 — a new enemy
  archetype, a rebalanced weapon, or Phase 2's 3-5 encounter sequence is an
  edit to JSON, not a rebuild.

**Decisions made where the docs left a gap, recorded so they don't get
re-litigated:**
- **Plain canvas 2D isometric, not Three.js.** The pipeline doc says "Three.js
  or similar"; a tactics grid with move/attack-range overlays and telegraph
  icons is far easier to get right in 2D, and it matches the house
  convention every other 2D canvas game here already uses (dropcabal,
  flashprince, gameoflife). Rendered low-res and upscaled with
  `image-rendering: pixelated` — the same trick dropcabal uses.
- **Orthogonal (4-directional) grid, not 8-directional.** Keeps range and
  line-of-sight unambiguous (no "does a diagonal cut a corner" question),
  and it is what Into the Breach — one of the two named influences — itself
  uses.
- **3 enemy archetypes for Phase 1, not 4.** The pipeline's resolved
  assumptions list melee split blunt/sharp and ranged split handgun/shotgun
  (4 variants); Milestone 1's own checklist only asks for 2-3. Shipped
  blunt/handgun/shotgun and held melee-sharp back — it is a fourth JSON
  entry away, not a rebuild, when Phase 2 wants it.
- **HUD is DOM/CSS overlay, not canvas-painted** — the production doc's own
  §2.4 recommendation ("keep UI framework-driven... rather than hand-painted
  panels at prototype stage"), and it is what makes turn state, HP bars and
  the win/lose screen legible without hand-rolling text layout in canvas.
- Placeholder art is entirely code-drawn (flat silhouettes, Master-System-
  style hard outline, no image assets) — this repo's house convention, and
  also the only option available this session: no `GEMINI_API_KEY` /
  `MESHY_API_KEY` in this environment, confirmed via
  `node scripts/assets.mjs doctor`. A follow-up PR should request real
  Nano Banana concept art + Meshy meshes per the pipeline's Stage 1-2 once
  the owner wants to spend the credits on it.

**Traps paid for, worth knowing before editing this:**
- `createEncounterState`'s unit-uid numbering must be **per-faction**
  (`p0,p1,p2` / `e0..e5`), not a single shared counter across both spawn
  loops — a shared counter silently renumbers every enemy to `e3..e8` and
  every `getUnit(state, 'e0')` call returns `undefined`. Caught by the
  bare-node test suite before it ever reached a browser.
- `approachTile` (`grid.js`) is the one place "can this unit reach a tile
  that lets it hit that target" is answered — `ai.js`'s telegraph planning,
  `combat.js`'s `attackableTargets`, and `input.js`'s click-to-attack all
  call it. It was written three times in three files before being pulled
  out; a fourth copy is a bug waiting for someone to fix only one of them.
