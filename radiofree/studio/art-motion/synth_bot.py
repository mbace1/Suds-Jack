#!/usr/bin/env python3
"""Score for "Happy Little Bot" (Toko thinker #2, claymation, 37.5 s). Synthesised — rfsound.py.

    uv run --with numpy --with soundfile python 音频/synth_bot.py

Rain on a November window and a slow music-box figure; the child gets one breath, the toy gets
everything else — a bright chirping babble (a voice's shape, no words) on the frames it speaks,
a ding on every bounce. When the present is refused the music box runs down; when the grown-up
sits, an organ chord holds them; on the last hit the lamp clicks warmer and the toy chirps once
more, at nobody, ringing out.
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
def chirp(t, n=6, f0=620, g=0.35):
    for i in range(n): m.add(voice(f0 * (1 + 0.25 * np.sin(i * 1.7)), ['i', 'a', 'e', 'o'][i % 4], 0.11), t + i * 0.13, g, 0.3)
def ding(t, g=0.3): m.add(tone(1568, 0.03, (1, 0.4), 0.001, 0.5, decay=6) * 0.5, t, g, 0.3)

m.bed(noise(END, 900, 7000) * 0.04, 700)                                                   # rain on the glass
BOX = [72, 76, 79, 84, 79, 76]
for b in range(int(END / BEAT)):
    if CUT[1] + beat(2) < beat(b) < CUT[2]: continue                                         # the box falls silent when the child says it
    if CUT[4] + beat(5) < beat(b) < CUT[5]: continue                                         # and runs down when the present is refused
    if b % 2 == 0: m.add(celesta(BOX[b % 6], 0.35), beat(b), 0.14, 0.2 * ((b % 3) - 1))

# shot 1 · the LED wakes, a little bounce
m.add(blip(1760), 0.9, 0.3, 0.3); ding(1.4)
# shot 2 · the slump: one breath out
T = CUT[1]
m.add(noise(0.9, 200, 1600) * np.sin(np.pi * tv(0.9) / 0.9) * 0.4, T + 0.8, 0.5)
m.add(bassoon(43, 1.2), T + 1.2, 0.3)
# shot 3 · the flare and the bounce: "Don't worry! I'm a happy little bot."
T = CUT[2]
m.add(glide(600, 1600, 0.25), T + 0.4, 0.4, 0.3); ding(T + 0.5, 0.45); m.add(blip(2093), T + 0.55, 0.4, 0.3)
chirp(T + 0.9, 5, 680); chirp(T + 3.1, 8, 720)
for i, n in enumerate([72, 76, 79, 84]): m.add(pizz(n), T + 0.5 + i * BEAT / 2, 0.5, 0.3)
# shot 4 · it keeps going: "Let's keep the fun going. What shall we talk about next?"
T = CUT[3]
chirp(T + 0.9, 7, 700); chirp(T + 3.1, 9, 740)
for b in range(0, SHOT, 1): ding(T + beat(b) + 0.1, 0.18)
# shot 5 · the present held out; the toy turns away, still talking; the box runs down
T = CUT[4]
m.add(rustle(0.4), T + 0.8, 0.4); chirp(T + 1.6, 6, 700, 0.28)
for i, n in enumerate([84, 79, 76, 72, 67]): m.add(celesta(n, 0.6), T + 2.4 + i * 0.3 * (1 + i * 0.25), 0.25)
# shot 6 · the grown-up sits; an organ chord; the lamp warms on the last hit; the toy chirps at nobody
T = CUT[5]; T_HIT = T + 3.0
m.add(thump() * 0.5, T + 0.9, 0.6)
for n in (48, 55, 60, 64): m.add(organ(n, 3.6), T + 1.0, 0.35)
m.add(click(), T_HIT, 0.8); m.add(kick() * 0.5, T_HIT, 0.6); m.add(bell(), T_HIT + 0.02, 0.3)
chirp(T_HIT + 0.5, 3, 720, 0.22); ding(T_HIT + 0.9, 0.2)

m.finish(str(Path(__file__).with_name('配乐_bot_m14.wav')), END, T_HIT + 1.4, tau=0.9)
