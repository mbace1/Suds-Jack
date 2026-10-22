# Approved Vendor (Global 1): DRAFT, 22 Oct, for a 12:50 window

Papercut, the RFH set, 5 shots × 12 beats at 112 BPM (~32 s) + the station's sign-off slate. Engine key `av`,
`papercut/approved-vendor/`, kit `scenes/av_kit.js`. Research: `research-global-next.md` §1; idea: `IDEAS.md`
(Approved Vendor). Stance: `CAMPAIGN_PLAN.md` §2 pillar 6 (the quiet step toward a world nobody voted for; never aimed
at a nation or a people).

**The one question:** *Who approved the ad firm whose ads delivered spyware?*

**The answer, in one sentence (copy.json `argument`):** Researchers say an ad firm's targeted ads delivered spyware
with no click, aimed at 45 devices in one newsroom. The firm sat on the ad industry's vendor list for six years, until
an October suspension.

## The fact re-check (22 Oct 2026)

**How:** WebFetch of iabeurope.eu failed DNS (ENOTFOUND), as it did for citizenlab.ca in the research pass. So, as in
the research, **no original article was opened**; everything below is from WebSearch result summaries (eight queries,
22 Oct). Nothing is quoted on screen.

| # | claim on screen | status | sources (search summaries, 22 Oct) |
|---|---|---|---|
| 1 | 15 Oct, researchers: its ads **delivered spyware on display; no click** needed | **CONFIRMED.** Citizen Lab, "Exposing AdFection" (15 Oct): Discover-Tech's targeted ads delivered Candiru spyware; the ad's code sent the device's ad ID, cookies and IP to the firm's servers, and a matching target got back malicious JavaScript. No click, download or approval needed. Reuters, TechCrunch, The Record, CyberScoop, BleepingComputer, Dark Reading agree. The report itself warns that an ad impression alone proves neither targeting nor infection: the film says "its ads", never ads in general. | https://citizenlab.ca/research/how-discover-tech-turned-targeted-ads-into-a-pipeline-for-spyware/ · https://www.bleepingcomputer.com/news/security/zero-click-attacks-used-targeted-ads-to-deliver-candiru-spyware/ · https://www.darkreading.com/data-privacy/adfection-online-ads-spyware-delivery |
| 2 | **At least 45 devices at one newsroom were targeted** | **CONFIRMED.** Citizen Lab: at least 45 devices at Al Jazeera, targeted in 2024 and 2025, spyware attributed "with high confidence" to Candiru (now Integrity Labs). Reuters says "compromise 45 Windows devices"; other outlets note the figure counts targets and that not all 45 are confirmed infected, so the film says **targeted**. No government customer is known. The newsroom is not named; the film draws laptops. | Reuters via https://www.timesofisrael.com/israeli-company-used-online-ads-to-run-vast-spy-operation-researchers-say/ · https://www.esecurityplanet.com/cybersecurity-threats/news-adfection-zero-click-spyware-al-jazeera/ |
| 3 | It sat on the ad industry's **global vendor list for six years** | **CONFIRMED in substance.** IAB Europe's own statement (15 Oct, "Recent Reports Concerning a TCF Vendor, Discover-Tech"): suspended from the TCF **Global Vendor List** after an audit under its compliance programmes found TCF Policy violations; the suspension stays until the violations are remedied and verified, and further confirmation could justify definitive expulsion. Listed as **vendor 778 from 2 July 2020** (ppc.land, from the GVL archive) until early October (8 Oct per Citizen Lab; "last week" per IAB Europe to Reuters on 15 Oct). 2 Jul 2020 to Oct 2026 is a little over six years. | https://iabeurope.eu/recent-reports-concerning-a-tcf-vendor-discover-tech/ (summary only) · https://ppc.land/google-drops-ad-vendor-it-listed-since-2020-after-45-device-spyware-attack/ · https://ppc.land/targeted-ads-delivered-spyware-to-45-devices-through-a-vendor-google-listed/ |
| 4 | **Approved vendor. Until October.** | **Holds, and this was the critical check.** IAB Europe's own word for its list is the **Global Vendor List** and for the firm a **TCF Vendor**; vendors **register** and **attest** compliance with the TCF Policies (IAB Europe's vendor guidance). But "approved" is not ours: **Reuters reports IAB Europe saying the firm was suspended from its "list of globally approved vendors"**, and Citizen Lab reports that IAB Europe says it takes reasonable steps to **vet and approve** applications (including who controls a vendor) while noting the firm's spyware links were findable in public corporate records. So the punchline stays, as satire of what the word sounds like set against what happened, and it is never in quote marks. If challenged, the caption above it already says "the ad industry's global vendor list". | Reuters via https://www.internazionale.it/ultime-notizie-reuters/2026/10/15/israeli-firm-used-online-ads-to-run-vast-spy-operation-researchers-say · https://www.relevantaudience.com/digital-marketing-en/citizen-lab-adfection-discover-tech-ad-supply-chain/ · https://iabeurope.eu/?p=49562 (registration and attestation) |

**Doodle (Google):** confirmed. Google said it removed Discover-Tech from its ad platforms "for systematically violating
our policies" (via Reuters and TechCrunch), and ppc.land says Google had listed it since 2020. **Not used on screen**: Doodle
acted, so it is not the joke, and its logo is nowhere. Beeswax, Vungle (Liftoff) and Eskimi also cut it off.

**What changed since the research (20 Oct):** nothing material. No expulsion, no reinstatement, no customer named, no
response from Discover-Tech found up to 22 Oct. Newly found: the "approved" wording comes via Reuters' report of IAB
Europe's own email, which makes the punchline sourced and not only satirical. Also found and **not used**: one summary
says IAB Europe called itself not equipped or mandated to investigate conduct outside the TCF's scope. Only one source
says so, and the exact wording could not be found. Re-check on the morning of posting.

## Shots (5 × 12 beats, 112 BPM ≈ 32.1 s, + 3 s slate)

| # | id | role | caption (en) | what we see (no words needed) | cues |
|---|---|---|---|---|---|
| 1 | `av_room` | setup | Who approved the ad firm / whose ads delivered / [spyware]? | A newsroom at night: a city window, a far colleague (masked) under a green lamp, and in front a paper laptop with a masked reporter's gloved hands typing. In the page's right column a cheerful banner ad slides in, a paper sun over SALE, and bounces on the pop. The cursor sits in the text and never moves. Tag: A NEWSROOM · NIGHT. | `slide` 0.9, `ad` = pop |
| 2 | `av_eye` | evidence | 15 Oct, researchers: just / showing its ads delivered / spyware. [No click] needed. (parent, 22 Oct: 'on display' read as a typo) | Close on the banner, the parked cursor beside it. **TURN** on the pop: the paper sun opens into an eye. The lower rays fold away, the upper ones become lashes, and the screen dims around it. The eye looks at the cursor, then at us, and blinks. A red thread runs out of the ad and off the bottom of the frame. Tag: CITIZEN LAB · 15.10.2026. | `open` = pop |
| 3 | `av_bid` | evidence | At least 45 devices / at one newsroom / were [targeted]. | An auction hall in oxblood card: two rows of masked bidders, paddles reading AUDIENCE 2M, 640K, 90K, 1.2M, 300K, 5M, 850K go up and down. The red thread comes in from the right. On the pop one arm goes up highest into a spotlight: **AUDIENCE 1**, and the thread pulls taut to it. Tag: AT LEAST 45 DEVICES · 2024–25. | `one` = pop |
| 4 | `av_list` | evidence | It sat on the ad industry's / global vendor list / for [six years]. | On the lectern, a clipboard: GLOBAL VENDOR LIST, 2020, columns PURPOSES · LEGAL BASIS · CONSENT (what a vendor declares on registering), every box ticked, one row highlighted and its three ticks drawn in. Then the sheets riffle one a year, 2021…2026, landing on the pop. Tag: IAB EUROPE · GLOBAL VENDOR LIST. | `flip` = line 1 start, `six` = pop |
| 5 | `av_stamp` | punchline | Approved vendor. / Until [October]. | The 2026 sheet. A rubber stamp in a gloved fist hovers at the right, winds up on line 1, and comes down on the highlighted row on "October": **SUSPENDED · OCT 2026** in red, across the ticks. It lifts away, and the ink stays. | `lift` = line 1 start, `stamp` = pop |

## Palette
Night newsroom in slate and ink blues (`#0b1118` → `#172331`), ochre window lights, a cool screen glow; the ad is the one
cheerful thing (sky `#86c8e6`, sun `#f5c63a`, SALE in red `#d8402f`), and the eye keeps the sun's yellow as its lids
with a teal iris. The auction hall is oxblood card (`#2a0e12` → `#46191f`) with a brass rail; the masks are the house
magenta. The lectern and clipboard are walnut and brown hardboard with a steel clip, cream paper, green ticks (`#2f7d4f`)
and an ochre highlight band; the stamp's ink is red `#c9342b`. The thread is the marker red throughout and joins the
three places.

## The motion technique that carries the twist
**TURN** (`plan/motion-options.md`): the sun becomes an eye without a cut. It is one drawing (`sunEye()` in the kit)
with an opening amount: the disc stays, an almond aperture opens in it, the lower rays shrink to nothing and the upper
ones thin and darken into lashes. The ad never changes otherwise, so it is the same ordinary banner, now looking. **PHYS**
for the riffle (sheets lifting off the clip, one a year) and the stamp (wind-up, slam, jolt, paper dust).

## Risks and how the film handles them
- **No nation, no newsroom, no customer.** The firm is Israeli and the newsroom Al Jazeera; neither is on screen or in
  the post. No government is implied: Citizen Lab does not know the customer.
- **Not "ads are spyware".** Every caption says *its* ads; the eye is one banner; the other paddles are ordinary
  audiences. Laptops, not phones (the 45 were Windows devices).
- **Targeted, not infected.** The report confirms infections but not all 45; the caption says targeted.
- **"Approved".** Reuters' wording for IAB Europe's list, and IAB Europe says it vets and approves applications (via
  Citizen Lab). The clipboard shows only what a vendor declares on registering (purposes, legal basis, consent) and
  claims nothing about what IAB Europe did or did not check. The punchline is the station's line, not a quote.
- **Suspended, not expelled.** The stamp says SUSPENDED, and the copy's source note says it can be lifted or become an
  expulsion.
- **Doodle is not the villain** and does not appear: it removed the firm.
- **Real people have no faces:** every figure is a masked Toko (the reporter is only gloved hands).
- **Disclosure for the editor:** researched and written by Claude, an Anthropic model. Please check the balance, and
  read IAB Europe's statement and the Citizen Lab report before air (neither could be opened here).
- Finnish and Japanese copy are **drafts**: `native_read` false. The Japanese `noclick` line needs 8.0 s against the
  English 5.5 s, so a ja master would insert a hold (the plan does that by itself).

## Build notes (draft v1, 22 Oct)
- Engine film, `papercut/approved-vendor/{film.json, copy.json, score.py}`, kit `scenes/av_kit.js` with every scene in
  it. rough.js is loaded but the ticks are drawn as dashed paths; nothing else shared was changed. English master only.
- The riffle's schedule follows the pop in every language: six flips of 0.2 s, ending on "six years" and starting on line
  1. `score.py` mirrors the kit's `flips()`.
- **Result:** PASSED (86 pass, 8 warn: unread fi/ja and their sidecar timings on the English master), 32.14 s + 3 s
  sign-off, −14.0 LUFS, −4.2 dBTP (−14.2 LUFS with the sign-off). Preview
  `previews/22-10-Approved-Vendor-DRAFT-en.mp4` (35.1 s, 4.3 MB). Reports: `qa/pipeline/approved-vendor/en/`.
- **Fixed after looking:**
  - The far colleague stood behind the laptop and could not be seen. The far desks and the colleague moved up into
    the window band.
  - The banner sat over the article text. It moved into the page's own right column.
  - The caret blinked in empty space. It now sits at the end of the last line.
  - In the close-up, the page was a bright blank with a strip of text bars at the edge that read as a ruler. It is
    now an out-of-focus article column, and the screen dims around the eye as it opens.
  - The auction was a pile-up. The AUDIENCE 1 paddle rose only to head height and floated free of its bidder. It now
    goes up on a raised arm into a spotlight, clear of the room, and the back row's paddles all sit on one side so they
    stop overlapping.
  - The thread came down through the caption area. It now enters from the right edge.
  - The clipboard was small. It is 1.12× larger, with larger column heads.
  - The stamp was smaller than its own ink, came straight down through the captions, and then hovered over the year.
    It is now as wide as the ink, comes in from the right, and hovers clear of the 2026.
  - One caption line measured 828 px against the 800 px limit ("delivered spyware just by loading."). It is now
    "delivered spyware on display."
