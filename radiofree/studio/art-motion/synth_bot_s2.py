#!/usr/bin/env python3
"""Score for "Happy Little Bot" (Toko thinker #2, claymation, 37.5 s), series 2 — the TOKO
palette (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_bot_s2.py

A small kitchen waltz in F at 168 BPM (six bars a shot): felt piano on two and three, a plucked
upright on one, brushes, a music box with the tune, and under it the room — rain on the
window, room tone, a record's surface. The toy is the only thin, electronic thing in the room:
its LED, its dings and its babble come out of a tiny speaker. When the child is sad the waltz
drops to D minor and the box stops; when the toy flares up the band comes back as if nothing
happened; while it keeps talking the band thins and the bass walks down; when the present is
refused the music box runs down, slower and flatter, into silence; the grown-up sits on a
warm felt chord, the lamp clicks, and the waltz ends in F with the box wound once more.
Every effect is at its second in synth_bot.py (same expressions, in PB).
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *

s = Toko(); B = s.B
s.beds(rain_=1.0, room_=1.0, vinyl_=0.8)
speaker = lambda x: soft(x, 700, 6000)                                                # the toy's small speaker

# ── shot 1 · the rainy afternoon: the waltz, softly; the LED wakes; a little bounce
s.waltz(0, 0, ['F', 'F', 'Bb', 'F', 'Gm7', 'C7'], 2, 0.8)
s.tune(0, 0, [(0, 0, 81), (1, 0, 84), (2, 0, 86), (2, 2, 82), (3, 0, 81), (4, 0, 82), (4, 1, 81), (4, 2, 79), (5, 0, 79), (5, 2, 76)])
s.fx(toy_blip(1760), 0.9, 0.6, 0.3, 0.1); s.fx(toy_ding(91), 1.4, 0.35, 0.3, 0.1); s.fx(pat(0.5), 1.4, 0.4, 0.3)

# ── shot 2 · the slump: one breath out, and the waltz drops to D minor; the box stops
# (on the second bar, where the old score's box fell silent) and the band stops: held chords only
T = CUT[1]
s.waltz(1, 0, ['Dm'], 1, 0.7)
s.hold(s.bar(1, 1), (57, 62, 65), 2 * 3 * B, 0.3, 0.26, 38); s.hold(s.bar(1, 3), (58, 62, 65), 2 * 3 * B, 0.3, 0.24, 34)
s.hold(s.bar(1, 5), (55, 61, 64), 3 * B, 0.32, 0.24, 33)
s.box(s.bar(1, 0), 81, 0.36)
s.fx(noise(0.9, 200, 1600) * np.sin(np.pi * tv(0.9) / 0.9) * 0.4, T + 0.8, 0.45)
s.note(felt_piano(38, 1.6, 0.42), T + 1.2, 0.45, -0.2, 0.3)
s.note(felt_piano(74, 0.9, 0.28), s.snap(pop(1, 1)), 0.22, 0.2, 0.4)                   # "I'm sad."

# ── shot 3 · the flare: the LED flares, a ding, a blip, a kalimba bounce up the chord; the
# toy speaks twice; the band comes back in F as if nothing happened, the box with it
T = CUT[2]
s.fx(speaker(glide(600, 1600, 0.25)), T + 0.4, 0.4, 0.3, 0.1); s.fx(toy_ding(91), T + 0.5, 0.45, 0.3, 0.1); s.fx(toy_blip(2093), T + 0.55, 0.4, 0.3, 0.1)
for i, n in enumerate([77, 81, 84, 89]): s.note(kalimba(n, 0.9), T + 0.5 + i * PB / 2, 0.42, 0.3, 0.3)
s.chatter(T + 0.9, 5, 680); s.chatter(T + 3.1, 8, 720)
s.waltz(2, 0, ['F'], 1, 0.6); s.waltz(2, 1, ['C', 'F', 'C', 'Dm', 'C7'], 2, 0.8)
s.tune(2, 0, [(4, 0, 84), (5, 0, 79), (5, 2, 76)])

# ── shot 4 · it keeps going: a ding on every bounce (the toy's own beat, not the waltz's), the
# babble twice; the band thins to bass and one chord a bar, the bass walking down
T = CUT[3]
for b in range(12): s.fx(toy_ding(91), T + PB * b + 0.1, 0.18, 0.3)
s.chatter(T + 0.9, 7, 700); s.chatter(T + 3.1, 9, 740)
s.waltz(3, 0, ['F', 'C', 'Dm', 'Am', 'Bb', 'C'], 1, 0.6, bass=[41, 40, 38, 36, 34, 36])

# ── shot 5 · the present: a kalimba offering before the caption; hands; the toy turns away
# talking; the band stops and the music box runs down, slower and flatter, into the rain
T = CUT[4]
for i, n in enumerate([74, 77, 82]): s.note(kalimba(n, 0.6), s.bar(4, 0, i), 0.36, -0.1, 0.35)
s.waltz(4, 0, ['Bb', 'F'], 1, 0.55)
s.fx(rustle(0.4), T + 0.8, 0.35)
s.chatter(T + 1.6, 6, 700, 0.26)
s.run_down([T + 2.4 + i * 0.3 * (1 + i * 0.25) for i in range(5)], [84, 81, 77, 72, 65])

# ── shot 6 · the grown-up sits: a warm felt chord holds them; the lamp clicks warmer on the
# last hit and the waltz ends in F, the box wound once more; the toy chirps at nobody
T = CUT[5]
s.fx(sit(0.9), T + 0.9, 0.8, -0.1)
s.hold(s.bar(5, 1), (53, 57, 60, 64), 2.0, 0.42, 0.34, 41)
s.note(kalimba(81, 0.5), pop(5, 1) + 0.06, 0.2, 0.2, 0.4)                             # "with children"
s.fx(lamp_click(), T_HIT, 0.85, 0.2); s.fx(knock(0.35, 180), T_HIT + 0.01, 0.3, 0.2)
s.hold(s.bar(5, 3), (48, 53, 57, 60, 67), 2.2, 0.48, 0.36, 29); s.box(s.bar(5, 3), 89, 0.38)
s.chatter(T_HIT + 0.5, 3, 720, 0.2); s.fx(toy_ding(91), T_HIT + 0.9, 0.18, 0.3)

s.render(str(Path(__file__).with_name('配乐_bot_s2_m14.wav')), T_HIT + 1.4, tau=0.9)
