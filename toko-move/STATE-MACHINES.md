# Toko Move — the state machines

Every machine in the game, where it lives, and whether it is explicit. Two were
implicit and central, and are named in code since v3.20. The rest are small,
each held in one module, and listed here so a person or an agent can find them
without reading the code first.

## Explicit (v3.20)

### 1. The run — `js/journey.js` `STATES`, `stateOf(s)`, `check(net, s)`

What card the run is showing. It used to be the precedence chain inside
`card()`: `phase` (dispatch, stop, halt, perk, end), plus the flags beside it
(`fork`, `offer.brief`, `pending`). It is now one table:

| state | the card | may go to |
|---|---|---|
| `dispatch` | a job: take it / ask for another / express | dispatch, story, route, halt, end |
| `fork` | two jobs at once, or a coin | story, route, halt, end |
| `errand` | a mission's job: take it / slow / express (or race) | story, route, halt, end |
| `story` | a story card at the stop, aboard or on foot | route, halt, story, perk, dispatch, fork, errand, end |
| `halt` | a halted line: another way / wait / taxi | route, story, perk, dispatch, fork, errand, end |
| `route` | where to go from this stop | route, story, halt, perk, dispatch, fork, errand, end |
| `perk` | between jobs: two perks or the cash | dispatch, fork, errand, end |
| `end` | — | — |

- Each state's `holds` says what must be true in it. For example, a `route`
  has a job and its options, and a `perk` has no job and two perks on offer.
- `check()` adds the run-wide rules: the clock stays on the shift, the counts
  agree, and every card has three buttons (a sealed dead end may have one).
- `card(net, s).state` names the state of every card.
- The table changes no rule. Before and after, 116,907 steps over the four
  runs and six missions hash identically.
- `test/journey.mjs` §7d plays 4,000 runs and checks every step against the
  table: the conditions hold, and the transitions are all in it.

### 2. The screen — `js/play.js` `UI`, `uiState()`

What the player is looking at. It used to be loose variables: `S`, `busy`,
`skip`, `boardOpen`, and the title and end veils. It is now named, and derived
from those same variables, so it cannot disagree with them:

```
loading → title → card ⇄ moving        (a hop, a moment, a reveal, a stamp; a tap hurries it)
                  card ⇄ board         (the whole map, from the corner; a tap closes it)
                  … → end
```

- The page wears it: `body[data-ui]` is the screen and `body[data-state]` is
  the run's state.
- `__tm3.machine()` reports both, with where the run may go next, the card's
  options (label, price, tier) and anything `check()` finds.
- **Keys 1, 2, 3 answer the card** whenever the screen is `card`. That works
  on the cabinet's keyboard, and through `hub/padkeys.js` for a pad.
- `test/play.cjs` plays a whole shift from the keyboard alone, reading the
  machine at every step.

## Implicit, and fine as they are

Each lives in one place, is small, and already has a test.

| machine | where | states |
|---|---|---|
| A halt | `journey.js` `s.halt`, `halted()` | waiting (before `from`) → on (`from ≤ clock < until`) → met (`haltSeen`, the card shown once) → lifted (waited out, two jobs after it began, or the time ran out) |
| A job | `journey.js` `offer` → `job` | offered → taken (its limit set; express ×0.7, slow ×1.3) → delivered on time, delivered late (+ a strike where a run counts them), sold, or lost when the shift ends |
| The sealed parcel | `journey.js` `job.sealed` | a sticker → revealed (riding its line, the kiosk, a lucky shake) |
| The race | `journey.js` `offer.rival` → `job.rival` | offered → racing (`until`) → won or lost at the drop; a coffee ends it before it starts |
| Strikes | `journey.js` `strikesOf()`, `s.strikes`, `s.failed` | 0 … n−1 → struck out (the run ends, and is not complete) |
| The ladder | `runs.js` `unlocked`, `record`, `starsFor` | locked → open → done (★ to ★★★); the daily and the week open after NIGHT |
| The missions | `missions.js` `missionOpen`, `recordMission`, `perkPool` | locked → open → done; each first finish opens the next and grows the perk pool |
| The daily and today's errand | `daily.js` `recordDaily` (the errand on its own key, `modes.js` `errandStore`) | unplayed → the first finish stands → practice |
| The week | `week.js` `resume`/`begin`/`progress`/`close`/`isOver`/`verdict` | Monday … Friday → over (the rent paid, or short) → a new week |
| The city's memory | `runs.js` `loadMemory`/`remember`, `cards.js` `ARCS` | each arc's counter only moves forward; the next step is dealt when its count is reached |
| Which shift this is | `modes.js` `resolveMode` | run, daily, week, mission (and the errand) |
| The real-time game | `main-v212.js`, `core-v212.js` (`?classic`) | the older game, kept as it is |

## The rule

A machine that grows past one module, or past a test that can see all of it,
gets a table like the two above: named states, the conditions each keeps, and
the transitions allowed, with a test that holds every step to them.
