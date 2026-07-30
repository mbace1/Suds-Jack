# Suds Jack — versions

The rebuild. **The playable Suds Jack is still `sudz/`** — the original canvas
vector tube shooter — and it stays the one the arcade points at until this one
is better than it. Two things sharing a name is confusing enough without the
floor sending people at the unfinished one.

The `?v=N` token in `index.html` tracks module-graph changes; this number is
the public release. Bump both when shipping.

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
