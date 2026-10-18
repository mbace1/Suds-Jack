"""Same Trick, Two Verdicts (EU/US) — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's
sounds against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.
The puppets TALK: a wordless babble out of a phone's tiny speaker, one syllable on every opening of the paper jaw —
the same clock the scenes use (tv_kit.js voice()), so the mouth and the sound agree. Nothing in it is a word, so
nobody is quoted. The answers land as table sounds: a rubber stamp cuts the chancellor off mid-syllable, the sticker
slaps on and the candidate goes on talking under it, muffled; the gavel knocks it off, the speech bubbles pop, and
the voice comes back clear. In the EU the label lands and shrinks to a corner bug that spoils nothing, and the voice never stops.

    uv run --with numpy --with soundfile python papercut/same-trick/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json, math
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, slap, foley, stinger, WHOOSH
from rfsound import stamp, press_stamp, gavel, toy_voice, soft, paper_slide, rustle, tag_pop, ui_tick, thump

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
VOW = 'aeoiuaoe'

def talk(t0, t1, shot0, phase=0.0, f0=210, g=0.2, pan=0.0, muffle=False, name='the puppet talks'):
    """a syllable at every peak of the jaw's clock between t0 and t1 (absolute); its loudness is the clock's phrase
    shape at that moment, exactly as tv_kit.js voice() opens the jaw"""
    k = math.ceil(((t0 - shot0 + phase) * 9.7 - math.pi / 2) / math.pi)
    while True:
        lt = (math.pi / 2 + k * math.pi) / 9.7 - phase; t = shot0 + lt; k += 1
        if t >= t1: break
        u = lt + phase; a = (0.55 + 0.45 * math.sin(u * 2.9 + 1.3)) * (1 if math.sin(u * 1.3) > -0.75 else 0.1)
        if a < 0.2 or t < t0: continue
        v = toy_voice(f0 * (1 + 0.12 * math.sin(k * 2.3)), VOW[k % len(VOW)], 0.17)
        if muffle: v = soft(v, None, 900) * 1.6
        s.fx(v, t - 0.085, g * a, pan, at=t, name=name)

# ── the music: lighter under the question, full from Berlin
bed(s, S[0] + 0.5, S[1], quiet, level=1)
bed(s, S[1], END - 0.6, quiet)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.35, 0, at=t, name=f'cut {i + 2}')

# ── shot 1 · the trick: the phone wakes and the chancellor talks; on the pull-back the poster joins in; two tags drop
s.fx(foley('paper', 'tap', 0.7), S[0], 0.45, 0, name='the open: paper on the mat'); motif(s, S[0] + 0.05, g=0.3)
s.fx(ui_tick(), c('tv_trick.strip'), 0.3, -0.3, name='the voice strip lights')
talk(c('tv_trick.strip'), S[1] - 0.1, S[0], 0, 210, 0.18, -0.35)
s.fx(swish(), c('tv_trick.pull'), 0.3, 0, name='the camera pulls back')
talk(c('tv_trick.pull') + 0.1, S[1] - 0.1, S[0], 0.7, 250, 0.14, 0.4, name='the poster talks too')
pw = [w['t'] for w in EV['words'] if w['caption'] == 'question' and w['pop']]
for j, t in enumerate(pw): s.fx(foley('card', 'drop', 0.8), t, 0.5, -0.4 + 0.8 * j, name=f'"two answers": tag {j + 1}')
accent(s, c('tv_trick.two'), S[0], 0.25, name='two answers')

# ── shot 2 · Berlin: the chancellor talks; BANNED cuts him off mid-syllable; the tab slides out on "satire"
tB, tS = c('tv_berlin.banned'), c('tv_berlin.satire')
talk(S[1], tB, S[1], 0, 210, 0.2, -0.1)
s.fx(stamp(), tB, 0.85, 0, name='"banned": BANNED'); s.fx(press_stamp(0.9), tB, 0.45, 0); accent(s, tB, S[0], 0.22, name='banned')
s.fx(paper_slide(0.3), tS - 0.12, 0.45, 0.2, at=tS, name='"satire": the tab slides out'); s.fx(tap(), tS + 0.18, 0.3, 0.2); accent(s, tS, S[0], 0.25, name='satire')

# ── shot 3 · California: the candidate talks through a loudspeaker; it swells on "voice"; the sticker slaps on "label"
tV, tL = c('tv_cal.voice'), c('tv_cal.label')
talk(S[2] + 0.1, tL, S[2], 0.7, 250, 0.2, 0.1)
s.fx(pop(0.8), tV, 0.25, 0.1, name='"voice": it swells')
s.fx(slap(), tL, 0.8, 0, name='"label": LABEL REQUIRED slaps on'); s.fx(foley('paper', 'tap'), tL + 0.02, 0.4, 0); accent(s, tL, S[0], 0.28, name='label')
talk(tL + 0.3, S[3] - 0.1, S[2], 0.7, 250, 0.12, 0.1, muffle=True, name='talking under the sticker')

# ── shot 4 · the judge: muffled under the sticker; the gavel knocks it off; the bubbles pop; the voice comes back clear
tG, tSp, tN = c('tv_judge.gavel'), c('tv_judge.speech'), c('tv_judge.ban')
talk(S[3], tN, S[3], 0.7, 250, 0.11, 0.1, muffle=True, name='still muffled')
s.fx(whoosh('mid', 'in'), tG - 0.6, 0.35, 0.4, name='the gavel comes down')
s.fx(gavel(), tG, 0.8, 0, name='"down": the gavel'); s.fx(thump(), tG, 0.35, 0)
s.fx(swish(), tG + 0.05, 0.4, 0.6, name='the sticker flies off'); s.fx(rustle(0.4), tG + 0.1, 0.35, 0.7)
for j in range(4): s.fx(tag_pop(800 + 140 * j), tSp + j * 0.1, 0.35, [-0.5, 0.5, -0.4, 0.4][j], name=f'"speech": bubble {j + 1}')
s.fx(chip(True), tN, 0.45, 0, name='"ban": the voice is back'); accent(s, tN, S[0], 0.28, name='ban')
talk(tN, S[4] - 0.1, S[3], 0.7, 250, 0.2, 0.1, name='talking, clear')

# ── shot 5 · the EU: the chancellor talks; the label comes down on "need a label" and shrinks to a corner bug on
# "spoil the joke", and the voice never stops
tLb, tLi = c('tv_eu.labelled'), c('tv_eu.light')
talk(S[4] + 0.05, END - 0.7, S[4], 0, 210, 0.17, -0.1, name='the chancellor, labelled and talking')
s.fx(whoosh('mid', 'in'), tLb, 0.35, 0, name='"labelled": the label comes down')
s.fx(tap(dull=True), tLi, 0.6, 0.3, name='"spoil the joke": the label shrinks to a corner bug'); accent(s, tLi, S[0], 0.3, name='spoil the joke')
for j, w in enumerate([w for w in EV['words'] if w['caption'] == 'last' and w['pop']][1:]): s.fx(ui_tick(3400 - 300 * j), w['t'] + 0.01, 0.3, 0.35, at=w['t'] + 0.03, name=f'pop word {j + 2}: the bug settles')
s.fx(stinger('deadpan'), tLi + 0.8, 0.45)
motif(s, S[4] + 0.2, g=0.35)
sting(s, END - 0.6)

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
