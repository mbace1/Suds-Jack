"""For Your Protection (Global), VIRAL CUT: the cue sheet. The RFH bed driven at 140 BPM (the cut's grid, not the house
112), level 2 from the first beat, and the library's sounds against the plan's events (pipeline/plan.mjs), so the
Finnish and Japanese masters are scored by this same file.

Frame 1 is a hit: a thump and a knock, the town's murmur and its lamps under it. On "deal" the sealed envelope thumps.
The data centre rises behind the houses with a low hum and a groan of card, and lands on "in your town". Virginia: 31
pins tick on, 25 envelopes drop with a soft paper tap each, the counter clicks up and lands on 25. The reason: a quiet
room, the board flips on "insider trading" (a card flip, a knock). The end: on "void" the envelope tears and VOID is
stamped; the clipping rises on "clip"; the station's sting closes it.
The schedules here mirror scenes/fyp_kit.js (the fyp_* scenes).

    uv run --with numpy --with soundfile python papercut/for-your-protection/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
import numpy as np
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, pop, tick, tap, foley, stinger, WHOOSH
from rfsound import hum, glide, ui_tick, thump, chime, crowd, office_hum, pencil, knock


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


def tear(d=0.32, seed=5):
    """paper torn: band-limited noise in short irregular bursts, getting brighter as the tear runs"""
    r = np.random.default_rng(seed); n = int(d * 48000); t = np.arange(n) / 48000
    x = r.standard_normal(n); x = np.convolve(x, np.ones(6) / 6, mode='same') - np.convolve(x, np.ones(60) / 60, mode='same')
    bursts = (r.random(n) < 0.02).astype(float); bursts = np.convolve(bursts, np.hanning(400), mode='same')
    return x * (0.35 + bursts) * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.05) * 0.6


# ── under everything: the bed from the first beat (35 ms in, never on the first sample), driving at level 2; the
#    town's murmur and its lamps under shots 1, 2 and 5
bed(s, S[0] + B, END - 0.6, quiet, level=2, S=RFHV)
for a, b in ((S[0], S[2]), (S[4], END)):
    s.fx(crowd(b - a - 0.2) * 0.25, a + 0.1, 0.07, 0, name='the town: a low murmur')
    s.fx(hum(60, b - a) * 0.4, a, 0.04, 0, name='the lamps')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.32, 0, at=t, name=f'cut {i + 2}')
    s.fx(thump(), t, 0.22, 0, name=f'cut {i + 2}: a beat on the cut')

# ── 1 · the hook: the hit on frame 1; on "deal" the envelope thumps on the steps
tD = c('fyp_hook.deal')
s.fx(thump(), S[0] + 0.035, 0.75, 0, name='frame 1: the hit'); s.fx(knock(0.9), S[0] + 0.035, 0.45, 0, name='frame 1: the knock')
accent(s, S[0] + 0.035, S[0], 0.3, S=RFHV, name='frame 1')
s.fx(thump(), tD, 0.5, 0, name='"deal": the envelope'); s.fx(foley('card', 'tap'), tD, 0.4, 0); s.fx(chime(88, 0.4), tD + 0.05, 0.12, 0.2, name='the seal glints')

# ── 2 · the data centre rises behind the houses and lands on "in your town"
tR, tI = c('fyp_build.rise'), c('fyp_build.in')
s.fx(hum(50, max(0.5, END - tR)) * 0.35, tR, 0.06, 0, name='the data centre: its hum, from here on')
s.fx(glide(90, 160, max(0.3, tI - tR)), tR, 0.22, 0, name='the box rises: a groan of card')
s.fx(swish(), tR + 0.1, 0.16, -0.2)
s.fx(thump(), tI, 0.6, 0, name='"in your town": it lands'); s.fx(knock(0.7), tI + 0.02, 0.35, 0.1)
accent(s, tI, S[0], 0.3, S=RFHV, name='in your town')

# ── 3 · Virginia: 31 pins tick on (fyp_kit: tP + i * 0.025), 25 envelopes drop over [tP + 0.9, tN - 0.1]
tP, tN = c('fyp_va.pins'), c('fyp_va.n')
s.fx(office_hum(S[3] - S[2]) * 0.4, S[2], 0.07, 0, name='a records office: fluorescent hum')
for i in range(31):
    if i % 2 == 0: s.fx(ui_tick(2200 + (i % 5) * 120), tP + i * 0.025, 0.07, -0.4 + 0.8 * i / 30, name='the pins' if i == 0 else f'pin {i + 1}')
tE = tP + 0.9; span = max(0.6, tN - tE - 0.1)
for n in range(25):
    t = tE + (n / 25) * span + 0.18
    if n % 2 == 0 or n == 24: s.fx(tap(), t, 0.12 + 0.004 * n, -0.3 + 0.6 * ((n * 7) % 25) / 25, name='an envelope lands' if n == 0 else f'envelope {n + 1}')
s.fx(knock(0.9), tN, 0.45, 0, name='"25 of 31": the counter lands'); accent(s, tN, S[0], 0.3, S=RFHV, name='25 of 31')

# ── 4 · the reason: a quiet room; the board flips on the pop word
tF = c('fyp_why.flip')
s.fx(office_hum(S[4] - S[3]) * 0.5, S[3], 0.08, 0, name='the briefing room')
s.fx(foley('card', 'slide'), tF - 0.1, 0.35, -0.2, name='the board flips'); s.fx(knock(0.8), tF, 0.4, -0.1, name='"insider trading"')
accent(s, tF, S[0], 0.3, S=RFHV, name='insider trading')

# ── 5 · on "void" the envelope tears and VOID is stamped; the clipping rises on "clip"; the sting
tB, tC = c('fyp_end.tear'), c('fyp_end.clip')
s.fx(tear(0.34), tB - 0.06, 0.5, 0, name='"banned": the envelope tears')
s.fx(thump(), tB + 0.12, 0.55, 0, name='VOID: the stamp'); s.fx(pencil(0.2, seed=9), tB + 0.12, 0.3, 0.15)
accent(s, tB, S[0], 0.34, S=RFHV, name='banned')
s.fx(foley('card', 'slide'), tC - 0.25, 0.35, -0.1, name='the clipping rises'); s.fx(foley('card', 'tap'), tC, 0.4, 0, name='"clip": the clipping lands')
s.fx(stinger('deadpan'), tC + 0.4, 0.35)
sting(s, END - 0.6, S=RFHV)

# every pop word gets a tick (the first one too: the cut lands on it)
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    if pw: s.fx(tick(0, down=False), pw[0]['t'] + 0.03, 0.2, 0.1, name=f'pop word {pw[0]["w"]}')
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
