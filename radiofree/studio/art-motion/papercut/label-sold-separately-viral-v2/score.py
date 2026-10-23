"""Label Sold Separately (Coxon 12), VIRAL CUT v2 — the cue sheet. The viral cut's Coxon palette at 124 BPM (C minor,
low brass chorale, timpani, parade snare, a fife a hair sharp for the wry part), driven: a bass drum on every beat and
the snare on two and four.

    uv run --with numpy --with soundfile python papercut/label-sold-separately-viral-v2/score.py <events.json> <out.wav> [<report.json> <stems>]

Frame one is a HIT (20 ms in) under the wall of ten. On "220 political ads" the camera whooshes back and the other
210 sets pop in with a rattle of ticks; on "AI" every screen lights: a chime and a run of blips. The counter rattles
and lands with a stamp on "$137 million". The ripple: sixty-six stickers slap on in a rush of ticks, landing on "3 in
10"; then the 154 bare screens go dark on a low thump. The wall again: the marker squeaks round the three; "Seven
didn't." is the deadpan button and seven blips as the bare screens flare. The last bar rolls back into the hit.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
import numpy as np
from mix import session
from rfseries import Coxon
from rfsound import room, rim, tower_bell, trombone, timpani, bass_drum, field_snare, stamp, thump, toy_blip, crowd, chime, glide, noise, tv
from sfx import whoosh, chip, tick, stinger, slap

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Coxon, END + 0.5); B = 60 / 124                          # the film's own grid (124 BPM)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 5)]
D = [S[i + 1] - S[i] if i < 3 else END - S[i] for i in range(4)]

def hum(d, f=120):
    """a wall of old TV sets: mains hum and its harmonics, a faint whine on top"""
    t = tv(d); x = sum(np.sin(2 * np.pi * f * h * t) / h for h in (1, 2, 3)) * 0.4 + np.sin(2 * np.pi * 15734 / 2 * t) * 0.02
    return x * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.3)

def squeak(d=0.25, f0=1700, f1=2300):
    """a felt marker dragged on paper: a pitched squeal over a dry scratch"""
    t = tv(d); return glide(f0, f1, d) * 0.35 + noise(d, 2500, 9000) * np.sin(np.pi * t / d) * 0.18

BLIPS = [2637, 3136, 3520, 2794, 4186]

# ── frame one: the hit; then a driving processional to the end, a held low chord a shot
H0 = 0.02                                                                                  # 20 ms in: an onset on the very first sample rang the sign-off join's AAC re-encode to +0.2 dBTP (viral v1)
s.hit(H0, size=1.1, timp=36)
s.chorale(H0, 'Cm', 1.1, 0.7, 0.5)
s.sfx.bed(room(END, 1.0), 900)
k = 0
while k * B < END - 0.3:
    t = k * B; inbar = k % 4; k += 1
    if t < B: continue
    s.note(bass_drum(0.55 if inbar == 0 else 0.4), t, 0.36, 0, 0.25, stem='march', name='march')
    if inbar in (1, 3): s.note(field_snare(0.55), t, 0.32, 0.15, 0.25, stem='march', name='snare')
    else: s.note(rim(0.4), t + B / 2, 0.2, -0.25, 0.3, stem='march', name='offbeat')
for i, ch in enumerate(['Cm_lo', 'Ab', 'Fm', 'G']):
    for j, n in enumerate(Coxon.CH[ch][:3]): s.note(trombone(n, max(0.5, D[i] - 0.2), 0.16, a=0.3, r=0.4), S[i] + 0.05, 0.26, -0.3 + 0.3 * j, 0.45, stem='pad', name=f'pad {i + 1}')
for i, t in enumerate(S):
    if i: s.note(bass_drum(0.7), t, 0.45, 0, 0.3, stem='drums', name=f'cut {i + 1}'); s.roll_into(t, B * 0.75, 0.05, 0.4, 0.38)

# ── 1 · the hook: the ten sets hum; the pull back to 220 and the sets popping in; "AI": every screen lights
tP, tA = c('lssv2_hook.pull'), c('lssv2_hook.ai')
s.fx(hum(tP + 0.3) * 0.55, 0.0, 0.16, 0.0, name='the wall of sets hums')
s.fx(crowd(tP + 0.2) * 0.32, 0.05, 0.2, 0.2, name='ten candidates, mid-speech')
s.fx(whoosh('long', 'out'), tP, 0.38, 0, name='"220 political ads": the camera pulls back')
for i in range(14): s.fx(tick(i % 4, down=bool(i % 2)), tP + 0.08 + i * 0.033, 0.12 + 0.06 * (i % 3), -0.6 + 1.2 * ((i * 5) % 14) / 13, name='the other 210 sets pop in' if not i else 'a set pops in')
s.fx(hum(D[0] - tP + 0.3) * 0.3, tP, 0.12, 0.0, name='220 sets hum')
s.fx(chime(91), tA, 0.4, 0.25, name='"AI": every screen lights')
for i in range(12): s.fx(toy_blip(BLIPS[i % 5]), tA + 0.01 + i * 0.022, 0.13, -0.7 + 0.12 * i, name='the sparkle runs out across the 220')
s.note(timpani(43, 1.0, 0.6), tA, 0.34, 0, 0.35); s.chorale(tA + 0.02, 'G', 1.4, 0.45, 0.4)

# ── 2 · the counter rattles and lands on "$137 million"
tR, tN = c('lssv2_count.roll'), c('lssv2_count.count')
n = max(6, int((tN - tR) / 0.04))
for i in range(n): s.fx(tick(i % 4, down=bool(i % 2)), tR + i * (tN - tR) / n, 0.18 + 0.12 * i / n, 0.05, name='the counter flips')
s.fx(stamp(), tN, 0.65, 0, name='"$137 million": the counter lands'); s.hit(tN, size=0.7, timp=37, crash_=False)
s.chorale(tN + 0.02, 'Db', 1.6, 0.55, 0.42)

# ── 3 · the ripple: 66 stickers slap on, out from the middle, landing on "3 in 10"; then the bare ones go dark
tP3, tT = c('lssv2_ripple.rip'), c('lssv2_ripple.three')
for i in range(33): s.fx(tick(i % 4, down=False), tP3 + (2 * i / 65) * (tT - tP3), 0.14 + 0.1 * i / 33, -0.7 + 1.4 * ((i * 7) % 33) / 33, name='a sticker slaps on' if i else 'sixty-six stickers, a ripple')
s.fx(slap(), tT, 0.5, 0, name='"3 in 10": the last sticker lands'); s.fx(chip(False), tT + 0.02, 0.36, 0)
s.note(timpani(36, 1.3, 0.55), tT, 0.34, 0, 0.35); s.chorale(tT + 0.05, 'Fm', 1.8, 0.4, 0.38)
s.fx(thump(), tT + 0.15, 0.4, 0, name='the 154 bare screens go dark')

# ── 4 · the punchline: the marker rings three; "Seven didn't." is the deadpan button as the seven bare screens flare
tM, tS = c('lssv2_end.mark'), c('lssv2_end.seven')
for i in range(3): s.fx(squeak(0.32, 1600 + 80 * i, 2200 + 60 * i), tM + i * 0.08, 0.42, -0.4 + 0.2 * i, name=f'the marker rings screen {i + 1}')
s.fx(stinger('deadpan'), tS + 0.03, 0.55, name='"Seven didn\'t.": the deadpan button'); s.note(timpani(36, 1.2, 0.5), tS, 0.3, 0, 0.35)
for i in range(7): s.fx(toy_blip(BLIPS[(i + 2) % 5]), tS + 0.01 + i * 0.035, 0.12, -0.6 + 0.2 * i, name='the seven bare screens flare' if not i else 'a bare screen flares')
s.chorale(tS + 0.25, 'C', 1.8, 0.5, 0.45); s.fx(tower_bell(48, 3.0), tS + 0.3, 0.26, -0.2, 0.5)
s.fife_line(tS + 0.9, [(0, 79, 0.5), (0.5, 78, 0.5), (1, 77, 1)], g=0.2, pan=0.3)
# the last bar lifts back toward the opening chord, so the loop comes round on the hit
s.roll_into(END, B * 1.5, 0.05, 0.55, 0.4)
# every pop word gets its own knock as the letters land
for w in EV['words']:
    if w['pop'] and w['t'] >= 0: s.fx(tick(int(w['t'] * 10) % 4, down=False), w['t'] + 0.03, 0.22, 0.1, name=f'pop word {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop'] and w['t'] >= 0]
s.render(OUT, ring_from=END - 0.6, tau=0.8, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
