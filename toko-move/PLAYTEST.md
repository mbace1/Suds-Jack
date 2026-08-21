# Toko Move — playtest, 2026-08-21

Run against v5 on three formats, driven **only through pointer gestures and DOM
clicks**. Nothing here reaches into the game to make something happen: if it
could not be done with a pointer, it is recorded as impossible.

Boards are pinned with `#seed=N`, so every number below can be re-run.

---

## 1. Is the game playable on each format?

| | desktop 1180×800 | phone 390×760 | phone sideways 640×360 |
|---|---|---|---|
| board | 860×600 | **600×860** (turned) | 860×600 |
| zoom | 1.17 | 0.65 | 0.44 |
| share of screen used | 88% | **74%** | 71% |
| a stop, drawn | 36px | 22px | 22px |
| a waiting passenger | 10.3px | 6.8px | 6.8px |
| grab a line end | 46px | 46px | 46px |
| tap a stop | 50px | 50px | 50px |
| draw a line | yes | yes | yes |
| extend a line | yes | yes | yes |
| delete a line | yes | yes | yes |
| pause / speed / sound | yes | yes | yes |
| take a weekly reward | yes | yes | yes |
| page errors | none | none | none |

**Verdict: playable on all three.** It was not before this pass — three
separate faults, all invisible to a green test suite and all found by
measuring and looking rather than by asserting:

1. **Hit targets were fixed in board units**, so they shrank with the window.
   The line-end nub was 17px on a phone, and it is the only way to shorten or
   delete a line — so on touch a line could not be edited at all.
2. **The controls were off the screen.** At 390px the strip ran to 515px:
   pause was 96% off, speed and sound entirely gone. `overflow: hidden`
   clipped them, so the gate's no-horizontal-overflow check passed the whole
   time.
3. **A landscape board letterboxed into a portrait phone** used 36% of the
   display and drew stops at 7px and passengers at 2px.

And one outright crash, found by playing rather than testing: cutting a line
while a train was out on the leg being removed left the train pointing at a leg
that no longer existed, and the next frame took the renderer down. Every gate
passed, because they all retract lines that are standing still.

---

## 2. Do the indicators teach the process?

**Mostly yes, with one hole big enough to swallow the game.**

What a player has to learn, and what teaches it:

| what must be learned | what teaches it | verdict |
|---|---|---|
| stops are shapes | the shapes are the stops | **shown** |
| a passenger wants a stop of *their* shape | one line of title text | stated once, never again |
| you draw lines by dragging | one line of title text | stated once, never again |
| trains carry people | you watch it happen | **shown** |
| where the queue is building | the queue grows visibly | **shown** |
| a stop is in trouble | a dark ring closes around it | **shown**, but never named |
| what happens when the ring closes | nothing at all | **not taught** |
| water costs a tunnel | the words "needs a tunnel" *after you fail* | taught by failure |
| how to delete a line | one line of title text | stated once, never again |
| **why somebody is not moving** | **nothing** | **not taught — see below** |

### The hole: a passenger nobody can reach looks exactly like one who is next

A passenger whose shape is not on any line is drawn **identically** to one about
to board. There is no mark, no dimming, no count, nothing.

Measured across three boards, played by a bot that keeps every stop connected:

| board | mean share of the queue that cannot reach its shape | peak | share of the run with somebody stranded |
|---|---|---|---|
| seed 31 | 15.8% | 61% | 42% |
| seed 77 | 0.4% | 5% | 8% |
| seed 120 | 21.2% | 60% | 55% |

On seed 31 the run ends with **38 of 62 people waiting for somewhere no line
goes**. They are not idle scenery: they sit on platforms and push the crowding
gauge toward the end of the run. The player is being killed by a queue they
cannot act on and are never told about.

The first one appears **11.9 seconds** after the first line is drawn — the same
second as the first delivery. So the moment the game first rewards you is the
same moment it starts lying to you.

This is also the exact rule the game is *about*. Making it visible would teach
the core idea for free, in the place the player is already looking.

### The onboarding clock

From the moment a first line is drawn, on seed 31:

| | |
|---|---|
| first passenger appears | 1.6s |
| first passenger boards | 7.5s |
| **first delivery** | 11.9s |
| first unreachable passenger | 11.9s |
| first crowding | 43.7s |
| first weekly reward | 55.4s |

Twelve seconds to the first delivery is slow for a first reward but not wrong —
the trains have to get there. Forty-four seconds to the first sign of trouble
and fifty-five to the first decision is a gentle opening, which suits it.

### Everything the game ever says

The whole of the teaching is one paragraph on the title card:

> Every stop is a shape, and everybody on it wants a stop of some other shape.
> Drag between two stops to open a line; drag the stub at a line's end to carry
> it on, and drag back to pull it up again.

It is accurate and well written and it is **gone the moment you start**, with no
way back to it and nothing in play to remind you. The delete gesture in
particular is discoverable nowhere else — which is how this playtest started.

---

## 3. What to do about it, in order

1. **Mark a passenger with no route.** The single highest-value change in the
   game. It teaches the core rule, converts an invisible loss into a visible
   problem, and needs no new mechanic. (Design care needed: filling the shape
   solid was tried for *over-capacity* passengers and rejected, because a solid
   star reads as a different destination from a hollow one. A ring, a tint or a
   count beside the stop is likelier to be right than a change to the shape.)
2. **Say what the closing ring means**, once, the first time one appears.
3. **Keep the instructions reachable in play** — the delete gesture especially.
4. **Warn before the water**, rather than refusing after it.
