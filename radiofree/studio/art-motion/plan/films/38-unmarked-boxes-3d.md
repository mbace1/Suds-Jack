# 38 · Unmarked Boxes (RFH, Brink): AI-server export controls, 3D cars look (stills checkpoint, 6 Nov)

**Owner, 6 Nov:** "The 3d Muhos video is doing well, we should consider more similar ones. Maybe it's the art, maybe
the topic, maybe both." This film is the **art test**: the same approved 3D toy-world look as Cut First, on a different,
non-Finnish story (`plan/GLOBAL-SCOUT.md` §8). Five Pins (papercut, Muhos again) is the matching topic test. This is a
**stills checkpoint only**: English only, no score, no full render, nothing posted.

- **Files:** `clay/unmarked/{film.html, film.js, copy.json}`. Built from `clay/cutfirst` (same renderer, post, grade,
  toys, captions and tags); `looks/cars` and `clay/cutfirst` are untouched.
- **Stills:** `previews/06-11-RFH-Unmarked-Boxes-3D-stills.jpg`, eight stills at 2.8, 6.0, 7.8, 11.2, 14.2, 15.4, 19.4
  and 21.9 s (rendered through the page's own caption pass, `pipeline/render.mjs --stills`).
- **Length:** 22.4 s plus the RFH sign-off. **Caption pre-flight:** widest 751 px (≤ 800), all in the safe area and clear
  of the rail, every caption shown longer than its reading time.

## Shot table (en)

| # | t | role | caption | picture | tag |
|---|---|---|---|---|---|
| 1 | 0–4.4 | setup | These AI servers / can't go to China / without a [licence]. | A US port. A flatbed of blue crates (AI SERVERS · EXPORT CONTROLLED) brakes at the export gate; booms down, lamps flashing, a STOP sign: LICENCE NEEDED FOR CHINA. The ship waits at the quay; the toy sea and its shores beyond. | US EXPORT CONTROLS · A LICENCE IS NEEDED |
| 2 | 4.4–8.8 | evidence | Prosecutors say / [$2.5 billion] / went anyway. | High over a toy map: four shores labelled US, TAIWAN, SOUTHEAST ASIA, CHINA. The ship sails the long way round, past Taiwan to the Southeast Asia pier, drawing a dashed route behind it. | INDICTMENT · NEW YORK · MARCH 2026 |
| 3 | 8.8–13.2 | evidence | Repacked / in [unmarked] / boxes. | Inside a shed on the Southeast Asia island: a repack line. Labelled crates go in under a REPACK arch; plain cardboard boxes come out. From here the ship carries plain boxes. | PROSECUTORS SAY · VIA TAIWAN AND SE ASIA |
| 4 | 13.2–17.6 | evidence | Serial stickers / moved by / [hair dryer]. | The workbench: a real server (vents, green lights) and a dummy (the same grey box, no lights). A hair dryer on a clamp stand blows; the serial sticker peels off the real one and lands on the dummy. | PROSECUTORS CITE SURVEILLANCE FOOTAGE |
| 5 | 17.6–22.4 | punchline | The inspectors / were shown / [dummies]. | Ten dummies on pallets in front of the shed, an EXPORT CHECK van beside them; a green tick pops over each. The camera rises: the ship, now loaded with plain boxes, heads for CHINA along the dashed line. | CHARGED, NOT CONVICTED · 1 OF 3 PLEADED GUILTY |

**Post (en, 260 chars):** "US prosecutors say three people linked to Super Micro sent ~$2.5B of servers with Nvidia AI chips to
China via Taiwan and Southeast Asia, in unmarked boxes, and showed inspectors dummies. One has pleaded guilty; the
company isn't charged. Who checks the boxes?"

## Facts (all from search summaries, 6 Nov; no indictment, filing or article was opened)

| claim | status | sources |
|---|---|---|
| Indictment unsealed in SDNY on 19 Mar 2026: three people (a Super Micro co-founder and senior VP, a Taiwan sales manager, a contractor) charged with conspiring to divert about $2.5B of servers with Nvidia AI chips to China, sales in 2024–25 | consistent across many outlets | Bloomberg Government; The Register 20 Mar; Al Jazeera 20 Mar; eWeek; Tom's Hardware; Gizmodo |
| Route: US → Super Micro facilities in Taiwan → a Southeast Asian company that repackaged them in unmarked boxes for China | prosecutors' allegation, reported | eWeek; itnews; The Register |
| Thousands of non-working dummy servers staged to deceive the manufacturer's compliance team; used ahead of a US Commerce Department inspection and during a visit by a US export control officer | prosecutors' allegation, reported | Fox News; itnews; The Next Web; The Stack |
| Surveillance footage of a hair dryer used to move labels and serial-number stickers from real servers onto dummies | prosecutors' allegation, reported | Tom's Hardware; The Stack; The Next Web |
| Super Micro is not named as a defendant; it said it has been cooperating fully and that the alleged conduct breaks its policies; the co-founder left the board | company statement, 19 Mar 2026 | ir.supermicro.com press release (summary); Bloomberg |
| The contractor pleaded guilty on 8 Oct 2026 to four counts (export-control conspiracy, smuggling, defrauding the US, obstruction); sentencing set for 8 Sep 2027 | reported from a court filing | Reuters 9 Oct (via syndication); Bloomberg Government; DatacenterDynamics; TNW |
| The co-founder has pleaded not guilty; the sales manager is reported to be a fugitive | reported | Tom's Hardware; search summaries |
| Licence rules: in 2024–25 licences to China were presumptively denied; since 15 Jan 2026 BIS reviews H200-class licences case by case, with volume caps and third-party testing | rule text reported | Federal Register 2026-00789 (via summaries); Mayer Brown, Jan 2026 |
| Also found, not used: a California computer-company owner arrested about 1 Oct 2026 over ~$300M of Nvidia servers routed via Malaysia and Singapore (charged, not convicted); the Dec 2025 "Gatekeeper" case with a $160M guilty plea | reported | The Register; Tom's Hardware; ttnews; Axios; Washington Times |
| New BIS rule in Oct–Nov 2026 | none found | search, 6 Nov |

## Naming decision (for the owner)

- **On screen, no person and no company is named.** The crates read AI SERVERS · EXPORT CONTROLLED; the gate EXPORT
  GATE · US PORT; the van EXPORT CHECK; the places are US, TAIWAN, SOUTHEAST ASIA, CHINA. The tags are attributions
  (indictment, prosecutors, surveillance footage) and the status line.
- **Why:** the people are charged, not convicted (one has pleaded guilty, one not guilty, one is at large); the server
  maker is not a defendant and says it cooperated; the chip maker is not accused. Putting a company's name on a crate
  in a film about smuggling would read as an accusation the record does not make.
- **In the post, Super Micro and Nvidia are named**, with the qualifiers the record supports ("linked to", "the company
  isn't charged", "servers with Nvidia AI chips"). If the owner prefers, the post can drop both names too.
- No individual is named anywhere, including the post.

## Risks

1. **Attribution.** Captions 2–5 depend on "prosecutors say" carrying through. It is written into caption 2 and the
   tags of shots 2–4; caption 3 ("Repacked in unmarked boxes") and caption 4 have no verb of attribution of their own.
   If that feels too strong, caption 3 can become "Repacked, they say, / in [unmarked] boxes."
2. **The guilty plea is the contractor's**, not the co-founder's; the tag says "1 OF 3 PLEADED GUILTY" deliberately.
3. **Everything is from search summaries.** The indictment (SDNY) and the plea filing should be opened before a full
   build; EDGAR and court sites have been blocked from this session.
4. **Geography is a toy map.** The four shores are labels on islands, not positions; Southeast Asia stays a region
   because the reported intermediary is not named.
5. **"Can't go to China without a licence"** is true in both the 2024–25 regime and the 2026 case-by-case one; it does
   not claim no licence is ever granted.
6. **Look, honestly:** the map (shot 2) carries a lot of small labels and the CHINA board sits just under the caption
   block; the hair-dryer close-up leaves the lower third of the frame as empty floor; the REPACK arch post crosses one
   crate. None blocks reading the beat; all are fixable in the full build.
7. **No score yet** (`score.py` comes after approval, modelled on `clay/cutfirst/score.py`: the gate bell, the ship's
   horn, the repack line, the dryer, the ticks).
