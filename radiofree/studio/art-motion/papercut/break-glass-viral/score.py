"""Break Glass in Emergency (The Brink 2), VIRAL CUT — the cue sheet. The RFH bed driven at 124 BPM (the cut's grid, not
the house 112), level 2 from the first beat, and the library's sounds against the plan's events (pipeline/plan.mjs), so
the Finnish and Japanese masters are scored by this same file.

Frame 1 is a hit: a thump and a knock, the snow knocked off the case. On "never used" the stamp comes down again. What
the law is for: the lamp clicks on at "In an emergency,", the glass glints on "stop", the tag drops on. The escalation,
one line a year: 2025 struck, 2026 written, 2026 struck and 2028 written on the pop, a thump and a chime on it, then the
days blow past as wind. The desk: NONE ringed on "No changes at all.", the rubber stamp on "agreed", two DISSENT
cards. The end: NEVER USED stamped on "Never used.", the glass
rings on "temporary", 2028 ringed on line 3, and the station's sting. Still sober: no alarms, no drums of war.
The schedules here mirror scenes/bge_kit.js (the bgev_* scenes).

    uv run --with numpy --with soundfile python papercut/break-glass-viral/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
import numpy as np
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, tick, tap, foley, stinger, WHOOSH
from rfsound import noise, hum, glock, sparkle, chime, card_flip, pencil, lamp_click, press_stamp, paper_slide, tag_pop, pin_wobble, thump, knock


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


def wind(d, lo=180, hi=1400):
    """night wind: band-limited noise that swells in and out (v1's)"""
    x = noise(d, lo, hi); n = len(x); t = np.arange(n) / 48000
    return x * (0.55 + 0.45 * np.sin(2 * np.pi * t / max(1.0, d) - np.pi / 2) ** 2)


# ── under everything: the bed from the first beat (never on the first sample: the sign-off join's limiter), driving at
#    level 2; wind at the wall all through, quieter at the desk
bed(s, S[0] + B, END - 0.6, quiet, level=2, S=RFHV)
s.fx(wind(S[3] - S[0]) * 0.5, S[0] + 0.04, 0.08, -0.2, name='wind on the wall')
s.fx(wind(END - S[4]) * 0.5, S[4], 0.08, 0.2, name='wind again')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.32, 0, at=t, name=f'cut {i + 2}')
    s.fx(thump(), t, 0.22, 0, name=f'cut {i + 2}: a beat on the cut')

# ── 1 · the hook: the hit on frame 1 (snow off the case), then the stamp comes down again on "never used" (bgev_hook)
tH, tP1 = c('bgev_hook.hit'), c('bgev_hook.stamp')
s.fx(thump(), tH, 0.75, 0, name='frame 1: the hit'); s.fx(knock(0.9), tH, 0.45, 0, name='frame 1: the knock')
s.fx(press_stamp(1.0), tP1, 0.85, 0, name='"never used": stamped'); s.fx(thump(), tP1, 0.4, 0)
accent(s, tP1, S[0], 0.3, S=RFHV, name='never used')

# ── 2 · what the law is for (bgev_year): the lamp clicks on at "In an emergency,", the glass glints on "stop", and at
#      the end of the sentence the tag drops on (VALID TO 2025)
tL, tP2, tT = c('bgev_year.lamp'), c('bgev_year.stop'), c('bgev_year.tag')
s.fx(lamp_click(), tL, 0.55, -0.3, name='"In an emergency,": the lamp clicks on'); s.fx(hum(100, 0.4) * 0.4, tL + 0.02, 0.05, -0.3)
s.fx(sparkle(91), tP2, 0.22, 0, name='"stop": the glass glints'); accent(s, tP2, S[0], 0.28, S=RFHV, name='stop')
s.fx(tag_pop(), tT, 0.45, 0.3, name='the tag drops on: VALID TO 2025'); s.fx(card_flip(), tT + 0.02, 0.35, 0.3); s.fx(tap(), tT + 0.04, 0.25, 0.3)
s.fx(pin_wobble(0.6, 980), tT + 0.3, 0.12, 0.3, name='it swings')

# ── 3 · the escalation, one line a year (mirrors marks3v): 2025 struck from line 1's end (0.26 s), 2026 written at line
#      2's end, 2026 struck from max(write1 + 0.47, pop - 0.4) (0.2 s), 2028 written once it is through; the step on the pop
tS1, tW1, tW2 = c('bgev_again.strike1'), c('bgev_again.write1'), c('bgev_again.write2')
tS2 = max(tW1 + 0.47, tW2 - 0.4); tW28 = max(tW2, tS2 + 0.2)
s.fx(swish(), tS1, 0.3, 0.3, name='"2025.": struck'); s.fx(pencil(0.26, seed=2), tS1, 0.9, 0.3)
s.fx(pencil(0.45, seed=4), tW1, 0.75, 0.3, name='"2026.": written'); s.fx(tick(1, down=False), tW1, 0.2, 0.3)
s.fx(swish(), tS2, 0.32, 0.3, name='2026 struck'); s.fx(pencil(0.2, seed=6), tS2, 0.9, 0.3)
s.fx(thump(), tW2, 0.45, 0, name='"2028": the view steps in'); s.fx(knock(0.8), tW2, 0.3, 0)
s.fx(pencil(0.45, seed=8), tW28, 0.8, 0.3, name='"2028", written'); s.fx(chime(88, 0.7), tW2 + 0.03, 0.18, 0.1); accent(s, tW2, S[0], 0.3, S=RFHV, name='2028')
dd3 = S[3] - S[2]
for i in range(8):
    t = S[2] + dd3 * (i + 0.5) / 8; s.fx(wind(0.8, 300, 2600) * 0.6, t - 0.4, 0.06, -0.6 + 1.2 * i / 7, name=f'a day {i + 1}')

# ── 4 · the desk: NONE ringed on line 1 (marks4v: from max(0.22 s, none - 0.2), 0.42 s), the stamp on "agreed", two DISSENT cards
tN, tP = c('bgev_desk.none'), c('bgev_desk.stamp')
tR = max(S[3] + 0.22, tN - 0.2)
s.fx(paper_slide(0.4), S[3] + 0.06, 0.22, 0, name='paper on the desk')
s.fx(pencil(0.42, seed=10), tR, 0.85, 0.2, name='NONE, ringed'); s.fx(swish(), tN, 0.25, 0.2, name='"Unchanged."')
s.fx(whoosh('short', 'in'), tP - WHOOSH['short'] * 0.8, 0.25, -0.2, at=tP - 0.02, name='the stamp comes down')
s.fx(press_stamp(1.0), tP, 0.85, -0.2, name='"agreed": stamped'); s.fx(thump(), tP, 0.35, -0.2); accent(s, tP, S[0], 0.3, S=RFHV, name='agreed')
for j, d in enumerate([0.55, 0.85]): s.fx(paper_slide(0.3, seed=11 + j), tP + d, 0.45, 0.5, name=f'a DISSENT card {j + 1}'); s.fx(tap(dull=True), tP + d + 0.28, 0.3, 0.5)
s.fx(stinger('deadpan'), tP + 1.4, 0.3)

# ── 5 · the end: NEVER USED stamped on "Never used.", the glass rings on "temporary", 2028 ringed on line 3
tS5, tG, tM = c('bgev_tail.stamp'), c('bgev_tail.gleam'), c('bgev_tail.mark')
s.fx(whoosh('short', 'in'), tS5 - WHOOSH['short'] * 0.8, 0.22, 0, at=tS5 - 0.03, name='the stamp comes down')
s.fx(press_stamp(1.0), tS5, 0.9, 0, name='"Never used.": stamped'); s.fx(thump(), tS5, 0.45, 0); s.fx(knock(0.8), tS5, 0.25, 0)
s.fx(sparkle(93), tG, 0.32, 0, name='"temporary": the glass, whole, rings'); s.fx(chime(88, 0.9), tG + 0.03, 0.14, 0)
accent(s, tG, S[0], 0.3, S=RFHV, name='temporary')
s.fx(swish(), tM, 0.4, 0.3, name='"2028": ringed'); s.fx(pencil(0.42, seed=12), tM, 0.9, 0.3)
s.note(glock(88, 1.4, 0.7), tM + 0.02, 0.28, 0.1, 0.4, stem='motif', name='found')
s.fx(stinger('deadpan'), tM + 0.9, 0.4)
sting(s, END - 0.6, S=RFHV)

# every later word of a multi-word pop ("never USED") gets a knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
