#!/usr/bin/env python3
"""Score for "Committee of the Whole" (Coxon #2, 37.5 s), series 2 — the COXON palette (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_cw_s2.py

The council in session, in C minor at 84 BPM: a rim tick for the chamber clock under
everything, City Hall's bell striking twice, a trombone call to order and a chorale for the
chamber. Each company's card turns over on a fife's pip; SUBPOENA lands with timpani and brass;
the dial's needle is a timpani pedal glide that swings past 50 into a low, dark chord; the four
blank answers are four timpani taps a step apart that leave a tritone hanging; FLIPPANT AT
BEST is a Neapolitan stab after a roll, then the gavel; and TO COURT on the last hit is the
chorale in C MINOR, the bell, and the call falling — stern, where A Handful of People ends in
major. Every effect is at its second in synth_cw.py (same expressions, in PB).
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *

s = Coxon(); B = s.B
s.sfx.bed(room(END, 1.0), 900)                                                       # the chamber's air
for b in range(4, int(END / B) + 1): s.note(rim(0.35), b * B, 0.26, 0.3 if b % 2 else -0.3, 0.35)   # the clock, from the end of the call

# ── shot 1 · City Hall: a call to order before the first caption, the windows lighting, the
# clock striking twice on the hall's own bell, the banner landing on a flam and a timpani tap
s.ruff(0.0, 0.45)
for i, n in enumerate([48, 55, 60]): s.note(trombone(n, 0.95 if i == 2 else 0.15, 0.7, a=0.02), i * 0.18, 0.45, -0.2 + 0.2 * i, 0.5)
s.note(trombone(36, 0.95, 0.5), 0.36, 0.45, 0, 0.5)
for k in range(12): s.fx(click(), 0.3 + k * 0.16, 0.22, -0.6 + k * 0.1)
s.fx(tower_bell(60, 4.0), 0.6, 0.42, -0.2, 0.5); s.fx(tower_bell(60, 4.0, 0.85), 1.3, 0.36, -0.2, 0.5)
s.fx(rustle(0.5), PB * 3 - 0.1, 0.6); s.fx(card(), PB * 3 + 0.4, 0.7)
s.ruff(PB * 3 + 0.4, 0.35, -0.1); s.note(timpani(43, 1.6, 0.45), PB * 3 + 0.4, 0.35, -0.1, 0.4)
s.note(timpani(36, 1.6, 0.3), s.snap(pop(0, 1)), 0.3, -0.1, 0.4)                     # "all 51 members"
s.chorale(s.at(0, 4), 'Cm', 4 * B, 0.28, 0.42); s.chorale(s.at(0, 8), 'G', B, 0.3, 0.42); s.march(0, 4, 8, 1, 0.8)
s.roll_into(CUT[1], B, 0.06, 0.4, 0.45)

# ── shot 2 · the letters: META turns on a pip; SUBPOENA lands with the corps and a brass
# sforzando; the others turn, each pip lower, the last one late; a bass trombone under
T = CUT[1]
s.note(bass_drum(0.5), T, 0.45, 0, 0.3)
s.fx(card(), T + PB + 0.15, 0.7, -0.4); s.note(fife(84, 0.1, 0.6), T + PB + 0.2, 0.3, -0.4, 0.45)
TS = T + PB * 3
s.fx(stamp(), TS, 1.0); s.ruff(TS, 0.4); s.hit(TS, 0.9, 43); s.chorale(TS, 'Cm', 0.9, 0.85, 0.5)
for (dt, p), n in zip([(PB * 3 + 0.5, 0.4), (PB * 3 + 0.8, -0.4), (PB * 3 + 1.6, 0.4)], [87, 84, 80]):
    s.fx(card(), T + dt + 0.15, 0.6, p); s.note(fife(n, 0.08, 0.55), T + dt + 0.2, 0.26, p, 0.45)
s.note(trombone(36, 0.9, 0.5), T + 4.2, 0.5, 0, 0.45)
s.chorale(s.at(1, 5), 'Fm', 3 * B, 0.3, 0.4); s.chorale(s.at(1, 8), 'G', B, 0.32, 0.4); s.march(1, 4, 8, 1, 0.8)
s.roll_into(CUT[2], B, 0.06, 0.4, 0.45)

# ── shot 3 · the witness: the room holds on a timpani roll; the needle swings on a pedal
# glide and passes 50 into a low C minor that sits there, dark
T = CUT[2]; TN = T + PB * 4
s.note(bass_drum(0.5), T, 0.4, 0, 0.3); s.fx(hum(60, 6.0) * 0.6, T, 0.35)
s.note(timp_roll(36, TN - (T + 0.75), 0.04, 0.55, seed=71), T + 0.75, 0.45, -0.15, 0.35)
s.note(timpani(36, 2.0, 0.7, to=43, slide=0.4), TN, 0.5, -0.15, 0.4)
s.ruff(TN + 0.4, 0.5); s.note(crash(2.0, 0.6), TN + 0.4, 0.35, 0.3, 0.3); s.note(bass_drum(1.0), TN + 0.4, 0.8, 0, 0.35); s.note(timpani(36, 2.4, 0.9), TN + 0.4, 0.5, -0.15, 0.4)
s.chorale(TN + 0.4, 'Cm_lo', 2.8, 0.6, 0.55)
s.roll_into(CUT[3], B * 0.8, 0.04, 0.25, 0.4)

# ── shot 4 · the odds: the question lowered on a trombone slide; four blank answers, four
# timpani taps a step apart, none resolving; a tritone left hanging over a buzz roll
T = CUT[3]
s.note(bass_drum(0.5), T, 0.4, 0, 0.3)
s.note(trombone(55, 0.6, 0.4, slide=-7), T + 0.5, 0.45, 0.1, 0.45)
for i in range(4):
    t = T + PB * 4 + i * 0.32; p = -0.6 + i * 0.4
    s.fx(card(), t, 0.6, p); s.note(timpani(38 + 2 * i, 1.3, 0.55), t + 0.02, 0.42, p * 0.5, 0.4); s.note(rim(0.5), t + 0.02, 0.3, p, 0.3)
TT = T + PB * 4 + 1.4
s.chorale(TT, (50, 56), 1.9, 0.3, 0.5); s.note(snare_roll(1.6, 0.06, 0.1, seed=72), TT, 0.4, 0.15, 0.3)
s.roll_into(CUT[4], B * 0.8, 0.04, 0.3, 0.4)

# ── shot 5 · the Speaker: a roll as the gavel rises; FLIPPANT AT BEST slams on a Neapolitan
# D-flat stab; the gavel, twice; the dominant waits
T = CUT[4]; TF = T + 3.5
s.note(bass_drum(0.5), T, 0.4, 0, 0.3); s.chorale(T, 'Fm', 3 * B, 0.25, 0.4); s.march(4, 0, 2.5, 1, 0.8)
s.note(snare_roll(TF - (T + 1.8), 0.08, 0.95, seed=73), T + 1.8, 0.55, 0.15, 0.25); s.note(timp_roll(36, TF - (T + 2.2), 0.05, 0.7, seed=74), T + 2.2, 0.45, -0.15, 0.3)
s.fx(stamp(), TF, 1.0); s.hit(TF, 1.0, 37); s.chorale(TF, 'Db', 0.6, 1.0, 0.55)
s.fx(rustle(0.3), T + 3.9, 0.4)
s.fx(gavel(), T + 4.3, 1.0); s.note(bass_drum(0.9), T + 4.3, 0.7, 0, 0.3); s.fx(gavel() * 0.4, T + 4.42, 0.4)
s.chorale(s.at(4, 7), 'G', 2 * B - 0.05, 0.35, 0.42)

# ── shot 6 · the empty chair: the subpoena drifts down onto the seat over a low pedal; a roll
# grows to the last hit — TO COURT: the corps, the bell, the chorale in C MINOR, the call falling
T = CUT[5]
s.note(bass_drum(0.4), T, 0.35, 0, 0.3); s.note(trombone(36, 2.8, 0.2, a=0.4), T, 0.45, 0, 0.5); s.march(5, 1, 2, 1, 0.7)
s.fx(rustle(1.1), T + 0.3, 0.5); s.fx(card(), T + 1.4, 0.6)
s.note(snare_roll(T_HIT - (T + 1.45) - 0.02, 0.06, 1.0, seed=75), T + 1.45, 0.55, 0.15, 0.25); s.note(timp_roll(36, 1.3, 0.05, 0.75, seed=76), T_HIT - 1.3, 0.45, -0.15, 0.3)
s.fx(stamp(), T_HIT, 1.0); s.fx(gavel() * 0.6, T_HIT, 0.6); s.hit(T_HIT, 1.2, 36)
s.fx(tower_bell(48, 5.0), T_HIT + 0.02, 0.45, -0.2, 0.5)
s.chorale(T_HIT, 'Cm', 2.6, 0.95, 0.5)
for i, n in enumerate([60, 55, 48]): s.note(trombone(n, 1.4 if i == 2 else 0.3, 0.9), T_HIT + 0.05 + i * B / 2, 0.42, 0.2, 0.5)

s.render(str(Path(__file__).with_name('配乐_cw_s2_m14.wav')), T_HIT + 1.3, tau=1.0)
