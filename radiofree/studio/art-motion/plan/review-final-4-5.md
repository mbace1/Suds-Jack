# Final review: films 4 and 5 (15 Oct 2026)

**Reviewer:** an independent editor agent that did not build either film. It is also Claude.

**What I reviewed:**
- `渲染/irr_captions.mp4` and `渲染/sat_captions.mp4`: 1080×1920, 30 fps, 37.5 s, silent. Audio was not reviewed.
- A 1 fps contact sheet of each film, plus half-resolution stills of every shot.
- The captions in order, from `subs/irr_H.ass` and `subs/sat_H.ass`.
- The shot tables, and sections 4 and 5 of `review-preproduction.md`.
- One frame from each of films 1 to 5 side by side, to compare how they look.
- Spot checks by web search on Christiansborg's tower, DMA Recital 61, and Google's interim-relief request.

| # | film | verdict |
|---|---|---|
| 4 | Irreversible | **FIX.** One picture change in shot 5. Everything else ships. |
| 5 | Satire Excepted | **FIX.** One small picture change in shot 6. Everything else ships. |

---

## 4 · Irreversible: FIX

**Captions as built:**
1. The EU ordered Doodle · to share **anonymised** · search data with rivals.
2. Doodle went to court, · warning of "**irreversible** · harm" to privacy.
3. The law already says · the data must be · **irreversibly** anonymised.
4. The search history · it is protecting · is the one **it keeps**.
5. Doodle: not anonymous enough. · The EU: it has **safeguards**.
6. Your searches: **protected**. / From everyone · but Doodle.

**1. Does the story read?** Yes. The order, the appeal, the law's own wording, the irony, both sides, then the punchline. Each shot has one caption that the picture matches, and the tags (COMMISSION, GENERAL COURT, RECITAL 61) anchor every claim.

**2. Does the joke land?** Yes. The paper tape runs from the search bar to the cabinet from shot 1 onward. So when the ending shows a padlock marked Doodle on the bar, and a hand in a four-colour cuff copying the tape behind the glass, the reveal has been set up, and "From everyone · but Doodle." confirms it.

**3. Were the pre-production fixes applied? All of them:**
- the six captions, word for word;
- both sides stated in shot 5;
- the padlock kept for the ending only;
- shot 5 shows two speech cards, one in Doodle's colours and one in EU blue;
- the tape is established in shot 1 and again in shot 4;
- the hand has a four-colour cuff;
- the envelope reads SHARE DATA, with the stars;
- the twin gold towers are drawn.

**4. Facts, fairness and naming: all pass.**
- Google appears only as "Doodle".
- Only the words "irreversible harm" are in quote marks, and they are Google's reported words.
- Both sides are stated in shot 5.
- Nobody real is given a face. The small figure in shot 4 is a generic viewer.
- Recital 61 does define anonymised data as "irreversibly altered". It is a recital, so it is not binding on its own, but Article 6(11) requires the anonymisation. "The law already says" stands with the RECITAL 61 tag.
- Interim relief: Google asked the court to pause the order. No ruling had been reported as of 15 Oct. The film claims nothing about this, so a ruling would not break it. Check again on the day you post.

**5. Picture: no clipping and no overlap with captions. Everything is readable at phone size.**

**Fixes:**
1. **(Required) Replace the scale in shot 5.** Film 5 also uses a gold balance scale in shot 5, at the same 26–32 s, in front of a curtain, and film 5's ending depends on its scale. The owner wants each film to look different, and these two would post back to back.
   - Keep the two speech cards and drop the scale.
   - For example, the two cards could pop on in turn from either side of the paper tape, each holding one end of it.
   - Re-render shot 5 only.
2. **(Optional)** In `irr_caps.py`, use curly quotes (“irreversible … harm”) to match the speech card. The caption currently uses straight `"`.

---

## 5 · Satire Excepted: FIX

**Captions as built:**
1. Denmark wants your face · to be **yours**, by law.
2. An AI copy of your face, · voice or moves would need · your **consent**.
3. The bill is in parliament, · aimed at **1 January**.
4. Except for **satire** · and parody.
5. A court would decide · what counts as **a joke**.
6. This has been satire. / **Probably.**

**1. Does the story read?** Yes. Shot 2 shows a face card, a voice card and a movement card, each with a © tag, so "face, voice or moves" is shown as well as said. In shot 3 the calendar flips from 8 October to a red-circled 1 January 2027, under the tag BILL L 49 · TABLED 8.10.2026.

**2. Does the joke land?** Yes.
- The presenter, with a magenta head, holds up the generic SATIRE ONLY mask on a stick: "This has been satire."
- After a 2.0 s gap, "Probably." appears and the scale from shot 5 swings in beside him and wobbles.
- The joke is on the law and on the station, never on deepfake victims.

**3. Were the pre-production fixes applied? All of them:**
- captions 2, 4 and 6, word for word;
- the ending no longer says "From January";
- shot 5 weighs a laughing mask against one tagged MISLEADS. The second mask is still a sad, tragedy-style face, but the tag carries the meaning. Acceptable.
- the SATIRE ONLY mask is a generic face;
- the mask is on a stick;
- the scale swings in on "Probably."

**4. Facts, fairness and naming: all pass.**
- Nothing says the bill will pass. The captions use "wants", "would need", "is in parliament, aimed at" and "would decide", and the tag says TABLED.
- The exception is "satire and parody". The bill also exempts caricature and criticism, so this is a fair shortening.
- No minister is named, and no real face is shown. The masks are Toko faces in the carrier colours, plus one generic face.
- **Christiansborg reads**, with the copper-green roofline, the stone tower, the canal, the Danish flags and the FOLKETINGET tag. One detail is wrong: the real spire carries **three** crowns, and the drawing has two.

**5. Picture: no clipping and no overlap with captions,** with one exception: the scale's hanging string, described in fix 1. The MISLEADS tag and the SATIRE ✓ PARODY ✓ card are readable at phone size.

**Fixes:**
1. **(Required) The scale's string in shot 6.** In the final frames (34.8–37.5 s), the string drops from the top of the frame at about x 805 px, right against the full stop of "satire.". It looks like a stray line through the punchline.
   - Hang the scale from below the caption block (y ≥ 460 px).
   - Or move the string's pivot about 80 px right.
   - Re-render shot 6 only.
2. **(Optional)** Add a third crown to the tower's spire in shot 1.

---

## Both films

**How each film looks:** shots 1–4 and 6 are clearly their own. Film 4 is in Brussels daylight blues and whites. Film 5 is in Copenhagen red, beech wood and candlelight. Both differ from films 1–3: Americana, a dark navy room, and a teal studio. The only overlap is the shot 5 scale, covered in film 4's fix 1.

**Paperwork:** the shot tables `films/04-irreversible.md` and `films/05-satire-excepted.md` still have the pre-review captions and pictures. Update them to match the build, so that the next person does not "restore" the old wording:
- in film 4: the shot 5 conveyor and padlocks, and "Doodle is protecting…";
- in film 5: "With one exception", and "Lucky for us…".

**Sources:**
- [Danish Parliament, the tower's history](https://www.thedanishparliament.dk/en/the-tower/the-history)
- [DAC, Christiansborg Palace](https://dac.dk/en/knowledgebase/architecture/christiansborg-palace)
- [Prighter, DMA Recital 61](https://prighter.com/resources/laws/digital-markets-act/recitals/recital-61)
- [Wolters Kluwer competition blog](https://legalblogs.wolterskluwer.com/competition-blog/rolling-with-the-punches-the-european-commissions-approach-to-the-sharing-of-search-data-under-article-611-dma/)
- [Search Engine Land](https://searchengineland.com/google-appeals-the-european-commissions-dma-mandate-to-share-search-data-492211)
- [Cybernews](https://cybernews.com/news/google-eu-competition-lawsuit/)
