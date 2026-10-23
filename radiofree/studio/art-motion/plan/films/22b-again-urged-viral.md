# Again Urged (The Brink 3), VIRAL CUT v1, 23 Oct

Owner, 23 Oct, after asking for a viral version of Doodle 5: "Test other 2 as well and rest after". This is one of
"the rest". It is built from the v1 draft (`plan/films/22-again-urged.md`), which stays as it is.

- Engine key `au` (the same kit), `papercut/again-urged-viral/`.
- Scenes: `auv_*`, appended to `scenes/au_kit.js` after v1's last scene. No v1 line changed, so v1 renders exactly as
  before.
- 38 beats at 124 BPM = 18.4 s, plus the papercut sign-off.
- Captions at the BIG size (82 px em, `captionSize: "big"`).
- The score is the RFH bed at 124 BPM (`RFHV`, a subclass of `RFH`: same key, chords, room and mix).

## The viral format (shared with 23b, 24b and 25b)

1. **The hook IS the first frame.** No setup question first. Frame 1 shows the shock and reads with the sound off in
   under a second.
2. **~18–22 s of film + the papercut sign-off.** Short shots at 124 BPM; short, big captions that still pass the
   reading-time checks.
3. **One escalation beat that makes it shareable.**
4. **The punchline**, sharpened for speed.
5. **A loop.** The last frame hands back into the first.
6. **Sound:** a hit on frame 1 (35 ms in, never on sample 0), more driving than v1.
7. **Post copy** (`post.en`): hook-first, ≤280 characters, ending with a question that invites replies.

What changed from v1: v1 opened on a question ("Who can make the GPS jamming stop?") and put the facts after it. The
viral cut opens on the fact and the picture together, drops the chart shot (its "around the clock" now lands in the
hook), puts the three stamps on ONE letter so they pile up, and ends by tearing back into its own first frame.

## The fact re-check (23 Oct 2026)

**How:** WebSearch on 23 Oct, on top of v1's re-check the same day (`22-again-urged.md` holds the sources for rows 1–5;
nothing there has moved). No article or ITU document was opened; these are search summaries. Nothing is quoted on
screen; URGED / AGAIN URGED / STRONGLY URGED are the board's verbs as a record, not quotations.

| # | claim on screen | status | sources (search summaries, 23 Oct) |
|---|---|---|---|
| 1 | **GPS over Finland is jammed around the clock** | **CONFIRMED** (v1 row 1). Traficom, 21 Apr 2026: GNSS interference concentrated in aviation, around the clock, in southern and central Finland. "Jammed" is the plain word for that interference; Traficom also logs spoofing (false positions), which is what the jumping icon shows. The tag says SOUTHERN FINLAND · TRAFICOM 2026. | v1 table |
| 2 | **Finland and the Baltic states complained to the UN's radio body** | **CONFIRMED** (v1 row 2): the Baltic co-signed submission to the Radio Regulations Board; Finland in the joint statement at the ITU Council and in the receivers the board's decisions name. The nameplate says ITU · RADIO REGULATIONS BOARD. | v1 table |
| 3 | **The UN body urged Russia to stop the jamming. Again and again.** | **CONFIRMED** (v1 rows 3–5): urged at meeting after meeting; again urged at the 100th (Nov 2025); strongly urged at the 101st and 102nd (2026). | v1 table · https://www.itu.int/harmful-interference-to-rnss/ |
| 4 | **Russia's reply on record: none** | **CONFIRMED for what the records show, and unchanged today.** No Russian reply to the board or to the interference reports was found in today's searches. The 101st meeting's record notes the board urged Russia to respond and that Latvia had received no reply; the 102nd notes no reply to Lithuania. The film says "on record". | https://www.itu.int/harmful-interference-to-rnss/ · https://www.baltictimes.com/gps_disruptions_in_baltic_states_brought_to_attention_of_un_sec-gen · https://www.telecomstechnews.com/news/nordic-satellites-targeted-by-russia-after-sweden-nato-accession/ |
| — | **BOARD MEETS AGAIN · 26–30.10.** (last tag) | **The meeting is CONFIRMED** (RRB26-3, 26–30 Oct, Geneva; v1 table). **Whether the case is on its agenda is still NOT confirmed**: no agenda for the October meeting turned up today. The tag says only that the board meets again. | v1 table |

**Re-check on the morning of posting:** whether a Russian reply has appeared, and whether the RRB26-3 agenda (or its
summary of decisions, from 30 Oct) names the RNSS case. A reply changes the punchline; the agenda changes nothing on
screen.

**Attribution (post copy only, never the picture):** Finland and Lithuania trace the interference to Russia, which
denies it (v1). The film's own attribution is the board's letters to the Russian administration.

**Not used, as in v1:** the 18 Oct drone in Lithuania; how jamming or spoofing works; any crash talk; antenna counts.

## Shots (4 shots, 38 beats at 124 BPM = 18.4 s, + the sign-off)

**The owner's clarity rule (23 Oct, mid-build):** the two test cuts came back for "clarity of messaging", so every
caption must make sense on its own to a cold viewer: plain what, who and why, no riddles or shorthand. The first draft
here ("Over Finland, GPS is jammed", "Its board urged Russia to stop. Again. Strongly.", "Reply on record: none.") leant
on the caption before it; the shipped captions are four plain sentences.

| # | id | beats | role | caption (en, BIG) | what we see | cues |
|---|---|---|---|---|---|---|
| 1 | `auv_hook` | 9 | setup | GPS over Finland / is jammed / [around the clock]. | **Frame one:** v1's papercut cockpit at night, closer (×1.22 about y 1040), the plane icon gliding along the coast on the moving map, tag SOUTHERN FINLAND · TRAFICOM 2026 already up. At 0.3 s the screen tears for five frames, the frame kicks and shakes, and the icon is in a lake, a GPS? flag beside it, the GPS lamp blinking amber. On "around the clock" the windscreen runs a whole day (night, dawn, day, dusk, night) while the panel clock spins. | `hit` 0.035, `jump` 0.3, `spin` = pop |
| 2 | `auv_post` | 10 | evidence | Finland and the / Baltic states / complained to the / [UN's radio body]. | Geneva by day: four envelopes (FI, EE, LV, LT) thrown into the INTERFERENCE REPORTS tray; on the pop the brass nameplate flips up: ITU · RADIO REGULATIONS BOARD. Tag: ITU · GENEVA. | `env` = line 1 start, `plate` = pop |
| 3 | `auv_stamp` | 10 | evidence | The UN body urged / Russia to stop / the jamming. / [Again and again]. | **The escalation.** The board's desk from above, a letter TO: THE ADMINISTRATION OF THE RUSSIAN FEDERATION slapped down on two earlier ones. Three stamps on the SAME letter, piling up: URGED (blue) as "to stop" lands, AGAIN URGED (blue) on "Again", STRONGLY URGED (red, biggest) 0.4 s after "again." — 0.85 s then 0.63 s apart, each harder, the third with a red flash and the desk jumping. Tag: RADIO REGULATIONS BOARD · 2025–26. | `s1` = line 2 end, `s2` = line 4 start, `s3` = line 4 end + 0.4 |
| 4 | `auv_none` | 9 | punchline | Russia's reply / on record: [none]. | The closed door. The stamped letter drops through the slot onto a pile of earlier, unopened ones; on "none" the stamp comes down on the door: NO RESPONSE RECEIVED. Tag: BOARD MEETS AGAIN · 26–30.10. The caption clears; **in the last 0.75 s the hall tears, band by band, back into the cockpit's first frame**. | `drop` 0.08, `none` = pop, `tear` = end − 0.75 |

## Decisions

- **The loop says the point.** The last 0.75 s tears the hall back into frame 0 (16 horizontal bands switching over,
  their jitter dying out by 85 % of the tear), so the last frame IS frame 0 and a replay starts the jamming again:
  the letters went nowhere, and it carries on.
- **One letter, three stamps.** v1 sent each letter away and slid in a fresh one; here they land on one letter and pile
  up, so the escalation is visible in a single still.
- **Past tense on the stamps** (URGED, not v1's URGE): a stamp records what was done, like RECEIVED, and it matches the
  caption and the last stamp.
- **No chart shot.** v1's second shot (the pilot's hands unfolding a paper chart) is gone; its "around the clock"
  sky-and-clock spin moved into the hook. No pilot is drawn at all (if one is ever drawn, it is a masked Toko).
- **Fair to the ITU:** the board's escalation is drawn as earnest (each stamp harder), and the last tag points to its
  next meeting. The joke is that a body built on cooperation can only write letters.
- House rules held: Russia appears only as the board's addressee; no transmitter, flag, crash or how-to; no quotes.
  fi/ja are drafts (`native_read: false`).

## Build

```
uv run -q --with numpy --with soundfile --with matplotlib python pipeline/build.py papercut/again-urged-viral --lang en \
  --fonts $P/lib/fonts --engine $P --jobs 1 --signoff previews/signoff-papercut.mp4 --out $S/build-auv
```

Previews: `previews/23-10-Again-Urged-VIRAL-en.mp4` (21.4 s with the sign-off, 3.2 MB) and the film-only loop master
`previews/23-10-Again-Urged-VIRAL-loop-en.mp4` (18.4 s, 2.9 MB).

**Result (23 Oct):** PASSED, 70 pass, 8 warn, 0 fail. The warnings: fi/ja not native-read, and the fi/ja sidecars need
more time than this en master gives them (they need their own masters if they ship). Sound −14.1 LUFS, −3.3 dBTP, LRA
1.8, 25/25 cues covered; the frame-1 hit is 35 ms in.

**Looked at, and fixed:**

- First build FAILED on width: "Finland and the Baltics" (969 px) and "Its board urged Russia" (949 px) are wider than
  the 800 px big-caption limit. Both were rewritten anyway under the clarity rule; every line now measures under 800 px.
- A toggle switch stuck out past the end of the hook's tag like a stray mark. The cockpit is framed at ×1.22 about
  y 1040 (was ×1.1 about 1090): the map is bigger, the lamps sit above the tag's row and the toggles below it.
- The loop was checked on the film master: frame 0 against the last frame, mean absolute difference 0.73/255 (codec
  noise; the same picture, tag and framing, no caption on either).

**Known limits:**

- **Frame 0 has no words** (the caption renderer starts after 0); "GPS over Finland is jammed" is up by 0.7 s. The tag
  is on frame 0. Use the 1 s frame as the cover.
- **The sign-off master breaks the loop.** Post the film-only loop master where the platform loops.
- Shots 2 and 3 carry four-line captions (each line short); they cover the top third, over wall and desk only.
- The ja draft's line breaks put the first stamp on "ロシアに", not on the verb; the en master is the only one built.
- The right-hand gauges are cropped by the tighter hook framing; "around the clock" is carried by the sky.
