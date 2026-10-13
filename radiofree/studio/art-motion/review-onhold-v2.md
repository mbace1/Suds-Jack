# On Hold v2: independent review

**Score: 6/10. Verdict: SHIP WITH FIXES.** Findings 1–3 must be fixed before publishing. The rest are polish.

**Checked and correct:**
- The tax went from 0.05 to 2.24 c/kWh, in force 1.7.2026 (Vero.fi, VaVM 28/2025).
- ≈×45 is right (2.24 / 0.05 = 44.8).
- €47 m/yr is the state's estimate "at 2026 level".
- The support was capped at €30 m (VN 5.12.2025; Xinhua/Yle say "≈€30 m a year").
- It was dropped after the budget talks on Tuesday 1.9.2026.
- The announcement was on 9.9.2026: at least €13 bn, 2027–28, Hamina/Kajaani/Muhos/Vaala.
- "Eight days" is right, and all nine calendar weekdays are right (1 Tue … 9 Wed).
- **"The government dropped it" is fair.** It was a planned scheme that was never enacted, and the government abandoned it in its budget session.
- Captions: about 745 px wide at most, never clipped, always in empty bands.

## Findings (most severe first)

1. **The gate-opening shot is a week out of date** (25.7–32.1: gate opens, cranes turn, workers go in, tagged KAJAANI · MUHOS). On 6–7 Oct 2026 the regulator (LVV) ordered Doodle's subsidiary Tuike Finland to stop preparatory work at exactly Kajaani and Muhos, pending an environmental impact assessment. About 330 ha and about 200 ha of forest had already been cleared, and police are investigating Muhos (AFP/Al Jazeera 7.10.2026, Yle 74-20250446). Released now, the open gate is stale, and the new order is the obvious punchline.
   *Fix:* add a beat that rehangs the ON HOLD sign, with the captions "In October, Finland's regulator put both sites on hold again." / "The forest was cleared before the environmental assessment."

2. **The closing scale is labelled honestly but misleads as a picture** (32.1–37.4).
   - €47 m is the state's yearly take from *today's* data centres, and that excludes the Doodle sites that did not exist yet. €13 bn is Doodle's capital spending over two years.
   - A scale says the two weigh against each other. Flinging the coin off at 35.6 leaves the last frame with an empty TAX RISE pan, so the tax looks like zero.
   - In fact, every 100 MW running flat out pays about €19 m a year more at +2.19 c/kWh. Doodle's own tax exposure grows with exactly the sites in the plan.
   - *Fix:* keep the coin in the pan (the pan rises, the coin stays). Relabel it "TAX RISE · TODAY'S DATA CENTRES · PER YEAR". Give the right pan a matching card, "DOODLE INVESTMENT · 2027–28 · ITS OWN SITES". Change the caption to "…a year, from today's data centres." Or drop the scale and end on the sequence: hold → tax → support dropped → it came anyway. That sequence is the on-record joke.

3. **The cheque makes Doodle's investment look like a payment to the state** (22.3–25.7, and the end). "PAY Finland €13 000 000 000" plus the caption "€13 billion *for* Finland" presents money spent on Doodle's own data centres as money paid to Finland.
   *Fix:* make the payee "Doodle Data Centres" (or "PAY: itself"), and change the caption to "at least €13 billion **in** Finland".

4. **The snip comes too early, then nothing happens** (15.6–19.3). The scissors cut at about 15.6 and the envelope is gone by 16.3, before "dropped" pops at 16.36. Then 16.4–19.3 is about 3 s of a still palace with leaves.
   *Fix:* land the snip on "dropped" (about 16.4), slow the fall to about 17.5, and trim the hold or animate the windows going dark.

5. **The cheque does not land in the pan** (35.6–37.43). It floats above the right pan, across its strings. Its right edge is 4 px from the frame border, and its date and place names shrink to about 14 px, which is unreadable on a phone.
   *Fix:* scale the cheque to about 0.6× so it rests inside the pan with at least 40 px of margin.

6. **You cannot follow the calendar count** (20.2–22.4). Torn pages pile up in front of the pad instead of flying away, so the pad and its SEPTEMBER header are hidden for about 2 s. At 22.25, page 8 still covers the 9 as "€13 billion" appears.
   *Fix:* each page leaves the frame within about 0.3 s, no more than 2 are in flight at once, and the pad stays visible.

7. **The meter looks broken** (7.0–12.9).
   - The rolling tax digits are not masked: at 8.0 the "4" pokes through the card's inner rule.
   - The odometer wheels sit half-rolled, so at 11.0 it reads like garbage.
   - The "≈ ×45" stamp runs off the meter face, covers "3 × 230/400 V", and its × is tiny at phone size.
   - *Fix:* clip the digits to a window, step the odometer, keep the stamp inside the face and enlarge the ×.

8. **The workers do not walk in** (27.75–31.8). They pop in facing the camera, then stand still for about 3.5 s with paper-doll legs. Facing the camera, they read as walking *out*.
   *Fix:* walk them away into the site, staggered and getting smaller.

9. **Two dissolves stack text on text** (6.3–6.6 and 25.6–26.0). They put the "9" over ON HOLD and stack two date tags ("10.2025" over "1.7.2026", and the cheque over "9.9.2026").
   *Fix:* cut on the beat, or fade the tags out before the dissolve.

10. **A falling leaf crosses the envelope's figure** (14.5). It passes over "€30 M / YEAR".
    *Fix:* route the leaves behind the envelope.

11. **The sound is too loud and the last hit is choked** (I −13.9 LUFS, TP −1.4 dBFS).
    - That is 2 LU hotter than RFH's −16 LUFS master.
    - The last hit (35.15) decays naturally to −24 dB by 35.95. Then it drops another ~38 dB in 0.3 s (36.0–36.25), leaving 1.2 s of near-silence (−62 to −90 dB) under the final card.
    - The ring-out is cut short. The file does not end on a hard chop.
    - *Fix:* let the tail decay over the last 1.3 s, and master to −16 LUFS.

12. **Minor facts**
    - The coin reads "€47 M" without the "≈" the shot table specifies.
    - "≈ €30 M" was officially a cap ("at most €30 m"), so "UP TO" is tighter.
    - "≈ ×45" is correct on the tax rates alone. Counting the 0.013 c supply-security fee it is about ×36, and the press says "40-fold". It is defensible, but be ready to explain it.
    - "10.2025" is plausible (Verde 23.10.2025), but no search excerpt confirmed the month. Google's quoted consultation statement is dated April 2025.
