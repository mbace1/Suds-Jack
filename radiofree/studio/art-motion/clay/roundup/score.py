"""On the Label (RFH · Roundup / glyphosate), v3 — the cue sheet. The owner on v2: "not punchy enough, needs better
delivery". So every hit is an IMPACT now, the bed drops hard under each one, and the turn is played in silence.
Events from film.js → events.json (any language); every impact lands on its caption's pop word, to the frame.

  1 · hook: the bed starts under the empty box; the station's call, light
  2 · "65,000": the CLAIMS boxes CRASH onto the bench: two card-box drops with a low body, files spilling after; the bed
      ducks −10 dB on the hit
  3 · "No": the sticker slaps on; the hand stamp HAMMERS it PREEMPTED — a wood crack with a snap on top — and the halves
      tear (a rip) and flutter to the bench; duck −10
  4 · "defense": the big stamp hangs, then SLAMS: a heavy wood hit with a low, long body and a dust hiss; duck −14
  5 · "alleges": the note slaps onto the phone; the phone does not ring: a held breath (−12 dB for 1.4 s)
  6 · the turn: the bed is OUT; a slow air into the empty box; on "blank" a dry deadpan sting; then the RFH sting

    uv run --with numpy --with soundfile python clay/roundup/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, foley, tap, slap, stinger, WHOOSH, _noise, _fade, _norm, _g
from rfsound import SR, tv, soft

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 7)]
QUIET = [(EV['s6'], EV['blank'] + 0.45)]   # the turn is played in silence on purpose (checked as a marked quiet span)


def body(f0=70, drop=40, dur=0.5, decay=11):
    """a low body under a hit: a pitched thump that falls as it decays"""
    t = tv(dur); x = np.sin(2 * np.pi * (f0 + drop * np.exp(-t * 25)) * t) * np.exp(-t * decay)
    return _fade(_norm(x, 0.9), 0.001, 0.12)


def crack():
    """a hard, bright snap on top of a wood hit: the hand stamp's face meeting the jug"""
    d = 0.09; g = _g('crack'); t = tv(d)
    x = _noise(d, g, 1800, 9000) * np.exp(-t * 90) + np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 160) * 0.5
    return _fade(_norm(x, 0.85), 0.0003, 0.02)


def rip():
    """paper tearing: a crackle that runs for a third of a second and thins out"""
    d = 0.34; n = int(d * SR); g = _g('rip')
    crackle = (g.random(n) < np.geomspace(0.35, 0.02, n)).astype(float) * g.standard_normal(n)
    x = soft(crackle, 1500, 8000, 2) + _noise(d, g, 2000, 7000) * 0.2 * np.exp(-tv(d) * 7)
    return _fade(_norm(x, 0.75), 0.002, 0.05)


def dust():
    """the hiss of dust leaving a bench after a slam"""
    d = 0.55; g = _g('dust'); t = tv(d)
    x = _noise(d, g, 900, 5000) * np.exp(-t * 7) * (1 - np.exp(-t * 120))
    return _fade(_norm(x, 0.5), 0.004, 0.1)


# ── the music: light under the hook and the hits, OUT for the turn; ducked under each caption's reveal
bed(s, S[0] + 0.05, S[5] - 0.02, [], level=1, g=0.8)
motif(s, S[0] + 0.03, g=0.25)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:5]): s.fx(whoosh('short', 'in', bright=0.6), t - WHOOSH['short'] * 0.8, 0.16, 0, at=t, name=f'cut {i + 2}')

# ── 2 · "65,000": the boxes CRASH, the files spill
for i, (pan, vel) in enumerate([(-0.3, 1.0), (-0.5, 0.9)]):
    t = EV['crash'] + i * 0.04
    s.fx(foley('card', 'drop', vel), t, 0.7, pan, name=f'box {i + 1} crashes'); s.fx(body(80, 50, 0.45, 13), t + 0.003, 0.55, pan, name=f'box {i + 1} body')
s.fx(dust(), EV['crash'] + 0.03, 0.22, -0.35, name='bench dust')
s.duck(EV['crash'] - 0.02, EV['crash'] + 0.35, -10, attack=0.02, release=0.35, why='the crash')
for i in range(3):
    t = EV[f'folder{i}'] + 0.3; pan = -0.3 + i * 0.05
    s.fx(foley('paper', 'drop', 0.8 - i * 0.1), t, 0.36, pan, name=f'file {i + 1} lands')

# ── 3 · "No": the sticker slaps on; the hammer; the tear
s.fx(swish(), EV['stickHit'] - 0.3, 0.22, 0.3, name='the sticker flies in')
s.fx(foley('paper', 'tap', 0.9), EV['stickHit'], 0.38, 0.15, name='the sticker slaps on')
s.fx(whoosh('short', 'in', bright=0.9), EV['stickStamp'] - WHOOSH['short'] * 0.8, 0.2, 0.1, at=EV['stickStamp'], name='the hand stamp comes down')
s.fx(foley('wood', 'tap', 1.0), EV['stickStamp'], 0.6, 0.1, name='PREEMPTED: the hammer'); s.fx(crack(), EV['stickStamp'] + 0.002, 0.5, 0.1, name='its snap')
s.fx(body(110, 60, 0.3, 18), EV['stickStamp'] + 0.004, 0.4, 0.1, name='its body')
s.fx(rip(), EV['stickStamp'] + 0.03, 0.42, 0.2, name='the sticker tears')
s.duck(EV['stickStamp'] - 0.02, EV['stickStamp'] + 0.3, -10, attack=0.02, release=0.35, why='the hammer')
for i, pan in enumerate([-0.2, 0.45]): s.fx(foley('paper', 'flip', 0.5), EV['stickStamp'] + 0.22 + i * 0.08, 0.2, pan, name=f'half {i + 1} flutters')
for i, pan in enumerate([-0.25, 0.5]): s.fx(foley('paper', 'drop', 0.55), EV['stickLand'] + i * 0.07, 0.28, pan, name=f'half {i + 1} lands')

# ── 4 · "defense": the big stamp hangs, then SLAMS
s.fx(whoosh('mid', 'in', bright=0.4), EV['stampDown'] - WHOOSH['mid'] * 0.8, 0.3, 0.05, at=EV['stampDown'], name='the stamp falls')
s.fx(foley('wood', 'tap', 1.0), EV['stampDown'], 0.75, 0.05, wet=0.14, name='the stamp SLAMS')
s.fx(body(58, 45, 0.7, 8), EV['stampDown'] + 0.003, 0.8, 0.0, name='its weight')
s.fx(dust(), EV['stampDown'] + 0.02, 0.4, 0.05, name='dust')
accent(s, EV['stampDown'] + 0.02, S[0], 0.22, name='stamp accent')
s.duck(EV['stampDown'] - 0.02, EV['stampDown'] + 0.45, -14, attack=0.015, release=0.45, why='the slam')
s.fx(foley('card', 'slide', 0.5), EV['stampDown'] + 0.4, 0.16, 0.15, name='the stamp lifts')

# ── 5 · "alleges": the note slaps onto the phone; the phone does not ring
s.fx(swish(), EV['noteSlap'] - 0.3, 0.14, 0.4, name='the note flies in')
s.fx(slap(), EV['noteSlap'], 0.5, 0.35, name='the note slaps onto the phone'); s.fx(body(120, 40, 0.2, 30), EV['noteSlap'] + 0.003, 0.25, 0.35, name='the phone takes it')
s.duck(EV['noteSlap'] - 0.02, EV['noteSlap'] + 0.25, -8, attack=0.02, release=0.3, why='the slap')
s.duck(EV['noteSlap'] + 0.3, EV['noteSlap'] + 1.7, -12, attack=0.1, release=0.5, why='the phone does not ring: a held breath')

# ── 6 · the turn: silence, the slow air into the empty box; "blank": the deadpan sting; then the station's sting
s.fx(whoosh('long', 'in', bright=0.3), EV['blank'] - WHOOSH['long'] * 0.8, 0.14, 0, at=EV['blank'], name='the slow push into the box')
s.fx(stinger('deadpan'), EV['blank'] + 0.02, 0.4, 0, name='deadpan: intentionally blank')
s.fx(body(50, 20, 0.6, 9), EV['blank'] + 0.02, 0.3, 0, name='its floor')

# ── pop words: the impacts ARE their pops; the two caption-only pops get a light note
ACTED = {'claims', 'court', 'order', 'asked', 'blank'}
for w in EV['words']:
    if not w['pop']: continue
    if w['caption'] in ACTED: accent(s, w['t'] + 0.03, S[0], 0.1, name=f'pop note {w["w"]}')
    else: s.fx(pop(1.2), w['t'] + 0.03, 0.26, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[0], 0.18, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

# s6 is not a cue: the turn is cut INTO silence on purpose
cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 'hook', 'crash', 'folder0', 'stickHit', 'stickStamp', 'stickLand', 'stampDown', 'noteSlap', 'blank')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=QUIET, stems_dir=STEMS, report=REP)
