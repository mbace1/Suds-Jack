# Toko Move — twist cards (v1, 1 Nov 2026)

These are the six strongest twists from `NARRATIVE-TWISTS.md`, fleshed out into playable cards.

**Card grammar** (from `ART-BIBLE.md`):
- A **Toko face** in a mood colour, **one line**, and **two buttons priced in seconds**.
- There is no heading and no second sentence.
- `+0 s` is free; the price is the only cost.
- A consequence note is designer-facing and never shown.

**Face moods** (never magenta):
- 🔵 **info**: cyan `#33b2d2`
- 🟡 **opportunity**: yellow `#ffcc00`
- 🟠 **warning**: coral `#e2683c`
- 🟢 **notice**: deep teal `#176b73`

The loop is locked: the real HSL board, and the verbs wait, catch, ride, transfer and walk.

---

## 1 · The Sealed Parcel
**Tags:** run-modifier → meta · **Mood:** 🔵 info
**Fires:** dealt at 07:00, at most one per run, and not on a player's first three runs.
**Board:**
- One extra bag item with a Toko sticker and **no drop pin and no ring**.
- Its drop lights up **only while you ride the right family**, as a white-ringed stop ahead.
- If the run ends undelivered, the parcel carries over (max 1).

**Setup:** *"No address. Just a sticker. Dispatch says: you'll know the stop."*

| # | mood | line | button A | button B | consequence |
|---|---|---|---|---|---|
| 1 | 🔵 | *"The label says: you'll know the stop."* | **Ride the 6 and watch · +0 s** | **Ask at the kiosk · +40 s** | **B** names the line family for the drop, so you no longer have to find it by riding. |
| 2 | 🟡 | *"A stop just lit up ahead. Not yours. This one."* | **Get off here · +0 s** | **Finish your job first · +0 s** | **A** delivers the sealed parcel and costs the current job's ring time. **B** may lose the light, since it moves each run. |
| 3 | 🟢 | *"The door opens before you knock. They were expecting you."* | **Hand it over · +5 s** | **Ask who sent it · +30 s** | **B** writes one notebook line, the "sender" fragment that feeds Dispatch. |

**Meta:** Every sealed delivery adds one notebook line, and together they write the Dispatch arc. The **soft door** is one rare sealed parcel addressed *"East of Piritori"*. The job board answers *"No line goes there."* It can never be delivered in Toko Move and sits in the notebook, unexplained.

---

## 2 · Same Morning
**Tags:** meta · **Mood:** 🟡 opportunity / 🔵 info
**Fires:** always on underneath. Its cards appear only from run 3 onwards, at most one per run.
**Board:**
- No visual change. Regulars (`regulars.js`) remember **your last choice** on a card and answer it.
- A remembered kindness can show up as a **vehicle held for you**: the pill waits two seconds at the stop.

**Setup:** *"07:00 again. The same tram bell. Someone waves."*

| # | mood | line | button A | button B | consequence |
|---|---|---|---|---|---|
| 1 | 🟡 | *"You again. The 4 was early yesterday too."* | **Trust her · +0 s** | **Check the board · +25 s** | **A** is right whenever she was right last run. Trust tracks per regular. |
| 2 | 🔵 | *"He's saved you the seat by the door. Again."* | **Sit · +0 s** | **Stand by the driver · +10 s** | **A** speeds up your next transfer. **B** unlocks a driver line later. |
| 3 | 🟡 | *"She's holding the door. 'You helped my mother.'"* | **Run for it · +8 s** | **Wave her on · +0 s** | Only fires if Help Across was chosen in an earlier run. **A** catches a vehicle you'd otherwise miss. |

**Meta:** This is the **memory layer** that the other twists write into. Arc: *"The city remembers"*: by run ~10 the cards flip from "you deliver to the city" to "the city has been delivering to you".

---

## 3 · The Other Courier
**Tags:** encounter → mutator (*Rival Shift*) · **Mood:** 🔵 info / 🟠 warning
**Fires:**
- As an **encounter**, at a 3+ family hub, at most once per run.
- As the **mutator**, all run (see `MUTATORS.md`). The rival already exists in code (`rival.js`).

**Board:**
- A **second courier mark** is drawn in white with an ink ring. It is **never cyan**; cyan is yours.
- Her route is **your previous run reversed**.
- A job either of you takes is greyed for the other.

**Setup:** *"Another bag. Another courier. Same jobs, wrong way round."*

| # | mood | line | button A | button B | consequence |
|---|---|---|---|---|---|
| 1 | 🔵 | *"She's holding the 7 door. For you, or for herself?"* | **Board it · +10 s** | **Let it go · +180 s** | **A** puts you on her vehicle, and she takes your next job unless you get off first. |
| 2 | 🟠 | *"She took your drop at Kamppi. Smiled about it."* | **Take hers at Hakaniemi · +60 s** | **Let it go · +0 s** | **A** swaps targets, and her ring becomes yours. |
| 3 | 🟢 | *"Her notebook falls open. It's your handwriting."* | **Give it back · +15 s** | **Read a page · +30 s** | Arc: *"the other courier was you"*. She's a trainee running your old notes. **B** shows your own run 1 route as a faint dashed replay. |

**Meta:** This feeds Same Morning. If she ever gets your notebook, she becomes a **regular** who saves you seats.

---

## 4 · The Retired Number
**Tags:** mutator (Night family) · **Mood:** 🟢 notice
**Fires:**
- Night runs only.
- The stop screen offers it once per run, between 23:00 and 00:30.

**Board:**
- One **dashed grey ghost family** with a retired number (e.g. *3B*) runs on **real track**, for one ride.
- It is fast but stops wherever it likes, and its drop is never on the job board.
- It does not exist in the timetable layer and can't be planned around.

**Setup:** *"The screen says 3B. There is no 3B."*

| # | mood | line | button A | button B | consequence |
|---|---|---|---|---|---|
| 1 | 🟢 | *"The screen says 3B. There is no 3B."* | **Wait for it · +120 s** | **Take the real 3 · +0 s** | **A** spawns the ghost pill on a random family's track. |
| 2 | 🔵 | *"The driver nods like he knows you. He doesn't stop at yours."* | **Ride to the end · +0 s** | **Get off and walk · +90 s** | **A** ends at a stop not on the run. You get a notebook line plus a walk back. |
| 3 | 🟡 | *"A tram ticket from 1987 on the seat. Still warm."* | **Keep it · +0 s** | **Leave it · +0 s** | **A** adds a Lost and Found item, and the ticket answers a later Inspector card. |

**Meta:** This writes the *"network as a character"* arc. The 1987 ticket is the bridge to The Inspector (card 5.3).

---

## 5 · The Inspector
**Tags:** encounter · **Mood:** 🟢 notice
**Fires:**
- On boarding, at most once per run.
- More likely in the Rush Hour mutator, less likely on Night.

**Board:**
- You are **held at the next stop** for the price.
- The vehicle you would have transferred to is shown leaving, so you can see the cost.
- Nothing else changes.

**Setup:** *"Blue jacket. Card reader. Smiling the way they all do."*

| # | mood | line | button A | button B | consequence |
|---|---|---|---|---|---|
| 1 | 🟢 | *"Tickets, please. Yours is in the parcel, isn't it?"* | **Show the app · +15 s** | **Open the parcel · +60 s** | **B** reveals one story line of the run (from Sealed Parcel or Dispatch). |
| 2 | 🟠 | *"Your app shows yesterday's date."* | **Explain · +45 s** | **Buy a new one · +20 s** | It's a Same Morning wink. **A** gives a regular line next run. |
| 3 | 🔵 | *"That ticket is from 1987. Where did you get it?"* | **The 3B · +30 s** | **Lost and found · +0 s** | Only fires with the Retired Number ticket. **A** makes the inspector a regular who believes you. |

**Meta:** None on its own. It is the **reveal valve**: the cheapest place to show the player one line of the hidden story.

---

## 6 · Dispatch Changes Its Mind
**Tags:** meta (the spine) · **Mood:** 🔵 info (Dispatch is always cyan)
**Fires:** one card per run at the first job, in arc order, from run 2. Act changes need sealed-parcel and notebook progress.
**Board:**
- The same jobs and loop.
- Act II shows **names instead of stops** on some drop pins, though the stop is still the stop.
- Act III adds one **hand-delivery**: a short walk with no ring.

**Setup:** *"Morning. Dispatch here. Three today."*

| act | mood | line | button A | button B | consequence |
|---|---|---|---|---|---|
| I · parcels | 🔵 | *"Three parcels. Don't shake the blue one."* | **Noted · +0 s** | **What's in it? · +20 s** | **B** gets *"Doesn't matter."* plus one notebook line. |
| II · letters | 🔵 | *"Letters today. Same sender as Tuesday."* | **Deliver them · +0 s** | **Read the return address · +20 s** | **B** shows a regular's name. The letters run between two regulars. |
| III · one letter | 🟡 | *"Just one. By hand. She asked for you."* | **Take it · +0 s** | **Send the other courier · +0 s** | **A** ends the arc with the walk. **B** passes the letter, and the arc continues with her (Other Courier). |

**Meta:** This is the spine; the other five twists write into it. After Act III, Dispatch's card at the start of each run says *"Three today. And one for the east, if you ever find it."* That is the second **soft door** to East of Piritori, and it is still only a phrase. Nothing adult, no magenta and no art appear in Toko Move.

---

## Rules across all six
- At most **one story card per job**, and **one arc step per run**. A run never ends on an unanswered card.
- **Prices:**
  - Free buttons (`+0 s`) must still cost something off-card, such as a missed ring, a lost light or a rival's gain.
  - Every card has one cheap option and one honest one.
- Faces follow the twist's mood. **Dispatch is always cyan**, and **warning (coral) is only for time actually being lost**.
- Sample sheet: `cards-sheet.png` shows six of these as rendered cards.
