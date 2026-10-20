# Tailgated (The Brink 1): DRAFT, 20 Oct, for a 12:50 window (00:50 X re-up possible)

Papercut, the RFH set, 5 shots × 12 beats at 112 BPM (~32 s) + the station's sign-off slate. Engine key `tg`,
`papercut/tailgated/`, kit `scenes/tg_kit.js`. Research: `research-brink-next.md` §1; idea: `IDEAS.md` (Tailgated).
Stance: `CAMPAIGN_PLAN.md` §2 pillar 5 (sober, never war hype, aim at the gap in the rules).

**The one question:** *Who decides how close one satellite may come to another?*

**The answer, in one sentence (copy.json `argument`):** A Russian military satellite came within 5 km of a Finnish
company's radar satellite. No law or treaty sets a minimum distance; the nearest rule asks only for due regard.

## The fact re-check (20 Oct 2026)

**How:** WebFetch failed DNS on every host (cnn.com, axios.com, scientificamerican.com, unoosa.org, wikipedia.org)
and curl through the session proxy got a 403 on CONNECT for cnn.com, axios.com, tomshardware.com, meduza.io and
unoosa.org. So, as in the research, **no original article was opened**; everything below is from WebSearch result
summaries (five queries, 20 Oct). Nothing is quoted on screen.

| # | claim on screen | status | sources (search summaries, 20 Oct) |
|---|---|---|---|
| 1 | 16 Oct: a Russian military satellite came **within 5 km** of a Finnish company's satellite; the tag counts **350 KM → 5 KM** | **CONFIRMED.** LeoLabs (via CNN): Kosmos 2612 began a swift approach on 15 Oct, closing from 350 km to less than 5 km by early 16 Oct. Meduza: about 4.8 km by Friday (16 Oct) afternoon, from more than 320 km a day earlier; Tom's Hardware: "200 miles to 3 miles". An automated conjunction page (Orbital Radar) lists a 4.58 km closest approach on 16 Oct. The starting figure varies (320–350 km); 350 is LeoLabs' via CNN, so the tag starts there. Every figure under 5 km (500 m LeoLabs "uncertain", 26 m Militarnyi/TWZ, 85 ft Washington Times) conflicts and is **not used**. | CNN 19 Oct https://www.cnn.com/2026/10/19/science/russian-satellite-iceye-x36-approach · Meduza 19 Oct https://meduza.io/en/news/2026/10/19/russian-military-satellite-comes-dangerously-close-to-a-radar-satellite-operated-by-a-finnish-u-s-company-that-supplies-satellite-imagery-to-ukraine · Tom's Hardware https://www.tomshardware.com/tech-industry/space/russian-military-satellite-closes-from-200-miles-to-3-miles-of-us-radar-satellite-aiding-ukraine-astronomer-says-it-may-be-the-first-unapproved-rendezvous-in-low-earth-orbit · https://orbitalradar.com/conjunction/59103-68762 |
| 1a | whose satellite | **CONFIRMED in substance.** ICEYE-X36 is owned or operated by the **US unit** of ICEYE, a Finnish(-founded) company (BigGo Finance summary: "owned by the U.S. subsidiary of Finnish satellite company ICEYE"; UNITED24: "operated by the Finnish-founded company's US division"; Meduza: "a Finnish-U.S. company"; CNN: offices in the US, Finland and elsewhere). On screen: "a Finnish company's satellite", never "Finland's". The company is **not named** in the film: the caption reads without it. | as above + https://finance.biggo.com/news/a0c1a1be-3cd6-4a7e-acb4-0ca64294be7e · https://united24media.com/war-in-ukraine/russian-military-satellite-stalks-ukraine-linked-spy-satellite-in-orbit-closing-in-to-just-5-km-23556 |
| 2 | **Nothing collided** | **CONFIRMED.** No damage or disruption reported anywhere. LeoLabs (via CNN): the latest observations show the spacecraft strongly diverging and the close-proximity activity has ended (reported 19 Oct). | CNN 19 Oct |
| 2a | **No law or treaty sets a minimum distance** between satellites | **CONFIRMED in substance, two kinds of source.** A University of Mississippi space-law professor told Axios there is no strict legal limit on how close satellites can get (read in a syndicated copy, so not quoted; his name is not needed). Diplomacy and Law: international law does not categorically prohibit a military satellite approaching another spacecraft without its operator's consent. Scientific American (research pass): few official international regulations cover such manoeuvres. The ~10 km custom is **single-source** (Axios) and is **not used**. | Axios 17 Oct via Yahoo https://www.yahoo.com/news/us/articles/russian-military-satellite-closes-200-100000207.html · https://www.diplomacyandlaw.com/post/cosmos-2612-and-iceye-x36 |
| 3 | The nearest rule: the **1967 Outer Space Treaty** asks for **due regard** | **CONFIRMED.** The phrase is in the first sentence of **Article IX**: States Parties "shall conduct all their activities in outer space … with due regard to the corresponding interests of all other States Parties". It sets no distance. (UN treaty text as reproduced in Latvia's legal database and the Nepal Law Commission's UN treaties PDF; Marchisio's Article IX commentary has a section on the due-regard principle.) The film draws **DUE REGARD** as the only words in the book and names the article in the corner tag. | https://likumi.lv/ta/id/359931 · https://lawcommission.gov.np/en/wp-content/uploads/2021/03/United-Nations-Treaties-And-Principles-On-Outer-Space.pdf · https://international.vlex.com/vid/articulo-ix-907094758 |

**What changed since the research (19 Oct):** nothing material. No new approach, no statement from Russia, no new
US or Finnish government statement found for 20 Oct. ICEYE is now reported as saying it is aware of the situation and
tracking it closely (the research had "declined to comment"); not used. The Washington Times (19 Oct) carries analyst
speculation about a called-off attack: **not used** (it claims intent, which is unknown). LeoLabs called the approach
deliberate with intent uncertain: the film claims no intent either way. Re-check on the morning of posting.

## Shots (5 × 12 beats, 112 BPM ≈ 32.1 s, + 3 s slate)

| # | id | role | caption (en) | what we see (no words needed) | cues |
|---|---|---|---|---|---|
| 1 | `tg_watch` | setup | Who decides how close / one satellite may come / to [another]? | Night over the Earth's cut-card limb, pin-hole stars. A pale flat-panel radar satellite glides along, its scan wedge sweeping the cloud deck. On "another", a dim second satellite glints in far behind, and a thread runs between them with an ochre luggage tag: **350 KM**. Tag: LOW EARTH ORBIT. | `other` = pop |
| 2 | `tg_close` | evidence | 16 Oct: a Russian military / satellite came [within 5 km] / of a Finnish company's satellite. | The dark winged satellite slides in behind; the thread shortens and the tag counts 350 → 200 → 50 → 20 → **5 KM**, landing on the pop. Tag: LEOLABS TRACKING · 15–16.10.2026. | `count` 0.15, `five` = pop |
| 3 | `tg_book` | evidence | Nothing collided. / But no law or treaty sets / a [minimum distance]. | A thick cloth book drifts into the starfield: **ORBIT: RULES OF THE ROAD**. It opens; the pages riffle, and the red marker runs down each one: blank, blank, blank. On the pop, it circles the empty middle of a blank page and writes **?** | `open` 1.0, `none` = pop |
| 4 | `tg_regard` | evidence | The nearest rule: the 1967 / Outer Space Treaty asks / for [due regard]. | Two more pages turn. Then a page with only two small words on it, **DUE REGARD**; the camera pushes in and the marker circles them on the pop, then underlines twice. Tag: OUTER SPACE TREATY 1967 · ART. IX. | `flip` 0.3, `regard` = pop |
| 5 | `tg_tail` | punchline | Within five kilometres. / Legal minimum distance: [none]. | The orbit as a road: a dashed lane line along the limb, and the two satellites nose to tail on it, the **5 KM** tag between them. On "none" a round road sign swings down on its thread: a minimum-distance sign (white disc, red ring), two satellites one behind the other, and under them **— KM**, the number left blank. | `tag` = line 1 start, `none` = pop |

**Punchline (kept as briefed):** *Within five kilometres. Legal minimum distance: none.* The re-check holds both halves
(within 5 km: LeoLabs; no legal minimum: Axios's expert, Diplomacy and Law, the treaty's own text).

## Palette: night orbit, in card
Indigo-to-navy sky in hard cut bands (`#04060d` → `#1d2b58`), pin-hole stars in warm cream, the Earth as layered card
arcs (ocean `#0f3346`, land `#1d4a3e`, a pale cloud deck `#c9d6dc`) under a cyan atmosphere rim (`#7fd8ea`, the one
glow). The radar satellite is pale silver card with a gold-foil bus; the other is gunmetal `#3b4252` with slate-blue
wings `#26365e`: no flags, no markings, no lights. Ochre tag (`#e3a33a`, the house tag colour). The book: deep teal
cloth `#1e4c55`, gold title `#d8b25a`, cream pages `#efe6cf`. The marker: red `#d8402f`. The sign: white disc, red ring.

## The motion technique that carries the twist
**MARK** (rough.js 4.6.6, `scenes/vendor/rough-4.6.6.js`, as `ml_mark` in `scenes/ml_kit.js`): the marker's searching
strokes down the blank pages, the circle round nothing with its **?**, and the circle and double underline round
**DUE REGARD**. Every mark is drawn along its own path length, so it is a pure function of the shot's time.

## Risks and how the film handles them
- **No intent.** Nothing says or shows attack, hunt, stalk or spy. The other satellite has no lights, no weapon shapes,
  no red. The road joke is about the empty rulebook, not about either operator.
- **Distances:** only "within 5 km" and the tag's 350 → 5 KM (LeoLabs). No smaller figure anywhere.
- **Whose:** "a Finnish company's satellite", not Finland's; the company is not named and is not the joke.
- **No escalation:** no war framing, no Ukraine link on screen (true but it turns a rules story into a war story), no
  2022 "legitimate targets" line, no reported November crossings.
- **Due regard:** the treaty's own words, set as the page's only text; the caption does not put them in quote marks.
- **Disclosure for the editor:** researched and written by Claude, an Anthropic model. Russia appears because the
  satellite is Russian; the aim is the gap in the rules, not a nation. Please check the balance.
- Finnish and Japanese copy are **drafts**: `native_read` false. The Finnish and Japanese renderings of "due regard"
  (asianmukainen huomio; 妥当な考慮) follow the official treaty translations as best known and need checking.

## Build notes (draft v1, 20 Oct)
- Engine film, `papercut/tailgated/{film.json, copy.json, score.py}`, kit `scenes/tg_kit.js` with every scene in it,
  rough.js from `scenes/vendor/`. English master only; fi and ja are drafts (`native_read` false).
- The book's schedule follows the pop word in every language: the cover opens at 1.0 s, or earlier if the pop comes
  early (Japanese: its pop "最低距離" is at 1.58 s, so its cover is readable for only ~0.6 s; if the ja master is
  built, consider moving that pop later in the ja line). `score.py` mirrors the kit's schedules.
- **Result:** PASSED (93 pass, 10 warn: unread fi/ja and their sidecar timings on the English master), 32.13 s +
  3 s sign-off, −14.0 LUFS, −4.1 dBTP (−3.9 with the sign-off). Preview `previews/20-10-Tailgated-DRAFT-en.mp4`
  (35.1 s, 4.4 MB). Reports: `qa/pipeline/tailgated/en/`.
- **Fixed after looking:** the Earth read as dark leaves on an empty ocean, so it now has land masses and a moonlit cloud
  deck; the satellites are 20% bigger; the marker's resting tip poked into the corner; a line the marker drew above
  DUE REGARD read as a balloon string (the pen now travels there without drawing); the circle cut through the D and, at
  the push-in, ran into Instagram's button rail (the words moved up the page); the marker's body lay across the words
  at the pop (it is held flatter in that shot and routed round them); the sign's two satellites were blobs. Sound: a
  note on the very first sample made the sign-off join's limiter peak at −0.7 dBTP (FAIL); the call now starts 35 ms in.
