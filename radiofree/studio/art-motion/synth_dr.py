#!/usr/bin/env python3
"""Score for "Unexpectedly, a Deer" (Toko thinker #1, 37.5 s). Synthesised — rfsound.py.

    uv run --with numpy --with soundfile python 音频/synth_dr.py

A domestic bed — rain on the glass, a slow celesta figure in F over a soft pizz pulse on the
112 grid — and one joke instrument: a hunting horn, which answers every time the camera
decides the dog is a deer. Effects on their frames in scenes/dr_*.js: the tram and its bell,
the camera waking, claws on the floorboards, the brief's chime, two head tilts, the shadow,
the tally, and the last DEER, which rings out.
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
def tram_bell(): return over(tone(1568, 0.03, (1, 0.5, 0.2), 0.001, 0.8, decay=4) * 0.5, np.zeros(10))
def claws(t0, t1, every=0.17, g=0.35):
    t = t0
    while t < t1: m.add(tick() * 0.6, t, g, 0.1); t += every
def hunt(t, g=0.4, up=True):                    # the hunting horn: a fifth, then the octave
    for i, n in enumerate([65, 72, 77] if up else [65, 72]): m.add(horn(n, 0.22 if i < 2 else 0.6), t + i * BEAT / 2, g)
def chime(t): m.add(tone(1319, 0.05, (1, 0.3), 0.002, 0.7, decay=4) * 0.5, t, 0.5); m.add(tone(1760, 0.05, (1, 0.3), 0.002, 0.9, decay=3) * 0.5, t + 0.14, 0.5)

rain = noise(END, 900, 7000) * 0.035; m.bed(rain, 700)
F = [53, 57, 60, 65, 60, 57]
for b in range(0, int(END / BEAT), 2): m.add(pizz(41 if (b // 8) % 2 == 0 else 46), beat(b), 0.45)
for b in range(int(END / BEAT)):
    if b % 4 in (0, 1, 2) and not (CUT[3] <= beat(b) < CUT[4]): m.add(celesta(F[b % 6] + 12, 0.35), beat(b) + BEAT / 2, 0.16, 0.2 * ((b % 3) - 1))

# shot 1 · the flat: the tram passes with its bell, the camera's light wakes
m.add(noise(3.8, 40, 300) * np.sin(np.pi * tv(3.8) / 3.8) * 0.25, 0.3, 0.8)
m.add(tram_bell(), 1.4, 0.35, 0.3); m.add(tram_bell(), 1.62, 0.3, 0.3)
m.add(blip(1760), beat(2), 0.35, 0.5); m.add(blip(2349), beat(2) + 0.08, 0.3, 0.5)

# shot 2 · the note: claws across the floor, the lens whirs after it, DEER — and the horn
claws(CUT[1] + 0.5, CUT[1] + 3.2); m.add(glide(800, 1400, 0.5) * 0.4, CUT[1] + 1.0, 0.3, 0.5)
m.add(card(), CUT[1] + beat(4), 0.8); m.add(click(), CUT[1] + beat(4), 0.6); hunt(CUT[1] + beat(4) + 0.05)

# shot 3 · the brief: its chime
chime(CUT[2] + 0.6); m.add(rustle(0.3), CUT[2] + 0.55, 0.3)

# shot 4 · the look: the bed drops out; two tilts, one huff
m.add(glide(500, 760, 0.5) * 0.4, CUT[3] + beat(3), 0.35, 0.3); m.add(noise(0.18, 200, 1200) * np.exp(-tv(0.18) * 18) * 0.5, CUT[3] + beat(3) + 0.5, 0.5, 0.3)
m.add(glide(560, 840, 0.5) * 0.4, CUT[3] + beat(6), 0.35, 0.3)

# shot 5 · clip after clip: claws, the shadow wears antlers (the horn, grandly), the tally ticks
claws(CUT[4] + 0.3, CUT[4] + 2.2)
hunt(CUT[4] + 2.2, 0.5); m.add(organ(53, 1.4), CUT[4] + 2.2, 0.5); m.add(organ(60, 1.4), CUT[4] + 2.2, 0.4)
for t in (2.1, 2.7, 3.2): m.add(blip(1568), CUT[4] + t, 0.4, -0.4); m.add(card() * 0.5, CUT[4] + t, 0.5, -0.4)

# shot 6 · early access: rain, the camera wakes, the last hit — brackets, DEER, the horn rings out
T_HIT = CUT[5] + 3.0
m.add(blip(1760), T_HIT - 0.6, 0.35, 0.5); m.add(blip(2349), T_HIT - 0.52, 0.3, 0.5)
m.add(click(), T_HIT - 0.15, 0.8, 0.4); m.add(stamp(), T_HIT, 0.9); m.add(card(), T_HIT, 0.7); m.add(kick() * 0.6, T_HIT, 0.7)
hunt(T_HIT + 0.02, 0.55); m.add(bell(), T_HIT + 0.05, 0.3, 0.3)

m.finish(str(Path(__file__).with_name('配乐_dr_m14.wav')), END, T_HIT + 1.3, tau=0.6)
