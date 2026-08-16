# Betterment game — feature, graphics and UX direction

> **Important:** `BETTERMENT_OWNER_DIRECTION.md` is the newest authority. Where this document conflicts with it, follow the owner-direction file.

**Project:** Betterment game  
**Current implementation folder:** `kindling/`  
**Base:** `claude/betterment-game-x8qfaj`  
**Purpose:** make the existing care-companion loop deeper, more expressive and more delightful without turning it into a punitive productivity scoreboard.

The current implementation has already moved beyond the original v2 presentation: mobile-first large goals, explicit checks, visible Flames, a daily progress bar, companion Level/bond, functional top-level destinations and dark-mode-first presentation now live in PR #267. The remaining sections below are idea/reference material, not newer than `BETTERMENT_OWNER_DIRECTION.md`.

---

## 1. What is already special

The current loop is strong because the reward is visible rather than abstract:

**do one small real thing → it becomes kindling / Flames → the fire grows → the companion reacts and grows → spare reward can send it out into the world.**

The app already has:

- editable daily care goals;
- a five-step check-in;
- a four-round breathing exercise;
- a fire whose light represents today's care;
- a creature with lifetime growth stages;
- real-time errands that continue while the app is closed;
- found objects;
- a journal;
- local-only persistence;
- offline/PWA support;
- keyboard and touch-friendly controls.

These are the spine. Betterment should make them feel richer, not bury them under more systems.

---

## 2. Non-negotiable design rules

1. **Never punish absence.** No withering creature, dead fire, lost collection, guilt copy, missed-day penalties or comeback debt.
2. **No failure pressure.** Level/bond and Flames are allowed as positive progress, but nothing should be lost by missing a day.
3. **The world is the reward.** New progression should become visible in the companion, bonfire, journeys and environment rather than only in numbers.
4. **Screen time earns nothing.** Real actions and deliberate interactions drive change; leaving the app open does not.
5. **Nothing personal leaves the browser.** Keep check-ins, tasks and journal data local unless the owner explicitly changes this rule.
6. **Quiet beats are allowed.** Every tap does not need confetti. The fire, companion and scene should carry most feedback.
7. **The app is not therapy.** It can be kind without diagnosing, prescribing or claiming health outcomes.
8. **Touch first.** Primary actions remain large real DOM controls with clear focus states.

---

## 3. Current visual target

The old cozy-hut direction is superseded.

The approved target is:

- dark-fantasy bonfire;
- small friendly monster companion;
- forest and/or castle ruin;
- moonlit/cold environment against warm orange fire;
- layered **2D** crafty + retro pixel hybrid;
- clean, comparatively untextured large UI surfaces;
- strong foreground / midground / background planes;
- dark mode first.

Think: **crafted 2D illustration first + retro game language second + modern mobile information hierarchy.**

---

## 4. Current product direction

Use Finch and similar self-care apps as a category/feature benchmark without copying proprietary expression.

Priority areas:

- daily goals and habit checks;
- mood/check-in;
- breathing and calming actions;
- companion growth and reactions;
- gentle Level/bond progression;
- Flames reward language;
- journeys/outings;
- found objects and memories;
- reflections/history;
- supportive return flow;
- goal categories and presets;
- custom user goals.

The current implementation groups suggested goals into **Body, Hygiene, Mind, Connection and Daily care**.

---

## 5. Near-term implementation sequence

1. Finish the playable mobile-first Today flow.
2. Validate goal checking, progress, Flames, Level/bond and daily reset behavior in browser tests.
3. Deepen the goal model with recurrence/scheduling only after the daily-target rule is confirmed.
4. Improve Journey, Inventory, Reflections and Companion interaction depth.
5. Replace/extend the old room illustration with the approved layered 2D dark-fantasy craft/pixel scene.
6. Only after the UX is strong, explore alternative visual directions.

---

## 6. Open product decision

The current code preserves the original balanced-day target of **five completed goals** for the segmented progress bar, even if the user has more than five goals configured.

Before recurrence/scheduling is added, confirm whether Betterment should use:

- **fixed five-goal daily target**, or
- **all active goals as the daily denominator**.

Until confirmed, five remains the implementation default because it matches the existing fire balance and the approved concept screen.
