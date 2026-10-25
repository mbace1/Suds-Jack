"""Secret Inquiry (Doodle 7): the cue sheet. The Doodle palette at 140 BPM, D minor and driven, like Count the Trees'
viral cut, since it is the same map a month on. A HIT on frame 1 (35 ms in, never sample 0), because the hook is the
first frame. Placed by seconds from the plan's events, so the fi and ja masters are scored by this same file.

    uv run --with numpy --with soundfile python papercut/secret-inquiry/score.py <events.json> <out.wav> [<report.json> <stems>]

1 · the hit; a low siren in whoops under the light bar from frame 0; the folder hops and slams on "investigate"
    (a stamp, a thump, dust).
2 · a loupe glides over the label; on "secret" the old seal lifts and the new one comes down hard (a wax stamp, a hit).
3 · the camera pans to the stream; water trickles down the ditches; on "acidification" a sour, falling bend and a
    murky low chord as the stream turns rust.
4 · the two tags pop on the punch; the bed thins for the hold; the jingle lands on "back", the last chord rings out
    under the clipping's return.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import session
from rfseries import Doodle
from rfsound import fm_ep, marimba, pluck, sub_bass, clap, hat, kick_tight, chime, bonk, thump, tag_pop, crash, \
    saw_stab, riser, glide, led_flicker, press_stamp, stamp, glock, paper_slide, rustle
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
    """eighths on the e-piano, a kick every beat, claps on 2 and 4, off-beat hats, eighth bass; drums=False thins it"""
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
    s.note(kick_tight(1.0), t, 0.55 * g, 0, 0, stem='drums', name=f'{name}: kick')
    s.note(sub_bass(chord[0] - 12, 0.5), t, 0.3 * g, 0, 0, stem='bass', name=f'{name}: sub')
    for j, n in enumerate(chord): s.note(saw_stab(n, 0.3), t, 0.11 * g, -0.3 + 0.2 * j, 0.35, stem='stab', name=f'{name}: stab')
    s.fx(crash(1.6, 0.8), t, 0.22 * g, 0.15, name=f'{name}: crash')

def accent(t, i, g=0.24, name='accent'):
    s.note(marimba(chords_at(t, i)[1][-1] + 12, 0.3, 0.9), t, g, 0.2, 0.35, stem='accent', name=name)

def hook_land(t_land, g=0.28):
    for i, (b, n) in enumerate(Doodle.HOOK):
        n = n - 1 if n == 78 else n; t = t_land - 3 * B + b * B
        s.note(pluck(n - 0.25 * i / 6, 0.18), t, g, 0.15, 0.35, stem='hook', name='hook sour')
    s.note(pluck(Doodle.LAND - 1.4, 0.5), t_land, g, 0.15, 0.4, stem='hook', name='hook lands')

tI, tS = c('sci_hook.inv'), c('sci_why.seal')
tD, tA = c('sci_acid.ditch'), c('sci_acid.acid')
tP, tB, tCl = c('sci_end.punch'), c('sci_end.back'), c('sci_end.clip')

# ── the music: the hit on frame 1, a driven sour bed, risers into every cut; it thins for the punchline's hold
hit(S[0] + 0.035, (62, 65, 69, 74), 1.0, 'frame 1')
s.note(marimba(74, 0.4, 0.9), S[0] + 0.035, 0.28, 0.1, 0.35, stem='accent', name='first note')
bed(0, S[0] + 2 * B, S[1] - B / 2, 0.75)
for i in range(1, NS - 1): bed(i, S[i] + B / 2, S[i + 1] - B / 2, 0.82)
bed(NS - 1, S[NS - 1] + B / 2, tP - 0.05, 0.75)
bed(NS - 1, tP + B, tB - 0.05, 0.6, drums=False)
for i, t in enumerate(S[1:NS]):
    s.fx(riser(B * 1.5, 500, 7000), t - B * 1.5, 0.16, 0, name=f'riser into cut {i + 2}')
    s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.22, 0, at=t, name=f'cut {i + 2}')
    s.note(kick_tight(0.9), t, 0.4, 0, 0, stem='drums', name=f'cut {i + 2}: kick')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]}')

# ── 1 · the light bar from frame 0 (a low siren), the folder hops and slams on "investigate"
n = max(2, int((tI + 0.8) / 0.34))
for i in range(n):
    t = 0.12 + i * 0.34; up = i % 2 == 0
    s.fx(glide(600, 1150, 0.3) if up else glide(1150, 600, 0.3), t, 0.07 if t < tI else 0.12, -0.2, name='siren' if i == 0 else f'siren {i + 1}')
s.fx(led_flicker(min(2.4, tI + 0.8), rate=16), 0.05, 0.35, 0.2, name='the light bar')
s.fx(paper_slide(0.3) * 4, tI - 0.32, 0.2, 0, name='the folder lifts')
s.fx(stamp(), tI, 0.55, 0, name='"investigate": the folder slams'); s.fx(thump(), tI + 0.01, 0.3, 0)
s.fx(rustle(0.3), tI + 0.05, 0.18, 0.1, name='dust'); accent(tI, 0, 0.26, name='"investigate"')

# ── 2 · the loupe, and the seal on "secret"
s.fx(glide(900, 1300, 0.9), S[1] + 0.25, 0.05, -0.3, name='the loupe glides')
s.fx(foley('card', 'tap'), tS - 0.12, 0.25, 0.1, name='the old seal lifts')
hit(tS, (62, 65, 68, 74), 0.85, '"secret": the seal'); s.fx(press_stamp(1.0, seed=7), tS + 0.01, 0.45, 0.1)
s.fx(bonk(70), tS + 0.25, 0.2, 0.2, name='nothing under the lens')

# ── 3 · the ditches trickle to the stream; "acidification" bends sour and sinks
s.fx(paper_slide(0.25) * 3, tD, 0.18, 0.3, name='the ditches start')
for i in range(6):
    s.fx(chime(88 - i, 0.25), tD + 0.2 + i * 0.22, 0.06, 0.4, name='trickle' if i == 0 else f'trickle {i + 1}')
s.fx(glide(520, 340, 1.1), tA, 0.12, 0.3, name='"acidification": the sour bend')
for j, n in enumerate((50, 53, 56)): s.note(fm_ep(n, 1.4, 0.5), tA + 0.02, 0.1, -0.2 + 0.2 * j, 0.4, stem='keys', name='murky chord')
s.note(sub_bass(37, 0.6), tA, 0.28, 0, 0, stem='bass', name='"acidification": sub'); accent(tA, 2, 0.2, name='"acidification"')

# ── 4 · the two tags on the punch; the hold; the jingle lands on "back"; the last chord rings under the clipping
s.fx(tag_pop(900), tP, 0.45, -0.1, name='REASONS: SECRET'); s.fx(tag_pop(1100), tP + 0.18, 0.4, 0.3, name='THE WATER')
s.note(kick_tight(1.0), tP, 0.45, 0, 0, stem='drums', name='punch: kick'); accent(tP, NS - 1, 0.24, name='punch')
hook_land(tB, 0.26)
s.fx(whoosh(d=tCl - tB + 0.3, way='out', bright=0.4), tB, 0.12, 0, name='"back": home to frame 0')
for j, n in enumerate((50, 57, 62, 65, 69, 76)):
    s.note(fm_ep(n, END - tB, 0.5, r=1.2), tB + 0.01 * j, 0.11, -0.35 + 0.14 * j, 0.45, stem='keys', name='the last chord')
s.note(sub_bass(38, END - tB), tB, 0.22, 0, 0, stem='bass', name='the last chord: sub')
s.fx(paper_slide(0.35) * 6, tCl - 0.22, 0.26, -0.1, name='the clipping rises'); s.fx(foley('card', 'tap'), tCl, 0.4, 0, name='"clip": the clipping lands')
s.note(glock(86, END - tCl + 0.5, 0.6), tCl, 0.18, 0.15, 0.5, stem='accent', name='the clipping lands: glock')

for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S[:NS])] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.7, tau=0.55, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
