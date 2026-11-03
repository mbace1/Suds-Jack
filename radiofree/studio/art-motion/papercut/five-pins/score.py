"""Five Pins (RFH Helsinki), VIRAL CUT: the cue sheet. The RFH house bed driven at 140 BPM (the cut's grid), placed by
seconds from the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.
The schedules here mirror scenes/fpn_kit.js (the fpn_* scenes).

1 · frame 1 is a hit (a thump and a knock, 35 ms in, never sample 0); the pins hang over the map with a faint wire
    hum; on "go" they twitch (a small tick each).
2 · the pins drop west to east, one every 0.34 s (GAP/FALL in the kit): a short fall glide, then a card thunk and a
    pin-in-cork tap each, rising in pitch; on "map" a chime.
3 · the heat: a low warm swell as the pipes draw out, a soft tick as each cluster lights; on "homes" a warm chord.
4 · Muhos: the bed drops out under wind over the clearing; the first trunk cracks on the cut, the trees fall in a front
    (rustle + thump, left to right), the last lands on "first" with a heavier thump and a sub; the stake knocks in twice;
    the bed comes back thin; the clipping rises on "clip"; a deadpan stinger; the sting.

    uv run --with numpy --with soundfile python papercut/five-pins/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
import numpy as np
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, tick, foley, stinger, WHOOSH
from rfsound import hum, glide, thump, chime, knock, rustle, fm_ep, sub_bass, noise, tv


class RFHV(RFH):
    """the house series at the viral cut's tempo: same key, chords, room and mix; 140 BPM"""
    BPM = 140
    B = 60 / 140


EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFHV)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 5)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
B = RFHV.B
GAP, FALL, NPIN = 0.34, 0.26, 5                  # the kit's pin schedule (scenes/fpn_kit.js)
STANDING, DUR = 7, 0.42                          # the kit's falling front: 7 trees, 0.42 s each

# ── the music: the bed from the first beat at level 2 through Helsinki; out for Muhos (the trees and the stake carry it),
#    back in thin under the clipping
bed(s, S[0] + B, S[3] - 0.05, quiet, level=2, S=RFHV)
tC, tFi = c('fpn_muhos.clip'), c('fpn_muhos.first')
tS = tFi + 0.55                                  # the kit's stake: in 0.55 s after the last tree lands
bed(s, tS + 0.6, END - 0.6, quiet, level=1, S=RFHV)   # back in, thin, once the stake is in (no unmarked silence)

def wind(d, seed=4):
    """wind over a clearing: low band noise, breathing slowly"""
    t = tv(d); return noise(d, 180, 1400) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t + seed)) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.8) * 0.5
s.fx(wind(END - S[3] - 0.3), S[3], 0.22, 0, name='Muhos: wind over the clearing')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')
    if i < 2: s.fx(thump(), t, 0.2, 0, name=f'cut {i + 2}: a beat on the cut')

# ── 1 · the hook: the hit; the pins hang (a faint hum); on "go" they twitch
tG = c('fpn_hook.go')
s.fx(thump(), S[0] + 0.035, 0.7, 0, name='frame 1: the hit'); s.fx(knock(0.9), S[0] + 0.035, 0.42, 0, name='frame 1: the knock')
accent(s, S[0] + 0.035, S[0], 0.28, S=RFHV, name='frame 1')
s.fx(hum(110, S[1] + GAP * NPIN - S[0]) * 0.3, S[0], 0.05, 0, name='the pins hang: a faint hum')
for i in range(NPIN): s.fx(tick(i % 4, down=True), tG + i * 0.05, 0.14, -0.6 + 0.3 * i, name='"go": the pins twitch' if i == 0 else f'twitch {i + 1}')
accent(s, tG, S[0], 0.26, S=RFHV, name='go')

# ── 2 · the pins drop, west to east; on "map" a chime
tD = c('fpn_pins.drop')
for i in range(NPIN):
    t0, tl, pan = tD + i * GAP, tD + i * GAP + FALL, -0.6 + 0.3 * i
    s.fx(glide(1400 - i * 60, 500, FALL), t0, 0.08, pan, name=f'pin {i + 1} falls')
    s.fx(foley('card', 'tap', 0.9), tl, 0.45, pan, name=f'pin {i + 1} lands'); s.fx(knock(0.6, f=300 + 40 * i), tl + 0.005, 0.3, pan)
tM = c('fpn_pins.map')
s.fx(chime(88, 0.5), tM, 0.18, 0.1, name='"map"'); accent(s, tM, S[0], 0.26, S=RFHV, name='map')

# ── 3 · the heat runs: a warm swell, a tick per cluster; on "homes" a warm chord
tF, tH = c('fpn_heat.flow'), c('fpn_heat.homes')
s.fx(whoosh(d=1.2, way='in', bright=0.3), tF, 0.16, 0, name='the heat runs out along the pipes')
for j in range(10): s.fx(tick(j % 4, down=False), tF + 0.45 + (j // 2) * 0.05 + (j % 2) * 0.12, 0.09, -0.5 + 0.1 * j, name='a cluster warms' if j == 0 else f'cluster {j + 1}')
for j, n in enumerate((62, 66, 69, 74)):
    s.note(fm_ep(n, 1.4, 0.5, r=0.8), tH + 0.01 * j, 0.1, -0.3 + 0.2 * j, 0.4, stem='keys', name='"homes": the warm chord')
accent(s, tH, S[0], 0.26, S=RFHV, name='homes')

# ── 4 · Muhos: the front falls, the last on "first"; a breath; the stake knocks in; the clipping
tFa = c('fpn_muhos.fall')
s.fx(knock(0.7, f=170), tFa, 0.35, -0.7, name='the first trunk cracks')
g8 = max(0.04, (tFi - DUR - tFa) / (STANDING - 1))
for k in range(STANDING):
    t0 = tFa + k * g8; pan = -0.7 + 1.4 * k / (STANDING - 1)
    s.fx(rustle(0.35), t0 + 0.08, 0.16, pan, name='the front' if k == 0 else f'tree {k + 1}')
    s.fx(thump(), t0 + DUR, 0.22 + (0.3 if k == STANDING - 1 else 0), pan, name=f'tree {k + 1} lands' if k < STANDING - 1 else '"first": the last tree lands')
s.note(sub_bass(38, 0.8), tFi, 0.3, 0, 0, stem='bass', name='"first": sub')
s.fx(knock(0.9, f=220), tS, 0.45, 0.05, name='the stake goes in'); s.fx(knock(0.8, f=200), tS + 0.18, 0.4, 0.05, name='the stake: second blow')
s.fx(foley('card', 'slide'), tC - 0.25, 0.35, -0.1, name='the clipping rises'); s.fx(foley('card', 'tap'), tC, 0.4, 0, name='"clip": the clipping lands')
s.fx(stinger('deadpan'), tC + 0.4, 0.35, name='deadpan')
sting(s, END - 0.6, S=RFHV)

# every pop word gets a tick
for cp in EV['captions']:
    for j, w in enumerate([w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]):
        s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.2, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
