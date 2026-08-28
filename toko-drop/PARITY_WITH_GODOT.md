# Parity notes — this build ↔ the Godot port

A two-way ledger between **this build** (`toko-drop/`, the lead) and the
**Godot port** (`mbace1/toko-drop-godot`). It is notes, not a request: the
decisions in the first section are the owner's, and nothing should be built
from this file without one.

Written from the Godot side on **2026-08-27**, against **v225** here.

## The rule this is measured against

Owner direction, 2026-08-27:

> "We should aim the push of graphics and physics on Godot. Otherwise follow
> the lead of the JS version."

- **This build leads on gameplay.** New modes, verbs, content are designed,
  played and proved here first.
- **The Godot port follows on gameplay**, and pushes on **graphics and
  physics** — the part a browser build cannot do.
- **A feature is never designed twice.**

So the useful question for this file is not "do the two match" — they should
not, on presentation — but **"is any gameplay living in the wrong repo?"**

---

## 1. Gameplay that exists ONLY in the Godot port

This is the part worth a decision. Each of these was designed in the Godot
repo, which is the wrong side of the line above. None of it is a bug; it
predates the direction.

### 1a. CHALLENGES — a ten-level campaign

No `challengeMode` here at all. In the port it is a full mode: ten named
levels, each with its own rule and a timed run, graded A/B/C, where reaching
tier C unlocks the next.

Levels: FIRST LIGHT, COLD START, THE VICE, CROSSFIRE, THE TIDE, CONDUCTOR,
AFTERLIFE, THE NARROWS, NO SECOND CHANCE, BARE HANDS.

Rules a level can carry:

| rule | what it does |
|---|---|
| BOOST ONLY | no gun — boost through them or nothing |
| CLOSE QUARTERS | a smaller arena; nowhere to run to |
| ONE LIFE | one life, no second chance |
| ARTILLERY | shooters only — read the bullets |
| SWARM | bodies only, and a lot of them |
| GRAVEYARD | every corpse bites back, harder |
| FOCUS | shepherds and sirens — kill the conductor first |

Design lives at `mbace1/toko-drop-godot`: `design/CAMPAIGN_LEVELS.md`,
`design/RUSH_TIERS_AND_LEVELS.md`.

**Three options, all the owner's:**
1. **Migrate it here**, then port it back the normal way. Most work, but it
   puts the design where the rule says it belongs and gets it played by
   everyone rather than only by Godot builds.
2. **Grandfather it as Godot-exclusive** — and say so in both repos, so that
   nobody later "fixes" this build to match and nobody re-designs it here.
3. **Retire it.**

Option 2 is cheap but only works if it is written down; an undocumented
exclusive is indistinguishable from drift six months later.

### 1b. RUSH abilities

v224/v225 gave Rush its ruleset, arena and roster here, but no ability. The
port has four selectable ones, chosen before the run:

| ability | idea |
|---|---|
| HEAT EXCHANGE | dump accumulated heat as a burn — bigger the hotter you are |
| HYPER BOMB | a big clear that costs no heat; the panic button |
| OVERCHARGE | a window where boosting is free and the chain climbs double |
| QUANTUM SHIELD | a window where enemy fire is reflected back as yours |

They exist to bend the boost/shoot/heat triangle in different directions, so
picking one changes how you play rather than what you press. Same decision as
above, and smaller: it slots into a mode this build already has.

---

## 2. What the Godot port is missing from HERE

Tracked in that repo's `PORT_STATUS.md`; listed so this file is a real ledger
rather than a wish list pointing one way.

- **v225 in full** — the Rush arena and roster landed here today and the port
  does not have them yet: `bareArena()` suppressing gates/bounties/vault/
  escort/vents/drains/foam/curtains/cargo, the four-body roster
  (GLOBBO / YELA_CUBE / SPLITTA / SLUDGE_CUBE), the COOLER venting 0.22 heat
  on a boost-kill, and no bosses in Rush. Next thing the port ports.
- **ROGUELIKE: 12 of 20 cards**, and mode B's bonus gauntlet. The port has
  mode A with hp, speed, firerate, dashcd, longdash, nuke, x_berserk and
  x_leadfeet; the rest need systems it does not have yet and are listed there
  as pending rather than silently dropped.

---

## 3. Confirmed already at parity

Checked number for number on 2026-08-27, so nobody re-checks it:

- **RUSH v224's ruleset.** boost speed 17; heat 0.55 / 0.02 / 0.42 with a 0.35
  hysteresis clear; chain 1 per kill, cap 100, 2.5s window; lives 3 with an
  extra every 25 000; levels 60 / 90 / +30s; shotgun 5 pellets, 0.5 spread,
  3.4× rate. Identical in both.
- **Rush level as difficulty, both ways.** Here `getWaveScale`/
  `getEnemySchedule` substitute `rush.level` for the wave; the port does the
  same through a `level_override` on its wave director. (Named differently —
  a grep for "rush" in the port's director finds nothing and looks like a gap.
  It is not.)

That the ruleset matched exactly is not luck: v224's own comment credits the
design to the Godot port's `RUSH_MODE.md`. Rush is the case where this worked
the right way round — the design moved upstream and shipped here.

---

## 4. Two things found from the Godot side that may apply here

Neither is a bug in this build; both are the kind of thing a second
implementation surfaces.

1. **The port's ROGUELIKE row was labelled with this build's OFF text**
   ("no upgrades — pure arcade survival"), so it described the absence of the
   feature as though it were the feature. Worth a glance at whether any menu
   string here reads as its own off-state.
2. **A RISK gate pays two pods, not one.** The port had a test asserting one
   pod from "a gate", which passed most of the time and failed on the seeded
   35% roll that makes a gate RISK. The behaviour is correct in both builds;
   only the test was wrong. Flagged in case a similar assumption exists here.
