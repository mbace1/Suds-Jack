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

## 2b. What was done about it (v6)

Mini Metro has nothing to copy here: its unreachable passengers are drawn like
everyone else and never leave, so the backlog kills you with no way to see it
coming. That makes this a **logical option, tested** rather than an inherited
design — and it is meant to be revised.

- **Marked.** A passenger no line can reach is drawn in a pale ink. The
  silhouette is untouched, because filling the shape was tried for
  over-capacity passengers and a solid star reads as a *different destination*.
- **Counted.** `nowhere to go N` appears on the strip, in the alarm colour, and
  only when N > 0. A permanent "0" is furniture.
- **They leave.** After `giveUp` seconds (45 in the endless city, 70 on the
  festival night) somebody with nowhere to go walks away. The end card counts
  them. This is the half that turns an invisible death into a visible loss.

**The balance cost was measured before it shipped**, across seven boards, bot
play, endless:

| | never leave (Mini Metro's rule) | they give up |
|---|---|---|
| mean survival | 198s | 205s |
| mean delivered | 120 | 124 |
| mean who walked away | — | 10 |

About 3% easier, and on the four boards where nobody was ever stranded the runs
are **identical** — the rule only touches the situation it is about. If it
proves too gentle the answer is a shorter fuse, not a return to silence.

Also added: the three untaught rules now say themselves once each, the first
time the game does the thing — somebody stranded, a ring past a quarter closed,
a tunnel spent.

## 3. What to do about it, in order

1. ~~**Mark a passenger with no route.**~~ Done in v6, above.
2. ~~**Say what the closing ring means**, once, the first time one appears.~~
   Done in v6.
3. ~~**Keep the instructions reachable in play.**~~ Done in v9. A `?` beside
   the other controls opens the rules, keyed by LAYER because the two layers
   share no verbs at all. It does not pause, does not cover the board, closes
   on Esc with focus handed back, and closes itself on a new run so it cannot
   describe the wrong layer.
4. ~~**Warn before the water.**~~ Done in v9. `Network.wouldCost(a, b)` answers
   "would this leg be refused, and why" **without drawing it**, so a drag can
   ask about every stop before the finger arrives — and the board rings the ones
   it cannot reach in the alarm colour while you are still on your way. The old
   behaviour taught the tunnel rule at the cost of the move.

---

## 3b. What the pictures showed when those two shipped (v9)

Both of them passed every check before they were looked at, and both were wrong
on a phone held sideways. Recorded because it is the same lesson for the third
time in this project:

- **A fifth control did not fit.** The strip wrapped only below 560px and a
  640×360 landscape phone is above it, so the `?` went off the screen — caught
  by the gate, which is the one piece of good news. The strip **wraps at every
  width** now: a rule that must be raised each time something is added is a rule
  that will be forgotten once, and wrapping costs a desktop nothing.
- **The rules ran off the bottom** of a 360px-tall screen, and the rule that ran
  off was *how to take a line back* — the only reason the panel exists. It
  scrolls now.
- **Then the way home landed on the score**, because tightening the strip's top
  padding to buy back board height put the arcade's HOME button through it. Then
  moving the score aside instead fixed the score and put HOME on **the top-left
  corner of PAUSE**, where a thumb goes home rather than pausing — which is
  exactly the v5 bug by another route. The clearance is padding on the whole
  strip now, so every wrapped row goes around the button.

The gate learned all three: controls on screen, and a `checkHomeClear` that runs
on the desktop **and** the landscape phone against the score and every control.
It had to be made a function first — written inline on the desktop page, it
passed happily while the landscape layout was broken, because the short-screen
rules do not apply there.

---

## 4. The car layer, measured before it shipped (v7)

Nothing in this section is an opinion. A deterministic player — join each new
building to the **nearest square of road you already own** with an L, spend the
morning's upgrade on whatever you are short of — was run over sixteen boards
after every change, because prototype feel lives entirely in the part a state
assertion cannot see.

| what changed | wins | mean win | mean jam | walked away |
|---|---|---|---|---|
| as first written | 3/8 | 184s | 20% | 102 |
| the lane rule (oncoming does not block) | 5/8 | 184s | 0% | 134 |
| bridges buyable | 9/16 | 227s | 0% | 157 |
| a bridge is a crossing, not a square | **12/16** | 218s | 0% | 80 |

Three readings worth keeping:

- **The 20% mean jam was two boards at 93% and 100%**, not a general slowness.
  A mean hides a deadlock; the per-seed rows do not. Always print the rows.
- **Road was never the binding constraint** for this player: 34, 38 and 42
  starting squares gave *identical* results to the check. What binds is demand
  against how fast a street clears, which is why the tuning dial that moved
  anything was the target and not the allowance.
- **The target was wrong by half.** At 85 the mission was won at 2:41 of 7:00.
  At 190 it is won at 4:56 and still 12 boards in 16, so the last third of the
  morning is doing work. Past 210 the losses come from the clock rather than
  from the town outgrowing its roads, which is the wrong kind of loss for a
  mission whose whole line is *room runs out before time does*.

The four boards that are still lost are lost to a building backing up early,
which is this layer's stated failure and the genre's (Mini Motorways ends when
a building's pin fills). Whether that is too sudden at 1:37 is the next thing
to measure, not to guess.
