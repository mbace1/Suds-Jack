# Planning a film

Owner, 2026-10-15: "Good plans mean better insights and better art." This is what the first six
films taught, turned into the questions a pitch has to answer before anything is drawn.

## What the owner's notes taught

| note | film | the rule it became |
|---|---|---|
| "the messaging isn't clear enough" | On Hold | **One argument, start to finish.** If the pitch can't say the insight in one sentence, it isn't ready. |
| "it needs to be clear that US Congress, etc." | A Handful of People | **Say where and who.** The audience is in Helsinki and everywhere: name the country, the body, the city, in the caption *and* in a tag. |
| "I wasn't sure it looked like" New York | Committee of the Whole | **Make the place recognisable.** Draw the real silhouette and the skyline behind it; a generic building is no building. |
| "way too long … less subtle. Maybe a joke" | Happy Little Bot | **End on a joke in our own voice, over the image that answers it** ("Batteries included. / Parents not included." as the grown-up sits down). |
| "the first text goes too fast" | Unexpectedly, a Deer | **Budget reading time.** Each caption holds ≥ 1 s + 1 s per ~20 characters before the next one appears; the first holds longest. |
| "the bottom infos … are blocked on Instagram by the bottom texts and channel info" | A Handful of People | **Keep the bottom clear.** Instagram's caption, channel line and buttons cover the bottom of a Reel: no where/what tag or other text below y = 1630 (`RFP.SAFE_B`), and nothing in the right-hand 160 px below the middle of the frame. |
| "funny … needs clarity or more jokes" | Unexpectedly, a Deer | **Set up the stake early** (the $20/MO tag in shot 1), so every later gag is paid for. |
| "it had small glitches … I like those" | Biodiversity Fund | Test very subtle glitches later; never on a caption. |
| "Add japanese text to the roster. If you use Finnish, sometimes consider japanese or both as additional theme elements" | Kill Switch | **Finnish and Japanese are the house's second voices** (the station speaks fi/en/ja). Wherever Finnish appears as texture (a label, a manual line, a sign, a jar), consider Japanese with it or instead of it. Set Japanese in a **gothic** (IPA P Gothic, `fonts-ipafont-gothic`), never the bundled serif; the bundled Noto Sans SC has no kana. Use the real conventions: a Japanese manual opens with 安全上のご注意. |

And from the work itself:

- **Decide the length at the pitch, and render to it.** Both clay films were rendered at 37.5 s and
  then cut to 20 s, which wasted about 50 minutes of rendering each.
- **The record is the joke.** Sources come before art. Never invent a quote. Paraphrase never goes
  in quote marks. Real people are never given faces.
- **Every beat has one image that works with the sound off**: an object doing something.

## The two channels

| | Radio Free Helsinki | Toko Midori Games |
|---|---|---|
| style | papercut | clay (Aardman plasticine) |
| length | ≤ 37.5 s, plus the 3 s station slate | ~20 s |
| beats | 6 shots of 12 beats at 112 BPM | 5 beats (≈ 4 s each) |
| branding | RADIO FREE HELSINKI bug + end slate | no bug, no slate |
| subject | the news: Big Tech (Doodle), AI governance, local and global | everyday life with AI, observed |
| sound | Doodle / Coxon series palettes (`SOUND.md`) | Toko palette |

## The pitch template

```
Title · channel · series · length
Logline        one sentence: what happens
Insight        one sentence: what the record shows (not an opinion)
Last line      the joke, in the station's / Toko's own voice
...over        the image that answers it
Beats          per beat: the image (object doing something) · the caption (characters, hold time)
Where / who    how the viewer knows the place, the country and the institution
Sources        two or more per claim; single-source claims flagged and kept off screen
Risks          real people (no faces, no invented words), contested facts, fairness
Art            the set, the characters, the one thing that moves; a reference image if there is one
Sound          the palette, and the hits (stamp, click, silence before the joke)
```

A pitch goes to the owner as a slate of a few. The chosen ones get a shot table (`shot-table-*.md`),
then the standard procedure in `README.md`.
