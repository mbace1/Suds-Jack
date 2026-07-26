# Tiny Hawk — design doc

> A tiny skate story. Tony Hawk's vocabulary, OlliOlli's commitment, Slay the Spire's map.
> Three.js r167, no build step, same house rules as `paperboy/` and `dropcabal/`.

Status: **design only — nothing implemented yet.** This doc is the plan to argue with
before any code lands.

---

## 1. The pitch

You are a nobody with a camcorder and not enough film. Every spot you skate, you get a
handful of tries to land the clip. Land the goals, the part moves to the next district.
Run out of film, the part is what it is.

Two ways in:

* **Daily Line** — one seeded 45-second course, everybody gets the same one, three tries,
  best run counts. Two minutes of your day.
* **The Part** (roguelike) — a branching tour through the city, a shared pool of tries
  across the whole run, goals that gate progress, board parts and learned tricks as the
  build.

The story is not a cutscene layer. It is the roguelike's connective tissue: sponsors,
busted spots, a rival's line, a knee that costs you film.

---

## 2. Core question, answered up front

**Free-roam park (THPS) or forward-committed line (OlliOlli)?**

Recommendation: **forward-committed line, rendered in 3D.** The skater always rolls
forward; you steer across a ~3-lane-wide ribbon and choose routes *within* a segment, but
you never turn around.

Why this and not a park:

| | free-roam park | forward line |
|---|---|---|
| daily seed comparability | weak — everyone skates a different route | strong — same course, same 45 s |
| touch controls | needs a full analog + camera | steer is one axis, the rest is gestures |
| roguelike content unit | a whole park per node (expensive) | a **segment**, shufflable (cheap) |
| session length | open-ended | naturally 30–60 s |
| authoring cost | very high | hand-author ~30 chunks, combine forever |

The freedom you keep: lateral lane choice, side quarterpipes for wall airs, high/low
routes (grind the rail *over* the gap, or drop in and pump the bowl beneath it). It should
feel like a **line**, not a tunnel.

This is the single biggest fork in the doc. If the answer is "no, I want a park," most of
§5 (course deck) is rewritten and §7 (map) survives intact.

---

## 3. Feel: the trick system

Everything hangs off one rule: **the multiplier only pays when you land.**

### Roll
Constant forward drive, modulated by terrain. Pumping a transition (crouch at the bottom
of a curve) adds speed; a sloppy landing (off-axis, too flat) sheds it. Speed is not a
score, it is the budget you spend on gaps.

### Ollie
Hold to crouch — a visible squat, up to ~0.5 s of charge — release to pop. Charge sets
height. Holding also slows you slightly, so charging a big pop into a big gap costs you
approach speed. That tension is the whole ollie.

### Air tricks — four families, one gesture each
While airborne, a flick (or key) in each of four directions:

| gesture | family | example |
|---|---|---|
| ← / → | flip | kickflip, heelflip |
| ↑ | grab | indy, melon |
| ↓ | shuv | pop shuv-it, 360 shuv |

Each flick appends a trick to the combo string. **Repeating a trick inside one combo
scores progressively less** (the THPS rule) — that is what makes an unlocked trick
vocabulary a real build upgrade rather than a cosmetic.

### Spin
Hold left/right in the air to yaw. 180 / 360 / 540 each add. You must land within roughly
±35° of travel or you bail — so spin is the highest-value, highest-risk modifier, and it
fights with the flick gesture for the same input axis. **Resolution: flicks are impulses
(short, released), spins are holds.** Needs prototype confirmation; it is the riskiest
control decision in the doc.

### Grind
Land within a small window of a rail/ledge → auto-lock. The direction held on approach
picks the grind type (50-50 / boardslide / crooked). A balance meter drifts; correct with
left/right. Grinds tick score per second and drift harder the longer you hold. Auto-lock
generosity is a **tuning constant with a difficulty curve**, not a fixed value.

### Manual
Tap-tap (or hold) on landing → manual, own balance meter. This is the glue: manuals are
how a combo survives the flat between two features. Cheap to build, and it is the single
mechanic that turns "three tricks" into "a line." Do not cut it.

### Land / bail
Clean landing **banks** `combo points × trick count`. A bail zeroes the pending combo,
costs speed, and — in The Part — costs a try. Bails are theatrical: the board tumbles as
loose debris (the `DebrisPool` pattern from `hyperdagger/js/voxel.js` ports directly).

### Scoring shape
```
pending += trickBase × styleBonus × (repeat penalty)
bank    += pending × chainLength    // on clean landing only
```
Landing early is safe and small. One more manual is always tempting. That is the game.

---

## 4. Art direction: vector-looking, not vector

"Vector graphics" in 3D reads best as **flat-shaded low-poly with a hard ink outline** —
Jet Set Radio / Art of Rally / Golf Club Wasteland territory.

House rules already established in `paperboy/` and `dropcabal/`, kept here:

* `MeshBasicMaterial`, `NoToneMapping`, **no lights, no shadows, no fog.**
* Shading comes from **baked vertex colors** — three tones per object (lit face / side
  face / shadow face) assigned by face normal at build time. Gives volume with zero
  lighting cost and a deliberately posterised read.
* **Outline via inverted hull**: duplicate mesh, `BackSide`, scaled ~1.02, flat ink. No
  post-process pass, no build step, works on a phone. (An `EdgeDetect` post pass is the
  fallback if hulls get fiddly on thin geometry like rails.)
* One `palette.js` as the sole colour source (`paperboy` convention) — with **per-district
  palettes**, so the roguelike's phase change is a full re-tint of the same geometry. Free
  visual variety.
* Sky is a flat two-stop gradient plane, not a skybox. Silhouette over detail.

Skater is a chunky low-poly figure, ~200 tris, readable purely by silhouette and by which
way the board is pointing. Board contact with rails must be legible at a glance or grinds
feel arbitrary.

---

## 5. Course generation: the segment deck

**The key architectural idea, and what lets both modes share one system.**

A course is an ordered list of **segments** — hand-authored chunks ~20–40 m long, each a
small JSON-ish description of features (rails, kickers, stair sets, bowls, gaps, hazards).
Every segment declares:

```js
{ id: 'rail-block-a',
  length: 28,
  entrySpeed: [0.6, 1.0],   // speed band it is skateable at
  exitSpeed:  0.9,
  lanes: 3,
  tags: ['rail', 'gap', 'street'],
  district: ['downtown', 'docks'],
  build(scene, z) { ... } }
```

Generation = draw segments whose `entrySpeed` band accepts the previous segment's
`exitSpeed`. That constraint alone means **any shuffle is skateable** — no unwinnable
daily. Difficulty rises by biasing the draw toward narrower entry bands and longer gaps.

Streaming and culling follow `paperboy/js/world.js` exactly: segments spawn ahead of the
skater on a z-cursor, get disposed well behind. The world is effectively infinite; the
geometry never moves.

~30 authored segments gives an enormous shuffle space. Segments are the unit of content:
adding one improves every mode at once.

---

## 6. Daily Line

* Seed = UTC date string → `mulberry32` in `js/rng.js`. Everyone gets the same course.
* ~45 s of segments, plus a fixed goal triple drawn from the same seed.
* **Three tries**, best score counts. After the third, the run locks and the share card
  unlocks.
* No backend (house rule). Results live in `localStorage`; sharing is a **text card**:

```
Tiny Hawk · 2026-07-26
148,200 · rank S · 🛹🛹⚫
best line: kickflip→50-50→manual→360 melon
```

* A local history strip (last 10 days) mirrors `hyperdagger`'s recent-runs list.

Daily is the retention hook and the tutorial-by-repetition. It must load and be playable
in under five seconds.

---

## 7. The Part — roguelike mode

### The map
Slay the Spire structure: ~13 rows, 6 columns, branching and re-converging paths, you see
the whole map and commit one node at a time. Rendered as a **DOM overlay**, not in the 3D
scene — cheaper, sharper, and trivially scrollable on a phone.

Node types:

| node | what happens |
|---|---|
| **Spot** | standard segment run, 2–3 goals shown, clear any 2 to pass |
| **Session** (elite) | longer course, harsher goals, guaranteed board part |
| **Shop** | spend footage-cash on parts and trick unlocks |
| **Event** | story beat with a choice (see §8) |
| **Rest** | +2 film, or practice a trick permanently, not both |
| **Boss** | a rival's line — beat a target score on their course |

### Film — the run resource
You carry **5 tries ("film") for the entire tour**, not per node. Bail out of a node's
goals and it costs one, and you may retry the node immediately. Rest nodes refill 2. Zero
film ends the run and you get whatever part you shot.

This is exactly the "limited runs, easily repeatable to a certain try amount" shape: a
single spot is endlessly retryable in the moment, but every retry is drawn from a pool
that has to last fifteen nodes. Retrying is *allowed* and *expensive* — the good tension.

### Goals and phases
Each node shows 2–3 objectives; clearing the required count passes the node. Goal kinds:

* score threshold in one line
* **multiplier events** — "hit ×5 in a single combo", "bank 30 k without touching flat"
* feature sweeps — "grind all four rails on the block"
* trick-specific — "land a 360 flip over the gap"
* survival — "no bails for the whole segment"

Clearing a **row band** advances the phase: new district, full palette re-tint, new
feature vocabulary (street → plaza → docks → downtown → the vert park), and a tightening
of the segment draw.

### Build: parts and tricks
Relics as **board parts** — each a plain stat modifier with a real trade-off:

| part | effect |
|---|---|
| soft wheels | +20 % grind balance, −5 % speed |
| hollow trucks | +manual balance, −landing tolerance |
| steezy grip | repeat-trick penalty halved |
| insurance clip | first bail per node keeps half the pending combo |
| longer lens | goals show one extra option to choose from |

And **trick unlocks**, which expand the vocabulary so combos can stay varied and dodge the
repeat penalty. Vocabulary breadth *is* the scaling curve — a nice fit, because it makes
the build feel like getting better at skating rather than getting bigger numbers.

---

## 8. The story

Short text beats between nodes, zine/VHS typography. Minimal, in the register of
`gameoflife/` — a few lines, one choice, real consequences:

* a sponsor offers flow — accept and take a goal quota on every node, or stay independent
* the plaza gets skate-stoppers — that segment gains a permanent hazard for the rest of
  the run
* a rival posts a clip — a boss node's target score rises, but so does its payout
* your knee goes — −1 max film for three nodes, or sit out a node to heal

The arc is small and unheroic: you are trying to finish a part. Districts are chapters.
The ending is a "part" recap — your best banked line from each district played back as a
list, with a rank. No triumph, just the tape you actually shot.

---

## 9. Proposed file layout

Follows the `dropcabal`/`hyperdagger` convention: ES modules, jsDelivr importmap for
three.js r167, `?v=N` cache-busters, no build step.

```
tinyhawk/
  index.html
  DESIGN.md
  js/
    main.js      # scene, render + outline, loop, state machine, HUD
    palette.js   # per-district colour schemes, single source of truth
    rng.js       # mulberry32, daily seed, seeded draw helpers
    course.js    # segment deck, constraint draw, streaming + cull
    segments.js  # the ~30 authored segment builders
    skater.js    # roll, ollie, air, landing, grind lock, manual, balance
    tricks.js    # trick table, combo string, scoring, bank/bail
    input.js     # touch flick/hold gestures + keyboard fallback
    map.js       # node graph gen + DOM map overlay
    meta.js      # run state, film, goals, parts, localStorage
    story.js     # events, choices, district text
    audio.js     # WebAudio kit: pop, grind loop, land, bail, bank
```

`window.__th` exposes `{skater, course, meta, debug}` for console tinkering and headless
smoke tests, matching `__hd` / `__dc`.

---

## 10. Build order

Each phase ends at something playable — no phase is pure plumbing.

**P0 — does it feel good?** (the gate)
Flat ground, capsule skater, roll + ollie + land/bail. One hand-built segment. No score,
no art. *If the ollie does not feel good here, nothing later saves it.* Tune, then commit.

**P1 — the combo.** Air trick families, spin, grind lock, manual, balance meters, combo
string + banking, HUD. Still ugly. This is where the game exists or doesn't.

**P2 — the course.** Segment deck, constraint draw, streaming, ~12 segments authored.
Daily Line mode end to end: seed, three tries, score, share card, history.
**Shippable milestone — this alone is a good little game.**

**P3 — the look.** Vertex-colour tones, inverted-hull outlines, palette, skater model,
sky, bail debris, audio kit. Touch controls finalised on a real phone.

**P4 — The Part.** Map generation + DOM overlay, node types, film economy, goals,
board parts, trick unlocks, phase/district transitions.

**P5 — story and polish.** Events and choices, district text, part recap, rank, options,
`gh-pages` deploy at `/Suds-Jack/tinyhawk/`.

---

## 11. Risks, named honestly

1. **The flick-vs-spin input collision** (§3) is the highest risk in the design. If
   impulse-vs-hold doesn't separate cleanly under thumb, the fallback is spin-on-a-second-
   finger (touch) / shoulder-keys (desktop). Prototype this in P1, not P4.
2. **Grind auto-lock generosity** decides whether grinds feel like skill or like luck. It
   needs a tuning pass with a visible debug volume, and probably a difficulty ramp.
3. **Landing tolerance** is the difficulty dial for the whole game. Expose it in
   `__th.debug` from P0 so it can be felt, not guessed.
4. **Segment authoring is the real cost.** Thirty good chunks is a lot of hand work.
   Mitigation: build segments from a small parts kit (rail, kicker, bank, stair, gap) so
   authoring is arrangement, not modelling.
5. **Scope.** P0–P2 is a complete game. P4–P5 is a second game on top. Ship P2 first.

---

## 12. Open decisions

* **§2 — line vs park.** The one that changes everything downstream.
* Daily: three tries, or one and done?
* Film pool of 5 for the whole tour — or per-district refills? (Playtest number.)
* Does story ride only in The Part, or does the Daily carry a one-line beat too?
* First-person camera is out; but chase-cam distance and how much it leads the skater is
  a feel decision that belongs in P0.
