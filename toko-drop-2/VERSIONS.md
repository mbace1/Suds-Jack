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

## v96 — 2026-11-01
**The hero's eyes from the owner's style sheet: a big highlight above, a small dot below**
- The style sheet on the concept-handoff branch (STYLE_INSTRUCTIONS, 3: HERO EYES; "hero eyes more defined going forward") draws them as tall black ovals with a big white highlight in their upper part and a small white dot lower right. The ovals were already that shape; the single small glint is now the big oval highlight (TUNING.heroLook.eye.hi) and the dot is added under it (`dot`), both kept inside the black from the angles the game sees him at.
- Cache tokens `?v=95` → `?v=96`; HUD label → `2.0 · v96`

---

## v95 — 2026-11-01
**The river and the ice in daylight, to the owner's approved pictures (the concept handoff)**
- The approved arena pictures for worlds 6 and 7 are bright day; the game had them at dusk and at night (their briefs said so, and the approved pictures win). THE RIVER: clear turquoise down a deep teal middle, the sand and pebbles showing through the shallows, foam at the banks only — v78's white flecks kept at an eighth (they fought the bullets, and the picture has none) — on banks of sand, pebbles, green reeds and grass, the lily pads green with pale flowers, the logs and piles sun-bleached, and dandelion fluff drifting where the fireflies were (by day nothing glows). THE ICE: pale blue with white cracks and frost creeping in from the edge, kept mid blue rather than white so the white hero and the pale gels still stand out on it, in a white snowfield with pale crystals and blue shadows in the drifts, under a bright cold sun. Both worlds' light rigs moved to day (a high sun, a sky ambient), their sun glints narrowed, and the campaign rooms that wear these looks take the same daylight.
- Still to come from the pictures: the river's sparkle and visible shallows at the bank, the ice's raised ledges.
- Cache tokens `?v=94` → `?v=95`; HUD label → `2.0 · v95`

---

## v94 — 2026-11-01
**LENS: TILT-SHIFT in OPTIONS — the run as a miniature, sharp where you play (owner: "look into the tilt-shift look, detailed central area, maybe it works with small objects too if there are enough details")**
- A miniature is read by its depth of field: a lens close to something small holds only a thin slice of it sharp. OPTIONS → LENS (beside STYLE), kept (`toko2.lens`); `?lens=tilt` for a link; the HUD label says ` · tilt`. The scene is drawn into a pass whose target carries mipmaps (as v79's glow did: the vendored three carries no depth-of-field addon) and each pixel is read back bicubically at the mip level its circle of confusion asks for — a thin lens's |z − f| / z, f the HERO's depth, so what you play stays in the sharp slice — sharp inside `band`, opening over `ramp`; nearer than the focus it softens at half the rate (the near side is where the next threat comes from: at full rate a gate at the bottom of the screen was a smear); and a little more saturation, the toy colours a miniature photograph shows (TUNING.lens).
- It works with the small things because they have the detail to carry it: the curb's seams and the lawn's tufts go soft past the far edge while the jelly, its caustics and the cracks under it stay crisp. A first, narrower band read more strongly as a model and cost readability at the top and bottom of the screen; the shipped one keeps the whole play area sharp and softens the surround (scratchpad v94/ holds both).
- It costs the scene drawn into a target, its mipmaps and a full-screen pass: under SwiftShader a frame took about 15–25% longer. Off unless asked for. The smoke plays a run through it (`lens-tilt`).
- Cache tokens `?v=93` → `?v=94`; HUD label → `2.0 · v94`

---

## v93 — 2026-11-01
**The worlds' own light: each floor lit by what stands in it, and every shadow thrown by the sun (owner: "better lights. Actual things that make sense, not just some random stuff")**
- The target came from GitHub: the branch art/toko-drop-2-0-concept-handoff holds the owner's approved module sheets for worlds 2–8 and complete-arena pictures for worlds 4–8, and those pictures are read by their light — the boiler's deck by its fire, the cistern by its roof shaft, the deep by what lives there. docs/ENVIRONMENTS.md names each world's faults against them and the plan.
- The floors stay pictures (the matte rule), so each world's light is worked out in its floor's own shader from the sources that stand there (TUNING.worlds.lit, render/floor.js worldLight): the light falling on a point multiplies its picture (Lambert on a flat floor, falling off with distance), a floor that is wet stone, water or steel mirrors its lights (Blinn on a flat floor), and a glowing source shows even on near-black silt. The sewer's sunlight through its street grates lights the flagstones round each shaft and the rest sits darker; the fire under every boiler grate lights the plates round it, breathing with it, and the deck's seam glows along its edge; the cistern's roof shaft lays a soft pool on the far-left water and its lamps warm the back; the deep's living things throw green pools and its edge glows blue; the core's neon lights the floor at its rim. The river and the ice keep a narrow sun glint only: their approved pictures are bright daylight, and that is a floor-art job, next.
- Every body's shadow is the one the world's sun throws: an ellipse away from the sun, 1/sin θ long, starting under the body (straight overhead it is the disc it was). The driveway's curbs throw their sun shadows onto the slab and the lawn (render/sun.js), its sun stands lower on the near left, and the slab is a stop darker and warmer.
- The jelly in the goo film scatters the world's light rather than its own, so a pool in a dark corner is dark.
- Measured: the nine worlds shot before and after; test/view.mjs on the sun's shadow (overhead: the disc; 38° up from the near left: 1/sin θ long, its middle on from the foot, and back). The smoke's film check now lets the film spread over real frames before reading it: the film is stepped by frames, not by the sim, and world 3 under WebGL 2 read 12 texels without them and 199 with.
- Cache tokens `?v=92` → `?v=93`; HUD label → `2.0 · v93`

---

## v92 — 2026-10-31
**STYLE: PHYSICAL, CEL-SHADED or WATERCOLOR (owner: "Do you have the 3 visual options, watercolor, cell shaded, physical 3d?"; "Test the 'splatter' in multiple styles, as now it's the most washed out watercolor look")**
- OPTIONS → STYLE, kept (`toko2.style`); `?style=cel|watercolor` for a link. PHYSICAL is the game as it was. The two painted looks are drawn from the same bodies, the same displacement and the same goo sims (js/render/style.js): a style changes how a thing is painted, never what it does, so every number the smoke reads is the same in every style. **CEL-SHADED**: three flat tones cut at the terminator, a hard highlight dot, an ink line where a body turns away; the film a flat wash with a crisp contour and an ink band, the drops two tones and a rim. **WATERCOLOR**: pigment (the colour deepened), a soft, part-banded shade, DARK AT THE EDGES where the wash pools — the mark of the medium, and what the washed-out look lacked — grained, over a little paper; the film pools dark at its border, bleeds a little past it and dries to a ring. Tones are factors on the body's own colour (TUNING.style), so a species' colour survives the switch as it survives any light.
- A gel body is built in its style (gelMaterial `style`): a stylised body paints itself with a fragmentNode, skipping the physical lighting and the transmission pass — cheaper than PHYSICAL, not dearer — so the switch rebuilds the views, the hero, the chunks and the strands (actors.setStyle, as the GELS switch does) and runs the title's warm-up again, so the new shaders compile on the title (v74's rule). The floor's film, the wall's and the drops read the style live. Species whose looks build their own materials (the boss auras, CURBKING, MAW) and the SDF gels keep the physical paint.
- Measured: a contact sheet of the splatter in each style (scratchpad v92/), the smoke's style-cel and style-watercolor scenarios (the ordinary run, its kill and its film under each paint), test/view.mjs on the materials and the switch.
- The smoke's film check counts the wall's goo with the floor's: since v81 a gel that dies at the rail throws most of its goo up the wall, and world 3 once read 7 floor texels against 684 on the wall; and its FROM WORLD check knows that one profile serves every scenario, so under a pinned `?world=` the from-key may already hold an earlier run's score.
- Cache tokens `?v=91` → `?v=92`; HUD label → `2.0 · v92`

---

## v91 — 2026-10-31
**Flick to dash at 1.x parity (owner: "get flick to dash to 1.x parity")**
- 1.x dashed on every lift of the aim stick: 4.77 u at 26 u/s, eleven steps, whatever the thumb did before it left the glass. v18 made the dash a FLICK (owner, 2026-10-23: no dash on a plain let-go), and its reader asked the thumb to be still moving AT the lift, above a release speed — but a thumb lands its flick, slowing to a stop before it leaves the glass, and at 60 Hz not one decelerating stroke in the gesture set dashed, however briefly it had stopped. And the dash it bought ran 2.4–11 u at 18–46 u/s, so an ordinary 7 mm flick was 4.1 u at 18 u/s: shorter and slower than the dash a 1.x thumb knew.
- js/flick.js finds the STROKE first — a run of samples faster than `strokeFloor`, one general direction, long and fast enough somewhere — behind whatever landing followed it, and the stroke counts while the landing was shorter than `landMs` (160 ms). A thumb at rest for longer, a slow aim sweep and a 2 mm aim correction are still the plain let-go the owner asked to keep as none. `stopMs` and `releaseFloor` are gone; `peakFloor` 5 → 3, `lengthFloor` 0.3 → 0.25, `strokeFloor` 2 → 1.5 (TUNING.input.flick).
- The lightest flick is 1.x's own dash — hero.flick `d` 2.4 → 4.77 u, `v` 18 → 26 u/s, and the length ramp starts at 0.75 of the stick, so an ordinary 7 mm flick buys exactly 4.77 u at 26 u/s in eleven steps and a longer, faster one still goes further (to 11 u) and faster (to 46 u/s). The CUT's slowest flick now cuts 1.x's two, as the button does.
- Measured two ways against the physical gesture set (scratchpad dashlab/gestures.mjs, plus decelerating strokes): in bare node at 60 and 120 Hz, and through real CDP touch events at 60 Hz. Every flick family dashes — 4 mm in 60 ms, 7 mm in 160 ms, 7 mm then stopped 60–80 ms, 24 mm in 80 ms (11 u at 46 u/s) — and the tap, the resting thumb (604 ms; a flick rested 250 ms), the slow sweep and the nudge do not. test/hero.mjs: a throw stopped 80 ms before the lift dashes, one rested 300 ms does not.
- The smoke's v50 title-geometry checks read the v89 stack now (ARCADE above the HARD switch above CAMPAIGN, MENU below).
- Cache tokens `?v=90` → `?v=91`; HUD label → `2.0 · v91`

---

## v90 — 2026-10-31
**The squeeze: a body pressed from both sides squashes (v82 summed the pushes as one vector, and opposite pushes cancelled)**
- v82 read what pressed on a body as one vector, so a gel pressed from both sides — the middle of every crowd, the hero with a gel either side — read as unpressed and stood round while its neighbours flattened. The sim keeps the pushes three ways now (js/sim/press.js): the vector (the direction), the total (never cancels) and a folded axis (two opposite pushes make an axis, not nothing). The view gives the side facing the push the vector's share plus the balance and the far side the balance alone, so one body against you flattens one side and two either side flatten both; the gel shader cuts the far plane too (`contact` is a vec4: direction, near depth, far depth; the SDF look follows), and the smoke's squash check reads both sides.
- Found by the smoke: under WebGL 2 the hero with a gel either side read 0.005 of squash against the gels' 0.42 each. test/sim.mjs: a squeezed hero has next to no net press, a total and an axis; press() adds every push and folds the opposite ones.
- The smoke's FROM WORLD check (v85) expects the URL's `?world=` to win where a scenario pins a world — that is what the parameter is for — and tests the title's setting in the scenarios that pin none; it had asked a run pinned to world 2 to start at 3.
- Cache tokens `?v=89` → `?v=90`; HUD label → `2.0 · v90`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
