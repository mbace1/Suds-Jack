# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v239 — 2026-09-05
**One level format for two engines — the Godot port reads the editor's JSON** *(v238 is skipped on purpose: PR #447, an unmerged lineage, already used both v237 and v238 for its own level work, and a reused number is how two trees look like one)*
- **There were two "format 1"s for a day.** v237 shipped this editor's format
  (named arenas, pickups, three modes). PR #447 — another session, still open
  against `gh-pages` — shipped a *different* format 1 the same day (shape
  objects, strict unknown-key rejection, arcade only), and the Godot port's
  loader (`toko-drop-godot` `scripts/level.gd`, Q-032) was written against
  THAT one. A level file one build refuses is the exact failure a shared
  format exists to prevent. **This release is the union, and both loaders now
  accept every clause of it:** `arena` is a name (`auto/portrait/landscape/
  room`) OR `{ combine?, shapes: [rect | circle …] }`; spawns are enemies
  (`boss?`, `elite?`, multipliers) or `kind: "pickup"` (`id`, `life?`);
  `rules.mode` is `arcade | melee | rush`. `js/level.js` is the reference;
  the port mirrors it clause for clause
- **Strictness came over from the other lineage, deliberately.** An unknown
  key anywhere is an error, spawns must be authored in order, a body placed
  outside the region is refused, a region with nowhere to stand is refused,
  at most `MAX_SHAPES` (4) shapes — the floor's slot count on both builds.
  v237's `{halfX, halfZ}` arena form is gone (nothing had written one); v237's
  `mode: "guns"` is migrated to `"arcade"` on parse, so a level saved
  yesterday still loads. **A build that lacks a thing refuses the level BY
  NAME:** the port has no CLOSE COMBAT and no authored-Rush wiring yet, so it
  refuses `melee` and `rush` with a message that says so, rather than
  half-playing the file
- **`toko-drop/levels/`** now exists on the deployed tree, which is where the
  port's `tools/sync-levels.sh` has been reading from all along:
  `first-light.json` (15 spawns, 45 s, the 19×11 room) and `three-rings.json`
  (11 spawns in the common area of three circles) — PR #447's two files,
  verbatim, because the port's own smoke pins their counts. `level.js
  BUNDLED` names them; the editor's LOAD lists them beside the built-in
  (renamed **SHOW AND TELL** so its id no longer collides); **`?level=<id>`
  arms one for the next start** and `?editor&level=<id>` opens it. Tokened
  fetch, precached in `sw.js` — a new path is a new path (v118)
- **A shaped level PLAYS here now, even though it is not yet DRAWN.**
  `levelArena()` builds the file's shape on `arena.js` (rect, circle, union,
  intersect) and `applyArenaMode()` hands it to `arena.setShape()`, so
  containment, the spawn ring, TORO's dash and every other boundary question
  are answered by the real region; `HALF_X`/`HALF_Z` stay its bounding box
  for the floor plane and camera. Drawing the region is §2.3 — PR #447's v238
  carries a working term for both render paths and is the natural next thing
  to bring across
- **`scripts/level-smoke.sh`** (new — PR #447's gate, re-cut for this tree):
  headless Chromium, the probe owns the clock (`performance.now` becomes a
  counter and `loop()` is called synchronously — under headless Chromium
  rAF fires once and chained timers stall at ~20 s, lessons that cut paid
  for), every authored enemy AND pickup lands at the authored second and
  place, the run ends CLEARED on the level clock. **It writes the
  cross-build file** (`SPAWN <i> <TYPE> t= x= z=`) that the port's
  `tools/level-parity.mjs` diffs against its own trace of the same JSON —
  same level, two engines, same bodies at the same seconds in the same
  places. `scripts/level-check.mjs` grows to 70 checks: every bundled file
  loads, `BUNDLED` names exactly the files, and every refusal clause above
  is exercised by name
- Gates: `level-check.mjs` 70 · `arena-check.mjs` 8,396 · `level-smoke.sh`
  ×2 · `editor-smoke.sh` · `smoke.sh` · `cabinets.sh` · `webgpu-smoke.sh`;
  and on the port, its smoke plus `level-parity.mjs` for both bundled levels
- **What PR #447 still holds that this tree does not:** the v238 floor term
  (the shape drawn on GLSL and TSL) and `scripts/level-shot.sh` (the two-
  renderer picture gate). Its loader, level files and level-check are now
  superseded here. Merging it as-is would conflict on every file it touches;
  the floor term should come across by hand, against this tree
- Cache-bust `?v=191` → `?v=192`; HUD label → v239

---

## v237 — 2026-09-03
**THE LEVEL EDITOR — drop-downs on top, tap to place, a 0.1s timeline along the bottom** *(LEVEL_EDITOR_DESIGN.md, requirements 2 and 3; owner: "rectangular is ok too, the tool is what really makes it work")*
- **`index.html?editor`** mounts the editor OVER the real game: the arena you
  tap is the real floor under the real camera, the ghosts are drawn into the
  real scene, and PLAY hands the level to the real spawn pump. Not a sibling
  page — rebuild-on-real-code is the settled principle here (v216 rebuilt the
  enemy lab for the same reason), and an editor that is not the game would lie
  about where things land. OPTIONS → LEVEL EDITOR gets you there; a reload,
  because the flag is read at boot
- **`js/level.js`** is the format: pure (no three.js, no DOM), so it runs in
  bare node. A level is `{ format, name, arena, duration, rules: { mode },
  spawns: [{ t, type | kind:'pickup', px, pz, … }] }`. **`t` is seconds on a
  0.1s grid and `type` is a NAME** — the numeric `EnemyType` values are
  positional, and a saved level must survive the enum growing. `compile()`
  emits exactly the entry shape main.js's pump reads, which is the whole trick:
  the runtime contract was never designed for authoring, but `pendingSpawns`
  already carried `delay` and an optional `px`/`pz`, so a level is that list
  written by hand and nothing downstream can tell
- **`js/editor.js`** is the tool. Top bar: `ENEMIES ▾` (the real roster, minus
  the death-spawned minis; Rush mode narrows it to Rush's own pool), `PICKUPS ▾`
  (hp / invincible / firerate / scoremult / score and the weapon pods — the
  cabinet-only key/potion/item stay out), `RULES ▾` (mode guns/melee/rush,
  arena auto/portrait/landscape/room, duration), `LEVEL ▾` (new / save / load /
  rename / export / import / clear / leave). **Choose, then tap the arena** —
  no dragging, because dragging fights page scroll on a phone. A tap near an
  existing spawn selects it instead (nudge ±0.1s, MOVE ⤢ then tap, DELETE).
  Bottom: a canvas timeline, 0.1s ticks, 1s labels, natively scrollable,
  four zoom levels; enemies on the lower lane, pickups on the upper, a count
  on stacked cells; **tap the strip to set the playhead**, and the playhead is
  the editing context — a new spawn lands AT it, and the ghosts brighten for
  what is due now, dim for what is past
- **PLAY FROM HERE (▶ / Enter)** runs the level from the playhead through the
  ordinary `startGame()`. **Spawns before the playhead are DROPPED, not fired
  at once** — a pile of catch-up bodies on frame one would be a different
  level. The run ends on the level's own clock (or on death), the bodies are
  swept, and the result (cleared/dead · kills · score · time) sits in the
  editor's status line. A level run **leaves no records**: no PB, no daily, no
  leaderboard, no tutorial hints, no wave-clear chaining into wave 2 (that one
  would have re-compiled the level as "wave 2" and looped forever — caught in
  design, not in play). SMASH TV is held off for the run and put back after
- **`rules.mode` picks the ruleset**: `guns` (the classic gun ecology), `melee`
  (CLOSE COMBAT), `rush` (boost, shotgun, HP dots as lives; Rush's own level
  clock is parked at 1e9 so the authored clock is the only one running). The
  arena is a named rectangle or an explicit `{halfX, halfZ}` — `arenaPreset()`
  now answers "which rectangle is the room" for `applyArenaMode` and the
  orientation refit alike, so a level's own size survives a rotate
- **Levels live in `localStorage` (`tokoDropLevels`)** with EXPORT / IMPORT as
  JSON text for moving one between devices or into the repo. `serialize()` is
  stable — one spawn per line, defaults omitted — so two exports of the same
  level are the same bytes and a diff between two levels reads as spawns.
  **`EXAMPLE_LEVEL` (FIRST LIGHT, 30s)** ships built in: a trickle, a pincer,
  a pickup laid before the pressure, a boss with an escort — the first LOAD
  has something in it and the gate has a fixture
- **Two new gates.** `scripts/level-check.mjs` (40 checks, bare node) reads the
  enemy names out of `enemy.js`'s SOURCE — the honest coupling: a level names
  an enemy, and this asks the file that defines them — and proves validation,
  the pump contract, the 0.1s grid, byte-identical round-trips and that
  play-from-here drops exactly the earlier spawns and shifts the rest.
  `scripts/editor-smoke.sh` (Playwright, touch-emulated phone) mounts the
  editor, **taps the arena and asserts the spawn landed at the world point
  under the tap**, taps right of it and asserts world-right, saves → new →
  loads, exports → imports, then PLAYs from 0.5s and asserts the enemy stands
  within a body-width of where it was placed, on time, the pickup appears, and
  the run ends CLEARED on the level's clock with the result handed back
- **Not in this release, on purpose:** non-rectangular arenas (owner: the tool
  first — `arena.js` is ready when a shape is wanted), moving shapes (§2.4 is
  still an open decision), enemy affixes/elites in the palette, per-spawn
  speed editing in the UI (the format carries `speedMult`; only import sets
  it), and translations — the editor is English, like the enemy tester
- `input.js`'s `inUI` list gains `#tded`; `sw.js` and `bump-version.sh` name
  `level.js` and `editor.js`
- `level-check.mjs` + `arena-check.mjs` + `editor-smoke.sh` + `smoke.sh` +
  `cabinets.sh` + `webgpu-smoke.sh` green
- Cache-bust `?v=190` → `?v=191`; HUD label → v237

---

## v236 — 2026-09-03
**The arena is a shape now, not two numbers** *(P0 of `LEVEL_EDITOR_DESIGN.md` §7)*
- **`js/arena.js`.** Until now "the arena" was `HALF_X` and `HALF_Z` — read in
  88 places in `main.js`, and threaded into `player.update()` and
  `enemy.update()` as a bare `(halfX, halfZ)` pair. That is exactly correct for
  as long as every arena is a rectangle, and stops working the moment one is
  not. The boundary lives in one pure module now: an SDF (`< 0` inside), with
  `contains` / `clamp` / `ringPoint` / `insetPoint` / `rayEdge` / `randomPoint`
  on top of it. No three.js, no DOM, no imports — so it runs in bare node
- **The promise of this release is that NOTHING CHANGES**, and that is the
  interesting part. `scripts/arena-check.mjs` (8,396 checks, bare node) compares
  every method against the literal expression the call site used to inline, at
  all six shipped arena sizes, and demands **exact** equality — `Object.is`, not
  a tolerance. A tolerance is precisely what would hide the drift that
  desynchronises a seeded wave schedule. Falsified before being trusted: a
  wrong-axis clamp fails 1,032 checks, and adding `1e-12` to one ring
  coordinate fails 1,536
- **Being right and being identical are different goals, and P0 is the second
  one.** So the rectangle's `clamp` reproduces `Math.max(-h, Math.min(h, v))`
  as written, sign flip and all, for the degenerate `h < 0` case; and
  `ringPoint` stays the old `cos·halfX·edge` formula, which on a box is an
  inscribed **ellipse** and not the boundary. Those are what the spawn ring has
  always been, and P0 is not the place to fix them
- **Two determinism rules, written into the module header** because they are
  invisible until they aren't: `randomPoint` draws from the rng **exactly
  twice, x then z, for every shape** — rejection sampling is banned, since a
  variable draw count would desynchronise every seeded schedule the first time
  a level used a non-rectangular region; and nothing in the module reads
  `Math.random()` or a clock (`update(t)` takes its time)
- **Migrated: the sites that are genuinely about the BOUNDARY.** The spawn ring
  and the siege trickle (`ringPoint`), the SMASH TV entry door (`insetPoint`),
  the player clamp, CRYSTAL / PRISM / TORO clamps, PRISM's teleport target
  (`randomPoint`), the escaped-decoration cull (`contains` with negative
  slack), the civilian wander clamp, and — the one that needed a new primitive
  — **TORO's dash telegraph**, which asks "how far until I hit a wall" and was
  an inlined slab test. `rayEdge` is closed-form on a box and a sphere-trace
  otherwise, so the telegraph will still be the real distance in a room with a
  curved wall
- **Deliberately NOT migrated, and named rather than left to be discovered:**
  `HALF_X`/`HALF_Z` stay as the region's bounding box, because the floor plane,
  the camera fit, `worldToUV` and ~50 set-dressing sites are asking how BIG the
  room is, which is a fair question. `smashDoorPos`'s literal cardinal table
  stays literal (`ringPoint` would answer `6.7e-16` instead of `0`). And the
  cube **flop** reflection is per-axis, which an SDF has no notion of — P1
  needs a gradient-reflect helper before that one can move
- **Shapes P0 does not wire up but P1 will**, defined and unit-tested here so
  P1 is a level file rather than a debugging session: `circleShape`, plus
  `unionShape` (`min`) and `intersectShape` (`max`). The owner's worked example
  — three overlapping circles and their common area — is
  `intersectShape(c1, c2, c3)`, and the gate asserts it says *outside* where a
  union would say inside. Nothing constructs one yet; the only live shape is
  the rectangle
- **The moving-shape question is still open and still the owner's**
  (`LEVEL_EDITOR_DESIGN.md` §2.4: push / damage / death, and whether enemies
  are contained too). `Arena.update(t)` is a no-op until it is answered
- New module, so `sw.js`'s PRECACHE list and `bump-version.sh`'s file loop both
  name `arena.js` — the two places a new file has to be added by hand
- `smoke.sh`'s enemy harness calls `Enemy.update()` itself, so it **caught the
  signature change on the first run** (`arena.clamp is not a function`) — it
  builds its own `Arena` now, which means the shared gate exercises the new
  path rather than a hand-rolled pair of numbers
- `arena-check.mjs` + `smoke.sh` + `cabinets.sh` + `webgpu-smoke.sh` green, and
  **a 30s seeded headless run compared frame-for-frame against a v235 checkout**
  — same stubbed clock, same stubbed rAF, same seeded `Math.random`, sampled
  every 60 frames: 30 samples, 3 waves, 139 enemy observations, 29,100 score,
  identical in every field. The comparison was falsified too: subtracting
  `1e-6` from one axis of the clamp diverges **all 30** samples, enemy
  positions included
- **The first version of that probe was VACUOUS and it is worth saying why.**
  With no input the player stands still, dies at t=4.6s, and 24 of the 30
  samples were frozen duplicates of the death frame — a run that looked 30s
  long and tested 4.6s of it. The fix is a deterministic pilot: a swept stick
  that drives the player into every wall, autofire so waves actually turn over,
  and a long invincibility so the run survives to be compared. Stubbing
  `renderer.render` in the throwaway copy cut the run from ~40 minutes to ~2,
  since the subject is JS state and SwiftShader was the entire cost
- `hub/versions.json`'s `tokodrop` was **fifteen releases stale** (221) and is
  hand-edited to 236. **Found the hard way, and worth flagging: `gh-pages`'s
  copy of `scripts/versions.mjs` predates the `--check` / `--repair` guard rail
  that CLAUDE.md tells you to use** — it silently ignores the flag and
  regenerates, which is the exact failure that guard exists to prevent. It moved
  eight cabinets in one go, `dropcabal` **backwards** (3 → 2). Reverted whole
  and only this game's own key touched. Porting `--check` onto the deployed
  tree is a separate change; it is the site's tooling, not Toko Drop's
- Cache-bust `?v=189` → `?v=190`; HUD label → v236

---

## v235 — 2026-09-01
**The ZONE boost scheme is removed — it was never reachable** *(follow-up to v234)*
- v224 shipped **two** touch boost schemes on purpose: RIM (push the move
  stick past 86% of its travel) and ZONE (a held pad in the lower-left
  margin), with the stated intent that "which one survives a thumb is a play
  question, not an argument." The question was never actually put: **no
  selector was ever built.** `boostScheme` was written once, in the
  constructor, to `'rim'`, and never assigned again anywhere in the tree —
  so every `=== 'zone'` branch, `_zoneHeld`, and its `getBoostHeld()` check
  have been dead from the day they landed. ZONE was never played, by anyone
- v234 then handed that same lower-left margin to the **RUSH ability pad**,
  so ZONE no longer even has a home to be revived into. Removed rather than
  left sitting there looking like a live alternative — with a note saying
  what a future attempt would need (its own region, and a way to pick it)
- `getBoostHeld()` loses the always-false `_zoneHeld` check and the
  now-pointless `boostScheme === 'rim'` test; the RIM rim-push is simply what
  touch boost *is*
- **Verified in a real touch context, because this is the shared touch
  handler and the two surviving paths are easy to break silently**: a
  rim-push drag on the move stick still registers boost (`getBoostHeld()`
  true), and a tap in the lower-left margin still fires the equipped ability
  (cooldown 0 → 16). Zero page errors
- `press/PRESS.md` advertised "two selectable RUSH boost schemes" — never
  true, since the selector didn't exist. Corrected, and the kit's Rush copy
  brought up from v231 to what actually ships now (the four abilities and the
  ladder screen)
- `smoke.sh` + `cabinets.sh` green
- Cache-bust `?v=188` → `?v=189`; HUD label → v235

---

## v234 — 2026-09-01
**The RUSH LADDER, and the v232 abilities were firing themselves**
- **THE LADDER PANEL.** The ladder was one line on the death screen: what you
  just scored, and nothing about what a level *asks*. It's now a real screen
  (title → `RUSH LADDER`, shown only while Rush is armed — the title is
  already the busiest surface in the game). Every level is a tile carrying
  its kind icon (● steady / ⁘ swarm / ▲ heavy), your best tier, and its star;
  picking one opens that level's own card: duration, the **exact kill count
  each of S/A/B/C wants**, the roster with the newcomer and the heat-venting
  COOLER marked, the speed and spawn-budget pressure, and the two ★ goals
  spelled out instead of abbreviated
- **Per-level bests now persist** (`tokoDropRushBests`) — `rush.ladder` is one
  run's stamps and dies with it. Tier only ever improves; a star once earned
  stays earned
- **No second copy of the maths.** The panel grades levels you haven't reached,
  so it can't read live run state — the pure halves of the wave-scale and
  budget formulas were *extracted* (`waveScaleFor`, `waveBudgetBase`,
  `rushLevelDuration`, `rushParFor`) and the live paths now call them. One
  formula, no chance of the panel quoting a number the director doesn't use.
  It also omits the director's fire-interval scaling on purpose: Rush's four
  bodies have no guns (v225), so that number would be dead on this screen
- **The bug this pass found, and it's the bigger half.** v232 hung the
  abilities on `onDash`, reasoning the dash button was unclaimed in Rush.
  Half-true: `player.dash()` early-returns, but **`onDash` is fired BY the
  boost input** — `Space` keyup on keyboard, the same face/bumper button on a
  pad. So the ability discharged itself at the end of every boost, and the
  player never picked the moment. A probe on the real build confirmed it:
  hold Space, release, and OVERCHARGE was spent (`overchargeT` 0 → 3.95,
  cooldown 0 → 15.95) with no deliberate input. A panic button that fires on
  your first boost is not a panic button
- **Fixed with a trigger of its own**: `input.onAbility` — **Q** on keyboard,
  **X / LB** on a pad (deliberately none of 0/5/7, which are boost), and on
  touch the lower-left pad, the margin the unreachable ZONE scheme had
  reserved. Re-probed both ways: boosting and releasing no longer fires it,
  Q does. The OPTIONS hint and `press/PRESS.md`'s controls table were both
  describing the old broken binding and are corrected in all three languages
- One thing left honest rather than "fixed": level 1 draws the *breather*
  budget in the shipped director, because `waveKind(0)` is `'boss'`
  (`0 % bossEvery === 0`). The panel reports that real number and only
  suppresses the word "breather" there, where "lighter after an intense
  level" would describe a level that doesn't exist
- `smoke.sh` + `cabinets.sh` green; panel checked at desktop and 390px-wide
  phone viewports
- Cache-bust `?v=187` → `?v=188`; HUD label → v234

---

## v233 — 2026-09-01
**RUSH gets its own first-run tutorial, and a real bug behind it** *(Rush onboarding pass)*
- `scheduleTutorialHints()` was unconditional — every first run, Rush
  included, got the classic sequence: move, "aim & fire", **"SPACE / A —
  DASH THROUGH BULLETS"**. Both wrong in Rush: dash is dead (boost replaces
  it), and the sequence never mentioned the one rule the whole mode hangs
  off — **firing cancels your boost shield**. A new Rush player's first
  real lesson was a taught mechanic that doesn't exist, paired with silence
  on the one that does
- Worse, both sequences shared **one** `localStorage` "seen" flag — a player
  who'd already cleared the classic hints (near-certain, since Rush isn't
  the default) got **zero** hints on their first-ever Rush run, not even
  the wrong ones
- Rush now gets its own sequence, under its own flag
  (`tokoDropHintsSeenRush`, independent of the classic one):
  `HOLD SPACE/BUMPER — BOOST` (or the touch RIM phrasing) → `BOOST = SHIELD
  + KILLS ON TOUCH` → `FIRING CANCELS YOUR SHIELD` → `HEAT IS SHARED —
  OVERHEAT LOCKS YOUR BOOST` — same cadence and fade timing as the classic
  sequence, GDD §2's non-interrupting rule unchanged (text only, no pauses)
- Verified with a throwaway probe: a first Rush run gets the Rush sequence
  keyed to its own flag; a classic run right after (independent state) gets
  the classic sequence keyed to its own flag; a second Rush run after the
  Rush flag is set gets no hints. `smoke.sh` + `cabinets.sh` green
- Cache-bust `?v=186` → `?v=187`; HUD label → v233

---

## v232 — 2026-08-29
**RUSH gets its four abilities** *(PR #311 / `PARITY_WITH_GODOT.md` §1b, owner direction 2026-08-28)*
- The Godot port had four selectable RUSH abilities this build never had.
  Owner's call: port them here — this build leads on gameplay, so this is
  now the reference version, not a copy. One is picked in OPTIONS
  (`RUSH ABILITY`, single-select cycle, default OFF) and fires on the dash
  button, which boost leaves completely dead in Rush (`player.dash()`'s own
  early return) — an unclaimed input, not a new bind
  - **HEAT EXCHANGE** — dumps current heat as an AoE clear around the
    player (radius grows with banked heat) and resets heat to 0
  - **HYPER BOMB** — a big fixed-radius clear that costs no heat; the panic
    button, paid for in a long cooldown instead
  - **OVERCHARGE** — a timed window: boosting costs no heat and the chain
    climbs ×2 per kill
  - **QUANTUM SHIELD** — a timed window: the player is invulnerable
    (`player.grantInvincibility()`) and any enemy bullet that gets close
    enough to have hit is destroyed and answered with a real player-owned
    bullet fired back along its reverse path — a separate collision loop
    from the existing `!player.invincible` gate, since that gate would
    otherwise skip the reflect entirely
- All four AoE-clear kills are tagged `'env'`, the same tag gates/vents/
  surges use, so panic-clearing doesn't trigger CLOSE COMBAT revenge back
  at the player who just used the ability
- Numbers (`TUNING.rush.abilities`) are new, not copied from the port — its
  source wasn't available to derive exact values from — and unvalidated,
  same standing as the v227 tier table
- Verified with a throwaway probe against the real integration points: each
  ability actually clears the enemies/heat/bullets it claims to (a 6-enemy
  ring → 0 alive + heat reset for Heat Exchange, an 8-enemy ring → 0 alive
  for Hyper Bomb, a real `boostKill()` call producing chain +2 not +1 under
  Overcharge, an enemy bullet fired at the player becoming a player-owned
  bullet under Quantum Shield) and the OPTIONS row cycles all five states
  in the real DOM. `smoke.sh` + `cabinets.sh` green
- Cache-bust `?v=185` → `?v=186`; HUD label → v232

---

## v231 — 2026-08-28
**Press kit** *(roadmap-v2 Phase 5, "itch.io page: embed, copy, capture GIFs")*
- New `toko-drop/press/PRESS.md`, following the same structure as
  `hyperdagger/press/PRESS.md`: one-liner, itch.io short description
  (~200 chars), long description, features, a controls table (keyboard,
  gamepad, touch), tech notes for a devlog/HN-style audience, and a
  screenshots/GIFs index
- Four screenshots (title, a classic run, RUSH MODE, the NEX DEUS cabinet)
  are real captures from the actual running game via a throwaway
  Playwright probe — not mockups. `charge.gif` and `school.gif` are real
  captures via `scripts/enemy-loop.mjs`, the tool this roadmap item names
  explicitly for GIFs
- Doc/asset-only: no gameplay code changed. Bumped anyway per this repo's
  own discipline (every commit touching `toko-drop/` gets a version entry)
- The itch.io page itself (account, embed, actually publishing) is a
  manual step outside this repo — this ships everything that's automatable
- Cache-bust `?v=184` → `?v=185`; HUD label → v231

---

## v230 — 2026-08-28
**QOL pass: haptics gets two more real moments** *(follow-up to v229)*
- The shield pickup — the one hit it fully absorbs, no HP lost — fired
  `audio.playerHit()` and a camera shake but no vibration, even though it's
  arguably the single most important defensive save in the game. It now gets
  its own distinct pattern (`haptics.shield()`, `[20,30,20]`, punchier and
  shaped differently from a plain hit) so a save reads as a save
- Flipping **HAPTICS** on in the pause menu now fires a one-off confirmation
  buzz. On the ~90% of devices `navigator.vibrate` silently no-ops on (no
  iOS Safari, no desktop), turning the toggle on used to be the only control
  in the whole settings panel that gave zero feedback either way
- Verified with a throwaway probe driving the real integration points: the
  shield branch of `tryHitPlayer()` fires `[20,30,20]` and correctly
  consumes the shield; the settings object's `setHaptics(true)` path fires
  the confirmation buzz. `smoke.sh` + `cabinets.sh` green
- Cache-bust `?v=183` → `?v=184`; HUD label → v230

---

## Archive

**v220–v229 summary (2026-07-31 – 2026-08-28)**
- v220: Revenge speaks the species' language — aimed/fan/ring by dialect, corpse colors split from living colors, sludge trail poured as gel blobs
- v221: Each mode drafts its own roster — CLOSE COMBAT gets its own pool, stationary artillery sits out
- v222: Goo pass 2 — corpse matter (both chunk pools) gets a gel-nugget node graph under WEBGPU
- v223: Arena pass — rim vignette, grid distance falloff, a lit pool that follows the player
- v224: RUSH MODE ships — boost is the answer, the gun the fallback; heat is the shared cost
- v225: RUSH gets its own bare arena and four-body roster, no main-game furniture
- v226: RUSH's dead `lives` counter and `loseLife()` removed — the HP-growth extra-life mechanic was already correct
- v227: RUSH gets S/A/B/C tiers, a stamped ladder, and two per-level goals (chainUnbroken, neverLocked)
- v228: Arena pass 2 — the floor answers mass (live enemies), pops (kills) and prizes (pickups), both renderers in parity
- v229: Haptics (`js/haptics.js`) + two motion-comfort flashes (hit vignette, wave-clear) found ungated by REDUCE MOTION and fixed

**v210–v219 summary (2026-07-25 – 2026-07-31)**
- v210: MOVEMENT PROFILES — each species declares its share of the swarm forces
- v211: FLUID retired — behaviour is species identity; per-enemy movement sliders in the tuner (standing rule: no global behaviour toggle)
- v212: Contextual death-screen feedback — a rotating question beside a live specimen of what killed you
- v213: TOKOTRON unstuck — splat-pool saturation diagnosed by screenshot; minimalist grid floor; solid player core
- v214: TOKOTRON reference rules — rescue curve 1000→5000 capped, EXTRA MAN at 25k, pickup-free vector room
- v215: THE FRUIT LADDER — six fruits, one per depth rung, each carrying its value; badges retired
- v216: The enemy lab stops being a fork — rebuilt on js/specimen.js, vendored three, both builds (roadmap-v2 Phase 1)
- v217: Wave director v1 — composition/cadence/escalation move into TUNING.waves as data, equivalence proven byte-for-byte
- v218: Goo/gel TSL pass past parity — depth-varying thickness, hit-seethe octave, uTear pop burst (flag build only)
- v219: Testing lives where you play — tester viewport fills the tab; the lab reachable from game and hub

**v200–v209 summary (2026-07-24 – 2026-07-25)**
- v200: THE JUICE PASS — every death detonates (option A, for everyone)
- v201: The swarm gets a voice — sound pass for every new mechanic + perf juice guard
- v202: The roguelike learns the swarm's language — three swarm-native cards
- v203: THE SHEPHERD — the first enemy designed FOR the swarm game (40 types)
- v204: Cabinet audit + the gate that keeps them honest — and LOADOUT gets its briefings
- v205: BINDING item pools — the basement changes character as you descend
- v206: KAIKKI: civilians as WITNESSES — you can't loot in front of an audience
- v207: BINDING: room revisits — the basement is a map, not a corridor
- v208: KAIKKI street jobs — the order changes, not just the wave number
- v209: NEX DEUS: the surge is the arena tearing open

**v190–v199 summary (2026-07-19 – 2026-07-24)**
- v190: Instanced floor splats — puddles + slime trails share one InstancedMesh (dozens of draw calls → 1)
- v191: WEBGPU (BETA) toggle — node-pipeline renderer flag-gated; floor + splat TSL ports; boot-script importmap
- v192: Real WebGPU backend — flag build jumps to three r180 (classic stays r167); adaptive adapter with WebGL2 fallback
- v193: Field feedback — motion-trail afterimages off under the flag; slime fizz confirmed keeper; M7 promotion criterion recorded
- v194: Gels wobble under WEBGPU — full TSL port of the goo FX (positionNode displacement + emissiveNode SSS)
- v195: RetroPass TSL port — cabinets keep palette/scanline/glow looks under the flag (zero ConditionalNodes; ÷0 NaN lesson)
- v196: FLUID MODE — the movement lab: dodge bullet lanes, boids schooling, split-on-death minnows
- v197: FLUID wave archetypes — STREAM / RING / PINCER currents, deterministic per wave, bannered
- v198: CLOSE COMBAT + FLUID become the DEFAULT for all players (absent key = ON; saved choices respected)
- v199: Identity pass — TWIN-STICK SWARM SURVIVAL branding across title/OG/manifest/README/GDD

**v180–v189 summary (2026-07-17 – 2026-07-19)**
- v180: Roguelike depth (M6) — three new upgrade cards + CURSED cards (power with a printed price)
- v181: GAUNDROP backlog — generator spawn telegraphs + TREASURE VAULT alcoves
- v182: LOADOUT backlog — the RESCUE mission (carry hostages out; clean sweep pays a bonus pod)
- v183: KAIKKI backlog — SHOP tier 2 from mission 4 (flamethrower / magnet / shield)
- v184: BINDING backlog — the BASEMENT SHOP room (pedestal deals priced in blood + points)
- v185: NEX DEUS backlog — CHAINED SECRETS (dash a hidden glitch tile every wave for a climbing multiplier)
- v186: NEX DEUS boss — THE CUSTODIAN (sheen shrugs bullets; dash-through cracks the shell; 39 enemy types)
- v187: CLOSE COMBAT mode — no enemy fire, shooters drafted as chasers, REVENGE RINGS on death
- v188: CLOSE COMBAT fixes — env-kill tag stops the gate fountain; drafted shooters press instead of kiting
- v189: Instanced bullet rendering — the whole bullet field draws in three InstancedMeshes (~900 → 3 draw calls)

**v170–v179 summary (2026-07-16 – 2026-07-17)**
- v170: Cabinets moved to OPTIONS (title shows a one-line armed reminder) + difficulty/variety pass across all five
- v171: Walls of bullets — DRAPER the wall-weaver (curtain looms) + the ARENA CURTAIN mid-wave event
- v172: Per-cabinet high scores (full runs only) + NEX DEUS unlock bars (`BEST x/req`, `LOCKED (n/5)` status)
- v173: NEX DEUS — the sixth cabinet: zone-surge eruptions from all five rosters, dash-cuts-everything, timed lost-player rescues, heavy-glow neon
- v174: TWIN PRISMS second boss (alternates with OMEGA; survivor enrages instantly) + announcer variety pass + `phase` key
- v175: Living arena 1 — gate chains, RISK gates (green/red), drifting gates, VAULT crate (loud greed), ESCORT bot
- v176: Living arena 2 — steam vents, DRAIN whirlpool (eats bullets), SUDS SURGE foam wall, HAZARD 2×$ + VAULT$ room kinds
- v177: Curtain variations — crossing doubles, shearing diagonals, TOKOTRON/NEX DEUS cabinet curtains
- v178: SMASH floor structure — bosses end floors, BONUS room between, palette shift + tougher lattice per floor
- v179: Daily modifiers — GLASS (1 HP, ×2 kills), SURGE DAY (double hazards), RICH DAY (double loot, +40% enemies); leaderboard tags the mode

**v160–v169 summary (2026-07-14 – 2026-07-15)**
- v160: TOKOTRON character pass — robot dressing on the whole roster (visors, stepping legs, gyro rings, brain-core) + civilians as real people with rescue halos and a help-wave
- v161: Cabinet identity audit — torchlit gaundrop walls, hooded WRAITH, spectral ghosts, winged FLITs, organic rocks, trooper helmet, command-post mast, kaikki lit windows
- v162: Scrolling arenas — gaundrop 2.0×/loadout 1.9×/kaikki 1.7× worlds with clamped camera follow + fog reveal; taxonomy recorded (rooms vs scrolling vs fixed)
- v163: BINDING chasms — red-rimmed pits: bodies blocked, bullets sail over; fliers cross; pits placed before rocks
- v164: Sound identity — per-cabinet gun voices + stingers (waveZap, keyJingle, hungerKnell, descend, kaChing); classic byte-identical
- v165: FIX — Roguelike B gold card rotates every OFFER (was accept-only; players only ever saw the gauntlet)
- v166: Bonus quests randomized + scarce — ~55% of card screens, random pick of six, no back-to-back repeats
- v167: Parity 1 (graphics) — procedural GROUND per cabinet (slabs/boards/concrete/asphalt), BRICK dungeon walls, kaikki blood, loadout muzzle flash
- v168: Parity 2 (gameplay) — TOKOTRON electrodes; GAUNDROP key inventory + locked gold doors + 30-cap hordes
- v169: Parity 3 (props/people) — shaped key/flask/meat pickups, bone door arches, kaikki THUG (36 enemy types)

**v150–v159 summary (2026-07-13 – 2026-07-14)**
- v150: THE BINDING OF TOKO — cabinet #3 (Binding of Isaac tribute): basement floors on the room lattice, ITEM-room free picks, floor bosses paying RARE picks
- v151: Cabinet graphics pass — RetroPass pipeline (per-cabinet render targets, palettes, glow, scanlines), per-cabinet materials, 12 Hz stepped animation
- v152: LOADOUT — cabinet #4 (Re-Loaded tribute): kit pick at the door, PURGE/DEMOLISH/HOLD OUT missions, gunmetal look
- v153: Cabinet row — single-select mod on the title + OPTIONS under SMASH TV; TAP TO START plays the armed cabinet
- v154: Roguelike B — ALL cabinets as gold-card bonus quests (RAID/DELVE/OP/DETOUR) with pinball multipliers + RARE payouts
- v155: TOKOTRON remake — instant full-wave spawns on 8-wave loops; GRUNT/BRUTE/ORB/PROG/MINDER roster; civilian family variety
- v156: GAUNDROP remake — real tile mazes, KEY + locked exit, GHOST streams, wall-phasing WRAITH, hunger drain + POTION
- v157: BINDING remake — seeded rock rooms, in-room FLIT/SPITTLE/CHARGER/HOPPER spawns, REAL branching doors, hearts economy
- v158: LOADOUT remake — THE COMPOUND walled base, TURRET + TROOPER, ASSAULT command-post mission, heavier weapon feel
- v159: KAIKKI IRTI 3 — cabinet #5: money from everything, alley crates, THE SHOP (bought arsenal), DOS-VGA streets

**v141–v149 summary (2026-07-13)**
- v141: SIREN — screamer support; 0.8 s inhale tell → 1.6× speed surge to the pack within 7 units
- v142: TEST MODE (OPTIONS → DEV) — all enemies from wave 1 with a budget floor; runs leave no records
- v143: CLOAKER — shimmer-flanks ~90°, 0.6 s decloak tell, aimed 3-burst; still hittable while cloaked
- v144: MAGNA — amber tether pull (1.1 u/s within 11); dash grants ~1.2 s immunity; stacked cap 2.0
- v145: Elite affixes — VOLATILE (fuse glow → 8-bullet death ring), SWIFT (1.35× + ribbons), ANCHORED (shove-immune)
- v146: ROGUELIKE B — OFF→A→B chip; BONUS GAUNTLET rare card: scripted smash rooms with pinball multiplier (×2+1/room), rare-upgrade payout, tier 2 mega-boss; fixed a smash double-clear-bonus bug
- v147: Arcade Tribute Wing designed (roadmap M5, five cabinets, 2P goal, IP rule) + PIXEL PREVIEW toggle (0.22× nearest-neighbor world, crisp HUD)
- v148: TOKOTRON — cabinet #1 (Robotron tribute): dark vector room, flood waves, civilians (1000×chain rescues)
- v149: GAUNDROP — cabinet #2 (Gauntlet tribute): torchlit maze levels, wall cover, enemy generators, suds food, gold exit tile

**v131–v139 summary (2026-07-12 – 2026-07-13)**
- v131: Trust-based daily leaderboard — `scripts/leaderboard-sheet.gs` (plausibility caps, 60 s GET cache) + death-screen DAILY TOP 10 with explicit initials + POST (zero UI until LEADERBOARD_ENDPOINT is set)
- v132: Visual feedback round — death pop tinted/smaller/faster-fading (no more white panels), organic slime pools + undulating sludge ribbon + BubblePool fumes, glyph badges on every pickup
- v133: Secondary objectives (GDD §9b) — BOUNTY marked targets (8 s window → cash + guaranteed pod) and CLEANSE foam zones (hold ~1.2 s → full-screen bullet cleanse paying per bullet)
- v134: Controller menu navigation — geometric gold-outline focus across every menu; A activates, B backs out; sliders adjust with left/right
- v135: SMASH TV floor chevrons at telegraphing doors (window 0.9→1.4 s), no spawns from the player's entry door in a room's opening seconds, pickup expiry blink (last 2.5 s)
- v136: OMEGA gained 3 HP-phases (fans / NEW twin-arm spiral / ring rage) with strobing transitions; 1.5 s wave breather with WAVE CLEAR banner; hi-res always-on-top pickup badges (boss act field renamed `_bossPhase` — collided with the wobble-phase offset)
- v137: ANNOUNCER VOL. slider (independent of master) + sustained-fire shot-noise ducking to 50% over ~2.5 s
- v138: Gates teach themselves — pulsing DASH THROUGH! tag until the first-ever gate detonation (persisted)
- v139: Death screen down to two buttons — CONTINUE flips to SEND & CONTINUE when there's anything to send; SKIP removed; content milestones M4–M6 designed on the roadmap; real-device pass done

**v120–v129 summary (2026-07-07 – 2026-07-12)**
- v120: SMASH TV design round two — risk-priced exits (HEAVY 2×$, pod-poor PRIZE$ rooms), greed prize placement near doors, shooter entrance "!" pings (both modes), room-transition black dip, PWA install (manifest + icons)
- v121: Recorded announcer intro on the title — ffmpeg-processed `announcer-intro.mp3` (bass boost / presence EQ / PA slap / compression / stereo widen)
- v122: FIX — intro voice actually plays: own INTRO VOICE toggle (default on) + gesture-safe triggers (toggle flip, OPTIONS resume, post-run title)
- v123: Classic wave rhythm made readable — color-coded wave banners (normal/SWARM/HEAVY/BOSS!) + boss klaxon in both modes
- v124: WARDEN shield-bearer (aura makes nearby enemies bullet-immune; never shields itself), live scoring feedback (streak heat tiers, 2× multiplier tag + drain bar, 25k milestone popups), GDD §2 no-interruption boundary recorded
- v125: GRAZE — near-misses while vulnerable pay +25 (dash i-frames don't); WARDEN escorts under late bosses
- v126: FIX — OMEGA clamped inside the walls (could be pushed out through SMASH TV doors); feedback chips refreshed to probe the new systems (warden blocks, room exits, rooms/loot/graze positives)
- v127: SHARE button on the death screen (native sheet / clipboard) + first-run tutorial hints (move/aim/dash/graze, input-aware, non-interrupting)
- v128: Offline PWA — `sw.js` precaches the module graph at install; cache-first for tokened URLs, network-first shell; cache name rotates with the ?v= token
- v129: FIX — powerup GPU leak (undisposed sphere geometry/material per pod, orphaned spheres on cash/prize swaps); auto perf-mode at sustained low FPS; perf mode also drops the shadow pass; FPS-EMA tab-switch guard; OPTIONS-rotation arena refit

**v110–v119 summary (2026-07-04 – 2026-07-06)**
- v110: FIX — arena always follows the viewport (stale ORIENTATION-chip choice pinned vertical maps onto landscape screens); toggle removed
- v111: Landscape camera re-framed — symmetric top/bottom margins, ~19% more arena on screen
- v112: Aspect-aware landscape zoom — fitPresetCamera() dollies in until the arena just fits the viewport
- v113: FIX — death screen fits landscape (compact @media block; chips/textarea/buttons all on screen)
- v114: SMASH TV feel — glowing door telegraphs, room-long door bursts, kill-drop floor cash, wave intro card, applause
- v115: SMASH TV rooms — fixed studio-room size both orientations, post+lintel door frames, walk-out EXIT doors entering the next room from the opposing wall, 3×3 traversal minimap with room kinds (MOBS/SWARM/HEAVY/PRIZE$/BOSS!)
- v116: Composed waves (both modes) — melee mobs flood, shooters capped/spaced/spread as tactical problems; floor valuables (cash piles, big prizes, rare multipliers)
- v117: SEND & CONTINUE posts feedback + run summary to a Formspree inbox (explicit consent, fire-and-forget)
- v118: QoL — vendored three.js (no CDN), Sheets-ready feedback (scripts/feedback-sheet.gs + SHEET_ENDPOINT), loot value popups, bill-stack/gift-box valuables meshes, BOSS IN N, favicon + OG tags
- v119: FIX — cache-bust vendored imports (Pages edge caches 404s ~10 min; the brand-new vendor/ path black-screened right after the v118 deploy)

**v100–v109 summary (2026-07-03 – 2026-07-04)**
- v100: Trail rework — afterimages spawn behind movers; SLUDGE poison is one continuous ribbon (PoisonZone invisible pure-damage)
- v101: Hand-brushed TOKO DROP logo on the title (yellow, cleaned); roguelike cards every 3rd wave
- v102: Logo glow — elliptical radial-gradient wash replaced the pink-square drop-shadow; logo alpha scrubbed
- v103: Pause menu simplified — settings-first, tester behind one button with VFX in the preview, plain-language knobs + LOOK presets + COPY MY SETTINGS
- v104: FIX — stale saved _bulletSpeed made enemy bullets crawl/fizzle; loadCFG ignores it
- v105: FIX — sludge ribbon crumpled at rest spots; distance-spaced timestamped points + 3s expiry + degenerate-tangent guard
- v106: FIX — landscape: auto arena orientation from viewport aspect (+ live rotation re-pick at title); title scrolls (data-ui tap guard) + compact @media(max-height:560px) layout
- v107: Player joins the satin look — makeSatinMat white blob; uStretch/uStretchDir added to the satin vertex inject; LOOK presets restyle the player
- v108: Audio for silent mechanics — BAMBU lob splash, BOTFLY homing-launch zip (Pages deploy needed a re-trigger, same transient as v94)
- v109: SMASH TV mode (4-door rush, +40% budget, prize-heavy drops, second convoy) + speech-synthesis arcade announcer + OPTIONS button on the title

**v90–v99 summary (2026-07-03)**
- v90: Satin gel materials — TUNING.material live via MeshPhysicalMaterial (blobs+cubes), goo vertex FX preserved via onBeforeCompile, presets/sliders restyle live
- v91: Title-screen fix — overlay scrollbar hidden (stray vertical line + squeezed buttons)
- v92: Convoy-clear drops a single weapon pod (2-choice pair removed)
- v93: In-menu enemy tester (mini-scene specimen viewport per enemy page, HIT/KILL/RESPAWN); LIVE TUNING page folded into enemy pages; SETTINGS = volume + reduce-motion
- v94: HOTFIX — v93 shipped a designer.js SyntaxError (game black-screened; node --check no-ops on ESM); added scripts/check-syntax.sh gate + headless testbed diagnosis; Pages deploy also failed transiently and needed a re-trigger
- v95: Gentler waves 1–5 (speed −0.012·(6−wave), budget ×0.85→×1.0; wave 6+ identical) + scripts/smoke.sh headless boot/harness test
- v96: Satin materials extended to TORO/BAMBU/PYRA/OMEGA + moths with per-family looks
- v97: PERFORMANCE MODE toggle — pixelRatio 1.25 + transmission off, reversible live
- v98: Removed the blob "eye" beacons (v73) — blobs read by silhouette + motion tell
- v99: SPLITTA — embedded bulges removed, always splits into exactly 3 GLOBBOs

**v80–v89 summary (2026-07-02 – 2026-07-03)**
- v80: Landscape crop fix (scrollable #overlay + rotation-safe canvas resize + viewport-fit=cover); shipped v78/v79 tuning prep
- v81: Pause-menu SETTINGS page (volume + reduce-motion moved off the title) + ENEMY LAB launcher
- v82: Port Part 2 — SDF gel-dome blob geometry (floor-contact origin), per-blob silhouettes, grounded drag, motion tells; fixed enemy-lab.html's missing smin (crashed on load); Enemy.fxY anchor plumbing
- v83: Family-matched death particles — angular chunks only from cubes; smooth droplet pool for everything else
- v84: Port Part 3 — rigid edge-pivot cube flop (arc 135°→45°), speed-derived cadence; fixed cube hover + elite stride/rest-height bugs
- v85: Port Part 4 — TORO rolls about its axle (5 rim spikes actually on the rim), exact-length telegraph with arrowhead; fixed hardcoded ±17 dash bounds escaping the portrait arena
- v86: Port Part 5 — BAMBU flared-cylinder bamboo tower + telegraphed parabolic lob with flashing landing ring (damage only inside the ring at impact); BambuAoE removed
- v87: Port Part 6 — LIVE TUNING pause-menu page (31 sliders into TUNING, copy/paste JSON, touched-paths persistence); port brief complete
- v88: BOTFLY flying homing bot (slow homing shots, charge-up tell); H/H2 pods removed — homing is enemy-exclusive; per-side homing steer in bullet.js
- v89: Moth drops diversified — 55% pod / 25% score nugget (250 + wave×25) / 20% Score Multiplier; convoy-clear 2-pod choice untouched


**v70–v79 summary (2026-07-02)**
- v70: New Homing weapon pod (H/H2) — 10th weapon type; `spawnDir` homing/turnRate params
- v71: OMEGA boss-exclusive enemy (crystal core, orbit+fan → enraged radial ring); fixed `_radiusMult` being erased by the squash-spring each frame
- v72: Score Multiplier powerup (gold orb, 2x kill-streak score 10s) — 4th gate drop
- v73: Per-blob accent beacons (bulletColor-matched) — 5 blobs readable at a glance
- v74: Wave-clear white flash + wired up the never-called `audio.waveClear()` chime
- v75: Settings — volume slider (master gain) + reduce-motion toggle, persisted
- v76: Run History panel — top 10 runs by score from existing `pb.runs` data
- v77: Title/pause polish — smaller controls block, chip-styled volume, "PAUSED" title, VISUAL tab removed
- v78: Added tuning.js + enemy-lab.html + port brief as assets (no wiring)
- v79: Port brief Part 1 — enemy.js reads 12 exact-match constants from TUNING (BAMBU cooldown/segments, YELA/SLUDGE trail+poison cadence, 8 TORO state constants); mismatched/not-yet-built values left hardcoded; zero behavior change

**v61–v69 summary (2026-06-30 – 2026-07-02)**
- v61: PURP_CUBE 2-arm spiral fire with per-cube spin rate/direction
- v62: Boss enrage fixed to actually speed up TORO's charge behaviour (was visual-only)
- v63: Positive feedback chip row ("WHAT DID YOU ENJOY?") added to the death screen
- v64: Language toggle — English/日本語/Suomi, `lang.js` i18n module
- v65: Full localization — on-canvas HUD + roguelike upgrade cards now translate
- v66: Language picker — three chips shown at once instead of a cycling button
- v67: Smaller death-screen buttons + hidden "fix" feedback list (`tokoDropFixList`, `_fixlist()`)
- v68: Feedback chip rows trimmed from 6 to 4 each
- v69: Fixed WEEVA (unscaled 12.5 bullets/sec from wave 2) and PURP_CUBE (doubled bullet output) — real cause of wave 8 being unreachable

---

**v50–v60 summary (2026-06-30)**
- v50: Feedback form interactivity fix — `showGameOver()` sets `overlay.style.pointerEvents='auto'`; reset in `returnToTitle()`
- v51: ORANGE_CUBE shoots while moving (state machine → flop + `_fireT`); all bullet visual scales reduced ~30%
- v52: Contra-style weapon pods — moths drop lettered pods (S/B/L/R + Lv2), 8 weapon modes, kill-all 2-choice pod pair; `equipWeapon()`/`makeGlyphTexture()`
- v53: Fix feedback buttons on mobile — added `#overlay` to InputManager `inUI` exclusion so `touchend` preventDefault no longer eats synthetic clicks
- v54: Revert bullet sizes to pre-v51 bullet-hell scale (player 1.0, enemy 1.25, fat 3.0)
- v55: No-cache meta headers on `index.html` to fix stale mobile caching
- v56: Gate laser beam aligned with its posts — rotate by `-(angle+π/2)` (three.js Y-rotation flips z)
- v57: Bigger readable bullets (enemy 1.6; player visual-only ×1.3 `PLAYER_BULLET_VISUAL_BOOST`, hitbox unchanged) + `scripts/bump-version.sh` & `scripts/release.sh`
- v58: Blob behaviour pass — GLOBBO pouncer, WEEVA drifting spiral turret, SPITTOR aimed ring, FANNER wide 3rd volley, SPLITTA low-HP pre-burst pulse
- v59: Boss identity — pulsing gold ground ring (`makeBossAura`) + enrage (×1.45 speed, red ring) below 35% HP via `Enemy.setBoss()`
- v60: SLUDGE_CUBE poison zone hazard readability — pulsing rim while lethal, desaturates when spent

**v40–v49 summary (2026-06-29 – 2026-06-30)**
- v40: Cube behaviour variety — each cube type is now a distinct archetype (YELA/minis rush, REDD flanks, PURP orbits+spiral, SLUDGE zones, ORANGE positions+shoots); `_flopMove` generalised with per-type heading
- v41: Hit-event telemetry system — every HP-loss records a snapshot (wave, time, source, attacker, dash-ready, enemy counts, upgrades); `_hitReport()` / `_hitLog()` / `_hitExport()` console helpers; `tokoDropHitLog` localStorage
- v42: Bullet origin tracking — `Bullet.originType` field; all enemy `spawnDir` calls pass `this.type`; `_hitReport()` shows exact attacker type with %
- v43: ORANGE_CUBE flop + difficulty ramp rebalance (budget 8+w×3.3 → 5+w×1.8; caps grow with wave; speed/fire gentled)
- v44: Enemy separation — post-update O(n²) pass pushes overlapping pairs apart by half-overlap; 2 passes per frame; flopping cubes anchor-nudged to keep tumble animation consistent
- v45: Four bug fixes — ORANGE_CUBE flop constructor `else if` → `if`; TORO `rotation.x = Math.PI/2` → `0` (upright wheel); gate laser BoxGeometry enlarged; gate-clearing removed from `spawnWave()` (cap at 2 active)
- v46: BAMBU growth (3 segments instantly, `_growTimer` 0.18) + lob charge-orb animation; bullet-hell style bullets (white halo + core, no trail); death-screen feedback form (predicted chips + free-text, `tokoDropFeedback`); `returnToTitle()` dismisses death screen
- v47: ORANGE_CUBE movement fix — `_orangeTarget()` picks a reachable ring-point ±10; arrival threshold 2.2 → 2.6; 5 s move-timeout
- v48: Cache-bust entire module graph — `?v=3` → `?v=4` on entry + all relative imports so browser/CDN refreshes; HUD label → v48
- v49: Real per-axis flop bounds (`halfX`/`halfZ` replace hardcoded H=17.5); dead `restartTimer` removed; `?v=4` → `?v=5`

**v30–v39 summary (2026-06-29)**
- v30: Pincer cluster spawns — groups fan across an arc, stagger entry, push in with intent
- v31: Player movement VFX — velocity-driven directional stretch (walk/dash lunge)
- v32: In-shader hit ripple — concentric shockwave from the bullet's impact point
- v33: Pre-death tear — violent `uTear` convulsion as a blob dies
- v34: Impact spark — goo bits flung from the contact point on a non-fatal hit
- v35: Hit-feedback polish — enemy-weight kill shake + muzzle flash
- v36: Per-enemy trail tuning — `TRAIL_CFG` motion signatures (TORO bold, blobs subtle)
- v37: Powerup/pickup VFX — collection pop + magnet pull-streak
- v38: Gate glow-beam halo + convoy golden trail ribbon
- v39: Bullet visual pass — additive glow cores, brighter colours, pulsing enemy bullets

**v20–v29 summary (2026-06-25 – 2026-06-29)**
- v20: Seamless wave flow — no announcement/burst/shake between waves
- v21: Harder early waves (budget 8+w×3.0, speed floor +20%); death run-summary; `runTimer`
- v22: Wave ends on last kill — pending spawns flushed, no empty-arena wait
- v23: Landscape / Steam Deck arena mode (ORIENTATION toggle, runtime `applyArenaMode`)
- v24: Gamepad support + input auto-detect (sticks, dash/pause buttons, hides touch UI)
- v25: Deck-first defaults — connected gamepad auto-selects landscape unless explicitly set
- v26: Difficulty curve reshape (8/10 by wave 10, plateau) + pacing pulses (swarm/breather)
- v27: Personal bests — `tokoDropPB` structured records, title + death-screen bests
- v28: Perf gate (FPS meter) + pooled death chunks (InstancedMesh, 1 draw call)
- v29: Movement VFX — blob directional stretch + pooled motion-trail afterimages

**v11–v19 summary (2026-06-24 – 2026-06-25)**
- v11: Portrait-optimised arena — 22×36 (HALF_X=11, HALF_Z=18), updated camera/intro
- v12: Wave ramp (budget ×2.8, speed 0.16, interval floor 0.26); gate burst FX; player bullet trails; hit vignette; title animation
- v13: Version number "v13" in HUD bottom-left
- v14: GDD.md added — 14-section living design document with per-section version stamps
- v15: Bloom post-processing (EffectComposer + UnrealBloomPass, ACES tone mapping) — later reverted
- v16: Arcade default (roguelike OFF); wave duration 30 s→20 s; announcement 900 ms→450 ms; input reset on game start; toggle-start bug fixed
- v17: localStorage key renamed `tokoDropRogue`→`tokoDropRogue2` to clear stale ON default
- v18: Bloom reverted; roguelikeMode hardcoded `false` at startup
- v19: Wave-end timer gate removed (waves end on last enemy death); convoy spawn 12–24 s→3–8 s

**v1–v9 summary (2026-06-24)**
- v1: Initial baseline — 13 enemy types, roguelike upgrade cards, goo shader, audio, gates
- v2: Goo shader upgrade — vertex wobble, Fresnel rim, animated SSS pulse
- v3: Goo shader fix — radius-normalised frequency + analytic normals; wobble now visible
- v4: Roguelike mode toggle (ON/OFF chip, localStorage persist)
- v5: Seeded PRNG per run; budget-based wave gen; mid-wave cargo convoy; HP powerup
- v6: Spike waves (4th, 1.6×); enemy variants (elite/elite-lite/twin/group); goo moth convoy
- v7: Silent convoy — always sinusoidal sweep; per-kill drifting powerup drops; no announcements
- v8: Boss waves (8th, 2.5×) — guaranteed top-tier enemy, 3× HP / 1.5× scale
- v9: Minimal wave announcement — small "WAVE N" flash only (22 px, 900 ms)
