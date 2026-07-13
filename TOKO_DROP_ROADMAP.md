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

*Shipped so far: v126–v139 — see VERSIONS.md. Real-device pass (mobile +
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

- **BULWARK** — carries a frontal shield plate; bullets only land from the
  sides/behind. Tell: the plate visibly glints. The melee-lane counterpart
  to WARDEN's aura: positioning, not priority.
- **SIREN** — periodically screams (rising audio tell + expanding ring):
  nearby enemies get a 3 s speed surge. Never attacks. With WARDEN, forms
  the "kill the support first" family.
- **CLOAKER** — fades to a faint shimmer while repositioning, decloaks with
  a 0.6 s glow tell, fires one aimed burst, repeats. Teaches watching for
  ripples, punishes tunnel vision.
- **MAGNA** — projects a slow pull on the player while alive (bubbles
  stream toward it as the tell). Dash breaks the pull. Movement pressure
  that stacks dangerously with bullet patterns.
- **Elite affixes with visible tells** (replaces "bigger/more HP"):
  VOLATILE (orange fuse glow → death ring burst), SWIFT (speed ribbons),
  ANCHORED (stone-dark tint, immune to knockback/separation pushes).
- **Second boss: TWIN PRISMS** — two half-HP crystals orbiting in opposite
  phase, alternating volleys; when one dies the survivor enrages instantly
  (phase 3 rules). Alternates with OMEGA per boss cycle; daily seed decides
  the starting boss.
- **Announcer variety**: lines for the new enemies + bounty/cleanse events;
  recorded clips can replace synth speech wherever the user supplies audio.

## M5 — The living arena (objectives & hazards)

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

- **SMASH TV floor structure**: the boss room ends a floor → palette shift,
  tougher lattice, bonus room between floors.
- **Daily modifiers** (seeded, rotating weekly): GLASS (1 HP, ×2 score),
  SURGE DAY (double hazards), RICH DAY (double loot, +40% enemies) — the
  leaderboard tags the modifier.
- **Roguelike depth**: bigger card pool + **cursed cards** (power at a
  price: e.g. +40% damage / −1 max HP) for build identity.
- **Graze-chain heat meter** if M1 data shows graze engagement.

---

*Maintained alongside `GDD.md` (design truths) and `VERSIONS.md` (what
shipped). When a roadmap item ships, delete it here and let VERSIONS.md
carry the record.*
