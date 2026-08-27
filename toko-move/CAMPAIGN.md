# The campaign

*Owner's direction, 2026-08-26: **"the game should have Helsinki as the first
option with a very detailed updated map — all the tram lines, real locations
around the city. Let's write this city up as chapter 1 of the campaign. Nagoya
is ch2, NY is ch3."** And: **"use the PR content and all live tracks to redesign,
and move other modes to secondary status."***

So the cities are the campaign now, and the abstract boards are free play.

---

## 1. Why a chapter is a city

On an abstract board the map is rolled from a seed. A stop is a shape and
nothing else; that is the whole fiction, and it works — it is why a passenger
can be read at eight pixels across. But every board is the same board wearing a
different arrangement, and nothing you learn on one is worth anything on the
next.

A chapter inverts that. **The map is fixed and the seed only decides who is
travelling.** The water is where the water is, the interchange is Hakaniemi, and
by the third mission you know that Kallio is across the bay and that everything
funnels through Rautatientori. That is knowledge a seed cannot give you, and it
is the reason the chapters are the spine rather than a side mode.

It also puts the game somewhere real, which is the thing the owner's original
"cities" note was about: with live data and a phone, the tram on the screen is
the tram at the stop. That is chapter one's endgame and it is not built yet —
but the board it would run on is.

## 2. The order

| chapter | city | why it is here | state |
|---|---|---|---|
| 1 | **Helsinki** | the network this repository already carries, under a licence that permits it | **playable** |
| 2 | **Nagoya** | six subway lines under a grid, and the Meijō line running a complete circle — a loop is a shape the game has no answer for yet | needs the network |
| 3 | **New York** | express tracks: a line that overtakes itself, and a map that has to say which train stops where | needs the network |
| 4 | **Tokyo** | thirteen subway lines under a loop that is not a subway at all | needs the network |

A chapter with no network is **listed and locked, not hidden**. The order is the
plan and a plan you cannot see is not a plan.

## 3. Chapter one — Helsinki

### The board

Central Helsinki, from the main station up through Kallio and Vallila to Pasila:
**60.17–60.20 N, 24.93–24.98 E**. Everything on it is real.

- **82 platforms**, folding to **~52 stations**, thinned to **21 on a board** —
  see §4.
- **Twenty live services**: metro **M1** and **M2**, and trams **1, 1T, 2, 3, 4,
  4T, 5, 5T, 6, 7, 8, 8T, 9, 9N, 10, 10B, 13** and the depot working **H**. Each
  with its own traced path, drawn quiet and thin under the board, which is what
  makes it Helsinki before you have drawn a single line.
- **The shoreline**, and the inland water that is a polygon in the data.
- Real names on every stop: Rautatientori, Hakaniemi, Sörnäinen, Pasila,
  Kalasatama, Linnanmäki, Eläintarha, Kansallismuseo, Kaisaniemi.

**It is a window on the city, not the city.** Lines run out of the box and stop
mid-route: line 4 does not reach Munkkiniemi here and the metro ends at
Kalasatama. The pack says so, and the mission card says so, because a clipped
line drawn as a short one is a lie about a place somebody lives in.

### The three missions

**1 · Aamuruuhka** — *the morning rush.* Rail only, seven hours, 14 stops. The
mission where you learn that the board is a place. Target **190**, measured: a
bot that keeps every stop on some line scores 165–341 across ten seeds, so 190
wins eight of ten. Every seed sees the final whistle — this one is lost to the
clock, not to the crowd.

**2 · Pitkäsilta** — *the Long Bridge.* Twenty stops, four lines, eight hours.
More city than there is network to hold. Target **244**, which wins seven of ten
on the same bot.

**3 · Ratikka ja auto** — *the tram and the car.* All three layers over one
Helsinki, which is the thing the whole mode was built for: rail, streets and bus
routes over the same ground, and the roads you lay for the traffic are the roads
your buses are stuck in. Target **162** — lower than mission one and harder,
because three layers over one city is harder than one layer over it. Measured,
not guessed.

## 4. What had to be decided, and how

A real network is not a board. Four decisions turn one into the other, and each
was wrong first in a way worth writing down.

**Which stops.** All of them is unplayable: central Helsinki puts tram stops 100
metres apart, which at this zoom is closer than a station is *drawn*. So stops
are ranked — services calling, then metro, then name for stability — and then
**thinned**: walk the rank and drop anything standing on somebody already taken.
The busiest interchange always survives; what is lost is the third stop on the
same square, never a district.

**What they are called.** Folding platforms by name leaves Päärautatieasema and
Rautatientori as two stations one metre apart, because Finnish compounds defeat
a word-boundary rule — *metroasema* is not *asema*. Folding by radius alone
works, but then the central interchange is called **Elielinaukio**, the bus
square, purely because that platform is first in the feed. So a fold's name is
chosen: group the variants by a crude stem, prefer the group that says it is a
station, and show the plainest member. That gets Rautatientori, Hakaniemi,
Sörnäinen, Kalasatama, Pasila and Helsingin yliopisto all right.

**What shape a stop is.** The game's alphabet is shapes and a real stop has no
shape, so this is the one thing assigned rather than read. A stop where the
metro meets the trams, or where four or more services call, is an interchange
and takes a **special** shape; everything else takes a common one by a stable
hash of its id. The result is that the specials are Rautatientori, Hakaniemi and
Sörnäinen — which is *true*, and which no rule invented for prettiness would
have found.

**What order they open in.** The growth loop is kept, and on a real city it
earns its keep: the board opens at the busiest interchange and grows outward,
which reads like a network being built. But rank alone put five interchanges out
first — every one a special shape — and nobody could reach anybody: thirty-one
people were marked *nowhere to go* inside the first minute. One special to every
two ordinary stops fixes it and keeps Rautatientori first.

## 5. What is not there yet

**The sea.** Water arrives as two kinds and only one is a polygon. The closed
bodies in this extract are *ponds* — the biggest is Alppipuiston lammet at 0.002
km². Everything that matters is coastline: an open, directed line with the sea
merely implied. Three ways of closing it into polygons were tried — out to the
nearest edge, along the run's own bearing, and a flood fill seeded from the
stops — and each recovers a different subset. All three find the outer sea and
the Kalasatama basin; none finds Töölönlahti. **Half a coastline drawn as fact
is worse than none**, so the board ships the water that is genuinely a polygon,
draws the shoreline as a line, and the reconstruction is kept behind a flag with
the gate pinning what it actually does. `CITIES.md` has the problem.

**The rest of Helsinki.** The box is the box the committed extract was fetched
with. The upgrade is one command on a machine with a network:

```
node scripts/city-pack.mjs --city hsl --out toko-move/cities/helsinki.json
```

It writes the same schema from the whole HSL feed — keyless, no account, no
secret. Nothing in the game changes; the board simply becomes the city.

**Chapters two to four.** Nagoya's and Tokyo's networks come through the Public
Transportation Open Data Center rather than one agency zip, and New York's from
the MTA under terms that need reading before anything ships. All three are
listed, locked, and honest about why.

## 6. The licences, which are conditions and not courtesies

- Timetable and geometry: **© Helsingin seudun liikenne (HSL)**, CC BY 4.0.
- Coastline and water: **© OpenStreetMap contributors**, ODbL 1.0.

Both are painted on the board, `city.js` refuses to lay out a pack that has lost
them, and the page gate samples the canvas to prove the credit is on screen
rather than merely in a variable.
