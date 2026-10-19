"""Eight in Ten (Kyoto Toko and Tokyo Toko) — the cue sheet. A Toko film, so not the house bed and no station sting:
koto and shakuhachi in the in scale (D E♭ G A B♭) at 90 BPM, a little taiko on the cuts. Kyoto is the instruments, the
crows and a radio's wordless announcer; Tokyo is the manga's own sound effects: ピコン on three screens, カタカタ, ブブ.
The cups take their phones with a porcelain clunk, the 目標 seal stamps down, and the last shot is tea poured into two
cups under the shakuhachi's long note. Every pop word gets a pluck.

    uv run --with numpy --with soundfile python japan/eight-in-ten/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from sfx import whoosh, tick, WHOOSH
from rfsound import (SR, tv, hz, noise, soft, pluck, felt_piano, bass_drum, toy_voice, blip, stamp, rustle, room, vinyl, glide, chime, thump)

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; S = [EV[f's{i}'] for i in range(1, 6)]; Q = EV['cues']
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]


class TOKO_JP:
    BPM = 90
    VERB = dict(t60=1.5, lo=160, hi=6000, pre=0.02, g=0.28, seed=90)      # a wooden room with the shoji open
    GLUE = dict(thresh=-20.0, ratio=1.6)
    EQ = dict(fc=6000.0, db=-1.5, hp=36.0)


s = Session(END + 0.5, TOKO_JP); B = 60 / TOKO_JP.BPM
IN = [50, 51, 55, 57, 58, 62, 63, 67, 69, 70, 74]                       # D E♭ G A B♭, two octaves and a bit


def koto(m, d=1.2, vel=0.8):
    """a plucked silk string: the house pluck, brighter, with the left hand's small press-bend after the attack"""
    x = pluck(m, d, 1.4, 0.002); t = tv(len(x) / SR); return x * (1 + 0.0 * t)


def shaku(m, d, vel=0.6, scoop=0.03):
    """a shakuhachi: a breathy, nearly pure tone, a scoop up into the note, a late slow vibrato, a lot of air"""
    t = tv(d + 0.2); f = hz(m) * (1 - scoop * np.exp(-t * 6)) * (1 + 0.006 * np.sin(2 * np.pi * 4.6 * t) * np.clip((t - 0.4) / 0.5, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR; e = np.minimum(1, t / 0.12) * np.clip((d + 0.2 - t) / 0.25, 0, 1)
    y = (np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)) * e + soft(noise(d + 0.2, 600, 7000), None, 4000) * 0.22 * e * (0.6 + 0.4 * np.exp(-t * 2))
    return soft(y, 150, 5000) * 0.5 * vel


def caw():
    t = tv(0.32); f = 620 + 160 * np.sin(np.pi * t / 0.32); x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.6 * np.sign(np.sin(4 * np.pi * np.cumsum(f) / SR))
    return soft(x * noise(0.32, 300, 4000) * 0.2 + x * 0.1, 400, 3500) * np.sin(np.pi * t / 0.32) * 0.6


def clack(): t = tv(0.05); return noise(0.05, 1500, 9000) * np.exp(-t * 120) * 0.5 + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 90) * 0.15


def buzz(d=0.35):
    t = tv(d); return (np.sin(2 * np.pi * 160 * t) + 0.3 * np.sign(np.sin(2 * np.pi * 320 * t))) * (np.sin(2 * np.pi * 26 * t) > 0) * np.sin(np.pi * t / d) ** 0.5 * 0.3


def porcelain(f=1900): t = tv(0.5); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 14) * 0.25 + thump() * 0.25


def pour(d=1.0):
    t = tv(d); x = soft(noise(d, 500, 5000), None, 3000) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t + 3 * np.sin(2 * np.pi * 2.3 * t)))
    return x * np.minimum(1, t / 0.06) * np.clip((d - t) / 0.15, 0, 1) * 0.5 + glide(380, 640, d) * 0.08     # the pitch rises as the cup fills


def radio_voice(t0, n, f0=150):
    """the farmhouse radio: an announcer with no words in it, through a small speaker, under a little hiss"""
    for i in range(n):
        v = soft(toy_voice(f0 * (1 + 0.1 * np.sin(i * 1.7)), 'aeoiu'[i % 5], 0.14), 500, 3000)
        s.fx(v, t0 + i * 0.16, 0.22, -0.35, name='the radio')
    s.fx(soft(noise(n * 0.16 + 0.3, 1500, 7000), None, 5000) * 0.05, t0 - 0.1, 1.0, -0.35, name='its hiss')


# ── the room and the season under everything: a quiet wooden room, an evening outside
s.sfx.bed(room(END + 0.5, 1.0), 600); s.sfx.bed(vinyl(END + 0.5, 2.0, 0.4), 300)

# ── the music: koto on the beat, in the in scale; the shakuhachi answers in the farmhouse and on the card
def koto_line(t0, t1, notes, every=1.0, g=0.3, pan=-0.15):
    k = 0; t = t0
    while t < t1 - 0.05: s.note(koto(notes[k % len(notes)], 1.2), t, g, pan, 0.35, stem='koto', name='koto'); k += 1; t += every * B
koto_line(S[0], S[1], [62, 67, 69, 70, 69, 67, 63, 62], 1.0, 0.28)
koto_line(S[1], S[2], [74, 70, 69, 67, 69, 70], 0.5, 0.2, 0.2)                           # Tokyo: twice as fast
koto_line(S[2], S[3], [62, 63, 67, 69, 67, 63], 1.0, 0.26)
koto_line(S[3], S[4], [57, 62, 63, 67, 62, 58], 1.0, 0.22)
for t, m, d in [(S[3] + 0.4, 69, 1.6), (S[3] + 2.2, 67, 0.9), (S[3] + 3.2, 62, 1.3)]: s.note(shaku(m, d), t, 0.5, 0.15, 0.45, stem='shakuhachi', name='shakuhachi')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.85, 0.2, 0, at=t, name=f'cut {i + 2}'); s.note(bass_drum(0.35), t, 0.4, 0, 0.2, stem='taiko', name='taiko')

# ── 1 · the same news: the radio at the farmhouse, ピコン on three screens
radio_voice(S[0] + 0.5, 12)
for i in range(3): s.fx(blip(1760 + 220 * i), Q['et_split.news'] + i * 0.28, 0.32, -0.4 + 0.4 * i, name=f'ピコン {i + 1}')
s.fx(chime(81, 0.5), Q['et_split.news'], 0.12, 0, name='the news')
# ── 2 · Tokyo: カタカタ, the assistants typing back, ブブ
for k in range(14): s.fx(clack(), S[1] + 0.4 + k * 0.09 + 0.02 * np.sin(k * 3), 0.25, 0.3, name='カタカタ')
for k in range(6): s.fx(tick(k % 3, down=False), S[1] + 0.7 + k * 0.35, 0.12, -0.3, name='typing back')
s.fx(buzz(), S[1] + 1.0, 0.35, 0.2, name='ブブ'); s.fx(buzz(), S[1] + 1.45, 0.3, 0.2)
s.fx(stamp(), Q['et_tokyo.stat'], 0.35, 0, name='"78%": the caption box')
# ── 3 · the cups: two phones drop in with a clunk; the seal
mo = Q['et_cups.more']
for i in range(2): s.fx(porcelain(1900 - 200 * i), mo + i * 0.3 + 0.45, 0.45, -0.2 + 0.4 * i, name=f'phone {7 + i} lands')
s.fx(glide(900, 500, 0.4), mo, 0.12, 0, name='"80%": they drop'); s.fx(stamp(), mo + 0.5, 0.5, 0.2, name='目標 80%')
# ── 4 · the farmhouse at dusk: crows, the wire, the forms going past
for t in (S[3] + 0.6, S[3] + 1.0, S[3] + 2.9): s.fx(caw(), t, 0.22, -0.5, name='crows')
for k in range(5): s.fx(rustle(0.35), Q['et_kyoto.wire'] + k * 0.65, 0.25, -0.6 + 0.3 * k, name='a form goes past')
s.fx(soft(noise(S[4] - S[3], 50, 200), None, 120) * 0.3, S[3], 0.3, 0, name='the wire hums')
# ── 5 · Toko's card: tea into two cups, the shakuhachi's long note
po = Q['et_card.pour']
s.fx(pour(1.0), po, 0.45, -0.15, name='tea: the first cup'); s.fx(pour(1.0), po + 1.6, 0.45, 0.2, name='tea: the second cup')
s.fx(porcelain(2400), po + 2.9, 0.25, 0.3, name='the pot set down')
s.note(shaku(62, END - S[4] - 0.4, 0.55), S[4] + 0.2, 0.5, 0.1, 0.5, stem='shakuhachi', name='the long note')

# ── the pop words: a pluck each (a chord on the last)
for w in EV['words']:
    if not w['pop']: continue
    t = w['t'] + 0.03
    if w['caption'] == 'last':
        for j, m in enumerate([50, 57, 62, 69]): s.note(koto(m, 3.0), t + j * 0.04, 0.3, -0.3 + 0.2 * j, 0.4, stem='koto', name=f'"{w["w"]}": the last chord')
    else: s.note(koto(74 if w['caption'] != 'all' else 70, 0.8), t, 0.35, 0.25, 0.3, stem='koto', name=f'pop {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -2.5, why=f'caption {cp["id"]} reveal')

cues = [(f's{i + 1}', t) for i, t in enumerate(S)] + list(Q.items()) + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 1.0, tau=0.6, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
