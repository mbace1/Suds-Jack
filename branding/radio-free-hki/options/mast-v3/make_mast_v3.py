#!/usr/bin/env python3
"""Radio Free Helsinki: lattice mast icon, v3 variations (papercut, dimensional).

Self-contained (does not import make_options, which regenerates everything).
Everything is drawn at 2x (2160 px) and downsampled for clean edges.
Run:  python3 make_mast_v3.py
"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__)) + '/'
S = 2                     # supersample
N = 1080 * S              # working canvas
C = N // 2                # centre

NIGHT = (13, 15, 22)
DEEP  = (24, 26, 44)
MIDN  = (34, 36, 60)
OCHRE = (227, 163, 58)
MAG   = (240, 2, 127)
CREAM = (251, 243, 228)
SHADOW = (6, 4, 14)

def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

# ── paper helpers ───────────────────────────────────────────────
_noise = {}
def fibre(seed):
    """paper.js-like fibre: fine grain + short strokes, values ~0.9..1.1"""
    if seed in _noise: return _noise[seed]
    r = np.random.default_rng(seed)
    g = r.normal(0, 1, (N // 2, N // 2)).astype(np.float32)
    im = Image.fromarray(((g * 18) + 128).clip(0, 255).astype(np.uint8)).resize((N, N), Image.BILINEAR)
    d = ImageDraw.Draw(im); rnd = random.Random(seed)
    for _ in range(2600):
        x, y = rnd.random() * N, rnd.random() * N
        a = rnd.random() * math.tau; L = (8 + rnd.random() * 30) * S
        d.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)],
               fill=165 if rnd.random() > .5 else 95, width=S)
    im = im.filter(ImageFilter.GaussianBlur(0.6 * S))
    _noise[seed] = np.asarray(im, np.float32) / 128.0
    return _noise[seed]

def sheet(canvas, layer, lift=10, tex=0.10, seed=1, shade=0.55, rim=True):
    """Drop a cut-paper layer: soft offset shadow, contact shadow, fibre, top-edge highlight."""
    a = layer.getchannel('A')
    if lift:
        for blur, off, k in ((lift * 1.6, lift * 0.75, shade), (lift * 0.35, lift * 0.2, shade * 0.8)):
            sh = Image.new('RGBA', layer.size, SHADOW + (0,))
            sh.putalpha(a.filter(ImageFilter.GaussianBlur(blur * S)).point(lambda v: int(v * k)))
            canvas.alpha_composite(sh, (int(off * 0.3 * S), int(off * S)))
    arr = np.asarray(layer, np.float32).copy()
    f = fibre(seed)
    arr[..., :3] *= (1 + (f[..., None] - 1) * tex * 4)
    if rim:  # light catches the top edge of the card
        al = arr[..., 3] / 255.0
        up = np.roll(al, 2 * S, axis=0)
        edge = np.clip(al - up, 0, 1)[..., None]
        arr[..., :3] = arr[..., :3] * (1 - edge * 0.35) + 255 * edge * 0.35
    canvas.alpha_composite(Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA'))

def layer(): return Image.new('RGBA', (N, N), (0, 0, 0, 0))

def radial(c0, c1, cx, cy, r, p=1.0):
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    t = np.clip(np.hypot(x - cx, y - cy) / r, 0, 1) ** p
    arr = np.empty((N, N, 4), np.float32)
    for i in range(3): arr[..., i] = c0[i] + (c1[i] - c0[i]) * t
    arr[..., 3] = 255
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')

def linear(c0, c1, y0, y1):
    y = np.mgrid[0:N, 0:N][0].astype(np.float32)
    t = np.clip((y - y0) / (y1 - y0), 0, 1)
    arr = np.empty((N, N, 4), np.float32)
    for i in range(3): arr[..., i] = c0[i] + (c1[i] - c0[i]) * t
    arr[..., 3] = 255
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')

def disc_mask(r=None):
    r = r or N // 2
    m = Image.new('L', (N, N), 0); ImageDraw.Draw(m).ellipse((C - r, C - r, C + r, C + r), fill=255)
    return m

def glow(canvas, x, y, r, col, strength=1.0):
    g = layer(); ImageDraw.Draw(g).ellipse((x - r, y - r, x + r, y + r), fill=col + (int(200 * strength),))
    canvas.alpha_composite(g.filter(ImageFilter.GaussianBlur(r * 0.55)))
    g = layer(); rr = r * 0.35; ImageDraw.Draw(g).ellipse((x - rr, y - rr, x + rr, y + rr), fill=col + (int(255 * strength),))
    canvas.alpha_composite(g.filter(ImageFilter.GaussianBlur(rr * 0.6)))

# ── the mast ────────────────────────────────────────────────────
def thick(d, p0, p1, w, col):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]; L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L * w / 2, dx / L * w / 2
    d.polygon([(p0[0] + nx, p0[1] + ny), (p0[0] - nx, p0[1] - ny), (p1[0] - nx, p1[1] - ny), (p1[0] + nx, p1[1] + ny)], fill=col)

def mast(d, cx, base_y, tip_y, half_base, col, leg=22, brace=11, bays=5, flare=True,
         antenna=60, splay=1.0):
    """Traditional lattice tower: wedge taper to a point, simplified X bracing.
    Bays get taller toward the base (perspective), so the top stays open at 48 px."""
    leg, brace, antenna = leg * S, brace * S, antenna * S
    H = base_y - tip_y
    def hx(y):
        t = (y - tip_y) / H
        # slight concave flare at the foot, like a real self-supporting tower
        w = half_base * (t ** (1.25 if flare else 1.0))
        return max(w, 4 * S)
    # legs
    for sd in (-1, 1):
        pts = [(cx + sd * hx(tip_y + H * i / 40) + sd * leg / 2, tip_y + H * i / 40) for i in range(41)]
        pts += [(cx + sd * hx(tip_y + H * i / 40) - sd * leg / 2, tip_y + H * i / 40) for i in range(40, -1, -1)]
        d.polygon(pts, fill=col)
    # bay boundaries: geometric so the top bays are short and the bottom ones tall
    ts = [0.16]
    for i in range(bays):
        ts.append(ts[-1] + (1 - 0.16) * (1.0 / bays))
    ts = [0.16 + (1 - 0.16) * ((i / bays) ** 0.8) for i in range(bays + 1)]
    ys = [tip_y + H * t for t in ts]
    for y in ys[:-1]:
        thick(d, (cx - hx(y), y), (cx + hx(y), y), brace * 1.1, col)
    for y0, y1 in zip(ys[:-1], ys[1:]):
        thick(d, (cx - hx(y0), y0), (cx + hx(y1), y1), brace, col)
        thick(d, (cx + hx(y0), y0), (cx - hx(y1), y1), brace, col)
    # foot plate
    d.rectangle((cx - hx(base_y) - leg * 1.4, base_y - 4 * S, cx + hx(base_y) + leg * 1.4, base_y + 14 * S), fill=col)
    # antenna spike
    thick(d, (cx, tip_y + 4 * S), (cx, tip_y - antenna), 9 * S, col)
    return tip_y - antenna

# ── waves ───────────────────────────────────────────────────────
def arcs(d, cx, cy, radii, a0, a1, col, widths):
    for r, w in zip(radii, widths):
        d.arc((cx - r, cy - r, cx + r, cy + r), a0, a1, fill=col, width=int(w))

def arc_band(cx, cy, r_out, r_in, a0, a1, col):
    """a filled annular segment (one stacked paper arc)"""
    L = layer(); d = ImageDraw.Draw(L)
    d.pieslice((cx - r_out, cy - r_out, cx + r_out, cy + r_out), a0, a1, fill=col + (255,))
    k = Image.new('L', (N, N), 0)
    ImageDraw.Draw(k).ellipse((cx - r_in, cy - r_in, cx + r_in, cy + r_in), fill=255)
    L.putalpha(Image.fromarray(np.minimum(np.asarray(L.getchannel('A')), 255 - np.asarray(k))))
    return L

# ── Helsinki rooftops (papercut) ────────────────────────────────
def rooftops(d, base, col, seed=3, h=160, cathedral_x=None):
    rnd = random.Random(seed); x = 0
    while x < N:
        w = rnd.randint(70, 150) * S; hh = rnd.randint(int(h * .45), h) * S; y = base - hh
        d.rectangle((x, y, x + w, N), fill=col)
        k = rnd.random()
        if k < .45: d.polygon([(x - 2 * S, y), (x + w / 2, y - w * .42), (x + w + 2 * S, y)], fill=col)   # pitched
        elif k < .6: d.rectangle((x + w * .65, y - 34 * S, x + w * .65 + 16 * S, y), fill=col)          # chimney
        x += w
    if cathedral_x is not None:   # Tuomiokirkko: drum, dome, lantern, corner towers
        cx = cathedral_x; s = S * 1.25; b = base - h * .55 * S
        d.rectangle((cx - 120 * s, b - 40 * s, cx + 120 * s, N), fill=col)
        d.rectangle((cx - 45 * s, b - 105 * s, cx + 45 * s, b - 35 * s), fill=col)
        d.ellipse((cx - 55 * s, b - 170 * s, cx + 55 * s, b - 70 * s), fill=col)
        d.rectangle((cx - 9 * s, b - 205 * s, cx + 9 * s, b - 160 * s), fill=col)
        for dx in (-95, 95):
            d.rectangle((cx + (dx - 16) * s, b - 85 * s, cx + (dx + 16) * s, b - 40 * s), fill=col)
            d.ellipse((cx + (dx - 18) * s, b - 110 * s, cx + (dx + 18) * s, b - 70 * s), fill=col)

def moon(canvas, x, y, r, col=CREAM, crescent=True, sky=DEEP):
    L = layer(); d = ImageDraw.Draw(L)
    d.ellipse((x - r, y - r, x + r, y + r), fill=col + (255,))
    if crescent:
        d.ellipse((x - r + r * .55, y - r - r * .15, x + r + r * .55, y + r - r * .15), fill=(0, 0, 0, 0))
    glow(canvas, x, y, r * 1.9, col, 0.18)
    sheet(canvas, L, lift=6, tex=0.08, seed=77)

def finish(canvas, name, ring=None, ring_w=0):
    """apply disc crop look (vignette ring), save square + circle"""
    if ring:
        L = layer(); r = C - 6 * S
        ImageDraw.Draw(L).ellipse((C - r, C - r, C + r, C + r), outline=ring + (255,), width=ring_w * S)
        sheet(canvas, L, lift=4, tex=0.08, seed=99, rim=False)
    sq = canvas.convert('RGB').resize((1080, 1080), Image.LANCZOS)
    sq.save(OUT + name + '-1080.png')
    m = Image.new('L', (1080, 1080), 0); ImageDraw.Draw(m).ellipse((0, 0, 1079, 1079), fill=255)
    m = m.resize((2160, 2160)).filter(ImageFilter.GaussianBlur(1)).resize((1080, 1080), Image.LANCZOS)
    ci = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0)); ci.paste(sq, (0, 0), m)
    ci.save(OUT + name + '-circle.png')
    print('wrote', name)

# ══════════════════════════════════════════════════════════════
def v1():
    """Night classic: gradient sky, crescent moon, cream mast low over rooftops, magenta arcs."""
    c = radial((44, 38, 78), NIGHT, C, int(N * .42), int(N * .62), 1.1)
    moon(c, int(N * .22), int(N * .30), 54 * S)
    tip = int(N * .42)
    W = layer(); arcs(ImageDraw.Draw(W), C, tip - 60 * S, [105 * S, 180 * S, 255 * S], 215, 325, MAG + (255,), [28 * S, 24 * S, 20 * S])
    sheet(c, W, lift=7, tex=0.08, seed=11)
    M = layer(); top = mast(ImageDraw.Draw(M), C, int(N * .88), tip, 175 * S, CREAM + (255,), leg=26, brace=13)
    sheet(c, M, lift=14, tex=0.10, seed=12)
    glow(c, C, top, 50 * S, MAG, 0.9)
    T = layer(); ImageDraw.Draw(T).ellipse((C - 16 * S, top - 16 * S, C + 16 * S, top + 16 * S), fill=MAG + (255,)); sheet(c, T, lift=3, seed=13)
    R2 = layer(); rooftops(ImageDraw.Draw(R2), int(N * .88), (30, 30, 52, 255), seed=5, h=130, cathedral_x=int(N * .25)); sheet(c, R2, lift=10, seed=14)
    R1 = layer(); rooftops(ImageDraw.Draw(R1), int(N * .95), (10, 10, 18, 255), seed=8, h=90); sheet(c, R1, lift=14, seed=15)
    finish(c, 'v3-1-night-moon-rooftops')

def v2():
    """Ochre mast on magenta: bold colour lead, night stacked wave arcs, deep paper shadows."""
    c = radial((255, 40, 150), (176, 0, 92), int(N * .45), int(N * .35), int(N * .75), 1.0)
    tip = int(N * .47); cy = tip - 50 * S
    for i, (ro, ri, col) in enumerate([(310, 268, (70, 4, 44)), (228, 190, (70, 4, 44)), (148, 112, (70, 4, 44))]):
        sheet(c, arc_band(C, cy, ro * S, ri * S, 200, 340, col), lift=8, tex=0.1, seed=20 + i)
    G = layer(); ImageDraw.Draw(G).ellipse((C - 330 * S, int(N * .84), C + 330 * S, int(N * .84) + 150 * S), fill=(130, 0, 70, 255)); sheet(c, G, lift=6, seed=24)
    M = layer(); top = mast(ImageDraw.Draw(M), C, int(N * .88), tip, 160 * S, OCHRE + (255,), leg=26, brace=13)
    sheet(c, M, lift=20, tex=0.12, seed=25, shade=0.7)
    glow(c, C, top, 46 * S, CREAM, 0.9)
    T = layer(); ImageDraw.Draw(T).ellipse((C - 17 * S, top - 17 * S, C + 17 * S, top + 17 * S), fill=CREAM + (255,)); sheet(c, T, lift=4, seed=26)
    finish(c, 'v3-2-ochre-on-magenta')

def v3():
    """Magenta mast on night: ochre ripples from the tip (full rings fading out), strong ochre glow."""
    c = radial((30, 30, 52), NIGHT, C, int(N * .35), int(N * .7))
    tip = int(N * .45)
    top_guess = tip - 60 * S
    W = layer(); d = ImageDraw.Draw(W)
    for i, r in enumerate([115, 210, 310]):
        a = int(255 * (1 - i * 0.22))
        rr = r * S
        d.ellipse((C - rr, top_guess - rr, C + rr, top_guess + rr), outline=OCHRE + (a,), width=int((30 - i * 5) * S))
    # cut ripples behind the mast foot (they sit in the sky only)
    W.putalpha(Image.fromarray(np.where(np.mgrid[0:N, 0:N][0] < int(N * .80), np.asarray(W.getchannel('A')), 0).astype(np.uint8)))
    sheet(c, W, lift=6, tex=0.08, seed=30)
    G = layer(); ImageDraw.Draw(G).rectangle((0, int(N * .82), N, N), fill=(8, 8, 14, 255)); sheet(c, G, lift=10, seed=31)
    M = layer(); top = mast(ImageDraw.Draw(M), C, int(N * .86), tip, 160 * S, MAG + (255,), leg=28, brace=14, bays=4)
    sheet(c, M, lift=14, tex=0.12, seed=32)
    glow(c, C, top, 70 * S, OCHRE, 1.0)
    T = layer(); ImageDraw.Draw(T).ellipse((C - 18 * S, top - 18 * S, C + 18 * S, top + 18 * S), fill=(255, 220, 150, 255)); sheet(c, T, lift=3, seed=33)
    finish(c, 'v3-3-magenta-mast-ochre-ripples')

def v4():
    """Papercut stacked arc layer: magenta/ochre/cream arc bands as lifted cards behind a cream mast."""
    c = linear((36, 30, 66), NIGHT, 0, N)
    tip = int(N * .42); cy = tip - 40 * S
    bands = [(380, 340, MAG), (315, 280, OCHRE), (255, 222, MAG), (195, 165, OCHRE)]
    for i, (ro, ri, col) in enumerate(bands):
        sheet(c, arc_band(C, cy, ro * S, ri * S, 180, 360, col), lift=10 + i * 2, tex=0.12, seed=40 + i)
    R = layer(); rooftops(ImageDraw.Draw(R), int(N * .9), (12, 12, 20, 255), seed=11, h=120); sheet(c, R, lift=14, seed=45)
    M = layer(); top = mast(ImageDraw.Draw(M), C, int(N * .90), tip, 170 * S, CREAM + (255,), leg=25, brace=12)
    sheet(c, M, lift=16, tex=0.1, seed=46, shade=0.7)
    glow(c, C, top, 40 * S, CREAM, 0.7)
    T = layer(); ImageDraw.Draw(T).ellipse((C - 15 * S, top - 15 * S, C + 15 * S, top + 15 * S), fill=MAG + (255,)); sheet(c, T, lift=3, seed=47)
    finish(c, 'v3-4-stacked-paper-arcs')

def v5():
    """Duotone: ochre dusk sky, night silhouette mast + cathedral rooftops, night waves; magenta tip only."""
    c = radial((246, 190, 92), (196, 120, 30), C, int(N * .62), int(N * .72), 1.2)
    tip = int(N * .46)
    W = layer(); arcs(ImageDraw.Draw(W), C, tip - 60 * S, [115 * S, 200 * S, 285 * S], 210, 330, NIGHT + (255,), [24 * S, 21 * S, 18 * S])
    W2 = layer(); arcs(ImageDraw.Draw(W2), C, tip - 60 * S, [115 * S, 200 * S, 285 * S], 30, 150, NIGHT + (0,), [1, 1, 1])  # no-op placeholder
    sheet(c, W, lift=6, tex=0.1, seed=50, shade=0.35)
    R = layer(); rooftops(ImageDraw.Draw(R), int(N * .9), NIGHT + (255,), seed=21, h=140, cathedral_x=int(N * .78)); sheet(c, R, lift=8, seed=51, shade=0.35)
    M = layer(); top = mast(ImageDraw.Draw(M), C, int(N * .88), tip, 150 * S, NIGHT + (255,), leg=24, brace=12)
    sheet(c, M, lift=10, tex=0.06, seed=52, shade=0.35, rim=False)
    glow(c, C, top, 50 * S, MAG, 1.0)
    T = layer(); ImageDraw.Draw(T).ellipse((C - 17 * S, top - 17 * S, C + 17 * S, top + 17 * S), fill=MAG + (255,)); sheet(c, T, lift=3, seed=53)
    finish(c, 'v3-5-duotone-ochre-dusk')

def v6():
    """Bold emblem: heavy-line mast (3 bays) very low, side waves ((( ))) both ways, ochre ring."""
    c = radial((26, 28, 48), NIGHT, C, int(N * .4), int(N * .6))
    tip = int(N * .40)
    gy = tip - 10 * S
    W = layer(); d = ImageDraw.Draw(W)
    for i, r in enumerate([150, 240, 330]):
        w = (34 - i * 5) * S
        d.arc((C - r * S, gy - r * S, C + r * S, gy + r * S), 145, 215, fill=MAG + (255,), width=w)   # left
        d.arc((C - r * S, gy - r * S, C + r * S, gy + r * S), -35, 35, fill=MAG + (255,), width=w)   # right
    sheet(c, W, lift=8, tex=0.1, seed=60)
    G = layer(); ImageDraw.Draw(G).ellipse((C - 380 * S, int(N * .84), C + 380 * S, int(N * .84) + 220 * S), fill=(36, 38, 62, 255)); sheet(c, G, lift=8, seed=61)
    M = layer(); top = mast(ImageDraw.Draw(M), C, int(N * .87), tip, 175 * S, CREAM + (255,), leg=34, brace=18, bays=3, antenna=70)
    sheet(c, M, lift=18, tex=0.1, seed=62, shade=0.7)
    glow(c, C, top, 60 * S, MAG, 1.0)
    T = layer(); ImageDraw.Draw(T).ellipse((C - 22 * S, top - 22 * S, C + 22 * S, top + 22 * S), fill=MAG + (255,)); sheet(c, T, lift=4, seed=63)
    finish(c, 'v3-6-bold-emblem', ring=OCHRE, ring_w=18)

VARIANTS = [
    ('v3-1', 'v3-1-night-moon-rooftops', v1),
    ('v3-2', 'v3-2-ochre-on-magenta', v2),
    ('v3-3', 'v3-3-magenta-mast-ochre-ripples', v3),
    ('v3-4', 'v3-4-stacked-paper-arcs', v4),
    ('v3-5', 'v3-5-duotone-ochre-dusk', v5),
    ('v3-6', 'v3-6-bold-emblem', v6),
]

def contact_sheet():
    BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    f = ImageFont.truetype(BOLD, 26); fs = ImageFont.truetype(BOLD, 18)
    cols, cw, ch = 3, 520, 640
    cs = Image.new('RGB', (cols * cw, 2 * ch + 60), (34, 34, 40))
    d = ImageDraw.Draw(cs)
    d.text((24, 18), 'Radio Free Helsinki: mast icon v3 variations (400px circle · 64px · 48px)', font=f, fill=CREAM)
    for i, (lab, stem, _) in enumerate(VARIANTS):
        x0, y0 = (i % cols) * cw, 60 + (i // cols) * ch
        ci = Image.open(OUT + stem + '-circle.png')
        cs.paste(ci.resize((400, 400), Image.LANCZOS), (x0 + 60, y0 + 20), ci.resize((400, 400), Image.LANCZOS))
        s64 = ci.resize((64, 64), Image.LANCZOS); cs.paste(s64, (x0 + 150, y0 + 450), s64)
        s48 = ci.resize((48, 48), Image.LANCZOS); cs.paste(s48, (x0 + 290, y0 + 458), s48)
        d.text((x0 + 260, y0 + 540), lab, font=f, fill=CREAM, anchor='mm')
        d.text((x0 + 260, y0 + 575), stem[5:].replace('-', ' '), font=fs, fill=(170, 170, 178), anchor='mm')
    cs.save(OUT + 'contact-sheet.png'); print('wrote contact-sheet.png')

if __name__ == '__main__':
    import sys
    only = sys.argv[1:]
    for lab, stem, fn in VARIANTS:
        if not only or lab in only: fn()
    contact_sheet()
