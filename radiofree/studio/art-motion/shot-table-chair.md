# The Chair Is Taken — Coxon #5, v1, portrait 1080×1920, 112 BPM, ~41 s (en) + the station sign-off

Slate 17 Oct 2026, pitch 1. Scheduled **Tue 20 Oct 00:50** (`plan/RFH-NEXT.md`).

**What it is:** a sequel to *Committee of the Whole*. New York's council subpoenaed SpaceXAI and threatened it with
a judge. On 16 Oct the company testified, by video, through a government-affairs manager. It gave no number for
the odds of catastrophe, did not know its catastrophe-insurance details, and left owing the council a count of its
safety staff.

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

| shot | picture | the hit | caption (en) |
|---|---|---|---|
| 1 · chamber | The room, the empty witness chair behind its table (SPACEXAI plate, Committee's subpoena on the seat). The lamps strike. Tag: NEW YORK CITY HALL · 16.10.2026 | On "it came" the doors behind the chair open into warm light, and nobody comes through. A shadow on wheels crosses the doorway | SpaceXAI was [subpoenaed]. / On 16 October, it came. |
| 2 · the screen | Closer: an AV cart rolls in, bumps the chair, and the old subpoena slides off. Its monitor parks where a witness's head would be, strikes and buffers | On "video" it becomes a call tile: a placeholder person, GOV'T AFFAIRS · SPACEXAI, one bar of signal. Then a chip: SAFETY IS "CORE" | By [video]. It sent / a government-affairs manager. |
| 3 · insurance | Down at the tabletop: a fat binder, CATASTROPHE INSURANCE, slides in and stops dead against the stand. Pages jump | On "specifics" the call buffers again | Its catastrophe insurance? / The manager was "not aware / of the [specifics]". |
| 4 · the law | On the dais: the gavel taps once. A coffin-shaped card drops onto one pan of a brass balance, a stack of books (LAW) onto the other | On "law" the beam comes down hard on the law's side | If its AI causes a death? / "We're responsible for / following the [law]." |
| 5 · everybody | A yellow hard hat, SAFETY, hops from gloved hand to gloved hand along the dais | On "Everybody" every hand goes up. Nobody keeps it, and it leaves the frame | How many work on safety? / "[Everybody] is in charge / of safety." |
| 6 · no number | Coxon #2's dial, relabelled ODDS OF CATASTROPHE · THE COMPANY'S NUMBER, with no needle | On "no number" a stamp: NO NUMBER. The room goes quiet as the camera tilts down to the chair. On "headcount" the hard hat drops onto the monitor and rocks | Odds of catastrophe: / [no number] given. — then — Everybody is in charge of safety. / The [headcount] will follow. |

**Sources:** in `copy.json`, line by line, and in `plan/research-chair.md`. Check before air (that file's §0: every
quote came through search excerpts):
- "not aware of the specifics": Fox live; amNY.
- "We're responsible for following the law.": amNY; Fox.
- "everybody is in charge of safety": NY Daily News; La Voce.
- "core": amNY; the council.

**Left out on purpose:**
- the Speaker's Grok image and her "lying" remark;
- any duration comparison (the hearing's length is unreported);
- "refused" (no outlet says the odds question was put to it directly);
- the second witness's claims, which are pending litigation.

**Sound (Coxon):**
- the chamber's air and clock;
- the corps on every cut, with a snare roll arriving at it;
- a video-call chime where a witness would have sat down;
- buffering ticks;
- the deadpan button on "specifics";
- a civic hit and a Neapolitan chord on "law";
- the fife's wry run on "Everybody";
- the room quiet for the last line;
- the hat's dull tap;
- C minor and the hall's bell.
