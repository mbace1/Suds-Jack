# Trade Secret (Doodle 6), VIRAL CUT v1, 23 Oct

Owner, 23 Oct, sending HS's satellite graphics of the Hamina site: "These are actual satellite photos of the area doodle
demolished.. use them as good references. They also indicate flying squirrel nesting forest areas." The pictures are
Hamina (Summa, the old paper mill by the sea), not Muhos, so this is a new film rather than a Count the Trees edit
(owner's choice: "New film: Doodle 6").

- Engine key `ham`, `papercut/trade-secret/`, kit `scenes/ham_kit.js` (scenes `tsv_*`).
- 49 beats at 140 BPM, stretched by the plan's holds to 22.7 s, plus the papercut sign-off (25.7 s).
- Captions at the BIG size. The score is the Doodle palette, driven, with the hit 35 ms in.
- Previews: `previews/23-10-Trade-Secret-en.mp4` (with sign-off), `previews/23-10-Trade-Secret-loop-en.mp4` (film
  only: post this one where the platform loops).

## The film

| shot | picture | caption |
|---|---|---|
| 1 hook | Frame 0: the 2021 map from above, its yellow flying squirrel zones under four black redaction bars, a flying squirrel peeking over one; a torn clipping: DOODLE DATA CENTRE · HAMINA, FINLAND / **MAP: HIDDEN**. On "secret" the bars thump and the squirrel ducks. | Doodle asked / officials to keep / this map **secret.** |
| 2 map | The bars slide away; the year card says 2007; the forest stands and the zones glow; a flying squirrel glides from the bay's zone to the long one. Tag: FLYING SQUIRREL FOREST. | The map marked / flying squirrel / forest. / **No felling.** |
| 3 fell | The year card flips to 2021; the clearing goes in a front from the mill side, the halls come up, the zones inside it turn red and dashed. A card slams: FLYING SQUIRREL FOREST FELLED / 1.3 ha · 2018–2019. Tag: HAMINA, FINLAND. | Felled in 2018–19: / 1.3 ha of it, / **without a permit.** |
| 4 secret | On a desk: an email from Doodle (no readable lines), the map's print slides into a folder labelled FLYING SQUIRREL FELLINGS · HAMINA, the folder closes, a TRADE SECRET stamp. Tag: SOUTHEAST FINLAND ELY CENTRE. | The authority / kept the papers / as **trade secrets.** |
| 5 end | The map again: the stamp comes down on the cleared ground, the squirrel looks out from behind it; a hold; on `back` the stamp lifts off and fades, the bars slide home, the squirrel returns to its post, the clipping rises on `clip`. The last frame is frame 0. | A felled forest, / filed as a / **trade secret.** |

**The loop.** The last frame matches frame 0: the same zoom (`HZ` = 1.3 about the zones), bars, squirrel and clipping.
The sign-off master breaks the loop.

**Post (`post.en`, 246 characters):** Doodle asked a Finnish authority, by email, to keep a map secret. It showed flying
squirrel forest at Doodle's Hamina data centre: 1.3 ha of it was felled in 2018–19 without a permit. The papers were
kept as trade secrets. Whose secret is a forest?

## The map

The map is drawn as cut card after HS's published satellite graphics (2007 and 2021, with the dashed site boundary
and the yellow flying squirrel zones labelled liito-oravametsää). The graphics are a reference only: they are not
embedded, traced or committed. The map is illustrative, not a survey. Its layout follows the graphic: sea west and
south, a breakwater, the mill's sheds along the shore, forest to the east, and a village to the north-east. The
graphic shows seven zones, and the five that the 2021 picture shows cleared are the ones drawn felled. The zone north
of the mill and the ellipse by the bay stand. Leaf trees are drawn green, not autumn yellow, so that yellow means only
the zones.

## The facts (23 Oct 2026)

| # | claim on screen | status | source |
|---|---|---|---|
| 1 | **Doodle asked officials to keep this map secret** (by email, in the post) | **CONFIRMED (HS).** Google asked the Southeast Finland ELY Centre to keep secret the documents on felling flying squirrel forest. The authority hid the detailed-plan drawing that shows the areas which should not have been felled. Google had asked by email. | Helsingin Sanomat, 23 Oct 2026, 13:20: "Google pyysi salaamaan luvattomat hakkuut osoittavan kartan: Viranomainen salasi" (headline and lede, as supplied by the owner) |
| 2 | **The map marked flying squirrel forest. No felling.** | **CONFIRMED.** The hidden drawing shows the areas not to be felled, and HS's graphic labels the zones liito-oravametsää. Under the Nature Conservation Act, flying squirrel breeding and resting sites may not be destroyed. | HS 23 Oct; Kymen Sanomat on the Horjalviikki plan draft (on display from 14 Oct, with five protected biodiversity areas) |
| 3 | **Felled in 2018–19: 1.3 ha, without a permit** | **CONFIRMED.** 1.3 ha of flying squirrel forest was destroyed in the expansion in 2018–2019 ("luvattomat hakkuut", unauthorised fellings). Tuike Finland had no permit to destroy it (found at a 2020 meeting with the authorities). The company called it an error caused by unclear zoning maps, and no criminal report was made then. | HS 23 Oct; Yle "Google hakkasi liito-oravien puut Haminassa" and "Google subsidiary cut down flying squirrel habitat in Hamina"; Kymen Sanomat "Yle ja HS: Google hakkasi myös Haminassa metsää luvatta" |
| 4 | **The authority kept the papers as trade secrets**; the tag reads SOUTHEAST FINLAND ELY CENTRE | **CONFIRMED (HS).** The authority hid the papers as trade secrets ("Viranomainen salasi paperit liikesalaisuuksina"). The ELY Centres became elinvoimakeskus on 1 Jan 2026. HS names the ELY Centre, so the tag does. | HS 23 Oct |
| 5 | **A felled forest, filed as a trade secret** | **Punchline.** It restates 3 and 4. "Filed" is the film's word for the papers. | — |
| — | **Not used** | Whether the papers are still secret today and when they were hidden: HS's full text has not been read here. Anything about a police report: not current. Any quote: there are none. | — |

**How it was checked:** HS's headline and lede came from the owner. Yle and Kymen Sanomat came from search result
summaries; their pages could not be opened from this session (DNS). **The full HS article has not been read.**
Before posting, check the HS text for:
- when the papers were hidden;
- whether they are still secret;
- the exact wording of Google's request.

## Pipeline

- `node pipeline/build.py` (en): text 98 pass / 6 warn / 0 fail; sound 5 pass / 0 fail (−14.0 LUFS, −3.1 dBTP).
- The six warnings:
  - fi and ja are not yet read by a native speaker;
  - fi and ja sidecar reading times are longer than the en master (fi:secret, ja:hook, ja:fell, ja:secret). Their own
    masters need a build per language.
- Stills were reviewed twice. Three fixes came from the first look:
  - Yellow birches competed with the yellow zones, so leaf trees are now green.
  - The zones were too faint, so they now have a fill, a glow and a heavy rim.
  - The hook was too far out, so it is now zoomed 1.3× onto the bars, with a bigger squirrel.
- Two fixes came from the second look:
  - The email sat under the caption, so it moved down.
  - The stamp's exit flew up through the caption, so it now lifts and fades in place.

## v3 (owner, 23 Oct): no blacking out; the map made faithful

- Owner: the whole map was hidden, not just its zones. Then: the blacking serves no purpose; just say it was asked to
  be kept secret, and blur at the end if anything. **The bars are gone.** Frame 0 is the 2021 map coming clear out of a
  blur, and it blurs again on "secret". The end blurs the map out under MAP: HIDDEN, which gives a clean loop.
- Accuracy pass, against the HS 2007 and 2021 photographs:
  - 2007 now has the bare patch east of the long zone (`OPEN07`), which was already open then.
  - A zone turns red only where the 2021 clearing (traced from the 2021 photograph) covers it. The film no longer
    claims which zones made up the 1.3 ha.
  - The zones are traced from the HS graphic, so their sizes are HS's own drawing.
