# TURF — Version Log

<!-- Same rules as toko-drop/VERSIONS.md:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - The number here is the public release number; the ?v=N token in index.html
    is a separate counter that tracks module-graph changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
-->

## v20 — 2026-09-02
**One lineage for the cast attack art — and a direction defect recorded
rather than shipped quietly.**

The version half. `claude/turf-cast-attack-fix` carried its own **v13**
while this branch had independently created a different v13 and built
v14-v19 on top. Two lineages reaching the same number is the exact trap
`CLAUDE.md` documents for Eeri ("never reuse a version number"). Resolved
by bringing that branch's commit here and renumbering it, so there is one
history instead of two claims on one integer; the original branch is
superseded by this entry and needs no separate merge.

The art half, stated accurately:

- Its own claim is **true**: v12's windup and release described the same
  end pose with only tension wording differing, and the rewrite gives two
  genuinely different drawings. Measured with this branch's
  `tools/spritecheck.py pairs` — origin-normalised silhouette IoU between
  windup and release:

  ```
              windup <-> release      legs only
    gunner    0.812  ->  0.419       0.723  ->  0.344
    leopard   0.600  ->  0.532       0.578  ->  0.564
  ```

- **But the new frames are drawn in near-PROFILE**, and Sprite Bible §5
  forbids that outright: the authored views are front diagonal (down-right)
  and rear diagonal (up-left), with "No profile side-scroller pose" and "No
  cardinal straight-front" both listed as rules. The idle frames — direct
  casting-sheet crops — are correctly diagonal, so the set now drifts
  within one character. Failure codes **D1** (wrong direction) and **D2**
  (perspective/facing drift). The old frames were also off (roughly
  straight-front with arms out), so this is a worse violation, not a new
  one: the regeneration traded a mild §5 breach for the one §5 names.

- **This also confounds the number above, and the earlier read of it was
  over-claimed.** Part of that IoU drop is the body ROTATING toward
  profile, which changes a silhouette a great deal without being the
  two-beat mechanical difference that was wanted. A geometric similarity
  score cannot tell a pose change from a camera change — the repo's own
  standing lesson that "a gate that certifies *works* cannot see *looks*",
  earned here again.

- **Not regenerated**, because there is no `GEMINI_API_KEY` in this
  environment. What a fix needs is recorded instead: the same two
  geometrically-opposite silhouettes, re-prompted with the direction
  pinned to the front diagonal the idle already establishes, and checked
  against the idle rather than only against each other.

- Nothing plays these frames yet — `anim.js`'s attack clip only runs for
  gunner/leopard, and neither is in the default squad — so the defect is
  latent rather than live. It should not reach the board before §5 is met.

- **A renderer bug this art surfaced, and fixed here.** `drawUnitSprite`
  scaled every frame to `SPRITE_H` using *that frame's own* ink height,
  which divides the pose out: a deep attack crouch is genuinely shorter
  than full extension, and normalising each frame independently scales the
  crouch back up to standing height — erasing the body-height rhythm Bible
  §7.4 calls the easiest way to spot a broken cycle, and making a character
  swell and shrink between frames. Gunner's windup and release differ
  **36.7%** in ink height, so this was not a rounding concern. Frames now
  scale off the character's own idle frame, one scale per character; units
  with a single static plate are unaffected (verified: the default squad
  resolves no cast frame and takes the unchanged path).

- Tokens: `render.js` v9->v10, `anim.js` v3->v4, `main.js` v11->v12.

## v19 — 2026-09-02
**Enemy behaviours — GDD §10's other open question ("enemy archetypes and
how 'weaker but numerous' translates to actual stat design").** Eighteen
enemies had shipped, and every one of them ran the same plan: close on the
nearest operator and swing. They differed only in how much damage they did.
In a game whose whole design is the telegraph, that means the roster was one
enemy with eighteen portraits — two enemies that both say "I will hit Blade"
are not two enemies.

- **Four behaviours**, naming how an enemy wants to STAND when it attacks.
  `charger` goes straight at you. `skirmisher` keeps the range its gun gives
  it and pays a real penalty for ending up in anyone's melee reach — which
  is what turns a handgun grunt from "a knife that shoots" into something
  you have to close on. `holder` prefers tiles where the target's shot back
  would be softened by cover. `flanker` refuses to shoot into cover,
  preferring the angle where the target's own cover does not help — which is
  what stops a player parking in partial cover and treating it as a wall.
- **Two focuses**, naming who it wants dead. `nearest`, or `weakest` — the
  one that makes a pack dangerous, because it finishes the operator you were
  about to pull out instead of letting it walk away.
- **Behaviour follows the weapon**, so what an enemy does matches what it
  holds and a player can guess the intent from the sprite before reading the
  telegraph. Three individuals deliberately break their weapon's default
  (both move-4 grunts flank; Sable is a shooter who stays put), so the roster
  is not fully predictable from the kit alone.
- **`approachTile` was left alone.** It answers "the cheapest tile to attack
  from", which is exactly the question a behaviour needs to disagree with —
  and input.js's click-to-attack depends on it meaning what it means. ai.js
  enumerates its own candidates instead.
- **Ties break on uid everywhere**, because the telegraph is recomputed after
  every player action and an intent that flickers between two equally good
  tiles is unreadable even though each frame is individually correct. A test
  asserts replanning an unchanged board gives an identical plan.
- **No new board marker.** `drawTelegraph` already shows where each enemy
  will stand and who it hits — that IS the behaviour made visible, and a
  fifth icon on top of it would be icon soup, not information. The archetype
  is named in the turn narration instead ("Shooter keeps its distance",
  "Blunt closes in"), which teaches the vocabulary through play rather than
  through a legend nobody reads.
- Data-driven per GDD §3: an unknown behaviour or focus falls back to
  charger/nearest, so a typo in content is a dull enemy, never a crash.
- Gate: 50 -> **55 checks**. The behaviour test proves a skirmisher actually
  stands further off than a charger from the same tile, rather than just
  asserting the field exists — a data field nothing can distinguish is not a
  feature.
- Tokens: `ai.js` v3->v4, `combat.js` v6->v7, `main.js` v10->v11.

## v18 — 2026-09-02
**Hazards — GDD §10's open question ("obstacles, cover, elevation, hazards
... Nordic-specific set dressing with mechanical teeth") answered, and with
it the thing that finally makes knockback a weapon.** The pipe has shipped
since v1 pushing bodies two tiles for no particular reason; there was
nothing on the board to push them INTO. Into the Breach — this game's
stated telegraphing north star — is built almost entirely on that verb.

- **Three kinds, in `data/hazards.json`** (data-driven per GDD §3; the
  engine reads ids and knows nothing about fire as a concept). Den fire:
  2 on entry AND 2 again at the end of the round if you are still standing
  in it, so crossing is a toll and stopping is a mistake — the only hazard
  that pushes units around the board rather than around one tile. Broken
  glass: 1 on entry, no linger, a cheap price on a shortcut. Open
  stairwell: lethal, ignores HP entirely.
- **A hazard never blocks movement.** That is what cover is for. A hazard
  makes a tile cost something, so the board asks a question instead of
  drawing a wall — and every one applies to BOTH factions, because an
  asymmetric hazard is a trap the player learns to ignore, and the symmetry
  is what lets a player set one up on purpose.
- **One entry point, not three.** A player move, a knockback and an enemy's
  own step all route through `enterHazard`, because the third copy is
  always the one that forgets to check. It runs `checkWinLoss` itself: a
  fire killing the last operator has to end the encounter exactly like a
  killing blow.
- **A lethal hazard CATCHES what is shoved across it** — found by the new
  test, and a real bug rather than a test artifact. The pipe's knockback is
  2, so a body shoved at a stairwell sailed clean over it and landed on the
  far side; worse, it made the HEAVIEST knockback weapons the worst at
  using a pit, the exact opposite of the intent. `applyKnockback` now stops
  on a lethal tile. Non-lethal hazards do not stop momentum — you only pay
  for the tile you come to rest on. A shove-kill credits the shover.
- **The AI understands them, or the telegraph lies.** `ai.js` scores a
  candidate tile's hazard cost in HP (a lethal tile costs the enemy's whole
  bar, so it is never chosen but the comparison stays arithmetic), takes a
  firing position unless standing there would kill it outright, and
  otherwise trades 1 HP against 1.5 tiles of approach — enough to route a
  healthy enemy around a fire, not enough to refuse a scratch for a
  shortcut. A full-information game cannot show a plan its own actor would
  regret; a test asserts no telegraphed move steps into a lethal tile.
- **Read by shape, not just colour.** Fire fills the tile and flickers
  upward, glass is a scatter of hard shards, the stairwell is a hole — the
  only one that reads as an absence, because it is the only one that is not
  survivable. Fire is deliberately RED-orange: `PAL.TELEGRAPH` is amber, and
  "this tile burns" must never sit in the same colour band as "an enemy will
  hit this tile" — one is a standing property of the board, the other a
  promise about next turn. Drawn into the floor, under the move/attack
  highlights, since "can I reach it" and "what does it cost" are asked in
  that order.
- Placement escalates across the sequence: backlot teaches with glass alone
  (nothing lethal in the tutorial fight), fire arrives at loading-dock, the
  first stairwell at warehouse once the player has met both. A test asserts
  no hazard overlaps cover or a spawn.
- Hazard damage gets its own floating number and flash, or a unit loses
  health with nothing on screen accounting for it; a lethal tile floats its
  name instead of a number. The attack toast names the hazard when a shove
  ends in one, since a shove-kill otherwise reads as a kill with no damage
  behind it.
- Gate: 41 -> **50 checks**.
- Tokens: `combat.js` v5->v6, `ai.js` v2->v3, `render.js` v8->v9,
  `anim.js` v2->v3, `main.js` v9->v10 in `index.html`.

## v17 — 2026-09-02
**The feel layer: units walk instead of teleporting, hits are visible and
audible, and TURF gets sound at all.** No new art — every one of these
works off the assets already in the tree, including for the twelve
characters that are still a single static plate.

- **Movement tweening.** `combat.js` teleports a unit to its destination
  the instant an order resolves, which is correct for the model and
  reads as a piece blinking across the board. `anim.js` now carries the
  VISUAL back to where the unit started and lets it catch up
  (`glideFrom`), 85ms/tile with a 130ms floor. The offset is returned in
  fractional TILES rather than screen pixels: `toScreen()` is linear in
  (gx, gy), so interpolating tiles and projecting once is identical to
  interpolating screen space — and it keeps `anim.js` free of layout.
  A knockback is the same motion with a different origin and clock,
  reconstructed from the attack event's own `{moved, dx, dy}`.
  The unit's TRUE tile still owns the selection ring; only the body lags,
  so the board never lies about where anything is.
- **Hit feedback.** A white flash and a floating damage number on every
  landed blow, `MISS` on a whiffed one — a miss needs its own feedback or
  it is indistinguishable from an input that never registered. The flash
  is the sprite REDRAWN in `lighter` composite rather than a white
  `fillRect`: drawing the same image additively brightens exactly the
  silhouette's own pixels and leaves the transparent surround alone,
  where a rect paints a glowing box around the character. Numbers draw
  last, above every unit, with an ink halo so they stay legible over any
  tile.
- **Audio — the first in this game.** `js/audio.js`, synthesised, no
  files, following the house rule every other cabinet here uses: every
  voice routes through ONE master gain rather than `ctx.destination`, so
  the mute switch actually mutes, and any sound added later inherits it.
  Register is dry and low to match the setting — a scrape, a crack, a
  thud, nothing sparkles. A weapon's `archetype` picks the attack voice,
  so a knife and a pistol are told apart by ear; the impact is staggered
  70ms behind the swing so the two read as cause and effect. Persisted
  Sound button in the bottom bar (`turfMuted`), and the context is
  unlocked from the title's real click because a browser allows it from
  nowhere else.
- **One log cursor, not two.** Audio hangs off a new `onEvent` callback
  on the animator rather than walking `state.log` itself. Two independent
  cursors over one append-only list is two chances to double-fire or skip,
  and they drift the moment one is reset and the other is not.
- `window.__turf` now exposes `anim` and `audio`: a tween that exists for
  200ms cannot be verified from a screenshot taken afterwards, and this
  round was checked by sampling `offsetFor()` across a real move
  (-0.97 -> -0.40 -> -0.08 -> settled) rather than by eye.
- Tokens: `render.js` v7->v8 (+ both importers), `anim.js` v1->v2,
  `audio.js` v1 new, `main.js` v8->v9 in `index.html`.

## v16 — 2026-09-01
**Two rendering bugs in v15's sprite/prop work, both caught by the owner
rather than by v15's own verification: feet floating off the tile, and
cover props clustering into visible duplicates.**

- **Feet floating ~1m over the grid.** Owner: "characters are floating 1m
  over the grid." `drawUnitSprite` anchored a sprite's draw position to
  its full source-image `naturalHeight`, but the casting pipeline's `fit`
  step centres every plate into a fixed 192×288 canvas with wildly
  inconsistent transparent padding below the feet (measured 7–64px across
  different plates) — the height used for anchoring and the height of the
  actual figure were never the same number. Fixed with a one-time
  `scanInkBounds` pixel scan per loaded image (an offscreen canvas +
  `getImageData`, run once in the image's `onload` alongside the existing
  cache) that finds the real ink top/bottom; `drawUnitSprite` now anchors
  to `inkBottom` instead of `naturalHeight`, and scales off the ink
  content height rather than the full canvas height. Checked the 8 prop
  images against the same question first — they only carry 3–6px of
  padding from being cropped tight in v15, not this bug, so `drawProp`
  didn't need the same fix.
- **Cover props clustering.** Owner: "the examples look ok, but have too
  many of the same objects... the screenshots look messy?" v15's fix for
  too few pool choices (2/6 → 4/4) introduced a new problem: the
  distribution hash `(gx*7+gy*13)%pool.length` collapsed 5 of backlot's 6
  full-cover tiles onto the same pool index, so a screenshot showed
  several identical notice-board panels in a row. Replaced the hash with
  `assignPropArt` — a deterministic greedy pass that, per tile in a fixed
  order, picks whichever pool item appears least often among tiles
  already assigned within Manhattan distance ≤4. Still fully
  deterministic (no per-frame flicker, same map paints the same props
  every render) but spatially aware, so a cluster of full-cover tiles no
  longer converges on one prop.
- Verified in a real browser at 4x zoom on `backlot`, `warehouse` and
  `the-yard`: feet now sit directly on the tile's faction-ring marker with
  no visible gap, and cover props show genuine variety (crate, statue,
  bike rack, bin, bench, barrier all distinct, no adjacent duplicates).
  `warehouse`/`the-yard` reusing `backlot`'s cover-tile layout deterministically
  reuse its prop assignment too — expected, since the goal was eliminating
  within-board clustering, not cross-encounter variety.
- `render.js` ?v=7 — `input.js` ?v=7 and `main.js` ?v=8 both already
  imported it at their current tokens and only their `render.js?v=` string
  needed bumping; neither module's own bytes changed this round.
- `node turf/test/smoke.mjs` — 41/41, unchanged (pure rendering fix, no
  game-logic changes).

## v15 — 2026-08-31
**Real character sprites and real cover props on the board itself, a
transparent grid over the background photo, plus a headshot audit —
the render.js rewrite v14's backgrounds were building toward.**

- **Headshot audit.** Owner: "some of those character head crops weren't
  done well. check them again and fix the ones that need fixing." A
  systematic pass (a script scanning all 32 for disconnected bleed gaps
  and sudden width jumps near the crop's bottom edge, plus a full visual
  review at 4x size) found two real defects, both a raised weapon
  confusing the crop heuristic: `grunt-blunt`'s raised bat was mistaken
  for the head/shoulder line, cropping mostly bat with a tiny face;
  `niner`'s crop caught the tip of his raised, extended pistol arm as a
  disconnected-looking fragment. Both re-cropped. The other 30 checked
  clean.
- **The grid is transparent over the background now.** Owner: "the grid
  should be transparently laid on the backgrounds so that the players are
  in the courtyard." `drawFloor` went from an opaque per-tile fill to a
  translucent tint + outline, and `render()` no longer paints an opaque
  `PAL.VOID` rect over the whole canvas first — a canvas is transparent by
  default once nothing paints over it, which is what lets v14's
  `--encounter-bg` CSS photo show through.
- **Real character sprites on the board.** Owner: "start replacing player
  characters with character model sprites." Every unit/enemy gets a new
  `sprite` field (the full-body plate — separate from `portrait`, the
  headshot the squad-row/selection UI uses; a body reads fine at real
  board size, it read as a blob shrunk to a 34px UI icon, which is why
  that one is a head crop instead) drawn via a small image cache in
  `render.js` (`getImage` — `render()` is called synchronously and often
  with no `await` anywhere in the file, so a not-yet-decoded image just
  isn't drawn that one call; its `onload` re-invokes `render()` with the
  last known args once ready). `computeLayout`'s headroom and
  `input.js`'s tap hit-box both now key off a new `SPRITE_H` (46px, the
  real drawn height) instead of the old, shorter `UNIT_H` silhouette —
  otherwise a full-height sprite in row 0 clips off the top of the canvas,
  and tapping a unit's actual head misses. The original procedural
  silhouette survives as `drawUnitFallback`, used only for a unit with no
  `sprite` yet or for the one render call before an image loads.
  **Found and fixed along the way**: a real sprite carries its own colours
  (a jacket, not a faction paint job), so the cold-operator/warm-rival
  read the flat silhouette gave for free was silently gone once sprites
  replaced it — added a small faction-tinted ring at each unit's feet
  (`PAL.PLAYER`/`PAL.ENEMY`, the same two house colours everywhere else)
  so the two sides stay glanceable regardless of which sprite is drawn
  above it.
- **Real cover props.** Owner: "start adding assets to the playfield for
  cover" (attached an 8-object isometric prop sheet — barrier, bollard,
  litter bin, bike rack, notice board, bench, crate-on-pallet, park
  statue). Cropped all 8 the same way as every other casting-sheet batch
  this session (background-colour masking, `key`/`fit --no-quantise`,
  natural aspect kept rather than forced to 192×288 since these aren't
  humanoid). `drawProp` now draws the real image, picked deterministically
  off the tile's own `(gx,gy)` so the same map paints every render (no
  per-frame flicker) — split 4 dense/tall props (crate, statue, bike
  rack, notice board) for full cover, 4 shorter ones (barrier, bollard,
  bin, bench) for partial. **First pass split this 2/6** — with only 2
  choices for full cover, a 5-6-tile encounter repeated the same prop
  three times over ("the examples look ok, but have too many of the same
  objects"). Rebalanced to 4/4, real variety. `drawPropFallback` keeps the
  original procedural box for the same one-frame-while-loading case as
  units.
- **A 5th uploaded reference** (a painted Darkest-Dungeon-style combat HUD
  — headshot portrait, Guard/Nerve bars, front/middle/back row
  positioning) was saved as `art-src/reference/ui/goal-hud-reference.png`
  in v14 and stays forward direction only, not built this round — a
  different combat model (row-based formation, not a grid), not a
  same-session follow-up.
- Verified in a real browser: all 5 encounters render sprites + props +
  background correctly; tapping a unit's real sprite body (not just the
  old, shorter hit-box) selects it; faction rings visible; 44px+ touch
  targets hold; no horizontal overflow; zero console/network errors.
- `render.js` ?v=6, `input.js` ?v=7, `combat.js` ?v=5, `main.js` ?v=8 —
  every module in the changed import chain bumped together.
- `node turf/test/smoke.mjs` — 41/41, unchanged (pure game logic, this
  round is entirely rendering + data). `test/assets-smoke.cjs` unaffected.

## v14 — 2026-08-31
**Second roster batch + headshot icons + encounter backgrounds — three
owner-driven follow-ups on v13's roster work, same session.**

- **Headshots, not full-body icons.** Owner's call: "on the actual field
  too, they don't do much in the icons side, so no value there. maybe a
  head shot" — a 192×288 full-body plate read as an indistinct blob at
  26×39 icon size; a face reads. Wrote a head-crop finder that locates the
  actual head (not the topmost ink pixel, which is wrong whenever a
  character holds a weapon raised above their head — `grunt_blunt`'s bat,
  `sledge`'s hammer, `leopard`'s knife, `knuckle`'s flail all do): scan
  down from the ink top for the first row where width is head-sized and
  stays that way for 6 rows running (skips past a thin raised weapon
  silhouette), then find the shoulder-broadening point below it. Every
  `portrait` field (v13's 18 plus the original 6) now points at
  `art-src/sprites/heads/<id>-head.png` instead of the full plate.
  Squad-row and selected-unit icons resized from a 2:3 body crop to a
  roughly-square face crop (`object-position: 50% 15%` keeps the face
  centred when `cover` trims the sides).
- **Found and fixed a real bug while building the heads**: `leopard-idle`
  (and `-back`) carried the exact top-edge crop-bleed v12 fixed for
  `gunner-idle` — never applied to leopard at the time. Same fix: tighter
  crop off `casting-sheet-full.png`'s row/column bounds, `_ref-leopard*`
  replaced too so future generations off it start clean.
- **6 more characters** from a second casting sheet the owner posted
  (`turf/references/casting-sheet-3.png`, 3×2 pairs): Reed, Vex, Knuckle
  (new players) and Smoke, Milo, Duffy (new enemies). Knuckle carries a
  new weapon, `flail` (melee, dmg 3, knockback 1, hitChance 0.9) — read
  off what he's actually holding in the sheet, a ball-and-chain. Player
  pool 11→14, enemy pool 15→18. A fifth encounter, `the-yard` (backlot's
  proven grid+cover again), added to `SEQUENCE` so the new squad is
  actually reachable through play.
- **Per-encounter background photos.** Owner posted 5 isometric Nordic
  night-scene renders and asked to try some as backgrounds. Downscaled to
  1100px wide, re-encoded as JPEG (2-2.8MB PNG → 66-100KB each — this is a
  phone-first game, the SIDE_MARGIN comment in `render.js` says so
  directly). Matched by fiction: `dockyard.jpg` → loading-dock/underpass,
  `courtyard.jpg` (tenement) → backlot/warehouse, `schoolyard.jpg` →
  the-yard (it's a literal schoolyard court). New `background` field per
  encounter in `encounters.json`; `main.js`'s `boot()` sets it as a CSS
  custom property (`--encounter-bg`) on `#stage`, layered under a dark
  scrim so it only shows in the slack space around the canvas board — the
  board itself is opaque and untouched, so this is zero risk to gameplay
  readability, pure atmosphere. The 5th uploaded reference (a painted
  Darkest-Dungeon-style combat HUD with headshot portrait, Guard/Nerve
  bars, front/middle/back row positioning) was saved as
  `art-src/reference/ui/goal-hud-reference.png` and logged as forward
  direction — NOT implemented this round, it's a different combat model
  (row-based formation, not a grid) and a full HUD rebuild, not a
  same-session follow-up.
- Verified in a real browser: all 5 encounters load with correct rosters,
  headshots and backgrounds; zero console/network errors; 44px+ touch
  targets hold; no horizontal overflow at phone width.
- `node turf/test/smoke.mjs` — 41/41 (was 39; +2 for the-yard's
  playthrough checks). `test/assets-smoke.cjs` unaffected, still green.

## v13 — 2026-08-31
**Roster expansion: 18 new characters cropped from the owner's casting
sheets as static portraits (no animation, no generation — free, local crops),
wired into real playable data and two new encounters. "Get the actual
gameplay working" with the wider cast, not more art polishing.**

- **18 new portrait plates**, cropped directly from
  `turf/references/casting-sheet-full.png` — same technique as the
  gunner-idle crop-bleed fix (v12): background-colour masking finds each
  character's true ink bounds (rows/columns bleed past the nominal grid,
  and one pair — the hammer guy — had its front+back columns merged and
  needed a local-minimum split), then the same `key`/`fit 192x288
  --no-quantise` pipeline. Zero API calls; this is crop-and-cut, not
  generation, so it needed no `GEMINI_API_KEY`.
- **units.json**: 8 new player-recruitable operators (Deuce, Otter,
  Sledge, Cleaver, Denny, Rook, plus Gunner and Leopard — the v12 cast
  pilots, now with real stats and their `-idle.png` art as portraits — not
  previously playable units at all). Player pool: 3 → 11.
- **enemies.json**: 12 new rival-crew grunts (Curt, Sable, Spike, Alfie,
  Ragged, Runt, Tanner, Barfly, Chain, Hollow, Beard, Track). Enemy pool:
  3 → 15.
- **weapons.json**: two new weapon ids read off what each character is
  actually holding in the sheet — `hammer` (melee, dmg 5, knockback 2, the
  heaviest hitter in the game) and `bottle` (melee, dmg 2, no knockback,
  the scrappiest). Existing weapons untouched.
- **Two new encounters** (`warehouse`, `underpass`) reusing backlot's and
  loading-dock's already-proven grid+cover layouts with new squads —
  Sledge/Cleaver/Rook and Gunner/Leopard/Denny — so the wider roster is
  exercised in real fights, not just sitting as inert data. Added to
  `main.js`'s `SEQUENCE`, so a run is now four encounters and actually
  reaches them (they were previously unreachable through play even where
  data existed).
- **`portrait` field** threaded through `combat.js`'s `makeUnit` (one
  line) and rendered in the DOM squad-select row and the selected-unit
  info panel (`index.html`/`main.js`) — the canvas board itself is
  untouched, still the code-drawn placeholder silhouettes `render.js`
  already draws (a 192×288 portrait has no sensible path down to a 9px
  board sprite; that's a separate, much larger problem). All six existing
  archetypes got portraits too, for free, from their already-generated
  `-plate.png`/`-idle.png` files.
- **`turf/test/smoke.mjs`'s end-to-end playthrough gate was hardcoded to
  two named encounters** (`playthrough(BACKLOT, 42); playthrough(LOADING_DOCK,
  42);`) rather than looping `ENCOUNTERS` generically like every other
  check in the file — silently exempting any new encounter from ever being
  proven winnable by the bot. Fixed to `for (const enc of ENCOUNTERS)
  playthrough(enc, 42)`, which is what caught nothing wrong here (all four
  encounters resolve to a bot loss in 5-6 rounds, consistent with the
  existing two) but would have caught a real stalemate.
- Verified in a real browser (Playwright), not just the bare-node gate:
  portraits load (`naturalWidth`/`naturalHeight` both 192×288) in the
  squad row and selection panel on backlot, warehouse and underpass;
  44px+ touch targets hold; no horizontal overflow at phone width; zero
  console or network errors.
- `node turf/test/smoke.mjs` — 39/39 (was 35; +4 for the two new
  encounters' playthrough checks). `test/assets-smoke.cjs` unaffected,
  still green. No `index.html` import-graph change (portraits are plain
  `<img>` tags, not modules), so no cache-token bump.

## v12 — 2026-08-31
**Reconciled a parallel art-pipeline branch, not an engine change: real
generated art lands (six archetype plates + a two-character, 28-frame,
front+back animation pilot), plus one locally-fixable rough edge fixed.**

- Merged `claude/turf-art-request` (a separate Claude Code session working
  the art pipeline with `GEMINI_API_KEY`, per the owner's split: "the art
  pipeline is the separate instance through the art request") into this
  branch's v10/v11 doc work, both independently diverged from the same
  point on `main`. Resolved by judging each conflicting section on which
  side was backed by real, validated generation/testing rather than by
  which branch was newer — `assets/manifest.mjs`'s `turfGrim`/
  `turfCastPose` style blocks and the six archetype-plate prompts took the
  other branch's version wholesale (proven against real shipped art at
  192×288/`--no-quantise`, correcting this branch's untested 32×40/palette
  assumption); this branch's GDD §5.1 hybrid-classes rewrite and its
  `ART_REQUEST.md` §2.5/§2.6 content had no equivalent on the other side
  and carried over untouched; `ART_REQUEST.md` §6/§8/§9 were hand-merged,
  since both sides had real, non-overlapping findings to keep — including
  documenting honestly that the "MST-real animation cycles" ambition this
  branch's v11 asked for was NOT what the pilot delivered (single static
  Idle/Move poses, not cycles), rather than papering over the gap.
- Real art now in the tree: `turf/art-src/sprites/*-plate.png` (six
  archetypes, illustration-fidelity, `check --illustration` clean) and
  `turf/art-src/sprites/cast/*.png` (gunner + leopard, Idle/Move/
  Attack×2/Hit/Death×2, front AND back facing — 28 files, 28/28 checked).
  `scripts/gen-with-ref.mjs` is new: attaches an arbitrary local reference
  image to a manifest prompt via `nano-banana.mjs`, closing the gap
  `assets.mjs`'s own `ref` field left (it only chains to other
  manifest-generated assets, not an arbitrary local file).
- **Fixed**, no generation needed: `gunner-idle` (and `-back`) carried a
  sliver of a neighbouring casting-sheet character at the crop edges — the
  reference crop wasn't trimmed tightly enough before keying. Re-cropped
  `_ref-gunner.png`/`_ref-gunner-back.png` tightly off
  `casting-sheet-full.png` (found by masking the sheet's own background
  colour to get the character's true ink bounds, since rows/columns bleed
  slightly past the nominal grid) and re-ran through the same `key`/
  `fit 192x288 --no-quantise` pipeline. Two other known rough edges
  (attack windup/release reading similar; death-fall reading as an action
  pose rather than "losing balance") are left open — both need a new
  generation, which this session cannot do without `GEMINI_API_KEY`.
- `node turf/test/smoke.mjs` (35/35) and
  `NODE_PATH=$(npm root -g) node test/assets-smoke.cjs` (all pipeline
  checks) both still pass; no `index.html` import-graph change, so no
  cache-token bump this round.

## v11 — 2026-08-31
**Design capture + production planning, not an engine change: classes
retired in favour of skill lines, and the art request restructured around
one character reaching 100% before any of the other five start. Nothing in
`index.html`'s live import graph changed, so no cache-token bump this
round.**

- `GDD.md` §5.1 rewritten: **no fixed class archetypes.**
  `blade`/`niner`/`wrench` are starting kits (opening weapon + stats), not
  permanent boxes; a unit's actual identity comes from which skill lines it
  picks up at level-ups (any line, regardless of starting kit) plus
  whichever weapon it's currently holding. Named the real payoff: v7's
  weapon-swap loot drops already let a `wrench`-kit unit end a fight holding
  a handgun, so a unit that invested in Marksman-line skills despite
  starting as `wrench` goes from inert to live the moment the right weapon
  drops — a hook the engine already had, unused, before this revision named
  it. The six illustrative skills survive as **skill lines** rather than
  subclass boxes; two lines from two different starting kits is the
  intended shape (a hybrid), not an edge case. **A reversal, made explicit
  rather than left silent:** the old "class reads as a secondary accent
  colour" plan is retired — a build spanning two skill lines doesn't reduce
  to one accent honestly, so the sprite carries faction colour only (cold
  operator / warm rival) and a build's actual skills read from the UI, not
  a paint job. Nothing shipped or requested in `ART_REQUEST.md` had
  implemented the old accent plan, so this is a clean reversal, not rework.
  `class`/`subclass` terminology corrected to `kit`/`skills` everywhere it
  appeared (§5.2 crew naming, §9 roadmap, §10 open questions) for
  consistency with the new system.
- `ART_REQUEST.md` §2.4 (new) translates the GDD change for art: §4's six
  prompts still describe *starting kit* (a stable, real silhouette to
  generate against) but must not bake in anything that reads as a
  permanent, exclusive role, since the same body may end a run playing a
  hybrid build the plate never depicted. No new colour system requested —
  faction-only accent already covers it.
- `ART_REQUEST.md` restructured around a **staged production plan** (owner
  direction: "one example animated to 100% feature complete... later colour
  variations and different models"), added as new §8/§9:
  - **§8 — Stage 0:** one pilot character (recommended `blade`, reusing
    §2.2's own tested knife-melee precedent and avoiding ranged-weapon VFX
    as a first unknown) taken through a concrete 7-point "100% feature
    complete" checklist ending in the character actually animating in a
    real encounter, not just existing as checked plates. Stage 1: colour
    variants reusing a proven body where the build genuinely matches
    (`grunt-blunt`'s "rangy" build flagged as the first candidate against
    `blade`, to verify once Stage 0 exists). Stage 2: the remaining models,
    each through the same checklist, costed off Stage 0's actual iteration
    count rather than guessed fresh.
  - **§9 — six concrete gaps found and named, not just art:** (1) verified
    directly in `render.js`/`combat.js` — **units currently snap between
    tiles with no interpolation**, so a move-cycle sprite has nothing to
    visibly play across without a real engine change first; (2)
    `combat.js`'s existing typed `state.log` (`move`/`attack`/`pickup`/
    `enemy-turn`) is the hook to drive animation state from, rather than
    inventing a second event system; (3) facing (mirror vs. distinct
    per-direction art) is an open question to resolve empirically during
    Stage 0, not decided here; (4) a per-character proportion/turnaround
    reference is needed before hand-extending Aseprite frames, or frames
    drift off-model; (5) a finished animated character is a *set* of files,
    not one hashed image — proposed `turf/art-src/sprites/<id>/manifest.json`
    to track a bundle's staleness the way `scripts/assets.mjs status`
    tracks one image; (6) budget real iteration count (redos from failed
    "look" checks and irregular sheet pitch, both measured problems per
    §2.2/§2.3) rather than the nominal five-generation headline count.
  - §7's runtime-integration deferral narrowed: still not requested for
    five of six archetypes, but now explicitly requested for the Stage 0
    pilot.
- `node turf/test/smoke.mjs` (35/35) and
  `NODE_PATH=$(npm root -g) node test/assets-smoke.cjs` (46/46) — both
  unaffected by this round (doc-only) and run to confirm nothing broke.

## v10 — 2026-08-31
**Art-pipeline design capture, not an engine change: the owner delivered two
real casting sheets and asked for their style — and MST-real animation — to
become the actual request. Nothing in `index.html`'s live import graph
changed, so no cache-token bump this round.**

- Two full casting sheets (6 characters, then 20 — every figure a front+back
  turnaround pair, on the same flat magenta this pipeline keys on) committed
  at `turf/art-src/reference/casting-sheet-1.png` / `-2.png`. Checked against
  the real pipeline, not just eyeballed: six figures cropped from them, one
  per §4 archetype, went through the actual `key → fit --palette
  turf/art-src/palette.json → check` this session — **6/6 came back real
  cuttable pixel art** (binary alpha, 17–24 colours each, comfortably inside
  the 32-colour palette). Two real gaps that same test found: neither sheet
  demonstrates the cold-cyan/warm-rust faction trim (has to be stated in the
  prompt regardless of the reference), and three of the six crops dragged a
  neighbour's boot or weapon tip in from a frame edge — a crop problem, not
  a keying one.
- `ART_REQUEST.md` §2.3 (new) records this and formally **retires the
  two-shade-step flat-fill rule** for the six archetype plates — superseded
  on purpose by the richer register both sheets show (real
  highlight/midtone/shadow modelling, strand-level hair), while keeping the
  hard silhouette-edge outline that still has to carry the read at the
  game's actual on-board scale. §4's six prompts and `assets/manifest.mjs`'s
  `turfGrim` style block + all six `turf/*-plate` prompts rewritten to
  match, each restating the faction trim colour explicitly (the reference
  doesn't carry it) and a new "ALONE IN FRAME, nothing entering from any
  edge" instruction (the crop-bleed problem found in testing).
- `ART_REQUEST.md` §6 (animation guide) rewritten for **"animations like in
  MST"** (owner direction): idle and move rise from one held pose each to
  real 2–3 and 3–4 frame cycles respectively, generated as actual sheets —
  §2.2's own earlier test already proved idle/move sheets come back usable,
  so this isn't a new risk, it's finishing what was already measured.
  Attack/hit/death stay single-pose generations hand-extended in Aseprite
  (§2.2's two failure reasons — baked FX defeating the key, irregular frame
  pitch — are about what those rows draw, not how many poses are asked for
  at once); attack and death each raised by one frame over the original
  minimum (hit stays at 1, already the right ask). Total per archetype:
  10–12 frames, up from the original 4–7. Idle/move raise the *ask* only —
  `assets/manifest.mjs` doesn't yet carry the twelve sheet specs (2 rows ×
  6 archetypes) that would make `gen --only turf` actually produce them;
  writing those is its own real authoring task, flagged in §6 as a
  follow-up rather than done this round.
- `node scripts/assets.mjs gen --dry --only turf` and
  `NODE_PATH=$(npm root -g) node test/assets-smoke.cjs` (46 checks) both
  pass against the rewritten manifest — the six prompts hash to new values,
  as expected from editing their text, and nothing else in the pipeline's
  wiring is disturbed.

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
