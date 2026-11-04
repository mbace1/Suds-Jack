"""Cut First (Doodle 8) — the cue sheet. The RFH bed light under a toy-town afternoon going to dusk, and the
miniature's own sounds on the film's events (film.js → events.json):

  1 · the last spruce: a creak as it starts to go, the air as it comes down, a heavy thump and a dust breath where
      it lands; the two loaded log trucks grinding away down the haul track
  2 · the crossing: the bell rings (one strike per lamp swap, panned to the lit lamp) from the moment the lamps start;
      the convoy as one rumble that sags as each vehicle brakes, a squeal on each brake, a settle on each stop and an
      air-brake sigh on the two trucks; on "stop", a short low accent
  3 · the police car: its own lighter engine, a short brake and a settle at the booms. No siren: the picture shows
      the blue lights, and the copy says only that the police are investigating
  4 · the ditch: the bell far off, a slow trickle in the water
  5 · the calendar: the page lifts, tears off, flutters and lands on the stumps; then the long rise over the clearing
      at dusk, the bell fading out under it, and the RFH sting

    uv run --with numpy --with soundfile python clay/cutfirst/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, foley, tap, WHOOSH, _noise, _tvbp, _fade, _norm, _g
from rfsound import SR, tv, soft

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 6)]
RATE = 3.2                                  # film.js: the lamps swap 3.2 times a second from EV.gate
V0, DEC = 8.5, 5.6                          # film.js: the convoy's kinematics
TRUCK = {0, 2}                              # CONVOY[0] and [2] are the timber trucks


def bell(k):
    """a level-crossing bell: a hard strike on a small inharmonic bell, ~0.3 s ring (as the cars look)"""
    t = tv(0.42); x = np.zeros(len(t))
    for f, a, dk in ((1180, 1.0, 0.16), (1180 * 2.76, 0.45, 0.07), (1180 * 5.4, 0.22, 0.035), (590, 0.25, 0.2)):
        x += np.sin(2 * np.pi * f * (1 + 0.002 * (k % 2)) * t) * np.exp(-t / dk) * a
    x[:int(0.003 * SR)] += _noise(0.003, _g('bell', k)) * 0.4
    return _fade(_norm(x, 0.8), 0.0005, 0.05)


def engine(level, seed, lo=40, hi=220, hum=46):
    """a low engine bed whose loudness follows `level` (one value per sample): brown noise plus a wobbling hum"""
    n = len(level); g = _g('engine', seed); t = np.arange(n) / SR
    x = soft(np.cumsum(g.standard_normal(n)) * 0.02, lo, hi, 2)
    x = _norm(x, 0.8) + np.sin(2 * np.pi * hum * t + 0.4 * np.sin(2 * np.pi * 3.1 * t)) * 0.25
    return x * level


def env(n, pts):
    """a piecewise-linear envelope over n samples from (time, value) points"""
    t = np.arange(n) / SR; ts, vs = zip(*pts); return np.interp(t, ts, vs)


def squeal(i, hi=3400):
    """brake pads: a narrow band that slides down as the wheel slows"""
    d = 0.9; n = int(d * SR)
    x = _tvbp(_noise(d, _g('squeal', i)), np.geomspace(hi, 1500, n), 22) * np.sin(np.pi * np.minimum(1, tv(d) / d)) ** 0.7
    return _fade(_norm(x, 0.6), 0.04, 0.2)


def sigh():
    """an air brake letting go: a hiss that opens and dies"""
    d = 0.7; n = int(d * SR)
    x = _tvbp(_noise(d, _g('sigh')), np.geomspace(5200, 2400, n), 1.2) * np.exp(-tv(d) * 5)
    return _fade(_norm(x, 0.7), 0.008, 0.1)


def creak(d=1.0):
    """wood giving way: a narrow band dragged slowly down, gritty"""
    n = int(d * SR); g = _g('creak')
    grit = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(np.geomspace(38, 14, n)) / SR))
    x = _tvbp(_noise(d, g), np.geomspace(900, 260, n), 18) * grit * np.sin(np.pi * np.minimum(1, tv(d) / d)) ** 0.5
    return _fade(_norm(x, 0.7), 0.05, 0.15)


def thump():
    """a tree hitting the ground: a low body and a crack of branches"""
    d = 0.9; t = tv(d)
    body = np.sin(2 * np.pi * (52 + 30 * np.exp(-t * 18)) * t) * np.exp(-t * 7)
    crack = soft(_noise(d, _g('thump')), 300, 3000, 2) * np.exp(-t * 16) * 0.6
    return _fade(_norm(body + crack, 0.9), 0.001, 0.2)


def trickle(d):
    """water running in the ditch: bandpassed noise broken into small bubbles"""
    n = int(d * SR); g = _g('trickle')
    x = _tvbp(_noise(d, g), 900 + 500 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 0.7)), 4)
    gl = np.zeros(n)
    for _ in range(int(d * 9)):
        a = int(g.uniform(0, n - 4000)); f = g.uniform(700, 1700); tt = tv(0.05)
        gl[a:a + len(tt)] += np.sin(2 * np.pi * f * (1 + 2.5 * tt) * tt) * np.exp(-tt * 70) * 0.5
    return _fade(_norm(x * 0.6 + gl, 0.6), 0.4, 0.5)


def tear():
    """a sheet torn off its pad: a short ripping burst"""
    d = 0.22; n = int(d * SR); g = _g('tear')
    rip = (g.random(n) < np.geomspace(0.25, 0.02, n)).astype(float) * g.standard_normal(n)
    x = soft(rip, 1500, 9000, 2) + _noise(d, g, 2000, 7000) * 0.25 * np.exp(-tv(d) * 12)
    return _fade(_norm(x, 0.8), 0.001, 0.04)


# ── the music: light under the whole film (an afternoon), ducked under each caption's reveal
bed(s, S[0] + 0.05, END - 0.6, [], level=1, g=0.8)
motif(s, S[0] + 0.03, g=0.25)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in', bright=0.6), t - WHOOSH['short'] * 0.8, 0.18, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the last spruce goes; the log trucks grind away
s.fx(creak(EV['fall'] - S[0] + 0.25), S[0] + 0.1, 0.32, -0.25, name='the spruce creaks')
s.fx(foley('wood', 'tap', 0.9), EV['fall'], 0.32, -0.25, name='the trunk cracks: it goes')
s.fx(whoosh('mid', 'in', bright=0.5), EV['land'] - WHOOSH['mid'] * 0.8, 0.3, -0.2, at=EV['land'], name='the spruce comes down')
s.fx(thump(), EV['land'], 0.6, -0.2, wet=0.15, name='the spruce lands')
s.fx(foley('wood', 'drop', 0.7), EV['land'] + 0.03, 0.3, -0.2, name='branches')
s.fx(swish(), EV['land'] + 0.1, 0.15, -0.2, name='dust')
N = int((END + 0.5) * SR)
out = env(N, [(0, 0), (S[0] + 0.3, 1), (S[1] - 0.4, 0.9), (S[1], 0), (END + 0.5, 0)])
s.fx(engine(out, 'out', 40, 260, 41), 0.0, 0.3, 0.2, wet=0.05, name='the loaded log trucks grind away')

# ── 2 · the crossing: the bell from the gate, the convoy braking
lev = np.zeros(N); t = np.arange(N) / SR
for i in range(4):
    tb, ts = EV[f'brake{i}'], EV[f'stop{i}']
    v = np.where(t < tb, V0, np.clip(V0 - DEC * (t - tb), 0, V0)) / V0
    lev += (0.18 + 0.82 * v) * (1.4 if i in TRUCK else 0.8)
lev = lev / lev.max() * env(N, [(0, 0), (S[1] - 0.05, 0), (S[1] + 0.3, 1), (S[2] - 0.3, 1), (S[2] + 0.2, 0.35), (S[3], 0.25), (S[3] + 0.3, 0.06), (S[4], 0.06), (S[4] + 0.3, 0.3), (END - 1.0, 0.12), (END + 0.5, 0)])
s.fx(engine(lev, 'convoy'), 0.0, 0.42, -0.1, wet=0.05, name='the convoy rumbles')
for i in range(4):
    s.fx(squeal(i, 2600 if i in TRUCK else 3400), EV[f'brake{i}'], 0.16, 0.15, name=f'brakes {i + 1}')
    s.fx(foley('wood', 'tap', 0.8), EV[f'stop{i}'], 0.3, 0.15, name=f'stop {i + 1}: the nose dips and rocks')
    if i in TRUCK: s.fx(sigh(), EV[f'stop{i}'] + 0.12, 0.22, 0.15, name=f'air brake {i + 1}')


def bell_gain(tt):
    """the bell is loud at the crossing (shots 2-3), far off at the ditch (4), back for the calendar, then fades"""
    if tt < S[3]: return 0.3
    if tt < S[4]: return 0.07
    return 0.22 * max(0.0, min(1.0, (END - 0.6 - tt) / max(0.1, END - 0.6 - EV['rise'])))


k = 0
while EV['gate'] + k / RATE < END - 0.6:
    tt = EV['gate'] + k / RATE; gn = bell_gain(tt)
    if gn > 0.005: s.fx(bell(k), tt, gn, -0.35 if k % 2 == 0 else 0.35, wet=0.18 if tt < S[3] else 0.4, name=f'bell {k + 1}')
    k += 1

# ── 3 · the police car rolls up to the booms
cop = env(N, [(0, 0), (S[2] - 0.05, 0), (S[2] + 0.25, 1), (EV['copBrake'], 1), (EV['copStop'], 0.3), (S[3], 0.2), (S[3] + 0.3, 0), (END + 0.5, 0)])
s.fx(engine(cop, 'cop', 60, 420, 63), 0.0, 0.3, -0.3, wet=0.05, name='the police car')
s.fx(squeal(9, 3800), EV['copBrake'], 0.12, -0.3, name='police car brakes')
s.fx(foley('wood', 'tap', 0.7), EV['copStop'], 0.25, -0.3, name='police car stops')

# ── 4 · the ditch: water running, far from the crossing
s.fx(trickle(S[4] - S[3] + 0.4), S[3] - 0.1, 0.3, -0.15, wet=0.25, name='water in the ditch')

# ── 5 · the calendar page: lift, tear, flutter, land; then the rise over the clearing
s.fx(foley('paper', 'slide', 0.7), EV['flip'], 0.25, -0.35, name='the page lifts')
s.fx(tear(), EV['tear'], 0.45, -0.35, name='the page tears off')
s.fx(foley('paper', 'flip', 0.8), EV['tear'] + 0.1, 0.3, -0.3, name='it flutters down')
s.fx(foley('paper', 'drop', 0.6), EV['pageLand'], 0.3, -0.2, name='it lands on the stumps')
s.fx(whoosh('long', 'out', bright=0.5), EV['rise'], 0.25, 0, at=EV['rise'], name='the camera rises over the clearing')

# ── every pop word: a pop and a note; on "stop" a low accent as the booms land
for w in EV['words']:
    if w['pop']:
        s.fx(pop(1.3), w['t'] + 0.03, 0.28, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[0], 0.2, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 'fall', 'land', 'gate', 'brake0', 'stop0', 'stop3', 'copBrake', 'copStop', 'flip', 'tear', 'pageLand', 'rise')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
