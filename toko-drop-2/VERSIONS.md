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

## v103 — 2026-11-02
**HARDCADE's corpse fire warns first and aims where you stood (owner: "Revenge bullets on Hardcade ... needs certain predictability to stay fair")**
- What was unpredictable: a corpse bloomed the step it died, from its middle, with no warning; a RING's turn was rolled at random; a point-blank kill (a dash through it) put the bloom on top of you before it could be seen; and whether a corpse fired at all hung on how many corpse bullets were already out, which nothing showed.
- A CORPSE WARNS: its fire waits half a second (`revenge.tell`) as a SEED on the corpse — swelling, blinking white at the end — with a line on the floor for every bullet it will fire, an arrowhead at each line's tip, lighter than the goo the kill throws in the same colour (the kill's goo strands radiate from the same corpse; a line with a head is the one that says a shot goes there). Then it fires along exactly those lines. Solid, no glow. A rising tick when a seed is laid.
- ONE RULE FOR WHERE IT GOES: every dialect aims at where you stood when the body died — AIMED and FAN centred on you, and a RING's first bullet at you, the rest evenly round (1.x turned a ring at random). The lines are fixed when it dies, so the shot goes where it warned, whatever you have done since: step off the line.
- CLOSE KILLS ARE SAFE: a corpse within 2.2 m of you when it dies (`revenge.near`; a HARD room keeps its 3) cannot bite — it fizzles, with a dull puff. A dash kill is point-blank, so dashing a biter is the way to kill it clean, and the heat already pays a close kill more.
- The cap counts the seeds still waiting as well as the bullets out, so a corpse that would go past it shows no seed at all: no seed, no shot. A VOLATILE corpse's ring (every mode) warns and aims the same way, but is a bomb: it bites close too.
- Measured, HARDCADE's difficulty did not move: the expert bot (scripts/reach.mjs; it cannot see a seed, it dodges bullets) over 36 seeds reaches wave 33.9 ± 1.9 against v102's 37.3 ± 2.4 (medians 36 and 37), inside the noise — a run forks the moment a ring stops drawing its turn from the effects' random stream, which also seeds the bodies' moves — and corpse fire takes ~4% of its lives either way (6 of 174 against 7 of 177). One HARD room's lines (THE SPLITTER, scripts/room-tiers.mjs --hard) stay in their band. What changed is what a person can read.
- The tests that read a corpse's bullets the step it died read them after the warning now (sim, campaign and ten species), and the new rules have checks of their own: the seed and its lines, nothing in the air while it warns, the burst along those lines however the hero moved, the fizzle, a ring's first line at the hero.
- Cache tokens `?v=102` → `?v=103`; HUD label → `2.0 · v103`

---

## v102 — 2026-11-02
**Less paint, more goo (owner: "There is too much splatter paint left over visually, but not enough goo vfx")**
- Read off a time-lapse of a fight's floor (six kills, then the burst, +1, +3, +8, +15 and +30 s) at a phone's portrait size, and off the whole floor film read back every 10 s of a minute's fight. The paint: what the goo DRIES to stayed — it halved every 8 s, and the thinnest stain still drew at a fifth of its strength, so on the dark grid every kill of the last half minute was still on the floor at +30 s, and over a minute's fight the stained floor only grew (4% → 19%, a tenth of it deep). The goo: a kill threw mostly fine drops, 2–8 cm — on a portrait phone a metre is about 18 px, so most of a burst was a speck of a pixel or two.
- THE PAINT GOES: the stain halves every 1.5 s (was 8), a drying film leaves a fifth of what it carried (was 0.6) and a fainter ring at its edge (1.2 × the middle, was 2.5), and a thin stain draws faint (`dryBase` 0.05, `dryAlpha` 0.35, the tint 0.08) — the wall's film the same way. A kill's goo is gone from the floor by +8 s; over the same minute's fight the stained floor holds at ~9% (deep stain ~5%, half v101's) instead of climbing.
- MORE GOO: a kill throws 16 + 64 × its radius drops (was 10 + 45), higher and faster, fatter (2.8–11 cm, more of them fat), and 7–9 chunks (was 5–6) a fifth bigger, trailing longer strands and lasting 1.7 s (`death.burstLife`; a species' own pop chunks keep 1.x's 1.4); a hit throws 5 drops (was 3). A drop is DRAWN 1.6 × its radius (`goo.drop.draw`), so a burst reads on a phone, while its volume — and so what it lays in the floor's film — stays what it was; its shadow follows the drawn size. The wet goo dries as fast as before (4 mm a second): it is the goo; what it leaves is what shortened.
- Cache tokens `?v=101` → `?v=102`; HUD label → `2.0 · v102`

---

## v101 — 2026-11-02
**An art pass on every world (owner: "Can you do a upgrade pass on all level art?"): the boiler, the sewer, the deep and the core to their approved pictures**
- All nine worlds rendered as they stood and held against the owner's approved pictures and module sheets (concept handoff). Four were far from theirs; the cistern, river and ice were repainted in v97–v100, the driveway already matches its module sheet, and world 1 is 1.x's grid, kept as the homage.
- THE BOILER: the grates are square LATTICES in an iron frame, the fire under them white-hot in the middle and lighting their bars (they were rows of slots); the plates a stop lighter; FIRE IN THE SEAMS — glowing cracks breathing along the deck's edge as the picture's — which follow the edge as it stands now (the boiler squeezes its floor, and drawn at the full edge they lay in the void); and a low riveted steel WALL round the deck on the hazard band (the module sheet's panels, kept low so the fireboxes still show over it), lit orange at its foot.
- THE SEWER: the puddles fewer and quieter (their bright rims were noise over the whole floor, the v92 sheet's first complaint), the channel's water lighter and its KERB real — pale stone blocks either side, lit at the water's edge, a line of shadow beyond — and the flagstones a little lighter and bluer, as the module sheet's wet slabs.
- THE DEEP read as night sky: a dark blue field under specks spread evenly as stars. Now it is a SEABED — warm silt in soft lumps, a paler swept band down the middle, cold toward the edges — the specks GATHER in pools round the deep's three lights (so the green light on the floor is theirs), and BANKS of rock rise round it, a cold blue light running down their faces from the lip (the picture's glowing rims). The kelp, boulders and vents stand behind them.
- THE CORE: the circuitry read as a maze. Now it is the picture's deck — dark tiles on a MAGENTA GRID, two disc PADS glowing on it and rings of light washing out from them across the lines — and the towers with lit windows (a city skyline) are low NEON STUMPS, the module sheet's: neon strips up the side, a bright rim, the top lit with rings going out across it. The ground past the edge is darker, the sheet's void beyond.
- THE INTRO (owner: "The world one environment is now shown in the intro animations and it shouldn't be so"): world 1's set — its grid running on past the rail and the lit bollards along it (v43) — stood along the bottom of the logo and the drop, because the intro hid only the floor (the grid runs out of the void after the drop lands) and nothing hid the set. It waits in the void with the floor now and comes in as the grid reaches the rail (intro.js, scenery's group).
- The deep's silt is a few noises, not a cellular field: read as lumps, a cellular field (nine cells a pixel) about doubled the deep's frame against v100's, side by side under SwiftShader, and its joints read as paving until they were softened away anyway. Measured on a quiet machine against v100, frame for frame at iPad size under SwiftShader (single runs, about ±10%), the four repainted worlds cost about what they did: the boiler 2.8 s against 2.9, the sewer 2.7 against 2.8, the deep 3.0 against 2.7, the core 2.2 against 2.0. The dearest world is the ice (v100), at 4.1 s.
- The ice's banks became a shared LEDGE (kit.js ledgeBlocks / ledgeMesh) that the boiler's wall and the deep's banks are built on; the ice keeps its exact layout (same seed, same draws).
- The smoke's harness, found running v101. It stalled three ways — the iPad goo check ("no answer in 60 s"), the campaign checks reading THE PULL's death card where CAMPAIGN CLEAR should be, and once a run whose GPU went away halfway ("A valid external Instance reference no longer exists"). None of it was the game: three browsers from earlier harness runs, killed from outside (a `timeout`, a kill), had outlived their harness and gone on rendering, holding three of the machine's four CPUs. Each browser runs in its own process group so that one kill takes its children with it, and nothing killed that group when node itself was killed. The smoke and the capture harness take their browser down with them now (on SIGINT, SIGTERM and SIGHUP, and on exit). Kept from the hunt, because a check should not depend on how busy the machine is: the goo check is two calls, each with its own 60 s, and a stalled call names itself; the campaign checks wait for the menu by frames as well as by the clock (`untilMenu`: the menu, or 40 frames, or 150 s); and the last room is given a score over its lines before it ends (a room is graded on its score, v51), so the check tests the end screen and not two seconds of the bot.
- Cache tokens `?v=100` → `?v=101`; HUD label → `2.0 · v101`

---

## v100 — 2026-11-01
**The ice to its approved picture: fractured, between banks of ice raised round the floor and cut straight down at it — and the snowfield into the day's haze**
- The owner's approved world 7 picture is a frozen river sunk between raised banks of ice: snow on top, a cut face of clear cyan ice where they meet the river, stepping as the bank wanders, crystals standing back on it. The ice floor (v95) had the river's colours but nothing raised round it: the crystals and rocks stood on a flat snowfield level with the play. Now a LEDGE of ice blocks stands along the far side and both long sides (TUNING.scenery.ice.ledge; never along the near side, as every world's set), each block its own length, depth and height so the top steps, a lower step in front of some; its face cyan from a deep foot to a pale lip, streaked where melt ran down it and lit from inside (daylight through the ice, brighter at the foot), snow on top. The crystals and rocks stand behind it now. Its sun shadow falls on the ice where the sun stands behind it (TUNING.worlds.floor.ice.ledgeShadow, as the driveway curb's).
- The ice itself is FRACTURED now, as the picture's is: plates with long straight cracks between them, finer cracks crazing some of the plates, clear ice between (TUNING.worlds.floor.ice.fracture). v72's cracks were the contours of a noise — wavy loops that read as squiggles. A cellular field read as the difference of its nearest two distances is zero on the line between two points (the river's pebbles read the same field as a ratio: one helper), warped so no crack runs ruler-straight. A first cut closed every plate and crazed every plate and read as a crackle glaze; stretches of the big cracks fade out now and the fine ones keep to some plates. The cracks stay a texture under the fight (v48), as bright as before.
- Two things the first renders showed: a glossy face mirrored the pale sky and read as grey stone (rougher now, and lit from inside), and too low a ledge showed the play camera only its top. And the snowfield faded to BLACK past the set — the night v95 took off the ice — which drew a dark band across the top of a portrait view between the snow and the sky; it fades into the day's haze (the world's sky) now.
- Cache tokens `?v=99` → `?v=100`; HUD label → `2.0 · v100`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
