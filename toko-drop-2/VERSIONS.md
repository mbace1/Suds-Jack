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

## v122 — 2026-11-07
**A sound pass, standing in for the owner's ears: the game 4 dB louder on a phone, and the boiler's song brought up to the others**
- THE PASS (owner, 2026-11-07: "Use bots instead of me"): every song at every level beside the game's own effects (scripts/music-render.mjs measure), and a bot's real runs of worlds 2, 5 and 8 rendered with the music and every effect its play set off (replay), measured to EBU R128 (ffmpeg) and drawn as spectrograms. Clean: no clipping anywhere, the songs within about 2 dB of each other, a kill or a hurt 8 dB over the music, the melodies clear at 500–900 Hz, nothing harsh above 5 kHz. Written up in docs/SOUND.md.
- QUIET FOR A PHONE: the real runs measured −27 to −29 LUFS, about 10 dB under what a phone's speaker usually plays, with 6–10 dB of headroom unused. The master goes 0.5 → 0.8 (+4 dB): −23 to −25 LUFS, and the limiter (v58) holds the loudest moment of the lot, world 5's, at −2.3 dBFS true peak. VOLUME and MUSIC in OPTIONS are as they were.
- THE BOILER ON A PHONE: its weight is low, where a phone's speaker gives little back, and it played 2.6 dB under the other songs there; its lead was the quietest of the ten. Lead 0.17 → 0.21: the songs on a phone now sit within 2.9 dB of each other (4.3 before).
- Found and left: heat levels 3 and 4 add a ride, a metal tick and the lead an octave up, texture rather than loudness (the songs measure the same from level 2 up); each step of the × still plays its own cue.
- Cache tokens `?v=121` → `?v=122`; HUD label → `2.0 · v122`

---

## v121 — 2026-11-07
**A screenshot pass, standing in for the owner's eye: every screen and world shot on a phone and read, and what it found fixed**
- THE PASS (owner, 2026-11-07: "Use bots instead of me. Analyze screenshots."): the real game on WebGPU, phone-sized upright (390 × 844) and sideways (844 × 390), the look-ahead bot playing — the title, OPTIONS, RECORDS, the grid and a room card, the ending, all nine worlds mid-fight and every world's boss, HARDCADE's corpse fire, a heat of ×8, the pause card, the results (a run, a DAILY, a room cleared and a room failed), and one room of every goal and every mutator: 54 shots, no page error. Read one by one, with the hero found on each and cropped.
- THE CLOCK LINE BROKE MID-PHRASE in every room and challenge wave: one line in a box under MENU, wrapped wherever a phone's width ran out ("SURVIVE · 18s · F →" over "C 36k", PROTECT THE HEART's over three lines). It is two lines now: in a room the goal, then its seconds and the grade it is on course for, kept whole; in an arcade challenge wave the run's clock, then the challenge kept whole. A boss's health bar stands in one column with the clock, so it is always under the clock's lines.
- THE HUD ON THE ICE: white score and lives on the snow nearly vanished. The HUD's text has a tight dark outline under its shadow, each life a dark ring, the heat bar a dark edge: they read on the snow as on the night.
- THE HERO'S OWN LIGHT WASHED OUT THE FLOOR round a pale hero on a sunlit floor (v104's pool of light, on every world). A world says how strong it is (TUNING.worlds.light[…].hero): a third on the driveway and the ice, 0.6 on the river; as it was everywhere else.
- A LABEL OVER THE HERO: DASH THROUGH! and BOUNTY were written across the hero. Where a label stands over the hero ON SCREEN (worked out with the camera, so it holds as the view turns) it fades to a third.
- A BOSS'S CARD OUTLIVED ITS RUN: the banner and the card count down by frames, and one up as a run ended rode on into the results and the next run (OMEGA's card over world 3, over a challenge banner). They go when the HUD comes or goes, and a banner takes the band from a card there.
- Paused, the run's MENU button no longer stands over the OPTIONS panel's corner. RECORDS stacks each row, its name over its value, on a phone held upright (two columns wrapped "reached WORLD" over "9").
- The title says "Nine worlds of waves" where it said "1.x waves" (a player does not know 1.x), and HARDCADE "a life comes back each world". In English, Finnish and Japanese.
- Cache tokens `?v=120` → `?v=121`; HUD label → `2.0 · v121`

---

## v120 — 2026-11-06
**The lines pass: eight lines drawn again by the bots that read the warning, PACK ICE a little harder for a beginner, and the campaign's ending previewed**
- THE LINES (plan items 2–4, shown to the owner before they shipped). v117's bot test drew every room's lines again with bots that read the warning, as a person does. Eight of them were more than 25% off what each room carries now, and they are drawn again by the same rule as every line since v56 (scripts/lines.mjs, 24 seeds a skill): S is the sharp bot's median score, A the average bot's, B the average's weaker quarter, C the rough bot's median or the average's weakest tenth.
  - Normal route, THE CORE: 110,000 / 87,000 / 76,000 / 63,000 (A, B and C were 66,000 / 59,000 / 53,000). THREE RINGS: 42,000 / 32,000 / 29,000 / 20,000 (S was 43,000, C 15,000).
  - HARD route, harder to reach than drawn: FORGE 58,000 / 24,000 / 4,700 / 2,100 (was 57,000 / 41,000 / 9,700 / 2,300) and THE CORE 180,000 / 130,000 / 100,000 / 90,000 (was 170,000 / 150,000 / 140,000 / 130,000).
  - HARD route, easier to reach than drawn: EDDY 14,000 / 9,800 / 7,900 / 5,500 (was 12,000 / 7,200 / 6,500 / 5,400) and THE BRAID 12,000 / 10,000 / 8,600 / 5,300 (was 14,000 / 8,400 / 5,900 / 3,500).
- PACK ICE: its boss's life goes from 65 to 72. The rough bot got through 67% of the time, and a d7 room asks for 0–60%; now it gets through 42% (the sharp and average bots still 100%). Its lines are drawn again on both routes: 15,000 / 14,000 / 13,000 / 12,000 (was 14,000 / 13,000 / 12,000 / 11,000), and on HARD 22,000 / 20,000 / 18,000 / 16,000 (was 20,000 / 18,000 / 16,000 / 14,000; the rough bot gets through 13%, down from 21%).
- A grade already earned stays as it is. The new lines grade the next run.
- THE ENDING, PREVIEWED: `?ending` (or `?ending=hard`) opens the CAMPAIGN CLEAR card at once, marked PREVIEW, so the ending can be seen and judged without clearing thirty-six rooms first. The tally uses your own grades where you have them and made-up ones for the rest. Nothing is saved, and ROOMS goes to the campaign as it really is. Debug `endingPreview(hard)`. In English, Finnish and Japanese.
- Tests: the smoke opens the preview and checks the title, the PREVIEW line, four grades in the tally, a total, and that the campaign's storage is untouched.
- Cache tokens `?v=119` → `?v=120`; HUD label → `2.0 · v120`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
