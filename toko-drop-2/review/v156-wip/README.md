# Toko Drop 2.0 — v156, work in progress (NOT shipped)

This is for review, for the owner and the producer. **It is not a release.** The live game, the arcade cabinet and the itch page are still v155 (`../../itch/`). v156 ships once the menus, the announcer and the controls are all done (owner, 18 Nov 2026).

- `tokodropv156-wip.html`: the work so far as one playable file. Open it in a browser; it needs nothing else. Its corner still reads `v155`, because the version number moves only when v156 ships.
- `title.jpg`, `title-sideways.jpg`, `pause-menu.jpg`, `settings.jpg`: the new screens, on a phone-size screen.
- The code is on branch `ccr-cf2281cf-eeuspz`, on top of `gh-pages`.

## What has changed since v155

**The pause menu** is PAUSED · RESUME · RESTART · SETTINGS · QUIT. The enemy card is gone from it. The death screen still has its "got you" card.
- RESTART abandons the run and starts the same one again: the same mode and start world, the same campaign room, or the same day's waves for DAILY. It works like AGAIN on the result screen, and records the run as quit.

**SETTINGS** (was OPTIONS, and the title's MENU button) is a list: one row per setting, the name on the left and the value on the right, under three headings.
- SOUND: volume, music, intro voice. CONTROLS: move with (left or right thumb), stick size. GENERAL: reduce motion, language.
- RECORDS appears only from the title.
- The other 14 (ANNOUNCER, ANNOUNCER VOL., DASH, DASH BY, GEL HP, GELS, WORLDS, STYLE, LENS, SPLATTER, DEAD ZONE, STICK FOLLOW, AUTO QUALITY, PLAY RECORD) show only with `?dev` in the address. Nothing was removed.

**The start menu** is one family: ARCADE, CAMPAIGN and DAILY are the same full-width boxes, each with one short line. HARD and START AT (was FROM WORLD) are rows under ARCADE, and SETTINGS is a row at the bottom. The order is the owner's: ARCADE, HARD, CAMPAIGN. Held sideways it is two columns, and neither scrolls.

**The camera trails the hero less.** The ease went from 0.22 s to 0.1 s: a walking hero used to run 1.26 m ahead of the view before it caught up, and now runs 0.55 m.

**The touch sticks follow your thumb.** The owner reported aiming as unresponsive, with "16 sub directions instead of closer to 360 degrees". Nothing in the code rounds the aim. The cause was the stick's centre staying where the thumb first landed: with the thumb 100 px out, circling it 30 px covered only 18° of aim. Now the centre is dragged behind the thumb, and the same circle covers 59°. With `?dev`, the STICK FOLLOW switch turns it off to compare with 1.x.

**No announcer for now** (owner, 19 Nov). The commentary voice is off for players, and its rows are out of SETTINGS. `?dev` keeps its switch, and its rewritten lines (no more SMASH TV game show) stay in the code for when it comes back.

**The owner's recorded intro is back.** "TOKO DROP — START SHOOTING!", from 1.x, plays on arriving at the title, with its own INTRO VOICE switch, on by default.

## Still to do before v156

- **Controls:** the following stick needs the owner's feel on the Pixel. If it still isn't responsive enough, frame rate and input lag come next.
