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

## v117 — 2026-11-04
**Every level played by bots: corpse fire now passes through a heart (on HARD, CLOT could not be won), and the bots read the warning lines a person reads**
- THE BOT TEST (owner, 2026-11-04: "Test all the levels with bots"): the soak (972 runs over every mode and world: nothing broke, 66 bodies and 275 bullets on the floor at the most), the arcade world by world in both modes (eight bots, 24 seeds a world), all 36 campaign rooms on both routes (three bots, 24 seeds a room), and the real game in a browser through every world and every room on both routes (every world in ARCADE and HARDCADE and every room on both routes, the game's own bot playing: all 90 reached and drawing, no page error, no fault box).
- THE BOTS WERE BLIND to v103's warning. A corpse's fire waits half a second as a line on the floor for every bullet it will fire; the bots met those bullets only once they flew, and only after their reaction time — so on HARD, where every corpse fires, 13 of the 36 rooms read 15 points or more harder for the sharp or the average bot than when their lines were drawn, as if v103 had made HARD harder. It had not: taught to read the lines (scripts/bot.mjs — a seed is taken in, or missed, from the moment it shows, and its reaction time runs from then; its lines are the bullets they will be, and then the bullets that came out along them, known), the sharp and average bots get through HARD's rooms at the rates their lines were drawn from, a mean +0.4 and +1.9 points over the 36, and one room of the 13 stays down (CLOT, below). The rough bot is 6.9 points under: its 0.65 s reaction is longer than the half-second warning. Only the instrument changed.
- ONE ROOM WAS BROKEN: CLOT on HARD (protect the heart) — no bot got through, the sharp one included. Its heart died to corpse fire: 43 of the 48 hits it took. A corpse aims at where you stood when it died, and in a protect room you stand by the heart, so every body killed across the heart from you fired through it, a line you could not aim away. Corpse fire now passes through a heart (sim/challenge.js); a gel's own bullets and a body on it still hurt it. CLOT on HARD: 100 / 96 / 4% through (sharp / average / rough); FLOTSAM, the other heart room (escort), 100 / 100 / 58% (the rough bot 12% before). Their HARD lines re-drawn from the pass: CLOT 93,000 / 84,000 / 76,000 / 68,000 (within 1% of the old), FLOTSAM 82,000 / 66,000 / 59,000 / 34,000 (its A was 50,000: a heart kept whole pays for itself). On the normal route both rooms are as they were (the same rates and the same lines). The same rule holds for a heart in an arcade trial wave.
- THE ARCADE, re-measured with bots that read the lines (eight bots, 24 seeds a world, each world walked into with the kit the run carried): ARCADE falls world by world as v59 meant — the six skilled bots' mean 99, 93, 90, 81, 78, 74, 68, 63, 35, world 9 about a third — and the bumps the blind bots showed at worlds 5 and 7 are gone. HARDCADE: 99, 90, 63, 44, 39, 31, 42, 30, 17 — world 7 easier than world 6 by 11 points, as it has been since v62 (10 then), and world 7's third wave the hardest wave outside a boss in either mode (32% of the lives HARDCADE's world 7 takes; ARCADE's worst is 24%). No wave but a boss takes most of a world's lives. Left as they are (docs/CURVE.md).
- THE NORMAL CAMPAIGN: every room's average bot gets through at least half the time; 32 of the 36 within 15 points of the rates their lines were drawn from. Named, not changed: PACK-ICE is out of its band (the rough bot gets through 67% where a d7 room asks 0–60%); THE CORE's A and B lines and THREE RINGS' C come out about 30% under what the bots score now. A lines pass is the owner's call.
- Tests: test/challenge.mjs checks a gel's bullet on the heart lands and corpse fire passes through it (fails on v116).
- Cache tokens `?v=116` → `?v=117`; HUD label → `2.0 · v117`

---

## v116 — 2026-11-04
**A phone pass: no shader is built mid-fight any more for a body, a trail, a tag or a ghost — one compiled graph a kind of thing, and the rest compiled on the title**
- MEASURED FIRST (the real game loop under its own bot, Chrome's profiler and three's builder counted): the steady frame was fine, the HITCHES were not. three keys a compiled shader by the graph's nodes, and every gel body made its own nodes — so every body past the most of its kind the run had yet seen was a fresh shader build (a few ms here, tens on a phone), in the frame it arrived: a purp splitting into minis built every mini at once. A bot through every world, six seeds, puts the most of a kind on the floor at once at 45 purp minis, 32 redd minis, 19 YELAs, 12 SLUDGEs, 227 bodies' worth of builds a run in all. After the title's warm-up, a burst of 16 bodies of five kinds cost 14 builds (and 2 GPU pipelines) on v115; it costs 0 now.
- ONE GRAPH A KIND OF GEL (render/gel.js `graphOf`): built once per family, jelly and style, shared by every body's material, reading the body's own numbers (its phase, the hit it took, its tear, its squash) off its own material as it is drawn (three's `materialReference` → `userData.u`, the uniforms each body always had, so the core, the looks and the SDF bodies read and write them as before). The same frozen frame on v115 and v116 differs no more than two renders of one build do.
- SLUDGE's trails were two instanced meshes a cube, and three keys an instanced mesh by the mesh itself: every new cube compiled two GPU pipelines. Every trail in the scene is now drawn by one mesh, each droplet carrying its trail's opacity (`aAlpha`): 3 sludges pouring cost 6 builds and 4 pipelines on v115, 0 now.
- A label (DASH THROUGH!, BOUNTY, a pickup's badge, a floating number, v115's tags) is its material's map now, not a texture node a sprite: one shader for every sprite. The dash ghosts share one graph and read their own fade.
- THE TITLE COMPILES THE REST: the light map's first pool and shadow, the goo's first stamp on the floor and the wall, the heat ring, a ghost and the muzzle are drawn once there at nothing's size; and when the title's warm-up ends, everything the scene holds that no frame has drawn yet — pools at no count (the trails, the fumes, the lobs, the chunks) — is compiled off the frame loop (three's `compileAsync`: the builds yield, the pipelines are made on their own time, and nothing is drawn before its pipeline is ready).
- Counted through the first minute of each of worlds 1–3 of a first run under the bot, after the title: shader builds while playing went 20, 4 and 3 on v115 to 0, 0 and 1 (a plate BULWARK shows only when it blocks). The set, the posts and the rams still compile under the dark of each world change, as v74 meant them to.
- Per frame, with 30 bodies on the floor: three's own script time and the game's are where they were (inside the profiler's run-to-run noise). The reference costs nothing you can measure; the builds it saves were the stutter.
- Tests: test/view.mjs checks two bodies of one gel kind share one graph and one program key but not their numbers, and that every label sprite shares one program key (both fail on v115's code); test/species/sludge.mjs reads the trails off the one ribbon mesh (120 checks); the smoke's check of v115's tags reads a sprite's picture off its map.
- Cache tokens `?v=115` → `?v=116`; HUD label → `2.0 · v116`

---

## v115 — 2026-11-03
**The floor teaches its own attacks: STEP OUT! over a giant gathering for its slam, CLEAR THE LANE! by a sewer ram's lit lane — until you have once got out in time**
- v112's slam and v110's rams are told every time — a ring at the slam's reach, a striped lane that beats before the punch — but a first look at a ring on the floor says nothing about what it means. As DASH THROUGH! does for a gate, a line of text now says it: STEP OUT! over a giant gathering with you in its ring or within 2 m of it, CLEAR THE LANE! by a ram's lane that warns with you in it or near it (sim/teach.js decides, render/hints.js draws; TUNING.hints).
- LEARNED for good in this browser (`toko2.hintSlam`, `toko2.hintRam`) the first time you get out of one in time: in it while it warned, out of it when it came. Being hit does not count. Someone who keeps near it and never in it is told 8 times, then not again.
- Drawn only while the game is playing (never over the pause panel, the death beat or the results), and never over the hero: the lane's tag lies on the floor past the lane's end, and where the lane runs across the screen (portrait) to its side, away from you. The slam's sits over the giant, as a bounty's tag does. In English, Finnish and Japanese.
- A ram's lane is one test now (sim/posts.js `inLane`): what keeps a spawn, a gate or a drop out of a lane is what the tag reads.
- Tests: test/teach.mjs (16 checks: shown near, not far; counted only while it can be seen; learned by getting out, not by being hit; the cap; where the lane's tag stands both ways); the smoke draws both tags for a staged warning and neither while the game is not playing.
- Cache tokens `?v=114` → `?v=115`; HUD label → `2.0 · v115`

---

## v114 — 2026-11-03
**Bullet sponges you can see soaking it up: a big body sheds goo where it is hit, and wears down as its life goes (owner: "anything that pushes the gelatin look and behavior is great for enemies")**
- A BRUTE, A TANK OR A GIANT (v105's sizes 3-5) HIT sheds a little of its own goo where the shot went in — a droplet every other hit from a brute, two from a tank, two on every hit from a giant — the droplets flying and melting into the floor as every chunk does (render/actors.js; TUNING.sizes.wear). Before, a body with four or six times the life took a stream of shots with nothing to show for it but the ripple every body shows.
- And it WEARS: it draws up to 8% smaller as its life goes, losing goo it does not get back. The view's alone: what it reaches in the sim is its size's, whatever is left of it.
- docs/ITCH.md: the page's ARCADE section says what v105–v112 added — the sizes and the giants, the formations, the floor's own things and what moves among them, the gate family.
- Cache tokens `?v=113` → `?v=114`; HUD label → `2.0 · v114`

---

## v113 — 2026-11-03
**Polish: the ice reads as ice, the cistern's broken columns as broken stone, and the columns cost less to draw**
- THE ICE'S BLOCKS (render/posts.js): they read as ice, not blue plastic — every face that looks up is frosted pale where the sun catches it, the sides deepen toward the floor, and a little snow has drifted round each one's foot. Their sides stay the deep blue v109 gave them, so they still stand out on the pale sheet from above.
- THE CISTERN'S COLUMNS: the middle of a break lies flatter, with rubble lying in it, so it reads as broken stone rather than as a pinwheel of cut faces.
- FEWER DRAWS: a part drawn with several materials (a column's shaft: its side, its break, its foot) is cut along its groups and folded in with the rest of its model (render/posts.js `byMaterial`): a column is three draws where it was four, the cistern's floor twelve where it was sixteen.
- test/smoke.mjs: the floor's colour check reads the median of nine patches spread over the lower left of the floor — a big yellow cube had covered all four of v109's close ones, and taking the darkest instead let a patch past the floor's edge stand for the floor.
- Cache tokens `?v=112` → `?v=113`; HUD label → `2.0 · v113`

---

## v112 — 2026-11-03
**The giant's slam: a giant's own attack, told and bullet-free (owner: "a bit less shooting and more unique patterns")**
- THE SLAM (sim/slam.js, TUNING.sizes.slam): a GIANT (v105's size 5) now has an attack of its own, and it fires nothing for it. On its own beat — its first some 3 s in, staggered by the body so two giants never slam as one, then every 5½ s — it GATHERS: it stops where it is, squashes down onto the floor, and a ring on the floor shows exactly how far it reaches (its rim and 2.4 m more). 0.9 s later it SLAMS: inside the ring when it lands, you are hit (unless in a dash or your mercy, as any hit); outside it, nothing at all. The bodies in its reach are thrown outward — a giant clears its own crowd — and it rebounds off the slam.
- Never aimed and never a surprise: it is the giant's own ground, told every time, so the answer is always the same — step out of the ring, or dash through the moment it lands.
- HOW IT LOOKS (render/slam.js): the ring on the floor at the giant's reach, filling in as the moment comes (a sign, not a light: no glow); on landing it jumps out and fades, and the giant's own goo is thrown round it.
- Sound (audio.js): `slamWarn` a low groan rising to the moment, `slam` a heavy thud under a burst of noise; the screen shakes a little.
- The death screen names it: GOT YOU · ITS SLAM, with the giant's own card (main.js `killer`, ui.js `itsSlam` in all three languages).
- The bots read the ring as a person does (scripts/bot.mjs: the ring at the moment it lands is a hazard).
- MEASURED (scripts/curve.mjs, worlds 2-9, 24 seeds, against v111): the curve does not move — the sharp bot clears 69.6% of the worlds (68.8%), the average 25.6% (26%); in 810 lives lost not one went to a slam, while in real waves a giant does slam (31 giants, 111 slams in eighteen two-minute runs, an idle hero inside the ring for 10 of them). Read as the bots read it: told, and stepped out of. What it changes is how a giant is fought, not how hard.
- test/slam.mjs (new, in the gate): a giant is told then slams on its own beat, the warning carrying its reach; it holds still and squashes while it gathers; inside the ring you are hit and named for it, outside nothing; the bodies in reach are thrown out and those past it untouched; a tank never slams, nor a boss; two giants do not slam as one.
- Cache tokens `?v=111` → `?v=112`; HUD label → `2.0 · v112`

---

## v111 — 2026-11-03
**The driveway's ball: something rolls across the second world too (owner: "We need some dynamic elements")**
- THE BALL (sim/posts.js `ball`, TUNING.posts.worlds[2]): world 2 was the one later world with nothing moving on its floor. A beach ball as big as four of you, at the driveway's Micro Machines scale, rolls across it at 1.6 m/s and comes back off its rail, its bollards and a gate's beam.
- IT IS LIGHT, the one post that gives way: you and the bodies are heavier, so walking into it SHOVES it on (as hard as you came on, a dash into it sends it flying) and it NEVER moves you or pins you; standing in its road, it comes back off you. A shot — yours or a gel's — dies on it (cover both ways, as every post) and nudges it on its way, so it is moving cover you can steer. It never stops: a kick wears off back to its roll.
- A spawn, a gate or a drop put down on it is moved off it, as off any post; a drifting gate glances off it.
- HOW IT LOOKS (render/posts.js): six vinyl panels, red, white, blue, white, yellow, white, between two white caps, glossy in the summer light, standing on its own shadow and rolling the way it goes (turned about the level axis across its way by how far it went over its radius); four draws.
- Sound (audio.js): `ballBounce` a hollow vinyl boing, louder the harder it came off something.
- The bots read where the ball will be (scripts/bot.mjs `postAt`), as the drifting blocks.
- MEASURED (scripts/curve.mjs, 48 seeds, against v110): the driveway is unchanged — the sharp bot clears 100% (98%), the average 79% (83%).
- test/posts.mjs: the ball rolls on at about its cruise speed round the driveway, off its rail and bollards, never out of the floor nor into a post; standing in its road you are never moved; walking into it shoves it; a dash sends it flying no faster than its most; a body shoves it; a shot dies on it and nudges it; a gate's beam turns it back; a drop put down on it moves and the ball stays; a run replays.
- Cache tokens `?v=110` → `?v=111`; HUD label → `2.0 · v111`

---

## v110 — 2026-11-03
**The floor moves: the sewer's rams punch out of its walls, the ice's blocks drift (owner: "We need some dynamic elements")**
- THE SEWER'S RAMS (sim/posts.js `rams`, TUNING.posts.worlds[3]): two iron rams in its long walls punch out across a striped lane by turns, every 3¼ s one of them — told first: steam hisses in its slot and its lane on the floor beats yellow and black for 0.9 s while its face shows in the wall, then it punches 4.2 m out in a fifth of a second, holds 1.3 s and goes back. Out, it is a post like the others: it blocks, a bullet stops on it, and it SHOVES whatever is in its lane away from its wall, into the floor — never into the wall, so it only ever moves you, it never pins you. Its lane is marked on the floor all the time, faintly.
- THE ICE'S BLOCKS DRIFT (sim/posts.js `drift`, TUNING.posts.worlds[7]): the two blocks slide back and forth across the sheet at 1.1 m/s, each in its own lane — one in the far half, one in the near half — turning back off a line 1.6 m in from the rail (room for a hero between: nothing is ever pinned against the rail) and glancing off each other; on the floe wave they keep the same room off the floe's edge. Moving cover. (Drifting the long diagonals through the middle of the fight was tried first and cost more.)
- A spawn, a gate or a drop keeps out of a ram's whole lane, not just of where the ram is now (`posts.clear`).
- HOW THEY LOOK (render/posts.js): the ram a squat iron head with a rusted face and a ring of rivets on a thick rod back into its wall, in a low iron housing with a striped lip; its lane a band of yellow and black on the floor, faint at rest, beating while it warns, held while it is out (a sign, not a light). A drifting block turns as it goes.
- The bots read where a moving post WILL be (scripts/bot.mjs `postAt`): a drifting block carried on along its way, a ram that is warning or out at its full reach — as a person reads its striped lane.
- MEASURED (scripts/curve.mjs, 48 seeds a world, against v109): the sewer is unchanged — the sharp bot clears 90% (90%), the average 27% (29½%); the drifting blocks cost the ice ~10 points of the sharp bot's clears, so the ice now carries 8% fewer bodies (`room` 0.92, TUNING.worlds.list): the sharp bot 54% (60½%), the average 12½% (8½%).
- FEWER DRAWS: each post's model is folded to one mesh per material (render/posts.js `byMaterial`) — a coral was sixteen draws and is four, a ram fifteen and is four; the deep's floor 48 → 12. On a phone the draw is the cost, not the triangle.
- Sound (audio.js): `ramWarn` a hiss of steam over a low hum, `ram` a heavy iron thump.
- test/posts.mjs: a block drifts at its speed, turns back off the sheet's edge never nearer the rail than a hero can stand in, never runs into the other, and a hero against the rail in its way is never pinned; a run replays; each ram is told 0.9 s before it punches, once a beat, the two by turns, out to its reach and no further with the middle clear (both orientations); a ram shoves the hero and a body away from its wall (one off to its side slides off its round face), stops a bullet when out, and nothing is put down in its lane.
- Cache tokens `?v=109` → `?v=110`; HUD label → `2.0 · v110`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
