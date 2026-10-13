#!/usr/bin/env python3
"""Score for "On Hold" (Doodle #2, 37.5 s). Synthesised, no samples — rfsound.py's orchestra.

    uv run --with numpy --with soundfile python 音频/synth_doh.py

The house grid (112 BPM, twelve beats a shot, the ending ten) and the film's motif, a falling
D–A–F on a low horn: the hold. Every effect sits on the frame of its event in scenes/doh_*.js —
the sign's chains and the padlock, the tax wheels ticking over and the ×45 stamp, the scissors
and the envelope's fall, eight calendar pages and the cheque landing, the gate and the
floodlights, and and the gate shut and the sign hung again on 6 October, the padlock on the last hit, which rings out.
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfsound import *

SHOT = 12
CUT = [k * SHOT * BEAT for k in range(6)]
END = CUT[5] + 10 * BEAT
m = Mix(END + 0.5)
def beat(k): return k * BEAT
def chain(d=0.4): t = tv(d); return sum(noise(d, 2500, 9000) * np.exp(-((t - k * 0.06) % 0.12) * 60) for k in range(1)) * 0.35 * np.sin(np.pi * t / d)
def rip(): t = tv(0.16); return noise(0.16, 1200, 7000) * np.exp(-t * 18) * (1 + 0.6 * np.sin(2 * np.pi * 70 * t)) * 0.5
def snip(): return over(click() * 1.2, tone(3400, 0.02, (1,), 0.001, 0.08, decay=40) * 0.3)
def ping(): return tone(2093, 0.04, (1, 0.3), 0.001, 0.9, decay=3) * 0.5

# the bed: wind over the site, then a mains hum under the meter
wind = noise(END, 120, 1600); wind *= 0.045 * (1 + 0.5 * np.sin(2 * np.pi * 0.13 * tv(END))); m.bed(wind)
m.add(hum(50, SHOT * BEAT + 0.5), CUT[1], 0.6)

MOTIF = [62, 57, 53]                                   # D – A – F: the hold
# shot 1 · the gate: the motif in the dark, the sign drops on its chains, the padlock snaps shut
for i, b in enumerate([0, 0.5, 1]): m.add(horn(MOTIF[i] - 12, 0.8 if i == 2 else 0.25), beat(b) + 0.02, 0.35)
m.add(chain(0.45), 0.1, 0.8); m.add(thump(), beat(1), 0.9); m.add(card(), beat(1), 0.6)
m.add(click(), beat(3), 1.0); m.add(stamp() * 0.6, beat(3), 0.8); m.add(blip(1320), beat(3) + 0.05, 0.3)
for b in range(4, SHOT, 2): m.add(tuba(38) * 0.4, beat(b), 0.5)

# shot 2 · the meter: the wheels tick over, the disc whirs up, ×45 stamped with a brass hit
m.add(kick() * 0.6, CUT[1], 0.8); m.add(card(), CUT[1], 0.5)
for i in range(3):
    t0 = CUT[1] + beat(1 + i * 0.5)
    for k in range(12): m.add(tick(), t0 + k * 0.07, 0.5 - k * 0.03, -0.3 + i * 0.3)
m.add(glide(180, 520, 2.4), CUT[1] + beat(1), 0.25)
m.add(stamp(), CUT[1] + beat(5), 1.0); m.add(kick() * 0.8, CUT[1] + beat(5), 0.8); m.add(brass(62 + 12, 0.6), CUT[1] + beat(5), 0.55)
for b in range(6, SHOT): m.add(tuba(41) * 0.45, CUT[1] + beat(b)); m.add(snare() * 0.15, CUT[1] + beat(b + 0.5))

# shot 3 · the support: the envelope lowered in, the scissors, the snip on the beat, the fall
m.add(kick() * 0.5, CUT[2], 0.7); m.add(glide(440, 260, 0.75), CUT[2], 0.25)
for i, b in enumerate([1.5, 2, 2.5]): m.add(celesta(74 - i * 2, 0.5), CUT[2] + beat(b), 0.35, 0.3)
m.add(rustle(0.5), CUT[2] + beat(5) - 1.0, 0.6, 0.6)
m.add(snip(), CUT[2] + beat(5), 1.0, 0.2); m.add(snip(), CUT[2] + beat(5) + 0.06, 0.7, 0.2)
m.add(glide(600, 120, 1.0), CUT[2] + beat(5) + 0.05, 0.35); m.add(rustle(0.8), CUT[2] + beat(5) + 0.1, 0.5)
m.add(thump() * 0.4, CUT[2] + beat(5) + 1.1, 0.5)
for i, b in enumerate([7, 7.5, 8]): m.add(horn(MOTIF[i] - 12, 0.8 if i == 2 else 0.25), CUT[2] + beat(b), 0.3)

# shot 4 · eight days: a page torn off every half-beat, each a step higher; the cheque lands
T0, STEP = 0.6, BEAT / 2
m.add(kick() * 0.5, CUT[3], 0.7)
for i in range(8): m.add(rip(), CUT[3] + T0 + i * STEP, 0.8, (-1) ** i * 0.4); m.add(celesta(67 + [0, 2, 4, 5, 7, 9, 11, 12][i], 0.3), CUT[3] + T0 + i * STEP + 0.02, 0.35)
T_CHQ = T0 + 8 * STEP + 0.35; T_LAND = T_CHQ + 0.7
m.add(glide(220, 110, 0.7), CUT[3] + T_CHQ, 0.25)
m.add(stamp(), CUT[3] + T_LAND, 1.0); m.add(card(), CUT[3] + T_LAND, 0.7); m.add(bell(), CUT[3] + T_LAND + 0.03, 0.35, 0.3)
for i, m_ in enumerate([53, 57, 62]): m.add(horn(m_, 0.6 if i == 2 else 0.2), CUT[3] + T_LAND + 0.3 + i * BEAT / 2, 0.3)   # the motif, the other way up

# shot 5 · open: chains let go, the sign hits the road, the gate creaks, floodlights, the march
m.add(kick() * 0.6, CUT[4], 0.8); m.add(chain(0.3), CUT[4] + 0.5, 0.8); m.add(thump(), CUT[4] + 0.9, 0.9); m.add(card(), CUT[4] + 0.9, 0.7)
m.add(creak(1.0), CUT[4] + beat(2), 0.9, -0.3); m.add(creak(0.9), CUT[4] + beat(2) + 0.1, 0.7, 0.3)
m.add(kick() * 0.7, CUT[4] + beat(3), 0.7); m.add(stamp() * 0.4, CUT[4] + beat(3), 0.6); m.add(hum(100, 4.5), CUT[4] + beat(3), 0.25)
m.add(glide(70, 110, 2.4) * 0.6, CUT[4] + beat(3.5), 0.5)
for b in range(4, SHOT): m.add(tuba(38 if b % 2 == 0 else 45) * 0.5, CUT[4] + beat(b)); m.add(snare() * (0.4 if b % 2 else 0.2), CUT[4] + beat(b + 0.5))
for i, b in enumerate([4, 4.5, 5]): m.add(brass(MOTIF[::-1][i], 0.5 if i == 2 else 0.18), CUT[4] + beat(b), 0.35)

# shot 6 · on hold, again (6.10.2026): the floodlights clunk off, the gate creaks shut, the hand
# hangs the sign back on its chains, the notice is pinned — and on the last hit the padlock, with the
# hold's own motif on the horn, D–A–F, ringing out
T_HIT = CUT[5] + 3.0
for b in range(6): m.add(tuba(38) * 0.35, CUT[5] + beat(b)); m.add(tick(), CUT[5] + beat(b + 0.5), 0.3)
m.add(stamp() * 0.5, CUT[5] + 0.5, 0.6); m.add(click(), CUT[5] + 0.5, 0.6); m.add(stamp() * 0.4, CUT[5] + 0.8, 0.5); m.add(click(), CUT[5] + 0.8, 0.5)
m.add(creak(0.7), CUT[5] + beat(2), 0.9, -0.3); m.add(creak(0.6), CUT[5] + beat(2) + 0.08, 0.7, 0.3); m.add(thump() * 0.6, CUT[5] + beat(2) + 0.7, 0.6)
m.add(rustle(0.6), CUT[5] + beat(3), 0.6); m.add(chain(0.4), CUT[5] + beat(3) + 0.6, 0.7); m.add(card(), CUT[5] + beat(3) + 0.8, 0.6)
m.add(click(), CUT[5] + 2.5, 0.7, 0.5); m.add(card() * 0.6, CUT[5] + 2.5, 0.5, 0.5)
m.add(click(), T_HIT, 1.0); m.add(stamp(), T_HIT, 1.0); m.add(kick(), T_HIT, 0.9)
for i, b in enumerate([0, 0.5, 1]): m.add(horn(MOTIF[i] - 12, 1.4 if i == 2 else 0.25), T_HIT + beat(b), 0.45)
m.add(bell(), T_HIT + 0.02, 0.3, -0.2)

m.finish(str(Path(__file__).with_name('配乐_doh_m14.wav')), END, T_HIT + 1.3, tau=1.0)   # the motif's last note has to finish before the decay
