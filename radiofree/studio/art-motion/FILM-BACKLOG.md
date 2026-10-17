# Film backlog

Every approved pitch that hasn't been posted yet, judged against `POSTED.md`. Kept by Grok Bot. Updated 18 Oct 2026 (Helsinki time, EEST).

Looks: papercut is the Radio Free Helsinki news look (`scenes/rfp_kit.js`); clay is the Toko and Teslur look (`clay/*`). See `README.md` ("House style") and `plan/STYLES.md`.

| Pitch | Research file | Look | Status | Copy |
|---|---|---|---|---|
| The Chair Is Taken (Coxon 5, RFH; slate 17 Oct, #1) | `radiofree/studio/art-motion/plan/research-chair.md` | papercut (reuses the *Committee of the Whole* City Hall kit, `scenes/cw_*.js`) | in production | — (write when finished) |
| Kill Switch (RFH; slate 17 Oct, #2) | `radiofree/studio/art-motion/plan/research-killswitch.md` | papercut strand (RFH), in its own new flat safety-leaflet look (`clay/kill-switch/flat.js`, approved 17 Oct) | in production (polish test only: `previews/17-10-Kill-Switch-polish-test.mp4`) | — (write when finished) |
| Welcome Home (RFH tech satire 2, after Teslur; slate 17 Oct, #3) | `radiofree/studio/art-motion/plan/research-welcome.md` | clay (Teslur kit; launch-film stage `clay/welcome/film-wh2.js`) | in production (needs frames from the real launch film before building) | — (write when finished) |
| Irreversible (Doodle 3, RFH; slate 15 Oct, #4) | `radiofree/studio/art-motion/plan/research-doodle.md` (§1) | papercut | finished, not approved yet (`films/15-10-Doodle3-Irreversible.mp4`, v2, 36 s) | Doodle says sharing anonymised search data with rivals would do "irreversible harm" to your privacy. EU law already requires that data to be irreversibly anonymised. #DMA #privacy #EU |
| The Newsreader Was Fake (Big Tech 1, RFH; slate 15 Oct, #3) | `radiofree/studio/art-motion/plan/research-doodle.md` (§3) | papercut | scrapped (`previews/scrapped/15-10-BigTech1-The-Newsreader-Was-Fake-SCRAPPED.mp4`) | — (write when finished) |
| Genius (Toko 3; slate 15 Oct, #6) | `radiofree/studio/art-motion/plan/research-toko.md` (§1) | clay | scrapped (`previews/scrapped/15-10-Toko3-Genius-SCRAPPED.mp4`) | — (write when finished) |

All other 15 Oct pitches are posted: Paid For By, On the Same Voluntary Terms, Satire Excepted, Somebody Does the Dishes.

## Finish first

**The Chair Is Taken.** Its set already exists. The City Hall exterior, the chamber, the dais, the witness table, the empty SPACEXAI chair, the blank odds cards and the gavel are all built in `scenes/cw_kit.js` and `scenes/cw_hall.js`, `cw_letters.js`, `cw_mic.js`, `cw_odds.js`, `cw_gavel.js`, `cw_chair.js`. The edit (`eras_cw.js`, `eras_cw2.js`), the Coxon sound palette (`synth_cw.py`) and the captions (`subs/committee-captions.py`) are there to adapt too. The research is done, with two or more outlets for each claim on screen, and the news is from 16 Oct, so it's the most time-sensitive of the three. Kill Switch has no deadline until 16 Nov and still needs its warning count taken from a real toaster manual. Welcome Home can't be built until there are frames from the real launch film.

Irreversible is already finished. It only needs Mikael's approval; `CAMPAIGN_PLAN.md` pencils it in for Sat 24 Oct, 12:50.
