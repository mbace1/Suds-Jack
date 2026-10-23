"""Trade Secret — Doodle 6, VIRAL CUT: the cue sheet. The DOODLE palette (140 BPM, D minor, sour), driven, with a HIT on
frame 1 (35 ms in, never sample 0) because the hook is the first frame. Placed by seconds from the plan's events, so
the fi and ja masters are scored by this same file.

    uv run --with numpy --with soundfile python papercut/trade-secret/score.py <events.json> <out.wav> [<report.json> <stems>]

1 · the hit; on "secret" the map blurs (one thump).
2 · the map comes clear; a gliding whistle for the flying squirrel; a chime on "No felling".
3 · the year card flips; a rustle-and-thump front across the clearing (ham_kit fellAt, mirrored); halls clunk up;
    "without a permit" slams.
4 · the email slides in with a mail chirp; the folder closes; "trade secrets": the stamp.
5 · "trade secret": the stamp on the map, a hit; the bed thins for the hold; the jingle lands on "back" as the map
    slide back home, the clipping lands on "clip", and the last chord rings into frame 1's hit.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import session
from rfseries import Doodle
import numpy as np
from rfsound import fm_ep, marimba, pluck, sub_bass, supersaw, clap, hat, kick_tight, chime, sparkle, bonk, rustle, \
    thump, kalimba, page_flutter, tag_pop, crash, saw_stab, riser, glide, led_flicker, press_stamp, stamp, ui_tick, glock, \
    paper_slide, tv
from sfx import whoosh, slap, chip, tick, foley, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Doodle, END + 0.5); B = 60 / Doodle.BPM
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 10) if f's{i}' in EV] + [END]; NS = len(S) - 1
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
SOUR = Doodle.SOUR

def chords_at(t, i):
    return SOUR[int((t - S[i]) / (4 * B)) % 4]

def bed(i, t0, t1, g=1.0, drums=True):
    """the driven hold music: eighths on the e-piano, a kick every beat, claps on 2 and 4, off-beat hats, eighth bass;
    drums=False is the thinned bed under the punchline's hold (keys, off-beat hats, a bass on the beat)"""
    IDX = [0, 1, 2, 3, 2, 1, 2, 1]; k = max(0, int((t0 - S[i]) / (B / 2) + 0.999))
    while True:
        t = S[i] + k * B / 2
        if t >= t1 - 1e-6: break
        root, notes = chords_at(t, i); n = notes[IDX[k % 8]]
        s.note(fm_ep(n, 0.2, 0.5), t, 0.13 * g, 0.3 * ((k % 4) - 1.5) / 1.5, 0.3, stem='keys', name='hold music')
        if k % 2 == 0 and drums: s.note(kick_tight(0.75), t, 0.36 * g, 0, 0, stem='drums', name='kick')
        elif k % 2 == 1: s.note(hat(vel=0.45), t, 0.32 * g, -0.25, 0.05, stem='drums', name='hat off')
        if k % 4 == 2 and drums: s.note(clap(0.7), t, 0.3 * g, 0, 0.35, stem='drums', name='clap')
        if drums or k % 2 == 0: s.note(sub_bass(root, 0.17 if drums else 0.4), t, 0.2 * g, 0, 0, stem='bass', name='bass')
        k += 1

def hit(t, chord, g=1.0, name='hit'):
    """the slam: a kick, a sub, a saw stab on the chord, a crash"""
    s.note(kick_tight(1.0), t, 0.55 * g, 0, 0, stem='drums', name=f'{name}: kick')
    s.note(sub_bass(chord[0] - 12, 0.5), t, 0.3 * g, 0, 0, stem='bass', name=f'{name}: sub')
    for j, n in enumerate(chord): s.note(saw_stab(n, 0.3), t, 0.11 * g, -0.3 + 0.2 * j, 0.35, stem='stab', name=f'{name}: stab')
    s.fx(crash(1.6, 0.8), t, 0.22 * g, 0.15, name=f'{name}: crash')

def accent(t, i, g=0.24, name='accent'):
    s.note(marimba(chords_at(t, i)[1][-1] + 12, 0.3, 0.9), t, g, 0.2, 0.35, stem='accent', name=name)

def whistle(d=0.42):
    """a referee's pea whistle: ~2.9 kHz, the pea's fast trill in pitch and level, a hard start"""
    t = tv(d); tr = np.sin(2 * np.pi * 31 * t)
    x = np.sin(2 * np.pi * np.cumsum(2900 * (1 + 0.025 * tr)) / 48000) + 0.25 * np.sin(2 * np.pi * np.cumsum(5800 * (1 + 0.025 * tr)) / 48000)
    return x * (0.7 + 0.3 * tr) * np.minimum(1, t / 0.008) * np.minimum(1, (d - t) / 0.06) * 0.35

def hook_land(t_land, g=0.28):
    """the Doodle jingle, sour, landing on t_land"""
    for i, (b, n) in enumerate(Doodle.HOOK):
        n = n - 1 if n == 78 else n; t = t_land - 3 * B + b * B
        s.note(pluck(n - 0.25 * i / 6, 0.18), t, g, 0.15, 0.35, stem='hook', name='hook sour')
    s.note(pluck(Doodle.LAND - 1.4, 0.5), t_land, g, 0.15, 0.4, stem='hook', name='hook lands')

# ── the music
tS = c('tsv_hook.secret'); tT, tB, tCl, tR = c('tsv_end.ts'), c('tsv_lift.peel'), c('tsv_lift.clip'), c('tsv_lift.ran')
hit(S[0] + 0.035, (62, 65, 69, 74), 1.0, 'frame 1')
s.note(marimba(74, 0.4, 0.9), S[0] + 0.035, 0.28, 0.1, 0.35, stem='accent', name='first note')
bed(0, S[0] + 2 * B, S[1] - B / 2, 0.75)
for i in range(1, NS - 2): bed(i, S[i] + B / 2, S[i + 1] - B / 2, 0.82)
bed(NS - 2, S[NS - 2] + B / 2, tT - 0.05, 0.75)
bed(NS - 2, tT + B, tB - 0.05, 0.6, drums=False)
for i, t in enumerate(S[1:NS]):
    s.fx(riser(B * 1.5, 500, 7000), t - B * 1.5, 0.16, 0, name=f'riser into cut {i + 2}')
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.22, 0, at=t, name=f'cut {i + 2}')
    s.note(kick_tight(0.9), t, 0.4, 0, 0, stem='drums', name=f'cut {i + 2}: kick')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]}')

# ── 1 · "secret": the map blurs (one thump)
s.fx(thump(), tS, 0.25, 0, name='"secret": the map blurs')
s.fx(foley('card', 'tap'), tS - 0.01, 0.45, 0, name='"secret"'); accent(tS, 0, 0.3, name='"secret"')
s.note(sub_bass(38, 0.4), tS, 0.3, 0, 0, stem='bass', name='"secret": sub')

# ── 2 · the map comes clear; the squirrel glides; "No felling"
t2 = S[1]
tG, tN = c('tsv_map.glide'), c('tsv_map.cut')
s.fx(glide(900, 2200, 1.2), tG, 0.08, -0.4, name='the squirrel glides')
s.fx(whoosh(d=1.3, way='out', bright=0.6), tG, 0.12, -0.2, name='the glide: air')
s.fx(chime(81, 0.7), tN, 0.22, 0.1, name='"No felling"'); accent(tN, 1, name='"No felling"')
s.note(kick_tight(1.0), tN, 0.4, 0, 0, stem='drums', name='"No felling": kick')

# ── 3 · the year turns; the front across the clearing; halls; "without a permit"
tY, tF, tP = c('tsv_fell.year'), c('tsv_fell.fell'), c('tsv_fell.permit')
s.fx(page_flutter(0.25, seed=4), tY, 0.25, -0.5, name='the year card flips'); s.fx(foley('card', 'tap'), tY + 0.3, 0.3, -0.5)
for j in range(10):
    t = tF + 0.9 * (j / 9) + 0.12
    s.fx(rustle(0.28), t - 0.02, 0.22, -0.5 + j / 9, name='the front' if j == 0 else f'the front {j + 1}')
    s.fx(thump(), t, 0.12, -0.5 + j / 9)
for i in range(5): s.fx(bonk(62 + i * 2), tF + 0.5 + i * 0.16, 0.12, 0.1, name=f'hall {i + 1}')
s.fx(stamp(), tP, 0.55, 0.1, name='"without a permit": the card slams'); s.fx(press_stamp(0.9), tP + 0.01, 0.4, 0.1)
s.note(kick_tight(1.0), tP, 0.45, 0, 0, stem='drums', name='"permit": kick'); accent(tP, 2, name='"permit"')

# ── 4 · the email, the folder, the stamp
tE, tC, tSe = c('tsv_secret.email'), c('tsv_secret.close'), c('tsv_secret.secrets')
s.fx(paper_slide(0.35) * 5, tE, 0.25, -0.4, name='the email slides in'); s.fx(chip(True), tE + 0.3, 0.12, -0.3, name='mail chirp')
s.fx(paper_slide(0.4) * 5, S[3] + 0.25, 0.25, 0.4, name='the print slides in')
s.fx(paper_slide(0.3) * 4, tC, 0.2, 0, name='the folder starts to close'); s.fx(foley('card', 'tap'), tC + 0.33, 0.45, 0, name='the folder closes'); s.fx(thump(), tC + 0.35, 0.2, 0)
s.fx(stamp(), tSe, 0.6, 0, name='"trade secrets": the stamp'); s.fx(press_stamp(1.0, seed=5), tSe + 0.01, 0.45, 0)
s.note(kick_tight(1.0), tSe, 0.45, 0, 0, stem='drums', name='"secrets": kick'); accent(tSe, 3, name='"secrets"')

# ── 5 · the stamp on the map; 6 · it peels off (lifted), the squirrel glides out on "ran"; the clipping; the last chord
hit(tT, (62, 65, 70, 74), 0.85, '"trade secret"'); s.fx(stamp(), tT, 0.55, 0, name='the stamp on the map')
s.fx(chime(76, 0.5), tT + 0.02, 0.2, 0.1); s.fx(glide(1500, 2400, 0.1), tT + 0.55, 0.07, 0.25, name='the squirrel peeks')
hook_land(tB, 0.26)
s.fx(paper_slide(0.35) * 5, tB, 0.25, 0.4, name='the stamp peels off')
s.fx(chime(81, 0.7), tR, 0.22, 0.1, name='"ran"'); s.fx(glide(900, 2200, 1.2), tR - 0.2, 0.08, 0.3, name='the squirrel glides out')
for j, n in enumerate((50, 57, 62, 65, 69, 76)):
    s.note(fm_ep(n, END - tB, 0.5, r=1.2), tB + 0.01 * j, 0.11, -0.35 + 0.14 * j, 0.45, stem='keys', name='the last chord')
s.note(sub_bass(38, END - tB), tB, 0.22, 0, 0, stem='bass', name='the last chord: sub')
s.fx(paper_slide(0.35) * 6, tCl - 0.22, 0.26, -0.1, name='the clipping rises'); s.fx(foley('card', 'tap'), tCl, 0.4, 0, name='"clip": the clipping lands')
s.note(glock(86, END - tCl + 0.5, 0.6), tCl, 0.18, 0.15, 0.5, stem='accent', name='the clipping lands: glock')
s.fx(riser(1.0, 400, 5000), END - 1.0, 0.1, 0, name='riser into frame 1')

for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S[:NS])] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.7, tau=0.55, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
