"""Be Prepared (RFH, Coxon 17 · the US prepper boom), 3D v1.1 — the cue sheet. Its own kit: BACKYARD (pipeline/sound/backyard.py).
A cheerful, slightly out-of-tune picking tune that keeps going; the bulbs' buzz, the TV's whine, cans, the generator, the ladder; the
hatch slams and EVERYTHING stops (the tune too), then the station's sting.
    uv run --with numpy --with soundfile python clay/bunker/score.py <events.json> <out.wav> [<report.json> <stems>]
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
from rfsound import knock
from backyard import Backyard as K, bulb_buzz, tv_whine, can_clink, pull_start, idle, rung, hatch_slam, pick_bar
s = Session(END + 0.5, K); BAR = 4 * K.B; SH = T['shut']
s.fx(tv_whine(SH), 0.0, 0.3, -0.3, wet=0.1, name='the old TV')
s.fx(knock(0.6, 400), T['lights'], 0.3, 0.2, wet=0.2, name='the bulbs click on')
s.fx(bulb_buzz(SH - T['lights']), T['lights'], 0.25, 0.2, wet=0.1, name='bare bulbs buzzing')
s.fx(knock(0.5, 700), T['cx'], 0.2, -0.3, wet=0.1, name='CANCELLED flips on')
s.fx(knock(0.5, 500), T['down'], 0.25, -0.3, wet=0.1, name='SERVICE UNAVAILABLE')
for i in range(26): s.fx(can_clink(i), T['cans'] + i * 0.065, 0.2, 0.3, wet=0.2, name='a can lands')
s.fx(knock(0.6, 300), T['aday'], 0.3, 0.0, wet=0.2, name='1 A DAY')
s.fx(pull_start(), T['gen'] - 1.1, 0.4, 0.3, wet=0.2, name='the generator: two pulls, then it catches')
s.fx(idle(SH - T['gen']), T['gen'], 0.22, 0.3, wet=0.15, name='the generator running')
s.fx(knock(0.6, 500), T['sold'], 0.3, -0.2, wet=0.2, name='SOLD OUT')
s.fx(knock(0.5, 650), T['quote'], 0.25, -0.3, wet=0.2, name='the quote starts typing')
t = T['climb']
for i in range(6): s.fx(rung(i), t + i * 0.42, 0.3, 0.0, wet=0.3, name='a ladder rung')
s.fx(hatch_slam(), SH, 0.8, 0.0, wet=0.4, name='the hatch SLAMS')
s.duck(SH - 0.02, SH + 0.6, -8, attack=0.01, release=0.3, why='the hatch')
for i in range(int(np.ceil(END / BAR))):
    tb = i * BAR
    if tb >= SH - 0.1: break
    pick_bar(s, tb, K.CHORDS[i % 4], g=0.05 if tb > T['lights'] else 0.0)
sting(s, END - 0.6)
cues = [(k, T[k]) for k in EV['cueNames']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[[SH + 0.3, END]], stems_dir=STEMS, report=REP)
