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

## v7 — 2026-10-22
**A third dash on test: CUT goes through and hurts**
- **DASH now cycles PUSH → CUT → PASS** (owner, 2026-10-22: "likely we want
  dashes that go through and do damage in the end"). CUT is 1.x's
  pass-through with the dash's level 1 cut from the start, as damage: every
  body it passes takes 2 hits, a boss's included, once a dash. Two hits is
  0.2 s of the gun: at GEL HP ×1 it kills GLOBBO, YELA, SLUDGE and BAMBU and
  leaves the rest a shot from dead; at ×2 and ×3 they live through it. From
  dash level 1 it kills what is not a boss outright, as PASS does
- The switch is remembered as `toko2.dash`; v6's PASS choice is still read
- `test/hero.mjs` holds CUT's hits, once-a-dash, the boss and the upgrade
  (177 checks); the browser gate walks the DualSense across the new position
- Cache tokens `?v=6` → `?v=7`; HUD label → `2.0 · v7`

---

## v6 — 2026-10-22
**The PUSH dash on test beside 1.x's, and tougher gels to push around**
- **A DASH switch on the title** (owner, 2026-10-22: "the pushing dash should
  be tested as it may be a better dynamic, allowing for more bullet sponge
  enemies"). PUSH ploughs: every step a gel is within 1.5 of the dashing
  hero it is kept moving straight away at no less than 18 × 0.55 / its
  radius, then slides out (knock friction 6 → 3), so a small gel flies and a
  boss barely moves. It started as v3-v4's body-check (one knock of 11 at
  first contact), and measured, that opened no room: the hero overtook what
  it shoved and ended the dash inside the crowd. Gap from the hero to the
  four nearest gels, half a second after dashing into a cluster: PASS 0.89,
  v4's shove 1.02, the plough 2.09 (1.45 still at one second). PASS is 1.x's
  dash, straight through. PUSH is what a first run gets; the choice is
  remembered
- **A GEL HP switch beside it**: every gel but a boss has ×1, ×2 or ×3 its hit
  points, for testing the push against bullet sponges. Scores do not change
- The dash upgrades work with either: at level 1 a PUSH also hits each body it
  shoves (a boss included) and PASS kills what it passes; level 2's boom is
  the same. Planted bodies (the ANCHORED affix, PYRA) do not move
- A cube mid-tumble keeps a shove: the core reports a knock's displacement
  with the crowd's nudge, which the tumbling cubes already carry (with no
  shove, as in 1.x, nothing changes)
- **ORANGE and SPLITTA are verified against 1.x** (the list is now the
  director, GLOBBO, SPITTOR, FANNER, WEEVA, YELA, ORANGE and SPLITTA).
  ORANGE's tumble takes the crowd's unclamped nudge as 1.x does, held against
  a literal copy of 1.x's cube code on the same random stream. SPLITTA dies in
  1.x's uniform dome pop (it popped in its last squash, half height under
  rapid fire), no longer swells with its tell, and reads its killer from the
  core
- A phone no longer logs a refused buzz when a pad-only player is hit: the
  haptics wait for the page's first tap, as Chrome requires
- A phone held sideways shows the whole title in two columns (it scrolled,
  and the switches would have sat below the fold); pause and results become
  side-by-side buttons there
- The pad flips a switch in place: the title keeps its focus when it redraws
  (SOUND did the same thing and jumped back to ARCADE)
- HARDCADE's line on the title says what v5 made it: the biters' corpses
  shoot back, not every corpse
- `test/hero.mjs` holds the push to its numbers, the plough and the
  mid-tumble carry (170 checks); the browser gate checks a first run is PUSH
  at ×1 and that a DualSense flips DASH in place. `__toko.act(input, s)` steps
  a run under one input, for look checks of a dash
- Cache tokens `?v=5` → `?v=6`; HUD label → `2.0 · v6`

---

## v5 — 2026-10-21
**1.x's rules underneath: a species module each, 1.x's crowd, score, hits and HARDCADE**
- **The core is rebuilt around 1.x's frame order** (bullets-graze.md §7.1):
  the director, the hero, 1.x's swarm forces (SHEPHERD herd, dodge, flock,
  weave, the wave's current), each body's own step, 1.x's crowd solver,
  bullets, then every hit test against post-move positions
- **Every species is its own module** (`docs/SIM_CONTRACT.md`): its numbers in
  `js/tuning/species/<key>.js`, its behaviour in `js/sim/species/<key>.js`,
  its look in `js/render/looks/<key>.js`, its checks in
  `test/species/<key>.mjs`. All 27 of 1.x's classic ARCADE bodies exist,
  seeded from 1.x's CFG rows; until each is ported it walks at you and, if it
  is a shooter, fires a plain aimed shot
- **1.x's rules**: a bullet never moves a body; a hit flashes 0.12 s and
  squashes the 1.x spring; a gel bullet hits the hero at 0.65 (was 0.45);
  contact hurts only for 1.x's melee species; graze pays 25 within 1.20 and
  never while you are invincible; every kill pays 100 × the streak, which
  only a hit resets; a banner every 25,000 and no extra lives
- **HARDCADE is 1.x's corpse fire**: the ten biters and bosses bloom AIMED,
  FAN or RING at 0.6 speed in 1.x's corpse colours, from wave 3, under the
  field cap `min(44, 14 + 1.2·wave)`; `TUNING.revenge.who: 'all'` makes every
  corpse bite
- **The dash is 1.x's again** — i-frames, and it passes through bodies — and
  it upgrades (owner, 2026-10-21): level 1 kills whatever it passes through
  (a boss takes one hit a dash), level 2 adds 1.x's dash boom, a ring of 12
  hero bullets on the dash's first frame. The pickups that raise the level
  land with the gates. 2.0's shove is gone
- HARDCADE's corpse fire has a volume knob, `TUNING.revenge.density` (owner:
  "more or less bullets"), scaling every bloom's count
- Hero and gel bullets have separate pools; SURVIVAL unlocks ARCADE's roster
  as if a wave passed every 12 s
- `node test/lookshot.mjs <key> <out>` renders one species alone in the arena
  and close up (`__toko.showcase`, `__toko.idle`), so a look can be checked
  against 1.x without playing to it
- **ARCADE and HARDCADE run 1.x's wave director** (`js/sim/director/arcade.js`,
  numbers in `js/tuning/waves.js`): wave kinds and rhythm, the budget, pools
  in 1.x's draw order, the shooter plan, mob variants and affixes, fronts and
  the live cap, pull-in, the round clock, CLEAR (500 × wave, a breather) or
  CARRY, boss waves alternating OMEGA and the TWIN PRISMS with WARDEN escorts,
  and the arena curtain. `test/director.mjs` holds it against 1.x's own
  code on the same rng stream: 120 seeds × 48 waves identical
- **The hero is 1.x's player.update, step for step**: walk 6 u/s with no
  acceleration, an 11-step dash along the raw move stick, a 6-step gun, 1.x's
  weapon pods (spread, burst, laser, rapid, shotgun; two levels; a hit knocks
  level 2 down), mercy, the squash spring and the lunge. Input combines pad,
  touch and keys by 1.x's priority. `test/hero.mjs`: 96 checks
- **Twelve species have their 1.x behaviour, look and tests**: GLOBBO's
  stalk-crouch-leap, YELA's edge-pivot flop and slime trail, SPITTOR's ring
  from its hold band, FANNER's 6-then-9 fans and sway, ORANGE's tumbling wall
  of 6–12, WEEVA's accelerating spiral, SLUDGE's poison trail, BAMBU's stalk
  and lob, SPLITTA's death ring and brood, TORO's wheel and charge, SIREN's
  scream and surge, MAGNA's pull and tether. Director, GLOBBO, SPITTOR,
  FANNER and WEEVA are adversarially verified against 1.x; the rest await
  their pass
- **The core answers what the ports asked for**: an elite or boss on the
  plain gel look is drawn at its real size (it was drawn at base size); the
  hit flash is 1.x's white and a VOLATILE body smoulders orange before its
  death ring; a dying body pops as a uniform dome from a reset squash, as
  1.x's did; poison zones are invisible (the poured trail is the read); the
  hero blinks and glows red through mercy, blinks faster through a dash,
  lunges with its stretch, leaves 1.x's dash ghosts and pops its muzzle; the
  mouse aims at the floor and gives no aim inside the hero's own radius; a
  big death squashes the bodies around it; haptics, the death shake, the
  dash boom's shake, TORO's charge shake, the lob splash (droplets, puddle,
  shake), the curtain warning, the pod banners and the red hit vignette are
  wired; kills play 1.x's voice by family (blob, cube, TORO, BAMBU), the
  SIREN screams, gels fire quietly and a spiral is silent; `onKill` is told
  what killed the body; `api.score` and `api.childrenAllowed` exist; the
  crowd's nudge is readable by the next step
- **YELA joins the verified list** (director, GLOBBO, SPITTOR, FANNER, WEEVA,
  YELA). Its checker's fix: it turns back from the wall at its CFG radius, as
  1.x does. WEEVA's checker moved the drill vibration onto the body's own
  clock. The checkers for ORANGE, SPLITTA, SLUDGE, BAMBU, TORO, SIREN, MAGNA
  and the hero ran out of budget before reporting; those ports pass their own
  tests but are not yet held to 1.x by a second pair of eyes. The hero's
  checker left 1.x's pickup timers behind (invincibility 3 s, rapid fire 8 s,
  the longer of two wins) for the gates to hand out
- **A DualSense in the menus**: the menus read the pad every frame, not only
  while one is open, so the press that pauses no longer picks RESUME a frame
  later (the pause menu flashed and vanished under a held Options)
- **The browser gate covers the devices that will play it**: a phone both
  ways up, a phone turned mid-run, an iPad both ways up, and an iPad driven by
  a stubbed DualSense through the title, a run, the sticks, a dash and a
  pause; every menu item and the pause button are held to 44 px. Pad presses
  are timed off the game's frame counter, not the wall clock. `test/hero.mjs`
  is part of `scripts/smoke.sh`; `node test/smoke.mjs --only <name>` runs one
  scenario
- Cache tokens `?v=4` → `?v=5`; HUD label → `2.0 · v5`

---

## v4 — 2026-10-20
**1.x's gelatin, on 1.x's floor, in 1.x's units — and ARCADE / HARDCADE / SURVIVAL**
- Owner, 2026-10-19: *"Forget the night theme and time or other level art
  importance for now. Try to get the basics done. Gelatin look, gameplay on
  par."* The night, the clock, the dawn and the daily seed are gone
- **The gel is 1.x's** (`js/render/gel.js`, from 1.x `enemy.js` at v268,
  which already ran as a TSL graph on WebGPU): a physical material —
  clearcoat 1.0, sheen 0.45, transmission 0.15 (0.25 on cubes), IOR 1.38 —
  with three octaves of lumps that simmer at rest, a ripple that spreads from
  where a bullet landed, the death thrash that swells the body before it
  pops, translucency glow and wrap light on the emissive, and dome
  refraction (thick at the belly, thin at the crown). v3's gels were a stock
  lit material with a rim glow I had written; this is the real one
- **The shapes are 1.x's**: the SDF gel dome with its rounded flat bottom,
  squat by default, SPITTOR snouty and FANNER a pancake; cubes a rounded box
  1.8 radii on a side. Each body breathes, smears along the floor when it
  moves (nose up, rear dragging) and inflates while it winds up to fire. The
  enemy eyes are gone, as in 1.x (v98); the hero keeps 1.x's black ovals,
  moved just proud of the surface — 1.x's sat inside the body and vanished
  whenever it stretched toward its aim
- **The light and the floor are 1.x's**: white ambient 0.45 and one sun at
  1.3, no tone mapping; a navy floor with a slowly pulsing grid in square
  1.286 cells, a vignette, the grid fading toward the rim, a soft pool of
  light following the hero, and the blue border rail
- **The arena is 1.x's, so its numbers port without a rescale**: 38 × 22 on
  a wide screen, 22 × 36 on a tall one, chosen at each run start. v3 ran
  1.x's hero speed on a slab less than half that size, which made everything
  twice as fast and cramped. The core six species take 1.x's colours,
  radii, speeds and hit points; they pop in on 1.x's ellipse at 0.85 of the
  arena, never within 6 of you, and swell into being for 0.3 s
- **Modes**: ARCADE (three lives, extends), HARDCADE (the same, and every
  corpse fires back) and SURVIVAL (endless, no extends). CAMPAIGN is on the
  menu, greyed. ARCADE still runs the rising pressure, not 1.x's waves yet
- **A kill is 1.x's** (`enemy.js` destroy/updateDeath, `main.js` onKill):
  the body glows, thrashes and swells to 2.3× over 0.28 s while 5–6 chunks
  and a spray of droplets fly out (smooth goo from blobs, angular from
  cubes), squash and skid where they land and shrink away; a puddle and its
  satellites spring in and fade over 5 s (1.x's 192-slot instanced splat
  pool, `js/render/splats.js`); a big body's death ripples every gel within
  3.5. Kills in quick succession throw more. The camera shakes as 1.x's did
  (trauma squared, decaying 2.8/s): a kill by its size, a hit 0.38
- **The permanent painting is gone.** On 1.x's dark floor it turned into
  confetti by the second minute and drowned the gels; 1.x's fading puddles
  are what read
- Views are pooled per species, so a gel's material is built once and
  reused rather than compiled mid-fight
- Cache tokens `?v=3` → `?v=4`; HUD label → `2.0 · v4`

---

## v3 — 2026-10-19
**A game: twin sticks, six species, the night, HARDIVAL — playable from the menu**
- Owner: *"I'm getting a feeling that there is no game here to test."* There
  was not. This is the first build with one: a title menu (SURVIVAL,
  HARDIVAL, DAILY), a run, a results screen, and back
- **The rules live in `js/sim/`** — plain JS on a fixed 1/60 s step from a
  seed, no DOM, no three, no clock — so `test/sim.mjs` asserts them in bare
  node: replay is exact, standing still dies, a bot outlives standing
  still, nothing leaves the slab or goes NaN, the bullet cap holds
- **The hero is 1.x's** (`player.js` / `input.js` at v268): speed 6, dash
  26 for 0.18 s on a 0.75 s cooldown, fire every 0.09 s, three lives with
  1.2 s of mercy. Touch is 1.x's twin-stick — left half moves, right half
  aims and fires, letting go of the aim stick dashes, top-centre pauses.
  Keys: WASD, mouse aim, hold to fire, Space dash, Esc. Pad: sticks, RT,
  A/RB/LB dash, Start. The dash is new: a **body-check** that shoves and
  squashes every gel it meets
- **Six species and the SPLITTA's minis**, unlocking across the first three
  minutes: GLOBBO, YELA CUBE (darts), SPITTOR (aimed shot), ORANGE CUBE
  (three-way), FANNER (seven-wide fan), SPLITTA (splits in three). They
  rustle on a lawn or the street, then hop the curb; the slab is theirs to
  cross, not to spawn on, and never within 2.6 of you
- **Soft bodies**: every gel is a squash spring that hits, curbs, shoves
  and its neighbours deform, and overlapping gels push apart instead of
  stacking. Their own glow and a rim keep them readable in the dark
- **The night**: 11 PM to 5 AM at two minutes an hour, pressure rising
  toward dawn, which pays 5,000 a life and runs on into overtime. Combo
  multiplier to ×8, graze points, an extra life every 20,000
- **HARDIVAL** (1.x v220): every corpse seethes for 0.45 s, then fires back
  in its species' dialect, slower and in corpse colours. A ring is rotated
  half a step so you stand in a gap, and a corpse that dies on top of you
  spends itself — the first cut aimed the ring's first bullet straight at
  you and a bot died in 12 s; it now lasts 80-130 s
- **The painting**: every kill splats the slab and its chunks bounce, settle
  and splat where they land. It never clears until the next night. The
  first cut carpeted the slab by kill 34; splats are smaller and darker
  now and a settling chunk throws no drops
- Synthesised sound through one master gain (off in the menu toggle), and
  en / ja / fi menus and HUD
- The first minute was empty at a spawn every 2.2 s; it is 1.6 now, five
  alive at most to start, 24 by dawn, and the first gel is on its way at
  0.6 s (`night.firstSpawn`) instead of 1.2
- The smoke now PLAYS: it starts a run from the menu and drives real touch
  events — aim, fire, release to dash — and fails unless shots, spawns and
  a dash all happened
- Cache tokens `?v=2` → `?v=3`; HUD label → `2.0 · v3`

---

## v2 — 2026-10-19
**The slab fills the screen; the garage, lawns and street sit at its edges**
- Owner, on the first phone look: *"The point was to show those at edges,
  not necessarily the whole area."* The view now holds the place you PLAY,
  the slab and its curbs, and lets the house front, the lawns and the street
  crop at the screen edges. A wide phone shows more lawn, a tall one more
  door and street; none of it costs the slab space
- `TUNING.driveway.lawn.margin` and `street.margin` are gone: they existed
  only to keep the surroundings in frame
- The smoke's light check measured the pool against the bottom-left of the
  screen, which was dark street until the street left the frame. It now
  compares two WORLD points, under the flood and the slab's far street-side
  corner, and asks for what the design says: warm in the pool, cool
  moonlight at the edge. Re-proved against the light switched off
- Cache tokens `?v=1` → `?v=2`; HUD label → `2.0 · v2`

---

## v1 — 2026-10-19
**M0: repo and rules — a blank night driveway with the version on screen**
- **M0's commits all share v1.** The M0 gate pins the label at `2.0 · v1`,
  and nothing was deployed between the parts, so no token could go stale.
  From here on every game-file commit gets its own entry, and the hook
  refuses one that reuses a version already on origin/main
- Version discipline carried over from 1.x and adapted to this repo: this
  log, `scripts/bump-version.sh`, `scripts/pre-commit` and
  `scripts/check-syntax.sh`. 2.0 starts its own log here at v1
- **One number per release**: the game's `?v=N` cache tokens, the HUD label
  `2.0 · vN` and the top `## vN` here are the same N, so there is nothing to
  keep in step by hand. 1.x carried a separate token counter; that was a
  second number to drift
- **`scripts/check-tokens.mjs`** is the token rule made mechanical: every
  local module, style or manifest URL carries `?v=`, every game token is N,
  the HUD label agrees with this log, and an importmap may not map a
  *prefix* to a local folder (a module resolved through one arrives with no
  token, which is the Pages-CDN 404 trap). The hook and the bump script both
  run it; the bump script finds files by searching for the old token, never
  from a hand-kept list
- `check-syntax.sh` compiles every game module as a real ES module (`node
  --check` waves ES-module syntax errors through — 1.x v93's black screen).
  It no longer sends the error text to `/dev/null` along with node's
  experimental warning, which 1.x's copy did, so a failure now says where
- The hook also refuses a top entry whose header or bold title is malformed,
  or that still carries the bump script's TODO stub
- **three.js r186 vendored** under `vendor/three/`: the WebGPU build as
  plain ESM (r186 ships no minified files), pinned to `?v=r186` so a game
  bump never re-downloads it. The importmap maps `three` and `three/webgpu`
  to one URL, so three loads once, plus `three/tsl`
- **Two vendor patches**, both documented in `vendor/README.md`. First, the
  core import inside `three.webgpu.js` carries the token. Second, r186's
  default identity texture swizzle is sent as absent: Chrome 141–142 reject
  the string form, and the WebGPU path died on frame one with no fallback,
  as the first headless WebGPU boot found
- `index.html` boots `js/main.js` through the importmap. A boot failure,
  or a module that fails to load, is printed on screen in a **fault box**,
  because a phone has no console
- `js/main.js` starts **WebGPURenderer**, which falls back to WebGL 2 by
  itself; `?webgl` forces the fallback so both paths can be checked on any
  device. `window.__toko` is the debug handle. `js/tuning.js` exists from
  the first number on
- **The blank night driveway** (`js/render/driveway.js`): the slab with
  expansion joints, side curbs and the street curb, lawns past the curbs,
  the house front with a panelled garage door, the flood over the door,
  and the street. Every size and colour comes from `TUNING.driveway`,
  `TUNING.light` and `TUNING.colors`
- **The light**: one warm spot from the flood, pooling on the slab and
  falling off toward the street, plus a dim cool moon fill that keeps the
  lawns and curbs readable at the edges. Everything else is dark
- The joints and the door seams are **TSL** line functions, antialiased
  with `fwidth`, so M0 already compiles node materials on both backends.
  That is the path the gels take in M2
- **One fixed view, fitted** (`js/render/view.js`): the camera hangs over
  the slab, tilted 24° toward the street so the door has a face. On every
  resize or rotation it finds the closest distance that holds the whole
  arena (slab, curbs, a strip of lawn either side, the door) and centres it
  with an off-axis view offset, not a turn. Landscape-first; portrait
  still sees everything, smaller
- **`2.0 · v1`** in the bottom-right corner, safe-area aware, with the
  running backend (`webgpu` or `webgl2`) beside it in grey
- **`scripts/smoke.sh`, the gate before every commit.** It runs the two
  static checks, then `test/smoke.mjs` actually runs the game. The site is
  served under `/toko-drop/`, as Pages serves it, and headless Chromium
  boots it as a landscape phone on **WebGPU** (a SwiftShader adapter) and on
  the forced **WebGL 2** fallback, lets it run, and turns it to portrait
  mid-run. It fails on any page error or console error, a failed request,
  a module fetched without a token, the fault box showing, a stalled loop,
  a HUD label that disagrees with this log, an arena corner off screen,
  and a frame with no warm pool. It saves the screenshots for looking at
- **No dependencies**: `node:http`, node 22's own WebSocket to drive
  Chromium over the DevTools protocol, and a 40-line PNG reader. It runs
  the same in CI, and `--url` points it at the deployed site
- **Calibrated against broken builds** before it was trusted. A throw at
  boot, a wrong label, a broken fit, the light off, an untokened import
  and a 404 each fail it with a message naming the fault
- Headless WebGPU on SwiftShader **loses its device at frame 2–3** unless
  Chromium runs Vulkan on SwiftShader too. A bare page with no three in it
  does the same; the flags are in `launch()`
- **Pages deploy** (`.github/workflows/pages.yml`) runs three jobs. The
  smoke gate runs on the runner's Chrome, so nothing broken reaches Pages.
  Then main's tree is deployed as-is: no build step, no artifact to keep
  in sync. Then the same smoke runs against the **live** URL, retried
  only to let the CDN catch up, because a deploy is done when the live
  page has been seen to run. Pull requests get the gate without the deploy
- **An adversarial review before going public.** Five reviewers covered
  the scripts, the smoke, the phone runtime, the workflow and the scope.
  Every finding then faced two skeptics who tried to refute it by
  reproducing it. Seventeen survived and all are fixed:
  - Smoke deleted the Chrome profile while Chrome's helper processes were
    still writing to it. That failed **~7% of fully passing runs**, which
    would have blocked CI deploys at random. Chrome now runs in its own
    process group, the cleanup waits for it to exit and retries the
    delete, and cleanup can no longer decide the verdict
  - The hook checked the disk, not the commit. A fix made on disk but not
    re-staged committed the TODO stub, a parse error, or a half-bumped
    tree. It now checks a snapshot of the index. It also handles
    `--amend`, finds a buried second stub, and parses tooling commits;
    the bump script refuses to stack a stub on a stub and moves the label
    in every page
  - The rotate check trusted the game's own camera, so a build that never
    refit on rotation still passed. Smoke now compares the camera and the
    drawing buffer with the screen. It also looks for the label's ink in
    the screenshot, not only its CSS. It gives a slow loop a deadline, not
    one look, and refuses an empty `--url`, which used to smoke the local
    tree and call the live site verified. A 400 on a malformed URL and a
    launch timeout no longer leak Chrome
  - three reports shader-compile failures, GPU validation errors and a
    lost device through `console.error` and carries on, so on a phone they
    were a black screen with no message. They now go to the fault box,
    which shows each message once and stops at 40, so a per-frame error
    cannot flood it
  - `check-tokens` now reads inline `<script type="module">` bodies, as
    1.x's lab used, and `new URL(…, import.meta.url)`. It accepts a
    template-literal import whose token is literal, and refuses an
    `import()` that builds its URL, because nothing can token-check that
  - The page's near-black follows `TUNING.render.clearColor` once booted

---

## Archive

_Nothing archived yet: v1–v9 roll up here at v10._
