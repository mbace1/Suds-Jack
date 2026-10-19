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
