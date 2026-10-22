"""Approved Vendor (Global 1) — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's sounds
against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.

The newsroom is quiet: soft key clicks under the first shot, a card slide as the banner comes in, a bright little chime
on "spyware" (the ad is cheerful, which is the point). On "no click" the sun opens into an eye with a slow creak and a low
thump, and the red thread pulls out of the ad with a rising glide. The auction hall murmurs; paddles go up with card
taps, and on "targeted" one goes up highest with a whoosh and a gavel knock. The vendor list riffles one sheet per year
and lands on "six years" with a card tap. The rubber stamp winds up on "lift" and comes down on "October": a thump, the
stamp's own knock, and a deadpan sting. The flip schedule here mirrors scenes/av_kit.js (flips()), so the riffle lands
on the picture in every language.

    uv run --with numpy --with soundfile python papercut/approved-vendor/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH
from rfsound import hum, glock, sparkle, glide, ui_tick, card_flip, thump, chime, creak, gavel, stamp, crowd

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]

# ── under everything: the station's call on the first frame, the bed, the hum of a room at night
motif(s, S[0] + 0.035, g=0.32)     # 35 ms in: a note on the very first sample rings the sign-off join's limiter (Tailgated)
bed(s, S[0] + 0.5, S[1], quiet, level=1)
bed(s, S[1], END - 0.6, quiet)
s.fx(hum(50, S[2] - S[0]) * 0.6, S[0], 0.06, 0, name='the newsroom: a low hum')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the newsroom: typing; the banner slides in; on "spyware" it bounces with a bright little chime
tS, tA = c('av_room.slide'), c('av_room.ad')
t = S[0] + 0.25; n = 0
while t < S[1] - 0.4:
    s.fx(tick(n % 4, down=n % 2 == 0), t, 0.12, -0.2 + 0.4 * (n % 2), name='a key'); n += 1; t += 0.17 + 0.09 * ((n * 7) % 3)
s.fx(foley('card', 'slide'), tS, 0.45, 0.3, name='the banner slides in'); s.fx(tap(), tS + 0.36, 0.25, 0.3)
s.fx(chime(88, 0.6), tA + 0.02, 0.22, 0.3, name='"spyware": the ad bounces, cheerfully'); s.fx(pop(1.2), tA, 0.3, 0.3)
accent(s, tA, S[1], 0.25, name='spyware')

# ── 2 · the eye: the cursor never moves; on "no click" the sun opens with a creak; a blink; the thread pulls out
tO = c('av_eye.open')
s.fx(creak(0.42), tO, 0.4, 0.1, name='"no click": the sun opens into an eye'); s.fx(thump(), tO, 0.35, 0.1)
s.fx(sparkle(84), tO + 0.05, 0.18, 0.1); accent(s, tO, S[1], 0.3, name='no click')
s.fx(tap(dull=True), tO + 2.1, 0.2, 0.1, name='a blink')
s.fx(glide(500, 1400, 0.7), tO + 0.75, 0.12, 0.2, name='the red thread runs out of the ad')
s.fx(stinger('deadpan'), tO + 0.6, 0.3)

# ── 3 · the auction: a murmur; paddles up with card taps; on "targeted" one goes up highest and the gavel knocks
tN = c('av_bid.one')
s.fx(crowd(S[3] - S[2] - 0.4) * 0.5, S[2] + 0.1, 0.1, 0, name='the hall murmurs')
for up in [0.3, 0.55, 0.85, 1.1, 1.35, 1.6]:
    if S[2] + up < tN - 0.1: s.fx(card_flip(), S[2] + up, 0.22, -0.3 + 0.12 * up, name='a paddle goes up')
s.fx(whoosh('short', 'in'), tN - WHOOSH['short'] * 0.8, 0.35, 0, at=tN, name='"targeted": AUDIENCE 1 goes up')
s.fx(gavel(), tN + 0.05, 0.45, 0, name='the gavel'); accent(s, tN, S[1], 0.3, name='targeted')
s.fx(glide(900, 1800, 0.25), tN + 0.1, 0.08, 0.3, name='the thread pulls taut')

# ── 4 · the list: three ticks drawn in; the sheets riffle 2020 → 2026 and land on "six years"
tF, tX = c('av_list.flip'), c('av_list.six')
for i in range(3): s.fx(tick(i, down=False), S[3] + 0.15 + (i + 1) * 0.5 / 3 - 0.08, 0.22, 0.1, name=f'a tick {i + 1}')
lt_f, lt_x = tF - S[3], tX - S[3]; nf = 6; fd = 0.2; step = max(0.12, (lt_x - fd - lt_f) / (nf - 1))
for i in range(nf):
    t = S[3] + lt_x - fd - (nf - 1 - i) * step
    s.fx(foley('paper', 'flip', 0.8), t, 0.35, 0.1 - 0.04 * i, name=f'a year: {2021 + i}')
s.fx(foley('card', 'tap'), tX, 0.6, 0, name='"six years": 2026'); accent(s, tX, S[1], 0.28, name='six years')

# ── 5 · the stamp: it winds up on "lift" and comes down on "October"
tL, tP = c('av_stamp.lift'), c('av_stamp.stamp')
s.fx(swish(), tL, 0.3, 0.3, name='the stamp winds up')
s.fx(whoosh('short', 'in'), tP - WHOOSH['short'] * 0.8, 0.3, 0.2, at=tP - 0.01, name='down it comes')
s.fx(stamp(), tP, 0.7, 0.1, name='"October": SUSPENDED'); s.fx(thump(), tP, 0.4, 0.1); s.fx(foley('wood', 'tap'), tP + 0.01, 0.4, 0.1)
s.fx(foley('card', 'slide'), tP + 0.45, 0.25, 0.4, name='the stamp lifts away')
accent(s, tP, S[1], 0.3, name='October'); s.fx(stinger('deadpan'), tP + 0.9, 0.45)
sting(s, END - 0.6)

# every later word of a multi-word pop ("no CLICK", "six YEARS") gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
