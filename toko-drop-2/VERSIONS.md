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

## v68 — 2026-10-31
**World 2 costs less to draw**
- v65-v67 made world 2's frame dearer. Measured under SwiftShader (the same held scene, a camera over the slab, three runs each): v64 130 ms, v67 162 ms, v67 with the cracks taken out 141 ms. The cracks' cell network is the dearest thing in the floor's picture, and the bigger daylit lawn added the rest.
- The crack network is worked out only inside the slabs that have cracks: a branch that is the same over a whole patch of the screen, which a phone's GPU skips a group of pixels at a time. Its line's antialiasing is taken outside the branch, from how fast the floor moves under a pixel, since a derivative may not sit in a branch. The cracks look the same.
- The lawn round world 2's slab, and every other world's ground round its floor, are drawn after the floor instead of before it, so the depth test throws away the grass and the ground under the floor before they are shaded. Nothing on screen changes.
- Measured the same way: world 2 at 147 ms (v67 162). SwiftShader is a CPU, so this is a direction, not a phone's number: a PLAY RECORD sent from a phone is that (A10).
- Cache tokens `?v=67` → `?v=68`; HUD label → `2.0 · v68`

---

## v67 — 2026-10-31
**YELA tumbles on the diagonals too (owner)**
- The owner's YELA sketch (art-ref/concept-yela-orange.jpg) says "diagonal movement", and on 2026-10-31 they chose it for the game: YELA CUBE picks from eight headings now, where 1.x's had the four cardinals.
- The heading, when a rest runs out: toward you is the nearest of the eight (1.x took the cardinal of the larger axis, a staircase on a diagonal) 70%, its last heading 20%, any of the eight 10%. Into a wall a cardinal turns back along its axis as before; a diagonal turns back on the axis it would cross, either or both, as a ball off a cushion.
- A diagonal flop is a half roll over its corner, about the ground axis across its line: corner, edge, corner. A cube turned 180° about a face's diagonal is itself again, so it lands on a face, one face on along each axis, its lowest corner on the floor all the way. Its cycle is its longer run at the same speed (2L√2 / spd), and its flop may take twice a cardinal's 0.30 s cap (`flop.diagTime`): a half turn where a cardinal makes a quarter. Its average speed is unchanged.
- Measured: the arcade curve re-run (scripts/curve.mjs, two bots, 24 seeds a world). YELA took 17 lives before and 17 after; the worlds' clear rates move both ways, within the noise of a run's random stream, which YELA's rolls reshuffle.
- test/species/yela.mjs: 122 checks, the eight headings, the diagonal flop, the cushion turn and the half roll drawn among them.
- Cache tokens `?v=66` → `?v=67`; HUD label → `2.0 · v67`

---

## v66 — 2026-10-31
**World 2 in summer daylight, its curb taller than the hero (owner)**
- The owner's answers on v65 (2026-10-31): the curb "taller than the hero", the style sheet's Micro Machines scale (PR #630: the hero tiny against the curb), and world 2 in summer daylight instead of at night.
- **Micro Machines**: the curb is 1.2 m tall and 1.0 m wide (v65: 0.34 × 0.55; the hero is 1 m across), its pieces 3 m long, the corner arms 1.6 m, the rounded ends 1.0 m. The lawn's blades and mower stripes are grown with it, and the tufts are 0.5 to 1 m tall. The arena reads as a toy on a lawn.
- **Summer daylight**: the slab is light concrete in the sun, a little warmer toward the far end (it was a night slab under a garage flood), with the hero's own pool of light all but gone in the day. The curb shades the slab and the grass along it. The lawn is a bright summer green going into a pale haze over 30 m (it fell into the night over 8 m), and runs 40 m out so the play camera never sees past it. Behind it is a light sky, which is also the void the floor runs out over when the droplet lands in world 2: `scene.background` follows the floor's void now, the night everywhere else.
- The cracks are fainter on the light slab (depth 0.45 → 0.3) and in fewer slabs; the slab's storm drain is the size of the drain the way down opens through.
- The HUD's text has a dark edge (a text shadow), so the score, the heat, the clock and the lives read over the sunlit slab; over the night floors it does not show.
- The curb's grit is the same on every face (on the tall sides it ran in diagonal streaks).
- Cache tokens `?v=65` → `?v=66`; HUD label → `2.0 · v66`

---

## v65 — 2026-10-30
**World 2 built to the owner's curb and lawn sheet: curb pieces, corners, rounded ends, grass tufts, cracks, the storm drain**
- Of the concept pack in PR #630 the owner approved one sheet, "World 2 — curb / lawn modules" (eight drawings), and nothing else. Built in the game's own look (its light, its night slab), not in the sheet's ink and wash (art-ref/README.md: mood and design, not a style to copy):
  1. **Straight curb**: pieces about 2.2 m long, the top rounded off at both edges, a seam between them (a real 3 cm gap, darkened a few cm either side) and each a shade of its own. It was one box a side with painted joints; it is 0.55 m wide and 0.34 m tall now (was 0.4 × 0.2), so it reads from the play camera.
  2. **Corner**: an L at each far corner, two 1.1 m arms mitred where they meet.
  3. **Open near-side end**: each long curb ends rounded down into the grass, a quarter circle 0.34 m long. The near side stays open.
  4. **Grass tufts**: clumps of tapering blades bent out from the middle, along the outside of the curb (some left out), three to each far corner and one beside each near end. Never along the near side.
  5. **Lawn**: as it was, with the curb's shadow on the grass along its outside.
  6. **Concrete with cracks**: hairline, jagged and branching, stopping mid-slab, in some of the slabs and faint (v48's lesson on the ice: a texture under the fight, never lines across it). They are the edges of a cell network (`cells` in scenery.js), jagged by a fine wobble.
  7. **Storm drain grate**: a round iron frame round 26 capsule slots in rows of 4 6 6 6 4, set in the slab toward the far right corner (clear of the HUD). The drain that opens where the boss went down, the way to the sewer, is the same grate now; it was a square of six bars.
  8. **Arena layout**: the curb round the far side and both long sides, the slab inside it.
- The curb is one mesh (three runs, each piece built from its cross-section) and the tufts one instanced mesh; the cracks and the grate are part of the floor's picture, so the floor's light lies on them and they turn with the slab when the drain opens. Every number is TUNING.scenery.driveway and TUNING.worlds.floor.concrete.
- Cache tokens `?v=64` → `?v=65`; HUD label → `2.0 · v65`

---

## v64 — 2026-10-30
**PLAY RECORD copies inside itch's frame too**
- Getting the itch build ready (v63's zip, checked in an itch-style frame on another site) turned up that OPTIONS → PLAY RECORD could not copy there: a game on itch runs in a frame from another site, and inside such a frame the clipboard API is blocked unless the frame is allowed `clipboard-write`. With itch's allow list it threw "blocked because of a permissions policy", and the record fell through to a downloaded file, which on a phone is a long way round to a message. Measured with a real tap: in a frame without `clipboard-write` the API fails and the older copy command (`execCommand('copy')`) works; with it, both work.
- `shareRecord` (main.js) now tries the copy command when the API fails, before the share sheet and the file. On the arcade's own page nothing changes: the API works there as before.
- `scripts/itch-check.mjs` hands the record over from inside the frame: the room it plays leaves an entry, a real tap (a mouse event at the button, as a finger is) on OPTIONS → PLAY RECORD copies it, and the host page reads the clipboard back. Checked both ways: the v63 build fails it (the button says SAVED AS A FILE, the clipboard is empty), this one passes. (Two traps in the harness, not the game: the campaign grid a room's result opens builds after its levels load and can replace OPTIONS a moment later; and a headless window is smaller than the 960 × 540 frame, so scrolling a button into view scrolls the host page too, and a tap must be placed where the frame sits now.)
- meter.js: a comment said `drop %` for what the record calls the late share.
- Cache tokens `?v=63` → `?v=64`; HUD label → `2.0 · v64`

---

## v63 — 2026-10-30
**PLAY RECORD measures the phone: every room and run says how the phone ran it, and how the flicks read**
- The scorecard's A10 (runs well and controls well on real phones) waited on a device measurement; a person's play record is one now. `js/meter.js` keeps a histogram of a run's frame intervals while playing (a tenth of a millisecond a bin; past 100 ms the slow frames' own mean) and the game time they moved, at no cost worth measuring. Each entry carries `f`: the median and 95th percentile frame in ms, the share of frames late (past one and a half refreshes), the refresh (the fastest 5% of frames, as `?fps` reads it) and the game's speed (under 1, the phone could not keep up); and `dv`, the phone in a few words: its kind, the canvas and pixel ratio, WebGPU or WebGL 2, the gel style, the goo.
- On touch the entry counts the aim stick's let-gos as js/flick.js read them (`fl`): flicks that dashed, NEAR flicks (fast somewhere in the stroke, but slowed before the lift or too short: no dash), plain let-gos and taps — the flicks a thumb meant and the reader did not take.
- OPTIONS → PLAY RECORD has a row of its own and a line for the last run: "last run: 60 Hz · 1.4% frames late", with "· game at 0.9×" when the phone could not keep up, in all three languages. (The panel already scrolled on a 375 × 667 phone, 32 px; it scrolls 75.)
- `scripts/record.mjs` reads it: THE PHONE, per phone the frame median and 95th, the late frames, the refresh and the lowest game speed, flagging a stutter (more than 1 frame in 20 late), a game that slowed and a phone held to 30 Hz; and the aim stick's let-gos, flagging near flicks at a fifth or more of the fast strokes (the flick's floors may sit high for that thumb, TUNING.input.flick).
- Headless Chromium on SwiftShader, a software GPU at about two frames a second, reads `[487, 487, 86.4, 60, 0.18]`: a machine that cannot keep up reads as one.
- Tests: test/record.mjs (32: the meter on a 60 Hz phone, a 120 Hz one, one that cannot keep up and one with every frame slow (a frame over 100 ms is late on any screen); the phone in a few words; the entry's new fields, and none when there is nothing to say), test/hero.mjs (a fast stroke too short to dash counts as a near flick; the counts start again with each run).
- Cache tokens `?v=62` → `?v=63`; HUD label → `2.0 · v63`

---

## v62 — 2026-10-29
**HARDCADE gives a life back at every world's door, up to three**
- Owner, 2026-10-29: "Give back a life per world in Hardcade". Measured world by world (docs/CURVE.md), HARDCADE gave no lives back and a good player's run mostly ended in world 3: the good bot walked into the sewer with about one life and got through it 17% of the time.
- `TUNING.worlds.heal.hardcade` 0 → 1: as each world opens, one life comes back, never past three (sim/worlds.js swap). ARCADE still gives them all back. The banner says A LIFE BACK +1 for one, LIVES BACK for more; the title's HARDCADE line says one life comes back a world, in all three languages, and so does the itch text.
- Measured (scripts/curve.mjs, eight bots, 24 seeds, each world walked into with the lives and kit a run carries — the chain now gives the life back at each door as the game does): the six skilled bots' mean through each world 94, 79, 41, 30, 28, 20, 22, 16, 13% → 94, 85, 53, 41, 33, 21, 31, 20, 13%; the good bot through the sewer 17% → 33%. Whole runs (12 seeds): the expert's HARDCADE runs reach wave 35 on average (31), the good bot's 25; ARCADE's twelve are the same, wave for wave.
- Tests: test/worlds.mjs — HARDCADE gives one life back and says so, and a full hand stays full.
- Cache tokens `?v=61` → `?v=62`; HUD label → `2.0 · v62`

---

## v61 — 2026-10-29
**PLAY RECORD: every room and run you play is kept on your phone, and one tap copies it to send**
- Owner, 2026-10-29: "Continue". Everything the scorecard still lacks waits on a person — the grade lines, the curve, HEAT, the mutators against someone's runs (docs/COMPLETION.md) — and a person's runs only count once they are written down.
- `js/record.js`: every finished campaign room (room, HARD or not, grade, score, how it ended, time, hits) and every arcade run (world and wave reached, score, won, and each life lost with its wave and what took it) is kept in this browser, the newest 400 (`TUNING.record.cap`), with the version, the time, the input (touch, pad or keys) and which way up the screen was. A room or run left from the pause menu is kept too, as a quit: where a person stops is not where they lose. Nothing leaves the phone on its own.
- OPTIONS → **PLAY RECORD · n** copies it as text to paste into a message (else the phone's share sheet, else a file), and says what it did.
- `scripts/record.mjs` reads a pasted record against the bots: per room, the first try's grade and the best, the score against today's lines, and two flags — an S on a first try (lines that may sit low) and three tries never past F (a room that may ask too much); per arcade world, how often a run got through it beside the six skilled bots' curve (docs/CURVE.md), where the lives went, and where runs and rooms were left.
- Tests: `test/record.mjs` (in the smoke): what it keeps and drops, a real room's and a real run's entry, a quit, and the text reading back out of a message.
- Cache tokens `?v=60` → `?v=61`; HUD label → `2.0 · v61`

---

## v60 — 2026-10-29
**WHITE HEAT: in two rooms the multiplier climbs past ×8 to ×16; THE BRAID banks; and every campaign world has a room with a mutator**
- Owner, 2026-10-29: "Continue". The scorecard's C5 said the campaign had two mutators on five rooms and "the owner left room for more"; its first two worlds had none.
- **WHITE HEAT** (`white`, sim/heat.js): the multiplier's ceiling is ×16 instead of ×8. Past ×8 the drain grows with every level, so ×16 holds only while you keep killing, and a hit throws it all away as ever. Past ×8 the halo under you stops growing and burns white, and the HUD's × and its bar turn white (`TUNING.heat.white`, `heat.view.white`).
- On **THE POUR** (THE SURFACE), where every bot sat on ×8 for most of the room: scores nearly double, and the first-timer falls further behind the good player (C at 73% of S, was 80%). On **CRUCIBLE** (THE KILN), where only a good player gets past ×8: the good bot's median 71k → 105k, the ordinary bot's 56k → 62k, the gap between them 1.28× → 1.68× (HARD 1.40× → 1.85×).
- **THE BRAID** (THE WELL) BANKs: there a first-timer, hit more but heating on close kills, out-scored the ordinary player (8.1k against 6.9k; on HARD 12.0k against 10.7k). With BANK a hit loses the pot, and the order comes right: 12.2k, 6.8k, 5.9k (HARD 13.7k, 8.4k, 7.1k).
- **Tried and dropped, FEVER** (heat in twice as fast and out twice as fast): THE POUR's lines did not move, its bots already sat on ×8, and THE BRAID's bots all rose by the same third. No new decision, nothing separated.
- The three rooms' lines redrawn, normal and HARD (scripts/room-tiers.mjs): THE POUR's S 150k → 260k, CRUCIBLE's 71k → 100k, THE BRAID's S as it was and its C 5.5k → 3.5k. How often each bot gets through is unchanged: a mutator moves the score, never the room. Three mutators on eight rooms, at least one in every world (`MUTATORS`, scripts/campaign-rooms.py).
- Tests: test/campaign.mjs checks the ×16 ceiling, a kill paid there, a hit, the ×8 ceiling without it, and that every world has a mutator room.
- Cache tokens `?v=59` → `?v=60`; HUD label → `2.0 · v60`. v50–v59 rolled into the Archive.

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
