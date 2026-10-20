# That's a Wednesday (Coxon, US AI politics): DRAFT, 20 Oct, for 00:50 Helsinki, 31 Oct – 2 Nov

Papercut, the Coxon set, engine key `wd`, `papercut/thats-a-wednesday/`. ~33 s + the papercut sign-off. Research:
`research-coxon-next.md` §2; idea: `IDEAS.md`, Coxon, *That's a Wednesday*. Written to the one-question rule
(PLANNING.md): asked first, answered last, three facts between.

**The one question:** Should you ask a chatbot when to vote?

**The argument (copy.json):** Don't ask a chatbot when to vote: in a September study, 29% of chatbot voting answers
were incomplete, wrong or out of date, and one said 4 November, a Wednesday. Ask your election office.

## The three facts, re-checked 20 Oct 2026

The proxy refused every primary source this session (isdglobal.org, thehill.com, npr.org, nbcnews.com and the
station sites: 403 or no DNS), so each fact below rests on **search excerpts from two or more outlets**, not on the
original read in full. Nothing is quoted on screen.

| # | fact (as on screen) | status | sources (searched 20 Oct 2026) |
|---|---|---|---|
| 1 | In a September study, **29%** of chatbot answers on voting were incomplete, wrong or outdated. | **CONFIRMED** (the 29% and its three words). **CHANGED:** the brief said "a September *test*"; the tests ran in **June** and the report came out **3 Sep**, so the copy says "a September **study**". | ISD, *Chatbots and the Ballot Box* (3 Sep 2026), https://www.isdglobal.org/wp-content/uploads/2026/09/Chatbots-and-the-Ballot-Box-US-elections.pdf and https://www.isdglobal.org/publication/chatbots-and-the-ballot-box-evaluating-accuracy-sourcing-and-language-gaps-in-ai-answers-to-election-questions/ (excerpts only) · The Hill, https://thehill.com/policy/technology/6071757-ai-chatbots-election-info-inaccuracy/ (syndicated: WRBL, abc27, Fox56) · NBC News, "AI chatbots frequently flub voting questions ahead of midterms, study finds", https://www.nbcnews.com/tech/tech-news/ai-midterm-chatbot-voting-election-chatgpt-meta-google-rcna595735 (the June test date; 400 prompts a model, ten states, half in Spanish) · Latin Times, https://www.latintimes.com/ai-chatbots-get-nearly-1-3-voting-questions-wrong-errors-climb-higher-spanish-599176 · Political Wire, 4 Sep, https://politicalwire.com/2026/09/04/ai-chatbots-flub-basic-voting-questions/ |
| 2 | One chatbot gave Election Day as **November 4**. | **CONFIRMED** in two separate summaries of the report: one of the six chatbots named 4 November 2026 as the midterm date, **in two responses**. The exact sentence in the PDF is still unread. | ISD report (via the NBC and The Hill coverage above; Election Law Blog pointer, https://electionlawblog.org/?p=158493) |
| 3 | Election Day is **Tuesday, November 3**; November 4 is a **Wednesday**. | **CONFIRMED.** Federal law sets it as the Tuesday after the first Monday in November (2 U.S.C. §7); the weekdays were computed here: 3 Nov 2026 is a Tuesday, 4 Nov 2026 a Wednesday. | `python3 -c "import datetime; print(datetime.date(2026,11,3).strftime('%A'))"` → Tuesday |

**Dropped:** *about one voter in five asks chatbots about the election.* The AAPC Foundation's own executive summary
(*Seen, Not Sought*, survey 14–22 Sep 2026, 1,568 likely voters,
https://aapcfoundation.org/wp-content/uploads/2026/10/AAPC-Foundation-AI-Voter-Study-2026-Executive-Summary-Final.pdf,
release https://theaapc.org/release-foundation-research/) gives **4%** in the past month, **11%** this cycle and **19%
ever**. "One in five asks about the election" overstates the 19% (ever, not this election), and the original was not
opened, so it is cut rather than softened.

**Current status (20 Oct):** nothing found that withdraws or corrects the ISD findings. The labs pushed back on the
method after release (five of the six were tested through a third-party router), and the versions tested were June
versions that may since have changed: hence "in a September study", never "chatbots get the date wrong". NPR's
5 Oct piece (https://www.npr.org/2026/10/05/nx-s1-5977852/ai-chatbots-midterm-election) is the peg for voters using
chatbots; it is not quoted.

**The end card** points to "your local election office", which is true everywhere and names no URL, so there is
nothing to check before air.

## The punchline

*One chatbot said / November fourth. / [That's a Wednesday].* (kept as briefed; three lines so the first one fits the
800 px rule.) Then, in the picture, the end card: ASK YOUR LOCAL ELECTION OFFICE.

## Shot table (112 BPM; 12 beats a shot = 6.43 s, the last 14 beats for the end card; ~33.2 s before holds)

| # | shot | beats | role | caption (en) | what we see | cues |
|---|---|---|---|---|---|---|
| 1 | `wd_booth` | 12 | setup | Should you ask a chatbot / [when to vote]? | A fairground at night, plum sky, a wheel of bulbs. A fortune-teller booth, ASK ME ANYTHING, its crystal ball holding a chat bubble that types. A masked voter (magenta mask) types; his paper question rises: WHEN DO I VOTE? On "when to vote" the ball flares. Tag: US MIDTERMS 2026. | `ask` 0.9 · `ball` pop |
| 2 | `wd_answers` | 12 | evidence | In a September study, [29%] of / chatbot answers on voting were / incomplete, wrong or outdated. | The booth's slot pegs its answers out on two strings, ten paper tickets. On "29%" three go bad: one tears in half, one blots, one yellows; on "incomplete, wrong, outdated" they drop, one a word. Ten on the line, seven left. Tag: ISD STUDY · 3.9.2026. | `print` 0.3 · `fall` pop · `drop1` line 3 start · `drop3` line 3 |
| 3 | `wd_ticket` | 12 | evidence | One chatbot even got / [Election Day] wrong. | Close on the brass slot: a ticket curls out, ELECTION DAY / NOV 4, as it lands on the pop. A gloved hand comes up and tears it off, and holds it. | `slot` 0.4 · `date` pop · `tear` 4.2 |
| 4 | `wd_tuesday` | 12 | evidence | Election Day is / [Tuesday], November 3. | Tuesday: the school gym in the sun, POLLING PLACE, doors open, a queue of masked voters going in, two coming out with I VOTED stickers. On "Tuesday" the day card on the board flips to TUE 3. Our magenta mask is not in the queue. | `open` 0.3 · `tue` pop |
| 5 | `wd_wednesday` | 14 | punchline | One chatbot said / November fourth. / [That's a Wednesday]. | Wednesday: the same gym under a grey sky, doors chained, POLLS CLOSED, the I VOTED stickers in the gutter. The magenta mask walks in with his NOV 4 ticket and stops. A paper calendar slaps onto the door; on "Wednesday" a red marker strikes WED 4 and circles TUE 3. The end card: ASK YOUR LOCAL ELECTION OFFICE. | `arrive` 0.3 · `cal` line 2 · `wed` pop · `card` line 3 + 1.25 |

## Palette

Its own (not the house browns), and **no red-against-blue anywhere**: a plum fairground night (`#1b1224` → `#3a2647`),
gold bulbs and the booth's trim (`#e0a83e`), a mint crystal-ball glow (`#9fe8c8`), cream card (`#efe4c9`); the gym in
tan brick and sage doors under a warm Tuesday sky, then the same gym cold and lilac-grey on Wednesday. The bunting and
the stickers are cream and ochre, never flag colours. Masks from the sticker sheet without RED, BLUE or SKY. **The
marker is the only red in the film**, and it appears once.

## Motion: MARK carries the twist

rough.js (`scenes/vendor/rough-4.6.6.js`, MIT), drawn as in `ml_kit.js`'s `ml_mark` but in this film's own kit: on
"Wednesday" the marker strikes WED 4 with two rough strokes, then circles TUE 3, and the gloved hand follows the pen tip.
The strokes are drawn along their own length (dash offset), so the mark is made, not faded in. Everything else is the
papercut box in clean light (`rfp_clean.js`).

## Sound (Coxon)

The Coxon chorale and processional from *The Day After*, plus the fairground: a music box under the booth, a ticket
printer's ticks, paper tears, three soft card drops for the three bad answers, a stamp-like tear for the ticket, a
crowd murmur and door thunks for Tuesday, an empty-street wind for Wednesday (a quiet span before the punch), a marker
squeak on each stroke, the deadpan stinger on "Wednesday", and the bell under the end card.

## Rules and risks

- **No chatbot, model or lab is named or drawn**: the booth has no brand, and the copy says "a chatbot".
- **Never "lie"**: the 29% includes incomplete answers; the copy says "incomplete, wrong or outdated". No motive is
  implied anywhere: the booth is a fairground machine, not a villain, and nobody is shown suppressing a vote.
- **Old tests**: June versions, published in September; the copy says "a September study".
- **No party colours or partisan framing**; the gym, the queue and the stickers are neutral.
- **Misreading the locked door:** a locked polling place could read as "your vote was taken away". The film shows
  Tuesday open and busy first, so Wednesday reads as the day after; the stickers are in the gutter because the day is
  over, and the end card sends you to the official source.
- **Disclosure for the editor:** this film was researched and built by Claude, Anthropic's chatbot. In the related
  California test (CITED, 5 Oct), one of the errors was Claude's; the ISD test also scored Anthropic's entry in its
  lower group. The date error in this film is another firm's chatbot. The film names none of them. Please check the
  balance.
- fi and ja are drafts: `native_read` false.

## Build (20 Oct, DRAFT v1)

`pipeline/build.py papercut/thats-a-wednesday --lang en`: **PASSED**, 106 pass, 8 warn (fi/ja unread, sidecar lengths),
0 fail; 33.2 s with no holds, −14.0 LUFS, 30/30 cues sounded. Preview with the papercut sign-off:
`previews/20-10-Thats-a-Wednesday-DRAFT-en.mp4` (36.2 s, 4.3 MB). Reports: `qa/pipeline/thats-a-wednesday/en/`.
Kit: `scenes/wd_kit.js` (every scene inside it). In fi the study line needs a 2.1 s hold, in ja 3.2 s.

**Fixed after looking:** the ferris wheel behind the ten tickets was noise, so shot 2 got its own stall backdrop; the
bad tickets fell before the caption named them, so they now go bad on "29%" and drop on "incomplete, wrong,
outdated"; fallen tickets landed on the source tag; the crystal ball was cut off by the top of shot 3; the gym and
its queue sat too high and too small; the voter hid the POLLS CLOSED sign (moved to the right of the door); the end
card covered his NOV 4 ticket.
