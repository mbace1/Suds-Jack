"""Count the Trees (Doodle 5) — the cue sheet. The DOODLE palette (SOUND.md: 140 BPM, D major souring to D minor, an FM
e-piano and marimba hold-music arpeggio, a sub bass, hats and claps, the jingle in the break bar; success chimes up a
fifth, error bonks down a third) against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters
are scored by this same file. Placed by seconds from the events: a hold can lengthen a shot, so nothing here counts
on the old 32 s grid.

    uv run --with numpy --with soundfile python papercut/count-the-trees/score.py <events.json> <out.wav> [<report.json> <stems>]

The forest from above: birds, and a marker pencil drawing the boundary, closing on "gone"; then the clearing goes lane
by lane, a soft knock and a rustle for each lane (the kit's fellAt(), lane by lane from the pop), and the tune sours.
The hectare grid ticks in row by row up the scale and lands; on "assessment" the card slides in and the empty box
bonks. The loupe: a slow glass whoosh, a clock ticking the count faster and faster, and a glock on the number. The
names fall like paper snow, and on "rules" the chime goes up a fifth. Last: the clipping slides in, the saplings come
up row by row on a kalimba scale, the label lands on "130 hectares", the jingle sours and the button.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import session
from rfseries import Doodle
from rfsound import fm_ep, marimba, pluck, sub_bass, supersaw, clap, hat, kick_tight, chime, sparkle, bonk, ui_tick, \
    card_flip, rustle, pencil, paper_slide, thump, glock, kalimba, clock_tick, page_flutter, birds, tag_pop
from sfx import whoosh, pop, chip, tick, foley, stinger, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Doodle, END + 0.5); B = 60 / Doodle.BPM
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)] + [END]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
BRIGHT, SOUR = Doodle.BRIGHT, Doodle.SOUR

def chords_at(t, i, ch):
    return ch[int((t - S[i]) / (4 * B)) % 4]

def bed(i, t0, t1, ch, level=1, g=1.0):
    """the hold music between t0 and t1 in shot i (as One Stockholm's): eighths up and down the chord, sub bass, hats"""
    IDX = [0, 1, 2, 3, 2, 1, 2, 1]; k = max(0, int((t0 - S[i]) / (B / 2) + 0.999))
    while True:
        t = S[i] + k * B / 2
        if t >= t1 - 1e-6: break
        root, notes = chords_at(t, i, ch); n = notes[IDX[k % 8]]; beat = k / 2
        s.note(fm_ep(n, 0.22, 0.45), t, 0.15 * g, 0.3 * ((k % 4) - 1.5) / 1.5, 0.3, stem='keys', name='hold music')
        if k % 2 == 0: s.note(hat(vel=0.5 if beat % 2 else 0.7), t, 0.4 * g, 0.25, 0.05, stem='drums', name='hat')
        if level >= 2 and k % 2 == 1: s.note(hat(vel=0.35), t, 0.3 * g, -0.25, 0.05, stem='drums', name='hat off')
        if level >= 2 and k % 4 == 2: s.note(clap(0.7), t, 0.32 * g, 0, 0.35, stem='drums', name='clap')
        if k % 8 == 0: s.note(kick_tight(0.8), t, 0.42 * g, 0, 0, stem='drums', name='kick')
        if level >= 2 or k % 8 == 0: s.note(sub_bass(root, 0.18 if level >= 2 else 0.6), t, 0.22 * g, 0, 0, stem='bass', name='bass')
        k += 1

def hook(t_land, mood='bright', g=0.3):
    for i, (b, n) in enumerate(Doodle.HOOK):
        n = n - 1 if mood == 'sour' and n == 78 else n; t = t_land - 3 * B + b * B
        s.note(pluck(n - (0.25 * i / 6 if mood == 'sour' else 0), 0.18), t, g, 0.15, 0.35, stem='hook', name=f'hook {mood}')
        s.note(fm_ep(n, 0.2, 0.7), t, g * 0.45, -0.15, 0.3, stem='hook', name='hook ep')
    land = Doodle.LAND - (1.4 if mood == 'sour' else 0)
    s.note(pluck(land, 0.5), t_land, g, 0.15, 0.4, stem='hook', name='hook lands'); s.note(fm_ep(land, 0.7, 0.7), t_land, g * 0.5, -0.15, 0.4, stem='hook')

def stab(t, chord, g=0.2, d=0.5):
    for j, n in enumerate(chord): s.note(supersaw(n, d, cut=3800, r=0.35, seed=j), t, g, -0.4 + 0.2 * j, 0.45, stem='stab', name='stab')

def accent(t, ch, i, g=0.26, name='accent'):
    s.note(marimba(chords_at(t, i, ch)[1][-1] + 12, 0.3, 0.9), t, g, 0.2, 0.35, stem='accent', name=name)

# ── the music: bright over the standing forest, sour from the felling on
tGone = c('cnt_wood.gone')
s.note(marimba(74, 0.4, 0.9), S[0] + 0.035, 0.3, 0.1, 0.35, stem='accent', name='first note')     # 35 ms in
s.note(sub_bass(50, 0.6), S[0] + 0.035, 0.2, 0, 0, stem='bass')
bed(0, S[0] + B / 2, tGone - 0.1, BRIGHT, 1)
bed(0, tGone + 1.6, S[1], SOUR, 1, 0.7)
bed(1, S[1], S[2], SOUR, 2, 0.85)
bed(2, S[2], S[3], SOUR, 1, 0.8)
bed(3, S[3], S[4] - 3 * B, SOUR, 2, 0.85)
bed(4, S[4] + 2 * B, END - 3 * B - 0.1, SOUR, 1, 0.7)
hook(S[1], 'sour', 0.26); hook(S[4], 'sour', 0.24); hook(END - 0.6, 'sour', 0.32)
for i, t in enumerate(S[1:5]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.26, 0, at=t, name=f'cut {i + 2}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]}')

# ── 1 · the forest: birds; the marker draws the boundary and closes on "gone"; the clearing goes lane by lane
s.fx(birds(S[1] - S[0] - 0.3, rate=1.2, seed=5), S[0] + 0.1, 0.22, 0.2, name='the forest')
s.fx(pencil(max(0.6, tGone - S[0] - 0.2), seed=4), S[0] + 0.12, 0.55, -0.2, name='the marker draws the boundary')
s.fx(foley('card', 'tap'), tGone - 0.02, 0.4, 0, name='"gone": the boundary closes'); accent(tGone, BRIGHT, 0, name='"gone"')
for lane in range(12):                                                    # the kit's fellAt(): tP - 0.05 + lane * 0.1 (+ along)
    t = tGone - 0.05 + lane * 0.1
    s.fx(thump(), t + 0.08, 0.16, -0.5 + lane / 11, name=f'lane {lane + 1} falls')
    s.fx(rustle(0.32), t + 0.06, 0.32, -0.5 + lane / 11, name=f'lane {lane + 1} rustle')
s.fx(bonk(74), tGone + 1.3, 0.18, 0.1, name='the tune sours'); stab(tGone + 1.35, (62, 65, 69, 74), 0.12, 0.5)

# ── 2 · hectares: the grid ticks in row by row up the scale; on "assessment" the card and its empty box
tG, tE = c('cnt_ha.grid'), c('cnt_ha.eia')
span = max(0.8, tE - tG - 0.35); NR = 23
for r in range(NR):
    t = tG + span * (r + 0.5) / NR; s.fx(ui_tick(2200 + 90 * r), t, 0.12, -0.3 + 0.6 * r / NR, name=f'row {r + 1}')
s.fx(chime(81, 0.6), tG + span + 0.02, 0.2, 0.1, name='300+')
s.fx(paper_slide(0.4) * 6, tE - 0.12, 0.32, 0.35, name='"assessment": the card slides in'); s.fx(foley('card', 'tap'), tE + 0.25, 0.4, 0.35)
s.fx(bonk(71), tE + 0.05, 0.3, 0.3, name='the box is empty'); accent(tE, SOUR, 1, name='"assessment"')

# ── 3 · trees: the loupe glides; the count ticks faster and faster; a glock on the number
tL, tC = c('cnt_trees.loupe'), c('cnt_trees.count')
s.fx(page_flutter(0.6), S[2] + 0.1, 0.25, -0.3, name='the clipping')
s.fx(whoosh(d=1.2, way='in', bright=0.3), tL - 0.2, 0.12, 0.2, name='the loupe'); s.fx(foley('glass', 'tap'), tL, 0.3, 0.1, name='line 1: the loupe is down')
n = 14
for i in range(n):
    k = (i + 1) / n; t = tL + (tC - tL) * (k ** 0.6) - 0.02; s.fx(clock_tick(i % 2 == 1), t, 0.2, 0.1, name=f'count {i + 1}')
s.note(glock(86, 1.2, 0.8), tC, 0.3, 0.2, 0.4, stem='accent', name='"250,000"'); s.fx(sparkle(88), tC + 0.02, 0.18, 0.3)
for i in range(6): s.fx(tick(i % 4, down=False), tC + 0.6 + i * 0.45, 0.1, 0.2, name=f'more stumps ringed {i + 1}')

# ── 4 · names: paper snow; on "rules" the chime goes up a fifth
tS, tN = c('cnt_names.snow'), c('cnt_names.names')
for i in range(16):
    t = tS + i * 0.16; s.fx(page_flutter(0.5, seed=10 + i), t, 0.12 if i else 0.2, -0.6 + 1.2 * ((i * 7) % 16) / 15, name=f'names fall {i + 1}')
s.fx(chime(76, 0.5), tN, 0.24, 0.1, name='"rules": 50,000+'); s.fx(chime(83, 0.8), tN + 0.12, 0.24, 0.2); accent(tN, SOUR, 3, name='"rules"')

# ── 5 · the clipping slides in; saplings come up row by row on a kalimba scale; the label lands; the button
tF, tP2, tH = c('cnt_end.felled'), c('cnt_end.plant'), c('cnt_end.ha')
s.fx(paper_slide(0.4) * 6, tF, 0.3, -0.35, name='"Felled": the clipping')
SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83]
for r in range(10):
    t = tP2 + 1.5 * r / 10; s.note(kalimba(SCALE[r], 0.6), t, 0.2, -0.3 + 0.06 * r, 0.3, stem='accent', name=f'saplings row {r + 1}')
s.fx(tag_pop(900), tH, 0.4, 0.1, name='"130 hectares": the label lands'); s.fx(foley('card', 'tap'), tH + 0.3, 0.4, 0.1)
accent(tH, SOUR, 4, 0.22, name='"130 hectares"'); stab(tH + 0.02, (62, 65, 70, 74), 0.12, 0.5)
s.fx(chip(True), tH + 0.45, 0.16, 0.3, name='a cheerful little chime, for 130')
s.fx(stinger('deadpan'), tH + 1.0, 0.5, name='the button')

# every later word of a multi-word pop gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S[:5])] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.6, tau=0.5, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
