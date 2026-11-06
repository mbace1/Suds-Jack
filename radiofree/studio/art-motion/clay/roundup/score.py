"""On the Label (RFH · Roundup / glyphosate) — the cue sheet. The RFH bed, light, under a quiet shed at midday, and
the bench's own small sounds on the film's events (film.js → events.json). Every action lands on its caption's pop
word, so the sound of the action IS the pop there:

  1 · "65,000": three more CLAIM files drop onto the stack, one after another (paper slaps on card)
  2 · "warning": the STATE CANCER WARNING sticker flies in and slaps onto the label; on the pop a hard little stamp
      knocks PREEMPTED onto it; then it peels off and drops to the bench
  3 · "defense": the big rubber stamp swings in and comes down on the label: a heavy wooden thump, a low accent
  4 · "consulted": a sticky note slaps onto the phone. Then the phone does not ring: the bed drops away for a held
      breath, so the silence is the beat
  5 · "warning": the slow push to the empty box, a dry deadpan sting, and the RFH sting at the end

    uv run --with numpy --with soundfile python clay/roundup/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, foley, tap, slap, stinger, WHOOSH, _noise, _tvbp, _fade, _norm, _g
from rfsound import SR, tv, soft

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 6)]


def peel():
    """a sticker letting go: a short sticky rip that thins out"""
    d = 0.35; n = int(d * SR); g = _g('peel')
    crackle = (g.random(n) < np.geomspace(0.18, 0.01, n)).astype(float) * g.standard_normal(n)
    x = soft(crackle, 1800, 8000, 2) + _noise(d, g, 2500, 6500) * 0.18 * np.exp(-tv(d) * 9)
    return _fade(_norm(x, 0.7), 0.002, 0.06)


def stamp_body():
    """a big rubber stamp hitting a plastic jug on a wooden bench: a low body under the knock"""
    d = 0.5; t = tv(d)
    body = np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 25)) * t) * np.exp(-t * 11)
    return _fade(_norm(body, 0.9), 0.001, 0.12)


# ── the music: light under the whole film, ducked under each caption's reveal
bed(s, S[0] + 0.05, END - 0.6, [], level=1, g=0.8)
motif(s, S[0] + 0.03, g=0.25)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in', bright=0.6), t - WHOOSH['short'] * 0.8, 0.16, 0, at=t, name=f'cut {i + 2}')

# ── 1 · "65,000": three files drop onto the stack
for i in range(3):
    t = EV[f'folder{i}']; pan = -0.35 + i * 0.05
    s.fx(foley('paper', 'drop', 0.9 - i * 0.1), t, 0.42, pan, name=f'file {i + 1} lands')
    s.fx(foley('card', 'tap', 0.7), t + 0.005, 0.22, pan, name=f'file {i + 1} on the stack')

# ── 2 · the sticker: in, slap, PREEMPTED, peel, drop
s.fx(swish(), EV['stickHit'] - 0.35, 0.22, 0.3, name='the sticker flies in')
s.fx(foley('paper', 'tap', 0.9), EV['stickHit'], 0.38, 0.15, name='the sticker slaps on')
s.fx(foley('wood', 'tap', 0.8), EV['stickStamp'], 0.4, 0.1, name='PREEMPTED: the little stamp')
s.fx(tap(dull=True), EV['stickStamp'] + 0.005, 0.3, 0.1)
s.fx(peel(), EV['stickFall'], 0.34, 0.2, name='it peels off')
s.fx(foley('paper', 'flip', 0.6), EV['stickFall'] + 0.25, 0.22, 0.25, name='it flutters')
s.fx(foley('paper', 'drop', 0.6), EV['stickLand'], 0.3, 0.3, name='it lands on the bench')

# ── 3 · "defense": the big rubber stamp comes down
s.fx(whoosh('mid', 'in', bright=0.5), EV['stampDown'] - WHOOSH['mid'] * 0.8, 0.26, 0.15, at=EV['stampDown'], name='the stamp swings in')
s.fx(foley('wood', 'tap', 1.0), EV['stampDown'], 0.55, 0.05, wet=0.12, name='the stamp lands')
s.fx(stamp_body(), EV['stampDown'] + 0.004, 0.5, 0.05, name='its weight')
accent(s, EV['stampDown'] + 0.02, S[0], 0.22, name='stamp accent')
s.fx(foley('card', 'slide', 0.5), EV['stampDown'] + 0.35, 0.16, 0.15, name='the stamp lifts')

# ── 4 · "consulted": the note slaps onto the phone; then the phone does not ring (a held breath)
s.fx(swish(), EV['noteSlap'] - 0.3, 0.14, 0.4, name='the note flies in')
s.fx(slap(), EV['noteSlap'], 0.42, 0.35, name='the note slaps onto the phone')
s.duck(EV['noteSlap'] + 0.2, EV['noteSlap'] + 1.6, -12, why='the phone does not ring: a held breath')

# ── 5 · "warning": the push to the empty box; a dry deadpan sting
s.fx(whoosh('long', 'in', bright=0.4), S[4] + 0.1, 0.18, 0, name='the slow push to the label')
s.fx(stinger('deadpan'), EV['settle'] + 0.05, 0.3, 0, name='deadpan: still no warning')

# ── pop words without an action of their own get the house pop; the action words keep only a light note
ACTED = {'claims', 'court', 'order', 'asked'}
for w in EV['words']:
    if not w['pop']: continue
    if w['caption'] in ACTED: accent(s, w['t'] + 0.03, S[0], 0.12, name=f'pop note {w["w"]}')
    else: s.fx(pop(1.2), w['t'] + 0.03, 0.26, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[0], 0.18, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 'folder0', 'folder1', 'folder2', 'stickHit', 'stickStamp', 'stickFall', 'stickLand', 'stampDown', 'noteSlap', 'settle')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
