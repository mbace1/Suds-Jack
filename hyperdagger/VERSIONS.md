# Hyper Dagger — Version Log

<!-- Same rules as toko-drop/VERSIONS.md -->

## v51 — 2026-09-26
**He remembers the run after you leave.** The recap v50 gave the table is
now also published on `window.__tokoTable`, which is where the arcade's
leave-logger (`hub/playlog-auto.js`) looks for it. Before this Hyper Dagger
was the one tabled game whose runs never reached Toko's *last time* line:
it handed the recap straight to `openTable` and nothing else could read it.
The seam carries no pause or resume; `openToko` still holds the run.

## v50 — 2026-09-23
<!-- continuing the SITE's count (v49 shipped there); see the v48 note -->
**He knows what happened.** Opened at the table on the recap, Toko's first
lines are the run you were just in, in this game's own words, instead of the
generic "straight off Hyper Dagger, then":

    THE SERPENT GOT YOU AT 41.2S.
    THAT IS THE THIRD TIME THE SERPENT HAS HAD YOU THIS WEEK.
    YOUR BEST IS 63.0S.
    GIB THE RINGS ONE BY ONE. THE PALE ONE IS ARMOURED FROM THE FRONT — SHOOT ITS RINGS FROM BEHIND.

- `tokoRecap()` is the game's half: the death line (or the clock, paused), what
  this game remembers about you — its own 40-run log, which now records WHEN
  (`at`), so "this week" is a count and not a guess; nothing leaves the browser —
  the best, and one honest tip per thing that kills you (`ENEMY_TIPS`). Enemies
  with no honest tip get none rather than a platitude.
- `toko/js/table.js` learned `recap(lang)` and `chat.js` learned `opening`: the
  host's lines replace the greeting and the TELL button still follows, because
  the point of knowing what happened is to make it easier to say something
  about it. Both are allowed to throw; he opens either way.
- In this game's English, like the rest of its UI — the counter's chrome stays
  trilingual, the recap is the game's voice about itself.
- Tokens: `main.js?v=65`, worker cache `hyperdagger-v37`, `chat.js?v=23`,
  `table.js?v=3`.

## v48 — 2026-09-21
<!-- v35–v47 were authored and shipped on gh-pages and are not in this tree
     (its main.js is ~700 lines ahead). The number continues the SITE's count
     so the two logs cannot spend the same heading twice; the join is still
     owed, the way Eeri's was. -->
**Toko at the table — the signature opens him HERE, over the paused run**
- The badge in the corner has always claimed to be "the way to say something
  about the game you are standing in, from inside it", and then navigated to
  the arcade — so the run you wanted to complain about was gone first. With a
  cursor it now opens the counter IN PLACE (`sign({ open })`, new in
  `toko/js/signature.js?v=4`): the run pauses underneath, Toko opens over it,
  Esc or BACK returns you to the run you left. Middle-click still goes to the
  arcade; the href never moved.
- Under a thumb the badge is still a picture — that corner is the left stick —
  so the pause screen and the death screen each carry an **ASK TOKO** line.
  **And in this game that line is the way in with a cursor too**: the menu
  overlay (`#msg`, z 10) covers the badge (z 4), a run takes pointer lock so
  there is no cursor, and the pause screen is `#msg` again — a person can
  never actually click the badge here. The `open` wiring is real and gated,
  and pays off in games whose badge is reachable. ASK TOKO sits at the TOP
  of the pause screen, because on a phone the options run past the bottom
  of the screen and do not scroll — at the bottom, a tap for it landed on
  the backdrop and resumed the run. Then the same thing at the other end on
  a 720px desktop window: the menu is ~900px tall and `#msg` centred it
  with no scroll, so the TOP was cut and the button unreachable. `#msg` is
  `justify-content: safe center; overflow-y: auto` now — an overflowing
  menu aligns to its top and scrolls, on every screen, for every button.
- **He needs a cursor.** A run holds POINTER LOCK, and a locked page delivers
  every real mouse event to the canvas at (0,0) no matter where the pointer
  is — so a click on his menu was a tap on the floor, which resumed the run,
  while a synthetic event on the same button worked. `openToko()` releases
  the lock the way a real Esc does. Found by recording a real click's target
  with a capture listener after `elementFromPoint` swore the button was there.
- He opens knowing what happened: paused, the cue is the clock (`41.2S IN. SAY
  WHAT YOU THINK`); dead, it is the death line (`THE SERPENT GOT YOU AT 41.2S`
  / `THE CLOCK RAN OUT AT …`). `__hd.toko.cue()` reads it for the gate.
- `toko/js/table.js` (new, shared — any signed game can use it) is the overlay.
  It is LAZY: chat.js and the dialogue packs are imported on the first open,
  never on boot, so this game's precache grows by one small module. Offline on
  a first open he is out, and the table says so rather than hanging. It shims
  the three arcade seams the counter reads (`__hub.games`, `__hub.feedback`,
  `__hub.lang`) with the REAL feedback transport, so a note taken at the table
  lands in the same local archive and outbox as one taken on the floor, filed
  under `hyperdagger` — `mountChat` learned a `from` option for exactly that
  (`chat.js?v=21`).
- Two input traps paid: the window `pointerdown` that resumes or restarts on any
  tap now ignores taps inside the table; and `input.js` treated only
  `touchstart` as UI-or-stick, so every `touchend` was `preventDefault`ed and no
  button inside the table could ever receive a synthesised click. A touch keeps
  the target it started on, so the guard is on all four phases now — a finger
  that began on the stick still releases it when it lifts over a button.
- Tokens on this tree: `main.js?v=64`, `input.js?v=62`, worker cache `hyperdagger-v35`
  (the site's own numbers move with its deploy).

## v34 — 2026-08-21
**The game boots again, and the offline promise is real**
- `vendor/jsm/loaders/GLTFLoader.js` + `utils/BufferGeometryUtils.js` were MISSING:
  v33 added `mesh-enemies.js` importing them and shipped neither, and `enemy.js`
  imports it statically — so the module graph failed and `window.__hd` never
  existed. The game did not start at all on `main`. (`gh-pages` was unaffected
  only because its `enemy.js` predates that import.)
- one token per module: `voxel.js` was imported at both `?v=61` and `?v=63`, and
  `tuning.js` likewise, so the browser instantiated each TWICE and `TUNING` —
  documented as the single source of truth for enemy feel — was two objects.
- the precache list was a hand-kept list that had drifted to almost nothing: 2
  of the game's 12 modules, both UNTOKENED while the page asks for `?v=63`, no
  `main.js`, no three.js, no postprocessing chain. `scripts/hd-shell.mjs` now
  WALKS the import graph from `index.html` — resolving the importmap, which is
  how three.js and its addons get in — and the gate regenerates and compares.
- `offline.cjs` looked for a cache named `hyper-dagger-v` while `sw.js` has
  always written `hyperdagger-v`, so it found no cache and read zero entries —
  indistinguishable from a genuinely empty precache, which is how the list above
  went unnoticed. It reads the name off `sw.js` now.
- cache bumped to `hyperdagger-v34`: the list changed materially, and a worker
  keeps a cache of the same name rather than reinstalling it.

## v33 — 2026-08-19
**Three-mode platform (PURE / HYPER / TRUCK)**
- PURE: edge void death, DD spine, thief bank siphon, Meshy GLB option (voxel fallback)
- HYPER: killBonus 3s, density ramp, dash + REAP
- TRUCK: Clustertruck track, falling platforms, fall death
- Mode cycles PURE → HYPER → TRUCK. Shared player + dagger gunfeel.

## v31 — 2026-08-09
**PURE now follows the Devil Daggers gameplay spine**
- PURE abandons the random pressure director for a fixed, learnable spawnset:
  spawners arrive from 3 seconds onward on the reference cadence, emit 9+1 or
  10+1 skull waves every 20 seconds, and lead into gem thieves and centipedes.
- Spawner, leader and centipede health/gem yields now form the reference's
  early economy. PURE is one-hit survival with dash and REAP disabled; HYPER
  remains an optional remix.
