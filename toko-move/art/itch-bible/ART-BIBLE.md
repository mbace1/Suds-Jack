# Toko Move — itch.io art bible (v1.1, 1 Nov 2026: Toko faces on event cards)

**Toko Move**, by Toko Midori Games, is a minimalist courier roguelike played on Helsinki's real HSL tram and metro network. The player can wait, catch, ride, transfer or walk.

**The visual bar** is Mini Metro clarity with a Bithell (*Subsurface Circular*) finish.
- The hero is a schematic map of the exact HSL geometry.
- Lines are not drawn by the player, and there are no isometric cubes.

**Files:** `bible-sheet.png` (2400×2080), `still-day.png`, `still-night.png` and `still-disruption.png` (1920×1080), `skin-*.png` (640×900 map panels), and `make_bible.py`, which re-renders everything from `cities/helsinki.json` and `cities/ground/helsinki-water.json`.

## 1 · Palette

### Ground and UI

| role | hex | source |
|---|---|---|
| day paper (map) | `#f4f1e8` | live `js/palette.js` PAL.paper |
| UI panel | `#fffdf7` | live `index.html` :root `--panel` |
| UI ink / text | `#15262b` | live `--ink` |
| UI dim | `#69777a` | live `--dim` |
| hairline | `#c5cec8` | live `--rule` |
| primary button / "on" | `#233d4d` | live `--navy` |
| water (day) | `#c9e4e8` | live `--water` |
| warning / late / halted | `#e2683c` | live `--coral` |
| halted line grey | `#b8c2c6` | live `.lb` box-shadow grey |
| night ground | `#0f1418` | live `js/board.js` (hubRing / ink) |
| night water | `#12293d` | live `board.js` NIGHT.water |
| night coast | `#2a5f88` | live `board.js` NIGHT.waterEdge |
| night labels | `#c4ced4` | live `board.js` NIGHT.label |
| **Toko cyan** | `#33b2d2` | brand-supplied (also in `toko/dance/ref/README.md`). Not in `toko/toko.css`, which is black + magenta `#f0027f`. |

### Lines

- **Metro** is `#e2531f` (live `board.js` METRO_INK, HSL's orange) on day and disruption. Night lifts it to `#ff6a3d` for the neon read.
- **Trams**: HSL ships `route_color = null` on all 34 lines, so colour is per family.
  - The **night** inks are the live `board.js` TRAM_INK values, used as-is.
  - The **day** inks are **proposed**. They keep each night ink's hue and chroma and move its lightness into L\* 38–58 so it holds 3:1 on paper (`day_inks()` in the script).
  - Tram 2 is hand-set. With the tram 2 fix, the minimum dE76 between day inks is 18.3 (tram 2 vs tram 12). Every other pair is ≥ 23.9 (tram 11 vs H).

| family | day (proposed) | night (live) | day on paper |
|---|---|---|---|
| 1 | `#704d82` | `#9a79aa` | 6.05:1 |
| 2 | `#04829a` | `#00d7ef` | 3.99:1 |
| 3 | `#3e8ecc` | `#8bc4fe` | 3.13:1 |
| 4 | `#8a6802` | `#c09734` | 4.58:1 |
| 5 | `#536122` | `#808b53` | 6.00:1 |
| 6 | `#a3302c` | `#ce6459` | 6.16:1 |
| 7 | `#c76c8a` | `#fca8c1` | 3.13:1 |
| 8 | `#3f65d6` | `#8495fd` | 4.60:1 |
| 9 | `#6c981c` | `#abcf66` | 3.03:1 |
| 10 | `#bd61c8` | `#f19ef9` | 3.26:1 |
| 11 | `#026a30` | `#2a9950` | 5.98:1 |
| 12 | `#056666` | `#1c9595` | 6.00:1 |
| 13 | `#b0045f` | `#db5389` | 6.14:1 |
| 15 | `#bc7c53` | `#f4b58f` | 3.03:1 |
| H | `#2c9c77` | `#7ad3b0` | 3.03:1 |
| M | `#e2531f` | `#e2531f` (`#ff6a3d` lit) | 3.39:1 |

### Rules for Toko cyan

- **Toko cyan belongs to the player and to Toko only**: the courier disc, the player's own cursor/selection, the info Toko face, and the logo. No line, vehicle or water uses it.
- **Tram 2 is the danger.**
  - On paper it is set deeper (`#04829a`, dE 18.3 from the courier cyan).
  - On night it stays live `#00d7ef` (dE 16.5).
  - The courier is also told apart by shape (disc + white ring + parcel) and never by colour alone.
- **Coral is UI-only** (warning, late ring, halt stops). It is never a line stroke, because it is only dE 13.5 from the metro.

## 2 · Type

- **Inter** (variable). Use 650–800 for the clock, labels and buttons, and 450 for body text.
- Map labels are **CAPS, 650, haloed** in the ground colour, at the dim colour, and only on interchange hubs.
- The clock uses tabular figures: `07:42`. No ticks anywhere on screen.
- The live build uses `ui-monospace`. Inter is a proposal for the itch page and the UI pass.

## 3 · Map hierarchy (back to front)

1. Ground: paper or ink. No streets on the hero shot (the live game may keep the grey street tiers in-game).
2. Water (OSM): flat fill with a 1-step coast edge.
3. Tram lines: exact geometry, **one stroke per family**.
   - Shared track is drawn **side by side**, offset in a fixed order: M, 1…15, H.
   - Round joins.
4. Metro: 1.6× tram width with a ground-colour casing, always on top.
5. Hubs: white discs with an ink ring, only where 3+ families meet. Bigger at 5+.
6. Vehicles: pills in the line colour with a white casing and a white number. Metro pills are unnumbered.
7. Jobs: a cargo glyph (ink rounded square in a white disc) with its **deadline ring**.
8. Courier: a Toko cyan disc, white ring and white parcel, with a soft ink shadow. Always the top layer.
9. Labels last, haloed.

## 4 · UI kit (succinct)

- **HUD = three glyphs in one pill:** clock · jobs `●●○` · deadline ring around the current cargo. No labels, scores, ticks or feed on the hero.
- **The ring** runs clockwise from 12 o'clock. It is navy while there's time (mint on night) and turns **coral under ~30 %**.
- **An event is a face, one line, and two buttons priced in seconds.**
  - The left button is the primary action (filled navy), e.g. `Walk to the 2 · +90 s`. The right button is ghost, e.g. `Wait it out · +420 s`.
  - The card has no heading and no second sentence.
- **Faces are Toko faces.** They come from the traced master in `toko/js/master.js` (from `toko/master/face-white-on-yellow.jpg`; refs in `toko/dance/ref/`).
  - The face is drawn white on a mood disc and placed like `drawMasterBadge` (ink width 1.33 × r), with a white ring on light panels.
  - **Never magenta.**
  - The moods only use the master's own poses: eyes *squash* about their foot, the smile *grins* about its top.

| mood | disc | pose | used for |
|---|---|---|---|
| info | Toko cyan `#33b2d2` (ref `face-cyan-on-white.jpg`) | rest | timetable facts, dispatch, night notices |
| opportunity | yellow `#ffcc00` (ref `face-*-yellow*.jpg`) | grin 1.06 | early trams, shortcuts, favours |
| warning | coral `#e2683c` (live `--coral`) | eyes squash 0.62, grin 0.86 | late, halted, missed |
| service notice | deep teal `#176b73` | squash 0.85, grin 0.94 | service changes, inspectors, weather |
- **Line badges** use the live `.lb` chip: a tram is a rounded rect, the metro is a pill, both with a 2–3 px white border.

## 5 · Do / Don't

- **Do:**
  - Show all coloured lines at once.
  - Let the map grow as the sheet shrinks.
  - Show one guidance sentence on job one, then none.
  - Communicate with shapes before words.
  - Run one accent per event.
- **Don't:**
  - Draw an A→B route/guidance line (handover rule).
  - Use Mini Metro line drawing.
  - Use isometric cubes.
  - Show tick counters or DIRECT/VIA labels.
  - Use cyan for anything but the player and the info Toko face, or coral as a line.
  - Use magenta Toko faces, or any face other than the traced master.
  - Use mature content or awards on store art.

## 6 · Motion and sound

- **Motion**
  - Vehicles glide at constant speed and ease into stops.
  - Boarding is the courier disc snapping onto the pill (120 ms, a small overshoot).
  - A transfer is a 1-frame white flash on the hub.
  - A delivery pops the cargo (`jBump`, 0.45 s, as live) and fills a dot.
  - A late delivery uses `jBreak` (shake, coral).
  - A halt dashes the line grey over ~0.6 s, and coral pause stops pulse every 2 s.
  - Night adds glow only, with no extra motion. Honour `prefers-reduced-motion`, as the live CSS does.
- **Sound** (notes)
  - Soft tram bell on catch and a low chime on transfer.
  - Paper "tick" UI clicks, and a short two-note sting for an event card.
  - Night is the same set an octave down with reverb. Disruption adds a muted brake hiss.
  - No voice lines.

## 7 · itch package, stills list

1. **Cover 630×500**: a day crop of Rautatientori–Ooppera with the courier riding tram 2 and the HUD pill, plus the TOKO MOVE wordmark.
2. `still-day.png`: hero board with the HUD and a "Tram 2 is two minutes early" card.
3. `still-night.png`: the Night mutator with a "Last 4 east leaves Senaatintori" card (cyan info face).
4. `still-disruption.png`: line 4 halted at Ooppera, with a "Walk to the 2 · +90 s / Wait it out · +420 s" card (coral warning face).
5. A GIF of catch → ride → transfer → deliver (≈6 s, day).
6. A UI-kit close-up for the page body (crop row 5 of the sheet).
7. A banner (960×?) of a day/night split of the same map.

## Open decisions (flagged)

1. The live in-game board is currently the owner's **grey night board** (`board.js` NIGHT, 2026-09-02). This bible makes **day paper the default** per the brief and Night a mutator.
2. The day tram inks are derived, not live. If they're accepted, add them to `board.js` with a `test/board.mjs` floor (min dE 18).
3. Inter vs the live `ui-monospace`.
4. Toko cyan isn't in `toko/toko.css`, so confirm it as a brand colour.

Narrative twists, story arcs and soft doors are in `NARRATIVE-TWISTS.md`.

Data: HSL GTFS © HSL, CC BY 4.0. Water © OpenStreetMap contributors, ODbL 1.0.
