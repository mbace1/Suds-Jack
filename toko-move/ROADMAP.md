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

## Open questions

Put to the owner 2026-08-20; **unanswered**, so nothing below is decided and no
work should start from it.

1. One cabinet with layers, or separate cabinets on the arcade floor?
2. Are layers played at once (zoom between them, all live) or one at a time?
3. What crosses a boundary — is the port/terminal automatic, or a thing you build?
4. Do goods use the shape language, or their own (weight, bulk, deadline)?
5. Does each layer keep its own clock, and if so what does "meanwhile" mean?
6. Is there money, or is delivery still the only score?
7. Does the real world come back at continental scale, after "forget Helsinki"?
8. Is the parcel run a later campaign, or the spine everything is designed for?
9. Which layer is built second?
