"""Again Urged (The Brink 3) — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's sounds
against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.

Sober, like the strand: no alarms, no engines screaming. The cockpit is a low drone and the panel's hum; on "stop" the
screen tears with a short digital crackle and the GPS lamp blips three times. The chart rustles open panel by panel,
and on "around the clock" the clock's ratchet runs a whole day. Geneva is a quiet room: four envelopes are thrown and
tap into the tray, the brass nameplate flips up. Then three stamps, each harder than the last, the third with a thump
and the desk's jolt. At the door the slot's flap clanks three times, the letters land on the pile, and on "none" the
last stamp comes down on the closed door. The schedules here mirror scenes/au_kit.js, so the sound lands on the
picture in every language.

    uv run --with numpy --with soundfile python papercut/again-urged/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json, math
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, tick, tap, foley, stinger, WHOOSH
from rfsound import noise, hum, glock, sparkle, chime, card_flip, press_stamp, paper_slide, thump, blip, tinny, clank, clock_tick, whir, rustle, room, page_flutter

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
clamp = lambda v, a, b: max(a, min(b, v))


def drone(d):
    """the cabin: a low engine drone and the panel's electric hum"""
    import numpy as np
    x = noise(d, 60, 420) * 0.8 + hum(98, d) * 0.6
    t = np.arange(len(x)) / 48000
    return x * (0.85 + 0.15 * np.sin(2 * np.pi * t / 3.1))


# ── under everything: the station's call, the bed lighter outside, the cabin, then a quiet room
motif(s, S[0] + 0.035, g=0.32)     # 35 ms in: a note on the very first sample rings the sign-off join's limiter
bed(s, S[0] + 0.5, S[1], quiet, level=1)
bed(s, S[1], END - 0.6, quiet)
s.fx(drone(S[2] - S[0]), S[0], 0.10, 0, name='the cabin')
s.fx(room(S[4] - S[2]) * 0.6, S[2], 0.06, 0, name='an office in Geneva')
s.fx(room(END - S[4], seed=12) * 0.5, S[4], 0.05, 0, name='a hall')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the screen: on "stop" the picture tears and the icon is in a lake; the GPS lamp blips three times
tJ = c('au_screen.jump')
s.fx(tinny(noise(0.16, 1500, 9000)), tJ, 0.35, 0.0, name='"stop": the screen tears'); accent(s, tJ, S[1], 0.28, name='stop')
for k in range(3): s.fx(blip(1320), tJ + 0.2 + k * 0.625, 0.16, 0.25, name=f'GPS lamp {k + 1}')

# ── 2 · the chart: lifted into frame, unfolded panel by panel; on "around the clock" the clock runs a day
tU, tS = c('au_chart.unfold'), c('au_chart.spin')
s.fx(paper_slide(0.5), tU - 0.5, 0.3, -0.2, name='the chart comes up'); s.fx(rustle(0.7), tU, 0.5, -0.1, name='it opens')
for k in range(3): s.fx(card_flip(), tU + 0.1 + (k + 0.5) / 3, 0.28, -0.1 + 0.1 * k, name=f'panel {k + 2}')
inv_io = lambda p: (p / 4) ** (1 / 3) if p < 0.5 else 1 - (2 * (1 - p)) ** (1 / 3) / 2   # the kit's ease.io, inverted
for k in range(1, 25):                                # a tick each time the minute hand passes twelve: 24 in a day
    s.fx(clock_tick(tock=k % 2 == 1), tS + 1.5 * inv_io(k / 24), 0.10, 0.35, name=f'the clock {k}')
s.fx(whir(300, 900, 1.5) * 0.5, tS, 0.07, 0.35, name='a whole day goes round'); accent(s, tS, S[1], 0.28, name='around the clock')

# ── 3 · Geneva: four envelopes thrown into the tray; on "ITU" the nameplate flips up
tE, tP = c('au_post.env'), c('au_post.plate')
gap = clamp((tP - 0.3 - tE) / 4, 0.28, 0.5)
for i in range(4):
    t0 = tE + i * gap
    s.fx(swish(), t0 + 0.05, 0.18, -0.6 + 0.3 * i, name=f'envelope {i + 1} thrown'); s.fx(tap(dull=True), t0 + 0.55, 0.32, 0.3, name=f'envelope {i + 1} lands')
s.fx(card_flip(), tP - 0.02, 0.4, -0.3, name='"ITU": the nameplate flips up'); s.fx(clank(0.5, 980), tP + 0.06, 0.18, -0.3); accent(s, tP, S[1], 0.3, name='ITU')

# ── 4 · the stamps: URGE, AGAIN URGE, STRONGLY URGE, each harder; letters sent and slid in between
T4 = [c('au_stamp.s1'), c('au_stamp.s2'), c('au_stamp.s3')]
for i, t in enumerate(T4):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.18 + 0.06 * i, 0, at=t - 0.02, name=f'stamp {i + 1} comes down')
    s.fx(press_stamp(0.8 + 0.2 * i), t, 0.7 + 0.12 * i, 0, name=['"urged": URGE', 'AGAIN URGE', 'STRONGLY URGE'][i])
    if i == 2: s.fx(thump(), t, 0.5, 0, name='the desk jumps'); s.fx(stinger('deadpan'), t + 0.7, 0.35)
    if i < 2:
        tout = t + min(0.55, (T4[i + 1] - t) * 0.38)
        s.fx(paper_slide(0.35, seed=20 + i), tout, 0.3, 0.3, name=f'letter {i + 1} sent'); s.fx(paper_slide(0.3, seed=30 + i), t + 0.55, 0.22, -0.3, name=f'letter {i + 2} in')
    accent(s, t, S[1], 0.22 + 0.04 * i, name=['urged', 'again urged', 'strongly urged'][i])

# ── 5 · the door: three letters through the slot onto the pile; on "none" the stamp comes down on the door
t1, t3, tN = c('au_pile.l1'), c('au_pile.l3'), c('au_pile.none')
for i, t in enumerate([t1, (t1 + t3) / 2, t3]):
    s.fx(clank(0.45, 1150), t - 0.3, 0.22, 0.1, name=f'the slot, letter {i + 1}'); s.fx(page_flutter(0.35, seed=40 + i), t - 0.1, 0.18, 0.1)
    s.fx(tap(dull=True), t + 0.27, 0.3, 0.1, name=f'letter {i + 1} on the pile')
s.fx(whoosh('short', 'in'), tN - WHOOSH['short'] * 0.8, 0.25, -0.1, at=tN - 0.02, name='the last stamp comes down')
s.fx(press_stamp(1.1), tN, 0.85, -0.1, name='"none": NO RESPONSE RECEIVED'); s.fx(thump(), tN, 0.35, -0.1); accent(s, tN, S[1], 0.3, name='none')
s.note(glock(81, 1.4, 0.6), tN + 0.03, 0.22, 0.1, 0.4, stem='motif', name='found'); s.fx(stinger('deadpan'), tN + 0.9, 0.45)
sting(s, END - 0.6)

# every later word of a multi-word pop ("around THE CLOCK") gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
