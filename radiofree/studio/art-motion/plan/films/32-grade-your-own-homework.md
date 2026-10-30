# 32 · Grade Your Own Homework (RFH, Brink/Coxon): papercut, viral cut (stills checkpoint, 30 Oct)

**Owner, 30 Oct:** picked from the global scout (`plan/GLOBAL-SCOUT.md` §2), together with Short Supply and The Round
Trip. This is a **stills checkpoint**: no full build, nothing posted.

- **Kit:** `scenes/gyh_kit.js` (engine key `gyh`).
- **Film files:** `papercut/grade-your-own-homework/{film.json, copy.json, score.py}`.
- **Stills:** `previews/30-10-RFH-Grade-Your-Own-Homework-stills.jpg`, eight stills composited through the pipeline's own
  caption pass (`pipeline/text/overlay.html`), at 0.0, 2.6, 6.26, 11.17, 14.26, 16.06, 18.06 and 20.1 s.
- **Length:** 20.1 s at 140 BPM, plus the RFH sign-off.

## The pitch

The Pentagon's frontier-AI contracts ask the AI companies to forecast the dangers of their own products. The film shows
it as homework the student marks itself: STUDENT and MARKED BY are the same name.

## Neutrality and the disclosure

- **The conflict.** One of the four labs is Anthropic, the maker of the tools that made this film.
  - On screen, all four are drawn alike and none is named: AI LAB A–D, no logos, four plain tab colours that are no
    company's.
  - The subject is the contracts. Only the clause heading is the contracts' own words (as reported); every other line on
    every page is a blank typed bar.
  - The post copy names all four plainly, because the record names them.
- **Disclosure, for the owner to approve.**
  - On screen, as a two-line cream tag at the bottom, from 17.46 s to the end (2.7 s): **MADE WITH ANTHROPIC'S TOOLS ·
    ANTHROPIC IS ONE OF THE FOUR**.
  - fi: TEHTY ANTHROPICIN TYÖKALUILLA · ANTHROPIC ON YKSI NELJÄSTÄ.
  - ja: Anthropicのツールで制作 · Anthropicは4社の1つ.
  - The same wording is in the post copy.

## Shot table (en)

| # | t | role | caption | picture | tag |
|---|---|---|---|---|---|
| 1 | 0–3.86 | setup | The Pentagon / bought AI from / [four] companies. | Frame 0: a desk from above, a manila folder with the Pentagon's outline, four contracts peeking out. On "four" they fan out: AI LAB A, B, C, D. | JULY 2025 · UP TO $200M EACH |
| 2 | 3.86–8.57 | evidence | Each must / [forecast] the risks / of its own AI. | Close on one contract (tabs A–D on its edge): § 7 RISK FORECASTING · THREAT IDEATION. On "forecast" a highlighter sweeps it. | CONTRACTS WON IN A FOIA LAWSUIT · THE INTERCEPT |
| 3 | 8.57–12.86 | evidence | Critics call it / a conflict / of [interest]. | The page turns over into an exam, EXAM: HOW RISKY IS YOUR OWN AI?, with STUDENT: AI LAB. On "interest" the company's own hand writes AI LAB on MARKED BY, in red. | CRITIC: AI NOW INSTITUTE |
| 4 | 12.86–20.14 | punchline | They grade / their own / [homework]. | Five red ticks, box to box. On "homework", A+ in a ring. SELF-GRADED stamped. The disclosure. The last second the exam drops back into the folder: frame 0, the loop. | the disclosure (two lines) |

**Pre-flight (pipeline caption pass, real fonts).**
- Every line fits 800 px in en, fi and ja. The widest is 745 px (fi task).
- Every caption is inside the safe area and clear of the right rail.
- Reading time is within the time shown in every language. There are no holds.

**Sound (`score.py`).**
- The RFH bed at 140 BPM, with an office hum underneath.
- Frame 1 opens on a thump and a knock.
- Four paper flips on "four", a highlighter squeak on "forecast", a card flip, and the red pen on "interest".
- Five pencil ticks, then a flourish and a knock on "homework", the stamp, and a soft chime under the disclosure.
- The paper slides back into the folder, then the sting.
- A test mix against the planner's events passed: 5 of 5 checks, −14.1 LUFS, −4.3 dBTP.

## Fact table

**How this was verified.** Everything below comes from **search summaries only**. This session had no page-fetch tool,
so neither The Intercept's article, AI Now's note nor the CDAO release was opened. Open the primaries before posting.

| claim | where it is used | status | sources |
|---|---|---|---|
| The Pentagon (CDAO) gave four frontier-AI companies, Anthropic, Google, OpenAI and xAI, contracts with a ceiling of up to $200M each, in July 2025 | caption 1; tag 1; post | **CONFIRMED** by multiple outlets and the CDAO's own release. $200M is a ceiling, not a payout, hence UP TO. **Open question:** Breaking Defense dates OpenAI's award a month earlier (June 2025); most coverage, and The Intercept, treat all four as July 2025. | [CDAO release, ai.mil](https://www.ai.mil/News/PR-View/Article/4242822/cdao-announces-partnerships-with-frontier-ai-companies-to-address-national-secu/), [DefenseScoop 14 Jul 2025](https://defensescoop.com/2025/07/14/pentagon-ai-contracts-musk-xai-google-openai-anthropic-cdao/), [GovConWire](https://www.govconwire.com/articles/cdao-frontier-ai-contract-awards-national-security) |
| The contracts were obtained in a FOIA lawsuit by The Intercept: 400+ pages, published 8 Sep 2026 | tag 2; post | **CONFIRMED** in summaries of The Intercept's story, carried by several outlets. | [The Intercept, 8 Sep 2026](https://theintercept.com/2026/09/08/military-ai-weapons-contracts-openai-anthropic-google/), [IBTimes](https://www.ibtimes.co.uk/ai-giants-pentagon-military-contracts-1818594), [AI Weekly](https://aiweekly.co/alerts/intercept-foia-reveals-200m-pentagon-ai-deals-with-four-labs), [heise](https://www.heise.de/en/news/Pentagon-Leaks-The-Secret-Contracts-of-AI-Giants-11445918.html) |
| Each contract obliges the company to provide "risk forecasting" and "threat ideation" on dangers its own (future) products might pose | caption 2; the clause on the page; post | **CONFIRMED** as reported: several summaries quote the terms and describe them as an obligation. On screen only the two terms appear, as a heading; nothing else is quoted. | as above |
| A dispute over some OpenAI pages ("minimal refusal rates"). DoD and OpenAI say they were drafts incorrectly provided; The Intercept says Pentagon lawyers first confirmed then reversed | **not used** | Reported. It concerns other pages, not the risk-forecasting clause. Left out of the film and the post by design. | [metirai summary](https://www.metirai.com/blog/pentagon-ai-contracts-minimal-refusal-intercept-foia-2026) (secondary) |
| Critics call vendors assessing their own products' risks a conflict of interest: Heidy Khlaaf, AI Now Institute | caption 3; tag 3; post | **CONFIRMED as an attributed view** (AI Now's own press note, and The Intercept's quotes). Paraphrased, with no quote marks. "Critics" is plural because other watchdogs and Sen. Warren (letters, July 2026) have pressed on the same contracts' transparency. | [AI Now press note](https://ainowinstitute.org/news/press/ai-giants-work-hand-in-hand-with-the-pentagon-contracts-reveal), [Warren letters, Jul 2026](https://www.warren.senate.gov/newsroom/press-releases/warren-presses-dod-for-answers-on-military-ai-contracts-demands-release-of-ai-contracts/) |
| The government's stated position on the clause | **not used** | **NOT FOUND.** No DoD statement addressing the risk-forecasting clause turned up. The scout file's line ("frontier companies can help the DoD understand those risks") could not be traced to a primary, so it is left out. | — |
| Follow-ups since 8 Sep (a new FOIA release, a congressional letter about this story, company responses) | — | **None found.** Only OpenAI answered The Intercept's questions (per summaries). Warren's July letters predate the story. | — |
| "They grade their own homework" | caption 4 | **The station's line:** a metaphor for self-assessment (caption 2), not a claim about grades or scores in the contracts. | — |

## Post copy (copy.json `post`)

- **en (280 characters):** "Pentagon AI deals with OpenAI, Anthropic, Google and xAI (up to $200M each) ask each to
  forecast the risks of its own AI, per contracts The Intercept won in a FOIA suit. Critics call it a conflict of
  interest. Made with Anthropic's tools; Anthropic is one of the four. Who checks?"
- **fi (273)** and **ja (152):** drafted, not native-read.

## Risks the owner decides

1. **The disclosure wording, on screen and in the post.** It is drafted and needs the owner's approval.
2. **Ageing peg.** The Intercept's story is from 8 Sep. Post soon, or wait for a follow-up (a new FOIA release, a
   letter, or the next round of contracts).
3. **Unopened primaries.** The Intercept article, AI Now's note and the CDAO release were verified from search summaries
   only.
4. **"Each must".** Summaries say the contracts *require* or *obligate* each company to supply the forecasts. If the
   opened article says "asks" or "offers", caption 2 becomes "Each one is asked / to [forecast] the risks / of its own
   AI." That fits the same width.
5. **Neutrality cuts both ways.** The film names no company on screen, Anthropic included. Reported context, not in the
   film: Anthropic later clashed with the Pentagon over use restrictions and was labelled a supply-chain risk, which a
   court ruled unlawful. The owner may want a line on that in the post. It is left out here to keep the four alike.
