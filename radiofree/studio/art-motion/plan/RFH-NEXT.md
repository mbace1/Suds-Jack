# Radio Free Helsinki: the next films, 18 Oct – 3 Nov 2026

Owner, 18 Oct: "Continue these explorations but let's set the next Radio Free H videos in the plan."

**Where the feed stands:**
- Every finished RFH film is out. The last was Coxon 4, at 01:04 on 18 Oct. After it, the campaign calendar
  (`CAMPAIGN_PLAN.md` §3) has only reposts and X posts. This plan fills its new-film slots up to the midterms.
- Two rules hold throughout:
  - **Every exploration ships inside a real film.** The production standard's tests (papercut refinement, the
    3D clay bar, the pipeline) each land in a scheduled video instead of a standalone test.
  - **Every new film is built by pipeline:** `copy.json`, a cue sheet and `pipeline/build.py`, so it reaches the
    owner already checked. See `pipeline/README.md`.

Slots follow the calendar's logic: **00:50** reaches the US evening (US stories), and **12:50** reaches the
European day (Nordic and EU stories). All times are Helsinki time.

## The schedule

| # | Post | Film | Look | Length | What it carries forward | Status and gate |
|---|---|---|---|---|---|---|
| 1 | **Tue 20 Oct 00:50** | **The Chair Is Taken** (Coxon 5): SpaceXAI testifies to the NYC council by video, 16 Oct | papercut, the City Hall kit from *Committee of the Whole* | 37.5 s + slate | **Papercut refinement** (standard, step 3): cleaner card and light, the feed-native edit. The first **papercut** film through the pipeline: caption checks, a Coxon cue sheet through the mix chain. | **In build, 18 Oct**: the first build passed every check (41.2 s + sign-off); the final render (fuller score, dial fix) is running. Gate before air: each on-screen quote checked against its original page; the owner's look at the clean light. |
| 2 | **Thu 22 Oct 00:50** | **Kill Switch**: a toaster's standard asks for a second off switch; California's AI kill switch is a study, due 16 Nov | the flat safety leaflet (v3, approved) with the 2D motion polish | 37.5 s + slate | The pipeline's **first full film**: the 11 s pilot grown to the pitched six beats (postbox and stopwatch, VOLUNTARY sticker, washing-machine leaflet). | **In build, 18 Oct**: stills and text checks pass (34.6 s; the fi 38.9 s and ja 42.7 s masters plan cleanly); the full render is queued. Gates: quotes checked. The leaflet's printed Finnish and Japanese need a **native read**, or the broadcast build fails (`--air`). Without one, those lines come off the artwork. |
| 3 | **Sat 24 Oct 12:50** | **Irreversible** (Doodle 3): Google's "irreversible harm" appeal against the EU data-sharing order | papercut | 37.5 s + slate | — (finished) | **Waiting on the owner.** One picture fix in shot 5 (`review-final-4-5.md`), then approval. |
| 4 | **Tue 27 Oct 00:50** | **Welcome Home** (tech satire 2, after Teslur): a home display's launch film remade in clay, ending on "Your guests?" | the lit clay launch-film stage (v2, approved) | ~28 s + card | The **3D clay standard** where the subject is a product: premium finish, key/fill/rim light, ambient occlusion (AO), an acting pass, lenses. It takes what the Kyoto benchmark (below) teaches. | Greenlit 17 Oct. **Needs the owner's frames from the real launch film** (Teslur only became exact with broadcast frames). If none arrive by Fri 23, it is built from the research description and flagged. Ready **Mon 26 Oct**. |
| 5 | **Thu 29 Oct 12:50** | **Nordic 2, the satire follow-up**: Denmark's L 49 against 195 years of faces on trial | papercut | 37.5 s + slate | Papercut v2 (from film 1) on a period-hopping film: one paper object walking through every era. | **Proposed.** Research done (`research-satire-history.md`). **The owner picks the angle:** A, *The Pear's Long Walk*, or B, *The Scoreboard*. Ready Wed 28 Oct. |
| 6 | **Sat 31 Oct 00:50** | **The Day After** (Coxon 6, midterm run-up): the industry's most detailed known plan for the catastrophe it forecasts is about who writes the law afterwards | papercut | 37.5 s + slate | The Coxon set on its last pre-election slot. It hands over to the 2–3 Nov teasers. | **Proposed.** Research is from 9 Oct (`research-governance.md` §4) and needs a refresh before pitching. Ready Fri 30 Oct. |

**Reserve:** *It Was Only a Test* (`research-governance.md` §2), the AI Act's first named case and an EU 12:50
story. It takes slot 3 if Irreversible is not approved, or slot 5 if neither satire angle is wanted.

## The explorations, alongside

| Exploration (standard, order of work) | When | Lands in |
|---|---|---|
| 1. The pipeline: text, sound, checks | **Done 17 Oct** | every film above |
| 3. Papercut refinement | Sun 18 – Mon 19 Oct | **The Chair Is Taken** (film 1), so it ships rather than staying a test. It is pulled ahead of step 2 because it carries the first deadline |
| Pipeline in the papercut engine: `captions.js` and a cue sheet with the Coxon series | with film 1 | every papercut film after it |
| 2. 3D clay benchmark: Kyoto Toko at the irori, at the Aardman/*Kubo* bar | Tue 20 – Thu 22 Oct | **Welcome Home** (film 4) takes its lighting, materials and acting pass. The Kyoto shot is also the Toko channel's calibration |
| 4. 2D benchmark at the Kurzgesagt bar (manga or JRPG Tokyo Toko) | after film 4 | none of these films. It sets the bar for the next new look |

## For the owner

1. **The dates.** Six slots, 20 Oct – 31 Oct. Three films are greenlit, two are proposed, one is finished.
2. **Irreversible:** approve with the shot-5 fix, or hand slot 3 to the reserve?
3. **Welcome Home:** frames from the real launch film, by Fri 23 if possible.
4. **Nordic 2:** angle A (*The Pear's Long Walk*) or B (*The Scoreboard*)?
5. **The Day After** for the midterm slot, or another Coxon story?
6. **Native reads:** someone to read the Finnish and the Japanese, for Kill Switch's leaflet and for every
   sidecar file from now on.
