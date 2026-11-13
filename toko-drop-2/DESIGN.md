# Toko Drop — design authority (producer) · 2.0 + Zero

**Status:** living producer design doc · promoted 11 Nov 2026 into `toko-drop-2/DESIGN.md`  
**Producer:** D-sign  
**Repo path:** `toko-drop-2/DESIGN.md`  
**Playable tree:** currently on the `gh-pages` branch of `mbace1/Suds-Jack` (not a top-level folder on `main`). This doc is also kept on `main` under `toko-drop-2/` so agents starting from `main` can find it.  
**Live:** https://mbace1.github.io/Suds-Jack/toko-drop-2/

### Relationship to existing canon

**Defers to:** root `GDD.md` (classic Drop), `TOKO_DROP_ROADMAP.md`, `toko-drop/RUSH_DESIGN.md` / port briefs, live **`toko-drop-2/VERSIONS.md`** on `gh-pages`, Godot `toko-drop-godot/CLAUDE.md` (JS leads gameplay; Godot pushes graphics/physics).

Workflow on `main`: [`docs/ACTIVEPRODUCER.md`](../docs/ACTIVEPRODUCER.md).

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

## 6. Open questions

1. Where is Drop Zero's project (path, Drive zip, or private machine)?
