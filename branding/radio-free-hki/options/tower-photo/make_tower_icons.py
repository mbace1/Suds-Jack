#!/usr/bin/env python3
"""Radio Free Helsinki: artistic profile icons from a real Helsinki tower photo.
Source: /workspace/branding/crops/tower-only.jpg
Palette: night, ochre #e3a33a, magenta #f0027f, cream. No text, no Toko face.
Run: python3 make_tower_icons.py [t1 ...]"""
import os, sys, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageChops

D = os.path.dirname(os.path.abspath(__file__)) + '/'
SRC = '/workspace/branding/crops/tower-only.jpg'
SZ, SS = 1080, 2
N = SZ * SS; C = N // 2
NIGHT, DEEP = (13, 15, 22), (24, 26, 44)
OCHRE, MAG, CREAM = (227, 163, 58), (240, 2, 127), (251, 243, 228)
SHADOW = (6, 4, 14)

def extract():
    src = Image.open(SRC).convert('RGB')
    a = np.asarray(src).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    sky = ((b > r + 15) & (b > g - 5) & (b > 100)) | ((b > 140) & (r > 140) & (g > 160) & (b >= r) & (b >= g - 10))
    m = Image.fromarray((~sky).astype(np.uint8) * 255).filter(ImageFilter.MedianFilter(5))
    m = m.point(lambda v: 255 if v > 128 else 0)
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).point(lambda v: 255 if v > 128 else 0)
    # trim empty margins but keep tip and platforms
    bb = m.getbbox()
    # pad a little
    pad = 20
    bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(src.width, bb[2] + pad), min(src.height, bb[3] + pad))
    rgba = Image.new('RGBA', src.size, (0, 0, 0, 0)); rgba.paste(src, (0, 0), m)
    return rgba.crop(bb), m.crop(bb)

TOWER_RGBA, TOWER_MASK = extract()

def fit_tower(target_h, max_w=None, crop_top=0.0, crop_bot=0.22):
    """scale tower so height = target_h. By default drop the empty lower shaft so the
    platforms + tip fill the circle; crop_bot=0.22 keeps a bit of base shaft."""
    w, h = TOWER_RGBA.size
    y0, y1 = int(h * crop_top), int(h * (1 - crop_bot))
    rgba = TOWER_RGBA.crop((0, y0, w, y1)); mask = TOWER_MASK.crop((0, y0, w, y1))
    # trim horizontal empty after crop
    bb = mask.getbbox()
    if bb: rgba, mask = rgba.crop(bb), mask.crop(bb)
    w, h = rgba.size
    k = target_h / h
    if max_w and w * k > max_w: k = max_w / w
    nw, nh = max(1, int(w * k)), max(1, int(h * k))
    return rgba.resize((nw, nh), Image.LANCZOS), mask.resize((nw, nh), Image.LANCZOS)

def sil_of(mask, color):
    im = Image.new('RGBA', mask.size, color + (0,)); im.putalpha(mask); return im

def disc(r=None, col=DEEP):
    r = r or C - 6 * SS
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse((C - r, C - r, C + r, C + r), fill=col + (255,))
    return im

def sheet(canvas, layer, xy, lift=10, shade=0.5):
    x, y = xy; a = layer.getchannel('A')
    if lift:
        sh = Image.new('RGBA', layer.size, SHADOW + (0,))
        sh.putalpha(a.filter(ImageFilter.GaussianBlur(lift * SS)).point(lambda v: int(v * shade)))
        canvas.alpha_composite(sh, (x + int(lift * 0.25 * SS), y + int(lift * 0.7 * SS)))
    canvas.alpha_composite(layer, (x, y))

def glow(canvas, x, y, r, col, strength=1.0):
    g = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse((x - r, y - r, x + r, y + r), fill=col + (int(200 * strength),))
    canvas.alpha_composite(g.filter(ImageFilter.GaussianBlur(r * 0.55)))

def arcs(d, cx, cy, radii, a0, a1, col, widths):
    for r, w in zip(radii, widths):
        d.arc((cx - r, cy - r, cx + r, cy + r), a0, a1, fill=col, width=int(w))

def finish(canvas, name, ring=None, ring_w=0):
    if ring:
        r = C - 8 * SS; L = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        ImageDraw.Draw(L).ellipse((C - r, C - r, C + r, C + r), outline=ring + (255,), width=ring_w * SS)
        canvas.alpha_composite(L)
    sq = canvas.convert('RGB').resize((SZ, SZ), Image.LANCZOS); sq.save(D + name + '-1080.png')
    m = Image.new('L', (SZ, SZ), 0); ImageDraw.Draw(m).ellipse((0, 0, SZ - 1, SZ - 1), fill=255)
    m = m.resize((SZ * 2, SZ * 2)).filter(ImageFilter.GaussianBlur(1)).resize((SZ, SZ), Image.LANCZOS)
    ci = Image.new('RGBA', (SZ, SZ), (0, 0, 0, 0)); ci.paste(sq, (0, 0), m); ci.save(D + name + '-circle.png')
    print('wrote', name)

# ── t1: hard papercut silhouette on night disc ──
def t1():
    c = Image.new('RGBA', (N, N), NIGHT + (255,))
    sheet(c, disc(), (0, 0), lift=0)
    rgba, mask = fit_tower(int(N * 0.84), max_w=int(N * 0.55))
    # hard silhouette in cream
    sil = sil_of(mask.point(lambda v: 255 if v > 128 else 0), CREAM)
    # slight simplification for small size: close gaps in platforms
    sil = sil.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    x = C - sil.width // 2; y = int(N * 0.08)
    sheet(c, sil, (x, y), lift=12)
    finish(c, 't1-photo-silhouette')

# ── t2: duotone ochre dusk like v3-5 ──
def t2():
    # ochre radial sky
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    t = np.clip(np.hypot(x - C, y - N * 0.65) / (N * 0.72), 0, 1) ** 1.15
    arr = np.empty((N, N, 4), np.float32)
    c0, c1 = (248, 196, 100), (196, 120, 30)
    for i in range(3): arr[..., i] = c0[i] + (c1[i] - c0[i]) * t
    arr[..., 3] = 255
    c = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    rgba, mask = fit_tower(int(N * 0.80), max_w=int(N * 0.52))
    sil = sil_of(mask.point(lambda v: 255 if v > 128 else 0), NIGHT)
    sil = sil.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    x = C - sil.width // 2; y = int(N * 0.14)
    sheet(c, sil, (x, y), lift=8, shade=0.3)
    # magenta tip glow at the top of the tower
    tip_y = y + int(sil.height * 0.02)
    glow(c, C, tip_y, 55 * SS, MAG, 0.95)
    tip = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(tip).ellipse((C - 14 * SS, tip_y - 14 * SS, C + 14 * SS, tip_y + 14 * SS), fill=MAG + (255,))
    sheet(c, tip, (0, 0), lift=2, shade=0.3)
    # night waves
    W = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    arcs(ImageDraw.Draw(W), C, tip_y, [90 * SS, 155 * SS, 220 * SS], 210, 330, NIGHT + (255,), [18 * SS, 15 * SS, 12 * SS])
    sheet(c, W, (0, 0), lift=3, shade=0.2)
    finish(c, 't2-duotone-ochre-dusk')

# ── t3: sunset photo crop with vignette + magenta ring ──
def t3():
    c = Image.new('RGBA', (N, N), NIGHT + (255,))
    # crop a square-ish dramatic portion of the photo: tip + platforms
    full = Image.open(SRC).convert('RGB')
    # use the masked tower centred on a sky-to-night field
    rgba, mask = fit_tower(int(N * 0.88), max_w=int(N * 0.55), crop_bot=0.18)
    # rebuild photo piece with sky behind: put original tower on a gradient sky then vignette
    sky = Image.new('RGB', (N, N))
    # recreate warm blue→ochre dusk from photo feel
    for yy in range(N):
        t = yy / N
        col = tuple(int(a + (b - a) * t) for a, b in zip((120, 170, 210), (255, 170, 80)))
        ImageDraw.Draw(sky).line([(0, yy), (N, yy)], fill=col)
    canvas = sky.convert('RGBA')
    x = C - rgba.width // 2; y = int(N * 0.05)
    canvas.alpha_composite(rgba, (x, y))
    # vignette to night at edges
    vig = Image.new('L', (N, N), 0)
    ImageDraw.Draw(vig).ellipse((int(N * 0.04), int(N * 0.04), int(N * 0.96), int(N * 0.96)), fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(N // 12))
    night = Image.new('RGBA', (N, N), NIGHT + (255,))
    canvas = Image.composite(canvas, night, vig)
    # subtle magenta ring
    finish(canvas, 't3-sunset-photo-crop', ring=MAG, ring_w=10)

# ── t4: papercut layered (cream/ochre shaft, dark platforms, magenta arcs) ──
def t4():
    c = Image.new('RGBA', (N, N), NIGHT + (255,))
    sheet(c, disc(), (0, 0), lift=0)
    rgba, mask = fit_tower(int(N * 0.82), max_w=int(N * 0.52))
    m = mask.point(lambda v: 255 if v > 128 else 0)
    # analyse horizontal density to find platforms (wider rows)
    ma = np.asarray(m)
    row_w = (ma > 0).sum(axis=1).astype(np.float32)
    # smooth
    k = np.ones(15) / 15; row_w = np.convolve(row_w, k, mode='same')
    med = np.median(row_w[row_w > 0]) if (row_w > 0).any() else 1
    platform = row_w > med * 1.35
    # shaft = cream, platforms = deep/ochre layered
    shaft_m = m.copy(); plat_m = Image.new('L', m.size, 0)
    pa = np.array(plat_m); sa = np.array(shaft_m)
    for y in range(m.height):
        if platform[y]:
            pa[y] = sa[y]; sa[y] = 0
    shaft = sil_of(Image.fromarray(sa), CREAM)
    plat = sil_of(Image.fromarray(pa), OCHRE)
    # ochre accent edge on platforms
    plat_edge = sil_of(Image.fromarray(pa).filter(ImageFilter.MaxFilter(5)), OCHRE)
    x = C - m.width // 2; y = int(N * 0.09)
    sheet(c, shaft, (x, y), lift=10)
    sheet(c, plat_edge, (x - 2 * SS, y + SS), lift=6, shade=0.3)
    sheet(c, plat, (x, y), lift=8)
    # magenta arcs from tip
    tip_y = y + int(m.height * 0.02)
    W = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    arcs(ImageDraw.Draw(W), C, tip_y, [85 * SS, 145 * SS, 210 * SS], 205, 335, MAG + (255,), [16 * SS, 13 * SS, 10 * SS])
    sheet(c, W, (0, 0), lift=5)
    glow(c, C, tip_y, 40 * SS, MAG, 0.7)
    finish(c, 't4-papercut-layered')

# ── t5: inverted night — cream tower, ochre rim light ──
def t5():
    c = Image.new('RGBA', (N, N), NIGHT + (255,))
    sheet(c, disc(col=NIGHT), (0, 0), lift=0)
    rgba, mask = fit_tower(int(N * 0.84), max_w=int(N * 0.55))
    m = mask.point(lambda v: 255 if v > 128 else 0)
    # ochre rim: expand mask, subtract original
    rim = m.filter(ImageFilter.MaxFilter(13))
    rim = ImageChops.subtract(rim, m)
    ochre_rim = sil_of(rim, OCHRE)
    cream = sil_of(m, CREAM)
    x = C - m.width // 2; y = int(N * 0.08)
    # glow behind like sunset from left
    glow(c, C - 40 * SS, y + m.height // 2, int(m.height * 0.35), OCHRE, 0.25)
    sheet(c, ochre_rim, (x - 3 * SS, y), lift=4, shade=0.2)
    sheet(c, cream, (x, y), lift=10)
    finish(c, 't5-inverted-night-rim')

# ── t6: bold geometric emblem inspired by the photo silhouette ──
def t6():
    c = Image.new('RGBA', (N, N), NIGHT + (255,))
    sheet(c, disc(), (0, 0), lift=0)
    L = Image.new('RGBA', (N, N), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    # proportions from the photo: thick shaft, 5 platforms, upper cylinder, lattice tip
    cx = C
    base_y = int(N * 0.88); tip_y = int(N * 0.14)
    shaft_w = int(N * 0.11)
    # main shaft
    d.rectangle((cx - shaft_w // 2, int(N * 0.48), cx + shaft_w // 2, base_y), fill=CREAM + (255,))
    # 5 platforms (jagged collars) — thick for 48px
    plat_ys = [0.50, 0.56, 0.62, 0.68, 0.74]
    for i, py in enumerate(plat_ys):
        y = int(N * py); half = int(N * (0.17 - i * 0.008))
        th = int(N * 0.028)
        d.rectangle((cx - half, y, cx + half, y + th), fill=CREAM + (255,))
        # small antenna stubs on platforms
        if i in (1, 3):
            d.rectangle((cx + half - int(N * 0.02), y - int(N * 0.035), cx + half, y), fill=CREAM + (255,))
    # upper cylinder
    uw = int(N * 0.09)
    d.rounded_rectangle((cx - uw // 2, int(N * 0.30), cx + uw // 2, int(N * 0.50)), radius=uw // 2, fill=CREAM + (255,))
    # lattice tip (simplified as thick tapering pole + cross-arms)
    mast_top = tip_y
    d.polygon([(cx - 8 * SS, int(N * 0.32)), (cx - 3 * SS, mast_top), (cx + 3 * SS, mast_top), (cx + 8 * SS, int(N * 0.32))], fill=CREAM + (255,))
    for i, yy in enumerate([0.18, 0.22, 0.26]):
        y = int(N * yy); arm = int((18 - i * 3) * SS)
        d.rectangle((cx - arm, y, cx + arm, y + 5 * SS), fill=CREAM + (255,))
    # tip light
    d.ellipse((cx - 10 * SS, mast_top - 10 * SS, cx + 10 * SS, mast_top + 10 * SS), fill=MAG + (255,))
    sheet(c, L, (0, 0), lift=14)
    # magenta waves
    W = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    arcs(ImageDraw.Draw(W), cx, mast_top, [100 * SS, 170 * SS, 245 * SS], 200, 340, MAG + (255,), [20 * SS, 16 * SS, 12 * SS])
    sheet(c, W, (0, 0), lift=6)
    # ochre base plinth
    B = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(B).rectangle((cx - int(N * 0.12), base_y - 4 * SS, cx + int(N * 0.12), base_y + 18 * SS), fill=OCHRE + (255,))
    sheet(c, B, (0, 0), lift=6)
    finish(c, 't6-bold-emblem')

VARIANTS = [
    ('t1', 't1-photo-silhouette', t1),
    ('t2', 't2-duotone-ochre-dusk', t2),
    ('t3', 't3-sunset-photo-crop', t3),
    ('t4', 't4-papercut-layered', t4),
    ('t5', 't5-inverted-night-rim', t5),
    ('t6', 't6-bold-emblem', t6),
]

def contact():
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
    fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
    cw, ch = 470, 600
    cs = Image.new('RGB', (3 * cw, 2 * ch + 60), (34, 34, 40)); d = ImageDraw.Draw(cs)
    d.text((20, 16), 'Radio Free Helsinki: tower-photo icons (400px · 64px · 48px)', font=f, fill=CREAM)
    for i, (lab, stem, _) in enumerate(VARIANTS):
        x, y = (i % 3) * cw, 60 + (i // 3) * ch
        ci = Image.open(D + stem + '-circle.png')
        b = ci.resize((400, 400), Image.LANCZOS); cs.paste(b, (x + 35, y + 10), b)
        for j, z in enumerate((64, 48)):
            t = ci.resize((z, z), Image.LANCZOS); cs.paste(t, (x + 150 + j * 110, y + 430 + (64 - z) // 2), t)
        d.text((x + cw // 2, y + 525), lab, font=f, fill=CREAM, anchor='mm')
        d.text((x + cw // 2, y + 556), stem[3:].replace('-', ' '), font=fs, fill=(170, 170, 178), anchor='mm')
    cs.save(D + 'contact-sheet.png'); print('wrote contact-sheet.png')

if __name__ == '__main__':
    only = sys.argv[1:]
    for lab, stem, fn in VARIANTS:
        if not only or lab in only: fn()
    contact()
