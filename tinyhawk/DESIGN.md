# Tiny Hawk — design doc

> A tiny skate story. Third-person low-poly, twin-stick, Tony Hawk's vocabulary,
> Slay the Spire's map.
> Three.js r167, no build step, same house rules as `paperboy/` and `dropcabal/`.

Status: **design + control prototype.** The side-on one-button experiment that came out of
the first draft of this doc now lives on its own as [`tiny2d/`](../tiny2d/) — it is a
finished small game, not a Tiny Hawk mode.

---

## 1. The pitch

You are a nobody with a camcorder and not enough film. Every spot you skate, you get a
handful of tries to land the clip. Land the goals, the part moves to the next district.
Run out of film, the part is what it is.

Third-person, behind the skater, in a low-poly park you can actually roam. The story is
not a cutscene layer — it is the roguelike's connective tissue: sponsors, busted spots, a
rival's line, a knee that costs you film.

---

## 2. Resolved: third-person park, not a forward line

The first draft of this doc recommended a forward-committed line (OlliOlli in 3D) and
flagged the choice as the one open decision. **It is now decided the other way**: free
roam, third-person, low-poly 3D.

What that costs, honestly, and what pays for it:

| | cost | how it is paid |
|---|---|---|
| daily-seed comparability | everyone skates a different route | the daily is a **goal set** on a fixed park, not a fixed route — same objectives, your own line |
| content unit | a park is much more to author than a segment | parks are **assembled from a primitives kit** (§5), so authoring is arrangement |
| touch controls | needs real analog plus a camera | §4 — that is what the twin-stick scheme is for, and it is the most interesting part of the design |
| session length | open-ended | the film/goal structure bounds it, not the geometry |

What it buys is the thing a line can never have: a spot you *learn*. Route choice, a line
you invent rather than execute, and a reason to go back to a node you already cleared.

---

## 3. Feel: the trick system

One rule underneath everything: **the multiplier only pays when you land.**

### Roll and push
The left stick is camera-relative movement. Push forward to accelerate, ease off to coast,
pull back to brake. Turning is a rate, not a snap — the board carves, and carving across a
transition is how you pump for speed.

### Ollie — flick, don't charge
Flick the right stick **up**. The flick's **magnitude sets the pop height**, so the analog
gesture does the job a hold-to-charge would, without a charge that would fight the camera
drag for the same stick (§4). Flick harder, go higher.

### Air tricks
While airborne, flick the right stick in a direction; each direction is a trick family
(↑ grab, ←/→ flip, ↓ shuv). Each flick appends to the combo string, and **repeating a
trick inside one combo scores progressively less** — that is what makes an unlocked trick
vocabulary a real build upgrade rather than a cosmetic one.

### Spin and flip
Hold the **left** stick left/right in the air to spin (yaw); up/down for front/back
rotation. So: **left stick is the body, right stick is the camera and the hands.** That
split keeps both thumbs busy without either one overloaded.

### Landing
Compare board heading to velocity heading on touchdown:

* within ~40° — clean, bank the combo
* near 180° — **fakie**, also clean, and worth more
* anything else, or still mid-trick — **bail**

Plus the surface-normal check inherited from `tiny2d`: how much of your velocity was
perpendicular to the ground decides whether you keep your speed.

### Grind and manual
Rails and ledges auto-lock within a window; approach direction picks the grind type; a
balance meter drifts and is corrected left/right. Manuals (flick right stick down on
landing) are the glue between features — the mechanic that turns "three tricks" into "a
line." Both are **P1**, not P0.

### Scoring shape
```
pending += trickBase × styleBonus × (repeat penalty)
bank    += pending × chainLength    // on clean landing only
```

---

## 4. Controls — the centrepiece

Twin on-screen sticks. The idea that makes it work on a phone: **the right stick
discriminates by gesture speed.** Slow is camera, fast is action. One stick, two jobs, no
mode button.

| input | grounded | airborne |
|---|---|---|
| **left stick** | steer + push (camera-relative) | ←/→ spin, ↑/↓ flip |
| **right stick, slow drag** | orbit the camera | orbit the camera |
| **right stick, flick ↑** | **ollie** (magnitude = height) | grab |
| **right stick, flick ←/→** | — | flip trick |
| **right stick, flick ↓** | manual (P1) | shuv |

Desktop mirrors it: WASD skate, mouse look, Space ollie (hold = higher), Q/E/F/C tricks,
Shift manual.

The threshold between "drag" and "flick" is the single most important number in the game,
and it is exposed in `__th.debug` from day one. Too low and the camera jumps every time you
look around; too high and tricks feel unresponsive. It is measured in **stick units per
second**, not pixels, so it behaves the same on every screen size.

### Camera
Chase cam, low and behind. It springs back behind your direction of travel when you stop
dragging, so you never have to fight it, and pulls out with speed. It is the thing most
likely to be quietly wrong — a skate camera that fights the player ruins a game that is
otherwise fine.

---

## 5. The park: a heightfield plus a kit

The ground is a **heightfield** — `h(x, z)` combined from a list of analytic features by
`max()`, so a ramp rises out of flat ground with no seam work. Surface normals come from
finite differences of `h`.

This is the payoff from the `tiny2d` detour: the physics there was *ballistic integrate,
then project onto the surface tangent*, and that generalises to 3D unchanged — the only
difference is that the normal comes from a gradient instead of a scalar slope. The
validated feel carries over.

The kit: **flat, bank, quarterpipe, halfpipe, bowl, funbox, pyramid, stair set**, plus
rails and ledges as explicit segments (not part of the field). A park is a list of
placements. Authoring a new park is arranging a dozen entries, which is what makes §7's
node-per-spot structure affordable.

Rendering: sample the field on a grid, assign each face one of **three tones** by its
normal, and draw it unlit with vertex colours. Inverted-hull ink outlines on the skater and
on rails. No lights, no shadows, no fog — the house rule from `paperboy` and `dropcabal`.

---

## 6. Modes

* **Free Skate** — no timer, no goals. Learn the park. This is where the controls are
  taught, by having nothing at stake.
* **Daily** — one park, one UTC-seeded goal set, three tries, best counts. Local-only
  scores and a text share card (no backend, house rule).
* **The Part** — the roguelike, §7.

---

## 7. The Part — roguelike mode

### The map
Slay the Spire structure: ~13 rows, branching and re-converging, whole map visible, commit
one node at a time. Rendered as a **DOM overlay**, not in the 3D scene.

| node | what happens |
|---|---|
| **Spot** | a park section, 2–3 goals shown, clear any 2 to pass |
| **Session** (elite) | bigger park, harsher goals, guaranteed board part |
| **Shop** | spend footage-cash on parts and trick unlocks |
| **Event** | story beat with a choice |
| **Rest** | +2 film, or practise a trick permanently, not both |
| **Boss** | a rival's line — beat a target score on their spot |

### Film — the run resource
**5 tries for the entire tour**, not per node. Bail out of a node's goals and it costs one,
and you may retry the node immediately. Rest nodes refill 2. Zero film ends the run.

A single spot is endlessly retryable in the moment, but every retry is drawn from a pool
that has to last fifteen nodes. Retrying is *allowed* and *expensive*.

### Goals and phases
Score thresholds; **multiplier events** ("hit ×5 in a single combo"); feature sweeps
("grind all four rails"); trick-specific; survival. Clearing a row band advances the
phase — new district, full palette re-tint, new feature vocabulary.

### Build
Board parts as relics, each with a real trade-off (soft wheels: +20 % grind balance, −5 %
speed; steezy grip: repeat-trick penalty halved; insurance clip: first bail per node keeps
half the pending combo). Trick unlocks widen the vocabulary, which is the scaling curve —
the build makes you feel like a better skater, not a bigger number.

---

## 8. The story

Short text beats between nodes, zine/VHS typography, in the register of `gameoflife/` — a
few lines, one choice, real consequences: a sponsor offers flow (accept and take a goal
quota on every node); the plaza gets skate-stoppers (that spot gains a permanent hazard); a
rival posts a clip (a boss target rises, and so does its payout); your knee goes (−1 max
film for three nodes, or sit out a node to heal).

The arc is small and unheroic. The ending is a "part" recap: your best line from each
district, played back as a list, with a rank. No triumph, just the tape you shot.

---

## 9. File layout

```
tinyhawk/
  index.html
  DESIGN.md
  js/
    main.js     # scene, render, loop, camera rig, HUD, state machine
    palette.js  # single colour source, per-district zones
    park.js     # heightfield features + mesh build; rails and ledges
    skater.js   # 3D physics: roll, carve, ollie, air, spin, land/bail
    tricks.js   # trick table, combo string, scoring, bank/bail
    input.js    # twin sticks with the drag/flick discriminator; mouse+keys
    map.js      # node graph + DOM map overlay           (P4)
    meta.js     # run state, film, goals, parts, storage (P4)
    story.js    # events, choices, district text          (P5)
    audio.js    # WebAudio kit
```

`window.__th` exposes `{skater, park, input, debug}`, matching `__hd` / `__dc` / `__t2`.

---

## 10. Build order

**P0 — the controls.** Park heightfield, chase camera, twin sticks with the drag/flick
split, ollie, air spin, trick registration, land/bail, combo readout. No grinds, no goals.
*The gate: if the flick threshold and the camera do not feel right here, nothing later
saves it.*

**P1 — the combo.** Rails and ledges, grind lock and balance, manuals, the full trick table
with the repeat penalty, proper combo banking and HUD.

**P2 — a park worth learning.** The primitives kit filled out, one hand-arranged park with
real lines through it, Free Skate and Daily. **Shippable milestone.**

**P3 — the look.** Three-tone vertex shading, ink outlines, palette, skater model, bail
ragdoll, audio kit, touch tuned on a real phone.

**P4 — The Part.** Map, node types, film economy, goals, parts, trick unlocks, districts.

**P5 — story and polish.** Events, part recap, rank, options, `gh-pages` deploy.

---

## 11. Risks

1. **The camera.** Biggest risk in the design now that it is third-person. A skate camera
   that fights the player ruins everything upstream of it.
2. **The drag/flick threshold.** The whole control scheme rests on one number. Exposed in
   debug from P0, and it needs a human pass, not a bot pass.
3. **Landing tolerance in 3D** is now two checks (heading and normal) instead of one. Two
   dials that interact are much harder to tune than one.
4. **Park authoring cost** — mitigated by the primitives kit, not eliminated.
5. **Scope.** P0–P2 is a complete game. P4–P5 is a second game on top. Ship P2 first.

---

## 12. Open decisions

* Does Free Skate have any scoring at all, or is it genuinely idle?
* Daily on a fixed park with rotating goals, or a rotating park too?
* Fakie landings score more — do they also *keep* the combo, or open a new one?
* Film pool of 5 for the whole tour, or per-district refills? (Playtest number.)
