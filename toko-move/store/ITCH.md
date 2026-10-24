# Toko Move — itch.io page kit (roadmap M3)

Everything the store page needs, in one place, so a release is a copy and an
upload. The upload itself is `node toko-move/tools/package-itch.mjs
toko-move.zip --page <this page's URL>`, gated by `test/itch.cjs`. Nothing in
this folder ships inside the zip.

**Rule for this page: say only what the build does.** LIVE (real trams from
HSL's live feed) stays off the page until roadmap M6 has seen it work on a
real phone; the page must never sell a mode nobody has played.

---

## Project settings

| field | value |
|---|---|
| Title | **Toko Move** |
| Project URL | `…/toko-move` |
| Kind of project | HTML |
| Classification | Game |
| Release status | In development (until M7 calls it 1.0) |
| Pricing | owner's call |
| Uploads | the M2 zip, "This file will be played in the browser" |
| Embed | **405 × 720** (portrait, the game's own 9:16), fullscreen button **on**, "Mobile friendly" **on**, orientation **portrait**, automatically start on page load **off** |
| Genre | Simulation |
| Tags | `transport`, `trains`, `trams`, `helsinki`, `city`, `strategy`, `puzzle`, `real-time`, `mobile`, `minimalist` |
| Content | no mature content (the spin-off *Toko Move: Piritori* is a separate project with its own rating) |
| Languages | English, Finnish (a Finnish browser starts in Finnish; the title card switches) |
| Inputs | mouse, touchscreen (sound is synthesised in the page; the ♪ in the HUD mutes it) |

## Short description (one line)

Catch moving trams on Helsinki's real network and get the parcel there on time.

## Description

**Toko Move** is a courier game on the real Helsinki tram and metro network.

Every line, every stop and every timetable path comes from HSL's own data — the
trams on the map are where the trams go. Pick a job, read the board, and catch
the tram that is actually coming: change at the right stop, walk the last
street when walking is faster, and get the parcel there before it is late.

- **A shift is three deliveries.** Fragile parcels ride only trams; hot food
  goes cold; express pays for speed. Every plan the board offers is a real
  route, and the clock is always running.
- **A week has rent.** Five shifts, Monday to Friday, and the rent is due on
  Friday. What you take between shifts — a bigger bag, a better contract, a
  courier app — changes how you work the city.
- **The city happens to you.** Rain, fog and the first snow; a stroller and
  three bags at the tram steps; a regular who tips; another courier, Vesa,
  racing you for the job you are still thinking about.
- **A new shift every day.** The daily shift is the same city day, the same
  jobs and the same rival for everyone — share your result.

Made in Helsinki by Toko Midori Games.

### Lyhyesti (fi)

Kuriiripeli oikealla Helsingin raitiovaunu- ja metroverkolla: valitse keikka,
nappaa saapuva vuoro, vaihda oikealla pysäkillä, kävele kun se on nopeampaa —
ja toimita ajoissa. Viiden vuoron viikko, vuokra perjantaina, ja joka päivä
uusi päivän vuoro.

## Controls

Tap (or click) a job to take it · tap a lit tram — on the map or in the
panel — to board it · GET OFF when it lights · walk to the next stop when it
beats waiting. STOP / ROUTE / CITY change the zoom; pinch and drag on a phone.

## Media

- **Trailer:** the Crown Bridges film, made from the real game —
  `FFMPEG=/path/to/ffmpeg NODE_PATH=$(npm root -g) node toko-move/tools/film.cjs toko-move-crown-bridges.mp4`
  (1080 × 1920, H.264; upload to YouTube and paste the link, or attach).
- **Cover image and screenshots:** all from the real game, the store build,
  on a phone —
  `NODE_PATH=$(npm root -g) node toko-move/tools/stills.cjs out/`
  writes `cover.png` (630 × 500, plus `cover@2x.png`) — tram 12 crossing the
  water to Kruunuvuori under the name — and six 1080 × 1920 stills:
  `01-dispatch`, `02-catch`, `03-crown-bridge`, `04-event`, `05-week`,
  `06-daily`. Upload the cover and any five; `03` and `05` say the most.

## Credits (must appear on the page)

- Transit data: **Helsinki Regional Transport Authority (HSL)**, CC BY 4.0.
- Map data: **© OpenStreetMap contributors**, ODbL 1.0.
- District boundaries: **City of Helsinki**.
- Game: Toko Midori Games.

## Changelog

`toko-move/VERSIONS.md` is the changelog; post each release's headline as a
devlog entry with the version number the title card shows.
