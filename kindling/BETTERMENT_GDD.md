# BETTERMENT — Game Design Document

**Status:** source of truth for game/product design  
**Project folder:** `kindling/`  
**Implementation PR:** #267  
**Date:** 2026-08-17  

This document supersedes older Betterment design notes where they conflict. The separate art guide should be written from this document after the game direction is approved.

---

# 1. High concept

**Betterment is a mobile-first gamified self-care and habit-tracking game where real-life care actions tend a bonfire, strengthen a small monster companion, and unlock expeditions into a dark fantasy world.**

The app should be useful when the player is tired, stressed or low-energy, but still feel like an actual game rather than a wellness checklist with decorative points.

The emotional loop is:

**do something real → mark it complete → the bonfire grows → the companion reacts → the world opens → play a short game segment → return with memories, relics, creatures or lineage possibilities.**

The wellness layer and game layer support each other, but neither should invalidate the other.

---

# 2. Player fantasy

The player is the keeper of a small fire in a ruined forest kingdom.

A strange little creature lives near the fire. It is not a helpless pet that dies when ignored. It is a companion that grows because the player has cared for themselves over time.

Real-life actions create **Flames** and **Bond XP**. Flames let the companion venture beyond the bonfire. Journeys uncover ruined places, objects, creatures and encounters. Later, companions can fight, develop traits and create new lineages.

The fantasy should feel closer to **keeping a bonfire alive in a forgotten world** than maintaining a cheerful productivity dashboard.

---

# 3. Design pillars

## 3.1 Care first, guilt never

Missing a day must never injure the companion, delete progress, extinguish permanent progress, create debt or scold the player.

The game may accurately say that a streak ended, but streak preservation is never the central emotional pressure.

## 3.2 Five is enough

A good day has an achievable baseline.

**Five care points tends the bonfire for the day.**

The player may have more than five active goals. Completing extra goals gives extra game rewards, but adding a new habit must not make the definition of a successful day harder.

## 3.3 More is optional, not mandatory

Some goals can reveal an optional next tier after completion.

Example:

- `10 push-ups` → complete
- new optional card: `Feeling good? Reach 20 total` → bonus Bond XP

The player first sees the achievable win. The larger challenge appears only after the first success.

## 3.4 The pet is the emotional anchor

The companion should react, grow, explore, fight and eventually create lineages. Numbers support that relationship; they are not the relationship.

## 3.5 Game systems must become visible

Progress should change the bonfire, creature, ruins, relic collection, encounters and descendants — not only fill abstract bars.

## 3.6 Mobile first

Everything important must be understandable and tappable with one hand on a phone.

Primary actions use large targets, direct language and strong state changes. Small retro graphics are allowed inside the art, not as tiny interaction targets.

---

# 4. Core loops

## 4.1 Minute-to-minute care loop

1. Open Today.
2. See companion + bonfire state.
3. See a small number of large goal cards.
4. Complete a real-life action.
5. Check the goal.
6. Receive immediate feedback:
   - check locks in;
   - Flames increase;
   - Bond XP increases;
   - bonfire grows if the daily fire is not yet tended;
   - companion reacts;
   - optional next tier may appear.
7. Choose another goal or leave.

A useful session can be under ten seconds.

## 4.2 Daily game loop

1. Complete care goals.
2. Reach **5/5 Fire Tended** if possible.
3. Spend Flames on a Journey when desired.
4. Companion explores while the app may be closed.
5. Return to a story, found object, relic, encounter or creature event.
6. Optional combat or lineage play happens as short game segments.
7. Journal quietly records the day.

## 4.3 Long-term loop

**care → bond → stronger identity → deeper journeys → encounters → relics/creatures → lineage → new companion possibilities → more world discovery**

Long-term progression is permanent and additive.

---

# 5. Daily goal system

## 5.1 Daily fire target

The bonfire has **five care segments**.

The first five qualifying care completions of the day fill those segments. The fire is then **Tended**.

The player can continue completing goals after 5/5.

Extra completion does **not** turn the day into 6/8, 7/10 or another moving denominator.

### Why

A player should be able to add habits without accidentally increasing the amount of work required to feel finished.

---

## 5.2 Goal reward model

Initial balance target:

### First completion of a normal goal
- +1 Care Point, until the daily bonfire reaches 5/5
- +20 Flames
- +20 Bond XP

### Completion after bonfire is already 5/5
- +20 Flames
- +20 Bond XP
- no additional Care Point required or displayed

The bonfire is a daily wellbeing baseline. Flames and Bond XP are the optional game progression beyond it.

---

## 5.3 Goal archetypes

### A. Single-check goals
One meaningful completion.

Examples:
- Brush teeth
- Shower
- Step outside
- Make the bed
- Message someone
- Take a scheduled medication

These should normally **not** generate a repeat-for-more-reward prompt.

### B. Progressive goals
Completion can reveal a larger optional tier.

Examples:
- push-ups
- walking
- reading
- stretching
- tidying
- creative practice

Example:

**Tier I**  
`Do 10 push-ups`  
Reward: normal care reward.

After completion:

**Tier II — optional**  
`Feeling good? Reach 20 total`  
Reward: +20 Flames, **+40 Bond XP**.

A possible Tier III can exist for user-configured goals, but the default product should avoid infinite escalation.

### C. Count goals
A goal with several safe repetitions through the day.

Examples:
- glasses of water
- short movement breaks
- pages read

Each configured milestone can be checked once. The user chooses the target structure rather than the app constantly increasing it.

### D. Duration goals
Examples:
- Read for 10 minutes
- Walk for 15 minutes
- Breathing for 1 minute

The app may provide a timer, but should also allow manual completion.

### E. Scheduled goals
Examples:
- weekday routine
- evening hygiene
- Monday / Wednesday / Friday exercise

Scheduling affects when a card appears, not punishment when it is missed.

---

## 5.4 Progressive-goal safety rule

The app must not assume that **more is always healthier**.

Therefore:

- medication does not get a bonus-repeat tier;
- hygiene goals do not become endurance challenges;
- exercise progressions use user-selected or deliberately conservative tiers;
- no infinite XP farming through physical repetition;
- default maximum is 2–3 tiers for a progressive goal;
- the app can say `Go further` but never `You should do more`.

Betterment rewards optional ambition without redefining baseline self-care as inadequate.

---

# 6. Goal categories

Goal categories primarily improve scanning and recommendations. They do not create separate mandatory quotas.

## Body
Movement, food, water, sleep routine, outside time.

## Hygiene
Teeth, shower, clothes, grooming, home cleanliness.

## Mind
Breathing, reading, reflection, meditation, creative practice.

## Connection
Message, call, spend time with someone, ask for help.

## Daily care
Medication reminders, appointments, tidying, practical routines.

The Today screen should not show every category header if that makes the screen busy. Category colour/icon language can be enough.

---

# 7. Progression and economy

Betterment has several progression layers with different emotional roles.

## 7.1 Fire / Care Points
**Daily baseline.**

- 0–5 segments
- resets each care-day at 04:00
- no penalty for not reaching 5
- visually changes the bonfire/world lighting

## 7.2 Flames
**Spendable game currency.**

Earned from care goals and optional tiers.

Used for:
- sending the companion on journeys;
- later: entering special ruins;
- later: crafting or activating relics;
- potentially lineage rituals.

Flames should remain easy to understand and visibly connected to the bonfire.

## 7.3 Bond XP / Companion Level
**Permanent relationship progression.**

Earned through care actions.

Bond unlocks:
- companion visual stages;
- new idle reactions;
- journey options;
- combat skills;
- lineage eligibility;
- cosmetic slots.

Missing days never removes Bond XP.

## 7.4 Relics / Found objects
**Discovery progression.**

Objects should carry stories and visual identity. Some later relics can affect combat style, but the collection should not become a mandatory completion checklist.

## 7.5 Lineage
**Long-term creature collection and variation.**

See section 11.

---

# 8. Companion system

The companion begins as a small strange bonfire creature and changes across permanent growth stages.

Core properties:

- Name
- Growth stage
- Bond level
- Visual traits
- Temperament
- Combat tendency
- Equipped relic / charm
- Journey history
- Lineage history

The companion has **no hunger, dirt, loneliness or decay meter caused by player absence**.

Direct interactions such as petting, greeting or poking the creature are free and primarily expressive.

---

# 9. Journeys and world exploration

Journeys are the bridge from habit tracker to game world.

## 9.1 Basic journey

- costs Flames;
- begins immediately;
- continues when app is closed;
- ends in a short report;
- cannot permanently fail;
- may return with an object, encounter, relic clue or creature event.

## 9.2 World structure

The world is a ruined dark-fantasy landscape around the bonfire.

Suggested regions:

1. **The Birch Ruins** — forest edge, collapsed walls, moss, first encounters.
2. **The Drowned Courtyard** — flooded stones, old wells, amphibian creatures.
3. **The Bell Keep** — vertical castle remains, hanging cloth, tougher enemies.
4. **Ashwood** — burned forest, strange eggs and lineage discoveries.
5. **The Old Gate** — late-game ruin, guardian encounters and rare relics.

This is not an open world. It is a sequence of illustrated destinations and short game events.

---

# 10. Combat gameplay

Combat should make Betterment feel meaningfully like a game without turning self-care into a punishment economy.

## 10.1 Recommended first combat format

**Short turn-based micro-combat designed for one-handed mobile play.**

Target encounter length: **20–60 seconds**.

Primary actions:

- **Strike** — reliable damage;
- **Guard** — reduce/negate the next hit and restore a small amount of stamina;
- **Skill** — companion-specific move with cooldown or charge;
- optional later: **Relic** — equipped item action.

The screen should be large, visual and extremely readable rather than a miniature RPG menu.

## 10.2 Combat resource

Use a small temporary encounter resource such as **Stamina / Sparks**.

It resets every encounter. It is not bought with real-life care points.

This keeps combat strategy inside combat instead of making the player afraid to spend wellness progress.

## 10.3 Failure rule

Losing combat means:

**the companion retreats to the bonfire.**

The player keeps:
- all care progress;
- all Bond XP;
- all previously collected items;
- the day’s Fire Tended state.

Possible consequence:
- no encounter reward;
- a different return line;
- immediate or cheap retry later.

No creature death. No broken self-care streak. No loss of real-life accomplishment.

## 10.4 Combat rewards

Combat can award:

- relic fragments;
- cosmetic craft materials;
- new journey routes;
- creature eggs / sparks;
- lore scraps;
- combat charms.

Combat should **not** be required to receive the daily self-care reward.

## 10.5 Enemy direction

Enemies should feel like odd inhabitants of the ruins rather than graphic violence.

Examples:
- moss knight;
- bell crawler;
- paper crow swarm;
- root hound;
- hollow lantern;
- rusted little guardian.

This lets the Dark Souls-inspired atmosphere coexist with a gentle companion game.

## 10.6 Boss / guardian encounters

Longer optional encounters can guard major regions.

Target:
- 2–4 minutes;
- several readable phases;
- retryable;
- no daily deadline.

They should feel significant because of animation, staging and discovery, not because the player loses days of progress.

---

# 11. Breeding and lineage gameplay

Breeding can become one of Betterment’s deepest game systems if it is framed as **creature lineage**, not pet maintenance.

## 11.1 Unlock condition

Lineage unlocks after the player has at least two mature companions.

Additional companions can initially come from:

- rare journey eggs;
- combat discoveries;
- major world milestones.

## 11.2 Breeding flow

1. Choose two mature companions.
2. Preview broad inherited tendencies, not an exact guaranteed result.
3. Spend a moderate Flame/relic cost to begin a **Bonding / Nest** event.
4. An egg or ember-seed is created.
5. Normal future care gradually fills its hatch progress.
6. Hatch a new companion.
7. Parents remain permanently available.

No parent is consumed, retired or weakened.

## 11.3 Inheritance

An offspring can inherit:

### Visual traits
- horn shape;
- ears;
- body silhouette;
- eye colour;
- ember/fire colour accents;
- markings;
- tail;
- craft-material motif.

### Temperament
Examples:
- curious;
- stubborn;
- cautious;
- bright;
- sleepy;
- bold.

Temperament changes animation, journey copy and small encounter tendencies.

### Combat tendency
Examples:
- Guard-heavy;
- quick striker;
- skill-focused;
- counterattacker.

These are **different styles, not strict quality tiers**.

### Rare mutation
Small chance of a visually distinctive trait or unusual ability interaction.

Rare does not have to mean stronger.

## 11.4 Lineage tree

The Companion screen eventually gains a **Lineage** view showing parents and descendants as a simple family tree.

This is a strong long-term retention system because it turns months of self-care into a personal history of creatures rather than just a numeric streak.

## 11.5 Breeding and optimisation pressure

Avoid a genetic min-max treadmill.

Rules:
- no objectively perfect genome;
- meaningful tradeoffs in combat tendencies;
- cosmetic traits remain valuable;
- no creature is deleted for being weak;
- no breeding timers that punish missed days;
- hatch progress waits safely when the player is away.

---

# 12. Reflection and mental-health features

Betterment remains a self-care companion, not a clinical treatment product.

Core reflective features:

- mood check-in;
- short journal/history;
- breathing exercise;
- optional goal notes;
- supportive return copy.

The app does not diagnose, prescribe or promise mental-health outcomes.

Reflection should be quieter than the game systems and never become a wall of analytics.

---

# 13. Mobile information architecture

## Today
Primary daily screen.

Order:
1. HUD: Flames + Bond/Level
2. Large companion / bonfire scene
3. Today’s Fire progress: 0–5
4. Large goal cards
5. Optional progressive-goal follow-up cards
6. Primary Journey CTA when relevant

## Journey
- destination / current outing;
- return timer;
- discoveries;
- combat entry when an encounter occurs.

## Inventory
- found objects;
- relics;
- later equipment / materials.

## Reflect
- mood;
- breathing;
- journal/history.

## Companion
- current creature;
- growth;
- Bond level;
- equipment;
- later roster;
- later lineage / breeding.

## Settings / Goal management
- active goals;
- preset library;
- custom goals;
- schedule;
- progressive tiers;
- appearance;
- accessibility;
- data/privacy.

Combat and breeding should live inside Journey and Companion rather than adding more permanent bottom-nav tabs.

---

# 14. Example day

The player opens Betterment in the morning.

The bonfire is at 1/5 because they already checked a morning medication goal.

They complete `Drink water` and `Brush teeth`. The fire reaches 3/5.

Later they do `10 push-ups`.

The card completes and a smaller optional card appears:

**GO FURTHER**  
`Reach 20 total`  
`+40 Bond XP`

They ignore it. Nothing is lost.

After a walk and a meal, the bonfire reaches 5/5 and changes to **FIRE TENDED**.

They later do the extra ten push-ups. This gives bonus Flames and Bond XP but does not change the definition of the day.

They now have enough Flames to send their companion to the Birch Ruins.

On return, the journey reveals a Moss Knight encounter. The player chooses to fight a 30-second battle, wins a relic fragment, and returns to Today.

The entire game session can be spread across several tiny phone visits.

---

# 15. Non-punitive rules

These are hard design constraints.

Betterment does not:

- kill or sicken the companion because the player was absent;
- remove Bond XP;
- remove collected creatures;
- delete relics for missing goals;
- create comeback debt;
- require a perfect day;
- increase the daily Fire target when the player adds goals;
- make medication or hygiene infinitely repeatable for XP;
- tell the player that they failed at self-care because they lost combat;
- use combat defeat to undo real-life progress.

---

# 16. MVP / implementation phases

## Phase A — Current priority: daily product loop

- mobile-first Today screen;
- five-segment Fire progress;
- large goal cards;
- goal management;
- categories;
- Flames;
- Bond level;
- dark mode;
- Journey / Inventory / Reflect / Companion navigation.

## Phase B — Progressive goals

- goal archetype data;
- Tier II / III follow-ups;
- bonus XP logic;
- scheduling / recurrence;
- safe repeatability rules;
- Today-card transition after completion.

## Phase C — World / journey upgrade

- region selection;
- richer outcomes;
- relics;
- encounter events;
- layered 2D dark-fantasy scene integration.

## Phase D — Combat prototype

Build one enemy and one companion kit.

Prototype:
- Strike;
- Guard;
- Skill;
- temporary stamina;
- victory reward;
- retreat on defeat.

Do not build a large combat content set until the 30–60 second encounter is genuinely enjoyable.

## Phase E — Companion roster and lineage

- additional companion acquisition;
- trait data;
- roster;
- two-parent breeding prototype;
- hatch progress;
- inherited visual traits;
- lineage tree.

## Phase F — Content scale

- more goals/templates;
- more regions;
- enemies/guardians;
- relics;
- companion traits;
- breeding mutations;
- expanded journal memories.

---

# 17. Art-guide handoff requirements

The future Betterment art guide should be built from these gameplay needs, not as a separate mood exercise.

It must define:

- layered 2D construction for bonfire / forest / ruin scenes;
- crafty + retro pixel hybrid rules;
- readable mobile composition behind UI;
- companion base body and inherited trait zones;
- five growth silhouettes;
- combat poses and enemy readability;
- breeding trait modularity;
- world-region palettes/materials;
- UI icon grammar for goal categories, Flames, Bond, combat and lineage;
- dark mode as primary presentation;
- clean large UI surfaces with restrained texture.

The approved visual baseline remains: **crafted layered 2D illustration first, retro game language second, modern mobile UX hierarchy throughout.**

---

# 18. Current product decisions

Locked for now:

1. **Daily Fire target stays fixed at five care points.**
2. Extra goals after 5/5 still reward Flames and Bond XP.
3. Some goals can reveal optional progressive tiers after completion.
4. Progressive tiers are finite and goal-type-aware.
5. Combat is optional game content and cannot undo self-care progress.
6. First combat prototype should be short, turn-based and one-hand mobile friendly.
7. Breeding is a permanent companion-lineage system; parents remain available.
8. Combat and breeding live under Journey / Companion rather than bloating the main navigation.
9. The next major design artifact after approval of this document is the **Betterment Art Guide**.
