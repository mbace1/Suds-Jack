"""Right of Way (Doodle 10) — the cue sheet. The RFH bed light under a toy-town afternoon going to dusk, and the
miniature's own sounds on the film's events (film.js → events.json):

  1 · the glide: a small push-off from the bark, the air under the skin as it crosses the gap, a soft landing and a
      scrabble of claws on the far trunk
  2 · the route: a quiet tick for each stretch of the line as it is drawn, and a short wrong-note chip where it turns
      red over the gap; far off, the convoy rumbling in and the digger's tracks clanking
  3 · the barrier: the bell from the lamps (one strike per swap, panned to the lit lamp), the booms' motor and a thunk
      as they land; the convoy braking — the digger's tracks grinding to a halt, the tipper's squeal and air brake,
      the van's squeal — and a settle at each stop; on "pause", a short low accent
  4 · the pause: the bell stops; WORK PAUSED swings on its hooks (two small clinks); the digger's arm comes down on
      its hydraulics and the bucket meets the ground
  5 · the second glide, over the booms, its landing; then the long rise over the site at dusk and the RFH sting

    uv run --with numpy --with soundfile python clay/hamina/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, foley, WHOOSH, _noise, _tvbp, _fade, _norm, _g
from rfsound import SR, tv, soft

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 6)]
N = int((END + 0.5) * SR); TT = np.arange(N) / SR
RATE = 3.2                                  # film.js: the barrier's lamps swap 3.2 times a second from EV.gate
V0, DEC = 7.5, 5.0                          # film.js: the convoy's kinematics (u = t − s3)
DIGGER, TIPPER, VAN = 0, 1, 2               # CONVOY order in film.js


def bell(k):
    """the barrier's bell: a hard strike on a small inharmonic bell, ~0.3 s ring (as Cut First)"""
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


def env(pts):
    """a piecewise-linear envelope over the film from (time, value) points"""
    ts, vs = zip(*pts); return np.interp(TT, ts, vs)


def speed(i):
    """vehicle i's speed over the film, 0..1 of V0 (film.js zAt): cruising, then braking at DEC to its stop"""
    u = TT - S[2]; tb, ts = EV[f'brake{i}'] - S[2], EV[f'stop{i}'] - S[2]
    return np.where(u < tb, 1.0, np.clip((ts - u) / (ts - tb), 0, 1))


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


def clank(k):
    """one track link going over the sprocket: a short dull metal knock"""
    d = 0.08; t = tv(d); g = _g('clank', k)
    x = np.sin(2 * np.pi * (330 + 40 * (k % 3)) * t) * np.exp(-t * 70) + _noise(d, g, 900, 5000) * np.exp(-t * 160) * 0.5
    return _fade(_norm(x, 0.7), 0.0005, 0.01)


def whirr(d):
    """the booms' motor: a small geared hum that climbs and settles"""
    t = tv(d); k = t / d; g = _g('whirr')
    f = 180 + 60 * np.sin(np.pi * k)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + _tvbp(_noise(d, g), 900 + 300 * np.sin(np.pi * k), 4) * 0.6
    return _fade(_norm(soft(x, 120, 2600, 2) * np.sin(np.pi * k) ** 0.5, 0.6), 0.05, 0.08)


def hydraulic(d):
    """a ram letting the arm down: a whine that falls a little and a hiss of oil"""
    t = tv(d); k = t / d; g = _g('hyd')
    f = 520 - 120 * k
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35 + np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * 0.12
    x = x + _tvbp(_noise(d, g), 2600 - 800 * k, 3) * 0.4
    return _fade(_norm(x * np.sin(np.pi * np.minimum(1, k * 1.15)) ** 0.6, 0.5), 0.08, 0.15)


def thump():
    """a bucket set down on earth: a low body and a crumble"""
    d = 0.6; t = tv(d)
    body = np.sin(2 * np.pi * (60 + 25 * np.exp(-t * 20)) * t) * np.exp(-t * 9)
    crumble = soft(_noise(d, _g('thump')), 300, 2500, 2) * np.exp(-t * 14) * 0.5
    return _fade(_norm(body + crumble, 0.85), 0.001, 0.15)


def scrabble():
    """claws catching on bark: three or four tiny scratches"""
    d = 0.3; x = np.zeros(int(d * SR)); g = _g('scrabble')
    for i, t0 in enumerate((0.0, 0.05, 0.11, 0.19)):
        n = int(0.04 * SR); s0 = int(t0 * SR); x[s0:s0 + n] += _noise(0.04, g, 2500, 9000) * np.hanning(n) * (1 - i * 0.18)
    return _fade(_norm(x, 0.5), 0.001, 0.02)


def glide(t0, t1, pan0, pan1, tag):
    """one glide: push-off, the air under the skin all the way across, the landing and the claws"""
    s.fx(swish(), t0 - 0.02, 0.18, pan0, name=f'{tag}: push-off')
    s.fx(foley('wood', 'tap', 0.4), t0, 0.12, pan0, name=f'{tag}: off the bark')
    s.fx(whoosh('long', 'in', bright=0.32, d=t1 - t0 + 0.05), t0, 0.32, (pan0 + pan1) / 2, wet=0.2, at=t1, name=f'{tag}: the glide')
    s.fx(foley('wood', 'tap', 0.55), t1, 0.2, pan1, name=f'{tag}: landing')
    s.fx(scrabble(), t1 + 0.02, 0.22, pan1, name=f'{tag}: claws on the bark')


# ── the music: light under the whole film (an afternoon going to dusk), ducked under each caption's reveal
bed(s, S[0] + 0.05, END - 0.6, [], level=1, g=0.8)
motif(s, S[0] + 0.03, g=0.25)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in', bright=0.6), t - WHOOSH['short'] * 0.8, 0.18, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the glide across the gap (left aspen → right aspen)
glide(EV['launch1'], EV['land1'], -0.4, 0.4, 'glide 1')

# ── 2 · the route drawn along the strip; far off, the convoy coming in
for i in range(12):
    t = EV['routeIn'] + (EV['routeEnd'] - EV['routeIn']) * (1 - (1 - i / 11) ** 0.5)
    if abs(t - EV['routeRed']) > 0.06: s.fx(tick(i % 3, down=False), t, 0.07, -0.6 + 1.2 * i / 11, name=f'route {i + 1}')
s.fx(chip(False), EV['routeRed'], 0.3, 0, name='the route turns red over the gap')
s.fx(chip(False), EV['routeEnd'] + 0.32, 0.16, 0, name='the red stretch blinks')
lev = sum(speed(i) * (1.3 if i == TIPPER else 0.9) + 0.15 for i in range(3)) / 3.6
lev = lev * env([(0, 0), (S[1] - 0.05, 0), (S[1] + 0.4, 0.35), (S[2] - 0.1, 0.45), (S[2] + 0.2, 1), (S[3], 0.4), (S[3] + 0.4, 0.12), (S[4], 0.1), (S[4] + 0.4, 0.06), (END + 0.5, 0)])
s.fx(engine(lev, 'convoy', 40, 260, 44), 0.0, 0.42, 0.15, wet=0.05, name='the convoy rumbles in')
# the digger's tracks: a clank per link, the rate following its speed, from shot 2 until it stops
v = speed(DIGGER); k = 0; t = S[1] + 0.1
while t < EV['stop0']:
    i = int(t * SR); sp = v[i]; far = t < S[2]
    if sp > 0.05: s.fx(clank(k), t, (0.05 if far else 0.12) * (0.4 + 0.6 * sp), 0.2, name=f'track {k + 1}')
    t += 0.13 / max(0.25, sp); k += 1

# ── 3 · the barrier: lamps and bell, booms down; the convoy brakes
k = 0
while EV['gate'] + k / RATE < EV['bellEnd']:
    tt = EV['gate'] + k / RATE
    s.fx(bell(k), tt, 0.26, -0.35 if k % 2 == 0 else 0.35, wet=0.18, name=f'bell {k + 1}'); k += 1
s.fx(whirr(EV['boomsDown'] - S[2] - 0.4), S[2] + 0.4, 0.2, 0, name='the booms come down')
s.fx(foley('wood', 'tap', 0.9), EV['boomsDown'], 0.4, -0.2, name='booms down: thunk'); s.fx(tap(dull=True), EV['boomsDown'] + 0.01, 0.3, 0.2)
s.fx(foley('clay', 'slide', 0.6), EV['brake0'], 0.18, 0.15, name='the digger: tracks grind to a halt')
s.fx(squeal(1, 2600), EV['brake1'], 0.16, 0.15, name='the tipper brakes')
s.fx(squeal(2, 3500), EV['brake2'], 0.13, 0.2, name='the van brakes')
for i in range(3):
    s.fx(foley('wood', 'tap', 0.8), EV[f'stop{i}'], 0.28, 0.15, name=f'stop {i + 1}: the nose dips and rocks')
s.fx(sigh(), EV['stop1'] + 0.12, 0.22, 0.15, name='the tipper: air brake')

# ── 4 · the pause: WORK PAUSED swings; the digger's arm comes down
s.fx(tick(0), EV['placard'] + 0.08, 0.12, -0.2, name='WORK PAUSED: hooks clink'); s.fx(tick(2), EV['placard'] + 0.3, 0.08, -0.2)
s.fx(hydraulic(EV['restEnd'] - EV['rest']), EV['rest'], 0.22, 0.1, name='the arm comes down on its hydraulics')
s.fx(thump(), EV['restEnd'], 0.42, 0.1, wet=0.12, name='the bucket meets the ground')

# ── 5 · the second glide, over the booms; then the rise over the site
glide(EV['launch2'], EV['land2'], -0.3, 0.45, 'glide 2')
s.fx(whoosh('long', 'out', bright=0.5), EV['rise'], 0.25, 0, at=EV['rise'], name='the camera rises over the site')

# ── every pop word: a pop and a note
for w in EV['words']:
    if w['pop']:
        s.fx(pop(1.3), w['t'] + 0.03, 0.28, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[0], 0.2, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 'launch1', 'land1', 'routeRed', 'gate', 'boomsDown', 'stop0', 'stop1', 'stop2',
                              'placard', 'restEnd', 'launch2', 'land2', 'rise')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
