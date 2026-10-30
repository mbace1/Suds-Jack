"""The Round Trip (RFH global/Coxon), VIRAL CUT: the cue sheet. The RFH bed driven at 140 BPM (the cut's grid, not the
house 112), level 2 from the first beat, and the library's sounds against the plan's events (pipeline/plan.mjs), so the
Finnish and Japanese masters are scored by this same file.

Frame 1 is a hit: a thump and a knock, and the towers' server hum under the whole film. The bags fall with a swish and
land in the box on "invested" (a thump, a card tap, a coin glint). The S-1 slides up out of the box; on "computing"
chips tick down into the box and coins start clinking back up. On "$114.5B" and on line 3 the price tags slam onto the
towers. On "unused" the towers' lights power down first (the hum drops out), then UNUSED is stamped; the coins keep
clinking. The end: the round trip runs, a coin rings into Doodle's tower on "back", the clipping rises on "clip", the
station's sting closes it. The schedules here mirror scenes/rtr_kit.js (the rtr_* scenes).

    uv run --with numpy --with soundfile python papercut/the-round-trip/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, tick, foley, stinger, WHOOSH
from rfsound import hum, glide, ui_tick, thump, chime, knock, pencil


class RFHV(RFH):
    """the house series at the viral cut's tempo: same key, chords, room and mix; 140 BPM"""
    BPM = 140
    B = 60 / 140


EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFHV)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
B = RFHV.B

# ── under everything: the bed from the first beat (never on the first sample), driving at level 2; the towers' hum
#    (off while the lights are out in shot 4)
bed(s, S[0] + B, END - 0.6, quiet, level=2, S=RFHV)
tK = c('rtr_idle.dark')
s.fx(hum(55, tK - S[0]) * 0.4, S[0], 0.06, 0, name='the towers: server hum')
s.fx(hum(55, END - S[4]) * 0.4, S[4], 0.06, 0, name='the towers: the hum back')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.32, 0, at=t, name=f'cut {i + 2}')
    s.fx(thump(), t, 0.22, 0, name=f'cut {i + 2}: a beat on the cut')

# ── 1 · the hook: the hit on frame 1; the bags fall and land on "invested"
tD = c('rtr_hook.drop')
s.fx(thump(), S[0] + 0.035, 0.75, 0, name='frame 1: the hit'); s.fx(knock(0.9), S[0] + 0.035, 0.45, 0, name='frame 1: the knock')
accent(s, S[0] + 0.035, S[0], 0.3, S=RFHV, name='frame 1')
s.fx(swish(), S[0] + 0.2, 0.2, -0.3, name='the bags fall'); s.fx(swish(), S[0] + 0.3, 0.2, 0.3)
s.fx(thump(), tD, 0.55, 0, name='"invested": the bags land'); s.fx(foley('card', 'tap'), tD + 0.01, 0.4, 0)
s.fx(chime(88, 0.4), tD + 0.05, 0.14, 0.2, name='a coin glints')
for j in range(2): s.fx(foley('paper', 'drop', 0.6), tD + 0.35 + j / (2 * 0.55) + 1 / 0.55 * 0.9, 0.18, -0.3 + 0.6 * j, name='more bags' if j == 0 else f'bag {j + 2}')

# ── 2 · the S-1 slides up; on "computing" chips tick down, coins start back up
tF, tC = c('rtr_owe.file'), c('rtr_owe.chips')
s.fx(foley('paper', 'flip'), tF, 0.4, 0, name='the S-1 slides up')
s.fx(knock(0.8), tC, 0.4, 0, name='"computing"'); accent(s, tC, S[0], 0.28, S=RFHV, name='computing')
for i in range(8):
    s.fx(ui_tick(2400 + (i % 4) * 140), tC - 0.1 + i / (4 * 0.6) * 0.5, 0.08, -0.4 if i % 2 else 0.4, name='chips tick down' if i == 0 else f'chip {i + 1}')

# ── the coins: a soft clink every half-beat-and-a-bit from "computing" to the end, out of shot 4's power cut
def clinks(t0, t1, name):
    t, k = t0, 0
    while t < t1:
        s.fx(chime(96 + (k % 3) * 2, 0.12), t, 0.06, -0.35 if k % 2 else 0.35, name=name if k == 0 else f'{name} {k + 1}')
        t += B * 1.5; k += 1
clinks(tC + 0.3, END - 1.2, 'coins clink up')

# ── 3 · the price tags slam on: "$114.5B" and line 3
for k, (name, pan) in enumerate((('rtr_sum.iou1', -0.35), ('rtr_sum.iou2', 0.35))):
    t = c(name); s.fx(thump(), t, 0.5, pan, name=f'the price tag {k + 1}'); s.fx(foley('card', 'tap'), t + 0.01, 0.4, pan); s.fx(knock(0.7), t + 0.03, 0.3, pan)
    accent(s, t, S[0], 0.28, S=RFHV, name=f'price tag {k + 1}')

# ── 4 · the lights go out (the hum drops), then UNUSED is stamped on "unused"
tS = c('rtr_idle.stamp')
s.fx(glide(220, 55, 0.45), tK, 0.3, 0, name='the lights power down'); s.fx(knock(0.6), tK + 0.4, 0.25, 0)
s.fx(thump(), tS + 0.08, 0.55, -0.2, name='UNUSED: the stamps'); s.fx(pencil(0.2, seed=9), tS + 0.08, 0.3, -0.2); s.fx(thump(), tS + 0.2, 0.4, 0.2)
accent(s, tS, S[0], 0.3, S=RFHV, name='unused')

# ── 5 · the round trip; a coin rings into Doodle's tower on "back"; the clipping rises on "clip"; the sting
tB, tL = c('rtr_end.back'), c('rtr_end.clip')
s.fx(glide(55, 110, 0.4), S[4], 0.2, 0, name='the lights come back')
s.fx(chime(100, 0.6), tB, 0.3, -0.3, name='"back": the coin rings into the tower'); accent(s, tB, S[0], 0.34, S=RFHV, name='back')
s.fx(foley('card', 'slide'), tL - 0.25, 0.35, -0.1, name='the clipping rises'); s.fx(foley('card', 'tap'), tL, 0.4, 0, name='"clip": the clipping lands')
s.fx(stinger('deadpan'), tL + 0.4, 0.35)
sting(s, END - 0.6, S=RFHV)

# every pop word gets a tick
for cp in EV['captions']:
    for j, w in enumerate([w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]):
        s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.2, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
