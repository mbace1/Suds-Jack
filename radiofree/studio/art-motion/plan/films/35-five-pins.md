# 35 · Five Pins (RFH Helsinki): papercut, VIRAL cut (stills checkpoint, 3 Nov)

**Owner, 3 Nov:** "for the Helsinki data center pitch one as well", then "Show me the latest / Show and I can approve".
This is a **stills checkpoint only**: no full build, nothing posted.

- Kit: `scenes/fpn_kit.js`; film: `papercut/five-pins/{film.json, copy.json, score.py}`.
- Stills sheet: `previews/03-11-RFH-Five-Pins-stills.jpg`. It holds nine stills:
  - en at 0.05, 2.2, 6.2, 9.6, 12.2, 14.2 and 17.6 s;
  - fi at 3.5 s (the longest Finnish hook line);
  - ja at 11.6 s (the heat shot).
- Stills script (scratch): `fpn_stills.sh <lang> <global times>`. It is `rtr_stills.sh` with the names changed: it plans
  the film, stages the kit into the engine, renders each still in its own shot, and runs the real caption pass over
  the stills.
- **Naming (owner, 2 Nov):** Google is named in plain type, with no logo and no Doodle parody.

## Pitch

On 2 Nov, Helsinki decided in public, before anything is built, where data centres may go: five possible areas.
Their waste heat must go into district heating, and they must stay out of the most valuable nature. At Google's
Muhos site, about 330 ha of forest was cleared before the required environmental assessment. **Map first in
Helsinki; forest first in Muhos.** No wrongdoing by Helsinki or by Google is claimed beyond what is on record. The
contrast is the order of events.

## Fact table

Every line comes from search summaries. The Helsinki decision record on paatokset.hel.fi is blocked from here; the
wording is from the city's own news item.

| claim | where it is used | status | sources |
|---|---|---|---|
| The City Board adopted the data-centre siting principles on 2 Nov 2026 | caption 1; tag "HELSINKI CITY BOARD · 2.11.2026" | CONFIRMED (the city's news item, STT, Helsingin Uutiset) | [hel.fi](https://www.hel.fi/fi/uutiset/kaupunginhallitus-hyvaksyi-datakeskusperiaatteet), [STT](https://www.sttinfo.fi/tiedote/72466598/helsingin-kaupunginhallitus-hyvaksyi-datakeskusperiaatteet?lang=fi), [Helsingin Uutiset](https://www.helsinginuutiset.fi/paikalliset/9897346) |
| The five possible areas are Heikinlaakso, Malmi, Salmisaari, Östersundom and Myllypuro | caption 2; the pin flags; post | CONFIRMED (same sources; Verkkouutiset on the draft) | as above, plus [Verkkouutiset](https://www.verkkouutiset.fi/a/naille-viidelle-helsingin-alueelle-voi-tulla-datakeskus) |
| Not in the most valuable nature areas (arvokkaimmille luontoalueille), and not at public-transport hubs | tag on shot 2 (the nature half only) | CONFIRMED (the city's news item) | hel.fi |
| Waste heat must be used substantially in the district-heating network | caption 3 ("must warm homes"); tag "WASTE HEAT → DISTRICT HEATING" | CONFIRMED. "Must warm homes" is the station's plain reading. The tag and the Finnish line say it literally. | hel.fi |
| First construction possibly 2028 | nowhere | reported | hel.fi, Verkkouutiset |
| Muhos: about 330 ha cleared, Google's own figure | clip "~330 ha"; post | CONFIRMED as Google's own figure (Fortune 26 Oct, Kainuun Sanomat, MT). The regulator says over 300 ha. | [Fortune](https://fortune.com/2026/10/26/wolves-finland-google-1300-acres-data-center/), [Kainuun Sanomat](https://www.kainuunsanomat.fi/artikkeli/google-aikoo-istuttaa-130-hehtaaria-puuta-muhoksella-toimimme-viranomaisen-ohjeistuksen-mukaisest) |
| Cleared before the required environmental assessment: LVV, 6 Oct, ordered work at Muhos and Kajaani to stop until the assessments are done | caption 4; clip label; post | CONFIRMED (AFP, Al Jazeera 7 Oct, Kaleva, SSS). The posted film Count the Trees uses the same fact. | [Kaleva](https://www.kaleva.fi/lvv-on-tehnyt-poliisille-tutkintapyynnon-googlen-m/13720712), [SSS](https://www.sss.fi/2026/10/lupa-ja-valvontavirasto-teki-muhoksen-datakeskushankkeesta-tutkintapyynnon-poliisille/) |
| Tuike Finland represents Google at Muhos | the stake reads "GOOGLE · DATA CENTRE SITE" | CONFIRMED (Reuters, 29 Oct, via Al Jazeera) | [Al Jazeera](https://www.aljazeera.com/economy/2026/10/29/finland-launches-criminal-probe-of-suspected-environmental-damage-by-google) |
| Oulu police investigation (29 Oct) | **not used**: kept for "Cut First" | REPORTED | HS-SCOUT, 3 Nov 17:16 |

**The map is illustrative.** The coast and islands (Lauttasaari, Laajasalo, Santahamina, Suomenlinna), Central Park,
the eastern forests and the main roads were drawn by hand from the city's general shape. It is not a survey and not
the city's own site map. Each pin stands on its district, not on a plot; the city's site boundaries were not seen.
The pin positions are approximate:

| area | lon | lat |
|---|---|---|
| Salmisaari | 24.905 | 60.163 |
| Malmi | 25.02 | 60.25 |
| Heikinlaakso | 25.095 | 60.27 |
| Myllypuro | 25.075 | 60.226 |
| Östersundom | 25.19 | 60.255 |

The houses are generic.

## Shot table (140 BPM; en 18.4 s, plus the sign-off)

| # | role | caption (en) | picture | tag |
|---|---|---|---|---|
| 1 fpn_hook (8 beats) | setup | Helsinki chose / where data / centres may [go]. | **Frame 0:** a cut-card Helsinki pinned to a dark board. Five red pins hang over it, each with a dashed line and an X down to its spot. On "go" they twitch. | HELSINKI CITY BOARD · 2.11.2026 |
| 2 fpn_pins (10) | evidence | Five areas / on the [map]. | The pins drop west to east, one every 0.34 s. Each lands with a squash and a ring, and a cream name flag pops up. On "map" the pins glow. | RULE: NOT IN THE MOST VALUABLE NATURE |
| 3 fpn_heat (9) | evidence | Their waste heat / must warm / [homes]. | District-heating pipes run from each pin along the streets to small house pictograms. Their windows light and their roofs warm. On "homes" the whole map glows. | WASTE HEAT → DISTRICT HEATING |
| 4 fpn_muhos (16) | punchline | In Muhos, / the forest went / [first]. | A clearing of stumps, with the forest edge far behind. The last seven spruces fall in a front, left to right, and the last one lands on "first". **Then** the stake goes in: GOOGLE / DATA CENTRE SITE, with marking tape. The clipping rises: MUHOS · CLEARED BEFORE THE ASSESSMENT / ~330 ha. | MUHOS, NORTHERN FINLAND · 2026 |

- **The order is the joke:** the pins come before anything is built in Helsinki; the stake comes after the trees in
  Muhos.
- **No loop:** frame 0 (the map) and the end (the clearing) are different sets. It plays as a hard cut back.
- **fi and ja are drafts** and have not been read by a native speaker. The hook takes longer to read in both:
  - fi: 19.3 s, with a 0.86 s hold on the hook;
  - ja: 20.1 s, with a 1.71 s hold on the hook.
- **Pre-flight (caption pass):** every line fits within 800 px and inside the safe area, in all three languages. Every
  caption is shown at least as long as its reading time. The roles are setup, evidence, evidence and punchline.
- **Text checks:** pass, apart from the standard warnings (not native-read; the sidecar holds for fi and ja).
- **Score:** `score.py` runs on all three plans. It reaches −14.0 LUFS and passes 5 of 5 checks. The parts:
  - the RFH bed at 140 BPM;
  - a card thunk and a tap for each pin;
  - a warm chord on "homes";
  - wind over the clearing;
  - a felling front;
  - two knocks for the stake;
  - the sting.

## Post copy (en, 278 characters)

Helsinki's city board named five possible data-centre areas: Heikinlaakso, Malmi, Salmisaari, Östersundom, Myllypuro.
Their waste heat must go to district heating. In Muhos, ~330 ha of forest was cleared for Google before the
environmental assessment. Map first or forest first?

## Risks and open points

- **"Must warm homes" simplifies the rule.** The rule is "used substantially in district heating". The tag shows the
  literal wording. If the owner wants it literal on the caption too: "Their waste heat / must go to / district
  [heating]."
- **Japanese term for the City Board.** 参事会 is a draft rendering of kaupunginhallitus; a native read is needed.
- **"Chose where data centres may go":** the principles name *possible* areas. "May" carries that, and the post says
  "possible".
- **Pin positions** are by district and approximate (see above). Locals will know their own districts, so check
  Heikinlaakso's spot before the full build.
- **Muhos facts move:** the water plan is due 5 Nov and the police investigation is open. Neither is on screen, but
  re-check both before posting.

## Built 4 Nov (en): Doodle 9

**Owner, 4 Nov:** "All these are English for now. Proceed". They did not choose between the two caption-3 wordings, so the
literal one was taken.

- **What changed from the stills:**
  - caption 3 is now "Their waste heat / must go to / district [heating]." (it was "must warm / [homes]");
  - the heat tag now gives the rule's own qualifier: SUBSTANTIALLY INTO DISTRICT HEATING. The first build's "RULE: USED
    SUBSTANTIALLY IN DISTRICT HEATING" had to shrink to fit and was too small at phone size, so it was shortened;
  - fi and ja are unchanged and still need a native read.
- **Files:**
  - `films/04-11-Doodle9-Five-Pins.mp4`: 21.44 s, with the papercut sign-off;
  - `films/04-11-Doodle9-Five-Pins-loop.mp4`: 18.43 s, film only, for IG Reels;
  - the preview, `previews/04-11-RFH-Five-Pins-en.mp4`.
- **Checks:** the build PASSED with 0 fail and 4 warnings.
  - Two warnings are the fi and ja native reads.
  - The other two are about the fi and ja subtitle files, whose first line needs longer than this English cut gives
    it. That matters only if those languages are posted.
  - The sound passes all five checks at −14.0 LUFS and −4.1 dBTP.
  - The pop on "heating" still drives the map glow and the warm chord, because the `homes` cue is the pop word,
    whichever word it is.
- **Post (en, 278 characters), unchanged:** "Helsinki's city board named five possible data-centre areas: Heikinlaakso, Malmi,
  Salmisaari, Östersundom, Myllypuro. Their waste heat must go to district heating. In Muhos, ~330 ha of forest was
  cleared for Google before the environmental assessment. Map first or forest first?"
- **Before posting:**
  - re-check the Muhos facts;
  - leave space after Cut First, since both end on the Muhos clearing.

## Fixed 6 Nov (en): the nature line, longer and highlighted

**Owner, 6 Nov ~19:30:** "nature line should be longer, maybe highlighted".

- **Before:** a small corner tag, RULE: NOT IN THE MOST VALUABLE NATURE, up for about 2.3 s late in shot 2.
- **Now:** a highlighted note pinned onto the empty sea corner of the map (`natureNote` in `scenes/fpn_kit.js`): a gold
  card with a dark-gold rule round it, a green leaf, **CITY RULE**, then **NO DATA CENTRES / IN THE MOST / VALUABLE /
  NATURE AREAS** in large type (about 40 px at 1080 wide). It drops in once the fifth pin is down (shot 2, ~1.9 s in),
  a red pin goes in, it glows once, and it **stays pinned through the whole heat shot until the cut to Muhos**: about
  6 s on screen instead of 2.3. It moves with the board, so it reads as part of the map rather than a caption. The old
  corner tag is gone from shot 2; shot 3 keeps its own SUBSTANTIALLY INTO DISTRICT HEATING tag below the map.
- **Wording:** the city's news item says the projects are not to be placed in the most valuable nature areas (nor at
  public-transport hubs). "No data centres in the most valuable nature areas" is that sense, not a stronger claim. The
  fi and ja note texts are drafts, unread.
- **Score:** the note lands with a card drop and its pin goes in with a knock (`score.py`, after the five pins).
- **Files:** `films/04-11-Doodle9-Five-Pins.mp4` (21.44 s with the sign-off, 6.5 MB) and `-loop.mp4` (18.43 s, film
  only), preview `previews/04-11-RFH-Five-Pins-en.mp4`, still of the note `previews/06-11-RFH-Five-Pins-nature-line.jpg`.
- **Checks:** PASSED, 0 fail, 4 warn (the fi/ja native reads and the fi/ja `hook` sidecars, which only matter if those
  languages are posted). Sound 5/5 at −14.0 LUFS; delivered −14.0 LUFS, −3.5 dBTP.

## v3, 6 Nov (en): US spelling, and the fuller rule

**Owner, 6 Nov ~21:30:** "Why are you spelling it 'centre'? Also the previous was longer and more clear I think."

- **US spelling** in every English line of this film: caption 1 "Helsinki chose / where data / centers may [go]."
  (686 px), the Muhos stake DATA CENTER SITE, the props notes, and the post ("data-center areas", 278 chars). fi/ja
  untouched. The house had no written spelling rule; British spellings were simply the default so far.
- **The CITY RULE card carries the fuller wording proposed to the owner:** NO DATA CENTERS / IN HELSINKI'S / MOST
  VALUABLE / NATURE AREAS. The card is wider (466 × 304, was 420 × 292) so the four lines set larger; same gold card,
  leaf, pin, glow and timing (~6 s, through the heat shot).
- **Files (overwritten):** `films/04-11-Doodle9-Five-Pins.mp4` (21.44 s with the sign-off), `-loop.mp4` (18.43 s),
  preview `previews/04-11-RFH-Five-Pins-en.mp4`; still of the card `previews/06-11-RFH-Five-Pins-nature-line-v3.jpg`.
- **Checks:** PASSED, 0 fail, 4 warn (fi/ja native reads and fi/ja hook sidecars only). Captions all ≤ 707 px, in the
  safe area, shown longer than their reading time. Sound 5/5 at −14.0 LUFS, −4.1 dBTP.
