# Style register

Every look that has been made, with the owner's status. A style moves up only on the owner's word.

**Statuses:**
- **in use:** films have aired in it.
- **approved:** the direction for a film in production.
- **testing:** the owner wants it refined. Nothing airs in it yet.
- **parked:** explored and kept for later.
- **shelved:** the owner preferred something else.

| Style | Status | Where it is | Notes |
|---|---|---|---|
| Papercut shadowbox | **in use** | `scenes/rfp_kit.js`, every RFH news film | Owner, 17 Oct: "better but still less polished". See *Polish* below. |
| Clay (Aardman plasticine) | **in use** | `clay/*`, Toko films, Teslur | Same note as papercut. |
| Clay launch-film stage | **approved** (Welcome Home) | `clay/welcome/film-wh2.js` | "looks better" (17 Oct). |
| Flat safety leaflet | **approved** (Kill Switch) | `clay/kill-switch/flat.js` | v3, with Finnish and Japanese. |
| Photographed 3D leaflet | **shelved** | `clay/kill-switch/leaflet.js` | Owner preferred the flat look. |
| Shin-hanga woodblock | **testing** | `scenes/jp_kit.js` `jp_kyoto_hanga` | Kyoto Toko. "Cool, needs refining." |
| Manga page | **testing** | `scenes/jp_kit.js` `jp_tokyo_manga` | Tokyo Toko. "Cool, needs refining." |
| Sumi-e ink wash | **testing** | `scenes/st_kit.js` `st_sumie` | Kyoto Toko, with the haiku. |
| 16-bit JRPG | **testing** | `scenes/st_kit.js` `st_jrpg` | Tokyo Toko, with ▶読む 寝る. |
| City-pop sleeve | **parked** | `scenes/jp_kit.js` `jp_tokyo_citypop` | Possible cover or end card for a Tokyo series. |
| Linocut | **parked** | `scenes/st_kit.js` `st_lino` | Mökki Toko. |
| Risograph zine | **parked** | `scenes/st_kit.js` `st_riso` | Kallio Toko. |
| Kamishibai | **parked** | `scenes/st_kit.js` `st_kamishibai` | The pen pals. A format more than a style. |
| The twelve 13 Oct style tests | **parked** | `eras_ts.js` | Papercut was picked from these. |

*"First 2 are cool and need to be refined" (17 Oct) is read here as both pairs: woodblock and manga
(already "ones to test"), and sumi-e and JRPG (the first two of the newer five). All four are at testing.*

## Polish

Owner, 17 Oct: "The problem with all is that they don't fit the modern media environment. The clay and paper
cut are better but still have a feel that is less polished."

**The diagnosis.** Every look so far signals *handmade*. Feeds in 2026 signal *premium*. The gap is in five places:

| | what we do | what the feed does |
|---|---|---|
| Surface | thumbprints, card tooth, fibre, grain, print noise | smooth, clean materials; texture only where it means something |
| Light | flat or single-source, muddy shadow sides | soft studio light and reflections; a clear key, fill and rim; bright clean whites |
| Colour | earthy, desaturated, "aged" | saturated and clean, with one controlled palette per piece |
| Motion | slow drifts on 12-beat static shots | snappy eased moves, a cut or move every second or so, kinetic transitions |
| Type | captions burned over the picture | type as part of the design: animated, placed, lit |

**Test 1** (`looks/polish-welcome-home.png`): the Welcome Home hero shot rebuilt in a *premium 3D* finish:
- smooth vinyl and lacquer instead of plasticine;
- studio environment reflections;
- Toko as a designer toy;
- the same scene and camera.

**The owner's answer (17 Oct):** "All of the above, some of course more fitting per style." So polish is assigned per
style:

| Style | Its polish | Why |
|---|---|---|
| Flat leaflet (Kill Switch) | **slick 2D motion design + creator-native edit** | The print stays flat; the polish is in how it moves. **Tested:** `previews/17-10-Kill-Switch-polish-test.mp4`. |
| Papercut (RFH news) | **creator-native edit**, then **cleaner light** | Punch-ins, word-by-word captions and sound hits on the existing box; brighter, cleaner card and light. |
| Clay launch-film parody (Welcome Home) | **premium 3D + cinematic realism** | It parodies a premium launch film, so premium is the point. **Tested (stills):** `looks/polish-welcome-home.png`. |
| Clay (Toko, Teslur) | **creator-native edit**, premium 3D where the subject is a product | Clay stays where its warmth is the joke. |
| Woodblock, sumi-e | **slick 2D motion**: layered parallax, depth, crisp edges | The texture stays, because the print is the subject. |
| Manga, JRPG | **creator-native edit**: panel-by-panel reads, punch-ins, sound-effect hits | Their own grammar is already an edit. |

**What the Kill Switch test does (the pattern for the rest):**
- springs instead of drifts;
- a camera that punches in on what to read;
- elements that pop in staggered (the pictograms);
- UI chips over the print (SWITCH 1 JAMS / SWITCH 2 OFF, the WARNINGS counter rolling 8 → 0);
- house captions word by word, with a scrim behind them when the camera is in close;
- a sound on every move (`synth_ks_polish.py`, from the Doodle palette's voices, −14 LUFS).

The edit carries a joke: the tap on the kill switch stops the music.
