# TURF — Version Log

<!-- Same rules as toko-drop/VERSIONS.md:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v4 — 2026-08-28
**Encounter #2: "The Loading Dock," and a real sequence between fights.**
GDD.md §9's first step — "expand to 3-5 encounters in sequence" — before the
XP/persistence half of that phase, per owner direction (encounter sequencing
first, progression after).

- `data/encounters.json`: a second fixed encounter, `loading-dock` — a
  tighter 9×10 grid (vs backlot's 11×9), asymmetric container/crate cover
  instead of backlot's mirrored layout, and 7 enemies (3 shotgun / 2 handgun
  / 2 blunt, vs backlot's 2/2/2) skewed toward close range for the narrower
  space. Same 3 archetypes — melee-sharp is still held back per v1's note.
- `js/main.js`: `boot()` now reads the encounter id off a `SEQUENCE` array
  and a `seqIndex` instead of hardcoding `'backlot'`. Winning a non-final
  encounter re-boots straight into the next one (fresh, full HP — no
  persistence yet, that's still queued after this); a final win or any loss
  resets `seqIndex` to 0. `showResult` picks title/body/button text off
  whether this is the last encounter ("Continue" vs "Run It Back"/"TURF
  SECURED"). `window.__turf` grew `sequence()`/`setSequenceIndex()` for
  testing the flow without fighting through a whole encounter.
- `test/smoke.mjs`: the data-integrity and bounds checks now loop over every
  encounter in `encounters.json` instead of hardcoding `BACKLOT`, and the
  bot-vs-bot playthrough runs once per encounter (both currently resolve in
  5 rounds against the naive bot — same difficulty character as backlot, not
  a regression).
- Verified in a real browser (Playwright): booting straight to `loading-dock`
  via `setSequenceIndex`, and a full real win on `backlot` through the actual
  `attack()` path (so `checkWinLoss` fires normally) — confirms the "Continue"
  button reads correctly and clicking it lands on `loading-dock` with a fresh
  squad. `js/main.js?v=2` → `v=3` (its own bytes changed; nothing imports it).
- Softened the title screen's tagline ("one backlot" → dropped, since that's
  no longer literally true) and its body copy ("clear the block to win" →
  "clear a block to move on to the next").

## v3 — 2026-08-28
**Design capture, not an engine change: classes/subclasses, crew naming, and
the first art-pipeline feedback loop. Nothing in `index.html`'s live import
graph changed, so no cache-token bump this round.**

- `ART_REQUEST.md` §2.1: the owner's first Nano Banana casting sheet (~20
  characters, generated outside this pipeline) validated the register but
  exposed a palette gap — hair colour, a second skin tone, denim, jewelry had
  nowhere to live in the original fourteen colours. `art-src/palette.json`
  doubled to 32, additive only (every original key keeps its value). Casting
  specific characters to specific archetypes stays deliberately unlocked —
  the class list below may still change, and it's loose by design (see next).
- `GDD.md` §5.1: **classes/subclasses with unique skills, likeness decoupled
  from class** (Mewgenics' own answer to "how do you read a class off a
  character" — colour, not the character). Reconciled against the game's
  existing warm-vs-cold faction read rather than replacing it: faction stays
  the primary hue family (operators cool, rivals warm), class is a secondary
  accent within that family. Illustrative split: Blade → Slasher/Shiv, Niner
  → Marksman/Enforcer, Wrench → Bruiser/Anchor — names and numbers not final,
  the shape is the point. Phase 2+ scope; no `data/*.json` change shipped.
- `GDD.md` §5.2 + `js/names.js` + `test/names.mjs`: a procedural crew-name
  generator — Finnish-majority first/last names with Sweden/Norway/Russia/
  Estonia (Finland's actual neighbours) mixed in at minority weight, plus a
  nickname layer that mostly draws a build-fitting name (Tank, Bear.../Tiny,
  Mouse...) but sometimes reaches for the mismatch on purpose — a big guy
  called Smalls — and a separate HANDLE register for the internet-username
  stereotype (catlady05, DialUp, GLHF99...), a different joke drawn
  independent of build. Seeded off the same `makeRng` every other random
  draw in this engine uses, so a name replays identically for a given seed.
  **A unit's identity is its name only** — `randomName()` has no notion of
  class, and per owner direction class is assigned to a unit in the game
  (squad-select/recruitment), never baked into its name. Not yet wired to
  the roster — `data/units.json` still has three fixed ids with no name
  field; that hookup is the same Phase 2 roster work as §5.1.

## v2 — 2026-08-28
**Keyboard and native gamepad, so the board is testable without a mouse.**

- `input.js` grew a cursor: arrows/WASD move it, Enter/Space confirms, Esc
  cancels, E ends the turn. A gamepad drives the same cursor through the
  site's one shared reader (`hub/pad.js` — the same module sudsjack,
  hyperdagger and dropcabal read natively): stick/d-pad move, A confirm, B
  cancel, Y end turn. Never Start — that's the arcade shell's hold-for-home,
  and colliding with it is a documented house mistake.
- All three input methods (tap, keyboard, pad) reduce to the same
  `handlePoint(hit, x, y)` a mouse click already used — nothing downstream
  (`combat.js`) knows or cares which one drove a given move or attack.
  Catalogue moved to `pad: 'native'`.
- The cursor only renders once a key or a pad button has actually been
  pressed (`render.js`'s `drawCursor`, gated on `input.js`'s `cursorActive`)
  — a reticle nobody asked for is noise for a mouse/touch player, the same
  call `gameoflife` makes with `:focus-visible`.
- Trap paid for: the first `confirmAtCursor()` draft revealed the cursor on
  its first press without acting on it (so a fresh player's first Enter/A
  looked like a dead button, needing a second press to actually select
  anything) — caught by a Playwright pass that pressed Enter once and
  asserted the unit was selected, not just that a cursor appeared.

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
