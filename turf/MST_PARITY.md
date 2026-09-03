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

**2.3 — A boss.** *(medium, and now the next thing)*
Something with a rule that changes the board, so a run *ends* rather than
stops. Needs 2.2 first: a boss is an objective before it is a stat block.

**2.4 — Impact.** *(medium)*
Flash and floater today. Wanted: zoom-punch and freeze-frame on a kill,
damage-tiered shake, layered SFX. `anim.js` already owns the only rAF loop
and reads `state.log`, so all of it is additive.

**2.5 — Run structure.** *(large)*
`SEQUENCE` is a flat five-element array. MST is a branching route with node
types and a **choice of three** rewards. XP, weapon drops and trinkets exist
but nothing is ever *picked*, which is the difference between progression and
a roguelite.

> **Sequencing trap: 2.5 before 2.2 is a menu in front of the same fight.**
> A branching map over five encounters and two objective types adds screens,
> not decisions. Objectives first.

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
- **A destroy map is invisible to a "nearest target" bot**, which is why
  `balance.mjs` had to learn the objective. Worth remembering before adding a
  third mode: a mode the bots cannot pursue is a mode nobody can balance.

- **Barricade is never used by the auto-battler** (`js/autoplay.js` has no rule
  for it). That is a gap in the bot, not evidence about the ability — but it
  does mean nothing has measured whether Barricade is worth its cost.
- **`EVADE_PER` barely moves bot play** (±1 point across a 2.25× range),
  because bots always attack and so always spend their momentum. It exists for
  human play that the bots cannot find, and that claim is currently untested.
- **`DAMAGE_PER` is `Math.floor`-quantised over a range of four**, so it is a
  cliff, not a dial: 0.25 and 0.34 are 23 points apart in the win floor.
- **The feel question is still open.** GDD §9's exit criterion is that the
  fight is "fun/tense to play through repeatedly". No system answers that;
  only a playtest does.
