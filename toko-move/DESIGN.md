# Toko Move — design authority (producer)

**Status:** living producer design doc · promoted 11 Nov 2026 into `toko-move/DESIGN.md`  
**Producer:** D-sign  
**Repo path:** `toko-move/DESIGN.md`  
**Live build reference:** https://mbace1.github.io/Suds-Jack/toko-move/  
**Workflow:** [`docs/ACTIVEPRODUCER.md`](../docs/ACTIVEPRODUCER.md)

### Relationship to `ACT1.md`

Shipped canon for Act 1 systems lives in **`toko-move/ACT1.md`** (Helsinki act, four-run tones, euros, risk words, weather, deck shape) and in **`toko-move/js/runs.js`**.

This file **extends** ACT1 with Mikael's 10–11 Nov 2026 rulings (feel, failure philosophy, Night organ arc, meta pool, session length, Move↔Piritori). Where they conflict, **this file's dated decision log wins** until ACT1 is updated. Do not delete ACT1; merge into it when editing that file.

---

## 1. Vision

Toko Move is a **Helsinki courier roguelike** on the **real HSL tram and metro network**. The player reads the moving city, takes jobs, and deals with people.

**Feel of a good run:** fun random things happening while traveling around Helsinki — the **humor and strategy of a delivery person**.

**Touchstone:** *Subsurface Circular* — transit as the stage, conversations with strange passengers, a conspiracy that reveals slowly while the verbs stay the same.

**Not:** a line-drawing game; a moral-choice branchfest; a kids' mode; Piritori content inside Move.

**Split:** about **50% talking to people / 50% moving around the city**.

**Session:** about **3–5 minutes** per run. **Phone first**, desktop second. Art must crop cleanly to **9:16 and 16:9** from one master.

---

## 2. Pillars

1. **The board is real Helsinki.** Exact HSL geometry; no player-drawn routes; no fake lines presented as real.
2. **Opportunity is moving.** Wait, catch, ride, transfer, walk, deliver — timing and reading beat solved paths.
3. **People are half the game.** Cards/conversations are not garnish; target ~50/50 with movement.
4. **Temptation is the skill test.** Failure is usually choosing side tracks or obviously bad offers, not a brick-wall timer.
5. **Weirder up the ladder.** Each difficulty adds humor and obstacles; Night flips to hardcore dread.
6. **Same verbs, changing meaning.** Like the touchstone: controls stay; what a parcel *is* changes.

---

## 3. Core loop

Pick up work → move through the network → meet people/events → choose (often a side temptation) → deliver or pay the cost → next job until the run clears or strikes out.

Runs are **fresh shifts** with seeded decks, not fixed puzzles. Completing a ladder rung unlocks the next.

---

## 4. Difficulty ladder (LOCKED)

Existing ladder — keep:

| Run | Role |
|---|---|
| **EASY** | Fun on-ramp; plain parcels; gentle city |
| **MEDIUM** | Fun + city happening to you; sells and everyday chaos begin |
| **HARD** | Riskier; more obstacles; rush / disruption pressure |
| **NIGHT** | 4th difficulty; **hardcore / darker theme** |

**Weirder each step:** more humor and more obstacles as you climb. Night is not "more of HARD" — it is a **tone shift** into dread and body horror, still on the same verbs.

Stars stay cosmetic. Daily/week extras remain gated after Night unless a later decision changes that (`runs.js` today).

---

## 5. Night — organ arc (LOCKED direction · NOT fully built)

Night is a **darker hardcore mode**, not a branching moral system.

- **No refuse / sabotage branch.** You are a courier; you keep delivering. Tension comes from what the parcels are and what the city does, not from opting out of the premise.
- **Hint → reveal → escalate:** organ deliveries (maybe for eating, or other reasons) are **hinted slightly across about three Night runs**, then **revealed**; after that content **keeps getting grosser and darker**, including **addict-type zombies** later.
- Reuses the existing sealed-parcel / sell-hint / scary-card language in ACT1; does not require new verbs.

ACT1 already calls Night "scary, very risky" and allows sells that hint at contents. This doc **names the endgame of that hint**.

---

## 6. Failure and side tracks (LOCKED)

- Failure **may** include a skill wall, but the **general barrier stays low**.
- Players mostly fail by taking **side tracks** or **obviously bad choices**.
- Even hard modes should be **easy to pass if you avoid those temptations**.
- Side-track bait: **story**, **fun**, and **money that is too good to be true**.

Design test: a careful courier who declines shiny offers clears HARD/NIGHT more often than a greedy or nosy one — without needing perfect transit mastery.

---

## 7. Meta progression (LOCKED direction)

Across play, unlock into the pool:

- **modifiers**
- **seasons**
- **weather**
- **perks**

(Exact unlock schedule TBD; perks and weather/day draws already exist in partial form — see gaps.)

---

## 8. Courier identity

- The courier uses the **Toko face**, starting **cyan**.
- Later **color changes** (new courier, mood, etc.) are allowed as a future lever — **TBD**, not scheduled.

Only the player courier gets the exact cyan Toko face overlay in art (existing art rule).

**Job source (LOCKED 10 Nov 2026):** jobs come to the courier through an **app**, not a dispatcher character. The app is **a bit snarky — humor is central** to its voice (LOCKED 10 Nov 2026).

---

## 9. Move and Piritori

- **Toko Move is the main game** to publish and finish as Helsinki Act 1.
- **Piritori is a spin-off** that **links to Move** and becomes **standalone when finished**.
- Move stays free of Piritori adult content; soft doors (address / gate) only, per earlier ROADMAP/authority.

---

## 10. What ACT1 still owns (unchanged unless logged later)

Keep building on ACT1 unless a new decision replaces them:

- Euros, risk words (*usually / maybe / long shot*), weather levers, card anatomy
- Tram models as **look-only** tiers
- Helsinki-only until Act 2
- Four-run tone table (fun / fun / risky / scary) — extended here for Night's organ escalate

---

## 11. Gaps vs current build (main ≈ v3.23)

| Design (this draft) | Build today | Gap |
|---|---|---|
| Night organ hint over ~3 runs → reveal → grosser + addict zombies | Night scary deck + sealed/sell hints ("parcel moved", big cash offers); **no organ arc, no zombies** | **Largest content gap** |
| ~50/50 talk vs move | Strong card journey exists, but movement/board still a large share of attention; ratio not measured or tuned as a pillar | **Pacing / content mix** |
| Meta unlocks: modifiers, seasons, weather, perks into pool | Perks unlock into a pool; weather/day draws exist; old **mutators removed** when Night became a run; no unified "seasons/modifiers" unlock fantasy | **Meta framing incomplete** |
| Failure mostly from side-track temptation; hard modes easy if you abstain | Strikes, rush, halts, marches create pressure even when declining sells; tapper bots fail high; temptation exists but is not the stated primary fail mode | **Balance philosophy** |
| 3–5 minute runs | Journey length varies by rung/jobs; not locked or gated as 3–5 min | **Session target** |
| No moral refuse/sabotage branch | No such branch shipped (good); sells can dump a job for cash — must not grow into "refuse the organ plot" | **Guardrail for agents** |
| Phone-first dual crop art | Art rules + PR #632 exist; not every moment dual-cropped yet | Ongoing |

---

## 12. Decision log

### Decision 10 Nov 2026 — Active producer + Move feel
- **Mikael (paraphrase):** High-level design should be conversational; D-sign writes docs that direct Claude/Codex. Start with Move. A good run feels like fun random things while traveling Helsinki — delivery-person humor and strategy. Each difficulty gets weirder (more humor, more obstacles). Night is the 4th difficulty and gets darker; you start realizing you may be delivering organs (eating or other reasons).
- **Locks:** feel; ladder = EASY/MEDIUM/HARD/NIGHT; Night = darker 4th rung.
- **Extends:** ACT1 Night = scary.

### Decision 10 Nov 2026 — Night hardcore, organ cadence, failure, meta, courier, session, Piritori
- **Mikael (paraphrase):** Night is a darker theme like hardcore mode, not a branching moral system (no refuse/sabotage). Organs are hinted slightly over three night runs, then revealed; afterward it gets grosser and darker, with addict-type zombies later. Failure can be a skill wall but is generally low-barrier; mostly from side tracks or bad choices — even hard modes are easy if you avoid them. Side tracks tempt with story, fun, and money too good to be true. Meta unlocks modifiers, seasons, weather, and perks into the pool. Courier is the Toko face, cyan first; color changes later TBD. Runs 3–5 minutes; phone first, desktop second; art 9:16 and 16:9. Touchstone Subsurface Circular; ~50/50 talking vs moving. Move is the main game; Piritori is a spin-off that links to Move and becomes standalone when finished.
- **Locks:** as above.
- **Supersedes / clarifies:** any reading of Night as optional morality play; soft-door Piritori stays, Move remains the mainline publish target.

### Decision 10 Nov 2026 — Job source
- **Mikael:** "App" — jobs are handed out through a courier app, not a dispatcher person.
- **Locks:** job source = app.
- **Follow-up (Mikael):** "A bit snarky, humor is central." — app voice locked as lightly snarky and funny.

### Decision 10 Nov 2026 — Night parcel mix
- **Mikael:** "Some but shady packages in general." — after the reveal, only some Night parcels are organs; Night cargo overall is shady packages.
- **Locks:** post-reveal parcel mix = some organs + general shady packages.

### Decision 10 Nov 2026 — Night shady characters
- **Mikael:** "Both, there can be other shady characters. The addicts are just an easy stereotype." — Night threats appear as **encounter cards and board obstacles**; addict-type zombies are one example within a wider cast of shady characters.
- **Locks:** both surfaces; broader shady cast, not zombie-only.

### Decision 10 Nov 2026 — Seasons
- **Mikael:** Fall = rain and darker tones; winter = snow and sleet. The season is announced at run start together with other modifiers. Seasons are random but more likely in their matching real-world season; summer always defaults to 50% or more.
- **Locks:** season = weather/tone modifier drawn at run start, weighted by real calendar; summer ≥ 50% baseline.
- **Note:** earlier art rejection of rain treatments applies to default/sunny art; rain belongs to the fall season modifier.

### Decision 10 Nov 2026 — Side tracks are the fail mode
- **Mikael:** "Side tracks are the only real way to fail a run, because you get side tracked and the package might not make it. They seem great and sometimes can be, but it's always an added risk."
- **Locks:** side tracks = the **only real fail source**; they can pay off but always add risk to delivery. Base pressure (strikes, rush, halts, marches) must not fail a no-side-track run on its own — **balance pass needed** (see §11 Balance philosophy gap).

### Decision 10 Nov 2026 — Score and mutator unlocks
- **Mikael:** "Both, it's all recorded in your scores and higher scores can unlock more mutators."
- **Locks:** run score = euros + app star rating, kept in a score record; higher scores unlock more mutators (feeds §7 meta pool). Note: build removed old mutators when Night became a run — mutators return as score-gated unlocks.

---

## 13. Open questions (ask Mikael next — one at a time)

1. When promoting this file, replace ACT1's Night section in place, or keep ACT1 as systems and this as pillars/arc?

---

## 14. Agent note

Treat **ACT1 + runs.js as SHIPPED systems** and **§5–§7 here as LOCKED-NOT-BUILT direction**. Do not implement zombies/organs without a producer brief. Tag new ideas **PROPOSAL**.
