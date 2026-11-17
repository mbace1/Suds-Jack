# Toko Move — narrative twists (Bithell-parity concepts)

*Design note, high level, no implementation. 1 Nov 2026. Companion to `ART-BIBLE.md`.*

**The reference, and what we take from it.** *Subsurface Circular* is short, written in punchy lines, and set on one train. The world comes through the choices you make, and the premise keeps turning under you while the verbs stay the same.

Toko Move has a fixed loop: the real HSL board, and the verbs wait, catch, ride, transfer and walk. There's no line drawing.

- **The loop stays the same; what a delivery means keeps changing.**
- Every twist below changes the meaning of a run, not its controls.
- Every encounter is a **Toko face, one line, and two buttons priced in seconds** (see the art bible). The cost is the price; no other currency appears on the card.

## Tags

| tag | what it is | lifetime |
|---|---|---|
| **mutator** | a rule or skin over the whole board (Night and Disruption are the first two) | the whole run, picked before it |
| **run-modifier** | one twist dealt into a run, usually announced at 07:00 | one run |
| **encounter** | an event card drawn from the deck during play | one moment |
| **meta** | state that survives between runs (knowledge, regulars, the arc) | the save |

The face mood follows the art bible:
- cyan for info
- yellow for an opportunity
- coral for a warning
- deep teal for a service notice

## Twist concepts (12)

### 1. The Sealed Parcel · *run-modifier → meta*
**Pitch:** Every run deals one parcel with no address, only a Toko sticker, and you learn where it goes by riding.
- **Board:** One job has no drop pin. Its drop appears only when you are aboard the right family, as a lit stop ahead of you.
- **Meta:** Each sealed drop you complete adds a line to a notebook that never explains itself.
- **Card** (info): *"The label says: you'll know the stop."*
  - **Ride the 6 and watch · +0 s**
  - **Ask at the kiosk · +40 s**

### 2. Same Morning · *meta*
**Pitch:** Every run is the same 07:00 shift, and the city slowly notices.
- **Board:** Nothing changes visually. Regulars and drivers remember your last choice and answer it, so a card's two buttons can change between runs.
- **Card** (opportunity): *"You again. The 4 was early yesterday too."*
  - **Trust her · +0 s**
  - **Check the board · +25 s**

### 3. The Other Courier · *encounter → mutator*
**Pitch:** The rival is running your exact route in reverse, and you only ever meet at transfers.
- **Board:**
  - As an encounter, a rival marker appears at one hub.
  - As a mutator, the rival is on every run, and each job taken by either courier is greyed for the other.
- **Card** (info): *"She's holding the 7 door for you. Or for herself."*
  - **Board it · +10 s**
  - **Let it go · +180 s**

### 4. The Retired Number · *mutator*
**Pitch:** At night a line number that no longer runs shows on one stop, and you may ride it once.
- **Board:** A dashed grey "ghost" family appears on real track, for one ride only. It's fast but unpredictable, and the drop it reaches is never on the job board.
- **Card** (notice): *"The screen says 3B. There is no 3B."*
  - **Wait for it · +120 s**
  - **Take the real 3 · +0 s**

### 5. Timetable Says No · *mutator (Disruption family)*
**Pitch:** The published times are slightly wrong all run, and only local knowledge tells you which.
- **Board:**
  - Countdown chips show a range ("in 2–6 min") instead of a number.
  - Halted segments rotate every few minutes.
  - Local-knowledge cards narrow the range.
- **Card** (warning): *"Line 9 is 'approaching'. It's been approaching for a while."*
  - **Walk to the 2 · +90 s**
  - **Stay put · +240 s**

### 6. The Inspector · *encounter*
**Pitch:** A ticket check, and the only question is how much time you'll give it.
- **Board:** You are held at the next stop. A long check can make you miss a connection, and the board shows that missed vehicle leaving.
- **Card** (notice): *"Tickets, please. Yours is in the parcel, isn't it?"*
  - **Show the app · +15 s**
  - **Open the parcel · +60 s**
- Opening the parcel reveals one line of the run's story.

### 7. Lost and Found · *run-modifier → meta*
**Pitch:** Things people leave on trams become parcels with no deadline, and returning them opens doors later.
- **Board:** Found items take a bag slot without a ring. Returning one costs a detour; keeping one changes a later card.
- **Card** (opportunity): *"A glove on the seat. Warm. Someone just got off."*
  - **Chase them · +45 s**
  - **Hand it in later · +0 s**

### 8. Help Across · *encounter*
This one is from the owner's "help the granny across the street" note.
**Pitch:** A small kindness costs real seconds, and the city repays some of them.
- **Board:** You lose walking time now. A regular may later hold a door, which shows as a vehicle waiting for you.
- **Card** (info): *"Mrs. Lindqvist can't see the tram number."*
  - **Walk her over · +30 s**
  - **Point and go · +0 s**

### 9. Snow Day · *mutator*
**Pitch:** First snow: walking is slower, trams slow on the hills, and everyone is kinder.
- **Board:**
  - Walk speed ×0.7.
  - The day skin gets a white wash with grey water.
  - Help encounters are more frequent and repay more often.
- **Card** (notice): *"Sanding crew on Mannerheimintie."*
  - **Wait behind them · +60 s**
  - **Cut through Töölö · +35 s**

### 10. The Last Service · *run-modifier*
**Pitch:** The run starts at 23:30, and when the network closes, it closes.
- **Board:**
  - The clock counts toward the end of service.
  - Lines go dark one by one, each greying out on the map as it closes.
  - The metro closes last.
- **Card** (warning): *"Last 4 east leaves Senaatintori."*
  - **Catch it · +45 s**
  - **Walk · +540 s**

### 11. Ferry Weather · *encounter (later a mutator)*
**Pitch:** The ferry is the one vehicle that isn't on rails, and it waits for no-one but the wind.
- **Board:** A ferry line appears from the Market Square. It is slow and gives big shortcuts, and fog can cancel it.
- **Card** (opportunity): *"Fog lifting. The ferry might go."*
  - **Bet on it · +0 s**
  - **Take the bridge · +200 s**

### 12. Dispatch Changes Its Mind · *meta (the spine)*
**Pitch:** Dispatch is a Toko face, and over many runs what it asks you to carry changes: parcels, then letters, then one letter, rerouted.
- **Board:** The same jobs and the same loop. Only the card copy changes, and later some drops show a name instead of a stop.
- **Card** (info, late in the arc): *"Same address as last week. Different sender."*
  - **Deliver it · +0 s**
  - **Read the return address · +20 s**

## Story shifts — premise arcs

Each arc is 5–8 cards spread across runs, and each one changes what "a delivery" means:
1. **Parcels → letters → one letter.** Dispatch's requests narrow until you realise the whole route has been one correspondence between two regulars. It ends with you delivering the reply by hand: a short walk with no ring.
2. **The city remembers.** Built on Same Morning. Choices you made weeks ago come back as favours or grudges, and the premise turns from "I deliver to the city" into "the city has been delivering to me".
3. **The other courier was you.** The rival's route, replayed, is your first run reversed. Nothing supernatural: it's a trainee running your old notes. The last card hands them your notebook.
4. **The network as a character.** Disruptions, the retired number and the last service add up to one quiet story: the trams in a single night.

## Soft doors toward East of Piritori

Piritori is a separate, later, adult mode with its own design authority and its own gate (ROADMAP, 2026-09-27). **Toko Move contains no adult content, innuendo or Piritori art.** A door here is only an address, a name or a closed gate:
- **The address past the last stop.** One sealed parcel is addressed *"East of Piritori"*. The job board says *"No line goes there."*, and the parcel stays in the notebook, undeliverable, forever in Toko Move.
- **A ticket stub.** After a Last Service run, a found item reads *"Valid east of the last stop. Ask at the counter."* The counter is a later menu entry that opens only through Piritori's own gate.
- **A map edge.** At the far east of the board, past the metro terminus, there is one unlabelled grey stop with no line. Nothing happens there in Toko Move.
- **What a door is not.** It never uses magenta faces, mature text, suggestive art or a teaser image. A door names a place; it doesn't show it.

## How twists compose with the forever mutators

- **Per run:**
  - One **mutator**, picked before the run (Day/no mutator, Night, Disruption, Snow Day, Timetable Says No, The Retired Number, later Ferry Weather).
  - Plus at most one **run-modifier**, dealt at 07:00 (Sealed Parcel, Lost and Found, Last Service).
  - Plus the **encounter** deck.
  - **Meta** (Same Morning, Dispatch, the arcs) always runs underneath.
- **Mutators change the board, encounters change the moment, and meta changes the meaning.** A twist never changes the controls or adds a currency. Everything is priced in seconds.
- **Valid stacks:**
  - Night + Last Service is the canonical "last train" run.
  - Disruption + Help Across is the kindness run.
  - Snow Day + Ferry Weather is the weather run.
- **Blocked stacks:**
  - Timetable Says No + The Retired Number: two kinds of not-knowing at once turns the run into noise.
  - Last Service + Same Morning: one is set at 07:00 and one at 23:30.
- **Encounter weights follow the mutator.** Night favours info and notice faces, Disruption favours warning, and Snow Day favours opportunity and kindness cards.
- **Cadence:**
  - At most one story card per job.
  - Meta arcs advance at most one card per run.
  - A run never ends on an unanswered card.
