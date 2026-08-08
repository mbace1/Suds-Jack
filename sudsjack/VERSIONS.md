# Suds Jack — versions

The rebuild. **The playable Suds Jack is still `sudz/`** — the original canvas
vector tube shooter — and it stays the one the arcade points at until this one
is better than it. Two things sharing a name is confusing enough without the
floor sending people at the unfinished one.

The `?v=N` token in `index.html` tracks module-graph changes; this number is
the public release. Bump both when shipping.

## v7 — 2026-08-08

**On rails.** (Owner's direction: "it should be cool and changing wireframe
on-rails shooter, but it's just stuck.") The gun comes back, and the founding
line — "Bomb Jack is the game, no weapon" — is reversed on purpose: the quiet
collector was considered and it was stuck. v7 is sudz and the rebuild in the
same tube.

**The flight.** You are moving. The ribs are evenly spaced and STREAM toward
the mouth (`tube.flow`), which is what speed looks like in a drawing made of
lines. The sector is a distance now, not a bubble count — it is FLOWN, at
`flightSpeed(n)` depths per second, and you cannot camp a distance. The HUD
reads `S3 · 62%`.

**The change.** At 60% of every sector the channel starts BECOMING the next
sector's shape — `tube.morphTo()`, a smoothstepped blend inside `_point()`,
timed to arrive as you do. Everything that asks `at()` rides the blend
without knowing: Jack lies on a floor that is mid-morph, grime climbs walls
that are still arriving. The camera seat and the ridge rules follow the
DOMINANT shape the moment it flips, with a `→ GUTTERS` callout. A shape
change was a scene cut; now it is scenery you fly through.

**The gun.** Hold Space / pad A / RT and the stream runs (touch fires
automatically, the convention sudz set — and a first cut had a MOUSE drag
flipping that convention on for desktop, fixed). A bolt does not know a
bubble from grime: your stream pops bubbles in its path for NOTHING, and
popping the lit one is the chain, dead by your own hand. That is the whole
fusion — the gun and the collection fight over the same lane. Kills pay
flat (grime 75, orb 25, spitter 250); the chain stays the collector's
economy. The dive moved to S/↓/pad B and keeps everything it had: depth
pays, lane locks, the scrub.

**Shooting back.** SPITTERS (sector 2 on, two at most) are the first thing
that does not come to you: they hold mid-tube, walk their lane toward
yours, and lob orbs — fast, warm, never settling, duckable, jumpable,
shootable. Magazine dry, a spitter dives like grime and settles like it
too. Spitters wear the orb's ember colour, not grime's khaki: a thing that
shoots back must never be confusable with paint on the floor.

Everything v6 built survives and matters MORE under fire: grime you dodge
settles, scum is sticky and barren, the flood at 80%, the dive as the only
scrub, the clean bonus at every sector boundary (40 × sector × clean lanes).

Found by screenshotting the build rather than believing it: the menu still
said NO GUN, scum pads on steep wall lanes read as crates floating off the
surface (now films, hugging it), and spitters shared khaki with scum.

Smoke gate 60 → 73 checks, and the flight checks fail against v6 — a build
that cannot fly cannot pass them.

## v6 — 2026-08-07

**The Scum Line.** One rule, aimed at the four places the tension was
leaking: the dive was optional (it advertised 3× but capped at 2.1×, against
a ×16 chain that never needed it), nothing accumulated (grime past the mouth
just died, so dodging was free and a patient run idled forever), the chain
had no decision in it, and levels got longer rather than deeper.

**Grime that reaches the mouth now settles as SCUM** — a film on its lane,
stacking to three layers. Every dodge is a loan. It is Tempest's spikes with
the gun taken out, the way grime was already its flipper.

Scum does three things, none of them a bullet:

- **Sticky.** Standing in it, rim speed ×0.4. Airborne is exempt — the jump
  and the float are the way ACROSS a fouled stretch on every shape now, not
  just the ridged one.
- **Barren.** The director will not raise a bubble through a fouled lane, so
  neglect starves the chain instead of blocking you: the income migrates
  into whatever you kept clean, and the channel narrows around you.
- **The flood.** Past 80% coverage the channel washes itself: a life, the
  chain, and a clean rim, in that order. The one failure you walked into
  slowly, on a meter you were looking at the whole time.

**The dive is the only thing that takes it off.** A dive that comes all the
way back wipes one layer from its lane — Suds Jack washes, which is the verb
the game is named after — and pays 50 × level. A dry dive is never wasted,
but it is 0.62s lane-locked in the stickiest place on the rim. A dive
knocked out of the water scrubs nothing.

**The cash-out the chain never had:** a level clear washes the channel and
pays 40 × level × clean lanes, so the last seconds of every level are a
decision — one more deep bubble, or scrub toward the bonus.

The HUD grew one element: the scum line, a strip of twenty cells under the
channel — the mouth seen edge-on. It is the route map and the flood meter in
one fact, because a second gauge for the same danger is a gauge nobody
reads.

Collection scoring, the lit order, relight, dive timings, grime stepping,
ridges and the float are untouched. Tuning knobs, most sensitive first:
`FLOOD_AT` (0.8), `STICKY` (0.4), layers per scrub (1), the barren rule
(hard skip vs. reduced odds).

Smoke gate 48 → 60 checks, and the new ones are proven: against the
pre-scum build the scum section does not pass — it cannot even run.

## v5 — 2026-08-07

**Press again mid-air and he floats.** (Owner's direction: "many jumps allows
the character to float a bit", and crossing the pipes "should feel a bit like
tiny bird ski jumping".)

A jump pressed again in its falling half chains: one more bay, committed the
same way a jump always is, on a hop that is longer and — this is the part
that makes it a float — **never rises**. The first cut gave a chained hop its
own little sine arc and it climbed above the hop that launched it, which
reads as a double jump, not a float. Now a float GLIDES from wherever the
arc had him (`1 − k²`: hangs early, drops late), so each press starts from
lower down and the ladder decays on its own until grime stops fitting
underneath you — the dodge window is the price of distance. Three floats and
he lands; from a lip bay, hop plus three floats is exactly the far lip, so
the cap and the channel are the same size on purpose.

Underneath it, one real bug the gate had passed over: **the declared peaks
were not the drawn ridges.** The tube's default lane count is `BAYS ×
LANES_PER_BAY` = 20 and the peaks are declared for it, but `main.js` still
passed the 13 that predates the ridged channel — 13 does not divide into
five bays, so the walls you hit sat beside the ridges you saw, one peak was
past the lip, and the fifth bay was a one-lane sliver. The gate passed
because it only asked the declaration about itself; it asks the geometry
now, and the two new checks fail against the 13-lane build. Every
lane-denominated tuning (rim speed and accel, grime's step cadence and hit
window, the director's spawn gaps) carries a ×20/13 rescale so world-space
feel is exactly what it was tuned to.

Smoke gate 41 → 48 checks.

## v4 — 2026-07-30

**A controller could ride the rim but never reach it.**

`pollGamepad()` was called inside the play branch of the frame, below the
`mode !== 'play'` early return — so on the two screens where you are not
playing, the pad was never read at all. The menu and the recap listen for a
pointer or Enter, which means a pad on its own got you as far as looking at
the title and no further. It is polled in every mode now, and A or Start is a
way in.

Two things that only show up once the same button does two jobs:

- **The press that starts a run was still queued as a dive.** A is dive during
  play, so the press that got you in was sitting in `_dive` when the first
  frame read it and Jack left the mouth before you had seen the level.
- **A press spent diving would restart the run at the recap.** Every A edge
  set the start flag, nothing consumed it during play, and it was still there
  when you died — the recap flashed past under your thumb. `clearPending()` on
  both edges of a run drains it (the jump queue too, now that there is one).

Neither is visible without a pad in your hands, which is why they lasted:
nothing in the gate had ever pressed one. It drives a synthetic pad through
the menu and the recap now.

Smoke gate 37 → 41 checks.

## v3 — 2026-07-30

**Five half-pipes in a row, and a jump to get between them.** (Owner's
direction.)

A new channel — `gutters`, level 3 — made of **five identical bays with a
ridge between each**. The ridges are the point: they are the only thing in
this game that stops you *riding* somewhere, so the level arrives with its own
verb.

- **The jump** (`↑` / `W`, pad `X`, flick up on touch). It commits your LANE
  the way the dive commits your DEPTH — you pick a bay and you are going there
  — and while you are off the floor **grime passes underneath you**. That
  second part is what stops the verb being dead weight on the five levels with
  no ridges in them: everywhere else, a jump is a dodge and a two-lane hop.
- **Grime cannot cross a ridge either**, and it cannot jump. Each bay keeps
  its own problem, so the level is a route rather than a hiding place — and
  grime that cannot reach you sits in its bay in plain sight, which is a
  threat you can plan around instead of one you react to.
- The ridged channel gets **its own camera seat**, further back and higher.
  From down in the middle bay you can see your own bay and two edges, and the
  whole level is about deciding which bay to be in — which you cannot do if
  you cannot see them.

Three things it got wrong first, all found by looking at it:

- **A wall you could walk through.** The bay you are in was read *after* the
  step, so one frame of movement carried you over a ridge and the clamp then
  asked the bay you had already arrived in whether you were allowed to be
  there. It says yes. The bay is read before the step now.
- **The jump lifted along the floor's normal**, which swings through ninety
  degrees as you cross a ridge — so a jump threw Jack sideways out of the
  channel halfway over. The channel opens upward; off the floor means up.
- **Only three of the five bays were bays.** The two outer ends ramped up to
  lip height to give the channel walls, and that ramp ate half of the first
  and last bay — they read as big flat wings. All five are identical now, and
  a ridge is half a bay deep rather than nearly a full one, so you can see the
  bay you are jumping into. Four lanes to a bay, not three: at three the
  cosine is sampled so coarsely that a bay draws as a V, and a bay you can
  stand in three places in is a slot, not somewhere you move around.

Level 3 also stopped being magenta. Toko's badge sits in that corner in the
brand's own magenta, and two magentas on a screen make the signature look like
part of the game.

Smoke gate 28 → 37 checks.

## v2 — 2026-07-30

**A half tunnel, and you lie on the floor of it.** (Owner's direction.)

The closed tube is gone. It is a channel now — open along the top, walls
sweeping up on both sides, and Suds Jack lying on the floor at the bottom of
the frame rather than clinging to a rim.

- **The opening is not decoration.** A closed ring has no ends, so you can
  always keep running and any hazard can be outrun. A channel has two lips, and
  the lane at each lip is somewhere you can be **cornered** — lanes clamp
  instead of wrapping, and the clamp kills your speed so it does not read as a
  bounce. Grime has no short way round any more either: coming from the far
  lip it has to cross everything in between, and you get to watch it do it.
- Five channels: `pipe` (a round half-pipe), `trough` (square, two walls and a
  floor), `wave` (a rippled floor — "the bottom" is three places), `drain`
  (steep one side, shallow the other, so neither lip is the same trap) and
  `vee` (no floor at all: the middle is one lane).
- Jack **lies on the floor and tips with it** — flat at the bottom, up on his
  side against a wall. The angle is sampled off the shape either side of him
  rather than assumed radial, because on the trough and the vee the floor does
  not face the axis.
- The camera moved **inside** the channel, above the floor and below the lips.
  Level with the lips a half tunnel is two lines; from above it is a flat
  ribbon; only from in here is it somewhere you are lying.

Two real mistakes fixed on the way, both found by looking at the thing:

- **The cross-section was being shrunk with depth as well as by the camera.**
  That is right for Tempest, which is 2D vector art with no camera, and wrong
  here: the floor climbed steeply away and the whole channel read as a flat
  paper fan. A tunnel is the same size all the way along — the far end looks
  small because it is far away. Risers had the same double-shrink and lost it
  too.
- **Three of the five channels ran right to left**, so on those levels
  pressing right moved you left and the claw was drawn upside down. The player
  and the shapes disagreed about which way round the channel went, and only
  the shapes were wrong. The gate now asserts the direction and the floor
  angle for every shape, plus that lanes do not wrap.

Smoke gate 25 → 28 checks.

## v1 — 2026-07-30

**The tube, with the gun taken out.**

The lineage is "Bomb Jack × Suds 51 × Tempest 2000" and this build takes it
literally, in that order: Bomb Jack is the **game** (collect, in the right
order, no weapon), Tempest is the **shape** (a tube you ride the rim of), the
suds are what it is made of.

- **Every position is `(lane, depth)`.** `tube.js` owns the only conversion to
  world space, which is what lets the web change shape between levels — circle,
  square, clover, drain, star — without one line of game logic knowing. A
  bubble rises the same way up a star as up a circle.
- **The dive is the game.** You can stand at the mouth and take what arrives;
  that is safe and slow. Meeting a bubble halfway down pays up to 3× and
  **locks your lane until you are back** — Flash Prince's commitment rule, on
  a 0.62s clock.
- **One bubble is lit at a time.** Taking it raises the chain, letting it past
  you resets it. When one is taken the *deepest* remaining bubble lights, so
  the chain stays reachable rather than becoming a coin flip. That is Bomb
  Jack's whole design and it is what makes this a routing game rather than a
  catching game.
- **Grime steps toward you** as it rises — Tempest's flipper without the gun,
  and the only reason moving matters. A hazard that came straight up its own
  lane could be dodged by standing in the right place, which is a waiting room,
  not a game.
- Bubbles are cold, round, bright and bloom; grime is warm, angular, dull and
  never blooms. You should be able to tell them apart at the far end of the
  tube at speed without reading anything.
- Three lives, mercy frames, per-level web and hue, `sudsJackHi` in
  localStorage. Keys, gamepad and touch (drag the rim, tap to dive).

Inherited from `hyperdagger/`: no build step, three.js r167 from a **local
vendor copy** (not the CDN — that is what its offline worker needed and this
one will want the same), ACES + `EffectComposer`, the debug handle on `window`,
and the discipline of a director that spawns *away* from where you are
standing.

Three things learned making it look right, all the same lesson — a tube is
made of depth, and depth is easy to throw away:

- the far end kept **16%** of its radius and the whole thing read as a flat
  dartboard. It keeps 8.5% now.
- the camera was **dead-on**, so the web was a wheel of spokes no matter how
  hard it converged. It sits above the mouth looking down into it.
- the afterimage was at **0.82** with the tube turning under it, and the rails
  ghosted into a starburst that hid both the web and the risers. 0.5, and the
  tube barely turns during play.

Not in yet: the superzapper, the psychedelic level-transition, voxel risers,
a real Suds 51 read on the palette, and anything that earns a life back.
