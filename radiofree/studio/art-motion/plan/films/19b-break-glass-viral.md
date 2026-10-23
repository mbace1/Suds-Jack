# Break Glass in Emergency (The Brink 2), VIRAL CUT v1, 23 Oct

Owner, 23 Oct, after asking for a viral version of Doodle 5: "Test other 2 as well and rest after". This is one of the
rest. It is built from the v1 draft (`plan/films/19-break-glass.md`), which stays as it is.

- Engine key `bge` (the same kit), `papercut/break-glass-viral/`.
- Scenes: `bgev_*`, appended to `scenes/bge_kit.js` after v1's last scene. No v1 line changed, so v1 renders exactly as
  before.
- 44 beats at 124 BPM = 21.3 s, plus the papercut sign-off.
- Captions at the BIG size (`captionSize: "big"`).
- The score is the RFH bed at 124 BPM (`RFHV`), level 2 from the first beat, as the other viral cuts.

The format is the one the three earlier viral cuts share (`plan/films/23b-ends-in-3-viral.md`): the hook is the first
frame, about 21 s, one escalation beat, a loop, a hit near the start, a hook-first post ending in a question.

## How this film does it

**Frame 0 (the hook).** The case as it is now: snowed over, icicles, a cobweb from the hammer's chain, dust on the
glass, the glass whole, and **NEVER USED** stamped across it in red. Its inspection tag already reads 2025 and 2026
struck, 2028 ringed, and the corner tag says FINLAND · TEMPORARY MEASURES ACT from frame 0. With the sound off, the
first frame says *break glass in emergency / never used* before any caption word is drawn.
- At 35 ms, the hit: a thump and a knock, a camera kick, snow knocked off the case's top.
- On "never used" (0.72 s) the stamp lifts and comes down again, with a red flash, a shake and a press-stamp sound.
- Caption: *Finland's border law: / **never used**.* (5 words.)

**The escalation (shot 3).** Close on the tag, and fast: 2025 is struck and **2026** written by the end of line 1;
2026 is struck and **2028** written on the pop, 0.9 s later. The view steps in on each new year, and then the days
blow past the wall while the snow piles up. Corner tag: GOVERNMENT PROPOSAL · 3.9.2026.

**The punchline (shot 5).** The case again. NEVER USED comes down on "Never used.", the glass rings on "temporary"
(still whole), and the marker rings 2028 on line 3. Caption: *Never used. / Still **temporary**. / Proposed: until
2028.*

**The loop.** Over the last 0.7 s the view settles onto frame 0's exactly (`VIEW0`), and the last frame is frame 0's
state: the same stamp, tag, ring, lamp, hammer and snow. The snowfall runs on one clock across the join (`SNOW0`), and
the tag's idle swing and the hammer's are phased to be zero on both sides. The punchline caption is gone 0.2 s before
the end, and the FINLAND corner tag fades back in for the last 0.45 s, so the two sides of the join match. The frame-1
hit is a kick that is zero on its own frame and peaks just after it, so the join itself does not jump.

## Shots (5 shots, 44 beats at 124 BPM = 21.3 s, + the sign-off)

| # | id | beats | role | caption (en, BIG) | what we see | cues |
|---|---|---|---|---|---|---|
| 1 | `bgev_hook` | 8 | setup | Finland's border law: / [never used]. | **Frame 0:** the aged case, NEVER USED on the glass, the tag 2025 / 2026 struck, 2028 ringed. A hit at 35 ms (snow off the top); on the pop the stamp comes down again. Corner tag: FINLAND · TEMPORARY MEASURES ACT, from frame 0. | `hit` 0.035, `stamp` = pop |
| 2 | `bgev_year` | 9 | evidence | Passed in 2024 / for [one year]. | Back to 2024: the case new and clean, the lamp clicking on as we arrive; on "one year" the tag drops on: VALID TO 2025. Slow push-in. Corner tag: IN FORCE 22.7.2024 · ONE YEAR. | `tag` = pop |
| 3 | `bgev_again` | 9 | evidence | Extended to 2026. / Now proposed: / [2028]. | **The escalation.** Close on the tag: 2025 struck, 2026 written by the end of line 1; 2026 struck, 2028 written on the pop; the view steps in on each; the days sweep the wall, the snow piles. Corner tag: GOVERNMENT PROPOSAL · 3.9.2026. | `write1` = line 1 end, `write2` = pop |
| 4 | `bgev_desk` | 9 | evidence | Unchanged. / A committee [agreed]. | The proposal on the desk, closer than v1: the marker rings NONE (CHANGES TO CONTENT: NONE) on "Unchanged."; on "agreed" the rubber stamp comes down; two DISSENT cards slide in. Corner tag: COMMITTEE STATEMENT · 16.10.2026. | `none` = line 1 end, `stamp` = pop |
| 5 | `bgev_tail` | 9 | punchline | Never used. / Still [temporary]. / Proposed: until 2028. | The aged case: NEVER USED stamped on "Never used.", the glass gleams on "temporary", 2028 ringed on line 3. Corner tag: PLENARY VOTE: STILL TO COME, then FINLAND again; the view settles onto frame 0's. | `stamp` = line 1 end, `gleam` = pop, `mark` = line 3 end |

## The fact re-check (23 Oct 2026)

v1's table (`plan/films/19-break-glass.md`, re-checked 22 Oct) holds the sources for every claim on screen: in force
22 Jul 2024 for one year; never applied; extended on 4 Jun 2025 to 31 Dec 2026; proposed on 3 Sep 2026 to 31 Dec 2028
with no change to the content; the Constitutional Law Committee's statement of 16 Oct, with two dissenting members.

**Plenary vote: still to come.** WebSearch on 23 Oct (search summaries only, no page opened) found no plenary vote on
the 2026 proposal: the results are the government proposal of 3 Sep and the June 2025 vote (168–29). So the copy keeps
**Proposed: until 2028.** and the last shot's corner tag reads PLENARY VOTE: STILL TO COME.
**If the vote has passed on the morning of posting,** the third line of the punchline becomes **Now until 2028.**
(fi *Nyt 2028 loppuun.*, ja *今は 2028年まで。*), the corner tag becomes the vote, and the post's "the plenary vote is
still to come" goes. Shot 3's "Now proposed: 2028." becomes "Then: [2028]." or stays as history; re-time if it changes.

## Decisions

- **The stamp is there on frame 0, not stamped at 0.3 s.** The brief's hook was a dusty, unbroken case with NEVER USED
  stamped on it. Having it on frame 0 makes the first frame read with the sound off, and it makes the loop honest: shot
  5 stamps it, and the film comes round to the stamped case. In the hook it comes down a second time, on the caption's
  "never used", so the word and the picture land together.
- **"Border law"** describes the Act. Its nickname is never used; the corner tag names it as TEMPORARY MEASURES ACT,
  as v1's proposal does.
- **NEVER USED is a prop in English in every master**, like the plate. The caption says it in each language.
- **"Unchanged."** stands for the proposal's "no changes to the content"; the bill on the desk says CHANGES TO CONTENT:
  NONE, and the marker rings it.
- **The stance is v1's:** sober, no people at the border, no flags, no party colours, nothing that argues the threat,
  no quotes. fi/ja are drafts (`native_read: false`).
- **The loop joins on the film master** (no sign-off), as the other viral cuts: `previews/23-10-Break-Glass-VIRAL-loop-en.mp4`.

## Post copy (`post` in copy.json)

en (237 characters): *Finland's temporary border law has never been used. Passed in 2024 for one year, extended to 2026,
now proposed until 2028, unchanged. A parliamentary committee agreed; the plenary vote is still to come. When does
temporary end? #Finland*

## Build

```
uv run -q --with numpy --with soundfile --with matplotlib python pipeline/build.py papercut/break-glass-viral --lang en \
  --fonts $P/lib/fonts --engine $P --jobs 1 --signoff previews/signoff-papercut.mp4 --out $S/build-bgev
```

Previews: `previews/23-10-Break-Glass-VIRAL-en.mp4` (with the sign-off) and `previews/23-10-Break-Glass-VIRAL-loop-en.mp4`
(the film only, for a platform that loops).

RESULT
