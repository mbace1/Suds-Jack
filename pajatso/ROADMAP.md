# PAJATSO — roadmap

Owner, 2026-09-26, after v1 (then called Pachi Pit) from the hub on a phone:
*"Boring, the mobile view should be much closer. Not told many features in the
game."* Then, choosing the Pajatso direction: *"make it Pajatso, change name.
Start with regular Pajatso, then add a roguelike mode and tons of Pachinko like
features."*

That is the order, and this file keeps it.

## 1. Regular Pajatso — v2, SHIPPED

The classic machine is `index.html` (`js/classic/`): twenty coins, one at a
time, a lever pulled down and let go, cups that pay their painted number,
the ★ POTTI chimneys, the clown. The camera is fitted to the phone's width and
leans in on the coin (≈30 px of coin on a 390 px phone); five first-time lines
say what the face does. `VERSIONS.md` v2 has what it took.

Open on the classic machine, in the owner's hands next:
- **Is it the right Pajatso?** The face is modelled on the Bajazzo/Pajatso type
  from memory: cups among the nails, the bottom keeps the coin. Photos of a real
  one (the pocket layout, the payout printing, the lever) would set the face,
  the cover and the numbers properly.
- **Does twenty coins last?** The machine pays back 0.95 a coin across the
  lever; a session is ~60–120 pulls. `node pajatso/test/face.mjs` is where to
  look before moving a number.

## 2. The roguelike mode — on the Pajatso face (next)

Today the roguelike is KUOPPA (`pit.html`), the v1 pit run on a pachinko board
over a coin pusher. It stays one link away from the title until the new mode
replaces it. The plan is to rebuild the run ON the Pajatso face, so both modes
are the same machine:

- **The run.** A handful of coins and a DEBT due every few sessions (CloverPit's
  shape, which KUOPPA already has: the ATM, the deadline, the trapdoor, eight
  padlocks). Between sessions the face can be changed.
- **Changing the face is the deckbuilding.** Charms become physical changes to
  the machine you can SEE: a nail moved, a cup widened, a cup's number
  repainted, a kicker added, a chimney lowered. `buildPajatso(mods)` already
  takes mods for exactly this (the pachinko board worked the same way).
- **KUOPPA's systems port across** where they fit (the vendor, the phone deals,
  the bandit); the pusher does not — the Pajatso pays straight into the tray.

## 3. Tons of pachinko features — as things the run can bolt on

Each one a part you can add to the face, so the roguelike is also how you
meet them:

- **Start chucker + reels**: a cup that spins a three-reel window over the clown;
  a line pays, a REACH is a near-miss you watch (the lottery and the picture
  code in `js/reels.js` is already built).
- **Tulips**: cups that open when hit and shut on the next coin.
- **FEVER / the attacker**: a gate on the right side that opens after a jackpot
  and swallows right-side shots for a while — the "migi-uchi" game the right
  side of the lever already is.
- **Windmills**, a **warp** and a **stage** (all in `js/board.js` already).
- **Ball multipliers**: a cup that pays in coins that then have to be played.
- **Kakuhen-style chains**: a jackpot that makes the next one likelier.

## Still true from the v1 list

- Teach on the first time it happens, not in a menu — v2 does this for the
  classic machine; KUOPPA still does not.
- KUOPPA's phone view is v1's: far away. It is not being tuned further, since
  the mode is being rebuilt on the Pajatso face.
