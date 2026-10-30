# 33 · The Round Trip (RFH global/Coxon): papercut, VIRAL cut (stills checkpoint, 30 Oct)

**Owner, 30 Oct:** picked "The Round Trip (Anthropic IPO)" from the global-scout list (with Short Supply and Grade Your
Own Homework). This is a **stills checkpoint only**: no full build, nothing posted.

**ANTHROPIC DISCLOSURE (owner's rule, 23 Oct):** the film is about Anthropic and was made with Anthropic's tools.
- **On screen:** a tag, MADE WITH ANTHROPIC'S TOOLS, on the hook, from 0.1 s to ~2.9 s (en). In fi: TEHTY ANTHROPICIN
  TYÖKALUILLA. In ja: Anthropicのツールで制作.
- **Post copy:** "Made with Anthropic's tools."
- **The wording is the owner's to approve.**
- Anthropic is covered like any other company: no softening and no praise. The structure is the story.

- Kit: `scenes/rtr_kit.js`; film: `papercut/the-round-trip/{film.json, copy.json, score.py}`.
- Stills sheet: `previews/30-10-RFH-The-Round-Trip-stills.jpg`. It holds seven en stills and one fi still:
  - en at 0.05, 2.2, 5.6, 9.8, 13.6, 19.0 and 22.6 s;
  - the last is fi at 14.5 s, to show the longest stamp word.
- Stills script (scratch): `rtr_stills.sh <lang> <global times>` runs four steps:
  1. resolves the plan;
  2. stages the kit into the engine;
  3. renders each still in its shot;
  4. runs the real caption pass over them, so the sheet shows the captions exactly as the film will.

## Pitch

Two of Anthropic's investors, Google (Doodle, the station's parody) and Amazon, are also the suppliers its IPO filing
commits it to buy computing from: at least $114.5B and $110B, owed even if the computing goes unused. The money goes
in, and comes back. **No wrongdoing is claimed.** It is a structure, documented in the company's own filing.

## Fact table (search summaries of named outlets citing the S-1; the S-1 itself NOT opened)

EDGAR was tried once from this session. `curl` to the S-1 URL failed: `CONNECT tunnel failed, response 403` (the proxy
blocks `www.sec.gov`). **Every line below is as reported by outlets quoting the filing, not read from it.**

| claim | where it is used | status | sources |
|---|---|---|---|
| S-1 public 26 Oct 2026, Nasdaq "ANT" | fileTag, clipLabel2, post | REPORTED (several outlets agree) | [The Next Web](https://thenextweb.com/news/anthropic-ipo-filing-nasdaq-ant-s-1), [Bernama](https://bernama.com/en/world/news.php?id=2626193), [EDGAR, not reachable](https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm) |
| Google and Amazon invested: each will hold more than 5% after conversion, in non-voting Class N shares; the share counts are blank in this version | caption 1, INVESTOR plates | REPORTED, citing the risk factors. **No percentage on screen.** | [Bernama](https://bernama.com/en/world/news.php?id=2626193), [The Next Web](https://thenextweb.com/news/anthropic-ipo-filing-nasdaq-ant-s-1), [GeekWire](https://www.geekwire.com/2026/whos-getting-anthropics-compute-spending-ipo-filing-shows-where-the-tech-giants-really-stand) |
| Minimum compute commitments: at least $114.5B to Google (through Jul 2033) and at least $110.0B to Amazon (through Apr 2036) | caption 3, price tags | REPORTED (GeekWire, Motley Fool 29 Oct, ppc.land). **Conflict:** Reuters/Yahoo gave $111.1B for Google, from the June confidential draft. The public-S-1 figure is taken. | [GeekWire](https://www.geekwire.com/2026/whos-getting-anthropics-compute-spending-ipo-filing-shows-where-the-tech-giants-really-stand), [Motley Fool, 29 Oct](https://www.fool.com/investing/2026/10/29/alphabet-amazon-spacex-microsoft-broadcom-and-amd/), [ppc.land](https://ppc.land/amazon-google-and-microsoft-hold-269bn-of-anthropic-compute-contracts/), [Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/anthropic-1-518-billion-commitment-165731037.html) |
| Microsoft: at least $44.9B | post copy only | REPORTED (GeekWire, Motley Fool). **Conflict:** Reuters gave $31.4B, from the draft. Microsoft's investor status is not checked here, so Microsoft is not a tower. | as above |
| Owed even if unused: the Google and Amazon commitments are payable regardless of actual usage; a shortfall is paid as the difference, subject to contractual adjustments | caption 4, UNUSED stamps | REPORTED. **Quote the shortfall wording only from the filing itself.** | [ppc.land](https://ppc.land/amazon-google-and-microsoft-hold-269bn-of-anthropic-compute-contracts/), [GeekWire](https://www.geekwire.com/2026/whos-getting-anthropics-compute-spending-ipo-filing-shows-where-the-tech-giants-really-stand) |
| Totals ($245B / $269.4B / $518B / $602B and more) | **nowhere** | outlets count different things | not used |
| H1 2026 revenue $16.3B; net loss $80.7B (mostly a non-cash $72.4B fair-value charge) | not used | REPORTED | [aiweekly](https://aiweekly.co/alerts/anthropic-s-1-shows-163b-h1-revenue-25-from-two-customers-and-807b-non-cash), [HackerNoon](https://hackernoon.com/anthropics-s-1-shows-$163b-in-half-year-revenue-a-900percent-nrr-and-an-$807b-loss-that-mostly-isnt) |
| "Their money comes back" | caption 5 | the station's line, true as stated of the structure: the investors are also the suppliers paid. No claim that the same dollars return, and no wrongdoing claimed. | — |

## Shot table (140 BPM; en 23.1 s plus the sign-off)

| # | role | caption (en) | picture | tag |
|---|---|---|---|---|
| 1 rtr_hook (8 beats) | setup | Doodle and / Amazon [invested] / in Anthropic. | **Frame 0:** two money bags already falling, one from each tower (DOODLE: the parody wordmark; AMAZON: plain type), into a cream box marked ANTHROPIC. They land on "invested" and INVESTOR plates pop up on both towers. | **MADE WITH ANTHROPIC'S TOOLS** (disclosure) |
| 2 rtr_owe (9) | evidence | Its IPO filing: / it must pay them / for [computing]. | An S-1 sheet slides up out of the box. On "computing", chips stream down from the towers into the box and coins start back up the other side of each loop. SUPPLIER plates join INVESTOR. | ANTHROPIC S-1 · PUBLIC 26.10.2026 |
| 3 rtr_sum (10) | evidence | At least [$114.5B] / to Doodle, / $110B to Amazon. | Price tags swing down from the roofs: ≥ $114.5B on Doodle's tower on the pop word, then ≥ $110B on Amazon's on line 3. | MINIMUM COMMITMENTS · AS REPORTED |
| 4 rtr_idle (9) | evidence | Owed even if / it goes [unused]. | The towers' lights go out, but the coins keep climbing. UNUSED is stamped on both towers. | — |
| 5 rtr_end (18) | punchline | Their money / comes [back]. | The lights come back and the whole round trip runs: bags down one side of each loop, coins up the other, on a bold marching track. A coin rings into Doodle's tower on "back". The clipping rises: ANTHROPIC IPO FILING · 26.10.2026 / ROUND TRIP. | — |

- **Loop:** frame 0 (bags falling into the box) and the last frame (the same circuit running) are the same set and the
  same framing.
- **fi and ja:** drafts, not native-read.
  - fi: 24.4 s, with holds of 0.43 s on beats 1–3. Beat 3 says "väh." for vähintään, to fit 800 px.
  - ja: 29.6 s, with long holds (2.6 s on the hook). Shorten the ja copy before a ja master.
- **Pre-flight:** every line is within 800 px and inside the safe area in all three languages.
- **Score:** `score.py` checked against the planned events at −14.0 LUFS, −4.3 dBTP, 5 pass, 0 fail.

## Post copy (en, 235 characters)

> Doodle and Amazon invested in Anthropic. Its IPO filing commits it to buy at least $114.5B of computing from Doodle and
> $110B from Amazon, owed even if unused (and $44.9B from Microsoft). Made with Anthropic's tools. Who's paying whom?

## Risks and decisions for the owner

1. **The filing has not been read directly.** EDGAR is blocked from this session (proxy 403).
   - Every number is from outlets citing the S-1, and they conflict: Google $114.5B vs $111.1B; Microsoft $44.9B vs
     $31.4B.
   - **Recommendation:** do not post until someone opens the S-1 (or `www.sec.gov` is allowed in the session's network
     settings) and checks three things:
     - the two minimums;
     - the "regardless of usage" wording;
     - the >5% Class N line.
2. **The disclosure wording:** MADE WITH ANTHROPIC'S TOOLS, on the hook for about 2.8 s and in the post copy. The
   owner approves the wording and where it sits.
3. **Doodle vs Google:** the house convention puts Google as Doodle while Amazon (and Microsoft, in the post) are real
   names. That mix may read oddly. The alternative is "Google" throughout this one film. Owner's call.
4. **Neutrality:** the film is about the maker of the tools used to make it. It treats Anthropic as any company: the
   structure is shown plainly, with no softening and no praise. "Their money comes back" claims no wrongdoing.
5. **Peg:** the S-1 went public on 26 Oct and the listing is reportedly mid-November. A price-range amendment would be a
   second peg, with a re-check of the figures.

## Owner, 30 Oct: "use Google"

Google is named plainly, like Amazon and Microsoft, in the captions, on its tower (plain type, no logo) and in the post.
The Doodle parody is not used in this film. Still HELD until the S-1 itself is read. The disclosure wording has not
been ruled on yet.
