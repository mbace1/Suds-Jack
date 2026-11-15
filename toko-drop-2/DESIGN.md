# Toko Drop — design authority (producer) · 2.0 + Zero

**Status:** living producer design doc · promoted 11 Nov 2026 into `toko-drop-2/DESIGN.md`  
**Producer:** D-sign  
**Repo path:** `toko-drop-2/DESIGN.md`  
**Playable tree:** currently on the `gh-pages` branch of `mbace1/Suds-Jack` (not a top-level folder on `main`). This doc is also kept on `main` under `toko-drop-2/` so agents starting from `main` can find it.  
**Live:** https://mbace1.github.io/Suds-Jack/toko-drop-2/

### Relationship to existing canon

**Defers to:** root `GDD.md` (classic Drop), `TOKO_DROP_ROADMAP.md`, `toko-drop/RUSH_DESIGN.md` / port briefs, live **`toko-drop-2/VERSIONS.md`** on `gh-pages`, Godot `toko-drop-godot/CLAUDE.md` (JS leads gameplay; Godot pushes graphics/physics).

Workflow on `gh-pages`: [`docs/ACTIVEPRODUCER.md`](docs/ACTIVEPRODUCER.md).

This file only adds **Decision 10 Nov 2026** lane split and merge rule. Classic cabinets-on-hold and curriculum notes in the roadmap stay until separately revisited.

---

## 1. Vision

Twin-stick swarm survival where gels and corpses fight back. **2.0** is the gameplay product; **Drop Zero** is a visual/tech lab. Parts of Zero **may** later land in 2.0 only by joint decision.

---

## 2. Pillars

1. **Keep the feel that already works** (**Decision 10 Nov 2026**) — 2.0 adds **challenge and strategy**, not a different fantasy.
2. **Corpses / gels matter** — classic GDD identity.
3. **Two play fantasies in 2.0:** Arcade pressure vs Campaign puzzles (below).
4. **Zero explores look and tech** without silently rewriting 2.0 systems.
5. **No unilateral Zero→2.0 merges** (**Decision 10 Nov 2026** + ACTIVEPRODUCER §3b).

---

## 3. Structure

### 3.1 Toko Drop 2.0 (Claude) — SHIPPED base, evolving

**Live:** https://mbace1.github.io/Suds-Jack/toko-drop-2/ (~v130). Already has **basic environment art that looks much better** than earlier Drop (**Decision 10 Nov 2026** note).

| Mode | Role (**Decision 10 Nov 2026**) |
|---|---|
| **Arcade** | Which **waves** and **enemy types** are introduced **when** |
| **Campaign** | Individual **timed challenges**, each unique, with more **variety** and fun **modifiers / limitations**; some challenges **double as strategies** usable in Arcade |

HARD / HEAT / rooms / bosses already exist in 2.0 VERSIONS — treat as SHIPPED systems under this framing unless a brief changes them.

### 3.2 Drop Zero (Codex) — LOCKED-NOT-BUILT as a located tree

**Role (**Decision 10 Nov 2026**):** lab for a **great HD visual style pushed to its limits** (may or may not become cel shading or other looks), plus **physics**, **enemy division**, and **tech exploration**.

**Status:** codebase **not found** on disk / Pages (branch name `codex/toko-drop-zero-court` is behind main with no unique files). Authority for Zero cannot deepen until Mikael points at a path or zip.

### 3.3 Classic Drop + Godot

Classic `toko-drop/` remains the historical / hub v221 lineage. Godot port follows JS gameplay; may push presentation. Not the same as Zero.

---

## 4. Gaps vs current build

| Design | Build | Gap |
|---|---|---|
| Zero as HD visual/physics lab | Tree not located | **Find Zero** |
| Campaign challenges as portable Arcade strategies | Campaign rooms + mutators exist; "strategy export to Arcade" not named as a system | Design + plumbing |
| Joint merge process | No producer checklist yet | Process |
| Arcade = deliberate enemy/wave curriculum | Wave directors exist; "history of gaming" curriculum still open in roadmap | Content design |

---

## 5. Decision log

### Decision 10 Nov 2026 — 2.0 feel + Arcade/Campaign + Zero lab + joint merges
- **Mikael (paraphrase):** 2.0 keeps the already-good feel and adds challenge and strategy. Arcade = which waves and enemy types are introduced when. Campaign = individual timed challenges, each unique, with more variety and fun modifiers/limitations; some double as strategies for arcade. Drop Zero (Codex) = lab for a great HD visual style pushed to its limits (may or may not translate to cel shading or other looks), plus physics, enemy division and tech exploration. 2.0 (Claude) = gameplay and systems; already has better basic environment art. Merges from Zero to 2.0 are decided jointly by Mikael and the producer.
- **Locks:** as above.
- **Extends:** GDD / 2.0 VERSIONS; does not invent Zero's missing tree.

---

### Decision 10 Nov 2026 — Campaign ↔ Arcade link
- **Mikael:** "Many of the bigger beats in the campaign are enemy or wave variations you see in the arcade. It's up to the player to play either and see them."
- **Locks:** no equip/loadout system; the link is **shared enemy/wave variations** — campaign set-pieces showcase arcade threats, discoverable in either mode, in any order.

### Decision 10 Nov 2026 — Release candidate and hub
- **Mikael:** Eventually 2.0 will be the release candidate. The hub is just a dev tool; once more games are public, it should be made public, or a similar concept with a new version.
- **Locks:** 2.0 = future release candidate (classic is not the ship target); hub = internal dev tool for now, public hub/portal later when more games are public.

---

### Decision 15 Nov 2026 — Sakurai skill adopted for 2.0
- **Mikael:** "https://github.com/kociden/sakurai-skill — Add this to Toko Drop 2.0 and aim to design accordingly."
- **Locks:** 2.0 is designed and reviewed through the Sakurai principles (§6). Coding agents load the skill, cite the chapter, and bring design questions back to D-sign/Mikael. The mappings in §6 stay **PROPOSAL** until Mikael picks. Pillar 1 (keep the feel) wins on conflict.
- **Caveat:** the skill is an unofficial AI summary (in Japanese) of Sakurai's videos, not his words.

---

## 6. Sakurai principles (adopted 15 Nov 2026)

**Source:** [kociden/sakurai-skill](https://github.com/kociden/sakurai-skill). It's an unofficial, fan-made AI summary of Masahiro Sakurai's YouTube series *桜井政博のゲーム作るには* and **not Sakurai's own words**. Agents load it as `.claude/skills/sakurai` (see `toko-drop-2/AGENTS.md`). Citations below use the skill's chapter (§) and video numbers (#NNN).
**Evidence base:** D-sign's playtest board: Astra's campaign and arcade playtests (11 Nov 2026, build v147; mostly read from files because of software-WebGL lag) and Toko Art's 8 room pitches, and the live `VERSIONS.md` (v153). Note that v153 (12 Nov) let a room wear any world's look. The Core now wears the core, NEEDLE wears the sewer, and 17 shaped or moving rooms wear the neon grid. That changed the *look* only. Rules, rosters, goals and clocks are unchanged, so the gameplay findings below still stand.

**Adoption (Decision 15 Nov 2026):** Toko Drop 2.0 is designed and reviewed through the Sakurai lens. The principles are a **review checklist, not locks**. Every mapping below is a **PROPOSAL** until Mikael picks. Pillar 1, "keep the feel that already works", still wins on any conflict. Feel changes ship behind a tuning toggle so Mikael can A/B them on a phone.

| # | Principle (cite) | Drop 2.0 now: follows / violates (evidence) | PROPOSAL |
|---|---|---|---|
| 1 | **Risk and return sit close together and are balanced** (§1; #006, #191, #236 "did the player do something that good?") | **Follows:** HEAT is "one multiplier, paid for risk" (v51). The dash goes through bodies (v124). HARD makes corpses fire back. **Violates:** **salma** costs 3 but has 1 hp, so you get reward with no risk. **World-5 protect-heart** loses half the heart in ~2 s, a penalty before the player has done anything wrong. **13/36 rooms are survive-for-score**: the card pairs a clock with a points line, so the player can't tell which risk pays. | Score and cost scale with how dangerous a kill is (#236). Give salma a threat (e.g. it leaps when the current carries it) or drop its cost to 1. Give heart rooms a 3–5 s grace before the heart takes damage. Each room card states **one** win condition. |
| 2 | **Squeeze, then release (ギュッとしてパッと)** (§1; #009, #071) | **Follows:** the arcade is a rising sawtooth (breather after spike, spike every 4 waves, boss every 8; v59). **Violates:** **deep troughs at world boundaries**: a full 3-life heal plus a breather opener (worlds 3, 4, 6, 7, 9) is a release with no squeeze. **Floor shifts land on breathers** (River breathe, Ice floe, Core twins), so the biggest moments score as dips. Survive rooms end when the clock runs out, not on a release beat. | Open each world on its **signature wave** at about pre-boss pressure, and heal 2 instead of 3 (pending Q1). Move floor shifts onto the rising wave before the spike. Every campaign room ends on a payoff (last clear, boss, gate, flush), not on a clock. |
| 3 | **Sharpen every enemy until it fits in one phrase** (§1; #204: "even Gordo, which just sits there, makes strategy through placement") | **Follows:** Mirra "mirrors your volleys", Weeva "fastest gun (0.16 s)", the giant's slam "step out", the sewer ram "clear the lane". **Violates:** **swarms can only draw cost ≤2 mobs**, so big waves are almost all globbo, yela and sludge. Signature species (hoppa, worma, bubbla, steama, salma, skata, glowa, mirra) show up at only about 0.3–1.5 bodies per wave. Salma has no phrase. Bubbla is shared between two worlds. | Keep a **one-phrase table** for every species next to `TUNING`. Each world gets a **signature-swarm** variant where its own species fill the big waves. A species with no phrase gets sharpened or leaves the pool. |
| 4 | **Don't flatten the strength curve: alternate bosses and flats** (§2; #105: a boss is "a problem that makes you think", not just "stronger than its surroundings") | **Follows:** the curve rises with peaks and dips (Decision 11 Nov roller coaster). **Violates:** **boss hp spikes**: Curbking 200 (world 2) against Prism 36, Maw 54 and **Blister 30**, so one is a wall and one is a letdown. **Worlds 7–9 plateau**: speed and fire clocks cap around world 6, and wave 72 presses like wave 38. | Define each boss by its **one trick** (its phrase), with hp in a smooth band by world. Curbking comes down and Blister goes up and gains a mechanic. After world 6, keep rising through **composition** (heavies, linked pairs, rule-driven asks), not speed. |
| 5 | **Fast retry** (§2; #116: the speed of getting back in matters more than the size of the penalty; also no enemies on top of you at respawn) | **Follows:** the intro never plays on a retry (v39). The death screen says what got you (v69). CONTINUE at each world's door (v80). **Unknown/violates:** death-to-control time is not measured in either mode. **World 8:** 22 gels on the player at 0:03 with `?world=8`, and a retry died instantly (respawn-into-threat, which #116 calls out). | Measure death-to-control and aim for ≤2 s. RETRY is the primary, one-tap button on the campaign result card (especially on an F). Guarantee a spawn-safe radius on every start or restart. |
| 6 | **Show the fun in the first 3 minutes** (§4; #017, #233: open on a climax) | **Follows:** arcade play starts within seconds. Every world ends on a named boss (v109). **Violates:** **campaign room 1 (First Light) is the weakest card** (2/3/2: "survive 25 s" plus a 44,000-point C line read as two goals). Astra got F twice and could not move on. Surface is 4 survive rooms out of 6. | Room 1 is the clearest, showiest single-goal room (Gate Run-style), with a wow (moving floor or signature enemy) inside 60 s. Cut First Light's double goal. |
| 7 | **Tutorial inside the real game** (§4; #085, #171) | **Follows:** v115's floor teaches its own attacks (STEP OUT!, CLEAR THE LANE!) until you get out once. **Violates:** **rules are inherited, not designed for.** Vein's sweep is never taught. Foam's slip matters in about 2 of 6 rooms. Kiln's updraft only bites in The Core's last ~17 s. In arcade, Cistern (sweep) and Deep (dark) only switch their rule on. | The first room or wave of each world is a **rule-as-goal ask**, with *Lights Out* as the template (e.g. Vein "thread the sweep", Foam "no brakes", Toko Art's Thin Ice / Piston Deck / The Ray Passes / Log Run). Extend the v115 floor prompts to sweep, updraft, dark, current and slip. |
| 8 | **Hitstop, hit feel and effects checklist** (§5, §7; specs #003, #047; effects #056, #103, #130, #221) | **Follows:** 1.x trauma shake on kill, hurt and death. Hit flash, sparks, kill flash and ring (v13). Jelly dents and slices (v10–11). Goo and splatter. **Gap:** **no hitstop found**: none in live `main.js` or `tuning.js` (v153), and none in an 11 Nov snapshot of all of `toko-drop-2/js`. Boss kills and hero death get shake but no stop plus flash. Hit marks aren't checked for a dark component on bright floors (driveway, ice). | A hitstop pass behind `TUNING` toggles: a few frames scaled by body size on big kills, longer on boss kill and hero death, plus a flash with light and dark alternating. Keep the swarm flowing (no stop on small kills). Check hit-mark readability on ice and the driveway. Mikael A/Bs it on a phone (pending Q2). |
| 9 | **Externalized parameters and a debug mode** (§11; #046 "the program is the skeleton, parameters are the muscle", #193) | **Follows (strongly):** `TUNING` in `tuning.js`, level JSONs, URL params (`?world`, `?nointro`, `?ending`, `goo/lens/gels/style`), and bots that play every room. **Violates:** **no debug unlock**. The campaign is strictly sequential, so testers can't open a room directly (Astra rated 12 of 13 rooms on paper). No in-game tuning overlay. | `?room=<id>` and `?unlock=all` for dev only, never writing saved progress. A small debug overlay (invulnerable, slow-mo, jump to wave N). |
| 10 | **Hang the reward right in front of the player** (§3; #023, #075, #095 "praise the player") | **Follows:** the HUD shows the grade you're on course for (v34). Results put your number against the lines, and an F says why. Crown for an all-S world, RECORDS, HEAT. **Gap:** no "how far to the next grade" on the result card. Arcade has no visible next target beyond score. There's little praise staging on S grades or boss kills. | Result card: "+3,200 for B". Arcade HUD: next best or next unlock in reach. Praise beats on S and boss kill (announcer line, burst of goo-confetti). |
| 11 | **Don't average in balance** (§1; #216, #245: grow the strengths *and* the weaknesses) | **Risk:** the process tunes everything into bands (v56/v57 bot-retuned rooms, v135 lowered 26 C lines). That's fine for fairness, but trimming toward the mean makes rooms and enemies alike. Fixing Curbking/Blister by equalising hp alone would be averaging. | Balance on **another axis** (tell time, recovery, hitbox, spawn count) and keep the signature stat. Keep extremes like Mirra's deadliness and give them a counter instead of a nerf. |

### Open questions these principles raise (for Mikael)

1. **Entering a new world:** should it feel like a fresh breath (full heal, easy opener) or a continued squeeze (carry some damage in and open on the world's signature wave)?
2. **Hitstop vs flow:** Sakurai says always add a short freeze on impact. In Drop, should big kills, boss kills and your own death freeze for a beat, or does the swarm's unbroken flow matter more than the punch of a single hit?
3. **What is a boss:** should each boss be a short puzzle with one trick to read, or an endurance wall you outlast? (Today Curbking is a wall and Blister is a pushover.)
4. **The campaign's first minutes:** should room 1 be the showiest room (a moving floor or a signature enemy) even if it's harder, rather than the gentlest survive room?
5. **World identity vs even difficulty:** should each world's signature species take over its big swarm waves, so worlds feel distinct but harder in different ways, rather than the cheap common mobs filling every swarm?

---

## Boss phases (PROPOSAL, implemented in PR)

Per **Decision 15 Nov 2026: Bosses are multi-wave fights**. Implemented in v154 (`toko-drop-2/js/tuning/bossphases.js`, `sim/species/bosskit.js`). It applies in ARCADE and HARDCADE. Campaign boss rooms (PACK ICE, BOIL OVER, THE DEEP END) keep v153 behaviour unless `?bossphases=all` is set. `?bossphases=off` restores v153 for A/B.

Rules:
- Each world boss has 3 phases, gated by health: P2 at ≤66%, P3 at ≤33%. Phases only go up, and none can be skipped, because health holds at the next line until the phase has lasted 5 s.
- P1 is the boss's own trick. P2 is its old half-health rage, now starting at 66%. P3 adds that world's signature gel and a pace ramp, and tightens the boss's own numbers.
- Big bosses get a ~2 s death sequence (shudder, white flashes, floor cracks of light and goo, 8 goo bursts, then a 1.6× final burst). It is visual only, with no freeze.
- TWIN PRISMS (w1) and OMEGA (w9) keep their 1.x phases. OMEGA already has 3 acts at 66%/33%.

| World · boss | HP v153→v154 | P1 (100%) | P2 (≤66%) | P3 (≤33%) | Bot median fight s, v153→v154 |
|---|---|---|---|---|---|
| 2 · CURB KING | 200→**110** | single hop, 10-ring | hops twice, doubled ring, HOPPA brood every 5th landing | **+3 HOPPA**, pace ×1.15, 12-ring, crouch 0.4 s, brood every 3rd | 38→25 |
| 3 · MAW | 54→54 | surface + 3-arm spiral | surfaces sooner, sludge holes | **+2 WORMA**, pace ×1.1, 4-arm spiral, 18-ring erupt, up 2.6 s | 20→26 |
| 4 · BLISTER | 30→**40** | shell 10, bare 4 s | faster blows, bigger bursts | **+3 BUBBLA**, pace ×1.15, shell 11, bare 3.4 s, 7-shot panic fans | 7→22 |
| 5 · KETTLE | 140→**120** | 3 jets, stalls every 2nd vent | 4 jets, alternating spin, fill 1.9 s | **+2 STEAMA**, pace ×1.1, 5 jets, fill 1.5 s, stalls only every 3rd vent, bigger steam | 35→32 |
| 6 · PIKE | 80→**90** | circle, 1 charge | **2** chained charges, aim 0.6 s | **+3 SALMA**, pace ×1.1, **3** charges, aim 0.5 s, charge speed 19 | 28→29 |
| 7 · BERG | 88→**100** | slide, 4 icicle lines | calves 2 SKATA, faster, 8 lines | **+2 SKATA**, pace ×1.1, freezes every 3.6–4.4 s, tell 0.65 s, 6-icicle walls | 20→22 |
| 8 · ANGLER | 150→150 | creep, bite, 3 lanterns | 2 GLOWA, lanterns ×2 | **+2 GLOWA**, pace ×1.15, bite tell 0.45 s, rest 0.9 s, 16-ring, 4 lanterns | 26→28 |

The fight times come from my own simple dodge-and-shoot bot: 8 seeds, ARCADE, run in node against the sim. It is not the repo's `scripts/boss-tiers.mjs` pass, so use them only to compare v153 with v154. The spread across worlds 2–8 narrowed from 7–38 s to 22–32 s. The grade lines (S/A/B) are the old measured lines × a per-boss estimate (`tiers`) until boss-tiers is re-run.

## 7. Open questions

1. Where is Drop Zero's project (path, Drive zip, or private machine)?
2. The five Sakurai-lens questions at the end of §6.
