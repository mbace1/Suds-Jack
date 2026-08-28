# Toko Move — where this is going

## Owner's direction, 2026-08-20

Recorded verbatim, because it reframes the cabinet from "a Mini Metro clone" to
"the first layer of a game about moving things":

> also aim to add multiple layers of traffic and commerce of moving things.
> metro moves people. trains and trucks move stuff. Mini Motorways will be a
> local car layer. trucks and trains will be a city to city layer. air and sea
> will be continental scale.
>
> we start with the local layers but eventually we will cover global traffic and
> a mission/challenge can follow a parcel from china to Sweden on all of these
> layers.

So the shape is four scales, and the shipped game is one cell of it:

| scale | moves people | moves goods |
|---|---|---|
| **local** | **metro — SHIPPED (v2)** | cars / Mini Motorways |
| **city to city** | — | trucks and trains |
| **continental** | — | air and sea |
| **global** | the parcel run: China → Sweden, across every layer above |

## What the shipped v2 already supports, and what it does not

Worth knowing before anyone designs on top of it.

**Already layer-shaped.** `world.js` (the board), `lines.js` (network + routing),
`sim.js` (the tick), `render.js` and `input.js` are separate and talk through
small interfaces. The routing solve in `lines.js` is generic: it is a hop count
from a stop to the nearest stop *satisfying a goal*, and it does not care that
the goal is currently a shape. A second layer with different vehicles can reuse
it unchanged.

**Not yet.** Three things are wired to the people-metro specifically:

1. **A passenger is a bare string** — the goal shape, nothing else. Goods need
   at least weight, bulk and a deadline, and possibly a value. That is a type
   change at the centre of `sim.js`.
2. **One board, one clock.** `DAY` is 8 real seconds. A container ship is weeks.
   Layers at different scales cannot share a clock, and the handoff between them
   is where all the design difficulty lives.
3. **Failure is one rule** — a stop over capacity for 45s ends the run. A
   logistics layer probably wants lateness and cost, not sudden death.

## Decided, 2026-08-20

Answers to the ten questions above. These are owner rulings, not proposals.

1. **One game.** A single traffic simulator, one cabinet, layers inside it.
2. **Prototype plays one layer at a time** with the others ticking in the
   background; the end state is all layers live with zoom between them.
3. **A clock per layer, and every clock is a mission variable** — adjustable per
   challenge. There is no house tick rate.
4. **Handoffs are automatic, but a parcel can get STUCK.** Getting unstuck is
   inner politics: a short narrative choice. The China→Sweden parcel is only
   *one* mission type.
5. **Layers are near-clones that differ by variables.** The base is a Mini Metro
   layout; the same grid can become a food-delivery mini game. Every layer
   exposes transport space, speed and the rest as knobs. Some layers let you
   build and enlarge stations. **Most missions run about ten minutes**, the
   Mini Motorways length.
6. **All three: delivery, money and optimisation.** Public transport scores
   people moved and how well; goods on the bigger and international layers make
   money management the point. The ambition is one family of layers from
   satellites down to the people next door, everything congesting naturally and
   everything trying to optimise.
7. **Abstract by default, approximate-real where it is fun.** Real maps are good
   for festivals and public transport; the abstract boards can sit close to real
   ones. Missions are pre-designed, so *close enough is fun and exact is not
   required*. The world is not cloned — later missions approximate real places
   while jumping across more layers.
8. **The fail rule is per mini game**, so it is a mission variable like the rest:
   sudden death on one, lateness and cost on another.
9. **Many layers, and a mission declares which it needs** — some want one, some
   several. Local car and city-to-city both come.
10. **A scripted mission early, to find the seams.**

## What this makes the next piece of work

Not a second layer. A **mission format**, because every answer above turns some
constant into a mission variable:

- clock rate (3), transport space and speed and station building (5),
  win condition and scoring model (6), board source (7), fail rule (8),
  which layers are in play (9).

So the next build is:

1. **`missions.js`** — a mission declares its layers, each layer's clock, its
   board, its spawn model, its resources, its goal and its fail rule. Nothing
   in `sim.js` keeps a number of its own.
2. **The shipped endless game becomes mission zero**, expressed in that format
   and playing exactly as it does now. If it changes, the format is wrong.
3. **"The Festival"** — the owner's own example, and the honest seam test:
   an evening map, a festival that ends at midnight, everybody walking to the
   nearest station at once, about ten minutes, a real win condition. Same layer,
   no new vehicles, and it exercises the clock, the surge, the goal and the
   fail rule all at once.

A second layer is worth starting only once a mission can say "I want two".

## Answered, and built (v3)

1. **All five kinds**, per mission: deliver, survive, hold, escort, budget. The
   last two are stated but refused at load until cargo and money exist.
2. **Seeded boards.** The Festival is different every attempt.
3. **A campaign spine plus free select** for anything cleared.
4. **The endless city survives** as its own mode under Free play.
5. *(still open — see below)*
6. **Length is per-mission**, another variable. The Festival is 600s.

## Built (v7) — the car layer

`layer: 'roads'` in a mission swaps the transport and nothing else: the people,
the unreachable mark, the give-up fuse, the crowding gauge and the end card are
the same code. The Rush is the first mission on it. What that proves for the
plan above is the important part — **a layer is a variable, not a fork** — and
it is what the city-to-city and continental layers will be built as.

What it deliberately does NOT have, because Mini Motorways does not: any way to
assign a vehicle. If a second local layer let you route the traffic it would be
the metro layer wearing a hat.

## Cities — owner's direction, 2026-08-23

Real cities' public transport on a minimalistic map, in the same layers as the
abstract boards, with live positions and GPS so the app can be used to actually
catch a tram. **`CITIES.md` holds it** — the direction verbatim, what was
verified about the APIs and the licences, the seam that is built, and six open
questions. The abstract boards stay primary; Cities is adjacent, not a
replacement, and it does not reverse the 2026-08-19 call that took Helsinki out
of the base game.

## Built (v10) — the third item, and the layers meet

*"1 a, 2 a, 3 a, we can add b later"* (2026-08-24). **The Handover** runs the
metro and the roads at once, and one load crosses between them: a `Passenger`
with **legs**, each naming the layer that may carry it. It stands in the
ordinary queue and competes for the same trains as everybody else, because the
city carrying on around it is the point.

Stuck is **mechanical only** for now, as asked. When a leg's layer cannot reach
its goal the load is marked by the machinery that already existed — the stranded
mark and the give-up fuse read it without knowing what it is — and nothing
narrates it. The seam for the short narrative choices is deliberately NOT built:
it goes in when there are words to put in it.

## Still open

1. **What does a narrative choice look like?** The stuck parcel and the "inner
   politics" of getting it moving again. Options as they stand: a card that
   pauses the game like the upgrade beat; a ticker you may ignore, where
   ignoring it is itself the choice; or a timed pause that decides for you.
   **No seam has been built for this yet, deliberately** — it is easier to add
   the right one later than to unpick a guessed one.

## Next, when the word comes

The format can now say "this mission wants these variables". It cannot yet say
"this mission wants two layers". That is the next piece: a mission listing more
than one layer, each with its own clock, and a handoff between them. The obvious
first pair is the local one the owner named — metro for people, cars for the
local goods layer — because both are local scale and neither needs cargo,
money or a world map to exist.

Cargo (`payload`) and money are the two capabilities the goal format already
names and the sim does not have. Adding either unlocks the goal type that
depends on it, and `CAPABILITIES` in missions.js is the one place that changes.
