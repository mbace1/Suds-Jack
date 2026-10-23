"""Again Urged (The Brink 3), VIRAL CUT — the cue sheet. The RFH bed driven at 124 BPM (the cut's grid, not the house
112), level 2 from the first beat, and the library's sounds against the plan's events (pipeline/plan.mjs), so the Finnish
and Japanese masters are scored by this same file.

Frame 1 is a hit: a thump and a knock under "Over Finland". At 0.3 s the screen tears (a short digital crackle) and the
GPS lamp blips. On "around the clock" the clock's ratchet runs a whole day. Geneva: four envelopes thrown into the tray,
the brass nameplate flips up on "radio body". Then the escalation: three stamps on one letter in quick succession, each
harder, the third with a thump and the desk's jolt. The hall: the slot's flap clanks, the letter lands on the pile, and
on "none" the stamp comes down on the closed door. Then the tear back into the cockpit: a crackle, a riser, the cabin's
drone back under the last frame, so the loop comes round on the frame-1 hit. The schedules here mirror
scenes/au_kit.js (the auv_* scenes).

    uv run --with numpy --with soundfile python papercut/again-urged-viral/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
import numpy as np
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, tick, tap, stinger, WHOOSH
from rfsound import noise, hum, glock, card_flip, press_stamp, thump, blip, tinny, clank, clock_tick, whir, room, page_flutter, glide, knock


class RFHV(RFH):
    """the house series at the viral cut's tempo: same key, chords, room and mix; 124 BPM"""
    BPM = 124
    B = 60 / 124


EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFHV)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 5)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
B = RFHV.B
clamp = lambda v, a, b: max(a, min(b, v))


def drone(d):
    """the cabin: a low engine drone and the panel's electric hum (as v1)"""
    x = noise(d, 60, 420) * 0.8 + hum(98, d) * 0.6
    t = np.arange(len(x)) / 48000
    return x * (0.85 + 0.15 * np.sin(2 * np.pi * t / 3.1))


# ── under everything: the bed from the first beat (the frame-1 hit is 35 ms in, never on the first sample: the sign-off
#    join's limiter), driving at level 2; the cabin under shot 1, a quiet room in Geneva, a hall, and the cabin again
#    under the tear, so the loop's last frame sounds like its first
tT = c('auv_none.tear')
bed(s, S[0] + B, END - 0.6, quiet, level=2, S=RFHV)
s.fx(drone(S[1] - S[0]), S[0], 0.10, 0, name='the cabin')
s.fx(room(S[3] - S[1]) * 0.6, S[1], 0.06, 0, name='an office in Geneva')
s.fx(room(tT - S[3], seed=12) * 0.5, S[3], 0.05, 0, name='a hall')
s.fx(drone(END - tT), tT, 0.10, 0, name='the cabin again: the loop')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.32, 0, at=t, name=f'cut {i + 2}')
    s.fx(thump(), t, 0.22, 0, name=f'cut {i + 2}: a beat on the cut')

# ── 1 · the hook: the hit on frame 1; at 0.3 s the screen tears and the GPS lamp blinks (au_kit gauges(): on for
#      1/3.2 s, every 0.625 s); on "around the clock" the clock runs a day (24 minute-hand passes over 1.5 s, ease.io)
tH, tJ, tS = c('auv_hook.hit'), c('auv_hook.jump'), c('auv_hook.spin')
s.fx(thump(), tH, 0.75, 0, name='frame 1: the hit'); s.fx(knock(0.9), tH, 0.45, 0, name='frame 1: the knock')
accent(s, tH, S[0], 0.3, S=RFHV, name='over Finland')
s.fx(tinny(noise(0.16, 1500, 9000)), tJ, 0.45, 0.0, name='0.3 s: the screen tears'); s.fx(thump(), tJ, 0.4, 0, name='the jump')
for k in range(4): s.fx(blip(1320), tJ + 0.2 + k * 0.625, 0.16 - 0.025 * k, 0.25, name=f'GPS lamp {k + 1}')
inv_io = lambda p: (p / 4) ** (1 / 3) if p < 0.5 else 1 - (2 * (1 - p)) ** (1 / 3) / 2   # the kit's ease.io, inverted
for k in range(1, 25):
    s.fx(clock_tick(tock=k % 2 == 1), tS + 1.5 * inv_io(k / 24), 0.10, 0.35, name=f'the clock {k}')
s.fx(whir(300, 900, 1.5) * 0.5, tS, 0.08, 0.35, name='a whole day goes round'); accent(s, tS, S[0], 0.3, S=RFHV, name='around the clock')

# ── 2 · Geneva: four envelopes thrown into the tray (au_kit auv_post: gap, 0.55 s flight); the nameplate on "radio body"
tE, tP = c('auv_post.env'), c('auv_post.plate')
gap = clamp((tP - 0.35 - tE) / 4, 0.2, 0.45)
for i in range(4):
    t0 = tE + i * gap
    s.fx(swish(), t0, 0.18, -0.6 + 0.3 * i, name=f'envelope {i + 1} thrown'); s.fx(tap(dull=True), t0 + 0.55, 0.32, 0.3, name=f'envelope {i + 1} lands')
s.fx(card_flip(), tP - 0.02, 0.4, -0.3, name='"radio body": the nameplate flips up'); s.fx(clank(0.5, 980), tP + 0.06, 0.18, -0.3)
accent(s, tP, S[0], 0.3, S=RFHV, name='radio body')

# ── 3 · the escalation: URGED, AGAIN URGED, STRONGLY URGED on one letter, each harder; the third shakes the desk
T3 = [c('auv_stamp.s1'), c('auv_stamp.s2'), c('auv_stamp.s3')]
for i, t in enumerate(T3):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.18 + 0.06 * i, 0, at=t - 0.02, name=f'stamp {i + 1} comes down')
    s.fx(press_stamp(0.8 + 0.2 * i), t, 0.7 + 0.12 * i, 0, name=['"urged": URGED', 'AGAIN URGED', 'STRONGLY URGED'][i])
    s.fx(thump(), t, 0.2 + 0.2 * i, 0, name=f'the desk, stamp {i + 1}')
    accent(s, t, S[0], 0.22 + 0.04 * i, S=RFHV, name=['urged', 'again', 'strongly'][i])
s.fx(knock(0.8), T3[2] + 0.01, 0.4, 0, name='the desk jumps')

# ── 4 · the door: the letter through the slot (au_kit falling(): 0.18 s through, then ~0.39 s down to the pile), and on
#      "none" the stamp on the closed door; then the tear back into frame 0
tF, tN = c('auv_none.drop'), c('auv_none.none')
s.fx(clank(0.45, 1150), tF, 0.24, 0.1, name='the slot'); s.fx(page_flutter(0.35, seed=41), tF + 0.18, 0.18, 0.1)
s.fx(tap(dull=True), tF + 0.57, 0.3, 0.1, name='the letter lands on the pile')
s.fx(whoosh('short', 'in'), tN - WHOOSH['short'] * 0.8, 0.25, -0.1, at=tN - 0.02, name='the last stamp comes down')
s.fx(press_stamp(1.1), tN, 0.85, -0.1, name='"none": NO RESPONSE RECEIVED'); s.fx(thump(), tN, 0.4, -0.1); accent(s, tN, S[0], 0.3, S=RFHV, name='none')
s.note(glock(81, 1.4, 0.6), tN + 0.03, 0.22, 0.1, 0.4, stem='motif', name='found'); s.fx(stinger('deadpan'), tN + 0.9, 0.4)
for j, (dt, g) in enumerate([(0.0, 0.42), (0.14, 0.3), (0.33, 0.2)]):
    s.fx(tinny(noise(0.14, 1500, 9000)), tT + dt, g, -0.2 + 0.2 * j, name=f'the tear {j + 1}')
s.fx(glide(260, 1900, 0.75) * 0.6, tT, 0.12, 0, name='the riser into the loop')
sting(s, END - 0.6, S=RFHV)

# every later word of a multi-word pop ("around THE CLOCK", "radio BODY") gets a knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
