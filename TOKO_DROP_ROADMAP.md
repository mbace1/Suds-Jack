# Toko Drop — Roadmap

Goal: evolve Toko Drop from a live playtest build into a **public 1.0**
— a polished, shareable arcade game at mbace1.github.io/Suds-Jack/toko-drop/ —
then deepen it with post-1.0 content.

Everything ships through the normal release flow (PR + squash into `gh-pages`,
VERSIONS.md entry, smoke/syntax gates, deploy verification); nothing here
blocks bug fixes or small requests. VERSIONS.md stays the record of what
actually shipped — items are deleted here as they land.

**Standing constraints (do not violate):**
- No build step; everything runs as plain ES modules.
- No CDN/runtime dependencies — vendor everything (`toko-drop/vendor/`).
- Classic mode never interrupts between waves (GDD §2 boundary): screens,
  choices, and reward beats belong to Roguelike mode exclusively.
- **No background music, ever** (GDD §10): SFX, synth stingers, and the
  announcer ARE the audio identity.
- Every new enemy/objective/hazard must have a **readable tell** before it
  hurts, and exactly ONE mechanic each (the WARDEN standard).
- New file paths carry `?v=` cache tokens from day one (v118/v119 lesson) —
  and go into BOTH `scripts/bump-version.sh`'s file loop and `sw.js`'s
  precache list.

*Shipped so far: v126–v146 — see VERSIONS.md. Real-device pass (mobile +
PC/DualSense) done 2026-07-13.*

---

## M1 — Balance from telemetry *(gated on data)*

*Gate: playtest runs in the feedback inbox (first runs played 2026-07-13;
send confirmation pending — `_feedbackExport()` in the console recovers
local runs any time).*

- **Sheets endpoint swap** (user step): deploy `scripts/feedback-sheet.gs`,
  paste the `/exec` URL into `SHEET_ENDPOINT` — unlimited submissions;
  Formspree remains the fallback until then.
- **Difficulty pass driven by data** (inbox records + `_hitReport()`
  telemetry). Knobs, all single numbers: SMASH TV wave budget (+40%), mob
  pulse size/gap (3 / ~2.5 s), shooter budget share (35%) + cap curve,
  WARDEN hp/aura (5 / 4.5), boss-escort count/timing, graze margin/value
  (0.55 / +25), bounty window (8 s), cleanse hold (1.2 s).

## M2 — Public 1.0 (remaining)

- **Leaderboard go-live** (user step): deploy `scripts/leaderboard-sheet.gs`,
  paste the `/exec` URL into `LEADERBOARD_ENDPOINT`.
- **itch.io page** (user-owned account; deliberately last): page linking or
  embedding the Pages build; README/landing polish alongside it.

---

*The content milestones below are designable and buildable NOW, while M1/M2
wait on user steps. Implementation order gets revisited when M1 data lands —
build what the data says players engage with first.*

## M4 — Enemy & boss expansion

*Theme: new decisions, not new bullet sponges. Each enemy is one mechanic
with one tell; support enemies grow into a family alongside WARDEN.*

*(Shipped: BULWARK v140, SIREN v141, CLOAKER v143, MAGNA v144, elite
affixes v145 — plus TEST MODE v142 and the Roguelike B gauntlet v146.)*

- **Second boss: TWIN PRISMS** — SHIPPED v174: two half-HP shards orbiting
  in opposite directions, trading aimed volleys in strict turns; when one
  shatters the survivor enrages INSTANTLY (phase-3 ring rage). Alternates
  with OMEGA per boss cycle; the run seed decides the opener (dailies share
  it, consecutive bosses in a run always differ).
- **Announcer variety** — first pass SHIPPED v174 (deeper line pools on every
  key + a 'phase' key for boss act changes). Still open: recorded clips can
  replace synth speech wherever the user supplies audio.

## M5 — Arcade Tribute Wing (Roguelike B grows into a cabinet row)

*Vision (user, 2026-07-13): Roguelike B's bonus games expand into a set of
retro tribute modes — each ALSO selectable directly from the menu. Pixel
graphics that evoke the originals, Toko Drop enemies mingling with
reference-INSPIRED (but original) designs — modern + classic in one frame,
keeping the pacing and appeal of each reference. Every mode's visuals,
gameplay, and feel get refined individually. **2-player is the long-term
goal** (local co-op first: second gamepad, shared screen).*

**Naming/IP rule: reference names live HERE and in design docs only. In-game
modes ship under original tribute names with fully original assets — we
emulate pacing and structure, never sprites, names, or characters.**

Shared foundation (build first):
- **Pixel render mode** — SHIPPED v147 (DEV preview), SUPERSEDED v151 by the
  **RetroPass pipeline**: per-cabinet render targets + post shader (palette
  quantization, posterize, glow, scanlines), per-cabinet materials (neon
  shells / NES snap / painterly satin), and 12 Hz sprite-era stepped visuals.
  Each future cabinet declares a profile in `js/retro.js`.
- **Bonus-game framework** — the v146 gauntlet generalizes: a scripted
  room/goal sequence with its own multiplier, offered as Roguelike B's rare
  card AND as a menu mode. Per-mode tuning objects, one entry point.

**Art direction (user, 2026-07-13): all cabinets share a very similar pixel
style — each with its own reference-driven accent — and the orange cubes are
welcome everywhere. TOKOTRON sets the template: dark background, no grid,
shiny vector-bright graphics.**

**Mode identity checklist (user, 2026-07-14) — every cabinet, current and
future (NEX DEUS included), gets scrutinized on ALL of these, not just looks:**
- **Visuals**: enemies/objects read their theme at a glance (v160/v161 bar).
- **Structure**: room-traversal (SMASH, BINDING) vs scrolling-arena
  (GAUNDROP 2.0×, LOADOUT 1.9×, KAIKKI 1.7× — camera follow + fog reveal,
  v162) vs fixed single-screen (TOKOTRON, classic).
- **Terrain/gameplay elements**: chasms (BINDING v163 — bodies blocked,
  bullets fly over), walls, generators, hunger, economies… each mode's
  reference mechanics, not shared boilerplate.
- **Sound**: per-cabinet gun voice + event stingers (v164); classic stays
  byte-identical; never background music (GDD §10).

*Menu integration SHIPPED: v153 single-select CABINET row (title + OPTIONS
under SMASH TV); v154 all cabinets as Roguelike B bonus quests on the gold
card rotation. Full remakes (enemy/level/environment/pacing per cabinet —
only shooting + dash stay Toko, user direction) SHIPPED v155–v158.*

The cabinet row (each refined individually, in build order):
1. **TOKOTRON** *(Robotron: 2084 tribute)* — v148, graphics v151, REMAKE
   v155 (instant full-wave spawns on scripted 8-wave loops; GRUNT/BRUTE/
   ORB/PROG/MINDER roster; civilian family variety). Backlog: per-mode
   high score, 2P.
2. **GAUNDROP** *(Gauntlet tribute)* — v149, graphics v151, REMAKE v156
   (real tile mazes, KEY + locked exit, GHOST streams, wall-phasing WRAITH,
   hunger drain + food economy, floor-clearing POTION); v181 generator
   spawn telegraphs + TREASURE VAULT alcoves; per-mode high score v172.
   Backlog: 2P.
3. **THE BINDING OF TOKO** *(Binding of Isaac tribute, user addition)* —
   v150, graphics v151, REMAKE v157 (seeded rock layouts, in-room spawns,
   FLIT/SPITTLE/CHARGER/HOPPER roster, REAL branching doors, hearts
   economy). Backlog: shops, item pools per floor, revisits.
4. **LOADOUT** *(Re-Loaded tribute)* — v152, REMAKE v158 (THE COMPOUND
   walled base, TURRET + TROOPER, ASSAULT command-post mission, heavier
   weapon feel). Backlog: rescue-the-hostage mission, mission briefings.
5. **KAIKKI IRTI 3** *(Tapan Kaikki 3 tribute)* — SHIPPED v159 (DOS-VGA
   streets, money from everything, crates, THE SHOP with the bought arsenal
   — the sanctioned big-weapon exception). Backlog: more shop tiers
   (flamethrower-class), civilians-as-witnesses, mission variety.
6. **NEX DEUS** *(Nex Machina inspired — the final unlockable)* — SHIPPED
   v172 (per-cabinet records + unlock bars) + v173 (the cabinet: zone-surge
   eruptions from all five rosters, dash-cuts-everything, timed lost-player
   rescues, heavy-glow neon profile; quest deck entry on unlocked profiles).
   v185 CHAINED SECRETS (dash-through glitch tiles, consecutive-wave
   multiplier); v186 THE CUSTODIAN (its own boss — dash-crackable sheen,
   glitch teleports). Backlog: polish to crown-jewel level.

## M5b — The living arena (objectives & hazards)

*Theme: the floor is a player too. Objectives you chase, hazards you route
around — every one telegraphs before it matters (and hazards hurt enemies
too, so luring is always a legal tactic).*

**Gates, round 2:**
- **Gate chains** — detonating a gate within ~6 s of the previous one pays a
  chain multiplier (×2, ×3…): a route-planning minigame across the arena.
- **RISK gate** — the beam alternates green/red on a readable cycle; dashing
  through on green doubles the reward, on red it's a dud (never harmful —
  the risk is wasting it).
- **Drifting gates** — late waves, gates slowly wander, so the route keeps
  changing.

**New objectives (GDD §9b family):**
- **VAULT crate** — armored box, ~8 hits to crack, drops big loot; every hit
  pings nearby enemies toward you. Loud greed.
- **ESCORT bot** — a little soap-bot trundles wall-to-wall; if it arrives
  alive it gifts a pod. Enemies ignore it unless it's between them and you —
  protecting it is pure positioning.

**Hazards (non-enemy, arena features — the poison-trail counterpart):**
- **STEAM VENTS** — floor tiles glow amber for ~1 s, then erupt (damage +
  knockback, enemies included). Area denial that skilled players weaponize.
- **DRAIN** — a whirlpool zone with visible swirl: gentle pull + eats any
  bullet that crosses it (both sides). Cover that moves the fight.
- **SUDS SURGE** (SMASH TV) — a foam wall sweeps one lane of the room after
  the floor lights its path; brushes enemies away and stuns them, damages
  the player only on direct hit. The show's "commercial break" spectacle.
- **New SMASH TV room kinds**: HAZARD room (vent-heavy, loot-rich) and
  VAULT room (the crate + guards) join the lattice.

## M6 — Modes & meta depth

- **SMASH TV floor structure** — SHIPPED v178 (bosses end floors, BONUS
  room between, palette shift + tougher lattice per floor).
- **Daily modifiers** — SHIPPED v179 (GLASS / SURGE DAY / RICH DAY on a
  4-day date rotation; leaderboard tags the modifier).
- **Roguelike depth** — SHIPPED v180 (pool 13 + four CURSED cards with the
  price printed on the card).
- **Graze-chain heat meter** if M1 data shows graze engagement.
- **FLUID MODE** (movement lab): v196 dodge/school/split + v197 wave
  archetypes (STREAM/RING/PINCER) shipped — next tuning pass waits on
  field feedback (dodge cooldown, split cap, current strengths).

## M7 — Graphics track (WebGPU arc)

Shipped so far: v189 instanced bullets, v190 instanced splats, v191 node
pipeline behind the `WEBGPU (BETA)` toggle, v192 real adaptive backend on
three r180 (classic stays r167), v193 motion trails off under the flag
(field feedback: "the trails look off").

- **Promotion criterion (user, 2026-07-22): WEBGPU stays experimental until
  the flag path really pushes the gelation look and explosion splatter** —
  "not a huge leap" otherwise. The slime-fizz bubbling is a keeper in both
  paths ("great visual for simplistic communication").
- Remaining arc steps, in order:
  1. **Gel parity + push**: TSL port of the goo wobble/SSS (`onBeforeCompile`
     is GLSL-only) — then go PAST parity: thicker transmission, wobblier
     domes, juicier explosion splatter under the flag.
  2. **RetroPass TSL port** (cabinets render raw under the flag today).
  3. Revisit promotion once 1–2 land and the field test says the look wins.

---

*Maintained alongside `GDD.md` (design truths) and `VERSIONS.md` (what
shipped). When a roadmap item ships, delete it here and let VERSIONS.md
carry the record.*
