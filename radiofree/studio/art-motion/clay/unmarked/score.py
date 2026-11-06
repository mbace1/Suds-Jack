"""Unmarked Boxes (Global 4) — the cue sheet. The RFH bed light under a toy port, a toy sea and a shed, going to dusk;
the miniature's own sounds on the film's events (film.js → events.json):

  1 · the export gate: the lamps start and the bell rings (one strike per lamp swap, panned to the lit lamp); the booms
      come down with a motor whirr and a knock; the lorry of crates rumbles in, its brakes squeal, it stops with a
      settle and an air-brake sigh; on "licence" a short low accent
  2 · the map: the ship's horn as it casts off from the US quay, its engine chugging under a sea wash as it takes the
      long way round, easing off as it reaches the Southeast Asia pier
  3 · the repack hood: a conveyor hum and roller rattle, a soft knock each time a crate goes in and a box comes out
  4 · the workbench: the hair dryer switches on and whines; the sticker peels (a slide), flutters and lands on the dummy
  5 · the inspection: a tick for each dummy, in turn; the ship's horn again, far off, as it sails for China; the long
      rise; the RFH sting

    uv run --with numpy --with soundfile python clay/unmarked/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, foley, WHOOSH, _noise, _tvbp, _fade, _norm, _g
from rfsound import SR, tv, soft

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 6)]
RATE = 3.2                                  # film.js: the gate's lamps swap 3.2 times a second from EV.gate
V0, DEC = 8.5, 5.6                          # film.js: the lorry's kinematics
ITEM_EVERY = 3.0 / 2.6                      # film.js: LINE_GAP / LINE_V, one crate into the hood this often
N_TICKS = 10                                # film.js: ten dummies, ten ticks
N = int((END + 0.5) * SR)


def env(n, pts):
    """a piecewise-linear envelope over n samples from (time, value) points"""
    t = np.arange(n) / SR; ts, vs = zip(*pts); return np.interp(t, ts, vs)


def bell(k):
    """a level-crossing style bell at the gate: a hard strike on a small inharmonic bell, ~0.3 s ring (as Cut First)"""
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


def squeal(i, hi=2800):
    """brake pads: a narrow band that slides down as the wheel slows"""
    d = 0.9; n = int(d * SR)
    x = _tvbp(_noise(d, _g('squeal', i)), np.geomspace(hi, 1500, n), 22) * np.sin(np.pi * np.minimum(1, tv(d) / d)) ** 0.7
    return _fade(_norm(x, 0.6), 0.04, 0.2)


def sigh():
    """an air brake letting go: a hiss that opens and dies"""
    d = 0.7; n = int(d * SR)
    x = _tvbp(_noise(d, _g('sigh')), np.geomspace(5200, 2400, n), 1.2) * np.exp(-tv(d) * 5)
    return _fade(_norm(x, 0.7), 0.008, 0.1)


def whirr(d=1.0):
    """the booms' motor: a small electric whine that rises and settles"""
    t = tv(d); f = 180 + 70 * np.sin(np.pi * np.minimum(1, t / d))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6 + np.sin(4 * np.pi * np.cumsum(f) / SR) * 0.25
    x += soft(_noise(d, _g('whirr')), 600, 3000, 2) * 0.15
    return _fade(_norm(x * np.sin(np.pi * np.minimum(1, t / d)) ** 0.5, 0.6), 0.05, 0.15)


def horn(d=1.5):
    """a toy ship's horn: two low reedy tones a fifth apart, a slow swell and a fall"""
    t = tv(d); a = np.minimum(1, t / 0.18) * np.exp(-np.maximum(0, t - (d - 0.45)) * 7)
    x = np.zeros(len(t))
    for f, g in ((110, 1.0), (165, 0.55)):
        for h, hg in ((1, 1.0), (2, 0.45), (3, 0.25), (4, 0.12)):
            x += np.sin(2 * np.pi * f * h * t * (1 + 0.003 * np.sin(2 * np.pi * 5 * t))) * g * hg
    return _fade(_norm(x * a, 0.8), 0.01, 0.1)


def wash(d):
    """the sea under the map: slow swells of soft noise"""
    t = tv(d); x = soft(_noise(d, _g('wash')), 150, 1400, 2)
    return _fade(_norm(x * (0.55 + 0.45 * np.sin(2 * np.pi * 0.35 * t) ** 2), 0.6), 0.5, 0.6)


def chug(level):
    """the ship's engine: a soft diesel pulse whose loudness follows `level`"""
    n = len(level); t = np.arange(n) / SR
    pulse = (0.5 + 0.5 * np.sin(2 * np.pi * 4.2 * t)) ** 3
    x = soft(_noise(n / SR, _g('chug')), 50, 260, 2) * pulse + np.sin(2 * np.pi * 52 * t) * 0.2 * pulse
    return _norm(x, 0.8) * level


def conveyor(d):
    """the repack line: a motor hum and the rollers' fine rattle"""
    t = tv(d); g = _g('conveyor')
    hum = np.sin(2 * np.pi * 98 * t) * 0.4 + np.sin(2 * np.pi * 196 * t) * 0.15
    rattle = soft(_noise(d, g), 1500, 6000, 2) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 23 * t))) * 0.3
    return _fade(_norm(hum + rattle, 0.6), 0.3, 0.3)


def dryer(d):
    """a hair dryer: a motor whine with its blade harmonics and a broad rush of air; a short spin-up"""
    t = tv(d); up = np.minimum(1, t / 0.35)
    f = 260 * (0.6 + 0.4 * up)
    ph = 2 * np.pi * np.cumsum(f) / SR
    motor = np.sin(ph) * 0.35 + np.sin(2 * ph) * 0.2 + np.sin(5 * ph) * 0.12
    air = soft(_noise(d, _g('dryer')), 400, 7000, 2) * 0.8
    return _fade(_norm((motor + air) * up, 0.7), 0.02, 0.25)


# ── the music: light under the whole film, ducked under each caption's reveal
bed(s, S[0] + 0.05, END - 0.6, [], level=1, g=0.8)
motif(s, S[0] + 0.03, g=0.25)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in', bright=0.6), t - WHOOSH['short'] * 0.8, 0.18, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the gate: bell, booms, the lorry braking
k = 0
while EV['gate'] + k / RATE < S[1] - 0.1:
    tt = EV['gate'] + k / RATE
    s.fx(bell(k), tt, 0.26, -0.35 if k % 2 == 0 else 0.35, wet=0.18, name=f'gate bell {k + 1}')
    k += 1
s.fx(whirr(1.0), S[0] + 0.3, 0.2, 0.25, name='the booms come down')
s.fx(foley('wood', 'tap', 0.8), EV['boomsDown'], 0.3, 0.25, name='the booms land')
t = np.arange(N) / SR
v = np.where(t < EV['brake'], V0, np.clip(V0 - DEC * (t - EV['brake']), 0, V0)) / V0
lev = (0.2 + 0.8 * v) * env(N, [(0, 0), (S[0] + 0.15, 1), (S[1] - 0.2, 1), (S[1] + 0.2, 0), (END + 0.5, 0)])
s.fx(engine(lev, 'lorry'), 0.0, 0.42, -0.1, wet=0.05, name='the lorry of crates')
s.fx(squeal(1), EV['brake'], 0.16, 0.1, name='the lorry brakes')
s.fx(foley('wood', 'tap', 0.8), EV['stop'], 0.3, 0.1, name='it stops at the booms: the nose dips and rocks')
s.fx(sigh(), EV['stop'] + 0.12, 0.22, 0.1, name='air brake')

# ── 2 · the map: the horn, the sea, the ship's engine out to the Southeast Asia pier
s.fx(horn(1.5), EV['depart'], 0.4, -0.1, wet=0.3, name='the ship casts off: horn')
s.fx(wash(S[2] - S[1] + 0.3), S[1], 0.22, 0, wet=0.2, name='the sea')
ship = env(N, [(0, 0), (EV['depart'], 0), (EV['depart'] + 0.6, 1), (EV['dock'] - 0.4, 0.8), (EV['dock'] + 0.3, 0.1), (S[2] + 0.3, 0), (END + 0.5, 0)])
s.fx(chug(ship), 0.0, 0.3, 0.15, wet=0.1, name='the ship\'s engine')
s.fx(foley('wood', 'drop', 0.5), EV['dock'], 0.22, 0.2, wet=0.2, name='the hull bumps the Southeast Asia pier')

# ── 3 · the repack hood: the line runs; a knock as each crate goes in
s.fx(conveyor(S[3] - S[2] + 0.2), S[2], 0.24, 0, wet=0.12, name='the repack line')
n = 0; tt = S[2] + 0.25
while tt < S[3] - 0.2:
    s.fx(foley('card', 'tap', 0.7), tt, 0.2, -0.3, name=f'a crate goes in {n + 1}')
    s.fx(foley('card', 'drop', 0.6), tt + ITEM_EVERY / 2, 0.18, 0.3, name=f'a box comes out {n + 1}')
    n += 1; tt += ITEM_EVERY

# ── 4 · the workbench: the dryer, the sticker
s.fx(foley('wood', 'tap', 0.5), EV['blow'] - 0.05, 0.2, -0.3, name='the dryer switch')
s.fx(dryer(EV['blowEnd'] - EV['blow']), EV['blow'], 0.3, -0.25, wet=0.08, name='the hair dryer')
s.fx(foley('paper', 'slide', 0.7), EV['peel'], 0.3, -0.1, name='the sticker peels')
s.fx(foley('paper', 'flip', 0.7), EV['peel'] + 0.35, 0.25, 0.05, name='it flutters')
s.fx(foley('paper', 'tap', 0.7), EV['stick'], 0.3, 0.2, name='it lands on the dummy')

# ── 5 · the inspection; the ship sails for China; the rise
for i in range(N_TICKS):
    ti = EV['tick0'] + i * (EV['tickN'] - EV['tick0']) / N_TICKS
    s.fx(chip(True), ti, 0.2, -0.4 + 0.8 * (i % 2), name=f'tick {i + 1}')
s.fx(horn(1.2), EV['sail'], 0.18, -0.2, wet=0.45, name='the ship sails for China, far off')
s.fx(whoosh('long', 'out', bright=0.5), EV['rise'], 0.25, 0, at=EV['rise'], name='the camera rises over the sea')

# ── every pop word: a pop and a note
for w in EV['words']:
    if w['pop']:
        s.fx(pop(1.3), w['t'] + 0.03, 0.28, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[0], 0.2, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 'gate', 'boomsDown', 'brake', 'stop', 'depart', 'dock', 'blow', 'peel', 'stick', 'tick0', 'sail', 'rise')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
