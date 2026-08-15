# EERI — mid-project phasing

**Audience: every agent — Art, Design, Level.** Read this before your lane.
Canon stays where it is: `ART_BRIEF.md` (look), `DESIGN.md` (what the game
does, esp. §8), `/ART_PIPELINE.md` (method), `assets/README.md` +
`manifest.json` (the seam). This file adds three things canon doesn't hold
yet: **the reference ratio, the tool-reality table, and the phase gates.**
Where this file and canon disagree, this file wins — it is newer owner
direction (2026-08-14).

**WORLD 1 / GROUNDWORKS:** before creating or dressing new World 1 environment
art, check `eeri/art-src/world-1-library/README.md` and its library folders.
It is an optional source trove, not production: use pieces when helpful, do not
overwrite existing assets, and only promote selected work through the normal
`eeri/assets/` seam.

---

## 0. Owner direction, 2026-08-14

1. **The reference pair is weighted: Yoshi's Crafted World 80 / Tropical
   Freeze 20.** ART_BRIEF §1.1 treats them as an even "×". They are not.
   The *default* answer to any look question is Crafted World: toy-diorama
   materiality, visible hand-built set, soft friendly light, craft
   surfaces. Tropical Freeze is the seasoning — camera drift on rails,
   layers where things happen, heavy-object weight — reached for
   deliberately, about one moment in five. If a level reads as "dramatic
   layered 2.5D with some toys in it," the ratio is inverted and it's
   wrong.
2. **Humanoid Meshy rigs are approved as non-violent enemies.** See §2.
   The scale rule holds (big = ride, small = dodge), and so does the tone
   rule: nothing malicious, everything stompable, site machines gone
   wandering — now including little worker-bots on legs.
3. **Phasing over features.** Each phase below has an exit gate. No agent
   starts Phase N+1 work while a Phase N gate item in its own lane is open.

---

## 1. Tool reality — what the pipeline can actually do

Plan against this table, not against hope. `docs.meshy.ai` is truth;
re-check before a batch.

| Need | Tool | Reality |
|---|---|---|
| 2D layers, concepts, UI glyphs | **Nano Banana** | Strong; free; T-POSE rule for anything headed to rigging (ART_PIPELINE §1). `--ref` to keep a character across re-poses. |
| Prop / vehicle mesh | **Meshy** image-to-3D / multi-image | Good; ~30 cr; `--raw`. **Never rigs.** Articulation = slice into named nodes (`slice.mjs`), per the excavator. |
| Character mesh + rig | **Meshy** rig | **Humanoid/biped only.** Needs clear limbs and daylight in armpits/crotch — hence T-pose. 5 cr, ~1 min, walk+run free. |
| Character animation | **Meshy** clip library | 600+ clips, biped-centric. Pick from the library; do not commission bespoke motion. |
| Squash, wobble, stomp-flatten, beacon spin | **Code** | Always code. Scale/rotate nodes at runtime. A Meshy clip for a squash is a wrong turn. |
| Repaint / restyle an existing model | **Meshy** retexture | Use before remodelling. Palette-strip discipline still applies at integration. |

**The routing rule: legs → Meshy rig · wheels/tracks → sliced nodes ·
deformation → code.**

## 2. The enemy roster, re-cast against the tools

DESIGN §3's three enemies, routed honestly:

| enemy | body plan | route | cost shape |
|---|---|---|---|
| **hopper** (jackhammer on legs) | biped — lean into it: stubby legs, tool-body, hard hat | concept in T-pose → mesh → **Meshy rig** → idle + a hop-ish clip from the library | cheapest enemy in the game |
| **bucket** (scuttling cement bucket) | give it legs → biped-ish | same path; "sleep" pose is just idle clip paused | cheap |
| **roller** (mini road roller) | vehicle | sliced nodes like the excavator: `body`, `drum`, `beacon` | moderate; no rig ever |

**And the approved expansion: a worker-bot family.** One rigged biped
base ("bolt-bot": round body, tool for a head), retextured/re-headed into
variants — wrench-bot, cone-bot, lamp-bot. One rig, one clip set, N
enemies. They patrol, carry things, nap. Never chase for long, never look
angry. This is the highest asset-value-per-credit item in the plan and it
directly fixes "one enemy type across twelve levels is not a game"
(DESIGN §8, Tier 2.5).

Stomp response is code on the rig root (flatten + pop), identical for all
of them — build once in `robots.js`.

---

## 3. Phases

### Phase A — the platformer earns its 80% *(now)*
The on-foot game is 80% of playtime (DESIGN §1) and it is the ratio's
namesake: this phase is almost all Crafted World.

- **Level:** re-lay the three levels per §8.0 — machine **on the route,
  facing the obstacle**; no walk-backs; fetch-shape allowed once, late,
  never in a teaching level. Add the midway checkpoint.
- **Design:** climb/ladders behind the declared verb; stomp feel (the
  bounce height is a tuning value, prove rooms against it); playthrough
  gate keeps its COST measure.
- **Art:** `hopper_v1` and one `bolt-bot` via the §2 biped path;
  `ladder_v1`/`scaffold_v1` (tile-vertical, seamless — placeholder
  contract already in play); UI glyphs ◀ ▶ ▲ Ⓐ Ⓑ, no key caps ever.

**Gate A:** a stranger plays levels 1–3 with the rides deleted and still
calls it fun. Two enemy behaviours live. Smoke + rooms + playthrough
green. Every new asset LOOK-gated as a picture (ART_PIPELINE's law).

### Phase B — variety is the level count
"One idea per level" means the gizmo kit *is* the game's length.

- **Art:** gizmo kit — `plank` (tipping), `conveyor`, `hoist` — sliced
  nodes, no rigs; `roller_v1` enemy; **world 2 backdrop set**
  (`pipeworks_{skyline,far,mid,near,fore}`, same rects as groundworks);
  two more bot variants by retexture.
- **Level:** levels 4–6 on the four-beat pattern (introduce → vary →
  combine → test), one gizmo each.
- **Design:** answer DESIGN §7 items 1–2 (name the four worlds; assign
  one ride machine per world) — these block the art queue, nothing else
  does.

**Gate B:** six levels, three enemy behaviours, three gizmos, two worlds'
backdrops. The 80/20 check: screenshot any level — does it read as a
hand-built toy set first?

### Phase C — the 20% and the meta
Now, and only now, the Tropical Freeze money shots and the wrapper.

- **Art/Level together:** one authored "camera moment" per world — a
  drift, a background machine event, a silhouette beat. Budget: one per
  world, not per level. World 1's second ride machine.
- **Design:** bolts x/100, golden bolts 3/3, blueprint per world;
  level-select; clock-out end-of-world beat (resolve §7 items 3–5).
- **Level:** levels 7–9; one deliberate late fetch-puzzle if it earns it.

**Gate C:** a full world plays start to clock-out with meta counting.

---

## 4. Standing rules (all agents, all phases)

- **Meshy feature first** — look up before building (ART_PIPELINE §0).
- **Every stage ends in a picture, and the picture is the gate.**
- Seam discipline: file at manifest path → status `live` → bump `v` →
  `node eeri/test/smoke.cjs`.
- Ride-ending hazards never stand between a machine and its job
  (`test/rooms.mjs` enforces).
- Controller-first, mobile-friendly; no mouse/keyboard language anywhere.
- Homage rule: grammar from references, never their characters or trade
  dress; Cat anatomy, not Cat livery.
- Nothing malicious on the site. Age 6, generous, knockback only.
