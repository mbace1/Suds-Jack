"""The pipeline's own gate: every check must be seen to FAIL on a broken input, or a green build means nothing.

    uv run --with numpy --with soundfile python pipeline/test_checks.py
"""
import sys, json, tempfile, subprocess
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path[:0] = [str(HERE / 'sound'), str(HERE.parent / 'lib')]
import numpy as np
from mix import Session
from sfx import pop
from rfsound import SR, trombone

tmp = Path(tempfile.mkdtemp()); ok = True


def expect(name, got, want):
    global ok; good = got == want; ok &= good
    print(f"{'ok ' if good else 'BAD'}  {name}: {got} (want {want})")


def sound(gap=None, quiet=(), cue_at=1.1, bed=True):
    """a 6 s mix of pops every 0.25 s over a held chord, with an optional hole in it and one cue to cover"""
    s = Session(6.5)
    if bed:
        for a, b in ([(0.1, gap[0]), (gap[1], 5.9)] if gap else [(0.1, 5.9)]):
            if b - a > 0.3: s.note(trombone(48, b - a - 0.25, 0.4, a=0.05, r=0.15), a, 0.5)
    for t in np.arange(0.1, 5.9, 0.25):
        if gap and gap[0] <= t < gap[1]: continue
        s.fx(pop(), t, 0.6, name='pop')
    rep = s.render(str(tmp / 'x.wav'), ring_from=5.7, tau=0.3, end=6.0, cues=[('hit', cue_at)], quiet=quiet)
    return {c['check']: c['result'] for c in rep['checks']}


r = sound(); expect('clean mix: all pass', sorted(set(r.values())), ['pass'])
expect('a cue with nothing on it', sound(cue_at=1.1 + 0.125)['coverage'], 'FAIL')
expect('hits with nothing between', sound(bed=False)['continuity'], 'warn')
expect('an unmarked 2.2 s hole', sound(gap=(2.0, 4.2))['silence'], 'FAIL')
expect('the same hole, marked quiet', sound(gap=(2.0, 4.2), quiet=[(2.0, 4.2)])['silence'], 'pass')

# text: a synthetic report with one line too wide, one too short on screen, one in the right rail
base = {'id': 'a', 'text': 'x', 'plain': 'x' * 40, 't0': 0, 't1': 3, 'shown': 3.0, 'read': 3.0, 'lastWord': 1.0, 'widths': [700], 'box': {'x': 150, 'y': 200, 'w': 780, 'h': 300},
        'inSafe': True, 'inRail': False, 'covers': [], 'busy': None, 'native': True}
copy = {'film': 't', 'langs': ['en'], 'native_read': {'en': True}, 'captions': [{'id': 'a', 'text': {'en': '[x]'}, 'source': 's'}]}
(tmp / 'copy.json').write_text(json.dumps(copy))
for name, patch, check in [('a line 830 px wide', {'widths': [830]}, 'width en:a'), ('2.4 s on screen for 3 s of reading', {'shown': 2.4}, 'reading time en:a'),
                           ('a caption in the right rail', {'inRail': True}, 'safe zone en:a'), ('a caption over the key detail', {'covers': [{'t': 1, 'what': 'chip'}]}, 'key detail en:a')]:
    (tmp / 'r.json').write_text(json.dumps({'lang': 'en', 'end': 3, 'holds': [], 'captions': [{**base, **patch}], 'ui': {}}))
    subprocess.run([sys.executable, str(HERE / 'text' / 'text.py'), str(tmp / 'copy.json'), str(tmp / 'r.json'), str(tmp)], capture_output=True)
    res = {c['check']: c['result'] for c in json.load(open(tmp / 'text-checks.json'))}
    expect(name, res[check], 'FAIL')
# the message lint: no argument, four facts, and a film that opens on a fact instead of its question all FAIL
good = {**copy, 'argument': 'one sentence', 'captions': [{**copy['captions'][0], 'role': 'setup'}, {**copy['captions'][0], 'role': 'punchline'}]}
(tmp / 'r.json').write_text(json.dumps({'lang': 'en', 'end': 3, 'holds': [], 'captions': [base], 'ui': {}}))
for name, cp, check in [('a copy with no argument', {**good, 'argument': ''}, 'message: argument'),
                        ('four facts', {**good, 'captions': good['captions'][:1] + [{**copy['captions'][0], 'role': 'evidence'}] * 4 + good['captions'][1:]}, 'message: three facts at most'),
                        ('a film that opens on a fact', {**good, 'captions': [{**copy['captions'][0], 'role': 'evidence'}] + good['captions']}, 'message: asked first'),
                        ('a caption with no role', {**good, 'captions': good['captions'] + [copy['captions'][0]]}, 'message: roles')]:
    (tmp / 'copy.json').write_text(json.dumps(cp)); (tmp / 'text-checks.json').unlink(missing_ok=True)   # a crash must not read the last case's result
    subprocess.run([sys.executable, str(HERE / 'text' / 'text.py'), str(tmp / 'copy.json'), str(tmp / 'r.json'), str(tmp)], capture_output=True)
    expect(name, {c['check']: c['result'] for c in json.load(open(tmp / 'text-checks.json'))}[check], 'FAIL')
copy['native_read']['en'] = False; (tmp / 'copy.json').write_text(json.dumps(copy)); (tmp / 'r.json').write_text(json.dumps({'lang': 'en', 'end': 3, 'holds': [], 'captions': [base], 'ui': {}}))
for air, want in [(False, 'warn'), (True, 'FAIL')]:
    subprocess.run([sys.executable, str(HERE / 'text' / 'text.py'), str(tmp / 'copy.json'), str(tmp / 'r.json'), str(tmp)] + (['--air'] if air else []), capture_output=True)
    expect(f'unread language, {"broadcast" if air else "preview"} build', {c['check']: c['result'] for c in json.load(open(tmp / 'text-checks.json'))}['native read en'], want)
print('pipeline checks:', 'ALL OK' if ok else 'BROKEN'); sys.exit(0 if ok else 1)
