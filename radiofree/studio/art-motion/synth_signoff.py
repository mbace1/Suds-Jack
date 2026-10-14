#!/usr/bin/env python3
"""The station sign-off's jingle (3.0 s): a radio tuning sweep, the ON AIR lamp clicking on at 0.4 s,
and a three-note call that rings out. rfsound.py, normalised with the films (−14 LUFS)."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfsound import *
m = Mix(3.2)
sweep = noise(0.45, 400, 4000) * np.sin(np.pi * tv(0.45) / 0.45) * 0.4; m.add(sweep, 0.0, 0.7, -0.3); m.add(glide(300, 1400, 0.45), 0.0, 0.25, 0.3)
m.add(click(), 0.4, 1.0); m.add(stamp() * 0.4, 0.4, 0.5); m.add(hum(50, 2.4) * 0.6, 0.42, 0.25)
for i, n in enumerate([67, 72, 79]): m.add(celesta(n, 0.6 if i == 2 else 0.3), 0.5 + i * 0.27, 0.5)
for i, n in enumerate([55, 60, 64]): m.add(horn(n, 1.4), 1.05, 0.22)
m.add(bell(), 1.05, 0.3)
m.finish(str(Path(__file__).with_name('signoff_m14.wav')), 3.0, 1.6, tau=0.6)
