# Toko Drop 2.0 — Version Log

<!-- Rules:
  - A new top `## vN — YYYY-MM-DD` entry, with a bold one-line title and
    bullets, for EVERY commit that touches game files. Game files are
    everything except docs (*.md), scripts/, test/, .github/ and spec/.
  - `scripts/bump-version.sh <N>` moves the `?v=N` cache tokens, the HUD
    label (`2.0 · vN`) and this file's stub together. Fill the stub in
    before committing: the hook refuses an entry that still says TODO.
  - At each multiple of 10, roll the previous decade into the Archive
    below, one line per version.
  - `scripts/pre-commit` checks the commit being made, not the disk. It
    refuses a game-file commit that does not change this file, leaves a
    malformed top entry or an unfilled stub anywhere, skips an archive, or
    carries a version that origin/main already has. Main is what Pages
    serves, so changed bytes under a released `?v=N` would sit stale on
    phones. Install it once per clone:
      cp scripts/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
    Never `--no-verify`.
-->

## v28 — 2026-10-23
**Worlds 4-9 each have a floor of their own**
- THE CISTERN: stone slabs under shallow water, light off the surface wandering over them, the column bases standing in it
- THE BOILER ROOM: riveted steel plates, scorched, and grates the fire breathes through
- THE RIVER: dark water running the long way with its streaks moving, pebbled banks at both edges
- THE ICE SHEET: dark ice, deeper in places, cracked, frost along the cracks
- THE DEEP: black silt in slow ripples, lit only by specks of living light (THE DEEP's dark rule closes in over it)
- THE CORE: black, traced with circuitry; rings run out from the middle and light the traces as they pass
- Each world's rail, landing front and drain rim wear its own colour; the floors were toned down from the first renders so the gels stay the brightest thing on them
- Smoke: the world runs check each world's floor; the staged-pickups check clears the run's own gates first (a gate caught cooling down had its beam off, failing world 3 now and then)
- Cache tokens `?v=27` → `?v=28`; HUD label → `2.0 · v28`

---

## v27 — 2026-10-23
**Arcade becomes nine worlds and can be won; the title is ARCADE with a HARD switch, and the campaign**
- Title (owner, 2026-10-23): ARCADE beside INTRO, HARD · OFF/ON (on, ARCADE becomes HARDCADE and starts it; kept in `toko2.hard`), CAMPAIGN, OPTIONS. SURVIVAL is off the title (it still runs)
- Arcade is nine worlds (owner: "let's do both and make it 9 worlds"): the grid, the driveway, the sewer, then THE CISTERN, THE BOILER ROOM, THE RIVER, THE ICE SHEET, THE DEEP and THE CORE, each opened by the boss before it. Worlds 4-9 have their own size and colours (their own floors and gels come next)
- From the cistern on, each world plays under one of 1.x's world rules, as the campaign does: the cistern the line, the boiler room the updraft, the river the current, the ice sheet the slick floor, the deep the dark; THE CORE plays all five in turn, 20 s each
- The ninth boss wins the run: RUN COMPLETE, with the score
- Gates: `test/worlds.mjs` 29 (nine worlds, 3 → 4 under its rule, 9's boss wins, the core cycles); smoke checks the HARD switch, that SURVIVAL is off the title, and runs `world9`
- Cache tokens `?v=26` → `?v=27`; HUD label → `2.0 · v27`

---

## v26 — 2026-10-23
**The campaign's six worlds wear their own floors and play by their one rule each, as in 1.x**
- Each world's floor colour and rail are 1.x's depth looks: THE SURFACE, THE WELL (teal), THE VEIN (red), THE VOID (near-black), THE FOAM (pale aqua), THE KILN (amber)
- ONE RULE PER WORLD (1.x v264, `js/sim/rules.js`), drawn from the run's own seed so a room replays exactly:
  - THE WELL — the whole floor drifts on a current that slowly turns; you feel it as a lean to correct
  - THE VEIN — the rail flashes, then fires a line of shots across the room with a gap in it to run to
  - THE VOID — the dark closes in round you and opens again on a 9 s breath (gentler under REDUCE MOTION)
  - THE FOAM — the floor is slick: the stick sets where you accelerate, so you slide on after letting go
  - THE KILN — the rail flashes, then the floor shoves everything out from the middle
  - THE SURFACE keeps none: it is where the game is taught
- Gates: `test/campaign.mjs` 170 (+10: each rule does what it says, only in its world, and replays from the seed)
- Cache tokens `?v=25` → `?v=26`; HUD label → `2.0 · v26`

---

## v25 — 2026-10-23
**THE CAMPAIGN, from 1.x: eighteen rooms in six worlds, each with its own clock and goal, graded S to F**
- CAMPAIGN on the title opens the room list (1.x v263-v265): six worlds of three rooms, a world not reached yet one locked line, each room with what it asks and its best grade. A room opens when the one before it is graded above F
- A room is 1.x's authored level, its file copied as written (`levels/*.json`): its bodies arrive where and when it says, on its own clock. Goals: SURVIVE the clock, KILL a count (the room ends the moment you have it), NO HITS (one hit ends it)
- Grades are 1.x's: the share of the room's bodies put down, a step off for every hit (never below C); a quota by how far behind the arrivals you finished; F for a room you did not get through
- Shaped rooms: 1.x's arena shapes (`js/sim/shape.js`, its arena.js) — circles and rectangles, joined or intersected. Every wall clamps to the shape, the floor stops at it and its edge is the world's rail. On a portrait phone a room is laid along the screen (x and z swap)
- The HUD clock shows the goal and the seconds left; a clear goes back to the list with the grade, a death to the death screen with the grade, AGAIN and ROOMS. Progress is kept in `toko2.campaign`
- Not yet: the worlds' looks and their one rule each (1.x's current, line, blink, skid, furnace) — every room plays on the grid for now; BOOST LANE's Rush rules (2.0 has no Rush), so it plays as an arcade room
- Gates: `test/campaign.mjs` (160: every room both ways up plays to a grade, shaped rooms hold everything, the goals, 1.x's grades, the route); smoke opens the list and plays THREE RINGS to a grade
- Cache tokens `?v=24` → `?v=25`; HUD label → `2.0 · v25`

---

## v24 — 2026-10-23
**1.x's settings in OPTIONS: LANGUAGE, VOLUME, the announcer with its own volume, and REDUCE MOTION**
- LANGUAGE · ENGLISH / SUOMI / 日本語 (1.x's title chips): picked once, kept in `toko2.lang`, the whole game follows; the browser's language until then
- VOLUME 0-100% in quarters (1.x v81), kept in `toko2.volume`; replaces SOUND ON/OFF (a saved SOUND OFF reads as 0%)
- ANNOUNCER ON/OFF and ANNOUNCER VOL. (1.x v109, v137): 1.x's game-show lines through the browser's own speech, pitched down; off by default, as in 1.x. It calls the waves, the boss, clears, hits, streaks of five, pickups, bounties, a boss's turn, game over, and a new world (2.0's own lines). `js/announcer.js`
- REDUCE MOTION ON/OFF (1.x v81): no camera shake; the device's setting until it is picked (`toko2.motion`)
- Smoke walks LANGUAGE en → fi → ja → en and VOLUME through its quarters
- Cache tokens `?v=23` → `?v=24`; HUD label → `2.0 · v24`

---

## v23 — 2026-10-23
**OPTIONS, like 1.x: the title keeps the modes, every switch moves to one page, and the pause menu and the death screen open it too**
- Title: ARCADE / INTRO, HARDCADE, SURVIVAL, CAMPAIGN (soon), OPTIONS
- OPTIONS: DASH and GEL HP, GELS and WORLDS, SOUND and SPLATTER, BACK. BACK, Esc or Circle returns to where it was opened, focus on OPTIONS. DASH and GEL HP take effect from the next run (said on the page), the rest at once
- Pause: RESUME, OPTIONS, QUIT under the GOT YOU card; death screen: AGAIN, MENU, OPTIONS
- Smoke walks into OPTIONS by keys and by pad, checks the title carries no switch, and opens OPTIONS from the pause menu and back
- Cache tokens `?v=22` → `?v=23`; HUD label → `2.0 · v23`

---

## v22 — 2026-10-23
**Each new world has its own gel (HOPPA hops the driveway, WORMA swims under the sewer), and WORLDS · NEON on the title swaps in abstract floors**
- HOPPA (driveway, lime): squats and glows, marks a ring on the floor where it will land, hops 2.6 u high to where you are heading and lands with a slow ring of 8 shots. In the air it is over your head: it cannot touch you and bullets pass under it
- WORMA (sewer, pink): swims under the floor where nothing reaches it, only a bulge showing; comes up a few metres from you (the bulge swells and glows first), spits two fans of 5, and goes back down
- The worlds' own species join the draw at 4× (driveway) and 3× (sewer) the weight of one of 1.x's; world 1 draws exactly as before
- WORLDS · STREET / NEON on the title (kept in `toko2.worlds`, `?worlds=` for a link): NEON gives world 2 a hex lattice with waves pulsing out from the middle and world 3 the contour lines of a flowing current, both with 1.x's rail and nothing round them. STREET is the driveway and sewer as before. Takes effect at the next world change
- The title's switches are three rows now: DASH and GEL HP; GELS and WORLDS; SOUND and SPLATTER
- The GOT YOU card is back (1.x had it, v212): the death screen and the pause menu show the gel that landed the last hit — the real gel, alive and turning in its own box (rendered off-screen and drawn into the card, classic or SDF), its name in its colour, and one line on how to read it, in English, Finnish and Japanese (`js/gels-said.js`)
- Fixed: v21 pasted the SPLATTER switch's function into two other functions as well (harmless, unused); gone
- Gates: `test/species/hoppa.mjs` (16), `test/species/worma.mjs` (14); smoke has a `world2-neon` run (hex to tide), checks the WORLDS switch and the pause menu's GOT YOU card
- Cache tokens `?v=21` → `?v=22`; HUD label → `2.0 · v22`

---

## v21 — 2026-10-23
**Splatter: kills throw real goo that pools, smears and dries on the floor — on by default, SPLATTER on the title turns it off**
- `render/goo-sim.js` + `render/goo.js`: thrown droplets fly, land, slide and stamp a wet film on the floor (16 texels a metre, stepped 30×/s), which dries to a stain; bodies walking through it smear it. Hits, kills, lob landings and cuts all throw it
- The floor reads the film in every world (grid, driveway, sewer, SURVIVAL), under the vortex hole and SURVIVAL's warning; a world change clears it with the floor
- Title switch SPLATTER ON/OFF (fi ROISKEET, ja しぶき), kept in `toko2.goo`; `?goo=off|on` overrides it for a link. Off is 1.x's droplets and puddles, as before
- Gates: `test/goo.mjs` (17); smoke checks the switch, that a kill lays film (and `?goo=off` lays none), and that no menu label is cut off
- Cache tokens `?v=20` → `?v=21`; HUD label → `2.0 · v21`

---

## v20 — 2026-10-23
**SURVIVAL is back, and its floor changes size as you play**
- **SURVIVAL's floor reshapes** (owner, 2026-10-23: "survival should be
  changing level size, like Sektori game. Abstract grid type visuals ok for
  that"). Sektori starts small and morphs every half minute or so; its floor
  lights up where it will change, then the new shape slams in.
  `js/sim/reshape.js` does that with the arena's rectangle:
  - the run starts on 0.55 × 0.6 of the run's 1.x arena;
  - 20 s in, and every 30 s after, the next size is picked, seeded and
    never the one you are on, from nine sizes of 0.55 to 1.35 of the arena;
  - the floor warns for 2.2 s: cyan where floor is coming, red where it is
    going, pulsing;
  - then the walls slam there in 0.45 s, carrying the hero and the bodies,
    and dropping the bullets they leave outside.
- The sim owns the walls (`w.hx`/`w.hz` wherever they are) and the events:
  `reshapeWarn`, `reshape`, `reshaped`.
- **How it looks**:
  - the grid floor is built at its biggest, with the walls as a uniform
    (`floor.js` `bounds`), so the grid stays put and only its edge moves;
  - 1.x's rail rides the walls;
  - the camera refits as they move, and past 1.x's arena size it follows
    you, as on the later worlds;
  - three warning blips and a slam with a shake;
  - puddles left over the void are cleared.
- **SURVIVAL is back on the title**, under HARDCADE.
- Gates:
  - `test/reshape.mjs` is new, with 14 checks in bare node: it starts
    small; it holds until the first change, then warns; the walls move,
    reach the size and carry the hero; every size is from the list and
    never the same twice; bullets left outside go; ARCADE never changes
    size; two runs from one seed are identical.
  - The sim suite's "no body leaves the slab" reads the slab as it is now.
  - The smoke's title wants SURVIVAL on it. Its landscape scenario plays
    SURVIVAL to the first change and checks four things:
    - the warning, the walls and the rail land on the new size;
    - the floor fits on screen after the change;
    - the warning goes out;
    - ARCADE's floor is back on the title.
- VERSIONS: v10–v19 rolled into the Archive.
- Cache tokens `?v=19` → `?v=20`; HUD label → `2.0 · v20`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

- **v19** (2026-10-23) — Worlds: the grid goes down a vortex to the driveway, the driveway down a drain to the sewer
- **v18** (2026-10-23) — The flick dash; the arena bigger and the right way round
- **v17** (2026-10-23) — Gates, pickups and the DASH pod; enemies dangerous on arrival; SDF gels on the title
- **v16** (2026-10-22) — The start intro, behind an INTRO button beside ARCADE
- **v15** (2026-10-22) — DRAPER and CLOAKER: all 27 of 1.x's gel types are in
- **v14** (2026-10-22) — The arena's light: shots and blasts light the floor, bodies cast shadows
- **v13** (2026-10-22) — Arcade juice: bullets glow, hits spark, kills flash and ring
- **v12** (2026-10-22) — PURP, PYRA, BOTFLY and BULWARK, and SLUG, REDD and SHEPHERD held to 1.x again
- **v11** (2026-10-22) — Jelly that dents when hit, and big gels die sliced in two
- **v10** (2026-10-22) — The first graphics pass: the gels are jelly now
- **v9** (2026-10-22) — Four more of 1.x's roster, and every earlier port held to 1.x
- **v8** (2026-10-22) — The bosses: OMEGA, the TWIN PRISMS and the WARDEN, as 1.x had them
- **v7** (2026-10-22) — A third dash on test: CUT goes through and hurts
- **v6** (2026-10-22) — The PUSH dash on test beside 1.x's, and tougher gels to push around
- **v5** (2026-10-21) — 1.x's rules underneath: a species module each, 1.x's crowd, score, hits and HARDCADE
- **v4** (2026-10-20) — 1.x's gelatin, on 1.x's floor, in 1.x's units — and ARCADE / HARDCADE / SURVIVAL
- **v3** (2026-10-19) — A game: twin sticks, six species, the night, HARDIVAL — playable from the menu
- **v2** (2026-10-19) — The slab fills the screen; the garage, lawns and street sit at its edges
- **v1** (2026-10-19) — M0: repo and rules — a blank night driveway with the version on screen
