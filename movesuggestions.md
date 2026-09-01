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

# Extended logic loops

## Loop 13 — Delivery economy

**Proposal:** Pay should reward difficult jobs and efficient execution.

**Challenge:** Money can become a detached meta-score with no interesting use.

**Revision:** Keep money light. Use it primarily to unlock work access, cosmetic courier identity, optional tools, and riskier contracts—not stat inflation.

**Test:** Remove money from a prototype session. If nothing meaningful changes, the economy is not yet earning its place.

## Loop 14 — Reputation

**Proposal:** Clients should remember performance.

**Challenge:** A global reputation bar flattens every delivery into one number.

**Revision:** Use small client-specific trust tracks. A restaurant cares about hot-food reliability; an art handler cares about fragile cargo; an office client cares about punctuality.

**Working hypothesis:** Reputation should change the type of work offered, not merely increase payout.

## Loop 15 — Shift structure

**Proposal:** A session could be a 15–20 minute courier shift.

**Challenge:** Long sessions may dilute the elegant board-reading loop.

**Revision:** Build around a 5–8 minute challenge unit, then chain several into a shift. Each unit should have a clear beginning, pressure arc and finish.

**Test:** If a 5-minute slice is not satisfying, a 20-minute shift will not fix it.

## Loop 16 — Campaign day

**Proposal:** A day advances from morning to night.

**Challenge:** Time-of-day risks being decorative chronology.

**Revision:** Use day phases to alter job mix and network pressure: morning office runs, midday food, afternoon errands, evening events/nightlife.

**Working hypothesis:** Time should change what kinds of choices appear, not just the sky color.

## Loop 17 — Difficulty without shorter timers

**Proposal:** Hard mode could simply reduce delivery time.

**Challenge:** That produces stress, not richer decisions.

**Revision:** Increase ambiguity and overlap instead: more simultaneous viable services, tighter transfer windows, competing jobs, partial information, unusual cargo constraints.

**Test:** Harder play should require better reading, not only faster tapping.

## Loop 18 — Interception math

**Proposal:** Walking speed should be tuned so one-stop catches are possible but not guaranteed.

**Challenge:** Fixed walking speed can produce either trivial or impossible interceptions across different stop spacing.

**Revision:** Tune around *time margin*, not distance alone. A good interception should usually create a 2–8 second catch window when read correctly.

**Working hypothesis:** The signature skill needs visible, understandable near-misses.

## Loop 19 — Near-miss feedback

**Proposal:** Missing a tram should just leave the player behind.

**Challenge:** Without feedback, the player cannot learn timing.

**Revision:** Show a brief “missed by 3s” or visually preserve the departing vehicle so the cause is obvious.

**Test:** After a miss, can the player explain what they should have done differently?

## Loop 20 — Boarding interaction

**Proposal:** Boarding should require a button press at the correct moment.

**Challenge:** Precision timing can turn strategic play into dexterity noise.

**Revision:** Use a generous boarding window once the player and vehicle overlap at a valid stop. The skill is reaching the opportunity, not frame-perfect input.

## Loop 21 — Transfer decisions

**Proposal:** Transfers should be explicit GET OFF → WAIT → CATCH steps.

**Challenge:** Too much confirmation can feel bureaucratic.

**Revision:** Keep the state explicit but make interaction lightweight. One clear contextual action is enough; the deeper choice is *whether* to transfer.

**Working hypothesis:** Manual transfer matters because it preserves agency and makes the moving board legible.

## Loop 22 — Staying aboard

**Proposal:** The player should be able to remain aboard past a suggested stop.

**Challenge:** This could create accidental mistakes.

**Revision:** Allow it. Missing a stop is a meaningful routing event. Warn, but do not auto-correct.

**Test:** A wrong stay-aboard choice should create a recoverable new plan, not soft-lock the run.

## Loop 23 — Destination readability

**Proposal:** Delivery targets can be map pins.

**Challenge:** Generic pins erase Helsinki identity.

**Revision:** Tie targets to actual recognizable blocks, stops or local landmarks where possible, with restrained icons only for gameplay state.

**Working hypothesis:** The player should gradually remember places by city structure, not icon color.

## Loop 24 — District identity

**Proposal:** Districts need distinct visual personalities.

**Challenge:** Over-stylization can falsify geography or create theme-park zones.

**Revision:** Differentiate through real urban texture: water edge, block scale, park density, station character, street rhythm, lighting and ambient detail.

## Loop 25 — Buildings

**Proposal:** Render every building footprint.

**Challenge:** This adds clutter and performance cost without guaranteed gameplay value.

**Revision:** Use block masses and selected landmark silhouettes. Increase detail only where it supports orientation.

**Test:** If removing a building does not hurt navigation or identity, it probably does not need bespoke treatment.

## Loop 26 — Water and coastline

**Proposal:** Water is background decoration.

**Challenge:** In Helsinki, water is a major orientation cue.

**Revision:** Treat coastline and major water shapes as navigational structure. Keep them visually calm but unmistakable.

**Working hypothesis:** A player should often orient by “toward the water” without opening a legend.

## Loop 27 — Parks

**Proposal:** Parks can be flat green polygons.

**Challenge:** They may disappear into transit-line color noise.

**Revision:** Use texture, tree rhythm and negative space rather than saturated green. Parks should act as landmarks without competing with routes.

## Loop 28 — Stop markers

**Proposal:** Show every stop at all zoom levels.

**Challenge:** Dense central Helsinki becomes a field of dots.

**Revision:** Aggregate at city scale, reveal line-relevant stops at route scale, show precise boarding points at stop scale.

**Working hypothesis:** Stop information should be scale-dependent.

## Loop 29 — Line labels

**Proposal:** Permanent line numbers on every visible vehicle and route.

**Challenge:** Repetition creates visual noise.

**Revision:** Keep route color/shape persistent; reveal numbers on vehicles, hover/focus, nearby opportunities and transfer nodes.

## Loop 30 — Exact visual language

**Proposal:** Use conventional transit-map styling.

**Challenge:** That risks looking like an HSL utility rather than a game.

**Revision:** Preserve line truth but introduce authored game character through depth, animation, lighting, tactile vehicle motion, courier presence and environmental layers.

**Target:** “Playable Helsinki transit model,” not “interactive route map.”

## Loop 31 — Player avatar

**Proposal:** The courier can be a simple dot.

**Challenge:** A dot makes the game emotionally abstract.

**Revision:** Use a tiny but readable courier character or marker with direction and motion. It should feel alive without overpowering the map.

**Test:** Walking should feel like *someone* crossing Helsinki, not a cursor moving between nodes.

## Loop 32 — Vehicle personality

**Proposal:** Trams are identical except route color.

**Challenge:** Repeated play may feel sterile.

**Revision:** Preserve route identity first, then add subtle motion/shape variation and sound personality where factual reference supports it.

## Loop 33 — Weather visibility

**Proposal:** Rain and snow can cover the screen.

**Challenge:** Atmospheric effects can destroy route readability.

**Revision:** Weather belongs mostly in background motion, reflection and ambience. The gameplay layer must remain clear.

## Loop 34 — Night mode

**Proposal:** Night simply darkens the map.

**Challenge:** That reduces legibility.

**Revision:** Invert hierarchy: environmental surfaces darken, transit lines and vehicles gain controlled luminosity, destinations remain readable, water/parks stay distinct.

**Working hypothesis:** Night could actually improve the tactical readability of moving vehicles.

## Loop 35 — Mobile portrait

**Proposal:** Portrait mode should show the whole city.

**Challenge:** The tactical layer becomes too small.

**Revision:** Default to route-scale framing in portrait, with a quick city overview gesture/button. Bottom interaction zone shows current catch/walk/get-off decision.

## Loop 36 — Mobile landscape

**Proposal:** Landscape simply expands the map.

**Challenge:** Extra width may become wasted dead space.

**Revision:** Use the side area for lightweight job cards and upcoming vehicle information while preserving a large uncluttered map.

## Loop 37 — One-thumb play

**Proposal:** Make all actions reachable with one thumb.

**Challenge:** Map pan/zoom and tactical input can conflict.

**Revision:** Separate map gestures from contextual action buttons. The player should never miss a tram because a pan gesture was mistaken for input.

## Loop 38 — Pause philosophy

**Proposal:** The board should never pause because the network is the challenge.

**Challenge:** Mobile interruptions are unavoidable.

**Revision:** Allow hard pause outside competitive modes. The design should not punish real-world interruption.

## Loop 39 — Route preview

**Proposal:** Preview full future paths of all useful vehicles.

**Challenge:** Too much foresight removes uncertainty.

**Revision:** Show route identity and near-term direction clearly, but avoid solving future timing beyond what the player can reasonably infer.

## Loop 40 — Arrival prediction

**Proposal:** Exact countdowns should be standard.

**Challenge:** Perfect countdowns turn timing into arithmetic.

**Revision:** Early game can use broad “approaching / soon / later” states; more precise ETA can become an information upgrade or accessibility option.

## Loop 41 — Accessibility

**Proposal:** Preserve challenge by keeping information sparse for everyone.

**Challenge:** This can make the game unnecessarily difficult for color-vision, motor or cognitive needs.

**Revision:** Add line patterns, strong labels, scalable UI, reduced motion, longer boarding windows, optional solved route hints and pause-friendly timing.

**Principle:** Accessibility can expose more information without changing the underlying city truth.

## Loop 42 — Tutorial

**Proposal:** Explain wait/catch/ride/get off/walk in text.

**Challenge:** The system is spatial and temporal; text may not teach it well.

**Revision:** Tutorial should be five tiny authored situations: catch a tram, intentionally wait, get off, walk one stop, make one transfer.

**Test:** No tutorial step should exceed one sentence.

## Loop 43 — First challenge

**Proposal:** Start with an open job board.

**Challenge:** Too many choices before the player understands movement.

**Revision:** First delivery should be almost impossible to fail, direct, and visually obvious. The second introduces waiting. The third introduces walking/interception.

## Loop 44 — Mastery challenge

**Proposal:** Late-game challenge means longer routes.

**Challenge:** Distance alone is not mastery.

**Revision:** Mastery means reading overlapping opportunities under pressure: two jobs, one transfer, one possible interception, and no highlighted correct path.

## Loop 45 — Helsinki-specific authored challenge

**Proposal:** Build challenges from abstract route topology.

**Challenge:** That wastes the real city.

**Revision:** Author around actual central-Helsinki situations: corridors where tram lines overlap, places where walking between nearby stops beats waiting, and transfer points where several services create meaningful ambiguity.

**Rule:** Never move real lines to improve a challenge; choose better real locations instead.

## Loop 46 — Event traffic

**Proposal:** Special events can modify the network.

**Challenge:** Fictional disruptions may be confused with real HSL information.

**Revision:** Clearly frame them as authored scenario conditions: “festival shift,” “snow evening,” “road works scenario.” Keep factual map geometry separate from game-state modifiers.

## Loop 47 — Dynamic jobs

**Proposal:** Generate jobs anywhere randomly.

**Challenge:** Pure randomness can produce dead routes or trivial deliveries.

**Revision:** Procedural jobs should be constrained by meaningful network relationships: direct ride, transfer opportunity, walking shortcut, multi-job overlap, or deliberate tension.

## Loop 48 — Job selection

**Proposal:** Give the player every available job.

**Challenge:** Choice overload and optimization paralysis.

**Revision:** Offer a small rotating set of 3–5 jobs. Each should telegraph its dominant routing problem.

## Loop 49 — Risk/reward

**Proposal:** Hard jobs simply pay more.

**Challenge:** Players may always choose highest value.

**Revision:** Pair payout with client trust, cargo constraint and route uncertainty. A lower-value job might strategically overlap another active delivery.

## Loop 50 — Soft failure

**Proposal:** Late delivery fails instantly.

**Challenge:** This discourages experimentation and recovery.

**Revision:** Grade lateness unless the job fiction truly demands a hard deadline. The interesting question becomes how much quality can be salvaged.

## Loop 51 — Hard failure

**Proposal:** Never fail a job.

**Challenge:** Some contracts need genuine stakes.

**Revision:** Reserve hard failure for clearly marked special jobs—medical urgency, timed handoff, event access—so the rule feels intentional.

## Loop 52 — Combo systems

**Proposal:** Add delivery streak multipliers.

**Challenge:** Generic combo mechanics can distort route choice.

**Revision:** If a combo exists, tie it to meaningful network play: consecutive on-time handoffs, multi-job advancement, clean transfers, smart interceptions.

## Loop 53 — Map memory

**Proposal:** Always show district and street labels.

**Challenge:** The player may never learn visual geography.

**Revision:** Labels can fade as mastery grows or be toggled. Familiarity should reduce dependence on UI naturally.

## Loop 54 — Discovery

**Proposal:** Reward visiting every location.

**Challenge:** Checklist exploration can distract from courier play.

**Revision:** Discovery should happen through jobs. New clients and unusual contracts pull players into overlooked parts of the network.

## Loop 55 — Collectibles

**Proposal:** Add hidden collectibles around the city.

**Challenge:** They encourage leaving the transit decision loop for unrelated scavenging.

**Revision:** If used, make them transit-native: stamps, route-history cards, stop posters, or courier mementos encountered through movement rather than hidden off-map hunts.

## Loop 56 — Narrative

**Proposal:** Build a conventional character story around the courier.

**Challenge:** Heavy narrative can interrupt the moving-board rhythm.

**Revision:** Tell story through clients, recurring delivery chains, district routines and small messages before/after jobs.

**Working hypothesis:** Helsinki and its people can provide narrative texture without long cutscenes.

## Loop 57 — Client personalities

**Proposal:** Clients are functional job generators.

**Challenge:** Repetition becomes mechanical.

**Revision:** A few recurring clients should develop recognizable needs and schedules. Their job patterns can teach different parts of the network.

## Loop 58 — Humor

**Proposal:** Keep tone purely functional and modern.

**Challenge:** The game risks feeling like a transit app.

**Revision:** Use dry courier/client humor, absurd but plausible parcels, and situational comments. Avoid jokes that undermine Helsinki authenticity.

## Loop 59 — Soundscape depth

**Proposal:** Use ambient city loops.

**Challenge:** Static loops detach from movement.

**Revision:** Layer ambience by proximity and state: tram rail noise, station hum, crossings, harbor wind, rain, crowd density, interior ride sound.

## Loop 60 — Music

**Proposal:** Continuous soundtrack.

**Challenge:** It may flatten the city soundscape.

**Revision:** Favor sparse adaptive music that grows during high-pressure chains and recedes during navigation. Let Helsinki sound carry calmer moments.

## Loop 61 — Haptics

**Proposal:** Vibrate on every interaction.

**Challenge:** Noise.

**Revision:** Reserve haptics for tactically meaningful beats: vehicle entering catch window, boarding, transfer completion, delivery handoff.

## Loop 62 — Camera motion

**Proposal:** Auto-follow the player at all times.

**Challenge:** The player needs to look ahead.

**Revision:** Follow softly, but allow predictive framing toward nearby useful vehicles or the next decision area without snapping away from player control.

## Loop 63 — Information during ride

**Proposal:** Riding is passive downtime.

**Challenge:** That breaks the real-time tactics identity.

**Revision:** While aboard, the player should plan: inspect next stops, job overlap, transfer timing, alternative disembark points, future walking intercepts.

**Working hypothesis:** The ride is planning time, not a loading screen.

## Loop 64 — Early disembark

**Proposal:** Get off only at the suggested target stop.

**Challenge:** This removes improvisation.

**Revision:** Let the player get off at any valid stop. Getting off early should sometimes be the best move for an interception or second job.

## Loop 65 — Wrong vehicle recovery

**Proposal:** Boarding the wrong tram is a fail state.

**Challenge:** Harsh and uninteresting.

**Revision:** Preserve it as a recoverable error. The player can get off, transfer, or exploit the accidental route for another job.

## Loop 66 — Real-time vs turn-like readability

**Proposal:** Everything moves continuously.

**Challenge:** New players may feel overwhelmed.

**Revision:** Use clear state changes and generous decision windows so the game *reads* almost turn-by-turn even though the network keeps moving.

## Loop 67 — Strategic pause mode

**Proposal:** Add a tactical pause where the player can inspect the map.

**Challenge:** It may remove timing pressure.

**Revision:** Make it an accessibility/learning option, not the default scoring mode.

## Loop 68 — Daily challenges

**Proposal:** Daily challenge on a fixed seed.

**Challenge:** Pure score competition may favor memorization.

**Revision:** Daily should combine a shared job set and shared network simulation seed, allowing meaningful route comparisons.

## Loop 69 — Ghost routes

**Proposal:** Show top-player paths live.

**Challenge:** This reveals solutions.

**Revision:** Show ghost routes only after completion, as post-run learning and comparison.

## Loop 70 — Post-run map

**Proposal:** End with a score screen.

**Challenge:** It wastes the spatial story of the run.

**Revision:** Replay the route quickly on the map: waits, rides, walks, missed catches, successful interceptions and deliveries.

**Working hypothesis:** The route itself is the best summary of performance.

## Loop 71 — Player expression

**Proposal:** Optimization leaves little room for personal style.

**Challenge:** If one route is always mathematically best, replayability drops.

**Revision:** Jobs, timing and multiple objectives should create several defensible plans. Reward successful reasoning rather than one canonical solution.

## Loop 72 — Realism boundary

**Proposal:** Simulate real transit as faithfully as possible.

**Challenge:** Accuracy can overpower game feel.

**Revision:** Be exact about *what is presented as factual*—geometry, line identity, place—but allow authored gameplay timing, cargo rules, job generation and scenario pressure when clearly framed as simulation.

## Loop 73 — Live data

**Proposal:** Use live HSL vehicle positions as the core game.

**Challenge:** Live data is unpredictable, can vanish, and creates inconsistent challenge quality.

**Revision:** Keep deterministic gameplay vehicles as the reliable game layer. Live HSL can become an optional ambient/reference mode later, clearly labeled.

## Loop 74 — Offline resilience

**Proposal:** The game depends on network data every session.

**Challenge:** This weakens reliability and portability.

**Revision:** Cache factual geometry and use deterministic local simulation for core play. Refresh data separately.

## Loop 75 — Performance budget

**Proposal:** Render every line, vehicle, building and effect at full detail.

**Challenge:** Mobile performance and readability both suffer.

**Revision:** Budget detail by tactical importance. Gameplay vehicles and route state get priority over ambient architecture.

## Loop 76 — Visual animation budget

**Proposal:** Add lots of animated city details.

**Challenge:** Motion competes with moving trams, which are the actual game signal.

**Revision:** Ambient motion should be slower, smaller and lower contrast than transit/player motion.

## Loop 77 — Color discipline

**Proposal:** Use many bright colors to make the city lively.

**Challenge:** HSL route colors already carry information.

**Revision:** Keep environment mostly restrained; reserve saturation for route identity, player state, jobs and critical events.

## Loop 78 — UI animation

**Proposal:** Animate every panel change.

**Challenge:** Constant UI movement distracts from the moving network.

**Revision:** Use quick, low-amplitude transitions. The city should remain the dominant animated object.

## Loop 79 — Route opacity

**Proposal:** All route lines equal visual weight.

**Challenge:** Dense overlap becomes unreadable.

**Revision:** Contextually fade irrelevant lines slightly while never hiding factual existence. Active opportunities become clearer without turning the map into a false subset.

## Loop 80 — Transfer hub emphasis

**Proposal:** Big hubs should always be visually dominant.

**Challenge:** They can overshadow smaller but tactically important stops.

**Revision:** Base prominence on structural importance, then add temporary contextual emphasis when a smaller stop matters to current jobs.

## Loop 81 — Tutorializing through jobs

**Proposal:** Separate tutorial mode.

**Challenge:** Players may skip it and then struggle.

**Revision:** First campaign jobs *are* the tutorial, each introducing exactly one new decision type.

## Loop 82 — Difficulty ramp

**Proposal:** Unlock complexity linearly.

**Challenge:** Some players grasp transit immediately; others need repetition.

**Revision:** Use optional challenge branches. Core campaign introduces systems slowly, while side contracts test advanced mastery early.

## Loop 83 — Scoring transparency

**Proposal:** Use a deep hidden performance formula.

**Challenge:** Players cannot improve intentionally.

**Revision:** Show a few concrete reasons for grade changes: late, unnecessary transfer, clean intercept, two jobs advanced, fragile cargo preserved.

## Loop 84 — No-score mode

**Proposal:** Every run should be ranked.

**Challenge:** Some players may want city exploration and low-pressure delivery.

**Revision:** Add relaxed/free-shift mode with no score pressure while preserving network play.

## Loop 85 — Competitive mode

**Proposal:** Real-time multiplayer race.

**Challenge:** Huge complexity and may distort the core game.

**Revision:** Start asynchronous: same scenario seed, compare completed route, time, job quality and decisions afterward.

## Loop 86 — Challenge authoring tool

**Proposal:** Hard-code all scenarios.

**Challenge:** Real Helsinki offers too much combinatorial space.

**Revision:** Build an internal challenge authoring format: start hub, destinations, cargo, time window, allowed modes, scenario modifiers, seed.

**Working hypothesis:** Better tools may create more content value than more mechanics.

## Loop 87 — Data validation as design protection

**Proposal:** Designers can manually tweak route geometry for better play.

**Challenge:** This violates the project's strongest trust rule.

**Revision:** Never alter factual geometry silently. If a game abstraction is needed, encode it as a separate gameplay layer and label it internally.

## Loop 88 — Walking abstraction honesty

**Proposal:** Make walking links look like exact pedestrian routes.

**Challenge:** Current walking graph is simplified.

**Revision:** Visually distinguish abstract walking connections from factual transit geometry. Do not imply map accuracy the data does not possess.

## Loop 89 — City learning as progression metric

**Proposal:** Measure only delivery performance.

**Challenge:** The game's unique promise includes learning Helsinki.

**Revision:** Track optional mastery signals: fewer map pans, fewer route hints, successful self-chosen transfers, repeated landmark-based navigation.

**Caution:** Do not make these punitive or intrusive; use them for adaptive hints and celebratory summaries.

## Loop 90 — Final thesis stress test

**Question:** If we removed the Helsinki map and replaced it with a fictional network, would the game still be essentially the same?

**Answer:** Mechanically, partly yes—and that is a warning. The strongest version must make actual Helsinki geography, route overlap, coastline, districts, transfer relationships and recognizable transit identity materially shape play.

**Revision:** Every major design addition should pass two tests:
1. Does it deepen **wait / catch / ride / transfer / walk**?
2. Does it make **real Helsinki** more meaningful rather than less?

If the answer to both is no, it probably belongs in another game.

# Current strongest design directions from all loops

1. Treat Toko Move as **real-time tactics on a fixed moving Helsinki network**.
2. Make **interception** the signature skill and tune for readable near-misses.
3. Introduce **two simultaneous jobs** early; this likely creates more depth than extra subsystems.
4. Keep the city visible and honest; progression unlocks **work complexity, information and client relationships**, not fictional transit buffs.
5. Use factual geometry as a protected source layer and clearly separate authored game simulation.
6. Make riding active planning time, walking an interception tool, and mistakes recoverable routing problems.
7. Build visual hierarchy around moving vehicles, player, jobs and relevant stops; ambient city motion must remain subordinate.
8. Use real Helsinki structure for challenge authoring instead of bending the map to fit scenarios.
9. Prefer short 5–8 minute challenge units that can chain into longer shifts.
10. Keep UI contextual and map-native; expose opportunities without recommending a single correct route.
11. Make post-run route playback a core learning tool.
12. Treat city learning itself as part of mastery.

# Highest-value prototype experiments now

1. **Two-job test:** one accurate central-Helsinki slice, two simultaneous deliveries, no solved route highlight.
2. **Interception test:** tune walking and vehicle speed until one-stop catches regularly create 2–8 second decision windows.
3. **Transfer test:** compare explicit manual transfers against auto-transfer and measure whether manual choice creates better understanding.
4. **Visual hierarchy test:** show full factual network, then contextually fade irrelevant layers without hiding them.
5. **Ride-planning test:** give the player meaningful next-step decisions while already aboard.
6. **Post-run replay test:** visualize actual waits/rides/walks/misses and see whether players immediately identify a better route.
7. **Helsinki identity test:** remove labels and ask whether players still recognize the location and can orient themselves.
8. **Five-minute test:** prove one compact scenario is satisfying before extending shift length or campaign systems.
