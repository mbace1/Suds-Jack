# Toko Move — handoff

*For whoever picks this up next, agent or person. Read this first, then
`GENRE.md` (what the game is), then the top three entries of `VERSIONS.md`
(what just happened, and the traps).*
*Repo-wide conventions and review severities are in `/AGENTS.md`.*

---

## 1. What it is, in four lines

A Mini Metro homage — **an homage, not a clone**, so colours, shapes and
wording deliberately differ. Every stop is a shape; everyone waiting on one
wants a different shape; you draw the network that gets them there. Canvas 2D,
vanilla ES modules, **no build step and no image assets**. It is a cabinet on
the arcade at `index.html`, entry `toko-move/index.html`.

The distinguishing idea is **layers**: one board, more than one transport
running on it at once, each a near-clone of the others differing by *variables*
rather than by code. Three exist.

| layer | verb | vehicle | what it owns |
|---|---|---|---|
| `metro` | route people | train | lines, carriages, tunnels |
| `roads` | provide room | car (a **van** when it carries a load) | squares of road, bridges |
| `bus` | route people, on the streets | bus | routes, buses — legs must follow laid road |

`bus` is `Network` with a router on its lines. That reuse is the design, not a
shortcut: two boarding rules would drift apart.

## 2. Where the code is

Read in this order. Every file opens with a comment saying **why it is shaped
the way it is** — those comments are the design record and are expected to be
kept up to date by whoever changes the code under them.

```
js/missions.js   ALL tuning lives here. If a number can be found in sim.js,
                 world.js or lines.js, it is in the wrong file.
js/sim.js        the run: the clock, the layers, scoring, goals, upgrades
js/world.js      stations, passengers, spawn; Passenger.legs is the parcel
js/lines.js      Line/Train/Network — the boarding rule, the hop solve
js/roads.js      the road grid, cars, lanes, bridges, carRange
js/bus.js        BusNet extends Network; the street router and the traffic coupling
js/render.js     everything drawn
js/input.js      two drawers: LineDrawer (takes its network as an option) and
                 RoadDrawer
js/city.js       the Cities seam — real networks projected onto a board
```

Docs: `GENRE.md` (sources and what was taken from each), `ROADMAP.md`,
`PLAYTEST.md` (measurements), `CITIES.md` (real-city data, licences, open
problems), `FREIGHT.md` (the next feature's design), `VERSIONS.md` (the log
and the trap index).

## 3. The gates

```bash
node toko-move/test/core.mjs                              # 462 checks, bare node, ~1s
NODE_PATH=$(npm root -g) node toko-move/test/smoke.cjs    # 132 checks, Playwright
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs          # the cabinet
NODE_PATH=$(npm root -g) node test/deploy-check.cjs       # only before a deploy
```

All three of the first must be green. Both Toko Move gates now run in CI
(`.github/workflows/gates.yml`, the `flow-core · piritori · toko-move` job).

**Mutation-test every check you add.** Break the thing the check names, watch
that check and only that check fail, put it back, and say so in `VERSIONS.md`.
This is not ceremony — see `/AGENTS.md` §4 for the four checks in this project
that proved nothing until they were rebuilt.

**The core gate proves *works*. The page gate is the only one that can see
*looks*** — it samples the canvas. A drawn thing with no pixel check is a thing
that can vanish silently, and has, twice.

## 4. Rules that will get a change rejected

- **No build step. No image assets.** Everything is drawn in code.
- **One `?v=` token per module**, and all of Toko Move's move together. Bump
  them when the bytes change: `grep -rl '?v=N' toko-move | xargs sed -i
  's|\.js?v=N|.js?v=N+1|g'`. **Do not touch `../hub/shell.js?v=`** — that token
  belongs to the arcade and differs per branch.
- **Every game change gets a top entry in `VERSIONS.md`**, and the entry says
  what was measured, not what was intended.
- **Tuning goes in `missions.js`.** A constant in `sim.js` is a finding.
- **Balance claims are measured, not asserted.** The pattern is a bot that
  plays a "reasonable player" over 8–16 seeds; `VERSIONS.md` records the table.
  A target number with no sweep behind it is not done.
- **Deploys**: `gh-pages` only, never regenerate `hub/versions.json` (use
  `node scripts/versions.mjs . --check`), deploys never merge. The owner says
  when. Nothing since v9 is deployed.

## 5. The campaign

**Chapters are cities** (owner, 2026-08-26). `CAMPAIGN.md` is the write-up.
Chapter one is real Helsinki, built from the committed HSL and OSM extracts —
`node scripts/city-pack-helsinki.mjs` rebuilds the pack. The abstract boards
(The Rush, The Handover, The Number 7, the endless city) are FREE PLAY now, not
the spine. Nagoya, New York and Tokyo are listed and locked until their networks
are brought in; `scripts/city-pack.mjs --city hsl` is the keyless one-command
upgrade to the whole Helsinki feed on a networked machine.

## 6. Where it stands right now

Branch `claude/toko-move-graphics-zti7gj`, PR **#306**. Live on `gh-pages` is
**v9**; v10, v11 and v12 are on the branch, held at the owner's word (*"wait"*).

- **v10** The Handover — two layers at once, one load with legs.
- **v11** the van — the road layer runs one vehicle; a marked load rides a van.
- **v12** the bus layer and *The Number 7*; plus `Line.spaceIn`, which fixed a
  bug the metro layer always had (every vehicle was constructed at seg 0, so a
  second train rode inside the first — fourteen buses carried what three did).
- **v13** the campaign became cities; chapter one is real Helsinki.

## 7. The next task: freight

**Read `FREIGHT.md`.** It is the design and it names its own recommendations.
The short version: *people choose, goods are sent* — so freight never gives up,
takes seats a person would have had, and is not carried by every layer (a bus
carries people; that is what stops the bus layer being a slower metro).

Two questions were put to the owner and are **not yet answered**. If they are
still open when you start:

1. **Count or money.** Build the count (`haul: n`); do not turn on the `money`
   capability. It is one line in `CAPABILITIES` and it opens a HUD, an
   upgrade-screen and a balance surface at once.
2. **Spoilage.** Build it without. A timer re-introduces the exact fuse
   §2 of `FREIGHT.md` says freight should not have.

A build order that keeps every step measurable:

1. `makes: <shape>` as a flag on an ordinary station, driven from mission data.
   No new station species. A crate is a `Passenger` with `freight: true` and no
   give-up fuse.
2. The carrying rule: a crate boards only a vehicle with freight room. Metro
   converts a carriage to a **goods van**; roads convert cars to **lorries**;
   the bus layer refuses. Reuse the `p.layer` / `net.layer` booking that v10
   already proved — do not invent a second gate.
3. The accumulation: a crate that is never collected stays, and a full platform
   is the punishment. Check this actually bites before adding anything else.
4. The mission ("The Yard", `FREIGHT.md` §5) and the sweep. §6 lists three ways
   the feature can be quietly pointless and the tell for each — **run those
   three, and put the table in `VERSIONS.md` whichever way it comes out**.

## 8. Open elsewhere, if you want a different job

- **The sea.** Töölönlahti is coastline, not a polygon, so it is not wet ground
  on the Helsinki board. Three closures were tried and each finds a different
  subset; `seaRings` is kept behind a flag and the gate pins what it does.
  `CAMPAIGN.md` §5 and `CITIES.md` have it.
- **The octolinear fitter** (`js/city.js`) reaches 46% on real data against
  100% on synthetic, and the core gate *asserts that failure* so a fix breaks
  the gate loudly. It is structural — 34 of Kallio's 65 stations have more than
  four legs — so it needs replacing, not tuning. `CITIES.md` has the analysis.
- **Real city packs beyond Kallio** need a networked machine; this sandbox can
  only reach `raw.githubusercontent.com`. `scripts/city-pack.mjs` is keyless and
  ready. Owner's order: Helsinki → Nagoya → New York → Tokyo.
- The **crowding/repulsion term** in the layout is unbuilt.
