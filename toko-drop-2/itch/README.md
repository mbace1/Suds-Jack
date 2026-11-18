# Toko Drop 2.0 — the itch.io kit

Everything for the itch.io page, in one place. Upload from here.

| File | What it is | Where it goes on itch |
|---|---|---|
| `tokodropv155.html` | The whole game, v155, in one file: code, three.js and all 36 rooms | **Uploads**: tick "This file will be played in the browser" |
| `cover.png` | The cover the owner picked on 30 Oct ("core"), 1260 × 1000 | **Cover image** (itch asks for 630 × 500; this is 2×) |
| `screenshots/` | 11 pictures at 1920 × 1080, from the v155 build: the nine arcade worlds mid-fight, the campaign grid, a boss room | **Screenshots** |

Settings (owner, 18 Nov 2026): HTML, played in the browser, 960 × 540, Mobile friendly on, Fullscreen button on, "Automatically start on page load" off, pricing "$0 or donate", release status In development.

Only the current version's `.html` is kept here. When a new version ships, its file replaces this one: `tokodropv156.html`, then `tokodropv157.html`, and so on. How each part is made is in `../AGENTS.md`, "The itch.io upload".

The screenshots read `webgl2` in the corner because they were rendered in a container without WebGPU. The game looks the same either way.

Live copy of this folder: https://mbace1.github.io/Suds-Jack/toko-drop-2/itch/

Work in progress on the next version, for review only (not uploaded, not live in the game): `../review/`.
