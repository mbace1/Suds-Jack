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

## v78 — 2026-10-31
**The waters differ: puddles on the sewer's flagstones and oil under the boiler's pipes, a murky channel, a river that flows; only the cistern keeps its sheet of water**
- The owner, 2026-10-31: "all the water in the levels looks the same. Some can have puddles, one this look but after that we need to differentiate." The sewer's channel, the cistern's floor and the river all drew their water the same way — a sine of a noise field, which makes the wavy caustic net — so three worlds and two campaign worlds (THE WELL, THE VEIN) read as one. Now (render/floor.js):
  - **The cistern keeps the net**: a flooded floor under a sheet of still water is what that look is.
  - **The sewer's flagstones have puddles** — real ones, where they had a darkening: standing in the hollows, the stone dark under them, the vault's dim teal reflected in them, a bright meniscus at the rim, and the light map's glow (bullets, kills) reflected in them through `wet`. **Its channel runs murky**: streaks stretched along the flow in two layers, foam along the kerbs, flecks going by.
  - **The river flows**: streaks stretched eleven to one along the current in two layers moving at different speeds, dark and deep down the middle, the pebble bed showing through the shallows toward the banks, foam along the banks' edge and flecks drifting; the lily pads stay.
  - **The boiler room has oily puddles** along its long sides under the pipe runs: the plate dark under a film with a faint thin-film sheen, the grates' fire reflected in them.
  - The deep stays silt. THE WELL and THE VEIN follow the river and the cistern.
- Shared pieces: `puddles(w, P)` (a mask with a soft edge and its meniscus) and `streaks(a, c, speed, stretch, scale)` (water running one way). Every number TUNING.worlds.floor.{sewer.puddle, sewer.murk, river.run, boiler.puddle}.
- Tuned on renders: the first puddles covered a third of the sewer in pale blotches (fewer, smaller and darker now), the oil's rainbow sheen was loud (0.18 → 0.07), the river's bands were stripes under the fight (softer and longer now).
- Cache tokens `?v=77` → `?v=78`; HUD label → `2.0 · v78`

---

## v77 — 2026-10-31
**World particles: embers over the boilers, snow on the ice, dust in the sewer's sun shafts, motes in the cistern's lamps, fireflies over the river, marine snow in the deep**
- The owner's third visual pick. One helper (kit.js `motes`): specks afloat in boxes of a world's own, each on a loop of its own up or down the box (embers and fireflies rise, snow, dust and marine snow fall), swaying, fading in at the foot of the loop and out at the top, lit in the world's colour; one instanced draw a world, 24 to 160 specks. Where they are is the point: the embers rise off the boilers along the far side and over the pipe runs down the sides and never over the floor; the dust falls only inside the sun shafts; the lamp motes hang in each lamp's light; the fireflies blink over the banks. The snow and the marine snow fall over the whole view, since that is what they do. Every number TUNING.scenery.<world>.motes.
- Tuned on renders: the embers and the lamp motes were first drawn at the snow's size and vanished at the game's distance; embers are 6 cm now, lamp motes 3 cm.
- The grid, the driveway and the core have none: the driveway is a summer day and the core is busy enough.
- Cache tokens `?v=76` → `?v=77`; HUD label → `2.0 · v77`

---

## v76 — 2026-10-31
**Caustics under every gel, and the dash's ghosts lit at the rim and leaving light on the floor**
- The owner's second visual pick ("gel caustics + dash ghosts"). **Caustics**: light focused through the jelly onto the floor round each body's foot, in the body's own colour — a core under it, a ring of three shimmering arcs at its edge and a faint glow out to 1.7 × its radius, slid a little away from the world's sun (v75's), spreading with the body's squash, a boss's brighter and a heavy body's dimmer (`TUNING.light.arena.caustic`; render/actors.js, one additive instanced decal). It was built in the arena light map first, where it belonged by nature, and could not be seen: the body covers the spot and the floor shows the map's light on its lines, so a render with it on and off differed by one outline. On the floor as its own decal it reads as a coloured pool of light under every body, kept modest so a crowd stays readable.
- **Dash ghosts**: 1.x's blue copies of the body laid every 0.03 s of a dash now keep the body's squash of the moment, are lit at their rim (a fresnel over their opacity) so they read as the outline left behind rather than a blot, and each lays a burst of light on the floor under it that fades with it — the dash leaves a streak of light (`heroLook.ghost.rim`, `.streak`).
- Look checks: `t.advance()` steps the sim without the view, so a frame held after it has an empty light map; the look scripts sync the view once after it now (the game's own frames always do).
- Cache tokens `?v=75` → `?v=76`; HUD label → `2.0 · v76`

---

## v75 — 2026-10-31
**Each world lit in its own light**
- The owner, 2026-10-31: "upgrade visuals and vfx" — the first of four picks (then gel caustics and dash ghosts, world particles, and bloom last, off by default). 1.x lit every world with one white sun and a white ambient; now the sun's colour, strength and place, the ambient's, and how much the jelly reflects are the world's (`TUNING.worlds.light`): the driveway's summer sun high and warm-white, the sewer's cool green from the grates above, the cistern's lamp-warm light low from the far side, firelight low from the boiler room's far side, the river's dusk from the side, a cold moon on the ice, the surface's blue from straight above in the deep, the core's magenta. The gels and the sets take it; the floors are pictures and keep their own. A campaign room is lit as the world its look comes from; the grid, NEON's abstract floors and SURVIVAL keep 1.x's light. Set as the floor is built, which for a world change is under the dark.
- Kept moderate on purpose: a species' colour has to survive the light. The boiler room's firelight was pulled back from orange to amber after a render turned the green gels olive, and the deep was lifted a step after its boulders vanished.
- The smoke checks each world is lit as itself (`litAs`).
- Cache tokens `?v=74` → `?v=75`; HUD label → `2.0 · v75`

---

## v74 — 2026-10-31
**Shaders compiled where nobody is looking: a world's set under the dark of the world change, every species and the challenge pieces on the title; the river's pads at rest in a new place**
- Dropping into worlds 5-9 in a run was proved in a browser (4 → 5 → … → 9 on one page: each landing builds its set, no faults), and the smoke now drops into world 5 as well as 2, 3 and 4 (`world4`).
- **What a landing cost, measured.** Every landing had one long frame right where the transition ends, 0.4 s (world 2) to 2.0-2.4 s (world 5) under SwiftShader. A CPU profile put the main thread idle through it and `renderer.render` at 2 ms, so it was the GPU process; a Chrome trace of that process showed the frame's command flush taking 1.4 s with twelve `CreateRenderPipeline`s and seventeen shader modules inside it: the set's materials, compiled on their first draw, which was the frame the floor's reveal showed the set. The size follows each set's material count (the driveway's three, the deep's seven, the cistern's and the core's dozen, the boiler room's dozen of heavier ones). Nothing else was it: the floor hidden, the set hidden, the light map, the goo film, the music, the announcer, the banner and the HUD each switched off, and the stall stayed; it is there on WebGL 2 too (1.5 s).
- **The set is now drawn once under the dark** (transit.js `dim`): it stays visible for the first frame after `worldIn`, when the fade is at 1, and is hidden until the reveal as before — so the dozen compiles land in the black frame. Measured: the landing's long frame is gone and the compile shows up in the `worldIn` frame instead (656 ms there under SwiftShader, 361 of them inside `render`). `renderer.compileAsync` was tried first and dropped: three's `draw()` has no guard for a pipeline whose async creation has not resolved, so a set shown before the compile finished would draw through an invalid pass, and under SwiftShader the GPU process had no spare time to finish it anyway.
- **Every species' shaders are compiled on the title**, one kind a frame (`actors.warmStep`): taken as a spawn takes it, drawn once tiny and far under the floor — the pickups' and the jelly's older trick, which compiles the pipeline in that frame's own draw — and put back in its pool the frame after, where a run's first body of that kind finds it; a pooled view keeps its materials, which is what keeps a compiled pipeline cached (a disposed material takes its pipeline with it). After the species, the challenge view's pieces (the HOLD ring, the PROTECT heart and its arc, the ORDER ring, one COLLECT orb kept hidden) and world 2's drain. It runs on the title and through the intro only, 44 frames, and stops the moment a run starts. The run's first seconds lost their 582 ms frame; the title pays one build a frame while it runs (its longest frame 1.5 s under SwiftShader, a boss's look). The pickups' and the jelly's own warm-ups stay as they were.
- The river's lily pads start at rest in every new world and room (`DRIFT` reset), so the sum of the current's push never grows past what the floor's hash can hold.
- Cache tokens `?v=73` → `?v=74`; HUD label → `2.0 · v74`

## v73 — 2026-10-31
**The campaign's rooms wear the worlds: each campaign world in the look of the arcade world its rule comes from**
- The owner, 2026-10-31: "also apply same to the campaign levels". The 36 rooms were 1.x's grid in each world's colours; now each campaign world wears the floor, the set and the rail of the arcade world its rule comes from (`look` in TUNING.campaign.worlds): THE SURFACE the driveway (no rule; the curb, the lawn and the summer day), THE WELL the river (the current), THE VEIN the cistern (the sweep), THE VOID the deep (the dark), THE FOAM the ice (the slip), THE KILN the boiler room (the updraft). The grid's tiles keep the worlds' own colours.
- A shaped room is that floor cut to its shape with its rail round it, the dark past it as the arcade's moving floors have it; on the driveway the grass is the limit instead ("you can see there is a curb and grass behind it, or just grass as the limit"): past a shaped room's rail its floor is not drawn and the lawn shows.
- The river's lily pads drift with THE WELL's current as they do in the arcade.
- The smoke's shaped room now also checks it wears its world's look (its floor and its set).
- Cache tokens `?v=72` → `?v=73`; HUD label → `2.0 · v73`

---

## v72 — 2026-10-31
**Worlds 5 to 9 built as places: the boiler room, the river, the ice, the deep and the core, each from a brief of its own**
- The owner, 2026-10-31: "you can build all levels/worlds now". Built as worlds 3 and 4 were, from a brief per world written for Grok in the World 2 sheet's format (art-ref/briefs/world-5-boiler.md … world-9-core.md, eight modules each), in the game's own look. Each world has a set of its own in `js/render/sets/`; nothing stands along the near side.
  - **5, the boiler room**: riveted boilers along the far side, each a drum with a domed top, its arched firebox door glowing and throwing its light on the deck, a stack out of its dome with steam going up; down the sides a run of two flanged steam pipes with red valve wheels that let off steam now and then, and smaller tanks behind; a yellow-and-black hazard band round the floor and tread plate past it.
  - **6, the river**: the river runs on past both ends of the floor between its pebbled banks, rows of old piles across it with the water foaming round them; past the banks wet mud and grass, rounded stones with moss on their tops, reeds with cattails, logs washed up. **Lily pads** float near the banks and drift the way the current rule pushes the gels (`DRIFT`, added up in main.js), so the push, which turns, is something you can see.
  - **7, the ice**: a snowfield ribbed by the wind with snow blowing over it; clusters of six-sided ice crystals leaning out from one root, lit from inside and brighter at the edge; drifts banked at their feet, rocks with snow on their tops. On the floor, frost in from its edges and rings of air caught in the ice, both faint.
  - **8, the deep**: the seabed in slow ripples; kelp in clumps, ribbons swaying with beads of light down their middles; boulders with barnacles on their tops and anemones at their feet, their tentacles' tips lit pink or blue; vents breathing bubbles up out of the silt.
  - **9, the core**: a traced deck with power running in along the traces toward the floor; towers with lit window bands and caps, antennas blinking on some, a neon ring with a light chasing round the tallest; light pillars along the far side pulsing down the row; the floor's edge with light running round it.
- Each world's dark past its ground is its own now (`sky` in TUNING.worlds.floor[id]), as worlds 2 and 3 had.
- What the sets share is `js/render/kit.js` (out of scenery.js: the noise, the seeded numbers, the stations round a floor, stones, blade clumps, things that rise, the frame round a floor as one mesh). Their numbers are TUNING.scenery.boiler/river/ice/deep/core. The surround builder (v43) now stands only round the grid's floors. Still reported to the smoke as `surround:<id>`.
- What it costs, under SwiftShader (a CPU, not a phone's GPU, so only a guide): the scenery takes 22–52 ms of a 117–181 ms frame where the old props took 11–16, about half in the props' shapes and half in their shading. The edge and the hazard band are drawn as one mesh each. A PLAY RECORD from a phone will say what it really costs.
- Cache tokens `?v=71` → `?v=72`; HUD label → `2.0 · v72`

---

## v71 — 2026-10-31
**World 4, the cistern: stone columns standing in dark water, lamps at their feet, column stumps and drip rings on the floor**
- The owner, 2026-10-31: "continue", after world 3. Built the same way, from a brief written for Grok in the World 2 sheet's format (art-ref/briefs/world-4-cistern.md, eight modules), in the game's own look:
  1. **Columns**: a square base block, a lathed shaft (a moulding at its foot, a slight taper, a flared capital) and a square slab on top, 5.5 m; two rows along the far side and both long sides, as the plain cylinders stood. Dark and wet at the waterline.
  2. **Column feet**: rings spreading on the water round each foot, each on its own beat.
  3. **Lamps**: at every other column of the inner row, a warm bulb on a thin iron post with a soft halo, its pool of warm light on the water, and the column it stands at warmed by it. None is a real light (a dozen lights would cost every lit thing a dozen times); the tint and the pools say it.
  4. **Platform edge**: a low stone kerb round the platform outside its glowing edge.
  5. **Flooded floor**: as it was, slabs under a sheet of water with caustics.
  6. **Column stumps**: in each square plinth on the floor, the round cut top of a fallen column with a groove round it.
  7. **Drip rings**: a drip from the vault every few seconds somewhere in every 6 m of floor, two rings spreading from it as they fade.
  8. **Layout**: the platform in dark water that goes into the dark, the columns round three sides, nothing along the near side.
- World 4's surround is built by `_cistern` (scenery.js), still reported as `surround:cistern`; its numbers are TUNING.scenery.cistern and the floor's TUNING.worlds.floor.cistern.
- Cache tokens `?v=70` → `?v=71`; HUD label → `2.0 · v71`

---

## v70 — 2026-10-31
**World 3, the sewer, built to its brief: wall pieces, corner piers, framed gates, pipe mouths, sunlight through the grates**
- The owner, 2026-10-31: "continue with world 3", from the World 3 brief (art-ref/briefs/world-3-sewer.md, the eight modules asked of Grok in the approved World 2 sheet's format). Built in the game's own look, as world 2 was:
  1. **Wall pieces**: the two long walls in 3 m pieces with a seam between, brick (as before) under a stone capstone, 1.2 m in all (the brief's "walls at most 1.2 m"). Each wall was one long box.
  2. **Corner piers**: a brick pier where each wall meets a gate, 1.55 m, capped, flush with the wall's face.
  3. **Framed gates**: the iron bars across each end now stand between posts every 3.7 m, a rail along the top and the foot, the dark through them.
  4. **Pipe mouths**: a round pipe out of the walls every 10 m, staggered side to side, its lip and its dark inside, and a green trickle from it down to the floor.
  5-6. **Flagstones and the channel**: as they were; the trickle runs on over the floor as a wet green rivulet, wide where it falls and drying out over 4.5 m, glinting as it runs.
  7. **Sunlight through the street grates**: every 12 m, side to side, a pool of daylight on the floor in the pattern of the round grate (world 2's, the one the droplet came down), with a faint glow round it and a faint shaft of it standing over each.
  8. **Layout**: as before, walls on both long sides, gates at both ends, the channel down the middle.
- The dark past the walls and the gates is a deep teal now (it was the night's navy), and it is the scene's background too, as world 2's haze is.
- `sewerSpots()` (scenery.js) places the pools and the pipes once, for the scenery and the floor both, so a shaft always stands over its pool and a rivulet always starts under its pipe.
- Cache tokens `?v=69` → `?v=70`; HUD label → `2.0 · v70`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

- **v69** (2026-10-31) — The death screen always says what got you
- **v68** (2026-10-31) — World 2 costs less to draw
- **v67** (2026-10-31) — YELA tumbles on the diagonals too (owner)
- **v66** (2026-10-31) — World 2 in summer daylight, its curb taller than the hero (owner)
- **v65** (2026-10-30) — World 2 built to the owner's curb and lawn sheet: curb pieces, corners, rounded ends, grass tufts, cracks, the storm drain
- **v64** (2026-10-30) — PLAY RECORD copies inside itch's frame too
- **v63** (2026-10-30) — PLAY RECORD measures the phone: every room and run says how the phone ran it, and how the flicks read
- **v62** (2026-10-29) — HARDCADE gives a life back at every world's door, up to three
- **v61** (2026-10-29) — PLAY RECORD: every room and run you play is kept on your phone, and one tap copies it to send
- **v60** (2026-10-29) — WHITE HEAT: in two rooms the multiplier climbs past ×8 to ×16; THE BRAID banks; and every campaign world has a room with a mutator
- **v59** (2026-10-29) — The arcade's curve, on purpose: each world measured by eight bots that play eight ways, walking in with the pod and DASH level a run carries; the ice's floe off its swarm wave, a moving floor that closes in instead of snapping, and a breather at every world's door
- **v58** (2026-10-28) — Music: a song for every world and the title, layered by your HEAT, with boss sections, rule cues and stings; the effects no longer clip when they pile up
- **v57** (2026-10-28) — Ten rooms retuned into their difficulty bands: all 36 now sit where their difficulty says, measured by v56's bots
- **v56** (2026-10-28) — Every grade line redrawn by bots that play like people: S holds, A/B/C ask about a tenth more, HARD PAIN's FORGE is fixed
- **v55** (2026-10-27) — HARDCADE is harder, and a bot that looks ahead shows the arcade can be finished
- **v54** (2026-10-27) — The campaign has an ending and a crown for an all-S world; the arcade ramps gentler and gives lives back between worlds
- **v53** (2026-10-27) — HEAT holds through a lull, and the kill that empties the floor heats a level: the arcade shows HEAT from its first waves
- **v52** (2026-10-27) — HEAT you can see and hear, its own best scores, and S lines set by a bot that plays for it
- **v51** (2026-10-27) — HEAT: one multiplier for the whole game, paid for risk; campaign rooms graded on their score; and room clocks from 20 s to 100 s
- **v50** (2026-10-27) — The title is two big buttons, ARCADE and CAMPAIGN, with a small HARD switch between them and a small MENU below; HARD makes them HARDCADE and HARD PAIN, and the screen goes red
- **v49** (2026-10-26) — The HARD CAMPAIGN: the title's HARD switch turns the thirty-six rooms into their hard versions, where every corpse fires back, on their own grades and their own route
- **v48** (2026-10-25) — A phone held upright shows floor to the bottom of the screen in every world, the ice's cracks sit under the fight instead of over it, and DASH THROUGH! tags one gate rather than all of them
- **v47** (2026-10-25) — Thirteen more campaign rooms tuned until the floor is never empty for long and a sharp player clearly beats a rough one; the campaign re-measured and re-ordered
- **v46** (2026-10-25) — The campaign is thirty-six rooms: the six that scored under 7 rebuilt from nothing, six new ones, and every world walked from its easiest room to its hardest as the bot measured them
- **v45** (2026-10-24) — Every arcade world ends on a boss of its own: CURB KING, MAW, BLISTER, KETTLE, PIKE, BERG and ANGLER between the TWIN PRISMS and OMEGA
- **v44** (2026-10-24) — Three arcade worlds have a wave whose floor moves: the river's banks breathe, the ice breaks into a drifting floe, the core splits into two discs going round each other
- **v43** (2026-10-24) — Portrait levels are bigger on the phone, and every world has something round its floor: a ground that fades into the dark, a glowing edge, and its own things standing along the sides
- **v42** (2026-10-24) — Arcade boss waves are fought like the campaign's boss rooms: the boss's health on screen, a clock and a grade, and the wave over when the boss is down
- **v41** (2026-10-24) — The game loads on the live site again: `_base.js` is `base.js`, because GitHub Pages leaves out every file whose name starts with "_"
- **v40** (2026-10-24) — A file that drops on the way no longer stops the game: the page checks every file and loads itself again
- **v39** (2026-10-24) — The intro plays every time a run starts from the title, and never on a retry
- **v38** (2026-10-24) — The start screen is ARCADE with HARD beside it, CAMPAIGN and MENU, and a MENU button stays at the top right while you play
- **v37** (2026-10-24) — Each arcade world asks its own challenge, three of them close their walls in for it, and the banners move off the fight
- **v36** (2026-10-24) — The arcade's challenge waves: what the campaign teaches, the arcade asks
- **v35** (2026-10-24) — The strategy curve: every room names the skills it asks for, and the rooms climb in measured steps
- **v34** (2026-10-24) — Grades you can read: the HUD says which grade you are on course for, the results put your number against the lines, and an F says why
- **v33** (2026-10-24) — The campaign is a grid of thirty tiles, and every room has a card with START
- **v32** (2026-10-24) — A game that fails to load says which file failed and why, and tries once more
- **v31** (2026-10-23) — THE CAMPAIGN, rebuilt: thirty rooms, thirty challenges, each with its chart, graded on tiers set by bot play
- **v30** (2026-10-23) — The campaign's framework: a room is a goal and its mods (CAMPAIGN_PLAN.md)
- **v29** (2026-10-23) — Worlds 4-9 each have a gel of their own
- **v28** (2026-10-23) — Worlds 4-9 each have a floor of their own
- **v27** (2026-10-23) — Arcade becomes nine worlds and can be won; the title is ARCADE with a HARD switch, and the campaign
- **v26** (2026-10-23) — The campaign's six worlds wear their own floors and play by their one rule each, as in 1.x
- **v25** (2026-10-23) — THE CAMPAIGN, from 1.x: eighteen rooms in six worlds, each with its own clock and goal, graded S to F
- **v24** (2026-10-23) — 1.x's settings in OPTIONS: LANGUAGE, VOLUME, the announcer with its own volume, and REDUCE MOTION
- **v23** (2026-10-23) — OPTIONS, like 1.x: the title keeps the modes, every switch moves to one page, and the pause menu and the death screen open it too
- **v22** (2026-10-23) — Each new world has its own gel (HOPPA hops the driveway, WORMA swims under the sewer), and WORLDS · NEON on the title swaps in abstract floors
- **v21** (2026-10-23) — Splatter: kills throw real goo that pools, smears and dries on the floor — on by default, SPLATTER on the title turns it off
- **v20** (2026-10-23) — SURVIVAL is back, and its floor changes size as you play
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
