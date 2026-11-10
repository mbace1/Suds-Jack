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

## v135 — 2026-11-10
**The campaign's C lines where a beginner reaches them: 26 lowered, nothing raised**
- THE ASK (owner, 2026-11-10, asked the C-line rule measured at v128 and shown before it shipped: "Yes, lower them"). C is a room's passing grade — under it the room is an F and the next stays shut — and v121's stand-in beginner stopped at THREE RINGS, through three times and each time just under its C line of 20,000. The rule: C at the beginner bot's lower quartile (it was its median), every room, both routes; S, A and B do not move, and a line never goes up. 26 C lines come down (each room's tiers `source` says so); the beginner bot now clears C about three times in four where it cleared it about half the time (THREE RINGS 54% → 75%, PULSE 41% → 76%, HARD PAIN NEEDLE 27% → 82%). HIGH GROUND, the other flag, was drawn again on 48 seeds and stays.
- The 26, from → to:

| room | route | C was | C now |
|---|---|---|---|
| THREE RINGS | normal | 20,000 | 15,000 |
| IN ORDER | normal | 7,000 | 6,900 |
| EDDY | normal | 3,500 | 3,400 |
| THE SLUDGE | normal | 7,800 | 7,000 |
| FLOTSAM | normal | 22,000 | 18,000 |
| SLUG RUN | normal | 3,500 | 3,100 |
| UNDERTOW | normal | 3,300 | 3,200 |
| SPLITTER | normal | 5,400 | 5,200 |
| CLOT | normal | 35,000 | 30,000 |
| PULSE | normal | 24,000 | 20,000 |
| NEEDLE | normal | 13,000 | 11,000 |
| THE PULL | normal | 5,200 | 5,000 |
| RINK | normal | 6,200 | 6,100 |
| SALMON | normal | 12,000 | 11,000 |
| ANVIL | normal | 2,900 | 2,800 |
| GATE RUN | HARD PAIN | 32,000 | 27,000 |
| IN ORDER | HARD PAIN | 12,000 | 11,000 |
| EDDY | HARD PAIN | 5,500 | 5,300 |
| THE SLUDGE | HARD PAIN | 12,000 | 11,000 |
| FLOTSAM | HARD PAIN | 34,000 | 31,000 |
| SPLITTER | HARD PAIN | 8,000 | 7,900 |
| NEEDLE | HARD PAIN | 19,000 | 16,000 |
| THE PULL | HARD PAIN | 7,900 | 7,200 |
| SIX SHOTS | HARD PAIN | 5,000 | 3,900 |
| RINK | HARD PAIN | 9,900 | 9,200 |
| SALMON | HARD PAIN | 18,000 | 17,000 |
- Decided the same day: the itch page is PAY WHAT YOU WANT (docs/ITCH.md); the upload is the owner's.
- Cache tokens `?v=134` → `?v=135`; HUD label → `2.0 · v135`

---

## v134 — 2026-11-10
**A heart room started again shows its heart whole**
- THE ASK (owner, 2026-11-10: "In campaign mode, save the heart. The previous damage to the heart remains after a restart"). The heart itself was new and whole every time (the sim makes it fresh for each start), but the ring round it that shows what it has left kept the last attempt's: the view's reset marked the ring whole without redrawing it, so a fresh heart matched the mark and the old ring stayed until the heart was next hit. Measured in the game: CLOT bitten to 4/8 and played AGAIN — the new heart 8/8 under half a ring; FLOTSAM bitten to 7/10, quit and started again — 10/10 under 0.7 of a ring.
- THE FIX (render/challenge.js): the reset marks the ring unknown, so the next room's heart draws its own. Both rooms, both ways back in (AGAIN; QUIT and START), now show the whole ring from the start; a check in test/view.mjs draws a heart at 4/8, resets, and holds the ring at 8/8 to all of it (it fails on v133: 0.5 → 0.5).
- Cache tokens `?v=133` → `?v=134`; HUD label → `2.0 · v134`

---

## v133 — 2026-11-10
**The film builds its shaders before it starts, behind black, and plays without a hitch**
- THE ASK (owner, 2026-11-09: "It lagged through the intro"). v131's fix was measured and was not enough (a phone-sized window, 390×844, on a software GPU, the film started on world 2): v130 built 43 shaders while the film played, its worst frame 3.8 s; v132 39, worst 2.1 s, 35 of them in the film's first 0.7 s (frames of 0.8, 2.1 and 1.1 s). Starting on a later world puts every lit thing under that world's light, which is a new shader for each, so what the title built does not carry over; and three's compileAsync, which v131 asked on the film's first frame, works through a scene an object a frame — the film drew on and built them itself, blocking.
- THE FIX (main.js warmDraw): the film HOLDS on black for one frame in which the whole scene is drawn into a corner eight pixels square — everything shown and nothing culled, every empty pool given one of its kind — and then the film itself at the eight moments it switches things on (its cards, the gather, the land, the grid, the eyes, the HUD); the black drawn over it is all that shows, and the film is put back at its start. It rolls, with its sound, once the GPU reports that work done (WebGPU's queue, WebGL 2's fence), three seconds at most. A press during the hold still skips into the run; a capture (the clips, the shots) runs unheld.
- Measured the same way: no shader is built during the film now (all 49 in the held frame), its frames run at a median 100 ms on the software GPU (v132 150, v130 267); the price is the black before the logo, all of it the GPU compiling — about six seconds on the software GPU; a phone's own GPU compiles far faster, which the PLAY RECORD's frame times will say.
- Not covered: the TILT-SHIFT lens draws through its own pipeline; the hold builds for it all the same (its pass is the one drawn), but it was not measured.
- Fixed on the way: v131's compile on the film's first frame is gone (the hold replaces it).
- Cache tokens `?v=132` → `?v=133`; HUD label → `2.0 · v133`

---

## v132 — 2026-11-09
**Every shadow grows out of its body — as wide as the body where it leaves it, darkest at the foot — and the domes stand on the widest of themselves**
- THE ASK (owner, 2026-11-09: "Shadows should not be as circular at the point where they connect with character, because now that makes them look like they are floating"). Read off crops of the driveway beside the owner's golden-hour concept: v128–v131's shadow was an ellipse whose round end met the body NARROWER than the body and was darkest two radii out, so each body hung over a separate blob; v131's round contact shade drew a ring round every foot; and on the gels there was hardly a shadow to see at all — the light through the jelly, laid as a long coloured patch down the shadow, washed it out (a glowing tail where the concept has dark).
- THE SHADOW (render/light.js, where a world casts hard shadows: the driveway): each body throws its own projection — the foot it stands on, then the rest of it laid away from the sun. A dome's and a ball's is the foot and half of the ellipse its top throws (the exact shadow of a dome); a bollard's runs straight on to a round cap, a cube's to a square one. So it leaves the body at the body's full width, with no neck and no round cap at the foot, sharpest and darkest there, softer and lighter toward its tip (TUNING.worlds.light.driveway.shadow.cast). One quad a body, its shape carried in the instance colour; v131's contact disc is gone. A jelly dome's shadow runs half as far again as a dome one radius tall would in this sun (`dome` 1.45) — the concept's length, a choice of the look rather than the sun's geometry.
- THE POOL: the light through each gel now pools in its shadow just past its foot (`caustic` at 1.0 radius on, 0.42 × 0.36 radii, 0.7 as bright), not along the shadow's length.
- THE DOMES (the owner's v131 ask, "flatter and close to the ground", taken one step further): 1.x cut its sphere 0.7 below the middle — 85% of a ball, widest above the floor and curling in under itself, so the floor showed lit under every rim. Cut 0.25 below (TUNING.blob.domeCut), a dome stands on the widest of itself, about one radius tall, as the concept's; v131's squat goes back to 1 (the lower cut makes the height). The jelly death's halves, the lids and crowns on the domes and the lean all read the same cut. The species' shapes stay 1.x's.
- Fixed on the way: the itch check took the build's number from the first `?v=` on the page, which since v131 is the arcade's HOME button script (it read v230 for v131); it reads main.js's now.
- Unchanged: the sim (a body's reach and hits are its radius), the rules, the lines; the worlds without a hard sun keep their soft shadow.
- Cache tokens `?v=131` → `?v=132`; HUD label → `2.0 · v132`

---

## v131 — 2026-11-09
**The bodies sit on the ground — flatter domes, a shade where each one meets the slab, its shadow from its foot — and the opening film is the one it was, in the owner's letters, smooth, and shows nothing of a later world**
- THE FILM (owner, 2026-11-09: "The Toko Midori Games text should still be horizontal like before, then camera moves to Toko to show Drop. And so on, see how it was before, just needs the new text now"): v130 had stacked the words as the owner's block; the film is back to its own staging — "Toko Midori Games" on one line beside the face, MIDORI goes, the camera comes in on Toko and "drop" comes in under it — with only the letters the owner's (each word on one baseline, the same height, the brand's one-line setting; no ™, the original has none), and "drop" made of the same letters.
- THE ASK (owner, 2026-11-09): "the enemy and characters look like they are full circles floating with the new shadow. They should be flatter and close to the ground". v128's hard shadow started a body's length away from it, narrow where it began, so in the low sun every body read as a ball hanging over its shadow. Now a shadow runs from the foot to where the top's shadow falls (its height × cot θ: a dome short, a cube and a bollard longer), as wide as the body where it starts, and every body sits in a soft CONTACT shade where it meets the slab (render/light.js; the driveway's light, TUNING.worlds.light.driveway.shadow). And a dome stands about its own radius now, not most of a ball: every dome is drawn SQUAT (TUNING.blob.squat 0.8, on the body's squash node — its shapes stay 1.x's, which the species checks hold them to), so from the camera it is a dome, not a circle; its death halves and its shadow's length follow, and the goo lands on the lower tops.
- THE ASK, TOO ("It lagged through the intro and also it showed world 2 environment art when it started"): a run that starts on a later world plays the film over that world, and the driveway's bollards and beach ball stood under the logo and beside the falling drop — they wait with the world's set now, until the grid reaches the rail. And the lag: that world's floor, set and posts compiled their shaders mid-film (v128's floor is the dearest yet); they are compiled on the film's first frame, off the frame loop, while hidden. The floor, which is the void until the drop lands, is not drawn until then, and the lockup's cards are painted and sent to the GPU on the title, not in the film's first second.
- THE WAY HOME (owner: "drop 2.0 needs the hub button at the top left"): the arcade's HUB button, as every other cabinet has (the hub's own hub/shell.js: top-left, and a held Start or Back goes home too), loaded only where the game stands in the arcade — the itch build and a local checkout have no hub beside them — with the score and lives moved down under it when it is there.
- Unchanged: the sim (a body's reach and hits are its radius, as before), the rules, the lines.
- Cache tokens `?v=130` → `?v=131`; HUD label → `2.0 · v131`

---

## v130 — 2026-11-09
**The opening logo says the owner's words in the owner's letters: Toko, Midori and Games as their original sets them — and "drop" made of the same letters**
- THE ASK (owner, 2026-11-09, with their lockup: "the text in the beginning logo is a bit wrong, please use this instead"). The intro drew "Toko Midori Games™" on one line in letters drawn by eye before the original was found (an M with a slash through it, a G that was a C, a boxed a and e). The brand has since TRACED the owner's original (toko/js/wordmark.js, 99.2% of its pixels), and the intro now draws that (intro/wordmark.js, vendored from it): Toko set large, Midori and Games under it, flush both sides, and no ™ — the original carries none. The face stays as it was (the owner, to the brand: "the face part is good"), as tall as the block beside it, as in the brand's lockup.
- "drop": MIDORI and GAMES go, and "drop" comes in where Midori stood, built from the owner's own letters — Midori's d, r and o, and a p that is the d turned half round, its stem below the line where the drop gathers. The camera's shots are refitted to the stacked lockup, on a landscape screen and an upright phone.
- Unchanged: the rest of the film, the sim, the rules, the lines.
- Cache tokens `?v=129` → `?v=130`; HUD label → `2.0 · v130`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
