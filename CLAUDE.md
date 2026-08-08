# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projects

### The arcade — `index.html` + `hub/`
The landing page: **every playable thing in the repo on one page**, each cabinet with a
**Play** link and a **Feedback** button. Vanilla ES modules, no build step, no image
assets — every marquee is a 128×72 pixel canvas drawn in code (`hub/art.js`) and tinted
from that game's own accent.
It wears **the same terminal as `gameoflife/`** (see the locked visual plan there): cold
near-black, monospace, `>` carets, `[ PLAY ]` brackets, rules instead of card borders,
and a status line carrying the same three-colour **screen accent** (persisted under
`sudsJackHubAccent`). The accent tints the *chrome* only — each cabinet keeps its own
colour on its caret, its Play button and its bezel, because that is the game's colour and
not the terminal's. Every marquee is seen **through the same curved glass**: `throughGlass`
in `art.js` bakes barrel distortion + one scanline per source row + a corner vignette into
a 256×144 remap **once at load** (a marquee never moves, so nine cabinets cost nine passes
total — no WebGL, no per-frame cost, unlike the live version in `gameoflife/js/crt.js`). Adding a game is **two edits**: an entry in `hub/games.js`
(title, tagline, lineage, tags, controls, `path`, `accent`, `art`, `inRepo`, `status`) and
a draw function in `hub/art.js`; `hub/hub.js` knows about no game in particular.
**The marquees are covers, not icons** (owner's direction, 2026-07). A cover is a
*composition* that says what the game is before you read a word: a framing device, a
subject with somewhere to be, depth, and one thing happening. The house register is
**Atari and Master System** — meaning the constraints, not nostalgia. A 2600 changed
colour **once per scanline**, so a burning sky is a stack of flat horizontal bars with
hard seams (`skull`); a Master System sprite is a **flat fill inside a hard black line**,
so the shape has to live in the *silhouette* because there is no shading to put it in.
`mix()` in `art.js` is for those ramps. Per-cover references are the owner's to give —
Neon Ronin is the Phantasy Star III box (gate, receding stair, hero cropped by the
frame), Hyper Dagger is **HYPERDEMON × Bone Dust**. Three things were learned building
those two and hold generally: a hero cannot be a black silhouette against a dark scene
(light it, or rim it in two colours); **cropping** a foreground figure at the frame is
what makes it read as foreground; and a framing device has to be **lighter** than the
sky behind it or it is just an outline floating in the void. The rack **grows with the screen — 2 / 2 / 3 / 4** at 1100 / 1480px, inside a 1520px
wrap; a phone gets two because one cabinet to a screen turns the floor into a scroll and
you cannot compare what you cannot see at once. At that width the card is cut to a
**poster** — cover, name, three clamped lines, two of state, the buttons — because the
tagline alone wrapped to six. Three **shapes** switch the whole floor from the status
line (`rack` / `wide` / `list`, persisted under `sudsJackHubLayout`), and **every note
records which one was in force**, so "the covers are too small" and "too loud" can be
told apart. The page also has a memory: it diffs `versions.json` against the numbers you
last saw (`sudsJackHubSeen`, written on `pagehide`) and tags what **moved**; pressing
Play marks a cabinet **tried** (`sudsJackHubPlayed`). Neither reorders the floor.
`/#hyperdagger` deep-links a cabinet and `/#hyperdagger/feedback` opens its note panel —
the cabinet title is the anchor, so there is no third button on the card.
**`live: false`** marks a cabinet with nothing behind it: the marquee goes unlit and
un-linked, Play becomes a dead `[ NOT UP ]`, and the `note` field replaces the controls
line with why. Not every button has to work for a game to be worth listing — and a
button that says so beats one that 404s. Feedback stays open on those cabinets.
**`status`** splits the page in two: `active` gets the top of the page, `archived` sits
under its own heading with dimmed marquees — still listed, still playable, not competing
with the live work. One word moves a game between them. The default split was drawn on
last-commit dates (July = active; the June ones — Suds Jack, Paper Route, 20/20 and the
goo sketches — archived).
The short URL **`/AnotherHUB`** (`AnotherHUB/index.html`) is the same page one level down
with a `<base href="../">` so every relative link still resolves against the site root;
the smoke test asserts the two files are byte-identical apart from that tag, because two
copies of a page drift.
**Controllers.** `hub/pad.js` is the one gamepad reader the site shares — the Gamepad
API has no press events, so it is a single rAF poller doing edge-detected buttons,
deadzoned sticks, d-pad-or-stick direction and hold-repeat. It reports the stick
**returning to centre** as `dir(0,0)`, which menus ignore and the key bridge depends on.
`hub/shell.js` is one line in a game's `index.html`: a HOME button top-left plus a
**hold** on Start/Back (750 ms, the button fills as confirmation — a press would collide
with the pause button several of these games bind to Start). It navigates on **`pointerup`
AND `touchend`**, never on `click`: ten of the twelve games `preventDefault` every touch
outside their own UI, which kills the synthesised click — and cancelling `touchstart` in
the capture phase cancels the pointer stream too, so the element gets `pointercancel` and
never `pointerup`. `touchend` survives both. That is why the button worked with a mouse
and did nothing under a thumb. `hub/padkeys.js` gives a pad
to games that never grew one, driven by `pad` in the catalogue: `'native'` = the game
reads a pad itself and nothing is layered on it (Hyper Dagger, Toko Drop, SKLTR, Tiny
Hawk, sudz, voxel); `{keys:{…}}` dispatches the key events the game already listens for
(Drop Cabal, Powder, Neon Ronin); `{pointer:true}` feeds a one-button surface (Tiny 2D);
`{ui:true}` walks the page's own buttons (The Game of Life). Honest limits: synthetic key
events are untrusted, and mouse-**aimed** games get movement and keyed actions from the
pad but not aim — that needs their own code. On the arcade itself a direction moves the
selection, A plays, Y leaves a note, B backs out, and in the note panel left/right sets
the rating and A sends; selection is real DOM focus with its own ring, since a pad user
may never trigger `:focus-visible`.
**The room.** `hub/arcade.js` is the atmosphere layer, kept out of `hub.js` because
hub.js is the floor. Everything in it is allowed to do nothing: `prefers-reduced-motion`
turns off the **marquee flicker** (one tube struggles for a moment, never two at once).
**Two animations, and they belong in different places.** The **CRT power-on** is the
hub's: the tube strikes across the *whole* screen, opens, and the floor is there — once
per **tab** (sessionStorage), since every game is a real navigation and a boot animation
on each return is a toll on the way home. The **Toko sting** is a studio logo, so it plays
in front of a **game**, not in front of a menu: pressing Play holds the navigation, plays
it once per **browser**, and goes when it is done *either way* — if the import fails or
`toko/` is not in the tree, the catch still sends you to the game. Both are skippable from
frame one, and skipping the sting still takes you through rather than stranding you. For a
while both played on arrival *at once* — a black veil sweeping open under a magenta panel
at z-index 99999 that hid it completely. Neither plays in front of a **deep link**.
There are **two stings** (`STYLES` in `sting.js`), for the same reason the floor has three
layouts: `draw` reveals the arcs along their own path; `goo` flops a Toko Drop gel cube in,
which thins into the mark — the face is *drawn* at ~4× stroke weight, where the slots close
and it is a blob, and thinning to `GEO.stroke` IS the transformation, so nothing crossfades
and no third colour is needed. `playStingOnce` picks one at random and **records which**
(`tokoStingStyle`), which rides on every note as `intro` — an intro you saw once and cannot
name is one you cannot give feedback about. The brand board plays both on demand. Find the
sting by **`.toko-sting`**, never `[role="img"]`: every signed game carries a badge with
that role, and a test looking for one found the signature in the corner of the game it had
just navigated to. **Room tone** is a detuned-saw bed plus a coin
on Play, routed through one master gain and **off until asked**. Three counters hang off
the single honest signal this page gets — pressing Play — and only appear once there is
something to count: **credits**, a **streak** counted back from TODAY (counted from the
most recent day instead, a streak that ended in March still shows in July), and
**tickets**, which buy nothing. The **score wall** reads each game's own `localStorage`
best off *your* disk via a `score: {key, fmt}` field in the catalogue; nothing is fetched
and nothing is sent, which is why there is no leaderboard. The **Konami code** unlocks a
`secret: true` cabinet — the brand board, which is real and already in the repo. A secret
leaks through every list that reads `GAMES` directly rather than `onFloor()`: its tag
showed up in the filter row, the "showing N of M" count, and a pasted `#brand`. Its id is
**`brand`, not `toko`** — that fragment already belongs to the counter. The `wide` layout
is now a **true full-width marquee** (cover at the width of the wrap, words underneath);
it must not use `object-fit`, which crops the composition *and* resamples smoothly no
matter what `image-rendering` says, turning a 9× pixel upscale into a blur.
**Versions.** Toko Drop's system (a `VERSIONS.md` log with `## vN` entries plus a `?v=N`
module token, moved together by `scripts/bump-version.sh`) now covers the whole floor.
`node scripts/versions.mjs [siteRoot]` writes `hub/versions.json` by reading each
project's `VERSIONS.md` first and falling back to its `?v=` token, so a project gets a
number before anyone starts logging for it and switches to the release number the moment
they do. The cabinets fetch that file, so shipping one game does not mean redeploying the
arcade. **Run it at deploy time** — against the deployed tree, which is the only place
every project exists.
**Deploying is `node scripts/deploy-hub.mjs <siteRoot> [--dry]`, never a hand-copy.**
Three bugs in one session were the same bug: a number in one file disagreeing with a
number in another (a precache list a token behind the page — an arcade that loads online
and is blank on a plane; an `index.html` two features back, so the language switch had no
ids to write into; tokens picked by hand, so a file could change without its number
moving). The rule that removes the class is **one token per module, bumped when and only
when its bytes change, and written into every reference by the script** — including each
game's `../hub/shell.js` tag, which is how sixteen pages were found pinned to shells as
old as `?v=1`. It copies only what this branch owns (`games.js`/`art.js` are the site's —
overwriting them deletes a cabinet), derives `sw.js`'s SHELL via `scripts/sw-shell.mjs`
(run that alone to keep the branch's own worker honest; the smoke gate asserts it) — which
**walks the import graph from `index.html`** rather than matching `hub/*`, because a
pattern is a hand-kept list with extra steps: the counter is twelve modules under `toko/`
and the arcade came up offline with a dead bar across the top until the walk found them.
It skips any folder shipping its own `sw.js` (a narrower scope wins its own pages), takes
**built specifiers** (`import('./dialogue.js' + V)` inherits the importer's token, and is
invisible to a literal `?v=` match), and checks each path is a real file — a line of
documentation inside `chat.js` had put `toko/js/toko/js/chat.js` in the list. An
**untokened** module goes in the list but is served network-first with the cache as
fallback: the counter imports its own modules bare, and cache-first would pin them
forever with no URL to bust, regenerates `AnotherHUB/`, and puts back any `<script>` block the
site has and this branch does not — that is how the counter mount survives.
**It will not overwrite a file the site has moved on its own**: gh-pages is edited from
more than one direction, and a plain byte comparison says *that* two copies differ, never
*which way*. So it asks whether this branch has ever HELD the site's bytes (tokens
stripped, since a deployed file has been renumbered); if not, that is somebody else's
work, it is left alone, and the run stops and tells you to bring it back first. It found
three files that way on its first real run. **Deploys never merge.**
`hub/feedback.js` reuses the transport the games already ship (`scripts/feedback-sheet.gs`
on `gh-pages`): a `SHEET_ENDPOINT` Apps Script if pasted in — unlimited, but `no-cors`, so
its answer cannot be read and that path reports **`sent-blind`**, never `sent` — otherwise
the Formspree endpoint `toko-drop` already uses. Every note lands in `localStorage` first;
undeliverable ones queue in an outbox drained one at a time on the next visit; Send with
nothing said records nothing. `window.__hub` exposes `{games, sketches, feedback, debug}`
(`feedback.setEndpoint(url, blind)` points it at a stub for tests).
`node test/hub-smoke.cjs` = 166 checks: a cabinet per catalogue entry, every in-repo link
resolving 200, every marquee actually painted, the full feedback path (empty / sent /
queued / drained), modal behaviour (Esc, backdrop, focus returned), WCAG AA, 44px targets,
no horizontal overflow on a phone.
**`inRepo`** marks which games this branch carries: the `gh-pages` site root is a curated
tree holding games `main` does not (Suds Jack itself at `sudz/`, `Skltr/`, `neon-ronin/`,
`eye-test/`), so the test loop only checks links it can see. **Deployed** to the `gh-pages`
root on 2026-07-26 (live at `/Suds-Jack/`), which took the place of the Suds Jack game
that used to be the root page. Check which copy is newer before "refreshing" anything:
`sudz/` was ahead of the old root build, not behind it, so it was left untouched and the
root's orphaned `game.js`/`style.css`/`levels.json` were removed. `paperboy/` and the
`goo-*.html` sketches had to be carried onto `gh-pages` with the hub — the site had never
held them, and four of the hub's links pointed at them.

### Suds Jack (`sudsjack/`) — the rebuild, SET DOWN
**Owner's call, 2026-08: the Hyper-Dagger-based rebuild was a mistake — stop building
it.** The code stays in the repo like `paperboy/` does, the deployed copy stays
unlisted, and the arcade's `sudsjack` cabinet points at the original vector build at
`sudz/` with no rebuild promised on the card. Do not resume this without the owner
asking in their own words. The section below is kept as a record of what was learned
building it (the traps generalise); it is not a to-do list.
Concept: "Bomb Jack x Suds 51 x Tempest 2000", taken **literally and in that order** —
Bomb Jack is the *game* (collect, in the right order, **no weapon**), Tempest is the
*shape* (a tube you ride the rim of), the suds are what it is made of.
**Two things share the name.** The playable one is still the **original canvas vector
build**, live at `sudz/` on `gh-pages` (a tube *shooter*: ← → move, Space fire, Z
superzapper). The arcade's `sudsjack` cabinet points there and **stays pointed there**
until the rebuild is better than it. The rebuild is `sudsjack/`, deployed unlisted.
It is a **half tunnel** — a channel open along the top, walls sweeping up both sides, Jack
lying on the floor of it (owner's direction, and it is a design change, not a view: **a
closed ring has no ends**, so you can always keep running, while a channel has two lips and
the lane at each one is somewhere you can be **cornered**. Lanes clamp instead of wrapping
and grime has no short way round).
**Every position in the game is `(lane, depth)`** — `tube.js` owns the only conversion to
world space, which is what lets the channel change shape per level (pipe / trough / gutters /
wave / drain / vee) with no game logic knowing: a bubble rises the same way up a vee as up a
pipe. **`gutters`** (level 3) is five identical half-pipes in a row with a **ridge** between
each, and it is the one shape that brings a verb with it: a ridge is the only thing that
stops you *riding* somewhere, so you **jump** it (`↑`/`W`, pad X, flick up). A jump commits
your lane the way a dive commits your depth, and **grime passes under you while you are off
the floor** — which is what stops the verb being dead weight on the five levels with no
ridges. Grime cannot cross a ridge or jump either, so each bay keeps its own problem and the
level is a route rather than a hiding place. That shape gets its own **camera seat** (`SEATS`
in `main.js`), further back, because a level about choosing a bay fails if you cannot see the
bays. **The dive is the game**: standing at the mouth and taking what arrives is safe and
slow, meeting a bubble halfway down pays up to 3× and **locks your lane until you are
back** (Flash Prince's commitment rule, on a 0.62s clock). **One bubble is lit at a time** —
taking it raises the chain, letting it past resets it, and the *deepest* remaining bubble
lights next so the chain stays reachable rather than becoming a coin flip. **Grime steps
toward you** as it rises (Tempest's flipper minus the gun) — a hazard that came straight up
its own lane could be dodged by standing still in the right place, which is a waiting room,
not a game. Bubbles are cold, round and bloom; grime is warm, angular and never does.
Inherited from `hyperdagger/`: no build step, ACES + `EffectComposer`, a director that
spawns **away** from where you stand, and `window.__sj` for the smoke test to drive. **Not**
inherited: the first-person controller and the flat arena — a tube is not an arena. three.js
comes from a **local `vendor/` copy**, not the CDN (hyperdagger on `gh-pages` already went
that way for its offline worker).
Traps, all the same lesson — *depth is easy to throw away*: the **cross-section was shrunk
with depth as well as by the camera**, which is right for Tempest (2D vector, no camera) and
wrong here — the floor climbed away and the channel read as a flat paper fan, and risers had
the same double-shrink; the camera was outside looking in, when only from **inside** the
channel (above the floor, below the lips) is it somewhere you are lying; and the afterimage
at **0.82** ghosted the rails into a starburst (0.5). One more that was a control bug, not a
look: **three of the five channel shapes ran right-to-left**, so on those levels pressing
right moved you left and the claw drew upside down — the gate now asserts every shape's
direction and floor angle. The ridges added three more of the same family: a **wall you
could walk through** (the bay was read *after* the step, so the clamp asked the bay you had
already reached whether you were allowed there), a jump lifted **along the floor's normal**
(which swings 90° crossing a ridge and threw Jack out of the channel), and **outer bays that
were not bays** (end ramps to lip height ate half of the first and last).
One more of the same family, on the way in rather than the look: **the pad was polled
inside the play branch**, below the `mode !== 'play'` early return, so a controller could
ride the rim but could not reach it — the menu and the recap take a pointer or Enter and
nothing else. Polled in every mode now, A or Start is a way in, and because A is *also*
dive the same press had to be drained at both edges of a run (`clearPending()`) or it
started you mid-dive and restarted you off the recap.
**The float** (owner's direction): jump pressed again in its falling half chains one more
bay on a hop that GLIDES (`1 − k²` from wherever the arc was — it never rises, because a
float that climbs reads as a double jump), each press starting lower until grime stops
fitting underneath; three floats is lip to lip from a lip bay, deliberately. Found under
it: **the declared peaks were not the drawn ridges** — main.js still passed the 13 lanes
that predate the ridged channel while the peaks are declared for the tube's own default
of 20, so the walls sat beside the ridges, one peak was past the lip, and the fifth bay
was a sliver. The gate now asks the geometry, not the declaration, and every
lane-denominated tuning carries a ×20/13 rescale to keep world-space feel.
**The Scum Line** (v6): grime past the mouth **settles** instead of dying — a film on its
lane, three layers deep, because dodging used to be free and nothing accumulated, so a
patient run idled forever. Scum is **sticky** (rim ×0.4 underfoot; airborne exempt, which
makes the float the way across a fouled stretch on every shape), **barren** (the director
skips fouled lanes, so neglect starves the chain rather than blocking you) and past **80%
coverage the channel floods** — a life, the chain, a clean rim. The **dive is the only
scrub** (one layer per completed dive, 50 × level; a dive cancelled by a hit scrubs
nothing) — which is what finally makes the stated core verb load-bearing: it advertised
3× but capped at 2.1× against a ×16 chain that never needed it. Level clear washes the
channel and pays 40 × level × clean lanes — the chain's missing cash-out beat. The scum
line itself is a 20-cell strip under the channel: route map and flood meter, one fact.
`node sudsjack/test/smoke.cjs` = 60 checks: boot, the director, the
lane-lock during a dive, collection, the chain, damage, mercy frames, the level shapes,
game over, the way home and the signature — all driven off **game state, not the wall
clock**, because a sandbox with no GPU renders this at a handful of frames a second.
Build tooling: none — same no-build rule as every other demo here.

### Paper Route — Dawn Run (`paperboy/`)
A **Paperboy clone** built on Three.js r167 with an **isometric, flat-shaded homage to
the original Paperboy art** — orthographic 3/4 camera, bright sunny-day palette (sky-blue
backdrop, grey road, green lawns, cube houses with pitched roofs, a little BMX kid in a
yellow helmet). It renders **flat and unlit** — `MeshBasicMaterial` solid colours, **no
lights, shadows, fog, bloom, chromatic-aberration or gel transmission** (those belong to
toko-drop) — for a deliberately 2D poster read. The whole colour scheme lives in
`paperboy/js/palette.js` so it re-tints in one edit. Endless auto-scrolling route;
deliver to the teal subscriber houses, dodge road hazards, refill from blue bundles,
survive 3 crashes. No build step — open `paperboy/index.html` (three.js loads from the
jsDelivr CDN via an importmap, same as toko-drop).

> Note on deploys: the published site is served from the **`gh-pages` branch** (a
> separate curated site root that already holds `toko-drop/`), **not** `main`. Demo
> updates must be copied onto `gh-pages` to go live at `/Suds-Jack/paperboy/`.

### Hyper Dagger (`hyperdagger/`)
A first-person **Devil Daggers × HYPERDEMON homage** on Three.js r167 — survive a swarm
of **voxel** skulls on a neon disc in a synthwave void; survival time is the only score.
Enemies are string-art voxel models (one `InstancedMesh` per enemy, per-voxel colors) and
deaths explode them into **physical voxel debris** (gravity, floor bounce, tumble) from a
shared pool. Combat: **hold to stream daggers**, gems drop from heavy kills and level
the daggers up (LV 3 = **homing**); enemy roster is skulls, crowned skulls, splitter
skulls (burst into minis), brutes, drifting totem spawners (which also pulse **jumpable
orb rings**), **watcher** drones firing aimed orb volleys, thorn spikes erupting under
the player, **blinkers** that teleport toward you, a **segmented serpent** whose rings
gib individually (its pale **ghost** variant is armored from the front — shoot the rings
from behind), spider gem-thieves that also lay **egg sacs** (hatch 2 skulls unless shot,
harmless to touch), and the Leviathan boss. Returnal-inspired bullet-hell: enemy orbs are slow, readable,
and the **dash phases through projectiles** (never bodies). Movement: **jump + double
jump**, dash with FOV kick (requests buffered 0.25 s across the cooldown). Art is **black & white with dark red as the only contrast color** — the neon grid
just stops at the arena edge (no barrier visual). Desktop: pointer-lock mouse look,
**fire is automatic while moving** (hold LMB when still), Space jump ×2, Shift dash,
Esc = pause/options. Touch: dual on-screen sticks — left moves, right looks; **firing is
automatic while moving** (or while the look stick is held); **tap either stick = jump ×2,
flick either stick = dash**; ⏸ button top-right. The pause menu carries persisted
options (`hyperDaggerOpts`): game speed ×1/1.25/1.5, FOV 70/80/90, look sensitivity, and smear/
shake/chroma toggles. Touch play requests fullscreen + landscape lock on start. Onboarding
is paced across the first ~150s (one new enemy roughly every 15-20s) and recurring spawns
tighten over time; the death screen recaps what killed you, a kill breakdown, and your
last 10 run times. No build step — open `hyperdagger/index.html` (three.js via jsDelivr
importmap, same as toko-drop). Same `gh-pages` deploy caveat as paperboy.

### Drop Cabal (`dropcabal/`)
A **Cabal (1988 arcade) homage** on Three.js r167 with the **blob and cube enemies from
Toko Drop** — a gallery shooter with layered depth shooting. Pixel look: renders at a
**220 px internal height** upscaled with `image-rendering: pixelated` + a CSS scanline
overlay; everything is unlit `MeshBasicMaterial` with `NoToneMapping` (flat 2D read,
same rule as paperboy). The little teal gel commando runs along a foreground strip
behind a sandbag row; the mouse/touch crosshair raycasts into a perspective field
(ground plane, falling back to an invisible far wall at z −32) and tracers fly INTO the
depth rows — near enemies and destructible suds towers intercept shots aimed at far
ones. Enemy orbs fly OUT toward the player plane and are dodged by running or the
i-frame roll. Grenades lob to the crosshair point (start 3, +1 per stage / bonus tower,
cap 9). Stage quota gauge Cabal-style; clearing pops all stragglers. No build step —
open `dropcabal/index.html` (three.js via jsDelivr importmap). Same `gh-pages` deploy
caveat as paperboy.

### Flash Prince (`flashprince/`)
A **cinematic platformer** — *Another World* × *Flashback* × the original *Prince of
Persia* — in canvas 2D with no build step and no image assets. The owner's direction was
to follow **Another World's art and animation formula as closely as possible**, and that
is a technical instruction, not a mood board: AW has no sprites in it at all. Every frame,
background and character alike, is a list of **filled polygons** rasterised into a 320×192
buffer. So `js/screen.js` draws polygons and then takes the antialiasing back out —
a final pass snaps every pixel to the nearest of the room's **sixteen** colours through a
lazily-filled RGB555 lookup (an entry costs sixteen distance tests once and a typed-array
read forever after). Edges go hard, the grey halo along a frond disappears, and the
framebuffer is genuinely 16-colour rather than merely painted with sixteen colours.
`palette.js` holds the sixteen as fixed **roles** (VOID / SKY / FAR / MID / NEAR / EDGE /
SOLID / DARK / LUX / LUX2 + four locked hero slots), so nothing that draws knows which
biome it is in — a frond and a colonnade both fill with MID, they are just different
colours by the time you reach them. `paletteAt(t)` walks that set continuously along the
whole run, which is how "the jungle blends into Egypt" is done: **the palette fades, the
shapes overlap, and no screen ever announces a change**. `scenery.js` gives every element
type a WIDE window of `t` it exists in — fronds are still hanging in the first tomb, the
first columns are already standing in the last jungle.
**Animation is a rotoscope, not a sheet.** `figure.js`: a pose is **thirteen joint angles**
(`[hipN,kneeN, hipF,kneeF, shN,elN, shF,elF, lean, head, py, px, rot]`, degrees from
straight down, positive swinging *forward* so the same numbers work facing either way), a
frame is those angles turned into eleven polygons, a clip is `[[pose, holdFrames], …]`.
That is what lets a run hold its contact pose for three frames and blur through the pass
in one — rotoscope timing, which a constant-rate sprite loop cannot do. The far limbs draw
a shade down; that one cheat is the only depth a flat figure gets and it is why the run
reads as a run.
**The design rule is commitment.** `hero.js` — a step is 22 frames and carries 12px, a
turn is 18, a mantle is 40, and until a move reaches the frame it declares `open` the
stick is not connected to anything. Nothing accelerates freely. Tap a direction for one
step, hold and the step runs on into a run (Flashback's rule). Grounded moves are
scripted displacement; jumps are ballistic off a scripted gather. **Every distance in the
level is measured off two numbers**: a standing jump rises 27px and his hands reach 26
above his feet, so he catches a lip 53px up — a storey is 3 tiles = 48 — and a running
jump carries 3.7 tiles, so a 3-tile gap goes and a 4-tile gap does not. Falls are PoP's
ladder: one storey free, two hurt, three kill. Walking off an edge **catches** it
(`ledgeBehind`); holding toward a lip in the air catches it (`ledgeAhead`).
**The duel** is the same clock on both sides: a sentry is 68 frames from seeing you to
firing (spot 26 → draw 26 → aim 16), drawing the pistol costs you 21, **crouching puts
his shot over your head and rolling puts you under it**. Take the wind-up away and it is
a reflex test; leave it in and it is a reading test.
**Fourteen screens**, `rooms.js`, 20×12 tiles of ASCII each, laid side by side with a
**hard cut** — no scrolling, no camera, because a screen you learn and die on is a
composition you remember. Jungle → dig → tomb → reactor → palace → overgrown. Traps:
spike cycles, ceiling slabs, tiles that will not hold, a plate-and-gate on a timer,
pulsing force fields. `scr.cached(key, fn)` paints the static half of a room once and
blits it after that (same discipline as `gameoflife/`); the palette changing throws the
cache, which is correct because it happens once a screen.
Two traps for anyone editing it: **`tryX`/`tryY` must move floor(|d|) whole pixels then
the remainder** — an off-by-one loop there silently scaled the run from 1.62px/frame to
2.62 and turned a three-tile gap into a five-tile one; and **the wall tiles are painted
after the backdrop**, so anything meant to sit on a wall (the glyphs) has to be drawn from
`level.js`, not `scenery.js`, or it gets buried. `window.__fp` exposes `{game, hero(),
world(), debug: {room, give, state, pure}}`. **Signed** by Toko Midori (bottom-left, so it
clears the health marks top-right and the way home top-left) and named in `SIGNED` in
`toko/test/brand.cjs`. Same `gh-pages` deploy caveat as paperboy.

### The Game of Life (`gameoflife/`)
**Mini games and interactive stories that always revert to going back to nature.**
Minimalist pixel experiences (canvas 2D, no three.js, no build step), presented as a
retro-futurist ship terminal (see the locked visual plan below). The hub is **zen**:
never a menu — ONE offering at a time, drawn weighted by the content mix (**70% story /
20% game / 10% wisdom**, preferring unvisited-today; "something else, perhaps" redraws). After every 2nd finished
experience the hub *rests* and shows a nature invitation instead (evening 18:00–05:00
swaps outdoor prompts for a poem / look-at-art prompt). Invitations are **seasonal**:
`nature.js`'s `season(date, hemi)` puts two per-season prompts ahead
of the generic pool (winter frost / spring buds / summer barefoot grass / autumn
leaf-catching); it is **hemisphere-aware** — `'s'` shifts the year six months, seeded
once from the IANA timezone (`guessHemisphere()`) and flippable via a quiet
`seasons north|south` toggle in `.hub-footer` (`store.getHemi/setHemi`). Evening poems come from `js/poems.js`, a **cross-cultural pool**
(Bashō/Issa/Shiki/Leino/Wordsworth, each in all three languages — a haiku can arrive
in Finnish), filtered to the current season via per-poem `season` tags ('any' floats). Trilingual fi/en/ja — every string in
`js/i18n.js` (en fallback), browser-detected, persisted. Experiences export
`{ id, kind, start(host, ctx) }` (kind = story|game|wisdom; ctx = `{t, audio,
onComplete}`, start returns `{destroy}`) and register in `REGISTRY` in `main.js`;
current roster: `aqueduct` (game — Roman aqueduct story → rotate-stones channel puzzle,
BFS flow with live partial water), `forest` (story — branching walk → guided 4-breath
finale), `tern` (story — arctic tern migration pole to pole, 2 choices), `cup`
(wisdom — Nan-in's overflowing teacup; **hold** to pour a dithered Raku chawan past
full, the cyan excess cascading over the lip and off the table), `hanami`
(story — 12 centuries of hanami, Heian court → Edo riverbanks, mono no aware), and
`berry` (story — a Finnish blueberry summer teaching jokamiehenoikeus), and `stars`
(game — trace the Big Dipper star by star, then follow its pointer stars to Polaris;
tap-order chain + tap-the-right-star hit tests), `maple` (story — one tree through
four seasons on the same hill; phenology: spring unpacks, autumn reveals), and `plate`
(story — Boulevard du Temple 1838; a timed exposure erases the moving crowd, the still
man remains: the first photographed human), and `seam` (story — kintsugi: gather five
shards from the void, choose clay or gold, seams gild in GOLD_LUX with a frame-breaking
glow; `cup`'s overflow is now CYAN_LUX and runs off the table), and `dots` (story —
Galileo, Padua 1610: pass the nights, the four Galilean moons swing around Jupiter on
their real periods; a lens-vignette in the void with a notebook strip), and `glass`
(game — Muybridge, Palo Alto 1878: release the horse, tripwires fire 12 cameras, one
frame proves all four hooves airborne, then a zoetrope revives the stills; debuts the
cinematic-letterbox format), and `wait` (wisdom — Stand and Wait: press once then
stand while a dithered halftone fog burns off over ~9s to reveal an old pine,
green `LEAF_LUX` fireflies drifting past the frame; tapping only earns "the mist
keeps its own time"; built to `horizon-pine-vignette.png`), and `lichen` (wisdom —
The Lichen: leave the bare dithered stone alone ~14s and a stippled sage bloom
colonises it; *touching it makes the growth recoil*; luminescent `LEAF_LUX`
apothecia + rising spores break into the void — the interaction that teaches is
non-interaction), and `cloud` (story — The Cloudberry Patch: a midnight-sun aapa
mire, ripe lakka, a bear's track to your patch; the finest cluster asks to be left
— branching companion to `berry`, full-scene Finnish-nature family, not the void
vignette), and `ice` (story — The Ice Core: an arctic drill descending through
dithered annual ice bands, reading each era from wildfire soot to 20,000-year-old
air that glows `CYAN_LUX` and breaks the frame; reference-grade void-vignette
build), and `trace` (game — Trace the Chaos: tap star-to-star to draw your own
constellation from a scattered field, a dithered purple nebula blooming around
what you connect in glowing `GOLD_LUX`, then name it and learn the sky was never
arranged; extends `stars`, built to `constellation-nebula.png`), and `gears`
(game — The Bronze Gears: crank the Antikythera mechanism's meshed bronze gears
through the lunar months until the Sun/Moon hands meet the node and it predicts
an eclipse, a `GOLD_LUX` corona breaking the frame; void-vignette bronze build),
and `cairn` (game — The Cairn: tap where each of three irregular dithered stones
should rest on a dusk fell; near the balance line it holds, off it topples and you
retry — gravity is patient; the crowning stone catches the last light), and
`downhill` (game — Water Downhill: a tilt cousin of `aqueduct`; tap four stone
ledges to flip their slope until a trickle chains down and pours off the frame in
`CYAN_LUX`), and `tether` (story — The Tether: Paris 1783, cut the rope and the
ground lets go; Paris compresses into a map as you climb, embers eat the linen, and
the brazier flare throws `GOLD_LUX` sparks past the letterbox bars into the void —
cinematic-widescreen like `glass`), and `hedge` (story — The Living Wall: tap the
shrubs along thirty paces of an English hedge to count woody *species*; tapping a
repeat teaches that it is kinds you count, and Hooper's rule then dates the hedge
at ~700 years, older than the church behind it; a botanist's tally strip fills as
you go — full-scene English-lane build), and `seed` (wisdom — plant one and wait out the day/night cycle), `lightning` (story — Philadelphia 1882, Jennings holds a dry-plate open on a storm roof; the plate proves lightning is shaped like a river, not a zigzag), `whale` (story — a forty-tonne body sinks three km into unlit water and becomes a town of a hundred species over fifty years; per-pixel dithered water column in `cached()`, bioluminescence breaking the frame), and `pando` (story — pick four separate Utah aspens, then the ground goes transparent on one GOLD_LUX root system feeding all 47,000 stems). `plate` pilots the **2026-07 visual standard** (owner's master doc in `gameoflife/ideas/`, reference art in `ideas/ref/`):
jagged 16-bit vignettes in a pure-black void, muted environments, luminescent cyan/gold
interactive elements that break the frame (`PAL.VOID/CYAN_LUX/GOLD_LUX`, plus
`PAL.LEAF_LUX` — a luminescent green for nature-scene glow like fireflies). Shared `pixel.js`
gives all art crisp **defined sections** (1px darker seam between `bands()` colours) and
opt-in outline **edges** on `disc(cx,cy,r,color,edge)`/`rect(...,edge)` via `shade()`, plus a
warm `PAL.EMBER` contrast accent + `PAL.EDGE` ink; and for reference-grade scenes
**halftone dithering** (`bayer`/`rampDither` — stippled tonal ramps) + `softDisc`
(feathered vignette halos). `seam` is rebuilt to full `kintsugi-overflow.png` fidelity
(dithered Raku glaze ramp, gold veins with bright core, glowing cyan overflow); `dots`
also shares the toolkit — a cool halo behind the eyepiece + a dithered glass interior in
the lens + a cyan wash under the escaping orbits. (`plate` was given the same pass but
the halo/dither muddied its clean vignette, so it was reverted to its original art — the
toolkit is opt-in per scene, not a blanket restyle.) The owner's idea queue in that doc
takes priority over Claude's roadmap picks.
Dithering is expensive — one `fillRect` per pixel — so any scene whose art is mostly
static wraps it in **`scr.cached(key, drawFn)`** (`pixel.js`): `drawFn` paints into an
offscreen canvas once and is blitted each frame until `key` changes (`cached` retargets
`this.ctx`, so every helper works unchanged inside it). Used by `wait`/`gears`/`lichen`/
`hedge`/`seam`/`ice`; the discipline is to key on what actually changes
(`base:${found.size}`, `core:${stop}:${Math.round(scroll)}`) and lift every moving part
out of the callback — `gears` caches the radially symmetric gear bodies and redraws only
teeth/spokes, `lichen` caches the crust and keeps the pulsing apothecia live. When
drawing dither in 2px cells sample `bayer(x >> 1, y >> 1)` (the **cell** index): sampling
at even pixel coordinates only reaches 4 of the matrix's 16 values, all low, and the
stipple collapses into blobs. `startExperience` in `main.js` destroys `current` before
starting the next one — going experience→experience (as `__gol.debug.start` does) used to
leak the previous rAF loop against a detached canvas. Profile with Playwright + CDP
`Emulation.setCPUThrottlingRate(4)` and a wrapped `fillRect` counter, **one fresh page per
scene** or leaked loops inflate the counts.
**The 2026-07 terminal (locked visual plan).** The app is a quiet retro-futurist ship
terminal — Aliens computer screens crossed with zen. Two halves:
**(1) The CRT viewport** (`js/crt.js`). Experiences still draw into a flat 192×128 2D
canvas; what reaches the page is that canvas presented through a WebGL quad with a gentle
**barrel distortion** (`CURVE` 0.075) **overscanned** by `1/(1+CURVE)` so the picture
fills the bezel and only the corners round off (without it, black bands frame every
scene), **one scanline per source row**, a **phosphor bleed** off bright pixels tinted
toward the accent, and a corner vignette. No heavy bloom, no RGB separation. The bezel
itself is CSS on `.screen-wrap`. `PixelScreen` owns this: `this.ctx` still draws flat,
`this.canvas` is whatever is really on screen (the GL canvas, or the 2D one if WebGL is
missing — the fallback is silent and everything still works), and **`toPixel` runs the
same `warp()` the shader does**, or every hit test in every tappable scene drifts toward
the edges. `unwarp()` inverts it (4 fixed-point rounds, < 0.03 px) so the test loop can
tap by picture coordinates — `tapPixel(page, x, y)` in `smoke.cjs`. All live screens are
presented from ONE shared rAF; `liveCount()` is asserted to return to 0 on leaving a
scene, because a CRT still drawing on a destroyed scene is the leaked-rAF bug this
project has had before.
**(2) The terminal hub.** No living sky, no cards, no time-of-day greeting — a title, a
rule, one offering behind a `>` caret with its kind under it, `[ BEGIN ]`, `something
else...`, a rule, and a **status line** carrying every set-once switch: languages by code
(`fi en ja`, full name kept as the accessible name), the **screen accent**, sound,
hemisphere, the sound-garden `♪` glyphs, and the feedback link. The explanatory tagline
and cycle-hint still only show for newcomers (< 2 lifetime completions).
**The accent** (`ACCENTS` in `palette.js`, persisted as `accent`) is one phosphor colour
— cyan / green / white — driving the CSS `--accent`, the CRT's bleed tint, *and*
`PAL.CYAN_LUX`, so every in-scene interactive glow follows it. That last one means
**`PAL.CYAN_LUX` is not a constant**: read it at draw time, never `const C =
PAL.CYAN_LUX` at module level (that freezes at import — `ice`/`seam`/`downhill` had to be
converted). The app must never nag:
**rating is occasional** (`store.feedbackDue()` — after the 1st finish, then
every 5th; the footer's *leave a thought* link is always there, and an empty
submission records nothing rather than thanking you for silence), and
**"not yet" on a nature invitation holds for the visit** (`invitationPut` in
`main.js`, reset by the next finish) so a redraw or a language switch cannot
re-ask; Esc / a click on the backdrop is the same as *not yet*. Feedback
**leaves the browser** via `js/feedback.js`: paste a Formspree-style JSON
endpoint into its one `ENDPOINT` constant and notes POST there — unset, the app
sends nothing and *shows no delivery promise* (`fb.dest` only renders when
`outbound.configured()`); undeliverable notes go to a `store.outbox()` and
`flush()` drains them on the next visit one at a time, and every note is kept
locally either way. A fragment
deep-links one experience (`/gameoflife/#tether` → `openFromHash()`; `setHash()`
uses `replaceState` so it never fires the `hashchange` handler back at itself,
and the hub is always the plain address) — that is what makes a link shareable
for playtesting. `useLang()` mirrors the language onto `<html lang>`. Keyboard/
touch floor: a `:focus-visible` ring, `focusPrimary()` moving focus after a view
swap **only when the last input was a key** (so a tap never raises a ring), a
**44px minimum on every control** and **WCAG AA on every text colour** — both
measured in the smoke gate, because the muted-on-dark palette had drifted to
1.92:1 on the seasons label and both regressed twice while being fixed (text
greys are `#8d8165`, the primary button `#4e6839`; hierarchy comes from size,
never from being unreadable) — per-leaf rating `aria-label`s, `#app` as a `<main>`, `.exp-text`
marked `aria-live="polite"` centrally in `startExperience` (not in 22 modules)
with the scene canvas `aria-hidden` in `PixelScreen` — the text is the followable
channel — and `document.title` naming the current experience. The layout must
**hold still**: `.exp-text` holds six lines open (`min-height: 10.2em`) because
sizing it to short beats walked the Continue button ~190px between taps, and a
`max-height: 560px` block caps the scene at `38vh` so a phone held sideways fits
without scrolling. In portrait the title stays at the top and everything below it
floats to the middle (paired `auto` margins), with the scene placed **just above
the vertical midpoint** by a computed gap (`50vh − canvas height − 36px`, gated
behind `min-height: 700px` because on a 667px phone it costs a scroll). The UI
accent is **green** `#8faf6a` (headings, active toggles); gold stays inside scene
art only. **Every experience must be animated on its first screen** — a still
opening reads as a broken page — and for `cached()` scenes that motion is a live
layer drawn *after* the blit; the smoke gate samples each first screen twice and
names any that is frozen. `prefers-reduced-motion` freezes the decorative hub header
(one frame of the hour) while experiences keep animating. `pixel.js` gives a 192×128
`PixelScreen` upscaled with `image-rendering: pixelated`; `palette.js` is the single
colour source; `audio.js` is a quiet WebAudio kit routing **every** voice through one
master gain (nothing connects to `ctx.destination` directly) so the footer's
`sound on/off` toggle — persisted via `store.soundOn()` — mutes the app totally
and any sound added later inherits it; `storage.js` keeps completions /
cycle counter / 1–5-leaf feedback in `localStorage` (`golState`).
The **sound garden** is the reward loop's teeth: the hub's near-inaudible ambient
bed grows one voice per *accepted* invitation only (`accepted` in storage →
`gardenVoices()` capped at 5 → `audio.gardenStart(n)` layering ground note /
fifth / sparse pentatonic chimes / octave pad / bird figure). Screen time never
earns a voice; `gardenStop()` fires on entering an experience or the feedback
panel, so it plays on the hub alone. Shown in `.hub-footer` as `♪` glyphs
(plural-free across fi/en/ja) with a one-time "you went outside" acknowledgement. `window.__gol` exposes
`{store, audio, debug: {start, showInterlude, setLang, feedback}}` for console testing.
An opt-in **CRT look** (`crt on/off` in the footer, `store.crtOn()`, default OFF)
adds scanlines + tube bloom via a `.crt` class on `<html>`. Its period is locked to
the **source grid** (`background-size: 100% calc(100% / 64)` = one line per two of
the 128 canvas rows) — a fixed 3px period like dropcabal's beats against the
ordered dither and turns `whale`/`ice`/`seam`/`lichen`/`eel` to moiré. It is a
preference, not the house style: it flatters flat scenes and fights dithered ones.
The app is **offline-first**: `sw.js` precaches the shell cache-first and
`manifest.webmanifest` makes it installable — it sends you outdoors, so it has to
work where the signal stops. The worker registers on **https only** (or `?sw=1`)
so dev and the smoke gate never get a stale shell; `test/offline.cjs` kills the
server, goes offline and drives a whole experience, asserting zero network
requests. Its precache list must name every file (no build step), so
`check_levels.mjs` fails on a missing experience, a missing shared module, or
`?v=N` drift between `sw.js` and `index.html` — **bump the version in sw.js too**.
**Before adding an experience read `gameoflife/EXPERIENCES.md`** and copy
`js/experiences/_template.js` — it states the bar (all three languages, an
animated first screen, a real revert in the outro, a deterministic smoke block)
and the two art traps (dithering is opt-in; sample `bayer()` at the cell index).
Files under `js/experiences/` starting with `_` are skipped by the i18n scan.
Pipeline: develop on `claude/*` beta branches → greenlight to `main` → copy to
`gh-pages` to go live at `/Suds-Jack/gameoflife/` (same deploy caveat as paperboy);
bump `?v=N` cache-busters together when shipping. See `gameoflife/README.md` for the
roadmap of future experiences.

### Toko Midori Games — the brand (`toko/`)
The identity of the workshop, created by **美鳥十湖** (*Toko Midori*, "The Game
Creator") — the masked artist behind the look of every cabinet here: anarchist,
retro, pure-gameplay, art-first, using AI out loud while shouting **GO MAKE YOUR
OWN**. Zero dependencies, no build step, and **no image assets** — everything is
drawn in code and the SVG logo files are *generated* from the same arcs the
canvas strokes, so a handed-over file can never drift from what's on screen.
**The mark is the face** (`js/face.js`): four fat round-capped arcs and two
stems, all from ONE geometry table (`GEO`) that both the canvas painter and the
SVG emitter read. The mouth is two nested arcs opening up, **both stopping short
of a semicircle** so the tips stand up straight and leave air under the eyes;
each eye is one arc opening down (legs ~30° past horizontal) with a **stem
dropped from the inside of its crown** — the stem cuts the two slots, and the
slots are what make an eye an eye. `GEO.stroke` is the most sensitive number in
the brand: too heavy and the slots close and the eyes go solid (this actually
happened — the first cut was ~38% over and rendered blobs), so `test/brand.cjs`
computes the slot width and fails on it. Carriers: the bare face, reversed, the
**badge** (face on a disc — stickers, favicon, the in-game signature) and the
**icon** (full-bleed rounded square). **Minimum 44px**; `sign()` clamps to it.
Align to `bounds()` (the ink), never the design box — the face hangs low in it.
**Two colours only**: black `#000000` (CMYK 0/0/0/100) and magenta `#F0027F`
(CMYK 0/100/0/0) — both process primaries, so it prints anywhere with nothing to
match; white is the paper, not a colour. Magenta is 4.0:1 on black — a *mark*
colour, never body copy. The nine-flat **sticker sheet** (`SHEET`) is the single
documented exception and is a **print run** (badges, pins, vinyl), not a palette;
nothing digital reaches for it.
The **logotype** is a condensed squarish grotesque set in three lines, tight,
with ™ at the foot of *Games*; the lockup is face + gap + three lines with the
logotype standing the face's height. **The real typeface is the owner's licence
and is NOT in this repo** — register it as the family `Toko Grotesk` (a
`@font-face` block is stubbed in `toko.css`) and every lockup picks it up;
until then `substituted()` is true and the board shows a banner rather than
quietly shipping wrong letterforms.
`glitch.js` keeps the seam-showing toolkit — `tear`/`split`/`dropout`/`shuffle`/
`scanlines`/`carrier`/`noise` + `hit()`. **Seeded** (a glitch you can't
reproduce is a bug in a costume) and an **event, not a state** (below ~0.25 the
mark reads clean). But the *resting* animation of a Toko mark is a **blink** —
eyes squashing shut for a beat every few seconds (`pulse()` in `util.js`);
`sign()` takes `glitch: true` and does not assume it.
`signature.js` is the one-line drop-in (`sign()`): badge in a corner, `z-index
4` so it sits **under** the HUD, safe-area insets, one still frame under
`prefers-reduced-motion`. **`counter: true`** — what every signed game passes —
points it at `../#toko`, so the signature is the way to say something about the
game you are standing in, from inside it. Two rules there that look like
fussiness and are not: it is **a link only where there is a cursor**
(`(pointer: fine)`), because bottom-left is where half these games put the left
stick and a 44px anchor would eat the touch that starts a run — touch already
has `hub/shell.js`'s HOME button in the opposite corner; and it navigates on
**`pointerup` and `touchend`, never `click`**, the same trap shell.js paid for.
Signed on `main` AND on `gh-pages`: `toko-drop/`, `paperboy/` (black-on-white
there — magenta fights the sunny-day palette), `dropcabal/`, `hyperdagger/`,
`flashprince/`. **`gameoflife/` is
deliberately unsigned** — the room where Toko takes the mask off (a magenta
badge would undo a zen app built to send you outdoors), and its service worker
precaches a list scoped to `/gameoflife/` with `test/offline.cjs` asserting
**zero** network requests, so a cross-directory import would break the offline
promise anyway.
`chat.js` is **the counter** — a slim bar for the top of the arcade hub that
animates open into a Sierra/Police-Quest-style conversation: Toko's head as a
portrait (blinking at rest, mouth working while speaking), a typewriter
transcript, and a numbered topic menu (1-9 pick / ENTER skip / ESC leave). It is
a **hand-written dialogue tree in `dialogue.js`, not a language model** — no
network call, so the offline-first promise holds; topics `opens:` others so the
tree grows as you dig. Self-contained (injects its own scoped CSS, reads the
brand custom properties with literal fallbacks), so it drops onto any page. Three
things it got wrong first and now guards: the typewriter was a `setTimeout` chain
and drifted to ~2.6s for a 1s line (timer resolution per character — it is now
time-driven off one rAF walking a precomputed schedule); the goodbye topic closed
the panel from a callback hung off the end of the typing, so **skipping** the
typing left the counter open forever (`after` now fires from `finishTyping`); and
stacked at the 44px tap floor the menu made a ~600px panel that pushed the
cabinets below the fold (two columns where there is room).
**Trilingual** like the arcade: English is the source inline in `dialogue.js`,
`dialogue.fi.js`/`dialogue.ja.js` are pure string packs overriding by topic id
with per-key English fallback, and the counter follows `__hub.lang()` → `<html
lang>` → en (watched with a `MutationObserver`, since hub.js re-renders rather
than firing an event). It never re-types the transcript. Both packs are drafts;
the **parser is en/fi only** — its tokeniser splits on spaces, so the Japanese
KEYS table is deliberately empty and the menu is the path there.
**It runs both ways.** A `>` **parser** line takes a typed sentence and matches it
by word overlap against a keyword table (`find()` — still no model, and a miss
*says so* rather than answering the wrong question; typing reaches `locked` topics,
which is the reward for using your own words). **`note: true`** opens a box and
posts through the **arcade's own** `window.__hub.feedback` rather than a second
transport — saying nothing records nothing, and he never claims a delivery that
did not happen (`sent-blind` / `queued` / no-hub each get their own line).
**`scores: true`** reads the games' `localStorage` hi-scores off *your* machine,
shows them and sends them nowhere; **`notes: true`** reads your own past notes
back out of the archive and **`changed: true`** reads out `CHANGED` — a
*hand-kept* log of what actually got fixed, which is what stops a suggestion
box going stale (it never claims you asked; it does flag a cabinet you noted
about, once); a note taken in front of a cabinet **files under that
game's id** (plus the topic he was on), which is what makes the counter usable
as the single front door for feedback rather than a fourth inbox; **`askFaves: true`** racks up `FAVOURITES` — the games he did NOT
make, which is where the mantra turns into receipts (no Play link on those:
there is nowhere to send you). **`askGames: true`** turns the menu into a rack
of the **live** catalogue and he says his piece about whichever cabinet you point at
(`GAME_NOTES` per id, falling back to that game's tagline, so one added tomorrow
is answerable tonight — and naming it at the parser gets it directly). `asks:` turns the menu into your mouth for a
turn; `gift:` hands over the badge as an SVG data URI; `torn:` tears the portrait
while he answers (a glitch is an event, so it decays); `after:`/`needs:` gate a
topic by hour and by how far you have dug. `#toko` opens the counter. Traps found
building it: **`end` topics need a reserved slot** or goodbye falls off the
nine-item menu; a **field owns its own keys** (typing "3 CRASHES" used to pick
topic three); the panel's grid rows must be `minmax(0, 1fr)` or an `auto` row
overflows the clipped cap and hides the bottom of the menu on a phone; **no
back-ticks in the CSS template literal**; and `glitch.js` works through
`getImageData`, so a DPR `Surface` must pass **device** pixels plus a
`scale` (its displacements are tuned for a 44px mark).
**He knows which cabinet you just left.** The badge links here, so the referrer
usually names the game: the closed bar asks *how was hyper dagger?* before you
open him, he opens on that cabinet instead of a generic hello, and the note that
follows files under it. It reads **`document.baseURI`**, not `location`, because
`/AnotherHUB/` is the same page one level down behind a `<base href="../">`. No
referrer (bookmark, typed address, `file://`) is just the ordinary greeting — a
nicety, never a mechanism. The counter also **states its version** (`V5` in the
footer) from `VERSION` in `dialogue.js` rather than a fetch, so it is right
offline; `toko/VERSIONS.md` is the log, `scripts/versions.mjs` reads it into
`hub/versions.json` via a short `EXTRA` list (the brand is not a cabinet), and
the gate fails if code and log disagree.
`sting.js` is a ~3s sting where the face **draws itself** (arcs revealed by
dash-offset so they grow along their own path: mouth sweeps open → eyes drop in
→ blink → logotype lands), skippable on any input from frame one. The arcade
plays it **once per browser on the first Play** (`playStingOnce`, key
`tokoSting`), not merely on arrival: the mark belongs in front of a game, not
its menu. It is imported dynamically and swallowed on failure, so a nicety can
never be the reason a game does not open. `masthead.js`
is the animated lockup for the arcade hub — `stop()` it wherever the page
re-renders or the loop leaks against a detached canvas. `surface.js` is the
DPR-aware smooth canvas (the mark is curves, so antialiasing stays ON).
`toko/index.html` is the **brand board**, built out of the shipping modules.
`toko/test/brand.cjs` is the gate (Playwright, 184 checks): geometry invariants
(slot width, stem/crown merge, mouth-clears-eyes, symmetry), **every rendered
pixel checked against the two-colour system**, SVG well-formedness + that it
emits exactly the canvas's arcs at the shipping stroke weight, the sting
mounting/skipping, each signed game's badge (a link with a cursor, inert under a
thumb), and a real walk **out of a cabinet and into the counter** — two fixtures,
`toko/_tokentest.html` and `toko/_fromtest.html`, exist for that.
Two honest caveats recorded in `BRAND.md`: the face geometry is **measured off
the master artwork**, not lifted from the original vector file (replace `GEO` if
that file surfaces), and the logotype face is substituted.
**Deployed:** `toko/` is live on `gh-pages` and the counter is mounted at the top
of BOTH hub entry points (`index.html` and `AnotherHUB/index.html`) with one
module import that must sit **after `hub/hub.js`** — hub.js assigns
`window.__hub` wholesale, so a handle hung on before it is thrown away
(`window.__hub.chat`); the chat picks up hub.css's `--panel`/`--line`
so it sits inside the terminal's own chrome while keeping magenta for Toko. The
gh-pages copy omits `test/` (that branch ships docs but no test dirs). The games
**are signed on gh-pages** now, and `toko-drop/` and `hyperdagger/` there carry
offline service workers whose precache lists name `../toko/js/signature.js?v=N`
plus its five deps — so **changing `signature.js` means bumping that token and
the list entry in the same change**, or those two games serve the old badge out
of cache forever while every other cabinet gets the new one.

### Toko Drop (`toko-drop/`)

**THE MAIN PROJECT (owner's call, 2026-08).** Attention goes here first; Hyper Dagger
is second; everything else is maintenance unless the owner says otherwise. The owner's
diagnosis, recorded so sessions stop repeating the pattern: most games in this repo are
stuck at their initial prototype look and feel — every game got one intense burst that
produced a working prototype and never a second one. The way out is the method that
worked on the cover art: a reference from the owner, then render → LOOK → name what is
wrong → redo, discarding drafts freely — applied to one system at a time against
captured MOTION (`scripts/enemy-loop.mjs` records GIF loops from the real game code),
not against stills or state assertions, because the smoke gates certify *works* and
prototype-feel lives entirely in the part they cannot see.

Browser twin-stick swarm-survival game built with Three.js and ES modules, with
no build step. The current live implementation is the canonical gameplay
reference; the old UE5 notes no longer describe this repository.

- **`js/tuning.js` is the single source of truth for enemy look and feel.**
  Constants covered by `TUNING` must be read from it rather than duplicated in
  `enemy.js` or `main.js`.
- `enemy-lab.html` is the standalone visual reference. When a written brief and
  the lab disagree, the lab wins.
- `js/enemy.js` owns enemy types, behaviours, goo shaders and gel geometry.
- `js/main.js` owns orchestration: the game loop, waves, collisions, HUD and
  title/pause/death screens.
- `js/bullet.js`, `js/player.js`, `js/input.js`, `js/audio.js`, `js/lang.js`,
  `js/designer.js` and `js/retro.js` hold the major supporting systems.
- `TOKO_DROP_ROADMAP.md` is forward planning, `GDD.md` contains design truths,
  and `VERSIONS.md` records shipped changes.

**Release and visual-validation discipline:**

- Run `scripts/smoke.sh` for the main game gate. If a change affects modes or
  `inCabinet()`, also run `scripts/cabinets.sh`; it boots and plays all six
  cabinets and checks for mode leaks, retro-pass failures and page errors.
- `scripts/enemy-loop.mjs` records short looping GIFs from the real game code.
  Use it for movement and readability questions instead of hand-building a
  separate capture harness. Scenarios live in the script's `SCENARIOS` map.
  Stage captures in a throwaway copy of `toko-drop/`; test-only harness code
  must never reach the shipped tree. Do not use Playwright's `networkidle`
  wait because the service worker keeps the network active. SwiftShader takes
  roughly 1.5 seconds per screenshot, so run longer loops in the background.
  Keep capture-only dependencies such as `gifenc` and `pngjs` in scratch and
  expose them with `NODE_PATH` rather than vendoring them into the game.
- Every playable-project release must update its `hub/games.js` title/tagline,
  controls and status/note where relevant, plus `hub/versions.json`; bump every
  affected hub-module and worker cache token. Deploy the build
  and catalogue copy together to `gh-pages`, verify both the hub entry and live game
  actually load and play, then report the hub link and version. A merge alone is not
  a playable release.
- Every Toko Drop game change needs a new top entry in `VERSIONS.md` and matching
  cache tokens. `scripts/bump-version.sh <N>` performs the coordinated bump.
- Install the version guard with
  `cp scripts/pre-commit .git/hooks/pre-commit`. Never skip hooks with
  `--no-verify`, and never force-push a default or production branch.
- The live site remains on `gh-pages` until the source-of-truth migration is
  completed. Reconciliation branches must not deploy or force-push production.
- New resource paths need versioned URLs from their first release because the
  Pages CDN may temporarily cache a pre-deployment 404.

**Current production workflow (until the migration is complete):**

- Toko Drop changes go through a pull request and squash merge into
  `gh-pages`. After the merge, `scripts/release.sh` force-resyncs the working
  branch to `origin/gh-pages`; it discards unmerged commits on that working
  branch, so preserve or merge them before running it.
- Other games may be pushed directly to `gh-pages` only when the commit is
  limited to that game's directory. Concurrent agents must resync after those
  pushes and account for superseded deployment runs.
- After every production push, verify that the **pages build and deployment**
  Actions run—not merely the commit status—concludes `success`. A failed or
  superseded deployment can otherwise look exactly like a broken site.

## Repository Structure

```
sudsjack/       # Suds Jack — the rebuild: Bomb Jack's collection on Tempest's tube
  index.html    #   (the playable original is still sudz/ on gh-pages)
  VERSIONS.md
  vendor/       # three.js r167, local — not the CDN
  js/
    tube.js     # the channel: (lane, depth) → world, and the five shapes
    player.js   # the claw on the floor; the dive, and the lane-lock that pays for it
    things.js   # risers: bubbles (one lit) and grime (steps toward you); pops
    main.js     # scene, render stack, director, scoring, levels, HUD, states
    input.js    # keys / pad / drag-the-rim touch, all feeding three getters
    audio.js    # synth kit: pop, lit, miss, dive, hit, level, and a two-note bed
    palette.js  # soap: everything you want is cold and blooms, everything else is warm
  test/
    smoke.cjs   # 25 checks, driven off game state rather than the clock
index.html      # the arcade: every game on one page, Play + Feedback each
hub/
  games.js      # the catalogue — one entry per playable thing (path, accent, art, inRepo)
  art.js        # a 128×72 pixel marquee per game, drawn in code (no image assets)
  feedback.js   # SHEET_ENDPOINT (no-cors) → Formspree → local archive + retried outbox
  hub.js        # renders the cabinets, runs the feedback panel (modal, focus, Esc)
  hub.css       # the dark room; AA contrast + 44px controls are load-bearing here
test/
  hub-smoke.cjs # headless checks over the hub
toko/           # Toko Midori Games — the brand (face, lockups, sting, signature)
  BRAND.md      # the rules: the creed, construction notes, the two colours, do/don't
  index.html    # the brand board — every mark live, glitch lab, SVG downloads
  toko.css      # palette as CSS custom properties + the CSS-only glitch text
  js/
    palette.js  # the two colours, the sticker sheet, the type spec, VOICE
    face.js     # THE MARK — one GEO table; drawFace/Icon/Badge + svgFace/svgBadge
    lockup.js   # logotype (1- and 3-line), the lockups, sticker sheet, credit line
    surface.js  # DPR-aware smooth canvas + reduced-motion-safe rAF loop
    glitch.js   # tear, split, dropout, shuffle, scanlines, carrier, noise, hit
    util.js     # seeded RNG + pulse() (the resting blink)
    sting.js    # the ~3s sting, the face drawing itself (skippable frame one)
    chat.js     # the counter — Sierra-style conversation panel for the hub
    dialogue.js # what Toko says: the hand-written topic tree
    signature.js# sign() — the corner badge; counter:true links it to #toko
    masthead.js # the animated lockup for the arcade hub
    board.js    # wires toko/index.html out of the shipping modules
  test/
    brand.cjs   # Playwright gate: geometry, two-colour ink, SVG, sting, signed games
toko-drop/
  index.html
  js/
    main.js     # Three.js scene, game loop, collision, wave management
    input.js    # Virtual joystick (touch) + WASD/mouse fallback
    player.js   # Player movement, dash mechanic, firing
    enemy.js    # Enemy class — 4 bullet-hell patterns, each with distinct color
    bullet.js   # Object-pooled bullets (300 cap, shared pool for all bullets)
paperboy/       # Paper Route — Dawn Run (Paperboy clone, toko-drop art, new palette)
  index.html
  js/
    main.js     # Scene + render pipeline (bloom/chroma/ACES/IBL), loop, collisions, HUD, states
    palette.js  # Central warm-dawn colour scheme (single source of truth for all tints)
    world.js    # Route streaming (houses/hazards/pickups) + cull, paper→house resolution
    player.js   # Gel rider + low-poly bike, steer/throttle, lean, crash mercy, ghost trail
    paper.js    # Object-pooled thrown papers with arc/gravity physics + landing detection
    input.js    # Touch stick (steer/throttle) + two throw buttons; WASD/ZX keyboard fallback
    audio.js    # WebAudio bleep kit (throw/deliver/smash/pickup/crash/day-clear)
dropcabal/      # Drop Cabal — Cabal-style gallery shooter, toko-drop enemies, pixel render
  index.html
  js/
    main.js     # Scene (sunset sky/hills/checker field), pixel renderer, crosshair raycast,
                #   spawn director, tracer/orb/grenade collisions, HUD, states
    palette.js  # Suds-sunset colour scheme (sky/hills/ground/towers/player)
    enemy.js    # Toko Drop gels on depth rows: GLOBBO/YELA/SPITTOR/ORANGE/SPLITTA(+MINI)
    player.js   # Gel commando: run along strip, gun lookAt crosshair, dodge roll, mercy
    shots.js    # Pooled tracers (prev-pos segment tests), enemy orbs (lob gravity), grenades
    fx.js       # InstancedMesh debris pool + additive boom shells
    input.js    # Mouse aim/LMB fire/A-D run/Space roll/G-RMB nade; dual virtual sticks (touch)
    audio.js    # WebAudio bleep kit (fire/thock/splat/boom/pew/fanfare…)
hyperdagger/    # Hyper Dagger — FPS Devil Daggers × HYPERDEMON homage, voxel enemies
  index.html
  js/
    main.js     # Scene (grid arena, rainbow sky, afterimage/bloom/chroma), director, combat, HUD, style meter
    voxel.js    # String-art voxel models + parser, VoxelSprite (InstancedMesh), DebrisPool physics
    enemy.js    # Skull/Wraith, Brute, Totem (spawner), Serpent (chain), Spider (thief), Leviathan
    daggers.js  # Object-pooled dagger projectiles; homing steer at LV 3; segment hit tests
    gems.js     # DD-style gem drops: ballistic scatter, hover, player magnet, collect
    player.js   # First-person controller: yaw/pitch, WASD/stick strafe, jump, dash, head-bob
    input.js    # Pointer-lock mouse+WASD, gamepad (sticks/RT/A/B), or dual touch sticks; tap-vs-hold fire
    audio.js    # WebAudio synth kit (fire/hit/gib/gem/levelup/dash/roar/death + drone + intensity music)
flashprince/    # Flash Prince — cinematic platformer, Another World × Flashback × PoP
  index.html
  VERSIONS.md
  js/
    screen.js   # 320×192 polygon buffer + the pass that quantises it to 16 colours; cached()
    palette.js  # the sixteen as ROLES, six biome sets, and the continuous fade between them
    figure.js   # 13-angle poses → eleven polygons; the pose library and clip sampler
    hero.js     # the move table: scripted lengths, ledges, mantles, falls, the pistol
    enemy.js    # Sentry (spot→draw→aim→fire on the same clock you are on), Beast, Drone
    rooms.js    # fourteen 20×12 ASCII screens + the one line of text each act gets
    level.js    # tiles, collision, ledge finding, traps, and turning the grid into masses
    scenery.js  # flat polygon backdrops with overlapping biome windows; fronds, glyphs
    fx.js       # debris, shots, shake, flash
    input.js    # keys (up is also jump), gamepad, on-screen cross; direction HOLD counting
    audio.js    # one held drone tuned by biome + one envelope per event, nothing looping
```

## Toko Drop — Architecture Notes

**Entry point:** `toko-drop/js/main.js` sets up the Three.js scene, wires input/player/enemy/bullets together, and runs the game loop.

**Controls:** Virtual twin-sticks (left half / right half of screen). Right stick release triggers a **dash** with i-frames. Desktop fallback: WASD move, hold LMB + mouse to aim and fire, Space to dash.

**Enemy patterns** (all four spawn simultaneously per wave, each with a unique color):
- `Pattern.RING` — orange, radial burst of 10 bullets every 2 s
- `Pattern.SPIRAL` — purple, rotating single shot every 80 ms
- `Pattern.SPREAD` — blue, 5-bullet aimed cone every 1.5 s
- `Pattern.ALTERNATING` — green, alternates ring burst and direct aimed shot every 1.1 s

**Bullet pool:** `BulletPool` pre-allocates 300 `THREE.Mesh` instances. `spawnDir(x, z, dx, dz, isPlayer, color)` pops from pool; `recycleAt(i)` splices active array at index `i` (always iterate backwards when recycling mid-loop).

**Dash:** 0.18 s at 26 units/s, 0.9 s cooldown, invincible during dash. Direction uses last aim direction if stick was released before movement.

**Wave progression:** when all 4 enemies are dead, `spawnWave()` removes old meshes from scene and spawns fresh enemies at `0.6 × HALF` radius in a cross pattern. Wave counter displayed in UI.

## Drop Cabal (`dropcabal/`) — Architecture Notes

**Layout:** player strip at z = 8 (`PLAYER_Z`), sandbag row at z ≈ 2.8, enemy depth rows
at z −7 / −16 / −26 (`ROWS`, weighted far-heavy), destructible towers scattered z −9…−28,
invisible crosshair far wall at `AIM_WALL_Z` −32, hills/sky behind it. Camera is a
perspective cam at (playerX·0.35, 7.4, 19.5) — it trucks with the player for the Cabal
scroll, plus trauma shake.

**Aim / layered shooting:** `computeAim()` raycasts the pointer through the camera at
the ground plane; misses (or hits behind the wall) fall back to the z −32 wall plane.
Tracers spawn at the gun tip toward the aim point (+jitter) at 90 u/s and keep `prev`
each frame; `collideTracers()` picks the LOWEST segment-param hit among tower chunks
(sphere-approximated), enemies, and enemy orbs (shootable, +20), else ground puff /
far-wall recycle — so near things really do eat shots aimed at far things.

**Enemies (`enemy.js`):** toko-drop family — GLOBBO (teal hop, aimed orb), YELA CUBE
(fast slide, quick orb), SPITTOR (red gel, gravity lob), ORANGE CUBE (3-spread), SPLITTA
(big green, splits into 2 rushing MINIs on death — minis kamikaze the player plane and
don't count toward spawn quota). Enter from a row edge, then strafe between random
targets; fire only once in `strafe` state. Debuts (non-GLOBBO) toast once per run.

**Stage flow:** quota = 14 + stage·6 kills; the director keeps ≤ min(8, 3+stage·0.8)
mains alive, interval tightening with stage. `killEnemy` → gauge; quota reached →
`stageClear()` pops stragglers, +1 bomb, bonus = stage·1000, 2.4 s banner → next stage
(fresh scenery, +1 tower per stage capped +3). Bonus towers (gold cap, 22%) give +1
grenade when fully levelled. Player: 3 lives, orb/mini hit costs one unless rolling
(0.36 s, i-frames) or in 2 s mercy flicker; grenade = 0.75 s arc to the crosshair ground
point, r 5.4 boom killing enemies/towers/orbs. Hi-score in localStorage `dropCabalHi`.
Touch is **dual virtual sticks** drawn on a full-res `#ui` canvas overlay: left stick
x = run, right stick is a **rate controller** (deflection = crosshair velocity, `AIM_PX`
1100 px/s at full tilt, integrated in `applyTouchAim`) + autofire while held; a quick
sub-250 ms / sub-12 px tap on EITHER stick = roll; idle sticks show dashed RUN/AIM
hints once touch is seen. Module imports carry `?v=2` cache-busters (paperboy
convention) so gh-pages picks up coherent versions.

**Pixel render:** `renderer.setSize(iw, 220, false)` + CSS `image-rendering: pixelated`
(canvas stretched to viewport) + scanline overlay div; `NearestFilter` on the sky /
checker `CanvasTexture`s. The sky canvas is 608×256 to match the 190×80 plane aspect so
the sun stays round. Careful iterating pools: `hitPlayer()` calls `orbs.clear()`, so the
orb-vs-player loop re-checks `i` against length; `boomAt`/mini handlers bail out when a
kill triggers `stageClear`/`gameOver` mid-loop. `window.__dc` exposes
`{enemies(), orbs, tracers, player, debug: {state, score, setStage, addNades, killAll,
start}}` for console tinkering and headless smoke tests.

## Hyper Dagger (`hyperdagger/`) — Architecture Notes

**Voxel pipeline (`voxel.js`):** `MODELS` defines enemies as string-art layers —
`layers[0]` is the bottom slice, each layer an array of rows, row 0 the *front* face
(mapped to +z so `Object3D.lookAt(player)` points the face at the player). Palette values
are hex ints, or `[r,g,b]` arrays with components > 1 for **HDR glow voxels** (eyes,
totem veins) that trip the bloom threshold while bone/body stays matte. `VoxelSprite`
bakes a model into one `InstancedMesh` (per-voxel `setColorAt`; hit-flash brightens
`material.color`, which multiplies every instance). `DebrisPool` is a single 1600-cube
`InstancedMesh`: gravity −28, floor bounce ×−0.38 with friction, Euler tumble, shrink-out
over the last 0.3 s; `burst(worldVoxels, …)` explodes a dead enemy's actual voxels
outward from their centroid plus the killing dagger's impulse.

**Combat:** hold LMB (or hold the right touch stick) = dagger stream. Weapon levels via
gems — `LEVEL_GEMS = [0,0,10,30]`, `WEAPON[lv]` sets stream rate / homing. LV 3 daggers steer toward the best target in a
~37° cone (`DaggerPool.update(dt, targets)`). Each dagger keeps `prev` position and
collisions use **segment-vs-sphere** tests so fast projectiles can't tunnel. Skulls take
knockback along the dagger direction (brutes mostly resist via lower `knock`).
Enemy → player kill test is against both torso and camera positions; totems don't kill,
they `player.pushOut(...)` as solids. Gems (`gems.js`) scatter ballistically, hover, then
magnet to the player inside 5.5 u.

**Spawn director (`main.js`):** all heavy spawns are **telegraphed** — an additive light
beam marks the spot for 0.7 s (`pending[]`), then the enemy appears. First-appearance
times are spread across the first ~150s so mechanics land one at a time rather than
piling up (each debut in `resetRun()`, each recurring cadence tightening via
`Math.max(floor, base - gameTime * rate)` in `director()`; each debut fires a one-per-run
`announce()` — big toast + `audio.stinger()`, keys in `announced{}`, the Leviathan
re-announcing on every respawn): totems (cap 6, slow orbit
drift) from t=0 every 24s tightening to 16s, exhaling skulls (global cap 46, 30% gilded
`Wraith` after 60s) at a tightening interval and pulsing an orb ring every 6s; **watchers**
(cap 3) from t=25 every 20s tightening to 12s; brutes from t=45 every 16s tightening to
10s; **thorns** from t=60 (0.9s sigil warning, lethal below `feet.y` 1.4) every 12s
tightening to 6s; **spiders** (cap 2) from t=75 every 30s tightening to 20s, laying an egg
sac every ~10s; **blinkers** (cap 3) from t=90 every 25s tightening to 14s; **serpents**
(cap 2) from t=100 every 45s tightening to 32s — every second serpent is a ghost; the
**Leviathan** from t=150, one at a time, respawning every 120s. Totem exhales roll
splitters (15%, > 45s) before crowned skulls (30%, > 60s). A `Serpent` is a controller
owning 12 `SerpentSegment` enemies (pushed into the main `enemies` array so the normal
collision loops apply); the head weaves around the player and dive-bombs every 8s,
surviving segments chain-follow at 0.95 u spacing, and each ring gibs + drops a gem
individually. Spiders skitter on the floor and eat loose gems — killing one refunds
everything it swallowed + 1. The Leviathan is a 60-HP god-head at the arena centre that
exhales skulls and every 9s drags the player toward itself for 1.8s (`player.nudge` at
7 u/s — walk or dash out); it drops 10 gems. A pairwise separation pass (skull/brute
only) keeps the swarm from collapsing into one blob.

**Death recap (`main.js`):** `killsByType` tallies kills by `e.type` (Wraith/Splitter/
MiniSkull all report `'skull'` — they never override the base type, so the breakdown
line only ever needs the handful of distinct enemy types) and `lastKiller` is
overwritten by every `playerStruck(sx, sz, killerType)` call, so on the fatal call it's
already the correct cause — no post-hoc reordering needed. `showDeath()` builds a
"felled by ___ · daggers LV_" line plus the kill breakdown, then reads/writes a
`hyperDaggerHistory` localStorage array (last 10 runs, newest first) and renders
`hist.slice(1, 9)` — skipping index 0, the run that was just pushed — as the "recent"
line, since showing the run you're already looking at the big stat line for is
redundant. TIME OUT (HYPER's clock hitting 0 in `step()`) bypasses the cause line
entirely rather than blaming a stale `lastKiller` from an earlier survived hit.

**Modes:** menu-button toggle, persisted in `localStorage` (`hyperDaggerMode`). PURE =
one-touch death (DD). HYPER = HYPERDEMON rules: `lifeT` drains in real time (start 30,
cap 60), kills add `e.score` seconds, an enemy touch costs 10 + `player.nudge`
knockback + 1.2 s `mercyT` i-frames, and 0 → `die(true)` = TIME OUT. Hi-scores are
per-mode (`hyperDaggerHi` / `hyperDaggerHiHyper`).

**Input quirks:** shooting is minimalistic — the stream is automatic whenever move
input is nonzero (`getMove()` length > 0.15), and holding LMB / the look stick fires
while standing still. A sub-250 ms / sub-12 px tap on EITHER stick = jump (works
mid-air for the double jump; a second finger tapping an occupied half also jumps); a
fast ≥40 px flick within the last 150 ms before release on **either stick = dash**
along the screen-space flick direction. No on-screen buttons —
touches that start on DOM controls (`button`, `#pauseBtn`) are left alone so the pause
menu stays tappable. Pointer-lock mousemove deltas with `hypot > 400` are dropped —
some browsers emit one giant bogus delta right after locking. On desktop the pause
button can't be clicked while pointer-locked (lock routes all events to the canvas) —
Esc is the pause path there; the button exists for touch. **Gamepad** is a third path:
`input.pollGamepad()` runs once per frame in `animate()`, reading the first connected
controller and feeding the SAME `getMove`/`getLookRate`/`firing` getters as
mouse+keyboard (left stick move, right stick look-rate, RT/RB hold-fire) with A =
jump ×2 and B/LT = dash edge-detected in the poll — so nothing downstream knows a pad
is in use. Axes are deadzoned (0.18) and the move vector clamped to unit length. When
no pad is present the getters fall through to the existing mouse/keyboard/touch logic.

**Style meter (`main.js`):** a Returnal/DMC-style rank that rewards chaining. `addStyle`
adds by event (per-type kills via `STYLE_GAIN`, +4 per dash-through-orb credited once
via `o.phased`, +n on gem pickup) into `styleVal` (cap 150); `step()` bleeds it every
frame at `6 + styleVal*0.05` per second so the top tiers (`STYLE_TIERS` D→SSS) stay
fleeting and demand a continuous chain. The tier drives a HUD badge (`#style` rank +
`×mult` + fill bar, `updateStyleHud()`), folds into music intensity (0.35 weight
alongside threat count and run progress), and only **S+** rank-ups toast/flourish so
lower crossings never clobber an enemy-debut announcement. `stylePeakIdx` is the
run-end "peak rank" recap line. Debug: `__hd.debug.addStyle(n)` / `getStyle()`.

**Render / feel:** ACES tone mapping + `EffectComposer` (`RenderPass` →
`AfterimagePass` 0.72 (HYPERDEMON motion smear) → `UnrealBloomPass` 0.7/0.45/0.6 →
chromatic-aberration `ShaderPass` → `OutputPass`); smear/shake/chroma each sit behind a
pause-menu toggle. Bloom is *selective* via HDR colors (white daggers/blade/crown, red
eyes/veins/gems exceed 1.0). A **trauma** value (kills, shotgun, dash,
death) drives camera shake + the chroma amount; dash and shotgun kick the FOV. The
first-person **voxel gauntlet** is a camera child (`scene.add(camera)` required) at
z −1.05 — closer and it smears into a slab at the screen corner; its glove is
checkerboarded because unlit same-color voxels read as one flat polygon. Death = red
vignette + slow-mo debris.

**Audio (`audio.js`):** all-synth, no assets. A detuned-saw **drone** underlays every run;
over it sits an **intensity-driven music layer** — an A1 minor-pentatonic arpeggio on a
lookahead scheduler (`musicUpdate(intensity)` called each frame schedules 16th notes
~0.15 s ahead so it stays steady regardless of frame rate; falling >0.25 s behind, e.g.
after a pause, resyncs instead of bursting). Voices layer in by intensity (computed in
`step()` from live-threat count + run progress): bass always, arp > 0.25, hi-hat tick
> 0.5, lead counter-melody > 0.75. `musicStart/Stop` bracket the drone in `startGame`/
`die`; a MUSIC pause-menu toggle (`opts.music`) reconciles live via `applyOpts` →
`musicPlaying()`.

Sky is a `BackSide` sphere: greyscale band shimmer over black with one dark-red ember
glow at the horizon (`fog: false`); the floor is a `CanvasTexture` white-on-black grid
on a circle of exactly `ARENA_R` — the grid simply ends at the edge, no barrier mesh. Death/menu/pause are DOM overlays; touch sticks
are drawn on the `#canvas-ui` overlay each frame. Hi-score lives in `localStorage` under
`hyperDaggerHi`. `window.__hd` exposes `{enemies, player, debris, daggers, gems,
serpents, audio, debug}` (debug: `addGems(n)`, `spawnSerpent()`, `spawnSpider()`,
`spawnLeviathan()`, `setTime(t)` + `getSchedule()` — the raw `nextXAt` timers, for
verifying onboarding pacing / announcements without real-time simulation) for console
tinkering and
automated smoke tests.

## Paper Route (`paperboy/`) — Architecture Notes

**Coordinate system:** forward = −z (the bike auto-advances into −z); +x is right. The
road, lawns, and kerbs are long static meshes re-centred on `player.position.z` every
frame, and the road's lane texture scrolls via `roadTex.offset.y` to sell the speed —
so the world is effectively infinite without moving the geometry.

**Camera / art:** a fixed-angle `OrthographicCamera` offset by `ISO_OFF` from the bike
gives the isometric Paperboy read; the route rolls mostly *up* the screen with a slight
rightward lean. Rendering is a plain `renderer.render` (no `EffectComposer`) with
`NoToneMapping`, and every mesh is **unlit `MeshBasicMaterial`** — no lights, shadows or
fog — for a flat 2D look. House "flash" on a delivery/smash is a colour lerp toward white
(`bodyMat.color.lerp(_WHITE, k)`), since `MeshBasic` has no emissive channel; `baseColor`
is updated on delivery so the house stays green after the flash settles.

**Streaming (`world.js`):** houses (both kerbs), hazards, and pickups spawn ahead of the
bike (independent z-cursors advancing toward `playerZ - SPAWN_AHEAD`) and are culled +
disposed once well behind. Houses are randomly subscriber (~55%, mint) or not (coral).
Each house carries a delivery zone `{ zoneX, z, zoneR }` near its mailbox.

**Throw → delivery:** `paper.js` is an arc-physics pool — `throw_(x,z,side,speed)` launches
a paper with lateral velocity toward `side`, slight forward lead, and gravity. On landing
it's flagged; `main` polls `papers.freshLandings()` and calls `world.resolvePaper(p)`,
which finds the nearest same-side house within `zoneR`: subscriber → deliver (250 ×
streak), non-subscriber → window smash (100). Tuning that matters: `THROW_VX`,
`HOUSE_X`/`zoneX`, and `zoneR` jointly set the deliverable lane band — land-x ≈
playerX + THROW_VX·flightTime must fall within `zoneX ± zoneR`, so the rider delivers
from the matching lane, not dead centre.

**Crash / lives:** `world.hazardHit()` returns an overlapping live hazard; a hit calls
`player.crash()` (mercy i-frames + flicker, returns false while invincible to avoid
double-hits), costs a life, breaks the streak. 0 lives → game over → auto-restart.

**Days:** every `DAY_DIST` (130 m) increments the day, bumps `player.setBaseSpeed` and
`world.setDifficulty` (hazard density + car speed), and awards a bonus. Hi-score persists
in `localStorage` under `paperRouteHi`.

**Controls:** desktop A/D-←/→ steer, W/S throttle, Z/X (or M) throw left/right, Space
throws toward the lean side, Esc pause. Touch: left-half stick (x = steer, y = throttle)
+ on-screen ◀ ▶ throw buttons whose hit-rects live on `InputManager` and are drawn by the
HUD.
