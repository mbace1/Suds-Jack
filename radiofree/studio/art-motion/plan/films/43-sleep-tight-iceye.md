# 43 · Sleep Tight (RFH, Helsinki 2 · ICEYE): stills for approval, 9 Nov

**Owner, Mon 9 Nov:** "ICEYE is great. Let's go for impressive visuals. Modern cold war feel. Nanny state surveillance
of the border. High-tech defence spending starting from Aalto University start-up hub. Supo approved clearance for all
employees etc"

## The device (story first)

Three devices were considered:
1. **Scale shift in one unbroken pull-back (picked).** It starts at a student's desk in Otaniemi in 2012 and pulls up
   through the snow and the cloud to a radar constellation that sees Finland in the dark. It ends on a **borrowed
   format**: the nanny state's baby monitor. This is the truest to the record (the course project, the radar, the
   grant, the state as customer) and the most surprising, because the last frame turns the whole film into a
   bedtime joke.
2. **The money loop (closed loop).** A public university course, then a Business Finland grant, then the state buys the
   satellites. This is kept as beat 4, not as the frame.
3. **Then and now.** Helsinki 1975, the détente summit, against Espoo 2026, the radar factory. A strong cold war frame,
   but it says nothing the record of this company says.

## The look

A new 3D look, "cold war". The palette is deep navy and black. Phosphor green marks everything the radar sees, and warm
sodium light marks cities, lamps and windows. Grain, a little chromatic aberration and scanlines sit on the screens.
The map is real: Natural Earth 10m coastlines, lakes and borders (public domain; see `clay/iceye/GEO-NOTICE.md`). The
satellites are a generic flat-panel radar design, not ICEYE's hardware, and there is no logo anywhere.

## Beats (about 22 s; the three stills are beats 1, 2 and 6)

| beat | picture | caption | tags |
|---|---|---|---|
| 1 | A student's desk at night: a lamp, a radar-satellite model on a stand, a notebook sketch, snow on the window | Otaniemi, 2012. / A student [project]. | AALTO UNIVERSITY COURSE PROJECT · COMPANY 2014 |
| 2 | Orbit: a line of radar satellites over Finland at night; their beams cut green swaths through the cloud | 2018: a radar / that sees / in the [dark]. | FIRST SMALL RADAR SATELLITE 2018 · UNDER 100 KG; SEES THROUGH CLOUD AND DARK · ALSO FLOODS, WILDFIRES |
| 3 | The constellation from far, with a valuation counter | Today: worth / over [€10 billion]. | SERIES F · JUNE 2026 · REPORTED VALUATION |
| 4 | A war-room table: the grant, then the state's own satellites | Public grants / help build it. / The state [buys it]. | BUSINESS FINLAND GRANT €28.3M · JUNE 2026; FINLAND'S MILITARY BUYS ITS OWN · SEP 2025 · REPORTED €158M |
| 5 | A spec sheet stamped CLASSIFIED | What exactly / it watches: / [classified]. | MINISTRY: TECHNICAL REQUIREMENTS CLASSIFIED; ICEYE JOB ADS: SECURITY SCREENING (INCL. SUPO, WHERE REQUIRED) |
| 6 | A baby monitor on a bedside table showing a radar map of Finland: MOTION DETECTED, with a box at the eastern border; Helsinki roofs in the window | Sleep tight, / [Finland]. | ICEYE: "SOVEREIGN INTELLIGENCE FROM SPACE" |

Sources for every line are in `clay/iceye/copy.json`. They are taken from search summaries, 9 Nov.

## Two corrections to the brief, from the record

- **Supo:** ICEYE's own job ads say "Employment is subject to applicable security screening (incl. SUPO, where
  required)". That is *where required*, not all employees, and the tag says exactly that.
- **The border:** the Ministry's word is "surveillance" (space-based intelligence and surveillance), and the technical
  requirements are classified. No source says the satellites watch the border, so no caption claims it.
- **The baby monitor's motion box** sits on the eastern border. It is a picture of the joke, not a claim. The owner
  decides whether to keep it.

## Open

- The owner approves the device, the look and the copy.
- Then: build beats 3, 4 and 5, write the score, and do a full build through `pipeline/build.py`.
- The disclosure rule does not apply, because the film does not touch Anthropic.
