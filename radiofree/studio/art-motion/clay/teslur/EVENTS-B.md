# TESLUR LIVE (B) — sound events for the composer

Silent film: `film-b.mp4`, 1080×1920, 24 fps, 504 frames = 21.00 s. One locked-off livestream wide shot (a very slow drift) from 0.00 to 17.50, then a HARD CUT to the end card, 17.50–21.00.
Everything moves on ones (24/s), so every time below is exact to 1/24 s. Times are seconds from the first frame. Generated from the film's own timing functions (`window.__film.events()` in `film-bc.js`), so they match the picture.

**The joke is in the sound: the car sounds like a vacuum cleaner.** Its suction curve over time is the table at the bottom (0–1). Down in front, a janitor runs a real vacuum, so two vacuums play against each other; when the car starts to cough, his vacuum switches off and he lifts one ear defender: "what?".

## Timeline at a glance

| s | what you see |
|---:|---|
| 0.00–3.20 | Night, the curved ramp, red LED edges breathing slowly (one breath ≈ 2.6 s). The car waits at the foot. HUD top: SUCTION 200 kg · car icon · PITCH 0.0 · ALTITUDE 0.1 |
| 0.40–3.00 | The janitor walks in from bottom-left pushing his canister vacuum (his body is in frame from ≈2.1; the nozzle leads at ≈1.5). The canister rolls after him on its hose |
| 3.00–7.00 | He vacuums in place, nozzle sweeping left-right |
| 3.20–5.60 | **Run 1**: the car climbs, accelerating then easing; passes vertical (pitch 90) at ≈4.34; STOPS upside down under the overhang at pitch 170, 5.60. SUCTION 200 → 4697 kg, ALTITUDE 0 → 66 ft |
| 5.60–7.00 | It hangs upside down, held by its own suction: a small settle, then a faint tremble |
| 7.00–8.60 | It rolls back down (passes vertical ≈7.85, reaches the flat ≈8.20, stops at the foot 8.60). Gauges fall back |
| 7.00–7.40 | The janitor turns round; 7.40–9.10 he walks off LEFT, canister in tow (he leaves frame ≈8.2, the canister ≈8.5) |
| 8.90 | HUD switches to the run-2 layout: G-FORCE · car icon · top-view icon · ALTITUDE. The ramp's lower LED edges switch from red to WHITE; a red LED row and five white floods appear on the ground at left |
| 9.20–10.60 | **Run 2**: up again, faster, passing vertical ≈9.98, out over the top |
| 9.60–11.90 | The janitor walks back in from the LEFT (nozzle in frame ≈10.6, his body ≈11.0), then vacuums 11.90–13.60 |
| 10.60 | **Launch**: the car leaves the top upside down, nose up, out to the left; half-rolls upright 10.6–11.95 |
| 11.45–13.95 | **Jets ON**: four blue-white cold-gas jets straight down; the car hovers and TURNS (yaw and a bank that shows the canopy, 12.0–13.3) |
| 13.60 | The janitor stops and stands the wand up beside him (13.60–14.05) |
| 14.00–17.50 | **The cough** (below). The car sputters a little further left and down, hiccupping at each stutter |
| 14.00 | The janitor's vacuum switches OFF as he lifts his right ear defender clearly off (cup away 14.12–14.60), tilts his head toward the car; his free palm comes up 14.30–14.75 — "what?" — and he holds it, breathing, to the cut |
| 17.50 | HARD CUT to black: TESLUR in clay letters (and the TESLUR LIVE bug top-right) |
| 18.10–18.45 | "What?" fades in under it, white type |
| 21.00 | End |

## The janitor's vacuum

- **Vacuum ON: 0.40** — he is still off-screen left; let the motor arrive before he does. It runs without a break (walking, vacuuming, walking off, walking back) until:
- **Vacuum OFF: 14.00** — exactly as he lifts the ear cup. The first cough lands 0.05 s later (14.05) into the silence.
- Nozzle swish (each end of a sweep, one sweep = 1.15 s): 0.86, 1.44, 2.01, 2.59, 3.16, 3.74, 4.31, 4.89, 5.46, 6.04, 6.61, 7.19, 7.76, 8.34, 8.91, 9.49, 10.06, 10.64, 11.21, 11.79, 12.36, 12.94, 13.51. Swishes while he is off-screen (before ≈1.5, ≈8.5–10.6) can be quieter.
- Pace: ≈2.8 steps/s walking in, a hurried ≈5 steps/s walking off (7.5–9.1), ≈3.4 steps/s coming back. **Footsteps** (R/L; * = his feet are off the left edge of frame):

  0.68R* · 1.04L* · 1.40R* · 1.76L* · 2.11R* · 2.47L · 2.82R · 7.54R · 7.72L · 7.90R · 8.09L · 8.28R* · 8.47L* · 8.65R* · 8.84L* · 9.07R* · 9.97L* · 10.25R* · 10.54L* · 10.82R* · 11.10L · 11.38R · 11.67L

- No footsteps while he vacuums in place (3.00–7.00, 11.90–13.60) or stands (13.60–17.50); a shuffle as he turns round 7.00–7.40 and as he stops 13.60–14.05.
- Ear cup lift: grab 14.00, cup clear of the ear 14.12–14.60 (a soft rubbery pop as the seal breaks ≈14.15).

## The car (its sound is a vacuum cleaner)

| s | event |
|---:|---|
| 3.20 | Run 1 **suction whine START** (car pulls off from the foot) |
| 4.34 | passes vertical |
| 5.60 | **PEAK**: stops upside down at pitch 170; hold at full suction to 7.00 (tremble) |
| 7.00 | starts to **roll back down**; suction sags |
| 8.60 | at the foot; run 1 **suction STOP** |
| 9.20 | Run 2 **suction whine START** |
| 9.98 | passes vertical |
| 10.60 | **LAUNCH** off the top (suction peak); whoosh as it leaves the ramp |
| 11.45 | **Jets ON** (cold-gas hiss under the vacuum whine), steady to 13.95 |
| 12.00–13.30 | the turn |
| 13.95 | jets cut; from here the suction sputters (table) |

### The cough — puff … puff-puff … long wheeze … puff … puff

Each stutter is a choked jet flash 0.09 s before the time below, then a burst of grey-white clay smoke; the car drops and recovers (the drop is the hiccup). The smoke drifts left and grows slowly until the cut.

| s | size | smoke puffs | car drops | G-FORCE spike |
|---:|---|---:|---|---:|
| 14.05 | **small** | 3 | ≈0.5 m, back in ≈1 s | +1.3 |
| 14.62 | **medium** | 5 | ≈0.7 m, back in ≈1 s | +1.9 |
| 14.86 | **medium** | 5 | ≈0.7 m, back in ≈1 s | +1.9 |
| 15.45–16.30 | **long wheeze** (medium-weak, a rattling stream) | 18 small | sags ≈0.8 m over 1.5 s, wobbling | ≈0.5–1.0 |
| 16.58 | **large** | 8 | ≈1.0 m, back in ≈1 s | +2.6 |
| 17.12 | **small** | 3 | ≈0.5 m, back in ≈1 s | +1.3 |

## suction(t) — the car's vacuum curve, 0–1, every 0.25 s

0 = off, 1 = the peak whine at the top of run 1. Run 2 climbs to 1 at the launch, holds 0.9 on the jets, then sputters down to ≈0.3 by the cut, dipping hard at every cough (to ≈0.15) and wavering through the wheeze. 0 on the end card.

| t | s | t | s | t | s | t | s | t | s | t | s |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 0.00 | 0.25 | 0.00 | 0.50 | 0.00 | 0.75 | 0.00 | 1.00 | 0.00 | 1.25 | 0.00 |
| 1.50 | 0.00 | 1.75 | 0.00 | 2.00 | 0.00 | 2.25 | 0.00 | 2.50 | 0.00 | 2.75 | 0.00 |
| 3.00 | 0.00 | 3.25 | 0.06 | 3.50 | 0.13 | 3.75 | 0.24 | 4.00 | 0.37 | 4.25 | 0.51 |
| 4.50 | 0.65 | 4.75 | 0.77 | 5.00 | 0.88 | 5.25 | 0.96 | 5.50 | 1.00 | 5.75 | 1.00 |
| 6.00 | 1.00 | 6.25 | 1.00 | 6.50 | 1.00 | 6.75 | 1.00 | 7.00 | 1.00 | 7.25 | 0.96 |
| 7.50 | 0.90 | 7.75 | 0.82 | 8.00 | 0.70 | 8.25 | 0.52 | 8.50 | 0.27 | 8.75 | 0.00 |
| 9.00 | 0.00 | 9.25 | 0.08 | 9.50 | 0.19 | 9.75 | 0.39 | 10.00 | 0.64 | 10.25 | 0.86 |
| 10.50 | 0.99 | 10.75 | 0.90 | 11.00 | 0.90 | 11.25 | 0.90 | 11.50 | 0.90 | 11.75 | 0.90 |
| 12.00 | 0.90 | 12.25 | 0.90 | 12.50 | 0.90 | 12.75 | 0.90 | 13.00 | 0.90 | 13.25 | 0.90 |
| 13.50 | 0.90 | 13.75 | 0.90 | 14.00 | 0.90 | 14.25 | 0.30 | 14.50 | 0.79 | 14.75 | 0.17 |
| 15.00 | 0.13 | 15.25 | 0.57 | 15.50 | 0.33 | 15.75 | 0.24 | 16.00 | 0.13 | 16.25 | 0.10 |
| 16.50 | 0.15 | 16.75 | 0.10 | 17.00 | 0.28 | 17.25 | 0.06 | 17.50 | 0.00 | 17.75 | 0.00 |
| 18.00 | 0.00 | 18.25 | 0.00 | 18.50 | 0.00 | 18.75 | 0.00 | 19.00 | 0.00 | 19.25 | 0.00 |
| 19.50 | 0.00 | 19.75 | 0.00 | 20.00 | 0.00 | 20.25 | 0.00 | 20.50 | 0.00 | 20.75 | 0.00 |
| 21.00 | 0.00 |  |  |  |  |  |  |  |  |  |  |

## Picture-only events (optional)

- 8.90 HUD layout change (a soft UI blip). The HUD numbers roll continuously on ones.
- 17.50 the cut; 18.10 "What?" fades in. There is no sign-off.
