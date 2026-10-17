# TESLUR LIVE (B) — sound events for the composer (re-timed)

Silent film: `film-b.mp4`, 1080×1920, 24 fps, **708 frames = 29.50 s**. One locked-off livestream wide shot (a very slow drift) from 0.00 to 25.50, then a HARD CUT to the end card, 25.50–29.50.
Everything moves on ones (24/s), so every time below is exact to 1/24 s. **Frame = time × 24** (frame 0 is 0.000 s; the last frame is 707). Times come from the film's own timing functions (`window.__film.events()`, `carLog()` and `edges()` in `film-bc.js`), so they match the picture.

**The gag: the car and the janitor's vacuum are ONE thing.** The car climbs only while his vacuum runs and lets go the instant he walks out of frame with it. So the car's suction IS his vacuum: one sound. Its level over time is the table at the bottom (0–1). He never looks up while he walks; at 22.00 he stops, the vacuum cuts, the car starts to cough, he peeks out from under one ear defender at it, then turns his head and looks straight at us.

## Timeline at a glance

| s | frame | what you see |
|---:|---:|---|
| 0.00 | 0 | Night, the curved ramp, red LED edges breathing slowly (one breath ≈ 2.6 s). The car waits at the foot. HUD at rest: SUCTION 200 kg · car icon · PITCH 0.0 · ALTITUDE 0.1. Nobody on screen |
| 1.50 | 36 | **RUN 1 / VACUUM ON.** The car pulls off from the foot (the sound starts on this frame). The LEDs stop breathing and burn steady. The janitor is still off-screen right |
| 2.50 | 60 | His floor nozzle touches the RIGHT edge (first frame with it in: 61); his body follows from 3.26 (frame 78), the canister from 4.99 (frame 120). He walks LEFT at one even pace, sweeping, head down |
| 3.92 | 94 | The car reaches vertical (pitch 90) and climbs the wall |
| 5.00 | 120 | **The car STOPS halfway up the wall** (pitch 90, ALTITUDE 34 ft, SUCTION 3166 kg) and HOLDS there to 7.00 on its suction: a small settle, then a faint tremble |
| 7.00 | 168 | It moves on up, SLOWER (leaves the vertical at 7.58) |
| 10.00 | 240 | **It STOPS upside down under the overhang** (pitch 170, ALTITUDE 66 ft, SUCTION 4697 kg) and hangs there, trembling, to 12.00. Meanwhile he walks out LEFT: body gone 10.55, canister going 10.93 |
| 12.00 | 288 | **The canister's last edge leaves the LEFT edge** (frame 288 is the first without him). **At the same instant the car lets go** and rolls back DOWN (vertical 12.71, on the flat ≈13.24) |
| 13.60 | 326 | The car stops at the foot. 13.60–15.00: stillness, nobody on screen |
| 15.00 | 360 | **RUN 2 / VACUUM ON** (he is off-screen left). The car starts up again, SLOWLY. HUD switches to the run-2 layout (G-FORCE · car icon · top-view icon · ALTITUDE); the lower LED edges go from red to WHITE, a red LED row and five white floods appear on the ground at left |
| 15.40 | 370 | His nozzle comes in from the LEFT edge (first frame with it in: 370); body from 16.23 (frame 390), canister from 17.93 (frame 430). He walks RIGHT at the same even pace, sweeping, head down |
| 17.04 | 409 | The car passes vertical |
| 19.00 | 456 | **LAUNCH** off the top lip: upside down, nose up, out to the left; half-rolls upright 19.00–20.35 |
| 19.60 | 470 | **JETS ON**: four blue-white cold-gas jets straight down; it hovers and TURNS (yaw and a bank that shows the canopy, ≈20.35–21.70) |
| 21.80 | 523 | Jets cut |
| 22.00 | 528 | **He STOPS dead** (in the right third of the frame) and stands the wand up; **his VACUUM goes OFF; the first cough** (below). His right hand goes to the right ear cup 22.00–22.30 |
| 22.10 | 530 | 22.10–22.50: he looks UP and off to the left at the coughing car; the cup comes a few cm off his ear (22.20–22.50) — a peek |
| 23.30 | 559 | 23.30–23.70: **only his head turns, to look straight into the camera**, cup still lifted. He holds that, breathing, to the cut |
| 25.50 | 612 | **HARD CUT** to black: TESLUR in clay letters (and the TESLUR LIVE bug top-right). Silent |
| 26.30 | 631 | 26.30–26.60: "What?" pops in under it, white type |
| 29.50 | 708 | End (last frame 707) |

## The janitor's vacuum

- **Vacuum ON: 1.50** (frame 36), with the car. He is still off-screen right: let the motor arrive before he does. Its level is the suction table: it is the car's suction.
- **Pass 1, right → left, one even pace.** Nozzle into frame at the right edge **2.50 (frame 60)**; the canister's last edge out at the left edge **12.00 (frame 288)** — 9.50 s, about 182 px/s across a 1080-wide frame. Body in frame 3.26–10.55, canister 4.99–12.00.
- **12.00: his vacuum leaves with him.** It is the car's suction, so it collapses to nothing in 0.12 s (to 12.12) as the car lets go. Silence of the motor 12.12–15.00.
- **Vacuum ON again: 15.00** (frame 360), off-screen left, with run 2.
- **Pass 2, left → right, the same pace.** Nozzle into frame at the left edge **15.40** (first frame with it in: 370); body from 16.23, canister from 17.93.
- **Vacuum OFF: 22.00** (frame 528) — he stops dead, and the car coughs on the same frame.
- Nozzle swish (each end of a sweep, one sweep = 1.15 s, constant): 2.01, 2.59, 3.16, 3.74, 4.31, 4.89, 5.46, 6.04, 6.61, 7.19, 7.76, 8.34, 8.91, 9.49, 10.06, 10.64, 11.21, 11.79, 15.24, 15.81, 16.39, 16.96, 17.54, 18.11, 18.69, 19.26, 19.84, 20.41, 20.99, 21.56. Swishes while he is off-screen (before 2.50; after ≈9.6 in pass 1; before 15.40) can be quieter.
- Pace: one footfall every 0.74 s (1.36 steps/s), never changing. **Footsteps** (R/L; * = his feet are off-screen):

  0.37R* · 1.11L* · 1.84R* · 2.58L* · 3.32R* · 4.06L · 4.79R · 5.53L · 6.27R · 7.00L · 7.74R · 8.48L · 9.22R · 9.95L · 10.69R* · 11.43L* · 12.16R* · 12.90L* · 13.64R* · 14.38L* · 15.11R* · 15.85L* · 16.59R* · 17.32L · 18.06R · 18.80L · 19.54R · 20.27L · 21.01R · 21.75L

- No footsteps after 22.00: a small shuffle as he plants his feet, 22.00–22.45.
- Ear cup: hand on it 22.00–22.30; the cup comes a few cm off the ear 22.20–22.50 (a soft rubbery pop as the seal breaks ≈22.25). It stays lifted to the cut.
- Head: down at his work the whole time he walks; UP at the car 22.10–22.50; to the camera 23.30–23.70; held, breathing, 23.70–25.50.

## The car (its sound is his vacuum)

| s | frame | event |
|---:|---:|---|
| 1.50 | 36 | **Run 1 suction START** — pulls off from the foot |
| 2.69 | 64 | leaves the flat, onto the curl |
| 3.92 | 94 | vertical (pitch 90) |
| 5.00 | 120 | **STOPS in the middle** of the wall (suction ≈0.67); holds, trembling, to 7.00 |
| 7.00 | 168 | **RESUMES**, slower (suction rises to 1.0 by the top) |
| 10.00 | 240 | **TOP**: stops upside down at pitch 170 (suction 1.0); hangs, trembling, to 12.00 |
| 12.00 | 288 | **RELEASE**: suction drops to 0 in 0.12 s; it rolls back down |
| 12.71 | 305 | passes vertical on the way down |
| 13.60 | 326 | at the foot; still |
| 15.00 | 360 | **Run 2 suction START** — slow (0.08, rising to 1.0 at the lip) |
| 15.85 | 380 | leaves the flat |
| 17.04 | 409 | passes vertical |
| 19.00 | 456 | **LAUNCH** off the top (suction peak 1.0); a whoosh as it leaves the ramp; 0.9 from here |
| 19.60 | 470 | **JETS ON** (cold-gas hiss under the vacuum whine), steady to 21.80 |
| 20.35 | 488 | the turn begins (to ≈21.70) |
| 21.80 | 523 | **JETS OFF** |
| 22.00 | 528 | the cough begins; from here the suction sputters (table) |

### The cough — puff … puff-puff … long wheeze … big … small

Each stutter is a choked jet flash 0.09 s before the time below, then a burst of grey-white clay smoke; the car drops and recovers (the drop is the hiccup). The smoke drifts left and grows slowly until the cut.

| s | frame | size | smoke puffs | car drops | G-FORCE spike |
|---:|---:|---|---:|---|---:|
| 22.00 | 528 | **small** | 3 | ≈0.5 m, back in ≈1 s | +1.3 |
| 22.57 | 542 | **medium** | 5 | ≈0.7 m, back in ≈1 s | +1.9 |
| 22.81 | 547 | **medium** | 5 | ≈0.7 m, back in ≈1 s | +1.9 |
| 23.40–24.25 | 562–582 | **long wheeze** (a rattling stream) | 18 small | sags ≈0.8 m over 1.5 s, wobbling | ≈0.5–1.0 |
| 24.53 | 589 | **large** | 8 | ≈1.0 m, back in ≈1 s | +2.6 |
| 25.07 | 602 | **small** | 3 | ≈0.5 m, back in ≈1 s | +1.3 |

## suction(t) — the car's vacuum (= his vacuum), 0–1, every 0.25 s

0 = off, 1 = the peak whine at the top of run 1. 0 until 1.50; climbs to ≈0.67 at the mid-wall stop and holds; rises to 1.0 by the top at 10.00 and holds; **drops to 0 at 12.00–12.12** as he leaves frame; 0 through the stillness; run 2 climbs slowly from 15.00 to 1.0 at the launch (19.00), holds 0.9 on the jets, then sputters down to ≈0.3 by the cut, dipping hard at every cough and wavering through the wheeze. 0 on the end card.

| t | s | t | s | t | s | t | s | t | s | t | s |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 0.00 | 0.25 | 0.00 | 0.50 | 0.00 | 0.75 | 0.00 | 1.00 | 0.00 | 1.25 | 0.00 |
| 1.50 | 0.05 | 1.75 | 0.07 | 2.00 | 0.11 | 2.25 | 0.16 | 2.50 | 0.22 | 2.75 | 0.28 |
| 3.00 | 0.34 | 3.25 | 0.41 | 3.50 | 0.47 | 3.75 | 0.52 | 4.00 | 0.57 | 4.25 | 0.61 |
| 4.50 | 0.64 | 4.75 | 0.66 | 5.00 | 0.68 | 5.25 | 0.67 | 5.50 | 0.66 | 5.75 | 0.69 |
| 6.00 | 0.66 | 6.25 | 0.67 | 6.50 | 0.68 | 6.75 | 0.66 | 7.00 | 0.67 | 7.25 | 0.68 |
| 7.50 | 0.69 | 7.75 | 0.72 | 8.00 | 0.76 | 8.25 | 0.79 | 8.50 | 0.83 | 8.75 | 0.88 |
| 9.00 | 0.91 | 9.25 | 0.95 | 9.50 | 0.98 | 9.75 | 0.99 | 10.00 | 1.00 | 10.25 | 1.00 |
| 10.50 | 1.00 | 10.75 | 1.00 | 11.00 | 1.00 | 11.25 | 1.00 | 11.50 | 1.00 | 11.75 | 1.00 |
| 12.00 | 1.00 | 12.25 | 0.00 | 12.50 | 0.00 | 12.75 | 0.00 | 13.00 | 0.00 | 13.25 | 0.00 |
| 13.50 | 0.00 | 13.75 | 0.00 | 14.00 | 0.00 | 14.25 | 0.00 | 14.50 | 0.00 | 14.75 | 0.00 |
| 15.00 | 0.08 | 15.25 | 0.09 | 15.50 | 0.12 | 15.75 | 0.17 | 16.00 | 0.22 | 16.25 | 0.29 |
| 16.50 | 0.37 | 16.75 | 0.45 | 17.00 | 0.54 | 17.25 | 0.63 | 17.50 | 0.71 | 17.75 | 0.79 |
| 18.00 | 0.86 | 18.25 | 0.92 | 18.50 | 0.96 | 18.75 | 0.99 | 19.00 | 0.90 | 19.25 | 0.90 |
| 19.50 | 0.90 | 19.75 | 0.90 | 20.00 | 0.90 | 20.25 | 0.90 | 20.50 | 0.90 | 20.75 | 0.90 |
| 21.00 | 0.90 | 21.25 | 0.90 | 21.50 | 0.90 | 21.75 | 0.90 | 22.00 | 0.14 | 22.25 | 0.40 |
| 22.50 | 0.85 | 22.75 | 0.24 | 23.00 | 0.21 | 23.25 | 0.65 | 23.50 | 0.25 | 23.75 | 0.13 |
| 24.00 | 0.13 | 24.25 | 0.19 | 24.50 | 0.21 | 24.75 | 0.14 | 25.00 | 0.31 | 25.25 | 0.09 |
| 25.50 | 0.00 | 25.75 | 0.00 | 26.00 | 0.00 | 26.25 | 0.00 | 26.50 | 0.00 | 26.75 | 0.00 |
| 27.00 | 0.00 | 27.25 | 0.00 | 27.50 | 0.00 | 27.75 | 0.00 | 28.00 | 0.00 | 28.25 | 0.00 |
| 28.50 | 0.00 | 28.75 | 0.00 | 29.00 | 0.00 | 29.25 | 0.00 | 29.50 | 0.00 |  |  |

## Picture-only events (optional)

- 15.00 HUD layout change (a soft UI blip). The HUD numbers roll continuously on ones.
- 25.50 the cut; 26.30 "What?" pops in. There is no sign-off.
