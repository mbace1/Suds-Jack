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

## v58 — 2026-10-28
**Music: a song for every world, layered by your heat; and the sound no longer clips**
- Owner, 2026-10-28: "Continue" — the biggest gap left that needs no person: ARCADE's A9 sat at 5/10 for "no music". 2.0 had none, and 1.x's v267 world beds were ambience, not music.
- `js/music.js` plays `js/tuning/music.js`: ten songs, synthesised in the intro's 16-bit register (pulse waves at 12.5 / 25 / 50 %, a triangle bass, a noise kit, two-operator FM for bells and brass, an echo), every note laid down in audio time a little ahead of the clock, never on a timer:
  - the title, TOKO DROP (C major, 100 bpm), on the menus;
  - THE GRID NEON DROP (A minor, 124), THE DRIVEWAY CURB APPEAL (E Dorian, swung, 112), THE SEWER DRIP FEED (D minor dub, 94), THE CISTERN SWEEP LINE (F# Phrygian, 128), THE BOILER PRESSURE (C minor, FM brass and metal hits, 136), THE RIVER UNDERCURRENT (G Lydian in 12/8, 84), THE ICE BLACK ICE (B minor, FM bells, 104), THE DEEP LIGHTS OUT (C# minor, a sonar ping, 84), THE CORE OMEGA (A harmonic minor, 146);
  - each is two eight-bar sections and a four-bar boss section on its own chords. The campaign's six worlds play the arcade song that shares their rule.
- **The music is your heat.** An empty floor with no heat: the harmony alone. ×1: kick, bass, the arpeggio, and the tune quietly. ×2: the full kit and the tune forward. ×3: the extras. ×5: the tune doubled an octave up. A level rises at the next half bar and falls at a bar line a bar later, so it never flickers, and a hit throws it down at the next bar line. An empty floor rests the drums and keeps the tune; a boss takes the song to its boss section at level 3 at least; a room's last 10 s double the hats.
  - The tune is there from ×1 because the line bots say a first-timer spends most of a world at ×1–×2 (the good and ordinary bots ×3 and up): with the tune from ×2 only, a new player would hardly have heard it.
- **Its cues are information**, as 1.x's beds were: a sweep or an updraft coming swells a riser into its hit; THE DEEP's dark closes the music's filter with it; THE RIVER's current carries the arpeggio across the speakers; a hit makes the music flinch. Stings in the song's key: a boss down or a room cleared, a room lost, game over, the last world won. Silent under the intro and while the floor swallows the droplet; ducked and muffled while paused.
- **Mixed by measurement, through a phone's speaker** (`scripts/music-render.mjs`: songs rendered in an OfflineAudioContext, a 300 Hz high-pass standing in for the phone). Each part measured on its own against the tune: the drums were 19–42 dB under it at first. At ×2 and up the ten songs sit within 4.4 dB of each other, 7.5–12 dB under a kill and 2.5–7 dB under a hit taken.
- **The sound clipped, before any music**: replaying a bot's run found 21 arrivals' thuds in one instant summing past full scale (147 samples). One sound now plays at most a few times in 40 ms (`TUNING.audio.gate`), and the master runs through a limiter only a pile-up reaches: 0 samples at full scale in the same run.
- OPTIONS: MUSIC beside VOLUME (`toko2.music`, in quarters, the music's alone); SPLATTER moves down beside REDUCE MOTION.
- Tests: `test/music.mjs`, 87 checks in bare node on a fake audio context (`test/lib/fakeaudio.mjs`): every song reads and every bar adds up; no held note grinds a semitone over its chord; the layers stack; nothing is laid down in the past or left running; every voice goes through the music's bus; a hidden tab comes back without a burst; MUSIC off makes nothing; a song changing fades out and goes; and the cues. The smoke checks that the menus play the title, every run plays its world's song, MUSIC steps and is kept, and the pause ducks.
- Cache tokens `?v=57` → `?v=58`; HUD label → `2.0 · v58`

---

## v57 — 2026-10-28
**Ten rooms retuned into their difficulty bands: all 36 now sit where their difficulty says, measured by v56's bots**
- Owner, 2026-10-28: "Retune" — v56's bots, which play like people, found ten rooms outside the band their difficulty `d` asks for (`scripts/lines.mjs` BANDS), which would have cost the campaign's difficulty-curve score. v56 and v57 ship together.
- One table, `RETUNE` in `scripts/campaign-rooms.py`, applied after the clocks; each change measured at room-tiers' 24 seeds, never by eye. Through, sharp / ordinary / first-timer, before → after:
  - CROSSFIRE (d9): its shooters fire about twice as often (`intervalMult` × 0.55): 100/92/4% → 100/79/4%.
  - BUBBLE BATH (d10): fire × 0.65: 100/92/4% → 100/79/4%.
  - SKATE (d9): its FANNERs fire about twice as often (× 0.45) — the ordinary player was never hit once in 24 runs: 100/100/13% → 100/79/0%.
  - BREATH (d9): a quarter more bodies (every fourth comes with a twin from the other side of the room, 0.4 s later): 100/100/13% → 100/75/0%.
  - THE CORE (d10): half again as many bodies: 100/100/0% → 100/58/0%.
  - CRUCIBLE (d10): half again as many, one in three elite, and it speeds up faster (0.17 → 0.24 a step): 100/100/13% → 100/79/0%.
  - THE POUR (d4): bodies 25% faster: a first-timer 96% → 83%.
  - HANDS UP (d5): bodies 60% faster: 100% → 71%.
  - SIX SHOTS (d5): ammo 60 → 55: 96% → 75%.
  - RINK (d1) was the bot's, not the room's: in the one CUT room the planner treated the body it meant to dash through as a threat and hung back beside it (every skill died there, the sharp one 5 times in 24). With the dash ready that body is now the point, not a threat: 79/75/63% → 100/96/71%, the room untouched.
- Measured speed alone could not do it: the ordinary player out-dodges faster bodies; more bodies, faster shooters and elites are what moved the hardest rooms.
- Lines redrawn for the ten (both routes). All 36 rooms sit in their band; the good player clears every room at least 95% of the time. On HARD PAIN (no band) the retune made SKATE harder for a good player (100% → 79%): its faster FANNERs and the corpse fire together; THE CORE's ordinary player gets through 13%.
- Tests: `test/bot.mjs` (12: in a CUT room, with the dash ready, it walks straight in at the body it is cutting, against a control that hangs back).
- Cache tokens `?v=56` → `?v=57`; HUD label → `2.0 · v57`

---

## v56 — 2026-10-28
**Every grade line redrawn by bots that play like people: S holds, A/B/C ask about a tenth more, HARD PAIN's FORGE is fixed**
- Owner, 2026-10-28, choosing "Better line bots": rebuild sharp/average/rough as look-ahead players with human limits, redraw every campaign and boss line from them, and show how the lines move before shipping. The comparison is `docs/LINES.md` (`node scripts/lines-diff.mjs <rev>` draws it for any two versions).
- THE BOTS (`scripts/bot.mjs`): all three look ahead with v55's planner; the human part is one table — reaction time (0.2 / 0.4 / 0.65 s before something new is taken in), the chance a VOLLEY is noticed at all (97 / 85 / 45%, everything one source fired from one spot within half a second, caught or missed together), how many bullets it tracks at once (24 / 10 / 5, the most urgent first), how far ahead it thinks (0.8 / 0.5 / 0.3 s), how often it decides (20 / 10 / 6 a second), how far its thumb is off (up to 3° / 11° / 23°), how readily it dashes, and whether it reads a hopper's or a lob's tell (always / 6 in 10 / never). Average's and rough's numbers were set once for every room to come closest to the campaign's difficulty bands, never per room; a per-bullet coin flip and an attention limit alone were each tried and dropped (the first ignored bullets in a stream a person is watching, the second left a first-timer clearing 57% of the hardest rooms).
- What they now know that the old bots did not: THE VOID's dark limits what they see (the view's gradient: clear to 6 u and black by 20 at its darkest, the whole floor when it opens; they see 60% of the way down the fade), THE FOAM's slick floor carries them (the stick is acceleration), THE WELL's current pushes them, and they keep about 3 u from bodies. The expert keeps perfect sight and attention and only measures.
- A BUG IN EVERY BOT: when a room asks for a dash (a gate, a CUT), a dash and a walk the same way scored the same and the walk won the tie, so the bot walked up to the gate and back; v55's expert got through GATE RUN 2 times in 8. A wanted dash now wins.
- THE LINES (24 seeds a skill, every room, both routes; `docs/LINES.md` has each): CAMPAIGN S median change 0% (5 rooms up more than 10%, 2 down), A +10%, B +8%, C +7%; HARD PAIN S +5%, A +8%, B +9%, C +9%. The new ordinary player gets through 97% of rooms (the old bot 87%), the first-timer 55% (33%). HARD PAIN FORGE: S 4.9k → 57k, where a clean run scores about 58k.
- THE CURVE, as the new bots read it: the 4 rooms out of their difficulty band before (EDDY, UNDERTOW, CLOT, LIGHTS OUT) are in band; 10 are out — the hardest rooms an ordinary player now clears nearly every time (CROSSFIRE, BREATH, SKATE, BUBBLE BATH, CRUCIBLE, THE CORE), RINK harder than its difficulty 1, and three a first-timer finds easier than meant (THE POUR, HANDS UP, SIX SHOTS). Reported, not retuned here.
- THE BOSSES (`tuning/bossfights.js`, re-measured): most S lines move a second or two; BERG and ANGLER 4-5 s quicker; CURB KING 23 → 30 s (a player who reads its hops keeps away). The sharp bot takes 0.2 to 2.9 hits a boss where the old one took about 2 to 10.
- THE EXPERT, re-measured with the corrected floor model (12 seeds): ARCADE median wave 48 (world 6), one run won all 72; HARDCADE median wave 36 (world 5). Against the new S lines it reaches S at least once in 35 of 36 rooms (HARD PAIN 33).
- Scripts: the difficulty bands are drawn once, in `scripts/lines.mjs` (room-tiers and room-eval each kept a copy); `room-tiers.mjs --part i/n` splits a pass over cores; `scripts/lines-diff.mjs` is new. Tests: `test/bot.mjs` (11: the human part bites — a bullet younger than the reaction time is not there yet, a missed volley is missed whole, attention takes the most urgent first, the dark hides a bullet past the light but not from the expert).
- Cache tokens `?v=55` → `?v=56`; HUD label → `2.0 · v56`

---

## v55 — 2026-10-27
**HARDCADE is harder, and a bot that looks ahead shows the arcade can be finished**
- Owner, 2026-10-27, on v54's finding that the bots could not get past world 2: "Or maybe better bots", and "Hardcade should be harder".
- THE EXPERT (`scripts/bot.mjs`, skill `expert`): the three skills react to what is within a few metres and step sideways from it. The expert projects everything that can hurt it 0.9 s ahead (each gel bullet along its line, each body that hurts to touch along its velocity, a hopper that has squatted or taken off where it will land, its ring as a softer keep-away, a lob where it comes down, a puddle where it lies), prices each way it could walk and each dash (whose i-frames carry it through what is on the way), and takes the clearest that goes where it wants. Per boss fight it takes 0 to 1 hits where the sharp bot took 2 to 8 (ANGLER and OMEGA still cost it about 2).
- It measures, it does not set lines: the grade lines and the boss lines are still drawn from sharp/average/rough (`LINE_SKILLS`), whose play is unchanged to the byte (a v54 run replays to the same wave and score). `room-tiers`, `boss-tiers` and `room-eval` play only those three.
- `scripts/reach.mjs`: a bot plays a whole ARCADE or HARDCADE run per seed and says where it ended and what took its lives. With the expert, 12 seeds: ARCADE's median run ends at wave 48 (world 6) and one run won all 72 waves; HARDCADE's median ends at wave 32 (world 4), none won. The sharp bot still ends at wave 16.
- HARDCADE HARDER: its bodies press on a slope a quarter STEEPER than 1.x's own curve past wave 4 (v54 had eased it to three quarters; ARCADE stays at half), and a beaten boss gives no lives back (v54: one): your three lives last the run. Measured with the expert over 8 seeds a variant, median wave: v54's HARDCADE 43; 1.x's slope and no lives back 35; this 31; a slope of 1½ 21. Corpse fire, made faster, from wave 1, or from every corpse, moved the expert by no more than run-to-run noise, so its rules stay 1.x's.
- The title's HARDCADE line says so (fi/ja/en), and docs/ITCH.md.
- THE CAMPAIGN'S LINES, against the expert (8 seeds a room): it reaches S at least once in 32 of 36 rooms, so v53's worry that UNDERTOW's and THE CORE's S sat out of reach is withdrawn (2 of 8 and 6 of 8). Never reached: LIGHTS OUT and RINK; FIRST LIGHT and FIRST SWARM miss by about 2%, where the sharp bot's closer, greedier play out-scores the expert's caution. HARD PAIN: 34 of 36, never SIREN or RINK, and FORGE's S line is broken low (4.9k against 58k for a clean run: the sharp bot that drew it usually loses its BANK pot to corpse fire). Reported, not changed here.
- Tests: `test/bot.mjs` (new, in the smoke: the expert steps off a bullet's line and not toward it, dashes out of a ring too tight to walk through and not while the dash cools, is out from under a hopper before it lands, and plays forty seconds of ARCADE with every input a number; the three line skills never plan), `test/worlds.mjs` (HARDCADE steeper than 1.x, no lives back).
- Cache tokens `?v=54` → `?v=55`; HUD label → `2.0 · v55`

---

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
