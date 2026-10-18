"""Build one master of a film, by pipeline: picture → text → sound → encode → checks. One command, one report.

    uv run --with numpy --with soundfile --with matplotlib python pipeline/build.py <film dir> --lang en --fonts <dir> --out <dir>
        [--engine <huashu engine dir>] [--reuse-picture] [--signoff <station sign-off mp4>] [--air]

Two kinds of film, one pipeline after the picture:
  a PAGE film   film.html draws the frames itself and does its own captions through captions.js (Kill Switch);
  an ENGINE film   film.json: a papercut film drawn by the huashu engine. plan.mjs resolves its timeline from the
                copy (holds land on the beat grid), the scenes read it as window.FILM_PLAN, the engine renders the
                picture, and the CAPTION PASS (text/overlay.html) puts the words on its frames (The Chair Is Taken).
Both directories hold copy.json (every word on screen, in every language) and score.py (the cue sheet: events.json
in, a WAV out, through pipeline/sound). Out:
    <out>/<lang>/<film>.<lang>.mp4          the master, captions burned in in <lang>
    <out>/<lang>/<film>.<lang>-master.*.srt/.vtt   sidecars, every language, on this master's timeline
    <out>/<lang>/stems/                      dry music and effects stems
    <out>/<lang>/build-report.md             every check, pass / warn / FAIL — the build fails on any FAIL
    <out>/<lang>/qa-*.png                    a contact sheet at the caption moments, and the score's spectrogram with its cues
--air: the broadcast build. Unread languages fail instead of warn.
"""
import sys, json, subprocess, shutil, os
from pathlib import Path
HERE = Path(__file__).resolve().parent; ART = HERE.parent
sys.path[:0] = [str(HERE / 'sound'), str(ART / 'lib')]
from mix import measure, LUFS, TP_MAX

a = sys.argv[1:]; opt = lambda k, d=None: a[a.index('--' + k) + 1] if '--' + k in a else d
FILM = (ART / a[0]).resolve() if not Path(a[0]).is_absolute() else Path(a[0]); LANG = opt('lang', 'en'); AIR = '--air' in a
OUT = Path(opt('out', str(ART / 'build'))) / LANG; FONTS = opt('fonts'); OUT.mkdir(parents=True, exist_ok=True)
copy = json.load(open(FILM / 'copy.json')); name = copy['film']
run = lambda *c, **k: subprocess.run([str(x) for x in c], check=True, **k)
fails = []

# 1. picture: frames, events (the retimed beats and every word), the text report measured with the real fonts
# the global modules of the `node` that will run (not of whichever npm is first on PATH), plus any NODE_PATH already set
npm = ':'.join(filter(None, [os.environ.get('NODE_PATH'), subprocess.run(['node', '-p', "require('path').resolve(process.execPath, '../../lib/node_modules')"], capture_output=True, text=True).stdout.strip()]))
if (OUT / 'frames').exists(): shutil.rmtree(OUT / 'frames')
FJ = json.load(open(FILM / 'film.json')) if (FILM / 'film.json').exists() else {'kind': 'page'}
if FJ['kind'] == 'engine':
    ENGINE = Path(opt('engine')).resolve(); key = FJ['engine']
    run('node', HERE / 'plan.mjs', FILM, LANG, OUT)                                    # the timeline, from the copy
    for lib in FJ['libs'] + [f'scenes/{s}.js' for s in FJ['scenes']]: shutil.copy(ART / lib, ENGINE / lib)   # stage: the repo is the source
    shutil.copy(OUT / 'film-plan.js', ENGINE / 'scenes' / f'{key}_plan.js'); shutil.copy(OUT / 'eras.js', ENGINE / f'eras_{key}.js')
    if not ('--reuse-picture' in a and (OUT / 'picture.mp4').exists()):         # --reuse-picture: the scenes did not change, only words or sound
        run('uv', 'run', '-q', '--with', 'playwright==1.56.0', 'python', ENGINE / 'render.py', '--film', key, '--width', '1080', '--height', '1920',
            '--fps', FJ['fps'], '--out', OUT / 'picture.mp4', cwd=ENGINE)
    if (OUT / 'src').exists(): shutil.rmtree(OUT / 'src')
    (OUT / 'src').mkdir(); run('ffmpeg', '-y', '-loglevel', 'error', '-i', OUT / 'picture.mp4', '-q:v', '2', OUT / 'src' / 'f%05d.jpg')
    n = len(list((OUT / 'src').glob('f*.jpg')))
    run('node', HERE / 'render.mjs', 'pipeline/text/overlay.html', OUT, '--fonts', FONTS, '--lang', LANG, '--mount', f'_out={OUT}',
        '--query', f'plan=/_out/plan.json&src=/_out/src/&n={n}', env={**os.environ, 'NODE_PATH': npm})
    shutil.rmtree(OUT / 'src')
else:
    # measure before drawing: a page film can take an hour and a half to render (Welcome Home did, and then failed on
    # four lines 40–90 px too wide), while its text report takes seconds. Every language must fit before any frame.
    for L in copy['langs']:
        pre = OUT / 'pre' / L
        run('node', HERE / 'render.mjs', FILM.relative_to(ART) / 'film.html', pre, '--fonts', FONTS, '--lang', L, '--query', 'busy=0', '--report-only', env={**os.environ, 'NODE_PATH': npm})
        r = json.load(open(pre / 'report.json'))
        bad = [f"{L}:{c['id']} {max(c['widths'])} px" for c in r['captions'] if max(c['widths']) > 800 or not c['inSafe'] or c['inRail']] + \
              [f"{L}:ui.{k} to x {u['x1']}" for k, u in r.get('ui', {}).items() if not u['ok']]
        if bad: sys.exit('pre-flight: these lines do not fit, fix the copy before rendering: ' + '; '.join(bad))
    run('node', HERE / 'render.mjs', FILM.relative_to(ART) / 'film.html', OUT, '--fonts', FONTS, '--lang', LANG, env={**os.environ, 'NODE_PATH': npm})
rep = json.load(open(OUT / 'report.json')); ev = json.load(open(OUT / 'events.json'))

# 2. text: sidecars in every language, and the checks
t = subprocess.run([sys.executable, HERE / 'text' / 'text.py', FILM / 'copy.json', OUT / 'report.json', OUT] + (['--air'] if AIR else []))
text_checks = json.load(open(OUT / 'text-checks.json'))

# 3. sound: the film's cue sheet through the library, the series stems and the mix chain
run(sys.executable, FILM / 'score.py', OUT / 'events.json', OUT / 'score.wav', OUT / 'sound-report.json', OUT / 'stems')
sound = json.load(open(OUT / 'sound-report.json'))

# 4. encode, then measure what was actually delivered (AAC can raise a peak)
mp4 = OUT / f'{name}.{LANG}.mp4'
run('ffmpeg', '-y', '-loglevel', 'error', '-framerate', rep['fps'], '-i', OUT / 'frames' / 'f%05d.jpg', '-i', OUT / 'score.wav',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '256k', '-shortest', mp4)
M = measure(mp4)
final = [{'check': 'delivered loudness', 'result': 'pass' if abs(M['I'] - LUFS) <= 0.5 else 'FAIL', 'why': f"{M['I']:.1f} LUFS in the MP4"},
         {'check': 'delivered true peak', 'result': 'pass' if M['TP'] <= TP_MAX else 'FAIL', 'why': f"{M['TP']:.1f} dBTP in the MP4"}]
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], capture_output=True, text=True).stdout)
final.append({'check': 'length', 'result': 'pass' if abs(dur - ev['end']) < 0.1 else 'FAIL', 'why': f'{dur:.2f} s, the picture says {ev["end"]:.2f} s'})
if opt('signoff'):                                                                     # the station's sign-off, as append_signoff.sh does it
    so = OUT / f'{name}.{LANG}+signoff.mp4'
    run('ffmpeg', '-loglevel', 'error', '-y', '-i', mp4, '-i', opt('signoff'), '-filter_complex',
        '[0:v]setsar=1,fps=30[a0];[1:v]setsar=1,fps=30[b0];[0:a]aresample=48000[a1];[1:a]aresample=48000[b1];[a0][a1][b0][b1]concat=n=2:v=1:a=1[v][ac];[ac]alimiter=limit=0.63:attack=1:release=60:level=false[a]',
        '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', so)   # 256k as the master: at 192k AAC rang a glass chip up 2 dB
    MS = measure(so)
    final += [{'check': 'with sign-off: loudness', 'result': 'pass' if abs(MS['I'] - LUFS) <= 1.0 else 'FAIL', 'why': f"{MS['I']:.1f} LUFS ({so.name})"},
              {'check': 'with sign-off: true peak', 'result': 'pass' if MS['TP'] <= TP_MAX else 'FAIL', 'why': f"{MS['TP']:.1f} dBTP"}]

# 5. QA images for a person: frames at each caption's fully-revealed moment and mid-way, and the score with its cues
times = sorted({round(min(c['t1'] - 0.05, max(w['t'] for w in ev['words'] if w['caption'] == c['id']) + 0.6), 2) for c in ev['captions']} |
               {round(ev[k], 2) for k in ('land', 'jam', 'picts', 'flipB', 'slap', 'tap', 'tagIn') if k in ev} | {round(ev['end'] - 0.3, 2)} |
               {round(v + 0.25, 2) for v in (ev.get('cues') or {}).values()})
frames = [min(int(round(x * rep['fps'])), rep['frames'] - 1) for x in times]
sel = '+'.join(f'eq(n\\,{f})' for f in frames); cols = 6
run('ffmpeg', '-y', '-loglevel', 'error', '-i', mp4, '-vf', f"select='{sel}',scale=300:-1,tile={cols}x{(len(frames) + cols - 1) // cols}:padding=6:color=0x222222", '-frames:v', '1', OUT / 'qa-frames.png')
import numpy as np, soundfile as sf, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
y, sr = sf.read(OUT / 'score.wav'); fig, ax = plt.subplots(2, 1, figsize=(16, 5), sharex=True)
ax[0].specgram(y.mean(1), NFFT=2048, Fs=sr, noverlap=1536, cmap='magma', vmin=-120, vmax=-30); ax[0].set_ylim(0, 12000)
env = np.sqrt(np.convolve(y.mean(1) ** 2, np.ones(480) / 480, 'same')); ax[1].plot(np.arange(len(env)) / sr, 20 * np.log10(env + 1e-9), lw=0.6); ax[1].set_ylim(-70, 0)
for k, v in ev.items():
    if isinstance(v, (int, float)): ax[1].axvline(v, color='r', lw=0.5, alpha=0.6); ax[1].text(v, -5, k, fontsize=6, rotation=90, va='top')
for q in ev.get('quiet', []): ax[1].axvspan(q['t0'], q['t1'], color='y', alpha=0.2)
for c in ev['captions']: ax[0].axvspan(c['t0'], c['t1'], ymin=0.95, color='c', alpha=0.5)
fig.suptitle(f'{name} {LANG}: score — spectrogram (caption spans in cyan), level in dB with the picture\'s beats (quiet spans in yellow)', fontsize=9)
fig.tight_layout(); fig.savefig(OUT / 'qa-sound.png', dpi=80)

# 6. one report
allc = [('text', c) for c in text_checks] + [('sound', c) for c in sound['checks']] + [('delivery', c) for c in final]
bad = [c for _, c in allc if c['result'] == 'FAIL']; warn = [c for _, c in allc if c['result'] == 'warn']
lines = [f'# {name} — {LANG} master, built by pipeline', '', f'**{"FAILED" if bad else "PASSED"}**: {len(allc) - len(bad) - len(warn)} pass, {len(warn)} warn, {len(bad)} fail' + (' (broadcast build)' if AIR else ' (preview build: unread languages warn)'), '',
         f'- length {dur:.2f} s · holds {ev.get("holds") or "none"}', f'- delivered {M["I"]:.1f} LUFS, {M["TP"]:.1f} dBTP, LRA {M["LRA"]:.1f}', '', '| stage | check | result | why |', '|---|---|---|---|']
lines += [f'| {st} | {c["check"]} | {c["result"]} | {c["why"].replace("|", "/")} |' for st, c in allc]
(OUT / 'build-report.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
shutil.rmtree(OUT / 'frames')
print(f'{name} {LANG}: {"FAILED" if bad else "PASSED"} — {len(bad)} fail, {len(warn)} warn → {mp4}')
sys.exit(1 if bad else 0)
