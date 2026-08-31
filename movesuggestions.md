# Toko Move — design suggestions

This file is Toko / Claude Code's open design notebook.

Put speculative ideas here: gameplay mechanics, map/readability thoughts, visual/UI ideas, progression concepts, experiments, questions, and alternatives.

Do **not** treat anything here as implemented or approved by default.

Use `moveupdates.md` for factual current state, implementation details, active PR/branch information, known technical debt, and what is actually working.

## Current design thesis
Toko Move is a courier game played on Helsinki's existing moving transit network. The player reads the city and makes timing decisions rather than drawing transport lines.

Core question:
**Wait for tram, transfer, or walk?**

## Toko notes
Add design ideas below this line. Promote an idea into `moveupdates.md` only when it becomes an explicit decision or is actually implemented.

---

# Design logic loops — 2026-09-01

These are speculative design arguments, not implementation claims. Each loop deliberately challenges the previous answer instead of simply accumulating features.

## Loop 1 — What is the second-to-second game?

**Proposal:** The game should feel like reading a moving board. The player watches trams approach, sees a delivery destination, and makes a small sequence of timing choices: wait, board, transfer, get off early, or walk.

**Challenge:** If the optimal route is obvious from a route suggestion, the player is only executing instructions.

**Revision:** Route guidance should expose *possibilities*, not a solved answer. Show useful nearby services, estimated direction and delivery pressure, but let the player choose. The interesting information is not merely shortest path; it is whether a tram is actually close enough to catch, whether waiting is worth it, and whether walking creates a better interception.

**Challenge:** Watching vehicles approach can become passive downtime.

**Revision:** Waiting should itself contain decisions. While stationary, the player can inspect alternate jobs, rotate the map, commit to an interception point, abandon a route, or start walking toward the next stop. A good player should almost always be planning the next 10–30 seconds.

**Working hypothesis:** Toko Move is strongest when it behaves more like a real-time tactics game than a transit planner. The board is fixed; opportunity is moving.

**Prototype test:** Give a player one delivery with two plausible tram services and one walking shortcut. Remove any single highlighted “correct route.” If the player can explain why they made a timing decision, the loop is working.

## Loop 2 — What makes a delivery interesting?

**Proposal:** Delivery jobs should differ through destination, time pressure and cargo walking restrictions.

**Challenge:** That produces variety, but not necessarily personality. Jobs can collapse into colored timers.

**Revision:** Each job should alter the meaning of the same city network. Examples:
- hot food rewards continuous movement and short waits;
- fragile cargo favors smoother/direct transit and discourages frantic walking;
- documents tolerate walking and encourage clever interception;
- bulky equipment restricts modes and makes transfer hubs strategically important;
- express jobs pay for speed but punish unnecessary transfers;
- low-pressure jobs can reward combining two deliveries efficiently.

**Challenge:** Too many cargo modifiers make the game feel like spreadsheet rules.

**Revision:** Every job should communicate one dominant constraint visually and verbally. The player should understand the job in one glance: “hot,” “fragile,” “heavy,” “urgent,” or “flexible.” Deep combinations can come later.

**Working hypothesis:** The job is not a quest marker. It is a temporary ruleset layered over Helsinki.

## Loop 3 — Multiple jobs and emergent routing

**Proposal:** Multiple simultaneous jobs are probably the feature that turns the prototype into a game.

**Challenge:** More jobs can simply create UI clutter and force route optimization math.

**Revision:** Limit the active hand. Start with two jobs, later three. The interesting question becomes: “Do I take the tram that advances both jobs, or finish one quickly?” This naturally creates route chaining without drawing lines.

**Challenge:** Players may hoard jobs and ignore risk.

**Revision:** Job offers should expire, but active jobs should usually fail softly. Late delivery reduces quality/pay rather than instantly destroying the run. The game should reward improvisation more than perfect memorization.

**Working hypothesis:** Two simultaneous destinations are enough to create meaningful city-scale tactics.

**Prototype test:** Compare one-job and two-job sessions of equal length. If two jobs create more route changes and transfers without increasing confusion dramatically, keep the system.

## Loop 4 — Walking: fallback or real mechanic?

**Proposal:** Walking should be a strategic bridge between transit nodes, not a universal escape button.

**Challenge:** If walking is too strong, trams become decoration. If too weak, the player waits passively.

**Revision:** Walking should win in short-distance interception and lose over long distance. Its strongest use is not “walk all the way there,” but “walk to the next stop and catch a better vehicle.”

**Challenge:** A simple node-to-node walking animation may feel detached from the real map.

**Revision:** Visually show the courier moving continuously along an abstract street path while the transit network keeps moving. The player should be able to watch a tram they are trying to intercept. This makes walking a race against the network.

**Working hypothesis:** The most satisfying walking moment is catching a tram one stop later because the player predicted the timing correctly.

## Loop 5 — What should the map look like?

**Proposal:** Keep Helsinki geographically credible, but visually simplify everything that is not useful to the immediate decision.

**Challenge:** Exact HSL geometry plus coastline, streets, stops, vehicles, jobs and labels can become visually noisy.

**Revision:** Use a hierarchy:
1. moving vehicles and the player are highest contrast;
2. active delivery destinations and relevant transfer stops are next;
3. tram/metro lines remain clearly identifiable but visually quieter;
4. walking streets are thin/subdued until relevant;
5. coastline, parks and city texture establish Helsinki but should not compete with gameplay.

**Challenge:** That can become a sterile transit diagram and lose the sense of place.

**Revision:** Add restrained Helsinki character outside the decision layer: recognizable water shapes, blocks, parks, major landmarks, stop typography, subtle district names, weather/light, and tiny ambient movement. Avoid photoreal map clutter.

**Working hypothesis:** The visual target sits between a beautiful transit diagram and a living miniature Helsinki, not Google Maps.

## Loop 6 — Vehicle readability

**Proposal:** Every visible gameplay tram should be a meaningful moving object, not just decoration.

**Challenge:** Showing many exact vehicles creates visual overload and makes it hard to see which one is boardable.

**Revision:** Keep all vehicles visible, but give contextual emphasis only to useful ones. A tram approaching the player's current/interceptable stop can brighten slightly, show its line number more clearly, or gain a small arrival pulse. The selected ride gets a distinct persistent highlight.

**Challenge:** Strong highlighting could reveal the optimal move automatically.

**Revision:** Highlight *availability*, not recommendation. Several catchable vehicles can be emphasized at once. The player still decides which opportunity matters.

**Working hypothesis:** The game should say “you can catch these,” never “catch this one.”

## Loop 7 — Camera and interaction

**Proposal:** The map should support rapid zoom between city overview and local interception play.

**Challenge:** Constant zooming can make the player lose orientation.

**Revision:** Use three meaningful scales rather than free-for-all camera behavior:
- city: jobs and broad network flow;
- route: current corridor, transfer choices and approaching vehicles;
- stop: immediate catch/walk/get-off decision.

The camera can remain freely controllable, but UI and label density should snap gently between these information scales.

**Working hypothesis:** The player should be able to answer both “where am I going?” and “can I catch that tram?” without opening separate screens.

## Loop 8 — Failure, scoring and tension

**Proposal:** Score deliveries by speed.

**Challenge:** Pure speed turns every job into the same optimization problem and punishes exploration.

**Revision:** Score three readable dimensions: delivery quality, efficiency and improvisation. Quality reflects cargo/time requirements. Efficiency reflects unnecessary waiting/transfers/walking. Improvisation rewards useful catches, smart transfers or salvaging a bad route.

**Challenge:** “Improvisation score” risks opaque judgment.

**Revision:** Do not expose a mysterious formula. Award explicit small moments: “tight connection,” “intercepted,” “two jobs advanced,” “late recovery,” etc. These can feed a broader run grade without pretending to measure creativity directly.

**Working hypothesis:** A mistake should create a new routing problem, not simply a restart prompt.

## Loop 9 — Progression without breaking Helsinki

**Proposal:** Progression should unlock districts, cargo types and harder job combinations rather than faster fictional transport.

**Challenge:** Unlocking the map can make early Helsinki feel artificially closed.

**Revision:** Keep the city visible from the beginning. Progression unlocks *work*, not geography: new clients, longer delivery chains, special cargo, night shifts, rush-hour contracts and multi-job capacity.

**Challenge:** Stat upgrades could undermine the fixed-network premise.

**Revision:** Favor capability and information upgrades over speed buffs. Examples: carry one more job, better arrival prediction, a larger job-offer radius, temporary weather gear, or access to special contracts. Avoid “tram +20% speed” or impossible movement advantages.

**Working hypothesis:** The city stays honest; the courier becomes more capable at reading it.

## Loop 10 — Helsinki as a character

**Proposal:** Time, weather and district identity can make repeated traversal interesting without altering network truth.

**Challenge:** Cosmetic weather can be pretty but irrelevant.

**Revision:** Let atmosphere subtly affect decisions without becoming simulation-heavy. Rain can make long walking less attractive; snow can change visual rhythm and perhaps walking time slightly; night reduces visual clutter and emphasizes vehicles/stops; rush hour increases opportunity *and* complexity.

**Challenge:** This risks fictionalizing real transit behavior.

**Revision:** Separate authored game modifiers from factual HSL representation. Exact network geometry stays exact. Any gameplay timing/weather effect is clearly part of the game simulation, not presented as live HSL data.

**Working hypothesis:** Helsinki should change the texture of play while the network remains legible and trustworthy.

## Loop 11 — Audio

**Proposal:** Audio can carry information currently competing for visual attention.

**Challenge:** Constant alerts become irritating quickly.

**Revision:** Use restrained spatial/semantic cues: approaching tram bell/rail tone, stop arrival tick, boarding confirmation, delivery urgency pulse and subtle transfer success sound. Give districts/weather ambient identity, but keep the soundscape sparse.

**Working hypothesis:** The player should sometimes notice an opportunity by sound before consciously reading it on the map.

## Loop 12 — UI philosophy

**Proposal:** The HUD should expose the current decision, not every system state.

**Challenge:** Transit games often accumulate route panels, timers, vehicle cards and legend clutter.

**Revision:** At any moment, the primary UI should answer only:
- What am I carrying?
- Where does it need to go?
- What can I catch here/nearby?
- What happens if I wait or walk?
- What vehicle am I currently riding?

Everything else can be contextual, collapsible or map-native.

**Working hypothesis:** If the map can communicate something, do not duplicate it permanently in a panel.

# Current strongest design directions from the loops

1. Treat the game as **real-time tactics on a fixed moving network**, not route planning.
2. Make **interception** the signature skill: walking or waiting to catch a useful moving vehicle.
3. Add **two simultaneous jobs** early; this may create more depth than adding more route mechanics.
4. Highlight **available opportunities**, not a recommended optimal route.
5. Preserve real Helsinki geometry while using a strong visual hierarchy to avoid map noise.
6. Let progression unlock **work complexity and information**, not fictional transit performance.
7. Make mistakes recoverable; a missed tram should create a new tactical problem.
8. Use weather, time, district identity and audio to make Helsinki feel alive without pretending authored simulation is live HSL truth.

# Next logic loops worth running

- Delivery economy: payment, reputation, clients, job selection and run structure.
- Exact visual language: line weight, vehicle shape, stop markers, labels, buildings, water, parks and night mode.
- Interception math: how walking speed, stop spacing and vehicle timing create catchable decisions.
- Session structure: 5-minute challenge vs 20-minute shift vs campaign day.
- Difficulty: how to increase pressure without simply shrinking timers.
- Mobile controls and portrait/landscape information layout.
- Helsinki-specific authored challenges using real tram corridors and transfer locations.
