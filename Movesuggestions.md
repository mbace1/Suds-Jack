# Toko Move — Toko Design Suggestions

This is Toko's working design notebook for **Toko Move**. It is deliberately separate from confirmed project facts: ideas below are proposals to test, not implementation claims.

## Current design facts

- Real **central Helsinki** is the active map focus.
- Geographic fidelity matters: do not turn Helsinki into an approximate fictional city.
- **A-to-B delivery** is the defined challenge format.
- Helsinki tram routes should follow the **real-world network**, not approximate lines.
- Each tram line should be an **independent toggleable layer**.
- The city and route choice should create the challenge; avoid detached minigames that could happen anywhere.

---

# 10 design-logic conversation cycles

## Cycle 1 — What is the game actually about?

**Prompt:** What is the strongest version of Toko Move?

**Toko:** A game about learning to move through a real city. Delivery is the excuse. Helsinki is the system. If the optimal route, landmark recognition and transit structure do not matter, we have only put a Helsinki skin on a generic delivery game.

**Follow-up:** Then what should we protect first?

**Toko:** Geographic truth. We can simplify rendering, traffic and simulation, but we should be extremely reluctant to simplify the relationships between actual streets, destinations and tram routes.

**Note:** Strong thesis. Evaluate every feature by asking whether it increases the player's understanding/use of Helsinki.

---

## Cycle 2 — First playable slice

**Prompt:** What should we build before expanding the map?

**Toko:** One dense central-Helsinki slice with enough intersections, landmarks and tram structure to create several genuinely different route choices. It should support multiple deliveries without moving geography around to manufacture variety.

**Follow-up:** What proves the slice works?

**Toko:** A player can complete a second delivery more intelligently because of something they learned during the first. That is more interesting than merely finishing faster because they learned the controls.

**Note:** Progress can partly exist in the player's head rather than only in stats/upgrades.

---

## Cycle 3 — Delivery challenge anatomy

**Prompt:** A-to-B alone could become repetitive. How do we deepen it?

**Toko:** Keep A-to-B as the grammar, then alter the route problem. A fragile delivery may punish rough shortcuts. A time-sensitive delivery may favor a tram-assisted route. A bulky object may make certain paths awkward. The important part is that the modifier changes how the player reads the same real streets.

**Follow-up:** What should we avoid?

**Toko:** Arbitrary challenge rules that ignore the map. If a modifier could be pasted into any driving game unchanged, it is probably weak Toko Move material.

**Note:** Challenge modifiers should interact with route geometry, transport or movement rather than just add meters/timers.

---

## Cycle 4 — Trams as gameplay

**Prompt:** Why insist on exact tram lines and separate layers?

**Toko:** Because the data structure can become the game structure. A challenge can reveal one relevant line, teach an interchange, create a moving obstacle/opportunity or ask the player to reason about a corridor. Separate layers also make debugging and visual filtering honest: the player-facing representation and the route source of truth can agree.

**Follow-up:** Give me a concrete test.

**Toko:** Activate one real tram line and choose a delivery whose direct street route crosses or follows it. Run the challenge with the line hidden, then visible. If seeing the real line changes route planning without a tutorial paragraph, it is doing useful work.

**Note:** Tram information should change decisions, not merely decorate the map.

---

## Cycle 5 — Navigation UI

**Prompt:** How much navigation help should we give?

**Toko:** Enough to prevent confusion, not enough to erase geography. Start and destination can be explicit. The active challenge can highlight relevant information. But a permanent perfect GPS ribbon risks converting Helsinki into scenery behind an arrow.

**Follow-up:** So no GPS?

**Toko:** Test graduated assistance instead of making that ideological. Full route guidance could exist as accessibility or onboarding. The default design should at least test whether landmarks, street structure and transit can carry more navigation than a conventional waypoint line.

**Note:** Prototype multiple navigation-assistance levels. Measure whether players learn the city.

---

## Cycle 6 — Visual identity

**Prompt:** What should the game look like?

**Toko:** The map geometry should have authority. Simplify surface detail enough that streets, intersections, destinations and active transit remain readable. Then spend visual character on Helsinki-specific landmarks, street furniture, transit identity, weather and movement rather than generic city clutter.

**Follow-up:** How do we judge that?

**Toko:** Hide all labels and challenge UI and take a screenshot. Does the scene still read as Helsinki? Then hide the decorative detail. Can the route still be understood? We need both answers to be yes.

**Note:** Two simultaneous visual goals: unmistakably Helsinki + immediately navigable.

---

## Cycle 7 — Progression

**Prompt:** What does progression look like without corrupting the city-learning idea?

**Toko:** Expand what the player can understand and attempt before simply increasing numbers. Early deliveries teach a compact area. Later work crosses familiar routes in unfamiliar ways, introduces additional tram relationships and eventually asks the player to combine knowledge across districts.

**Follow-up:** Can there still be upgrades?

**Toko:** Yes, but upgrades should create movement choices rather than invalidate geography. An upgrade that lets you ignore streets is suspicious. An upgrade that gives you a new way to exploit a known route could be excellent.

**Note:** Prefer capability expansion and route mastery over raw speed/stat escalation.

---

## Cycle 8 — Failure and retry

**Prompt:** What should failure feel like?

**Toko:** Informative and quick. A failed delivery should make the player think, “I know a better route now,” not “I need to repeat three minutes before I can try the interesting decision again.”

**Follow-up:** What information should failure expose?

**Toko:** Route time, where time was lost and perhaps the path actually taken. Be careful with showing an omniscient optimal route immediately; that can replace discovery with correction.

**Note:** Fast retry. Post-run information should help reflection without solving the city for the player.

---

## Cycle 9 — Living city versus simulation bloat

**Prompt:** How alive should Helsinki be?

**Toko:** Alive enough that movement has texture: trams, crossings, pedestrians, weather, traffic rhythms and recognizable local motion. But I would not build a giant city simulation merely because the map is real. Every simulation layer has to justify what it contributes to route choice, timing, atmosphere or surprise.

**Follow-up:** What's the danger?

**Toko:** Spending months simulating things the player experiences as background noise while the delivery loop remains shallow.

**Note:** Add city simulation in gameplay-value order, not realism-value order.

---

## Cycle 10 — A vertical-slice challenge set

**Prompt:** Give me a small set of challenges that could test the whole thesis.

**Toko:** I would make five deliveries on the same accurate slice:

1. **Orientation** — simple A-to-B, generous time, teaches landmarks.
2. **Route choice** — two credible paths with different movement demands.
3. **Tram relationship** — one real tram line materially changes the route decision.
4. **Constraint** — cargo or timing makes the previously obvious route undesirable.
5. **Mastery** — crosses familiar streets in a new direction and asks the player to combine what the previous four taught.

Do not add a larger map until those five are fun enough that we want more combinations rather than more square kilometres.

**Note:** This is the strongest immediate prototype plan from the ten cycles.

---

# Findings after 10 cycles

The clearest emerging design pillars are:

1. **Helsinki is a mechanic, not a skin.**
2. **Player knowledge is progression.**
3. **A-to-B is the grammar; route constraints create variety.**
4. **Real tram data must influence play.**
5. **Visual simplification is welcome; geographic falsification is not.**
6. **Navigation assistance should support learning rather than replace it.**
7. **Fast retries should turn failure into route knowledge.**
8. **Simulation earns its place through movement, decisions or atmosphere.**

## Toko's recommended next design experiment

Build or isolate one geographically accurate central-Helsinki slice and author the five-challenge sequence from Cycle 10. Keep every real tram line represented independently in the underlying map data, but reveal only what each challenge needs. Test whether repeated play produces **city knowledge** as a measurable form of mastery.

## Visual review slot

When verified Toko Move screenshots, captures or map assets are available in the repository, attach them to future entries here and run the same design logic against the actual frame: route readability, Helsinki identity, landmark recognition, transit visibility, challenge focus and UI obstruction.
