# Ends in 3 (Global 2), VIRAL CUT v1, 23 Oct, for the 00:50 window (the Americas)

Owner, 23 Oct, after asking for a viral version of Doodle 5: "Test other 2 as well and rest after". This is one of
the two test films. It is built from the v1 draft (`plan/films/23-ends-in-3.md`), which stays as it is.

- Engine key `e3` (the same kit), `papercut/ends-in-3-viral/`.
- Scenes: `e3v_*`, appended to `scenes/e3_kit.js` after v1's last scene. No v1 line changed, so v1 renders exactly as
  before.
- 44 beats at 124 BPM ≈ 21.3 s, plus the papercut sign-off.
- Captions at the BIG size (82 px em, `captionSize: "big"`).
- The score is the RFH bed at 124 BPM (`RFHV`, a subclass of `RFH`: same key, chords, room and mix).

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

## The fact re-check (23 Oct 2026)

**How:** WebSearch, two queries in Spanish on 23 Oct, on top of v1's re-check the same morning (its table holds the
sources for the 2.2 million, the reason, the kept number and the alert; nothing there has moved). No article was opened;
these are search summaries. Nothing is quoted on screen.

| # | claim on screen | status | sources (search summaries, 23 Oct) |
|---|---|---|---|
| 1 | **2.2 million** lines cut off in Mexico (the 3s) | **CONFIRMED** (v1 table, row 2): 2,248,143 lines ending in 3 suspended as of 4 Oct. The hook says "phone lines", not "phones": it is lines, not devices. | El Financiero 5 Oct (v1) |
| 2 | Every line needs an ID; the reason: **extortion, fraud** | **CONFIRMED** (v1 row 1). The official reason is stated on screen. The drive is mostly prepaid; postpaid lines are already tied to their holder by contract, so "every line" still holds. | v1 sources |
| 3 | **Ending in 4: cut.** | **CONFIRMED.** Due 15 Oct; phone companies have up to 72 h to suspend, so cut from about 18 Oct; 1,328,000 suspended (Informador, 19 Oct). No 4-batch count is put on screen. | https://www.unotv.com/nacional/manana-vence-el-registro-de-celulares-con-terminacion-4-ve-que-numero-sigue/ · https://www.aztecajalisco.com/noticias-mexico-y-mundo/ultima-llamada-celulares-que-terminan-en-4-podrian-quedarse-sin-servicio-a-partir-del-15-de-octubre/ · Informador 19 Oct (v1) |
| 4 | **Ending in 5: due 31 October** | **CONFIRMED, not moved.** The extension that searches turn up is the June one, which made this staggered calendar (0 on 15 Aug … 5 on 31 Oct, 6 on 15 Nov … 9 on 31 Dec). Nothing newer moves the 5. | https://www.excelsior.com.mx/nacional/calendario-prorroga-registro-lineas-celulares-mexico · https://www.xataka.com.mx/telecomunicaciones/prorroga-registro-celulares-llego-cambios-prueba-vida-nuevos-sms-otro-calendario · https://www.nmas.com.mx/sociedad/cuando-suspenden-tu-linea-si-tu-numero-termina-4-5-nuevas-fechas-registro-estos-usuarios/ |
| 5 | No calls, no data; **number kept** till you link an ID | **CONFIRMED** (v1 row 3): a suspension, not a cancellation; service returns when the line is linked. Never "deleted". | v1 sources |
| 6 | The **quake alert still gets through** | **CONFIRMED** (v1 row 4): suspended lines still receive the seismic alert and can call 911. | v1 sources |

**Re-check on the morning of posting:** whether 31 Oct moved, and whether the 4s now have a newer count (the film does
not quote one, so a new count changes nothing on screen).

## Shots (5 shots, 44 beats at 124 BPM ≈ 21.3 s, + the sign-off)

| # | id | beats | role | caption (en, BIG) | what we see | cues |
|---|---|---|---|---|---|---|
| 1 | `e3v_hook` | 8 | setup | [2.2 million] phone / lines cut off / in Mexico. | **Frame one:** v1's paper street at dusk, every masked passer-by holding a lit phone with its last digit, tag MEXICO · 2026 already up. At 0.3 s the two unlinked 3s flicker (on, off, on) and go grey at once; a kick, a shake, a red flash. The third 3 (linked) stays lit, because 87 % of the 3s were linked. | `hit` 0.035, `dark` 0.3 |
| 2 | `e3v_rule` | 9 | evidence | Every line needs / an ID. The reason: / [extortion, fraud]. | v1's registry counter: from line 2 a red string is wound round a lit phone (3) and an ID card (a mask in its photo); on the pop it is pulled tight and a bow pops. Tag: CRT · LINE REGISTRY · 2026. | `lace` = line 2 start, `tie` = pop |
| 3 | `e3v_next` | 9 | evidence | Ending in 4: cut. / Ending in 5: due / [31 October]. | **The escalation.** The calendar of last digits, 0–3 already crossed. The marker's X lands on the 4 on "cut."; the 5 is ringed on the pop; then 6, 7, 8 and 9 light in turn with dashed red outlines, a rising tick each: it rolls on. Tag: CRT · DEADLINES BY LAST DIGIT. | `four` = line 1 end, `five` = pop |
| 4 | `e3v_kept` | 9 | evidence | No calls, no data. / Number kept till / you [link an ID]. | Back on the street, closer. The cut phones stay grey. A thumb taps a dead screen; its owner raises an ID card and on the pop the phone comes back. Tag: THE NUMBER IS KEPT. | `tap` = line 1 start, `linked` = pop |
| 5 | `e3v_alert` | 9 | punchline | No ID, no phone. / The quake alert / still [gets through]. | The whole street, one phone still grey. On the pop every phone shows the alert at once, the grey one too. Nobody runs; nothing shakes. Over the last 0.7 s the camera eases to frame one's exact framing, poses return to frame one's and the red fades, **so the last frame (every phone lit) hands back into the first.** | `alert` = pop |

## Decisions

- **Accuracy over the brief's "the 3s going dark at once":** two of the street's three 3s go dark, and the third stays
  lit. 87 % of the 3s were linked, so a street where every 3 dies would be false. It still reads as "cut off" at a glance:
  two of them die together, at once, on a kick.
- **The loop** joins on the **film master** (no sign-off). The +signoff MP4 has the station's slate after the film,
  as the house rule says, so a platform loop of that file replays through the slate. If the post loops, upload the
  no-signoff master and put the sign-off in the caption, or accept the slate in the loop.
- **"No ID, no phone."** is the punchline's setup, as in v1: no phone service without the ID, not a confiscated phone.
  The next line answers it.
- **No quake, no damage**: the alert screen only (a white triangle with a seismograph trace), and a soft two-tone
  warble, never a rumble.
- House rules held: the official reason is stated; "kept", never "deleted"; no biometrics, no carrier names; masked
  Tokos, no faces; no quotes. fi/ja are drafts (`native_read: false`).
- **post.es** is in copy.json (264 characters). The pipeline does not read `post`, so it is copy for the poster, not a
  build target. There is no es master (no es captions); the Americas window would want one if this cut is kept.

## Build

```
uv run -q --with numpy --with soundfile --with matplotlib python pipeline/build.py papercut/ends-in-3-viral --lang en \
  --fonts $P/lib/fonts --engine $P --jobs 1 --signoff previews/signoff-papercut.mp4 --out $S/build-e3v
```

Preview: `previews/23-10-Ends-in-3-VIRAL-en.mp4` (24.3 s with the sign-off, 3.5 MB).

**Result (23 Oct):** PASSED, 93 pass, 11 warn, 0 fail. The warnings: fi/ja not native-read, and the fi/ja sidecars
need more time than this en master gives them (fi and ja need their own masters if they ship). Sound -14.1 LUFS, -4.1
dBTP, 25/25 cues covered, and the frame-1 hit peaks at -4.5 dBFS 35 ms in.

**Looked at, and fixed:**

- The front row's last phone sat under the platforms' right rail (x ≥ 930, y 980–1630). The viral street is drawn
  75 px left of v1's (`streetV`). It is a plain shift, not `cam.x`, which would also swing every paper shadow.
- `e3v_kept` pushes in about x 700 (it was 440) and a little less (1.16 → 1.28), so its right edge stays off the rail.
- The calendar is drawn 7% smaller than v1's, because its 9 column touched the rail.

**Known limits:**

- **Frame 0 has no words.** The caption renderer draws a word only once its clock is past zero, so "2.2 million" is
  first drawn on frame 1. It is fully up by 0.1 s, and "2.2 million phone lines cut off" is up by 0.86 s. MEXICO is on
  the tag from frame 0. Choose the 1 s frame as the post's cover.
- **The loop seam:** on the last frame the screens are red (the alert) and the caption is at 63%. On the first frame
  the screens are white digits and there is no caption. The camera, the framing and the poses match exactly, and the
  frame-1 hit lands on the change.

## v2 (23 Oct): clarity of messaging

The owner, on v1: "needs clarity of messaging". v1 never said that the lines were cut because they were not linked to
an ID, and "Ending in 4: cut" did not say what "ending in" means. v2 keeps the hook-first loop, and each caption
answers one question for a cold viewer: what happened, why, how, and the twist.

The build edits the same folder in place. The v1 viral previews stay in `previews/`: `…-VIRAL-en.mp4` and
`…-VIRAL-loop-en.mp4`.

- The scenes are `e3v_hook`, `e3v_why`, `e3v_how` and `e3v_alert`. `e3v_rule`, `e3v_next` and `e3v_kept` are gone.
- v1's kit above the viral block is still untouched.
- 40 beats at 124 BPM = 19.35 s, plus the sign-off (22.4 s).

| # | id | beats | caption (en, BIG) | picture | cues |
|---|---|---|---|---|---|
| 1 | `e3v_hook` | 8 | Mexico: / [2.2 million] phone / lines cut off. | Frame 0: the street, every phone lit with its last digit, MEXICO · 2026 on the tag. On the pop the two unlinked 3s flicker and die (a kick and a red flash); the linked 3 stays lit. | `hit` 0.035, `dark` = pop |
| 2 | `e3v_why` | 10 | Not linked to an ID: / a new rule against / [extortion, fraud]. | The registry counter. A grey (cut-off) phone showing 3 and an ID card lie apart: not linked. From line 2 a red string is wound round both. On the pop it is pulled tight, they slide together, and the phone comes back on with a green tick: a line returns once it is linked. | `lace` = line 2 start, `tie` = pop |
| 3 | `e3v_how` | 11 | Cut by last digit: / 3s, then 4s, / [5s] next, on 31 Oct. | A slip with a phone number, the middle masked (`55 •••• •••3`, no real number), its last digit boxed. Under it, the calendar of last digits with 0–2 already crossed. The X lands on the 3 on "3s" and on the 4 on "4s". The 5 is ringed on "5s" (31/10). The slip's digit flips 3 → 4 → 5 in step, then 6–9 light in turn. | `three` = line 2 start, `four` = line 2 end, `five` = pop |
| 4 | `e3v_alert` | 11 | No calls, no texts. / But quake alerts / still [get through]. | The street. Both cut-off phones are grey, and a thumb taps one on "No calls". On the pop every phone shows the alert, the grey ones too: no quake, no damage. Over the last 0.7 s the camera, the poses and the red return to frame 0's, so the film loops. | `tap` = line 1 start, `alert` = pop |

**Words versus the spine.** The coordinator's lines were kept, with four changes to pass the 800 px width check at the
big size:

- "[2.2 million] phone lines" is 937 px, so the hook breaks after "phone".
- "extortion and fraud." is 852 px, so it became "[extortion, fraud]." (695). Both words are on screen, as the reason
  must be.
- "number's last digit:" is 824 px, so line 1 became "Cut by last digit:", and the slip shows which digit is meant.
- "But the quake alert" is 808 px, so it became "But quake alerts / still [get through]."

**Facts** are as in the re-check above:

- the 3s were suspended from about 4 Oct (2,248,143);
- the 4s from about 18 Oct (1,328,000 by 19 Oct);
- the 5s are due 31 Oct, unchanged as of 23 Oct.

The 0s to 2s went before; the calendar shows them crossed and the caption does not count them. "2.2 million" is the
3s alone, so it undercounts rather than overclaims.

**Posts** (copy.json `post`), hook-first and ending in a question:

- `en`: 278 characters
- `es`: 273 characters
- `fi`: 275 characters
- `ja`: 110 characters

The en and es posts say why (no ID linked), the official reason, the last-digit order and that lines come back once
linked.

**Build:** PASSED, 0 fail, 6 warn. The warnings are fi/ja native reads, and fi/ja sidecars needing 0.1–0.8 s more
than this en master gives them. Sound is −14.0 LUFS, −4.1 dBTP, with every cue covered.

**Looked at:** every caption beat at 360 px wide, with the rail overlaid. One fix: the registry's ID card sat under
the right rail, so the phone and card were moved 35–45 px left. The marker hand crosses the rail for a moment while
writing; nothing that needs to be read sits under it.

**Previews:**

- `previews/23-10-Ends-in-3-VIRAL-v2-en.mp4` (22.4 s, with the sign-off)
- `previews/23-10-Ends-in-3-VIRAL-v2-loop-en.mp4` (19.35 s, no sign-off; the one to post if the platform loops)
