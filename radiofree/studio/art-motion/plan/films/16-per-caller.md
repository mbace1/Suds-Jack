# Per Caller (Coxon): DRAFT, 20 Oct, for the 00:50 window

Papercut, the Coxon set in clean light, 5 shots × 12 beats at 112 BPM (~32.1 s) + the station's sign-off slate.
Engine key `pc`, `papercut/per-caller/`, kit `scenes/pc_kit.js` (every scene registered inside it). Research:
`research-coxon-next.md` §1; idea: `IDEAS.md` (Per Caller). Preview: `previews/20-10-Per-Caller-DRAFT-en.mp4`.

**The one question:** *Can an AI call your cellphone about the election without asking?*

**The answer, in one sentence (copy.json `argument`, v3):** Not today: a political group has asked the FCC to let
AI-voiced political calls reach cellphones without consent. The FCC says it has no plans to act before Election Day,
and the proposed limit is three a month per caller.

## v3, 22 Oct: the ruling line went out of date

The approved v2 was **held on 22 Oct** before its 12:52 slot (`POSTED.md`): its fourth caption said "A ruling could
come before Election Day". On 19 Oct an FCC spokesperson told Reuters (David Shepardson) that no one at the agency had
shown interest in moving to an order on this or any of the petitions, and that there were no plans to do so.
Commissioner Gomez had said the agency could act within days, but she is one commissioner and the spokesperson speaks
for the agency. Re-checked 22 Oct from search summaries; no ruling was found.

- **Caption 4, v3:** "Comments closed 19 October. / The FCC says it has no plans / to act [before Election Day]." The
  agency said no plans at all, so "before Election Day" is narrower and still true. It keeps the calendar shot as
  it was: 19 Oct crossed out, the page torn to November, 3 circled on the pop. Nobody is quoted. fi and ja follow
  (drafts, `native_read` false).
- **`post` copy** in en/fi/ja: the same change. The en post is 272 characters.
- Nothing else changed: same shots, same score, same punchline.

## The fact re-check (20 Oct 2026)

**How:** WebFetch failed DNS on every host tried (docs.fcc.gov, abcnews.com, usnews.com, huffpost.com,
thetelephony.co), and curl through the session proxy got a 403 on CONNECT for docs.fcc.gov, abcnews.com, wcax.com,
nclc.org, hawaiinewsnow.com, fastcompany.com and newsweek.com. So, as in the research, **no original page was
opened**; everything below is from WebSearch result summaries (five queries, 20 Oct). Nothing is quoted on screen.

| # | claim on screen | status | sources (search summaries, 20 Oct) |
|---|---|---|---|
| 0 | **Today**, an AI-voiced robocall to your cellphone needs your **consent** | **CONFIRMED.** FCC declaratory ruling FCC 24-17 (Feb 2024): AI-generated voices are "artificial" voices under the TCPA, so such calls to cellphones need prior express consent unless an exemption applies. Every report on the petition restates it ("Today that consent is still required"). | PBS NewsHour, Feb 2024 https://www.pbs.org/newshour/politics/fcc-bans-ai-generated-voices-in-robocalls-that-can-deceive-voters · TheTelephony https://www.thetelephony.co/blog/fcc-political-ai-robocall-waiver-cellphones |
| 1 | A **political group** has **asked** the FCC to drop that rule for **political calls** | **CONFIRMED.** Club for Growth filed an expedited petition on 31 Aug 2026: a limited waiver of 47 CFR § 64.1200(a)(1)(iii) and an exemption from 47 U.S.C. § 227(b)(1)(A)(iii), so noncommercial political calls using an artificial or prerecorded voice, **including an AI-generated voice**, can reach wireless numbers **without prior express consent**. Relief would be industry-wide, not only for the petitioner. The FCC's Consumer and Governmental Affairs Bureau opened it for comment on 4 Sep (Public Notice **DA 26-940**, CG Docket 02-278). | FCC notice https://docs.fcc.gov/public/attachments/DA-26-940A1.pdf (summary only) · FCC document page https://www.fcc.gov/document/cgb-seeks-comment-political-calls-and-p2p-systems-petitions · AP 7 Oct via US News https://www.usnews.com/news/politics/articles/2026-10-07/fcc-considers-allowing-more-political-robocalls-before-midterms-including-those-created-with-ai · TheTelephony (as above) |
| 2 | Comments **closed 19 October**; a ruling **could** come **before Election Day** (3 Nov) | **CONFIRMED.** The notice set comments for 5 Oct and replies for 19 Oct; ITIF's reply comments are dated 19 Oct and NCLC's opposition 5 Oct, so both windows ran. AP: the FCC could act as soon as late October, before the 3 Nov midterms. The notice itself sets no decision date, so the film says "could". | FCC notice (as above) · ITIF 19 Oct https://itif.org/publications/2026/10/19/reply-comments-to-the-fcc-regarding-the-club-for-growths-petition-for-expedited-waiver/ · NCLC 5 Oct https://www.nclc.org/wp-content/uploads/2026/10/2026.10.05_Comments_Opposing-AI-Calls-Petition.pdf · AP (as above), also HuffPost https://www.huffpost.com/entry/fcc-considers-allowing-more-political-robocalls-before-midterms-including-those-created-with-ai_n_6ac6f494e4b01d1704f7850a |
| 3 | The **proposed limit**: three AI calls a month, **per caller** | **CONFIRMED.** The petition's own condition: no more than **three calls from the same caller to a line in any 30-day period**, with an automated opt-out and a company-specific do-not-call list. "A month" stands for "any 30-day period". That every campaign, PAC and group gets its own three is how several outlets and the opponents read the same words (Techlicious, Hoodline, the Online Safety newsletter; NCLC). The film shows it only as the arithmetic of "from the same caller", never as anyone's intent. | TheTelephony (as above) · Techlicious https://www.techlicious.com/blog/fcc-political-robocalls-election-spam/ · Hoodline https://hoodline.com/2026/10/fcc-weighs-letting-ai-robocalls-flood-cell-phones-before-midterms/ · https://onlinesafety.substack.com/p/the-fcc-is-fast-tracking-political-calls-to-cell-phones |
| — | **Has the FCC ruled?** | **No ruling found** (three searches on 20 Oct for grant, deny or rule; the latest coverage still says the commission is weighing it and nothing has been granted). New since the research: Senate Minority Leader Schumer has asked the FCC to keep the rule (The Hill); not used. | The Hill https://thehill.com/homenews/senate/6158536-schumer-opposes-ai-robocall-petition/ |

**What the re-check changed:**
- The setup's answer needed a fact the brief did not list: **today it needs your consent** (the 2024 ruling). It is the
  first evidence caption, because without it "asked to drop" has nothing to drop.
- The cap is worded as the petition words it ("from the same caller … in any 30-day period"), so the punchline's
  "a month" is the plain-English round, and "per caller" is kept exactly.
- "Political calls", not "election calls": the request covers noncommercial political calls in general.
- **The group is not named.** "A political group" reads clearly; naming it would add a name and a party reading for no
  gain. The tag carries the FCC docket for anyone who wants to look it up.
- The landline comparison (already legal without consent) is **not used**: the film is clear without it.
- Re-check on the morning of posting: if the FCC rules before the film airs, the film is wrong in its tense and must
  not go out as is.

## Shots (5 × 12 beats, 112 BPM ≈ 32.1 s, + 3 s slate)

| # | id | role | caption (en) | what we see (no words needed) | cues |
|---|---|---|---|---|---|
| 1 | `pc_table` | setup | Can an AI call your cellphone / about the election / [without asking]? | Night, a kitchen in card: plum wall, gingham oilcloth, a mug, and a form headed **CONSENT** leaning on the tiles, unsigned. Outside the big window, an empty street under one sodium lamp. A phone stands dark in its stand. On the pop it lights up: **UNKNOWN**, buzzing, its cold light on the wall. Tag: USA · FCC · DA 26-940. | `ring` = pop |
| 2 | `pc_form` | evidence | Today, the rules say: / only with your [consent]. | Close on the form: CONSENT, "I agree to receive calls made with an AI voice on my cellphone", and an empty signature line. The phone, cropped at the edge, is still buzzing. On the pop an ochre **SIGN HERE** flag slaps onto the empty line, and the phone goes dark: no signature, no call. | `consent` = pop |
| 3 | `pc_desk` | evidence | A political group has [asked] / the FCC to drop that rule / for political calls. | The FCC: a long walnut desk with a brass **FCC** plate, three empty high-back chairs (no faces). A gloved hand slides a **PETITION** across the blotter (NO CONSENT NEEDED · FOR POLITICAL CALLS · TO CELLPHONES · MAX. 3 CALLS / 30 DAYS, and in small hand *per caller*). It lands on the pop. Above it a hand holds a rubber stamp, and it hovers: it dips, and pulls back. Tag: PETITION · 31.8.2026. | `slide` = line 1 start, `asked` = pop |
| 4 | `pc_cal` | evidence | Comments closed 19 October. / A ruling could come / [before Election Day]. | The wall calendar, OCTOBER 2026. A magenta marker crosses out 19 (**CLOSED**). The page tears away to NOVEMBER; on the pop the marker circles **3**, **ELECTION DAY**. The stamp still hovers over it; a wall clock ticks. | `closed` = end of line 1, `flip` = line 2 start, `nov` = pop |
| 5 | `pc_end` | punchline | The proposed limit: / three AI calls a month. / [Per caller]. | The kitchen again. One masked caller waits at the window holding a **3**; three call cards (**1/3, 2/3, 3/3**, banded in that caller's colour) sail in and land on the table, and the phone counts them. On "Per caller" the street lamps come on one by one: a queue of masked callers down the street and out of sight, every one holding a 3. Their cards come in threes, each set in its caller's colour; they bury the CONSENT form, pile against the phone and shove it, slowly, off the edge of the table. Tag: A REQUEST · NOT YET RULED. | `caller` = pop, `fall` = pop + 2.10 s, `hit` = pop + 2.84 s (both measured off the physics) |

**Punchline (kept as briefed):** *The proposed limit: three AI calls a month. Per caller.* The facts hold it: the cap is
the petition's own term, and "per caller" is its own wording.

## Palette: a kitchen at night, and an office by day, in card
Kitchen: plum wall `#2e2232`, cream tiles `#d6cfbb`, gingham oilcloth (cream `#e9e0c8`, mustard `#c99a2e`), an ochre
mug; the night street in teal-black `#0a1114` → `#18252b` under sodium lamps `#f2b24c`. The phone's light is the one
cold colour, mint `#c9f2dc`. The callers' masks are the sticker colours that carry no party: yellow, lime, orange,
pink, purple, magenta, ochre, green, cream (never red or blue); coats in muted browns and greens. The FCC: sage
panelling `#33433b`, walnut `#4f3220`, a green leather blotter, brass `#c9a24a`, empty dark-brown leather chairs. The
calendar's band and the SIGN HERE flag are the house ochre `#e3a33a`; the marker is the house magenta `#f0027f`.

## The motion technique that carries the twist
**PHYS** (matter.js 0.20.0, `scenes/vendor/matter-0.20.0.min.js`, as `ml_pile` in `scenes/ml_kit.js`): 21 call cards
with weight, three from each of seven callers, thrown in from the window, piling up and shoving the phone off the
table. The simulation is a pure function of the time since the pop word "Per", so the cards land at the same offsets
from the word in every language; it re-simulates from zero whenever time goes back. While the phone still stands on
the table it can only creep (≤ 115 px/s), so the push reads as the pile's weight rather than one card's hit, and a
hair's difference in how one card lands cannot turn into a jump. A card has six times a flat sheet's inertia, so it
tumbles less, and since a rectangle turned half a turn fills the same space, every card is drawn the right way up: the
1/3, 2/3, 3/3 stay readable however they land. The landing times, the fall and the hit are read off
the same code by `node pc_phys_test.mjs scenes/pc_kit.js` (scratch tool) and written into `score.py`, so every card
that lands gets its own paper tap.

## Risks and how the film handles them
- **"Allowed" is never said or shown as fact.** Captions say *asked*, *could*, *proposed*. The stamp never lands, in
  shot 3 or 4. Shot 5 carries the tag **A REQUEST · NOT YET RULED** while the pile falls.
- **"Per caller" is arithmetic, not intent.** The cards say 1/3, 2/3, 3/3 for each caller; nothing says why anyone
  would queue. No group is drawn as a villain: the callers are generic masked Tokos, the hand with the petition is a
  plain grey sleeve.
- **No party colours, no party.** No red or blue anywhere (the phone's decline key is grey); the group is unnamed.
- **Real people have no faces:** the commissioners are three empty chairs and one hand.
- **Scope:** the landline rule is not mentioned, so the film does not claim all political robocalls need consent today;
  it says only what is true for cellphones.
- **The FCC plate** is a label (as *BRIEFING FOR CONGRESS* in The Day After), not a seal or a logo.
- **Native read:** fi and ja are drafts (`native_read` false).

## What looking changed (draft v1)
- **Upside-down cards.** The first pile had a third of its cards flipped, so the 1/3 · 2/3 · 3/3 arithmetic read as
  noise; cards now tumble less and are drawn the right way up (same shape, so the physics is untouched).
- **The pile buried the queue.** It climbed to the window and hid the callers; with less tumbling it lies flatter and
  stops at the sill, so the queue stays in sight to the end.
- **The phone vanished behind the pile as it went over**, which is the twist's payoff; it is now drawn over the cards.
- **SIGN HERE ran off the frame**; it now points at the middle of the signature line.
- **The calendar** was small and its marks sat off the dates; it is 20 % bigger, and the cross and the circle are on
  the numbers.
- **Node and the browser agree**: the phone went over the edge at τ = 2.100 s in both, so the cue sheet's taps, the
  whistle and the floor hit land on the picture.
