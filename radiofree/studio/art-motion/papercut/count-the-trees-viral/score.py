"""Count the Trees — the VIRAL CUT (Doodle 5): the cue sheet. The same DOODLE palette as the v1 draft (140 BPM, D minor
from the first frame — the viral cut never had a standing forest to be bright about), but driven: claps, off-beat hats
and a kick on every beat under the captions, and a HIT on frame 1 (35 ms in), because the hook is the first frame and
the first sound has to land with it. Placed by seconds from the plan's events, so the fi and ja masters are scored by
this same file.

    uv run --with numpy --with soundfile python papercut/count-the-trees-viral/score.py <events.json> <out.wav> [<report.json> <stems>]

1 · the hit; the felling front, a knock and a rustle per lane (the kit's fellV(), mirrored); "Gone." is the last lane.
2 · (v2) a referee's whistle for the one pitch; a whoosh as the camera pulls back and a run of ticks climbing as the
    pitches multiply; a hit and a chime on "460".
3 · on "assessment" the card slams (a stamp and an empty-box bonk).
4 · a siren in whoops as the patrol car comes along the road, the light bar's flicker; on "inquiry" the card slams.
5 · six slips slap down one after another (SLIP_EVERY, mirrored); the sixth with a crash and a chime up a fifth.
6 · saplings on a kalimba scale; a tag pops on "130 ha"; (v2) the bed thins for the hold, the jingle lands on "back"
    and the last chord rings out under the clipping's return, so the film resolves instead of stopping.
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
HOOK_LEAD, SLIP_EVERY, LANES = 1.05, 0.19, 12                 # cnt_kit.js: HOOK_LEAD, SLIP_EVERY, BOX / 64

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

# ── the music: the hit on frame 1, then driven and sour; risers into every cut; the bed thins for the punchline's hold
tGone = c('cntv_hook.gone'); tH, tB, tCl = c('cntv_end.ha'), c('cntv_end.back'), c('cntv_end.clip')
hit(S[0] + 0.035, (62, 65, 69, 74), 1.0, 'frame 1')                                 # 35 ms in, never sample 0
s.note(marimba(74, 0.4, 0.9), S[0] + 0.035, 0.28, 0.1, 0.35, stem='accent', name='first note')
bed(0, S[0] + 2 * B, S[1] - B / 2, 0.75)
bed(1, S[1] + 3 * B, S[2] - B / 2, 0.8)
for i in range(2, NS - 1): bed(i, S[i] + B / 2, S[i + 1] - B / 2, 0.85)
bed(NS - 1, S[NS - 1] + B / 2, tH - 0.05, 0.75)
bed(NS - 1, tH + B, tB - 0.05, 0.6, drums=False)
for i, t in enumerate(S[1:NS]):
    s.fx(riser(B * 1.5, 500, 7000), t - B * 1.5, 0.16, 0, name=f'riser into cut {i + 2}')
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.22, 0, at=t, name=f'cut {i + 2}')
    s.note(kick_tight(0.9), t, 0.4, 0, 0, stem='drums', name=f'cut {i + 2}: kick')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]}')

# ── 1 · the felling front, already moving at frame 0: a knock and a rustle per lane; "Gone." is the last
t0 = tGone - HOOK_LEAD
for lane in range(LANES):
    t = t0 + lane * 0.075 + 0.23                                             # fellV() + the average along/k + the fall
    if t < 0.09: continue                                                    # the lanes that went before frame 0
    s.fx(thump(), t, 0.15, -0.5 + lane / 11, name=f'lane {lane + 1} falls')
    s.fx(rustle(0.28), t - 0.02, 0.28, -0.5 + lane / 11, name=f'lane {lane + 1} rustle')
s.fx(foley('card', 'tap'), tGone - 0.01, 0.45, 0, name='"Gone."'); accent(tGone, 0, 0.3, name='"Gone."')
s.note(sub_bass(38, 0.4), tGone, 0.3, 0, 0, stem='bass', name='"Gone.": sub')
s.fx(bonk(74), tGone + 0.35, 0.16, 0.1, name='the clearing, empty')

# ── 2 · one football pitch: a whistle; the pull-back and the pitches multiplying; a hit on "460"
tOne, tT, tN = c('cntv_pitch.pitch'), c('cntv_pitch.tile'), c('cntv_pitch.n')
s.fx(whistle(), tOne, 0.42, 0.1, name='one pitch: the whistle'); s.fx(foley('card', 'tap'), tOne + 0.05, 0.3, 0.1)
s.fx(whoosh(d=tN - tT + 0.5, way='out', bright=0.5), tT - 0.1, 0.18, 0, at=tT, name='the pull-back: the pitches multiply')
n = 26
for i in range(n):
    k = (i + 1) / n; t = tT + (tN - tT - 0.06) * k ** 0.75; s.fx(ui_tick(1800 + 70 * i), t, 0.1 + 0.05 * k, -0.6 + 1.2 * ((i * 7) % n) / (n - 1), name=f'pitches {i + 1}')
hit(tN, (62, 65, 69, 74), 0.75, '"460"'); s.fx(chime(81, 0.7), tN + 0.02, 0.22, 0.1); s.fx(sparkle(88), tN + 0.04, 0.16, 0.3)

# ── 3 · "assessment": the card slams, its box empty
tE = c('cntv_eia.eia')
s.fx(stamp(), tE, 0.55, 0.1, name='"assessment": the card slams'); s.fx(press_stamp(0.9), tE + 0.01, 0.4, 0.1)
s.fx(bonk(71), tE + 0.22, 0.28, 0.25, name='the box is empty'); accent(tE, 1, name='"assessment"')
s.note(kick_tight(1.0), tE, 0.45, 0, 0, stem='drums', name='"assessment": kick')

# ── 4 · the patrol car: a siren in whoops along the road, the light bar's flicker; "inquiry" slams the card
tC, tI = c('cntv_police.car'), c('cntv_police.inq')
n = max(2, int((tI + 0.7 - tC) / 0.34))
for i in range(n):
    t = tC + i * 0.34; up = i % 2 == 0; p = -0.7 + 0.8 * min(1, (t - tC) / max(0.5, tI - tC))
    s.fx(glide(700, 1400, 0.3) if up else glide(1400, 700, 0.3), t, 0.12 if i else 0.16, p, name=f'siren {i + 1}' if i else 'the car: siren')
s.fx(led_flicker(min(1.6, tI - tC + 0.6), rate=16), tC + 0.02, 0.5, -0.3, name='the light bar')
s.fx(stamp(), tI, 0.55, -0.1, name='"inquiry": the card slams'); s.fx(press_stamp(1.0, seed=5), tI + 0.01, 0.42, -0.1)
s.note(kick_tight(1.0), tI, 0.45, 0, 0, stem='drums', name='"inquiry": kick'); accent(tI, 2, name='"inquiry"')

# ── 5 · six slips, one after another; the sixth the biggest, with a crash and a chime up a fifth (no caption since v2)
tS, tW = c('cntv_world.slips'), c('cntv_world.world')
for i in range(5):
    t = tS + i * SLIP_EVERY + 0.14                                           # each lands ~0.14 s after it starts to fall
    s.fx(page_flutter(0.25, seed=20 + i), tS + i * SLIP_EVERY + (0 if i else 0.0), 0.16, -0.5 + 0.25 * i, name='slips start' if i == 0 else f'slip {i + 1} falls')
    s.fx(slap(), t, 0.42, -0.5 + 0.25 * i, name=f'slip {i + 1} lands'); s.note(kick_tight(0.6), t, 0.2, 0, 0, stem='drums', name=f'slip {i + 1}')
hit(tW, (62, 65, 70, 74), 0.9, 'the sixth slip')
s.fx(slap(), tW + 0.14, 0.5, 0.1, name='the sixth slip lands')
s.fx(chime(76, 0.5), tW + 0.02, 0.22, 0.1); s.fx(chime(83, 0.8), tW + 0.14, 0.22, 0.2, name='up a fifth')

# ── 6 · saplings on a kalimba scale; the tag on "130 ha"; the hold; then the jingle lands on "back" and the last chord rings
tP = c('cntv_end.plant')
SCALE = [62, 64, 65, 69, 70, 74, 76, 77, 81, 82]
for r in range(len(SCALE)):
    t = tP + 2.0 * (r / len(SCALE)) ** 1.6; s.note(kalimba(SCALE[r], 0.6), t, 0.2, -0.3 + 0.06 * r, 0.3, stem='accent', name='saplings' if r == 0 else f'saplings row {r + 1}')
s.fx(tag_pop(900), tH, 0.45, 0.1, name='"130 ha": the tag'); s.fx(foley('card', 'tap'), tH + 0.2, 0.35, 0.1)
s.note(kick_tight(1.0), tH, 0.45, 0, 0, stem='drums', name='"130 ha": kick'); accent(tH, NS - 1, 0.24, name='"130 ha"')
for j, n in enumerate((62, 65, 70, 74)): s.note(supersaw(n, 0.5, cut=3800, r=0.35, seed=j), tH + 0.02, 0.1, -0.4 + 0.2 * j, 0.45, stem='stab')
s.fx(chip(True), tH + 0.4, 0.14, 0.3, name='a cheerful little chime, for 130')
hook_land(tB, 0.26)
s.fx(whoosh(d=tCl - tB + 0.3, way='out', bright=0.4), tB, 0.12, 0, name='"back": the slow pull back to frame 0')
for j, n in enumerate((50, 57, 62, 65, 69, 76)):                                     # D minor (add9), held: the film resolves
    s.note(fm_ep(n, END - tB, 0.5, r=1.2), tB + 0.01 * j, 0.11, -0.35 + 0.14 * j, 0.45, stem='keys', name='the last chord')
s.note(sub_bass(38, END - tB), tB, 0.22, 0, 0, stem='bass', name='the last chord: sub')
s.fx(paper_slide(0.35) * 6, tCl - 0.22, 0.26, -0.1, name='the clipping rises'); s.fx(foley('card', 'tap'), tCl, 0.4, 0, name='"clip": the clipping lands')
s.note(glock(86, END - tCl + 0.5, 0.6), tCl, 0.18, 0.15, 0.5, stem='accent', name='the clipping lands: glock')

# every later word of a multi-word pop gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S[:NS])] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.7, tau=0.55, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
