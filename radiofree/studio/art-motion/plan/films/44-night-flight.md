# 44 · Night Flight (RFH channel promo): stills for approval, 10 Nov

**Owner, Tue 10 Nov:** "Let's aim to make the most impressive RFH looking at just promoting the channel. Drone is
flying through dark forests at night, looking over suspicious activity and flagging items, then it flies over Finnish
country side and arrives in beautiful illuminated Helsinki. Landing in a prominent high location to show the skyline.
Text: Radio Free Helsinki.. and then the slogan we have on the channels"

The slogan, from the Instagram bio the owner sent: **"Pirate Radio from the front lines. Local insights, global
outlook, concerned skepticism on all."**

## The device (story first)

**The drone is the station.** It is out in the dark doing the station's job: it looks, it flags, and it brings what it
found home. Home is a rooftop in Helsinki with a pirate mast, an ON AIR sign and Toko at the mic. When the drone lands,
ON AIR strikes and the rings go out. The last frame is the end slate's own layout, built in 3D, so the film ends on
the channel's card without a cut.

This is a promo, so it makes no claim about anyone. The three flags name no company and no place. They echo the
channel's own beats: forests, boxes with no label, and buildings with no name on them.

## The look

A new 3D look, "night flight". Everything is built for this film; nothing comes from the truck and road kit.

- **The forest:** about 1,250 spruces and pines under a low moon, first snow on the ground, frost in the air. The
  drone's own searchlight is the key light.
- **The lake country:** a long lake with a real mirror (the sky, the aurora and the cottage all reflect), forest to the horizon,
  a red cottage with its sauna and pier, farm lights, one car on a road.
- **Helsinki:** the white Cathedral floodlit over the town, Uspenski, the SkyWheel, ferries, a lit waterfront with the
  market's tents and a tram, about 2,000 street lamps, fairway buoys on the way in.
- **The drone's display:** REC, a timecode, altitude, speed, distance home, and the list of flags as it takes them.

No logo of any real company appears. The ferries carry plain funnels. Toko is the traced master face on his badge.

## Parts (27.6 s; no sign-off is added, because the last frame is the slate)

| t | part | picture | on screen |
|---|---|---|---|
| 0.0–1.3 | Fly-by | The camera waits low among the trunks. A light comes out of the dark and the drone passes over it | nothing |
| 1.3–8.4 | Its own view | The drone weaves between the trunks. Three times the gimbal turns, the brackets close and it flags what it sees. Then it climbs out through the canopy | FLAG 01 · FELLING AT NIGHT; FLAG 02 · UNMARKED BOXES; FLAG 03 · NO NAME ON THE GATE; then 3 FLAGS · RETURN TO HOME |
| 8.4–13.6 | The lake country | It skims a lake under the aurora, passes a red cottage, and rises over forest and fields. A dome of city light grows on the horizon | HOME 187 km, counting down to 9 km |
| 13.6–18.4 | Helsinki | In from the sea between the buoys, past the SkyWheel, over the waterfront, toward the Cathedral | HOME 1.9 km, then ARRIVING, and a HOME marker on the mast |
| 18.4–20.4 | The landing | Seen from behind. The camera cranes down as the drone settles on its perch beside Toko | nothing |
| 20.4–27.6 | On air | ON AIR strikes, three rings go out from the mast, the name sets and the slogan follows | RADIO FREE HELSINKI; PIRATE RADIO FROM THE FRONT LINES. / Local insights, global outlook, / concerned skepticism on all. |

## Sound (plan; built after the stills are approved)

Its own kit, per the rule in `SOUND.md` ("Sound per film"): not the cold-war kit and not the old house bed.

- The rotor is the engine of the track. Its pitch follows the drone's speed.
- Each lock is three rising beeps and a low thump, and each flag is typed in.
- A slow pulse starts in the forest, opens into a wide held chord when the lake appears, and lifts again at the city.
- The landing is quiet: the rotor winds down, one tick on the perch.
- ON AIR is a relay clunk and a neon buzz, and then the station's own three-note call. That call and the sign-off are
  the only shared sounds.

## Open for the owner

- The landing place is the station's own rooftop, with the Cathedral behind it. Another high place can be built if
  the owner prefers one (for example the Cathedral's terrace or a tower).
- The wording of the three flags.

## v2 (10 Nov): the most impressive pass

**Owner, Tue 10 Nov, on the stills:** "This should be the most impressive looking video yet", then "Continue".

What changed in the picture:
- **Real motion blur.** Each frame is now 5 exposures averaged across half a frame's shutter (11 for the fly-by,
  3 for the landing, 1 for the still slate). Fast moves smear the way a camera does, not the way a game does.
- **Light shafts** (new optional pass in `clay/welcome/lib/post.js`, off for every other film). They come from the
  drone's searchlight in the fly-by, the harvester's work lights, the floodlight on the boxes, the hall's yard light,
  the moon over the lake, and the mast's beacon when ON AIR strikes. The shafts are masked to the light itself.
- **An anamorphic streak** on the brightest lamps only (same file, also optional).
- **Shadows.** In the forest, the moon is low and ahead, so every trunk lays a long shadow toward the lens. The work
  lights, the floodlight and the yard light cast their own shadows, so the fence mesh is drawn on the snow. Over the
  lake country, 13,500 trees shadow the snowfields. On the roof, the mast, the hut, Toko and the drone shadow the snow,
  and the drone's landing light makes a pool that tightens as it settles.
- **The forest, rebuilt.** It now has spruces with snow lying on every bough (two shapes), tall pines, birches with
  bark and bare twigs, and boulders with snow caps. It also has mist banks between the trunks, and four times the
  snow in the air.
- **The roof tells a story.** Toko's footprints run in the snow from the hut door to the mic, and out to the mast and
  back. There is also a warm skylight, a dish, aerial whips, the cable from the hut to the mast, and snow falling.
- The lake country has moonlit snow instead of black ground, frosted trees, low mist on the water and a softer cottage.

**Sound: its own kit, `pipeline/sound/nightflight.py`** (now in the `SOUND.md` table). The rotor is the engine of the
track, and its pitch follows the speed:
- **The fly-by:** it Dopplers over the lens.
- **The forest:** the drone slows at each flag, and each lock is three rising beeps and a thump. A muted A-minor pulse
  runs under it.
- **The lake:** a wide F add9 chord opens with the land, with aurora bells and a loon.
- **The city:** sixteenths, a kick, a ferry horn and a tram bell lift the music.
- **The landing:** a single held G sus chord plays, the rotor winds down, and there is a tick on the perch.
- **ON AIR:** the relay closes and the neon catches. The station's call rings on the three rings, and the chord
  resolves to C. Sound checks: 5 pass, −13.8 LUFS, −2.7 dBTP.
