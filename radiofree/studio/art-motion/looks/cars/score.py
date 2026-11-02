"""Look test · 3D miniature cars — the cue sheet. A level-crossing bell that rings the whole time the lamps alternate
(one strike per lamp swap, panned to the lamp that is lit), the convoy as one low rumble that sags as each vehicle
brakes, a brake squeal on each brake and a settle on each stop (the trucks get an air-brake sigh), the RFH bed
light underneath, and the sign-off sting.

    uv run --with numpy --with soundfile python looks/cars/score.py <events.json> <out.wav> [<report.json>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import pop, foley, swish, _noise, _tvbp, _fade, _norm, _g
from rfsound import SR, tv, soft

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]; REP = sys.argv[3] if len(sys.argv) > 3 else None
END = EV['end']; s = Session(END + 0.5, RFH)
FLASH, RATE = 0.35, 3.2                    # film.js GATE.flash and the lamp swap rate
V0, DEC = 8.5, 5.2                         # film.js convoy kinematics
TRUCK = {0, 2}


def bell(k):
    """a crossing bell: a hard strike on a small inharmonic bell, ~0.3 s ring"""
    t = tv(0.42); x = np.zeros(len(t))
    for f, a, dk in ((1180, 1.0, 0.16), (1180 * 2.76, 0.45, 0.07), (1180 * 5.4, 0.22, 0.035), (590, 0.25, 0.2)):
        x += np.sin(2 * np.pi * f * (1 + 0.002 * (k % 2)) * t) * np.exp(-t / dk) * a
    x[:int(0.003 * SR)] += _noise(0.003, _g('bell', k)) * 0.4
    return _fade(_norm(x, 0.8), 0.0005, 0.05)


def rumble():
    """the convoy: brown noise low-passed, its level the sum of the four speeds; an idle stays after the stop"""
    g = _g('rumble'); n = int((END + 0.5) * SR); t = np.arange(n) / SR
    x = soft(np.cumsum(g.standard_normal(n)) * 0.02, 40, 220, 2)
    x += np.sin(2 * np.pi * 46 * t + 0.4 * np.sin(2 * np.pi * 3.1 * t)) * 0.25
    lev = np.zeros(n)
    for i in range(4):
        ts = EV[f'stop{i}']; tb = EV[f'brake{i}']
        v = np.where(t < tb, V0, np.clip(V0 - DEC * (t - tb), 0, V0)) / V0
        lev += (0.18 + 0.82 * v) * (1.4 if i in TRUCK else 0.8)
    x = _norm(x, 0.8) * lev / lev.max()
    fi = int(0.3 * SR); x[:fi] *= np.linspace(0, 1, fi)
    return x


def squeal(i):
    """brake pads: a narrow band that slides down as the wheel slows"""
    d = 0.9; g = _g('squeal', i); n = int(d * SR)
    x = _tvbp(_noise(d, g), np.geomspace(2600 if i in TRUCK else 3400, 1500, n), 22) * np.sin(np.pi * np.minimum(1, tv(d) / d)) ** 0.7
    return _fade(_norm(x, 0.6), 0.04, 0.2)


def sigh():
    """an air brake letting go: a hiss that opens and dies"""
    d = 0.7; g = _g('sigh'); n = int(d * SR)
    x = _tvbp(_noise(d, g), np.geomspace(5200, 2400, n), 1.2) * np.exp(-tv(d) * 5)
    return _fade(_norm(x, 0.7), 0.008, 0.1)


bed(s, EV['s1'] + 0.05, END - 0.6, [], level=1, g=0.8)
s.fx(rumble(), 0.0, 0.42, -0.1, wet=0.05, name='the convoy rumbles')
k = 0
while FLASH + k / RATE < END - 0.5:
    t = FLASH + k / RATE; s.fx(bell(k), t, 0.3 * (1 - 0.35 * min(1, max(0, (t - 5.5) / 2))), -0.35 if k % 2 == 0 else 0.35, wet=0.18, name=f'bell {k + 1}'); k += 1
for i in range(4):
    pan = 0.15
    s.fx(squeal(i), EV[f'brake{i}'], 0.16, pan, name=f'brakes {i + 1}')
    s.fx(foley('wood', 'tap', 0.8), EV[f'stop{i}'], 0.3, pan, name=f'stop {i + 1}: the nose dips and rocks')
    if i in TRUCK: s.fx(sigh(), EV[f'stop{i}'] + 0.12, 0.22, pan, name=f'air brake {i + 1}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for w in EV['words']:
    if w['pop']: s.fx(pop(1.3), w['t'] + 0.03, 0.3, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, EV['s1'], 0.2, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', *(f'brake{i}' for i in range(4)), *(f'stop{i}' for i in range(4)))]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], report=REP)
