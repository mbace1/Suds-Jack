"""Label Sold Separately (Coxon 12) — the cue sheet. The COXON palette (SOUND.md: the institution taking itself
seriously, C minor, low brass chorale, timpani, parade snare, a fife a hair sharp for the wry part) against the plan's
events (pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.

    uv run --with numpy --with soundfile python papercut/label-sold-separately/score.py <events.json> <out.wav> [<report.json> <stems>]

One question — would you know a political ad was made with AI? A wall of ten TV sets hums and talks under its breath;
on "made with AI" a little sparkle twinkles across them. The camera pulls back on a whoosh to 220 screens and a flip
counter rattles up and lands on $137,000,000 with a stamp. Three stickers fly off a sheet and slap onto three
screens, the third on "3 in 10"; the sheet rustles into a pocket. Fifty binders: thirty tabs tick up in a ripple,
and on "no federal rule" the empty slot gets a hollow knock and a held, empty fife note. Then the marker squeaks round
three screens, and "said so" is the deadpan button and the bell.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
import numpy as np
from mix import session
from rfseries import Coxon
from rfsound import room, rim, tower_bell, trombone, timpani, bass_drum, paper_slide, thump, stamp, toy_blip, crowd, brush_tap, chime, glide, noise, tv
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, slap, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Coxon, END + 0.5); B = 60 / 112                          # the film's own grid (112 BPM)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
D = [S[i + 1] - S[i] if i < 4 else END - S[i] for i in range(5)]

def hum(d, f=120):
    """a wall of old TV sets: mains hum and its harmonics, a faint whine on top"""
    t = tv(d); x = sum(np.sin(2 * np.pi * f * h * t) / h for h in (1, 2, 3)) * 0.4 + np.sin(2 * np.pi * 15734 / 2 * t) * 0.02
    return x * np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.5)

def squeak(d=0.25, f0=1700, f1=2300):
    """a felt marker dragged on paper: a pitched squeal over a dry scratch"""
    t = tv(d); return glide(f0, f1, d) * 0.35 + noise(d, 2500, 9000) * np.sin(np.pi * t / d) * 0.18

# ── under everything: the room, the processional on the 112 grid, a held low brass chord a shot
s.sfx.bed(room(END, 1.0), 900)
k = 0
while k * B < S[4]:
    t = k * B; k += 1
    if t < 0.8: continue
    if k % 2: s.note(bass_drum(0.3), t, 0.28, 0, 0.25, stem='march', name='march')
    else: s.note(rim(0.4), t, 0.26, 0.3 if k % 4 else -0.3, 0.35, stem='march', name='clock')
for i, ch in enumerate(['Cm_lo', 'Fm', 'Ab', 'Fm']):
    for j, n in enumerate(Coxon.CH[ch][:3]): s.note(trombone(n, max(0.5, D[i] - 0.3), 0.14, a=0.6, r=0.6), S[i] + 0.05, 0.28, -0.3 + 0.3 * j, 0.5, stem='pad', name=f'pad {i + 1}')
for i, t in enumerate(S):
    s.note(bass_drum(0.5), t, 0.42, 0, 0.3, stem='drums', name=f'cut {i + 1}')
    if i: s.roll_into(t, B * 0.9, 0.05, 0.35, 0.4)
s.ruff(S[0], 0.4)

# ── 1 · the question: the sets hum and murmur; on "made with AI" a sparkle runs across them
tW = c('lss_wall.wink')
s.fx(hum(S[3] - 0.1) * 0.6, 0.05, 0.16, 0.0, name='the wall of sets hums')
s.fx(crowd(S[1] + D[1] - 0.2) * 0.35, 0.1, 0.22, 0.2, name='ten candidates, mid-speech')
s.fx(chime(91), tW, 0.32, 0.25, name='"made with AI": a sparkle on every screen')
for i in range(8): s.fx(toy_blip([2637, 3136, 3520, 2794][i % 4]), tW + 0.04 + i * 0.05, 0.14, -0.6 + 0.17 * i, name='the twinkle runs across')
s.note(timpani(43, 1.2, 0.5), tW, 0.3, 0, 0.35); s.chorale(tW + 0.03, 'G', 1.6, 0.3, 0.36)
s.chorale(S[0] + 0.3, 'Cm', 1.4, 0.28, 0.34)

# ── 2 · the first fact: the pull back to 220; the counter rattles and lands on the pop
tR, tN = c('lss_count.roll'), c('lss_count.count')
s.fx(whoosh('long', 'out'), S[1] + 0.02, 0.35, 0, name='the camera pulls back to 220 screens')
n = max(6, int((tN - tR) / 0.045))
for i in range(n): s.fx(tick(i % 4, down=bool(i % 2)), tR + i * (tN - tR) / n, 0.18 + 0.1 * i / n, 0.05, name='the counter flips')
s.fx(stamp(), tN, 0.6, 0, name='"$137 million": the counter lands'); s.note(timpani(37, 1.4, 0.6), tN, 0.36, 0, 0.35)
s.chorale(tN + 0.02, 'Db', 1.8, 0.5, 0.42)

# ── 3 · the second fact: three stickers fly and slap, the third on "3 in 10"; the sheet goes in the pocket
L = [c('lss_labels.l1'), c('lss_labels.l2'), c('lss_labels.l3')]; tP = c('lss_labels.pocket'); FLY = 0.34   # lss_kit.js: a sticker's flight
for i, t in enumerate(L):
    s.fx(paper_slide(0.12, 40 + i) * 6, t - FLY, 0.3, -0.5, name=f'sticker {i + 1} peels off the sheet')
    s.fx(swish(), t - FLY + 0.05, 0.22, 0.3 - 0.3 * i, name=f'sticker {i + 1} flies')
    s.fx(slap(), t, 0.5 if i == 2 else 0.38, -0.4 + 0.2 * i, name=f'sticker {i + 1} slaps onto a screen')
s.fx(chip(False), L[2], 0.4, 0, name='"3 in 10"'); s.note(timpani(36, 1.4, 0.55), L[2], 0.34, 0, 0.35)
s.chorale(L[2] + 0.05, 'Fm', 2.2, 0.32, 0.36)
s.fx(paper_slide(0.4, 45) * 8, tP, 0.45, -0.45, name='the sheet goes into the pocket'); s.fx(tap(), tP + 0.55, 0.3, 0.45)
s.fife_line(tP + 0.6, [(0, 79, 0.5), (0.5, 78, 0.5), (1, 77, 1)], g=0.22, pan=0.3)

# ── 4 · the third fact: thirty tabs tick up in a ripple; on "no federal rule" the empty slot
tT, tE = c('lss_law.tabs'), c('lss_law.none')
for i in range(30): s.fx(tick(i % 4, down=False), tT + i * 0.045, 0.16, -0.7 + 1.4 * ((i * 7) % 30) / 30, name='a tab pops up' if i else 'thirty tabs, one after another')
s.chorale(tT + 0.2, 'Ab', 1.6, 0.3, 0.36)
s.fx(foley('wood', 'tap'), tE, 0.6, 0, name='"no federal rule": a knock on the empty slot'); s.fx(thump(), tE + 0.02, 0.3)
s.note(timpani(31, 1.6, 0.5), tE, 0.34, 0, 0.35)
s.fife_line(tE + 0.4, [(0, 72, 2.2)], g=0.16, pan=-0.2)

# ── 5 · the punchline: the marker rings three screens; "said so" is the deadpan button and the bell
tM, tS = c('lss_end.mark'), c('lss_end.said'); RING, GAPR = 0.42, 0.08                                  # lss_kit.js: the rings' clock
for i in range(3): s.fx(squeak(RING, 1600 + 80 * i, 2200 + 60 * i), tM + i * (RING + GAPR), 0.5, -0.4 + 0.2 * i, name=f'the marker rings screen {i + 1}')
s.fx(stinger('deadpan'), tS + 0.05, 0.55, name='"said so": the deadpan button'); s.note(timpani(36, 1.2, 0.5), tS, 0.3, 0, 0.35)
s.chorale(tS + 0.3, 'C', 2.8, 0.6, 0.5); s.fx(tower_bell(48, 4.0), tS + 0.35, 0.32, -0.2, 0.5)
for i, nn in enumerate([55, 60, 67]): s.note(trombone(nn, 1.2 if i == 2 else 0.3, 0.7), tS + 0.9 + i * B / 2, 0.3, 0.2, 0.5)
# every pop word gets its own knock as the letters land
for w in EV['words']:
    if w['pop']: s.fx(tick(int(w['t'] * 10) % 4, down=False), w['t'] + 0.03, 0.22, 0.1, name=f'pop word {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=tS + 1.8, tau=1.0, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
