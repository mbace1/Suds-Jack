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
| 1 | **Tue 20 Oct 00:50** | **The Chair Is Taken** (Coxon 5): asked whether it would accept responsibility if its AI caused a death, SpaceXAI came to NYC council by video, 16 Oct | papercut, the City Hall kit from *Committee of the Whole* | 32 s + slate | **Papercut refinement** (standard, step 3): cleaner card and light, the feed-native edit. The first **papercut** film through the pipeline: caption checks, a Coxon cue sheet through the mix chain. | **APPROVED 18 Oct (v2)**: `films/20-10-Coxon5-The-Chair-Is-Taken.mp4`. v1 was not approved ("messaging too unclear"). v2 is one question, "will you accept responsibility?", three answers (a subpoena and a video link; "following the law"; "everybody is in charge"), and the station's answer, "So nobody is." over the SAFETY hat left on the table. Insurance and the odds dial are cut. Both quotes re-found 18 Oct in coverage of the original articles (`research-chair.md` §0). |
| 2 | **Thu 22 Oct 00:50** | **Kill Switch** (Coxon 6): a toaster's standard asks for a backup off switch; the most powerful AI models have no such rule in the US, and California's kill switch is a study, due 16 Nov | the flat safety leaflet (v3, approved) with the 2D motion polish | 24 s + slate | The pipeline's **first full film**. | **APPROVED 18 Oct (v2)**: `films/22-10-Coxon6-Kill-Switch.mp4`. v1 was not approved ("messaging too unclear"; six regulations in 35 s). v2: one comparison, both leaflets side by side from the first frame (8 WARNINGS against 0), the question "Which has a backup off switch: your toaster, or the most powerful AI?", three answers, and "The AI's is a sticky note." The postbox, the stopwatch and the washing machine are cut. The English master airs as is; a Finnish or Japanese master needs a **native read** first (`--air`). |
| 3 | **Sat 24 Oct 12:50** | **Irreversible** (Doodle 3): Google's "irreversible harm" appeal against the EU data-sharing order | papercut | 33 s + slate | — (finished) | **Waiting on the owner's approval, nothing else.** The shot-5 scale the review flagged was removed in its v2 (15 Oct), so the "one picture fix" is already done. |
| 4 | **Tue 27 Oct 00:50** | **Welcome Home** (tech satire 2, after Teslur): a home display's launch film remade in clay, ending on "And your guests?" | the lit clay launch-film stage (v2, approved) | ~30 s + card | The **3D clay standard** where the subject is a product: premium finish, key/fill/rim light, ambient occlusion (AO), an acting pass, lenses. It takes what the Kyoto benchmark (below) teaches. | **Started 18 Oct** (owner: "start next 2"): the one-question script (`clay/welcome/copy.json`: "What does it keep when you leave?") and the shot table (`plan/films/09-welcome-home.md`). Built from the research description; **the owner's frames from the real launch film are still wanted** by Fri 23, or it ships flagged. Next: the hoop and door-camera scenes on the v2 stage. Ready **Mon 26 Oct**. |
| 5 | **Thu 29 Oct 12:50** | **The Scoreboard** (Nordic 2, the satire follow-up): Denmark's bill L 49 exempts satire; who decides what satire is? | papercut, a Copenhagen look (grey stone, green copper) | 32 s + slate | Papercut v2 (from film 1) and the pipeline. | **Started 18 Oct** (owner: "start next 2") on **angle B**, the one the research recommends (angle A is still on the table). Script (`papercut/scoreboard/copy.json`), shot table (`plan/films/08-scoreboard.md`), the kit and all five scenes are built; first frames in `plan/looks/scoreboard-first-frames.png`. Next: the cue sheet, a build, and a polish pass on the pear strip and the dock. Ready Wed 28 Oct. |
| 6 | **Sat 31 Oct 00:50** | **The Day After** (Coxon 7, midterm run-up): the industry's most detailed known plan for the catastrophe it forecasts is about who writes the law afterwards | papercut | 37.5 s + slate | The Coxon set on its last pre-election slot. It hands over to the 2–3 Nov teasers. | **Proposed.** Research is from 9 Oct (`research-governance.md` §4) and needs a refresh before pitching. Ready Fri 30 Oct. |

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
2. **Irreversible:** approve (the shot-5 fix is already in), or hand slot 3 to the reserve?
3. **Welcome Home:** frames from the real launch film, by Fri 23 if possible.
4. **Nordic 2:** started on angle B (*The Scoreboard*); say if you want A (*The Pear's Long Walk*) instead.
5. **The Day After** for the midterm slot, or another Coxon story?
6. **Native reads:** someone to read the Finnish and the Japanese, for Kill Switch's leaflet and for every
   sidecar file from now on.
