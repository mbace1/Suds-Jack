# EERI — Betterment lane

**Status:** living design/coordination document  
**Branch:** `agent/eeri-betterment-design`  
**Purpose:** improve the game that already exists before inventing more of it.

This lane is for **features, graphics, UX, readability and second-to-second feel** across EERI. It is not a fifth world, not a replacement GDD, and not permission to ignore the project's phase gates.

Read in this order before changing anything:

1. `PHASING.md` — newest owner direction and phase gates.
2. `DESIGN.md` — gameplay canon where PHASING does not supersede it.
3. `ART_BRIEF.md` — visual canon.
4. `CURRENT_LEVEL_ANALYSIS.md` — concrete problems in the current playable World 1.

---

## 1. The betterment target

The target is simple:

> **Make every existing action clearer, more tactile, more delightful and more obviously part of a hand-built toy worksite.**

The current project already has enough large ideas. Betterment should mostly improve the value of those ideas rather than compete with them.

The player experience we are protecting:

- **80% on foot, 20% machine spectacle.** Running, jumping, climbing and stomping must be fun without rides.
- **Crafted World 80 / Tropical Freeze 20.** The default visual answer is a friendly handmade diorama. Dramatic camera/layer moments are seasoning.
- **Age-six generous.** No timer, no health bar, no game over, no gotchas. Telegraphs are long, jumps have margin, failure costs time only.
- **Controller-first and mobile-friendly.** No keyboard-centric language. One input should have one clear meaning wherever possible.
- **One idea per level.** Betterment must not turn World 1 into a mechanics sampler.
- **Machines are rewards/set-pieces.** Board near the job, do something physically satisfying, get out.

---

## 2. Current PR boundaries

Do not duplicate work already in flight.

### PR #235 — dev menu + FX/SFX prototype pack
Use it as an audition/prototyping surface when useful. Do not rebuild a second dev overlay.

### PR #258 — World 2 Pipeworks playfield dressing
Do not re-dress World 2 from this lane while that PR is live.

### PR #265 — Worlds 3–4 greybox + visual pass
Do not redesign those six rooms from this lane while that PR is live. Betterment principles can be applied after their structure settles.

Betterment should initially focus on **shared feel, World 1 readability, HUD/UX and reusable presentation rules**.

---

# 3. Feature betterment

These are intentionally small, high-leverage features rather than new systems.

## F1 — Stomp becomes a signature action

`CURRENT_LEVEL_ANALYSIS.md` identifies the clearest current contradiction: the level promises a powerful rebound, while the implemented stomp bounce is below normal jump height.

**Direction:** stomp should feel better than merely landing on an enemy.

Target response:

1. enemy squashes immediately;
2. Eeri rebounds **visibly higher than a normal jump**;
3. tiny freeze/contact beat makes the impact readable;
4. a soft craft puff / bolt-like spark marks contact;
5. camera gets at most a very small impulse, never a violent shake;
6. sound is short and toy-like, not combat-like.

The rebound must be re-proved against room reach and secrets after tuning.

## F2 — Control meanings become truthful

Current analysis flags `Up` secretly acting as Jump outside ladders.

**Direction:**

- `A` / primary action = jump.
- `Up/Down` = vertical/contextual interaction when a ladder or machine supports it.
- No hidden secondary jump mapping unless deliberately exposed as an accessibility option.

The UI should teach the control model by consistency, not text.

## F3 — Successful machine jobs visibly change the world

Every ride already exists to reshape the room. Betterment should make the **before → action → after** transition a miniature reward.

Reusable recipe:

- anticipation: target has a subtle readiness state;
- contact: strong but friendly impact response;
- transformation: geometry visibly settles into its new state;
- confirmation: a puff, clack, dust/crumbs or work-light response;
- route: the newly opened route immediately reads as walkable.

World 1 examples:

- dirt bank: loose clumps, scrape line, crumbs, exposed cut edge;
- girder: settle/bounce into place, bolts/dust puff, clear walkable top;
- wall: crack state → break → debris → clean opening.

No explanatory paragraph should be needed beside a machine.

## F4 — Secrets are invitations, not traps

A secret can be hidden, but the player should be able to form a hypothesis.

Rules:

- if a secret asks the child to enter an apparent danger area, **tease the reward first**;
- use slightly unusual craft material, a visible collectible glint, an extra ladder rung, a suspicious cut edge or a bolt trail;
- do not teach deliberate failure as the normal secret language.

## F5 — Worksite life without gameplay clutter

Add tiny non-blocking behaviours that make the site feel alive without creating new rules:

- distant worker-bot carries something and exits;
- a background light clicks on;
- a pulley turns when a nearby machine operates;
- a hanging sign or paper flap reacts to a heavy impact;
- a tiny bird/bug equivalent made from craft scraps can appear in safe areas.

These are **background reactions, not enemies or objectives**. One or two per level is enough.

---

# 4. Graphics betterment

## G1 — Material readability before detail

The world should read as a physical handmade set at a glance.

Prioritise:

- cardboard/paper/felt/painted wood/pressed toy-metal identity;
- cut edges, folds, seams, straps, bolts and simple construction joints;
- soft friendly light;
- strong gameplay-plane lip and grounding shadow;
- no photo texture, grunge wash or realistic grime.

When an interaction matters, its material should help explain it. Diggable dirt should look loose; a breakable wall should look segmented/brittle; a climbable ladder should visually separate from background scaffolding.

## G2 — Three visual bands per gameplay screen

A normal screen should read in this order:

1. **Gameplay lane** — Eeri, standable surfaces, hazards, enemies, collectible route.
2. **Place identity** — one or two strong world-specific forms.
3. **Depth dressing** — foreground/background pieces that sell the diorama without competing.

If all three bands shout equally, remove detail.

## G3 — Contact pass

Anything Eeri or a machine meaningfully touches should have a cheap visual response.

Candidate reusable responses:

- paper/felt puff;
- dust crumbs;
- squash and settle;
- small hinge flex;
- hanging element wobble;
- temporary scrape/impact decal style made from the same craft language;
- one-frame brightness/value pop on a pickup or target.

This is a **systemic polish vocabulary**, not unique bespoke VFX per object.

## G4 — Foreground earns its existence

Foreground pieces should occasionally crop into the frame or pass in front of the action, but never obscure a jump or hazard read.

Use narrow posts, low sweeps, hanging edges and occasional high crossings. Avoid large eye-level blobs.

## G5 — Camera restraint

Do not spend Tropical Freeze-style camera moments everywhere.

Before Phase C, camera betterment should mostly mean:

- smooth tracking;
- stable framing around jumps;
- slight anticipation for a machine transformation if already supported;
- no unnecessary zooming or spectacle that changes platforming judgement.

One authored hero camera moment per world remains a later Phase C luxury.

---

# 5. UX betterment

## U1 — Level start is fast and legible

On entry, briefly show:

- `EERI 1-1`
- level name

Then clear it quickly. No modal, no button press, no tutorial wall.

The level itself teaches the mechanic.

## U2 — HUD hierarchy

Default gameplay HUD should answer only the useful questions:

- bolts: `x/100`;
- golden bolts: `x/3`;
- world blueprint state only when relevant;
- pause/access control.

Everything else stays out of the playfield unless it has an immediate purpose.

Collectible feedback should be stronger at milestones (for example 50/100, 100/100, 3/3) than for ordinary increments.

## U3 — Checkpoint feedback

The checkpoint is a major kindness feature and should feel reassuring.

When crossed:

- clear activation animation;
- short SFX;
- tiny visual confirmation;
- no stopping the player.

After a fall, respawn should make it obvious that the checkpoint saved progress without showing failure language.

## U4 — Interaction prompts are contextual and graphical

Prefer in-world affordance first, glyph second, text last.

Good order:

1. object orientation/material explains the action;
2. contextual controller/mobile glyph appears only when useful;
3. short text only if the first two cannot carry the idea.

Never show keyboard keycaps in the shipping experience.

## U5 — Level completion celebrates movement

For Levels 1 and 2 of a world, the flag should remain a run-through celebration: build/activate as the player reaches it, then keep moving.

For Level 3, the bigger flag and clock-out gate should feel like a world curtain.

A compact completion beat can surface:

- bolts collected;
- golden bolts found;
- blueprint found if applicable;

but should not turn the finish into a score screen the child has to manage.

## U6 — Level select is a utility, not a map

Canon says no world map. If level select is surfaced, use a simple unlocked-level menu with Mario-style addresses and world grouping.

It should be equally usable with controller and touch.

---

# 6. First implementation slices

Implementation should still branch from `main` in small PRs. This document is the coordination anchor.

## Slice A — core feel truth

**Highest priority.**

- tune stomp rebound so it fulfils the level promise;
- remove/resolve Up-as-jump ambiguity;
- add stomp contact response using the existing feel seam where possible;
- re-run reach/room gates.

**Success:** 1-1 feels better without adding a single new mechanic.

## Slice B — machine-job readability

World 1 only:

- dirt bank dig response;
- girder place/settle response;
- crane wall damage/break response;
- make each newly opened route immediately obvious.

**Success:** a child can infer what the machine did without explanatory copy.

## Slice C — HUD + checkpoint + level transitions

- compact level-start title;
- checkpoint activation feedback;
- clean collectible hierarchy;
- flag/world-end presentation pass.

**Success:** the game communicates state without interrupting play.

## Slice D — crafted depth polish

Only after A–C are stable:

- remove dead visual zones;
- strengthen gameplay-ground lip/material read;
- add restrained frame-cropping foreground pieces;
- add one or two passive environmental-life reactions per level.

**Success:** screenshots read as a handmade toy set first and a generic 2.5D platformer second.

---

# 7. Betterment idea bank — later, not commitments

These are useful candidates once the first slices are proven.

- blueprint unlock gallery using real concept/source art;
- tiny world-specific completion stamp/sticker in level select;
- worker-bot ambient chores between enemy encounters;
- machine work-lights that react when a job is completed;
- collectible trails that subtly curve toward the intended route without becoming arrows;
- safe idle interactions in non-danger spaces (sign wobble, hanging chain, loose cardboard flap);
- reduced-motion option for strong VFX/camera responses;
- optional simplified touch layout for very small screens;
- secret-art reveal presented as a physical blueprint sheet on a workbench.

Do not implement these merely because they are listed. They must earn their way in after the first three slices improve the actual playable game.

---

# 8. Definition of better

A change belongs in Betterment if at least one of these becomes measurably clearer:

- **What can I do?**
- **Where should I go?**
- **What just happened?**
- **Why was that fun?**
- **Does this look like the same handmade world as everything around it?**

The strongest betterment changes answer several at once.

The lane should favour **subtraction, feedback and clarity** over feature count.