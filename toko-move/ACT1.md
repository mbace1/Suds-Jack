# Toko Move — Act 1: Helsinki (design)

## Owner direction, 2026-11-02

> *"The trams in the bible look a bit like the latest Helsinki trams, but we
> have older and even older models with distinct visual look. That and key
> stations should have more visual indicators. And design random events and
> funny situations that can happen. Card choices should also have some risk
> factors as well as added time, risks can add positive and negative
> multipliers. Snow will impact walking routes, but also congest trams. Maybe
> you slip and get helped, maybe rain can ruin the package. These should be
> fun and funny. Things like selling the package to someone else can gain big
> bucks, but also hint at what the packages might contain. This subtle humor
> and commentary can create character but also nice game moments. Roguelike
> can be also tested on other factors, keeping things very Helsinki specific
> until act 2 … we can focus on making act1 the playable for now. Making the
> visual layers have smooth animations will add to the appeal. UI animations
> and effects will be a big polish issue for shipping the Helsinki act."*

## Signed off, 2026-11-03

- **The act.** Act 1 is just Helsinki, as a complete experience. It is the four
  runs, each its own roguelike run: *"You start off with easy and medium that
  are more fun, hard is more risky and difficult and night is a bit more scary
  and very risky."*
- **Risk.** A button shows its stakes, with the odds in words.
- **Money.** Euros replace points.
- **Trams.** The model is LOOK ONLY: *"all of them behave the same, just look
  different. Museum quality trams are super rare, but there are many tiers in
  between."*

## 1. The four runs and their tone

| run | tone | weather (drawn per shift) | the deck leans to |
|---|---|---|---|
| EASY · First shift | fun | clear | favours, small funny scenes, *usually* odds, small stakes |
| MEDIUM · A morning | fun | clear, rain or first snow | the first sell offers, everyday Helsinki, a few *maybe*s |
| HARD · Rush hour, one line down | risky, difficult | snow or rain | the rush, *maybe* and *long shot*, ×1.5 and ×0.5 stakes |
| NIGHT · Last service | scary, very risky | fog, sleet or clear | the night deck: odd passengers, the tram with no number, ×2 and ×0 |

Clearing NIGHT completes Act 1. Act 2 leaves Helsinki and is not built.

## 2. Money

A job pays a **fee in euros**:

- **The fee:** €8 plus about €1.10 for each minute of the best route, times
  the parcel's size pay (small ×0.82, medium ×1, large ×1.45).
- **Multipliers on it:**
  - An on-time streak adds a quarter per job in a row, up to ×2.
  - Late halves it.
  - Every risk that lands on the job multiplies it again.

The job strip shows the job's running multiplier. The run's score is **€
banked**, and par for three stars is in euros.

## 3. Risk

A risky choice is still one button, with a price in time. Under the label it
shows its **stakes**, with the odds as a word:

> **Run for it** · +0:00
> *maybe* ×1.3 · or +3:00

| word | chance |
|---|---|
| usually | 75% |
| maybe | 50% |
| long shot | 25% |

The words are fixed, so a player learns them. The roll comes from the run's
own rng, so a seed replays. What happened is a **reveal**: a short stamp with
the line (often the funny one) and its effect chips.

An outcome is made of effects:

- **time:** +m:ss
- **pay:** ×N on the current job's fee
- **cash:** ±€ now
- **sell:** the job is gone and its contents are named
- **reveal contents:** the joke, without a sale

## 4. Weather

| weather | walks | trams | risks it adds |
|---|---|---|---|
| clear | — | — | — |
| rain | ×1.1 | — | paper parcels on a walk: *maybe* dry · or wet ×0.7 |
| snow | ×1.4 | waits ×1.3, full more often | every walk: *usually* fine · or slip +1:30 (and you get helped up) |
| fog / sleet (NIGHT) | ×1.2 | — | the night deck |

Deadlines are set from the run's weather, so snow is slower but not unfair.
The scene shows the weather: snow falling, rain on the glass, fog over the
stop.

## 5. The deck

There are about thirty-five cards in `js/cards.js`, written for Helsinki and
for the journey. Each card has:

- **where:** stop, aboard or walking
- **tone:** fun, risky or scary
- **weather:** if it needs one
- **cargo:** if it needs one

A run deals one card per job from its own tones and weather.

**Selling a parcel** is a card family. A buyer offers big money: a student
collecting for vappu, a dentist in a hurry, the rival courier, and at night a
woman in a long coat who knows your name. Selling pays now. But the job is
gone and still has to be made up, so it trades the clock and the streak for
cash.

The buyer always **names what was inside**. Every job has hidden contents,
drawn from its parcel kind, and they surface three ways:

- A buyer, rain or *"open it a crack"* reveals them.
- Otherwise the delivery stamp does: *"Signed for: a whole salmon, looking at
  you."*

## 6. Trams (look only)

Each tram ride draws a model by rarity:

| model | share |
|---|---|
| Artic | 40% |
| Nr II+ | 22% |
| Variotram | 14% |
| Nr II | 12% |
| Nr I | 10% |
| museum tram | 2% |

They all ride exactly the same. The model shows:

- at the stop, where the tram drives in and out;
- on the in-car display;
- on a rare one, as a stamp: **MUSEUM TRAM**.

At night, *the tram with no number* is the museum tram.

## 7. Key stations

Ten key stations get a **landmark** behind the stop, in the same flat iso.
Some of them move:

- **Rautatientori:** the station tower
- **Senaatintori:** the cathedral
- **Kauppatori:** the SkyWheel, turning, and the market tents
- **Kamppi:** the Chapel of Silence
- **Kallio:** the church tower
- **Hakaniemi:** the market hall
- **Ooppera:** the opera house
- **Lasipalatsi:** the Amos Rex domes
- **Olympiaterminaali:** a ferry, bobbing
- **Hietalahti:** the shipyard cranes

Every stop gets its **plate** (the name and its line chips). The board marks
the key stations too.

## 8. Motion and UI polish

- **At the stop:** trams drive in and out.
- **The HUD:** the € counter rolls, the job dot fills, and the deadline ring
  drains.
- **Cards:** risk reveals stamp in, and cards stamp in and out.
- **The weather** moves.
- **Scenes:** push-ins on arrival.

`prefers-reduced-motion` keeps every animation still and every outcome on
screen.

## 9. Gates

**`test/journey.mjs`** holds:

- the fee arithmetic;
- the risk odds, inside their bands over many seeds;
- the weather's effects;
- a sale ending the job;
- each run dealing only its tones;
- the contents always being named on delivery;
- the bands re-measured.

**`test/play.cjs`** holds:

- a risky button showing its stakes, and its reveal;
- the € HUD;
- the weather layer;
- the tram model at the stop, and the display naming it;
- a landmark at a key station.

## 10. Story arcs (v3.4)

The plan's step 4 (owner, 2026-11-03: *"keep going with upgrading through a
plan"*), adapted from the itch bible's twist cards (`art/itch-bible/CARDS.md`)
to the journey. They give a card a **memory**: something you chose comes back.
They use the same card grammar (a face, one line, two priced buttons), and
the same rule: at most one story card per job.

**In a run, the city remembers this morning.** Some choices set a flag, and a
later card in the same run answers it, taking the next job's card slot:

| you chose | later in the run |
|---|---|
| walk the granny across Mannerheimintie | she is on your tram and has saved you the seat by the door |
| hold the top of the spruce | the spruce man, without the spruce, insists on carrying your parcel |
| let the seagull pose for a photo | the same seagull, with a friend |

**Across runs, the city remembers you.** Two arcs are kept on the device
(`tokoMoveMemory`), passed into the run so a seed still replays. A run deals
**at most one arc step**, never on a player's first run:

- **Dispatch** (CARDS.md §6, the spine): one step a run, at the first job.
  - **I:** *"Don't shake the blue one."* Asking what's in it gets *"Doesn't matter."*
  - **II:** *"Letters today. Same sender as Tuesday."* The return address
    names her: Aino, in Kallio.
  - **III:** *"Just one. By hand. She asked for you."* Take it and she has coffee
    waiting (×1.5); or send the other courier.
  - **After:** *"And one for the east, if you ever find it."* No line goes
    there. (The soft door to East of Piritori: a phrase, nothing more.)
- **The 1987 ticket** (CARDS.md §4–5): on NIGHT, a ticket from 1987 on the
  seat, still warm. Keep it, and a later day's ticket inspector asks where you
  got it. *The tram with no number* is a *maybe*: he punches it anyway and
  remembers you (×1.3), or he keeps it for the museum.

**Gates:**
- `test/journey.mjs`: a callback is dealt only after its choice; an arc step
  only with its memory and never on a first run; at most one a run; and a
  seed with a memory replays exactly.
- `test/play.cjs`: Dispatch's first step on a second run, and its memory kept
  after the run ends.
