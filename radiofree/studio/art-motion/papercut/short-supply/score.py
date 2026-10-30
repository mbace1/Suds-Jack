"""Short Supply (Global), VIRAL CUT: the cue sheet. The RFH bed driven at 140 BPM (the cut's grid, not the house 112),
level 2 from the first beat, and the library's sounds against the plan's events (pipeline/plan.mjs), so the Finnish and
Japanese masters are scored by this same file.

Frame 1 is a hit: a thump and a knock in a shop after hours (the fridge-hum of the lights). On "$805" the clipping turns
over: a card flip and a knock. The line: carts rumble on the rail and click over its joints, the data centre hums, and on
"AI" its sign lights with a rising glide and a chime. The desk: the complaint slides in, ALLEGED is stamped on "planned".
The motion slides over it, the calendar pops on, and on "dismiss" the motion lands with a gavel's knock. The end: on
"$805" the till rings and the receipt prints (a printer's chatter); the clipping turns back to June; the station's sting.
The schedules here mirror scenes/ssu_kit.js (the ssu_* scenes).

    uv run --with numpy --with soundfile python papercut/short-supply/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
import numpy as np
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, tick, foley, stinger, WHOOSH
from rfsound import hum, glide, thump, chime, knock, office_hum, ui_tick, stamp, press_stamp, paper_slide, tag_pop, gavel, bell


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
SR = 48000


def rumble(d, seed=3):
    """a loaded cart on a rail: low band noise, a slow wobble"""
    r = np.random.default_rng(seed); n = int(d * SR); t = np.arange(n) / SR
    x = r.standard_normal(n); x = np.convolve(x, np.ones(200) / 200, mode='same')
    return x * (0.7 + 0.3 * np.sin(2 * np.pi * 3.1 * t)) * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.3) * 3.0


def printer(d=0.5, seed=6):
    """a receipt printer: a fast buzzing chatter of tiny ticks"""
    r = np.random.default_rng(seed); n = int(d * SR); t = np.arange(n) / SR
    x = r.standard_normal(n) * (np.sin(2 * np.pi * 42 * t) > 0.2)
    x = np.convolve(x, np.ones(4) / 4, mode='same') - np.convolve(x, np.ones(40) / 40, mode='same')
    return x * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.04) * 0.35


# ── under everything: the bed from the first beat, driving at level 2; the shop's lights hum under shots 1 and 5
bed(s, S[0] + B, END - 0.6, quiet, level=2, S=RFHV)
for a, b in ((S[0], S[1]), (S[4], END)):
    s.fx(hum(120, b - a) * 0.35, a, 0.04, 0, name='the shop lights')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.32, 0, at=t, name=f'cut {i + 2}')
    s.fx(thump(), t, 0.22, 0, name=f'cut {i + 2}: a beat on the cut')

# ── 1 · the hook: the hit on frame 1; on "$805" the clipping turns over
tF = c('ssu_hook.flip')
s.fx(thump(), S[0] + 0.035, 0.75, 0, name='frame 1: the hit'); s.fx(knock(0.9), S[0] + 0.035, 0.45, 0, name='frame 1: the knock')
accent(s, S[0] + 0.035, S[0], 0.3, S=RFHV, name='frame 1')
s.fx(foley('card', 'slide'), tF - 0.12, 0.35, -0.1, name='the clipping turns over'); s.fx(knock(0.8), tF, 0.45, 0, name='"$805"')
accent(s, tF, S[0], 0.32, S=RFHV, name='$805')

# ── 2 · the line: carts rumble and click over the joints; the data centre hums; on "AI" the sign lights
tC, tA = c('ssu_ai.carts'), c('ssu_ai.ai')
s.fx(rumble(S[2] - tC - 0.1), tC, 0.16, -0.2, name='the carts rumble')
for j in range(int((S[2] - tC) / 0.22)):
    t = tC + 0.1 + j * 0.22
    if j % 2 == 0: s.fx(ui_tick(900 + (j % 3) * 80), t, 0.05, -0.5 + j * 0.05, name='rail joints' if j == 0 else f'rail joint {j + 1}')
s.fx(hum(55, S[2] - tA) * 0.5, tA, 0.07, 0.3, name='the data centre hums')
s.fx(glide(400, 1600, 0.35), tA - 0.25, 0.14, 0.4, name='the sign powers up'); s.fx(chime(88, 0.6), tA, 0.18, 0.4, name='"AI": the sign lights')
accent(s, tA, S[0], 0.3, S=RFHV, name='AI')

# ── 3 · the desk: the complaint slides in; "planned": ALLEGED is stamped
tD, tS = c('ssu_suit.doc'), c('ssu_suit.stamp')
s.fx(office_hum(S[4] - S[2]) * 0.4, S[2], 0.06, 0, name='a quiet office, under shots 3 and 4')
s.fx(paper_slide(0.4) * 5, tD, 0.26, -0.4, name='the complaint slides in'); s.fx(foley('paper', 'tap'), tD + 0.4, 0.3, -0.2)
s.fx(stamp(), tS, 0.55, 0.05, name='"planned": ALLEGED'); s.fx(press_stamp(1.0, seed=4), tS + 0.01, 0.4, 0.05)
accent(s, tS, S[0], 0.3, S=RFHV, name='planned')

# ── 4 · the motion slides over it, the calendar pops on, and on "dismiss" the motion lands (a gavel's knock)
tM, tCl, tT = c('ssu_dismiss.motion'), c('ssu_dismiss.cal'), c('ssu_dismiss.thud')
s.fx(paper_slide(0.45) * 5, tM, 0.26, 0.4, name='the motion slides in')
s.fx(tag_pop(1100), tCl, 0.22, 0.45, name='the hearing date pops on')
s.fx(thump(), tT, 0.45, 0.1, name='"dismiss": the motion lands'); s.fx(gavel(), tT + 0.01, 0.4, 0.1, name='"dismiss": a gavel')
accent(s, tT, S[0], 0.3, S=RFHV, name='dismiss')

# ── 5 · the end: on "$805" the till rings and the receipt prints; the clipping turns back to June; the sting
tP, tB = c('ssu_end.pay'), c('ssu_end.back')
s.fx(bell(), tP, 0.32, 0.3, name='"$805": the till rings'); s.fx(knock(0.6), tP, 0.3, 0.2)
s.fx(printer(0.5), tP - 0.05, 0.3, 0.45, name='the receipt prints')
for j in range(4): s.fx(ui_tick(2600 + j * 220), tP + 0.08 + j * 0.06, 0.08, 0.4, name='coins' if j == 0 else f'coin {j + 1}')
accent(s, tP, S[0], 0.32, S=RFHV, name='you pay')
s.fx(paper_slide(0.35) * 4, tB - 0.75, 0.2, 0.45, name='the receipt slides away')
s.fx(foley('card', 'slide'), tB - 0.15, 0.32, -0.1, name='the clipping turns back to June'); s.fx(foley('card', 'tap'), tB + 0.12, 0.35, 0)
s.fx(stinger('deadpan'), tP + 0.5, 0.3)
sting(s, END - 0.6, S=RFHV)

# every pop word gets a tick
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.2, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
