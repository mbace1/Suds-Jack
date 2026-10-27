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

## v54 — 2026-10-27
**The campaign has an ending and a crown for an all-S world; the arcade ramps gentler and gives lives back between worlds**
- Owner, 2026-10-27: "rate the completion of arcade and campaign separately with % of completion with every check-in" — `docs/COMPLETION.md` is the scorecard those numbers come from; and for the arcade, "Gentler ramp".
- CAMPAIGN CLEAR: the room that puts all thirty-six past F, on a route, for the first time, opens an end screen before the grid: CAMPAIGN CLEAR (or HARD PAIN CLEAR), the S/A/B/C tally, the total points, how many rooms are still short of S (or "every room an S"), and on the normal route the pointer to HARD PAIN. In fi/ja/en.
- A reward for S: the grid's heading counts the S rooms (`· S 14/36`), and a world whose six rooms are all S is crowned (♛, its name in gold).
- PRESSURE: in ARCADE's worlds, past wave 4 a wave's bodies press as wave 4 + (wave − 4) × ½ (HARDCADE × ¾): how many, how fast, how often they fire. The wave's kind (boss, swarm, curtain), its clock and who may be drawn stay its own. 1.x's oracle (no worlds) presses as written, and still runs in lockstep.
- LIVES BACK: a world's boss beaten gives every life back as the next world opens (HARDCADE: one), with a banner and a chime.
- CURB KING, the world 2 boss, was the cliff: in isolation it cost the average bot 11.5 lives against world 1's 3.7 and world 3's 5.2. Its landing rings are 10 bullets, not 16, and its rage shakes HOPPA loose every fifth landing, not every third: 3.9 now. Every world's boss lines re-measured (`scripts/boss-tiers.mjs --write`).
- MEASURED, AND NOT THERE YET: the bots still end most runs at wave 16, inside the world 2 boss wave at full lives. Pressure, lives back, five lives, score extends and lighter bosses each moved the median a little or not at all. The bot's dodging is the limit (`boss-tiers.mjs` notes it already: the sharp bot loses three lives to OMEGA in eight seconds), so whether a person reaches world 5 is not something this bot can answer.
- Tests: `test/worlds.mjs` (the pressure by mode, the oracle untouched, a wave keeps its kind, lives back in ARCADE and HARDCADE), the smoke (the last room's clear shows CAMPAIGN CLEAR with its tally, then the grid with its S count), `test/species/curbking.mjs` (the brood follows its tuning). `test/trials.mjs` and `test/floorshift.mjs` hold to 1.x's pressure: they watch a wave for longer than a lighter one lasts.
- The smoke's wait for a campaign room's results is 30 s, not 15: the death beat is 14 frames at the 0.1 s frame cap, and a room under SwiftShader draws about one a second, so it was failing on frame time alone (14 frames counted in the 15 s).
- Cache tokens `?v=53` → `?v=54`; HUD label → `2.0 · v54`

---

## v53 — 2026-10-27
**HEAT holds through a lull, and the kill that empties the floor heats a level: the arcade shows HEAT from its first waves**
- Owner, 2026-10-27: "Go" on the fix the v52 playtest proposed. Played through the hub with real touch, a whole first minute of ARCADE averaged ×1.02 and never passed ×2: the early waves come in small groups with gaps, and heat drained away in the gaps.
- HOLDS: heat drains only while there is something on the floor to kill (a body that has landed and is not locked). Between waves, on a floor just emptied, while the next ones are still arriving, it holds: you cannot be out-paced by a lull you did not make.
- CLEARS: the kill that empties the floor heats `TUNING.heat.clear` (0.8) more. A small wave ends that way all the time; a room's stream rarely does, so in the rooms it rewards killing fast enough to keep the floor clear. A longer grace was tried first and dropped: it lifted the arcade but let safe play in the rooms catch up with risky play (THREE RINGS 35k safe against 40k pressed, where v52 had 21k against 30k).
- PAID, THEN HEATED: a kill is paid at the heat it was made at, then adds its own; before, it counted its own heat first. The kill event's multiplier is the one it was paid at.
- Measured (the bot, 4 minutes of ARCADE on two seeds): the sharp bot averages ×3.1 and ×5.3 (v52: ×1.4 and ×3.5), the average bot ×1.5 and ×3.4 (v52: ×1.0 and ×1.3). In the rooms the gap between safe and pressed play holds or widens (THREE RINGS at 0.5: 40k pressed, 25k safe). Every room re-tiered at 24 seeds, normal and HARD.
- Tests: `test/campaign.mjs` (an empty floor holds the heat; the kill that empties it heats `clear` more), `test/sim.mjs` (a lone kill heats the next a level); the tests that pay exact sums keep a bystander on the floor.
- Cache tokens `?v=52` → `?v=53`; HUD label → `2.0 · v53`

---

## v52 — 2026-10-27
**HEAT you can see and hear, its own best scores, and S lines set by a bot that plays for it**
- Owner, 2026-10-27: "Go" on the next steps after v51 — make HEAT readable before tuning on top of it, and set the lines with a bot that takes the risk HEAT pays for.
- SEEN: a soft halo on the floor under you, amber at ×2 and growing and reddening to a deep red at ×8, pulsing faster the hotter it is, and a tint in the gel the same colour (`TUNING.heat.view`). The × on the HUD pops each time it climbs a level and flashes cold blue when a hit throws it away.
- HEARD: every kill's voice rides up 5% a level (`TUNING.heat.sound.pitch`; the kill event carries its multiplier), a chime a step up the scale as each level is crossed, a falling sweep when a hit takes it, three notes when BANK banks and a fall when a pot is lost. The announcer still calls it from ×3.
- BEST SCORES: HEAT scores keep their own bests (`toko2.heat.best.*`). 1.x's streak scores were another scale; they stay in storage untouched but are no longer shown, so the first HEAT run sets the new best.
- THE LINES: the sharp bot now plays for heat (`greed` in `scripts/bot.mjs`, the campaign only): when the floor is quiet enough (a few bodies, no gel bullet within 4.5 m) it closes to about 2.6 m and kills there; never at a boss or a big body (pressing THE SLUDGE's boss cost it seven runs of eight). The average and rough bots still play safe at range. So S is a score that took the risk, and A to C are clean play. Re-measured at 24 seeds, normal and HARD: S rose where HEAT pays (THREE RINGS +36%, CLOT +39%, PULSE +27%, LIGHTS OUT +60%, SLUG RUN +87%, BREATH +81%) and stayed where the room is one body at a time. A half-greedy average bot was tried and dropped: it died in the five hardest rooms more than half the time.
- Cache tokens `?v=51` → `?v=52`; HUD label → `2.0 · v52`

---

## v51 — 2026-10-27
**HEAT: one multiplier for the whole game, paid for risk; campaign rooms graded on their score; and room clocks from 20 s to 100 s**
- Owner, 2026-10-27: "Campaign room goals should be score based and the times should change per room. We also need a multiplier dynamic that allows for better scores with higher risk." On the choices: F is "a small but still challenging score"; a wider spread of clocks; "Heat in general, maybe some levels bank … one base one and there may be mutators"; HEAT in the arcade too. Rush's juggle (the gun costing heat) is "good for a room or two, likely not main system".
- HEAT (`sim/heat.js`, `TUNING.heat`): every point is paid at 1 + floor(heat), ×1 to ×8, in ARCADE, HARDCADE and the rooms alike. It replaces 1.x's 100 × streak, which compounded without a ceiling (RUSH_DESIGN.md §3.1 had found the same: a score like that cannot be graded). Every kill heats you a little; one made close heats you up to four times as much (from 6 m in to 2 m; a dash kill counts as point-blank); a graze and a room's goal taken heat you too. It drains whenever you are not adding to it, faster the hotter it is, and a hit throws it all away. So fast, clean, close killing climbs, and safe play at range stays near ×1. The HUD shows the × (hotter colours as it climbs) with a bar for how far into the level you are; the announcer calls it from ×3.
- MUTATORS, a room's own (`score.mutators`): BANK (THE PULL, FORGE, BUBBLE BATH) holds the points in a pot shown beside the score until the heat cools, then banks them; a hit loses the pot. COLD GUN (SPIKE, SKATE) makes every shot cost heat, Rush's juggle for two rooms. The room card says what each does.
- ROOMS GRADED ON SCORE: a room's goal and the way to lose it are as they were, but its grade is its score against four lines, S, A, B and C, from the bot pass (`scripts/lines.mjs`, shared by `room-tiers.mjs` and `room-eval.mjs`): S the sharp bot's median, A the average's, B the average's weaker quarter, and C the rough bot's median or the average's weakest tenth. Under C is an F even when you got through. A room's goal pays into the score (`TUNING.campaign.points`: a gate, an orb, a ring filled, a second in the ring, a leg the heart walks, a hunted body), a room won early pays every second left, and a heart pays for what it kept. The HUD's course tag reads the grade the score stands at and the points to the next line (`F → C 32k`). The card, results and the grid read in points. Saved grades and unlocks are kept; an older save's numbers were another scale, so a room's best score starts again (`pts`).
- THE CLOCKS (`CLOCKS` in `scripts/campaign-rooms.py`): sprints of 20-25 s (EDDY, GATE RUN, FIRST LIGHT, HANDS UP, SPLITTER), standard rooms of 30-60 s, and long ones up to THE CORE's 100 s and SIREN's 90 s. A room made shorter is compressed (the same bodies sooner, its ring's need and moving floor scaled with it); one made longer loops its bodies after it. The first cut sped each loop up 8% and drowned the average bot in the long rooms; they loop at the same pace, and five clocks came back down (UNDERTOW 45, CROSSFIRE 45, BUBBLE BATH 55, CRUCIBLE 50, SPIKE 30).
- Measured: every room has score lines and HARD lines from a 24-seed pass; the sharp bot gets through every room. A bot that pressed closer to play for heat died more without scoring more and was not kept, so the bots still play at range and the lines reflect clean play: playing for heat is how a person beats S.
- Tests: `test/campaign.mjs` (HEAT: a close kill heats more than a far one, a dash kill is point-blank, ×4 pays four times, the cap, the drain, a hit; BANK's pot, banked when the heat cools and lost to a hit; COLD GUN; score grades and the seconds-left bonus), `test/challenge.mjs` (score lines, on course, the heart's points), and `test/sim.mjs` / `test/pickups.mjs` for a kill at ×1.
- Cache tokens `?v=50` → `?v=51`; HUD label → `2.0 · v51`

---

## v50 — 2026-10-27
**The title is two big buttons, ARCADE and CAMPAIGN, with a small HARD switch between them and a small MENU below; HARD makes them HARDCADE and HARD PAIN, and the screen goes red**
- Owner, 2026-10-27, after rating v49: "two big buttons, arcade and campaign. A simple small toggle between them that says Hard. When you switch it the text changes to Hardcade and Hard pain, also the visuals can change a bit. Small menu button is below them." Plus three fixes from the playtest.
- THE TITLE: ARCADE and CAMPAIGN are the two big buttons, side by side; the HARD switch is a small button between them (the word, and the track and knob under it); MENU is a small button under the row. HARD on: the two read HARDCADE and HARD PAIN, their borders and names go red with a faint red wash, and the logo's 2.0 glows red. The campaign grid's heading reads HARD PAIN too. On a phone held upright the names shrink to fit (they spilled out of the buttons at the landscape size).
- A HARD PAIN ROOM SAYS SO ON ITS CARD: a red HARD PAIN tag over its name, the name in red and START with a red edge. The playtest found the card was the same as the normal one, so nothing told you which one you were starting.
- FIRST LIGHT ON HARD BITES: a good player cleared it with an S and no hits, because the room's corpse fire hit its cap of six and corpse shots are slow. It now carries its own `hard: {cap: 12, others: 0.5}` (its gels' rings at half density instead of a quarter, twelve on the floor at once): measured at 24 seeds the sharp bot still always gets through but takes hits (0.1 → 0.3), the average bot 92% → 75%, the rough one 42% → 29%. `tiersHard` re-set from that pass.
- THE TITLE SAID "WASD MOVES" ON A PHONE: a tap on a menu button left the input scheme alone, and the phone then sent its own mouse events after the tap, which switched the hints to keys and the mouse. Any touch now sets the touch scheme, and a mouse event that comes from a touch (or within 1.2 s of one) is ignored.
- Tests: the smoke checks the layout (ARCADE, HARD, CAMPAIGN in one row with the switch smaller between them and MENU smaller under them), that HARD on reads HARDCADE | HARD | HARD PAIN on a red title, that a tap followed by a mouse event still reads as touch, and that a HARD PAIN room's card says HARD PAIN.

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
