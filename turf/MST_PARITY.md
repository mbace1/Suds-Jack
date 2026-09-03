# TURF — distance to Metal Slug Tactics

Written 2026-09-03, at v25. The owner's question was "steps to MST parity";
this is the answer, kept in the repo rather than in a chat log because the
ordering matters more than the list.

`GDD.md` is still the design authority. This document is subordinate to it
and says only *how far from one reference* the build currently is.

---

## 0. What parity does NOT mean

TURF's brief is **Into the Breach × Metal Slug Tactics**. Two MST pillars are
deliberately out of scope, and chasing them makes a worse ITB without making
an MST:

- **Hidden enemy intent.** MST hides what the enemy will do. This game's whole
  contract is that it does not. Every system added here has to be drawable in
  advance; that constraint is the reason sync was cut (below) and the reason
  enemies have behaviours rather than ability kits.
- **Sync attacks.** Designed, built, measured three ways and cut in v24. Free,
  it took `the-yard` from 68% winnable to 0% on its own — anything multiplied
  by "allies in range" pays the side with more bodies, and this roster is
  weaker-but-numerous by design. The full finding lives in `js/momentum.js`'s
  header. **Do not rebuild it without reading that first.**

---

## 1. Done (v24–v26)

| MST pillar | TURF |
|---|---|
| Adrenaline earned by moving | **Momentum** — one point a tile, `js/momentum.js` |
| Adrenaline spent on named actions | **Abilities** — `data/abilities.json`, six, costed in momentum |
| Movement as the engine | Momentum is *either* damage *or* evasion, never both |
| Reaction fire | **Overwatch**, the only thing that happens on the enemy's turn |
| Readable enemy turn | Two-beat phase (LOOK then ACT), spotlight, camera follow, intent paths |
| Full information on a shot | **Forecast** — odds, damage and LETHAL over every reachable target, from the tile you would actually shoot from |
| Mission variety | **Extraction** and **destroy**, both on a deadline — the game's first clock |
| Ammo rhythm | **Magazines** on every gun; reloading is your action and never your move |
| Position is the player's | **Firing positions** — a tap that would move you offers the tiles, each with its own odds |
| Skill categories | Six **lines** (GDD §5.1); every loadout crosses two, and weapon-gated skills show inert rather than hidden |
| A run is a build | **Level-up pick** — a slot buys one of three from any line, chosen before the next block |

The economy closes: you **move** to afford the thing you then **do**.

---

## 2. Next, in order

**2.1 — DONE (v26).** `forecastAttack` is the one place the odds are worked
out and `resolveAttack` calls it, so the quoted number and the rolled number
cannot drift. Badges on the board rather than a hover tooltip, because touch
has no hover and a number you must ask for is a weaker promise than one that
is simply there.

**2.2 — DONE (v26).** `extract` (get N of the crew onto the pads) and
`destroy` (break the cache), both with a `deadline` — which is the game's
second and third loss conditions; before v26 it had exactly one, a crew wipe.

> **OWNER DIRECTION, 2026-09-03: "bosses come after mechanics."** A boss is
> content built ON TOP of a combat system, so it inherits every gap in one —
> and it is the most expensive possible way to discover that the underlying
> fight is thin. The boss moved to 2.6; what follows is the mechanics it
> should be built on.

**2.3 — DONE (v27).** Magazines on ranged weapons only, reloading costs the
action and never the move — so an empty turn is a turn to reposition, which
is the movement economy getting the empty turns it was competing with a free
attack for. Enemies reload on the same rule and TELEGRAPH it.

**2.4 — Reinforcements.** *(medium)*
Fixes something real and currently ugly: on a survive map, wiping the roster
early means coasting for three rounds with nothing on the board. MST spawns
over the course of a mission. Arrivals announced a round ahead with the tile
marked, which is exactly what this game's telegraph is for — a spawn the
player could not see coming would break the contract everything else here
is built on.

**2.5 — Destructible cover.** *(medium)*
The board is fixed except for Barricade. A shotgun or a hammer breaking full
cover into partial, and partial into open ground, makes position decay —
which is the thing that stops a good tile being a permanent answer, and it
pairs directly with knockback and the hazards.

**2.6 — A boss.** *(after the above, per the owner's direction)*
Something with a rule that changes the board, so a run *ends* rather than
stops. It needs 2.2 (an objective is what a boss IS before it is a stat
block) and now 2.3-2.5 as well.

**2.7 — Impact.** *(medium)*
Flash and floater today. Wanted: zoom-punch and freeze-frame on a kill,
damage-tiered shake, layered SFX. `anim.js` already owns the only rAF loop
and reads `state.log`, so all of it is additive.

**2.8 — Run structure.** *(large)*
`SEQUENCE` is a flat seven-element array. MST is a branching route with node
types and a **choice of three** rewards. The choice-of-three half landed in
v30 as the level-up pick — a run is a build now — so what remains here is the
route itself: node types, branching, and a reason to pick one path over
another.

> **Sequencing trap, and it generalises past its original case.** A branching
> run map over the same fight adds screens, not decisions — which was written
> here about objectives and is the same reason a boss waits on mechanics.
> Depth in the turn first; structure around it last.

**2.6 — Sprite vocabulary.** *(blocked, not on the code side)*
Attack / hit / KO frames per cast member. The deployed attack pair still
violates the Sprite Bible §5 (near-profile), and no `GEMINI_API_KEY` or
`MESHY_API_KEY` is available in the build environment — `node
scripts/assets.mjs doctor` confirms. Validator and recipe work continues
against PR #419; the frames themselves need an owner-side push request.

---

## 3. Honest gaps that are not on the list

- **Both new missions are cliffs for the balance bot, not dials.** Extraction
  with open pads measured 0% at four rounds and 100% at five; the fight only
  becomes a decision once enemies stand ON the approach (46%). Destroy
  measured 0% at *every* cache-HP and roster combination until the bot was
  taught to attack a cache at all, and two caches at opposite ends is 0% at
  every setting because it asks the crew to cross the board twice. One cache
  is 20%. The third-versus-fourth enemy is likewise a cliff, 20% to 0%. Every
  one of those numbers is in the encounter's own `_note`.
- **The one-tap attack used to pick the worst tile.** Through v27 it took the
  CHEAPEST tile that could reach: measured over 400 taps with a real choice,
  that banked less momentum than an available alternative 80% of the time and
  stopped in the open when cover was on offer 20% of the time. Scoring the
  tile instead takes those to 30% and 0% — the residual 30% being correct
  trades, where the longest run costs cover. **A default that quietly plays
  badly is worse than no default**, and every system from v24 on had made the
  old one worse without anyone re-reading it.
- **The ammo rule's effect scales with each side's RANGED SHARE**, and the
  encounters were balanced when ammo was infinite. Measured: `warehouse`
  (crew 0/3 ranged, foes 2/6) went 65% → 98% because the crew lost nothing;
  `underpass` (crew 2/3, foes 1/5) went 17% → 0% because the crew lost most
  of its damage; `the-yard` (0/3 vs 0/5) did not move at all, which is what
  confirms the mechanism. Magazine size was swept and 4/4/3 is the only
  setting that leaves every encounter near its pre-ammo rate. **Any future
  roster change now has a balance consequence it did not have before.**
- **`the-depot` is bimodal on enemy count** and no amount of geometry softens
  it: 3 foes reads 100% and 4 reads 0% at every cover layout, roster and
  cache position tried, because that mission is a race rather than a fight.
  Cache HP is the only lever with fine grain there (6 → 100%, 10 → 13%).
- **A destroy map is invisible to a "nearest target" bot**, which is why
  `balance.mjs` had to learn the objective. Worth remembering before adding a
  third mode: a mode the bots cannot pursue is a mode nobody can balance.

- **Openings and Planted are never used by the auto-battler.** Barricade was
  in this list from v25 to v28 and now has a rule (2 uses across 420 runs, so
  barely); these two replace it. A gap in the bot is not evidence about the
  skill, but it does mean nothing has measured whether they earn their cost.
- **`EVADE_PER` barely moves bot play** (±1 point across a 2.25× range),
  because bots always attack and so always spend their momentum. It exists for
  human play that the bots cannot find, and that claim is currently untested.
- **`DAMAGE_PER` is `Math.floor`-quantised over a range of four**, so it is a
  cliff, not a dial: 0.25 and 0.34 are 23 points apart in the win floor.
- **The feel question is still open.** GDD §9's exit criterion is that the
  fight is "fun/tense to play through repeatedly". No system answers that;
  only a playtest does.
