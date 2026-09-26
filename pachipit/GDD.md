# PACHI PIT — design

**The brief (owner, 2026-09-26):** *"Let's make a game that's mixed Clover Pit,
Raccoin and Pachinko.. roguelike elements and 3D room like the Pit."*

This is the source for the game; the CLAUDE.md section is the summary. Numbers
in here are starting points and `VERSIONS.md` records every one that moves.

## 1. The pitch

You are sitting on a stool on a trapdoor, in a concrete cell at the bottom of a
shaft. In front of you is a machine: a **pachinko board** on top, whose coins
rain down onto a **coin pusher** below it, whose front edge spills into your
tray. A raccoon owns the pit. Every three shifts it wants a payment through the
ATM on the wall, and every payment knocks one padlock off the door behind you.
Eight padlocks. Miss a payment and the trapdoor opens.

## 2. The three sources, taken literally and in order

Suds Jack's rule applies: a mashup is only worth making if each source does a
different JOB, and the job is named.

| source | what it is here | its job |
|---|---|---|
| **CloverPit** | the room, the debt, the ATM, the charm vendor, the phone, the trapdoor | **the RUN** — why you are playing, what you are afraid of, what you buy |
| **Raccoin** (coin pusher) | the bed, the pusher, the shelf, the tray, special coins and prizes on the bed | **the PAYOUT** — the only way a coin becomes money is by being shoved off an edge |
| **Pachinko** | the pin board, the launch handle, the start chucker, tulips, windmills, the reel window, fever and the attacker | **the SHOT** — where your coin goes, and what it touches on the way down |

So a coin's life is three games in a row: you **shoot** it (pachinko), it
**lands** on the pusher shelf and waits to be **shoved** (coin pusher), and what
comes off the edge **pays the debt** (the pit). The pachinko board does not pay
you directly — it decides where the coin lands and what it is worth, and it
spins the reels that drop MORE coins onto the bed. The bed is the only door to
your wallet. That is the one design decision everything else hangs off: it is
what makes a gold coin teetering on the edge worth staring at.

## 3. One currency

**Coins** are the only money. They come out of the tray. They go to three places:

1. **The ATM** — deposited coins pay the debt, are safe, and earn interest at
   the end of every shift. You cannot take them back out.
2. **The vendor** — charms cost coins. So does rerolling the shelf.
3. **The raccoon** — three masks on a reel line is the BANDIT: a paw comes down
   out of the ceiling and takes a quarter of your wallet. Never the ATM.

That triangle is the run's decision, every shift: deposit (safe, interest,
progress) or keep (charms, but exposed to the paw). Balatro's interest-versus-
jokers, with CloverPit's debt as the thing interest is for.

**Drops are free.** Each shift the machine gives you a number of coins to shoot
(12 to start). They are the house's coins: shooting costs you nothing, and
everything that reaches the tray is yours. An earlier draft made every shot
cost a wallet coin, which is the real coin-pusher bet — and made the wallet
both ammunition and savings, so depositing to the ATM could leave you unable to
play, and a bad first shift could soft-lock a run. Free drops keep one meaning
per number: DROPS is what you can shoot, WALLET is what you can spend.

## 4. The machine

### 4.1 The board (pachinko)
A vertical playfield behind glass, 60 × 84 board units (1 bu ≈ 1 cm). Coins
are discs in the plane of the board — a Plinko chip, not a ball — which is what
lets the same object land flat on the pusher afterwards.

- **The handle.** POWER sets the launch speed up the left rail. The coin rides
  the curved outer rail by centrifugal force and comes off it where gravity
  wins, so power chooses where it enters the field: weak = upper left, middle =
  top centre, strong = over the top and down the RIGHT side (右打ち). Too weak
  and it falls back down the lane: a FOUL, and the drop is refunded. Hold FIRE
  to stream at 1.6 coins a second, the way a real handle does.
- **The reel window** sits in the middle; its roof sheds coins left and right.
- **The start chucker** (スタートチャッカー) under the window, guarded by the two
  **life nails** (命釘). A coin in it spins the reels. Up to four spins queue
  (保留), shown as four lamps.
- **The warp** on the left of the window drops a coin onto the **stage** right
  above the chucker — the best seat on the board, and hard to hit.
- **Tulips** (チューリップ), low left and right: a coin in a closed tulip opens
  it; a coin in an open tulip closes it. Each entry drops coins on the shelf.
- **Windmills** (風車): free-spinning deflectors, the board's randomiser.
- **The attacker** (アタッカー), bottom right: shut, except during FEVER.
- Everything that reaches the bottom goes down one of three chutes (L/C/R) onto
  the pusher shelf. **Nothing is lost on the board** — no out-hole. Pockets are
  upside, never a tax; the tax is the pusher's gutters.

### 4.2 The reels (the CloverPit slot, as a pachinko LCD)
Three reels, three rows, five lines (three rows and two diagonals). Symbols:
CHERRY, BELL, COIN, CLOVER, SEVEN, MASK. Reels stop left, right, centre; if the
left and right already make a pair on a line, the centre reel slows — REACH.

| line of three | pays |
|---|---|
| CHERRY | 3 coins onto the shelf |
| BELL | 5 coins |
| COIN | 3 SILVER coins |
| CLOVER | 4 coins + a free spin |
| SEVEN | **FEVER** |
| MASK | **BANDIT** |

Payout coins fall from the hopper onto the back of the shelf. They are NOT
yours until the pusher gives them to you.

Masks get more common every deadline (CloverPit's 666).

### 4.3 FEVER
The attacker opens and the machine loads ten free FEVER coins. Each one in the
attacker drops five coins on the shelf. The attacker is on the right, so FEVER
is the one time to crank the handle all the way — the HUD says SHOOT RIGHT.

### 4.4 The pusher (Raccoin)
A horizontal bed under the board. Coins from the chutes land on the **shelf**
(the moving top of the pusher slab); the slab carries them forward, the back
wall scrapes them as it retracts, and they tumble off its front edge onto the
**bed**. The slab's front face shoves the bed forward; the front row falls into
the **tray**. The last few centimetres of each side wall are open: coins
squeezed sideways there fall into the **gutters** and belong to the house.

Coins stack two deep — a coin landing on others rides on them and falls when
they are gone — because a pusher bed is a pile, not a carpet, and the pile at
the lip is the drama.

**Coins have a value.** Copper 1, silver 5, gold 25. The pocket a coin passes
through can stamp it (a charm's job), so the board decides what a coin is WORTH
and the bed decides WHEN you get it. This is what lets the debt grow a
hundredfold without the bed holding a hundred times the coins.

The bed starts loaded (the house float), keeps its coins between shifts and
between deadlines, and only ever empties over its edges.

## 5. The run

- **A deadline** is three **shifts**. At the end of the third, the ATM must hold
  the debt. It pays, a padlock falls, the surplus stays in the ATM, the phone
  rings. It does not: the trapdoor.
- **A shift** is your drops. It ends when they are spent, the board is empty,
  the reels have stopped and the pusher has made two more strokes. Interest
  lands, the vendor restocks.
- **Eight deadlines** open the door. Debts: 25, 50, 90, 150, 250, 400, 650, 1000.
  After the door there is the shaft again, if you want it (endless, ×1.6).

### 5.1 Charms (the vendor)
Data, not code paths: each charm is a list of modifiers and hooks the engine
already reads. Six slots. Sell for half. Families:

- **Nails** — the 釘師 (nail doctor) is a real job; parlours set a machine's
  payout by bending nails. *Open Life Nails*, *Rubber Pins*, *Way Nails*,
  *Magnet*, *Third Windmill*.
- **Stamps** — pockets that upgrade the coin passing through. *Silver Die*
  (start chucker → silver), *Gold Leaf* (tulip → gold), *Clover Press*.
- **Reels** — *Horseshoe* (extra clovers), *Lucky Seven*, *Extra Lines*
  (V and Λ), *Hot Hopper* (payouts doubled), *Bell Boy*.
- **Pusher** — *Gutter Guards*, *Long Stroke*, *Tilted Bed*, *Heavy Coins*.
- **Money** — *Piggy Bank* (interest), *Collection Plate* (tray ×), *Overtime*
  (+drops), *Coupon*.
- **The raccoon** — *Mousetrap* (eats one bandit a deadline), *Trash Panda*
  (junk on the bed pays).

A charm bends a number the machine already has, or hooks an event it already
fires. It never adds a verb — the handle is the only verb.

### 5.2 The phone
After each paid deadline the red phone rings and the raccoon offers three
deals; you take one. Some have a string attached (a smaller debt, but more
masks on the reels; a pile of coins now, but a charm gone). This is where the
run's shape changes between deadlines rather than inside one.

## 6. The room

First person, seated. Four stations, turned between, never walked:

| facing | what is there |
|---|---|
| **front** | the machine — the brightest thing in the room and its main light |
| **left** | the ATM: green screen, debt, deadline, balance, a deposit slot |
| **right** | the vendor: a glass-fronted machine with the charms on spirals |
| **back** | the door with its eight padlocks, and the red phone beside it |

Down is the trapdoor grate you are sitting on. Up is the hole the raccoon looks
through, and where the paw comes from.

**The look is a lighting setup before it is an art style** (Slay Kallio's
lesson): one bare bulb overhead with a real falloff, and the machine itself as
the second light — it goes gold on FEVER and red on the BANDIT, and the room
goes with it. Rendered low-res and upscaled nearest, ordered dither, grain and
a vignette. Everything is built from primitives and painted in code; there is
no image asset.

## 7. Controls

The handle is the only verb, so every input answers the same two questions:
how hard, and now.

| | power | fire | turn |
|---|---|---|---|
| keys | ← → / A D | hold Space | Q E / 1-4 |
| mouse | wheel, or drag the dial | hold on the machine | click a station |
| touch | drag the dial | hold FIRE | the station tabs |
| pad | left stick / d-pad | hold A or RT | LB RB |

## 8. Architecture

No build step, three.js r167 vendored, the house pattern:

- `js/rng.js`, `js/board.js`, `js/pusher.js`, `js/reels.js`, `js/engine.js` are
  **pure** — no DOM, no three.js, no clock. The engine is stepped with a fixed
  dt, seeded, and emits an event log the view plays. That is what lets
  `test/core.mjs` run whole runs in bare node with a bot.
- `js/data.js` is every charm, deal, symbol and deadline as data.
- `js/view/*` is three.js: the room, the machine, the coins as instanced
  meshes, the textures painted into canvases.
- `js/hud.js`, `js/input.js`, `js/audio.js`, `js/main.js`.
- `window.__pp` is the seam the browser gate drives.

## 9. What is deliberately not here (yet)

- Consumables (Balatro's tarots). The charm families above have to prove they
  make different runs before a second shop row is worth it.
- A choice of shift at the start of each round (CloverPit's 7-spins-or-3). The
  phone is where the run's shape changes; a per-shift menu is a second place to
  do the same job.
- Saving a run mid-deadline. The whole state is serialisable at a shift
  boundary, so this is a small follow-up rather than a rewrite.
