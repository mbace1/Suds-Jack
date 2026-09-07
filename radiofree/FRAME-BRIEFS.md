# Frame briefs — the seven still borrowing

Style lock, taken from the three that shipped (`cathedral`, `katu`,
`mannerheim`). Use the same generator and settings; these differ only in
subject.

**Constant across all seven:** pixel art, 2:3 portrait, 784×1168 minimum.
Helsinki at night. Deep green-black sky with dithered cloud banding. High
contrast, dense detail — individually lit windows, real perspective depth,
converging lines toward a low vanishing point. Warm practical light only
(street lamps, lit windows, headlights), dim and desaturated — never a
saturated orange, and no amber cast over the frame. Scanline/CRT texture
baked in. No people in the foreground, no faces, no characters.

**Composition constraint (this one bites):** the app cover-crops to a phone
frame and pushes to 1.17. Keep the subject inside the central 70% of the
width, and nothing essential in the bottom third — the headline sits there.

| key | brief |
|---|---|
| `esplanadi` | The park avenue at night. Two rows of bare lime trees down a central promenade, stone facades either side with lit windows, a lit bandstand at the far end, lamps along the gravel walk. |
| `kamppi` | A city plaza after dark. Glass-fronted blocks, a bus interchange canopy, tram wires overhead, scattered figures as distant silhouettes, wet paving reflecting the signage. |
| `station` | Central Station head-on. The clock tower lit against the sky, the two stone figures flanking the arched entrance, the clock face glowing, platforms behind. |
| `harbour` | The south harbour at night. Gantry cranes over black water, stacked containers, a ferry lit along the quay, reflections broken on the swell. |
| `gulf` | The waterfront looking out. Ice or open water in the foreground, a low far shore with scattered lights, a channel marker blinking, a very wide dark sky. |
| `suomenlinna` | The fortress islands from the water. Low ramparts and a stone gate, the ferry crossing lit from within, the sea dark and flat, the city glow on the horizon behind. |
| `katajanokka` | The waterfront with the Uspenski cathedral silhouette above it — red brick mass, gold onion domes catching the light, moored boats and the quay below. |

Drop each in as `radiofree/img/<key>.jpg`, add it to `SHELL` in `sw.js`, map
it in `FOR_KEY` in `js/photo.js`, and bump the cache token. Full spec is in
`radiofree/AGENTS.md` under *Submitting art*.
