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

## v22 — 2026-10-23
**Each new world has its own gel (HOPPA hops the driveway, WORMA swims under the sewer), and WORLDS · NEON on the title swaps in abstract floors**
- HOPPA (driveway, lime): squats and glows, marks a ring on the floor where it will land, hops 2.6 u high to where you are heading and lands with a slow ring of 8 shots. In the air it is over your head: it cannot touch you and bullets pass under it
- WORMA (sewer, pink): swims under the floor where nothing reaches it, only a bulge showing; comes up a few metres from you (the bulge swells and glows first), spits two fans of 5, and goes back down
- The worlds' own species join the draw at 4× (driveway) and 3× (sewer) the weight of one of 1.x's; world 1 draws exactly as before
- WORLDS · STREET / NEON on the title (kept in `toko2.worlds`, `?worlds=` for a link): NEON gives world 2 a hex lattice with waves pulsing out from the middle and world 3 the contour lines of a flowing current, both with 1.x's rail and nothing round them. STREET is the driveway and sewer as before. Takes effect at the next world change
- The title's switches are three rows now: DASH and GEL HP; GELS and WORLDS; SOUND and SPLATTER
- The GOT YOU card is back (1.x had it, v212): the death screen and the pause menu show the gel that landed the last hit — the real gel, alive and turning in its own box (rendered off-screen and drawn into the card, classic or SDF), its name in its colour, and one line on how to read it, in English, Finnish and Japanese (`js/gels-said.js`)
- Fixed: v21 pasted the SPLATTER switch's function into two other functions as well (harmless, unused); gone
- Gates: `test/species/hoppa.mjs` (16), `test/species/worma.mjs` (14); smoke has a `world2-neon` run (hex to tide), checks the WORLDS switch and the pause menu's GOT YOU card
- Cache tokens `?v=21` → `?v=22`; HUD label → `2.0 · v22`

---

## v21 — 2026-10-23
**Splatter: kills throw real goo that pools, smears and dries on the floor — on by default, SPLATTER on the title turns it off**
- `render/goo-sim.js` + `render/goo.js`: thrown droplets fly, land, slide and stamp a wet film on the floor (16 texels a metre, stepped 30×/s), which dries to a stain; bodies walking through it smear it. Hits, kills, lob landings and cuts all throw it
- The floor reads the film in every world (grid, driveway, sewer, SURVIVAL), under the vortex hole and SURVIVAL's warning; a world change clears it with the floor
- Title switch SPLATTER ON/OFF (fi ROISKEET, ja しぶき), kept in `toko2.goo`; `?goo=off|on` overrides it for a link. Off is 1.x's droplets and puddles, as before
- Gates: `test/goo.mjs` (17); smoke checks the switch, that a kill lays film (and `?goo=off` lays none), and that no menu label is cut off
- Cache tokens `?v=20` → `?v=21`; HUD label → `2.0 · v21`

---

## v20 — 2026-10-23
**SURVIVAL is back, and its floor changes size as you play**
- **SURVIVAL's floor reshapes** (owner, 2026-10-23: "survival should be
  changing level size, like Sektori game. Abstract grid type visuals ok for
  that"). Sektori starts small and morphs every half minute or so; its floor
  lights up where it will change, then the new shape slams in.
  `js/sim/reshape.js` does that with the arena's rectangle:
  - the run starts on 0.55 × 0.6 of the run's 1.x arena;
  - 20 s in, and every 30 s after, the next size is picked, seeded and
    never the one you are on, from nine sizes of 0.55 to 1.35 of the arena;
  - the floor warns for 2.2 s: cyan where floor is coming, red where it is
    going, pulsing;
  - then the walls slam there in 0.45 s, carrying the hero and the bodies,
    and dropping the bullets they leave outside.
- The sim owns the walls (`w.hx`/`w.hz` wherever they are) and the events:
  `reshapeWarn`, `reshape`, `reshaped`.
- **How it looks**:
  - the grid floor is built at its biggest, with the walls as a uniform
    (`floor.js` `bounds`), so the grid stays put and only its edge moves;
  - 1.x's rail rides the walls;
  - the camera refits as they move, and past 1.x's arena size it follows
    you, as on the later worlds;
  - three warning blips and a slam with a shake;
  - puddles left over the void are cleared.
- **SURVIVAL is back on the title**, under HARDCADE.
- Gates:
  - `test/reshape.mjs` is new, with 14 checks in bare node: it starts
    small; it holds until the first change, then warns; the walls move,
    reach the size and carry the hero; every size is from the list and
    never the same twice; bullets left outside go; ARCADE never changes
    size; two runs from one seed are identical.
  - The sim suite's "no body leaves the slab" reads the slab as it is now.
  - The smoke's title wants SURVIVAL on it. Its landscape scenario plays
    SURVIVAL to the first change and checks four things:
    - the warning, the walls and the rail land on the new size;
    - the floor fits on screen after the change;
    - the warning goes out;
    - ARCADE's floor is back on the title.
- VERSIONS: v10–v19 rolled into the Archive.
- Cache tokens `?v=19` → `?v=20`; HUD label → `2.0 · v20`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

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
