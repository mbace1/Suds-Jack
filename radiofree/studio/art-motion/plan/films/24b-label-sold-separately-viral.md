# Label Sold Separately (Coxon 12), VIRAL CUT v1, 23 Oct, for the 00:50 window

Owner, 23 Oct, after asking for a viral version of Doodle 5: "Test other 2 as well and rest after". This is one of
the two test films. It is built from the v1 draft (`plan/films/24-label-sold-separately.md`), which stays as it is.

- Engine key `lssv`, `papercut/label-sold-separately-viral/`.
- Scenes: `lssv_*`, appended to `scenes/lss_kit.js` as a third block. v1's 378 lines are byte-identical.
- 39 beats at 124 BPM ≈ 19 s, plus the papercut sign-off.
- Captions at the BIG size (82 px em, `captionSize: "big"`).

## The viral format (shared by the three viral cuts)

1. **The hook IS the first frame.** No setup question first. Frame 1 shows the shock and reads with the sound off in
   under a second.
2. **~18–22 s of film + the papercut sign-off.** About five short beats at ~120–128 BPM (~8 beats a shot) or fewer
   shots. Short, big, high-contrast captions (≤ ~7 words a line, 1–2 lines) that still pass the pipeline's
   reading-time checks.
3. **One escalation beat that makes it shareable.**
4. **The punchline** stays, sharpened for speed.
5. **A loop.** The last frame hands back into the first (a matching composition), so replays are seamless.
6. **Sound:** a hit on frame 1, more driving than v1.
7. **Post copy** (`post.en`): hook-first, ≤280 characters, ending with a question that invites replies.

## How this film does it

| # | id | beats | caption (en, BIG) | picture | cues |
|---|---|---|---|---|---|
| 1 | `lssv_hook` | 6 | US midterms: / spot the [AI] ad. | **Frame one:** the wall of ten TV sets, centred, every masked candidate mid-speech, nothing saying which is AI. The whole frame lands at 1.03 and settles. | `hit` 0.0 |
| 2 | `lssv_all` | 6 | Trick question. / [All ten] are. | The same wall. On the pop every screen flares with the AI sparkle at once (big, then settling, left to right with the blips) and stays lit; a white flash and a punch. | `all` = pop |
| 3 | `lssv_count` | 8 | Over [$137M] / on 220 like them. | The ten carry on exactly where the wall had them, the shelves drop away, and the camera pulls back (0.9 s) while the other 210 pop in around them in rings. The 220 stand **11 across and 20 down** (v1's 20 × 11 filled a third of a vertical frame and ran under the IG rail). The counter rolls up and lands on $137,000,000 on the pop. Tag: WESLEYAN MEDIA PROJECT · 15.10.2026. | `roll` 0.15, `count` = pop |
| 4 | `lssv_ripple` | 8 | Labelled as AI: / about [3 in 10]. | **The escalation:** a ripple runs out from the home ten and slaps a MADE WITH AI sticker on 66 of the 220 (30%), landing on the pop; then the 154 with nothing go dark. Tag: ~3 IN 10 LABELLED · WESLEYAN. | `rip` = line 1, `three` = pop |
| 5 | `lssv_end` | 11 | Ten AI ads. / About three / [said so]. | The wall again, three labelled. On "About three" the red marker rings them; on "said so" the seven stickers nobody used flutter down (paper, ~1.4 s) past the seven bare screens and out of the frame. **The loop:** the frame eases back to the opening one (1.03, camera centred), so the last frame hands into frame one. | `mark` = line 2, `said` = pop, `fall` = pop + 0.15 |

- **Hook in words:** "US midterms: spot the AI ad." It has no question set-up before it. "US midterms:" is readable by about 0.15 s and the whole line by about 0.8 s. Frame 0 itself is the picture only (the wall of ten masked candidates mid-speech): a caption cannot start before 0 s, because the sidecar writer would print a negative SRT time. For a cover still, pick ~1 s.
- **Post (en, 236 characters):** "Spot the AI ad. Trick question: all ten are. In the US midterms, about 220 ads made at
  least partly with AI drew over $137M in airtime by 11 Oct, per the Wesleyan Media Project. About 3 in 10 said so.
  Would you have known? #Midterms #AI"
- **Dropped for speed:** the state-law/federal shot (it is still in v1 and could go in a reply).
- **Sound:** 124 BPM Coxon palette:
  - **Frame one:** a civic hit (bass drum, timpani, snare, crash) and a Cm brass stab, 20 ms in. On the very first sample it rang the sign-off join's AAC re-encode to +0.2 dBTP.
  - **Throughout:** a bass drum on every beat, the snare on two and four, and a roll into every cut.
  - **Stingers:** a sparkle run on "All ten"; a counter rattle and a stamp; a rush of ticks for the ripple; squeaks;
    the deadpan button; paper flutters for the falling stickers.
  - **The last bar:** a roll arrives at the end, so the loop comes round on the hit.

## Fact re-check (23 Oct, search excerpts only)

Nothing is newer than Wesleyan's 15 Oct release (data through 11 Oct): more than $137 million on 220 ads made at least
partly with AI, in 34 states. Gizmodo gives 27% with an AI disclaimer, and the New York Times (via summaries) about 70%
with none. "About 3 in 10" stands, and the ripple's 66 of 220 is 30%. No figure from the 2024 cycle is used: it was
single-source.

## Risks

- "All ten are" is true of the film's ten by construction: they stand for Wesleyan's ~220. The caption calls them AI
  ads, and "at least partly" is in the argument and the post, not on screen. An editor may want "at least partly" in the
  "spent" line.
- No party, no party colours, no candidates. The 81% partisan split is left out on purpose.
- The loop is a hand-back of composition, not identity. The last frame has three stickers and three rings, and frame
  one has none, so a replay shows the clean wall again.
- The papercut sign-off follows the film, so a platform's own loop goes through the sign-off.
- fi/ja are drafts (`native_read` false).
