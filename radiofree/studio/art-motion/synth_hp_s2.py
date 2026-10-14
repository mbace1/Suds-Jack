#!/usr/bin/env python3
"""Score for "A Handful of People" (Coxon #1, 37.5 s), series 2 — the COXON palette (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_hp_s2.py

Civic, in C minor at 84 BPM (nine beats a shot: two bars and a pickup the snare rolls through
into every cut). The film is about who should decide, so the score is a drum corps that GROWS:
one lamp, a post typing itself, a rim tick and a lone fife; a late-night studio's sting played
by trombones and the globe lifted on a timpani pedal glide; the hands rising on a roll that
lands on 62%; the chorale thinning voice by voice as the Capitol's windows go dark; a bass
trombone going nowhere while the sand runs; then the ballots drop in under a roll that grows to
the last hit, where the chorale turns to C MAJOR and the fife calls upward, ringing out.
Every effect is at its second in synth_hp.py (same expressions, in PB).
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *

s = Coxon(); B = s.B
s.sfx.bed(room(END, 1.3), 900)                                                       # the hall's air: never digital silence
for k in range(4): s.fx(crowd(2.4) * 0.35, CUT[2] + 2.8 + k * 2.2, 0.22, (k % 2 - 0.5) * 0.4, 0.3)   # the public, under shots 3–5

# ── shot 1 · the post: the lamp's hum, the keys, a rim tick like a clock, the institution's
# pedal barely there; after the caption is read, a lone fife states the theme
s.fx(hum(60, 6.0) * 0.5, 0, 0.3)
t = 0.5
while t < 3.1: s.fx(tick() * 0.7, t, 0.26, 0.2 * np.sin(t * 7)); t += 0.065
s.note(trombone(36, 5.2, 0.15, a=1.2), 0.0, 0.4, 0, 0.5)
s.march(0, 2, 8, 1, 0.55)
s.note(timpani(36, 1.6, 0.3), s.snap(pop(0, 1)), 0.32, -0.1, 0.4)                    # "why"
s.fife_line(s.at(0, 6.5), [(0, 79, 0.5), (0.5, 80, 0.5), (1.0, 79, 0.5), (1.5, 77, 0.25), (1.75, 75, 0.25), (2.0, 74, 0.5), (2.5, 72, 1.2)], 0.5)
s.roll_into(CUT[1], B * 0.9, 0.06, 0.35, 0.45)

# ── shot 2 · the desk: the studio's sting on trombones, the globe lifted on a timpani pedal
# glide, the studio audience; the chorale comes in under it, pianissimo
T = CUT[1]
s.note(bass_drum(0.6), T, 0.5, 0, 0.3); s.ruff(T + 0.05, 0.4)
for i, n in enumerate([48, 51, 55]): s.note(trombone(n, 0.6 if i == 2 else 0.14, 0.75, a=0.02), T + 0.05 + i * 0.12, 0.42, -0.3 + 0.3 * i, 0.45)
s.note(timpani(36, 2.4, 0.6, to=43, slide=1.0), T + 0.4, 0.45, -0.15, 0.4)
s.fx(crowd(2.5) * 0.4, T + 0.2, 0.22, 0, 0.3)
s.chorale(s.at(1, 1.5), 'Cm', 2.5 * B, 0.28, 0.42); s.chorale(s.at(1, 4), 'Ab', 4 * B, 0.3, 0.42); s.chorale(s.at(1, 8), 'G', B, 0.32, 0.42)
s.march(1, 2, 8, 1, 1.0)
s.note(timpani(43, 1.4, 0.3), s.snap(pop(1, 1)), 0.3, -0.1, 0.4)                     # "a handful of people"
s.roll_into(CUT[2], B, 0.08, 0.5, 0.5)

# ── shot 3 · the many: arms rustling up, the crowd swelling — the roll swells with them and
# lands on 62% with the whole corps; then the march proper
T = CUT[2]; T62 = T + 2.0
for i in range(22): s.fx(rustle(0.4), T + 0.2 + i * 0.08, 0.22, (i % 5 - 2) * 0.3)
s.fx(crowd(3.0), T + 0.4, 0.6, 0, 0.3); s.fx(crowd(2.0), T + 1.6, 0.5, 0, 0.3)
s.roll_into(T62, T62 - T - 0.2, 0.12, 1.0, 0.55, timp=36)
s.fx(stamp(), T62, 0.9); s.hit(T62, 1.0, 36); s.chorale(T62, 'Cm', 3.0 * B, 0.85, 0.5)
s.chorale(s.at(2, 4), 'Fm', 4 * B, 0.5, 0.45); s.chorale(s.at(2, 8), 'G', B, 0.55, 0.45)
s.march(2, 4, 8, 2)
s.roll_into(CUT[3], B, 0.1, 0.6, 0.5)

# ── shot 4 · Congress: the windows click off one by one and the chorale thins with them, top
# voice first, until the bass is alone; 54% lands without a crash; the march drops to a rim
T = CUT[3]
s.note(bass_drum(0.7), T, 0.55, 0, 0.3)
for i, (n, d) in enumerate(zip(Coxon.CH['Ab'], [6.0, 4.6, 3.6, 2.6, 1.7])): s.note(trombone(n, d, 0.45), T, 0.45 * (1.15 if i == 0 else 1), -0.45 + 0.225 * i, 0.5)
for k in range(30): s.fx(click(), T + 0.8 + k / 7, 0.33 - k * 0.008, (k % 7 - 3) * 0.2)
s.fx(stamp(), T + 1.6, 0.9); s.hit(T + 1.6, 0.6, 44, crash_=False)
s.march(3, 2, 8, 1, 1.0)
t = s.snap(pop(3, 1)); s.note(fife(86, 0.05), t - 0.06, 0.3, 0.3, 0.4); s.note(fife(84, 0.16), t, 0.36, 0.3, 0.4)   # "seriously enough": a wry pip
s.roll_into(CUT[4], B * 0.9, 0.06, 0.3, 0.4)

# ── shot 5 · the Speaker: the hourglass turned, the sand's hiss, a slow rim clock every two
# beats, and a bass trombone stepping C–B–C–B: going nowhere
T = CUT[4]
s.note(bass_drum(0.5), T, 0.45, 0, 0.3); s.chorale(T, (48, 51), 2.5 * B, 0.22, 0.4)
s.fx(creak(0.5), T + PB * 2, 0.7); s.fx(knock(0.6, 260), T + PB * 2, 0.5, 0.1); s.fx(tone(2637, 0.03, (1,), 0.001, 0.6, decay=5) * 0.4, T + PB * 2 + 0.6, 0.5)
s.fx(noise(5.0, 3000, 9000) * 0.03 * np.minimum(1, tv(5.0) / 0.3), T + PB * 2 + 0.6, 0.6)
for b in range(0, 9, 2): s.note(rim(0.5), s.at(4, b), 0.5, 0.25, 0.35); s.note(bass_drum(0.3), s.at(4, b), 0.3, 0, 0.25)
for i, n in enumerate([36, 35, 36, 35]): s.note(trombone(n, 1.3 * B, 0.35), s.at(4, 1 + 2 * i), 0.5, -0.1, 0.45)
s.note(timpani(43, 1.4, 0.3), s.snap(pop(4, 1)), 0.28, -0.1, 0.4)                    # "take the lead"
s.roll_into(CUT[5], B, 0.08, 0.45, 0.45)

# ── shot 6 · November 3: ballots dropping in on the picture's half-beats while snare and
# timpani roll up to the last hit; the lid snaps — the chorale in C MAJOR, the fife's call
# rising G–C–E–G, ringing out
T = CUT[5]
for i in range(8): s.fx(card() * 0.7, T + 0.4 + i * PB / 2 + 0.45, 0.55, (-1) ** i * 0.3); s.fx(thump() * 0.25, T + 0.4 + i * PB / 2 + 0.5, 0.35)
s.note(bass_drum(0.7), T, 0.5, 0, 0.3)
s.note(snare_roll(T_HIT - T - 0.02, 0.12, 1.0, seed=61), T, 0.55, 0.15, 0.25); s.note(timp_roll(36, 2.0, 0.08, 0.8, seed=62), T_HIT - 2.0, 0.5, -0.15, 0.3)
s.chorale(T, 'Cm', 1.4, 0.45, 0.45); s.chorale(s.at(5, 2), 'Ab', 1.05, 0.55, 0.45); s.chorale(s.at(5, 3.5), 'G', T_HIT - s.at(5, 3.5) - 0.02, 0.7, 0.45)
s.fx(stamp(), T_HIT, 0.9); s.fx(gavel() * 0.5, T_HIT, 0.45); s.hit(T_HIT, 1.2, 36)
s.chorale(T_HIT, 'C', 2.4, 0.9, 0.5)
for i, n in enumerate([79, 84, 88, 91]): s.note(fife(n, 1.5 if i == 3 else 0.3, 0.9), T_HIT + 0.05 + i * B / 2, 0.58, 0.25, 0.5)

s.render(str(Path(__file__).with_name('配乐_hp_s2_m14.wav')), T_HIT + 1.5, tau=0.9)
