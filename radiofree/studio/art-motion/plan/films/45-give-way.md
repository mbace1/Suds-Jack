# 45 · Give Way (RFH, Highway 9 · the road base): full build for approval, 12 Nov

**Owner, Wed 11 Nov:** "Start pitching new videos with cool visuals and interesting stories. Render and approve".
This is pitch B of `plan/PITCHES-11-11.md`. It was built first because it has a date: the road closes on 18 Nov and
the exercise starts on 19 Nov. The owner had not picked a pitch when the build started; the film waits for his yes.

## The story (search summaries, 9–12 Nov)

- The Finnish Air Force's main exercise of the year, **Protective Fence 26**, runs **19–27 Nov**: over 40 aircraft,
  20 of them F/A-18 Hornets, and about 4,100 people, flying from bases, civilian airports and a highway strip
  (the Air Force's own page; Verkkouutiset).
- The strip is **Jännevirta on Highway 9**, near Kuopio and the Rissala air base. The road notice gives closures
  **18–25 Nov** (Nordic Defence Sector; Siilinjärvi's notice).
- Allies fly too: **Dutch F-35As** at Rissala (the Air Force's page), **French Rafales** from Rovaniemi and
  **Swedish Gripens** from Kallax (Nordic Defence Sector, AeroTime). No source puts allied jets on the highway.
- **Finland's own new F-35As do not take part** (AeroTime; the first two reached Rovaniemi on 18 Sep). This rests on
  one trade source and one unattributed summary. The Air Force's page could not be opened from the build machine
  (its host is blocked there), so the owner or Grok Bot should confirm the line before it posts.

## The device (story first)

**A borrowed format in one unbroken shot: the car's sat-nav tells the story.** The camera sits on the dashboard and
never cuts. The sat-nav does what a sat-nav does: it announces, lists and recalculates, in the same calm voice
whatever comes over the roof. Every fact is on its screen, so the picture never needs a label.

The title is the sat-nav's own idiom: "In 300 meters, give way to fighter jets." The "300 meters" is the phrase, not
a measured distance.

## The look

The night kit (`clay/kit/night.js`) with one new part, **the dashboard**: a dash top, a strip of snow-dusted hood,
wipers and a sat-nav on a stalk, all lit by what happens outside.

- **Highway 9:** a road surface drawn in its own texture (wheel tracks worn down to wet asphalt, packed snow
  between), about 2,400 spruces, snow stakes, a speed limit and the red Highway 9 plate on one post.
- **The block:** two striped boards, four amber flashers and a sign, TIE SULJETTU / ROAD CLOSED.
- **The strip beyond it:** portable edge lights that come on in a wave running away, a green threshold, tents, a truck
  with a beacon and two light masts.
- **The jet:** a plain grey twin-tail fighter with no markings. It lands over the car, rolls out, turns and takes off
  back over the roof with its afterburners lit.
- **Snow in the air:** every flake is a streak as long as it travels past the lens in one exposure, lit by the
  headlights, the flashers and the jet's lamp.
- **Frames:** 6 jittered exposures a frame while the car or the jet moves, 16 for the two close passes, 3 when only the
  lamps and the snow move.

No people and no faces. The landing over a stopped car is a picture of the joke. The real closure keeps traffic away
from the strip, and `copy.json` says so under `props`.

## Beats (22.5 s + the sign-off)

| t | picture | the sat-nav says (caption) | on its screen |
|---|---|---|---|
| 0.0 | A night drive under the aurora | | Continue on Highway 9 |
| 0.9 | The chime; amber flashers far ahead; the car brakes | In 300 meters, / give way to / [fighter jets]. | ROAD CLOSED AHEAD · Reason: fighter jets · JÄNNEVIRTA · CLOSURES 18–25 NOV |
| 4.9 | A Hornet comes over the roof and lands beyond the block; the car stops | Road closed. / The Air Force / is [landing here]. | AIR FORCE EXERCISE · Protective Fence 26 · 19–27 Nov · OVER 40 AIRCRAFT · 20 HORNETS |
| 10.0 | Three flights cross the sky | Also flying: / the Netherlands, / France, [Sweden]. | ALSO IN THE AIR: Netherlands · F-35s, France · Rafales, Sweden · Gripens (FLYING) |
| 13.9 | The Hornet turns at the far end; its lamp grows | Not taking part: / Finland's new / [F-35s]. | a fourth row: Finland · F-35s, NOT TAKING PART |
| 17.4 | It takes off over the car (overhead at 18.45, after the F-35 line has cleared); its wash throws snow at the glass | Recalculating. / This road is / a [runway]. | RECALCULATING…, then THIS ROAD IS A RUNWAY · Expect delays: fighter jets |

## Sound: the cabin kit (`pipeline/sound/cabin.py`, new)

Per `SOUND.md`, "Sound per film". 90 BPM, E minor landing on C.

- The car all the way through: engine and tires on snow, braking on the picture's own curve, then idling.
- The sat-nav's chimes (soft glass bells) announce every caption; a blip lands each row of its list, and two falling
  notes land the row that is not taking part.
- **The hazard relay is the click track.** From the moment the car stops, its tick-tock runs to the end and a marimba
  vamp answers it (Em, C, G, D).
- The two passes: the low end first, the roar, the turbine's whine bent by the pass; the dashboard rattles and the
  music ducks. The take-off adds the afterburner's crackle and the snow against the glass.
- On "runway" the chime resolves to C. Then the station's sting and the current sign-off.

## What to confirm before it posts

1. **The F-35 line** on the Air Force's page (see above).
2. **The dates** once more on 17 Nov (the daily check does this).
3. The post copy (253 characters) is in `copy.json`.

## Filed, Thu 12 Nov (awaiting the owner's yes; not in POSTED.md until he gives it)

- **Build:** 88 checks pass, 0 warn, 0 fail (`qa/give-way/build-report.md`; contact sheet and sound sheet beside it).
  22.5 s, 675 frames, no holds. Delivered −14.1 LUFS, −3.1 dBTP; with the sign-off −14.4 LUFS, −3.7 dBTP.
- **Files:**
  - `films/12-11-Helsinki3-Give-Way.mp4`: the film with the current sign-off, 25.5 s, 38 MB (X and YouTube);
  - `films/12-11-Helsinki3-Give-Way-loop.mp4`: without the sign-off, 22.5 s, 37 MB (the Instagram loop master);
  - `films/12-11-Helsinki3-Give-Way.en.srt`;
  - `previews/12-11-RFH-Give-Way-en.mp4` (14 MB) and `previews/12-11-RFH-Give-Way-stills.jpg`.
- **Render:** one process in two halves, about 69 and 59 minutes. The first test stills had no snow at all: the flake
  quads faced away from the camera (their winding is always clockwise on screen), so the material is double-sided.
- **One timing change after the stills:** the take-off passes overhead at 18.45, not 17.95, so the jet does not loom
  under the line "Not taking part: Finland's new F-35s", where it would be read as one.
- **Sign-off:** the current one (`previews/signoff-papercut.mp4`). Sign-off v2 still waits for the owner's approval.
- **Post (en, 253 characters):** in `copy.json`.

## Approved, Thu 12 Nov

**Owner:** "Approved for posting on Nov 17 at noon". Scheduled in `POSTED.md` for **Tue 17 Nov 12:00 Helsinki** on RFH
Instagram (the loop master), X and YouTube (the film with the sign-off). The 17 Nov 07:16 check re-reads the dates and
the F-35 line first; if either has moved, the post holds and the owner hears why.

## Socials copy (RFH; English, US spelling)

The body is the copy the owner approved on 12 Nov; only the hashtags and the YouTube title are added here.

**Instagram** (Reel; the loop master `films/12-11-Helsinki3-Give-Way-loop.mp4`, Original aspect, uncropped; 296 characters):

```
In 300 meters, give way to fighter jets. Highway 9 at Jännevirta near Kuopio is closed 18–25 Nov: the Air Force lands Hornets on it in Protective Fence 26 (19–27 Nov, 40+ aircraft). Dutch, French and Swedish jets fly too. Finland's new F-35s sit it out.

#Finland #Kuopio #Ilmavoimat #Hornet #F35
```

**X** (`films/12-11-Helsinki3-Give-Way.mp4`, with the sign-off; 270 of 280 characters):

```
In 300 meters, give way to fighter jets. Highway 9 at Jännevirta near Kuopio is closed 18–25 Nov: the Air Force lands Hornets on it in Protective Fence 26 (19–27 Nov, 40+ aircraft). Dutch, French and Swedish jets fly too. Finland's new F-35s sit it out. #Finland #Kuopio
```

**YouTube Short** (`films/12-11-Helsinki3-Give-Way.mp4`; Public; not made for kids):
- Title (35 characters): `Give Way: fighter jets on Highway 9`
- Description: the Instagram caption above, as is.

**If someone asks for sources** (a reply, not part of the post): the Finnish Air Force's page on Protective Fence 26
(dates, over 40 aircraft, 20 Hornets, the highway strip); Siilinjärvi municipality's Highway 9 notice (Jännevirta,
closures 18–25 Nov); AeroTime and Nordic Defence Sector (the allied jets and their bases; Finland's F-35s not taking
part).

No pin. No links in the post.
