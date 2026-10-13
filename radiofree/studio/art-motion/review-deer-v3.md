# Review: "Unexpectedly, a Deer" v3 (dr_v3_captions.mp4)

**Score: 6.5/10. Verdict: ship after fixes.** The idea is good, the brief's quote is exact, and the antlered shadow is the best image in the film. Two caption claims rest on weaker footing than they read. The ending caption breaks its own key fact across two lines. Three shots do not show what their captions say.

## Facts

What checks out:
- The brief text matches the Ars headline exactly.
- AI descriptions and Home Brief really are Premium **Advanced** features ($20/month or $200/year). Standard ($10) has neither.
- Google's Spring 2026 Home update still says "early access".
- "Clip after clip" is supported by the coverage, which says the system "frequently" read the dogs as deer.

1. **High · 32.8 s: "Another reviewer's dog was a fox."** I could not corroborate the Verge fox in any search excerpt. The pet mix-up I could confirm is Wired's (Julian Chokkattu): his dog was called a cat. Reddit users also reported cats as raccoons.
   *Fix:* keep "fox" only if someone has the Verge sentence in hand. Otherwise use "Another reviewer's dog was a cat."
2. **Medium · 16–31 s: one reviewer reads as two.** "As one reviewer got it" and then "It was not a one-off. One reviewer's dogs…" are the same Ars reviewer. A viewer will count two reviewers seeing deer, which inflates the evidence.
   *Fix:* "**The same reviewer's** dogs were logged as deer in clip after clip."
3. **Medium · 16–19 s: "Word for word"** sits over a card that shows one sentence as the whole brief. A real Home Brief is a paragraph.
   - The excerpts I found only say Gemini "reported" the deer. They don't confirm the line came from the Home Brief rather than a clip description.
   - *Fix:* "One line of it, word for word." Confirm brief vs. notification before labelling the card "Daily brief".
4. **Low · 34.7 s: "The feature: $20 a month"** suggests a price for the feature alone. In fact $20 buys a plan, and AI Ultra subscribers get that plan included.
   - With a Helsinki flat on screen, viewers may also assume it's sold in Finland. The sources only cover early access in a handful of other countries.
   - *Fix:* "It needs the $20-a-month plan, still in early access."
5. **Low · 25.7–32 s: the "DEER ×4" tally invents a count.** No source gives a number.
   *Fix:* use "DEER ×∞", or a stack of tags with no number.

## Picture

6. **High · 34.7–37.2 s: the payoff caption splits "$20 a / month" across two lines.**
   - The ×1.2 pop then reflows the block: line 4 grows from about 565 px to 610 px.
   - That is 4 lines and ~13 words to read in 2.5 s. The captions clear at 37.2 s.
   - *Fix:* put in manual breaks: `Another reviewer's dog was a fox.` / `It needs the $20-a-month plan,` / `still in early access.` Start line 2 at about 34.2 s.
7. **Medium · whole film: the caption wraps leave orphans.** Examples: "It watches, and / writes up the day" at 3 s, "Word for word, as / one reviewer got it" at 16 s, and four-line blocks at 29 s.
   *Fix:* set every `\N` in `dr_caps.py` by hand.
8. **Medium · 0–6 s and 19–26 s: the red LED on Toko's mask blinks right beside his face.**
   - It is the brightest blinking red in the frame, so it competes with the camera that caption 1 introduces. At phone size it reads as a wound or an earring.
   - A stray red glow also floats beside the phone at 17 s (about x 865, y 700).
   - *Fix:* `led:false` in `dr_flat`/`dr_look`, and remove the glow beside the phone. The camera should be the only light that blinks.
9. **Medium · 19.3–25.7 s: "Toko looks at the dog" isn't on screen.**
   - Toko's mask faces the viewer and he is half cut off by the left edge.
   - The dog's nose is at Toko's hip, so they aren't face to face, and the head tilts are tiny. That leaves 6.4 s with nearly nothing happening.
   - *Fix:* turn the mask to three-quarter, looking down. Lift the dog's head toward the mask. Cut the shot to 8 beats (4.3 s).
10. **Medium · 0–6 s and 32–37.5 s: the frame edge cuts off the sleeping dog's head.** In the last shot the DEER brackets close on that edge too.
    - At 7–13 s the dog's head stays outside the box on the left the whole time, so the "AI frame" looks broken rather than wrong on purpose.
    - At 27–32 s the antlered shadow's muzzle runs off the right edge.
    - *Fix:* move the dog/shadow about 120 px left and widen the brackets to x−400.
11. **Medium · 13.9–19.3 s: the brand doesn't read as renamed.**
    - The Doodle Home icon is a house in Google's blue/red/yellow/green: Google Home trade dress.
    - The clip thumbnail reads as a coffee table, not a dog.
    - *Fix:* recolour the icon in house ochre/magenta. Draw the thumbnail dog with a raised head and visible legs.
12. **Low · 25.7–32 s: the coat-rack gag is lost.** The rack's hooks don't cast the antlers; the antlers simply grow on a shadow that has no link to the rack.
    *Fix:* line the rack up with the shadow's head so the hooks *become* the antlers.
13. **Low:** the dissolves at 6.6, 13.0 and 26.0 s double-expose two cameras, two dogs and a ghost Toko. They're acceptable but muddy. Cutting on the beat would be cleaner.

## Sound and ending

14. **Low:** loudness measures **−14.0 LUFS integrated, −0.3 dBTP true peak.** That is 2 LU over RFH's −16 master, and AAC re-encoding may clip.
    - The audio tail rings out properly: about −10 dB RMS at 36.2 s down to −55 at 37.4 s.
    - The picture, though, holds full brightness to the last frame, so the image chops while the sound rings.
    - *Fix:* master to −16 LUFS with a −1 dBTP limit, and add an 8–10 frame dip in the last 0.3 s.

## Paperwork

15. **`镜头表_deer.md` doesn't match the render.**
    - Caption 3 and caption 6 have different wording in the film.
    - The table lists a "$20 / MONTH" card and "DOODLE HOME" text in shot 1; neither is in the film.
    - The table's Sources section doesn't cite Wired.
    - *Fix:* update the table to match the cut that ships.
