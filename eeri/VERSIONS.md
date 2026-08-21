# EERI — versions

## v15.40 — 2026-08-21 — the shelf comes off the shelf

Thirteen props shipped, were catalogued, kept their contracts, and **could not
be put in a level by any means**. `audit-assets.mjs` has been reporting them
unreachable since it was written — forklift, dump truck, cherry picker, pipe
layer, compressor, generator, floodlight, cable drum, gas cart, jackhammer,
wheelbarrow, vac bot, worker bot — because nothing under `js/` named one in a
`getModel()` call. Correct files answering a question nobody asked.

**A `model` row is what asks.** Fifth row kind, same seam as everything else:
`getModel(name, () => null)`, so a prop whose file 404s draws nothing rather
than a white slab. The palette lists all thirteen; placing one snaps it into
the band like any other row and the size slider resizes it.

**The import is dynamic and carries the same token as main.js's.**
`world34-dressing.js` has no static imports on purpose — the room gate loads
its data in plain Node, where `three` and `window` must never become
dependencies. `import('./assets.js?v=47')` resolves to the same live instance
main.js is using; a different token would build a SECOND assets.js with its own
null manifest, which is the failure that silently unplugged 2.7 MB of layer art
twice.

**`shelf: true` is a third state, and it is not a way to silence a gate.**
Smoke asserts every `live` asset is actually fetched — the rule that caught
that unplugged layer art. A prop the editor can place but no level has placed
yet is live and, by definition, fetched by nobody, so it would fail. Exempting
it is only honest if something still proves it works, so a **new** check loads
every shelf model through the seam the editor uses and fails on any that does
not come back with a root. `shelf` buys an exemption from one check by
submitting to a stricter one.

`audit-assets.mjs` learned the same distinction. Its reachability test greps
`js/` for a literal `getModel('x')`, which was the only way an asset could be
reached when it was written; a sheet naming a model in a row passes the name
through as a variable, invisible to any grep by design. It now also reads the
sheets, and reports **reachable / shelf / unreachable** as three states rather
than calling a deliberate decision a fault. **15 unreachable -> 13 on the
shelf, 2 unreachable** (`token_blueprint` and `token_toolbox`, left as
placeholders on purpose).

Two bugs found by the gate, both mine:

- **PLACE is a toggle**, and the shelf check clicked it while it was already
  on — turning it off, so the pointer landed on nothing and the assertion read
  the leftover row from the previous block. It asks the tool what mode it is in
  now instead of assuming a click means "on".
- **`up()` released a pointer capture that `place()` never took.** PLACE
  returns from `down()` before capturing — it has nothing to drag — and the
  browser throws rather than shrugging. Guarded at both ends, and it is not
  only a test's problem: a real device can lose a pointer the same way when the
  system cancels a touch.

Gates: rooms 147/0 · fx 31/0 · dev-menu 38/0 · **inspector 26/0** — including
placing a forklift and requiring it to actually arrive (5 meshes), because a
dropdown entry that adds a row nobody draws is not "placeable" · **smoke
437/0**, whose new line reads *"every shelf model actually loads (13 on the
shelf)"* · **playthrough 25/0**. Tokens 46 -> 47, manifest 33 -> 34.

The fps scaling from v15.39 held through all of it — this run measured
`waits ×3.78` — so for the first time today a red check would have meant
something.

## v15.39 — 2026-08-21 — the gates were measuring the machine, not the game

**A day of false failures, and none of them were in the game.**

Smoke went 434/0, then 8, then 16, then 11 failures on trees that differed by
one dressing module. The playthrough went 25/0 five times, then 3, then 7. I
suspected my own change, then blamed timing, then bisected against the last
known-good commit — **and it failed the same way**: `LEVEL 7 can be finished ->
got to x=93 of 92`. The sandbox had got roughly four times slower over the
session. The budgets had not moved.

**Boot time is a bad proxy for frame rate.** `smoke.cjs` scaled every wait by
`boot / BOOT_BASELINE`. Four runs of the same tree booted in 442, 597, 658 and
998 ms — a 2x spread — and **every one of them clamped to the 1.5x floor**
while the machine ran 4x slower. It now measures frames per second directly
over 2 s of rAF and scales from that, against the 14 fps this suite was tuned
at when it was green. The ceiling goes 8 -> 12, because this sandbox has been
seen under 3 fps and 8 would have clamped that away too.

**Wall clock is the wrong budget for the bot.** `playthrough.cjs` gave each
level 300 seconds, which means something different on every machine. Frames are
the honest unit here because the game is *stepped* in frames: `main.js`
advances on `Math.min(getDelta(), 0.033)`, so below 30 fps the simulation slows
exactly in step with the renderer and a frame is a fixed quantum of progress
however long it took to draw. 9000 frames is ~150 s of game time at 60 fps and
~300 s at this sandbox's best — the same amount of GAME either way. The
millisecond figure survives only as a deadlock guard for rAF stopping entirely.
The bot's action cooldowns move to frames with it; the jump stays on `q.t`, the
game's own clock, because a jump's length is a property of the game rather than
of the harness.

**This is the change written at v15.30 and dropped.** Dropping it was correct —
its premise there was that the gate had run out of budget, and the real bug was
a fixed 1200 ms wait. But the observation underneath it was right, it went out
with the fix, and it came back as most of a day spent bisecting a clean tree
for a regression that was never in it. The lesson is narrower than "keep every
idea": when a fix is dropped because its *premise* was wrong, the *observation*
that motivated it still needs somewhere to live.

**And one self-inflicted delay.** The first attempt at this put back-ticks in a
comment **inside the BOT template literal**, which ends the string and stops
the file parsing — the same trap `CLAUDE.md` records for `toko/js/chat.js`'s
CSS block. The comment now says so, and the edit that fixed it asserts no
back-tick survives inside that literal.

`test/**` is Design/Level's; declared cross-lane touch, both files.

Gates: **playthrough 25/0** on the same machine that had been failing six of
twelve — twelve levels, no stalls, no ride losses — and **smoke 434/0**, whose
own log line is the proof of the whole diagnosis:

```
boot 448 ms, 3.8 fps → waits ×3.68
```

**448 ms is the same boot as the 442 ms run that passed 434/0 this morning.**
Under the old rule that is the 1.5x floor and everything downstream fails. The
machine was actually at 3.8 fps, the new rule gives 3.68x, and the suite is
clean. Same boot, two and a half times the budget, because boot time and frame
rate were never the same measurement — which is exactly the confusion that
cost the day.

Also: rooms 147/0 · fx 31/0 · dev-menu 38/0 · inspector 24/0.

## v15.38 — 2026-08-21 — the editor can PLACE, not just move

Step 4. Owner's spec: a menu upper-left with layers, a dropdown of assets per
layer, click to place, snap into z, and *"maybe with a size slider after it
snaps"*.

**A band is a name for a range, not a new thing in the data.** The owner asked
for "fore, middle, back1, back2" and the game has no layers in that sense: a
dressing row carries a continuous `z`, and the shipped sites use between 12 and
35 distinct depths each. So `BANDS` is four named depths read off the sheets
that exist — backdrop panels at -1.70, buildings at -1.20, structures at -0.72,
in-front at +0.85 — and placing snaps to the band's `z`. Fine adjustment stays
on the selected row's own z field, so the snap is a default rather than a cage.
That is the right call for this game specifically: the dressing report showed
**depth count** is what separates the worlds that read as places from the ones
that read as collage, so a lane that stays coherent is worth more than a lane
you can nudge.

x and y snap to the **half-tile** grid — not whole tiles, because a prop that
can only land on integers cannot be centred between two.

**A click adds a ROW, never a mesh.** That is what step 2 was for: the sheet is
the thing, the meshes are what the sheet makes, and the room rebuilds from rows
after every placement — the same path a reload takes. Building a mesh here and
remembering to write a row later is the version that silently loses work.

**The size slider runs after the snap**, which is the owner's shape for it: the
band decides depth, the hand decides scale. Each row kind carries its size in a
different field (`w`/`h` for a panel, `r` for a disc, `h` for a cutout), so
`applySize` is the one place that knows which.

**Every site can now hold dressing.** The watcher was gated on `site >= 6 &&
site <= 11`, because worlds 3 and 4 were the only rooms with a sidecar to run.
That gate is exactly what stopped the editor from dressing the rooms a player
sees FIRST. Worlds 1 and 2 have nothing to capture — world 1 has no dressing
layer at all, its look is layer art plus level geometry, and that geometry
carries collision — so the only way they ever get one is by someone placing
rows into an empty sheet. They now mount nothing, cost one 404 on entry, and
work like any other site the moment a sheet is saved.

**`window.__eeriDress`.** The editor needs to tell the dressing module to
rebuild, and there is no path through `__eeri`: main.js does not import this
module (world34-register pulls it in dynamically), and the inspector runs in
the dev frame's realm where a fresh `import()` would build a SECOND copy with
its own `sheets` map and its own `mounted`. One live instance, published once
on the window, is the only version of this that works.

Two things I put in and then had to fix, both my own:

- I called `this.say()` and `debug.dressingRefresh()` before either existed.
- The first size check asserted only that the placed mesh could be *found* —
  a pass on nothing, the same shape as the light-handle check at v15.34. It now
  drives the actual slider through a real `input` event and asserts the row's
  own size field moved, 1.6 -> 3.5.

`test/inspector.cjs` is 19 checks: PLACE adds a row (92 -> 93), at the band's
depth rather than the pointer's, on the half-tile grid, the room rebuilds with
it in, and the slider resizes it. Selection normally happens by raycast and a
test cannot reliably hit a 1-tile prop with a synthetic pointer, so the tool
exposes itself as `window.__insp` on the dev page — which the shipped game
never loads.

Also: the inspector's drag surface takes a thumb now. The handlers were already
pointer events, but without `touch-action: none` the browser claims the gesture
for scrolling and pans the page while the prop stays put — the same family as
the `pointerup`/`touchend` trap `hub/shell.js` paid for.

**DELETE and DUPLICATE**, because a tool that adds but cannot remove makes
every mistake permanent, and the first thing anyone does with a placement tool
is place something wrong. Both edit the sheet and rebuild, like placing does.
A duplicate lands a half tile across — the same step placing snaps to — so the
copy is visibly a second thing rather than hiding exactly behind the first.

**THE 404 WAS A REAL BUG AND I WAVED IT THROUGH.** Opening dressing to every
site means a room without a sheet asks for one and gets a 404, and I wrote that
up as costing "one 404 on entry" as though it were a footnote. It is a console
error, `smoke.cjs` fails the boot on any console error, and it was right to:
six checks went red, starting with *no errors on boot*.

The fix is the pattern the rest of this project already uses — **declare it in
the manifest before loading it**. `manifest.dressing.sites` lists which sites
have a sheet, `rowsFor` asks that before it fetches anything, and adding a
sheet means adding its number. No request is made for a file that is not there.

And the seam it exposed: with no sheet, `addRow` had nowhere to put a row, so
worlds 1 and 2 still could not be dressed — the exact rooms this change was
for. Placing into an empty room now **seeds** a sheet, and says in the panel
that it must be saved and declared or it will not survive a reload.

Two test bugs of my own on the way, both the same shape as bugs this project
has had before:

- The duplicate/delete checks waited **60 ms** for a rebuild. At the ~3 fps
  this sandbox renders at that is a fifth of a frame, so nothing had rebuilt,
  every count came back unchanged, and `picked` pointed into a graph that a
  previous refresh had already detached. Re-select after every rebuild, wait a
  real frame. Same family as the flat 1200 ms wait that cost three wrong
  diagnoses at v15.30.
- Before that, the size check asserted only that the placed mesh could be
  *found* — a pass on nothing.

Gates: rooms 147/0 · fx 31/0 · dev-menu 38/0 · **inspector 24/0**. Smoke is
re-running after the manifest fix; its number and the playthrough's are
deliberately left blank rather than claimed. Tokens 44 -> 46, manifest 32 -> 33.

## v15.37 — 2026-08-21 — the edges stop being jagged, and the grass stops repeating

Owner's steer after the shadows were parked: *"sharper and more varied assets
(like grass) and the anti-aliasing that could smoothen the edges"*.

**THE EDGES WERE ALPHA-TESTED, AND THAT IS THE WHOLE ANSWER TO "RUGGED".**
`craft.js`'s `cutMat` builds every cutout in the game — the grass fringe, the
stones, roots, pipes, bricks, torn card edges, 43 materials in one room — with
`alphaTest: 0.5`. That is a hard binary keep-or-discard per fragment, so every
one of those outlines was stair-stepped.

The renderer has been created with `antialias: true` since the beginning, which
is exactly why this was easy to miss: **MSAA antialiases geometry silhouettes
and does nothing whatever for an alpha cut inside a quad.** The quad's own
rectangle was smooth; the shape drawn on it was not.

`alphaToCoverage: true` spends the multisample budget that was already being
paid for on the alpha edge instead. No second pass, no sort change, and
`alphaTest` stays as the fallback for any context that will not honour it.

**And the fringe stopped being a stamp.** Every run of ground drew the same
tuft strip starting at the same phase, so a repeat that is invisible within one
run was obvious across six of them. The material and its texture are shared on
purpose — cloning one per run is how the v11 retune bug happened — so the
variation goes on the GEOMETRY: each run owns its plane, and sliding and
mirroring that plane's own `u` coordinates gives every stretch a different part
of the same strip. Seeded off the run's position, so it is identical on every
load; a fringe that reshuffles when you re-enter a room is a room that does not
hold still.

---

**THE INSTRUMENT WAS THE REAL FIND, AND IT COST SIX COMPARISONS TO GET TO.**

Every attempt to A/B this game by screenshot has failed the same way, and the
cause was only named here: **`camera.js` drifts on purpose.** `sin(t * 0.23) *
0.5` on the dolly and `sin(t * 0.17 + 1.3) * 0.22` on the height, so "the frame
is never dead still" — which is right for play and fatal for measurement. Two
captures are never the same framing, ~99% of pixels move sub-pixel, and every
difference count measures the drift.

That is what defeated the mipmap check at v15.35 (`noise 79.86% vs effect
75.47%`), the lighting checks at v15.34, and the first two attempts here. Three
separate write-ups reported "not separable from noise" without either of us
working out *why the noise was there*.

`cam.freeze` is a dev-only switch, reached through `debug.cameraFreeze(true)`.
Nothing in the game sets it.

**And a freeze has to SETTLE, not merely stop drifting** — the first cut of it
killed the sine and left the follow easing running. At the ~3 fps this renders
at in a sandbox, `x += (tx - x) * min(1, 3.2 * dt)` needs many seconds of wall
clock to converge, so two captures "with the camera frozen" were still at two
different framings and the A/B was still worthless. Frozen now snaps every
eased term to its target in one frame. The gameplay path is untouched: the
factor is `freeze ? 1 : 0` and `0 || min(1, 3.2 * dt)` is the original
expression.

With it on, the same comparison that had been mush **separates immediately**:

```
A2C on  : 78.00% of the band is a blended tone
A2C off : 25.52%
A2C on  : 85.32%              <- repeat, for the noise floor
effect 56.14 points, noise 7.32  ->  REAL
```

The ruler is deliberately translation-invariant as well — it counts how much of
a band sits *between* its two dominant tones rather than diffing pixels,
because an aliased cut jumps straight from grass to background while an
antialiased one fills that middle in. Belt and braces: the freeze fixes the
framing, and the metric would survive a half-pixel slide even if it did not.

Two honest caveats. The first cut of that ruler anchored to the **per-frame**
dominant tones and was unstable — two identical captures read 32.97% and
70.36% — so it is anchored to a fixed pair now. And the residual 7.32-point
noise means something in the band still moves; the effect clears it by 7.7x, so
the conclusion holds, but the floor is not zero and is not claimed to be.

Gates: rooms 147/0 · fx 31/0 · dev-menu 38/0 · **smoke 434/0** ·
**playthrough 25/0**, twelve levels, no stalls, no ride losses. Tokens 42 -> 43.

## v15.36 — 2026-08-21 — Eeri is the size the references make him

Owner picked the reference framing outright, and asked for the zoom to stay
**dynamic**.

**First, a correction to my own diagnosis.** I reported the kid at "about 1/17
of screen height" from eyeballing a crop. Measured off the real projection he
was **1/9.0 on site 1 and 1/10.2 on site 10** — I was out by a factor of two,
and the fix is a 1.3x zoom rather than the 2.4x I implied, which costs far less
level readability than I made it sound.

| site | before | after |
|---|---|---|
| 1  — groundworks | 80px, 1/9.0  | 102px, **1/7.1** |
| 4  — wet trench  | 77px, 1/9.4  | 98px,  **1/7.3** |
| 7  — cut bank    | 72px, 1/10.0 | 92px,  **1/7.8** |
| 10 — night shift | 70px, 1/10.2 | 90px,  **1/8.0** |

**It is a MULTIPLIER over the shot director, not a new default**, and that is
what keeps it dynamic. `camera.js` is already a small director — a site
declares SHOTS, zones with their own dolly, and the machine stretches
deliberately pull back so you can read a cycle before committing to it.
Replacing `DEFAULT.z` with a closer number would have flattened that into a
follow camera. One `ZOOM = 0.78` applied after the mode reframe, the punch and
the drift scales every authored relationship by the same proportion: site 1
lands at 1/7.1 and the pulled-back machine sites at 1/7.8–1/8.0, which is the
right way round.

**Why this was worth doing before more art.** Everything added lately — the
enemy models, the eye tells sized in v15.30, the craft detail maps, the mipmaps
in v15.35 — was sitting below the size at which any of it can be read. This
multiplies work already done instead of adding more.

A side effect that answers a separate complaint: the dead brown earth band
across the bottom of every frame shrinks with the visible height, so the
"bottom third is a flat slab" problem is smaller without anything being redrawn.

**The gate measures pixels, not the constant.** `smoke.cjs` projects Eeri's
head and feet through the real camera and asserts he lands between 1/6 and
1/8.6 — so it still fails if a shot, the FOV or the stage aspect moves, none of
which reading `ZOOM` back would catch. Given I got this number wrong by 2x by
eye, a check that cannot be fooled by an eye earns its place.

`js/camera.js` is Design/Level's file; this is a declared cross-lane touch, one
constant and one multiplication.

Gates: rooms 147/0 · fx 31/0 · dev-menu 38/0 · **smoke 434/0** — the new
framing check reads *"Eeri is framed like the references (1/6.93 of screen,
103.9px of 720)"* — · **playthrough 25/0**, twelve levels, no stalls, no ride
losses. Tokens 40 -> 41.

The playthrough matters here rather than being a formality: the bot plays by
reading game state, not pixels, so a camera change should be invisible to it —
and that is a reason to check rather than a reason to assume, because the
camera also drives the level-edge clamp (`halfW`) and a closer dolly changes
where the frame stops.

## v15.35 — 2026-08-20 — the lanes use the mipmaps they were already paying for

`assets.js` loaded every layer texture with `minFilter = LinearFilter` and left
`generateMipmaps` at its default of `true`. So the mip chain was **built for
every lane — about a third more texture memory — and then never sampled**,
because `LinearFilter` does not read it. That is the worst of both, and it is
now `LinearMipmapLinearFilter` with `anisotropy = 4` to match the detail maps.
The painted canvas lanes in `layers.js` had the same pair and get the same fix.

**What I can and cannot claim.** The change is free — the memory was already
spent — and it can only help a minified lane. What I could NOT do is show it in
a picture, and the attempt is worth recording because it failed the same way
four earlier measurements in this session failed.

Toggling `minFilter` live in one page (so the camera cannot drift) and diffing
full frames returned:

```
mip vs no-mip : 75.47% of pixels differ (mean 60.82)
mip vs mip    : 79.86% of pixels differ (mean 63.97)   <- frame noise
```

**The noise floor is HIGHER than the effect.** Bolts spin, the kid breathes,
the lamps flicker; nothing in this scene holds still, so a full-frame diff
measures the animation. Printing the noise beside the effect is the only reason
that is visible rather than being written up as "a 75% improvement".

Two further reasons a still was never going to settle it. The close lanes were
retiled to ~73 px/unit at v15.33 specifically so they are near 1:1 at the
camera's framing, and **a texture drawn at 1:1 does not use its mip chain at
all** — the gain is concentrated in the far and skyline lanes, which are the
softest things on screen anyway. And aliasing is a **motion** artefact: crawl
along an edge is invisible in a frozen frame by definition, and this sandbox
renders at ~3 fps through SwiftShader, so there is no motion to look at either.

`CLAUDE.md` already names the right instrument for this class of question —
Toko Drop's `scripts/enemy-loop.mjs` records GIF loops from the real game code,
"against captured MOTION, not against stills or state assertions, because the
smoke gates certify *works* and prototype-feel lives entirely in the part they
cannot see". Eeri has no equivalent yet. Until it does, this change ships on
the grounds that it is correct and costs nothing, not on the grounds that it
was seen to help.

Gates on the same tree: rooms 147/0 · fx 31/0 · dev-menu 38/0 · smoke 434/0 ·
playthrough 25/0. Tokens 39 -> 40.

## v15.34 — 2026-08-20 — the lamps light something

Step 3 of the editor plan. The owner's two constraints pull against each other
— *"light sources can correct a lot"* and *"if assets move, the lights break"* —
and the seam that resolves them was already in the tree:

> every dressing primitive is `MeshBasicMaterial`, which ignores lights
> entirely, and everything you **play on** — level tiles, craft props, the kid,
> the enemies, the machines — is `MeshLambertMaterial`, which does not.

So a light placed in a sheet lights the actors and the terrain and **cannot**
touch the painted backdrop. That is the right split and it cost nothing to
find: the half of the picture that would look wrong if a light moved is immune
by construction. Nothing is baked, so nothing can go stale — move the lamp,
move its row, and the light is somewhere else next frame.

`light` is a fifth row kind and the only one no builder emits, because there
were never any lights to record. It is authored in the inspector and only ever
arrives from a sheet: `{k:'light', x, y, z, c, i, d}`.

**Site 10 gets the first five**, at the positions the sheet already *draws* as
light sources — four warm windows, the high lamp over the gantry, the worklamp
— plus one at the dock mouth, which is one of the undressed opening stretches
the dressing report named.

**THE UNITS TRAP, and it is the whole story of this version.** The first five
lights were authored at intensity 2.2, sized by eye against the scene's
existing `DirectionalLight` (1.35) and `HemisphereLight` (1.25). Rendered:
`off`, `2.2` and even `90` were **indistinguishable in a screenshot**. three.js
has been physically based since r155 — a `PointLight`'s intensity is candela
and falls off as 1/d², while a directional and a hemisphere light are in units
that do not. Reusing directional-sized numbers for a point light six units away
is not a dim light, it is no light. The shipping values are 120-190 cd over
24-30 units, roughly **seventy times** the first guess, and the gate now fails
anything under 40 cd or with a reach under 16 units — a number, not a boolean,
because the failure mode renders perfectly.

**Four wrong measurements before the right one, all the same mistake.** The
question was "does the light reach the things you play with", and:

1. I compared two page loads. The camera settles differently each time, so the
   diff measured the camera. Same error that reported 93.6% of pixels differing
   on an identical scene at v15.33.
2. I projected the kid to screen space using the window's size. **The canvas is
   letterboxed** inside the page — `camera.aspect` is a fixed stage ratio — so
   the box landed on a crate eighty pixels away and returned a confident 49-point
   warmth reading off the wrong subject.
3. I measured the kid. He breathes, his cap bobs, and the bolts spin behind
   him, so the subject changed between reads.
4. I measured a ground strip that turned out to be `dockSlab` — a dressing
   `panel`, `MeshBasicMaterial`, the one thing in the scene guaranteed not to
   respond to a light.

What made it tractable was **bracketing**: read ON, OFF, ON, and report the
noise floor beside the effect. It said `effect 0.13, noise 9.93 → NOT SEPARABLE
FROM NOISE` and refused to draw a conclusion, which is the only reason the
first three mistakes were caught rather than published. Moving off the kid onto
fixed geometry dropped the noise floor from 9.93 to 0.29.

In the end the honest instrument was **four screenshots in one page** at 0,
2.2, 90 and 330 cd. A human can see the difference between the third and the
fourth instantly; no amount of photometry on a 141×33 patch was going to say it
faster.

**Handles.** A light has no geometry and the inspector picks by raycast, so
each light gets a small wireframe ball beside it carrying the row id. It is a
**sibling, not the light's parent**: `WebGLRenderer.projectObject` skips an
invisible subtree wholesale and that is also where it gathers lights, so
parenting a light to a hidden handle switches the light off. The inspector
mirrors the handle's position onto `pairedLight` on every drag and arrow-key
nudge, and reveals the handles by walking the scene for `userData.lightHandle`
— no export, no hook, no line added to the game.

**Budget: six lights per site, and no silent caps.** A `PointLight` with a
distance is per-fragment work on every Lambert surface in range and the level is
a lot of boxes. Rows past the budget are dropped with a console warning naming
the count, because a budget that quietly loses the seventh lamp reads as "that
light does not work" and gets debugged for an hour.

The two halves of the handle claim are checked in different files on purpose.
`inspector.cjs` proves opening the panel reveals them; it cannot prove the
shipped game hides them, because by the time it looks it has opened the panel.
`smoke.cjs` loads `index.html`, opens nothing, and asserts zero visible.

**And then the gates caught two of their own.** Both are the same failure this
version is otherwise about — a check that measures the wrong thing — and the
second is worse than the first.

*The sheet-vs-builder check failed on the editor working.* It fingerprints
every mesh a sheet replays against every mesh its builder draws, which is the
right proof that the **migration** was lossless. But a sheet is now also
somewhere you can add things the builder never had, and five lights brought
five wireframe handles with them: `site 10: 92 vs 87 meshes`. The invariant
that still means something is *every mesh the builder draws is drawn
identically by the sheet* — the sheet may hold more. Handles are excluded by
`userData.lightHandle` and the check is renamed to say so. A missing or altered
builder mesh still fails it, because the counts must match once the authored
ones are set aside.

*The handle check passed on an empty set.* `no light handle is drawn in the
game itself (0 of 0 visible)` — it ran wherever the page happened to be
standing, which was not a site with lights in it. **A green tick on nothing at
all is worse than a red one**: it would have stayed green with the handles
permanently switched on. It now navigates to site 10 first and asserts, as a
separate check, that there were lights and handles there to find before it
believes the answer about their visibility.

Gates: rooms 147/0 · fx 31/0 · dev-menu 38/0 · world34 pass · inspector 13/0
(five new) · **smoke 433/0** · **playthrough 25/0**, twelve levels, no stalls,
no ride losses.

The handle rule ends up proved from both sides without a revert test, which is
the better outcome: `inspector.cjs` requires **5 of 5 visible** once the panel
is open, and `smoke.cjs` requires **0 visible** on a page that opens nothing —
two tests with opposite expectations of the same field, so neither can pass by
accident and neither can pass on an empty set.

## v15.33 — 2026-08-20 — worlds 3 and 4 stop being code and become data

**Step 2 of the level editor, and it is the step that makes step 1 mean
something.** The inspector could already pick a prop and drag it. It could not
KEEP the move, because in worlds 3 and 4 a prop was not an object anywhere —
it was a line of code that ran once. `timberFrame(THREE, root, 15, 4.1, 6.0,
5.2, -0.84)`. Nudging it meant editing a number in a function body and
reloading, which is why those worlds read as things dropped near each other
rather than composed.

**613 rows across the six sites are now written down** in
`assets/dressing/site-N.json`, and the runtime prefers them: the same seam
every asset here uses, `getModel(name, buildPlaceholder)` — data if present,
code if not. A site with no sheet still builds from its builder, so this
migration cannot take a level away.

**The migration is a recording, not a re-authoring, and that is the whole
trick.** Fourteen composite functions (`timberFrame`, `crateStack`, `gantry`,
`loadingDock`, `rootPocket`, …) all bottom out in exactly THREE leaves —
`panel`, `disc`, `cutout`. Those three now push a row on the way past, so what
`art-src/tools/capture-dressing.mjs` writes out is not a transcription of the
code, it IS the code's output. Replaying rows through the same three functions
rebuilds the identical scene by construction rather than by review. Hand-
porting 73 call sites would have been the version of this that loses the look.

**The proof, and the ruler that had to be thrown away to get it.** First
attempt rendered each site twice — sheet, then builder — and diffed the
pixels. It reported up to **93.6% of pixels differing on a scene that was in
fact identical**: two page loads settle the follow camera and the idle
animation differently, so the ruler was measuring the kid breathing. Compared
as GEOMETRY in one page — position, size, colour, opacity, mapped-or-flat —
all six sites come back **0 meshes differing**, 606 meshes. That is now a
smoke check, because the two paths will drift the moment someone edits a
builder without re-running the capture.

**Every replayed mesh carries the id of the row that drew it**, which is the
link the editor turns on: pick a prop, drag it, and the row moves with it, so
SAVE writes what is on screen. It has to be a stamp rather than an index
because `cutout` finishes ASYNCHRONOUSLY — meshes arrive in texture-load
order, not row order.

**Saving is honest about what it can do.** A browser cannot write into the
repo, so SAVE hands over `site-N.json` as a download and names the file it
replaces. The step-1 gate asserted *"it does not claim to save anything yet"*
and was right to; that claim now inverts, and what it guards inverts with it —
the dishonest option left is a save that quietly lives in `localStorage` and
dies with the tab, so that is what is forbidden instead.

**A gate that passed while broken, caught before it shipped.** The first cut
of `test/inspector.cjs` grabbed the first tagged mesh it found and asserted on
that — and stayed green with the tagging for `panel` and `disc` deleted,
because the mesh it happened to find was a `cutout`, which tags by its own
path. Two of three leaves could have shipped untagged behind a green gate. It
now counts **every** mesh in a sheet (87/87 on site 10) and fails at 3/87 and
84/87 against the two ways of breaking it. Both were verified by breaking them.

**And the first thing the data was good for was a measurement.**
`art-src/tools/dressing-report.mjs` counts what each site is actually made of,
which could not be written a day ago: while a prop was a line of code, "how
many distinct depths does site 9 use" meant reading four hundred lines and
keeping a tally in your head. The answer to *"the levels look rugged"* turns
out to be legible in three columns:

| site | rows | dominant primitive | depths | undressed 8-tile gaps |
|---|---|---|---|---|
| 7  | 90  | **disc 80%**  | 12 | — |
| 8  | 104 | disc 68%      | 18 | — |
| 9  | 97  | **disc 77%**  | 13 | — |
| 10 | 87  | **panel 92%** | 24 | 0-8, 64-72 |
| 11 | 98  | **panel 93%** | 24 | 0-8 |
| 12 | 137 | **panel 95%** | 35 | 0-8, 24-32 |

World 3 is roughly four fifths flat circles across twelve depths; the three or
four cutouts per site are doing all of the describing and the other seventy-odd
shapes are wallpaper. World 4 is even more monotonous by primitive — 92-95%
plain rectangles — and reads considerably better anyway, because it uses **two
to three times as many distinct depths**. That is the strongest single lesson
available here and it did not come from taste: depth count, not asset count, is
what makes a 2.5D screen read as a place instead of a collage.

The gaps column is its own finding: every World 4 site opens on an **undressed
first eight tiles**, which is the worst possible place for it — the first two
seconds of a level are where "unfinished" gets decided.

The report prescribes nothing. Composition is the owner's and the design
lane's call; this only makes the current state legible enough to argue about.

New: `art-src/tools/capture-dressing.mjs`,
`art-src/tools/dressing-report.mjs`, `assets/dressing/site-7..12.json`,
`test/inspector.cjs` (8 checks). Tokens 37 -> 38.

Gates: rooms 147/0 · fx 31/0 · dev-menu 38/0 (three rewritten) · world34 pass ·
inspector 8/0 · **smoke 431/0** (including the new sheet-vs-builder check over
606 meshes) · **playthrough 25/0**, twelve levels, no stalls, no ride losses.

The playthrough matters on this change rather than being a formality: worlds 3
and 4 now build their dressing from a fetched file instead of from code, and
`buildSite()` is async. A room whose sheet has not landed is a room the bot
walks into mid-build — which is exactly the failure that cost three wrong
diagnoses at v15.30, in a version where the only thing arriving late was a
texture.

## v15.32 — 2026-08-20 — the level inspector, and the blind loop ends

**Owner direction:** *"do you think we could make a level editor that allows me
to place assets and backgrounds in a more deliberate way?"* — yes, in four
steps, and this is step one. Reached from the pause menu, as asked.

**The premise, corrected, because it decides the design.** The levels are not
placed randomly. Every number in them was chosen. They are placed **BLIND**: a
prop in this game is a line like

    panel(THREE, root, 48, 10.0, 124, 22, 0x14263c, -1.72)

so composing a picture means typing eight numbers, reloading, looking, and
typing them again. Nobody composes anything that way, which is exactly why
nothing looks composed. Step one changes **no format at all** — it makes that
loop SIGHTED. Point at a thing, find out what it is, drag it, read the
corrected numbers back out.

**It lives entirely outside the game.** `dev.html` FRAMES `index.html` rather
than copying it, so what is inspected is byte-for-byte what ships, and
`dev/inspector.js` is loaded by the dev page alone. `index.html` gains no
import, no button and no branch — the gate now asserts all three, plus that
`js/menu.js` has never heard of it. **The pause-menu row is added from OUT
HERE**: `openMenu()` builds its card fresh each time, so the inspector watches
the framed document for one appearing and appends `DEV TOOLS` to it. That
keeps the rule the whole dev pack is built on — the pack reads the game, the
game never learns the pack exists — and it means no shipped build can ever
show a six-year-old a button marked DEV.

**One handle the game had to give up.** `camera`, next to `THREE, scene` on
`window.__eeri`. "What is under this pointer" is a raycast; a raycast needs the
camera the picture was drawn with, and `debug.camera()` returns a *position*.
`test/dev-menu.mjs` now names it, because the whole reason that file exists is
that the pack reads hooks nothing in the game depends on — rename one and
nothing else fails, the tool just quietly stops selecting anything.

**What it does.** PICK selects by raycast and drags in the object's own z
plane — depth is the one axis you must not change by accident in a 2.5D game.
Arrow keys nudge (shift = whole tiles). x/y/z are editable fields. REVERT
restores where a thing started, remembered on first select, because otherwise
an afternoon of dragging is unrecoverable — the real numbers only exist in
source. WALK moves the player, which moves the camera: the game's own `Camera`
writes the position every frame and fighting it from a second rAF is a race, so
the view is changed by the one route that cannot desync. And a **visibility
switch per scene group**, which answers the question that costs the most time
by hand: *which layer is that thing on*.

**Naming the layers is half the value.** Every lane plane was an anonymous
`Mesh` sitting directly in the scene — fine for the renderer, useless to a
person. The first pick reported `Mesh` in `(scene)` at z 2.20 and that was all
it could say. They now name themselves `groundworks/fore`, with the tile
number on a tiled lane (`near:1/2`) because *which half of `near` has the seam
in it* is a real question. The first thing the tool said once they had names
was that the object covering the middle of level 1 is the **fore** lane — which
is the owner's own complaint about long foreground objects, answered by
pointing at it.

**What it deliberately does NOT do.** It does not save: scenery is code, not
data, so there is nowhere to write to, and a Save button that writes nowhere is
worse than none — the gate fails on `localStorage`, `fetch(` or `download` in
this file. It does not name the source CALL, because half those numbers are
computed inside a loop and there is no single line to correct. Both are step 2,
which is the real work: **73 dressing call sites across 500 lines** become
data. The editor UI was always the small part.

**A gate of mine was lying.** The height checks added in v15.30 imported
`./js/assets.js?v=35` as a literal, so once the graph moved to 37 the import
404'd, `getModel` returned null, and two checks failed claiming the models had
no height. The gate now reads the token out of `js/main.js` — nobody
hand-keeps a number another file already owns, which is the same rule that
produced `scripts/deploy-hub.mjs`.

Tokens: every module 36 → 37; `dev/inspector.js` starts at 1.

Gates: rooms 147/0 · fx 31/0 · dev-menu 36/0 (six new) · smoke 430/0, plus a
headless drive-through of the tool itself — open the pause menu, click the row,
pick, drag, revert, zero page errors — and **playthrough 25/0**, twelve levels,
no stalls, no ride losses.

That last number was left blank when this was committed rather than written
ahead of the run. Nothing here touches the update half of the loop, so there
was no reason to expect it to move — which is a reason to check, not a reason
to claim, and this session had already put an unverified gate number in a
commit message once. It is written now because the run finished.

## v15.31 — 2026-08-20 — the hint stops covering the game

**Owner's report: on a phone held sideways with a controller plugged in, the
helper box stretches from the top of the screen to the bottom and you cannot
see the game.** Measured on an 844x390 viewport it is **368 px of 390** — a
one-line hint occupying 94% of the picture.

It is a two-property collision and neither property is wrong on its own.
Landscape anchors `#hint` to the TOP (`bottom: auto; top: 10px`) because in
landscape both bottom corners are full of drawn controls and a hint buried in
the control cluster is a hint nobody reads. `html.padded` — set when a real
controller is present — then puts `bottom` back, which is also right: with a
pad there are no drawn controls to clear, so the hint belongs at the bottom
where it always was. What it never did was release `top`. A `position: fixed`
box with **both** edges pinned and `height: auto` does not sit at one of them;
it stretches between them.

`top: auto !important` is the whole fix.

Why nothing caught it: it needs **all three** of coarse pointer, landscape
orientation and a connected pad, simultaneously. Every desktop run has a fine
pointer, every touch run in the gate had no pad, and the pad runs were on a
desktop. The gate now plugs a pad into the landscape phone it already opens
and measures the hint's **height** — the height is the bug, and there is more
than one way to cause it, so asserting on a CSS property would only catch this
one route back in. Verified by reverting the fix: 368 px, one check red.

Gates: smoke 429/0 (two new) · rooms 147/0 · fx 31/0 · dev-menu 30/0.

## v15.30 — 2026-08-20 — three defects nobody could see, and a flip that did not earn it

**RENUMBERED FROM v15.29, AND THAT IS THE FOURTH TIME.** The design lane
shipped its own v15.29 — the ground and the canopy — within the same hour this
was written, so two entries carried one number again. CLAUDE.md's rule exists
for exactly this and I did not follow it: *fetch and read the other lineage's
VERSIONS.md before writing a new heading*. Nothing was lost this time because
the collision was caught at the rebase rather than after both had shipped, but
it is caught by luck rather than by a gate, and it will keep happening while
the number is chosen by hand. The three entries below it moved up one with it.

**RENUMBERED FROM v15.28, which is the collision CLAUDE.md warns about and it
happened anyway.** `main` shipped its own v15.28 an hour apart, same integer,
and picked the same module token (35) and the same `manifest.json` token (32)
with it. The rule that catches this is *fetch and read the other lineage's
`VERSIONS.md` before writing a heading* — and it only works if you do it
immediately before PUSHING rather than when you start, which is the amendment
this cost.

**THE HEADLINE IS A NEGATIVE RESULT: the four enemy models stay
`placeholder`.** The task was to take the enemy seam live — `robots.js` has
asked `getModel` for a model since v15.27 and got `placeholder` back every
time, so the code path shipped and nothing came through it. Flipping the four
is one line each and every gate stays green. It is still the wrong call, and
the A/B is the reason: photographed in the same spot in Level 1, the code box
is a solid machine-orange brick you cannot miss, and the model is a small
yellow figure that sits into pale timber and sand. main's v15.28 measured the
same thing from the other end — *"the small robots read as brown blobs at
gameplay scale"* — flipped nothing, and handed the decision here with a stated
bar: **an enemy that hides in the scenery is worse than the box it replaces.**
It does not clear that bar yet, so it does not ship.

What would clear it is a paint job, not a line. The enemy needs to be lit by
the CAST's contrast rather than the site's — the box wins because it is
`PAL.MACHINE_DK` against sand, and the mesh brings its own hi-vis yellow which
happens to be the value of everything it stands in front of. That is the art
lane's next piece of work and it is now scoped by a picture rather than a
hunch.

**Getting to that answer turned up three real defects, and every one of them
was invisible to every gate in the repo.** This is the useful half of the
release.

**1. The tell was 0.002 tiles across.** DESIGN §3 says the telegraph IS the
enemy design. On a skinned rig it is a lamp parented to the `Head` BONE — and
a bone is not in world units. Meshy rigs its skeletons at roughly 1/90 scale,
so a sphere authored at radius 0.075 came out **two thousandths of a tile** on
all three skinned enemies: in the graph, absent from the screen. The offset
went the same way, putting the lamp a millimetre inside the head rather than
on its face. The bone's world scale is divided back out of both, and the
placeholder's eye is now named `tell` as well, because the rule is about the
GAME having a telegraph you can see and not about which art is behind it.

**2. `height` was only honoured for skinned rigs.** The manifest,
`assets/README.md` and the audit tool all document it as the field the seam
rescales to — and the rescale sat inside the `rig: "skinned"` branch, so a node
rig or a prop could declare it and silently not get it. `rollerbot` declared
0.5 and arrived 0.76; **`token_bolt` declared 0.85 and arrived 0.62, and that
one is live**, so honouring the field makes every collectable bolt in the game
37% bigger. That is the correct direction — if 0.85 is the wrong number the
fix is to change the DATA, not to go back to ignoring the field — but it is a
visible change and it is stated here rather than discovered.

**3. THE SHELL OUTLINE DOES NOTHING ON A SKINNED MESH.** `outlineShell` pushed
its back-face shell out by SCALING it (×1.045). Rendered on the enemy rigs
that produced **no visible line at all**, and the measurement says why: the
shell's world box comes out **0.009 tiles** against a body of 0.7 — it
collapses inside the model rather than wrapping it. Displacing along the
normal in `begin_vertex`, ahead of the skinning chunks, gives a line that
survives the pose, and the same picture then shows one.

The honest limit on this finding: `kid.js` has used the same helper since
v15.25 said *"the kid has an edge"*, so his edge is at best unverified and
most likely was never there. I do NOT have a clean measurement of it. My first
one — comparing the shell's box against its parent's — was **circular**:
`Box3.setFromObject(parent)` expands over the parent's descendants, and the
shell is one of them, so it was measuring the shell against itself and would
have reported a match whatever the truth was. Recorded because a wrong ruler
that agrees with you is the most expensive kind, and this release also fixed
two gates that had the same shape.

Two details there are load-bearing, and I got the first one wrong in the most
visible way possible before getting it right. The width is in tiles and has to
be divided by the scale the mesh is DRAWN at — and for a skinned mesh that is
not its node's scale. Meshy hangs `char1` under a 0.01 cm→m node, so the node
reads 0.008 while the thing on screen is 0.7 tiles tall; dividing by 0.008
asked for a 180% inflation and put a black shell across the entire sky. The
honest ratio is what the model MEASURES on screen over what its geometry
measures in bind space. And the shell is LAMBERT, not BASIC: `objectNormal`
only exists in the basic shader behind `USE_ENVMAP`, so a basic shell compiles
silently with nothing to push along.

An honest limit on that one: at the gameplay camera an outline of a believable
thickness is **one to two pixels**, which is why it is not the answer to the
enemy-readability question above. It is worth having — it is the kid's stated
edge finally existing — and it is not a contrast fix.

**Gates: two new ones, and both were run against the bug before being
trusted.** A ruler that cannot fail is not a ruler and this project has shipped
two of those. `smoke.cjs` now measures every tell's world size off the live
scene (fails at 0.0013 on the old code) and every live model's declared height
against what it actually stands at (fails at 0.76 for `rollerbot`). Neither
question can be asked anywhere else: the first only has an answer once the
scene exists, the second only after the loader has applied the node transforms
— which is why the bare-node audit cannot see it. The outline has **no** gate,
deliberately: the displacement is a shader uniform, so no `Box3` can see it,
and both of its failure modes — absent, and swallowing the screen — were found
by looking at a picture. `__outlineFrac` is recorded on each shell for whoever
does find a way to measure it.

**Cross-lane, declared.** `outlineShell` moved out of `js/kid.js` and into
**`js/craft.js`** — the module that decides what a surface in this game looks
like — because the enemies need the same line and two copies of a silhouette
rule is how two silhouettes start; `kid.js` imports it now instead of owning
it. `js/robots.js` gains the tell fix and names the placeholder's eye.
`test/smoke.cjs` gains the two checks and one tour stop (site 5 — `bucket` is
the only enemy in no world-opening room, so the fetch check fails on
`bucket_v1.glb` alone the moment it goes live; kept now so the gap is not
rediscovered the hard way).

Tokens: every module 35 → 36. `manifest.json` stays at 32 — its bytes are
main's, unchanged here, since the four enemies went back to `placeholder`.

Gates: rooms 147/0 · fx 31/0 · dev-menu 30/0 · smoke 427/0 · audit 31/31
contracts, 15 unreachable · **playthrough 25/0**. That last one is not a
formality here: the outline draws every mesh a second time and this sandbox
rasterises in software, so doubling the draw calls on the kid was a real risk
to a gate that has already been misread once this week. Twelve levels, no
stalls, no ride losses.

## v15.29 — 2026-08-20 — the ground answers the world, and the canopy stops being circles

The last two items off the visual diagnosis, and both are on screen in every
single frame.

**One brown band served all four worlds.** The strip you stand on was the
identical `PAL.EARTH` ramp under a sunlit construction site, a flooded trench,
a forest and a night shift — the backdrops changed completely and the floor
underneath answered none of it, which is most of why four worlds read as the
same place with different wallpaper. The `Level` never knew which world it was
in: `main.js` computes `worldOf(i)` for the backdrop and did not pass it on.
It does now, and `EARTH_FOR` tints the ramp per world — pipeworks cooler and
greyer, grove peat-dark with humus in the topsoil, nightshift carried toward
INK, because a warm brown goes **blue** before it goes black at night.
Groundworks is untouched on purpose. The grass lip goes with it (`LIP_FOR`):
it is the brightest thing on the floor and so the first thing that gives the
reuse away.

Measured off captured frames rather than judged by eye, because a night scene
fools you into thinking everything is already darker: the band samples
**#745538** in world 1, **#584330** in world 2, **#57482b** in world 3 and
**#3d2c1c** in world 4. No new palette constants — every colour is
`PAL.EARTH` mixed toward something the palette already has, so if the art lane
wants real per-world earth, this is the one table to replace.

**The Grove canopy was fourteen circles.** Making them smaller was the
previous attempt and it does not work, because what gives a disc away is that
its EDGE is a perfect arc all the way round in a single value. Two changes,
both about breaking the arc: a tree is now a **cluster** of three or four
overlapping lobes at different radii and off-centre from each other, so the
silhouette has notches in it; and it carries **two values**, a darker mass
with a lighter crown up and to the left — §3.1's "key from upper-left" applied
to a shape that had no shading in it at all. Every second tree gets a thin
dark trunk, since a canopy floating with nothing holding it up is the other
half of why they read as decals.

Cross-lane, declared: `js/world34-dressing.js` is the art lane's file. The
canopy change is small, self-contained, and stays inside that file's own
colour range; it is called out here so it is not a surprise.

**A working note, because it cost this session an hour twice.** The container
running this branch has rolled the repository back to a two-day-old commit
**four times**, and the dangerous shape is not the obvious one: the tree comes
back stale while files you edited moments ago survive on top of it, so you are
patching a v15.19 `level.js` that looks fine and gates green against a tree
nobody will ever ship. The tells are a `?v=` token that disagrees with the
rest of the tree and a `VERSIONS.md` missing its newest entries. **Check
`git log --oneline -1` against `origin/main` before trusting any gate result**,
and commit as soon as an edit is coherent rather than after the gates.

## v15.28 — 2026-08-20 — worlds 3 and 4 stop borrowing worlds 1 and 2's machines

**Why they were not made: there were only ever two machine classes.**
`MACHINE_SPEED` names a pump and a pipelayer, DESIGN describes them, and
`main.js` said *if it is a crane build a Crane, otherwise build an
Excavator*. So World 2's "pump ride" is an excavator wearing the word, and
Worlds 3 and 4 borrowed Worlds 1-2's machines outright — a forest clearing
and a night earthworks worked by the same yellow digger.

**The cheap part is the class; the expensive part is the silhouette.** The
Excavator animates NAMED NODES — house, boom, stick, bucket, seat, step,
wheels, beacon — and knows nothing else about what it is driving. So a new
machine is a new MODEL against that contract, not a new class. `js/rigs.js`
adds two:

* **the SKIDDER** (World 3) — tracked, wide and low, a two-jaw grapple where
  the bucket goes, a stack tall enough to read against a treeline and a
  brush guard over the cab. It drags fallen timber, which is the same
  close-and-lift the bucket does, and that is why the node is still called
  `bucket`.
* **the LOADER** (World 4) — wheeled, a wide blade, an arm that lifts from
  the front and rests nearly flat, and a mast with two work lamps. The lamps
  are what make it the night shift's machine.

`main.js` builds by TYPE now, and picks the class by the machine's VERBS
rather than its name — `smash` is the crane's arc, everything else is the
excavator's arm — so the next machine is a table entry plus a builder.

Both keep the excavator's verbs on purpose. §8.0's warning is about a ride
being a fetch-quest, not about a verb being reused, and World 2's pump is
already the bank's shape re-dressed. A machine that lights a dark stretch or
lifts you up a face is a **new mechanic** and wants its own room rules — not
smuggling in as a model swap.

Body colour stays `PAL.MACHINE` for both. A green skidder would read as a
different cast rather than as another machine on the same site, and the
house rule puts the difference in the **silhouette** anyway.

**What the wiring found, which is bigger than the wiring.** The art is not
missing — it is switched off. Twenty-five model entries, twenty-five files
on disk, **twenty-two of them `placeholder`**. Flipping all twenty-one
flippable entries `live` and walking eleven levels produced **no contract
warnings at all**, and fetched five files; the other sixteen were never
requested, because nothing places them. Three findings went to the art lane
in DESIGN §6.3.1, each measured rather than guessed:

1. **`crane_v1.glb` cannot go live as it stands** — the node names match, so
   the seam accepts it, and then the crane renders about a third size with
   the ball hanging in open air. Nodes right, **offsets and scale wrong**:
   the excavator_v2 trap exactly.
2. **The small robots load, and read as brown blobs at gameplay scale** —
   the placeholder is the cast's orange, the mesh is a mid-brown against
   pipe stacks of the same value. The kid's INK outline fixed the same
   problem in v15.25.
3. **Sixteen props are unreachable because nothing PLACES them**, which is
   the dressing layer's job and the cheapest visible-quality work left.

Plus a live defect: World 3/4 dressing logs `forestTunnel` and
`forestClearing` failing on every boot of those worlds.

Nothing was flipped live in this release. A crane that renders wrong and an
enemy that hides in the scenery are both worse than the box they replace,
and both are the art lane's call to make, not this lane's.

## v15.27 — 2026-08-20 — the lights go down between levels, and the art lane lands

Two things: a merge and a transition.

**A level change now happens with the lights down.** It used to be a hard cut
— the old room pulled out of the scene and the new one appearing mid-frame,
with the level card over the top of it. Two things were wrong with that. It
reads as a **glitch rather than as an ending**: a six-year-old cannot tell
"you finished the level" from "the game broke" when the picture simply becomes
a different picture. And it made the **loading visible**, because `buildSite()`
is async and a room with unfetched models pops in piece by piece as they land.

So `#veil` goes down over 260 ms, the whole swap happens in the dark, and it
comes up over 420 ms on a room that is already built and already framed. Down
is quicker than up on purpose — the cut should feel like an ending and the new
room like an arrival. The card sits **on** the veil (z 8 over z 7), so what
you read on black is the level you have just finished.

Two details that are the difference between a fade and a bug. The veil
resolves on a **timer, not `transitionend`** — that event never fires when the
value does not change (a second call while it is already down, a browser that
folds a 0 ms transition away), and a promise that never settles here is a
black screen forever. And `transitioning` is cleared **after** the lights are
up, because it is what the flag, the pause menu and the gate all read to mean
"the change is finished"; clearing it early lets a press land in the dark.
Under `prefers-reduced-motion` both durations are 0 — the same path run
instantly, never a branch that could skip the step that brings the lights back.

The colour is the game's own ink (`#17130f`), not `#000`: the scene is a craft
table and a pure-black hole in it looks like a hole in the screen.

`test/smoke.cjs` measures all four states — clear and pointer-inert at rest,
opaque **while** the change is in flight (sampled during, not after), clear
again once the room is built, and the card above it. `test/playthrough.cjs`
stopped waiting a flat 1200 ms for a new room and now waits for the game's own
`transitioning` to go false: a fade the bot walks into would be reported as a
wall.

**PR #291 is in** — the art lane's look pass, three-way merged at v15.26. Two
conflicts, both the same shape: an import block where their side adds a name
(`layerPx`, `loadRobotAsset`, `getModel`) and mine carries the newer token.
What it brings: **robots.js stops drawing a box and asks the seam for a
model** (the fix the owner named), 16 new or recompressed GLBs with it, the
close lanes retiled at 73 px/unit, cleaned edges, a wider foreground, more
contrast in the map, layer art v4 → v5 with mid and near split into a/b tiles,
an audit of all 31 shipped models, and the enemy asset seam shipped inert.
The deletions under `assets/2d` are those replacements, not losses.

Gates: rooms 147, fx 31, dev-menu 30, smoke 417, playthrough 25, hub green.

## v15.26 — 2026-08-19 — worlds 3 and 4 stop wearing the same trail

Second pass on **placement**, which in a platformer means the collectables
before it means anything else.

Levels 7-12 were greyboxed with one shared helper, `hundredTrail()`: four
quiet 25-bolt blocks at columns 6-79, laid identically in all six rooms
whatever stood there. That was honest scaffolding and the code said so — the
comment called the count "mechanically boring… intentional in a greybox" —
but it meant **the bolts said nothing**. They hung over pits, ignored every
shelf the level had built, and stopped dead at column 79, so the whole ride
beat of six levels was bare.

Each room now lays its own trail, to the rules Level 1 already set:

* a **run out of the gate** — the level saying which way it goes before it
  asks you for anything;
* an **arc over each hazard**, because following the bolts IS the jump's
  timing rather than a sign about it;
* a **column** wherever the answer is up — over a tarp, beside a hoist
  shaft — since a stack of bolts is the only shape that says *the floor
  throws you here*;
* a **run along every deck**, at feet and head height, so a climb is paid
  for instead of merely permitted; and
* bolts **past the thing the machine clears** — behind the bank, across the
  chasm — which cannot be reached until the ride has done its job. That is
  the ride's receipt, and Level 1 has always had it.

Two of them turned into the level's own lesson rather than decoration.
**Night Shift** lays the same seven bolts on the same row on the helpful belt
and then on the one that pushes back: twice the work for the same pay is what
a conveyor teaches, said without a word. **The Lit Scaffold** runs its row
straight under the swinging load, so those bolts are taken on the ball's
clock and not yours.

Still exactly **100 a room with 3 golden ones off the walking line** — the
prover refuses ninety-nine under a HUD that says a hundred, and refuses a
golden bolt you would collect by walking. No geometry moved: same rooms, same
beats, same machines.

**One check outside this lane, and it is a fix to the check.** `test/hub-smoke.cjs`
asserted that switching the hub to Finnish reached a game's own words by
keyword-matching one cabinet's tagline (`paja|Vektorinen|Selain`). Suds Jack v5
rewrote that tagline, so the gate went red for everybody over copy that is
perfectly correct. It now compares the tagline before and after the switch and
against the catalogue's own fi string — a test of the language switch should
not be a test of anybody's prose.

Recorded because it cost an hour: **the container rolled this working tree
back to a commit from two days ago, twice.** Everything already pushed was
safe; what was in the tree was not. The tell is a token that disagrees with
itself — `?v=29` in files that should read 31 — and the recovery is
`git fetch origin main && git reset --hard origin/main`, after copying any
uncommitted file somewhere outside the repo first.

## v15.25 — 2026-08-19 — the slab has thickness, the kid has an edge, landscape loses its board

Three of the four things the captured frames said were wrong, plus the
landscape rework.

**The playfield reads as built.** A run of earth with air under it was one
flat topsoil rectangle with a grass strip on top — the least finished thing on
screen, against backdrops that are layered, hazed and lit. It now steps down
in tone below the lip and takes the lane's darkest tone along its underside,
which is §3.1's "a single darker tone for side faces" and "shading painted in,
key from upper-left" applied to the surface the player actually stands on.

**The kid has an edge.** A back-face shell in INK on every mesh, built from
the model itself so it follows the pose and the bones for free. Not a post
effect — §3.4 forbids a post stack, and a shell obeys that while giving the
same silhouette. He was a small mid-toned figure against busy pale backdrops
and in Nightshift nearly his own value; losing your own character is the worst
failure available in a game for a six-year-old.

**LANDSCAPE DROPS THE BOARD** (owner: "the screen wider", "the controls cover
the screen along", "smaller and lower", and the one that decides it — "if the
buttons have a and b on them, the board doesn't need them").

The drawn panel was solving a problem the buttons already solve. It carried
its own A and B, so held sideways you read the same two letters twice, and it
charged 141 px of a 390 px-tall phone for it — a strip the stage then had to
fit above. So landscape keeps the controls and loses the plate: glyph buttons
along the bottom corners, over the picture rather than under it, and
`fitStage` stops reserving a panel's height because a hidden `#pad` measures
zero. **The stage goes 443 × 249 to 693 × 390 — 56% wider.**

**The face is arrows and A/B** (owner: "just arrows and a b please").
`glyphs.js`'s illustrated figures are right on the 13px hint line where they
describe a VERB; on a 54px control they are the wrong register — a button
face should say which button it is, not mime what it does. Not a key cap and
not a mouse icon (§6.4 forbids both): an arrow and a letter are what is
printed on a controller.

Two things the gates caught rather than the eye. SELECT and START first went
top-right and **overlapped the HUD**, so they moved to the bottom centre under
the hint, between the two thumbs and under neither. And they were drawn 30 px
tall — `test/smoke.cjs` measures the 44 px floor and was right to object.

**Portrait is untouched.** Held upright the picture is a window above a
handheld's face and the DMG plate is the charm of it; there the board earns
its room.

**The nine animations that were loaded and never played.** `eeri_v5.glb`
carries fifteen clips; the game had only ever named six, so the other nine
were parsed, skinned and stepped every frame with nothing selecting them.
Five have a moment this file already knows about, and they are wired to it:
`climbon` / `climboff` on either side of a ladder, `teeter` when he is idle at
the lip of a drop of more than 1.6 (throttled, or he teeters every frame he
stands at an edge), and `idle2` / `lookaround` as idle breaks on a re-rolled
4-8 then 6-12 second timer. `talk` and `confused` stay unwired on purpose:
there is no beat in play that means either, and inventing a trigger to use up
a clip is how a character starts doing things for no reason.

**Two rules in the landscape block were losing a specificity fight.** A media
query adds no weight of its own, and both rules it has to overturn
(`html.plated #stick`, `html.plated #touch #tL`) sit further down the sheet.
Measured on a 750×340 phone the result was a zero-size stick on top of four
`pointer-events: none` arrows — **no way to move at all**. Both are now
written heavier than what they replace, and the gate asserts the landscape
design directly (board away, stick away, arrows live, faces set in CSS)
instead of asserting the plate that is no longer there.

**The playthrough gate was timing the jump on the wrong clock.** It held jump
for 420 ms of *wall* time; the loop clamps `dt` to 33 ms, so under a software
renderer at 13 fps the game clock runs at under half real time and 420 ms is
five frames — 0.17 s of his time. His jump is variable height, so every jump
the bot made was a hop, and it sat under the first two-high step in seven of
twelve levels reporting a wall that is not there. Held in `player.t` now, the
same clock the jump is integrated on. **No level changed; seven went from
"unfinishable" to finished.**

Still open from the diagnosis: one dirt band still serves all four worlds, the
Grove canopy is still flat discs, and tone mapping is still the undecided
§3.4 call.

## v15.24 — 2026-08-19 — every live model was rendering as dark metal

Second-pass visual work, and it starts with a bug rather than a preference.

**Every Meshy export ships `metallic 0.5, roughness 0.5`** — half metal, half
gloss. Surveyed across `assets/3d`, that is 22 of 30 models; the hand-built
ones (`eeri_v5`, `boltbot`, `bucket`, `hopper`, `workerbot`) are correctly
`metallic 0, roughness 1`. This scene has one hemisphere fill, one directional
key and **deliberately no environment map** — and a metal with nothing to
reflect renders DARK.

That is why the collectable bolts read as specks of dirt on the ground rather
than as the thing you are in the level to pick up. `bolt` went `live` in an
earlier release and its placeholder had been bright `PAL.MACHINE` orange, so
flipping the seam to the real asset made the pickup *harder to see* — the one
thing a collectable may not be. Every machine would have arrived the same way
as it got wired.

ART_BRIEF §3.1 already says it: **"no PBR gloss anywhere."** It is now
enforced at the seam in `js/assets.js` (`paintedToy`) rather than hoped for
per asset — metalness 0, roughness 1 on every loaded model, levelling the two
families to one language. baseColor and textures are left alone: this changes
how a surface answers light, not what colour it is.

Measured before/after on captured frames rather than judged by eye: in
Pipeworks the changed pixels brightened **74.2 → 94.3 mean luma (+27%)**,
concentrated in the play band (y 334-464) where the bolts and pieces sit.
Groundworks +8%. Nothing else moved.

**What the frames also showed, and what is NOT fixed here** — recorded so the
next pass starts from a diagnosis instead of a blank page:

1. **The playfield is the least finished thing on screen.** The backdrops are
   crafted, layered and lit; the platforms the kid actually runs on are flat
   slabs with a hard top edge. §3.1 asks for "a single darker tone for side
   faces" and "large radii" and the platform faces have neither.
2. **The kid does not read.** He is small, unlit against busy backdrops, and
   has no rim or outline guaranteeing contrast. For the six-year-old this is
   built for, that is the most important failure in the list.
3. **One dirt band serves all four worlds.** The night dock sits on the same
   sunlit brown earth as the construction site, with the same pipe and brick
   inclusions repeating at a visible interval.
4. **The Grove canopy is flat discs.** The code painter's fan of circles reads
   as green balloons in front of library art that is much better than it.
5. **Tone mapping is still undecided.** §3.4 leaves it explicitly open —
   "NoToneMapping or ACES, whichever the gate-1 shot proves, then locked" —
   and the renderer sets neither, so it is defaulting rather than deciding.
   Worth its own pass, not a change to slip in at the end of another.

## v15.23 — 2026-08-19 — the pieces stop being placeholders

`assets/manifest.json`'s `pieces` block had six entries and **not one file**.
Three of them now have one: the flag that ends a level, the gantry that ends a
world, and the midway checkpoint. All Meshy image-to-3D, cut by `slice.mjs`,
`live` and loading through `getPiece`.

**One mesh per flag, not three.** The flag BUILDS in three steps, so phase1 has
to be the SAME flag as phase2 with less of it finished. Three separate
generations of "a flag at stage N" come back as three DIFFERENT flags — same
prompt, different object — and the build then reads as a cut between two props
instead of one prop being assembled. So: one mesh, sliced once, and the new
`art-src/tools/phasemerge.mjs` composes `pole` + `phase0/1/2` from CUMULATIVE
SUBSETS of its parts. A third of the credits, and honestly the same object
three times. 90 credits for all three pieces; balance 798.

**And the phases now read at a glance**, which is their stated contract
(DESIGN §6.3) and the thing the code-built flag failed: its phase2 added a
0.2-unit ball and a small plank, invisible at a run. The mesh adds a chunky
caged lamp standing above the pole. `flag_big` is a **different shape** rather
than a bigger one — a two-post gantry with the cloth slung between — because a
size difference is not tellable without the small flag beside it to compare.
Its footprint is 4.2 x 3.8 against the small flag's 2.3 x 3.8; that number is
the part Design/Level may want to argue with, and it is in the manifest note.

**Four traps, and three of them shipped silently before anything caught them.**

1. **A leaf node has to BE its mesh.** `slice.mjs` wrapped every cut in a
   Group holding a `<name>_mesh`, which is right for a machine — the game only
   rotates those. But pieces are RECOLOURED: `js/flag.js` does
   `nodes.lamp.material.color.set(...)`, and a Group has no `.material`, so
   the checkpoint threw the first time it was lit. Nothing had ever caught it
   because **no node-rig piece had ever been `live`** — every one was still a
   placeholder, so that contract had never once been exercised. New opt-in
   `flatten` on the spec; all fifteen machine rigs cut byte-identical.
2. **`GLTFExporter` prunes invisible nodes.** `phasemerge` rested the file on
   phase0 and hid the rest, and the exporter dropped phase1 and phase2 from
   the file entirely. The GLB loaded, `pole` and `phase0` both resolved, the
   file was a plausible 1.5 MB — and the flag simply never built. `statemerge`
   escapes this only because it never sets `visible` at all. Fixed with
   `onlyVisible: false`.
3. **Capping is for a seam, not for a footprint.** `capHoles` closes the
   boundary a cut leaves behind, which is right when a wheel comes off an axle
   and leaves a coin-sized hole. The gantry's cloth is welded across its beam
   and both uprights, so the "hole" was the whole area the cloth occupied and
   the fan filled the bay with a solid grey web. New `cap: false`.
4. **`getObjectByName` returns the first match and stops.** The banner is
   cloned into phase1 and phase2, and under one name `housePaint` would repaint
   one and leave the other on its Meshy texture — the flag would change colour
   as it built, on the last step only. Clones are suffixed `_p1`/`_p2` and the
   tool prints the paint keys so the manifest is written from the file.

Also: `phase2`'s children are ordered `[lamp, banner]` because `js/flag.js`
waves `phase2.children[1]`, and the checkpoint's `lamp` is deliberately left
OUT of its paint map — `slice.mjs` gives every node of a model one shared
material, so painting body and cloth leaves the lamp the only user of the
original, and `lamp.material.color.set()` can no longer turn the whole post
green.

**Cross-lane, declared:** two entries added to `ROLE` in `js/assets.js`
(`HAZARD`, `GREEN`) — the two state colours the pieces need and the machines
never did, and `js/flag.js` already builds its placeholders from exactly those
two. The manifest token moved 25 → 26 in both places it is written.

**Compressed with the rest.** v15.22 landed `compress-models.mjs` the same day
this branch was cutting new meshes, so all three went through it rather than
re-inflating the directory a release later: 1.78 / 1.82 / 2.00 MB → 0.91 /
0.91 / 1.00 MB, about half, in line with that release's −46%. The tool's own
guard is the point — it compares node names, clip names and skin count before
and after and refuses a file whose contract moved — and all four contracted
node names survive on each piece. Only the three new files are rewritten here;
re-running the tool over already-compressed models buys about 1% and would
have put 27 files of pure diff noise in this change.

**And an audit, which found the number that should stop the art queue.**
`art-src/tools/audit-assets.mjs` checks every shipped `.glb` against the
promise the manifest makes about it — every `nodes` name, every `clips` name,
every `paint` key, a skin for anything `rig: skinned` — and then asks the
question no other gate asks: **can the game reach it at all?**

**31/31 keep their contract. 18 cannot be reached.** Nothing under `js/` names
them in a `getModel()`/`getPiece()` call, because `js/robots.js` builds every
enemy in code and does not import `assets.js`. Every enemy mesh and every kit
prop is a correct file answering a question nobody asks. `smoke.cjs` cannot see
this and it is not its fault: it checks the assets the game asks for, and an
asset nothing asks for is, to that gate, not there.

It reads the GLB's own JSON chunk, so it runs in **bare node** like `rooms.mjs`
— a check you can afford on every edit is a check that runs.

Two of its own first-run findings were the TOOL being wrong, and both are
worth keeping: it reported six models as 65534 units tall, because v15.22
quantized them and the accessor min/max are in quantization space rather than
world space — so the height check is skipped on a quantized file rather than
guessed at; and it called a `placeholder` entry with no file BROKEN, when that
is precisely what placeholder means. Same shape as the band-brightness ruler in
`kindling/`: the page was right and the ruler was wrong, twice.

**One real defect.** The crane's `paint` map named `hook`. That node was
renamed `ball` — and `sheave` renamed `arm` — when the crane was cut, to match
what `js/crane.js` drives; the paint map never moved with them. `housePaint`
warns and skips an unknown name, so the ball would have kept its Meshy texture
while everything around it took the palette. No gate could see it because the
crane is `placeholder` and nothing loads it. Fixed, with `arm` added alongside.

**The enemy seam is in, and deliberately switched OFF.** `js/robots.js` never
imported `assets.js`, so all four enemy models were unreachable. It does now:
`loadRobotAsset(kind)` maps the game's kinds onto the catalogue
(`skitter→boltbot`, `roller→rollerbot`), `adoptModel` dresses a robot and
returns the same `{group, eye, legs}` `buildRobot` always returned, and a
skinned rig gets an AnimationMixer with the clip chosen by the game's own
state. Behaviour is untouched: the clock, the speeds, the telegraph timings
and `buildRobot` are byte-for-byte what they were, and `adoptModel` returns
null for anything it cannot dress — so the fallback is the code that was
always there. **This is a CROSS-LANE edit** (`js/robots.js` is Design/Level's)
made with the owner's explicit go-ahead, and it is declared in a banner at the
top of that file as well as here.

Two traps it had to solve, both already known from the pieces: `rollerbot`'s
`eye` is a Group wrapping `eye_mesh` (it was cut before `flatten` existed) so
it is resolved to its mesh; and `slice.mjs` gives every node of a model ONE
shared material, so the eye's material is cloned or brightening it would
brighten the whole robot. The three skinned enemies are a single `char1` mesh
with the eye painted into the texture — nothing to brighten at all — so the
tell is added as a lamp parented to the `Head` bone.

**The four entries stay `placeholder` because the playthrough gate fails with
them live**, and the cause is NOT understood yet. Four long levels stall on
foot part-way (3, 6, 7, 8, 9 — all of them machine-job levels). A performance
theory was measured and REFUTED: frame rate is 13.8-16.3 fps with the models
live and 13.8-15.5 with them off, which is software-renderer noise either way;
level build costs about +780 ms, which is real but nowhere near a stall. The
meshes were decimated anyway (20k → 2k triangles, indistinguishable at the
size they are seen — 10x lighter is worth having regardless) and it did not
fix it. So: the seam ships inert. Turning it on is four words in the manifest,
once somebody finds what actually blocks the bot.

**The look pass is TOOLED BUT NOT RUN.** Three defects were measured in the
booted game against the owner's report of 2026-08-19 ("the art cuts out and
has rough edges … foreground images often block too much … the earth is not
textured"). All three are real and all three are in the compositor, not the
pieces:

1. **Rough edges are keying residue.** Every library piece was cut with a hard
   threshold, which keeps the boundary pixels CONTAMINATED — a ring of colour
   halfway to the old backing, which reads as a dark speckled fringe and, at
   the fore lane's magnification, as a torn edge. `build-worlds.mjs` gains
   `cleanEdges`: erode 1px, decontaminate the rim from its solid neighbours
   twice, then one 3x3 blur on the alpha alone. It runs on BOTH keying paths,
   because the library pieces arrive pre-keyed with somebody else's fringe
   already baked in — which is where the in-game fringe came from.
2. **The foreground was a fence.** Fore verticals were `w` 2-3 world units
   against a 1.62-unit character, magnified ~1.25x by depth, arriving every
   ~25 units — one per screen, every screen, at eye level. Narrowed to <= 1.6
   in all four worlds (a fore vertical is a window MULLION: never wider than
   the character it crops) and the gap opened from [4.5, 4.0] to [7.0, 6.0].
   `js/layers.js` already said a foreground occludes IN PASSING; the numbers
   did not.
3. **The earth's maps are applied and too faint to survive.** 312 materials
   carry a detail map, so nothing is missing — but a map MULTIPLIES the
   palette colour, and multiplication scales variance by the surface's own
   brightness. The earth sits near luminance 55 with maps at std/mean 0.09-0.12,
   so about 5 levels of variation reach the screen; measured on the same
   frame, sky and midground read at std 21 and the earth at 8.6. The maps were
   authored on white, judged on white, and died on brown. `punch-maps.mjs` is
   a mean-anchored contrast stretch (mean-anchored because the mean IS the
   surface brightness under multiply) taking the earth sections to 0.21-0.25,
   with a wrap-blend on the edges because the stretch amplifies any seam the
   source already had — `packed` grew a visible one — and a 3x3 tiled contact
   sheet, because "tile it and LOOK" is the only test that shows tiling.

**RESOLUTION IS THE HEADLINE and it is a rebuild, not a redraw.** The close
lanes were stored at 30 px/unit and are shown at ~57 (play plane) to ~69
(fore, magnified by depth). Everything near the camera has been displayed at
roughly twice its painted resolution through a LinearFilter, which is the
soft, smeared read that "not HD" names. `LANES` now carries 48 px/unit for
fore and near and 36 for mid; skyline and far stay near 26, where softness is
the aerial perspective doing its job.

**RUN, and here is what it cost to get right.** All four worlds rebuilt
(`groundworks_v5`, `pipeworks_v3`, `grove_v2`, `nightshift_v2`) and the eight
detail maps regenerated. Two corrections along the way, both worth keeping:

- **`w` in a pool entry is the draw WEIGHT, not the width** (build-worlds.mjs
  line 98 says so). The first pass "narrowed" the fore verticals by editing
  `w`, which changed how OFTEN they appear and not how wide they are, and the
  render came back with a pillar filling the middle third — worse than before.
  A piece's width is `h x its source aspect`, so HEIGHT is the only lever, and
  halving it (17 → 9) halves the width while still crossing the frame: the
  fore ground line is 5.4 and the rect ends at 14, so a 9-unit piece still
  runs off the top, which is the property `js/layers.js` actually asks for.
- **4096 IS THE CEILING and the first numbers ignored it.** The close lanes
  were set to 5376 px, which would have been a texture a modest phone GPU can
  refuse — and a layer that fails to upload is not a soft layer, it is a
  missing one. Capped, that is 36.6 px/unit over a 112-unit rect: a 22% linear
  gain, not the 60% first claimed here.

`js/layers.js` grows `LAYER_PX`, an explicit per-lane size table. It is a
table and not a formula on purpose: the far lanes are NOT square-pixeled —
they are painted at 30 px/unit vertically and squashed horizontally by the
cap — so a derivation clean enough for the close lanes silently disagreed with
the three that already shipped. Three places now have to agree (this table,
`LANES` in build-worlds.mjs, the table in assets/README.md) and `smoke.cjs`
holds all three to each other.

**The close lanes are TILED, which is the way past the 4096 cap.** One texture
over a 112-unit rect carries 36.6 px/unit; the play plane is displayed at
about 57 and the fore lane at about 69, so a single tile could never be sharp
no matter how it was painted. `mid` and `near` now ship as **two textures
each**, laid left to right across the rect by `mountLayer` — 67 and 73
px/unit, past the camera at last.

Tiles are CUT FROM ONE FULL-WIDTH PAINTING, never painted twice: a piece
straddling the boundary would otherwise get a different neighbour on each side
of the seam, and the seam would show. The cost is decoded MEMORY rather than
disk — two tiles are twice the RGBA whatever they compress to — so it is
opt-in per lane. `fore` stays single: it is 89% transparent and only an
occasional occluder, so it would pay full memory for very little picture.

The seam widened in four places and `smoke.cjs` now checks every one of them,
which is why it went from 368 checks to 408: each tile must exist, each must
be the documented size, each must stay inside `assets/`, each must actually be
FETCHED, and the tile COUNT must match the rect. A lane that silently lost its
second tile would render the right half of every level as nothing.

Three bugs of my own on the way in, all found by the gate rather than by
reading: the tile height was set from the old single-tile numbers (470/293
instead of 940/586, so the tiles were half the picture); the README's tile
marker was parsed with a trailing-`×N` regex that matched the HEIGHT of a
single-tile lane, so `fore` demanded 585 files; and three separate places in
`smoke.cjs` read `e.file` directly and threw on a lane that only has `files`.

**Resolved, without spending anything: `ladder_v1`/`scaffold_v1` are not going
to be meshes.** The ladder is already built per tile in `js/level.js` and meets
every clause of its contract, including the hard one — seamless vertical
tiling — **by construction**, because it is generated per tile and has no seam.
An image-to-3D result has no reason for its top cross-section to match its
bottom, so a mesh would arrive with a visible joint every tile, which is the
one defect the contract names. The reasoning is written up in `ASSET_PLAN.md`;
the tool-reality table already says *deformation → code*, and a repeating
modular tile is code for the same reason.

## v15.22 — 2026-08-19 — the models lose half their weight, contracts intact

`assets/3d` had reached **56 MB** across two releases, immediately after the
layer art went the other way (31 MB → 5.9 MB). Measured rather than guessed:
only ~23% of it was texture. The rest was vertex data stored as raw float32,
and the machines had **no indices at all**.

`art-src/tools/compress-models.mjs` rewrites every shipped `.glb` with two
passes and no new runtime dependency: **`quantize`** (KHR_mesh_quantization —
float32 positions/normals/UVs become int16/int8; a data layout, not a codec)
and **`webp`** (EXT_texture_webp). Both are decoded natively by the vendored
GLTFLoader. **55.7 MB → 30.2 MB, −46%**, across 28 files.

**Draco and meshopt would beat both and are deliberately not used.** Each
needs a decoder module that is not in `vendor/`, and adding a runtime
dependency to save disk is the wrong trade for a game that must boot on a
phone with no build step.

**The trap, and the reason this is a tool rather than a one-liner.** The
obvious command is `gltf-transform optimize`. Run on the crane it took the
model from **19 nodes to 1** — because `optimize` bundles `join` and
`flatten`, which merge nodes. Those node names ARE the seam: `assets.js` looks
up `house`, `boom`, `stick`, `bucket` by name and `js/excavator.js` drives
them, so a merge silently turns a rigged machine into one welded lump the game
cannot articulate. It would have passed a visual check and failed in a level.
So the tool runs the two safe passes only, and **compares node names, clip
names and skin count before and after, refusing to write a file whose
contract moved**. A tool that needs a gate to catch it is a tool aimed at your
foot.

Also removed: `eeri_v3.glb`, two character generations back and referenced by
nothing. `eeri_v4.glb` stays — it is the skeleton v5's clips were retargeted
onto — and so does `excavator_v2.glb`, which is parked on purpose and says so
in the manifest.

Verified after: `eeri_v5` keeps its skin and all fifteen clips, `excavator_v1`
its twenty nodes. Gates green.

## v15.21 — 2026-08-19 — three enemies, a site kit, and the theme has a home

Three PRs merged in order onto v15.20. All three are art and reference; no
gameplay module changed, and no world's dressing moved.

**#286 — three enemies and a nine-piece site kit, all rigged.** `vacbot`
(the Roomba: first stomp fires its spring and pops you up, second breaks it),
`workerbot` (a skinned humanoid, too tall to stomp from level ground) and
`rollerbot`, plus compressor, generator, cable drum, gas cart, jackhammer and
wheelbarrow. `ENEMY_BRIEFS.md` states what each new enemy is FOR — the frame
is that hopper reads timing, roller reads spacing, bucket reads proximity and
skitter reads provocation, so **a new enemy that does not add a new read is a
reskin**. It also records two owner calls from 2026-08-18: the material
language for tools and machines is **moulded plastic toy** (the cardboard and
felt stay the backdrop's), and **faces on machines are dropped unless they
work** — the jackhammer is the single trial, because Meshy grew it two rivet
eyes uninvited and they suit it.

Every one of the nine lands as **`placeholder`**, which is correct and not an
oversight: `js/robots.js` builds every enemy in code and never calls
`getModel`, so a `live` entry here would be an asset nothing fetches and the
smoke gate would rightly fail it. They are ready for the gameplay lane to ask.

**#239 — the theme seed, finally playable.** The owner's approved *Eerin peli*
take, stored under `art-src/audio/` where it does not deploy and does not
touch the shipping game. It arrived as five Base64 fragments plus a rebuild
script because the connector that opened that PR could not upload a binary;
that constraint does not apply here, so it is decoded back to the real
33,988-byte m4a and the fragments are gone. The decoded SHA-256 matches the
one the fragments declared, byte for byte. **The procedural-audio rule is
untouched** — `assets/audio/` still holds nothing but the README explaining
why it is empty, and `dev-menu.mjs` still fails a binary dropped in there.
Eeri still has no music in game; this is the seed, not the wiring.

**#288 — hyperdagger's three-mode platform.** `PLATFORM.md` plus `js/truck.js`
and `js/mesh-enemies.js`. Recorded honestly: **nothing imports either module
yet** — no caller for `TruckTrack`, `preloadMeshEnemies` or `cloneMeshEnemy`
anywhere in the tree. It is groundwork for a TRUCK mode, not a TRUCK mode, and
it changes no existing file.

**Also closed, because they had already landed by other routes:** #243 (the
Feel Lab — both its branches are zero commits ahead of main), #277, #278,
#279, #280.

**Merge note for whoever hits this next.** #286 conflicted on
`assets/manifest.json` and `art-src/tools/slice.mjs`, two hunks each, purely
because it was branched before #283 and #285 landed. Every hunk was additive —
main's eight machines against #286's bots and kit — but the cuts run **through
a `paint` block and through a `nodes[]` array**, so a naive keep-both produces
invalid JSON and unparseable JS. Each needs its own closing glue (`},` and
`],` `},`) before the second side starts. Resolved that way, then verified by
parsing both files rather than by eye.

**assets/3d is now 56 MB** and only three models are ever fetched. That is the
second release running where this has grown; the mesh-compression pass noted
in v15.20 is now overdue.

## v15.20 — 2026-08-18 — the machines are modelled, and Eeri has idle breaks

Two art-lane PRs, merged in order onto v15.19.

**#283 — the eight machines, modelled and rigged.** Eight new `.glb` under
`assets/3d` (forklift, roller, pipelayer, dumptruck, cherrypicker, hopper,
floodlight, and an `excavator_v2`), each joint-verified, with the rig contract
written down in `art-src/machines/RIGS.md` and the drive ranges in
`art-src/machines/drive.js`. Thirteen new art-src tools came with them, and
the World 1/2 libraries gained an `INDEX.md` apiece plus the **elevation
test** — *a circle is either a true circle or a straight line, never an
ellipse* — which is the plane rule restated as a consequence rather than as a
camera angle, because naming the angle had already failed six times out of
twelve.

**Two of those machines ship UNUSED, on purpose, and that is the right call.**
`excavator_v2` stays behind `excavator_v1` and the crane stays
`placeholder`: `excavator_v1` was deliberately built to match the code
placeholder pivot for pivot, so game code cannot tell which it got, while v2
is a different machine whose proportions break the girder pickup — and the
crane's reach differs enough that the ball stops short of the brick wall.
Both need `js/excavator.js` / `js/crane.js` constants retuned to the asset,
which is gameplay-lane work. Handing them over beats swapping them in and
breaking the wrecking sequence.

**#285 — seven new clips on the same character** (`eeri_v5`): `idle2` and
`lookaround` (idle breaks), `climbon` / `climboff` (mounting a ladder and
topping out), `teeter` (edge hesitation), and `talk` / `confused` (the
to-camera beats). Clip count 8 -> 15. Meshy's task history had expired, so
the source mesh was re-rigged and the clips retargeted onto v4's skeleton by
`art-src/tools/addclips.mjs`, which refuses any clip with an unresolved bone
target; every clip is measured moving, because a flat clip renders exactly
like a rig at rest and one bought idle was exactly that.

**One merge conflict, and it is worth recording what it was:** both PRs
rewrote the same `_note` paragraph on the `eeri` model. #285's won, because
#285 is the PR that bumps the file to `eeri_v5.glb` and a note has to describe
what is on disk. Nothing else collided — neither PR touched the v15.19 layer
block.

## v15.19 — 2026-08-18 — four worlds, four sets of art, and 25 MB less of it

Owner's report: *"all World 1 is unoptimized and has old graphics/assets,
World 2 is filled with World 1 assets, World 3 and World 4 are not available
on the pause menu."* All three are one fact — there was **one pool of art and
two worlds pointing at it** — so this is one change.

**`art-src/tools/build-worlds.mjs`** composes every world's five parallax
lanes out of `art-src/world-N-library/`, the libraries the owner approved and
handed over. Its first rule is the fix: **a world may only draw from its own
library.** World 2's old set was built largely from World 1's pieces, which is
why it looked like World 1 at a different tint; it is now pipe walls, culverts,
valve junctions and wet concrete, and it shares nothing with the site.

**Worlds 3 and 4 are in the pause menu because they are dressed, not because
a flag was flipped.** `main.js` `dressed()` walks the manifest and stops the
game at the last room whose world has live art — that gate was doing its job,
and the honest way past it was to paint the art. Grove is conifer stands, root
tunnels and timber shoring; Nightshift is a lit dock under a painted night sky,
the one sky that cannot be shared. `SHOWN` goes 6 → 12.

**WEBP, and the size gate had to learn to read it.** The layer set was 31 MB of
PNG — `groundworks_sky_v1.png` alone was 4.2 MB — for pictures that are soft
craft render, which PNG stores a pixel at a time. Same images, same documented
sizes, **5.9 MB**. `test/smoke.cjs`'s `pngSize()` is now `imageSize()` and
parses PNG IHDR plus all three WEBP encodings; guessing one and calling the
rest unreadable is how a size gate quietly stops gating. The pad plates and the
logo came along for the same reason (6.9 MB → 400 kB).

`test/playthrough.cjs` finishes all twelve levels (25 checks, 0 failed) and
no level throws you out of the cab repeatedly — so Worlds 3 and 4 are not
just dressed, they are finishable.

Traps found building it, all the same shape — **a generated layer defaults to
looking generated**:

- **The ground line is not a free choice.** The first build put `near`'s at 1.5
  and sank every prop two units into the floor. The right numbers are measured
  off the code painter in `js/layers.js` (`base` per lane: 3.0 / 3.4 / 3.8 /
  3.9, `FORE_GROUND` 3.4) — a live layer and its placeholder have to put the
  horizon in the same place, or flipping `status` to `live` moves it.
- **`ground` and `band` are different things.** They were one field, so the
  fore lane painted its 5.4 units of standing height as earth and walled the
  playfield off behind a brown slab.
- **A parallax lane is mostly empty.** At a gap of 0.62× piece width every lane
  came out solid: the foreground was a picket fence the kid ran a whole level
  behind, and the far lane had no sky left in it. The pieces are punctuation.
- **Haze is not one number for every world.** The city tints run a forest milky
  — green mixed toward pale blue is the colour of nothing — so a world may damp
  the table (grove 0.68, nightshift 0.55).
- **`_note` cannot sit beside the layer entries.** `dressed()` calls
  `Object.values(set).every(e => e.status === 'live')`, so a bare string there
  reads as an undressed world and hides that world's levels. Caught before it
  shipped; the note is now inside an entry and says so.
- **A rule that starts failing is not always a rule to soften.** "every live
  asset is actually fetched" — the check that caught 2.7 MB of layer art
  silently unplugged, twice — went red on eleven files the moment Worlds 2-4
  were dressed, because the run never leaves World 1. The fix is a **world
  tour**: one room per world before the check, which makes the rule true again
  and is also the only coverage the grove and nightshift swaps have.
- **The version is 15.19, not 16.** `origin/eeri-address-backup` already spent
  "v16" on the old integer scheme. Never reuse a number, even across a scheme
  change.

## v15.18 — 2026-08-17 — the Grove paints itself, the libraries have art, the gate is honest

**World 3 stops borrowing World 1's backdrop.** `PLACEHOLDER_DRAW` was one
world-agnostic set, so `buildLayers(scene, 'grove')` dressed a forest in
half-built concrete frames and scaffold bays — the actual reason World 3
read as greybox. The Grove has its own five painters now: treeline ridge,
canopy with sky between the crowns, a cut bank with root ends and timber
shoring, moss lip and stumps, one cropped trunk in the occluder lane.
Forest AND dig, because this world is a worksite in a wood.

**And the green blobs were the dressing's, not the backdrop's.**
`world34-dressing.js` drew its treeline as seven discs of r 5.3–6.3 at
z −1.55 — barely behind the plane the game is played on, so each one
spanned from below Eeri's feet to above the frame in one flat colour.
Fourteen smaller, higher discs instead. Depth magnifies; the fore lane
needed the same correction in the same sitting.

**The World 3 and 4 libraries have art in them** — eleven approved pieces
imported to the paths the pack's own notes name. Until now both were
catalogs with NOTHING behind them: World 3 named 17 files and shipped 0,
World 4 named 9 and shipped 0, under headings reading "approved". Source
library only; production `assets/**` and the manifest are untouched, and
`art-src/` does not deploy.

**The smoke gate went from 25 failures to 0, and none of it was the game.**
The mount cluster was a real race — the kid was re-placed a tenth of a tile
above the floor and the action press was consumed on an airborne frame,
identically on all forty retries. The gap check waited on a clock where it
needed a state, then failed him for standing on the lip rather than
crossing the hole. Both now measure what they claim to.

Not deployed with this: `art-src/` (source, 21 MB) and worlds 3–4, which
stay hidden until their layers are painted.

Gates: rooms 147 / world34 pass / fx 31 / dev-menu 30 / **smoke 282** /
playthrough 25 / hub.

## v15.17 — 2026-08-17 — Worlds 3 and 4 get their second art pass (still hidden)

PR #276: `world34-dressing.js` rebuilt gameplay-aware — the Grove and the
Night Shift dressed around what the rooms actually ask you to do, rather
than decorated evenly.

**Nothing player-visible changes and it is NOT deployed.** Both worlds are
still undressed at the LAYER level — no `grove` or `nightshift` layer set
exists in the manifest — so v15.15's rule keeps them out of the menu and
out of the run. Looked at through a deep link, `3-1 THE CUT BANK` is
honest greybox: flat tree discs and a root feature against a bare sky,
because a world's backdrop is five painted planes and those are the art
lane's next item, not this.

That is the right order. What this PR moves is the playfield furniture,
which is the half that can be built before the paintings exist.

Gates: rooms 147 / world34 pass / **smoke 282** (×1.5) / fx 31 / dev-menu 30.

## v15.16 — 2026-08-16 — the smoke gate stops lying about the machine (test only)

**Not a release — nothing shipped changes.** `hub/versions.json` is left at
15.15 deliberately, because there is nothing to deploy.

The gate returned **6, 5, 3 and 30 failures** on four separate occasions
against trees that passed on the next run. Every one was a timeout and none
was a bug. Its waits were written on a machine with a GPU; the same page
under SwiftShader renders a twelve-level game at a handful of frames a
second, so a 1.5 s wait for a jump to peak can expire before the jump has
had five frames to happen in.

**Re-running until green is the worst available answer** — it is exactly
the habit that hides a real failure, and I had started doing it.

So the gate measures the machine instead of assuming one. The first boot is
a direct read of how fast this box is; every wait after it scales by
`boot / 1200 ms`, clamped to 1.5…8, and `EERI_SLOW=n` forces it. Observed
here: 2129 ms → ×1.77 cold, 457 ms → ×1 warm. **The floor of 1.5 is the
part that matters**: the boot is one measurement at one moment, and these
failures came from load arriving *mid-run* — a warm cache can boot in
450 ms and then meet a busy machine forty checks later.

It costs nothing when the machine is fast. Every wait here ends the moment
its state arrives; none of them is a sleep waiting out a clock, so a longer
ceiling is only ever an unused ceiling.

Four consecutive runs since: ×1.77, ×1, ×1, ×1.5 — **282 / 0** each.

## v15.15 — 2026-08-16 — Worlds 3 and 4 exist, and the game ends where the art does

**Twelve levels are built** (PR #265): the Grove and the Night Shift as
greyboxes, with their own structural gate (`test/world34.mjs`) and their own
dressing module ready for art. The playthrough bot now finishes **all
twelve** — 25 checks, zero ride losses — so these are rooms, not sketches.

**But six of them are undressed, and greybox is not something to hand a
six-year-old through a menu.** So the game ends at the last room whose
world has **live art**, and the rule is derived rather than declared:

```
dressed(world) = every layer in the manifest is `status: "live"`
SHOWN          = rooms up to the first undressed world
```

That is `LAST_LEVEL` (what the flag advances into, and where the world's
curtain becomes an ending) and the menu's level list. **The moment the art
lane flips a world's layers to `live`, its rooms appear on their own** —
no flag to remember, no second list to keep in step. The seam already knew
which worlds are finished; it just had not been asked.

Deep links still reach them (`/eeri/#eeri-3-1`), which is the lane's way in
to keep working.

The four worlds are named in code for the first time — `groundworks`,
`pipeworks`, `grove`, `nightshift` — because `WORLDS` had two placeholder
'groundworks' entries standing in for worlds that did not exist yet, and
they would have quietly dressed World 3 as World 1.

**Also merged:** #268's art-library structure (art-src only).

**A gate that had to move with the edge:** *"an address for a level that is
not built yet"* pointed at `2-1`, then `3-1`, and both got built. It is
`5-1` now — there are four worlds, so that one cannot exist. A test written
against the edge of what exists has to move as the edge does.

Gates: rooms 147 / world34 pass / fx 31 / dev-menu 30 / **smoke 282** /
**playthrough 25** / hub.

## v15.14 — 2026-08-16 — World 2 stops being grey boxes, and a deep link brings its own sky

**The Pipeworks is dressed** (PR #258). `js/world2-dressing.js` builds the
world's identity on the playfield rather than only behind it — pipe stacks,
a service wall with a valve, a standpipe, pump hardware, and buried pipe
cut-faces using the live `f_pipe` asset. It sits mostly at z −0.72, behind
the plane the game is played on, which is the rule that keeps a dressed
level readable: **the traversal stays unobscured in front**.

Seen at close range it is the difference between "World 1 with different
bolts" and a place: gas holders, a water tower, pipe racks and a chimney
against the pipeworks backdrop.

**AND A DEEP LINK NOW BRINGS THE RIGHT SKY.** `/eeri/#eeri-2-1` came up in
World 1's site — my own bug from v15.11. The diorama is built before the
address is read, which is correct (it is the persistent layer), and only
`goSite()` swapped it, so *walking* into World 2 was dressed and *linking*
into it was not. The boot now compares the room's world against the one
just built and swaps before the first frame. Anything that can start you
somewhere other than room 1 — a link, the menu's level jump across a
reload — needed this.

**Also merged:** PR #268, the World 2–4 reusable art-library structure and
the World 3/4 handoff — `art-src` only, no production seam.

Gates: rooms 147 / fx 31 / dev-menu 30 / **smoke 282** / playthrough 13 / hub.
Tokens unified at `?v=25`.

## v15.13 — 2026-08-15 — 16:9 is a landscape rule, and a real pad clears the screen

Two corrections from the owner, and the second is the more interesting one.

**16:9 WAS AIMED AT HORIZONTAL MOBILE, NOT VERTICAL.** v15.12 pinned the
aspect in both orientations, which letterboxes a portrait phone *twice
over* — bars beside a picture that already has the pad below it — and
wastes the only dimension that shape has. Held sideways the picture is the
whole screen and its shape is the composition, so it stays pinned. Held
upright it is a **window above the pad** and simply fills what is there.
On a 390 × 844 phone that is 390 × 650 instead of 390 × 219.

**A REAL CONTROLLER MEANS NOTHING DRAWN.** The plate is a picture of a
controller; holding a real one and looking at a drawn one is the same joke
twice, and in landscape that joke was a third of the screen. The first pad
input strips both plate and hit areas and the stage takes the space back —
693 × 390 instead of 443 × 249, the full window at 16:9.

Two things that make it honest rather than clever:

- **The first TOUCH puts it back.** A pad going quiet is not a pad going
  away; only a thumb says that. Without it, unplugging a controller
  mid-run leaves a phone with no way to move.
- **The menu takes the pad too** — direction moves, Ⓐ picks. A controller
  that can open a menu and not move inside it is worse than one that
  cannot open it. It drives real DOM focus rather than a parallel
  "selected index", so the pad, the keyboard and a screen reader all agree
  on what is highlighted and the focus ring IS the highlight.

Measured, all three states, both orientations: landscape 443 × 249 above
the pad → 693 × 390 padded → back on a thumb; portrait 390 × 650 → 390 ×
844 → back.

**The sandbox flake, again and worth a number:** `smoke.cjs` returned
252/30 and then 282/0 on the identical tree, minutes apart. Every failure
was a timeout. It has now done this four times today at 6, 5, 3 and 30
failures. The gate is honest but its waits assume a machine that is not
also rendering six levels in software; the fix is to judge state with
longer ceilings, not to re-run until green.

Gates: rooms 147 / fx 31 / dev-menu 30 / **smoke 282** / playthrough 13 / hub.

## v15.12 — 2026-08-15 — a menu on START and SELECT, and the game is 16:9

Three owner notes, and the third turned out to govern the other two.

**THE GAME IS 16:9, ALWAYS.** A level is *composed* — the reach budget,
where the camera pulls back, where a hazard sits relative to the lip you
read it from — and all of it is composed at one shape. Letting the viewport
decide the aspect means a tall phone shows less of the room ahead than a
laptop does, so the same jump is a different question on different
hardware. The stage is now a fixed 16:9 box; the rest of the window is the
room it hangs in, painted near-black because a light surround reads as the
game being the wrong size while a dark one reads as a screen.

**AND THE PAD IS NOT ON THE PICTURE.** A 16:9 stage with a control strip
laid over its lower third is not a 16:9 stage. When a plate is up it owns
the bottom of the screen outright and the stage fits into what is left —
the arcade arrangement, screen above panel. The trade is real and worth
stating: on an 844 × 390 phone the picture is 443 × 249 with black either
side, because 16:9 *plus* a visible panel cannot be wider on that screen.
The alternative is the panel back over the picture.

**THE LANDSCAPE PANEL WAS EATING 72% OF THE SCREEN** (owner: *"covering
too much"*). Same treatment portrait got, same measurement:
`padplate_landscape_v1.png` is 1400 × 466 with the drawn panel at y
204…463 — more than half the image is transparent air. Cropped to the
panel itself it is **141 px instead of 281**, every control exactly where
it was, and centred (the panel's own centre is x 758 against the image's
700).

**THE MENU** (`js/menu.js`), on SELECT *and* START — both plates have drawn
those pills since the art landed and neither did anything, which is worse
than not drawing them: a control that is pictured and dead teaches a child
that pictures are not controls. Both open the same menu, deliberately —
nobody should have to remember which of two identical pills is the one
that helps. Carry on · start this bit again · go to a level (all six) ·
language · back to the arcade. Esc and the pad's Select/Start reach it too.
**The pause is real**: it gates the update half of the loop and the clock,
not just input, so nothing on a timer creeps while you read.

**Three traps, all specificity or floors:**

- The unplated fallback (`#touch #tSel`, two ids) **outranked** the plated
  rule (`html.plated #tSel`, one id + one class), so on a real plate the
  pills jumped back to the top of the screen. Plated rules now carry two
  ids of their own.
- `min-width: 44px` is why they overlapped Ⓐ. A pill declared at 4.6% of
  the plate is 37 px on a 750 px phone and the floor lifts it to 44 — so
  the drawn pill's share does not decide the box, the floor does. Centres
  are now spaced from the floor, not from the art.
- `menu` joined the input map, so the glyph contract had to grow with it —
  and the bound list needed deduping, because TWO buttons bind one control.

Gates: rooms 147 / fx 31 / dev-menu 30 / **smoke 282** / playthrough 13 / hub.

## v15.11 — 2026-08-15 — World 2 looks like World 2, and the world's curtain works again

Wiring `#250`'s levels revealed two things that were only ever true while
three levels existed.

**THE GATE WAS UNREACHABLE.** A flag ends a level, a gate ends a WORLD
(DESIGN §4.2) — and while World 1 was the whole game those were the same
moment, so nothing had to tell them apart. The instant level 4 existed,
raising World 1's big flag auto-advanced straight into it and the gate,
the world's entire curtain, could never fire. **A gated level does not
auto-advance**: the flag goes up and you walk out yourself. And the
curtain is now a *beat* rather than an ending when there is a world behind
it — CLOCKING OUT holds, then World 2 loads.

**THE BACKDROP FOLLOWED NOTHING.** `main.js` built the diorama once at
boot with `buildLayers(scene, 'groundworks')`, so levels 4–6 played World
2 in front of World 1's site. The layer set had no teardown, because
nothing had ever needed one — six full-width planes left in the scene are
not hidden by six more, the near ones are opaque. `layers.js` gains
`dispose()` (every plane, its geometry, material and texture, plus the
background events' own meshes), and `goSite` swaps sets when a room
crosses into another world. Which world a level is in is arithmetic —
three to a world — until a world wants a name that is not its backdrop's.

**And so `pipeworks_*` goes LIVE.** Painted and parked since art lineage
v16, blocked ever since by the gate that fails a live asset nothing
fetches. Now something fetches it. Manifest `v: 25`.

**A test trap worth keeping.** The gate walked out of World 1, then
navigated back to `/eeri/?skip#eeri-1-3` to finish its World 1 checks — and
three of them failed. That URL differs from the open one only in its HASH,
so it is a same-document navigation: the page never reloaded, the run
carried on in World 2, and the checks read the wrong room while the
address bar said 1-3. Every other address check in that file carries an
`?a=N` for exactly this reason. It is not decoration.

Gates: rooms 147 / fx 31 / dev-menu 30 / **smoke 282** / playthrough 13 / hub.

## v15.10 — 2026-08-15 — World 2 has levels (PR 4 of 4)

**Levels 4, 5 and 6 — the Wet Trench, the Pipe Run, the Pumphouse.** The
world's three beats in the order `WORLD2.md` set them: water alone, then
pipes over water, then all of it plus the hoist as the world's exam. The
gizmos were each proved in the `LAB` before a level spent one, which is
what the LAB is for.

**The playthrough gate is the reason to believe it:** a bot finishes all
**six** levels now, and loses the ride zero times in each. `rooms.mjs` is
at 147 — the prover grew with the rooms rather than after them.

**What this unblocks, and it is the point:** World 2's backdrop has been
painted and parked since art lineage v16, and the `pipeworks_*` manifest
entries could not be flipped to `live` because the smoke gate fails any
live asset nothing fetches — and nothing asked for world 2. Now something
does.

**Still to wire:** `main.js` builds the diorama ONCE at boot with
`buildLayers(scene, 'groundworks')`, so levels 4–6 currently play in front
of World 1's site. The layer set has no teardown, so swapping worlds is a
real change to `layers.js` (Art lane) rather than a one-line argument.
Named here so it is not mistaken for the levels being wrong.

Gates: rooms 147 / fx 31 / dev-menu 30 / smoke 274 / **playthrough 13** / hub.

## v15.9 — 2026-08-15 — the hoist: the first solid thing that is not a tile (World 2, PR 3 of 4)

> Submitted as v15.4 — a number already spent, and four releases behind
> by the time it merged. Renumbered at the merge per LEVELCRAFT.md §7.

**The expensive item of world 2, and it is expensive for one reason.** Every
other floor in this game is a character in the grid: collision is a lookup,
meshes are built once per room, and nothing in `Player` has any concept of
standing ON something — entity contact has only ever been a one-frame
impulse (`bounce`, `struck`) after which you are airborne. A floor that
MOVES can be none of those, which is why the gizmo kit stopped at the tile
line on purpose (v14) and why this is its own release.

**`js/hoist.js`** is an entity shaped exactly like `robots.js`'s — it takes
the room's group, adds its meshes to it, answers `update(dt, reduced)`.
Everything it makes lives inside that group or it leaks on a level change.
It moves **vertically only**: a lift is what level 6 asks for, and one that
also slid sideways would have its carry arguing with the player's own run.

**The motion is a TRIANGLE, not a sine**, and that is a design decision
rather than a shortcut. You have to *wait* for a hoist, and waiting is only
fair if the arrival is predictable — a sine spends most of its time near the
ends and reads as a lift that hesitates.

**The carry is one pass in `Player.update`, after the tile pass** — so a
tile always wins, and standing on real ground is never overridden by a hoist
passing underneath. It distinguishes two cases that look the same and are
not:

- **LANDING** — falling, and the feet *crossed* the deck between frames.
  Tested as a crossing rather than an overlap, or a fast fall tunnels
  straight through a platform one tile thick.
- **RIDING** — already carried, still over it, not jumping. **This is the
  one that matters**: a rising hoist comes UP into the feet, so the crossing
  test can never fire, and without this branch the player sinks through a
  lift travelling towards them. `player.carrier` is kept across frames
  because that is the only way to tell the two apart.

**Four rules, four rooms broken on purpose** — the ladder's contract
generalised, plus one a ladder never needed: a hoist that tops out with
nowhere to step off · one whose shaft runs through solid tile · one that
carries you into a **ceiling** (a ladder is static, so if it clears once it
clears forever; a hoist is only wrong for the half of the cycle you are not
watching) · one that goes nowhere.

**And the reach model learns it**, paid on the way in rather than after the
lab complains: anything within a jump of any height the hoist passes through
is reachable. That debt is now paid three times — tarp, pipe, hoist.

`prefers-reduced-motion` **parks it at the bottom** rather than freezing it
mid-shaft, where it would be a floor nobody could reach and a level nobody
could finish. The game stays completable with the animation off.

Gates, each run singly: rooms **103/0**, smoke **265/0**, playthrough
**7/0**. The browser gate proves physics rather than a state flag: he lands
on it, it carries him up, a jump lets go, and he is never left inside a tile.

**Still open, and deliberately PR 4's:** the playthrough bot does not know
how to wait for a lift — it holds `right` every tick on foot, which walks it
off a platform. No level has a hoist yet, so nothing stalls today; it must
land with levels 4–6, which is where it can actually be exercised.

**SHARED files touched:** `js/main.js` (build, update, debug hooks).

## v15.8 — 2026-08-15 — the bucket wakes, and the dev pack gets its five rows

**A fourth enemy: the bucket.** `WORLD2.md` §3 level 5 asks for it and the
behaviour was simply absent from `robots.js`, so the beat could not be
written. It is a **proximity** test, which is the one axis the other three
do not cover — hopper is timing, roller is spacing, skitter is provocation.
An abandoned digger bucket asleep on the floor: it wakes when you **land**
beside it, lifts its head for 0.55 s without moving, chases for 2.2 s, then
settles.

Three rules make it fair rather than merely present:

- **It wakes on a LANDING, not on a radius.** Walking past a sleeping one
  is safe. A radius would teach "never go near the pipe mouth", and then
  the pipe stops being the way across, which is the whole of that beat.
  The landing edge is computed in the robot from the kid's `grounded`
  flag — main.js passes it, nothing new is invented.
- **Asleep and waking, it cannot hurt you.** Otherwise the head-lift is
  decoration: a tell you cannot act on teaches nothing.
- **It gives up.** DESIGN §4.1 has no lives and no death; a pursuer that
  never stops is a different game. The answer is always go round, or wait.

Proved in the `LAB` beside the pipe's far mouth — come out of the pipe and
it wakes, which is level 5's beat in one object. The GLB (`bucket_v1.glb`,
skinned, four clips) stays `placeholder`: `robots.js` is still code-built
for every kind, and the gate rightly fails a live asset nothing fetches.

**The dev pack gets the five rows from PR #235** (`dev/README.md` named
them): warps by fraction of the room, take-the-machine, dig-one,
invincible, hitboxes, copy-state. Four new debug hooks carry them —
`tame` `dig` `invincible` `boxes` — and `dev-menu.mjs` now names all four,
because a hook the pack reads and nothing else does is exactly the silent
break that gate exists for. Two notes on how they are built: invincibility
is an **unexpiring mercy timer** rather than a second path through damage
(a debugging aid must not change the thing being debugged), and the hitbox
preview draws `debug.boxes()` — the numbers the collisions actually use,
not a guess at them.

**Not done, and correctly blocked:** flipping World 2's `pipeworks_*`
layers to `live`. All five PNGs are on disk and the sixth reuses the
groundworks sky, but the smoke gate fails any live asset nothing fetches
and no room asks for world 2 yet. That flip belongs to the level lane's
PR 3, in the same change as the first World 2 room.

**A flake, recorded rather than buried:** *"holding the bucket in the stack
slings the girder on"* failed on one run of `smoke.cjs` and passed on the
next two against the same tree. It is wall-clock sensitive under sandbox
load. It should be re-cut to judge game state, like the rest of that gate.

Gates: 99 / 31 / 30 / **269** / 7 / hub.

## v15.7 — 2026-08-15 — he turns around, and the d-pad becomes a stick

**He was moon-walking, and it is the +z/+x confusion for the third time.**
Running left played the run clip on a body still pointed screen-right.
`pose()` mirrors the facing with `π − θ`, which is correct for the
**code-built** kid — he is modelled facing +x, and `π − θ` sends +x to −x.
It is wrong for the **skinned** rig, which is modelled facing +z: a
rotation of θ about Y sends +z to `(sin θ, 0, cos θ)`, and
`sin(π − θ) = sin θ`, so his x component never changes sign. For a
+z-forward rig the mirror is simply **−θ**, which lands him screen-left
with the same tip toward the camera. One line, and the third symptom of
the same root: the first two were facing the camera while running and
sitting backwards in the cab.

**The d-pad is a stick** (owner: *"the d-pad part should be a larger
on-screen stick like in other games in this repo"*). Every other cabinet
here that takes a thumb reads a stick, and the reason is mechanical:
four rectangles have three seams, and a thumb that drifts onto a seam
stops steering with nothing to feel. `input.bindStick()` is one zone with
a generous deadzone, direction measured from the control's **centre**
rather than from where the thumb landed — a self-centring stick would walk
away from the drawn d-pad within a few presses — plus a knob that follows
the thumb, since the painted cross cannot move. The four zones stay in the
DOM for the keyboard, the accessible names and the unplated fallback, and
go **pointer-inert**; the gate checks that second half, because a live
button sitting on top of the stick would swallow every press and the stick
would look mounted while doing nothing.

**The plate is measured now, not judged.** `padplate_v1.png` is 1024 × 590
and the drawn plate inside it runs x 122…1022, y 75…588 with its yellow
strip ending at y 121. Two owner complaints fall straight out of those
numbers: the plate's centre is x **572** against the image's 512, so drawn
full-width it sits ~6% RIGHT of centre; and the old 496-row crop left 27
rows of yellow behind. So the image box is deliberately **wider than the
screen and pushed left** (`left: -11%; right: 1.8%`, crop `1024/466`) —
the plate lands at 96% of the viewport, centred, with no yellow. A and B
grow to 14% × 24%, being the two controls a six-year-old hits under
pressure.

Gates: 99 / 31 / 30 / **269** / 7 / hub.

## v15.6 — 2026-08-15 — water, the pipe, and the pump verb (World 2, PR 2 of 4)

> Submitted by the level lane as v15.3. That number was already spent by
> the levels PR before it, and 15.4/15.5 shipped while this was open — so
> it lands as **15.6**. The lesson is in `LEVELCRAFT.md`: a number is
> claimed at MERGE, not at authoring.
> **VERSIONS ARE DECIMAL from v15 (2026-08-14).** `vMAJOR.MINOR` — the
> integer is a milestone, the decimal an increment on it. Three lineages of
> this project each burned whole integers on ordinary work and then collided
> on them (there were two v11s and two v13s); a minor part gives increments
> somewhere to go that is not the next milestone's number.
>
> **The `?v=` module tokens stay integers.** They are cache-busters, not
> releases — they track every module-graph change, and the release number
> tracks what shipped. `scripts/versions.mjs` reads both and emits a label
> (`"15.1"`) plus a sort key (`15001`), because one number cannot do both
> jobs: a label cannot be compared (`'15.10' < '15.9'` lexically) and a
> float cannot be displayed (`15.0` prints as `15`).


## v15.5 — 2026-08-15 — the plate is cropped, the bank says dig, the mark is a sticker

Four owner notes from one sitting, and the last of them found a bug that
had been swallowing two other things silently.

**The portrait plate is cropped and centred** (*"can be cropped a bit from
the top and should be very slightly smaller and centered on the screen
along the bottom"*). `#pad` is inset 4% either side and its box is given
the plate's ratio **minus the crop** (1024 × 496 against the image's 590),
with the image anchored to the box's bottom and the overflow clipped. The
crop takes the transparent air and a sliver of the yellow strip off the
top; the controls do not move, because `#touch` keeps the image's FULL
ratio and every hit area is a percentage of that.

**The title logo comes back.** `intro.js` asks `uiAsset('logo')` for it,
and `uiAsset` reads the manifest — which `main.js` was loading **after**
the intro. So the lookup ran against a null manifest every time, returned
null every time, and the code-drawn wordmark shipped in front of a painted
logo that was sitting right there marked `live`. The manifest is a ~2 KB
JSON read; it now happens first, and the intro awaits nothing else.

**The dirt bank asks to be dug.** Paired ▲▼ chevrons at the top of the
face and a hazard-striped board under them — on the BANK, never beside the
machine, so the affordance is on the thing the affordance is about. The
first cut put the board between the arrows and hid ▼, which is the whole
instruction.

**The Toko mark is a sticker on the pad** (*"can be on the game pad but
should look more like a sticker"*): white die-cut border, a few degrees
off square, a shadow, and parked in the plate's deliberately empty ground
— the DMG's blank panel in portrait, the arcade strip's middle in
landscape. `sign()` writes its position inline, so the rules have to
shout, and a `MutationObserver` re-parents the badge into `#touch` once
`.plated` lands so it tracks the plate art at any size.

**The trap, and it is a layer trap, not a z-index one.** The sticker did
not appear. `sign()` sets `z-index: 4` inline (deliberately, so it sits
under a game's HUD) and the plate is `z-index: 5`, so the first fix was an
`!important` 7 — and nothing changed. Nor did **9999**. `#touch` was at
`z-index: auto`, which paints the entire hit layer as a unit *below* `#pad`
— and no z-index on a child can climb out of its own parent's layer. One
line fixes it (`#touch { z-index: 6 }`), and the same line un-buries the
plated buttons' **press tint**, which had been painting under the plate
since the plates were mounted with nobody noticing, because a transparent
button and a buried tint look identical. The gate now asserts the layer
order rather than the badge's number: `z(touch) > z(pad)`.

Gates: 88 / 31 / 30 / 257 / 7 / hub.

## v15.4 — 2026-08-15 — stomp and hurt animate, and both lanes' docs land

**The two verbs finally react.** `eeri_v4` has carried `stomp` and `hurt`
since the art lane shipped it and only `climb` was wired, so the biggest
moments in the game — bouncing off a robot, taking a hit — played the run
cycle. They are **one-shots over the top of the state machine**, not
states: the kid is airborne a frame after a bounce and running again a
third of a second after a knock, so driving them through `CLIP_FOR` would
either never fire or never end. `ClipDriver.once()` owns the rig for the
clip's own length, capped (0.4s stomp, 0.55s hurt) because a clip that
outlives the moment reads as a hitch rather than a reaction.

**The first wiring of it never fired at all, and nothing would have said
so.** `main.js` resolves stomps and hits AFTER `player.update()` has drawn
the frame, so the one-frame flag was set too late for that frame's visual
and cleared at the top of the next update before it was ever read. The
game plays identically with a rig that simply never reacts — no gate, no
error, nothing. Fixed by firing at the MOMENT, from `bounce()` and
`struck()` themselves, and the smoke gate now drives both and asserts the
clip takes over **and hands the rig back**.

That release check is judged on **game time, not the wall clock**. My first
reading said the one-shot never released; it had, and the sandbox was
simply rendering at a few frames a second — this project's oldest trap,
caught here only because the probe was rewritten to ask the game.

Also in: both lanes' pending work, all documentation — the art lane's World
1 source-pool index, and the levels lane's World 2 plan with its correction
that world 2's backdrop already exists (`pipeworks_*` shipped in PR #236
and is parked as placeholder).

Gates: 256 smoke, 88 rooms, 7 playthrough, 31 fx, 30 dev-pack, hub green.

## v15.3 — 2026-08-15 — the pad plates are mounted, and the controls are drawn

PR #236 shipped both touch plates and PR #234 landed on top of it, but
nothing MOUNTED them — the art was live in the manifest and the game still
drew its own circles. Owner: *"the vertical controls is not the Gameboy
look."* Correct, and the miss was this lane's: the art lane's submission
listed mounting as our work and we went to deploy without doing it.

**Two plates, because they are two objects.** Portrait gets the Game Boy
DMG face; landscape gets the arcade control-panel strip whose middle is
deliberately empty, because in landscape the middle of the screen is the
game. The DOM buttons keep their ids and become **transparent hit areas**
over the drawn controls, so `js/input.js` binds them unchanged.

Both PNGs carry a lot of transparent air above the plate, which is what
makes a full-width image work on a short phone: the painted face is about
half the rendered height, so the landscape strip covers ~40% of a 390px
screen rather than the ~72% its 3:1 ratio suggests.

**Four things this cost, each a real bug rather than a tidy-up:**

1. **Neither plate ever displayed at first.** `#pad img` is one id plus one
   type and outranks a bare `#padP`, so `display: none` won. Specificity,
   not a typo, and invisible until measured.
2. **The signature landed on the A button again.** Its coarse-pointer inset
   of 92 was measured to clear a row of 62px circles; the plate owns the
   whole bottom strip now, so 92 sits on the drawn A. Raised to 210, which
   clears the painted face in both orientations. v6 fixed this once for
   jump — the third time it has bitten.
3. **The face buttons overlapped each other** in landscape, which means an
   ambiguous press: jumping when you meant to climb into a machine.
4. **The 44px floor and the drawn d-pad genuinely conflict.** At 390px wide
   the DMG plate is 225px tall and its d-pad arms are about 20px, so four
   zones that each clear the floor cannot also be disjoint. Adjacent zones
   are how a virtual d-pad has always worked, so the gate now allows
   overlap BETWEEN D-PAD MEMBERS ONLY and still refuses it anywhere else.
   **A note back to the art lane:** for portrait phone use the plate wants
   its controls drawn larger relative to the face — the hit zone is
   currently more than twice the picture of the switch.

The old "never more than two rows tall" check was this lane's rule for a
layout this lane drew. The arrangement is the art's now, so it is replaced
by what actually matters: the plate is mounted, and every hit area sits on
it.

If a plate 404s or is still `placeholder`, `.plated` is never set and the
drawn circles stay — the game is playable either way, same as the rest of
the seam.

Gates: 251 smoke, 88 rooms, 7 playthrough, 31 fx, 30 dev-pack, hub green.

> **VERSIONS ARE DECIMAL from v15 (2026-08-14).** `vMAJOR.MINOR` — the
> integer is a milestone, the decimal an increment on it. Three lineages of
> this project each burned whole integers on ordinary work and then collided
> on them (there were two v11s and two v13s); a minor part gives increments
> somewhere to go that is not the next milestone's number.
>
> **The `?v=` module tokens stay integers.** They are cache-busters, not
> releases — they track every module-graph change, and the release number
> tracks what shipped. `scripts/versions.mjs` reads both and emits a label
> (`"15.1"`) plus a sort key (`15001`), because one number cannot do both
> jobs: a label cannot be compared (`'15.10' < '15.9'` lexically) and a
> float cannot be displayed (`15.0` prints as `15`).


## v15.2 — 2026-08-15 — every level has an address, and falls stop teleporting

**`EERI 1-1`** (owner's direction, and it is Mario's scheme because that is
the one every parent already reads). World and level, both 1-based, three
levels to a world exactly as DESIGN §4.1 fixes it — so `1-3` closes world
one and `2-1` opens world two. It is a URL: `/eeri/#eeri-1-2` boots straight
into that room, which is what makes a level shareable for a playtest.

**It is a naming layer, not a second list.** `js/levelid.js` is pure — no
three.js, no DOM, so `test/rooms.mjs` proves the mapping in plain Node — and
the game still runs on one flat index with `goSite(i + 1)` as the whole of
"next level". No room knows which world it is in, because the mapping is
arithmetic over the index.

Four decisions:

- **The address space is the whole planned twelve from the start.** A level
  is addressable the moment it is authored, so `#eeri-2-1` is a link
  somebody can hold before world 2 is built: it opens **1-1** rather than a
  black screen, and so does nonsense.
- **Forgiving in, canonical out.** `#eeri-1-2`, `#EERI-1-2` and `#1-2` all
  mean the same level — the failure mode is a child or a parent typing it —
  and the bar is rewritten to the full form afterwards.
- **`replaceState`, never `location.hash =`.** Assigning fires `hashchange`
  back at the handler that just changed the level, and the game reloads the
  room it is already standing in. `gameoflife` documents the same trap.
- **The HUD prints the address beside the name** (`1-2 · LEVEL 2 — THE
  SCAFFOLD`) and so does the tab title.

It composes with the title screen rather than fighting it: the intro is
`?skip`-able for the gates and the address is a fragment, so `?skip#eeri-1-2`
is a level and `#eeri-1-2` alone is the title screen then that level.

### the bug, and it was live on the trunk

**Falls used a hardcoded `x = 43`.** `Player.update`'s fall handler carried a
LEVEL 2 coordinate — it sits at that room's third ladder — left behind by a
debugging session, so *every* fall in *every* level teleported the kid there,
bypassing `level.fallRespawn()`, which already existed and already did the
right thing (the near lip of whichever hole took you, else the last
checkpoint passed).

Found by the **playthrough gate**, the only one of the four that could see
it: `rooms.mjs` proves a room is reachable and cannot watch a fall, and a
human reads it as "the game put me somewhere odd". The owner's experience
analysis filed the same thing as **P0** independently. The general lesson is
new to this log: **a debug constant in shipping code outlives the debugging
session.**

### and two documents

**`LEVEL2.md`** — the worked example. Every level here is cut from one shape,
so one level is documented completely: the four beats object by object with
real coordinates, the skill ladder it sits on, the `check()` rules that bite
on it, what building it taught, and where it still falls short against the
owner's analysis. Every number is read out of the compiler, and the file
carries the snippet to regenerate them.

**`WORLD2.md`** — the grey box for Pipeworks (DESIGN §4.2). Theme, three
levels on the four-beat pattern, the art queue with the `pipeworks_*` layer
table matching the rects `smoke.cjs` measures, two machines on the
excavator's node contract, and an honest costing: water and the pipe are
cheap re-dresses, the hoist is not — every solid in this game is a tile and a
moving platform cannot be one. **Not a to-do list:** the owner's analysis
says explicitly not to prioritise more levels yet.

### the reconciliation this entry is landing through

This work was built on a branch that had assembled the three lineages
**independently of `main` doing the same thing**, because the branch was
started without the `git fetch origin main gh-pages` that CLAUDE.md's Eeri
section requires. Both trees then wrote a v12, a v14 and a v15 with different
content — a fourth lineage, and exactly the collision the decimal scheme
above was introduced to stop.

`main` won on every overlap, because `main` is the trunk: its assembly, its
`v15.1` language/title/FX pack, its decimal versioning, its `REACH.gap` of 4.
Only the work `main` did not have was carried across — the respawn fix, the
address, and the two documents — re-applied against `main`'s newer
`main.js`, `smoke.cjs` and `rooms.mjs` rather than merged, since a merge
reported 23 conflicts and would have deleted eight modules. The abandoned
branch's own `v15`/`v16` numbering is void; nothing referenced it.

## v15.1 — 2026-08-14 — three languages, a title screen, an illustrated pad, and the dev/FX pack

Four owner asks in one pass, and one of them was overdue by fourteen
versions.

**The game speaks fi / en / ja.** It had no i18n at all, which means the
Finnish six-year-old it is built for had been reading it in English the
whole time. `js/lang.js` is the pack — English is the **per-key** fallback
so a half-finished language ships rather than not shipping, the tongue is
detected once from the browser and then obeyed, a choice persists under
`eeriLang`, and `<html lang>` is written before anything paints. Every
in-play prompt moved into it; the glyphs do not translate because they are
the same in all three.

**A title screen** (`js/intro.js`), which the game did not have — it booted
straight into level 1 from a `#boot` div that said EERI and vanished, which
is a loading state, not a title. The owner's words, verbatim: **eeri /
seikkailee työkoneiden ja robottien maailmassa**. It goes up *before* the
scene build and is awaited *after* it, so the player reads the name and the
story line while three megabytes of layer art come down behind them — an
intro shown after the loading finishes costs time instead of hiding it.
`?skip` walks past it for the gates.

**The logo is behind the asset seam and art is drawing the real one.**
`manifest.json` → `ui.logo`, with a new `uiAsset()` in `assets.js` because
the layer path returns a `THREE.Texture` and a title logo is DOM, not scene.
A code-drawn wordmark ships until the file lands and comes back if it 404s.
The contract is written out in `assets/README.md`: 1120×440, middle 90% safe,
must hold against the sky-blue gradient with no box behind it.

**The pad is the owner's layout, and the buttons are pictures.**

```
      ▲
  ◀   ▼   ▶            Ⓑ   Ⓐ
```

Down sits between left and right because it is the least-used direction and
the middle is the hardest place for a thumb to hit by accident, while ◀ ▶
keep the outside where the thumb rests. Still two rows — a landscape phone
is short, and a full four-way cross has already been tried and pushed the
hint into the middle of the picture.

Each button now carries **a small picture of what it does** (owner: *"like
old arcades with illustrated backboards"*): Eeri running for ◀ ▶, climbing
a ladder for ▲, a bucket for ▼, and the two face buttons in machine yellow.
`js/glyphs.js` draws them as inline SVG rather than shipping a sheet — they
scale from a 13px hint line to a 62px button, they re-colour through
`currentColor`, and a set that is a file drifts from the game that uses it.
A painted sheet can replace them through `useGlyphSheet()`.

**The dev / FX pack** (`CLAUDE_HANDOFF.md`, `EERI_DEV_PACK.md`). Tools for
iterating on feel, built so they cannot destabilise the game:

- `dev.html` **frames `index.html` rather than copying it**, so what is
  inspected is byte-for-byte what ships. This repo has paid for the
  copy-drifts bug more than once.
- Effects fire from **polling** `window.__eeri`'s debug state and reading
  events out of the differences — zero hooks in `main.js`. Honest limits,
  both tested: a poll sees only a net change, and a level change must fire
  **nothing** (every counter resets on a new room; without that guard the
  first frame of level 2 fired a dig, a stomp and a clear at once).
- `js/fx.js` and `js/audio-fx.js` **inject** three.js and WebAudio instead
  of importing them, so `test/fx-smoke.mjs` runs the whole spec, pool and
  inference in bare node — no browser, no GPU, no audio device.
- Sound is synthesised, never sampled, and everything goes through one
  master gain. `test/dev-menu.mjs` fails on a binary audio file.
- One line was added to the game: `THREE, scene` on the `__eeri` handle. A
  particle has to be added to something.

`test/dev-menu.mjs` exists for the failure nothing else can catch: the pack
reads hooks nothing in the game depends on, so renaming one breaks the pack
and **nothing else fails** — the menu would quietly show dashes while the
effects quietly stopped.

Two of the new gate checks were wrong on their first cut and are worth
recording: one matched the *comment* in `main.js` explaining why the scene
is exported, and one asserted every prompt contains a glyph when several are
plain sentences ("CARRY IT TO THE GAP"). Both were tests of the clock rather
than of the rule.

**Documented, not just built** — the standing rule is that the art pipeline
reads `DESIGN.md` §6 alone and knows what to make next, so §6 caught up in
the same pass: the glyph set moved to §6.1 "already live, do not remake"
with the reasons it is drawn rather than a sheet, §6.4 records the owner's
illustrated-backboard direction and the pad layout the gate asserts, §6.4.1
is the title logo as art's next UI item, and **§4.4 states the three
languages and what they cost art — no text in any asset, ever**, since a
painted word can only be made three times or be wrong twice.

Gates: 77 prover, 190 smoke (up 33), 7 playthrough, 31 fx, 30 dev-pack, hub green.

## v14 — 2026-08-14 — the third lineage joins, and the number skips

**v13 is deliberately not used.** There were *three* Eeri lineages, not
two, and this is the third joining: `claude/eeri-platformer-levels-dtfh0x`
had its own v11, v12 and v13 while `main` had its own v11 and v12. Taking
either 13 would have made two different v13s. **The joined tree is v14 and
neither lineage ever wrote that number.**

**This one merged the other way round from v12, and that was the finding.**
The levels lane was *ahead* on the Design/Level core, so it became the base
rather than the graft:

| | main (v12) | levels lane | joined (v14) |
|---|---|---|---|
| room prover | 30 checks | **77** | 77 |
| smoke | 157 | 172 | **172** |
| playthrough | **7** | *absent* | 7 |

It brought the **midway checkpoint** (locked in DESIGN §4 since the first
plan and still missing here), the **gizmo kit** — belts that carry you and
tarps that throw you, with the prover refusing a belt that walks you off an
edge you did not choose and a tarp that throws you into a ceiling — the
**golden bolts** wired to the HUD, `landedOn` split out of `stompedBy` so a
roller can be landed on without being killed, `cutJump` and `justBounced`,
a flattened parts list so one helper can return several parts, and levels
with names instead of numbers.

**Three things only `main` had were grafted onto it:**

1. **The facing fix.** `SKIN_YAW` was `-PI/2` stacked on top of
   `FACE_TURN`'s `0.42pi`, which swung Eeri round to face the camera while
   running and sat him backwards in the cab. One cause, two symptoms, and
   the levels lane still carried both.
2. **The manifest could not bust its own cache** — fetched at `?v=1` while
   the manifest inside said `v: 11`. It is the one file that cannot bust
   itself: hold a stale copy and you keep the old art forever with every
   asset URL inside it still perfectly correct.
3. **`playthrough.cjs`, restored.** That branch had no playthrough gate at
   all — the gate that exists *because* the prover once passed a level
   nobody could finish. It passed on their levels unmodified, which is the
   single best evidence this merge is sound: a bot that had never seen
   their rooms finished all three and was never thrown out of a cab.

**Why it forked, and what actually fixes it.** All three lineages branched
before `CLAUDE.md` said Eeri existed, so no agent was told the project was
there, who owned which module, or that `gh-pages` is a deploy target. The
docs now say all three (`CLAUDE.md` § Eeri, both copies). The evidence it
works: the art lane branched *after* that commit and its very next commit
was "replant the art lane on main, per the new lanes rule" — it read the
lanes table and complied. This lineage branched before it, and did not.

**A merge is still not a git merge here.** `--allow-unrelated-histories`
was tried and abandoned: the levels lane descends from `gh-pages`, so
merging it drags the whole deployed site — toko-drop, toko, voxel — into
`main`. The join is scoped to `eeri/js`, `eeri/test`, `index.html` and the
manifest; `main`'s docs are kept whole.

Every module token unified at `?v=14`. The levels lineage's own log is
archived below rather than overwritten.

Gates: 77 prover, 172 smoke, 7 playthrough, hub green.

## v12 — 2026-08-14 — the two trees become one, and the docs say why

**There were two Eeris, and neither knew it.** `git merge-base
origin/main origin/gh-pages` returned *nothing*: no common ancestor. One
lineage carried the gameplay (the facing fix, glyph controls, stomp, the
building flag, ladders, the whole test suite), the other carried the art
(the craft material kit, the v2 crafted layers, a paper sky, painted
machines). **Both called themselves v11**, so nothing looked wrong from
either side, and the owner's report — "Eeri still faces the camera, the
instructions still say WASD" — was one fact wearing two hats: the live
site was the other lineage.

This is that merge, and it is a merge by KIND rather than by branch.

**How, because the how is reusable.** The art lineage's own log named its
starting point ("design v6 × crafted art"), and `main`'s v6 commit turns
out to be byte-identical to `gh-pages` in `parts.js`, `rooms.js` and
`input.js`. So there *is* a content ancestor even though there is no git
one, and every shared file could go through a real three-way merge
against it instead of being picked wholesale. Fifteen files, eleven
conflicts, and every conflict but three was an import line.

What each side kept:

- **Art wins the art**: `craft.js` and the material kit (card / felt /
  balsa / flute, greyscale maps multiplied onto palette colours), the
  crafted v2 layer set and the paper sky layer, the repainted excavator,
  `ASSET_PLAN.md`, and the `craftBox` routing through `level`, `pieces`,
  `excavator`, `crane`, `hazards`, `robots`.
- **Gameplay wins the logic**: `SKIN_YAW = 0` (he runs sideways again),
  the glyph controls, the stomp, `fallRespawn`, the ladder block, the
  three-phase flag, the re-laid levels, `test/`.
- **One graft each way.** The flag replaced the art lineage's balsa gate
  posts, so `flag.js` now builds through `craftMat`/`craftBox` — a flag
  in smooth plastic beside painted-wood machines would have been a
  regression nobody would have attributed to this merge. And the sky is a
  sixth layer, so `assets/README.md`'s size table and the gate that reads
  it both learned about it.

**The token pass is the other half.** The merge produced `assets.js?v=3`
in one module and `?v=4` in another — the exact split that has silently
unplugged the layer art twice before. Every module now carries `?v=12`,
one token, bumped together.

**And the fix that matters most is not code.** `CLAUDE.md` — the file
every agent reads first — mentioned Eeri **zero times** across 1,153
lines. That is why three lineages exist: no agent was ever told the
project was there, who owned which module, or that `gh-pages` is a deploy
target rather than a workspace. It now carries an Eeri section with the
reading order (`PHASING.md` first — it is newer owner direction and
supersedes the rest), a LANES table naming who owns what and which three
modules are shared, the branch rule, the four gates and the traps. The
`gh-pages` copy of `CLAUDE.md` — a different, older file, which is what
the art agent actually reads — got the same section plus a header saying
where it is standing, and that branch's `VERSIONS.md` got a FORK NOTICE.

A version number cannot detect a fork. The next agent to write a heading
has to read the other branch's log first, and now the docs say so.

**One more found by looking at the deployed build rather than at the
tests.** `assets.js` fetched `manifest.json?v=1` while the manifest inside
said `v: 12`. The manifest declares the cache token for every asset, so it
is the one file that cannot bust itself — a returning visitor holding the
cached copy at the old token never learns a new one exists and keeps the
old art forever, silently, with every asset URL in it still correct. The
fetch carries the manifest's own version now and the gate asserts the two
agree.

Gates: 157 smoke, 30 prover, 7 playthrough, hub green.
## v23 — 2026-08-14 — the open failure is closed: it was three bugs, all mine

v21's known-open "walking out of site 1" check is fixed. origin/main ran
green in a worktree, which pinned it to this branch, and the chase found
three stacked faults:

1. **`assets.js` threw on `rig:"prop"`** — the node loop assumed every
   non-skinned model declares `nodes`, so every pickup fell back to its code
   placeholder with only a console warning. The bolt GLB was never actually
   on screen. Props now return whole.
2. **The bolt's placeholder builder returned a bare Group** where the seam's
   contract says builder and live path return the same `{root}` shape — "so
   game code cannot tell them apart". It worked on whichever path was
   exercised that day and crashed on the other.
3. **The real killer: a hundred of a thing is a budget of its own.** The
   live bolt was Meshy raw — ~4k tris and a 1024² texture — and 100 clones
   dropped headless rendering to 6 fps, which starved the gate's 8-second
   walk-out. Remeshed (5 cr) to 500 tris, packed at 64px texture: **43 KB**,
   from 3.3 MB.

The diagnostic that settled it: bolt as placeholder → 189/0 green; bolt
live-heavy → the one red. Not flakiness, not level geometry — draw cost.

Gates: 189 smoke green on the placeholder run; final live-bolt confirmation
run below.

## v22 — 2026-08-14 — Eeri leans over his own logo, and landscape gets its arcade plank

Both from owner notes on v21, same day:

- **`logo_v2.png`** — "needs to have Eeri the character involved, coming
  towards the camera pov from top of the text box, waist up." He leans over
  the sign's top edge like a kid over a fence: body behind the plate, head
  and hands breaking above it. Built with `--ref E1-eeri-tpose` so he is the
  SAME kid as the cast model rather than a re-imagining — the ref carries
  the character, the sign is ours and is described. v1 removed.
- **`padplate_landscape_v1.png`** — "wider and thinner look, maybe more
  arcade background board feel." Not a stretch of the portrait DMG plate but
  a different object: an arcade cabinet control-panel strip, joystick ball
  far left, B/A + SELECT/START + grill far right, and the whole middle
  deliberately EMPTY — in landscape the middle of the screen is the game.

The portrait DMG plate is unchanged and now named `padplate_portrait`.
Mounting all three (title state, per-orientation plates, transparent hit
areas over the drawn controls) is Design/Level + shared-file work.

Known open from v21 stands: the walk-out-of-site-1 check still fails (188 of
189) and is still not isolated.

Gates: 188 smoke + 30 rooms, 1 known failure.

## v20 — 2026-08-14 — the pickups are 3D, and the gate learns a third rig

DESIGN §6.3's collectables. The bolt now comes through the asset seam
(`bolt_v1.glb`) instead of being two cylinders built inline, and world 1–3's
tokens exist as `token_toolbox` / `token_blueprint` / `token_bolt`.

**§6.3's real requirement is a SILHOUETTE test, not a look test** —
"unmistakably NOT a bolt at 32 px, different silhouette, not just bigger" —
so `art-src/tools/silhouette.mjs` (new) renders each one keyed, at 32 px, as
a flat black shape, which is all the player's eye actually gets. The four
read as: a blob with a hole (bolt), a winged V (golden bolt — allowed to be
a bolt because it IS the golden one, so the wings carry it), an arch with
daylight under it (toolbox), and a long diagonal (blueprint). Distinct as
pure shapes, which is the contract.

**A pickup's origin is its CENTRE.** It floats and bobs; the foot-contact
rule in assets/README governs things that stand. Shipping these base-anchored
would have hung every bolt half a tile high. `packprop.mjs` (new) takes
`--anchor center|base` and says why.

Weight: Meshy returned 3.3 MB each — a 1024² texture for something drawn
32 px wide. `packprop.mjs` re-exports at 128², which is 240–307 KB, inside
assets/README's 400 KB budget for the first time in this project. The
textures are downsized rather than stripped-and-painted because a Meshy prop
is a single `mesh_node`: a `paint` map could only give it ONE colour, and the
bolt's grey collar against the yellow is the read.

**The smoke gate learned a third kind of rig.** It knew skinned characters
(declare CLIPS) and hand-cut models (declare NODES) and failed all four
pickups, which have neither. `rig: "prop"` now declares *no moving parts* and
is asserted as such — saying it beats exempting it, because a prop that
quietly grew an animated part is still caught.

Two live bugs fixed on the way in, both from a code placeholder becoming a
real GLB: the collect fade walked `b.children`, which reaches a Group's
direct children but never the Mesh inside a loaded GLB (Group → Object3D →
Mesh), so bolts would have popped without fading; and cloned GLB materials
are shared and opaque, so one collected bolt would have faded every bolt in
the level at once.

Cross-lane, declared: `js/main.js` (shared) routes bolts through `getModel`,
and `test/smoke.cjs` gains the prop contract.

Gates: 186 smoke + 30 rooms + 7 playthrough.

## v19 — 2026-08-14 — the enemy family is three deep

DESIGN §6.2 #1 — "nothing is more used and nothing is missing more" — was
one enemy across twelve levels. Now: `hopper_v1.glb` (24 bones; idle/walk/
run/**hop** — 417 Hop_with_Arms_Raised IS the fixed-rhythm hop §3 asks for)
and `bucket_v1.glb` (22 bones; idle/walk/run/**wake** — 271, measured
head-led at 0.12 against near-still limbs, so the look-up is the telegraph
itself; then `run` chases). Both on the bolt-bot body plan, both rigged
FIRST TRY — the volume rule from v17 held twice more. Both `placeholder`
until js/robots.js consumes them.

The **roller stays a vehicle** (PHASING routing: wheels → sliced nodes,
never a rig). Its concept is in `art-src/bots/B-roller.jpg`: domed top that
reads as un-landable from across a room — §3's rule for it — with its
notice-tell lamp on a stalk. Mesh + slice is a follow-up; it needs
`slice.mjs`, not the rigger.

Costs this batch: 60 cr meshes, 12 cr clips — and **rigging billed 0** on
both (the rig charge appears to have moved into bundle pricing). Balance
1732 → all of Phase A's remaining art fits several times over.

Gates: 174 smoke + 30 rooms.

## v18 — 2026-08-14 — the two new verbs animate

DESIGN §6.2 #2, verbatim: "the two new verbs have no animation at all."
`eeri_v4.glb` fixes that with three library clips on the existing rig —
`climb` (438 Ladder_Climb_Loop, chosen over the fast/slow variants because
the game HOLDS a climb, so it has to loop), `stomp` (470 Jumping_Down, the
crouch-and-rebound), and `hurt` (178 Hit_Reaction — a plain flinch; the
library's other reactions are punches and gunshots, which have no business
in this game). 9 credits, `art-src/tools/meshyrig.mjs anim`.

The full action library with names is at docs.meshy.ai/en/api/animation-library
— found while hunting a hurt clip, and better than the rough id ranges this
repo had been navigating by.

New FILE name (eeri_v4, not a rewrite of v3) per the versioned-URL rule.
Clips measured moving in the packed file before install: climb forearm 0.22 /
leg 0.20, stomp 0.68 / 0.55, hurt 0.36 across the board — none dead.

One declared cross-lane line in js/kid.js: `CLIP_FOR.climb` pointed at
`'walk'` as a stand-in and now points at the real clip. Wiring `stomp` and
`hurt` into the state machine is real behaviour work and stays with
Design/Level — the clips are on the model waiting.

Also concepted on the rigged body plan: `B-hopper2` and `B-bucket2`
(art-src/bots/), the next two family members. Not yet meshed.

Gates: 166 smoke + 30 rooms + 7 playthrough.

## v17 — 2026-08-14 — the bolt-bot rigs, and why the first two did not

PHASING §2's highest asset-value-per-credit item: ONE Meshy-rigged biped that
the whole non-violent enemy family is re-headed and retextured from, so the
game stops being one enemy type across twelve levels. `boltbot_v1.glb` — 24
bones, feet at the origin, `idle`/`walk`/`run`, 1.1 MB. It sits in the
manifest as **placeholder** until `js/robots.js` asks for it, because the
smoke gate fails a live asset nothing fetches.

**Two rigs were rejected before this one, and the reason was not the pose.**
Both were in a strict T-pose with daylight through both armpits and between
the legs — exactly what ART_PIPELINE's T-pose rule asks for — and Meshy
answered *"Pose estimation failed, please provide a valid model"* both times.
The second attempt even had textbook human proportions: visible neck,
shoulders wider than hips, arms as long as the legs, elbows and knees halfway.
Rejected again.

The answer was in `art-src/E1-eeri-tpose.jpg`, the concept that rigged first
time months ago: **his legs merge at the hip with no daylight at all, and his
arms are barely 40° from his sides.** He breaks the stated rule and rigs
anyway. So the rule was mis-stated. What the estimator wants is **volume** — a
body it can fit a skeleton *inside*. Eeri is a solid toy with mass; both
failed bots were tubes stuck onto a box, and there is nothing inside a tube.

The fix, and the general lesson now in ART_PIPELINE: for anything non-human,
`--ref` a character that has already rigged, take its BODY PLAN, and disown
its costume in words. The third bolt-bot did that and rigged first time. Be a
robot in the faceplate and the surface, never in the construction.

Cost of learning it: 90 credits of meshes (the two failures charged 30 each;
**a failed rig charges nothing**), then 5 for the rig and 3 for the idle clip.

Verified by measurement, not by eye (`art-src/tools/botmeasure.mjs`, new):
every driven joint travels in `walk` and `run` — forearms 0.15–0.23, legs
0.12–0.16 — against an idle that is correctly near-static at 0.004–0.011. A
dead joint renders completely plausibly, so this is the only honest check.

Not done here, and deliberately: **the stomp squash is CODE, not a clip**
(PHASING §1) and `js/robots.js` is Design/Level's file. The rig ships with a
root the game can scale; the flatten-and-pop belongs to that lane.

> **A note on the numbering.** Two lineages both shipped a "v10" and a "v11":
> main's are gameplay (the machine on the route; ladders and vertical levels),
> the art lane's were the material kit and the painted machines. The art
> entries below are renumbered **v12–v16** to continue from main's v11 rather
> than collide with it. Their own text still refers to itself by the old
> numbers in places, and that is left alone — rewriting the record to look
> tidier than it was is how the traps stop being findable.

## v16 — 2026-08-14 — world 2's backdrop, built ahead of need and parked

The pipeworks layer set (DESIGN §4.1 "pipes/water") — built now because the
whole run cost ~nothing on the v14 model policy, parked because §6.2 #5 says
it is due at level 4, which does not exist yet. It ships in the manifest
under `layers.pipeworks` with status **placeholder — deliberately**: the
smoke gate fails any live asset the game never fetches (the v6 bug class,
2.7 MB shipped and never requested), and no level plays world 2 yet. Level 4
flips six words to "live" and nothing else; the seam (`buildLayers(scene, world)`) has taken a
world name since v6, so when level 4 lands it is one string in the room def.

- **28-piece pool** (`art-src/craft/pipeworks/`): waterworks skyline (water
  tower, gasometer, pump station, elevated pipeline, crane), the far water
  structures (tank tower, pipe rack, pump house, standpipe, a lattice pipe
  bridge), a mid kit of pipes at hand height (runs, a red-wheeled valve, an
  elbow, pump skid, sluice, pipe stack), wet near clutter, dark fore
  occluders, and three grade strips with standing water let into them.
- **Water is CUT PAPER** — layered blue card with scalloped torn edges and
  paper foam curls, never a rendered liquid. The near lane carries it as a
  wide strip sunk half into the grade.
- **23 of 26 concepts on base nano banana** (flash); Pro only for the three
  structural heroes. Owner's call, and the strata A/B backs it: flash results
  are equivalent outside fine lattice work.
- `build-layers.mjs` gained a **`WORLD` switch** — per-world pool + layer
  config over the same world-agnostic rects — and a per-piece **`sink`**:
  some pieces keep a sliver of white base (legit ink the key is right to
  keep), and burying the feet in the grade is cheaper and more honest than
  re-rolling for a perfect crop. P-mid-tower is borrowed from the groundworks
  pool deliberately: one shared silhouette ties the worlds to one site.
- The sky entry points at the groundworks sky — world-agnostic until a world
  needs its own (the evening set will).

Composition acceptance (full-width strips): far and mid pass cleanly; the
skyline needed the hero rate halved after three identical cranes landed in
one screen — one hero piece per pool makes the hero rate the repeat rate.

## v15 — 2026-08-14 — the ground stops being wallpaper

The owner, on v12: *"I thought it was already done."* It had been — twice. v10
gave the earth the material kit and v11 fixed the detail map's contrast, and
both were real fixes on the MATERIAL axis. Neither touched composition, which
is why ~30% of every frame was still an evenly-spaced motif marching across
136 world units between four dead-straight horizontals. Machine-perfect is the
one thing the reference is not.

- **Each stratum takes its own section at its own scale.** They shared one
  `flute` map, so four bands were four tints of one stamp.
- **The boundaries INTERLOCK instead of running straight.** Each band sends
  tongues of itself into the band below at varying widths and depths, drawn
  per solid run so a dug hole is never bridged. This replaced a first attempt
  that laid a torn-card strip along each boundary — which was worse, and
  usefully so: it turned four straight lines into four regular rows of
  identical bumps, i.e. the same failure with more ink. **A boundary wants to
  be irregular in POSITION, not dressed.** The geometry version costs no asset
  at all.
- **The face carries things you can name** — a paper-tube pipe with a tape
  band, a crushed drum, a root, broken brickwork, stone clusters, a bottle —
  keyed cutouts placed deterministically, knocked back in value so they sit in
  the earth rather than on it, and skipped where they would float over a dug
  pit. The v4 "cobbles" they replace are ninety grey dodecahedrons mixed toward
  INK on a brown face: invisible, which is why the section read as empty
  however much material was thrown at it.
- **The grass lip gets its felt fringe**, tiled at the strip's own aspect.

**A DETAIL MAP MUST TILE, WHICH MEANS IT MUST BE FEATURELESS**, and this cost
two rounds. The strata sources inherited the house craft block, which names
split pins and masking tape, so every section came back with fixings in
specific places — correct for a piece, fatal for a map, because a map repeats:
at a 3-unit repeat you could count the same brass pin forty-five times.
`detailmap.mjs` gained a **`highpass`** argument (subtract everything coarser
than a radius; the features are large and the fluting is fine, so one number
separates them). That fixed two of the four. It could not fix `packed` and
`gritty`, which are photographs of a specific card *assemblage* — the
arrangement is the subject, and no filter turns an object into a material.
Both were pulled; those bands fall back to `flute`, which is genuinely
uniform, at two densities. **The test is TILE IT 3×3 AND LOOK** — a single
patch of all four reads as convincing card, and only the 3×3 shows which two
are objects.

Also fixed: the first cut placed all 46 face cutouts between y −0.5 and −8,
which is almost entirely below the bottom of the frame — loaded, lit and
rendered where nobody would ever see one.

**Postscript — it was the prompt, not the model.** The credits came back and
the three failed sources were re-rolled against both models on the fixed
brief. All three came out right on both, which settles it: the earlier
failures were the house craft block leaking fixings into a texture, not the
generator. And **base nano banana (`gemini-2.5-flash-image`) produced the
best-tiling swatch of the four**, beating Pro — Pro put repeating white blobs
in `gritty`. Pro won `gritty` and the torn edge. So the standing rule is
**generate on flash, escalate to Pro only when a look fails**; Pro's clear
advantage is a piece with internal structure, where the subject is an object.
All four strata are live again.

Gates: 156 smoke + 29 room-prover.

## v14 — 2026-08-14 — the layers are COMPOSED, not tiled

The owner's note on v11 was that the assets were not good enough yet, and
then, looking at them: *"a lot of the backgrounds looked like it stopped
abruptly or that it's not connected to ground. generally they are flat and
need more definition or edge contrast."* Rendering a full layer strip instead
of a screenshot showed why, and it was not a material failure.

**Every layer was ONE generated segment stamped across the rect with a gap
between copies.** In one 1280px frame at x=78 you could count three identical
half-built frames at identical heights with three identical cranes above them;
across the whole strip roughly half of each layer was empty air. The segments
themselves were on target — balsa standards, split-pin bolts, corrugated cut
edges, all of it — so every previous pass had been improving the thing that
was already right.

So the unit of generation stops being a segment and becomes a **piece**, and
`build-layers.mjs` becomes a compositor:

1. **A pool, not a tile.** 36 pieces (`art-src/craft/pieces/`), each ONE object
   on magenta with no ground under it. The tool finds its ink bounds, gives it
   a world height and places it.
2. **A height profile.** Each piece carries its own world height and jitters
   around it; `hero` pieces — cranes, a lift core, a chimney stack, a tall
   scaffold — appear rarely and stand well above the run. A run of 13s with an
   occasional 21 is a skyline; thirteen 13s is a fence.
3. **A continuous grade, and feet that are buried in it.** Each ground lane
   gets a torn-card ground line tiled the full width, and then the SAME strip
   again in front at half height, so every piece is planted rather than
   standing on air. Drawn only behind, a grade is a backdrop and the cutouts
   still float — which is the "not connected to ground" read exactly.
4. **Edge contrast.** Every piece drops a hard-edged cutout shadow onto
   whatever is behind it (which is what Crafted World's flat sets actually do)
   and each lane's contrast is pushed back up before the depth tint washes it
   out.
5. **A value staircase.** The depth tint alone mixes every lane toward the
   same pale sky, which is why the old build read as one field of cream with
   the player lost in it. Each lane now steps down from the one behind it
   (1.00 / 0.92 / 0.84 / 0.78) and the hoarding — the only wide block of local
   colour in the kit — was promoted into the NEAR lane, so there is something
   behind the play lane that is neither pale nor grey.

Placement is seeded, so the same commit builds the same layers, and the tools
plus the pool ship in `art-src/` — `build-layers.mjs` rebuilds
`assets/2d/groundworks_*_v3.png` byte-for-byte from `art-src/craft/pieces/`.

**Three bugs in the chroma key, all of which had shipped.** `keylib.js` is now
the one copy, shared by the compositor and the review tools:

- **A ratio test over-keys.** Keying on `g < min(r,b) × 0.8` alone lets JPEG
  chroma noise in a dark passage punch black speckle through the middle of the
  art — it was visible all over the lift core and the dark scaffold. The
  backing is a lit sheet, so demand an absolute floor and a real separation
  too.
- **A level test under-keys.** The previous cut tested `r > 140 && b > 140 &&
  g < 110`, which is a test for BRIGHT magenta — and the model casts a SHADOW
  on the backing, around (90, 15, 90), which passes none of those thresholds.
  That shipped as a solid purple block beside a tower.
- **A keyed pixel still carries its original colour.** Canvas scaling averages
  rgb across the alpha edge, so a piece composited at half size grows a
  magenta fringe out of pixels that are supposedly invisible. Dilating the
  opaque colour a few pixels into the transparent region is the fix, and it is
  the real cause of the whole "pink on the clouds" family — no amount of
  threshold tuning reaches it. Worst residual lean across the five shipped
  layers is now 12 levels, against ~100 before.

And one that is not a bug: **the de-magenta correction is per piece, on
purpose.** The backing bounces onto everything it lights, so a balsa scaffold
comes back salmon — but `castprobe.mjs` scores the orange skip and the orange
cones just as high, because orange genuinely sits on the magenta side of the
green-magenta axis. A blanket correction would grey out the only saturated
colours in the kit. The neutrals declare a correction; the painted pieces
declare none.

The superseded `_v1` and `_v2` layer sets are removed (7 MB).

## v13 — 2026-08-13 — the machines are painted wood, and the map tool is fixed

**The excavator was still smooth plastic in a crafted world**, and chasing it
found two independent causes plus a bug in the tool that makes every map.

1. **An imported GLB carries its own UV atlas.** `craftBox`'s world-space UV
   trick is only available to geometry we build, so on a live model a
   repeating map stretched ONE copy of the brushwork across the whole
   machine. The paint path now tiles across the atlas explicitly (repeat 9),
   on a cloned texture — repeat lives on the Texture, and the cached one is
   shared with every other surface asking for balsa.
2. **The placeholder machines built boxes directly.** `excavator.js`,
   `crane.js`, `pieces.js` and `robots.js` each had a local
   `new THREE.Mesh(new THREE.BoxGeometry(...), M(c))`, which gets the shared
   material but none of the UV density. All four route through `craftBox`
   now.
3. **`detailmap.mjs` scaled contrast about the MEAN**, which preserves the
   source photo's own contrast. That is fine for corrugated card (luminance
   40…230) and useless for a white-painted board (230…250): the balsa map
   came out ±4% however high the strength went. It does a **histogram
   stretch** now — 5th to 95th percentile onto a fixed band — so a map's
   contrast is a property of the REQUEST, not of how well lit the source
   happened to be. Every material was rebuilt through it; felt and balsa
   only became visible at all after this.

The lesson generalises past this project: **normalising by mean preserves
the source's contrast; normalising by range sets it.** A tool that takes a
"strength" argument and ignores it for low-contrast inputs is worse than one
with no argument, because it looks like it is working.

Gate: 134 checks + 29 room prover.

## v12 — 2026-08-13 — a material KIT, not cardboard everywhere

**Crafted World is a kit of materials and the first pass used card for all of
it.** `js/craft.js` is now the one factory every surface is made through, and
the manifest's `textures` block is the palette: `flute` (the cut edge of
corrugated card, stacked fluting) for the earth section and every dug face,
`card` (kraft liner) for flat card, `felt` for the grass lip, `balsa`
(painted wood, brush strokes and a paint chip) for machines, girders and
props — §3.3's "painted wood and pressed steel". Each is a greyscale map
multiplied onto a palette colour, so §3.2 holds exactly.

**The ground is the headline.** It was flat brown, then card with a faint
grain, and it is now visibly a CUT THROUGH STACKED CORRUGATED CARD — which is
what a cut earth section is in this reference. The strata banding the depth
pass established still reads through it; the flute strength was pulled from
0.62 to 0.5 precisely so it would.

**Two failures worth recording.** A probe of the live scene found **3
materials mapped and about 70 not**: every module had grown its own
`const M = (c) => new MeshLambertMaterial(...)`, so the grass lip, both
machines and every prop were still flat paint while the ground behind them
was card. Patching call sites would have left the next one to be written
flat, so `craft.js` replaced all of them — 128 materials now carry their
material, and the ones that do not are the beacon lamp, shadows and glass,
which must stay bare. And the first maps were far too weak: ±20% variation,
which Lambert then flattens further. A material you have to be told is there
is not doing its job.

Also fixed: the sky's remaining magenta. **Magenta is the only thing where r
AND b both exceed g** — yellow, orange, kraft and cream all have b < g, and
cotton is neutral — so the despill needs no threshold and cannot eat a real
colour. 2.04% of pixels carried a pink cast; now 0.004%.

And the gate learned to refuse a manifest block containing a stray note: a
bare `_note` string beside the texture entries made the seam-scope check
resolve a path on `undefined` and killed the whole run with
`ERR_INVALID_ARG_TYPE` instead of naming the problem.

Gate: 134 checks + 29 in the room prover.

## v11 — 2026-08-13 — ladders, and levels that go up

`climb` was a verb DESIGN.md declared and nothing implemented. It is real
now, and it is the cheapest variety in the game: `L` is the one tile the
kid can stand INSIDE and still be held up.

The rules, chosen for a six-year-old rather than for realism: gravity is
off entirely while you are on a ladder, up and down climb at a deliberate
3.4 tiles/sec, left and right still slide you along, **letting go of up
holds you where you are** rather than sliding you down, and **jump lets
go** — so nobody has to hunt for the exact top rung to get off.

SITE 2 gets the first climb: a ladder off the floor to a high walk with
three bolts along it the ground route never reaches, then a step back down
at the far end. §4.2's rule holds — a level may go up, but it comes back
down, so the camera never has to leave its band for long.

**Two traps, both caught by the prover the moment the part existed.** A
ladder whose foot hangs in mid-air is a ladder nobody can get on, so the
check demands something solid under it. And a ladder must reach PAST the
walk it serves: the first cut stopped one rung short of the ledge, so he
climbed to the top and bumped his head on the thing he was climbing to.

Gates: 151 smoke (six new over the ladder), 30 prover, 7 playthrough.

## v10 — 2026-08-13 — the machine sits on the route, facing its job

DESIGN.md §8.0. The excavator parked at x=61 with its bank at 84, so you
walked past it, met a wall you could not jump, and had to walk
twenty-three tiles BACK to fetch it. That is the lock-and-key shape the
pivot retired, and it is what the playtest felt as an impossible blocker —
a lock feels impossible when the key is behind you.

All three levels re-laid. The machine now stands a short drive short of
its work and you ride forwards into it:

| level | before | after |
|---|---|---|
| SITE 1 | 23 tiles of driving | **7** (2.1 s) |
| SITE 2 | 18 to the stack | **5** |
| SITE 3 | 14 tiles | **6** (1.8 s) |

**And the ride-ender rule was too narrow.** It knew only about the
swinging ball — but a steam vent throws you out of the cab in exactly the
same way, and one stood at x=44 in SITE 2, squarely between the machine
and the girder stack it had to lift. Same bug, different art, completely
unflagged. The check covers every ride-ender now and caught that vent the
moment it was broadened; the vent has moved to the kid's own stretch.

Gates: 145 smoke, 30 prover, 7 playthrough, all green after the re-lay.

## v9 — 2026-08-13 — a gate that actually plays the game

`test/rooms.mjs` proves a room's *geometry*. It cannot see whether a level
is playable, and it passed one that was not. So `test/playthrough.cjs` is
a bot that FINISHES every level: it runs right, jumps when the run is
blocked or a hole is ahead, boards the machine when something in the way
needs it, uses the verb, and must reach the flag. It is deliberately dumb
— no waypoints, no level knowledge — because a bot that needs to be told
the route cannot tell you the route is broken.

**It earned its keep on the first honest run.** SITE 3's pit was four
tiles, sat at the very edge of the 4.85-tile run, and the bot — which
never gives up — stalled on it over and over. DESIGN.md §4.1 already
locked "a full tile of slack" for a six-year-old and the budget did not
enforce it: `REACH.gap` was 4. It is 3 now, and the pit is 3.

**Its honest limit, recorded so nobody over-trusts it.** A tireless bot
will eventually beat a level a child would put down. Restoring the
ball-on-the-route bug, the *rule* check refuses the arrangement while the
playthrough sails through it — the ball turns out to be timing-dependent
rather than an absolute wall, which is why v8's account of it is corrected
above. So the gate also measures **cost**: how many times a level took the
ride away. Possible and reasonable are different questions, and the static
rules are what catch the second.

Two bot bugs found on the way, both worth naming because they are the
shape of mistake this kind of harness makes: it never hopped out of the
cab (the flag only finishes on foot, so it drove past the end forever),
and it treated the girder as one action when it is two — pick it off the
stack, then carry it to the lip.

Gate: 7 checks over 3 levels, run alongside 145 smoke and 30 prover.

## v8 — 2026-08-13 — three bugs from actual play

All three came from one playtest, and two of them were one cause.

**He ran toward the camera, and sat backwards in the cab.** The skinned
rig is modelled facing +z, and `FACE_TURN` (0.42π ≈ 75.6°) already sends
+z to (0.97, 0, 0.25) — screen-right, tipped slightly toward the camera,
which is exactly the 3/4 view the game wants. The extra −90° it carried
was added on top and swung him round to face the lens. The same −90° left
him backwards while riding, because riding zeroes the turn and he was then
facing +z on the nose. `SKIN_YAW` is 0 now, and riding puts the +z→+x
quarter turn back by hand. The gate measures his forward as a WORLD
DIRECTION rather than an angle, because facing is a thing you see.

**"After the machine there is a blocker that is not possible to jump
over."** The bank is three tiles and a jump reaches 2.65, so it is not
meant to be jumped — it is the machine's job. But the machine could never
get to it: **the wrecking ball hung at x=70, squarely across the
excavator's only run from where it parks to the bank at 84**, and a hit
takes the RIDE. Every attempt ended with the ball throwing you out of the
cab. **Correction, from the playthrough gate:** it is not an absolute
wall — a bot that drives steadily can thread the swing, and did. It is
*timing-dependent*, which for a six-year-old is arguably worse: the same
approach works sometimes and throws you out other times, with a long walk
back either way. Either way the arrangement is refused by rule now.

The ball has moved to x=35, in the stretch only the kid ever walks, and
the rule is now enforced rather than remembered: `test/rooms.mjs` refuses
any room where a ride-ending hazard stands between a machine and an
obstacle it is meant to clear, with a deliberately broken room proving the
check bites. The old track rules only ever asked about holes.

**And nothing told you to go back for it.** Standing at the lock on foot
now says so, with the direction: `◀ TOO HIGH TO JUMP — GO BACK FOR THE
MACHINE`. A six-year-old should not have to infer that the answer is
twenty tiles behind them.

Gate: 145 checks, plus 30 in the room prover.

## v7 — 2026-08-13 — controller-first controls, the stomp, and the flag

**Three lineages became one.** The gameplay branch (parts kit, room prover,
crane, robots, brick wall) and the art branch (Meshy-rigged animated Eeri,
the pipeline) are reconciled into `main`, split by kind. Two regressions the
graft nearly shipped were caught: `kid.js` had reverted to a hardcoded fall
respawn, and the gate only understood the node contract so the skinned
character failed it.

**The painted layer art was unplugged, again.** `layers.js` imported
`assets.js?v=1` while `main.js` imported `?v=2` — two tokens, so the module
instantiated twice, `loadManifest()` ran on one instance and
`getLayerTexture()` asked the other. Every layer fell back to code-paint
while 2.7 MB of PNG sat unrequested. `palette.js` was split the same way.
Third time for this class, so it is gated now: a static sweep failing on any
module imported under two tokens, and a runtime check that every asset the
manifest calls **live** was actually FETCHED.

**Controls are controller-first** (DESIGN.md §5). `input.js` reads a pad
natively — polled once a frame, edge-detected against its own previous
state so an idle pad never clobbers a held key, and polled in every mode
rather than inside the play branch. Every prompt is glyphs and names no
key; the on-screen buttons wear the same glyphs. The touch layout is a
bottom row plus a boom pair: the d-pad cross tried first stood 200 px tall
on a landscape phone and shoved the hint into the middle of the picture.

**The stomp.** Landing on a small machine kills it and bounces 80% of a
jump — enough to chain, never enough to reach what a jump cannot, so no
room's proved reach budget is quietly broken by an enemy standing in it.
Tested before the lunge, so jumping at one is the right answer rather than
a gamble, and it does not also count as being hit.

**The flag** (DESIGN.md §4.2) replaces the plain exit gate. It builds in
three phases as Eeri closes — base plate, pole, cloth — a puff of smoke
each, and finishes by being **run past**: no button, no stopping on a mark.
Level 3 of a world flies a bigger one in a different colour. Behind the
asset seam like everything else (`phase0/1/2` + `pole`).

Gate: 144 checks, plus 29 in the room prover. Five of the new ones run in a
real landscape-phone context rather than a forced-visible desktop — the
badge check earned itself immediately by catching Ⓑ underneath the Toko
signature, the same collision v6 fixed once for jump.

## v6 — 2026-08-13
**The parts kit, and rooms that can be finished.** Rooms were a hand-drawn
grid plus half a dozen side-arrays that could disagree with it — the pit
was declared twice, the bank twice, and nothing anywhere checked that a
machine could actually reach the thing it was supposed to clear. That is
where "you get stuck pretty fast" came from.

`js/parts.js` is the palette, and it is the method flashprince already
proved, ported rather than copied. There a room is twenty by twelve
characters and `editor.js` paints it from a named brush strip, because
"the character IS the data". Eeri's rooms scroll and carry MACHINES, so a
room here is a LIST OF PARTS and each part declares its rules once: what
it stamps into the map, what it demands of whoever arrives, and which
verb removes it. `js/rooms.js` is the whole game as three such lists.

**And the piece flashprince never had.** Its level distances are measured
off a written budget — a running jump carries 3.7 tiles, so a 3-tile gap
goes and a 4-tile gap does not — but nothing checks a room against it;
you find out by playing. Eeri gets the budget as numbers computed off
`kid.js` rather than guessed (jump apex 12.6²/60 = **2.65 tiles**, so a
2-tile step goes and 3 does not; a run carries **4.85**, so a 4-tile gap
goes and 5 does not) AND the check. `test/rooms.mjs` walks every room
from spawn to exit in plain Node — no browser, the shape of gameoflife's
`check_levels.mjs` — and a room that cannot be finished fails the build.
It carries eight rooms broken on purpose, one way each, so a prover that
cannot fail cannot pass unnoticed: a step too tall, a gap too wide, a
lock with no machine, **a machine penned from its own job by a hole**,
an obstacle outside its machine's reach, a machine spawned off its own
track, a robot patrolling across a hole.

**Machines have an A-to-B track now**, declared per room, and the check
holds the room to it: the track may not be cut by a hole, and every
obstacle the machine is meant to clear must lie within arm's reach of
somewhere on it. That single rule is what stops the class of soft-lock.

**SITE 3 — the wall, and the third verb.** A wrecking crane
(`js/crane.js`), on the excavator's exact node contract so a live GLB
drops in behind the same check and the same paint map. The brief had this
machine down as a *hazard boss*; the owner's direction moves it, and it
is the game's thesis in one object — the ball that swings at you unmanned
is the ball you swing at the wall once the cab is yours. The brick wall
(`Wall` in `js/pieces.js`) is the third manipulable piece: intact →
cracked → rubble, honouring §5.1's rule that rubble is a different
silhouette and not a shorter wall, and its rows leave the MAP when it
comes down, the same honesty as the dig and the span.

**Small things to avoid** (`js/robots.js`). A robot patrols a span the
kit guarantees is floor, notices, winds up, then lunges — flashprince's
sentry clock compressed, so it is a reading test rather than a reflex
test. A steam vent breathes on a fixed clock with a lit collar before it
blows. The cost is the Yoshi rule, unchanged: a hit takes the RIDE, not
the run, and a machine drives straight over a robot.

**Touch, fixed.** The Toko badge sat on top of the jump button — inert
per the house rule, but covering the one control the game is played with;
on a coarse pointer it now clears the whole button row. And every hint
named keyboard keys to a thumb that has none, so there is a touch string
set: `◀ ▶ — RUN · ▲ — JUMP`.

Found on the way: `window.__eeri.exc` was captured once at boot, so after
a room change the handle still pointed at the machine you had left — the
test that placed the kid beside "the machine" was standing him next to
one in another room. It is a getter now.

Gate: 115 checks, plus 29 in `test/rooms.mjs` (21 over the real rooms,
8 proving the prover bites).

## v5 — 2026-08-13
**The art lands, and the game goes up on the floor.** The seam built in
v1 did its job: five layer paintings and the excavator swapped from code
placeholder to file with a status flip, and no game code changed to
accept them. The excavator GLB honours the rig contract exactly — every
contracted node present, and its rest pose, pivots and node translations
match the placeholder to three decimals, so `house.y = 0.86`, the 0.52
boom and the −1.35 stick all land where the code already reached for
them. Its `wheels` node ships without the child spinners the placeholder
had, so the wheels do not roll; everything else animates.

**Two house rules had to be enforced at the seam rather than assumed.**
The model arrived with five baked photo-texture materials at metallic
0.5 — and §3.2 makes "one palette, one material language" a make-or-break
rule, not a preference, precisely because the risk in a 2D/3D game is the
cast and the world reading as two different games. It rendered rust-brown
against a brown hoarding and stopped being safety yellow. So a model
entry may now carry a `paint` map (node → palette role) and `assets.js`
replaces its materials with flat palette colours, keeping every bit of
geometry and rig. The node contract was already enforced there; the
surface is now too. Omit `paint` to ship an asset's own materials.

The fore painting was composed against the **old** occluder rect
(y −1…5), which v4 corrected to −2…14 so a foreground can actually be
cropped by the top of the frame. `art-src/tools/recanvas-fore.mjs` moves
it onto the taller canvas **at the exact world position it was painted
for** — the same pixels, the same world units, simply with room above
them. Its sibling tool pinned an absolute path into a scratch directory
and stopped working when that session ended; this one resolves playwright
through CJS instead, since ESM does not honour `NODE_PATH`.

**Deployed.** The cabinet was lit on the hub and pointed at `eeri/`,
which did not exist on `gh-pages` — Play was a 404. The game, the
catalogue entry and the `worksite` marquee are on the site now, merged
into the site's own `games.js`/`art.js` rather than overwriting them
(the site carries `tokotrip`, which this branch does not, and an
overwrite deletes a cabinet). `deploy-hub.mjs` renumbered every token
from one map, and its guard caught that the site's `hub.js` had grown a
WebXR floor sort this branch never had — brought back before deploying,
or the deploy would have deleted it.

**The textures the model never showed are gone.** Every one of its five
textured materials is covered by the paint map, so those images were
bytes the browser downloaded, decoded into blob URLs and threw away —
and each was an async load still in flight when the hub gate opened the
game and moved on, which is how they were found: a `Couldn't load
texture blob:` error that only Eeri produced.
`art-src/tools/strip-textures.mjs` removes them and compacts the buffer;
it refuses to run if any textured material is NOT repainted, since then
stripping would change what is on screen. Geometry, tri count, node
names, rest pose and pivots are untouched, and the frame is
pixel-identical. 924 → 851 KB.

Known, and the asset producer's call: at 851 KB and 8 740 triangles the
excavator is over the brief's ceilings (400 KB, and 3 000 tris for a
small machine / 6 000 for a big set-piece) — the weight is geometry, not
textures, so it wants decimating rather than re-exporting. Its `wheels`
node has no child spinners, so the wheels do not roll. And the fore
painting still sits below the playfield ground line, so it reads as a
band along the bottom rather than something you pass behind.

Gate: 98 checks, plus 13 against the deployed tree.

## v4 — 2026-08-13
**The depth pass — the Tropical Freeze half, which needs no cast.** The
3D characters are blocked on the Meshy pipeline, so this version moves
the other half of the confirmed reference pair: "2D gameplay, fully 3D
layered world — dramatic depth, the camera drifting on rails, background
layers where things happen, heavy-object weight." None of that needs a
model. It was judged the way the method says — render, LOOK, name what is
wrong, redo — and the LOOK named three things:

**A third of every frame was dead flat brown.** The earth below the lip
was one unbroken slab: the largest area on screen carrying no
information, which is the one thing the reference never does. It is a
cut section now — strata darkening downward, cobbles embedded in the
face, a fresh cut edge drawn either side of every hole, and a hard
shadow under the grass lip, because the lane the game is played on was a
0.14-tile hairline against a flat wall. The bank bands the same way; it
is the room's most important object and it read as a box.

**The occluder lane was buried.** Its rect stopped at y=5 — one tile
above the ground line — so a foreground piece physically could not reach
the top of the frame, and the one girder in it floated inside the dirt.
The "cropped foreground = depth" lesson was written in the brief and
absent from the screen. The rect runs −2…14 now, the whole visible band
at that depth, and carries a real kit: scaffold standards you pass
behind, spoil sweeping the bottom edge, a pipe run crossing above
everything. Two things it got wrong first and the README now states: a
big shape parked at eye level is a blob with the game hidden behind it
(the cable drums were 1.25-unit discs at head height), and a heap whose
crest sits below the playfield's ground line reads as a hole cut in the
earth rather than a mound in front of it.

**The background competed instead of receding.** A haze band sits the far
stack in air, and the skyline lost its internal contrast — crisp two-tone
blocks at that distance read as near and fought the playfield.

Plus the two things the reference has that a spring does not.
**`js/camera.js` is a director**: a site declares SHOTS — zones with
their own dolly, height and lead — and the camera blends across them, so
a room pulls back where it is asking you to read a lock and closes in
where it is not. Over that sit a slow **drift**, so the frame is never
dead still, and a **punch** — a short dolly kick on the dig, the sling,
the span seating and every hit, which is what weight looks like from
behind a camera. And **the background works**: a crane traverses a load
across the skyline and a truck crosses the far road, where before one
digging machine was one event in ninety-six tiles.

**The seam, hardened, because asset input has started.** Art contributes
files to `assets/` and a status flip, nothing else — so the gate now
refuses a manifest path that climbs out of that folder, and measures a
live PNG's pixels against its documented size rather than letting it
stretch silently onto the plane. The size table in `assets/README.md` is
the brief an artist paints to, so it is checked against `LAYER_RECTS` ×
`PPU` in code rather than trusted to have been kept up by hand. Both
guards were verified by feeding the gate bad input and watching it fail.

Gate: 93 checks.

## v3 — 2026-08-13
**The level beyond one room.** Walking through the gate now leads
somewhere: sites are data (`SITES` in `js/level.js` — map, bolts, spawns,
exit, and which lock the room carries), one `buildSite()` builds a room
into a single group and tears the old one down whole, the kid and the
machine persist, and the camera **cuts** to the new room — a slow pan
across a rebuilt world is a lie about geography. Each room's machine
starts unmanned again: taming does not carry between sites, so the mount
is read every time, which is the point of it.

Site 2 is **the girder** — the second manipulable piece, its contract
already waiting in the manifest: stacked → slung → seated as a span. The
gap is eight tiles, past *both* of them — the kid's jump falls short and
the machine refuses the cliff. The same gesture as the dig works it the
other way round: hold the bucket in the stack and the chains take the
load (the machine drives at ×0.55 while carrying — a machine earns its
slowness); lower it at the lip and the span seats, filling the MAP row
the way the dig cleared one, so the bridged gap is a fact about the
level. The kid crosses on foot, because the exit is his half of the job.

Found by LOOKING, not by the gate: a slung load hung a fixed length
under the bucket and **sank into the ground** when the boom came down —
now the chains go slack and the load rests, never sinks (the rest depth
is measured off the asset's own bounding box, so a live GLB keeps the
behaviour). Found the flaky way: the GPU-less sandbox runs the clock
~5× slow, so a mount that takes 0.55 s of game time takes ~3 s of wall
clock — the test's retry loop now walks back up and gives each attempt
real time, and the crossing is asserted mid-span instead of demanding a
36-tile walk inside a wall-clock timeout.

Gate: 65 checks.

## v2 — 2026-08-13
**The loop.** v1 had systems and no game: riding was strictly worse than
walking (45% slower, no jump, a five-times wider body), the boom was a
verb with no object, and the room had no reason to go right. v2 is the
answer, and it is the owner's: **a machine is dangerous until it is
yours, and the room is a lock the machine opens.**

The excavator now starts **unmanned** — amber beacon turning, working its
own slow dig cycle. It is not hunting Eeri; it is heavy and blind, and
standing under the bucket while it sweeps puts him down. The lift is the
window, so **mounting is the skill test**: read the cycle, take the step,
and the beacon goes out — the threat is now the tool, permanently.

The room is two obstacles, each shaped for exactly one of them. **The
pit** is kid-shaped: he clears it in a run, and the machine refuses a
cliff. **The bank** is machine-shaped: three tiles of dirt above his
jump, taken down a row at a time by holding the bucket in it. Digging
edits the **map**, not the picture, so the level really changed; the
bank's cut face and spill are drawn per state (`js/pieces.js`, behind the
same asset seam as everything else, contract `state0/1/2`). Walking out
through the gate the machine opened is SITE CLEAR.

Fixed on the way: a queued `action` press was consumed again the instant
riding began, so a player who mashed E climbed in and fell straight back
out — the same double-consume trap Suds Jack paid for, now drained at
both edges. The HUD moved to the top-right; it had been sitting under
`hub/shell.js`'s HOME button, unreadable, in every screenshot.

Gate: 49 checks.

## v1 — 2026-08-12
Gate-1 diorama slice, asset-ready. The full layer stack (sky / skyline /
far / mid / near / foreground occluders) as code-painted cutouts at real
z-depths behind a 24° long-lens camera; tile-grid level with collision
(ground, mounds, steel platforms, a pit, a girder); Eeri on foot (run /
buffered+coyote jump / hard-landing squash); the excavator as first mount
(E to climb in via the step, drive with heavy ease, W/S boom on real
hinges, hop out); 19 bolt spinners to collect; a depth-tinted background
excavator working a dig loop on the far layer; blob shadows, exhaust
puffs, touch buttons. **The asset seam is live:** `assets/manifest.json` +
`js/assets.js` — every model and 2D layer swaps from code placeholder to
PNG/GLB file with a one-word manifest edit against the node contracts in
`assets/README.md`.

The first hazard is in and it sets the pattern: a wrecking ball hangs dead
still until you come near, then **winds back** — chevrons pulsing, one
warning tone — and only then swings. Nothing here kills; the cost is the
**Yoshi rule**, a hit takes the RIDE (thrown clear of the cab) and never
the run, with mercy frames on foot. A synth kit carries it, including a
diesel bed whose pitch rises with the machine's load, and the arcade
cabinet (`worksite` cover), the way home and the Toko signature are
mounted. `prefers-reduced-motion` stills the decorative background
machine and holds the chevrons steady instead of flashing.

Not yet: more machines, more world themes, the level beyond one room.

---

# The art lineage's log (archived, 2026-08-14)

These are the entries the **`gh-pages` lineage** wrote while it had no
common ancestor with `main` — the craft material kit, the crafted layer
set, the paper sky, the painted machines. They are kept verbatim because
they are the only record of how that art got made, and because their
numbers **collide with the entries above**: this file's v1–v11 and these
v1–v11 are different work. Everything from **v12 up is one tree**.

## v11 — 2026-08-13 — the machines are painted wood, and the map tool is fixed

**The excavator was still smooth plastic in a crafted world**, and chasing it
found two independent causes plus a bug in the tool that makes every map.

1. **An imported GLB carries its own UV atlas.** `craftBox`'s world-space UV
   trick is only available to geometry we build, so on a live model a
   repeating map stretched ONE copy of the brushwork across the whole
   machine. The paint path now tiles across the atlas explicitly (repeat 9),
   on a cloned texture — repeat lives on the Texture, and the cached one is
   shared with every other surface asking for balsa.
2. **The placeholder machines built boxes directly.** `excavator.js`,
   `crane.js`, `pieces.js` and `robots.js` each had a local
   `new THREE.Mesh(new THREE.BoxGeometry(...), M(c))`, which gets the shared
   material but none of the UV density. All four route through `craftBox`
   now.
3. **`detailmap.mjs` scaled contrast about the MEAN**, which preserves the
   source photo's own contrast. That is fine for corrugated card (luminance
   40…230) and useless for a white-painted board (230…250): the balsa map
   came out ±4% however high the strength went. It does a **histogram
   stretch** now — 5th to 95th percentile onto a fixed band — so a map's
   contrast is a property of the REQUEST, not of how well lit the source
   happened to be. Every material was rebuilt through it; felt and balsa
   only became visible at all after this.

The lesson generalises past this project: **normalising by mean preserves
the source's contrast; normalising by range sets it.** A tool that takes a
"strength" argument and ignores it for low-contrast inputs is worse than one
with no argument, because it looks like it is working.

Gate: 134 checks + 29 room prover.

## v10 — 2026-08-13 — a material KIT, not cardboard everywhere

**Crafted World is a kit of materials and the first pass used card for all of
it.** `js/craft.js` is now the one factory every surface is made through, and
the manifest's `textures` block is the palette: `flute` (the cut edge of
corrugated card, stacked fluting) for the earth section and every dug face,
`card` (kraft liner) for flat card, `felt` for the grass lip, `balsa`
(painted wood, brush strokes and a paint chip) for machines, girders and
props — §3.3's "painted wood and pressed steel". Each is a greyscale map
multiplied onto a palette colour, so §3.2 holds exactly.

**The ground is the headline.** It was flat brown, then card with a faint
grain, and it is now visibly a CUT THROUGH STACKED CORRUGATED CARD — which is
what a cut earth section is in this reference. The strata banding the depth
pass established still reads through it; the flute strength was pulled from
0.62 to 0.5 precisely so it would.

**Two failures worth recording.** A probe of the live scene found **3
materials mapped and about 70 not**: every module had grown its own
`const M = (c) => new MeshLambertMaterial(...)`, so the grass lip, both
machines and every prop were still flat paint while the ground behind them
was card. Patching call sites would have left the next one to be written
flat, so `craft.js` replaced all of them — 128 materials now carry their
material, and the ones that do not are the beacon lamp, shadows and glass,
which must stay bare. And the first maps were far too weak: ±20% variation,
which Lambert then flattens further. A material you have to be told is there
is not doing its job.

Also fixed: the sky's remaining magenta. **Magenta is the only thing where r
AND b both exceed g** — yellow, orange, kraft and cream all have b < g, and
cotton is neutral — so the despill needs no threshold and cannot eat a real
colour. 2.04% of pixels carried a pink cast; now 0.004%.

And the gate learned to refuse a manifest block containing a stray note: a
bare `_note` string beside the texture entries made the seam-scope check
resolve a path on `undefined` and killed the whole run with
`ERR_INVALID_ARG_TYPE` instead of naming the problem.

Gate: 134 checks + 29 in the room prover.

## v9 — 2026-08-13 — one build: design v6 × the crafted art, and a paper sky

**The two lineages are one tree again, and the numbering jumps to v9 to
clear both sides' collided v6–v8.** Base: the design branch's v6 (parts kit,
provable rooms via `test/rooms.mjs`, the crane, the wall, robots and vents,
touch fixes). Carried onto it, from the art branch's v6–v8: the Meshy-rigged
animated Eeri behind a `rig: "skinned"` seam with `height` in tiles, the
crafted `_v2` layer set, the playfield card grain (`getTexture`, world-space
UVs), and the kid's palette. The design gate — 116 checks + 29 in the room
prover — passes over the merged tree with all art live.

**And the sky joins the crafted register** (owner's direction: the cardboard
look belongs on the backgrounds, and the sky was the last smooth code paint
on screen). `groundworks_sky_v1.png`: the palette's own gradient × a paper
grain used as LUMINANCE only (§3.2 — no asset invents a colour), COTTON WOOL
cloud cutouts tiled sparsely with a per-tile drift, and ONE construction-
paper sun with a split pin. Built by `art-src` tooling from two free nano
generations; `drawSky` stays as the code placeholder behind the same seam as
every other layer, and the gate now measures the sky PNG like the rest.

Three lessons from the sky, kept in the tool:
- **A prop sheet must forbid its own backing.** The first sheet put the
  props on a kraft board the keyer cannot remove; "directly on the magenta,
  NO board" fixed it.
- **A naively tiled sheet grows a second sun.** The sun is cropped out and
  stamped exactly once; two suns is a broken toy, not a whimsical one.
- **Cotton needs a tighter despill than card.** Bright pixels put the
  generic clamp above 255 where it does nothing, and the wisps kept pink
  rims; a sheet with no legitimate pinks can clamp r/b hard to green+10,
  plus an alpha rolloff on strong spill.

## v6 (design lineage) — 2026-08-13
**The parts kit, and rooms that can be finished.** Rooms were a hand-drawn
grid plus half a dozen side-arrays that could disagree with it — the pit
was declared twice, the bank twice, and nothing anywhere checked that a
machine could actually reach the thing it was supposed to clear. That is
where "you get stuck pretty fast" came from.

`js/parts.js` is the palette, and it is the method flashprince already
proved, ported rather than copied. There a room is twenty by twelve
characters and `editor.js` paints it from a named brush strip, because
"the character IS the data". Eeri's rooms scroll and carry MACHINES, so a
room here is a LIST OF PARTS and each part declares its rules once: what
it stamps into the map, what it demands of whoever arrives, and which
verb removes it. `js/rooms.js` is the whole game as three such lists.

**And the piece flashprince never had.** Its level distances are measured
off a written budget — a running jump carries 3.7 tiles, so a 3-tile gap
goes and a 4-tile gap does not — but nothing checks a room against it;
you find out by playing. Eeri gets the budget as numbers computed off
`kid.js` rather than guessed (jump apex 12.6²/60 = **2.65 tiles**, so a
2-tile step goes and 3 does not; a run carries **4.85**, so a 4-tile gap
goes and 5 does not) AND the check. `test/rooms.mjs` walks every room
from spawn to exit in plain Node — no browser, the shape of gameoflife's
`check_levels.mjs` — and a room that cannot be finished fails the build.
It carries eight rooms broken on purpose, one way each, so a prover that
cannot fail cannot pass unnoticed: a step too tall, a gap too wide, a
lock with no machine, **a machine penned from its own job by a hole**,
an obstacle outside its machine's reach, a machine spawned off its own
track, a robot patrolling across a hole.

**Machines have an A-to-B track now**, declared per room, and the check
holds the room to it: the track may not be cut by a hole, and every
obstacle the machine is meant to clear must lie within arm's reach of
somewhere on it. That single rule is what stops the class of soft-lock.

**SITE 3 — the wall, and the third verb.** A wrecking crane
(`js/crane.js`), on the excavator's exact node contract so a live GLB
drops in behind the same check and the same paint map. The brief had this
machine down as a *hazard boss*; the owner's direction moves it, and it
is the game's thesis in one object — the ball that swings at you unmanned
is the ball you swing at the wall once the cab is yours. The brick wall
(`Wall` in `js/pieces.js`) is the third manipulable piece: intact →
cracked → rubble, honouring §5.1's rule that rubble is a different
silhouette and not a shorter wall, and its rows leave the MAP when it
comes down, the same honesty as the dig and the span.

**Small things to avoid** (`js/robots.js`). A robot patrols a span the
kit guarantees is floor, notices, winds up, then lunges — flashprince's
sentry clock compressed, so it is a reading test rather than a reflex
test. A steam vent breathes on a fixed clock with a lit collar before it
blows. The cost is the Yoshi rule, unchanged: a hit takes the RIDE, not
the run, and a machine drives straight over a robot.

**Touch, fixed.** The Toko badge sat on top of the jump button — inert
per the house rule, but covering the one control the game is played with;
on a coarse pointer it now clears the whole button row. And every hint
named keyboard keys to a thumb that has none, so there is a touch string
set: `◀ ▶ — RUN · ▲ — JUMP`.

Found on the way: `window.__eeri.exc` was captured once at boot, so after
a room change the handle still pointed at the machine you had left — the
test that placed the kid beside "the machine" was standing him next to
one in another room. It is a getter now.

Gate: 115 checks, plus 29 in `test/rooms.mjs` (21 over the real rooms,
8 proving the prover bites).

## v5 — 2026-08-13
**The art lands, and the game goes up on the floor.** The seam built in
v1 did its job: five layer paintings and the excavator swapped from code
placeholder to file with a status flip, and no game code changed to
accept them. The excavator GLB honours the rig contract exactly — every
contracted node present, and its rest pose, pivots and node translations
match the placeholder to three decimals, so `house.y = 0.86`, the 0.52
boom and the −1.35 stick all land where the code already reached for
them. Its `wheels` node ships without the child spinners the placeholder
had, so the wheels do not roll; everything else animates.

**Two house rules had to be enforced at the seam rather than assumed.**
The model arrived with five baked photo-texture materials at metallic
0.5 — and §3.2 makes "one palette, one material language" a make-or-break
rule, not a preference, precisely because the risk in a 2D/3D game is the
cast and the world reading as two different games. It rendered rust-brown
against a brown hoarding and stopped being safety yellow. So a model
entry may now carry a `paint` map (node → palette role) and `assets.js`
replaces its materials with flat palette colours, keeping every bit of
geometry and rig. The node contract was already enforced there; the
surface is now too. Omit `paint` to ship an asset's own materials.

The fore painting was composed against the **old** occluder rect
(y −1…5), which v4 corrected to −2…14 so a foreground can actually be
cropped by the top of the frame. `art-src/tools/recanvas-fore.mjs` moves
it onto the taller canvas **at the exact world position it was painted
for** — the same pixels, the same world units, simply with room above
them. Its sibling tool pinned an absolute path into a scratch directory
and stopped working when that session ended; this one resolves playwright
through CJS instead, since ESM does not honour `NODE_PATH`.

**Deployed.** The cabinet was lit on the hub and pointed at `eeri/`,
which did not exist on `gh-pages` — Play was a 404. The game, the
catalogue entry and the `worksite` marquee are on the site now, merged
into the site's own `games.js`/`art.js` rather than overwriting them
(the site carries `tokotrip`, which this branch does not, and an
overwrite deletes a cabinet). `deploy-hub.mjs` renumbered every token
from one map, and its guard caught that the site's `hub.js` had grown a
WebXR floor sort this branch never had — brought back before deploying,
or the deploy would have deleted it.

**The textures the model never showed are gone.** Every one of its five
textured materials is covered by the paint map, so those images were
bytes the browser downloaded, decoded into blob URLs and threw away —
and each was an async load still in flight when the hub gate opened the
game and moved on, which is how they were found: a `Couldn't load
texture blob:` error that only Eeri produced.
`art-src/tools/strip-textures.mjs` removes them and compacts the buffer;
it refuses to run if any textured material is NOT repainted, since then
stripping would change what is on screen. Geometry, tri count, node
names, rest pose and pivots are untouched, and the frame is
pixel-identical. 924 → 851 KB.

Known, and the asset producer's call: at 851 KB and 8 740 triangles the
excavator is over the brief's ceilings (400 KB, and 3 000 tris for a
small machine / 6 000 for a big set-piece) — the weight is geometry, not
textures, so it wants decimating rather than re-exporting. Its `wheels`
node has no child spinners, so the wheels do not roll. And the fore
painting still sits below the playfield ground line, so it reads as a
band along the bottom rather than something you pass behind.

Gate: 98 checks, plus 13 against the deployed tree.

## v4 — 2026-08-13
**The depth pass — the Tropical Freeze half, which needs no cast.** The
3D characters are blocked on the Meshy pipeline, so this version moves
the other half of the confirmed reference pair: "2D gameplay, fully 3D
layered world — dramatic depth, the camera drifting on rails, background
layers where things happen, heavy-object weight." None of that needs a
model. It was judged the way the method says — render, LOOK, name what is
wrong, redo — and the LOOK named three things:

**A third of every frame was dead flat brown.** The earth below the lip
was one unbroken slab: the largest area on screen carrying no
information, which is the one thing the reference never does. It is a
cut section now — strata darkening downward, cobbles embedded in the
face, a fresh cut edge drawn either side of every hole, and a hard
shadow under the grass lip, because the lane the game is played on was a
0.14-tile hairline against a flat wall. The bank bands the same way; it
is the room's most important object and it read as a box.

**The occluder lane was buried.** Its rect stopped at y=5 — one tile
above the ground line — so a foreground piece physically could not reach
the top of the frame, and the one girder in it floated inside the dirt.
The "cropped foreground = depth" lesson was written in the brief and
absent from the screen. The rect runs −2…14 now, the whole visible band
at that depth, and carries a real kit: scaffold standards you pass
behind, spoil sweeping the bottom edge, a pipe run crossing above
everything. Two things it got wrong first and the README now states: a
big shape parked at eye level is a blob with the game hidden behind it
(the cable drums were 1.25-unit discs at head height), and a heap whose
crest sits below the playfield's ground line reads as a hole cut in the
earth rather than a mound in front of it.

**The background competed instead of receding.** A haze band sits the far
stack in air, and the skyline lost its internal contrast — crisp two-tone
blocks at that distance read as near and fought the playfield.

Plus the two things the reference has that a spring does not.
**`js/camera.js` is a director**: a site declares SHOTS — zones with
their own dolly, height and lead — and the camera blends across them, so
a room pulls back where it is asking you to read a lock and closes in
where it is not. Over that sit a slow **drift**, so the frame is never
dead still, and a **punch** — a short dolly kick on the dig, the sling,
the span seating and every hit, which is what weight looks like from
behind a camera. And **the background works**: a crane traverses a load
across the skyline and a truck crosses the far road, where before one
digging machine was one event in ninety-six tiles.

**The seam, hardened, because asset input has started.** Art contributes
files to `assets/` and a status flip, nothing else — so the gate now
refuses a manifest path that climbs out of that folder, and measures a
live PNG's pixels against its documented size rather than letting it
stretch silently onto the plane. The size table in `assets/README.md` is
the brief an artist paints to, so it is checked against `LAYER_RECTS` ×
`PPU` in code rather than trusted to have been kept up by hand. Both
guards were verified by feeding the gate bad input and watching it fail.

Gate: 93 checks.

## v3 — 2026-08-13
**The level beyond one room.** Walking through the gate now leads
somewhere: sites are data (`SITES` in `js/level.js` — map, bolts, spawns,
exit, and which lock the room carries), one `buildSite()` builds a room
into a single group and tears the old one down whole, the kid and the
machine persist, and the camera **cuts** to the new room — a slow pan
across a rebuilt world is a lie about geography. Each room's machine
starts unmanned again: taming does not carry between sites, so the mount
is read every time, which is the point of it.

Site 2 is **the girder** — the second manipulable piece, its contract
already waiting in the manifest: stacked → slung → seated as a span. The
gap is eight tiles, past *both* of them — the kid's jump falls short and
the machine refuses the cliff. The same gesture as the dig works it the
other way round: hold the bucket in the stack and the chains take the
load (the machine drives at ×0.55 while carrying — a machine earns its
slowness); lower it at the lip and the span seats, filling the MAP row
the way the dig cleared one, so the bridged gap is a fact about the
level. The kid crosses on foot, because the exit is his half of the job.

Found by LOOKING, not by the gate: a slung load hung a fixed length
under the bucket and **sank into the ground** when the boom came down —
now the chains go slack and the load rests, never sinks (the rest depth
is measured off the asset's own bounding box, so a live GLB keeps the
behaviour). Found the flaky way: the GPU-less sandbox runs the clock
~5× slow, so a mount that takes 0.55 s of game time takes ~3 s of wall
clock — the test's retry loop now walks back up and gives each attempt
real time, and the crossing is asserted mid-span instead of demanding a
36-tile walk inside a wall-clock timeout.

Gate: 65 checks.

## v2 — 2026-08-13
**The loop.** v1 had systems and no game: riding was strictly worse than
walking (45% slower, no jump, a five-times wider body), the boom was a
verb with no object, and the room had no reason to go right. v2 is the
answer, and it is the owner's: **a machine is dangerous until it is
yours, and the room is a lock the machine opens.**

The excavator now starts **unmanned** — amber beacon turning, working its
own slow dig cycle. It is not hunting Eeri; it is heavy and blind, and
standing under the bucket while it sweeps puts him down. The lift is the
window, so **mounting is the skill test**: read the cycle, take the step,
and the beacon goes out — the threat is now the tool, permanently.

The room is two obstacles, each shaped for exactly one of them. **The
pit** is kid-shaped: he clears it in a run, and the machine refuses a
cliff. **The bank** is machine-shaped: three tiles of dirt above his
jump, taken down a row at a time by holding the bucket in it. Digging
edits the **map**, not the picture, so the level really changed; the
bank's cut face and spill are drawn per state (`js/pieces.js`, behind the
same asset seam as everything else, contract `state0/1/2`). Walking out
through the gate the machine opened is SITE CLEAR.

Fixed on the way: a queued `action` press was consumed again the instant
riding began, so a player who mashed E climbed in and fell straight back
out — the same double-consume trap Suds Jack paid for, now drained at
both edges. The HUD moved to the top-right; it had been sitting under
`hub/shell.js`'s HOME button, unreadable, in every screenshot.

Gate: 49 checks.

## v1 — 2026-08-12
Gate-1 diorama slice, asset-ready. The full layer stack (sky / skyline /
far / mid / near / foreground occluders) as code-painted cutouts at real
z-depths behind a 24° long-lens camera; tile-grid level with collision
(ground, mounds, steel platforms, a pit, a girder); Eeri on foot (run /
buffered+coyote jump / hard-landing squash); the excavator as first mount
(E to climb in via the step, drive with heavy ease, W/S boom on real
hinges, hop out); 19 bolt spinners to collect; a depth-tinted background
excavator working a dig loop on the far layer; blob shadows, exhaust
puffs, touch buttons. **The asset seam is live:** `assets/manifest.json` +
`js/assets.js` — every model and 2D layer swaps from code placeholder to
PNG/GLB file with a one-word manifest edit against the node contracts in
`assets/README.md`.

The first hazard is in and it sets the pattern: a wrecking ball hangs dead
still until you come near, then **winds back** — chevrons pulsing, one
warning tone — and only then swings. Nothing here kills; the cost is the
**Yoshi rule**, a hit takes the RIDE (thrown clear of the cab) and never
the run, with mercy frames on foot. A synth kit carries it, including a
diesel bed whose pitch rises with the machine's load, and the arcade
cabinet (`worksite` cover), the way home and the Toko signature are
mounted. `prefers-reduced-motion` stills the decorative background
machine and holds the chevrons steady instead of flashing.

Not yet: more machines, more world themes, the level beyond one room.

---

# The levels lineage's log (archived, 2026-08-14)

The entries `claude/eeri-platformer-levels-dtfh0x` wrote while it had no
common ancestor with `main` — the checkpoint, the generosity numbers, the
gizmo kit. Kept verbatim because they are the only record of how that work
was reasoned about, and because **their v9-v13 collide with the entries
above**. Everything from **v14 up is one tree**.

## v13 — 2026-08-14 — the gizmo kit starts, and it stops at the tile line

**"Gizmos are the third source of variety and cost the least" (DESIGN §2) —
and they are also what makes twelve levels possible, because one idea per
level means the kit IS the level count.** Two of them, and both are
TILE-NATIVE, which is why they cost almost nothing: a **belt** is a floor
that moves you (2.6 tiles/s, and it moves the FLOOR — your own speed is
untouched, so you keep full control on ground that disagrees with you), and a
**tarp** is a floor that throws you (5.1 tiles, about twice the 2.65 a jump
reaches). Each stamps like any other part and the whole behaviour is one hook
in the player's step. A belt carries its direction in its own character —
`C` runs right, `c` runs left — so a belt cannot disagree with itself, and
the chevrons on top say which way while it is standing still.

**Where the kit stops, and why it is a line rather than a pause.** The
gizmos that must MOVE — a hoist platform, a tipping plank, a swinging hook —
are a much larger job, because every solid in this game is a TILE and a
moving platform cannot be one. That wants an entity with its own collision
pass and carry logic. It is named here so the next session knows the kit
stopped deliberately rather than ran out of steam.

**The lab, and why it is not a level.** One idea per level means a new gizmo
cannot be dropped into levels 1–3 without making each of them two levels — so
the kit is proved in `LAB` (`js/rooms.js`), the standalone reference the way
toko-drop keeps `enemy-lab.html`, and spent on levels 4–6, which are due a
world-2 backdrop anyway. It is buildable but **never in the sequence**:
`SITES` is what a room index means, `ROOMS` is what the game runs through,
and one derived constant separates them rather than two lists that can
disagree. `__eeri.debug.goLab()` opens it. It is held to every structural
rule a level is — a hundred bolts, three golden, a checkpoint, a flag — and
to none of the shape rules, because its length is whatever proving the kit
takes.

**Found immediately, and it is the general lesson:** the lab reported its own
bolts unreachable. The reach model was written when a jump was the only way
to gain height, so a trail four tiles above a tarp — which throws you five —
read as hung in the sky. **Anything a gizmo adds to the player's reach has to
be added to the model too, or the check starts refusing correct rooms, which
is worse than not checking at all.** The tarp is in the model now; the next
gizmo that moves the player will have to be.

Both gizmos are held to the one way each goes wrong: a belt may not **hand
you to a cell with no floor** — a jump you got wrong is yours, a belt you
were standing on is not — and a tarp must have the **headroom** to throw you
into, because a bounce into a ceiling reads as the game taking the move back.
Both rules bite in `test/rooms.mjs`.

**Three bugs the lab found in code that was already shipping**, which is what
a lab is for:

- **A room with no machine crashed the game.** Levels 1–3 each park one, so
  `exc` was read unguarded all through the foot branch; the lab is a
  platforming room with nothing to ride, and it threw on its first frame.
  A crash inside `setAnimationLoop` is total and silent — every later frame
  throws, the game freezes, and the screen says nothing.
- **Variable jump height was cutting rises the player never asked for.**
  Releasing jump clamps the climb at 4, and that clamp ran on *every* upward
  velocity: a tarp's 17.5 and a stomp's 10.08 were both cut on the next frame
  unless a button they have nothing to do with happened to be held. The tarp
  measured **2.47 tiles instead of 5.1**, and the stomp's bounce silently
  depended on the jump button. A rise the player did not ask for is not
  theirs to cut, so the clamp now applies to jumps only.
- **The gate positioned the kid before a room change had settled.** `site()`
  flips as soon as the index is assigned, while `goSite()` still has to put
  him on the new spawn — so a `setPos` fired the instant it flipped was
  overwritten a frame later, and the mount failed with the machine standing
  right beside him. `debug.transitioning()` is exposed and every room wait
  settles on it.

Measured in the lab afterwards: the belt carries 1.1 tiles a second of
standing still with `vx` untouched, and the tarp lifts **4.8 tiles** against
the 5.1 the model predicts — the difference is frame discretisation, and the
model keeps the honest number rather than the flattering one.

Gate: 75 checks in the room prover, and the browser gate proves both gizmos
by standing still on them — anything that happens is the gizmo's doing.

## v12 — 2026-08-14 — the generosity rules become numbers

**Three telegraphs were under the floor the design sets, and nothing could
see it.** DESIGN §4.1 is explicit and it is about a six-year-old — *telegraph
≥ 1.0 s before anything can touch you* — while the skitter warned for
**0.80 s** (notice 0.35 + wind 0.45), the steam vent for **0.55 s** and the
wrecking ball for **0.85 s**. The rule lived in a document and the numbers
lived in three different modules, which is the whole reason it drifted.

So the clocks moved into `parts.js`, beside the reach budget, and `robots.js`
and `hazards.js` import them rather than keeping their own: skitter
0.45 + 0.62 = **1.07 s**, vent **1.05 s**, ball **1.05 s**. The room prover
holds all three to the floor. **A hopper is exempt and the reason is stated
rather than assumed**: the floor is about things that BECOME dangerous, and a
hopper is dangerous continuously and identically from the moment you see it —
a metronome, never a surprise — so what it owes is a rhythm slow enough to
read (≥ 1.2 s a cycle), which is checked instead.

**How long a level takes is now a number.** `estimate()` walks a room and
prices it: the run at the kid's own speed, a beat per obstacle, a beat per
small machine, every ladder at climbing speed, and **the ride from the job it
actually does** — mount, drive to the work at that machine's own top speed,
the work itself, dismount. The prover prints it per level and refuses a room
that is not a level at all.

Two things fell out of it that are the owner's to settle, and neither is a
bug:

- **The rides are 5.5–10.8 s. DESIGN §1 says thirty to forty.** What is built
  is *board, do a job, hop off*; what the design describes is *ride a short
  authored stretch that no amount of jumping could cross*. The estimate
  originally carried a flat 30 s for a ride, which hid this completely — the
  number is measured from the parts now, and the parts disagree with the
  brief.
- **A learned run is ~32 s against the "~40 once learned" target.** On the
  same model the first time through lands inside 60–90, so this is the levels
  being slightly thin rather than wrong.

The **on-foot share** is checked because §1 makes it a claim: *"that is 80% of
playtime and it has to be good on its own."* The three levels run 71% / 82% /
68% — level 3 being the most ride-heavy, which is right for the big one — and
a room that falls under 60% now fails.

**And the slack rule, which cannot fire on a legal room.** §4.1 asks for a
full tile of slack on every jump; the budget's own ceilings give 0.65 on a
2-tile step and 0.85 on a 4-tile gap, so the ceiling *cannot* meet the rule
and only what a level actually uses can be checked. Sizes are whole tiles, so
every legal room already passes — which makes the rule's real job the other
direction: catching the KID changing under levels proved against the old
numbers. The bite does exactly that, weakening the jump and checking the
levels notice.

Gate: 70 checks in `test/rooms.mjs` (up from 59), the browser gate unchanged
in count.

## v11 — 2026-08-13 — three rooms become three LEVELS

**Built on the deployed head, not on a fork of it.** Two reconciliations had
already been paid for, and both had the same cause: `main` and `gh-pages`
have **unrelated histories** (Pages is an orphan branch), so a lineage that
starts from an old copy of the tree cannot be merged back, only re-typed.
This version starts from `gh-pages` — the art lineage through v10, crafted
materials and all — and brings the design lineage's controls commit forward
onto it, rather than the other way round. Where the two numbered the same
module differently, **this tree's numbering wins**: a token carried over from
the other lineage names a file that never existed here.

**Every new surface goes through `craft.js`** (ART_TARGET §0.05). The props
this version adds — the flag, the checkpoint, two new kinds of small machine,
the rungs of every ladder — are painted balsa like the rest of the site's
timber, with one exception that is deliberate: **the flag's cloth is FELT**,
because that is what a flag is made of in this kit. The lamps and the smoke
puffs stay bare, which is the case `craft.js` names. A prop built with a bare
`new MeshLambertMaterial` is flat paint standing in a crafted world, and that
is the failure v10 spent a whole pass undoing.

**THE CLIMB** (`parts.js`, `level.js`, `kid.js`). A rung is **not solid** in
any direction — you walk through it, fall through it, and only the verb holds
you on it; a solid ladder is a wall with a picture of a ladder on it. Two
things it would have got wrong and now cannot: the climb **tops out with his
feet on the deck** rather than one rung above it in the air, and **holding a
direction steps him off**, because without that the top of a ladder is a
place you can only leave by jumping — a trap with rungs. A jump lets go and
is a real jump. The up EDGE is drained while it is held as a climb, or the
stale press is read as a jump the moment he steps off — the same
double-consume trap the mount already pays for.

**Two more kinds of small machine** (`robots.js`), and the split is the point
of having more than one: a **hopper** is a timing test on a fixed 1.35 s
rhythm with a crouch as the tell, a **roller** is a spacing test that is too
flat to stand on — landing on one bounces you off *without* killing it, which
is the game saying *this one you jump* — and the original **skitter** is the
provocation test. A roller that shoved you off used to hit you for it in the
same frame; it now shrugs for 0.4 s. Any of them can stand on a **deck**
rather than the ground, declared rather than sampled, because `groundTop`
from a fixed height puts every deck robot back on the floor.

**The furniture that makes a room a level** (`flag.js`). A **checkpoint**
that lights by being passed and buys the middle of the level back — there are
no lives, so time is the only thing it can cost. A **flag** that builds
itself in **three phases** on the approach, a puff of smoke each, and
**activates by being run past**: no button, no stopping, because a
six-year-old at a sprint should not have to stop and press something to
finish a level. Level 3 of a world flies the **big** one, and the **gate is
the WORLD's curtain** — it is built only where a room declares one.

**The levels themselves.** Three rooms authored to the four-beat Nintendo
shape, one idea each, marked in the source because the marks are the only
thing that stops beat 2 quietly becoming another beat 1: **1 — the stomp**,
**2 — the climb**, **3 — both, and the crane**. A hundred bolts a level and
three hidden golden ones, the count being the level's completion figure, so
it starts again with the level rather than running on across the job.

**And §4 stopped being a document.** `check()` now refuses: a ladder with no
landing or no foot · a level with no midway checkpoint · a **ride whose
payoff sits in the first 45% of the room** (a ride is beat 3–4, not the way
in) · a flag planted before the last obstacle · 99 bolts under a HUD that
says 100 · not exactly three golden bolts · a golden bolt sitting where you
would collect it by walking · a bolt hung where no jump or ladder reaches it
· a robot patrolling a deck that is not there. Reachability is judged against
the map **after** the room's rides have done their work — the bank dug, the
span seated — or every bolt a ride opens up reads as unreachable. Nine new
rooms broken on purpose prove each rule bites.

Found by the levels themselves: a steam vent sat at x=56 in level 2, which is
**inside the girder's seating window** — the one place the ride asks you to
stop was a place that threw you out of the cab. And a hopper parked on the
machine's own staging ground meant the one place you have to stand still to
board was a place something was hitting you. Both are the same lesson: a
hazard placed by feel lands on the beat that needs stillness.

Found in the gate: it sampled the wrecking ball's state **once** after
walking away from it, and the ride test ends inside the ball's six-tile wake
radius — so it was asserting `rest` on a hazard mid-swing. It waits for the
state now, and the telegraph is proved as an ORDER (wind before swing)
recorded off a frame loop, because a poll on a machine rendering at a handful
of frames a second can miss a phase entirely and say nothing about whether
the game warned you.

Gate: 113 checks, plus 59 in `test/rooms.mjs` (42 over the real levels, 17
proving the prover bites).

## v10 — 2026-08-13 — a material KIT, not cardboard everywhere

**Crafted World is a kit of materials and the first pass used card for all of
it.** `js/craft.js` is now the one factory every surface is made through, and
the manifest's `textures` block is the palette: `flute` (the cut edge of
corrugated card, stacked fluting) for the earth section and every dug face,
`card` (kraft liner) for flat card, `felt` for the grass lip, `balsa`
(painted wood, brush strokes and a paint chip) for machines, girders and
props — §3.3's "painted wood and pressed steel". Each is a greyscale map
multiplied onto a palette colour, so §3.2 holds exactly.

**The ground is the headline.** It was flat brown, then card with a faint
grain, and it is now visibly a CUT THROUGH STACKED CORRUGATED CARD — which is
what a cut earth section is in this reference. The strata banding the depth
pass established still reads through it; the flute strength was pulled from
0.62 to 0.5 precisely so it would.

**Two failures worth recording.** A probe of the live scene found **3
materials mapped and about 70 not**: every module had grown its own
`const M = (c) => new MeshLambertMaterial(...)`, so the grass lip, both
machines and every prop were still flat paint while the ground behind them
was card. Patching call sites would have left the next one to be written
flat, so `craft.js` replaced all of them — 128 materials now carry their
material, and the ones that do not are the beacon lamp, shadows and glass,
which must stay bare. And the first maps were far too weak: ±20% variation,
which Lambert then flattens further. A material you have to be told is there
is not doing its job.

Also fixed: the sky's remaining magenta. **Magenta is the only thing where r
AND b both exceed g** — yellow, orange, kraft and cream all have b < g, and
cotton is neutral — so the despill needs no threshold and cannot eat a real
colour. 2.04% of pixels carried a pink cast; now 0.004%.

And the gate learned to refuse a manifest block containing a stray note: a
bare `_note` string beside the texture entries made the seam-scope check
resolve a path on `undefined` and killed the whole run with
`ERR_INVALID_ARG_TYPE` instead of naming the problem.

Gate: 134 checks + 29 in the room prover.

## v9 — 2026-08-13 — one build: design v6 × the crafted art, and a paper sky

**The two lineages are one tree again, and the numbering jumps to v9 to
clear both sides' collided v6–v8.** Base: the design branch's v6 (parts kit,
provable rooms via `test/rooms.mjs`, the crane, the wall, robots and vents,
touch fixes). Carried onto it, from the art branch's v6–v8: the Meshy-rigged
animated Eeri behind a `rig: "skinned"` seam with `height` in tiles, the
crafted `_v2` layer set, the playfield card grain (`getTexture`, world-space
UVs), and the kid's palette. The design gate — 116 checks + 29 in the room
prover — passes over the merged tree with all art live.

**And the sky joins the crafted register** (owner's direction: the cardboard
look belongs on the backgrounds, and the sky was the last smooth code paint
on screen). `groundworks_sky_v1.png`: the palette's own gradient × a paper
grain used as LUMINANCE only (§3.2 — no asset invents a colour), COTTON WOOL
cloud cutouts tiled sparsely with a per-tile drift, and ONE construction-
paper sun with a split pin. Built by `art-src` tooling from two free nano
generations; `drawSky` stays as the code placeholder behind the same seam as
every other layer, and the gate now measures the sky PNG like the rest.

Three lessons from the sky, kept in the tool:
- **A prop sheet must forbid its own backing.** The first sheet put the
  props on a kraft board the keyer cannot remove; "directly on the magenta,
  NO board" fixed it.
- **A naively tiled sheet grows a second sun.** The sun is cropped out and
  stamped exactly once; two suns is a broken toy, not a whimsical one.
- **Cotton needs a tighter despill than card.** Bright pixels put the
  generic clamp above 255 where it does nothing, and the wisps kept pink
  rims; a sheet with no legitimate pinks can clamp r/b hard to green+10,
  plus an alpha rolloff on strong spill.

## v6 (design lineage) — 2026-08-13
**The parts kit, and rooms that can be finished.** Rooms were a hand-drawn
grid plus half a dozen side-arrays that could disagree with it — the pit
was declared twice, the bank twice, and nothing anywhere checked that a
machine could actually reach the thing it was supposed to clear. That is
where "you get stuck pretty fast" came from.

`js/parts.js` is the palette, and it is the method flashprince already
proved, ported rather than copied. There a room is twenty by twelve
characters and `editor.js` paints it from a named brush strip, because
"the character IS the data". Eeri's rooms scroll and carry MACHINES, so a
room here is a LIST OF PARTS and each part declares its rules once: what
it stamps into the map, what it demands of whoever arrives, and which
verb removes it. `js/rooms.js` is the whole game as three such lists.

**And the piece flashprince never had.** Its level distances are measured
off a written budget — a running jump carries 3.7 tiles, so a 3-tile gap
goes and a 4-tile gap does not — but nothing checks a room against it;
you find out by playing. Eeri gets the budget as numbers computed off
`kid.js` rather than guessed (jump apex 12.6²/60 = **2.65 tiles**, so a
2-tile step goes and 3 does not; a run carries **4.85**, so a 4-tile gap
goes and 5 does not) AND the check. `test/rooms.mjs` walks every room
from spawn to exit in plain Node — no browser, the shape of gameoflife's
`check_levels.mjs` — and a room that cannot be finished fails the build.
It carries eight rooms broken on purpose, one way each, so a prover that
cannot fail cannot pass unnoticed: a step too tall, a gap too wide, a
lock with no machine, **a machine penned from its own job by a hole**,
an obstacle outside its machine's reach, a machine spawned off its own
track, a robot patrolling across a hole.

**Machines have an A-to-B track now**, declared per room, and the check
holds the room to it: the track may not be cut by a hole, and every
obstacle the machine is meant to clear must lie within arm's reach of
somewhere on it. That single rule is what stops the class of soft-lock.

**SITE 3 — the wall, and the third verb.** A wrecking crane
(`js/crane.js`), on the excavator's exact node contract so a live GLB
drops in behind the same check and the same paint map. The brief had this
machine down as a *hazard boss*; the owner's direction moves it, and it
is the game's thesis in one object — the ball that swings at you unmanned
is the ball you swing at the wall once the cab is yours. The brick wall
(`Wall` in `js/pieces.js`) is the third manipulable piece: intact →
cracked → rubble, honouring §5.1's rule that rubble is a different
silhouette and not a shorter wall, and its rows leave the MAP when it
comes down, the same honesty as the dig and the span.

**Small things to avoid** (`js/robots.js`). A robot patrols a span the
kit guarantees is floor, notices, winds up, then lunges — flashprince's
sentry clock compressed, so it is a reading test rather than a reflex
test. A steam vent breathes on a fixed clock with a lit collar before it
blows. The cost is the Yoshi rule, unchanged: a hit takes the RIDE, not
the run, and a machine drives straight over a robot.

**Touch, fixed.** The Toko badge sat on top of the jump button — inert
per the house rule, but covering the one control the game is played with;
on a coarse pointer it now clears the whole button row. And every hint
named keyboard keys to a thumb that has none, so there is a touch string
set: `◀ ▶ — RUN · ▲ — JUMP`.

Found on the way: `window.__eeri.exc` was captured once at boot, so after
a room change the handle still pointed at the machine you had left — the
test that placed the kid beside "the machine" was standing him next to
one in another room. It is a getter now.

Gate: 115 checks, plus 29 in `test/rooms.mjs` (21 over the real rooms,
8 proving the prover bites).

## v5 — 2026-08-13
**The art lands, and the game goes up on the floor.** The seam built in
v1 did its job: five layer paintings and the excavator swapped from code
placeholder to file with a status flip, and no game code changed to
accept them. The excavator GLB honours the rig contract exactly — every
contracted node present, and its rest pose, pivots and node translations
match the placeholder to three decimals, so `house.y = 0.86`, the 0.52
boom and the −1.35 stick all land where the code already reached for
them. Its `wheels` node ships without the child spinners the placeholder
had, so the wheels do not roll; everything else animates.

**Two house rules had to be enforced at the seam rather than assumed.**
The model arrived with five baked photo-texture materials at metallic
0.5 — and §3.2 makes "one palette, one material language" a make-or-break
rule, not a preference, precisely because the risk in a 2D/3D game is the
cast and the world reading as two different games. It rendered rust-brown
against a brown hoarding and stopped being safety yellow. So a model
entry may now carry a `paint` map (node → palette role) and `assets.js`
replaces its materials with flat palette colours, keeping every bit of
geometry and rig. The node contract was already enforced there; the
surface is now too. Omit `paint` to ship an asset's own materials.

The fore painting was composed against the **old** occluder rect
(y −1…5), which v4 corrected to −2…14 so a foreground can actually be
cropped by the top of the frame. `art-src/tools/recanvas-fore.mjs` moves
it onto the taller canvas **at the exact world position it was painted
for** — the same pixels, the same world units, simply with room above
them. Its sibling tool pinned an absolute path into a scratch directory
and stopped working when that session ended; this one resolves playwright
through CJS instead, since ESM does not honour `NODE_PATH`.

**Deployed.** The cabinet was lit on the hub and pointed at `eeri/`,
which did not exist on `gh-pages` — Play was a 404. The game, the
catalogue entry and the `worksite` marquee are on the site now, merged
into the site's own `games.js`/`art.js` rather than overwriting them
(the site carries `tokotrip`, which this branch does not, and an
overwrite deletes a cabinet). `deploy-hub.mjs` renumbered every token
from one map, and its guard caught that the site's `hub.js` had grown a
WebXR floor sort this branch never had — brought back before deploying,
or the deploy would have deleted it.

**The textures the model never showed are gone.** Every one of its five
textured materials is covered by the paint map, so those images were
bytes the browser downloaded, decoded into blob URLs and threw away —
and each was an async load still in flight when the hub gate opened the
game and moved on, which is how they were found: a `Couldn't load
texture blob:` error that only Eeri produced.
`art-src/tools/strip-textures.mjs` removes them and compacts the buffer;
it refuses to run if any textured material is NOT repainted, since then
stripping would change what is on screen. Geometry, tri count, node
names, rest pose and pivots are untouched, and the frame is
pixel-identical. 924 → 851 KB.

Known, and the asset producer's call: at 851 KB and 8 740 triangles the
excavator is over the brief's ceilings (400 KB, and 3 000 tris for a
small machine / 6 000 for a big set-piece) — the weight is geometry, not
textures, so it wants decimating rather than re-exporting. Its `wheels`
node has no child spinners, so the wheels do not roll. And the fore
painting still sits below the playfield ground line, so it reads as a
band along the bottom rather than something you pass behind.

Gate: 98 checks, plus 13 against the deployed tree.

## v4 — 2026-08-13
**The depth pass — the Tropical Freeze half, which needs no cast.** The
3D characters are blocked on the Meshy pipeline, so this version moves
the other half of the confirmed reference pair: "2D gameplay, fully 3D
layered world — dramatic depth, the camera drifting on rails, background
layers where things happen, heavy-object weight." None of that needs a
model. It was judged the way the method says — render, LOOK, name what is
wrong, redo — and the LOOK named three things:

**A third of every frame was dead flat brown.** The earth below the lip
was one unbroken slab: the largest area on screen carrying no
information, which is the one thing the reference never does. It is a
cut section now — strata darkening downward, cobbles embedded in the
face, a fresh cut edge drawn either side of every hole, and a hard
shadow under the grass lip, because the lane the game is played on was a
0.14-tile hairline against a flat wall. The bank bands the same way; it
is the room's most important object and it read as a box.

**The occluder lane was buried.** Its rect stopped at y=5 — one tile
above the ground line — so a foreground piece physically could not reach
the top of the frame, and the one girder in it floated inside the dirt.
The "cropped foreground = depth" lesson was written in the brief and
absent from the screen. The rect runs −2…14 now, the whole visible band
at that depth, and carries a real kit: scaffold standards you pass
behind, spoil sweeping the bottom edge, a pipe run crossing above
everything. Two things it got wrong first and the README now states: a
big shape parked at eye level is a blob with the game hidden behind it
(the cable drums were 1.25-unit discs at head height), and a heap whose
crest sits below the playfield's ground line reads as a hole cut in the
earth rather than a mound in front of it.

**The background competed instead of receding.** A haze band sits the far
stack in air, and the skyline lost its internal contrast — crisp two-tone
blocks at that distance read as near and fought the playfield.

Plus the two things the reference has that a spring does not.
**`js/camera.js` is a director**: a site declares SHOTS — zones with
their own dolly, height and lead — and the camera blends across them, so
a room pulls back where it is asking you to read a lock and closes in
where it is not. Over that sit a slow **drift**, so the frame is never
dead still, and a **punch** — a short dolly kick on the dig, the sling,
the span seating and every hit, which is what weight looks like from
behind a camera. And **the background works**: a crane traverses a load
across the skyline and a truck crosses the far road, where before one
digging machine was one event in ninety-six tiles.

**The seam, hardened, because asset input has started.** Art contributes
files to `assets/` and a status flip, nothing else — so the gate now
refuses a manifest path that climbs out of that folder, and measures a
live PNG's pixels against its documented size rather than letting it
stretch silently onto the plane. The size table in `assets/README.md` is
the brief an artist paints to, so it is checked against `LAYER_RECTS` ×
`PPU` in code rather than trusted to have been kept up by hand. Both
guards were verified by feeding the gate bad input and watching it fail.

Gate: 93 checks.

## v3 — 2026-08-13
**The level beyond one room.** Walking through the gate now leads
somewhere: sites are data (`SITES` in `js/level.js` — map, bolts, spawns,
exit, and which lock the room carries), one `buildSite()` builds a room
into a single group and tears the old one down whole, the kid and the
machine persist, and the camera **cuts** to the new room — a slow pan
across a rebuilt world is a lie about geography. Each room's machine
starts unmanned again: taming does not carry between sites, so the mount
is read every time, which is the point of it.

Site 2 is **the girder** — the second manipulable piece, its contract
already waiting in the manifest: stacked → slung → seated as a span. The
gap is eight tiles, past *both* of them — the kid's jump falls short and
the machine refuses the cliff. The same gesture as the dig works it the
other way round: hold the bucket in the stack and the chains take the
load (the machine drives at ×0.55 while carrying — a machine earns its
slowness); lower it at the lip and the span seats, filling the MAP row
the way the dig cleared one, so the bridged gap is a fact about the
level. The kid crosses on foot, because the exit is his half of the job.

Found by LOOKING, not by the gate: a slung load hung a fixed length
under the bucket and **sank into the ground** when the boom came down —
now the chains go slack and the load rests, never sinks (the rest depth
is measured off the asset's own bounding box, so a live GLB keeps the
behaviour). Found the flaky way: the GPU-less sandbox runs the clock
~5× slow, so a mount that takes 0.55 s of game time takes ~3 s of wall
clock — the test's retry loop now walks back up and gives each attempt
real time, and the crossing is asserted mid-span instead of demanding a
36-tile walk inside a wall-clock timeout.

Gate: 65 checks.

## v2 — 2026-08-13
**The loop.** v1 had systems and no game: riding was strictly worse than
walking (45% slower, no jump, a five-times wider body), the boom was a
verb with no object, and the room had no reason to go right. v2 is the
answer, and it is the owner's: **a machine is dangerous until it is
yours, and the room is a lock the machine opens.**

The excavator now starts **unmanned** — amber beacon turning, working its
own slow dig cycle. It is not hunting Eeri; it is heavy and blind, and
standing under the bucket while it sweeps puts him down. The lift is the
window, so **mounting is the skill test**: read the cycle, take the step,
and the beacon goes out — the threat is now the tool, permanently.

The room is two obstacles, each shaped for exactly one of them. **The
pit** is kid-shaped: he clears it in a run, and the machine refuses a
cliff. **The bank** is machine-shaped: three tiles of dirt above his
jump, taken down a row at a time by holding the bucket in it. Digging
edits the **map**, not the picture, so the level really changed; the
bank's cut face and spill are drawn per state (`js/pieces.js`, behind the
same asset seam as everything else, contract `state0/1/2`). Walking out
through the gate the machine opened is SITE CLEAR.

Fixed on the way: a queued `action` press was consumed again the instant
riding began, so a player who mashed E climbed in and fell straight back
out — the same double-consume trap Suds Jack paid for, now drained at
both edges. The HUD moved to the top-right; it had been sitting under
`hub/shell.js`'s HOME button, unreadable, in every screenshot.

Gate: 49 checks.

## v1 — 2026-08-12
Gate-1 diorama slice, asset-ready. The full layer stack (sky / skyline /
far / mid / near / foreground occluders) as code-painted cutouts at real
z-depths behind a 24° long-lens camera; tile-grid level with collision
(ground, mounds, steel platforms, a pit, a girder); Eeri on foot (run /
buffered+coyote jump / hard-landing squash); the excavator as first mount
(E to climb in via the step, drive with heavy ease, W/S boom on real
hinges, hop out); 19 bolt spinners to collect; a depth-tinted background
excavator working a dig loop on the far layer; blob shadows, exhaust
puffs, touch buttons. **The asset seam is live:** `assets/manifest.json` +
`js/assets.js` — every model and 2D layer swaps from code placeholder to
PNG/GLB file with a one-word manifest edit against the node contracts in
`assets/README.md`.

The first hazard is in and it sets the pattern: a wrecking ball hangs dead
still until you come near, then **winds back** — chevrons pulsing, one
warning tone — and only then swings. Nothing here kills; the cost is the
**Yoshi rule**, a hit takes the RIDE (thrown clear of the cab) and never
the run, with mercy frames on foot. A synth kit carries it, including a
diesel bed whose pitch rises with the machine's load, and the arcade
cabinet (`worksite` cover), the way home and the Toko signature are
mounted. `prefers-reduced-motion` stills the decorative background
machine and holds the chevrons steady instead of flashing.

Not yet: more machines, more world themes, the level beyond one room.
