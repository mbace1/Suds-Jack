"""analyse.py a.wav [b.wav ...] — numbers to stand in for listening.
Per file: DC, clipped samples, spectral centroid (energy-weighted, 2048/512 STFT), spectral flatness,
low/high energy split, onset density (spectral-flux peaks), tempo (autocorrelation of the onset
envelope, 60–180 BPM, with the strongest candidates), per-shot RMS dB; and, if HITS[name] is
known, the nearest onset to every picture hit."""
import sys, json, numpy as np, soundfile as sf
SR = 48000; PB = 60 / 112; CUT = [k * 12 * PB for k in range(6)]; T_HIT = CUT[5] + 3.0
import os; HITS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hits.json'))) if len(sys.argv) > 1 else {}

def stft(x, n=2048, h=512):
    w = np.hanning(n); fr = np.lib.stride_tricks.sliding_window_view(np.pad(x, (n // 2, n // 2)), n)[::h] * w
    return np.abs(np.fft.rfft(fr, axis=1)), h / SR

def onsets(S, dt):
    L = np.log1p(S * 50); flux = np.maximum(0, np.diff(L, axis=0)).sum(1); flux = np.concatenate([[0], flux])
    med = np.convolve(flux, np.ones(15) / 15, 'same'); o = flux - med - 0.02 * flux.max()
    pk = [i for i in range(1, len(o) - 1) if o[i] > 0 and o[i] >= o[i - 1] and o[i] > o[i + 1] and flux[i] > 0.06 * flux.max()]
    out = []
    for i in pk:
        if not out or (i - out[-1]) * dt > 0.03: out.append(i)
    return flux, np.array(out) * dt

def tempo(flux, dt):
    f = flux - flux.mean(); ac = np.correlate(f, f, 'full')[len(f) - 1:]; ac /= ac[0]
    bpms = np.arange(60, 181); sc = []
    for b in bpms:
        lag = 60 / b / dt; i = int(lag); fr = lag - i
        v = ac[i] * (1 - fr) + ac[i + 1] * fr
        lag2 = 2 * lag; j = int(lag2); v2 = ac[j] * (1 - (lag2 - j)) + ac[j + 1] * (lag2 - j)
        sc.append(v + 0.5 * v2)
    sc = np.array(sc); top = bpms[np.argsort(sc)[::-1]]
    best = [top[0]]
    for b in top[1:]:
        if all(abs(b - c) > 4 for c in best): best.append(b)
        if len(best) == 3: break
    return best

rows = []
for p in sys.argv[1:]:
    x, sr = sf.read(p); mono = x.mean(1); name = p.split('/')[-1]
    S, dt = stft(mono); f = np.fft.rfftfreq(2048, 1 / SR); P = S ** 2; e = P.sum(1)
    act = e > e.max() * 1e-4
    cen = (P[act] * f).sum(1) / e[act]; cent = np.exp(np.average(np.log(cen), weights=e[act]))
    flat = np.exp(np.mean(np.log(P[act] + 1e-12), 1)) / (P[act].mean(1) + 1e-12)
    lo = P[:, f < 250].sum() / P.sum(); hi = P[:, f > 4000].sum() / P.sum()
    f2 = f ** 2; Aw = (12194 ** 2 * f2 ** 2) / ((f2 + 20.6 ** 2) * np.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2)); PA = P * Aw ** 2
    centA = float((PA.sum(0) * f).sum() / PA.sum())
    flux, on = onsets(S, dt)
    shot_db = [20 * np.log10(np.sqrt((mono[int(a * SR):int(b * SR)] ** 2).mean()) + 1e-9) for a, b in zip(CUT, CUT[1:] + [37.5])]
    r = dict(centA=centA, name=name, dc=float(np.abs(x.mean(0)).max()), clip=int((np.abs(x) > 0.999).sum()), centroid=cent, flat=float(np.median(flat)),
             low=lo, high=hi, onsets_per_s=len(on) / 37.5, tempo=tempo(flux, dt), shots=shot_db)
    k1 = int(1.0 / dt); f0 = flux - np.convolve(flux, np.ones(k1) / k1, 'same'); ac = np.correlate(f0, f0, 'full')[len(f0) - 1:]; ac /= ac[0]   # detrended: swells are not a tempo
    def at(sec): i = sec / dt; k = int(i); return ac[k] * (1 - (i - k)) + ac[k + 1] * (i - k)
    r['grid'] = {bpm: round(float(at(60 / bpm)), 3) for bpm in (84, 112, 140, 168)}
    def align(bpm, tol=0.025):
        g = 60 / bpm / 2; d = np.abs(on / g - np.round(on / g)) * g
        return float((d <= tol).mean() / (2 * tol / g))
    r['lattice'] = {bpm: round(align(bpm), 2) for bpm in (84, 112, 140)}   # x chance; 168's beat IS 84's half-beat
    edges = [0, 100, 250, 1000, 4000, 24000]; tot = P.sum(); r['bands'] = [float(P[:, (f >= a) & (f < b)].sum() / tot) for a, b in zip(edges, edges[1:])]
    rows.append(r)
    print(f"{name:26s} DC={r['dc']:.1e} clip={r['clip']} centroid={cent:6.0f}Hz A-wtd={centA:5.0f}Hz flat={r['flat']:.3f} <250Hz={lo:5.1%} >4k={hi:5.1%} onsets/s={r['onsets_per_s']:4.1f} tempo≈{r['tempo']}")
    print(' ' * 26, 'shot RMS dB:', ' '.join(f'{v:6.1f}' for v in shot_db))
    print(' ' * 26, 'lattice fit (x chance) 84|168 / 112 / 140:', r['lattice'], ' lag pulse:', r['grid'], ' bands <100/100-250/250-1k/1-4k/>4k:', ' '.join(f'{v:5.1%}' for v in r['bands']))
    key = next((k for k in HITS if k in name), None)
    if key:
        bad = []
        for t, lab in HITS[key]:
            d = on[np.argmin(np.abs(on - t))] - t
            if abs(d) > 0.03: bad.append(f'{lab}@{t:.3f}({d*1000:+.0f}ms)')
        print(' ' * 26, f'picture hits: {len(HITS[key]) - len(bad)}/{len(HITS[key])} have an onset within 30 ms', ('MISSING: ' + ', '.join(bad)) if bad else '')
json.dump(rows, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'analysis.json'), 'w'), default=float, indent=1)
