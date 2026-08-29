# TURF — Version Log

<!-- Same rules as toko-drop/VERSIONS.md:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v9 — 2026-08-29
**Second round from a real annotated phone screenshot of the live v8 deploy:
"the top is unused, but could be background graphics. the grid could be
slightly bigger in the middle. bottom buttons could come up more. no actions
visible. no movement indicators, or enemy telegraphs visible. touch
placement is hard on such a small grid without any visual indicators."**
v8 was a real, measured improvement and still wasn't enough — this round
splits into two separate problems v8 never actually addressed.

- **The board still sat in empty space, gap to the panel included.**
  `#stage` centred the board vertically (`align-items: center`), which on a
  width-bound board (see v8) leaves slack in the *other* dimension split
  evenly above and below — exactly what "bottom buttons could come up more"
  is describing. Changed to `align-items: flex-end` with a 4px
  `padding-bottom`: the board now sits directly against the control panel a
  thumb is already on, and every pixel of unused space is pushed to the top
  (the "unused, could be background graphics" area — noted for a future
  pass, not built this round). `SIDE_MARGIN` (`render.js`) trimmed again,
  24px → 16px (was 32px in v7), and `fitCanvas`'s (`main.js`) outer padding
  subtraction reduced 16px → 8px — both freed more of the width budget a
  width-bound board actually uses. Checked empirically at 412×892 (closest
  match to the reported screenshot): board-to-panel gap dropped from ~220px
  to 4px, with no clipping at any edge tile on either encounter.
- **The interaction affordances were nearly invisible at real device
  scale — a rendering-contrast bug v8 never touched.** v8 was purely a
  sizing/layout pass; the move-tile/attack-tile highlight fills, the
  telegraph markers, and the selection ring were unchanged since first
  ship, tuned by eye on a desktop screenshot at a much larger effective
  size. That's the direct cause of "no movement indicators, or enemy
  telegraphs visible... touch placement is hard... without any visual
  indicators": the highlights were technically rendering, just too faint
  to read at the board's actual on-device size. `palette.js`'s
  `MOVE_HI`/`ATTACK_HI` fill alpha raised 0.30 → 0.48 and their edge
  colours brightened to 0.95 alpha; `render.js`'s `pen()` helper gained an
  optional line-width parameter (default 1, unchanged elsewhere) and the
  move/attack highlight outlines, the telegraph line and target diamond,
  and the selection ring now all draw at 2px instead of 1px. Verified with
  a unit actually selected (not just the idle board): move tiles, the
  attack-highlighted enemy, the gold telegraph diamonds and dashed lines,
  and the selection ring are all now clearly legible in a screenshot at
  412×892.
- Not addressed this round, both flagged rather than silently dropped: the
  now-larger empty area at the top of the board (the owner's own suggestion
  was background graphics — a follow-up, not built here) and the touch
  hit-test tolerance in `input.js`'s `unitAtPoint` (considered, left as-is —
  the legibility fix may make placement easier without it).

## v8 — 2026-08-29
**Portrait/mobile polish, from owner playtest feedback on the live v7 deploy:
"it's playable but needs work — the vertical view needs slight zooming and
more controls on the lower third panel."**

- **Zoom.** `fitCanvas` (`main.js`) used to snap any scale ≥1 down to a whole
  integer, which sounds like a small rounding rule but wasn't: backlot's
  board (11 tiles across) is width-bound on a phone in portrait, where the
  natural fit is rarely more than ~1.0–1.3x to begin with — so on every
  phone width actually measured (360–430px), that snap rounded the real
  scale straight back down to a flat 1x, and the board rendered at roughly a
  third of the available stage area with the rest black void. Two changes,
  together: `render.js`'s `computeLayout` had a full `TILE_W` (32px) of side
  margin per edge, well past what anything actually draws past a tile's own
  bounds (the widest bulge is the 14px HP bar/cursor ring, ~7px past tile
  centre) — trimmed to a `SIDE_MARGIN` of 24px, freeing real width budget;
  and `fitCanvas`'s snap grid moved from whole steps to tenths, since at
  these near-1x scale factors a whole/half-step snap was throwing away
  exactly the headroom the margin trim just freed. Verified empirically
  (not just computed) across four phone widths (360/390/414/430px) plus
  loading-dock's narrower grid: no prop, unit, HP bar, or cursor ring clips
  at any edge tile, and the board now visibly fills more of the screen at
  every width tested. This is a real, bounded improvement, not a full fix —
  an 11-wide board simply doesn't have much more headroom than this on a
  phone-width viewport without changing the projection itself.
- **The lower-third panel.** `#bottombar` was a single wrapping row: three
  small squad-select buttons plus two lines of status text — no dedicated
  action controls at all, and End Turn lived in the *top* bar, an awkward
  reach for one-handed portrait play. Restructured into three rows: squad
  select, then a real action row (End Turn plus a new Cancel button, both
  48px+ touch targets spanning the width), then status text. Cancel exposes
  `input.js`'s existing `cancelSelection` (previously only reachable via
  Esc/gamepad B) with a new `activateCursor` param defaulting to true for
  the keyboard/pad path but passed `false` from the on-screen button — a
  touch player tapping Cancel never asked for the keyboard/pad reticle to
  appear, same "a cursor nobody asked for is noise" rule input.js's cursor
  code already follows elsewhere.
- **Fixed along the way, found while screenshotting the portrait view:** the
  hub shell's HOME button (`position: fixed`, ~81px wide including its own
  padding) was overlapping "Your Turn" in the top bar — `#topbar`'s
  `padding-left` had reserved only 60px, measured wrong. Bumped to 96px.
- Standard token cascade: `render.js?v=3` → `v=4` (own bytes changed),
  cascading to both importers (`main.js`, `input.js`); `input.js?v=4` →
  `v=5` (its own bytes also changed independently — the new
  `cancelSelection` export); `index.html`'s `main.js?v=5` → `v=6`.
- `node turf/test/smoke.mjs` — 35/35 (rendering/layout isn't covered by the
  bare-node gate; this round's verification was real-browser screenshots
  and hit-test checks instead, described above).

## v7 — 2026-08-29
**Simple weapon-swap loot drops — GDD.md §9's third Phase 2 item.**

- `js/combat.js`: on a killing blow, if the victim was an enemy, a
  `DROP_CHANCE` (0.5) roll leaves its weapon behind on its own tile
  (`state.drops`, `{x,y,weaponId}`). `moveUnit` checks the destination tile
  after every player move and auto-picks up a drop there — `pickUpDropAt`
  swaps `unit.weapon` and clears the drop, no separate pickup action needed.
  This rides the existing "a dead body never blocks movement" rule for free:
  the same tile a unit could already walk *through* is one it can walk
  *onto* to loot. `state.weaponDefs` (the full weapons list) is now carried
  on state so `moveUnit`/render can resolve a `weaponId` back to a def
  without threading `weaponDefs` through every call site.
- `js/render.js`: a small marker (the same `weaponGlyph` language
  `drawTelegraph` already uses for an enemy's planned attack type) on any
  tile with a live drop, depth-sorted into the existing floor/props/units
  paint order.
- `js/main.js`: a toast on pickup ("Blade picks up a Bat.") read off the
  freshest `state.log` entry rather than threaded through `onChange`'s
  argumentless callback signature; `attackText` also appends "Drops a ___."
  to a kill line when the kill rolled one.
- **Not persistent.** A picked-up weapon lives only for the current
  encounter — `boot()` rebuilds each unit's weapon from its own def, and
  `crewProgress` (v6) only carries level/XP/max HP forward, not equipment.
  That is a real scope line, not an oversight: the run-scoped inventory
  GDD §5's roadmap eventually wants is a bigger feature than "loot drops
  exist at all," and this ships the smaller, real half first.
- `test/smoke.mjs`: a fixed (non-seed-hunted) `state.rng` override proves
  the drop roll both ways (under/over `DROP_CHANCE`) and that picking one up
  swaps the weapon and clears the drop, plus a control case (an ordinary
  empty tile picks up nothing).
- Verified in a real browser: a real kill (via the actual `attack()` path)
  drops the correct weapon on the correct tile, walking onto it next turn
  (once the attacker's move is free again) swaps the weapon and fires the
  toast, zero console errors.
- Standard token cascade: `combat.js?v=3` → `v=4` and `render.js?v=2` →
  `v=3` (both changed), cascading to both importers (`main.js`, `input.js`),
  which in turn bumps `input.js`'s own reference (`main.js?v=3` → `v=4`) and
  `index.html`'s `main.js?v=4` → `v=5`.

## v6 — 2026-08-29
**Basic XP/leveling between fights — GDD.md §9's second Phase 2 item, after
encounter sequencing (v4).**

- `js/combat.js`: `resolveAttack` credits a killing blow's attacker with a
  kill (new `unit.kills` field). `awardXp(state)`, called once per won
  encounter: every *surviving* player unit is paid a flat clear bonus
  (`XP_BASE_CLEAR` 10) plus a per-kill bonus (`XP_PER_KILL` 8) — a dead unit
  earns nothing, a unit that never landed a kill still earns the clear bonus.
  Levels cost progressively more (`xpToNext(level) = 20 + (level-1)*15`) and
  buy `+HP_PER_LEVEL` (2) max HP, healed immediately rather than banked; a
  big enough haul rolls more than one level in the same award. No skill-slot
  unlock — GDD §5's "or a new active skill slot" half waits on §5.1's
  class/subclass system reaching the engine, which it does not yet.
- `js/main.js`: `crewProgress` (keyed by `defId`, not `uid` — stable even if
  a future encounter reorders spawns) carries level/XP/max HP across
  `SEQUENCE`. **Scoped to one run, not a cross-session save** — same "survive
  within a run" framing as GDD §3/§5 already use; resets when a new run
  starts (a loss, or continuing past the final encounter), which is also the
  first real use of that "advancing vs. new run" branch in the `resultAgain`
  handler v4 introduced. `finishEncounter()` wraps both `showResult` call
  sites (`onChange`'s and `runEnemyPhase`'s) so the award happens exactly
  once per encounter — `state.rewarded`, reset in `boot()`, is the guard
  against `checkWinLoss` being reachable from more than one call site.
  Result-screen text now reports what was earned; the squad HUD and the
  selected-unit line both show level (and XP-to-next for the selection).
- `test/smoke.mjs`: kill-crediting on a deterministic one-hit kill, and
  `awardXp`'s math (no-op on an unfinished encounter, survivor-only payout,
  a single level-up banking its remainder and healing the HP bump, a big
  haul rolling more than one level) — all against hand-built state literals,
  the same style the grid-primitive checks already use.
- Verified in a real browser: a real win via the actual `attack()` path
  (RNG and all, not a mocked result) pays kills correctly per unit,
  Continue carries the exact post-award level/XP/max HP/HP into
  `loading-dock`'s fresh boot, and the squad HUD renders the level tag.
- `js/combat.js?v=2` → `v=3` (its own bytes changed) → cascades to its two
  importers: `js/main.js?v=3` → `v=4` and `js/input.js`'s own reference
  `?v=2` → `v=3`; `js/input.js` itself is referenced from `main.js` at
  `?v=2` → `v=3`; `index.html`'s `js/main.js?v=3` → `v=4` (main.js's own
  bytes also changed independent of the combat.js bump).

## v5 — 2026-08-28
**Animation-sheet feedback, doc-only.** `ART_REQUEST.md` §2.2: three
owner-supplied candidate animation sheets run through the real `key`/`fit`/
`check` tools, not judged by eye. IDLE/MOVE rows are genuinely usable
(measured tight, consistent frame pitch; a cropped frame came back `1/1
usable` through the full pipeline). ATTACK/HIT/DIE rows fail on every sheet
tested, for two independently confirmed reasons: motion-trail/blood FX
rendered as translucent effects get eaten by `key`'s magenta-ratio test
(severity scales with how opaque the model drew them), and frame pitch on
those rows isn't uniform (measured 129–222px within a single sheet, DIE rows
consistently widening frame-to-frame) so a fixed-cell `slice` can't
auto-extract them. Going forward: never bake motion FX into a plate meant
for keying, on any sheet — engine-drawn FX only, per house convention.

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
