# Break Glass in Emergency (The Brink 2), VIRAL CUT v1, 23 Oct

Owner, 23 Oct, after asking for a viral version of Doodle 5: "Test other 2 as well and rest after". This cut is one of
"the rest". It is built from the v1 draft (`plan/films/19-break-glass.md`), which stays as it is.

The **clarity rule** (owner, 23 Oct, after the two test cuts came back for "clarity of messaging") applied before the
first review: every caption has to make sense to a cold viewer, saying plainly what, who and why, with no riddles or
insider shorthand. The hook can be punchy, but the next beat must explain it.

- **Where it lives:** engine key `bge` (the same kit), files in `papercut/break-glass-viral/`.
- **Scenes:** `bgev_*`, appended to `scenes/bge_kit.js` after v1's last scene. Lines 1–470 are byte-identical to the
  draft's kit (checked against `03256a8e`), so v1 renders exactly as before.
- **Length:** 45 beats at 124 BPM = 22.26 s, plus the papercut sign-off (25.3 s in all).
- **Captions:** the BIG size (`captionSize: "big"`). Every line is at most 800 px wide.
- **Score:** the RFH bed at 124 BPM (`RFHV`), at level 2 from the first beat, as in the other viral cuts.

The format is the one the three earlier viral cuts share (`plan/films/23b-ends-in-3-viral.md`):
- the hook is the first frame;
- about 21 s long;
- one escalation beat;
- a loop;
- a hit near the start;
- a hook-first post that ends in a question.

## How this film does it

**Frame 0 (the hook).**
- **What is on screen:** the case as it is now, with the glass whole and **NEVER USED** stamped in red on a paper label
  stuck to it.
  - The case is snowed over, with icicles, a cobweb from the hammer's chain and dust on the glass.
  - Its tag reads 2025 struck, 2026 struck and 2028 ringed.
  - The corner tag reads FINLAND · TEMPORARY MEASURES ACT from frame 0.
- **With the sound off,** the first frame already reads *IN EMERGENCY BREAK GLASS / NEVER USED*, before any caption
  word is drawn.
- **At 35 ms, the hit:** a thump and a knock, a camera kick (zero on frame 0, so the join itself does not jump) and snow
  knocked off the case's top.
- **On "never used" (0.94 s)** the stamp lifts and comes down again, with a flash, a shake and a press-stamp sound.

**The next beat explains the hook (shot 2).** *In an emergency, Finland may **stop** asylum claims at its Russian
border.*
- That covers what the law is for, who uses it and where.
- **The 2024 corner tag** (IN FORCE 22.7.2024 · ONE YEAR) gives the date and the term.
- **What we see:** the case new and clean, its lamp clicking on at "In an emergency,", and the tag dropping on at the
  end of the sentence: VALID TO 2025.

**The escalation (shot 3), one tag row per caption line.**
- *Set to end in **2025**.* The marker strikes 2025.
- *Extended to **2026**.* It writes 2026.
- *Proposed: **2028**.* It strikes 2026 and writes 2028, with a step in, a shake and a flash.
- Then the days sweep the wall and the snow piles up.
- **Whose proposal:** the corner tag, GOVERNMENT PROPOSAL · 3.9.2026, comes up before "Proposed:".

**Shot 4.** *No changes at all. A committee of MPs **agreed**.*
- The marker rings NONE on the proposal (CHANGES TO CONTENT: NONE).
- On "agreed" the rubber stamp comes down and two DISSENT cards slide in.

**The punchline (shot 5).** *Never used. / Still **temporary**. / Proposed till 2028.*
- NEVER USED comes down on "Never used.", and the glass rings on "temporary" (still whole).
- The marker rings 2028 on line 3, while the corner tag reads PLENARY VOTE: STILL TO COME.

**The loop.**
- Over the last 0.7 s the view settles onto frame 0's (`VIEW0`). The FINLAND corner tag fades back in for the last
  0.45 s, and the punchline caption is gone 0.2 s before the end.
- The last frame is frame 0's state: the stamp, the tag, the ring, the lamp, the hammer.
- The snowfall runs on one clock across the join (`SNOW0`), so the last frame is one step of snow before frame 0. The
  tag's idle swing and the hammer's are phased to pass through zero at the join.
- **Measured:** the last frame against frame 0 differs in 0.6 % of pixels, all of them falling snow, the tag's idle
  swing and compression edges.

## Shots (5 shots, 45 beats at 124 BPM = 22.26 s, + the sign-off)

| # | id | beats | role | caption (en, BIG) | what we see | cues |
|---|---|---|---|---|---|---|
| 1 | `bgev_hook` | 8 | hook | Finland's / border law: / [never used]. | **Frame 0:** the aged case, NEVER USED on the glass, the tag with 2025 and 2026 struck and 2028 ringed. A hit at 35 ms knocks snow off the top; on the pop the stamp comes down again. Corner tag: FINLAND · TEMPORARY MEASURES ACT, from frame 0. | `hit` 0.035, `stamp` = pop |
| 2 | `bgev_year` | 11 | what, who, why | In an emergency, / Finland may [stop] / asylum claims at / its Russian border. | 2024: the case new and clean. The lamp clicks on at the end of line 1, the glass glints on "stop", and the tag drops on at the end of the sentence (VALID TO 2025). Corner tag: IN FORCE 22.7.2024 · ONE YEAR. | `lamp` = line 1, `stop` = pop, `tag` = line 4 |
| 3 | `bgev_again` | 9 | escalation | Set to end in 2025. / Extended to 2026. / Proposed: [2028]. | One tag row per line: 2025 struck, 2026 written, then 2026 struck and 2028 written on the pop. A step in on each new year; the days sweep the wall and the snow piles up. Corner tag: GOVERNMENT PROPOSAL · 3.9.2026. | `strike1` = line 1, `write1` = line 2, `write2` = pop |
| 4 | `bgev_desk` | 9 | evidence | No changes at all. / A committee of / MPs [agreed]. | The proposal on the desk: NONE ringed at the end of line 1; the rubber stamp on "agreed"; two DISSENT cards. Corner tag: COMMITTEE STATEMENT · 16.10.2026. | `none` = line 1, `stamp` = pop |
| 5 | `bgev_tail` | 9 | punchline | Never used. / Still [temporary]. / Proposed till 2028. | The aged case: NEVER USED stamped at the end of line 1, the glass gleaming on "temporary", 2028 ringed at the end of line 3. Corner tag: PLENARY VOTE: STILL TO COME, then FINLAND again; the view settles onto frame 0's. | `stamp` = line 1, `gleam` = pop, `mark` = line 3 |

## The fact re-check (23 Oct 2026)

v1's table (`plan/films/19-break-glass.md`, re-checked 22 Oct) and `research-brink-next.md` §2 hold the sources. Every
claim on screen:

| claim | sources |
|---|---|
| In force 22 Jul 2024 for one year | v1 table |
| Never applied | the Finnish Government's situation page |
| Extended on 4 Jun 2025 to 31 Dec 2026 (168–29) | v1 table |
| Proposed on 3 Sep 2026 to 31 Dec 2028, no change to the content | v1 table |
| The Constitutional Law Committee's statement of 16 Oct, two members dissenting | v1 table |

**What the law is for (new in this cut, for the clarity rule).** The research pack puts it this way: "in a restricted
area and as a last resort, it lets the government limit the receiving of asylum applications at the border".
- **On screen that becomes** *In an emergency, Finland may stop asylum claims at its Russian border.*
- **"May"** keeps it a power. It is not a claim that the power is in use, and the hook says it never has been.
- **"Russian border"** is where it applies: the eastern land border, closed since December 2023.
- **Not used:** the critics' "pushback law" and "turn back" wording, and any claim about the threat.

**Plenary vote: still to come.** WebSearch on 23 Oct (search summaries only; no page was opened) found no plenary vote on
the 2026 proposal.
- The results were the government proposal of 3 Sep and the June 2025 vote (168–29).
- **So the copy keeps** *Proposed till 2028.*, and the last shot's corner tag reads PLENARY VOTE: STILL TO COME.
- **If the vote has passed on the morning of posting:**
  - The punchline's third line becomes *Now till 2028.* (fi *Nyt 2028 loppuun.*, ja *今は 2028年まで。*).
  - The corner tag becomes the vote.
  - The post's "The vote is yet to come." goes.
  - Shot 3's *Proposed: 2028.* can stay as history.
  - Rebuild after any of these changes.

## Decisions

- **The stamp is on the case from frame 0, not stamped at 0.3 s.**
  - Frame 0 reads with the sound off.
  - The loop is honest: shot 5 stamps the case, and the film comes round to the stamped case.
  - In the hook the stamp comes down a second time, on the caption's "never used", so the word and the picture land
    together.
- **The stamp is on a paper label.** Red ink straight on the booklet clashed with its small print (INSTRUMENTALISED
  MIGRATION 2024 showed through the letters). The label covers that, and "ACT ON TEMPORARY MEASURES TO" stays readable
  above it.
- **"Border law"** describes the Act, and its nickname is never used. The corner tag names it TEMPORARY MEASURES ACT, as
  v1's proposal on the desk does. NEVER USED is a prop in English in every master, like the plate.
- **The framing has a hard envelope.** A three-line caption ends at y 470 and the corner tag starts at y 1564. Between
  them, the snowed case and its tag fit only up to about 1.06×.
  - So there are no big push-ins. The movement is kicks, steps of +3 % on each new year, a shake and flashes.
  - A true close-up on the tag would put the plate behind the captions until about 1.8×, where the 1× sprites go soft.
- **The stance is v1's:** sober, no people at the border, no flags, no party colours, nothing that argues the threat,
  no quotes. fi/ja are drafts (`native_read: false`).
- **The loop joins on the film master** (no sign-off), as in the other viral cuts:
  `previews/23-10-Break-Glass-VIRAL-loop-en.mp4`.

## Post copy (`post` in copy.json)

en (279 characters): *Finland's emergency border law has never been used. Since 2024 it lets Finland stop asylum claims at
its Russian border. Meant for one year, it got extended to 2026. Now 2028 is proposed, unchanged, and a committee of MPs
agreed. The vote is yet to come. When does temporary end?*

fi (274) and ja (134) are drafts.

## Build

```
uv run -q --with numpy --with soundfile --with matplotlib python pipeline/build.py papercut/break-glass-viral --lang en \
  --fonts $P/lib/fonts --engine $P --jobs 1 --signoff previews/signoff-papercut.mp4 --out $S/build-bgev
```

**Result (23 Oct): PASSED.**
- **Text:** 82 pass, 13 warn, 0 fail. The warnings are the fi/ja native reads, and fi/ja needing more time than this en
  master gives them (fi and ja would need their own masters).
- **Sound:** 5 pass, 0 fail. −14.1 LUFS, −3.1 dBTP, 24/24 cues covered. The first sample is silent, and the frame-1 hit
  peaks at 44 ms (−4.2 dBFS).
- **Previews:**
  - `previews/23-10-Break-Glass-VIRAL-en.mp4` (25.3 s with the sign-off, 4.4 MB, −14.3 LUFS)
  - `previews/23-10-Break-Glass-VIRAL-loop-en.mp4` (22.3 s, film only, 4.0 MB, −14.1 LUFS)

**Fixes after looking at the frames:**
1. **The first script was rewritten for the clarity rule.** "Unchanged." and "A committee agreed." were shorthand,
   and nothing said what the law is for.
   - Shot 2 now says what the law is for, who uses it and why.
   - Shot 3 is one line per year.
   - Shot 4 says "No changes at all." and "A committee of MPs".
   - The first build had also failed the 800 px line width on three lines.
2. **The stamp went onto a paper label** (see Decisions).
3. **Shot 2's push-in put the fourth caption line on the BREAK GLASS plate.** The shot now holds a fixed framing,
   shifted down 25 px.
4. **Shot 3 zoomed toward the tag (to 1.58×)** and drove the plate behind the captions and the station bug. It now
   steps in only to 1.07×, with the snowcap capped.
5. **The hook's and the tail's push-ins** lifted the snowcap into the third caption line. `VIEW0` went from 1.04× to
   1.0×, 15 px lower, and the push-ins stay inside the envelope.
6. **The NONE ring** cut the colon of "CONTENT:".
7. **The DISSENT cards** reached x 955, in the IG rail. Both cards were moved 54 px left.
8. **The PLENARY VOTE corner tag** was up for only 0.6 s, under the marker hand. It now runs with "Proposed till 2028."
9. **Shot 2 needed a one-beat hold** for its four-line caption, so it is declared as 11 beats and no hold is needed.

## Risks

- **"Finland may stop asylum claims"** compresses a restricted, last-resort power into seven words. The research
  pack's wording is "limit the receiving of asylum applications at the border". If a reviewer wants it closer, say
  *Finland may limit asylum claims* (check the line width).
- **The marker hand passes through the IG rail** (x ≥ 930) while it writes in shots 3 and 5, for about two seconds
  each. It hides nothing that matters.
- **The plenary vote** must be re-checked on the morning of posting (see above).
- **fi/ja are drafts:** not read by a native speaker, and too long for this master's timing.
