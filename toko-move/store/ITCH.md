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
| Genre | Card Game |
| Tags | `roguelike`, `card-game`, `turn-based`, `trams`, `helsinki`, `narrative`, `funny`, `mobile`, `minimalist`, `transport` |
| Content | no mature content (the spin-off *Toko Move: Piritori* is a separate project with its own rating) |
| Languages | English, Finnish (a Finnish browser starts in Finnish; the title card switches) |
| Inputs | mouse, touchscreen (sound is synthesised in the page; the ♪ top-right mutes it) |

## Short description (one line)

A courier's shift in Helsinki, one card at a time: which tram, which way, who to help, and what to risk.

## Description

**Toko Move** is a courier game set in Helsinki, played one card at a time.
Each card shows you where you stand and offers two choices, each with its
price in time. Pick a tram, a walk or a favour for a stranger, and the clock
moves only when you choose.

The trams run on HSL's real network. Every line and every stop is real, so
when you ride the 4 to Katajanokka, that's where the 4 goes.

- **Act 1: Helsinki.** Four runs, each opened by the one before. **Easy** is
  a first shift, three plain parcels and a quiet city. **Medium** is a real
  morning. **Hard** is the rush with one tram line halted. **Night** starts
  at 23:00, and something is off about the trams. Every attempt is a fresh
  shift.
- **Choices with stakes.** Run for the tram on a red light? The button says
  *maybe*. Euros, not points: a job pays its fee, an on-time streak raises
  it, late halves it, and every risk can move it either way.
- **Sell the parcel.** A student collecting for vappu, a dentist in a hurry,
  a woman in a long coat who knows your name. Selling pays now, and the
  buyer always says what was inside. Delivered, the stamp tells you.
- **Weather.** Snow makes walks slow and fills the trams. Rain goes for
  anything made of paper. Fog comes in off the sea at night.
- **Six trams, from the newest to the museum tram.** They all ride the same,
  but they look different, inside and out. The museum tram is rare.
- **The city remembers.** The granny you walked across Mannerheimintie
  saves you a seat later. Dispatch has a story that runs from shift to
  shift. The regulars tip. The other courier races you for a job, and from
  your fourth shift a parcel arrives with no address at all.
- **A daily, and a week.** After Night: the same shift for everyone each
  day (your first finish stands, so share it), and five shifts with the rent
  due on Friday.

Made in Helsinki by Toko Midori Games.

### Lyhyesti (fi)

Lähettipeli Helsingissä, kortti kerrallaan: mikä ratikka, mihin suuntaan,
ketä autat ja mitä uskallat. Kello liikkuu vain, kun valitset. Neljä tasoa
(helppo, keskitaso, vaikea ja yö), joista jokainen aukeaa edellisen
jälkeen. Riskit lukevat napissa sanoin, paketin voi myydä ja ostaja kertoo,
mitä siinä oli. Lumi, sade, kuusi ratikkamallia uusimmasta museoratikkaan,
ja kaupunki muistaa sinut. Lopuksi päivän vuoro, joka on sama kaikille, ja
viikko, jonka vuokra erääntyy perjantaina.

## Controls

Tap a choice. Each button shows its price in time and, when it is a risk,
its odds in a word (*usually*, *maybe*, *long shot*). Tap the scene to hurry
a hop or a stamp. MAP, in the corner, opens the whole board. ♪ mutes. On a
desktop, click works the same, and Space or Enter hurries.

## Media

- **Cover image and screenshots** come from the real game: the store build,
  on a phone, every screen reached by tapping. Run
  `NODE_PATH=$(npm root -g) node toko-move/tools/stills3.cjs out/`
  - `cover.png` (630 × 500, plus `cover@2x.png`): the Kauppatori stop as
    the game draws it, with an old tram, the SkyWheel and the courier, and
    the name on paper.
  - Twelve 1080 × 1920 stills:
    - `00-title` (the four runs as a new player meets them)
    - `01-dispatch`
    - `02-risk` (a choice with its odds)
    - `03-museum-tram`
    - `04-board`
    - `05-delivered` (what was inside)
    - `06-race`
    - `07-sealed`
    - `08-night` (the tram with no number)
    - `09-easy-complete`
    - `10-daily`
    - `11-week-rent`

  Upload the cover and any five. `01`, `02`, `03`, `05` and `08` say the most.
- **Trailer:** `tools/film3.cjs` films the journey from the store build,
  with the game's own sound. It runs about 47 s: the title, a first delivery
  whole, the museum tram, the night's tram with no number, the other courier
  and the lady from Mannerheimintie, then the end card.
  - `toko-move-trailer.mp4` is 1080×1920, for phones (Shorts, Reels,
    TikTok, and the page itself).
  - `--landscape` gives 1920×1080, for YouTube. itch's trailer slot takes a
    YouTube or Vimeo link, so upload the landscape cut there and paste the
    link.
  - `--url=<the itch page>` puts the store's address on the end card once it
    exists. Until then it reads `mbace1.github.io/Suds-Jack/toko-move`.

  ```
  FFMPEG=ffmpeg NODE_PATH=$(npm root -g) node toko-move/tools/film3.cjs toko-move-trailer.mp4
  FFMPEG=ffmpeg NODE_PATH=$(npm root -g) node toko-move/tools/film3.cjs toko-move-trailer-169.mp4 --landscape
  ```

## Credits (must appear on the page)

- Transit data: **Helsinki Regional Transport Authority (HSL)**, CC BY 4.0.
- Map data: **© OpenStreetMap contributors**, ODbL 1.0.
- District boundaries: **City of Helsinki**.
- Game: Toko Midori Games.

## Changelog

`toko-move/VERSIONS.md` is the changelog; post each release's headline as a
devlog entry with the version number the title card shows.
