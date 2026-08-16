# EERI — current playable level analysis

**Audit date:** 2026-08-15  
**Base:** `main@0bf02fe5e15fa2991431385fac5524ffe1ef8d52`  
**Scope:** the three authored World 1 levels currently in `ROOMS`, plus the Gizmo Lab only where it affects what is actually available for testing.

This is a **source/deployment/experience-design audit**, not a claim of hands-on controller play. The geometry, state logic, authored beats, prompts, test contracts and deployed source can be inspected exactly; subjective feel still needs a human run or recording.

## Current availability

The campaign currently has three authored levels:

| address | source name | core idea | machine peak |
|---|---|---|---|
| `#eeri-1-1` | LEVEL 1 — GROUNDWORKS | stomp | excavator digs bank |
| `#eeri-1-2` | LEVEL 2 — THE SCAFFOLD | climb | excavator seats girder span |
| `#eeri-1-3` | LEVEL 3 — THE HIGH WALL | combine + crane | crane breaks wall |

The canonical QA links are therefore:

- `/eeri/#eeri-1-1`
- `/eeri/#eeri-1-2`
- `/eeri/#eeri-1-3`

The old folder-shaped form `/eeri-1-2/` is not the level-addressing system. `js/levelid.js` deliberately keeps one runtime and maps the hash to the flat `ROOMS` index.

`ROOMS` on `main` and `gh-pages` currently has the same blob SHA (`d9c898ffe3640147bf1c6a018b52727ec444eee7`), so this review is looking at the level definitions actually deployed, not a source-only future version.

The Gizmo Lab now contains belt, tarp, shallow/deep water and pipe work. Those are **available mechanics tests, not campaign levels**. World 2 levels 4–6 are not yet authored into `ROOMS`.

---

# What improved since the previous review

## 1. The P0 fall-respawn bug is fixed

This was the worst progression bug in the previous audit. Falling no longer hardcodes Eeri to `x=43`. `Player.update()` now asks:

```js
const r = this.level.fallRespawn(this.x);
```

That restores pit-side recovery and checkpoint recovery instead of allowing a fall to skip large parts of a level.

This materially improves Levels 1–3 and makes Level 2 trustworthy enough to use as the current benchmark for authored flow.

## 2. Stomp and hurt now have real animation reactions

The skinned Eeri rig now fires one-shot `stomp` and `hurt` clips at the moment the events happen. This is a good change because these are *moments*, not locomotion states; they should interrupt the run/jump state briefly and hand control back immediately.

## 3. The dirt bank now communicates its job in-world

The bank has been given paired dig chevrons and a construction-board treatment on the bank itself. This is the correct direction: **the obstacle explains the interaction, not a block of text next to the excavator**.

Keep pushing material readability — loose soil, clumps, bucket scrape, falling crumbs — so the chevrons become reinforcement rather than the only explanation.

## 4. Level addresses are finally stable

`js/levelid.js` gives each room a Mario-style address without introducing a second level data structure. That is good for QA and for sharing exact levels between agents.

---

# Overall experience read

The three-level World 1 arc now has a clear shape:

1. **1-1 teaches physical interaction** — jump onto things, then operate a machine.
2. **1-2 teaches vertical space** — climb, read decks, then use construction work to make a route.
3. **1-3 combines the vocabulary** — then gives the world its biggest machine/set-piece finish.

That is a strong spine.

The biggest remaining opportunity is **not more mechanics inside World 1**. It is making each existing idea read more strongly and removing ambiguity around the controls and peaks.

The best current reference level is **1-2**. New levels should copy its discipline more than its literal geometry.

---

# EERI 1-1 — GROUNDWORKS

## What works

The opening is correctly simple: run, collect, meet one hopper in open space. The bolt arc does instructional work without text.

The four-beat shape is legible:

- introduce hopper
- vary height/spacing
- combine hopper + pit
- excavator as the payoff

The checkpoint before the machine half is also correct. The bank is a visually understandable machine-sized lock: too high to jump, visibly removable, machine changes the route.

## P1 — the stomp promise and the stomp physics still disagree

The room source says:

> landing on it throws you higher than a jump ever does

But `kid.js` still sets:

```js
const BOUNCE_V = JUMP_V * 0.8;
```

So the signature verb of the first level launches Eeri **less** strongly than an ordinary jump.

This is the clearest remaining design/code contradiction in World 1.

### Recommendation

Choose one of two designs explicitly:

**Preferred:** stomp is an empowering rebound. Make its launch visibly exceed a normal jump and re-prove collectible/reach placement.

**Alternative:** stomp is only a chain/rhythm tool. If that is the intended rule, rewrite the level commentary and secrets so the game never promises extra height.

Right now the level promises option A while the physics implements option B.

## Experience risk — too much noise before the first machine payoff

Before the excavator, 1-1 already introduces or presents:

- hopper rhythm
- raised geometry
- swinging ball
- pit
- hidden golden in the pit
- steam
- robot

Those are not all new verbs, but for the *first* level they create a lot of competing visual events around the one thing the level is supposed to teach.

### Recommendation

Do not add anything else to 1-1. If a child playtest shows confusion, remove or defer one hazard before adding more explanation.

The first level should feel like **stomp → bigger stomp confidence → excavator reward**, not a sampler of the whole hazard kit.

## Experience risk — the golden bolt in the pit teaches deliberate failure

A golden bolt at the pit is an interesting secret because falling is cheap. It also asks a young player to infer that entering a dangerous-looking hole on purpose is desirable.

With `fallRespawn()` fixed this is mechanically safe again, but it remains a readability gamble.

### Recommendation

Keep it only if the golden bolt is visibly teased from above. If the player cannot see the reward before committing, move that secret to a side route/ledge rather than asking them to trust a pit.

## Machine pacing

The excavator is at `x=63`; the bank begins at `x=84`. That gives the first ride a longer approach to its job than 1-2.

This can work if the drive itself is joyful. If it currently reads as transit, use **1-2's six-tile machine-to-job distance as the benchmark**: either move the excavator closer or make the ride between 63 and 84 contain deliberate machine-scale reactions.

---

# EERI 1-2 — THE SCAFFOLD

## Current benchmark

This is the cleanest authored level of the three.

The learning order is excellent:

- one ladder and empty deck
- taller ladder + pit
- old enemies under/around the new vertical route
- checkpoint
- excavator immediately into the girder job
- far-side descent and finish

Nothing in the first ladder encounter competes with the ladder. That is exactly how the other levels should introduce new grammar.

## The machine payoff is especially strong

The excavator is at `x=52`, the job begins at `x=58`: **six tiles**.

That is a good ratio. You board the machine and almost immediately understand why it exists.

The girder span is also a better construction fantasy than a generic locked door: the player changes the level geometry and then walks over the thing they just placed.

Preserve this pattern for World 2.

## P1 — Up still secretly means Jump when not climbing

The climbing level is where control language has to be the cleanest.

`kid.js` still does:

```js
if (input.take('jump') || input.take('up')) this.jumpBufT = BUFFER;
```

So outside a ladder, **Up is also Jump**.

That muddies the exact lesson 1-2 is trying to teach:

- `A` = jump
- `Up/Down` = ladder / contextual vertical machine control

### Recommendation

Remove Up-as-jump unless there is a specific accessibility reason for it and the UI communicates it deliberately.

The illustrated Up control currently reads as climbing; it should not silently become a second jump button on flat ground.

## Checkpoint placement is good

Checkpoint `x=46`, machine `x=52`, stack `x=48` is an excellent recovery cluster. A failure in the construction sequence should not ask a six-year-old to replay the ladder tutorial.

Use this as a template: **checkpoint just before the authored machine peak**, not simply at mathematical 50%.

## Final third

The far-side scaffold + hopper is a good cooldown because it returns to known verbs after the machine spectacle.

Do not make this ending harder. Its job is to let the player enjoy having solved the span and run to the flag.

---

# EERI 1-3 — THE HIGH WALL

## What works

The level correctly starts by combining known skills rather than explaining them again.

The first half therefore feels like a test of the World 1 vocabulary:

- ladder + hopper
- pit + roller
- scaffold + hopper

That is appropriate for the third level of a world.

The big flag + gate also gives 1-3 a stronger ending than 1-1/1-2, which is the right hierarchy.

## The crane is a new experience even if it is not a new button

The design describes 1-3 as adding no new verb, but the crane introduces a new machine fantasy and a new causal relationship: **swing/operate heavy equipment to break the wall**.

That is functionally new information for the player even if it reuses the same contextual Down input.

This is not necessarily a problem. It means the level should treat the crane as a **spectacle payoff**, not as a puzzle the player has to decode.

### Recommendation

Make the correct crane action obvious through:

- crane orientation toward the wall
- wall damage/readiness state
- wrecking-ball motion
- strong hit reaction
- debris and sound

Do not solve the learning cost with more text.

## Experience risk — the final 30 tiles are dense

Around the final machine sequence the level stacks:

- steam near `x=60`
- crane at `x=66`
- roller at `x=70–76`
- wall at `x=80–84`
- big flag at `x=88`
- gate at `x=92.5`

That can read as an escalating finale, or as several things fighting for attention.

### Recommendation

Judge this section specifically in human play. The key question is not whether it is finishable — the gates already answer that — but whether the player understands **the crane and wall are the star of the sequence**.

If the answer is no, remove foreground competition before adding explanation.

## Machine-to-job distance

Crane `x=66` to wall `x=80` is about twice 1-2's machine lead.

Again, that can be good if the journey is the spectacle. If it feels like dead driving, shorten it. The machine should arrive at its job before the novelty of boarding it has faded.

---

# Cross-level findings

## P1 — stomp strength is still the largest mechanic mismatch

This affects the identity of 1-1 and everything that later assumes stomp is exciting.

Resolve it before authoring a World 2 level that uses stomp as known vocabulary.

## P1 — Up/Jump ambiguity weakens the control language

This affects every level, but 1-2 suffers most because it is explicitly the climb tutorial.

## P1 — `WORLD2.md` currently contains unresolved merge-conflict markers

The current `main` file contains literal conflict text around the `pipeworks_*` backdrop section:

```text
=======
...
>>>>>>> origin/claude/eeri-platformer-levels-dtfh0x
```

Its header also still says **"Nothing here is built yet"**, while shallow/deep water, pipe and pump-supporting logic have already landed and are proved in the Lab.

This does not break World 1 gameplay, but it is a **coordination bug** right before levels 4–6 are authored. An agent reading this file can make the wrong decision about what exists.

Resolve the conflict and update status before using `WORLD2.md` as the next-level brief.

## P2 — treat the Lab as mechanics QA, not level-design evidence

The Lab proves that belts, tarps, water and pipes function and can be placed legally. It does not prove that a child learns them in a good order.

World 2 still needs the same four-beat discipline as World 1:

**introduce safely → vary → combine with known vocabulary → machine/test payoff**.

## P2 — the machine should be close to the reason you board it

Current leads are approximately:

- 1-1: excavator `63` → bank `84` = 21 tiles
- 1-2: excavator `52` → chasm `58` = 6 tiles
- 1-3: crane `66` → wall `80` = 14 tiles

1-2 is the strongest current example. Longer leads should earn their length with machine-scale interaction rather than simply travel.

## P2 — strengthen physical feedback before adding more authored complexity

The current levels already contain enough structure. The next quality gain in World 1 should come from:

- stronger dirt/debris response
- heavier hydraulic/impact audio
- clearer material difference between permanent terrain and manipulable pieces
- more visible stomp squash/rebound
- small environment reactions around Eeri
- stronger machine success celebration

This increases perceived authorship without changing reachability or the level grammar.

---

# Suggested next actions

In priority order:

1. **Resolve stomp intent:** empowering rebound vs rhythm-only rebound; make code, commentary and secrets agree.
2. **Remove or deliberately document Up-as-jump.**
3. **Clean `WORLD2.md` conflict markers and stale status before levels 4–6 are authored.**
4. Use **1-2 as the authoring benchmark** for the first World 2 level: safe introduction, clear variation, checkpoint before peak, machine close to job.
5. Human-play the final machine thirds of **1-1 and 1-3** specifically for dead travel vs spectacle.
6. Do a World 1 **feedback/readability pass before adding more hazards or prompts**.
7. Keep QA deep-links in bug reports and playtest notes: `#eeri-1-1`, `#eeri-1-2`, `#eeri-1-3`.

---

# Bottom line

World 1 is no longer mainly a reachability problem. The severe fall-respawn regression is fixed, the three rooms have a coherent learning arc, and 1-2 demonstrates the right relationship between teaching and machine payoff.

The remaining work is mostly **clarity and emphasis**:

- make stomp mean what Level 1 says it means
- make the control language unambiguous
- make the machine job dominate each finale
- remove competing noise rather than explain through text
- clean the World 2 brief before agents build on it

**1-2 is currently the standard to beat.** Build the next levels with that degree of discipline, then spend the extra complexity budget on the world fantasy rather than on more rules.