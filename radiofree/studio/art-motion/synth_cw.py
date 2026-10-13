#!/usr/bin/env python3
"""Score for "Committee of the Whole" (Coxon #2, 37.5 s). Synthesised — rfsound.py.

    uv run --with numpy --with soundfile python 音频/synth_cw.py

Civic and slow: a clock's tick under everything, an organ for the chamber, a brass call in C
for the council. The cues sit on their frames in scenes/cw_*.js: City Hall's windows and its
clock, the envelopes turning and the SUBPOENA stamp, the dial's needle swinging past 50, four
blank answers that never resolve, FLIPPANT AT BEST and the gavel, the empty chair — and the
last stamp, TO COURT, which rings out.
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
CALL = [60, 67, 72]

for b in range(int(END / BEAT)): m.add(tick() * 0.5, beat(b), 0.18, 0.3 if b % 2 else -0.3)          # the clock
m.bed(noise(END, 80, 900) * 0.02)                                                                      # the room

# shot 1 · City Hall: the windows light, the clock strikes, the banner unrolls on the beat
for k in range(12): m.add(click(), 0.3 + k * 0.16, 0.25, -0.6 + k * 0.1)
for i in range(2): m.add(bell(), 0.6 + i * 0.7, 0.3)
m.add(rustle(0.5), beat(3) - 0.1, 0.6); m.add(card(), beat(3) + 0.4, 0.7)
for i, b in enumerate([3, 3.5, 4]): m.add(brass(CALL[i], 0.6 if i == 2 else 0.2), beat(b), 0.35)
for b in range(5, SHOT): m.add(organ(48, 0.4), beat(b), 0.25)

# shot 2 · the letters: META turns over; SUBPOENA; the rest turn over, ANTHROPIC last; SPACEXAI dims
T = CUT[1]
m.add(kick() * 0.5, T, 0.6)
m.add(card(), T + beat(1) + 0.15, 0.7, -0.4); m.add(blip(1046), T + beat(1) + 0.2, 0.3, -0.4)
m.add(stamp(), T + beat(3), 1.0); m.add(kick() * 0.8, T + beat(3), 0.8); m.add(brass(60, 0.6), T + beat(3), 0.5)
for t, p in [(beat(3) + 0.5, 0.4), (beat(3) + 0.8, -0.4), (beat(3) + 1.6, 0.4)]: m.add(card(), T + t + 0.15, 0.6, p); m.add(blip(1046), T + t + 0.2, 0.25, p)
m.add(tuba(36, 0.8) * 0.6, T + 4.2, 0.6)
for b in range(6, SHOT): m.add(organ(45, 0.4), T + beat(b), 0.22)

# shot 3 · the witness: the room holds; the needle swings past 50 on the beat — organ, minor, low
T = CUT[2]
m.add(kick() * 0.5, T, 0.6); m.add(hum(60, 6.0) * 0.6, T, 0.4)
m.add(glide(150, 520, 0.5), T + beat(4), 0.4); m.add(kick(), T + beat(4) + 0.4, 0.8)
for n in (45, 48, 52): m.add(organ(n, 1.8), T + beat(4) + 0.4, 0.45)

# shot 4 · the odds: the question lowered; four blank answers, each a step up, none resolving
T = CUT[3]
m.add(kick() * 0.5, T, 0.6); m.add(glide(500, 250, 0.5), T + 0.5, 0.3)
for i, n in enumerate([62, 64, 66, 68]): m.add(card(), T + beat(4) + i * 0.32, 0.6, -0.6 + i * 0.4); m.add(pizz(n), T + beat(4) + i * 0.32 + 0.02, 0.6, -0.6 + i * 0.4)
m.add(organ(50, 1.6) + 0, T + beat(4) + 1.4, 0.3); m.add(organ(56, 1.6), T + beat(4) + 1.4, 0.25)   # a tritone, left hanging

# shot 5 · the Speaker: FLIPPANT AT BEST slams; the gavel comes down
T = CUT[4]
m.add(kick() * 0.5, T, 0.6)
m.add(stamp(), T + 3.5, 1.0); m.add(brass(67, 0.5), T + 3.5, 0.5); m.add(rustle(0.3), T + 3.9, 0.4)
m.add(gavel(), T + 4.3, 1.0); m.add(kick(), T + 4.3, 0.9); m.add(gavel() * 0.4, T + 4.42, 0.4)

# shot 6 · the empty chair: the subpoena drifts down; TO COURT on the last hit, the call falling, ringing out
T = CUT[5]; T_HIT = T + 3.0
m.add(rustle(1.1), T + 0.3, 0.5); m.add(card(), T + 1.4, 0.6)
for b in range(6): m.add(tuba(36) * 0.35, T + beat(b))
m.add(stamp(), T_HIT, 1.0); m.add(kick(), T_HIT, 0.9); m.add(gavel() * 0.6, T_HIT, 0.6)
for i, b in enumerate([0, 0.5, 1]): m.add(horn(CALL[::-1][i] - 12, 1.4 if i == 2 else 0.25), T_HIT + beat(b), 0.45)
m.add(bell(), T_HIT + 0.02, 0.3, -0.2)

m.finish(str(Path(__file__).with_name('配乐_cw_m14.wav')), END, T_HIT + 1.3, tau=1.0)
