"""Approved Vendor (Global 1), VIRAL CUT — the cue sheet. The RFH bed driven at 124 BPM (the cut's grid, not the house
112), level 2 from the first beat, and the library's sounds against the plan's events (pipeline/plan.mjs), so the
Finnish and Japanese masters are scored by this same file.

Frame 1 is a hit: a thump and a knock, and a bright little chime as the cheerful banner bounces. At `open` the sun
opens into an eye (a creak, a low thump); on "spyware" it looks at us (a thump under the word). The laptop: keys
typing all through, and on "No click" a marker rings the parked cursor. The escalation: the camera pulls back from that
laptop to the newsroom of 45 (a long falling glide), on "targeted" their suns open one after another, a rising tick
each, faster and faster, and on `stare` every eye looks at us (thump, knock, a deadpan sting). The list riffles six
years and lands on "six years". The stamp winds up and comes down on "October"; then the whip back to the banner and
the eye shutting into the sun as the station's sting closes, so the end hands back into frame 1's hit.
The schedules here mirror scenes/av_kit.js (the avv_* scenes: ORDER for the eyes, flips() for the riffle).

    uv run --with numpy --with soundfile python papercut/approved-vendor-viral/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, pop, tick, tap, foley, stinger, WHOOSH
from rfsound import hum, glide, ui_tick, thump, chime, creak, sparkle, stamp, knock, pencil, office_hum


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

# ── under everything: the bed from the first beat (never on the first sample: the sign-off join's limiter), driving at
#    level 2; the newsroom's hum under the laptop and the room of 45
bed(s, S[0] + B, END - 0.6, quiet, level=2, S=RFHV)
s.fx(office_hum(S[3] - S[1]) * 0.45, S[1], 0.08, 0, name='the newsroom at night')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.32, 0, at=t, name=f'cut {i + 2}')
    s.fx(thump(), t, 0.2, 0, name=f'cut {i + 2}: a beat on the cut')

# ── 1 · the hook: the hit on frame 1 (35 ms in) and the banner's cheerful bounce; at `open` the sun opens into an eye;
#      on "spyware" it looks at us
tH, tO, tP = c('avv_hook.hit'), c('avv_hook.open'), c('avv_hook.spy')
s.fx(thump(), tH, 0.75, 0, name='frame 1: the hit'); s.fx(knock(0.9), tH, 0.4, 0, name='frame 1: the knock')
s.fx(chime(88, 0.5), tH + 0.01, 0.2, 0, name='the banner bounces, cheerfully'); s.fx(pop(1.2), tH, 0.25, 0)
s.fx(creak(0.32), tO, 0.45, 0, name='`open`: the sun opens into an eye'); s.fx(thump(), tO, 0.35, 0); s.fx(sparkle(84), tO + 0.05, 0.12, 0)
s.fx(thump(), tP, 0.5, 0, name='"spyware": it looks at us'); s.fx(knock(0.7), tP + 0.01, 0.3, 0)
accent(s, tP, S[0], 0.3, S=RFHV, name='spyware')
s.fx(tap(dull=True), tP + 1.7, 0.15, 0, name='a blink')

# ── 2 · the laptop: typing all through (nobody clicks); on "No click" the marker rings the parked cursor
tR = c('avv_noclick.ring')
t = S[1] + 0.12; n = 0
while t < S[2] - 0.3:
    s.fx(tick(n % 4, down=n % 2 == 0), t, 0.1, -0.2 + 0.4 * (n % 2), name='a key'); n += 1; t += 0.17 + 0.09 * ((n * 7) % 3)
s.fx(pencil(0.3, seed=4), tR, 0.8, -0.15, name='"No click": a marker rings the cursor')
s.fx(knock(0.9), tR, 0.45, -0.15); s.fx(ui_tick(2200), tR + 0.02, 0.12, 0.2, name='the screen flickers red')
accent(s, tR, S[0], 0.3, S=RFHV, name='No click')
s.fx(tap(dull=True), tR + 2.2, 0.12, 0.2, name='a blink')

# ── 3 · the escalation: pull back to 45 laptops; on "targeted" their suns open, faster and faster
#      (av_kit.js ORDER: tOpen + 1.25 · ((k + 1)/44)^0.55); on `stare` every eye looks at us
tL, tA, tS = c('avv_count.pull'), c('avv_count.open'), c('avv_count.stare')
s.fx(swish(), tL, 0.3, 0, name='the camera pulls back'); s.fx(glide(1300, 260, 1.2), tL + 0.02, 0.1, 0)
s.fx(creak(0.25), tA, 0.35, 0, name='"targeted": the suns start to open'); s.fx(thump(), tA, 0.35, 0)
accent(s, tA, S[0], 0.3, S=RFHV, name='targeted')
for k in range(44):
    s.fx(ui_tick(1500 + 40 * k), tA + 1.25 * ((k + 1) / 44) ** 0.55, 0.07 + 0.002 * k, -0.6 + 1.2 * ((k * 7) % 11) / 10, name=f'an eye opens {k + 2}')
s.fx(thump(), tS, 0.7, 0, name='`stare`: every eye looks at us'); s.fx(knock(1.0), tS, 0.45, 0)
s.fx(stinger('deadpan'), tS + 0.1, 0.35)

# ── 4 · the list: three ticks drawn in; the sheets riffle 2020 → 2026 and land on "six years" (av_kit.js flips())
tF, tX = c('avv_list.flip'), c('avv_list.six')
for i in range(3): s.fx(tick(i, down=False), S[3] + 0.15 + (i + 1) * 0.5 / 3 - 0.08, 0.22, 0.1, name=f'a tick {i + 1}')
lt_f, lt_x = tF - S[3], tX - S[3]; nf = 6; fd = 0.2; step = max(0.12, (lt_x - fd - lt_f) / (nf - 1))
for i in range(nf):
    t = S[3] + lt_x - fd - (nf - 1 - i) * step
    s.fx(foley('paper', 'flip', 0.8), t, 0.35, 0.1 - 0.04 * i, name=f'a year: {2021 + i}')
s.fx(foley('card', 'tap'), tX, 0.6, 0, name='"six years": 2026'); s.fx(thump(), tX, 0.3, 0)
accent(s, tX, S[0], 0.28, S=RFHV, name='six years')

# ── 5 · the stamp: it winds up on `lift` and comes down on "October"; then the whip back to the banner (0.9 s before
#      the end, as avv_stamp) and the eye shuts into the sun
tW_, tP5 = c('avv_stamp.lift'), c('avv_stamp.stamp')
s.fx(swish(), tW_, 0.3, 0.3, name='the stamp winds up')
s.fx(whoosh('short', 'in'), tP5 - WHOOSH['short'] * 0.8, 0.3, 0.2, at=tP5 - 0.01, name='down it comes')
s.fx(stamp(), tP5, 0.75, 0.1, name='"October": SUSPENDED'); s.fx(thump(), tP5, 0.45, 0.1); s.fx(foley('wood', 'tap'), tP5 + 0.01, 0.4, 0.1)
s.fx(foley('card', 'slide'), tP5 + 0.45, 0.25, 0.4, name='the stamp lifts away')
accent(s, tP5, S[0], 0.3, S=RFHV, name='October'); s.fx(stinger('deadpan'), tP5 + 0.8, 0.4)
tWhip = END - 0.9
s.fx(whoosh('mid', 'in'), tWhip, 0.3, 0, at=tWhip + 0.14, name='the whip back to the banner'); s.fx(swish(), tWhip + 0.05, 0.2, -0.3)
s.fx(glide(900, 420, 0.4), tWhip + 0.33, 0.1, 0, name='the eye shuts into the sun')
sting(s, END - 0.6, S=RFHV)

# every later word of a multi-word pop ("No CLICK", "six YEARS") gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
