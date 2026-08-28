# Freight

*Owner's direction, 2026-08-25: "yes let's prototype and design freight
gameplay." The vision line it comes from is "metro moves people, trains and
trucks move stuff."*

This is the design. It is written against what the game already does rather
than from a blank page, because that is the house rule: **all design should
have previous design to work on**.

---

## 1. What already exists, and what it proves

Freight is not a new idea in this codebase. v10 shipped **the load**: a
`Passenger` carrying `legs`, an ordered list of `{ layer, goal }`, booked so
that only the named layer may pick it up. v11 gave it a **van** on the road
layer. Between them they establish four things freight can lean on without
being rebuilt:

| already true | where |
|---|---|
| a thing can be routed across more than one layer | `Passenger.legs`, `Game.arrived` |
| a vehicle can be barred from carrying something | `p.layer` vs `net.layer` |
| a goal can follow one object rather than a count | `GOALS.escort` |
| a mission can declare a capability it needs | `CAPABILITIES`, `validate()` |

And one thing it must NOT lean on: the load is **one** object, spawned once,
with a hand-authored leg list. A freight economy is a *stream*, and a stream
needs a producer and a consumer, not a script.

## 2. The core claim

> **People choose. Goods are sent.**

A passenger picks a shape they want to reach and gives up if nobody takes them
there. A crate has no opinion: it is put on a platform by a place that makes
things, and it waits — indefinitely — for a place that uses them. That single
asymmetry is where every freight rule below comes from, and it is what stops
freight being "a passenger with a different sprite".

Three consequences, and they are the design:

1. **Freight never gives up.** The give-up fuse (`giveUp`) is what keeps a
   badly-served passenger board from growing forever. Freight has no fuse, so
   neglect *accumulates* — a yard you stop serving fills, and a full yard is a
   platform people cannot use either. Freight competes for **space**, where
   passengers compete for **patience**. Those are different pressures and the
   game currently only has one.
2. **Freight needs its own room on the vehicle.** A crate takes seats a person
   would have had. That is the decision the player actually makes every time
   they convert a carriage: *this line now carries goods and fewer people*.
3. **Not every layer carries it.** The three layers stop being reskins the
   moment they disagree about this:
   - **metro** — a line can be given a **goods van** in place of a carriage.
   - **roads** — a **lorry** in place of cars, which is the van from v11 grown
     up: it is the layer with no schedule, so it is the flexible one.
   - **bus** — **carries nothing**. A bus is for people. This is the cleanest
     way to make the bus layer a real choice rather than a slower metro.

## 3. Where crates come from

A **works**: a station that makes something and a station that wants it. Two
options, and the second is the recommendation.

**(a) A new station kind.** A depot/factory drawn differently, spawning crates
on a timer. Honest, but it adds a whole species to `world.js` — spawn rules,
placement rules, art — before anything is known to be fun.

**(b) A flag on an ordinary station** — *recommended*. Any station may be
marked `makes: <shape>`, and it puts a crate on its own platform every N
seconds bound for that shape. Nothing else changes: it is still a stop, still
takes people, still crowds. The mission decides how many works there are and
how fast they run, exactly the way it decides everything else. **This is a
mission-data change, not a world change**, which is what makes it cheap enough
to test and cheap enough to throw away.

## 4. What a crate pays

Open question, and it decides the goal type. Two candidates:

- **A count.** `deliver` already exists; freight would need its own counter and
  a `haul: n` goal. Nothing new to build, nothing new to read on screen.
- **Money.** `GOALS.budget` is already written and already refused at load
  (`needs: 'money'`, which is not in `CAPABILITIES`). Freight paying money is
  what would turn that stub on, and money is the thing every later layer —
  contracts, upgrades you buy rather than are offered — hangs off.

Money is the bigger door. It is also a HUD change, an upgrade-screen change and
a balance surface, so it should not be opened by accident. **Recommendation:
ship the prototype paying a count, and turn on money in the version after, once
the carrying rules are known to work.**

## 5. The first mission — "The Yard"

- `layers: ['metro', 'roads']` — the two that can carry it.
- Two works on the board, each making a shape somebody else consumes.
- `resources` gain `vans` (metro) and `lorries` (roads).
- Goal: `haul: n` alongside a `deliver: n`, so the city cannot be abandoned to
  serve the yard — the same shape The Handover proved works.
- Fail: overcrowding, unchanged. A yard nobody serves is what causes it.

## 6. What would make this a bad idea, and how it would show

Written down in advance so the measurement can be honest:

- **If a crate is just a passenger who waits longer**, the layer rules are not
  doing any work — the tell is that a board with `vans: 0` still hauls.
- **If freight is strictly better than passengers**, everybody converts every
  carriage — the tell is the win rate going UP when the freight goal is
  removed but the vans are kept.
- **If freight never threatens anything**, the accumulation rule is too weak —
  the tell is a run that ignores the yard entirely and still wins.

Each of those is a sweep, not an opinion, and each has an obvious first dial.

## 7. Open, for the owner

1. Count or money (§4).
2. Does a crate ever **spoil**, or does the pressure come only from the space
   it takes? Spoilage is the classic answer and it re-introduces a fuse, which
   is exactly the thing §2 says freight should not have — so the recommendation
   is **no spoilage**, and to let a full yard be the whole punishment.
