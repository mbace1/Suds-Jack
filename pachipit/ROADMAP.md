# PACHI PIT — roadmap

Owner, 2026-09-26, after playing v1 from the hub on a phone: *"Boring, the
mobile view should be much closer. Not told many features in the game. Plan for
updates and such. … look on GitHub for anything Pajatso and we may divert to
that direction."*

Nothing below is built. Each step is a proposal for the owner to pick from.

## 1. Closer on a phone (v2, first)

What is wrong: upright, the lens fits the WHOLE machine (marquee to tray) into
the band the HUD leaves, so the coins — the only thing happening — are a few
pixels across, and the bottom 236px is controls.

- **A shift camera.** During a shift, fit only the board and the pusher's lip,
  not the cabinet. The idle shot stays wide.
- **Follow the action.** Lean the lens toward where the coins are (the top
  of the board after a launch, the pusher once a coin drops), with a
  slow ease so it does not swim.
- **Punch in on events.** A short push-in on a pocket hit, a reel reach, the
  front row going over the lip — the things worth seeing get seen.
- **Coins read bigger.** A minimum on-screen coin size on a phone (scale
  the flying coin mesh, not the physics).
- **Give the HUD less.** Fold the power bar and FIRE into one thumb control
  (drag to set, hold to fire) so the bottom reserve shrinks.
- Gate: a coin in flight measures at least N px on a 390×844 phone.

## 2. Tell the player what exists (v2)

What is wrong: stamps, tulips, windmills, the warp, the reels, FEVER, the
bandit, charms and phone deals are all in the game, and it says almost none of
it.

- **Teach on the first time it happens, not in a menu.** A callout the first
  time each thing occurs ("START — every coin in here spins the reels"),
  once per browser, skippable, never twice.
- **Label the board.** Small painted signs on the board face (START, TULIP,
  RIGHT GATE) the way a real pachinko face is printed.
- **A shift-one script.** The first shift of a first run points at three
  things in order: the WAY, the chucker, the pusher's lip.
- **Explain the debt in one line** at the ATM the first time, and the door
  the first time you look at it.
- **A "what is this" tap** on any charm, pocket or station panel.
- Gate: every feature has a first-time line, and each one fires in a bot run.

## 3. The Pajatso question (owner's call)

Pajatso is the Finnish coin wall game: you launch one coin with a lever, it
falls through pins, and a winning pocket pays out coins. It has no reels
and no pusher, and you watch every coin. Nothing in this workshop or any of
its branches mentions it yet.

Three ways to take it:

- **A. Pajatso replaces the pachinko board** inside Pachi Pit. One coin at a
  time, bigger, and every coin is an event. That answers "boring" and
  "closer" together. The pusher and the run stay.
- **B. Pajatso is the game.** Drop the pusher and reels, keep the roguelike
  run and the pit, and set it somewhere Finnish (a kiosk, a bar in Kallio,
  Linnanmäki) next to Slay Kallio and Toko Move.
- **C. A second cabinet**, small and separate, reusing `board.js`.

Recommendation: **A first**. It is the smallest step that tests the
direction, and the board physics already exist. Take B if it lands.

References wanted from the owner: photos of a real Pajatso face (pocket
layout, payout printing, the launch lever), since that is the cover and the
board both.
