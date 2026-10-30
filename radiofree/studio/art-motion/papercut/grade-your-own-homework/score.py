"""Grade Your Own Homework (RFH Brink/Coxon), VIRAL CUT: the cue sheet. The RFH bed driven at 140 BPM (the viral
grid), level 2 from the first beat, and the library's sounds against the plan's events (pipeline/plan.mjs), so the
Finnish and Japanese masters are scored by this same file.

Frame 1 is a hit: a thump and a knock, an office hum under the desk. On "four" four contracts fan out of the folder
(four paper flips). The contract slides in; on "forecast" a highlighter squeaks across the clause. The page turns over
(a card flip) into an exam; on "interest" the red pen writes the same name on MARKED BY. The end: five quick ticks,
the A+ on "homework" (a pen flourish and a knock), SELF-GRADED stamped, a soft chime under the disclosure, and the exam
drops back into the folder (a paper slide and tap); the station's sting closes it.
The schedules here mirror scenes/gyh_kit.js (the gyh_* scenes).

    uv run --with numpy --with soundfile python papercut/grade-your-own-homework/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, tick, foley, stinger, WHOOSH
from rfsound import thump, chime, office_hum, pencil, knock


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

# ── under everything: the bed from the first beat (35 ms in, never on the first sample), driving at level 2; an office
#    hum under the desk
bed(s, S[0] + B, END - 0.6, quiet, level=2, S=RFHV)
s.fx(office_hum(END - 0.8) * 0.4, S[0] + 0.05, 0.06, 0, name='the office: a fluorescent hum')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.32, 0, at=t, name=f'cut {i + 2}')
    s.fx(thump(), t, 0.22, 0, name=f'cut {i + 2}: a beat on the cut')

# ── 1 · the hook: the hit on frame 1; on "four" four contracts fan out of the folder
tF = c('gyh_hook.four')
s.fx(thump(), S[0] + 0.035, 0.75, 0, name='frame 1: the hit'); s.fx(knock(0.9), S[0] + 0.035, 0.45, 0, name='frame 1: the knock')
accent(s, S[0] + 0.035, S[0], 0.3, S=RFHV, name='frame 1')
for i in range(4):
    s.fx(foley('paper', 'flip', 0.8 + 0.05 * i), tF - 0.1 + i * 0.08, 0.32, -0.45 + 0.3 * i, name='"four": the contracts fan out' if i == 0 else f'contract {i + 1}')
accent(s, tF, S[0], 0.3, S=RFHV, name='four')

# ── 2 · the contract slides in; on "forecast" the highlighter squeaks across the clause
tS, tM = c('gyh_task.slide'), c('gyh_task.mark')
s.fx(foley('paper', 'slide'), tS, 0.4, 0, name='the contract slides in')
s.fx(pencil(0.42, seed=3), tM - 0.08, 0.38, -0.1, name='"forecast": the highlighter, line one')
s.fx(pencil(0.36, seed=5), tM + 0.2, 0.3, 0.1, name='the highlighter, line two')
accent(s, tM, S[0], 0.3, S=RFHV, name='forecast')

# ── 3 · the page turns over into an exam; on "interest" the red pen writes the same name on MARKED BY
tFl, tR = c('gyh_critic.flip'), c('gyh_critic.red')
s.fx(foley('card', 'slide'), tFl, 0.36, -0.15, name='the page turns over'); s.fx(foley('paper', 'flip'), tFl + 0.22, 0.3, 0.1)
s.fx(pencil(0.55, seed=7), tR - 0.12, 0.42, 0.2, name='"interest": the red pen writes'); s.fx(knock(0.7), tR, 0.3, 0.1)
accent(s, tR, S[0], 0.3, S=RFHV, name='conflict of interest')

# ── 4 · five ticks (gyh_kit: tT + j * step), the A+ on "homework", SELF-GRADED, the disclosure, back into the folder
tT, tG, tSt, tD = c('gyh_end.ticks'), c('gyh_end.grade'), c('gyh_end.stamp'), c('gyh_end.disclose')
step = max(0.16, (tG - 0.25 - tT) / 5)
for j in range(5):
    s.fx(pencil(0.12, seed=11 + j), tT + j * step, 0.34, 0.25, name='the ticks' if j == 0 else f'tick {j + 1}')
s.fx(pencil(0.4, seed=17), tG - 0.05, 0.42, 0.25, name='"homework": A+'); s.fx(knock(0.95), tG + 0.05, 0.4, 0.2)
accent(s, tG, S[0], 0.34, S=RFHV, name='homework')
s.fx(thump(), tSt, 0.55, 0, name='SELF-GRADED: the stamp'); s.fx(knock(0.8), tSt + 0.01, 0.3, 0)
s.fx(stinger('deadpan'), tSt + 0.35, 0.35)
s.fx(chime(76, 0.6), tD, 0.1, -0.2, name='the disclosure')
tOut = END - 1.05
s.fx(swish(), tOut + 0.1, 0.25, 0, name='the exam drops back into the folder'); s.fx(foley('paper', 'tap'), tOut + 0.85, 0.3, 0)
sting(s, END - 0.6, S=RFHV)

# every pop word gets a tick (the first one too: the cut lands on it)
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.2, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
