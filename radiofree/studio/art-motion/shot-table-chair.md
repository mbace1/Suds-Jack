# The Chair Is Taken — Coxon #5, v2, portrait 1080×1920, 112 BPM, 32 s (en) + the station sign-off

Slate 17 Oct 2026, pitch 1. Scheduled **Tue 20 Oct 00:50** (`plan/RFH-NEXT.md`).

**What it is:** a sequel to *Committee of the Whole*, built around **one question**. New York's council asked SpaceXAI
whether it would accept responsibility if its AI caused a death. The film asks that first and answers it last:
- it took a subpoena to get the company to City Hall, and it came by video;
- its answer: "We're responsible for following the law.";
- asked how many staff work on safety: "Everybody is in charge of safety.";
- the station's answer: "Everybody is in charge. / So nobody is."

**v1 → v2** (owner, 18 Oct: "None approved yet, messaging too unclear"). v1 listed seven findings (subpoena, video,
insurance, the law, everybody, no number, the headcount) and never said what they added up to. v2 keeps the three
that answer the question and cuts the insurance binder and the odds dial. v1 is in git history.

**Where the joke points:** at the company's choice of format and witness, never at her. She is shown only as a
placeholder icon on a call tile (no face, no name). The company's side is in the film, in its own word, on its own
screen: SAFETY IS "CORE".

**How it is made:** the first papercut film through the pipeline.
- `papercut/chair-is-taken/`:
  - `copy.json` holds the words in en, fi and ja;
  - `film.json` holds the shots on the beat grid and their cues, some tied to pop words;
  - `score.py` is the Coxon cue sheet.
- The scenes are `scenes/ct_*.js`, built on the clean-light box (`scenes/rfp_clean.js`).
- Build: `pipeline/build.py papercut/chair-is-taken --lang en --engine <engine> --signoff previews/signoff-papercut.mp4`.

**Look (clean light):**
- A cool, dark chamber: daylight in the tall windows, and two brass lamps making warm pools.
- The corridor's warm light through the double doors, backlighting the empty chair.
- The screen's cold light, the newest thing in the room.
- Every card's cut edge catches the key. Two-layer shadows. A thinner box.

**Edit (feed-native):**
- Hard cuts on the beat.
- Every shot opens a touch close and settles.
- The camera kicks on each hit.
- Captions come in word by word, house size, with the pop word in amber.

| shot | picture | the hit | caption (en) | role |
|---|---|---|---|---|
| 1 · the question | The room, the empty witness chair behind its table (SPACEXAI plate, the subpoena on the seat). The lamps strike. Tag: NEW YORK CITY HALL · 16.10.2026 | As the question ends the doors behind the chair open into warm light, and nobody comes through. A shadow on wheels crosses the doorway | New York asked Musk's SpaceXAI: / if your AI causes a death, / will you accept [responsibility]? | setup |
| 2 · the screen | Closer: an AV cart rolls in, bumps the chair, and the subpoena slides off. Its monitor parks where a witness's head would be, strikes and buffers | On "video" it becomes a call tile: a placeholder person, GOV'T AFFAIRS · SPACEXAI, one bar of signal. Then a chip: SAFETY IS "CORE" | It took a subpoena / to get it to City Hall. / It came by [video]. | evidence |
| 3 · the law | On the dais: the gavel taps once. A coffin-shaped card drops onto one pan of a brass balance, a stack of books (LAW) onto the other | On "law" the beam comes down hard on the law's side | Its answer? / "We're responsible for / following the [law]." | evidence |
| 4 · everybody | A yellow hard hat, SAFETY, hops from gloved hand to gloved hand along the dais | On "Everybody" every hand goes up. Nobody keeps it, and it leaves the frame | How many staff work on safety? / "[Everybody] is in charge / of safety." | evidence |
| 5 · the answer | Back at the table: the screen in the chair, still on its call. The room goes quiet | On "nobody" the SAFETY hat drops onto the table beside the nameplate, rocks, and stays. Nobody picks it up | Everybody is in charge. / So [nobody] is. | punchline |

**Sources:** in `copy.json`, line by line, and in `plan/research-chair.md`. Check before air (that file's §0: every
quote came through search excerpts):
- "We're responsible for following the law.": amNY; Fox.
- "everybody is in charge of safety": NY Daily News; La Voce.
- "core": amNY; the council.

**Left out on purpose:**
- the Speaker's Grok image and her "lying" remark;
- any duration comparison (the hearing's length is unreported);
- the insurance answer and the odds of catastrophe (true, but they answer other questions; v1 had both);
- the second witness's claims, which are pending litigation.

**Sound (Coxon):**
- the chamber's air and clock;
- the corps on every cut, with a snare roll arriving at it;
- a video-call chime where a witness would have sat down;
- buffering ticks;
- a civic hit and a Neapolitan chord on "law";
- the fife's wry run on "Everybody";
- the room quiet on the cut back to the table;
- the hat's dull tap on "nobody";
- C minor and the hall's bell.
