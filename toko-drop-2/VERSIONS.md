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

## v46 — 2026-10-25
**The campaign is thirty-six rooms: the six that scored under 7 rebuilt from nothing, six new ones, and every world walked from its easiest room to its hardest as the bot measured them**
- Owner, 2026-10-25, after the rooms were scored out of ten: *"Redesign the ones under 7 completely from scratch… Then make more challenges and place them into the right order of difficulty."*
- REBUILT from nothing under the same ids, so a grade already saved on one still counts (old score → now): FIRST LIGHT (5.4 → 8.6) waves of GLOBBOs and cubes that never wait for the last one to die, ending with the whole rim at once; THREE RINGS (6.3 → 8.8) three linked circles where SPITTORs and FANNERs come in among the walkers, the shooter first; THE POUR (first-swarm, 6.9 → 8.7) the swarm as a flood of GLOBBOs and red minis; THE BRAID (slug-run, 6.9 → 8.9) SLUGs and RIBBONs from both ends whose long bodies braid the floor while the current carries them; BUBBLE BATH (6.5 → 9.1) a tub with a tap at each end pouring BUBBLAs onto the slick floor; BREATH (5.9 → 9.0) a breathing round floor where every wave is a WARDEN with its escort: shoot the one carrying the shield, then the rest, and go round the BULWARKs' plates.
- NEW, one a world: HIGH GROUND (the SURFACE, 8.7) five rings held in turn, three of them going round the floor, and a ring you leave drains; FLOTSAM (the WELL, 9.2) the heart walks round the rim of a round floor while PYRAs drift in on the current to fire at it: sink each before it does; NEEDLE (the VEIN, 8.5) twelve orbs that go out if you are slow, HOPPAs in the way and the sweep lines across; THE DEEP END (the VOID, 9.0) ANGLER waits in a dark pocket behind a narrow channel; PACK ICE (the FOAM, 8.8) BERG slides through a pack of cubes on the slick floor; BOIL OVER (the KILN, 9.1) KETTLE in a round pot, the crowd arriving on the updrafts, every shot double while it stalls red-hot. Each went through two designs and the better one tuned until all five of `scripts/room-eval.mjs`'s checks passed (the floor never empty for long, a sharp player clearly ahead of a rough one, the sharp bot always through, both other skills inside the room's band, nobody dying in its first quarter).
- THE ORDER: all thirty-six were played at three skills over 32 seeds; each room's difficulty (`plan.d`) is now where its hardness ranks, moved into the band its pass rates fit, and each world runs easiest → hardest. Many moved: EDDY d4 → 1, RINK d6 → 2, CLOT d6 → 3, THE PULL d6 → 3; SKATE and BUBBLE BATH are the hardest of the FOAM. Two rooms are placed by hand: FIRST LIGHT still opens the campaign and THE CORE still closes it (it measures inside the noise of the two hardest KILN rooms). `test/campaign.mjs` checks the difficulty never falls inside a world.
- THE GRID is 6 × 6 and sizes itself to the longest world (`--cols`), so another room is one line in `TUNING.campaign.worlds`.
- New goals: ESCORT (a heart walking a path; `SAATA SYDÄN` / `心臓を送り届けろ`), HOLD THE RINGS (rings in turn, optionally draining) and orbs with a life that go out (`too many orbs went out`). Each draws on the room card's chart, has a HUD line, a sound for a step and for a lost orb, and tests in `test/challenge.mjs`.
- The bot reads two things a player reads (campaign only; the arcade's boss lines were measured without them): it shoots a body it can hurt rather than one inside a WARDEN's shield, and it circles a BULWARK and aims for the rim of its plate — the sharp bot always, the average one more often than not, the rough one never. Without it the sharp bot aimed so straight it hit the middle of every plate and did worse than the rough one.
- `scripts/room-eval.mjs` measures one room against the targets; `scripts/campaign-rooms.py` builds the twenty-four pattern rooms and copies the twelve hand-designed ones from `scripts/campaign-hand.json`, in the measured order.
- Cache tokens `?v=45` → `?v=46`; HUD label → `2.0 · v46`

---

## v45 — 2026-10-24
**Every arcade world ends on a boss of its own: CURB KING, MAW, BLISTER, KETTLE, PIKE, BERG and ANGLER between the TWIN PRISMS and OMEGA**
- Owner, 2026-10-24: "More content please". Worlds 2-8 had all ended on the TWIN PRISMS or OMEGA by the seed's parity; now each ends on its own world's gel grown up (`TUNING.waves.boss.worlds`, `headliner(wave, seed, world)`), the TWIN PRISMS open the run and OMEGA closes it. Outside the worlds (and in the 1.x oracle, whose world has none) the alternation stands.
- Each fights one way, then at half its health rages, once, with a banner and a harder pattern (`sim/species/bosskit.js`), under the boss ring 1.x hung under every boss (`render/looks/bossaura.js`):
  - **CURB KING** (the driveway, HOPPA's): squats, marks its landing, leaps over your head and lands with a shockwave ring. Raging: two hops at a time, the ring doubled, HOPPA shaken loose.
  - **MAW** (the sewer, WORMA's): under the floor out of reach, comes up near you with a ring, sprays a turning three-arm spiral while it stands. Raging: up sooner, and every hole it goes down fills with sludge.
  - **BLISTER** (the cistern, BUBBLA's): its bubble takes ten shots and pops; the gel inside is bare for four seconds and panics with fast fans. It blows big slow bubbles that burst into rings. Raging: more of them, bursting into more.
  - **KETTLE** (the boiler, STEAMA's): builds pressure and vents three turning jets and scalding steam; every second vent it stalls red-hot and every shot does double. Raging: four jets, turning either way.
  - **PIKE** (the river, SALMA's): circles, lights its lane to the wall, charges along it leaving a wake either side; a charge into a wall stuns it. Raging: three charges in a row.
  - **BERG** (the ice, SKATA's): a block of ice that slides and never slows, a fan of shards off every wall; stops, frosts over, fires walls of icicles four ways. Raging: calves two SKATA, slides faster, icicles eight ways.
  - **ANGLER** (the deep, GLOWA's): creeps at you holding its lure out; near the light it lunges and bursts a ring of lights, and it lets slow lanterns go that follow you. Raging: two GLOWA come out of the dark. Its health bar is drawn in its lure's light (`barColor`): its own colour is the dark's.
- A fight on the clock now lasts one: the boss pass's bot had held its fire past 7 u in the arcade (the rule is for the campaign's ammo rooms; the arcade sets no gun), and a health pod capped its 99 lives back at 3. Fixed (`scripts/bot.mjs`, `scripts/boss-tiers.mjs`), 1.x's TWIN PRISMS and OMEGA go down in three seconds at 1.x's 9 and 15, so in the worlds they are fought ×4 and ×12 (`waves.boss.worldHp`), and the new seven carry their own `bossHp`: from about ten seconds for the sharp bot in world 1 to about thirty in world 9. The grade lines are re-measured, one boss a world (`tuning/bossfights.js`).
- Their big moments have a voice (a landing's thud, an eruption, a vent's hiss, a charge, a stall's clank, a pop, a bite); the world gels that share those events stay as quiet as they were. The got-you card has a line for each, in en, fi and ja.
- Tests: `test/species/<boss>.mjs` for all seven (`test/lib/boss.mjs`: seeded, its look, its world's boss wave, the rage at half and only for a boss, the replay); `test/bossfight.mjs` checks every world's boss wave brings its own boss at its health and that outside the worlds 1.x's alternation stands.
- Cache tokens `?v=44` → `?v=45`; HUD label → `2.0 · v45`

---

## v44 — 2026-10-24
**Three arcade worlds have a wave whose floor moves: the river's banks breathe, the ice breaks into a drifting floe, the core splits into two discs going round each other**
- Owner, 2026-10-24, picking from the plan: breathing and orbiting floors as arcade world events (CAMPAIGN_PLAN.md step 5, the campaign's `breath`, `orbit` and `pulse` rooms).
- `sim/floorshift.js`: a world with a `shift` (TUNING.worlds.list) has one wave — its third, never a challenge's or a boss's — whose floor is a shape on a clock. A banner warns (`THE BANKS BREATHE` / `THE ICE BREAKS UP` / `THE FLOOR SPLITS IN TWO`), 1.6 s later the floor takes the shape and every wall clamps to it (`w.region`, as a campaign room's), and at the next wave the floor is whole again. Sizes are fractions of the world's own floor, so one spec fits either orientation, and a shift begun while a challenge still has the walls closed in is sized off the floor, not the walls.
- The river breathes from its whole floor to 58% and back over 9 s; the ice is a disc 78% of its shorter side, its centre going round a 32% orbit every 16 s; the core is two discs of 55% going round each other on a 42% orbit every 14 s — cross when they meet.
- The view: the floor shader fixes what kind each part of a shape is when it is built, so a shift world's floor is built able to take its shift and opened out to the whole floor until the shift is on (a rectangle at full size, a circle 10 km wide). The floor never rebuilds mid-wave. The edge of a shifted floor is the world's rail colour.
- `test/floorshift.mjs` (in the smoke): which waves, never a challenge or a boss, the warning before it moves, the floor really moving, the hero held on it while leaning on its edge for 12 s, whole again at the next wave, sized off the floor under a squeeze, and the same seed giving the same floor.
- Cache tokens `?v=43` → `?v=44`; HUD label → `2.0 · v44`

---

## v43 — 2026-10-24
**Portrait levels are bigger on the phone, and every world has something round its floor: a ground that fades into the dark, a glowing edge, and its own things standing along the sides**
- Owner, 2026-10-24, looking at all nine worlds side by side: *"Make the portrait mode levels a bit bigger and put graphics on the sides."*
- BIGGER: the portrait camera is flatter, 41.6° → 30° (landscape's is 28.2°). The floor is fitted to the phone's width either way, so the flatter view gives it more of the height — world 1 went from 43% to 52% of a 412 × 915 phone, measured, with a wider far edge — and nothing about the level changes: the same floor, the same campaign rooms, the same balance. A steeper camera was measured too and made the floor SMALLER (35%); a longer floor (22 × 48) was bigger still but changes the game, so it was left alone.
- THE SIDES (`render/scenery.js`, `_surround`; numbers in `TUNING.scenery.surround`): every floor that had nothing round it gets a ground running 16–18 m past it and fading into the dark, and props along the far side and the two sides — never the near side, nothing stands between you and the fight. The grid: its lines go on past the rail, far fainter than its own, with rows of short lit bollards like a runway's lights (tall neon posts were tried first and, seen from above, streaked out from the floor like a starburst). The cistern: two rows of stone columns in dark water. The boiler: pipes down both sides and stacks glowing under their rims. The river: rocks and reeds on its banks. The ice: shards. The deep: rock spires and glowing kelp (the dark rule hides them until you go near — by design). The core: towers in magenta bands over dim traces. Placed by a fixed hash, so a world stands the same every time.
- THE EDGE: worlds 4–9 had no rail, so on the driveway-sized floors you could not see where the floor stopped. Each now has a thin line glowing in its own rail colour all the way round.
- The boiler's soot is half as dark: at full strength it read as the shadow of something standing on the floor.
- NEON's floors, SURVIVAL and the campaign's rooms get the grid's surround.
- Cache tokens `?v=42` → `?v=43`; HUD label → `2.0 · v43`

---

## v42 — 2026-10-24
**Arcade boss waves are fought like the campaign's boss rooms: the boss's health on screen, a clock and a grade, and the wave over when the boss is down**
- Owner, 2026-10-24, picking from the plan: boss waves fought like the campaign boss rooms (CAMPAIGN_PLAN.md step 5).
- `sim/bossfight.js`: a boss wave is a fight ON A CLOCK from the wave's start. The clock line under MENU names the boss and the grade it is on course for with that line's seconds (`OMEGA · S 29s`, as a room's HUD does), and a bar under it is the boss's health — every boss of the wave in one bar, in its colour (the TWIN PRISMS are one fight).
- The boss down ends the wave: what it brought is POPPED (`api.pop`: it bursts as a kill does but pays nothing, keeps no streak, splits into nothing and fires no corpse in HARDCADE), the enemy bullets go with it, nothing more comes, and the wave clears. 1.x let the round's clock carry the adds into the next wave; that is still the behaviour with `waves.bossFight.on = false`, which the 1.x oracle in `test/director.mjs` now runs with, so it still proves everything else is 1.x's.
- Graded S/A/B on lines the bot measured, as the rooms were: `scripts/boss-tiers.mjs` fights every world's boss wave with both headliners at three skills over 24 seeds and writes `tuning/bossfights.js` (S the sharp bot's median, A the average's, B the rough's, a floor between the steps). The bot cannot dodge a boss as well as it shoots one, so it fights with lives to spare and the hits it took are reported beside the times. The grade pays its share of 1000 × the wave (S 1, A 0.6, B 0.35, C 0.15 — an S on wave 8 is 8,000, with the clear's 4,000 on top), and an S or an A drops a pod where the boss fell. One banner says it: `TWIN PRISMS DOWN · S · +12,000` (the clear's bonus joins it rather than writing over it).
- The bot moved out of `scripts/room-tiers.mjs` into `scripts/bot.mjs` so both passes play the same game; the room pass's output is byte-identical across the move.
- Found on the way: the first cut settled the fight after the round end, so a boss killed past its round's clock let the adds carry into the next wave and the fight never ended. The fight is settled first now, and `test/bossfight.mjs` (in the smoke) holds that case, the pops paying nothing, HARDCADE's pops firing nothing, and an S's pod. The smoke checks the HUD: the clock line, the bar under it, and the banner.
- Cache tokens `?v=41` → `?v=42`; HUD label → `2.0 · v42`

---

## v41 — 2026-10-24
**The game loads on the live site again: `_base.js` is `base.js`, because GitHub Pages leaves out every file whose name starts with "_"**
- Owner's phone on v40, from the arcade: *"the file that failed: 404 …/toko-drop-2/js/sim/species/_base.js?v=40"* — v40's own report, and the whole cause. The arcade is served by GitHub Pages, whose Jekyll build drops any file or folder whose name starts with `_` (there is no `.nojekyll` at the site root, and adding one would change how every game on the site is built, which is not this game's call). Every local server serves the file, so the smoke, the site smoke and the hub route check were all green against a game the live site could not load.
- `js/sim/species/_base.js` → `base.js`; HOPPA, WORMA, STEAMA, BUBBLA and GLOWA import it by the new name.
- A gate in `scripts/check-syntax.sh` (run by the pre-commit hook and the smoke): no shipped page or file under `js/`, `vendor/` or `levels/` may have a name starting with `_` or `.`. Checked both ways: a stray `js/_probe.js` fails it.
- The load box tells a 404 from a dropped connection: *"that file is missing from the site — a bug"*, not *"check the connection"*.
- Cache tokens `?v=40` → `?v=41`; HUD label → `2.0 · v41`

---

## v40 — 2026-10-24
**A file that drops on the way no longer stops the game: the page checks every file and loads itself again**
- Owner's phone, 2026-10-24: *"failed to load …/toko-drop-2/js/main.js?v=39"* — an hour after the deploy, with every file on the live branch and the same tree passing the smoke. The same box came up once at v31, and v32–v38 then loaded. So it was not a missing file: the game is ~210 module downloads, and one that drops on a phone's connection fails the whole load.
- The browser remembers a failed module for the life of the page, so v32's retry (importing main.js again in the same page) could never recover from one; only a fresh page can. Now: on a failed load the page checks every file at once (six at a time, past the cache — which also replaces a bad copy the cache may hold — and including three behind the import map), says how far it has got, and reloads itself. At most twice in two minutes; past that it names the file and shows a RELOAD button. main.js clears the count once the game is up.
- The box also says which browser it is (Chrome, an app's in-app WebView, Safari…) and its version, and whether the arcade's own service worker (the hub's `sw.js`, whose scope covers this folder) was answering the page — the owner's second report was *"fails after I click cabinet icon"*, and the hub's worker cannot be ruled in or out from here (opened from the hub with that worker running, the game loads in Chromium).
- v32's check walked the files one at a time, which on a phone takes long enough that the screenshot showed only its first line.
- Checked in a real browser with one module's download cut: once, and the game came up on its own after one reload with nothing on screen; every time, and after two reloads the box named `js/sim/rules.js` and offered RELOAD.
- Cache tokens `?v=39` → `?v=40`; HUD label → `2.0 · v40`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
