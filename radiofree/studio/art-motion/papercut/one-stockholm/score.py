"""One Stockholm (Doodle 4) — the cue sheet. The DOODLE palette (SOUND.md: 140 BPM, D major souring to D minor, an FM
e-piano and marimba hold-music arpeggio, a sub bass, hats and claps, the jingle in the break bar; success chimes up a
fifth, error bonks down a third) against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters
are scored by this same file. Placed by seconds from the events: a hold can lengthen a shot, so nothing here counts
on the old 37.5 s grid (rfseries' own at()).

    uv run --with numpy --with soundfile python papercut/one-stockholm/score.py <events.json> <out.wav> [<report.json> <stems>]

Stockholm on the water: the harbour laps, windows click on one by one, and on "Stockholm's" the whole city is lit on a
bright chord and a sparkle; on "jobs" the camera leaves it, a long whoosh north along the cable. In the pines the
paper city hums on the bright chords until "all of Stockholm": six card flips as it folds, a thump and a soured stab
as the grey box unfolds, and the box's hum starts and does not stop. At the fence the seller's sign creaks up on wood;
Doodle's printed sign pops up on its steel post, and the jingle sours into the map. On the map the warning bonks, a
pencil draws the power plant that is not built, and on "nationwide" a coin clinks for each price area, north to south,
up a scale. On the label the arrow slides home to 1 STOCKHOLM; on "too early to say" the stamp comes down, the button,
and the jingle lands sour.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import session
from rfseries import Doodle
from rfsound import fm_ep, marimba, pluck, sub_bass, supersaw, clap, hat, kick_tight, chime, sparkle, bonk, ui_tick, water_lap, press_stamp, \
    coin_clink, cash_register, card_flip, clank, wood_creak, pencil, paper_slide, thump, hum, room, glock, stamp
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Doodle, END + 0.5); B = 60 / Doodle.BPM
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)] + [END]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
BRIGHT, SOUR = Doodle.BRIGHT, Doodle.SOUR

def chords_at(t, i, ch):
    """the chord under time t in shot i: a bar of four beats from the cut, round the four chords"""
    return ch[int((t - S[i]) / (4 * B)) % 4]

def bed(i, t0, t1, ch, level=1, g=1.0):
    """the hold music between t0 and t1 in shot i: marimba/e-piano eighths up and down the chord, a sub bass, hats;
    level 2 adds claps on 2 and 4 and an eighth-note bass"""
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
    """the jingle, landing on t_land (a cut): D F# A F# E G … F#; 'sour' flattens the F#s and sags the landing"""
    for i, (b, n) in enumerate(Doodle.HOOK):
        n = n - 1 if mood == 'sour' and n == 78 else n; t = t_land - 3 * B + b * B
        s.note(pluck(n - (0.25 * i / 6 if mood == 'sour' else 0), 0.18), t, g, 0.15, 0.35, stem='hook', name=f'hook {mood}')
        s.note(fm_ep(n, 0.2, 0.7), t, g * 0.45, -0.15, 0.3, stem='hook', name='hook ep')
    land = Doodle.LAND - (1.4 if mood == 'sour' else 0)
    s.note(pluck(land, 0.5), t_land, g, 0.15, 0.4, stem='hook', name='hook lands'); s.note(fm_ep(land, 0.7, 0.7), t_land, g * 0.5, -0.15, 0.4, stem='hook')

def stab(t, chord, g=0.2, d=0.5):
    for j, n in enumerate(chord): s.note(supersaw(n, d, cut=3800, r=0.35, seed=j), t, g, -0.4 + 0.2 * j, 0.45, stem='stab', name='stab')

def accent(t, ch, i, g=0.26, name='accent'):
    """a pop word: the top of the chord under it, on the marimba"""
    s.note(marimba(chords_at(t, i, ch)[1][-1] + 12, 0.3, 0.9), t, g, 0.2, 0.35, stem='accent', name=name)

# ── the music: bright in the city and the clearing, sour from the fold on; quieter under the map's warning
tLit, tGo, tFold = c('os_city.lit'), c('os_city.go'), c('os_fold.fold')
s.note(marimba(74, 0.4, 0.9), S[0] + 0.035, 0.32, 0.1, 0.35, stem='accent', name='first note')     # 35 ms in: never on the first sample
s.note(sub_bass(50, 0.6), S[0] + 0.035, 0.2, 0, 0, stem='bass')
bed(0, S[0] + B / 2, S[1], BRIGHT, 1)
bed(1, S[1], tFold - 0.5, BRIGHT, 1)
bed(1, tFold + 0.6, S[2], SOUR, 1, 0.8)
bed(2, S[2], S[3] - 3 * B, SOUR, 2)
bed(3, S[3], S[4], SOUR, 2, 0.85)
bed(4, S[4] + 2 * B, END - 3 * B - 0.1, SOUR, 1, 0.7)
hook(S[1], 'bright'); hook(S[3], 'sour', 0.26); hook(END - 0.6, 'sour', 0.32)
for i, t in enumerate(S[1:5]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.28, 0, at=t, name=f'cut {i + 2}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]}')

# ── 1 · Stockholm: the harbour laps; windows click on; on "Stockholm's" the city is lit; on "jobs", north
s.fx(water_lap(S[1] - S[0], 1.4), S[0] + 0.05, 0.35, -0.2, name='the harbour')
for j in range(7):
    t = 0.25 + (tLit - 0.31) * j / 6; s.fx(ui_tick(3000 + 140 * j), t, 0.16, -0.5 + 0.17 * j, name=f'windows come on {j + 1}')
s.fx(chime(81, 0.8), tLit, 0.28, 0.1, name='"Stockholm\'s": the city lit'); s.fx(sparkle(88), tLit + 0.02, 0.3, 0.3)
for j, n in enumerate(BRIGHT[0][1]): s.note(fm_ep(n + 12, 0.9, 0.6), tLit, 0.12, -0.3 + 0.2 * j, 0.4, stem='keys', name='lit chord')
s.fx(whoosh(d=S[1] - tGo - 0.2, way='out', bright=0.5), tGo, 0.14, 0.5, name='"jobs": the camera heads north')
accent(tGo, BRIGHT, 0, name='"jobs"')

# ── 2 · the clearing: the paper city hums on the bright chords; on "all of Stockholm" it folds, the box unfolds
order = [0, 5, 1, 4, 2, 3]
for i in range(6): s.fx(card_flip(), tFold - 0.7 + order.index(i) * 0.1, 0.4, -0.5 + 0.2 * i, name=f'the city folds {i + 1}')   # the kit's foldAt()
s.fx(thump(), tFold, 0.6, 0, name='"all of Stockholm": the box unfolds'); s.fx(foley('card', 'tap'), tFold + 0.02, 0.45, 0)
stab(tFold + 0.05, (62, 65, 69, 74), 0.18, 0.6); s.fx(bonk(74), tFold + 0.32, 0.22, 0.2, name='the bright tune sours')
s.fx(clank(0.6, 520), tFold + 0.25, 0.25, 0.1, name='the box settles')
s.fx(hum(60, S[3] - tFold - 0.2) * 0.9, tFold + 0.15, 0.1, 0.1, name='the box hums')
s.fx(hum(60, END - S[4] - 0.3) * 0.9, S[4] - 0.1, 0.12, 0.1, name='the box hums under its label')

# ── 3 · the fence: the seller's sign creaks up on wood; Doodle's printed sign pops up on its post
tS, tD = c('os_jobs.sell'), c('os_jobs.doodle')
s.fx(wood_creak(0.42), tS, 0.4, -0.35, name='the seller\'s sign comes up'); s.fx(foley('wood', 'tap'), tS + 0.36, 0.5, -0.35)
s.note(marimba(78, 0.3, 0.8), tS + 0.02, 0.18, -0.3, 0.3, stem='accent', name='500')
s.fx(pop(1.1), tD, 0.35, 0.35, name='"early days": Doodle\'s sign'); s.fx(clank(0.5, 900), tD + 0.36, 0.3, 0.35); accent(tD, SOUR, 2, name='"early days"')
s.fx(chip(True), tD + 0.5, 0.18, 0.3, name='a cheerful little chime, for nothing')

# ── 4 · the map: it slides in; the warning bonks; the pencil draws a power plant that is not built; on "nationwide"
#       a coin clinks for each price area, north to south, up the scale; the till
tW, tB, tN = c('os_map.warn'), c('os_map.built'), c('os_map.nation')
s.fx(paper_slide(0.5) * 6, S[3] + 0.04, 0.3, 0, name='the map')
s.fx(bonk(71), tW, 0.32, 0.25, name='"warns": the warning'); s.fx(pop(0.8), tW + 0.02, 0.25, 0.25)
s.fx(pencil(0.8, seed=4), tB, 0.6, 0.35, name='"unless new power is built": drawn in dashes')
for i in range(4):
    t = tN - 0.06 + i * 0.12; s.fx(coin_clink(2600 + 260 * i), t, 0.4, 0.3 - 0.2 * i, name=f'price area {i + 1}'); s.fx(card_flip(), t + 0.04, 0.18, 0.3 - 0.2 * i)
accent(tN, SOUR, 3, name='"nationwide"'); s.fx(cash_register(), tN + 0.6, 0.3, 0.1, name='the till')

# ── 5 · the label: the arrow slides home to 1 STOCKHOLM; on "too early to say" the stamp; the button; the jingle sours
tA, tJ = c('os_end.power'), c('os_end.jobs')
s.fx(paper_slide(0.32) * 6, tA, 0.35, 0.3, name='"Power": the arrow slides in'); s.fx(foley('card', 'tap'), tA + 0.32, 0.5, 0.2, name='1 STOCKHOLM')
s.note(marimba(81, 0.4, 0.9), tA + 0.33, 0.2, 0.2, 0.35, stem='accent', name='one')
s.fx(press_stamp(1.0), tJ, 0.8, 0, name='"too early to say": the stamp'); s.fx(thump(), tJ + 0.01, 0.45, 0); s.fx(stamp(), tJ, 0.3, 0)
accent(tJ, SOUR, 4, 0.22, name='"too early to say"'); stab(tJ + 0.02, (62, 65, 70, 74), 0.14, 0.5)
s.fx(stinger('deadpan'), tJ + 0.75, 0.5, name='the button')

# every later word of a multi-word pop ("all OF STOCKHOLM", "early DAYS", "too EARLY TO SAY") gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S[:5])] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.6, tau=0.5, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
