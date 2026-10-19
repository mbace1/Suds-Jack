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

**Cadence (owner, 18 Oct): no fixed slots.** An approved film goes out at the next 12-hour release window (00:50 or
12:50), and the Grok bot posts it. The table below keeps its dates as targets. The real order is what is approved
first; the one hard date is **The Day After, before the 3 Nov midterms**.

**Queue (18 Oct):**
1. *Welcome Home*: **APPROVED 19 Oct (v5)**: `films/21-10-BigTech1-Welcome-Home.mp4`, the 00:50 window on 21 Oct (a US tech story; between The Chair Is Taken and Kill Switch).
2. *The Day After*: **APPROVED 18 Oct**: `films/23-10-Coxon7-The-Day-After.mp4`, the first 00:50 window after *Kill Switch* (22 Oct), whose sticky note is its last shot. Kill-switch detail checked against Axios 18 Oct.
3. *It Was Only a Test*: **APPROVED 19 Oct (v3)**: `films/19-10-Coxon8-It-Was-Only-a-Test.mp4`, the 12:50 window on 19 Oct (an EU story).
4. *Same Trick, Two Verdicts*: **APPROVED 19 Oct (v3)**: `films/20-10-Coxon9-Same-Trick-Two-Verdicts.mp4`, the 12:50 window on 20 Oct (EU/US).

Slots follow the calendar's logic: **00:50** reaches the US evening (US stories), and **12:50** reaches the
European day (Nordic and EU stories). All times are Helsinki time.

## The schedule

| # | Post | Film | Look | Length | What it carries forward | Status and gate |
|---|---|---|---|---|---|---|
| 1 | **Tue 20 Oct 00:50** | **The Chair Is Taken** (Coxon 5): asked whether it would accept responsibility if its AI caused a death, SpaceXAI came to NYC council by video, 16 Oct | papercut, the City Hall kit from *Committee of the Whole* | 32 s + slate | **Papercut refinement** (standard, step 3): cleaner card and light, the feed-native edit. The first **papercut** film through the pipeline: caption checks, a Coxon cue sheet through the mix chain. | **APPROVED 18 Oct (v2)**: `films/20-10-Coxon5-The-Chair-Is-Taken.mp4`. v1 was not approved ("messaging too unclear"). v2 is one question, "will you accept responsibility?", three answers (a subpoena and a video link; "following the law"; "everybody is in charge"), and the station's answer, "So nobody is." over the SAFETY hat left on the table. Insurance and the odds dial are cut. Both quotes re-found 18 Oct in coverage of the original articles (`research-chair.md` §0). |
| 2 | **Thu 22 Oct 00:50** | **Kill Switch** (Coxon 6): a toaster's standard asks for a backup off switch; the most powerful AI models have no such rule in the US, and California's kill switch is a study, due 16 Nov | the flat safety leaflet (v3, approved) with the 2D motion polish | 24 s + slate | The pipeline's **first full film**. | **APPROVED 18 Oct (v2)**: `films/22-10-Coxon6-Kill-Switch.mp4`. v1 was not approved ("messaging too unclear"; six regulations in 35 s). v2: one comparison, both leaflets side by side from the first frame (8 WARNINGS against 0), the question "Which has a backup off switch: your toaster, or the most powerful AI?", three answers, and "The AI's is a sticky note." The postbox, the stopwatch and the washing machine are cut. The English master airs as is; a Finnish or Japanese master needs a **native read** first (`--air`). |
| 3 | **Sat 24 Oct 12:50** | ~~**Irreversible** (Doodle 3)~~ **scrapped** (owner, 18 Oct). **Open**: the reserve, *It Was Only a Test*, the AI Act's first named case | papercut | ~30 s + slate | — | **Make it** (owner, 18 Oct). Research refreshed, pitched: `plan/films/11-only-a-test.md`. |
| 4 | **Tue 27 Oct 00:50** | **Welcome Home** (tech satire 2, after Teslur): Pear's HomeView launch ad remade in clay. It sells privacy; its happy ending is the family watching the daughter's boyfriend on its camera | the plasticine clay stage (film-wh2) | ~28 s + card | The **3D clay standard** where the subject is a product. | **v4 built 18 Oct, waiting for approval**: `previews/18-10-Welcome-Home-v4-en.mp4` (owner on v3: all claymation, no 2D, the boot screen just "Pear AI. For the future.", built from the ad's own four frames). v1 and v2 did not land; v3 mixed styles. "Pear's new home screen, HomeView, is sold on privacy. But whose?" → "Her messages: private. Her boyfriend: family viewing." |
| 5 | **Thu 29 Oct 12:50** | ~~**The Scoreboard** (Nordic 2)~~ **scrapped** (owner, 18 Oct: "still too vague as we only get the headlines … make it much better or scrap"). **Open.** | — | — | — | **Make it** (owner, 18 Oct): *Same Trick, Two Verdicts*, pitched: `plan/films/12-same-trick.md`. |
| 6 | **Sat 31 Oct 00:50** | **The Day After** (Coxon 7, midterm run-up): the industry's most detailed known plan for the catastrophe it forecasts is about who writes the law afterwards | papercut | 37.5 s + slate | The Coxon set on its last pre-election slot. It hands over to the 2–3 Nov teasers. | **Built 18 Oct, waiting for approval**: `previews/18-10-The-Day-After-en.mp4` (32.7 s + slate). `plan/films/10-the-day-after.md`. Research refreshed 18 Oct; the new detail is the required kill switch on the after-list, which makes it the payoff of *Kill Switch*. Ready Fri 30 Oct. |

**Reserve:** *It Was Only a Test* (`research-governance.md` §2), the AI Act's first named case and an EU 12:50
story. Irreversible was scrapped on 18 Oct, so it is the candidate for slot 3.

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
2. **Slot 3 (Sat 24 Oct):** make the reserve, *It Was Only a Test*, or leave it empty?
3. **Welcome Home:** frames from the real launch film — received 18 Oct (four, in order); v4 is built from them.
4. **Slot 5 (Thu 29 Oct):** The Scoreboard is scrapped. Make *Same Trick, Two Verdicts*, or leave it empty?
5. **The Day After** for the midterm slot, or another Coxon story?
6. **Native reads:** someone to read the Finnish and the Japanese, for Kill Switch's leaflet and for every
   sidecar file from now on.
