# EERI — design plan

Companion to `ART_BRIEF.md` (look) and `assets/README.md` (technical
contract). This file is **what the game does and what that costs in
assets** — the art pipeline should be able to read §4 alone and know what
to make next.

Status: plan, 2026-08-13. Written against the union of both v6 lineages.

---

## 0. Blocking: the tree is forked

Two branches both call themselves v6 and neither contains the other:

- `claude/eeri-platformer-instance-2un2bg` — parts kit, room prover,
  crane, brick wall, robots, steam vents. **On no other branch.**
- `claude/meshy-api-key-export-w652zb` — gh-pages v5 code + the
  Meshy-rigged animated Eeri + the asset pipeline.

Whichever lands second deletes the other. **Reconcile before building.**
Planning and art production can proceed in parallel; game code cannot.

---

## 1. The loop

**Read the machine's cycle → time the mount → reshape the room → get out
and climb.**

A machine is dangerous until it is yours. Unmanned, it works its own
cycle — not hunting Eeri, just heavy and blind. Taking the cab converts
the threat into the tool. The room is a lock the machine opens, and every
room holds one obstacle only the kid can pass and one only the machine
can, so neither finishes it alone.

Current verbs — kid: run, jump (apex 2.65 tiles, run-jump 4.85 across),
mount/dismount. Excavator: drive, boom, **dig**, **carry and lower a
span**. Crane: **swing**, **break**.

## 2. What is wrong with it now

1. **Three sites are one site three times** — every room runs mound →
   robot → pit → steam → machine → lock → exit; only the lock's verb
   changes. A parts kit makes sameness cheap to author.
2. **The best beat happens once per room** — reading a live machine and
   stealing the cab is the thesis, and it is ~8 seconds of a 90-second
   room. After that the machine is docile forever.
3. **Kid and machine never need each other in the same moment** — the
   shape is sequential, never interleaved, so the swap is never pressured.
4. **Losing the ride costs a walk, not a decision.**
5. **Bolts are free** — no risk, no economy, no reason for placement.

## 3. The plan, in order

**3.1 Machines go feral.** Unattended ~5 s, the beacon stutters, relights
and the cycle restarts. One timer on `tamed`. Fixes (2) and (4) together:
the thesis beat recurs, and being thrown out is a setback you re-earn.
Grace period must be long enough to hop out, take a bolt and hop back.
*Open (owner): should a machine re-wild at all, or stay a friend once
tamed? Middle option — a HIT re-wilds only the machine that threw you, so
it reads as startled rather than forgetful.*

**3.2 Bolts that cost something.** Put bolts on top of the bank, and let
digging destroy them. Collection must happen on foot, before the machine
arrives — so the kid-then-machine order becomes a choice, not a corridor.
Same rule for the wall and the span. **No new systems, no new art.**

**3.3 Two machines in one room.** `parts.js` already accepts `machine()`
twice; it needs a track rule per machine. The excavator digs a ramp so the
crane can reach the wall. Machines become pieces on a board and *position*
becomes the puzzle — the first thing here that could not be a Mario level.

**3.4 A rule per site, not a verb per site.** Site 1 teaches "machines are
dangerous until read". Site 2 teaches "the machine makes the level". Site 3
must teach something new: the machine as **hazard and key at once** — the
ball swinging live over the very wall it has to break, so the approach runs
through its own arc.

**3.5 Later.** A fourth machine; and whether bolts become the reason
machines are idle (feed one to start it), which would explain the whole
unmanned worksite in a stroke.

---

## 4. Assets this needs — for the art pipeline

Rules, scale, orientation and the node/clip contracts are in
`assets/README.md`; the look is `ART_BRIEF.md` §3.6 (Tonka × Cat) and
§5.1 (manipulable pieces). **Every machine also needs `beacon` and an
empty, readable seat** — the unmanned tell is silhouette-level, not a
detail.

### 4.1 Already live — do not remake
`eeri_v3.glb` (skinned, clips idle/walk/run/jump/sit) · `excavator_v1.glb`
· the five `groundworks_*` layer PNGs.

### 4.2 Needed next, in priority order

| # | asset | contract | why now |
|---|---|---|---|
| 1 | `crane_v1.glb` | same node set as the excavator — `house boom stick bucket seat step wheels beacon` — with the ball on the stick's end | Site 3 ships on a code placeholder today; it is the only machine with no art |
| 2 | **Site 2 layer set** — `girderworks_{skyline,far,mid,near,fore}_v1.png` | as `groundworks`, same rects/sizes | Sites 2 and 3 reuse Site 1's backdrop; three rooms currently share one place |
| 3 | **Site 3 layer set** — `demolition_{…}_v1.png` | as above | as above |
| 4 | `wall_v1.glb` | `state0` intact · `state1` cracked · `state2` rubble | the crane's target; rubble is a different silhouette, not a shorter wall |
| 5 | `girder_v1.glb` | `state0` stacked · `state1` slung · `state2` seated as a span, plus `grip` | Site 2's span; the seated state is walked on, so its top is flat and 1 tile deep |
| 6 | `bank_v1.glb` | `state0/1/2` | replaces the code placeholder; each state wants a fresh cut face and spill at the foot |
| 7 | `robot_v1.glb` | small; nodes `body head armL armR` + `beacon`-style eye that lights on NOTICE | the patrol reads as a reading test, so its wind-up must be legible at distance |
| 8 | `vent_v1.glb` | `collar` (lights before it blows) + a plume the game scales | telegraph is the whole point |

### 4.3 Only after 3.3 lands
A second machine per room means two silhouettes on screen at once — they
must be **tellable apart at 32 px in the same frame**. Design the crane's
silhouette against the excavator's, not on its own.

### 4.4 Not yet
A fourth machine. Do not start one until §3.4 says which rule it teaches.

---

## 5. Open, for the owner

- Should a tamed machine re-wild (§3.1)? Tone question as much as
  mechanics, now that Eeri is a real child.
- **How many sites is the game?** Three is a demo and hides the sameness
  problem; eight is a game and exposes it immediately. The answer decides
  whether §3.4 becomes the spine or stays a polish pass.
