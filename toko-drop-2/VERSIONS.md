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

## v31 — 2026-10-23
**THE CAMPAIGN, rebuilt: thirty rooms, thirty challenges, each with its chart, graded on tiers set by bot play**
- Thirty short rooms in the six worlds (five each), from FIRST LIGHT to THE CORE: survive, kill counts, clear-them-all, gate runs, a no-gun room where only the gates kill, a swarm, a ring to hold that drifts on the current, a flawless lane, ONE BY ONE (only the lit body can be hurt), two bosses, a floor that closes in, a bullet curtain graded on hits, a heart to protect, splitters, a spike, a hunt for cloakers among decoys, a magna's pull, forty shots for the room, a floor of three orbiting circles, a dash-only rink, a streak to reach, a flawless bubble bath, orbs to collect among charging toros, a breathing floor, a clear against the clock, a room of elites, two rooms joined by a neck, a room that gets faster every ten seconds, and a gauntlet whose rule changes five times
- Each room teaches something the arcade will later ask (its list entry says what), and the worlds' new gels (SKATA, BUBBLA, SALMA, STEAMA, MIRRA, GLOWA) appear in the later rooms
- The room list draws each room's chart: what arrives over its clock, stacked and coloured by gel, with its gates, orbs, quota line, stages and moving floor over it; above the list, the route of all thirty by difficulty, each dot in the colour of your grade
- In a room: the ring to hold and how full it is, the heart and its hp, the orbs, and a ring under the one body you may hurt; the HUD reads the goal's own count (GATES 2/5, HOLD 40%, PROTECT 9/12, AMMO 31…); a room whose clock runs out on its goal says TIME
- Tiers from play: a bot plays every room at three skills (sharp, average, rough) over 24 seeds; S, A and B are their medians, at least 6% of the clock apart, and every room says so in its file. The rooms were retuned against it first: every room is cleared by the average bot, and the rough one stops in the last world (`node scripts/room-tiers.mjs`)
- A level can name a 2.0 gel directly and give a body its own hp (the bosses)

## v30 — 2026-10-23
**The campaign's framework: a room is a goal and its mods (CAMPAIGN_PLAN.md)**
- New goals a room's level file can ask: CLEAR (every body, on the clock), GATES (dash through the room's own gates), HOLD (stand in a ring, which may move, until it fills), PROTECT (a heart that bodies and bullets hurt), ORDER (only the lit body can be hurt), HUNT (one kind, among decoys), COMBO (reach a streak), COLLECT (orbs on their times), BOSS, and GAUNTLET (the rule changes on the room's clock)
- And mods: FLAWLESS, NO GUN, a room that asks for the CUT dash, AMMO (a fixed number of shots), ESCALATE (everything faster every few seconds), and a room's own rule instead of its world's
- Floors that move: a part of a room may orbit, shrink in steps or breathe; the walls hold the room at every moment and what stands on it is carried in
- A room is graded on its own number (time, hits, the heart, or the share put down) against tiers in its level file, which the bot pass will set; a timed goal not met when the clock runs out is a fail, F
- The 18 rooms play exactly as before; nothing on screen changes yet (the rooms that use all this are next)

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
