# New enemies and site kit — action briefs

Concepts in `art-src/bots/` and `art-src/equipment/`. **The behaviour below is a
proposal, not an implementation**: enemies live in `js/robots.js`, which is
Design/Level's file. What is settled here is the *art contract* — the nodes and
states each mesh must carry, because those are cuts and a cut cannot be added
after the mesh is made.

## The frame these have to fit

DESIGN §3 and `js/robots.js` are explicit that the point of having more than
one small enemy is that **each asks the player to read a different thing**:

| existing | reads |
|---|---|
| `hopper` | **timing** — a fixed 1.35 s rhythm, the crouch is the tell |
| `roller` | **spacing** — trundles its span, never reacts. Too flat to stomp: landing on one bounces you off without killing it, which is the game saying *this one you jump* |
| `bucket` | **proximity** — asleep until you LAND near it, then a brief chase |
| `skitter` | **provocation** — patrol → notice → wind → lunge |

Every one is telegraphed on a clock with a **1.0 s floor** the room prover
enforces (`CLOCK.skitter` in `parts.js`). A new enemy that does not add a new
read is a reskin, and a new enemy without a tell is not readable at all.

---

## `vacbot` — the Roomba. Reads: **RESOURCE**

A low disc that vacuums a span, with a fat coil spring on its back.

- **First stomp: the spring fires and pops Eeri up**, well above a normal jump.
  The bot survives, dazed, spring re-arming.
- **Second stomp: it breaks.** Spring bent flat, eye dark, done.

This is a **new read, and the only one in the roster that is a choice rather
than a skill**: the vacbot is a *tool* — the way you reach a high ledge, a bolt
over a gap, or something too tall to stomp from the floor. But it is also
*spendable*, and the second stomp is irreversible for the rest of the level. A
child who mashes stomp destroys their own staircase. That tension is the whole
enemy, and it costs no new verb — it is the stomp they already have.

It also fits the roller's precedent exactly: **landing on a thing does not
always kill it**, and this game has already said so once.

**Art contract — the mesh must be cuttable into:**

| node | why |
|---|---|
| `body` | the disc |
| `spring` | compresses and releases in code. Drawn standing clear on the top face with air all round it, because two parts that touch in the concept cannot be separated afterwards |
| `eye` | the notice tell — `robots.js` brightens the eye through `notice` and `wind`; an enemy with nothing to brighten cannot be read |
| `wheels` | group, children spin about local z |

**Two states, as sibling nodes** — `state0` intact, `state1` broken — following
the manipulable-piece convention in `assets/README.md`: both ship in one file,
share an origin, and the game shows exactly one. `B-vacbot-broken` is concepted
for `state1`; it reads finished and harmless rather than menacing, because a
dead thing that still looks dangerous teaches the wrong lesson.

**Not a Meshy rig.** No legs — PHASING's routing rule sends it to `slice.mjs`,
same as the machines. The spring's squash-and-release is code driving a node.

---

## `workerbot` — the humanoid. Reads: **HEIGHT**

A worker bot that patrols a stretch of deck.

Proposal: **it is too tall to stomp from level ground.** A stomp arc from flat
floor does not clear its head, so the answer is never "jump on it where you
stand" — you come from something higher: a ledge, a crate, a scaffold, **or a
vacbot's spring.**

That last one is why these two are briefed together. The vacbot is the tool and
the workerbot is the lock, and neither needs a new verb or a new button to make
the pair work. It also gives the roster its first enemy that is *positional*
rather than *rhythmic* — you solve it by being somewhere, not by waiting.

Honest risk, for Design to weigh: an enemy you cannot beat from the ground can
read as unfair to a six-year-old if the higher ground is not obvious. It wants
its first appearance authored with the vacbot already in frame.

**Art contract:** a Meshy auto-rig — it is a genuine biped, so it takes the
`skinned` path with named clips, not nodes. Concepted in a strict T-pose on
Eeri's approved body plan (`--ref`), because the rigger wants a body it can fit
a skeleton *inside*: two earlier bolt-bots with perfect T-poses and stick limbs
were both rejected with *"Pose estimation failed"*. One big amber eye for the
tell. Clips wanted: `idle`, `walk`, `notice`, `hurt`.

---

## The site kit — behaviours APPROVED (owner, 2026-08-18)

All rigged (`slice.mjs`) and joint-verified. The owner's calls, verbatim where
they decide something:

| piece | behaviour | its node |
|---|---|---|
| `jackhammer` | judders and hops — the hopper's big brother | `bit` (the striking assembly) |
| `generator` | **shakes and throws you away** — the bounce pushes a jump further, which is how you clear it to the far side and **pull the plug** | `plug` (hidden when pulled; the shake stops) |
| `compressor` | **blows air**, overpressures, and **takes off like a rocket** — `motor` rattles first, the telegraph before the launch | `motor`, `nozzle` |
| `wheelbarrow` | **moves toward you, then tips its tray to strike** — a gizmo first (a tipping surface is §8.2's cheapest fun), an enemy dress of the same rig second | `tray` (hinged at the FRONT LIP, the dump-truck pivot lesson) |
| `cabledrum` | dressing, or a rolling hazard on a slope | `spool`, `crank` |
| `gascart` | **SPRAY, not explode** — the owner offered either; a bottle that detonates is a different game | `nozzle` |

Behaviour code is Design/Level's (`robots.js` / hazards); the nodes above are
the art contract that makes each behaviour drivable, and they are cut and
measured now, because a node cannot be added after the mesh is made.

## `rollerbot` — the small roller, built

The ≤1-tile spacing-test enemy that shares a name and nothing else with the
ride machine. `squash` (an empty root holding everything — a stomped enemy
flattens *whole*), `eye` on its stalk, domed un-landable top. **Deliberately no
spinning drum**: the yoke plate sits flush against the drum face and they
interleave in z, so no predicate separates them — and §6.2's contract is squash
plus notice tell, nothing more. Fighting a mesh for a node the design never
asked for is how a day disappears.

## Two owner calls recorded (2026-08-18)

- **Material language: moulded plastic toy** for tools, gizmos and machines
  (option a/c) — effects may be crafty. The cardboard/felt language stays the
  *backdrop's*.
- **Faces on machines: dropped unless they work; try one.** The jackhammer is
  the trial — Meshy grew it two rivet-eyes uninvited and they suit it. Nothing
  else gets a face until that one is judged in a level.
