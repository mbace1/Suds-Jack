"""Ends in 3 (Global 2), VIRAL CUT v4 (v3 registry hook; v4 splits HOW into the last digit and the 31 Oct deadline) — the cue sheet. The RFH bed driven at 124 BPM (the cut's grid, not the house
112), level 2 from the first beat, and the library's sounds against the plan's events (pipeline/plan.mjs), so the Finnish
and Japanese masters are scored by this same file.

Frame 1 is a hit: a thump and a knock. On "2.2 million" the unlinked 3s die: two power-downs, a flicker of ticks, a buzz.
WHY, the registry: a grey phone and an ID card apart; the string wound on from line 2, pulled tight on "extortion"
(knot, thump, bow), and the phone comes back on (a rising glide, a chime). HOW, by last digit: the slip's digit flips
and the marker's X lands on the 3 on "3s", on the 4 on "4s", the 5 is ringed on "5s", then 6, 7, 8, 9 light in turn,
a rising tick each (it rolls on). The alert: dull taps on a dead screen on "No calls", then on "get through" every
phone at once, a soft two-tone warble (never a quake), and the station's sting.
The schedules here mirror scenes/e3_kit.js (the e3v_* scenes).

    uv run --with numpy --with soundfile python papercut/ends-in-3-viral/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
import numpy as np
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, pop, tick, tap, foley, stinger, WHOOSH
from rfsound import hum, glide, ui_tick, thump, chime, crowd, office_hum, pencil, knock, phone_buzz, sparkle, tv


class RFHV(RFH):
    """the house series at the viral cut's tempo: same key, chords, room and mix; 124 BPM"""
    BPM = 124
    B = 60 / 124


EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFHV)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
B = RFHV.B


def warble(cycles=3, f=(784.0, 988.0), half=0.21):
    """a soft two-tone alert: rounded sines, each half-cycle with its own small envelope — a phone's alert, not a siren"""
    out = []
    for i in range(cycles * 2):
        t = tv(half); fr = f[i % 2]
        out.append((np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(2 * np.pi * 2 * fr * t)) * np.sin(np.pi * t / half) ** 0.6 * 0.5)
    return np.concatenate(out)


# ── under everything: the bed from the first beat (35 ms in, never on the first sample: the sign-off join's limiter),
#    driving at level 2; the street's murmur and its lamps under shot 1
bed(s, S[0] + B, END - 0.6, quiet, level=2, S=RFHV)
s.fx(office_hum(S[1] - S[0]) * 0.5, S[0], 0.1, 0, name='the registry: fluorescent hum (v3: the hook)')
s.fx(crowd(S[2] - S[1] - 0.2) * 0.3, S[1] + 0.1, 0.08, 0, name='the street: a low murmur')
s.fx(hum(60, S[2] - S[1]) * 0.5, S[1], 0.05, 0, name='the lamps')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.32, 0, at=t, name=f'cut {i + 2}')
    s.fx(thump(), t, 0.22, 0, name=f'cut {i + 2}: a beat on the cut')

# ── 1 · v3 hook, the registry (owner, 24 Oct: the rule first): the hit on frame 1; the string, a third wound already,
#      winds on and is pulled tight on "ID"; the phone comes back on (linked = it works)
tH, tT = c('e3v3_hook.hit'), c('e3v3_hook.tie')
s.fx(thump(), tH, 0.75, 0, name='frame 1: the hit'); s.fx(knock(0.9), tH, 0.45, 0, name='frame 1: the knock')
accent(s, tH, S[0], 0.3, S=RFHV, name='frame 1')
wind = max(0.5, tT - 0.2)
for j in range(int(wind / 0.24) + 1): s.fx(swish(), 0.15 + j * 0.24, 0.12, -0.3 + 0.2 * (j % 4), name=f'the string wound round {j + 1}')
s.fx(foley('card', 'slide'), tT - 0.05, 0.4, 0, name='phone and card pulled together')
s.fx(thump(), tT, 0.45, 0, name='"ID": the knot'); s.fx(pop(1.1), tT + 0.06, 0.3, 0.1, name='the bow')
s.fx(glide(400, 1800, 0.25), tT + 0.08, 0.16, -0.2, name='linked: the phone comes back'); s.fx(chime(91, 0.5), tT + 0.14, 0.14, -0.2)
accent(s, tT, S[0], 0.3, S=RFHV, name='ID')

# ── 2 · the street: on "Cut off." the unlinked 3s die at once (flicker on, off, on, gone)
tD = c('e3v_hook.dark')
for j, side in enumerate((-0.35, 0.35)): s.fx(glide(1500, 180, 0.3), tD + 0.18 + j * 0.02, 0.2, side, name=f'a 3 dies {j + 1}')
for j in range(2): s.fx(ui_tick(2600 - j * 500), tD + j * 0.12, 0.16, 0, name=f'the 3s flicker {j + 1}')
s.fx(phone_buzz(0.25), tD, 0.1, 0, name='"Cut off.": the screens go'); s.fx(knock(0.8), tD, 0.4, 0, name='"Cut off."')
accent(s, tD, S[0], 0.3, S=RFHV, name='cut off')

# ── 3 · v4, the last digit (owner, 24 Oct: the calendar beat was confusing): the full number on a card; on "last
#      digit" the marker rings the final digit, an arrow drops to the date chip (31 OCT): e3_kit.js e3v4_digit
tR = c('e3v4_digit.ring')
s.fx(pencil(0.4, seed=5), tR - 0.05, 0.7, 0.2, name='the last digit ringed')
s.fx(knock(0.85), tR, 0.4, 0, name='"last digit"'); accent(s, tR, S[0], 0.3, S=RFHV, name='last digit')
s.fx(pencil(0.3, seed=6), tR + 0.4, 0.6, 0.15, name='the arrow down')
s.fx(pop(1.0), tR + 0.75, 0.3, 0.1, name='the date chip lands'); s.fx(ui_tick(2200), tR + 0.78, 0.14, 0.1)

# ── 4 · v4, ends in 5? 0–4 already crossed (CUT OFF); the 5 ringed on "31 Oct"; then 6, 7, 8, 9 light in turn:
#      e3_kit.js ROLL(t5, d) = t5 + 0.62 + (d - 6) * 0.22
t5 = c('e3v4_cal.five')
s.fx(pencil(0.36, seed=7), t5 - 0.04, 0.7, 0.2, name='the 5 ringed')
s.fx(chime(88, 0.6), t5, 0.22, 0.1, name='"31 Oct": the deadline'); accent(s, t5, S[0], 0.3, S=RFHV, name='31 Oct')
for d in range(6, 10): s.fx(tick(d - 6, down=False), t5 + 0.62 + (d - 6) * 0.22, 0.35, -0.3 + 0.2 * (d - 6), name=f'the {d} lights: it rolls on')

# ── 5 · the alert: "No calls" — two dull taps on a dead screen; on "get through" every phone at once, a soft warble
tP, tA = c('e3v_alert.tap'), c('e3v_alert.alert')
for j in range(2): s.fx(tap(dull=True), tP + j * 0.16, 0.28, -0.2, name=f'a tap on a dead screen {j + 1}')
s.fx(warble(3), tA, 0.24, 0, name='"get through": the alert, on every phone')
for j in range(4): s.fx(phone_buzz(0.3), tA + 0.02 * j, 0.06, -0.5 + 0.33 * j, name=f'phones buzz {j + 1}')
accent(s, tA, S[0], 0.3, S=RFHV, name='get through'); s.fx(stinger('deadpan'), tA + 1.2, 0.4)
sting(s, END - 0.6, S=RFHV)

# every later word of a multi-word pop ("2.2 MILLION", "extortion, FRAUD", "get THROUGH") gets a tick
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
