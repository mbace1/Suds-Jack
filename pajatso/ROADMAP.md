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

## 2. The roguelike mode — KUOPPA on the Pajatso face, v4 SHIPPED

`kuoppa.html` (`js/kuoppa/`): the house hands you coins a round, the machine
pays into your purse, a debt is due every third round, the vendor sells
charms between rounds, eight locks on the door. `VERSIONS.md` v4 has the
numbers and what it took; `node pajatso/test/run.mjs` is the instrument
(bots over whole runs, and the lever swept on every stage of the face).

Open, in the owner's hands next:
- **Is the curve right?** Bots win 19–23%; a person reads the machine and
  should do better. The debts are one line in `js/kuoppa/data.js`.
- **The charms are twelve plain ones.** CloverPit's pull is the charm that
  changes what a run IS; the first twelve bend numbers. The next pass is
  charms that combine (a tulip that stamps coins, a POTTI that opens FEVER
  longer…), measured the same way.
- **KUOPPA's v1 systems not yet ported**: the phone's deals, the raccoon
  bandit, the ATM's interest (a charm has it for now).

## 3. The pachinko parts — the roguelike ONLY, in this order — all six IN (v4)

Each is bolted on by a debt paid, in the owner's order, and the base machine
never gets them:

1. **Start chucker + reels** ✔ — a START pocket in the nails; the reels on an
   LCD in a box bolted on top of the case.
2. **Tulips** ✔ — the two 1:00 windows.
3. **FEVER** ✔ — a jackpot opens the attacker under the right half of the
   window row: shoot right.
4. **Windmills** ✔ — two, beside the chucker.
5. **Chain jackpots** ✔ — sevens ×3 for a while after a jackpot, and the
   **progressive POTTI** (+2 mk a round) — answer 5's *maybe C*.
6. **Ball multipliers** ✔ — the R windows become ×3.

Next for the parts is depth, not count: a REACH with more theatre, a stage,
the warp (`js/board.js` has both from v1), tulips that open each other.

## Still true from the v1 list

- Teach on the first time it happens, not in a menu — v2 does this for the
  classic machine; KUOPPA still does not.
- KUOPPA's phone view is v1's: far away. It is not being tuned further, since
  the mode is being rebuilt on the Pajatso face.
