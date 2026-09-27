# PAJATSO — roadmap

Owner, 2026-09-26, after v1 (then called Pachi Pit) from the hub on a phone:
*"Boring, the mobile view should be much closer. Not told many features in the
game."* Then, choosing the Pajatso direction: *"make it Pajatso, change name.
Start with regular Pajatso, then add a roguelike mode and tons of Pachinko like
features."*

That is the order, and this file keeps it.

## The owner's answers, 2026-09-27

Eight short questions, eight answers — this file is ordered by them:

1. **Photos of a real one** — sent: a Finnish 1 mk machine (v3 is built on them).
2. **Kuoppa** — *"Kuoppa is roguelike."* It stays the roguelike mode.
3. **Language** — fi / en / ja (v3).
4. **Coins** — *"that or more"*: 30 mk a session (v3).
5. **Jackpot** — *"B, maybe C (different per mode)"*: bigger and rarer in the
   base game (v3: 7:00 plus the middle of the pot); possibly progressive in
   the roguelike.
6. **The run** — keep KUOPPA's debt-and-deadline shape.
7. **Pachinko parts** — *"all in order, but only the special mode, not base"*:
   the list in §3, in that order, and never on the base machine.
8. **Setting** — a Kallio bar (v3).

## 1. Regular Pajatso — v3, SHIPPED

The base machine is `index.html` (`js/classic/`), and since v3 it is the
photograph's: a row of windows across the top (R · 1:00 · 1:50 · 7:00 …), the
pot stacked in columns behind the glass, the POTTI opening its middle three, a
teak case on an orange bar wall. 30 mk, one coin at a time, fi / en / ja.
**It gets no pachinko parts** (answer 7); what changes here is the machine
itself — the look, the numbers, the feel of the lever.

Open, in the owner's hands next:
- **Does it feel like the one in the photo?** The windows, the pot and the case
  are drawn from two pictures; anything that reads wrong is a picture away
  from being right.
- **Does 30 mk last?** The machine pays back ~0.97 a markka with the pot left
  to run; `node pajatso/test/face.mjs` is where to look before moving a number.

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

## 3. The pachinko parts — the roguelike ONLY, in this order

Answer 7 fixed both the order and the place: each part arrives in the
roguelike mode, one at a time, and the base machine never gets them.

1. **Start chucker + reels**: a window that spins a three-reel picture; a line
   pays, a REACH is a near-miss you watch (`js/reels.js` already draws the
   outcome and builds the picture that shows it).
2. **Tulips**: windows that open when hit and shut on the next coin.
3. **FEVER / the attacker**: a gate that opens after a jackpot and swallows
   right-side shots for a while.
4. **Windmills** (in `js/board.js` already).
5. **Chain jackpots** (kakuhen): a jackpot that makes the next one likelier —
   and where answer 5's *maybe C*, a progressive POTTI, belongs.
6. **Ball multipliers**: a window that pays in coins that then have to be played.

## Still true from the v1 list

- Teach on the first time it happens, not in a menu — v2 does this for the
  classic machine; KUOPPA still does not.
- KUOPPA's phone view is v1's: far away. It is not being tuned further, since
  the mode is being rebuilt on the Pajatso face.
