# BETTERMENT — Game Design Document

**Status:** source of truth for game/product design  
**Project folder:** `kindling/`  
**Date:** 2026-08-17  

This document defines the Betterment game direction. Read `BETTERMENT_GDD_AMENDMENT_KINDLING.md` with it; that amendment is newer and supersedes conflicting missed-day rules below.

---

# 1. High concept

**Betterment is a mobile-first gamified self-care and habit-tracking game where real-life care actions tend a bonfire, strengthen a small monster companion, and unlock expeditions into a dark fantasy world.**

The app should be useful when the player is tired, stressed or low-energy, but still feel like an actual game rather than a wellness checklist with decorative points.

The emotional loop is:

**do something real → mark it complete → the bonfire grows → the companion reacts → the world opens → play a short game segment → return with memories, relics, creatures or lineage possibilities.**

---

# 2. Player fantasy

The player is the keeper of a small fire in a ruined forest kingdom.

A strange little creature lives near the fire. Real-life actions create **Flames** and **Bond XP**. Flames let the companion venture beyond the bonfire. Journeys uncover ruined places, objects, creatures and encounters. Later, companions can fight, develop traits and create new lineages.

The fantasy should feel closer to **keeping a bonfire alive in a forgotten world** than maintaining a cheerful productivity dashboard.

---

# 3. Design pillars

## 3.1 Care first

The game must never shame the player or call them a failure. Consequences belong to the dark-fantasy fiction, not moral judgement.

## 3.2 Five is enough

**Five care points tends the bonfire for the day.**

The player may have more than five active goals. Completing extra goals gives extra game rewards, but adding a new habit must not make the definition of a successful day harder.

## 3.3 More is optional, not mandatory

Some goals can reveal an optional next tier after completion.

Example:
- `10 push-ups` → complete
- optional follow-up: `Feeling good? Reach 20 total` → bonus Bond XP

The player sees the achievable win first. The larger challenge appears only after success.

## 3.4 The monster is the emotional anchor

The companion should react, grow, explore, fight and eventually create lineages. Numbers support that relationship; they are not the relationship.

## 3.5 Game systems must become visible

Progress should change the bonfire, creature, ruins, relic collection, encounters and descendants — not only fill abstract bars.

## 3.6 Mobile first

Everything important must be understandable and tappable with one hand on a phone.

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
   - bonfire grows if daily fire is not yet tended;
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

**care → bond → stronger identity → deeper journeys → encounters → relics/creatures → lineage → succession → more world discovery**

---

# 5. Daily goal system

## 5.1 Daily fire target

The bonfire has **five care segments**.

The first five qualifying care completions of the day fill those segments. The fire is then **Tended**.

The player can continue completing goals after 5/5. Extra completion does not turn the day into a moving denominator such as 6/8 or 7/10.

## 5.2 Goal reward model

Initial balance target:

### First completion of a normal goal
- +1 Care Point, until daily bonfire reaches 5/5
- +20 Flames
- +20 Bond XP

### Completion after bonfire is already 5/5
- +20 Flames
- +20 Bond XP
- no additional Care Point required or displayed

## 5.3 Goal archetypes

### A. Single-check goals
Examples: Brush teeth, Shower, Step outside, Make the bed, Message someone, Take scheduled medication.

These normally do **not** generate repeat-for-more-reward prompts.

### B. Progressive goals
Completion can reveal a larger optional tier.

Examples: push-ups, walking, reading, stretching, tidying, creative practice.

Example:

**Tier I** — `Do 10 push-ups` → normal care reward.  
**Tier II — optional** — `Feeling good? Reach 20 total` → +20 Flames, +40 Bond XP.

Default maximum: 2–3 tiers.

### C. Count goals
Examples: glasses of water, movement breaks, pages read.

Each configured milestone can be checked once.

### D. Duration goals
Examples: Read for 10 minutes, Walk for 15 minutes, Breathe for 1 minute.

Timer is optional; manual completion remains possible.

### E. Scheduled goals
Examples: weekday routine, evening hygiene, M/W/F exercise.

Scheduling affects when a card appears.

## 5.4 Safety rule

The app must not assume that more is always healthier.

- medication has no repeat bonus tier;
- hygiene does not become endurance play;
- exercise tiers are finite and conservative/user-defined;
- no infinite physical-repetition XP farm;
- default max 2–3 tiers;
- copy may say `Go further`, never `You should do more`.

---

# 6. Goal categories

- **Body** — movement, food, water, sleep routine, outside time.
- **Hygiene** — teeth, shower, clothes, grooming, home cleanliness.
- **Mind** — breathing, reading, reflection, meditation, creative practice.
- **Connection** — message, call, spend time with someone, ask for help.
- **Daily care** — medication reminders, appointments, tidying, practical routines.

Categories are for scanning/recommendation, not separate mandatory quotas.

---

# 7. Progression and economy

## Fire / Care Points
- daily baseline, 0–5;
- care-day rolls at 04:00;
- visually changes bonfire/world lighting.

## Flames
Spendable game currency earned from care goals and optional tiers.

Used for journeys, special ruins, relic interactions and potentially lineage rituals.

## Bond XP / Companion Level
Permanent relationship progression earned through care actions.

Unlocks visual stages, reactions, journey options, combat skills, lineage eligibility and cosmetics.

## Relics / Found objects
Discovery progression carrying story and visual identity.

## Lineage
Long-term creature collection, inheritance and succession.

---

# 8. Companion system

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

Direct interactions such as greeting or petting are expressive and free.

**Important:** companion survival now follows the separate two-day Kindling rule in `BETTERMENT_GDD_AMENDMENT_KINDLING.md`.

---

# 9. Journeys and world exploration

Journeys bridge the habit tracker to the game world.

Basic journey:
- costs Flames;
- continues when app is closed;
- ends in a short report;
- may return with object, encounter, relic clue or creature event.

Suggested regions:
1. **The Birch Ruins** — forest edge, collapsed walls, moss.
2. **The Drowned Courtyard** — flooded stones, old wells, amphibian creatures.
3. **The Bell Keep** — castle remains, hanging cloth, tougher enemies.
4. **Ashwood** — burned forest, strange eggs and lineage discoveries.
5. **The Old Gate** — guardian encounters and rare relics.

Not an open world: illustrated destinations and short game events.

---

# 10. Combat gameplay

Recommended first format: **short turn-based micro-combat for one-handed mobile play**, target 20–60 seconds.

Primary actions:
- **Strike** — reliable damage;
- **Guard** — reduce/negate next hit and restore a little stamina;
- **Skill** — companion-specific move;
- later **Relic** action.

Combat uses a temporary encounter resource such as Stamina/Sparks, reset each encounter.

Losing combat means retreat to the bonfire. Combat defeat does not erase self-care progress, Bond XP or collected items.

Combat rewards can include relic fragments, cosmetic materials, routes, eggs/sparks, lore scraps and charms.

Enemy examples: moss knight, bell crawler, paper crow swarm, root hound, hollow lantern, rusted guardian.

Optional bosses: 2–4 minutes, readable phases, retryable, no daily deadline.

---

# 11. Breeding and lineage

Lineage unlocks after the player has at least two mature companions.

Additional companions can come from rare journey eggs, combat discoveries and world milestones.

Breeding flow:
1. Choose two mature companions.
2. Preview broad inherited tendencies.
3. Spend a Flame/relic cost on a Bonding/Nest event.
4. Create an egg or ember-seed.
5. Future care fills hatch progress.
6. Hatch a new companion.
7. Parents remain in lineage history.

Inheritance can include:
- horn shape;
- ears;
- body silhouette;
- eye colour;
- ember/fire accents;
- markings;
- tail;
- craft-material motif;
- temperament;
- combat tendency;
- rare mutation.

No objectively perfect genome. Styles and tradeoffs matter more than strict power tiers.

The Companion screen eventually gains a family tree showing living companions, descendants and Kindled ancestors.

---

# 12. Reflection and mental-health features

Core reflective features:
- mood check-in;
- short journal/history;
- breathing;
- optional goal notes;
- supportive return copy.

Betterment does not diagnose, prescribe or promise mental-health outcomes.

---

# 13. Mobile information architecture

## Today
1. Flames + Bond/Level HUD
2. Large companion / bonfire scene
3. Today’s Fire progress 0–5
4. Large goal cards
5. Optional progressive follow-ups
6. Journey CTA when relevant

## Journey
Destination/current outing, return timer, discoveries, combat entry.

## Inventory
Found objects, relics, later equipment/materials.

## Reflect
Mood, breathing, journal/history.

## Companion
Current creature, growth, Bond, equipment, later roster and lineage/breeding.

## Settings / Goal management
Active goals, preset library, custom goals, schedule, progressive tiers, appearance, accessibility, privacy.

Combat and breeding live inside Journey and Companion rather than adding permanent nav tabs.

---

# 14. Example day

Player checks a medication goal: fire 1/5.

They complete Drink water and Brush teeth: 3/5.

They do 10 push-ups. The card completes and reveals optional `Reach 20 total · +40 Bond XP`.

They ignore it initially. Nothing is lost.

After a walk and a meal, the bonfire reaches 5/5 and becomes **FIRE TENDED**.

Later they finish the extra push-ups for bonus Flames/Bond without changing the daily denominator.

They send their companion to the Birch Ruins. It returns with a Moss Knight encounter. They play a short battle and win a relic fragment.

---

# 15. Consequence philosophy

Betterment has real game stakes, but not moral judgement.

The game must not:
- call the player a failure;
- remove completed real-life care because of combat defeat;
- make medication/hygiene infinitely repeatable for rewards;
- increase the daily Fire target because the player adds goals;
- monetize avoidance of the Kindling consequence.

The separate Kindling amendment defines the current missed-day consequence.

---

# 16. Implementation phases

## Phase A — Daily product loop
Mobile Today, five-segment Fire, large goals, goal management, categories, Flames, Bond, dark mode, core navigation.

## Phase B — Progressive goals
Goal archetype data, Tier II/III follow-ups, bonus XP, scheduling/recurrence, safe repeatability.

## Phase C — World / journey upgrade
Regions, richer outcomes, relics, encounter events, layered 2D dark-fantasy scene integration.

## Phase D — Combat prototype
One enemy + one companion kit: Strike, Guard, Skill, temporary stamina, victory reward, retreat on defeat.

## Phase E — Companion roster / lineage / succession
Additional companion acquisition, trait data, roster, breeding prototype, hatch progress, inherited traits, lineage tree, Kindled ancestor state.

## Phase F — Content scale
More goals, regions, enemies, relics, companion traits, mutations and journal memories.

---

# 17. Art-guide handoff

The Betterment art guide must define:
- layered 2D bonfire / forest / ruin construction;
- crafty + retro pixel hybrid rules;
- readable mobile composition behind UI;
- companion base body + inherited trait zones;
- growth silhouettes;
- combat poses/enemy readability;
- breeding trait modularity;
- living vs Kindled lineage presentation;
- world region palettes/materials;
- UI icon grammar for goals, Flames, Bond, combat and lineage;
- dark mode as primary;
- clean large UI surfaces with restrained texture.

Approved baseline: **crafted layered 2D illustration first, retro game language second, modern mobile UX hierarchy throughout.**

---

# 18. Current decisions

1. Daily Fire target stays fixed at five care points.
2. Extra goals after 5/5 still reward Flames and Bond XP.
3. Some goals reveal finite optional progressive tiers.
4. Combat is optional and cannot undo completed self-care progress.
5. First combat prototype is short, turn-based and one-hand mobile friendly.
6. Breeding is a permanent lineage system.
7. Combat and breeding live under Journey / Companion.
8. Missed-day survival follows the **two-day Kindling rule** in the authoritative amendment.
9. Next major design artifact is the **Betterment Art Guide**.
