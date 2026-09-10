# Slay Kallio — handoff

**For someone arriving cold.** Written 2026-09-10 against `claude/slay-kallio-project-3lv3l9`
at v26. `GDD.md` is the design authority and the root `CLAUDE.md` is the long
history; this is the short version plus **the state the project is actually in
right now**, which neither of those tells you.

---

## 1. What it is, in four lines

A deckbuilder — Slay the Spire 2's shape with Balatro's damage arithmetic —
fought on a **thick plank bridge** over a Kallio canal. Six playable bums, two
acts of six chosen spans and a boss each, events, rests, upgrades. The figures
are **painted cardboard and tin-soldier cutouts** that topple over in 3D when
they die, lit by one torch in a Darkest-Dungeon rig, standing in front of a
**photograph**.

Vanilla ES modules, **no build step**, three.js from a local `vendor/` copy.

---

## 2. Where it stands, and this is the part that will surprise you

| | |
|---|---|
| branch | **v26**, 24 commits ahead of `main` |
| **deployed** (`gh-pages`, `/Suds-Jack/slaykallio/`) | **v6** — twenty versions behind |
| a v26 deploy | **built, verified, and NOT landed** — see §7 |

**The live cabinet is not this game.** It has never carried `figures/` or
`bg/`, so on the site every person falls back to the code-drawn cutout and the
painted park stands in for all fourteen photographs. If you open the live URL to
form an opinion of the art, **you are looking at v6 with two whole asset
folders missing.** Run it locally instead.

---

## 3. Run it

No build step, but ES modules need a real origin — `file://` will not do.

```bash
cd /path/to/Suds-Jack
python3 -m http.server 8000
# then open http://localhost:8000/slaykallio/
```

**The first fight is DAYLIGHT, and that is not a bug.** `hourOf(state)` runs
0 → 1 across the whole run — afternoon, dusk, evening, night — and the light
rig, the backdrop photograph and the torch all follow it. Past dusk what spawns
is *mutated*. If you want to see the Darkest-Dungeon look immediately,
`__sk.setHour(0.85)`.

Useful URL parameters: `?seed=N` (the run is deterministic from it),
`?bg=<url>` (any photograph behind the bridge),
`?bg=<url>&stereo=sbs&eye=left` (one eye of a side-by-side stereo pair).

---

## 4. The gates, and what each one is FOR

```bash
node slaykallio/test/core.mjs                             # 758 checks, bare node, ~seconds
NODE_PATH=$(npm root -g) node slaykallio/test/smoke.cjs   # 135 checks, Playwright, ~3 min
node slaykallio/test/balance.mjs                          # is the run WINNABLE — not a gate
node slaykallio/test/bots.mjs [seeds]                     # the measuring instrument — not a gate
node slaykallio/test/bots.mjs --noise                     # re-derive the noise floor
```

- **`core.mjs`** is the rules. `engine.js` has no DOM, no three.js and no
  clock, so this asserts exact numbers in bare node (a Swing is 6, a doubled
  Swing is 12) and runs a bot over whole runs. It also enforces the
  **English-only** rule on every player-facing string in both skins.
- **`smoke.cjs`** is everything `core.mjs` cannot see: the puppets, the topple,
  the staging rules, the photographic plate, **both orientations**, the frame
  axis. Run it **serially** — three concurrent browsers starved a timing check
  in this very session and produced a failure that does not reproduce alone.
- **`balance.mjs` and `bots.mjs` never fail a build.** They are instruments.
  Read §6 before you believe a number either of them prints.

Two more that matter and live outside this folder:

```bash
node scripts/versions.mjs . --check                       # does versions.json agree with the logs
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs          # the arcade cabinet
```

`hub-smoke.cjs` currently **fails on a toko-drop navigation step**, and it fails
identically with every Slay Kallio change reverted. Not this lane's; don't
chase it.

---

## 5. The seam — drive it without playing it

`window.__sk` is how every test and every contact sheet works. You do not have
to win five fights to look at the sixth.

**`__sk.state()` is `null` until a run starts** — the page opens on the menu,
so reach for `start()` before anything that reads state.

```js
__sk.setSpeed(0); __sk.flush();      // drain the replay queue — nothing is timed off the clock
__sk.start('walker', 4)              // character, seed, straight into a fight
__sk.debug.jumpTo(25)                // any encounter by index; encounterCount() is 32
__sk.debug.look('bridge_king')       // that figure painted at FULL SIZE, as a canvas
__sk.debug.hand(['strike','defend']) // stack the hand, 9 energy
__sk.debug.playClip('attack')        // fire a verb without needing the fight to produce it
__sk.debug.scrub('attack', 0.31)     // HOLD a clip at an exact moment, then unfreeze()
__sk.debug.frameOf('hero')           // which DRAWING is showing (v25)
__sk.debug.poseOf('hero')            // the flex matrix — the honest "did it move"
__sk.setHour(0.85)                   // day 0 → night 1; the whole rig follows
```

**`scrub` exists because a frame grab is ~1s under SwiftShader and the whole
attack clip is 0.61s.** The first contact sheet ever taken here caught the lunge
once and the breath five times. It is a picture of the wall clock unless you
freeze it.

---

## 6. Read this before you trust a balance number

**The noise floor was measured in v24 and it is large.** Four independent blocks
of 150 seeds against *identical code* swing a single character's win rate by up
to **13 points**, while the mean across the six swings **2**.

- **Read the mean.** A per-character cell at 150 seeds is worth about ±6.
- The findings bar scales with the sample (v26) — at 400 seeds the floor is ~8.
- `greedy` is the **control column**: it imports the engine's own `botStep`
  rather than copying it, so it reproduces earlier recorded rates by
  construction. That is what makes the other columns mean anything.
- **`synergist` beats `greedy` by 17–22 points on two characters**, because it
  plays powers first and the card that counts what came before it last. Every
  balance number taken before v14 was measuring a bot that did not know what
  order to play in.
- **The whole-run matrix cannot see act two** (30–45% of runs reach it, and
  those draw six spans from thirteen). **`--act2` can**: it snapshots every
  arrival at the door and resumes it under every bot, floor 8 points. Its
  first reading is the most important number in this folder: **act two is a
  Bear check and almost nothing else** — 78–95% of act-two deaths are the
  Bear, ordinary fights kill nearly nobody, and the best line arriving in the
  best state still loses to him two times in three. The Cart Pusher (66%) is
  the only character who compounds hard enough to beat him.

Two characters are honestly weak and it is written down rather than papered
over: the **Park Drinker** is last for a structural reason (buzz does not
compound, so he cannot build into a boss), and `balance.mjs` will tell you the
**Dog Walker** is "STRANDED" at 5% — that is the greedy bot, which cannot play
her; `native` has her at 27%.

---

## 7. The deploy, which is prepared and not landed

A v26 deploy was **built and verified** — the browser gate run against the
gh-pages tree itself, served from the site root at the real path: 135 passed, 0
failed — and then **blocked by a permission rule** before the commit. It was
staged in a throwaway worktree, so it is gone with the container and would need
rebuilding. Doing so is ~15 minutes, and these are the rules it followed:

- **`deploy-hub.mjs` is NOT the tool.** Its `OWNED` list is the arcade *shell*;
  it ships no game folder at all.
- A game deploy is `slaykallio/` **minus `test/` and `art-src/`** (~6.9 MB).
- **`hub/games.js` and `hub/art.js` are THEIRS.** The live catalogue carries
  four cabinets this branch has never had (`concrete`, `tokotrip`, `flowsnow`,
  `piritori-godot`) — overwriting either file deletes them from the floor. The
  entry gets **spliced**; `art.js` needed no touch at all, because the `bench`
  marquee is byte-identical.
- **`hub/versions.json` gets ONE row by hand.** Never regenerate on the
  deployed tree, and do not reach for `--repair` either: it moves whatever else
  has drifted and widens a one-game deploy. (Two other lanes' rows are drifting
  right now. Theirs to take.)
- **Check the shell token against the SITE.** The branch asks for
  `../hub/shell.js?v=34`; twenty-three live pages ask for `?v=35`. Pin to the
  site's.
- **Check every file traces back to this branch's history** (tokens stripped,
  since a deployed file has been renumbered) before overwriting it. gh-pages is
  edited from more than one direction and a byte comparison tells you *that*
  two copies differ, never *which way*.
- **Deploys never merge.**

---

## 8. Traps that will cost you a day

- **A cutout is an unlit `MeshBasicMaterial` plane.** No scene light reaches it.
  The torch is *painted into* the texture, and `Arena.lightAt(x)` hands each
  figure a light LEVEL it multiplies into `mat.color`. Add a light and nothing
  happens.
- **`paintCutout` bakes once, at construction.** A figure whose plate has not
  decoded bakes the drawn fallback and keeps it, so **the preload is on the
  critical path** — anything built before it resolves has to be built again.
- **The plate replaces the PAINT, not the process.** A TURF plate still takes
  newsprint, torchlight, nicks, fibre and grime, because those passes are what
  make a figure belong to this bridge rather than to TURF's board.
- **Plates are sized off their INK, never their file.** Every one is padded
  differently; fitting to the file stands a short figure in the air and a tall
  one through the planks.
- **`preview()` and the real play call the same code.** Quoting a number you
  then do not use is the unforgivable bug in a full-information game. Do not
  add a second path.
- **Literal expectations rot.** Three separate gates have broken this way:
  twelve `hp === 68` checks failed at once on a 2-point HP change; `moves[2]`
  shifted when a conditional move went to the front of a list; a typed-out list
  of conditions broke when the engine grew two. Derive from the data.
- **A ruler can move with the thing it measures.** The deck-falloff check
  samples planks near the torch against planks far from it — but the rank light
  *follows the enemy row*, so a wider row flattens the very ratio being
  measured. It is pinned to encounter 0 now. Kindling learned the same lesson
  twice: *the page was right and the ruler was wrong.*
- **`offsetParent` is always null on a `position: fixed` element.** That broke
  a label-collision fix silently.
- **Never reuse a version number, and read the DEPLOYED log too.** This session
  wrote a TURF `v34` because v33 was the top of the log on this branch — the
  site already had a different v34 from another lane. Renumbered to v35.

---

## 9. Where to look first, honestly

**Good, and worth seeing:** the whole cast at full size
(`__sk.debug.look(id)` takes an enemy id OR a character id — 27 plus 6 — and
rendering all 33 is how four faults invisible in a fight were found), the
hour running
0 → 1, the topple, and the Dog Walker attacking — she is the one figure with a
drawn frame per beat and it shows.

**Weak, and known:**

- **Exactly two figures out of thirty-three can act.** The roster is 33 —
  **23 wearing TURF plates, 10 drawn in code** (every rat, blob, bird and the
  bear, which is the point of a lookup rather than an omission: a roster of
  street operators has no pigeon in it) — and of those 33 only `leopard` and
  `gunner` carry pose sets. Everyone else is a still card being moved. The
  mixed row now has three kinds of thing in it, and the Dog Walker is visibly
  the best-animated person in the game.
- **Act two is unmeasured** (§6), including both of v26's new conditions.
- **The Park Drinker does not compound** — a structural problem, not a tuning
  one.
- **Nobody has playtested this as a human.** Every number here came from bots.
  The GDD's own exit criterion is a feel question and no instrument in this
  folder can answer it.

**What it would take to animate the rest of the cast:** 12 generations against
a local reference crop, per character — the recipe is proven and written up in
`turf/art-src/sprites/cast/README.md`, and the 26 reference plates are cut and
waiting in `turf/art-src/sprites/cast/roster/`. **That step needs an API key,
which this environment does not have** (`node scripts/assets.mjs doctor`
confirms). It is the one blocked thing in the pipeline.

---

## 10. House rules you can break by accident

- **Everything player-facing is ENGLISH**, in both skins, and `core.mjs` fails
  on any Finnish left in a card, title, friend, enemy or encounter name.
  Personal names are exempt — a name is not a language — but characters are
  named by their **class** (the Park Drinker, not a first name), because a
  character select exists to say what the deck DOES.
- **The fantasy theme is a LOOKUP, not a second data set.** Every named thing
  carries a name in both skins.
- **`engine.js` is the rules and nothing else.** No DOM, no three.js, no clock.
  If you need the time in there, you have the wrong file.
- **Art changes end in a screenshot, never in a green suite.** A gate that
  certifies *works* cannot see *looks*. Four faults were invisible in a fight
  and obvious on a contact sheet.
- **A friend bends arithmetic you already do and never adds a verb.** A verb is
  a card's job.
- **No build step**, and three.js comes from `vendor/`, not a CDN.
