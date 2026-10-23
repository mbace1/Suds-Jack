# Approved Vendor (Global 1), VIRAL CUT v1, 23 Oct

Owner, 23 Oct, after asking for a viral version of Doodle 5: "Test other 2 as well and rest after". This is one of the
rest. It is built from the v1 draft (`plan/films/20-approved-vendor.md`), which stays as it is.

- Engine key `avv`, `papercut/approved-vendor-viral/`. A key of its own: `avv_plan.js` and `eras_avv.js` are staged
  into the engine and do not clobber v1's (`av`) or another film's build running at the same time.
- Scenes: `avv_*`, appended to `scenes/av_kit.js` after v1's last scene, inside the same IIFE, so they reuse v1's banner,
  sun/eye, laptop, room, clipboard, list sheets, stamp and ink. No v1 line changed, so v1 renders exactly as before.
- 45 beats at 124 BPM ≈ 21.8 s, plus the papercut sign-off.
- Captions at the BIG size (82 px em, `captionSize: "big"`).
- The score is the RFH bed at 124 BPM (`RFHV`, a subclass of `RFH`: same key, chords, room and mix).

The viral format is the one in `plan/films/23b-ends-in-3-viral.md`: the hook is frame 0, ~18–22 s, one escalation beat,
the punchline sharpened, a loop back to frame 0, a hit near the start (never on sample 0), post copy hook-first with a
question.

**Clarity rule (coordinator, 23 Oct, before the first build).** The two test viral cuts came back for clarity of
messaging. Every caption has to make sense on its own to a cold viewer: what, who and why, plainly, with no riddles or
insider shorthand. For this film that means three things are said in words, not left to the picture: an ad firm's ads
delivered spyware; the firm sat on the ad industry's approved list; it was suspended only in October. So the brief's
hook "This ad delivered spyware." became "An ad firm's ads delivered spyware.", "No click needed." says what was enough
instead, and v1's punchline "Approved vendor. Until October." became "Approved vendor. Suspended only in October."

## The fact re-check (23 Oct 2026)

**How:** WebSearch on 23 Oct, on top of v1's table (22 Oct), which holds the primary sources. No article was opened;
these are search summaries. Nothing is quoted on screen.

**Result: nothing newer than mid-October moves any claim on screen.** The coverage still runs from Citizen Lab's
report (15 Oct) and IAB Europe's statement the same day. Google and IAB Europe both cut the firm off. Two newer figures
appear in the coverage and are not used on screen: the firm's network served 10 million+ ads a day across 120,000+
websites and 75,000+ apps, and its ads reached people at the UN, NATO, the European Commission and a dozen or more
governments. The firm and the spyware maker did not respond. Sources (search summaries, 23 Oct): darkreading.com,
ppc.land, thenationalnews.com, theprint.in, arabnews.pk, thestar.com.my.

| # | claim on screen | status |
|---|---|---|
| 1 | An ad firm's **ads delivered spyware** | **CONFIRMED** (v1 row 1; Citizen Lab 15 Oct, Reuters, TechCrunch, The Record). It says "an ad firm's ads", never ads in general, and names no firm. The banner on screen stands in for the firm's ads. |
| 2 | **No click needed**: just seeing the ad was enough | **CONFIRMED** (v1 row 1): the ad's code checked the device's ad ID and IP and, for a target, returned code that could load a browser exploit. No click was needed. |
| 3 | At least **45 devices** at one newsroom were **targeted** | **CONFIRMED** (v1 row 2): 2024–25, attributed "with high confidence" to the spyware maker. "Targeted", not "infected". The newsroom is not named, and neither is the customer (Citizen Lab does not know it). |
| 4 | For **six years** the firm sat on the ad industry's **approved list** | **CONFIRMED** (v1 row 3): IAB Europe's Global Vendor List, vendor 778, from 2 Jul 2020. "Approved" is Reuters' wording for IAB Europe's "list of globally approved vendors"; IAB Europe says it vets and approves applications. |
| 5 | **Suspended only in October** | **CONFIRMED** (v1 row 4): suspended in early October (8 Oct per Citizen Lab) after an audit found TCF Policy violations (IAB Europe, 15 Oct). Suspended, not expelled. "Only" is the station's word for six years and three months. |

**Re-check on the morning of posting:** whether IAB Europe has turned the suspension into an expulsion or lifted it
("suspended" on the stamp would then need a word), and whether any newsroom has been named (the film still names none).

## Shots (5 shots, 45 beats at 124 BPM ≈ 21.8 s, + the sign-off)

| # | id | beats | role | caption (en, BIG) | what we see | cues |
|---|---|---|---|---|---|---|
| 1 | `avv_hook` | 8 | setup | An ad firm's / ads delivered / [spyware]. | **Frame one:** the cheerful SALE banner, big and centred on a page, its paper sun turning, the cursor parked by the headline, tag CITIZEN LAB · 15.10.2026 already up. On the hit (35 ms) the banner bounces. At 0.45 s the sun opens into an eye looking at the cursor, and the page dims round it. On "spyware" it turns and looks straight at us. | `hit` 0.035, `open` 0.45, `spy` = pop |
| 2 | `avv_noclick` | 8 | evidence | [No click] needed: / just seeing the ad / was enough. | v1's newsroom laptop, the camera pulling back from the screen. The eye is open in the page's corner. The gloved hands keep typing. On "No click" a red marker ring is drawn round the parked cursor, the screen flickers red, and the eye glances at the cursor. Tag: A NEWSROOM · NIGHT. | `ring` = pop |
| 3 | `avv_count` | 9 | evidence | At least 45 / devices at one / newsroom were / [targeted]. | **The escalation.** The cut opens close on that laptop. The camera pulls back to a newsroom of 45: six rows of desks, 12 + 10 + 8 + 7 + 5 + 3 laptops, each with the same cheerful banner. On "targeted" their suns open into eyes one after another, faster and faster (1.25 s). On `stare` every eye looks at us, the screens glow red, a kick. Tag: AT LEAST 45 DEVICES · 2024–25. | `pull` = line 1 start, `open` = pop, `stare` 3.3 |
| 4 | `avv_list` | 10 | evidence | For six years / the firm sat on / the ad industry's / [approved list]. | v1's lectern clipboard, GLOBAL VENDOR LIST. The firm's row is ticked in, and the sheets riffle 2020 → 2026 and land on "approved list". Tag: IAB EUROPE · GLOBAL VENDOR LIST. | `flip` = line 1 start, `six` = pop |
| 5 | `avv_stamp` | 10 | punchline | Approved vendor. / Suspended only / in [October]. | The 2026 sheet. The stamp winds up on `lift` (0.5 s before the pop) and comes down on "October": SUSPENDED · OCT 2026 across the firm's row. It lifts away. Then **the loop**: 0.9 s before the end the picture whips sideways back to the banner, the eye shuts into the sun, the camera eases to frame 0's exact framing and the tag comes back. The caption clears 0.45 s before the end. | `lift` = pop − 0.5, `stamp` = pop |

## Decisions

- **The loop** lands on frame 0 itself. `hookFrame()` draws the hook's picture, and both `avv_hook` and the end of
  `avv_stamp` call it. At the last frame the camera is V0 (no sway), the eye is shut (o = 0), and the sun's turn is
  `(lt − dd)·VSPIN`, which runs straight into the hook's `lt·VSPIN`. The tag fades back in once the caption has gone.
  The last frame and frame 0 are the same picture; the frame-1 hit lands on the replay. The join is on the **film
  master** (no sign-off). The +signoff file replays through the station's slate, as the house rule says. If the post
  loops, upload the loop master and put the sign-off in the caption.
- **The eye shutting into the sun at the end is the loop device, not a claim.** It reads as "it looks harmless again".
  It does not say the ads are running again.
- **The stamp lands on the list, not on the ad.** The suspension was from the list, so the stamp stays where v1 put it.
- **45 laptops, not phones** (v1's rule). There is one laptop for each targeted device, and the eyes open in a seeded
  order (`ORDER` in av_kit.js, mirrored in score.py).
- **Keeping clear of the platforms' right rail** (x ≥ 930, y 980–1630):
  - The banner is centred (v1's sat at x 650 with its edge on the rail).
  - The newsroom stops at a column at x 918.
  - The clipboard sits 16 px left of v1's and 90 px lower, under four BIG lines.
  - The stamp hovers and winds up above the rail's top rather than out to the right.
- House rules held:
  - No nation, newsroom, customer, ad firm or spyware maker is named. IAB Europe is named on the tag, as in v1.
  - "Its ads", never ads in general.
  - Laptops.
  - SUSPENDED, never expelled.
  - No logo on the stamp.
  - Doodle (Google) is off screen.
  - No quotes.
  - Masked figures only: the colleague and the gloved hands.
  - fi and ja are drafts (`native_read: false`).

## Build

```
uv run -q --with numpy --with soundfile --with matplotlib python pipeline/build.py papercut/approved-vendor-viral --lang en \
  --fonts $P/lib/fonts --engine $P --jobs 1 --signoff previews/signoff-papercut.mp4 --out $S/build-avv
```

Previews:
- `previews/23-10-Approved-Vendor-VIRAL-en.mp4`: with the sign-off.
- `previews/23-10-Approved-Vendor-VIRAL-loop-en.mp4`: the film-only loop master.
