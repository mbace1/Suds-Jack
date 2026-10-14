#!/usr/bin/env python3
"""Score for "A Handful of People" (Coxon #1, 37.5 s). Synthesised — rfsound.py.

    uv run --with numpy --with soundfile python 音频/synth_hp.py

Quiet at the top — one lamp, a post typing itself — and growing: the late-night desk, then a
crowd that swells as the hands rise, the Capitol's windows clicking off, an hourglass turned with
a bassoon going nowhere fast, and the ballots dropping in on the beat until the lid snaps on the
last hit and a brass call rises, ringing out.
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
CALL = [55, 60, 64, 67]
m.bed(noise(END, 70, 900) * 0.022)                                                       # room tone under everything: never digital silence
for k in range(4): m.add(crowd(2.4) * 0.35, CUT[2] + 2.8 + k * 2.2, 0.25, (k % 2 - 0.5) * 0.4)   # the public murmurs on under shots 3–5
for b in range(0, int(END / BEAT), 2): m.add(pizz(43 if (b // 8) % 2 == 0 else 48), beat(b), 0.35)

# shot 1 · the post: the lamp's hum, the keys
m.add(hum(60, 6.0) * 0.5, 0, 0.3)
t = 0.5
while t < 3.1: m.add(tick() * 0.7, t, 0.28, 0.2 * np.sin(t * 7)); t += 0.065
for i, b in enumerate([4, 4.5, 5]): m.add(celesta([67, 64, 60][i], 0.4), beat(b), 0.3)

# shot 2 · the desk: a studio's brass sting, the globe rising
T = CUT[1]
m.add(kick() * 0.6, T, 0.7)
for i, n in enumerate([60, 64, 67]): m.add(brass(n, 0.25), T + 0.05 + i * 0.12, 0.3)
m.add(glide(260, 520, 1.0), T + 0.4, 0.3); m.add(crowd(2.5) * 0.4, T + 0.2, 0.3)
for b in range(4, SHOT, 2): m.add(organ(48, 0.6), T + beat(b), 0.18)

# shot 3 · the many: rustling arms, a crowd swelling, 62% stamped
T = CUT[2]
for i in range(22): m.add(rustle(0.4), T + 0.2 + i * 0.08, 0.25, (i % 5 - 2) * 0.3)
m.add(crowd(3.0), T + 0.4, 0.7); m.add(crowd(2.0), T + 1.6, 0.6)
m.add(stamp(), T + 2.0, 1.0); m.add(kick() * 0.8, T + 2.0, 0.8); m.add(brass(67, 0.6), T + 2.0, 0.5)

# shot 4 · Congress: the windows clicking off, a low tuba, 54% stamped
T = CUT[3]
for k in range(30): m.add(click(), T + 0.8 + k / 7, 0.35 - k * 0.008, (k % 7 - 3) * 0.2)
m.add(stamp(), T + 1.6, 1.0); m.add(kick() * 0.7, T + 1.6, 0.7)
for b in range(4, SHOT, 2): m.add(tuba(36, 0.5) * 0.5, T + beat(b), 0.5)

# shot 5 · no rush: the hourglass turned, the sand's hiss, a slow clock, a bassoon going nowhere
T = CUT[4]
m.add(creak(0.5), T + beat(2), 0.7); m.add(tone(2637, 0.03, (1,), 0.001, 0.6, decay=5) * 0.4, T + beat(2) + 0.6, 0.5)
m.add(noise(5.0, 3000, 9000) * 0.03, T + beat(2) + 0.6, 0.6)
for b in range(0, SHOT, 2): m.add(tick(), T + beat(b), 0.5)
for i, n in enumerate([50, 49, 48, 47]): m.add(bassoon(n, 0.6), T + beat(4 + i * 1.5), 0.45)

# shot 6 · November 3: ballots dropping in on the half-beats; the lid snaps on the last hit; the call rises
T = CUT[5]; T_HIT = T + 3.0
for i in range(8): m.add(card() * 0.7, T + 0.4 + i * BEAT / 2 + 0.45, 0.6, (-1) ** i * 0.3); m.add(thump() * 0.25, T + 0.4 + i * BEAT / 2 + 0.5, 0.4)
m.add(stamp(), T_HIT, 1.0); m.add(kick(), T_HIT, 0.9); m.add(gavel() * 0.5, T_HIT, 0.5)
for i, n in enumerate(CALL): m.add(brass(n, 1.4 if i == 3 else 0.22), T_HIT + i * BEAT / 2, 0.45)
m.add(bell(), T_HIT + 0.02, 0.3, 0.2)

m.finish(str(Path(__file__).with_name('配乐_hp_m14.wav')), END, T_HIT + 1.5, tau=0.9)
