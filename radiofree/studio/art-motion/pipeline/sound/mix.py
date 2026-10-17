"""The mix chain (PRODUCTION-STANDARD.md, "The sound pipeline" 4 and 5): one Session per film, three buses, the
series' room, ducking, the house finish, and the checks that fail a mix before anyone hears it.

    s = Session(dur, series=RFH)                 # stems.RFH, or rfseries' Doodle / Coxon / Toko
    s.note(sig, t, g, pan, stem='keys')          # MUSIC bus (kept per stem as well, for export)
    s.fx(sig, t, g, pan, at=t_hit, name='slap')  # EFFECTS bus; `at` is when it is HEARD to land (a whoosh peaks late)
    s.voice(sig, t)                              # VOICE bus — empty until voice is un-held; music ducks under it
    s.duck(t0, t1, -3.5, why='caption')          # music down under a key caption
    rep = s.render(out_wav, ring_from, tau, end, cues=..., exempt=..., quiet=..., stems_dir=...)

render() = ducks → series EQ on music → pour (music, effects, voice) → the series' reverb per bus → glue → the
lightest limiter that keeps loudnorm linear (rfseries' search) → the house finish (−14 LUFS integrated, −2 dBTP,
tail rung out) → measured independently with ffmpeg's ebur128 → checks:
    loudness   integrated within 0.5 LU of −14
    true peak  at most −1.0 dBTP
    silence    no gap quieter than −50 dBFS longer than 1.5 s, unless it is marked `quiet` (a joke, a beat)
    continuity (a warning) at most 8% of the film below −35 dBFS outside the quiet spans: a score that drops to the
               room between its hits reads as unfinished (The Chair Is Taken v1 sat there 17% of its length)
    coverage   every cue the picture lists has a sound landing within 40 ms, or a written exemption
"""
import sys, json, re, subprocess
from pathlib import Path
here = Path(__file__).resolve().parent; sys.path[:0] = [str(here), str(here.parents[1] / 'lib')]
from rfsound import *
from rfseries import Score

LUFS, TP_MAX, SILENCE_DB, SILENCE_S, COVER_S = -14.0, -1.0, -50.0, 1.5, 0.04


def measure(path):
    """integrated loudness, true peak and loudness range of an audio or video file, by ffmpeg's ebur128 (independent of ours)"""
    p = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', str(path), '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    s = p.stderr[p.stderr.rindex('Summary:'):]
    num = lambda k: float(re.search(k + r':\s+(-?[\d.]+|-inf)', s).group(1).replace('-inf', '-120'))
    return {'I': num('I'), 'LRA': num('LRA'), 'TP': num('Peak')}


def session(series, dur):
    """a Session that also writes in an rfseries voice — Coxon's chorale, roll_into, ruff and hit, Toko's waltz —
    with every placement still logged and mixed by this chain. (Their at()/march() count on the old 37.5 s grid;
    a pipeline film places by seconds from its events.)"""
    return type(f'{series.__name__}Session', (Session, series), {})(dur)


class Session(Score):
    def __init__(self, dur, series=None):
        if series is not None:
            for k in ('BPM', 'VERB', 'GLUE', 'EQ', 'LIMIT', 'PLR', 'LRA', 'PEAK'):
                if hasattr(series, k): setattr(self, k, getattr(series, k))
        super().__init__(dur)
        self.voc = Bus(dur); self.vwet = Bus(dur); self.stems = {}; self.log = []; self.ducks = []

    # ── placement (everything is logged, so coverage can be checked against the picture's cues) ──
    def note(self, sig, t, g=1.0, pan=0.0, wet=0.2, stem='music', name=None):
        self.log.append({'t': round(t, 4), 'bus': 'music', 'what': name or stem})
        super().note(sig, t, g, pan, wet)
        self.stems.setdefault(stem, Bus(self.dur)).add(sig, t, g, pan)

    def fx(self, sig, t, g=1.0, pan=0.0, wet=0.12, at=None, name='fx'):
        self.log.append({'t': round(t if at is None else at, 4), 'bus': 'fx', 'what': name})
        super().fx(sig, t, g, pan, wet)

    def voice(self, sig, t, g=1.0, pan=0.0, wet=0.05, name='voice'):
        self.log.append({'t': round(t, 4), 'bus': 'voice', 'what': name})
        self.voc.add(sig, t, g, pan)
        if wet: self.vwet.add(sig, t, g * wet, pan)

    def duck(self, t0, t1, db=-3.5, attack=0.06, release=0.3, why=''):
        self.ducks.append({'t0': t0, 't1': t1, 'db': db, 'attack': attack, 'release': release, 'why': why})

    def _duck_curve(self):
        t = np.arange(self.mus.N) / SR; gdb = np.zeros(len(t))
        for d in self.ducks:
            w = np.clip((t - (d['t0'] - d['attack'])) / d['attack'], 0, 1) * np.clip(((d['t1'] + d['release']) - t) / d['release'], 0, 1)
            gdb = np.minimum(gdb, d['db'] * w)
        v = np.maximum(np.abs(self.voc.L), np.abs(self.voc.R))
        if v.max() > 0:                                           # under a voice: up to −8 dB, following its envelope
            h = int(0.01 * SR); n = len(v) // h; e = v[:n * h].reshape(n, h).max(1); e = np.convolve(e, np.ones(15) / 15, 'same')
            e = np.interp(np.arange(len(v)), np.arange(n) * h, e / max(1e-9, e.max())); gdb = np.minimum(gdb, -8.0 * np.clip(e * 3, 0, 1))
        return 10 ** (gdb / 20)

    # ── the mix ──
    def render(self, out, ring_from, tau=1.0, end=None, cues=(), exempt=None, quiet=(), stems_dir=None, report=None):
        end = end or self.dur; exempt = exempt or {}
        gc = self._duck_curve()
        for b in (self.mus, self.mwet): b.L *= gc; b.R *= gc
        if self.EQ.get('db') or self.EQ.get('hp'):
            for b in (self.mus, self.mwet): b.L = shelf(b.L, **self.EQ); b.R = shelf(b.R, **self.EQ)
        m = Mix(self.dur)
        for b in (self.mus, self.sfx, self.voc): b.into(m)
        for b in (self.mwet, self.fwet, self.vwet): b.verb(m, **self.VERB)
        trim(m, 1.0); glue(m, **self.GLUE)
        L0, R0 = m.L.copy(), m.R.copy(); tried = []
        for thr in (None, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -14):        # rfseries.Score.render's search
            m.L, m.R = L0.copy(), R0.copy(); trim(m, 1.0)
            if thr is not None: glue(m, thresh=thr, **self.LIMIT)
            trim(m, self.PEAK)
            x = np.tanh(np.stack([m.L, m.R], 1) * 1.2) / 1.2; x /= np.abs(x).max() / 0.89; e = int(end * SR); x = x[:e]
            t0 = int(ring_from * SR); x[t0:] *= np.exp(-np.arange(e - t0) / SR / tau)[:, None]; fd = int(0.3 * SR); x[-fd:] *= np.linspace(1, 0, fd)[:, None]
            plr = true_peak(x) - bs1770(x); tried.append(f'{thr}:{plr:.1f}')
            if plr <= self.PLR:
                I, tp, lr = loudnorm_measure(x)
                if tp + (-14.0 - I) <= -2.1 and lr <= self.LRA: break
        m.finish(out, end, ring_from, tau)
        if stems_dir:                                            # dry stems at the mix's relative levels, before the finish
            sd = Path(stems_dir); sd.mkdir(parents=True, exist_ok=True); k = 0.89 / max(1e-9, np.abs(np.stack([L0, R0])).max())
            for name, b in [*(('music-' + n, b) for n, b in self.stems.items()), ('fx', self.sfx), ('voice', self.voc)]:
                if np.abs(b.L).max() > 0: sf.write(sd / f'{name}.wav', np.stack([b.L, b.R], 1)[:int(end * SR)] * k, SR)
        return self.check(out, end, cues, exempt, quiet, tried, report)

    # ── the checks ──
    def check(self, wav, end, cues, exempt, quiet, tried=(), report=None):
        M = measure(wav); y, _ = sf.read(wav); mono = np.abs(y).max(1) if y.ndim > 1 else np.abs(y)
        h = int(0.05 * SR); n = len(mono) // h; rms = 20 * np.log10(np.sqrt((y[:n * h] ** 2).reshape(n, h, -1).mean((1, 2))) + 1e-12)
        gaps, run = [], None
        for i, v in enumerate(rms):
            t = i * h / SR
            if v < SILENCE_DB and t < end - 0.4: run = run if run is not None else t
            else:
                if run is not None and t - run > SILENCE_S: gaps.append((round(run, 2), round(t, 2)))
                run = None
        inq = lambda a, b: any(a >= q0 - 0.1 and b <= q1 + 0.4 for q0, q1 in quiet)
        tw = np.arange(len(rms)) * h / SR; live = np.array([(t < end - 0.6) and not any(q0 <= t < q1 for q0, q1 in quiet) for t in tw])
        hollow = float((rms[live] < -35).mean()) if live.any() else 0.0
        times = np.array(sorted(e['t'] for e in self.log)) if self.log else np.zeros(0)
        missed = []
        for name, t in cues:
            if name in exempt: continue
            if not len(times) or np.abs(times - t).min() > COVER_S: missed.append((name, round(t, 3), round(float(np.abs(times - t).min()), 3) if len(times) else None))
        checks = [
            {'check': 'loudness', 'result': 'pass' if abs(M['I'] - LUFS) <= 0.5 else 'FAIL', 'why': f"{M['I']:.1f} LUFS integrated (target {LUFS})"},
            {'check': 'true peak', 'result': 'pass' if M['TP'] <= TP_MAX else 'FAIL', 'why': f"{M['TP']:.1f} dBTP (at most {TP_MAX})"},
            {'check': 'silence', 'result': 'pass' if all(inq(a, b) for a, b in gaps) else 'FAIL',
             'why': 'no unmarked gap over 1.5 s' + ''.join(f'; {a}–{b} s ' + ('(marked quiet)' if inq(a, b) else 'UNMARKED') for a, b in gaps)},
            {'check': 'continuity', 'result': 'pass' if hollow <= 0.08 else 'warn', 'why': f'{hollow:.0%} of the film below −35 dBFS outside the quiet spans (at most 8%)'},
            {'check': 'coverage', 'result': 'pass' if not missed else 'FAIL',
             'why': f"{len(cues) - len(exempt) - len(missed)}/{len(cues) - len(exempt)} cues have a sound within {int(COVER_S * 1000)} ms" + (f'; missing {missed}' if missed else '')},
            *({'check': f'exempt {k}', 'result': 'pass', 'why': v} for k, v in exempt.items()),
        ]
        rep = {'wav': str(wav), 'measured': M, 'limiter': list(tried), 'ducks': self.ducks, 'quiet': [list(q) for q in quiet], 'checks': checks, 'placed': len(self.log)}
        if report: Path(report).write_text(json.dumps(rep, indent=1))
        bad = [c for c in checks if c['result'] == 'FAIL']
        for c in checks:
            if c['result'] != 'pass': print(f"  {c['result']:4}  {c['check']}: {c['why']}")
        print(f"sound: {len(checks) - len(bad)} pass, {len(bad)} FAIL  ({M['I']:.1f} LUFS, {M['TP']:.1f} dBTP, LRA {M['LRA']:.1f})")
        return rep
