# Hand-off to CONCRETE — from Tiny Hawk and Tiny 2D

Tiny Hawk (`../tinyhawk/`, v6) and Tiny 2D (`../tiny2d/`, v3) are **archived**. CONCRETE is
the skating lane now. This is what those two learned that is worth money here — written
against CONCRETE's actual code as of `c9e8563`, not as a general essay.

Both games stay in the repo and stay playable, the way `sudsjack/` does. Nothing here is a
to-do list; it is a menu with the reasoning attached, ranked by what it would buy you.

---

## 0. What you already have (so this doc does not waste your time)

Read out of `skate.js`, not assumed:

* a combo that accumulates, `mult` capped at 12, `bank()` cashing it, bail zeroing it
* 50-50 grinds with a `grindBuffer` / `grindLock` catch window, and a pop-out on jump
* Ollie, Transfer, Ramp air, kickflip, grab; a landing-turn bail
* three input paths — keyboard, native gamepad, and touch as move-stick + look-stick +
  `[data-key]` buttons
* ACES at 1.25 exposure, no composer, with a procedural mobile tier and Blender GLBs on
  desktop
* a `ground(x, z)` query the whole simulation reads

That is a real skating game already. Most of what follows is about the **space between
features**, which is the part a two-minute session lives or dies on.

---

## 1. Take this first: MANUALS

**The single highest-value thing in this document, and it is about forty lines.**

Your chain can only stay open in the air or on a rail. That means every combo is bounded by
the geometry: two features link only if they are inside one ollie of each other. A manual is
the glue — it is what turns "three tricks" into "a line", and it is why THPS combos are
about the *whole park* rather than about one quarterpipe.

Tiny Hawk's numbers, tuned and bot-verified (`../tinyhawk/js/skater.js`):

```
MANUAL_INSTAB  2.6    // balance accelerates away from centre on its own
MANUAL_CORRECT 3.2    // the stick is the only thing holding it
MANUAL_MIN_SPD 3.5    // below this you just set it down — no penalty
```

The shape: `balVel += balance * INSTAB * dt` (an **unstable equilibrium** — this is the
whole mechanic), `balVel -= stickY * CORRECT * dt`, damp, integrate, bail past `|balance| > 1`.
Rolling too slow ends it with no penalty, because setting a manual down is not a mistake.

Two details that matter more than the numbers:

* **A manual is a wheelie you can see.** Pitch the board by the balance value so the meter
  on the HUD and the thing on screen are the same information. A hidden balance state is a
  coin flip.
* **Entering it should cost a gesture, not be automatic.** Automatic manuals on every
  landing turn the mechanic into a tax.

---

## 2. Grind balance — yours is currently free score

`skate.js` locks x to the rail, forces `speed = max(speed, 6)`, pays `combo += 100 * dt`,
and runs until the rail ends or you jump. Nothing can go wrong, so a rail is a length of
guaranteed points rather than a decision.

Same unstable-equilibrium shape as the manual:

```
GRIND_INSTAB  3.4
GRIND_CORRECT 3.6
GRIND_FRIC    0.55   // rails are SLOW. That is the trade for the score.
GRIND_POP     7.5    // ollie out carrying the speed you had
GRIND_MIN_SPD 4      // slower than this and you fall off it
```

`GRIND_FRIC` is the one people skip and it is the one that makes the choice real: if a rail
is also fast, there is no reason not to be on one. Yours currently *raises* speed to 6 on
lock, which is the opposite lever — worth a look even if you take nothing else here.

Also worth having: **name the grind from the angle you came in at.** Tiny Hawk picks
50-50 / Boardslide / Crooked off the dot of heading against rail direction. One line, and it
turns one trick into three.

---

## 3. The chain rule: bank only when you roll away clean

You bank on landing. The refinement is that a chain stays open while you are **airborne,
grinding, OR on the back wheels**, and only banks once you are rolling on wheels with
nothing balancing, after a short grace window (0.28 s in Tiny Hawk).

That one rule is what makes a manual across the flat worth more than the two features
apart — which is the entire reason to build §1. Score as `pending × distinct elements`
rather than a per-trick multiplier, so the chain rewards **vocabulary** rather than
repetition.

---

## 4. Landing judged twice, and fakie

You bail on `landingTurn`. Tiny Hawk judges two independent things:

* **heading** — board direction vs travel direction. Within ~41° (`LAND_TOL 0.72` rad) is
  clean.
* **the surface normal** — how much of your velocity went *into* the ground. That decides
  whether you keep your speed, separately from whether you bailed.

And **~180° is a fakie**: legal, worth more, not a bail. Flip the board to match and ride
away backwards. It is cheap to add, it is the most-noticed flavour in the game, and it
rewards a spin you did not quite finish instead of punishing it.

---

## 5. The Special meter (Tiny Hawk v6), if you want a session arc

Fills **only on banked lines**, never on tricks thrown. Spends on signature tricks. The
reason it works: it rewards *completing* a line rather than starting one, which is exactly
the behaviour a two-minute session wants to teach. Bails kill the meter.

---

## 6. The control question — you chose buttons; here is what the other road measured

CONCRETE uses buttons plus two sticks (the THPS shape). Tiny Hawk built **both** and made
the scheme a runtime toggle so they could be compared on one park. No verdict is being
handed to you — that is a hands question — but the flick-it side was measured properly and
the numbers are hard-won, so they are here rather than lost with the project.

**Skate's flick-it is two-phase**: LOAD the right stick down (the skater visibly crouches),
then FLICK it out. Where the stick ends up picks the trick; load depth × flick speed sets
the height.

```
LOAD_Y        0.42   // how far down counts as loaded
POP_Y        -0.2    // the pop must cross ABOVE centre
POP_SPEED     3.0    // stick units/sec of upward travel
RELEASE_Y     0.15   // a spring back toward centre also pops (v3)
RELEASE_SPEED 1.8    // deliberately forgiving for touch and real pads
SHUV_SPEED    3.4
FULL_SPEED   14.0    // a real thumb flick crosses in 50–80 ms
GESTURE_COOL  0.12   // one gesture, one action
REARM_MAG     0.45
REARM_SPEED   0.35
STICK_R       60     // CSS px, FIXED — see below
```

**`POP_Y` is the rule that makes it work at all.** Without requiring the pop to cross above
centre, a gamepad stick springing back to neutral on its own fires an ollie every single
time you crouch, and the scheme feels broken in the first ten seconds.

**`STICK_R` must be a fixed number of CSS pixels on every device.** The flick threshold is
measured in *stick units per second*, and a stick unit is a fixed amount of thumb travel —
scale the radius per screen and the same physical flick crosses the threshold on one phone
and not on another. An earlier pass scaled it and left the drawing and the normalisation
disagreeing.

The honest limit: **two flicks inside one air could never be verified headlessly.** A test
harness's own event latency (~40–150 ms per synthesized touch) is the same order as a real
flick, so the identical gesture lands on either side of the threshold run to run. The
classification was therefore extracted into a pure function and unit-tested with exact
timings instead. If you ever go this way, do the same — and keep the end-to-end path as a
smoke check only.

---

## 7. Traps that cost real days

Ranked by how much time they took and how invisible they were.

**A. `preventDefault` on `touchend`/`touchmove` kills every DOM button.**
Cancelling them unconditionally suppresses the click the browser synthesises from a tap, so
every button is dead under a thumb while working fine with a mouse. Tiny Hawk's menu was
unstartable on a phone — the game booted perfectly, the button just never fired, so the
symptom was "it only shows the menu". **Only ever cancel a touch you actually claimed on
`touchstart`.**
*You appear to have avoided this* — `skate.js` uses `touchAction: 'none'` plus pointer
capture on the canvas and does not blanket-cancel, and `main.js` fires on `pointerup` AND
`touchend`, which is the same conclusion `hub/shell.js` reached. Keep it that way; the bug
returns the moment someone adds a global handler.

**B. An airborne gesture needs arming, and the re-arm must run *while* cooling.**
Holding a flick out re-fired a trick every time the cooldown lapsed. Adding arming fixed
that and immediately broke the legitimate case — flick left, return, flick right fired only
once — because **the return stroke lands inside the cooldown window**, so gating re-arming
behind the cooldown leaves the stick permanently disarmed. Applies to any held-input verb,
buttons included.

**C. A stick that only binds when its slot is free leaves half the screen dead.**
If a `pointerup` is ever missed (a cancelled touch, a browser quirk), that half never
recovers. Always re-claim the half on a new press.

**D. A fixed vertical FOV crops narrow screens.**
`PerspectiveCamera.fov` is the *vertical* angle, so a 4:3 iPad sees ~86° across where a
16:9 desktop sees ~102°, and the narrow one reads as "zoomed in" — which is exactly how it
was reported. Hold a **horizontal minimum** instead: wide screens unchanged, narrow ones
open the vertical angle up. Relevant to you, since your camera is a chase cam on a phone.

**E. Stick rest positions must come off the short edge.**
A fixed `h - 130` puts the rings mid-screen on a 342 px-tall landscape phone — over the HUD
and nowhere near a thumb. Bottom corners, off `min(w, h)`.

**F. Bloom, if you ever add a composer.**
You have none today, and your mobile whiteout was an asset-tier problem, not this. But when
it comes: keep the threshold high (0.92) and HDR glow values *barely* over 1.0. A first pass
at threshold 0.35 with values up to 3.4 lifted the entire frame to white — and if the look
depends on a dark ground, bloom spill is the thing that destroys it.

**G. Heightfield winding** — only if you ever go procedural. Walking a grid in the obvious
order emits every triangle facing *down*, so the whole surface back-face culls and you see
its underside. Swap the last two vertices; do not reach for `DoubleSide`.

---

## 8. What NOT to take

Being explicit, because a hand-off that reads as a wish list is worse than none.

* **The heightfield park.** Tiny Hawk's ground is `h(x,z)` = max over analytic features,
  which is elegant and cannot hold a bridge, an overhang or an interior. You have modelled
  Blender geometry and a warehouse; that is the better answer for a game with a roof.
* **The protagonist.** A faceted fat bird was a strong identity for a near-black abstract
  park. You have a rigged human on a concave deck with twelve clips and IK — do not trade
  down.
* **The near-black Skate Story look.** It is a whole art direction, it fights a lit
  warehouse, and yours is its own thing.
* **The Part (Tiny Hawk v2's roguelike).** A 13-row branching map, a five-film economy,
  relics, story choices and districts. It is genuinely complete and it is *a second game
  bolted on top of the first*. Your two-minute session is already a closed loop. Only open
  this if someone asks for a meta-layer in their own words — and then read
  `../tinyhawk/js/{map,meta,goals,story}.js` rather than rebuilding it.

---

## 9. Where the code is

| what | file |
|---|---|
| flick-it gesture, pure `classify`, twin sticks, pad schemes | `../tinyhawk/js/input.js` |
| grind + manual state machines, landing/fakie, ballistic physics | `../tinyhawk/js/skater.js` |
| chain, banking, Special meter, goals | `../tinyhawk/js/{tricks,goals}.js` |
| heightfield park + rails as explicit segments | `../tinyhawk/js/park.js` |
| The Part: map, film economy, relics, story | `../tinyhawk/js/{map,meta,story}.js` |
| the design doc, with the measured numbers in §10b | `../tinyhawk/DESIGN.md` |
| one-button momentum physics, the ancestor of all of it | `../tiny2d/js/{skater,terrain}.js` |

One structural note worth stealing regardless of anything else here: Tiny Hawk keeps the
**gesture classifier as a pure function** — `(dx, dy, dt, armed, cooling) → verdict`, no DOM,
no clock — which is the only reason its thresholds could be asserted at all. `skate.js` is
658 lines with input, physics, scoring and rendering in one closure; if you ever need to
prove a control rule rather than feel it, that seam is where to cut first.
