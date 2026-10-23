"""One Stockholm — the VIRAL CUT (Doodle 4): the cue sheet. The DOODLE palette of the v1 draft (140 BPM, D major souring
to D minor, the FM e-piano and marimba hold music, the jingle), but driven: a kick on every beat, off-beat hats and claps
under the captions, and a HIT on frame 1 (35 ms in), because the hook is the first frame and the first sound has to land
with it. Bright for the lit city on frame 0, sour from the box on. Placed by seconds from the plan's events, so the fi
and ja masters are scored by this same file.

    uv run --with numpy --with soundfile python papercut/one-stockholm-viral/score.py <events.json> <out.wav> [<report.json> <stems>]

1 · the hit; the paper city folds a piece at a time while the caption types, a card flip each (the kit's FOLD,
    mirrored); on "Stockholm" the box thumps up and starts to hum.
2 · Stockholm on the water: the harbour laps, the windows click on in a sweep (SWEEP, mirrored); on "all of Stockholm"
    the city is lit on a slam, a chime and a sparkle.
3 · the seller's sign creaks up on "500"; Doodle's printed sign pops up on its post, and a cheerful little chime.
4 · the map slides in; the warning bonks on "operator"; a pencil draws the turbine that is not built on "new power";
    on "nationwide" a coin clinks for each price area, north to south, and the till.
5 · the label slams in; the arrow slides home to 1 STOCKHOLM; on "unclear" the stamp (TOO EARLY TO SAY); on "back"
    the label falls, the box folds down, the city stands up a card at a time (UNFOLD, mirrored) and the jingle lands
    sour as a riser hands the last frame to the first.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import session
from rfseries import Doodle
from rfsound import fm_ep, marimba, pluck, sub_bass, supersaw, clap, hat, kick_tight, chime, sparkle, bonk, ui_tick, water_lap, \
    press_stamp, coin_clink, cash_register, card_flip, clank, wood_creak, pencil, paper_slide, thump, hum, crash, saw_stab, riser, stamp
from sfx import whoosh, pop, chip, tick, foley, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Doodle, END + 0.5); B = 60 / Doodle.BPM
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)] + [END]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
BRIGHT, SOUR = Doodle.BRIGHT, Doodle.SOUR
ORDER, FOLD_T0, FOLD_END = [0, 5, 1, 4, 2, 3], 0.3, 0.25                   # os_kit.js: ORDER, FOLD (the hook)
RORDER, UNFOLD_AT, UNFOLD_STEP = [3, 2, 4, 1, 5, 0], 0.22, 0.05             # os_kit.js: RORDER, UNFOLD (the loop)
SWEEP = 0.15                                                                # os_kit.js: SWEEP (shot 2's windows)

def chords_at(t, i, ch):
    return ch[int((t - S[i]) / (4 * B)) % 4]

def bed(i, t0, t1, ch, g=1.0):
    """the driven hold music: eighths on the e-piano, a kick every beat, claps on 2 and 4, off-beat hats, eighth bass"""
    IDX = [0, 1, 2, 3, 2, 1, 2, 1]; k = max(0, int((t0 - S[i]) / (B / 2) + 0.999))
    while True:
        t = S[i] + k * B / 2
        if t >= t1 - 1e-6: break
        root, notes = chords_at(t, i, ch); n = notes[IDX[k % 8]]
        s.note(fm_ep(n, 0.2, 0.5), t, 0.13 * g, 0.3 * ((k % 4) - 1.5) / 1.5, 0.3, stem='keys', name='hold music')
        if k % 2 == 0: s.note(kick_tight(0.75), t, 0.36 * g, 0, 0, stem='drums', name='kick')
        else: s.note(hat(vel=0.45), t, 0.32 * g, -0.25, 0.05, stem='drums', name='hat off')
        if k % 4 == 2: s.note(clap(0.7), t, 0.3 * g, 0, 0.35, stem='drums', name='clap')
        s.note(sub_bass(root, 0.17), t, 0.2 * g, 0, 0, stem='bass', name='bass')
        k += 1

def hit(t, chord, g=1.0, name='hit'):
    """the slam: a kick, a sub, a saw stab on the chord, a crash"""
    s.note(kick_tight(1.0), t, 0.55 * g, 0, 0, stem='drums', name=f'{name}: kick')
    s.note(sub_bass(chord[0] - 12, 0.5), t, 0.3 * g, 0, 0, stem='bass', name=f'{name}: sub')
    for j, n in enumerate(chord): s.note(saw_stab(n, 0.3), t, 0.11 * g, -0.3 + 0.2 * j, 0.35, stem='stab', name=f'{name}: stab')
    s.fx(crash(1.6, 0.8), t, 0.22 * g, 0.15, name=f'{name}: crash')

def accent(t, i, ch=SOUR, g=0.24, name='accent'):
    s.note(marimba(chords_at(t, i, ch)[1][-1] + 12, 0.3, 0.9), t, g, 0.2, 0.35, stem='accent', name=name)

def stab(t, chord, g=0.2, d=0.5):
    for j, n in enumerate(chord): s.note(supersaw(n, d, cut=3800, r=0.35, seed=j), t, g, -0.4 + 0.2 * j, 0.45, stem='stab', name='stab')

def hook_land(t_land, g=0.28):
    """the Doodle jingle, sour, landing on t_land"""
    for i, (b, n) in enumerate(Doodle.HOOK):
        n = n - 1 if n == 78 else n; t = t_land - 3 * B + b * B
        s.note(pluck(n - 0.25 * i / 6, 0.18), t, g, 0.15, 0.35, stem='hook', name='hook sour')
    s.note(pluck(Doodle.LAND - 1.4, 0.5), t_land, g, 0.15, 0.4, stem='hook', name='hook lands')

# ── the music: the hit on frame 1, bright; sour from the box on, driven all the way; risers into every cut
tP = c('osv_hook.pop')
hit(S[0] + 0.035, (62, 66, 69, 74), 1.0, 'frame 1')                                 # 35 ms in, never sample 0
s.note(marimba(74, 0.4, 0.9), S[0] + 0.035, 0.28, 0.1, 0.35, stem='accent', name='first note')
bed(0, S[0] + 2 * B, tP - B / 2, BRIGHT, 0.6)                                     # bright while the city stands
bed(0, tP + B / 2, S[1] - B / 2, SOUR, 0.75)
bed(1, S[1] + B / 2, S[2] - B / 2, SOUR, 0.85)
bed(2, S[2] + B / 2, S[3] - B / 2, SOUR, 0.85)
bed(3, S[3] + B / 2, S[4] - B / 2, SOUR, 0.9)
bed(4, S[4] + B / 2, c('osv_end.back'), SOUR, 0.75)
for i, t in enumerate(S[1:5]):
    s.fx(riser(B * 1.5, 500, 7000), t - B * 1.5, 0.16, 0, name=f'riser into cut {i + 2}')
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.22, 0, at=t, name=f'cut {i + 2}')
    s.note(kick_tight(0.9), t, 0.4, 0, 0, stem='drums', name=f'cut {i + 2}: kick')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]}')

# ── 1 · the paper city folds, a flip a piece, the ends first; on "Stockholm" the box thumps up and hums
for i in range(6):
    t = FOLD_T0 + (tP - FOLD_END - FOLD_T0) * ORDER.index(i) / 5                  # the kit's foldStart()
    s.fx(card_flip(), t, 0.4, -0.5 + 0.2 * i, name='the city folds' if ORDER.index(i) == 0 else f'the city folds {ORDER.index(i) + 1}')
s.fx(thump(), tP, 0.6, 0, name='"Stockholm": the box comes up'); s.fx(foley('card', 'tap'), tP + 0.02, 0.45, 0)
stab(tP + 0.03, (62, 65, 69, 74), 0.16, 0.6); accent(tP, 0, SOUR, 0.28, name='"Stockholm"')
s.note(sub_bass(38, 0.4), tP, 0.3, 0, 0, stem='bass', name='"Stockholm": sub')
s.fx(clank(0.6, 520), tP + 0.22, 0.25, 0.1, name='the box settles')
s.fx(hum(60, S[1] - tP - 0.3) * 0.9, tP + 0.15, 0.1, 0.1, name='the box hums')

# ── 2 · Stockholm: the harbour laps; the windows click on in a sweep; on "all of Stockholm" it is lit, on a slam
tC = c('osv_city.pop')
s.fx(water_lap(S[2] - S[1], 1.4), S[1] + 0.05, 0.3, -0.2, name='the harbour')
for j in range(8):
    t = S[1] + SWEEP + (tC - S[1] - 0.04 - SWEEP) * j / 7; s.fx(ui_tick(3000 + 140 * j), t, 0.16, -0.6 + 0.17 * j, name='windows sweep on' if j == 0 else f'windows {j + 1}')
hit(tC, (62, 66, 69, 74), 0.8, '"all of Stockholm"')
s.fx(chime(81, 0.8), tC + 0.01, 0.26, 0.1, name='the city lit'); s.fx(sparkle(88), tC + 0.03, 0.3, 0.3)

# ── 3 · the fence: the seller's sign creaks up on "500"; Doodle's printed sign pops up on its post
tS, tD = c('osv_jobs.sell'), c('osv_jobs.doodle')
s.fx(hum(60, S[3] - S[2] - 0.2) * 0.9, S[2] + 0.05, 0.08, 0.1, name='the box hums')
s.fx(wood_creak(0.42), tS, 0.4, -0.35, name='"500": the seller\'s sign comes up'); s.fx(foley('wood', 'tap'), tS + 0.3, 0.5, -0.35)
s.note(marimba(78, 0.3, 0.8), tS + 0.02, 0.2, -0.3, 0.3, stem='accent', name='500')
s.fx(pop(1.1), tD, 0.38, 0.3, name='"maybe hundreds": Doodle\'s sign'); s.fx(clank(0.5, 900), tD + 0.3, 0.3, 0.3); accent(tD, 2, name='"maybe hundreds"')
s.note(kick_tight(1.0), tD, 0.42, 0, 0, stem='drums', name='"maybe hundreds": kick')
s.fx(chip(True), tD + 0.5, 0.18, 0.3, name='a cheerful little chime, for nothing')

# ── 4 · the map: the warning bonks; the pencil draws what is not built; on "nationwide" a coin per price area; the till
tW, tB4, tN = c('osv_map.warn'), c('osv_map.built'), c('osv_map.nation')
s.fx(paper_slide(0.5) * 6, S[3] + 0.04, 0.3, 0, name='the map')
s.fx(bonk(71), tW, 0.32, 0.25, name='"operator": the warning'); s.fx(pop(0.8), tW + 0.02, 0.25, 0.25)
s.fx(pencil(0.7, seed=4), tB4, 0.6, 0.35, name='"new power": drawn in dashes')
for i in range(4):
    t = tN - 0.06 + i * 0.12; s.fx(coin_clink(2600 + 260 * i), t, 0.4, 0.3 - 0.2 * i, name=f'price area {i + 1}'); s.fx(card_flip(), t + 0.04, 0.18, 0.3 - 0.2 * i)
hit(tN, (62, 65, 70, 74), 0.85, '"nationwide"'); accent(tN, 3, name='"nationwide"')
s.fx(cash_register(), tN + 0.6, 0.3, 0.1, name='the till')

# ── 5 · the label slams in; the arrow to 1 STOCKHOLM; the stamp on "unclear"; then back to frame 0
tA, tJ, tB = c('osv_end.power'), c('osv_end.jobs'), c('osv_end.back')
s.fx(stamp(), S[4] + 0.02, 0.4, 0, name='the label slams in'); s.fx(thump(), S[4] + 0.03, 0.4, 0)
s.fx(hum(60, tB - S[4]) * 0.9, S[4] + 0.1, 0.08, 0.1, name='the box hums behind its label')
s.fx(paper_slide(0.32) * 6, tA, 0.35, 0.3, name='"Power": the arrow slides in'); s.fx(foley('card', 'tap'), tA + 0.32, 0.5, 0.2, name='1 STOCKHOLM')
s.note(marimba(81, 0.4, 0.9), tA + 0.33, 0.2, 0.2, 0.35, stem='accent', name='one')
s.fx(press_stamp(1.0), tJ, 0.8, 0, name='"unclear": the stamp'); s.fx(thump(), tJ + 0.01, 0.45, 0); s.fx(stamp(), tJ, 0.3, 0)
s.note(kick_tight(1.0), tJ, 0.45, 0, 0, stem='drums', name='"unclear": kick')
accent(tJ, 4, SOUR, 0.22, name='"unclear"'); stab(tJ + 0.02, (62, 65, 70, 74), 0.14, 0.5)
s.fx(whoosh('short', 'out'), tB, 0.22, 0, name='"back": the label falls')
s.fx(clank(0.5, 420), tB + 0.2, 0.2, 0.1, name='the box folds down')
for o, i in enumerate(RORDER):
    s.fx(card_flip(), tB + UNFOLD_AT + o * UNFOLD_STEP, 0.32, -0.5 + 0.2 * i, name='the city stands up' if o == 0 else f'the city stands up {o + 1}')
s.fx(chime(81, 0.6), tB + UNFOLD_AT + 5 * UNFOLD_STEP + 0.2, 0.14, 0.1, name='lit again')
hook_land(tB, 0.26)
s.fx(riser(END - tB, 400, 9000), tB, 0.22, 0, name='"back": the riser into frame 1')

# every later word of a multi-word pop gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S[:5])] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.05, tau=0.5, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
