# 31 · Short Supply (RFH Global 3): papercut, VIRAL cut (stills, 30 Oct)

**Owner, 30 Oct:** picked it from the global scout (`plan/GLOBAL-SCOUT.md` §5), alongside Grade Your Own Homework and
The Round Trip. **This is a stills checkpoint.** No full build has been made and nothing is posted.

- Kit: `scenes/ssu_kit.js`. Film: `papercut/short-supply/{film.json, copy.json, score.py}`.
- Stills: `previews/30-10-RFH-Short-Supply-stills.jpg` (en, with captions, through the real caption pass). Left to
  right: 0.0 (frame 0), 2.2, 5.9, 9.9, 13.8, 17.4, 21.3 s.

## Pitch

Gamers feel it at the till. A graphics card went from $570 to $805 in two months. Its memory went to AI chips instead.
A lawsuit alleges the shortage was planned; the makers ask the court to throw it out, and the hearing is 13 Nov. The
station's line leaves the allegation open, because the court has not ruled: planned or not, you pay $805.

## Captions (en; fi/ja in copy.json, drafts, not native-read)

| # | role | caption | picture | tag |
|---|---|---|---|---|
| 1 | setup | A graphics card: / $570 in June, / [$805] in August. | **Frame 0:** a gamer's graphics-card box (generic, no logo) on a shop shelf at night. Under it, the clipping reads GRAPHICS CARD · JUNE 2026, **$570**. On "$805" it turns over to AUGUST 2026, **$805** in red. | on the clipping: RTX 5060 TI 16GB · NEWEGG MEDIAN (TOM'S HARDWARE) |
| 2 | evidence | Memory makers / moved production / to [AI] chips. | Carts of RAM sticks roll on a rail out of the DRAM works into an AI data centre. On "AI" its sign lights teal and the racks blink. | MEMORY LINES MOVED TO AI MEMORY (HBM) |
| 3 | evidence | A lawsuit alleges / the shortage / was [planned]. | The complaint's first page (N.D. Cal., Case No. 3:26-cv-06345, body lines blank) slides onto a desk. **ALLEGED** is stamped on it on "planned". | CLASS ACTION · N.D. CALIFORNIA · FILED 25 JUNE 2026 |
| 4 | evidence | The makers / ask the court / to [dismiss] it. | MOTION TO DISMISS slides over the stamped complaint. A calendar page pops on beside it: NOV 13, HEARING. On "dismiss" the motion lands. | MICRON DENIES THE CLAIMS · HEARING 13 NOV 2026 |
| 5 | punchline | Planned or not, / you pay [$805]. | Back on the shelf, the clipping reads $805. On "$805" a receipt prints up (TOTAL $805.00) and the till rings; the box slides aside to make room. Then the receipt goes and the clipping turns back to JUNE, $570. | none |

**Loop:** the last frame is frame 0 (June, $570).

**Timing:** en 21.86 s + sign-off (140 BPM; 9/9/9/9/15 beats). fi 23.1 s and ja 25.3 s, after reading-time holds.

**Sound:** `score.py`, the RFH bed at 140 BPM:
- the hit on frame 1;
- a card flip on the clipping;
- cart rumble with rail-joint clicks, the data centre's hum, and a glide and chime as the AI sign lights;
- a paper slide, then the stamp;
- the motion's slide, the calendar's pop, and a thump plus gavel;
- the till's bell, the receipt printer and coins;
- the sting.

The en events check passes 5/5: −14.0 LUFS, −4.3 dBTP, 20/20 cues covered.

**Text checks** on these stills (en): 91 pass, 9 warn, 0 FAIL. The warnings are the unread fi/ja and the fi/ja holds the
masters insert. Every line is within 800 px: en at most 789, fi 782, ja 740.

## Post copy (copy.json `post`)

- **en (261 chars):** A graphics card went from $570 to $805 in two months (US median, RTX 5060 Ti 16GB). Memory makers moved
  production to AI chips. A lawsuit alleges the shortage was planned; the makers ask the court to dismiss it. Hearing:
  13 Nov. What did your last upgrade cost?
- **fi (280) and ja:** drafts.

## Fact table

All from **search summaries**. No article, filing or docket was opened in this session.

| claim | status | sources |
|---|---|---|
| RTX 5060 Ti 16GB: $569.99 (June) → $804.99 (Aug 2026), Newegg US median; list price unchanged; caused by memory demand from AI | **CONFIRMED in several secondary reports** of Tom's Hardware's tracking (TweakTown, PCGamesN, Digital Citizen, VGTimes). The Tom's Hardware original was not opened. **Percentages conflict** (39%, 40%, 41%; the two prices themselves give +41%), so the film shows **only the two prices**, rounded to $570 and $805, and no percentage. | [PCGamesN](https://www.pcgamesn.com/nvidia/rtx-50-graphics-cards-prices-august-2026), [TweakTown](https://www.tweaktown.com/news/113088/geforce-rtx-5060-ti-16gb-pricing-hits-800-in-the-us-as-memory-crisis-takes-hold/index.html), [Digital Citizen](https://www.digitalcitizen.life/nvidia-rtx-5060-ti-16gb-median-price-reaches-805-as-rtx-50-series-costs-keep-rising/), [VideoCardz](https://videocardz.com/newz/nvidia-rtx-50-median-prices-reach-up-to-135-above-msrp-in-us-rtx-5070-hits-900) |
| Memory makers moved production to AI chips (HBM) | **CONFIRMED as industry reporting**: Samsung, SK hynix and Micron shifted DRAM capacity to higher-margin HBM for AI. Figures for how much vary by outlet, so none is used. | [Network World](https://www.networkworld.com/article/4113772/samsung-warns-of-memory-shortages-driving-industry-wide-price-surge-in-2026.html), [TrendForce](https://www.trendforce.com/news/2026/06/29/news-samsung-sk-hynix-micron-face-u-s-class-action-lawsuit-over-alleged-dram-supply-manipulation/), Tom's Hardware's attribution (above) |
| A lawsuit alleges the shortage was planned | **CONFIRMED as an allegation.** *Garciaguirre et al. v. Samsung Electronics Co. et al.*, N.D. Cal., filed 25 June 2026, by 17 individuals and small businesses. It alleges coordinated restriction of conventional DRAM supply (Sherman Act §1) and calls the HBM shift a pretext, citing ~700% over four years. **Unproven.** On screen it is "alleges" plus an ALLEGED stamp. A similar 2018 suit was dismissed, and the Ninth Circuit affirmed in 2022. | [Tom's Hardware](https://www.tomshardware.com/tech-industry/samsung-sk-hynix-and-micron-sued-over-alleged-dram-price-fixing-amid-record-memory-costs), [PC Gamer](https://www.pcgamer.com/hardware/memory/memory-crisis-heads-to-court-class-action-lawsuit-calls-samsung-sk-hynix-and-micron-dram-market-oligopolists-alleging-anticompetitive-behavior/), [Quartz](https://qz.com/samsung-sk-hynix-micron-antitrust-class-action-memory-price-fixing-062526), [CourtListener docket](https://www.courtlistener.com/docket/73532135/garciaguirre-v-samsung-electronics-co-ltd/) |
| The makers ask the court to dismiss it; hearing 13 Nov 2026 | **CONFIRMED from a docket search summary only** (CourtListener, not opened): a motion to dismiss by Micron, SK hynix and the Samsung entities; plaintiffs opposed; the reply came on 7 Oct; the hearing was reset to 13 Nov 2026, 9:00, San Jose, before Judge Noël Wise. **Open the docket before posting.** | [CourtListener](https://www.courtlistener.com/docket/73532135/garciaguirre-v-samsung-electronics-co-ltd/), [PacerMonitor](https://www.pacermonitor.com/public/case/65376986/Garciaguirre_et_al_v_Samsung_Electronics_Co,_Ltd_et_al) |
| Micron denies the claims | **CONFIRMED (reported).** Micron told Moneywise it competes vigorously, fairly and in compliance with all applicable laws, and will defend itself. That is a paraphrase, never quoted. Samsung and SK hynix: no public comment found. SK hynix disclosed the suit in its amended F-1. | [TheStreet/Moneywise](https://www.thestreet.com/investing/stocks/mu-micron-stock-price-lawsuit-bombshell), [SK hynix F-1/A (SEC)](https://www.sec.gov/Archives/edgar/data/2120882/000119312526295501/d32785df1a.htm), [JoongAng Daily](https://www.koreajoongangdaily.com/business/sk-hynix-files-amended-f1-with-sec-as-it-begins-us-ipo-process/12749695) |
| Any regulator probe in 2026 | **NONE FOUND.** It is a private suit only, and the film says nothing about regulators. | search, 30 Oct |
| Planned or not, you pay $805 | The station's line. It leaves the allegation open, and $805 is the August median from caption 1. | — |

## Risks for the owner

1. **Defamation, handled:**
   - The conspiracy appears only as "a lawsuit alleges", with an ALLEGED stamp. The motion to dismiss and Micron's denial are on screen.
   - No defendant is named in a caption. Micron is named only on its own denial tag; all three are named in the post copy.
2. **Timing:**
   - The hearing is 13 Nov. **Post before it**, or re-check the ruling and change caption 4 and the tag if the judge has ruled.
   - The prices are August's. The tracker the October check found shows a lower October low ($766), which is a different measure.
3. **"You pay $805"** generalises one card's median, as the station's line. If it's too loose, an alternative is "Planned or not, / the card costs [$805]."
4. **Unopened sources:** the docket and the Tom's Hardware original. Open them if the network allows before posting.
