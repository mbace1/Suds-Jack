"""Ends in 3 (Global 2) — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's sounds
against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.

A street at dusk: a low murmur and the hum of the lamps. On "work" every phone wakes, a ripple of little screen ticks
in the order the picture lights them, and a bright chime. At the registry the room hums and the queue murmurs; a red
string is wound round a phone and a card (a long soft swish), and on "extortion and fraud" it is pulled tight: a knot,
a thump and the bow's pop. At the calendar the marker squeaks an X over the 3, the tally clicks up and lands on
"2.2 million" with a knock; then the marker crosses the 4 and rings the 5. Back on the street the unlinked phones
power down one by one (a falling blip), a thumb taps a dead screen twice, an ID card comes up, and on "linked" the
phone comes back with a rising blip. Then the alert: on "gets through" every phone at once, a soft two-tone warble
(an alert, never a quake: no rumble, no crash), and a deadpan sting. The schedules here mirror scenes/e3_kit.js.

    uv run --with numpy --with soundfile python papercut/ends-in-3/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
import numpy as np
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, tick, tap, foley, stinger, WHOOSH
from rfsound import hum, glide, ui_tick, thump, chime, crowd, office_hum, pencil, clock_tick, knock, phone_buzz, sparkle, tv

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]


def warble(cycles=3, f=(784.0, 988.0), half=0.21):
    """a soft two-tone alert: rounded sines, each half-cycle with its own small envelope — a phone's alert, not a siren"""
    out = []
    for i in range(cycles * 2):
        t = tv(half); fr = f[i % 2]
        out.append((np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(2 * np.pi * 2 * fr * t)) * np.sin(np.pi * t / half) ** 0.6 * 0.5)
    return np.concatenate(out)


# ── under everything: the station's call on the first frame, the bed, a street's murmur and its lamps
motif(s, S[0] + 0.035, g=0.32)     # 35 ms in: a note on the very first sample rings the sign-off join's limiter (Tailgated)
bed(s, S[0] + 0.5, S[1], quiet, level=1)
bed(s, S[1], END - 0.6, quiet)
s.fx(crowd(S[1] - S[0] - 0.2) * 0.35, S[0] + 0.1, 0.08, 0, name='the street: a low murmur')
s.fx(hum(60, S[1] - S[0]) * 0.5, S[0], 0.05, 0, name='the lamps')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the street: on "work" every phone wakes, in the order the picture lights them
tW = c('e3_street.work')
NB = 3                                     # e3_kit.js: three in the back row, four in front; 0.045 s a column
for i in range(7):
    t = tW + (i % NB) * 0.045 + (0.02 if i >= NB else 0)
    s.fx(ui_tick(3000 + 160 * (i % NB) + (200 if i >= NB else 0)), t, 0.08, -0.6 + 0.4 * (i % NB), name=f'a phone wakes {i + 1}')
s.fx(chime(84, 0.8), tW + 0.04, 0.2, 0, name='"work": every screen on'); s.fx(sparkle(88), tW + 0.06, 0.14, 0.2)
accent(s, tW, S[1], 0.25, name='work')

# ── 2 · the registry: the room, the queue; the string is wound on from line 2 and pulled tight on "extortion and fraud"
tL, tT = c('e3_ledger.lace'), c('e3_ledger.tie')
s.fx(office_hum(S[2] - S[1]) * 0.6, S[1], 0.12, 0, name='the registry: fluorescent hum')
s.fx(crowd(S[2] - S[1] - 0.4) * 0.3, S[1] + 0.2, 0.08, 0, name='the queue murmurs')
for j in range(3): s.fx(foley('card', 'tap', 0.5), S[1] + 0.5 + j * 0.62, 0.12, -0.4 + 0.4 * j, name=f'an ID card held up {j + 1}')
wind = max(0.5, tT - 0.2 - tL)
for j in range(int(wind / 0.28) + 1): s.fx(swish(), tL + j * 0.28, 0.12, -0.3 + 0.2 * (j % 4), name=f'the string wound round {j + 1}')
s.fx(foley('card', 'slide'), tT - 0.05, 0.4, 0, name='phone and card pulled together')
s.fx(thump(), tT, 0.4, 0, name='"extortion and fraud": the knot'); s.fx(pop(1.1), tT + 0.06, 0.3, 0.1, name='the bow')
accent(s, tT, S[1], 0.28, name='extortion and fraud')

# ── 3 · the calendar: the marker crosses out the 3 from line 1; the tally clicks up over 0.7 s and lands on the pop;
#      then the 4 crossed (pop + 0.85, 0.4 s) and the 5 ringed (pop + 1.55, 0.45 s), as e3_kit.js marks3()
tX, tN = c('e3_cal.cross'), c('e3_cal.count')
s.fx(pencil(0.5, seed=3), tX, 0.85, 0.15, name='the marker: an X over the 3'); s.fx(swish(), tX, 0.25, 0.15)
n = 18
for j in range(n): s.fx(clock_tick(j % 2 == 1), tN - 0.7 + 0.7 * (j / n) ** 0.6, 0.18, 0.05, name=f'the tally {j + 1}')
s.fx(knock(0.8), tN, 0.6, 0, name='"2.2 million": 2,248,143'); s.fx(thump(), tN, 0.3, 0)
accent(s, tN, S[1], 0.3, name='2.2 million')
s.fx(pencil(0.4, seed=5), tN + 0.85, 0.75, 0.2, name='the 4 crossed out too')
s.fx(pencil(0.45, seed=7), tN + 1.55, 0.7, 0.25, name='the 5 ringed: next')

# ── 4 · the grey: the two unlinked 3s power down (from line 1 start, 0.35 s apart), a thumb taps a dead screen,
#      an ID card comes up, and on "linked" the phone comes back
tG, tK = c('e3_grey.grey'), c('e3_grey.linked')
for j in range(2): s.fx(glide(1400, 300, 0.32), tG + j * 0.35, 0.16, -0.2 + 0.4 * j, name=f'a 3 goes grey {j + 1}')
for j in range(2): s.fx(tap(dull=True), tG + 0.7 + j * 0.16, 0.25, -0.2, name=f'a tap on a dead screen {j + 1}')
s.fx(foley('card', 'slide'), tK - 0.45, 0.3, -0.2, name='the ID card comes up')
s.fx(glide(400, 1800, 0.25), tK, 0.16, -0.2, name='"linked": the phone comes back'); s.fx(chime(91, 0.5), tK + 0.08, 0.16, -0.2)
accent(s, tK, S[1], 0.26, name='linked')

# ── 5 · the alert: on "gets through" every phone at once, the grey one too; a soft two-tone warble and the buzz of ten
tA = c('e3_alert.alert')
s.fx(warble(3), tA, 0.22, 0, name='"gets through": the alert, on every phone')
for j in range(4): s.fx(phone_buzz(0.3), tA + 0.02 * j, 0.06, -0.5 + 0.33 * j, name=f'phones buzz {j + 1}')
accent(s, tA, S[1], 0.3, name='gets through'); s.fx(stinger('deadpan'), tA + 1.5, 0.45)
sting(s, END - 0.6)

# every later word of a multi-word pop ("extortion AND FRAUD", "gets THROUGH") gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
