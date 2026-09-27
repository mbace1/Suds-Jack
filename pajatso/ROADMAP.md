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

## 2. The roguelike mode — KUOPPA, v5: Balatro's shape on the Pajatso

A round is a hand scored CHIPS × MULT; the ante is ×10 a lock and falls due
on the third round, which carries a twist (CloverPit's deadline, Balatro's
boss blind); jokers bend the score, charms the machine, plates raise levels;
the parts arrive one per lock as their pachinko selves. `VERSIONS.md` v5.

Open, in the owner's hands next:
- **Is ×10 right?** A bot that buys well wins 6%; a person should do better.
  `ANTE_X` is one number in `js/kuoppa/data.js`.
- **More jokers that talk to the parts** — the strongest runs are the ones
  where a joker and a part meet (Tulip Painter on tulips, Fever Dream in
  大当たり). Every part could have two or three.
- **The old pit's systems not yet ported**: the phone's deals (with Toko on
  the line now), the bandit.

## 3. The pachinko parts — the roguelike only, in the owner's order — v5

Heso & LCD (yakumono, warp, stage) → tulips → attacker → windmills → 確変 &
the electric tulip → ×3. Next for the parts: REACH presentations with more
theatre (a 3D stage the coin rolls on, the screen reacting), a second
yakumono gimmick, a V-zone.

## Still true from the v1 list

- Teach on the first time it happens, not in a menu — v2 does this for the
  classic machine; KUOPPA still does not.
- KUOPPA's phone view is v1's: far away. It is not being tuned further, since
  the mode is being rebuilt on the Pajatso face.
