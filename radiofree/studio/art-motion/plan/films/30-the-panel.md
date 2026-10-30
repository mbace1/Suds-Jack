# 30 · The Panel (RFH, Brink/Coxon): clay, in the manner of *Digger* (stills checkpoint, 26 Oct)

**Owner, 26 Oct:** "1 is a good one and should be done in the Style of the new movie Digger." The pitch was approved
in chat, and the owner said yes to building it to stills. **This is a stills checkpoint only:** no full render, no
score yet.

- Kit: `clay/panel/film.html`, `clay/panel/film.js`, `clay/panel/copy.json`.
- Stills sheet: `previews/26-10-The-Panel-stills.png` (12 stills, in time order, left to right and top to bottom:
  0.05, 2.5, 5.0, 6.2, 7.4, 9.0 / 10.9, 11.6, 14.0, 17.0, 20.0, 23.9 s).
- Stills command:

  ```
  NODE_PATH=$(npm root -g) node pipeline/render.mjs clay/panel/film.html <out> --fonts <fonts> --lang en --query busy=0 --stills …
  ```

## The look: "in the manner of Digger"

*Digger* is Alejandro G. Iñárritu's 2026 film, shot by Emmanuel Lubezki on VistaVision. Trailer coverage describes it
as heavily desaturated and pale, almost washed out, with an amped-up, absurd tone that Empire compares to *Dr.
Strangelove* ([The Playlist](https://theplaylist.net/tom-cruise-digger-vistavision-20260715/),
[Empire](https://www.empireonline.com/movies/features/digger-five-things-we-learned-from-tom-cruise/)). **We evoke the
feel only.** No frame, character, title treatment or logo of that film appears.

**How the clay engine does it.** No new pass was needed; the existing post (`clay/welcome/lib/post.js`) takes it as
parameters:

- **The grade (`DIGGER` in `film.js`):** saturation 0.42; pale lifted blacks (lift 0.065–0.085, cooler in the blue);
  warm highlights (gain 1.03 / 1.00 / 0.93) over a cool overall tint; contrast 1.08; heavy grain (0.075, reseeded
  every frame); a light vignette; and a touch of chromatic aberration.
- **The lens:** very wide (vertical FOV 74–84°), with **no depth of field at all**. Deep focus is the wide-lens look.
- **The camera floats:** a slow three-axis sine drift on every shot.

**The set** is a Strangelove-style war room:
- an enormous round table of green felt with a dark rim, under a hanging HDR **ring light**;
- a pool of light from above, and a raw concrete bunker;
- a slate **big board** with dull dot-fields and a few blinking lights, reading THE FUTURE OF WAR · STUDY · 120 DAYS;
- three **tall buttoned leather chairs** at the head of the table, low dim chairs round the rest, and a **service bell**
  in front of the three, which hops on the punch word.

**No figure appears**, so no face can. The chairs stay empty all film.

## Captions (en; fi/ja in copy.json, not yet native-read)

| # | role | caption | picture |
|---|---|---|---|
| 1 | setup | The Pentagon / wants a study of / the [future of war]. | A slow push, low over the felt, towards the three chairs (a glimmer of light on each from frame 0) and the board. Tag: PENTAGON STUDY · ANNOUNCED SEPT 2026 |
| 2 | evidence | Three people / will [lead] it. | The three chairs square on; their spotlights snap on one by one (5.85 / 6.47 / 7.09 s) |
| 3 | evidence | Two of them / founded firms / that [sell] to it. | Manila folders rain onto two of the three seats and stack into towers, the top one stamped CONTRACTS; the third chair stays bare. Tag: DEFENCE CONTRACTS · AS REPORTED BY NPR |
| 4 | punchline | The buyer asked / the sellers / for [advice]. | The camera floats up and back: the ring, the round table, two towers and one bare chair. The bell hops on "advice". Tag: WHICH ETHICS RULES APPLY? NOT DISCLOSED |

Timeline at 100 BPM: s2 5.4 s, s3 10.2 s, s4 16.2 s, end 24.0 s, plus the RFH sign-off. Every caption is within
800 px in en, fi and ja, inside the safe area, and clear of the right-hand rail.

## Changes from the pitch, on the facts

- **"AI weapons" became "the future of war".** Project Meridian's stated job is the domains the military must win and
  the capabilities it must master, not AI weapons.
- **"Sell it weapons" became "sell to it".** SpaceX's sales to the Pentagon are launches and satellites (the brief's
  own wording rule).
- **"Run" became "founded".** Luckey founded Anduril and is not its CEO.
- **The punchline.** "Who's buying?" was unclear cold. The new line is the station's own and true as stated: the
  Pentagon (the buyer) asked two founders of its suppliers (the sellers) to lead its study (the advice). It claims no
  wrongdoing.

## Fact table

All of this is from **search summaries only**. No article was opened: thedefensepost.com did not resolve, and
NPR/Axios were reached only through summaries and their syndicated copies.

| claim on screen | status | sources |
|---|---|---|
| The Pentagon wants a study of the future of war | CONFIRMED. Hegseth announced a 120-day study, Project Meridian, around 30 Sep 2026; it is to identify the domains the military must win and the capabilities it must master, not to make policy. MITRE does the analysis, commissioned through the Pentagon's CTO, Emil Michael. Findings are reportedly due 28 Jan 2027 (single-source chain; not on screen). | [Axios](https://axios.com/2026/09/30/pentagon-hegseth-musk-gingrich-anduril), [Northeast Times](https://northeasttimes.com/2026/10/01/hegseth-names-musk-luckey-and-gingrich-to-lead-120-day-pentagon-study-of-future/), [OPB/NPR](https://www.opb.org/article/2026/10/06/pentagon-taps-elon-musk-and-palmer-luckey-for-strategy-study/) |
| Three people will lead it | CONFIRMED: Newt Gingrich, Elon Musk, Palmer Luckey. Named in the post copy only. | as above |
| Two of them founded firms that sell to it | CONFIRMED in substance. Musk founded SpaceX and Luckey co-founded Anduril. NPR reports a former senior Defense official noting both have billions of dollars in current defence contracts. That official's "conflict of interest" wording stays theirs; we do not use it. | [OPB/NPR](https://www.opb.org/article/2026/10/06/pentagon-taps-elon-musk-and-palmer-luckey-for-strategy-study/) |
| Which ethics rules apply? Not disclosed | CONFIRMED. The Pentagon did not say whether Musk and Luckey are special government employees or contractors, which decides whether the federal conflict-of-interest law applies to them. The Pentagon, SpaceX(AI) and Anduril did not respond to NPR. | [OPB/NPR](https://www.opb.org/article/2026/10/06/pentagon-taps-elon-musk-and-palmer-luckey-for-strategy-study/) |
| The buyer asked the sellers for advice | The station's line. True as stated; no wrongdoing claimed. | — |

**Re-check before posting:** whether the Pentagon has since stated their employment status, and any recusal or ethics
review. Both are on the twice-daily check's watch list.

## Post copy (copy.json `post`)

- en (250 chars): The Pentagon asked three people to lead a 120-day study of the future of war: Newt Gingrich, Elon
  Musk and Palmer Luckey. Two of them founded companies that sell to the Pentagon. It hasn't said which ethics rules
  apply to them. Who advises the buyer?
- fi (266) and ja: drafted, not native-read.

## The honest look at the stills (round 3)

**Works:**
- The pale, grainy, wide frame with real blacks.
- The ring light over the round table: the Strangelove read.
- The three chairs lighting in turn.
- The CONTRACTS towers on two seats, with the third bare.
- The bell.
- The board now sits below the captions.

**Weak:**
- **The hook:** frame 0 is mostly empty felt, with the three chairs small and dim mid-frame. That reads as Digger's
  emptiness, but it is a slow first second for a feed. A tighter or lower first frame is an option.
- **The chairs:** the tall chairs read as buttoned panels more than wingbacks, and their seats are hidden by the
  table's edge.
- **The rain of folders:** caught mid-drop at about 10.9 s it looks like ladders; it should read in motion.
- **The wide shot:** in shot 4 the towers are small.
- **The board:** its dot-field reads as sparkle.

**Earlier rounds fixed:**
- Round 1 was washed to flat mid-grey with a blown-out felt. Lift, contrast, the pool and the room light were retuned.
- Captions overlapped the board's title. The camera now aims higher in shots 2–3.
- The chairs were invisible at frame 0. A dim spot is now on from the start.

**Not built yet:** `score.py`, the full render, and the owner's ruling on the hook and the chairs.

## v3 to full render (28 Oct)

**Owner, 28 Oct, on the v3 stills (orange lighting):** "Start." So v3 is the film now:

- **Files.** `film.js` is v3 (the orange-light build that was `film2.js`); v1 is kept as `film-v1.js`. `film.html` loads
  `film.js`, so the pipeline builds v3.
- **Sound:** `score.py`, on the RFH bed, kept light under the push and the chairs and wide shot, with the full groove
  for the towers:
  - three heavy spotlight clunks, one per chair, panned left to right;
  - a paper avalanche that thickens as the CONTRACTS towers fill, and a card tap for the top folder;
  - the service bell on "advice", once, polite, with a deadpan sting after it.
- **Build:** `pipeline/build.py clay/panel --lang en --jobs 3 --signoff previews/signoff-papercut.mp4`.
- **Before posting:** re-check that the Pentagon has still not stated Musk's and Luckey's employment status, and whether
  any recusal or ethics review has come out. Both are on the twice-daily check.

## v4: the three named (29 Oct)

**Owner, 29 Oct:** "The panel video needs to mention the people." v3 kept the names to the post copy. Now:

- **Caption 2:** Gingrich, Musk / and Luckey / will [lead] it.
- **Caption 3:** Musk and Luckey / founded firms / that [sell] to it.
- **Place cards:** a stencilled surname card stands on the felt in front of each empty chair: MUSK (left), GINGRICH
  (middle), LUCKEY (right). The two CONTRACTS towers stand behind the two founders, and Gingrich's chair stays bare. Each
  card brightens when its chair's spot comes on.
- **Unchanged:** no figure and no face. Sources as before (OPB/NPR 6 Oct; Axios 30 Sep).
- **The bell:** in front of the cards, on a camera this low, it hid the middle name. It stands just behind the middle
  card now, scaled up so its dome rises over the card.

## v5 plan: a clear ending and full names (30 Oct)

**Owner, 30 Oct:** "Panel messaging at end is still not clear. Please also use full names at some point. Plan this
better."

**What was unclear.** "The buyer asked the sellers for advice" makes a cold viewer solve two metaphors (who is the buyer?
who are the sellers?) in the last second. The story has to say it in order: who leads the study; that two of them sell to
the Pentagon; therefore sellers will advise their customer. Then one fact, on the tag.

| beat | caption (en) | picture | tag |
|---|---|---|---|
| 1 setup | The Pentagon / wants a study of / the [future of war]. | The push over the felt to three empty chairs; three name cards. | PENTAGON STUDY · ANNOUNCED SEPT 2026 |
| 2 evidence | Newt Gingrich, / Elon Musk and / Palmer Luckey / will [lead] it. | The three spots come on in turn; each name card lights with its chair. | none |
| 3 evidence | Musk and Luckey / founded firms / that [sell] / to the Pentagon. | CONTRACTS folders rain onto the two founders' chairs; Gingrich's stays bare. | SPACEX · ANDURIL: DEFENCE CONTRACTS (NPR) |
| 4 punchline | So two sellers / will [advise] / their customer. | The wide shot: the bell rings on "advise". | ETHICS RULES FOR THEM? NOT DISCLOSED |

- **Full names:** in caption 2, and on every name card (first name small over the surname).
- **Firms:** named on the tag in beat 3. Their founders are named in the caption.
- **Post copy (280 chars):** ends on the question "Should sellers advise their customer?"
- **Facts:** unchanged. The punchline is the station's line. The sellers are Musk and Luckey (their firms sell to the
  Pentagon). The customer is the Pentagon. "Advise" fits because they lead its advisory study. No wrongdoing is claimed.
- **Fit:** every line fits 800 px in en, fi and ja (pipeline pre-flight). fi and ja hold for 0.6 s and 1.2 s more on
  beat 2.
