"""Release Notes (RFH, Helsinki 5 · ICEYE), 2D v1 — the cue sheet. Its own kit: CHANGELOG (pipeline/sound/changelog.py).
A cold launch-sizzle pulse; blips for each entry; the radar picture's sweep that locks; the rocket; the ticker; spinners at the end.
    uv run --with numpy --with soundfile python clay/release/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / "pipeline" / "sound")]
from mix import Session
from stems import sting
EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
T = {k: v for k, v in EV.items() if isinstance(v, (int, float))}
END = T["end"]
from rfsound import room
from changelog import Changelog as K, entry, sweep_lock, ignition, ticker, spinner, pulse_bar
s = Session(END + 0.5, K); BAR = 4 * K.B
s.fx(room(END, 0.5), 0.0, 0.2, 0.0, wet=0.05, name='room tone')
for k in ('v0', 'v2', 'v3'): s.fx(entry(), T[k], 0.3, 0.1, wet=0.2, name=f'entry {k}')
s.fx(sweep_lock(0.8), T['sharp'] - 0.78, 0.35, 0.0, wet=0.25, name='the radar picture sharpens and locks')
s.fx(entry(), T['sharp'], 0.22, 0.0, wet=0.3, name='11 CM: locked')
s.fx(ignition(), T['rocket'], 0.45, 0.0, wet=0.3, name='the rocket lifts')
s.fx(ticker(T['price'] - T['count0']), T['count0'], 0.28, 0.0, wet=0.1, name='the counter rolls')
s.fx(entry(), T['price'], 0.3, 0.0, wet=0.25, name='EUR 2,000,000,000')
s.fx(entry(), T['status'], 0.25, 0.0, wet=0.2, name='PENDING APPROVAL')
s.fx(spinner(END - T['status'] - 0.5), T['status'] + 0.1, 0.35, 0.0, wet=0.2, name='the spinners')
s.fx(entry(), T['ok'], 0.3, 0.0, wet=0.3, name='AWAITING 5 APPROVALS')
for i in range(int(np.ceil(END / BAR))):
    tb = i * BAR
    if tb >= T['status'] - 0.1: break
    pulse_bar(s, tb, K.CHORDS[i % 4], g=0.04 if tb < T['s2'] else 0.05, drums=tb >= T['s2'] - 0.1)
# the end: the pulse stops; one suspended arp chord rings over the spinners
for j, m in enumerate((62, 67, 69)): s.note(__import__('rfsound').vibes(m + 12, END - T['status'] - 0.6, 0.6), T['status'] + j * 0.08, 0.06, (-0.3, 0, 0.3)[j], 0.4, stem='keys', name='a sus chord, unresolved')
sting(s, END - 0.6)
cues = [(k, T[k]) for k in EV['cueNames']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
