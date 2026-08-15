# Betterment game — feature, graphics and UX direction

**Project:** Betterment game  
**Current implementation folder:** `kindling/`  
**Base:** `claude/betterment-game-x8qfaj`  
**Purpose:** make the existing care-companion loop deeper, more expressive and more delightful without turning it into a productivity scoreboard.

This document is the design anchor for the Betterment instance. It builds on the existing v2 game rather than replacing it.

---

## 1. What is already special

The current loop is strong because the reward is visible rather than numeric:

**do one small real thing → it becomes kindling → the fire grows → more of the room becomes visible → the creature has a warmer place to live → spare kindling can send it out into the world.**

The app already has:

- six editable daily care items;
- a five-step check-in;
- a four-round breathing exercise;
- a fire whose light directly represents the day's care;
- a creature with five lifetime growth stages;
- 90-second real-time errands that continue while the app is closed;
- a shelf of found objects;
- a journal;
- local-only persistence;
- offline/PWA support;
- keyboard and touch-friendly controls.

These are the spine. Betterment should make them feel richer, not bury them under more systems.

---

## 2. Non-negotiable design rules

1. **Never punish absence.** No withering creature, dead fire, lost collection, guilt copy, missed-day penalties or comeback debt.
2. **No optimisation pressure.** No XP grind, premium currency, daily quests, rankings, perfect-day score or efficiency bonuses.
3. **The room is the reward.** New progression should mostly become visible in the room, creature and outside world rather than a menu full of numbers.
4. **Screen time earns nothing.** Real actions and deliberate interactions drive change; leaving the app open does not.
5. **Nothing personal leaves the browser.** Keep check-ins, tasks and journal data local unless the owner explicitly changes this rule.
6. **Quiet beats are allowed.** Every tap does not need confetti. The fire, creature and room should carry most feedback.
7. **The app is not therapy.** It can be kind without diagnosing, prescribing or claiming health outcomes.
8. **Touch first, keyboard/controller honest.** All primary actions remain real DOM controls with 44 px targets and clear focus states.

---

# 3. Feature direction

## F1 — The room grows with you

The strongest expansion is not another meter. It is **persistent room evolution**.

At broad lifetime-care thresholds, introduce one small environmental change at a time:

- a rug patch appears near the hearth;
- a cushion or stool arrives;
- a second shelf is repaired;
- a plant pot appears and later contains a hardy plant;
- a string of paper stars or found-object charms hangs near the window;
- a blanket appears in the creature's sleeping spot;
- the far wall gains pinned scraps from old errands.

These are permanent. A quiet day may not light all of them, but they are never taken away.

**Why:** the five creature stages currently carry almost all long-term visual progression. The room should remember the relationship too.

### Rule
Progression is **additive world history**, not upgrades. Nothing makes care actions more valuable or efficient.

---

## F2 — Creature personality without a need meter

Give the creature more ways to exist in the room without creating chores.

Candidate idle behaviours:

- move closer to the fire when the room is dim;
- inspect one found object;
- curl up on the rug;
- watch the window;
- stretch after returning from an errand;
- carry a stick to the woodpile and immediately forget why;
- look toward the user after a task is checked;
- react differently at each growth stage.

Add one optional direct interaction: **say hello / pet / nudge**. It produces an animation or tiny line and pays nothing.

**Hard rule:** the creature never becomes hungry, lonely, dirty, sad because the user was away, or otherwise turns affection into maintenance.

---

## F3 — Errands become little stories

Keep the brilliant current rule: errands are short, seeded at departure, continue with the app closed, and never fail.

Expand them through **story variety, not probability optimisation**:

- more locations;
- seasonal/local-time variants generated from the device clock only;
- rare two-part observations;
- object-specific return lines;
- small callbacks to previously found things;
- occasional "brought nothing, saw something" outings that still feel complete.

Later, test a low-stakes choice before departure:

- **nearby** — shorter ordinary walk;
- **wander** — same cost/time class, stranger text pool;

Neither should be mechanically better. The choice is tone, not strategy.

---

## F4 — Found objects gain memory

The shelf is already a good visual collection. Make each object a memory rather than a collectible checklist.

Allow the user to inspect a found object and see:

- its tiny enlarged pixel drawing;
- its name;
- the date it came home;
- the errand lines attached to that return.

Do **not** show `7/12 found`, rarity percentages or an empty silhouette grid. Discovery should remain discovery.

This also solves the current shelf limit elegantly: the room can show the most recent/favourite objects while the journal remembers all of them.

---

## F5 — The fire has more character at the same value

Keep warmth as the exact representation of today's care, but make each band visually distinct:

- **coals:** low red pulse, creature dozing close;
- **small flame:** first warm edge on hearth and floor;
- **steady:** smoke settles, room begins to read;
- **warm:** window/shelves become legible;
- **full:** the far wall and door resolve, with a gentle room-wide settle.

No extra numerical reward is attached. This makes `0 → 1 → 2 → 3 → 4 → 5` feel like five different room states instead of one interpolated brightness slider.

---

## F6 — Tiny daily variation

The room should not be visually identical every day before the user acts.

Use deterministic, local-only ambient variation such as:

- different night-sky/star arrangement;
- rain marks, snow edge, mist, clear night **as fictional ambience**, not claimed real weather;
- a different object slightly shifted on the shelf;
- a moth at the window;
- branch shadows;
- morning/evening window palette from the local clock.

Variation must never affect rewards, task value or availability.

---

## F7 — Gentle return moments

Opening the game after time away should feel like returning to a room, not reopening a habit tracker.

Candidate first-frame behaviours:

- creature wakes or looks up;
- coals breathe once;
- if an errand completed while away, its lantern is already back and the creature immediately performs the return animation;
- a one-line greeting references only factual game state: `The coals kept.` / `It is home.` / `The room is quiet.`

Avoid `Welcome back!`, missed-day counts, streak-loss language and comeback rewards.

---

# 4. Graphics direction

## G1 — Keep the 192×128 pixel room

The low-resolution room is the identity. Do not replace it with a generic illustrated dashboard.

Improve it by adding **more authored silhouettes and state changes inside the same strict picture**.

The visual hierarchy should remain:

1. fire;
2. creature;
3. floor/light pool;
4. persistent room history;
5. window/far wall discoveries.

---

## G2 — Stronger depth in one room

Without camera movement, create depth through pixel-art staging:

- large dark foreground edge at one corner;
- warm midground hearth/creature;
- shelves and wall in the middle distance;
- cold window as the furthest plane;
- hard occlusion and cast shadows rather than gradients everywhere.

The room should increasingly feel like a place rather than a diagram as warmth rises.

---

## G3 — Creature stages need silhouette changes

The five growth stages should be readable at a glance even in a dim room.

Each stage needs one dominant silhouette change, for example:

- spark — tiny ember body;
- wisp — longer flame/tail;
- tender — clear feet/ears/arms;
- keeper — broader body plus carried-object gesture;
- elder — unmistakable mantle/horns/branching flame shape.

Do not communicate growth mainly through scale. Shape is more memorable than `+20% size`.

---

## G4 — Found-object art gets a second scale

Current shelf objects are necessarily tiny. Create a shared 32×32-ish inspection treatment for each object using the same palette and pixel rules.

That gives the art somewhere to breathe without making the shelf itself huge.

---

## G5 — Ambient animation budget

The room should always have 2–4 quiet motions, not 12 simultaneous ones.

Priority order:

1. flame;
2. creature breath/pose;
3. one environmental motion (smoke, rain, curtain, plant, window light);
4. occasional spark or object reaction.

When a task is checked, briefly let the room become more active, then return to calm.

---

## G6 — UI should borrow from the room

The current page chrome is functional but visually separate from the room.

Betterment should carry a few room motifs into the controls:

- ember caret/marker for primary actions;
- thin wood/ash separators instead of generic bordered panels;
- task check state that feels like a hand-mark rather than a web checkbox;
- journal dates styled like little paper labels;
- errand state represented by the same lantern/door motif used in the room.

Keep DOM text crisp and accessible; do not pixelate the interface itself.

---

# 5. UX direction

## U1 — Make the first minute self-explanatory

Do not front-load a tutorial.

On first visit, reveal the loop by consequence:

1. one simple prompt: **"What did you manage today?"**
2. user checks one item;
3. fire visibly grows and creature reacts;
4. line explains once: **"The fire takes the small things you kept."**
5. the rest of the sheet becomes obviously available.

The privacy/local-storage note can follow after the first satisfying action rather than precede it.

---

## U2 — Today is one screen, not a control panel

Primary screen order should be:

1. room;
2. one spoken line;
3. check-in + today's small things;
4. one compact action row: **Breathe · Send out / Away · Journal**;
5. low-priority status.

Custom-task editing should be secondary. The everyday experience should not look like task-list configuration.

---

## U3 — Status numbers should retreat

The physical room already carries the important information.

Keep numeric/status text for accessibility and precision, but visually de-emphasise:

- current kindling;
- streak;
- lifetime care count;
- next creature stage.

Avoid adding progress bars. Where possible, pair state with the actual room object: fuel ↔ woodpile, errand ↔ door/lantern, finds ↔ shelf.

Consider renaming prominent **streak** presentation to a less pressuring phrase or hiding it under Journal/History. The underlying consecutive-day fact can remain without becoming the app's main motivational device.

---

## U4 — Errand state must be instantly legible

There are three states and each should look different without reading a paragraph:

- **home / not enough kindling**;
- **home / ready to go**;
- **away / time remaining**.

Use button copy plus the room itself. When away, the empty creature spot and window lantern should carry as much information as the countdown.

On return, put the report above all secondary controls until it has been seen once.

---

## U5 — Journal becomes the quiet archive

The Journal should own everything retrospective:

- daily check-in;
- number of small things kept;
- breathing rounds;
- errand stories;
- found objects;
- growth moments.

The Today page should therefore stay light.

Add simple date grouping and optional object inspection, not analytics charts.

---

## U6 — Accessibility remains structural

Preserve and expand:

- real DOM buttons and inputs;
- 44 px touch targets;
- keyboard focus that follows view changes only for keyboard users;
- reduced-motion mode or `prefers-reduced-motion` handling for creature hops, sparks and larger room reactions;
- sound off by default;
- no information represented by colour alone;
- room state described in accessible text/status even though the visual scene carries it.

---

# 6. First implementation sequence

## Slice 1 — Room life

Highest value / lowest conceptual risk.

- add 3–5 creature idle behaviours;
- add one harmless direct creature interaction;
- add one local-time window variation;
- add more differentiated fire states;
- keep all economy/state values exactly the same.

**Success:** leaving the app open for ten seconds feels like watching a small place live, without screen time paying anything.

## Slice 2 — Return + errand presentation

- stronger departure animation;
- away-state room read;
- stronger homecoming beat;
- expanded report text pool;
- returned object inspection view.

**Success:** sending the creature away and later reopening the app becomes the strongest little story in the game.

## Slice 3 — Persistent room history

- introduce the first room-evolution milestones;
- tie them to broad lifetime-care thresholds;
- journal records the changes;
- no new currencies or upgrade menu.

**Success:** a screenshot after several weeks visibly belongs to a different history than a first-day screenshot.

## Slice 4 — UX cleanup

- simplify Today layout;
- move custom-list editing behind a secondary affordance;
- reduce visible status/number prominence;
- improve first-session reveal;
- keep accessibility gates intact.

**Success:** a new user understands the loop from one interaction and an existing user can complete a check-in in seconds.

## Slice 5 — Visual polish

- stronger creature stage silhouettes;
- more room depth/occlusion;
- object inspection art;
- refined room-derived UI motifs;
- restrained ambient animation pass.

**Success:** the game reads first as a tiny inhabited pixel room and only second as a web app.

---

# 7. Idea bank — explore later

These are not commitments:

- favourite shelf objects the user can pin visually;
- a tiny scrapbook page made from errand finds;
- recurring non-player visitor at the window, with no interaction obligation;
- multiple room arrangements that are cosmetic, unlocked by history rather than purchased;
- optional 30-second "sit by the fire" mode with no reward;
- local seasonal palettes;
- creature nicknaming stored locally;
- a soft export/import of local save data for moving devices;
- an optional daily note written by the user, local only;
- additional breathing patterns only if presented as pacing choices rather than medical claims.

---

# 8. Definition of Betterment

A feature belongs if it strengthens at least one of these without weakening the others:

- **I did something small and the room noticed.**
- **This place remembers that I have been here before.**
- **The creature feels alive without needing me.**
- **Coming back feels good even after being away.**
- **I can understand the app without being managed by it.**
- **The picture is doing more of the communication than the counters.**

Prefer a richer room, better reaction or clearer interaction over another system.