# Toko Drop — Version Log

<!-- Rules:
  - Add a new ## vN entry at the top for EVERY commit that touches game files.
  - Stage this file alongside your changes: git add VERSIONS.md
  - When a new multiple of 10 is reached, move the prior decade's entries into the Archive section below.
  - The pre-commit hook (scripts/pre-commit) enforces these rules.
-->

## v267 — 2026-09-24
**SOUND PER WORLD: a continuous synthesised bed for every world, that answers to the world's rule, rises for the boss, and crossfades in the fall** *(owner: "all in order" — leap 3 of 5)*
- **Toko Drop had no music at all.** Every sound through v266 was a one-shot
  tone or noise burst. `js/bed.js` is a continuous ambience per world, fully
  synthesised — no files, no network:
  - **THE SURFACE** — a low drone and fifth under a slow tremolo, and a soft
    tick every two seconds: calm, and alive.
  - **THE WELL** — band-passed water swelling on a slow LFO over a sub drone,
    with a beating pair a few hertz apart.
  - **THE VEIN** — a two-thump heart under a minor drone.
  - **THE VOID** — a sub-bass hum and a breath of filtered noise.
  - **THE FOAM** — three high partials drifting against each other, a fizz,
    and bubbles.
  - **THE KILN** — a low saw through a closed filter and a rumble.
- **A bed is information, not decoration** — each answers to its world's rule:
  THE VOID's noise breathes with the fog, THE VEIN's heart doubles when a sweep
  (or the boss's line) is coming, THE KILN's filter opens before the updraft and
  a thump lands with it. A tension layer — a buzzing saw two octaves up — rises
  while any boss lives. The crossfade between worlds is 1.2 s and lands inside
  the 1.9 s fall.
- **Measured without a speaker**: every bed builds on any audio context and
  schedules in context time, never on a timer, so the same code renders in an
  OfflineAudioContext. Eight seconds per world, each cue fired at 3 s, the boss
  layer from 5.5 s:

  | world | RMS | where its energy sits | its cue | boss layer |
  |---|---|---|---|---|
  | THE SURFACE | 0.033 | ~87 Hz | — | ~87 → **200** Hz |
  | THE WELL | 0.031 | ~459 Hz (the water band) | — | ~459 → 248 Hz |
  | THE VEIN | 0.029 | ~125 Hz | heartbeats in 1.5 s: **2 → 3** | ~125 → **273** Hz |
  | THE VOID | 0.024 | ~37 Hz (sub) | high-frequency energy **×4.8** in the dark | ~37 → **149** Hz |
  | THE FOAM | 0.025 | ~1,800 Hz | — | RMS +55% |
  | THE KILN | 0.033 | ~69 Hz | high-frequency energy **+43%** as the furnace opens | ~69 → **171** Hz |

  Loudness is even across worlds (within 3 dB), under every sound effect.
- **Four things the measurements changed.** (1) THE VEIN's heart did not
  quicken in time: the beat after a warning was already committed at the slow
  spacing, so the first quick beat landed a second later — about when the
  sweep itself did. A warning now pulls the next uncommitted beat to 0.15 s,
  and the scheduler looks 0.25 s ahead instead of 0.6, so a cue is heard within
  a quarter second. (2) THE VOID's breath changed the brightness and barely the
  loudness — the sub drowned it — so the sub is under the breath now (RMS +42%
  in the dark). (3) The boss layer was too quiet to notice; it now moves every
  bed's brightness by half again or more. (4) Every bed sat about 20 dB under
  the effects; they were raised to an even −30 dB RMS. Two instruments were
  wrong on the way and were replaced rather than trusted: an onset counter that
  counted each two-thump beat twice (the beats are now logged where they are
  scheduled), and zero-crossings, which barely move when a filter opens on a
  saw whose fundamental dominates (high-frequency energy is measured instead).
- **Driven through the live game**: the bed follows every depth through the
  whole cycle and back, the boss layer rises and falls with the boss, pause
  ducks it to 30% and keeps the world, the title is silent, a campaign room
  plays its world, and a cabinet or RUSH plays nothing. **No leak**: eight world
  changes made 48 audio sources and all 48 ended. The void's breath is throttled
  so the game's every-frame call does not write an automation event per frame.
- A **WORLD SOUND** switch in OPTIONS (on by default, `tokoDropBed`); the bed is
  on its own bus, so the master volume and the switch reach it live. `bed.js`
  is in the offline worker's precache and `bump-version.sh`'s file loop.
- Cache-bust `?v=221` → `?v=222`; HUD label → v267

---

## v266 — 2026-09-24
**A BOSS PER WORLD: every boss fights inside a world, and while it lives that world's rule comes from the boss** *(owner: "all in order" — leap 2 of 5)*
- **Every boss already closes a world** — boss every 8 waves, a world every 8
  waves, so the wave-16 boss fights in THE WELL and the wave-48 one in THE KILN.
  The headliners stay the purpose-built ones (OMEGA, the twin PRISMS, TORO with
  WARDENs in CLOSE COMBAT); what changes is the fight around them. While a boss
  lives, the world's rule binds to it (`TUNING.depth.boss`), and the boss wave's
  banner names the fight:
  - **THE WELL — THE WHIRLPOOL.** The current becomes a swirl round the boss
    that draws everything in past four units.
  - **THE VEIN — THE LINE.** The rail sweep stops; the boss fires the line
    instead — through itself, square to you, travelling your way, a gap in it.
  - **THE VOID — THE BLINK.** The dark breathes faster and deeper, and at its
    darkest the boss is somewhere else, at least seven units from you.
  - **THE FOAM — THE SKID.** The boss's own step becomes what it accelerates
    toward, so it overshoots you and has to come back round (both twin PRISMS).
  - **THE KILN — THE FURNACE.** The updraft blasts out from the boss, more
    often, and hits you as hard as it hits them. You fight toward the heat.
  - THE SURFACE keeps no rule and so its boss is the fight it always was.
- **Measured against the same fight with the binding off** (a boss held in
  place, eight dummies, the player at a fixed spot):

  | world | variant | off → on |
  |---|---|---|
  | THE WELL | the whirlpool | player moved **2.9 away** from the boss → **6.4 toward** it; bodies around it drift out 10.5 → hold at −0.4 |
  | THE VEIN | the line | boss volleys 0 → **3** in 12 s, replacing the rail's one |
  | THE VOID | the blink | 0 → **2** blinks in 13 s, landing 13.4 and 8.0 from you; fog 6 → **4** |
  | THE FOAM | the skid | time for a chasing boss to turn back toward you **0.02 s → 0.46 s**; mean Δv 0.25 → 0.09 |
  | THE KILN | the furnace | bodies pushed from the boss 5.2 → **7.7**; you, 1.6 → **6.5** |

- **The first cut of the probe measured nothing**, and it is worth writing down
  how: it passed `withBoss` in the wrong argument slot, so every "off" run took
  zero steps and every "on" run took one second — a table of confident numbers
  about two fights that never happened. And the first skid instrument used TORO,
  whose charge-and-pause cycle decides when it turns, so the skid read as making
  it turn *faster*. A steady chaser with the world's rule switched off is the
  control that holds.
- `scripts/soak.sh 40` now plays through four bound boss fights in each mode:
  boss rounds 12.6–17.4 s, no stalls, both modes to wave 41.
  `design/boss-whirlpool-v266.gif`, `design/boss-line-v266.gif`.
- **The recordings found a banner bug**: "WAVE 16 — BOSS · THE WHIRLPOOL" ran
  off both edges of a 760 px screen, and a phone is narrower. The wave banner
  now fits — the main line shrinks until it does, and anything after " · "
  drops to a smaller second line — which also covers a campaign room's goal
  and every depth name. `design/boss-banner-phone-v266.png` is it at 390 px.
- Arcade only: a campaign room has no boss, and a cabinet has no world.
- **A v265 DEFECT IN THE ROOMS, found by this release's gates.** level-smoke
  failed one campaign room in roughly four runs: a spawn "did not land as
  authored". Traced: v265's heat mirrored each echo through the centre, and a
  symmetric ring MIRRORS ONTO ITSELF — every echo spawned exactly where the
  originals had arrived 1.5 s before, and the crowd pass shoved the newcomer
  apart on its first frame. `scripts/campaign-rooms.mjs` now places EVERY
  spawn, hand-written ones included, in time order around whatever is still
  standing there — a spot stays taken for as long as the body that took it
  lingers (a turret the whole room, a WARDEN or TORO about 12 s, a
  range-holding shooter 6, a chaser 2.5) — turning a clash about the centre
  until it is clear and inside, and it refuses a room with two bodies stacked.
  That check found a stacked pair in THE PULL's hand-written skeleton (a MAGNA
  and a ring GLOBBO) and two in SIREN SONG's, moved by hand.
- **And level-smoke now checks the promise the file actually makes.** Even
  with clean placement, a body that WALKED onto a spawn point on its way to
  you still shoved a newcomer about one room-run in fifty — a dense room is the
  point, and fifteen rooms made that a failed gate run one time in four. The
  check compared the first SIGHTING, a step into a body's life, after its own
  motion and the crowd pass, within a full unit. It now compares where the pump
  PLACED the body (`Enemy._spawnAt`, one line in the game) to 0.01 of a unit.
  That is stricter, not looser: a negative control that makes the game misplace
  one body by 0.3 — which the old one-unit tolerance would have passed — fails.
  The trace file written for the Godot port's parity diff still records first
  sightings, byte-for-byte as before. 90 runs across all 18 rooms: no failures.
- **THE FORGE, re-tuned.** Spreading its echoes to clear spots surrounded the
  player from more directions at the same body count, and the human-like bot
  went from surviving it 8 times in 10 to once. It sits on a cliff: 35 bodies
  at base speed survive 18/20, 39 bodies with 5% more speed 5/20; 39 bodies at
  base speed — kept — survive **10/20**, the finale's target. Speed carries
  more of that cliff than the bodies do.
- Cache-bust `?v=220` → `?v=221`; HUD label → v266

---

## v265 — 2026-09-24
**CAMPAIGN WORLDS: six worlds of rooms that play the arcade's own places, three kinds of goal, grades a room can actually pay, and a bot that measures the curve** *(owner: "all in order" — leap 1 of 5)*
- **A world is an arcade depth, look AND rule.** The campaign is now six worlds
  of three rooms (`TUNING.campaign.worlds`): a room in THE WELL plays on the
  current, a room in THE VEIN under the sweep, and so on. Fifteen new rooms,
  written by `scripts/campaign-rooms.mjs` through the game's own serializer and
  validator. The screen groups them by world, in each world's rail colour with
  its rule named; a world you have not reached is one locked line.
  `design/campaign-worlds-v265.png`, `design/room-crossfire-v265.png`.
- **The world lives in the campaign table, not the level file** — deliberately.
  The level format is SHARED with the Godot port's loader and both refuse an
  unknown key, so a `look` in the file would have made the port refuse every
  campaign room. A level stays an arena, a clock and a spawn list; the campaign
  wraps it in a world and a goal.
- **Three goals.** `survive` (the clock), `quota` (put down N bodies — the room
  ends the moment you do) and `flawless` (one hit ends the room). The goal is on
  the banner and on screen for the whole room: the count, or the promise, and
  the seconds left. World 1 stays all-survive: the surface is where things are
  taught.
- **THE v263 GRADES COULD NOT BE EARNED.** They graded kills per second of the
  room's clock at 0.35/0.65/1.0/1.5 — and a room is fifteen bodies over forty-
  five seconds, a third of a kill a second if you kill every one. B, A and S were
  unreachable in every room that shipped; the v263 check that "passed" had
  injected sixty kills into a room holding fifteen. Now:
  - **survive / flawless** — the share of the room's bodies you put down, and
    **each hit costs a grade step** (never below C for living through it).
    The share alone did not work either: every body in a room eventually walks
    into your gun, so a survivor took S nine times in ten. With hits counted
    the grade IS clean play, and a flawless room is the same idea taken to its
    end.
  - **quota** — **seconds behind**: from the arrival of the last body the count
    needs to the moment you have them all (S 1.5 s, A 3, B 6). A share of the
    clock could not separate players: the count only becomes reachable once the
    bodies arrive, so every survivor finished at the same share. Each quota is
    the number of bodies that have arrived by 30% of the clock, set by the
    generator rather than chosen.
- **The rooms were tuned against two bots, 10 runs a room** —
  `scripts/campaign-bot.sh`, a measuring instrument and not a gate. The
  perfect-aim bot answers "is S reachable" (it is, in every room); the
  human-like one (sees threats later, re-reads the field every 0.25 s, ±12° of
  aim) answers "is this the right difficulty for where it sits". Bare, the
  rooms gave the perfect bot S in 52 of 54 runs and the human-like one S in
  nearly all of theirs with 0–2 hits — no pressure at all. So each room is a
  hand-written **skeleton** plus **heat** (mirrored echo waves, a speed ramp,
  shooters firing more often), and the heat is a dial **per room**, because a
  blanket heat by world made UNDERTOW (world 2, splitters) kill the human-like
  bot three times in three while RINK (world 5, sliders) handed it S. The cast
  decides how hard a body count is. Final, human-like bot:

  | world | survive rooms lived | quota rooms lived | flawless passed |
  |---|---|---|---|
  | 1 THE SURFACE | 30/30 | — | — |
  | 2 THE WELL | 9/10 | 9/10 | 8/10 |
  | 3 THE VEIN | 5–9/10 | 9/10 | 2/10 |
  | 4 THE VOID | 15/20 | 10/10 | — |
  | 5 THE FOAM | 7/10 | 7/10 | 3/10 |
  | 6 THE KILN | 18/20 | 4/10 | — |

  **Read it with its noise**: at 10 runs a lived rate is worth about ±3 — PULSE
  read 9/10 and then 5/10 on identical content. The human-like bot also runs
  away from the nearest bullet rather than looking for the gap in THE VEIN's
  sweep, so it under-rates CLOT; the perfect bot passes it 7 in 10, so it stays.
  Real people are v268's job.
- **Three harness faults before any of that meant anything**, all worth
  knowing: a death shows the ordinary death screen and a room only reports its
  F once that screen is dismissed (the v237 design — the harness never dismissed
  it); restarting the fake clock per run sent the game's timestamp backwards,
  so every run after the third in a page timed out doing nothing; and patching
  a dial by regex matched the room's skeleton as well, so a "tuned" run was the
  old dials.
- **THE LOOK LEAK is fixed.** A level ran on whatever depth the last run left —
  the depth code skipped levels "because they own their looks", and a level has
  none — so a room after a run to THE VOID wore THE VOID's floor under THE
  SURFACE's sky. A campaign room applies its world; anything else (the editor's
  test run, `?level=`) plays on THE SURFACE.
- **A shaped arena's edge glow was a shader constant** — THE SURFACE's violet,
  on every world — the same fault v260 fixed for the floor colours.
  `uShapeEdgeCol`, both paths (GLSL and TSL), written from the world's rail;
  THE SURFACE's 0x5555cc is exactly the `vec3(0.333, 0.333, 0.8)` it replaces.
- **v264 correction: two worlds favoured enemies that never spawn.** THE FOAM
  named HOPPER and FLIT and THE KILN named CHARGER and THUG — cabinet types
  neither arcade pool can draw — so half of each world's tilt did nothing. They
  now favour pool types (FOAM: YELA_CUBE, SLUDGE_CUBE, SPLITTA, ORANGE_CUBE,
  SHEPHERD; KILN: BULWARK, TORO, REDD_CUBE, PURP_CUBE, WARDEN).
- The offline worker precaches all eighteen rooms. Cache-bust `?v=217` →
  `?v=220`; HUD label → v265. **Not 218**: while this was being built another
  lane's site-wide signature deploys bumped this game's WORKER cache name to
  218 and then 219 (and its signature and shell tokens to 7 and 70) without
  moving the module tokens. A release that reused 218 would have shared a cache
  name with a worker already installed in the wild, and kept its stale entries.
  The rebase kept their signature and shell tokens and moved this release, module
  graph and worker together, to a number nobody had used.

---

## v264 — 2026-09-24
**A WORLD IS A RULE NOW, not a paint job: one mechanic each, two new worlds, and the loop comes back to THE SURFACE** *(owner: "give each world one mechanic, add a fifth and sixth so the loop starts later, and let the loop include the surface")*
- **Six worlds, one rule each** (`TUNING.depth.rules`). Through v263 a world
  changed the sky, the rail, the fog, the grid and which enemies it favoured —
  and **nothing about it changed how the game played**. One mechanic each, and
  only one, so a world can be named by how it plays:
  - **THE SURFACE** — none, on purpose. The first eight waves are where the
    game is taught.
  - **THE WELL** — a **current**. The whole floor drifts on it and the drift
    turns slowly; the fish school with it and you feel it as a lean to correct.
  - **THE VEIN** — a **sweep**. The rail flashes, then fires a line across the
    arena with a gap in it. The hazard is the floor, not an enemy.
  - **THE VOID** — the **dark breathes**. Fog closes to near-6 and opens again
    on a nine-second cycle, so the far side of the arena disappears and returns.
  - **THE FOAM** *(new)* — the floor is **slick**. You carry momentum instead of
    stopping dead: the one rule that changes YOUR verbs rather than theirs.
  - **THE KILN** *(new)* — an **updraft**. Every few seconds the floor shoves
    everything out from the middle, so the centre is somewhere you pass through.
- **The loop comes back round.** `cycleFrom` 1 → 0 and six worlds instead of
  four: the repeat starts at wave 49 instead of 33, and it returns to THE
  SURFACE, which a run had not seen since wave 8.
- **Measured against the same world with its rule switched off** — the only
  control that holds, since each world has its own roster and its own crowd:

  | world | rule | enemy drift off → on | player moved off → on | enemy bullets | fog near |
  |---|---|---|---|---|---|
  | THE SURFACE | none | 13.9 → 13.9 | 0 → 0 | 0 → 0 | 42 → 42 |
  | THE WELL | current | 13.9 → **32.3** | 0 → **9.9** | 0 → 0 | 30 → 30 |
  | THE VEIN | sweep | 13.8 → 13.8 | 0 → 0 | 0 → **12** | 36 → 36 |
  | THE VOID | dark | 13.9 → 13.9 | 0 → 0 | 0 → 0 | 18 → **6–18** |
  | THE FOAM | slip | 13.8 → 13.8 | 0 → 0 | 0 → 0 | 34 → 34 |
  | THE KILN | updraft | 14.0 → **17.4** | 0 → **2.5** | 0 → 0 | 26 → 26 |

  Every rule shows up in exactly one column and nowhere else, and THE SURFACE —
  identical code on both sides — moves 0.1%, which is what makes the rest
  readable. THE FOAM has its own instrument, because a slick floor moves
  nothing on its own: hold a direction for two seconds and let go, and you
  **slide 1.38 units** where every other world slides 0, at the same top speed
  (5.99 against a SPEED of 6) — it costs you the crispness, not the pace.
- **Three faults in the instrument before any of that meant anything**, all the
  same shape — *the ruler was measuring the game, not the rule*. (1) The dummies
  were being shoved by real spawns, so THE SURFACE with no rule at all "drifted"
  as far as a world with one. (2) With the spawns evicted, the wave counter
  still advanced, and a wave that changes depth calls `applyDepthLook`, which
  **resets the rule's own clock** — so the two rules with timers (sweep,
  updraft) never fired once in a fourteen-second window, and the trace showed
  the accumulator sitting at 6.5 seconds away forever. (3) The rail-flash
  counter compared `getHex()` against the authored hex, which do not match
  through colour management, so it read hundreds of flashes on a world that has
  none. The wave is frozen for a measurement now and the flash is not counted.
- **A body standing on the exact middle has no outward direction**, and the
  middle is precisely what THE KILN's updraft exists to move you off — `x/0` is
  not a direction. Anything inside 1.5 units of the centre takes the event's own
  angle, rolled when the push starts. Before the fix the updraft moved a
  centred player **0.0 units**; after it, 2.5.
- Every rule is **classic rounds only** — cabinets, SMASH, RUSH and authored
  levels keep their own — and every rule **resets on a world change and on a
  run start**, so a fall never carries the last world's weather into the next.
  `reduceMotion` halves THE VOID's breath.
- Cache-bust `?v=216` → `?v=217`; HUD label → v264

---

## v263 — 2026-09-23
**TWO DOORS: ARCADE and CAMPAIGN — and RUSH moves out of the title and into the pause-menu cabinets** *(owner: "just make campaign the option" · "when you take away rush, just add that to the pause menu cabinets. They can always act as test beds for new modes")*
- **The title has two doors.** ARCADE is the endless run and is still what a
  tap, Space or the pad's A does, so nothing about starting a game got slower.
  CAMPAIGN opens the room list.
- **RUSH is a CABINET, not a door.** It joins the ARCADE CABINET cycle in
  OPTIONS between KAIKKI and NEX DEUS, which is where a mode gets a test bed
  before it earns a door of its own. `rushMode` is a read of that slot now
  rather than a second stored truth, the old `tokoDropRush` key migrates once
  (a player who had the chip on lands on the slot) and is then removed, and
  **RUSH keeps its own tuning everywhere** — v262 gave the shotgun to the
  classic pool and RUSH still fires the RUSH one. It is deliberately NOT in
  `CABINETS`, which is the NEX DEUS requirement list: adding it there would
  quietly move the unlock.
- **THE CAMPAIGN** (`TUNING.campaign`) is Geometry Wars 3's shape, which is the
  reference the owner named: a list of **rooms**, each its own arena on its own
  clock, graded **S/A/B/C** and **F** for a room you did not survive. A room
  opens when the one before it is cleared, so the list is a route rather than a
  menu. The three rooms are the authored levels the editor already makes
  (FIRST LIGHT, THREE RINGS, BOOST LANE) — **a new room is a JSON file and a
  line in the tuning table, never new code.** Grades are per room, best kept,
  and the tiers are gentler than RUSH's ladder (0.35/0.65/1.0/1.5 kills a
  second against 0.5/0.9/1.4/2.0) because a room is a first meeting with an
  arena, not a score attack you have already learned.
- **Driven end to end in a browser, not asserted**: the two doors render, room
  1 is open and 2 and 3 are locked, playing room 1 enters the authored level,
  clearing it with 60 kills on a 45 s room grades **A** (1.33 a second) and
  unlocks room 2, dying in room 2 grades **F** and leaves room 3 locked.
- **The bug that was worth finding.** The campaign screen lives inside the
  title's own `gameState`, which is what makes pause, resize, the arena
  framing and the way home keep working without any of them learning it
  exists — and it is also why **every "start the run" path would have fired
  behind the room list**: a tap on the background, Space, the pad's A, and a
  resize would have swapped the list back to the title. One flag (`onCampaign`)
  is what those four paths ask now. Start backs out of the list instead.
- **Not a bug, recorded so the next capture does not chase it**: a screenshot
  taken right after a room ends shows the old HUD over the new screen. That is
  SwiftShader catching up — the headless renderer manages three frames a second,
  and the same capture at four seconds (66 frames) is clean. At 60 fps it is one
  frame, and it is the same on the pre-existing title return.
- Cache-bust `?v=215` → `?v=216`; HUD label → v263. The campaign's strings are
  in all three languages.

---

## v262 — 2026-09-23
**THE WEAPON PODS, REFRESHED AND REBALANCED: five families with one idea each, a level you EARN and a hit takes away, the shotgun out of RUSH — and the pierce bug that had been eating laser damage since v70** *(owner: "shotgun can become one of the weapon pick ups.. which need refreshing and rebalance")*
- **THE PIERCE BUG, and it is the biggest number here.** A pooled bullet built a
  `Set` of everything it had pierced and **nothing ever cleared it**, so a
  recycled bullet passed straight through any enemy that had survived it. It
  cost most of the damage of the one thing that is supposed to be good against
  a rank, and it cost it *worst against whatever lives longest* — which is every
  boss. Measured against a line of four immortal dummies: **LASER 12 → 40 damage
  a second, LASER LV2 12 → 53.** The set is cleared in `spawnDir` now. The
  PIERCE upgrade card was losing the same damage and now does what it says.
- **Five families, one idea each, and each one owns a column.** Measured (a
  `#wep` probe: frozen clock, immortal dummies, three seconds of held trigger,
  damage per second):

  | pod | one far | one near | line of 4 | arc of 5 far | arc of 5 near |
  |---|---|---|---|---|---|
  | (no pod) | 10 | 10 | 10 | 10 | 10 |
  | **S** spread | 10 | 32 | 10 | **49** | 53 |
  | **S2** | 10 | 52 | 10 | **48** | **72** |
  | **B** burst | 20 | 21 | 20 | 20 | 21 |
  | **B2** | 27 | 29 | 28 | 27 | 29 |
  | **L** laser | 10 | 10 | **40** | 10 | 10 |
  | **L2** | 13 | 14 | **53** | 13 | 21 |
  | **R** rapid | 19 | 21 | 23 | 20 | 21 |
  | **R2** | 30 | 31 | 32 | 30 | 31 |
  | **G** shotgun | 7 | **35** | 20 | 20 | 35 |
  | **G2** | 7 | **49** | 20 | 19 | 49 |

- **What was wrong before, measured the same way.** BURST fired three rounds on
  the SINGLE cycle, so it was 3x damage for free — **29 against a single body,
  BURST2 49**, against RAPID2's 30 and SPREAD's 10. **SPREAD2 was not better
  than SPREAD** (10.3 against 10.3). **LASER2 was byte-for-byte LASER** — same
  rate, same bullet, same pierce, a level-2 pod that did nothing. Every family
  reads `TUNING.weapons` now, where `rate` is a multiplier on `FIRE_RATE`
  rather than a magic number in the firing block: burst pays for its volley,
  LASER2 is a **second rail** instead of the same rail twice, and the shotgun
  owns point blank on its cadence.
- **The level is EARNED, not rolled.** The pool drops level 1 only. Picking up
  the family you are already holding is what makes it level 2, so a pod is a
  decision — commit to what you have, or change shape — instead of a lucky
  roll (it was a flat 28% from wave 4). The draw also leans away from the
  family in your hands, because three SPREADs in a row is the same wave three
  times.
- **And a hit takes it back.** Level 2 drops to level 1 when you are hit; it
  never takes the gun away, because being weaponless is a different game rather
  than a punishment. Level 2 is what clean play looks like.
- **The shotgun is a pod** (owner's call), five pellets wide and 7 damage a
  second past arm's length — the one pod that asks you to stand where you are
  trying not to stand. **RUSH keeps its own cadence**: the classic pod is tuned
  for a game played at arm's length, and dropping it into RUSH unchanged is a
  2.2x buff to that mode's only gun. The shop's SHOTGUN sells the shotgun now
  instead of SPREAD2.
- **Named rather than claimed: BURST and RAPID measure the same** (20/21/20
  against 19/21/23). They differ in rhythm and in one real rule — a burst keeps
  the direction it was fired in, so it punishes tracking a moving target the way
  rapid does not — but no column separates them, and that is an open question,
  not a distinction.
- Cache-bust `?v=214` → `?v=215`; HUD label → v262. The HUD shows the family and
  the level (`[R LV2]`), since the level is the thing you are trying to keep.

---

## v261 — 2026-09-20
**THE DROP, part two: THE FALL — a boss down, the floor gives, and you fall to the next depth. Two styles, one toggle** *(owner: "we can try both")*
- **The fall.** A boss clear on a classic round no longer chains into the next
  wave under a black dip — `beginDrop()` runs a 1.9 s descent (`TUNING.depth.fall`)
  and the next wave spawns only once the new floor is under you. You are
  invulnerable for it and a beat after; bullets and queued spawns are cleared;
  the screen darkens to 65 % at the bottom and comes back up. The depth banner
  (*DEPTH 2 — THE WELL*) lands with the new floor, with no second dip.
- **Two styles, both shipped**, one row in OPTIONS — **DROP: CAMERA FOLLOWS**
  (`localStorage tokoDropFall`, default *floor*):
  - **floor** (default): the camera holds. The old floor and rail drop 34 units
    into the dark (ease in), the look switches at the bottom, the new floor
    rises to meet you (ease out). `design/fall-floor-v261.gif`.
  - **follow**: the camera and you fall together; the old floor leaves the top
    of the frame, the look switches halfway, the new floor comes up from below.
    Still motes spawn beneath the camera so they streak upward past it.
    `design/fall-follow-v261.gif`.
- **Nothing disappears at the moment of the fall** (v257's rule): leftover
  drops and gates ride the old floor down — their meshes carry the floor's y
  each frame — and go at the switch, in the dark. No collecting or gate-dashing
  while the floor is out from under them; the DASH THROUGH tag hides too.
- **Two bugs the probe caught before the soak did.** (1) The clear check
  re-fired every frame of the fall — the dead bodies stay in the array until
  `spawnWave` — paying the clear bonus and restarting the drop each frame, so it
  never landed. Both the clear and the v256 clock now sit out while `drop` is
  live. (2) In *follow*, the camera offset was applied before the drop update
  reset it, so the landing frame was drawn from under the new floor; the drop
  update now re-seats the camera on the frame's own offset.
- **Measured.** A `#drop` probe (throwaway staged copy, frozen clock, every
  frame driven by hand): the clear pays once (4000 at wave 8), wave 8 → 9,
  depth 1 → 2, banner set, camera back at rest on landing, no page errors.
  `scripts/soak.sh 40` with the fall at every boss: both modes to wave 41, the
  boss rounds 12–16 s including the fall, no stalls, no leaks. smoke, cabinets,
  webgpu-smoke, level-smoke ×3, editor-smoke green.
- Cache-bust `?v=213` → `?v=214`; HUD label → v261

---

## v260 — 2026-09-20
**THE DROP, part one: every boss floor is a DEPTH with its own look and roster; the desktop zoom sticks and pulls out for bosses** *(owner: every boss · look and roster, thematic · try both falls · "make the zoom stick, zoom out when needed")*
- **Depths.** `TUNING.depth`: index = floor((wave − 1) / 8); past the table it
  cycles from THE WELL. Four looks — **THE SURFACE** (the shipped look,
  verbatim), **THE WELL** (teal, dense grid — the fish: SPLITTA, WEEVA,
  RIBBON, SLUG), **THE VEIN** (dark red, sparse glowing grid — the bullets:
  SPITTOR, FANNER, PYRA, DRAPER, BOTFLY), **THE VOID** (near black, the grid
  at a third — the dark: CLOAKER, MAGNA, SIREN, TORO, WARDEN).
  `design/depths-v260.png`. The change lands the wave after a boss, under the
  black dip, with a banner (*DEPTH 2 — THE WELL*). **The fall itself is v261,
  both styles.**
- **The floor's colours are uniforms now.** A first cut changed only the
  background, fog, rail, grid density and vignette — and the screenshots
  showed THE VEIN as a red rail on the same navy floor, THE VOID with a bright
  cyan grid. The floor's base and grid colours were shader *constants*.
  `uFloorBase`, `uFloorGridHi`, `uGridGlow` on **both** paths (GLSL and TSL),
  the surface look byte-identical to before. `shader-lint` and `webgpu-smoke`
  green.
- **The roster tilt, measured honestly — third attempt.** (1) Doubling the
  favourites in the draw pool moved the share 0.18 → 0.16: cost, cheap-doubling
  and the group variants swamp a pool weight. (2) Alternating every other draw
  from the favoured subset, in both the mob and shooter loops: still nothing —
  because **groups** (3 of 8 CLOSE COMBAT draws, 3–5 bodies each) pick from a
  different pool and ignore the draw. (3) A favoured draw makes a group *of*
  the favourite. **And the probe's own "baseline" had the tilt switched back
  on before it counted**, so its first two before/after pairs were noise; with
  a true baseline: favoured share **0.05–0.08 → 0.42–0.52** on THE WELL and
  THE VOID, **0.27 → 0.60** on THE VEIN. A tilt, not a wall. Still one `rng()`
  per draw.
- **The zoom sticks, and pulls out for bosses and curtains.** Coming IN is
  accepted only when the fit moved by more than `hysteresis` (6% of rest) —
  a camera that creeps with every body is a camera you notice; coming OUT is
  immediate. A live boss or a curtain wave sets the *rest* out (×1.18 / ×1.10).
  **A first cut fit the frame from the longer rest and dollied IN on the boss
  (measured ×0.84)** — two points fit close. A zoom-out is the rest itself:
  measured ×1.19. Desktop only (`framingAllowed()` is landscape).
- **The banner had to be the last word.** Set with the archetype banner, it
  was overwritten three lines later by *ESCORT THE BOT!* Moved to the end of
  `spawnWave()`.
- Gates: smoke (42) · cabinets 6/6 · webgpu · shader-lint · level-check ·
  arena-check · crowd-check · framing-check · level-smoke ×3 · editor-smoke ·
  **soak 40/40 both modes** (depth boundaries at 9/17/25/33 crossed clean).
- Cache-bust `?v=212` → `?v=213`; HUD label → v260

---

## Archive

**v250–v259 summary (2026-09-16 – 2026-09-20)**
- v250: The zoom was v247's camera dolly running in portrait; the memory budget finally binds on the owner's phone; the version on the title screen
- v251: The RIBBON and the GEL SLUG in the real waves from wave 2 as testers — arc-mover candidates; long bodies hit-test themselves
- v252: Testers cost less (curve reused, tail shadows off); `PLAYTEST_2026-09-17.md` — a bot played ten games: rounds were 5–8 s, CLOSE COMBAT had 37 corpse bullets at wave 2
- v253: The slug stops multiplying (min 4 to split, children never split); VOLATILE at revenge speed; revenge seeded; PYRA `FIXED`
- v254: Revenge is a species trait — the ten shooters' corpses, from wave 3, capped on the field (wave-2 bullets 37 → 0, survival 42 → 57 s)
- v255: TORO reads — a spoked sawblade in one draw call (6 → 1)
- v256: Waves become fronts — a 12–15 s clocked round, pulsed bodies, survivors carry over; `restartGap` on the death summary (owner: "wave number")
- v257: Transitions and flow — drops and gates survive the boundary, fronts pull in when the floor empties (idle 5.5 → 2.4 s), THE CURTAIN kind, a darker slug
- v258: A 40-wave soak found a freeze (an early `return` in `loop()`), no ceiling on the live floor (91 bodies), and a flat revenge cap binding from wave 6 to 40 — all fixed
- v259: `scripts/soak.sh` — the long game becomes a gate, falsified before trusted (at wave 12 it passes the very freeze it exists to catch; run it to 40)
- **The lesson of the decade:** the bot and the soak found what no short run could — the freeze, the pile, the flat ceiling, the tilt that did nothing three times — and twice the *probe itself* was wrong (a baseline with the tilt still on; a negative control too shallow to fail). Measure, then check the instrument.

**v240–v249 summary (2026-09-05 – 2026-09-16)**
- v240: The floor draws a level's region on both render paths — PR #447's v238 term brought across by hand
- v241: skipped on purpose — an unmerged lineage had already used it (the same reason v238 was skipped)
- v242: HOTFIX — a half-float overflow in v240's shape term; real, fixed, and NOT the white screen (`scripts/shader-lint.mjs` added to catch the class)
- v243: BOOST LANE, a Rush level, and the first Rush-level cross-build parity measurement against the port
- v244: The white-out explains itself — on-screen diagnostics, and the game survives losing the GPU
- v245: The swarm arrives as a fan, not a pile
- v246: A contrast floor — no body darker than the ground it stands on
- v247: The camera frames the fight, not the floor
- v248: The white-out narrows itself — an auto-bisect ladder names the suspect that brings the picture back
- v249: **Found it.** Android was reclaiming the WebGL context ~5s in; `preventDefault()`, a persisted loss ratchet, and a pixel budget
- **The lesson of the decade:** five releases were spent guessing at a bug no sandbox could reproduce (SwiftShader is 32-bit float everywhere and never loses a context). It was solved by making the game *diagnose itself on the owner's device* — and v250 then found that v249's budget never actually bound. Ship the instrument before the fix.

**v230–v239 summary (2026-08-28 – 2026-09-05)**
- v230: QOL — haptic pulse on a shield block, a test buzz when haptics are switched on
- v231: itch.io press kit — `press/PRESS.md`, screenshots, the controls table
- v232: RUSH abilities ported from the Godot port (heat exchange, hyper bomb, overcharge, quantum shield)
- v233: RUSH onboarding — its own tutorial hints, seen once
- v234: THE RUSH LADDER panel; the v232 abilities were firing themselves off the boost button — a dedicated ability bind
- v235: The ZONE boost scheme removed — it was never reachable
- v236: The arena is a shape, not two numbers — `js/arena.js` (SDF), 8,396 exact checks; P0 of the level editor
- v237: THE LEVEL EDITOR — drop-downs on top, tap to place, a 0.1s timeline, play-from-here; `js/level.js`
- v238: skipped on purpose — PR #447, an unmerged lineage, had used both v237 and v238
- v239: One level format for two engines — the Godot port reads the editor's JSON; `toko-drop/levels/`; cross-build parity 46/46 · 34/34

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
