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

## v152 — 2026-11-12
**The sewer's stream runs in a gentle trench: shallow, rounded, level water in the bottom of it**
- The owner, playing v151 on the phone: "The 'pipe' is a rectangular hole, when it should be a gentle concave stream. Previous stream water was good, no need to have a small river going back and forth. Just make the trench itself look subtle and rounded, not boxy". v148's half-pipe was as deep as it was half wide; walls that stand nearly upright are two flat faces from above, a lit one and a shadowed one, and that is a box.
- The trench is a cosine dip now: 0.6 m at its middle in 3.4 m, level at both shoulders, so it has no lip — the floor turns down into it. Its banks are the floor's own stone at the shoulder, going to smooth damp stone toward the water, and are shaded as a slope is (a little lighter where it turns to the light, a little darker where it turns away, nothing at the shoulders): a gradient and no line. No brick courses, no lip shadow, no gleam.
- The water is v145's again: level, filling the bottom half of the dip, running fast along the flow with a brighter thread down it and foam where it meets the banks. The stream that swung from wall to wall is gone.
- The view ray is met with the bank by three Newton steps kept between the floor and the trench's bottom (`test/view.mjs` runs the same steps for rays out to the far edge of a phone's view).
- Tests: `test/view.mjs` 161 checks.
- Cache tokens `?v=151` → `?v=152`; HUD label → `2.0 · v152`

---

## v151 — 2026-11-12
**REDUCE MOTION reaches the floors: the core's beat and the boiler's flare are held back when it is on**
- OPTIONS' REDUCE MOTION (and the device's own setting) stilled the camera's shake and softened the dark, and nothing a shader drew knew of it. v149 and v150 gave two floors a pulse — the boiler's stoke, and the core's beat, a flash across the whole deck that the LOOK 3 film measured at about 6% of full brightness from one frame to the next. With REDUCE MOTION on, the core keeps a quarter of its beat and of its rings and none of the arcs on its grid; the boiler keeps 40% of its flare (`kit.js` CALM, set from the option, on the toggle, and when the device's setting changes). With it off, nothing is changed.
- The boiler's fire pits are worked out only where there is a hole in a grate, and a shoal's cloud once a kind (it was asked twice, and a fish was looked for where there was no cloud). Neither showed as a saving on the software GPU, which may run both sides of a branch; they are kept for the GPUs that do not.
- Measured (`docs/ENVIRONMENTS.md`): against v147, a frame of the boiler costs about 11 to 18% more and of the deep about 6 to 16%; the sewer, the cistern, the river, the ice and the core are inside the measurement's noise. Not timed on a phone.
- The owner's read of the LOOK 3 film (v150): the sewer "about right", no preference on the other six. The looks pass is closed; A8 9 of 10, C10 5 of 5 (`docs/COMPLETION.md`: ARCADE 93, CAMPAIGN 93).
- Tests: `test/view.mjs` 161 checks; `test/smoke.mjs`: the pulses are whole with REDUCE MOTION off.
- Cache tokens `?v=150` → `?v=151`; HUD label → `2.0 · v151`

---

## v150 — 2026-11-12
**The deep is alive and lit from above — shoals, jellyfish, crabs, shafts of the surface's light; the core's heart drives its machine, every beat a kick**
- From the owner's read of the LOOK 2 film (v147): the deep, "Needs both" (more life, more light); the core, "Needs more". With v148 and v149 this answers all seven.
- **Deep — life.** SHOALS of small fish over the bed, two kinds, each its own size, colour and heading, swimming in clouds that travel with them, weaving, tails working; each throws a shadow on the silt a little way off, which is what says they are above it; they part round the hero. CRABS on the bed (`render/leaves.js` 'crabs'): each scuttles sideways a little way, waits, goes again, and runs from any body that comes near; a burst throws them. JELLYFISH adrift over the far side, the sides and a little way in over the floor's edge: a bell that pulses, tentacles trailing, clear but for its rim.
- **Deep — light.** SHAFTS of the surface's light come down in three fans (the cistern's rays) and the bed is lit where they land, the caustic web at its brightest under them; the surface's dapple is stronger everywhere; the bed a little lighter and bluer; the plankton brighter where the water is stirred.
- **Core — the heart DRIVES the machine.** Every beat kicks the rotor on part of a segment (a ratchet now, not a fan). Between the rotor and the heart stands the STATOR: ten great vanes, dark against the heart, its light coming up between them in beams; a conduit down each, and on every beat a charge runs out along it. On the deck the beat hits harder: a second ring follows the first, the pane takes a breath of the heart's light, a pad flares as a ring crosses it, and for a moment after each beat the grid near the heart is live with arcs.
- `scripts/itch-clips.mjs`: a LOOK 3 clip — the seven worlds again, one shot each and its question.
- Tests: `test/view.mjs` 159 checks (crabs: where they start, that they scuttle and wait, never sleep, never walk through what stands on the bed, run from a body; the deep's lights and shoals; the stator between rotor and heart; the kick).
- Archive: v140 to v149 rolled to one line each.
- Cache tokens `?v=149` → `?v=150`; HUD label → `2.0 · v150`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

- **v149** (2026-11-11) — The boiler room stokes — fire in pits under the grates, blown on a beat, steam off the floor, engines turning; the ice keeps the trails of what slides over it, under more snow
- **v148** (2026-11-11) — The river's lily pads stay where they grow; the sewer's chute is a half-pipe with the stream swinging in it; leaves afloat in the cistern
- **v147** (2026-11-11) — The core's deck is glass, and the machine is under it: a great rotor turning over a heart that beats
- **v146** (2026-11-11) — The river's water is simulated too, and flows; its fish are of three kinds. The deep is under water: light from the surface, a ray's shadow going over, plankton lit where the water is stirred
- **v145** (2026-11-11) — The sewer's stream runs in a chute, the boiler room is a dark machine hall with square decks, and the ice is broken unevenly under more snow
- **v144** (2026-11-11) — The cistern's water is water: a wave simulation the fight stands in. And the cistern is dark, with the sewer's water falling into it
- **v143** (2026-11-11) — The water answers the hero: rings go out from it in the cistern, and the river breaks round it and trails a wake
- **v142** (2026-11-11) — The campaign's rooms wear the new floors properly: leaves, chips and puddles to the room's own size, and a shaped room's floor cut to its shape
- **v141** (2026-11-10) — Chips of broken ice lie on the sheet, and they skitter: a kick sends one a long way, off the banks and the blocks — and into a hole, and gone
- **v140** (2026-11-10) — The floors of worlds 3 to 9, past their concepts: no two flagstones, slabs or plates alike — and fish in the river, snow drifted over the ice, starfish on the seabed, light running through the core's deck
- **v139** (2026-11-10) — A hole in the ice is broken through, not bored; and the blockers of worlds 3 to 9 belong to their floors — a rock is a mound, and everything stands in what gathers round it
- **v138** (2026-11-10) — World 2 to the owner's concept, and past it: an old slab, worn curb stones, a puddle with the sky in it, and fallen leaves that are really there
- **v137** (2026-11-10) — The blockers block out the floor: rounded islands and footprints of each world's own material, and pits
- **v136** (2026-11-10) — HARDCADE's BERG lunges at you, and lunges again
- **v135** (2026-11-10) — The campaign's C lines where a beginner reaches them: 26 lowered, nothing raised
- **v134** (2026-11-10) — A heart room started again shows its heart whole
- **v133** (2026-11-10) — The film builds its shaders before it starts, behind black, and plays without a hitch
- **v132** (2026-11-09) — Every shadow grows out of its body — as wide as the body where it leaves it, darkest at the foot — and the domes stand on the widest of themselves
- **v131** (2026-11-09) — The bodies sit on the ground — flatter domes, a shade where each one meets the slab, its shadow from its foot — and the opening film is the one it was, in the owner's letters, smooth, and shows nothing of a later world
- **v130** (2026-11-09) — The opening logo says the owner's words in the owner's letters: Toko, Midori and Games as their original sets them — and "drop" made of the same letters
- **v129** (2026-11-09) — The trees' shade is cast from trees — trunk, limbs and leaves, sun coming through — and a gel carries its motion: its top lags when it is pushed and swings back when it stops
- **v128** (2026-11-09) — The driveway at golden hour: the sun glints in every gel, the shadows run long and the trees' shade falls across the slab — and the goo splashes as jelly
- **v127** (2026-11-09) — The title after a run is the title again: nothing of the run is drawn under it — and the progress trailer re-cut without its glitches
- **v126** (2026-11-09) — The run's own end made safe: nothing hurts you under WORLD CLEAR, a run decided on a step stays decided, and the ★ chip lights for the pickup alone
- **v125** (2026-11-09) — The run's flow declared: one table owns what entering and leaving each state does, and eleven ways out that went wrong now go right
- **v124** (2026-11-09) — 1.x's dash is back: lift the right thumb and it dashes, where you walk, 1.x's length — and it passes through, as 1.x's did
- **v123** (2026-11-08) — World 1 alone in the void: the grid round it gone, lines of neon running round it, every body a light, the grid sharper
- **v122** (2026-11-07) — A sound pass, standing in for the owner's ears: the game 4 dB louder on a phone, and the boiler's song brought up to the others
- **v121** (2026-11-07) — A screenshot pass, standing in for the owner's eye: every screen and world shot on a phone and read, and what it found fixed
- **v120** (2026-11-06) — The lines pass: eight lines drawn again by the bots that read the warning, PACK ICE a little harder for a beginner, and the campaign's ending previewed
- **v119** (2026-11-06) — Clips for the itch page: the real game, filmed frame by frame, played by the look-ahead bot, under its own music
- **v118** (2026-11-06) — DAILY: one run a day, the same waves for everyone — its own best and tries, and a line to share
- **v117** (2026-11-04) — Every level played by bots: corpse fire now passes through a heart (on HARD, CLOT could not be won), and the bots read the warning lines a person reads
- **v116** (2026-11-04) — A phone pass: no shader is built mid-fight any more for a body, a trail, a tag or a ghost — one compiled graph a kind of thing, and the rest compiled on the title
- **v115** (2026-11-03) — The floor teaches its own attacks: STEP OUT! over a giant gathering for its slam, CLEAR THE LANE! by a sewer ram's lit lane — until you have once got out in time
- **v114** (2026-11-03) — Bullet sponges you can see soaking it up: a big body sheds goo where it is hit, and wears down as its life goes (owner: "anything that pushes the gelatin look and behavior is great for enemies")
- **v113** (2026-11-03) — Polish: the ice reads as ice, the cistern's broken columns as broken stone, and the columns cost less to draw
- **v112** (2026-11-03) — The giant's slam: a giant's own attack, told and bullet-free (owner: "a bit less shooting and more unique patterns")
- **v111** (2026-11-03) — The driveway's ball: something rolls across the second world too (owner: "We need some dynamic elements")
- **v110** (2026-11-03) — The floor moves: the sewer's rams punch out of its walls, the ice's blocks drift (owner: "We need some dynamic elements")
- **v109** (2026-11-03) — A world's boss comes in under its own name, and a world ends on a beat (owner: "I finished world 1 quite abruptly.. was there a boss or what was the trigger?")
- **v108** (2026-11-03) — The floor's own shape: things stand in every later world's floor, and they block (owner: "arcade arena shapes are boring. We need some dynamic elements")
- **v107** (2026-11-03) — The gate family: five more gates, and every gate redrawn (owner: "The gates are a good base concept but we need more similar ones … Gates get boring fast and look boring")
- **v106** (2026-11-03) — The enemy pool, step two: formations — bodies that come as one unit (owner: "more unique patterns and synergies")
- **v105** (2026-11-03) — The enemy pool, step one: every body a size from 1 to 5, giants in their own colour, tanks a dash cannot kill, and less shooting (owner: "Essential more enemies in a pool maybe each on a size scale 1-5. Or different color giants" and "more tank and bullet sponge, a bit less shooting")
- **v104** (2026-11-02) — A slight zoom-in, and light instead of glow (owner: "We need a slight zoom in and more HD graphics and light. No cheap effects like glow")
- **v103** (2026-11-02) — HARDCADE's corpse fire warns first and aims where you stood (owner: "Revenge bullets on Hardcade ... needs certain predictability to stay fair")
- **v102** (2026-11-02) — Less paint, more goo (owner: "There is too much splatter paint left over visually, but not enough goo vfx")
- **v101** (2026-11-02) — An art pass on every world (owner: "Can you do a upgrade pass on all level art?"): the boiler, the sewer, the deep and the core to their approved pictures
- **v100** (2026-11-01) — The ice to its approved picture: fractured, between banks of ice raised round the floor and cut straight down at it — and the snowfield into the day's haze
- **v99** (2026-11-01) — The river to its approved picture: a pebble bed in the shallows with the caustic web on it, the sun glittering off the ripples, a shore that wanders
- **v98** (2026-11-01) — The cistern's light through the roof: shafts falling onto a warm patch of daylight, dust turning in them
- **v97** (2026-11-01) — The cistern to its approved picture: clear water over pale slabs, and a web of caustic light on them
- **v96** (2026-11-01) — The hero's eyes from the owner's style sheet: a big highlight above, a small dot below
- **v95** (2026-11-01) — The river and the ice in daylight, to the owner's approved pictures (the concept handoff)
- **v94** (2026-11-01) — LENS: TILT-SHIFT in OPTIONS — the run as a miniature, sharp where you play (owner: "look into the tilt-shift look, detailed central area, maybe it works with small objects too if there are enough details")
- **v93** (2026-11-01) — The worlds' own light: each floor lit by what stands in it, and every shadow thrown by the sun (owner: "better lights. Actual things that make sense, not just some random stuff")
- **v92** (2026-10-31) — STYLE: PHYSICAL, CEL-SHADED or WATERCOLOR (owner: "Do you have the 3 visual options, watercolor, cell shaded, physical 3d?"; "Test the 'splatter' in multiple styles, as now it's the most washed out watercolor look")
- **v91** (2026-10-31) — Flick to dash at 1.x parity (owner: "get flick to dash to 1.x parity")
- **v90** (2026-10-31) — The squeeze: a body pressed from both sides squashes (v82 summed the pushes as one vector, and opposite pushes cancelled)
- **v89** (2026-10-31) — The title: the icon's logo, and ARCADE, the HARD switch and CAMPAIGN in a stack
- **v88** (2026-10-31) — The glow is out
- **v87** (2026-10-31) — RECORDS: one page in OPTIONS with your bests, your campaigns and your last runs
- **v86** (2026-10-31) — CONTROLS and AUTO QUALITY in OPTIONS: left-handed, the stick's size, the dead zone, and a picture that steps down on a slow phone
- **v85** (2026-10-31) — START AT A REACHED WORLD: the title offers any world a run has reached, and a run from there keeps its scores apart
- **v84** (2026-10-31) — Spray and tracks: a body running or dashing through a pool throws it out of its foot, and a foot that stood in goo leaves tracks
- **v83** (2026-10-31) — Chunks that behave: a strand off the burst, a bounce and a jiggle where they land, and a melt into the puddle
- **v82** (2026-10-31) — Contact squash: a gel flattens where it presses on another, on a wall or on the hero, and bulges at its sides
- **v81** (2026-10-31) — Goo up the walls: splatter that meets the rail clings to it, runs down and dries there
- **v80** (2026-10-31) — CONTINUE: a run is kept at each world's door, and the title takes it up again
- **v79** (2026-10-31) — GLOW in OPTIONS, off by default: bright things bleed light
- **v78** (2026-10-31) — The waters differ: puddles on the sewer's flagstones and oil under the boiler's pipes, a murky channel, a river that flows; only the cistern keeps its sheet of water
- **v77** (2026-10-31) — World particles: embers over the boilers, snow on the ice, dust in the sewer's sun shafts, motes in the cistern's lamps, fireflies over the river, marine snow in the deep
- **v76** (2026-10-31) — Caustics under every gel, and the dash's ghosts lit at the rim and leaving light on the floor
- **v75** (2026-10-31) — Each world lit in its own light
- **v74** (2026-10-31) — Shaders compiled where nobody is looking: a world's set under the dark of the world change, every species and the challenge pieces on the title; the river's pads at rest in a new place
- **v73** (2026-10-31) — The campaign's rooms wear the worlds: each campaign world in the look of the arcade world its rule comes from
- **v72** (2026-10-31) — Worlds 5 to 9 built as places: the boiler room, the river, the ice, the deep and the core, each from a brief of its own
- **v71** (2026-10-31) — World 4, the cistern: stone columns standing in dark water, lamps at their feet, column stumps and drip rings on the floor
- **v70** (2026-10-31) — World 3, the sewer, built to its brief: wall pieces, corner piers, framed gates, pipe mouths, sunlight through the grates
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
