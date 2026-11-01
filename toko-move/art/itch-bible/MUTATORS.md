# Toko Move — the forever mutators (itch v1, 1 Nov 2026)

A **mutator** is a whole-run rule or skin over the real HSL board. Each run uses one **mutator**, then optionally one **run-modifier** (Sealed Parcel, Lost and Found, Last Service), then the encounter deck, with **meta** underneath (see `NARRATIVE-TWISTS.md`).

Mutators never change the verbs (wait, catch, ride, transfer, walk), never add a currency, and never draw a route line. **Default** (no mutator) is the Day skin.

**Itch v1 core set (4, available from the first run):**
- Night
- Disruption
- Rush Hour
- Snow Day

The other six are **unlocks**.

Face moods: 🔵 info cyan · 🟡 opportunity yellow · 🟠 warning coral · 🟢 notice deep teal. No magenta.

| # | mutator | set | pitch |
|---|---|---|---|
| 1 | **Night** | ⭐ core | The same city at 23:00, with fewer trams and the lines lit like neon. |
| 2 | **Disruption** | ⭐ core | One line is halted, and the network routes around the hole. |
| 3 | **Rush Hour** | ⭐ core | Everything runs often, everything is full, and everyone is in your way. |
| 4 | **Snow Day** | ⭐ core | First snow: slower feet, slower hills, kinder people. |
| 5 | **Timetable Says No** | unlock | The published times are slightly wrong, and only local knowledge tells you how. |
| 6 | **The Retired Number** | unlock | A ghost line runs on real track tonight, for one ride. |
| 7 | **Rival Shift** | unlock | The other courier works your jobs all run, the wrong way round. |
| 8 | **Ferry Weather** | unlock | The ferry joins the board, and the wind decides whether it sails. |
| 9 | **One Ticket** | unlock | No transfers: every job is one ride and your own two feet. |
| 10 | **Quiet Hours** | unlock | No event cards, just the city, the clock and you. |

---

### 1 · Night ⭐
- **Skin:** the Night skin from the art bible: ink `#0f1418`, water `#12293d`, the live `board.js` inks with glow, and metro `#ff6a3d`.
- **Rules:**
  - The clock starts at 23:00.
  - Headways are about 2× longer.
  - Walk speed is unchanged.
  - Labels are halved.
- **Stacks with:** Last Service (canonical), The Retired Number (needs Night), Rival Shift, Quiet Hours.
- **Blocked with:** Rush Hour (opposite hours), Snow Day (v1 has only one weather or time skin).
- **Mood bias:** 🔵 info and 🟢 notice up, 🟡 opportunity down.

### 2 · Disruption ⭐
- **Skin:** Day, with the halted family drawn as grey dashes (`#b8c2c6`) and coral pause stops (art bible).
- **Rules:**
  - One family is halted from about 07:10.
  - It recovers either at a random time or after 2 jobs.
  - Its vehicles hold at their stops.
  - Cards favour walking and transferring.
- **Stacks with:** Snow Day, Rival Shift, Lost and Found, Help Across cards.
- **Blocked with:** Timetable Says No (two kinds of unreliability turn into noise), One Ticket (can become unwinnable).
- **Mood bias:** 🟠 warning up, 🟢 notice up.

### 3 · Rush Hour ⭐
- **Skin:** Day. Vehicles show a fullness pip, building on the live `rush.js` busy/rush/live chips.
- **Rules:**
  - Headways are about 0.6×.
  - A full vehicle can't be boarded until a stop where people get off; this shows as a pip.
  - Jobs are worth more and have tighter rings.
  - The Inspector is more likely.
- **Stacks with:** Rival Shift, Sealed Parcel, Lost and Found.
- **Blocked with:** Night, Quiet Hours (rush is the cards).
- **Mood bias:** 🟠 warning and 🟢 notice up.

### 4 · Snow Day ⭐
- **Skin:** Day with a white wash. Paper goes about 6 % lighter, and water goes grey-blue `#b9c7cf`. Line colours are unchanged.
- **Rules:**
  - Walk speed is ×0.7.
  - Trams slow on hill segments (sanding).
  - The metro is unaffected, so it becomes the safe spine.
  - Help Across cards are more frequent and repay more.
- **Stacks with:** Disruption, Ferry Weather (the weather run), Same Morning payoffs.
- **Blocked with:** Night.
- **Mood bias:** 🟡 opportunity and 🔵 info up (kindness cards).

### 5 · Timetable Says No · *unlock: finish 3 Disruption runs*
- **Skin:** Day. Countdown chips show ranges ("in 2–6 min") instead of numbers.
- **Rules:**
  - Each vehicle's real arrival is drawn from the range.
  - Local-knowledge cards (`knowledge.js`) narrow the range for a family for the rest of the run.
- **Stacks with:** Rush Hour, Sealed Parcel.
- **Blocked with:** Disruption, The Retired Number.
- **Mood bias:** 🟢 notice and 🔵 info up.

### 6 · The Retired Number · *unlock: meet 3B once as an encounter*
- **Skin:** Night, plus one dashed grey ghost family on real track.
- **Rules:**
  - The ghost can be ridden once per run.
  - It is fast and stops unpredictably.
  - Its drop is off the job board and gives a notebook line.
- **Stacks with:** Night (it requires Night), Last Service, Quiet Hours.
- **Blocked with:** Timetable Says No, Rush Hour.
- **Mood bias:** 🟢 notice up.

### 7 · Rival Shift · *unlock: beat the rival in 3 encounters*
- **Skin:** any. Adds a second courier mark, white with an ink ring and never cyan.
- **Rules:**
  - The rival runs your previous run reversed (`rival.js`).
  - A job either of you takes is greyed for the other.
  - Swap cards are possible.
- **Stacks with:** Night, Disruption, Rush Hour, Snow Day.
- **Blocked with:** Quiet Hours (she talks), One Ticket (she'd always win).
- **Mood bias:** 🔵 info and 🟠 warning up.

### 8 · Ferry Weather · *unlock: deliver to Kauppatori 5 times*
- **Skin:** Day. Adds a dashed blue ferry line from Kauppatori across the water. The water fill is a touch darker.
- **Rules:**
  - The ferry is slow, with big shortcuts.
  - Fog can cancel a sailing; this is announced one stop ahead with a 🟢 card.
- **Stacks with:** Snow Day, Sealed Parcel, Same Morning.
- **Blocked with:** Night (no night ferry in v1), Disruption (two cancellation systems).
- **Mood bias:** 🟡 opportunity up.

### 9 · One Ticket · *unlock: deliver 10 jobs with no transfer*
- **Skin:** Day. Hubs lose their white fill, so the board looks like a set of single journeys.
- **Rules:**
  - Each job allows one ride plus walking.
  - Rings are longer to compensate.
  - Walking cards are cheaper.
- **Stacks with:** Snow Day (a hard mode), Sealed Parcel.
- **Blocked with:** Disruption, Rival Shift, Rush Hour.
- **Mood bias:** 🟡 opportunity up (shortcuts on foot).

### 10 · Quiet Hours · *unlock: finish any 10 runs*
- **Skin:** any.
- **Rules:**
  - No event cards at all; only the HUD: clock, ●●○ and the ring.
  - Meta still advances off-screen, and the notebook fills on its own.
  - It's the Mini Metro mode for players who want only the board.
- **Stacks with:** Night, The Retired Number, Snow Day.
- **Blocked with:** Rush Hour, Rival Shift.
- **Mood bias:** none, since no faces appear.

---

## Stacking rules (summary)
- **One mutator per run** in itch v1. Allowing two at once (the "stacks with" pairs) is a post-v1 option, limited to two and never across time or weather skins.
- A mutator decides the skin. A run-modifier only adds items or cards; it never re-skins.
- **Unlock order** teaches the system:
  1. Disruption teaches holes.
  2. Timetable Says No teaches doubt.
  3. Rival Shift teaches competition.
  4. Quiet Hours rewards mastery.
- Itch store copy for the four core mutators: one still each. Night and Disruption already exist (`still-night.png`, `still-disruption.png`); Rush Hour and Snow Day stills come next.
