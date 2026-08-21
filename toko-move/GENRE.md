# What the genre already knows

Research notes, 2026-08-21. Sources at the foot. Web access here is mostly
blocked — search worked, fetching pages did not — so these are search summaries
and my own knowledge of the games, not full readings of the primary documents.
Where something is a judgement rather than a reported fact, it says so.

---

## 1. Mini Metro and Mini Motorways are not the same game twice

This is the most useful thing found, because the owner has already named both as
layers and the reason it works is sharper than "they are both minimal".

- **Mini Metro's constraint is FREQUENCY.** Stretching a line to reach one more
  stop lowers how often a train calls at every stop on it. You control both the
  infrastructure *and* the vehicles — more trains on the busy line.
- **Mini Motorways' constraint is CAPACITY.** Length matters much less, because
  nobody waits for a departure. Cars take up room, and room runs out. And you
  control **only the infrastructure** — not the vehicles, not who travels. Cars
  each take the fastest route regardless of congestion, so you cannot manage
  traffic, only build for it.

**What it means here.** "Mini Motorways as the local car layer" is right for a
design reason and not only as a reference: it is a **different verb**. Metro is
*route people*; motorways is *provide room*. If the car layer let you assign
vehicles it would be the metro layer wearing a hat, and two local layers that
play the same are worse than one.

It also names the axis every future layer should be placed on before it is
built: **does this layer run out of frequency, or out of room?** Trucks
city-to-city are frequency. A port is room. A motorway is room. A rail line is
frequency until the track is full and then it is room.

## 2. Factorio already solved our open question

Factorio has two separate tiers, and the split is the answer:

- **A warning icon drawn ON the entity** for a persistent state — low power, out
  of ammunition. It says *where*.
- **An alert in a global tray** for an event — clickable to jump to the cause on
  the map, hovering puts arrows at the screen edges pointing at causes that are
  off-screen. It says *what*, and it says *there is one at all*.

And the list of alert types includes **`train_no_path`** — a vehicle that cannot
reach where it was sent is a first-class, named alert. The genre does not treat
"unreachable" as an edge case; it treats it as one of the handful of things
worth interrupting you for.

`PLAYTEST.md` found Toko Move drawing an unreachable passenger identically to
one about to board, with up to 61% of a queue in that state. Factorio's split
maps onto it directly: mark the **stop** (persistent, says where) and put a
**count on the strip** (global, says what and that it exists at all). The board
is small enough that edge arrows are unnecessary.

## 3. The flaw OpenTTD has and this game does not

From the OpenTTD manual, about its own model:

> In the real world cargo has a destination label, but in OpenTTD, passengers
> and cargo will jump on any vehicle that accepts them, even if it brings them
> back to where they came from.

Toko Move does the opposite already: a passenger has a destination *shape* and
boards only when the next stop is strictly closer to it. That is not a detail —
**it is the property that makes a multi-layer handoff possible at all.** A parcel
that arrives at a port still knows where it is going, so the next layer can act
on it. Anything added later must preserve it: a destination survives a transfer.

Worth stating as a rule, because it is the kind of thing a later layer breaks by
accident.

## 4. The handoff already has a proven shape

OpenTTD's **feeder service**: a local vehicle runs a short leg, *transfers* its
load at a hub, and a long-haul vehicle picks it up there. The transfer pays
**part of the fare, for the distance actually carried**.

That answers a question the layered plan has not answered yet: *how does a local
layer get credit for doing one leg of a longer journey?* It is paid for its
share. It also gives the "parcel gets stuck" idea a natural home — a stuck
parcel is one sitting at a transfer hub that the next layer has not come for.

## 5. Teaching: the first board IS the tutorial

Mini Metro has no meaningful tutorial. It opens on three shapes — circle,
triangle, square — and a handful of stops, and the constraint teaches. Complexity
arrives by the city growing, not by a lesson.

Toko Move already opens on exactly those three common shapes, which is right.
What it does not have is anything for the rules a growing board **cannot**
teach on its own:

- a shape you cannot reach (nothing to see)
- what the closing ring means (you learn by dying once)
- that water costs a tunnel (you learn by being refused)

Those are precisely the three that need saying, and precisely the three
`PLAYTEST.md` marked as untaught. Factorio's answer for that class is a
**state-triggered one-liner, shown once** — which the feed in this game can
already do.

---

## Sources

- Mini Metro / Mini Motorways design comparison — [Game Developer](https://www.gamedeveloper.com/audio/-i-mini-motorways-i-and-the-delicate-art-of-marrying-complexity-and-minimalism), [Chuniversiteit](https://chuniversiteit.nl/well-played/mini-motorways), [The Gemsbok](https://thegemsbok.com/art-reviews-and-articles/mini-motorways-metro-comparison/), [Medium: Elegant Constraint Optimization](https://medium.com/gaming-is-good/mini-metro-and-mini-motorways-the-art-of-elegant-constraint-optimization-2571a32fdfe2)
- Factorio alerts — [Factorio Wiki: Alerts](https://wiki.factorio.com/Alerts)
- OpenTTD transfers and feeder services — [Feeder service](https://wiki.openttd.org/en/Manual/Feeder%20service), [Orders](https://wiki.openttd.org/en/Manual/Orders), [Passenger and cargo destinations](https://wiki.openttd.org/en/Community/Patches/Passenger%20and%20cargo%20destinations)
- Mini Metro background — [Wikipedia](https://en.wikipedia.org/wiki/Mini_Metro_(video_game)), [Dinosaur Polo Club](https://dinopoloclub.com/games/mini-metro/), [Human Transit](https://humantransit.org/2014/12/learning-how-transit-works-from-mini-metro.html)
