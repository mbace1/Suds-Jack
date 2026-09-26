# PACHI PIT — versions

## v1 — 2026-09-26 — the pit, the machine, the debt

The owner's brief: *"a game that's mixed Clover Pit, Raccoin and Pachinko..
roguelike elements and 3D room like the Pit."* `GDD.md` is the design; this
log is what shipped and what it cost to get there.

**What is in it.** A first-person concrete cell at the bottom of a shaft, with
four stations you turn between (the machine, the ATM, the charm vendor, the
door with its eight padlocks and the red phone). The machine is a pachinko
board whose coins fall onto a coin pusher whose lip spills into your tray. Each
deadline is three shifts of twelve house coins; the ATM must hold the debt at
the end of the third or the trapdoor opens. Twenty-nine charms in six families
(nails, stamps, reels, pusher, money, raccoon), ten phone deals, FEVER through
the attacker, the BANDIT through the ceiling, and endless after the door.

**Everything that is rules or physics is pure** (`rng`, `board`, `pusher`,
`reels`, `engine`, `data`): no DOM, no three.js, no clock, seeded. That is what
lets `test/core.mjs` run whole runs with a bot in bare node, and what lets
`test/measure.mjs` read the machine rather than guess at it.

**The board was tuned by measurement, and the lessons generalise:**

- *A wedge is a gap between a coin's width and a hair more.* A coin resting on
  a nail with a wall at its back is stuck forever; every clearance on the board
  is either a pass (`BOARD.CLEAR`, 2.25 bu for a 2 bu coin) or a fence.
- *A row of nails is a potential well, not a ramp.* The first "way" stalled
  every slow coin: rolling round the downhill nail, a coin climbs unless the
  slope is steeper than `atan((s/2) / h)`, h being how high it sits between two
  nails. At 1.25 bu spacing that is 27 degrees; every way on the board is 30.
- *A coin balanced on a nail head is an equilibrium no real coin holds.* The
  sim tips it (and one on a pocket's rim) the way a breath of air would.
- *The launch lane needs a backflow valve* (逆流防止). Without it a coin
  knocked back up-left by the top nails rode the rail backwards down the lane,
  and every launch after it hit it at the bottom: one bot logged 370 fouls in a
  single shift. The valve is one-way on the coin's sense of rotation.
- *A foul has to be taken out when it TURNS, not when it lands*: a coin
  resting on the lane floor has vy ≈ 0, not < 0, and so was never counted.

The dial now has a map a player can learn: low power runs the WAY into the
start chucker (~16% of coins), middle power feeds the tulips (~15%), and full
power rides over the top and down the right side — which only matters in FEVER,
when 95%+ of right-hand shots find the open gate.

**The pusher is quasi-static on purpose, and the float must be PACKED.** A coin
on a pusher bed moves because something moved it. The first float was laid at
86% cover and swallowed 36 coins without paying one — every push spent closing
gaps — and the shelf, half full, absorbed the next forty. The float is a touching
hex lattice from the slab's reach to a front row already over the lip, and a
packed shelf, so the first coin of the first shift shoves one off the front.
A pusher conserves coins (the core gate holds it to the coin), so pusher
charms can only close the gutters or top the pile up: Long Stroke, which just
shoved more into the gutters, was cut for Loaded Bed.

**The reels are a lottery, not three strips.** Three independent reels cannot
give a jackpot a rate a player sees in thirty drops (three sevens on a line at
one in ten is one in a thousand a line), so a spin draws its outcome and then
BUILDS a picture that shows it — the winning line lit, every other line broken,
sometimes a REACH on a miss. The engine pays what the picture shows, and the
core gate checks 4000 pictures against their draws.

**The view.** Low-res render, nearest upscale, ACES, 40-level ordered dither,
vignette and grain in one blit (three skips tone mapping into a target). The
machine is the room's second light and changes colour with its mood. Every
station SOLVES its lens: the narrowest field of view that fits its silhouette
into the band the HUD leaves free, lens-shifted into it — so the machine fills
a phone held upright and a monitor alike. Three render bugs worth keeping:
the fit first used the machine's bounding box, whose top front corner is empty
air (the machine came out small); every coin on the board was drawn EDGE-ON
(three's XYZ Euler applies the spin before the stand-up); and a metal coin
facing the camera reflects the room BEHIND the viewer, which the environment
cube had painted black — so coins in flight get their own brighter material on
a dark disc, the Master System's flat fill inside a hard line.

**What the site caught that the branch could not.** Walking the deployed tree on
a phone found three faults before anyone played it, all green on the branch:
the site's HOME shell is newer and seats a Toko button beside HOME under a
thumb, and the HUD's fixed 104px corner put it on top of the deadline (the top
bar now MEASURES where the arcade's corner ends, and upright the debt runs full
width under it rather than shrinking its bar to a dot); the SHIFT 1 message was a
centred nowrap line, so a phone's first instruction ran off both edges; and
`hub/pad.js` was imported bare while the shell asks for it by token — two
URLs, two instances, two pollers. Each has a check now (the smoke gate stands a
Toko button next to HOME itself, since the branch's shell has none).

**Balance, as first measured** (`node pachipit/test/measure.mjs runs 10`): the
naked machine (the `saver` bot, buying nothing) dies at deadline 3-4; the best
charm runs reach deadline 8. The bots still spend themselves to death before
the first debt too often — that is a fact about the instrument, and the next
balance pass starts there.
