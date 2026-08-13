# EERI — design plan

Companion to `ART_BRIEF.md` (look) and `assets/README.md` (technical
contract). This file is **what the game does and what that costs in
assets** — the art pipeline should be able to read §5 alone and know what
to make next.

Status: plan, 2026-08-13. Rewritten on owner direction (below).

---

## 0. Owner direction, 2026-08-13 — the pivot

> *"Scrap the feral machines and focus on hazards and small enemies. It
> needs to be a fun platformer with short machine riding sequences. You
> can always add features like ladders and gizmos."*
>
> *"All the Suds Jack games are mobile friendly (on-screen controls) but
> also controller first — no mouse and keyboard type instructions."*

**The platformer is the spine. Machines are set-pieces.** Everything below
follows from that, and it supersedes the machine-as-loop plan: no feral
timer, no taming puzzle, no machine A→B tracks, no lock-and-key rooms.

This is the **Tropical Freeze shape**, which was already the locked
reference: the mine cart and Rambi are *sequences* you board for a
thrilling stretch and step off again. They are not the game. Running,
jumping and reading hazards is the game.

## 0.1 Blocking: the tree is forked

Two branches both call themselves v6 and neither contains the other —
`claude/eeri-platformer-instance-2un2bg` (parts kit, room prover, crane,
robots) and `claude/meshy-api-key-export-w652zb` (animated Eeri, asset
pipeline). Whichever lands second deletes the other. **Reconcile before
building.** Art production can proceed in parallel.

---

## 1. The game

**On foot, moment to moment:** run, jump, **climb**, **stomp**, and read
what the site is doing to you. Bolts to collect. That is 80% of playtime
and it has to be good on its own — if the riding were deleted the game
should still be worth playing.

**Machine sequences, every couple of screens:** board at a marked point,
ride a short authored stretch that no amount of jumping could cross, step
off at the far end. Thirty to forty seconds. The ride is a **reward and a
change of gear**, not a puzzle.

**The scale rule that ties it together:** *big machines you ride, small
machines you dodge.* Both are Tonka × Cat, both belong to the site — the
contrast is size and intent, which is Mario's Yoshi-versus-Goomba split in
this game's own vocabulary.

## 2. Verbs

| verb | who | notes |
|---|---|---|
| run · jump | kid | apex 2.65 tiles, run-jump 4.85 across — the budget every room is proved against |
| **stomp** | kid | **new, and the biggest single gap.** Bounce off a small enemy to kill it and gain height. A platformer without a stomp is a walking simulator with gaps |
| **climb** | kid | **new.** Ladders and scaffold rungs — rooms become vertical instead of corridors |
| board / leave | kid | at authored points only, not anywhere near a machine |
| drive · dig · swing | machine | inside a ride sequence only |

Gizmos are the third source of variety and cost the least: tipping planks,
conveyor belts, hoist platforms, swinging hooks, bouncy tarpaulins.

## 3. What the site does to you

**Small enemies** — never malicious, just site machines gone wandering.
All stompable, all readable, each with one behaviour:
- **hopper** (a jackhammer on legs) — hops on a fixed rhythm; a timing test
- **roller** (a mini road roller) — trundles a span, turns at edges; a
  spacing test, too flat to stomp comfortably so you jump it
- **bucket** (a scuttling cement bucket) — sleeps, wakes when you land
  near, chases briefly; a provocation test

**Hazards** — environmental, always telegraphed before they are lethal:
steam vents, swinging loads, falling pallets, wet cement (slows, never
kills), sparking cables.

**Cost of a hit:** knockback and mercy frames on foot; inside a ride, the
Yoshi rule stands — a hit ends the ride early and drops you back on foot,
so a ride is a thing you can *lose* rather than fail.

## 4. Controls — house convention, not a per-game choice

**Controller first, touch always, and prompts that name neither a key nor
a mouse.**

- Movement: d-pad **or** left stick. Jump: **A**. Action (climb, board,
  use): **B**. Nothing needs a second stick, a trigger, or a pointer.
- On-screen controls mirror exactly those: ◀ ▶ ▲ and one action button,
  44 px minimum, `pointerdown`/`touchend` — never `click`.
- The catalogue entry becomes `pad: 'native'` — Eeri reads a pad itself
  rather than having `hub/padkeys.js` synthesise key events at it.
- **Every prompt uses glyphs, never key names.** `▶ RUN · Ⓐ JUMP ·
  Ⓑ CLIMB`, never `A D — RUN · SPACE — JUMP`. Current hint strings are all
  keyboard and all wrong; they are a rewrite, not a patch.
- Keyboard keeps working. It is a fallback, and it is never what a prompt
  describes.

---

## 5. Assets this needs — for the art pipeline

Contracts, scale and orientation live in `assets/README.md`; the look is
`ART_BRIEF.md` §3.6 (Tonka × Cat) and §5.1 (manipulable pieces).

**The priority moved.** Machines are no longer the spine, so the crane and
the manipulable pieces drop below the things the player touches every
second. Small enemies and gizmos are now the top of the list.

### 5.1 Already live — do not remake
`eeri_v3.glb` (skinned; clips idle/walk/run/jump/sit) · `excavator_v1.glb`
· the five `groundworks_*` layer PNGs.

### 5.2 Needed next, in priority order

| # | asset | contract | why |
|---|---|---|---|
| 1 | `hopper_v1.glb` · `roller_v1.glb` · `bucket_v1.glb` | small (≤ 1 tile). Rigid nodes; each needs a **squash node** the game scales when stomped, and a **notice tell** — a lit eye or lamp — that fires before it acts | the moment-to-moment. Nothing is more used and nothing is missing more |
| 2 | **Eeri's new clips** on `eeri_v3.glb` | add `climb`, `stomp` (the bounce), `hurt` to the existing five | the two new verbs have no animation at all |
| 3 | **gizmo kit** — `ladder_v1.glb`, `scaffold_v1.glb`, `plank_v1.glb` (tipping), `conveyor_v1.glb`, `hook_v1.glb` | 1-tile modules that repeat; ladder and scaffold must tile vertically without a seam | verticality and variety, and the cheapest fun per asset in the whole list |
| 4 | **hazard kit** — `vent_v1.glb` (`collar` lights before it blows), `pallet_v1.glb` (falls, then a rubble state), `cement_v1.png` (a flat patch, 2D) | telegraph is the whole point of each one | carries the tension between rides |
| 5 | **Site 2 and Site 3 layer sets** — `girderworks_*`, `demolition_*`, five PNGs each, same rects and sizes as `groundworks` | | three rooms currently share one backdrop, so the whole game looks like one place |
| 6 | `crane_v1.glb` | excavator's node set — `house boom stick bucket seat step wheels beacon` — ball on the stick's end | the one ride machine with no art; demoted from #1 because rides are now occasional |
| 7 | `bank_v1.glb`, `wall_v1.glb`, `girder_v1.glb` | `state0/1/2` (+ `grip` on the girder) | ride payoffs. Real, but the last thing the player looks at |

### 5.3 UI art, now that controls are settled (§4)
Button glyphs for the on-screen pad and every in-game prompt: ◀ ▶ ▲ plus
Ⓐ and Ⓑ in the machine-yellow/ink pair. **No key caps, no mouse icons,
ever.** One set, used by the touch buttons and the hint line alike.

### 5.4 Not yet
A fourth machine. More sites than the layer sets above cover. Do not start
either until §6 is answered.

---

## 6. Open, for the owner

- **How many sites?** Three is a demo. The answer sets how many layer sets
  (§5.2 #5) the pipeline should plan for, so it blocks art, not just code.
- **Does Eeri stomp, or dodge?** §2 assumes stomp, because it is the verb
  that makes a platformer feel like one and it gives the small machines a
  point. If he only ever avoids them, they become moving walls and the
  enemy list wants rethinking.
