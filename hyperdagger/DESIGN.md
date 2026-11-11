# Hyper Dagger — design authority (producer)

**Status:** living producer design doc · promoted 11 Nov 2026 into `hyperdagger/DESIGN.md`  
**Producer:** D-sign  
**Repo path:** `hyperdagger/DESIGN.md`  
**Live:** https://mbace1.github.io/Suds-Jack/hyperdagger/  
**Workflow:** [`docs/ACTIVEPRODUCER.md`](../docs/ACTIVEPRODUCER.md)

### Relationship to existing canon

**Defers to:** `hyperdagger/PLATFORM.md` (modes as experiments), `hyperdagger/SEASONS.md` + `js/seasons.js` (VOID / EMBER / INCA / HAUL), `VERSIONS.md`, `press/PRESS.md`, `scripts/daily-board.gs`.

This file adds **Decision 10 Nov 2026** product framing: **Bone Dust** as Season 0 quality bar and possible sequel packaging. It does **not** treat Bone Dust as code to port or merge into the web tree.

---

## 1. Vision

A first-person arena survival game in the Devil Daggers / HYPERDEMON lineage, with destructible matter and season-specific arenas. Modes (`PLATFORM.md`) multiply with seasons (`SEASONS.md`).

**Product framing (**Decision 10 Nov 2026**):** Hyper Dagger's web seasons should reach **Bone Dust's** quality and content bar. Bone Dust is already live on Steam and counts as **Season 0**. HD seasons are **candidate Bone Dust sequel material** — packaging open (see §3).

---

## 2. Pillars

1. **Time is the score** (PRESS / PLATFORM).
2. **Matter is the fantasy** — voxels, gibs, bone-yard (SHIPPED direction in VERSIONS).
3. **Registry over branches** — add modes/seasons as data, not `if (mode === …)` sprawl (`PLATFORM.md`).
4. **Each season aims at leaderboards and/or a minigame** (**Decision 10 Nov 2026**).
5. **Multiple boards per season** — modifiers, dailies, etc. (**Decision 10 Nov 2026**; `daily-board.gs` already keys `date + mode + season`).
6. **Season 0 bar = Bone Dust** — reference product, not a merge source.

---

## 3. Structure

### 3.1 Season 0 = Bone Dust (live reference)

| | |
|---|---|
| **Name** | **Bone Dust** (also called Bonedust in studio shorthand) |
| **Steam** | https://store.steampowered.com/app/2247640/Bone_Dust/ |
| **Role** | Toko Midori's **live** F2P arena / bullet-hell FPS (Platonic Partnership / Toko Midori Games; Very Positive; out of EA 20 Apr 2023) |
| **GitHub** | `mbace1/BD` — **README stub only** (Unity project not in that repo) |
| **Unity source** | Shared Drive zip `Bonedust-main.zip` (source handover; **reference**, not to port into HD) |
| **HD relation** | **Season 0** = the quality & content bar HD seasons must meet |

**Not:** a codebase to merge into `hyperdagger/`. Agents must not "port Bone Dust into Hyper Dagger."

### 3.2 Hyper Dagger seasons 1–3 (web) — canon ids

From `js/seasons.js` / `SEASONS.md` (SHIPPED declarations; depth varies):

| Id | Name | Role |
|---|---|---|
| `void` | SEASON 0 — VOID | Control / hidden gate season in HD (not Bone Dust) |
| `ember` | SEASON 1 — EMBER | Dark shale / DD-leaning season |
| `inca` | SEASON 2 — INCA | Aquamarine tide / goo |
| `haul` | SEASON 3 — HAUL | Cargo / road |

**Naming note:** HD's internal "SEASON 0 — VOID" is an engine control. **Product Season 0** in this draft means **Bone Dust**. Do not confuse the two in briefs.

### 3.3 Release packaging — OPEN (**Decision 10 Nov 2026**)

Each HD season is a **candidate Bone Dust sequel** release that must meet the Bone Dust ship bar. **How packages ship is not decided:**

| Option | Meaning |
|---|---|
| **(A)** | Each season ships as its own **Bone Dust 2, 3, 4…** |
| **(B)** | One **Bone Dust 2** contains **all** HD seasons |

Record only; do not pick in agent briefs until Mikael chooses.

### 3.4 Leaderboards / minigames (**Decision 10 Nov 2026**)

- Every season aims for **leaderboards** and/or a **minigame**.
- A season may have **multiple leaderboards** (modifiers, dailies, modes…).
- Infra today: `hyperdagger/scripts/daily-board.gs` (Sheet columns `date, mode, season, t, name, at`).

---

## 4. Season Zero ship bar (from Bone Dust live product)

Derived from the **Steam page**, press (Toko Midori / Platonic), PCGW monetization notes, and studio content docs — **not** from a completed Unity tree inspect (GitHub stub; Drive zip ~739 MB exceeded DownloadFile; gdown may still be in progress). Treat as the bar HD seasons must clear before "Bone Dust sequel" language.

| # | Bar item | Bone Dust (live) | Hyper Dagger today |
|---|---|---|---|
| 1 | **Readable fantasy + store page** | Nightmare circus; magician; cards as weapons; F2P Steam listing | Arcade PRESS exists; not a Steam sequel page |
| 2 | **Closed arena + escalating swarm** | Single large arena, bullet-hell waves | Disc arenas + director; season arenas differ |
| 3 | **Signature weapon fantasy** | Playing-card bursts | Season weapons (dagger/needler/etc.); identity per season |
| 4 | **Epic boss battle** | Explicit Steam key feature | Finales exist; not always a named "boss product beat" |
| 5 | **Global leaderboard (brag-worthy)** | Global board; pay2brag / paid leaderboard launch with v1.0 | Daily top-10 via Apps Script; not Steam-global / pay2brag |
| 6 | **Practice / low-friction on-ramp** | Practice mode (PCGW: no token consume) | MOVE bench / modes; not a named practice product |
| 7 | **Full game shell** | Menus, options, onboarding, audio, English UI polished for Steam | Options + PWA; onboarding/audio/polish uneven vs Steam ship |
| 8 | **Season / content roadmap language** | Pre-season → v1.0 leaderboards; more arenas/bosses planned in press | Three built seasons + VOID; packaging A/B open |
| 9 | **Platform trust** | Steam reviews Very Positive; installable Windows build | Browser/PWA only |

---

## 5. Gaps vs Bone Dust ship bar (top issues)

1. **No Steam-class product shell / sequel packaging** — HD is a lab URL; Bone Dust is a store game.  
2. **Leaderboards** — daily Sheet board ≠ Bone Dust global / pay2brag social loop.  
3. **Boss as a marketed set-piece** — finales ≠ circus boss product moment.  
4. **Onboarding + practice framing** — skill floor / practice mode less explicit.  
5. **Audio / theme cohesion per season** at Bone Dust "nightmare circus" clarity.  
6. *(infra)* Unity source not yet inventoried in this draft for weapons/enemy/wave/UI lists — enrich when zip is available locally.

---

## 6. Gaps vs current HD build (internal)

| Design | Build | Gap |
|---|---|---|
| Per-season multi-boards (modifiers/dailies) | `daily-board.gs` supports mode+season; modifier boards not fully productized | Boards UX |
| Season = leaderboard **or** minigame aim | Seasons are art+rules; minigame-per-season not named | Design |
| Packaging A vs B | Not decided | Owner pick |
| Bone Dust bar | See §5 | Ship quality |

---

## 7. Decision log

### Decision 10 Nov 2026 — Seasons, boards, Season 0 = Bone Dust, sequel packaging open
- **Mikael (paraphrase):** Hyper Dagger is a game with seasons (the three already in docs); each season aims for leaderboards or a minigame; each can have multiple leaderboards (modifiers, dailies, etc.). Bone Dust is the quality/content reference and counts as Season 0 (already live on Steam) — reference only, not code to port. Seasons may ship as Bone Dust 2, 3, 4… **Alternatively** one Bone Dust 2 could contain all seasons. **Not decided** between (A) per-season sequels and (B) one multi-season Bone Dust 2.
- **Locks:** Season 0 bar = Bone Dust; seasons aim at boards/minigames; multi-boards allowed.
- **Open:** packaging A vs B (`may ship as` / alternative — not locked).
- **Extends:** `SEASONS.md` / `PLATFORM.md` / `daily-board.gs`.

---

### Decision 11 Nov 2026 — Season extras
- **Mikael:** Leaderboards are a given every season. Extras can be all of: twists on the core run, separate small games in the season's world, social/event hooks, story/boss beats — "likely as challenges or modifiers".
- **Locks:** every season = leaderboards + extras delivered mainly as challenges/modifiers (each may get its own board).
- **Open (Mikael: still undecided):** packaging A vs B.

### Decision 11 Nov 2026 — How season modes are picked
- **Mikael:** They should be options in the menu, a single option at a time, maybe unlocking.
- **Locks:** season challenges/modifiers = menu-selectable modes, one active per run; unlock progression optional (TBD).

---

## 8. Open questions

1. Packaging **(A)** vs **(B)** for Bone Dust sequel releases?
2. (production, low priority) Does HD keep the public "Hyper Dagger" name on the arcade if sequels are branded Bone Dust N?
