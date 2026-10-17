"""The library sheet: every sound in sfx.SHEET laid end to end, a labelled spectrogram, and a numeric check of each
(no NaN, no DC, starts and ends at silence, peak in range). Run after any change to sfx.py.

    uv run --with numpy --with soundfile --with matplotlib python pipeline/sound/sheet.py <out_dir>
"""
import sys, json
from pathlib import Path
here = Path(__file__).resolve().parent; sys.path[:0] = [str(here), str(here.parents[1] / 'lib')]
import numpy as np, soundfile as sf
from sfx import SHEET, LIB, SR

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
gap = int(0.35 * SR); parts, marks, rows = [], [], []
pos = 0
for name, fn in SHEET:
    x = np.asarray(fn(), float); marks.append((pos / SR, name)); parts += [x, np.zeros(gap)]; pos += len(x) + gap
    rows.append({'sound': name, 'seconds': round(len(x) / SR, 3), 'peak': round(float(np.abs(x).max()), 3), 'dc': round(float(x.mean()), 5),
                 'edge': round(float(max(abs(x[0]), abs(x[-1]))), 4), 'finite': bool(np.isfinite(x).all())})
y = np.concatenate(parts); sf.write(out / f'{LIB}-sheet.wav', np.stack([y, y], 1) * 0.8, SR)
bad = [r for r in rows if not r['finite'] or abs(r['dc']) > 0.01 or r['edge'] > 0.01 or not (0.2 <= r['peak'] <= 0.95)]
(out / f'{LIB}-sheet.json').write_text(json.dumps({'lib': LIB, 'sounds': rows, 'bad': bad}, indent=1))
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
n = len(marks); per = 9; fig, axes = plt.subplots((n + per - 1) // per, 1, figsize=(18, 2.6 * ((n + per - 1) // per)))
for k, ax in enumerate(np.atleast_1d(axes)):
    a = marks[k * per][0]; b = marks[(k + 1) * per][0] if (k + 1) * per < n else len(y) / SR
    seg = y[int(a * SR):int(b * SR)]; ax.specgram(seg, NFFT=1024, Fs=SR, noverlap=768, cmap='magma', vmin=-110, vmax=-20)
    ax.set_ylim(0, 14000); ax.set_yticks([0, 4000, 8000, 12000]); ax.tick_params(labelsize=7)
    for t, name in marks[k * per:(k + 1) * per]: ax.text(t - a + 0.01, 13000, name, color='w', fontsize=8, va='top')
fig.suptitle(f'{LIB}: {n} sounds', fontsize=10); fig.tight_layout(); fig.savefig(out / f'{LIB}-sheet.png', dpi=80)
print(f'{LIB}: {n} sounds, {len(y) / SR:.1f} s; {len(bad)} flagged', *(f"\n  {r['sound']}: {r}" for r in bad))
