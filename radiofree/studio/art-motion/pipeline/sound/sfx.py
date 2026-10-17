"""The designed sound library, v1 (PRODUCTION-STANDARD.md, "The sound pipeline" 2). Built once, versioned, shared by
every film: a score asks for `whoosh('mid')` and gets the same whoosh in every film, instead of each score
re-inventing one from noise.

    from sfx import *          # (pipeline/sound on sys.path, with lib/ for rfsound)
    whoosh('short', 'in')      # → a mono numpy array at 48 kHz

Every sound is DETERMINISTIC: it draws from its own generator, seeded from its name and arguments, never from
rfsound's shared `rng` — so adding a sound to a score never changes another one, and a library version means
something. Change a sound's character → bump LIB and say what changed in pipeline/README.md.

    UI and motion   whoosh(length, way)  swish()  pop(pitch)  chip(good)  tick(i)  tap(dull)  slap()  ripple()
    foley           foley(material, action, vel)   material: paper card wood glass clay
                                                   action:   tap drop slide flip
    stingers        stinger('reveal' | 'deadpan' | 'alarm')
    sonic logos     logo_rfh()  logo_toko()
"""
import zlib
import numpy as np
from rfsound import SR, tv, hz, soft, fm_ep, felt_piano, kalimba, sub_bass

LIB = 'sfx-1'


def _g(*key):
    """a generator of its own for every (name, args): the library never touches anyone else's randomness"""
    return np.random.default_rng(zlib.crc32(repr(key).encode()))


def _noise(d, g, lo=None, hi=None):
    x = g.standard_normal(int(d * SR))
    return soft(x, lo, hi, 2) if (lo or hi) else x


def _tvbp(x, fc, q=1.4, n=1024, hop=256):
    """a band-pass whose centre moves (fc: one value per sample), done frame by frame in the frequency domain with
    overlap-add: smooth, zero-phase, no recursion — the band a whoosh moves through"""
    w = np.hanning(n); out = np.zeros(len(x) + n); norm = np.zeros(len(x) + n); f = np.fft.rfftfreq(n, 1 / SR)
    xp = np.concatenate([x, np.zeros(n)])
    for s in range(0, len(x), hop):
        c = fc[min(len(fc) - 1, s + n // 2)]; bw = c / q
        H = np.exp(-0.5 * ((f - c) / bw) ** 2)
        out[s:s + n] += np.fft.irfft(np.fft.rfft(xp[s:s + n] * w) * H, n) * w; norm[s:s + n] += w * w
    return (out / np.maximum(norm, 1e-6))[:len(x)]


def _fade(x, a=0.002, r=0.01):
    n = len(x); e = np.ones(n); ka, kr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:ka] = np.linspace(0, 1, ka); e[-kr:] *= np.linspace(1, 0, kr); return x * e


def _norm(x, peak=0.9): return x * (peak / max(1e-9, np.abs(x).max()))


def _put(x, sig, t0, g=1.0):
    """add sig into x at t0 seconds, clipped to x's length"""
    a = int(t0 * SR)
    if a < len(x): n = min(len(sig), len(x) - a); x[a:a + n] += sig[:n] * g
    return x


# ─── UI and motion ─────────────────────────────────────────────────────────────────────────────────────────────
WHOOSH = {'short': 0.24, 'mid': 0.42, 'long': 0.8}


def whoosh(length='mid', way='in', bright=1.0, d=None):
    """air past the lens. 'in' swells into the moment it lands (peak at 80%, a fast cut-off), 'out' leaves from it
    (fast attack, long tail). The band climbs as it arrives and falls as it leaves, the way a pass-by does.
    d (seconds) overrides the preset length, to make a move's whoosh exactly as long as the move."""
    d = d or WHOOSH[length]; g = _g('whoosh', length, way, bright, d); t = tv(d); k = t / d
    peak = 0.8 if way == 'in' else 0.2
    env = np.where(k < peak, np.clip(k / peak, 0, 1) ** 2.2, np.exp(-np.clip((k - peak) / (1 - peak), 0, 1) * (6 if way == 'in' else 3.2)))
    up, dn = np.clip(k / peak, 0, 1), np.clip((k - peak) / (1 - peak), 0, 1)
    fc = np.where(k < peak, 500 + 4200 * up ** 1.5, 4700 - 3900 * dn ** 0.7) * bright
    body = _tvbp(_noise(d, g), fc, q=1.2)
    air = _tvbp(_noise(d, g), fc * 2.2, q=2.5) * 0.35
    return _fade(_norm((body + air) * env, 0.8), 0.003, 0.02)


def swish():
    """a fast, high flick — a chip or a card moving a short way"""
    d = 0.16; g = _g('swish'); t = tv(d); k = t / d
    env = np.sin(np.pi * k) ** 2.5; fc = 2500 + 5500 * np.sin(np.pi * k)
    return _fade(_norm(_tvbp(_noise(d, g), fc, 1.8) * env, 0.6))


def pop(pitch=1.0):
    """an element popping onto the screen: a round bubble — a falling sine and a 2 ms click"""
    d = 0.11; g = _g('pop', pitch); t = tv(d)
    f = (260 + 900 * np.exp(-t * 70)) * pitch; ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 34)
    click = _noise(0.004, g, 1500, 9000) * np.exp(-tv(0.004) * 900)
    x = body.copy(); x[:len(click)] += click * 0.35
    return _fade(_norm(x, 0.75), 0.0005, 0.01)


def _glass(f, d, idx=2.2, ratio=3.5, decay=14):
    t = tv(d); I = idx * np.exp(-t * 18)
    return np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * decay)


def chip(good=True):
    """a UI chip landing: good is a glassy step up a major third; bad steps down a semitone with a short buzz under"""
    if good:
        x = np.zeros(int(0.32 * SR)); a = _glass(hz(88), 0.25); b = _glass(hz(92), 0.26)
        x[:len(a)] += a * 0.7; s = int(0.065 * SR); x[s:s + len(b)] += b[:len(x) - s]
    else:
        x = np.zeros(int(0.34 * SR)); a = _glass(hz(84), 0.2); b = _glass(hz(83), 0.26); t = tv(0.16)
        buzz = soft(np.sign(np.sin(2 * np.pi * 110 * t)), None, 1400) * np.exp(-t * 16) * 0.3
        x[:len(a)] += a * 0.6; s = int(0.07 * SR); x[s:s + len(b)] += b[:len(x) - s]; x[s:s + len(buzz)] += buzz
    return _fade(_norm(x, 0.7), 0.001, 0.03)


def tick(i=0, down=True):
    """a counter's tick: a short blip and a click, a semitone further (down, or up) on each step i"""
    d = 0.05; g = _g('tick', i, down); t = tv(d); f = 2600 * 2 ** ((-i if down else i) / 12)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 90) * 0.6 + _noise(d, g, 3000, 12000) * np.exp(-t * 260) * 0.5
    return _fade(_norm(x, 0.6), 0.0005, 0.008)


def tap(dull=False):
    """a fingertip on a plastic button. dull=True is the button that does nothing: the body and no click"""
    d = 0.16; g = _g('tap', dull); t = tv(d)
    body = np.sin(2 * np.pi * (150 + 70 * np.exp(-t * 60)) * t) * np.exp(-t * (28 if dull else 40))
    x = body + (0 if dull else _noise(d, g, 2500, 9000) * np.exp(-t * 400) * 0.6)
    return _fade(_norm(x, 0.8), 0.0005, 0.02)


def slap():
    """a sticky note slapped onto paper: a flat paper crack, a small body, and the tack of the glue strip"""
    d = 0.22; g = _g('slap'); t = tv(d)
    crack = _noise(d, g, 400, 6500) * np.exp(-t * 38)
    body = np.sin(2 * np.pi * (95 + 60 * np.exp(-t * 50)) * t) * np.exp(-t * 22) * 0.7
    tack = _noise(d, g, 5000, 12000) * np.exp(-np.maximum(0, t - 0.012) * 300) * (t > 0.012) * 0.25
    return _fade(_norm(crack + body + tack, 0.85), 0.0004, 0.03)


def ripple():
    """the ring that spreads from a tap on glass or a screen: a soft rising shimmer, quiet by design"""
    d = 0.6; g = _g('ripple'); t = tv(d); k = t / d
    x = _tvbp(_noise(d, g), 3000 + 6000 * k, 6) * np.sin(np.pi * k) ** 1.5
    return _fade(_norm(x, 0.35))


# ─── foley, by material ────────────────────────────────────────────────────────────────────────────────────────
# modes: (frequency Hz, decay seconds, amplitude); noise: the band the contact noise lives in; ring: how much the body sings
MATERIAL = {
    'paper': dict(modes=[], noise=(1200, 9000), contact=0.010, ring=0.0),
    'card': dict(modes=[(180, 0.06, 1.0), (430, 0.03, 0.5)], noise=(700, 6000), contact=0.008, ring=0.5),
    'wood': dict(modes=[(240, 0.12, 1.0), (610, 0.08, 0.6), (1240, 0.05, 0.35), (2150, 0.03, 0.2)], noise=(400, 4000), contact=0.004, ring=0.8),
    'glass': dict(modes=[(1830, 0.35, 1.0), (4110, 0.25, 0.6), (6950, 0.18, 0.4), (9230, 0.12, 0.25)], noise=(2000, 12000), contact=0.002, ring=0.9),
    'clay': dict(modes=[(95, 0.05, 1.0), (160, 0.035, 0.6)], noise=(150, 1200), contact=0.02, ring=0.6),
}


def _strike(m, vel, g, d=None):
    M = MATERIAL[m]; d = d or max([0.15] + [dk * 4 for _, dk, _ in M['modes']]); t = tv(d)
    ex = _noise(M['contact'], g, *M['noise']) * np.hanning(int(M['contact'] * SR))
    x = np.zeros(len(t)); x[:len(ex)] += ex * (1 - M['ring'] * 0.5)
    for f, dk, a in M['modes']:
        x += np.sin(2 * np.pi * f * (1 + g.uniform(-0.01, 0.01)) * t + g.uniform(0, 6)) * np.exp(-t / dk) * a * M['ring'] * 0.6 * np.minimum(1, t / 0.0015)
    if m == 'clay':                                   # clay gives: a squelch as it takes the shape
        sq = _tvbp(_noise(0.09, g), np.geomspace(1400, 300, int(0.09 * SR)), 2.0) * np.exp(-tv(0.09) * 30) * 0.5; x[:len(sq)] += sq
    return x * vel


def foley(material='paper', action='tap', vel=1.0):
    """a contact sound for a thing made of `material`: tap (one strike), drop (a strike and a smaller bounce),
    slide (friction along it), flip (a sheet turning over — paper and card; other materials turn with a tap)"""
    g = _g('foley', material, action, vel); M = MATERIAL[material]
    if action == 'tap':
        x = _strike(material, 1.0, g)
    elif action == 'drop':
        a = _strike(material, 1.0, g); b = _strike(material, 0.35, g); s = int(0.085 * SR)
        x = np.zeros(max(len(a), s + len(b))); x[:len(a)] += a; x[s:s + len(b)] += b
    elif action == 'slide':
        d = 0.45; t = tv(d); k = t / d
        grain = np.cumsum(g.standard_normal(len(t))) ; grain = soft(grain - soft(grain, None, 3), None, 30)
        mod = 0.6 + 0.4 * np.tanh(grain / max(1e-9, np.abs(grain).max()) * 3)
        x = _noise(d, g, *M['noise']) * mod * np.sin(np.pi * k) ** 0.8 * 0.5
    elif action == 'flip':
        if material in ('paper', 'card'):
            d = 0.38; t = tv(d); x = np.zeros(len(t))
            for i, (t0, a) in enumerate([(0.0, 0.5), (0.07, 0.8), (0.15, 1.0), (0.24, 0.6)]):
                s = int(t0 * SR); n = int(0.07 * SR); seg = _noise(0.07, g, *M['noise']) * np.hanning(n) * a; x[s:s + n] += seg[:len(x) - s]
            land = _strike(material, 0.7, g); s = int(0.28 * SR); x = np.concatenate([x, np.zeros(max(0, s + len(land) - len(x)))]); x[s:s + len(land)] += land
        else:
            x = _strike(material, 0.6, g)
    else:
        raise ValueError(action)
    return _fade(_norm(x, 0.8 * vel), 0.0004, 0.02)


# ─── stingers ──────────────────────────────────────────────────────────────────────────────────────────────────
def stinger(kind='reveal'):
    """reveal: three notes up, a shimmer and a sub drop under the last — the 'here it is' beat.
    deadpan: one dry, muted low note and nothing after it — the comic button.  alarm: two tones, twice."""
    g = _g('stinger', kind)
    if kind == 'reveal':
        x = np.zeros(int(1.4 * SR))
        for i, (m, t0) in enumerate([(76, 0.0), (79, 0.09), (84, 0.18)]):
            s = fm_ep(m, 0.5 if i == 2 else 0.18, 0.8); a = int(t0 * SR); x[a:a + len(s)] += s[:len(x) - a] * (0.7 if i < 2 else 1.0)
        sh = _tvbp(_noise(1.0, g), np.geomspace(3000, 11000, int(1.0 * SR)), 4) * np.exp(-tv(1.0) * 3); a = int(0.18 * SR); x[a:a + len(sh)] += sh * 0.25
        sb = sub_bass(45, 0.5); x[a:a + len(sb)] += sb * 0.5
    elif kind == 'deadpan':
        t = tv(0.5); x = np.sin(2 * np.pi * hz(45) * t) * np.exp(-t * 14) + np.sin(2 * np.pi * hz(57) * t) * np.exp(-t * 30) * 0.3
        x = soft(x, None, 900)
    elif kind == 'alarm':
        x = np.zeros(int(0.9 * SR))
        for i in range(4):
            f = 960 if i % 2 == 0 else 770; t = tv(0.2); s = soft(np.sign(np.sin(2 * np.pi * f * t)), None, 3500) * np.minimum(1, t / 0.005) * np.minimum(1, (0.2 - t) / 0.01)
            a = int(i * 0.22 * SR); x[a:a + len(s)] += s[:len(x) - a] * 0.4
    else:
        raise ValueError(kind)
    return _fade(_norm(x, 0.85), 0.0005, 0.05)


# ─── sonic logos ───────────────────────────────────────────────────────────────────────────────────────────────
RFH_CALL = (67, 72, 79)       # G C G: the station's call, the same three notes as the sign-off jingle (synth_signoff.py)


def logo_rfh():
    """Radio Free Helsinki, 1.8 s: a tuning chirp finds the station, the ON AIR lamp clicks, and the call rings out
    over a soft open fifth. The motif of every RFH score is these three notes."""
    g = _g('logo_rfh'); x = np.zeros(int(1.8 * SR))
    d = 0.26; t = tv(d); ch = _tvbp(_noise(d, g), np.geomspace(700, 3800, len(t)), 3) * np.sin(np.pi * t / d) * 0.35
    sw = np.sin(2 * np.pi * np.cumsum(np.geomspace(380, 1500, len(t))) / SR) * np.sin(np.pi * t / d) * 0.12
    x[:len(t)] += ch + sw
    lamp = tap(); a = int(0.27 * SR); x[a:a + len(lamp)] += lamp * 0.35
    for i, m in enumerate(RFH_CALL):
        t0 = 0.32 + i * 0.16; _put(x, fm_ep(m, 0.9 if i == 2 else 0.22, 0.75), t0, 0.6); _put(x, _glass(hz(m + 12), 0.5, 1.2, 2.0, 9), t0, 0.12)
    for m in (55, 62):
        p = felt_piano(m, 1.0, 0.35); a = int(0.64 * SR); x[a:a + len(p)] += p[:len(x) - a] * 0.35
    return _fade(_norm(x, 0.85), 0.002, 0.25)


def logo_toko():
    """Toko Midori, 1.4 s: the mark's resting animation is a blink, so the logo is one — two soft lids closing and
    opening — between two felt notes a fifth apart, and a kalimba spark on the last."""
    x = np.zeros(int(1.4 * SR))
    a1 = felt_piano(65, 0.5, 0.5); x[:len(a1)] += a1[:len(x)] * 0.6
    for t0 in (0.32, 0.41):
        lid = foley('clay', 'tap', 0.4); a = int(t0 * SR); x[a:a + len(lid)] += lid[:len(x) - a] * 0.5
    a2 = felt_piano(72, 0.8, 0.55); a = int(0.5 * SR); x[a:a + len(a2)] += a2[:len(x) - a] * 0.7
    k = kalimba(89, 0.6); a = int(0.52 * SR); x[a:a + len(k)] += k[:len(x) - a] * 0.35
    return _fade(_norm(x, 0.8), 0.002, 0.2)


# the library sheet: every sound, in order, for pipeline/sound/sheet.py to lay end to end and look at
SHEET = [('whoosh short in', lambda: whoosh('short', 'in')), ('whoosh mid in', lambda: whoosh('mid', 'in')), ('whoosh long in', lambda: whoosh('long', 'in')),
         ('whoosh mid out', lambda: whoosh('mid', 'out')), ('swish', swish), ('pop', pop), ('pop high', lambda: pop(1.5)), ('chip good', chip), ('chip bad', lambda: chip(False)),
         ('tick 0', tick), ('tick 4', lambda: tick(4)), ('tap', tap), ('tap dull', lambda: tap(True)), ('slap', slap), ('ripple', ripple)] + \
        [(f'{m} {a}', (lambda m=m, a=a: foley(m, a))) for m in MATERIAL for a in ('tap', 'drop', 'slide', 'flip')] + \
        [('stinger reveal', stinger), ('stinger deadpan', lambda: stinger('deadpan')), ('stinger alarm', lambda: stinger('alarm')), ('logo rfh', logo_rfh), ('logo toko', logo_toko)]
